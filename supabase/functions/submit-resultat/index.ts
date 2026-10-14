import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { actualiserQuestionsARevoir, verifierQuestionsEnRevision } from "../shared/questions-a-revoir.ts";
import { enregistrerCompletionQuizParrainage } from "../shared/referral-quiz-completion.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resultatSchema = z.object({
  quiz_id: z.string().uuid(),
  reponses_json: z.record(z.string().uuid(), z.array(z.string().uuid())).default({}),
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

    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quiz")
      .select("type, est_avance, niveau_cible, created_by, is_public")
      .eq("id", parsed.data.quiz_id)
      .maybeSingle();
    if (quizError) throw quizError;
    if (
      !quiz
      || quiz.est_avance
      || (!quiz.is_public && !(quiz.type === "personnalise" && quiz.created_by === userData.user.id))
    ) {
      return new Response(JSON.stringify({ error: "Questionnaire introuvable ou inaccessible." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: liaisons, error: liaisonsError } = await supabaseAdmin
      .from("quiz_questions")
      .select("question_id, questions(id, type, points, niveau, notions(niveau), reponses(id, est_correcte))")
      .eq("quiz_id", parsed.data.quiz_id)
      .order("ordre");
    if (liaisonsError) throw liaisonsError;

    const questions = (liaisons ?? []).flatMap((liaison) => {
      const question = Array.isArray(liaison.questions) ? liaison.questions[0] : liaison.questions;
      return question ? [question] : [];
    });
    const questionsParId = new Map(questions.map((question) => [question.id, question]));
    const questionIdsSoumis = Object.keys(parsed.data.reponses_json);
    if (questionIdsSoumis.length === 0 || questionIdsSoumis.some((id) => !questionsParId.has(id))) {
      return new Response(JSON.stringify({ error: "Les réponses ne correspondent pas à ce questionnaire." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let niveauUtilisateur: number | null = null;
    if (quiz.type === "global") {
      const { data: profilNiveau, error: erreurNiveau } = await supabaseAdmin
        .from("profiles")
        .select("niveau_formation")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (erreurNiveau) throw erreurNiveau;
      niveauUtilisateur = profilNiveau?.niveau_formation ?? null;
    }

    const niveauQuestion = (question: (typeof questions)[number]) => {
      const notion = Array.isArray(question.notions) ? question.notions[0] : question.notions;
      return question.niveau ?? notion?.niveau ?? null;
    };
    const contientNiveauSuperieur = typeof quiz.niveau_cible === "number"
      && questions.some((question) => {
        const niveau = niveauQuestion(question);
        return niveau !== null && niveau > quiz.niveau_cible!;
      });
    const questionsAdaptees = typeof quiz.niveau_cible === "number"
      ? contientNiveauSuperieur
        ? niveauUtilisateur === null || niveauUtilisateur <= 0
          ? questions
          : questions.filter((question) => {
            const niveau = niveauQuestion(question);
            return niveau !== null && niveau <= niveauUtilisateur!;
          })
        : questions.filter((question) => niveauQuestion(question) === quiz.niveau_cible)
      : quiz.type === "global" && niveauUtilisateur !== null && niveauUtilisateur > 0
        ? questions.filter((question) => {
          const niveau = niveauQuestion(question);
          return niveau !== null && niveau <= niveauUtilisateur!;
        })
        : questions;
    const questionsStandard = questionsAdaptees.filter((question) => question.type === "qcm" || question.type === "qcu");

    if (!parsed.data.revision) {
      const nombreAttendu = Math.min(5, questionsStandard.length);
      if (nombreAttendu === 0 || questionIdsSoumis.length !== nombreAttendu || questionIdsSoumis.some((id) => !questionsStandard.some((question) => question.id === id))) {
        return new Response(JSON.stringify({ error: "La tentative ne contient pas toutes les questions attendues." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    for (const questionId of questionIdsSoumis) {
      const question = questionsParId.get(questionId)!;
      const reponsesValides = new Set((question.reponses ?? []).map((reponse) => reponse.id));
      const reponsesSoumises = parsed.data.reponses_json[questionId];
      if (
        !["qcm", "qcu"].includes(question.type)
        || new Set(reponsesSoumises).size !== reponsesSoumises.length
        || reponsesSoumises.some((reponseId) => !reponsesValides.has(reponseId))
      ) {
        return new Response(JSON.stringify({ error: "Une réponse ne correspond pas au format attendu." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let score = 0;
    let scoreMax = 0;
    const questionsIncorrectes: string[] = [];
    const questionsCorrectes: string[] = [];
    for (const questionId of questionIdsSoumis) {
      const question = questionsParId.get(questionId)!;
      const points = question.points ?? 1;
      scoreMax += points;

      const idsCorrects = (question.reponses ?? [])
        .filter((reponse) => reponse.est_correcte)
        .map((reponse) => reponse.id)
        .sort();
      const idsChoisis = parsed.data.reponses_json[questionId].slice().sort();
      const estCorrecte = idsCorrects.length > 0 && JSON.stringify(idsCorrects) === JSON.stringify(idsChoisis);
      if (estCorrecte) {
        score += points;
        questionsCorrectes.push(questionId);
      } else {
        questionsIncorrectes.push(questionId);
      }
    }

    const { data: resultat, error: insertError } = await supabaseAdmin
      .from("resultats")
      .insert({
        user_id: userData.user.id,
        quiz_id: parsed.data.quiz_id,
        score,
        score_max: scoreMax,
        reponses_json: parsed.data.reponses_json,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    await actualiserQuestionsARevoir(
      supabaseAdmin,
      userData.user.id,
      parsed.data.quiz_id,
      questionsIncorrectes,
      questionsCorrectes,
      parsed.data.revision,
    );

    const reponsesCompletes = questionIdsSoumis.every((questionId) => parsed.data.reponses_json[questionId].length > 0);
    if (!parsed.data.revision && reponsesCompletes) {
      await enregistrerCompletionQuizParrainage(supabaseAdmin, userData.user.id, parsed.data.quiz_id, resultat.id);
    }

    return new Response(JSON.stringify({ resultat_id: resultat.id, score, score_max: scoreMax }), {
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