import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { actualiserQuestionsARevoir, verifierQuestionsEnRevision } from "../shared/questions-a-revoir.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reponseSchema = z.object({
  question_id: z.string().uuid(),
  type: z.enum(["qcm", "qcu", "code", "dessin", "libre"]),
  contenu: z.string(),
});

const payloadSchema = z.object({
  quiz_id: z.string().uuid(),
  reponses: z.array(reponseSchema).min(1),
  revision: z.boolean().default(false),
});

type Verdict = { statut: "correct" | "partiel" | "incorrect"; feedback: string };

async function appelerClaude(system: string, messages: any[]): Promise<Verdict> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, system, messages }),
  });
  const data = await response.json();
  const texte = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
  try {
    return JSON.parse(texte.replace(/```json|```/g, "").trim());
  } catch {
    return { statut: "incorrect", feedback: "Correction indisponible, réessaie plus tard." };
  }
}

async function corrigerCode(codeEtudiant: string, codeReference: string, testsJson: unknown): Promise<Verdict> {
  const system = `Tu es un correcteur de code pédagogique. Compare le code de l'étudiant à la solution de référence et aux tests fournis.
Réponds UNIQUEMENT avec un JSON de cette forme, sans texte autour :
{"statut": "correct" | "partiel" | "incorrect", "feedback": string}
"correct" si le code fonctionne et couvre les cas attendus, "partiel" si l'approche est globalement bonne mais incomplète ou buguée sur certains cas, "incorrect" si l'approche est fausse. Le feedback doit être en français, concis (2-3 phrases), et bienveillant.`;
  const userPrompt = `Solution de référence :\n${codeReference}\n\nTests attendus :\n${JSON.stringify(testsJson)}\n\nCode de l'étudiant :\n${codeEtudiant}`;
  return appelerClaude(system, [{ role: "user", content: userPrompt }]);
}

async function corrigerDessin(imageBase64: string, criteresIa: string): Promise<Verdict> {
  const system = `Tu es un correcteur pédagogique de schémas. Évalue le dessin fourni par rapport aux critères donnés.
Réponds UNIQUEMENT avec un JSON de cette forme, sans texte autour :
{"statut": "correct" | "partiel" | "incorrect", "feedback": string}
"correct" si le dessin couvre bien les critères, "partiel" s'il en manque une partie, "incorrect" s'il ne correspond pas ou est vide. Le feedback doit être en français, concis (2-3 phrases), et bienveillant.`;
  const donneesImage = imageBase64.replace(/^data:image\/png;base64,/, "");
  return appelerClaude(system, [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: donneesImage } },
        { type: "text", text: `Critères attendus : ${criteresIa}` },
      ],
    },
  ]);
}

async function corrigerLibre(reponseEtudiant: string, criteresIa: string): Promise<Verdict> {
  const system = `Tu es un correcteur pédagogique de réponses rédigées. Évalue la réponse par rapport aux critères attendus.
Réponds UNIQUEMENT avec un JSON de cette forme, sans texte autour :
{"statut": "correct" | "partiel" | "incorrect", "feedback": string}
"correct" si la réponse couvre bien les éléments attendus, "partiel" si elle est incomplète ou imprécise, "incorrect" si elle est fausse ou hors sujet. Le feedback doit être en français, concis (2-3 phrases), bienveillant, et préciser ce qui manque le cas échéant.`;
  const userPrompt = `Éléments de réponse attendus :\n${criteresIa}\n\nRéponse de l'étudiant :\n${reponseEtudiant}`;
  return appelerClaude(system, [{ role: "user", content: userPrompt }]);
}

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
    const parsed = payloadSchema.safeParse(body);
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
      const questionIds = parsed.data.reponses.map((reponse) => reponse.question_id);
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

    let score = 0;
    let scoreMax = 0;
    const details: any[] = [];

    for (const r of parsed.data.reponses) {
      const { data: question } = await supabaseAdmin
        .from("questions")
        .select("points, criteres_evaluation(langage, code_reference, tests_json, criteres_ia)")
        .eq("id", r.question_id)
        .single();

      if (!question) continue;
      const points = question.points ?? 1;
      scoreMax += points;

      const criteres = Array.isArray(question.criteres_evaluation)
        ? question.criteres_evaluation[0]
        : question.criteres_evaluation;

      let verdict: Verdict;
      let correction: string | null = null;

      if (r.type === "qcm" || r.type === "qcu") {
        const { data: reponses } = await supabaseAdmin
          .from("reponses")
          .select("id, texte, est_correcte")
          .eq("question_id", r.question_id);

        const idsCorrects = (reponses || []).filter((x) => x.est_correcte).map((x) => x.id).sort();
        const idsChoisis: string[] = r.contenu ? JSON.parse(r.contenu) : [];
        const choisisSorted = idsChoisis.slice().sort();

        if (JSON.stringify(idsCorrects) === JSON.stringify(choisisSorted)) {
          verdict = { statut: "correct", feedback: "Bonne réponse." };
        } else {
          const intersection = idsChoisis.filter((id) => idsCorrects.includes(id));
          const aDesErreurs = idsChoisis.some((id) => !idsCorrects.includes(id));
          verdict =
            intersection.length > 0 && !aDesErreurs && intersection.length < idsCorrects.length
              ? { statut: "partiel", feedback: "Une partie des bonnes réponses a été sélectionnée, mais pas toutes." }
              : { statut: "incorrect", feedback: "La ou les réponses sélectionnées ne sont pas correctes." };
        }
        correction = (reponses || []).filter((x) => x.est_correcte).map((x) => x.texte).join(", ");
      } else if (r.contenu.trim() === "") {
        verdict = { statut: "incorrect", feedback: "Aucune réponse n'a été fournie pour cette question." };
        correction = r.type === "code" ? criteres?.code_reference ?? null : criteres?.criteres_ia ?? null;
      } else if (r.type === "code") {
        verdict = await corrigerCode(r.contenu, criteres?.code_reference ?? "", criteres?.tests_json ?? []);
        correction = criteres?.code_reference ?? null;
      } else if (r.type === "dessin") {
        verdict = await corrigerDessin(r.contenu, criteres?.criteres_ia ?? "");
        correction = criteres?.criteres_ia ?? null;
      } else {
        verdict = await corrigerLibre(r.contenu, criteres?.criteres_ia ?? "");
        correction = criteres?.criteres_ia ?? null;
      }

      const pointsObtenus = verdict.statut === "correct" ? points : verdict.statut === "partiel" ? points / 2 : 0;
      score += pointsObtenus;

      details.push({
        question_id: r.question_id,
        type: r.type,
        statut: verdict.statut,
        feedback: verdict.feedback,
        correction,
      });
    }

    const { data: resultat, error: insertError } = await supabaseAdmin
      .from("resultats")
      .insert({
        user_id: userData.user.id,
        quiz_id: parsed.data.quiz_id,
        score,
        score_max: scoreMax,
        reponses_json: { details },
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const questionsIncorrectes = details
      .filter((detail) => detail.statut !== "correct")
      .map((detail) => detail.question_id);
    const questionsCorrectes = details
      .filter((detail) => detail.statut === "correct")
      .map((detail) => detail.question_id);
    await actualiserQuestionsARevoir(
      supabaseAdmin,
      userData.user.id,
      parsed.data.quiz_id,
      questionsIncorrectes,
      questionsCorrectes,
      parsed.data.revision,
    );

    return new Response(JSON.stringify({ resultat_id: resultat.id, score, score_max: scoreMax, details }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erreur submit-resultat-avance:", err);
    return new Response(JSON.stringify({ error: err?.message ?? JSON.stringify(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});