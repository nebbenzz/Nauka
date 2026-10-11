import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { actualiserQuestionsARevoir, verifierQuestionsEnRevision } from "../shared/questions-a-revoir.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resultatSchema = z.object({
  quiz_id: z.string().uuid(),
  score: z.number(),
  score_max: z.number(),
  reponses_json: z.record(z.any()).default({}),
  revision: z.boolean().default(false),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = resultatSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profil } = await supabaseAdmin.from("profiles").select("plan, pro_expires_at, abonnement_intervalle").eq("id", userData.user.id).single();
    const estAbonnementActif = profil?.abonnement_intervalle === "mensuel" || profil?.abonnement_intervalle === "annuel";
    if (profil?.plan === "pro" && profil.pro_expires_at && new Date(profil.pro_expires_at) <= new Date() && !estAbonnementActif) {
      await supabaseAdmin.from("profiles").update({ plan: "decouverte", abonnement_intervalle: null, pro_expires_at: null }).eq("id", userData.user.id);
    }

    if (parsed.data.revision) {
      const questionIds = Object.keys(parsed.data.reponses_json);
      const estAutorisee = await verifierQuestionsEnRevision(supabaseAdmin, userData.user.id, parsed.data.quiz_id, questionIds);
      if (!estAutorisee) {
        return new Response(JSON.stringify({ error: "Ces questions ne font pas partie de tes rappels." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: quotaOk, error: quotaError } = await supabaseAdmin.rpc("check_and_increment_quota", {
        p_user_id: userData.user.id,
      });
      if (quotaError) throw quotaError;

      if (!quotaOk) {
        return new Response(
          JSON.stringify({ error: "Limite de 5 quiz/jour atteinte. Passe au forfait Pro pour continuer." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: resultat, error: insertError } = await supabaseAdmin
      .from("resultats")
      .insert({
        user_id: userData.user.id,
        quiz_id: parsed.data.quiz_id,
        score: parsed.data.score,
        score_max: parsed.data.score_max,
        reponses_json: parsed.data.reponses_json,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const questionIdsSoumis = Object.keys(parsed.data.reponses_json);
    let questionIds: string[] = [];
    if (questionIdsSoumis.length > 0) {
      const { data: liaisons, error: liaisonsError } = await supabaseAdmin
        .from("quiz_questions")
        .select("question_id")
        .eq("quiz_id", parsed.data.quiz_id)
        .in("question_id", questionIdsSoumis);
      if (liaisonsError) throw liaisonsError;
      questionIds = (liaisons || []).map((liaison: { question_id: string }) => liaison.question_id);
    }
    let reponsesCorrectes: { id: string; question_id: string; est_correcte: boolean }[] = [];
    if (questionIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("reponses")
        .select("id, question_id, est_correcte")
        .in("question_id", questionIds);
      if (error) throw error;
      reponsesCorrectes = data || [];
    }

    const questionsIncorrectes: string[] = [];
    const questionsCorrectes: string[] = [];
    for (const questionId of questionIds) {
      const idsCorrects = reponsesCorrectes
        .filter((reponse) => reponse.question_id === questionId && reponse.est_correcte)
        .map((reponse) => reponse.id)
        .sort();
      const reponseSoumise = parsed.data.reponses_json[questionId];
      const idsChoisis = Array.isArray(reponseSoumise)
        ? reponseSoumise.filter((id): id is string => typeof id === "string").sort()
        : [];
      const estCorrecte = idsCorrects.length > 0 && JSON.stringify(idsCorrects) === JSON.stringify(idsChoisis);
      (estCorrecte ? questionsCorrectes : questionsIncorrectes).push(questionId);
    }

    await actualiserQuestionsARevoir(
      supabaseAdmin,
      userData.user.id,
      parsed.data.quiz_id,
      questionsIncorrectes,
      questionsCorrectes,
      parsed.data.revision,
    );

    return new Response(JSON.stringify({ resultat_id: resultat.id }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erreur submit-resultat:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? JSON.stringify(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});