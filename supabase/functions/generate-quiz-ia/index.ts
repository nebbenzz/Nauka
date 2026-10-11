import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAILLE_MIN = 20 * 1024;
const TAILLE_MAX = 15 * 1024 * 1024;
const PAGES_MAX_ESTIMEES = 60;
const MAX_QUESTIONS_PAR_QUIZ = 5;

const requeteSchema = z.object({
  fichier_id: z.string().uuid().optional(),
  quiz_id: z.string().uuid().optional(),
  regeneration: z.enum(["aucune", "selection", "tout"]).optional(),
  question_ids_a_regenerer: z.array(z.string().uuid()).max(MAX_QUESTIONS_PAR_QUIZ).optional(),
  titre: z.string().max(120).optional(),
  nombre_questions: z.number().int().min(1).max(MAX_QUESTIONS_PAR_QUIZ),
  type_quiz: z.enum(["standard", "avance"]),
  duree_minutes: z.number().int().min(5).max(30).optional(),
  difficulte: z.enum(["facile", "moyen", "difficile"]).nullable().optional(),
  domaine_utilisateur: z.string().optional(),
}).superRefine((requete, contexte) => {
  if (!requete.quiz_id && requete.nombre_questions < 3) {
    contexte.addIssue({ code: z.ZodIssueCode.custom, path: ["nombre_questions"], message: "Un nouveau questionnaire doit contenir au moins 3 questions." });
  }
  if (requete.regeneration === "selection" && (requete.question_ids_a_regenerer?.length !== requete.nombre_questions || !requete.question_ids_a_regenerer?.length)) {
    contexte.addIssue({ code: z.ZodIssueCode.custom, path: ["question_ids_a_regenerer"], message: "Sélectionne autant de questions à régénérer que le nombre demandé." });
  }
  if (requete.regeneration !== "aucune" && !requete.fichier_id) {
    contexte.addIssue({ code: z.ZodIssueCode.custom, path: ["fichier_id"], message: "Un document source est requis pour générer les questions." });
  }
});

const questionIaSchema = z.object({
  notion_nom: z.string().min(1),
  type: z.enum(["qcm", "qcu", "code", "dessin", "libre"]),
  intitule: z.string().min(3),
  explication: z.string().min(1),
  source_page: z.number().int().min(1),
  source_excerpt: z.string().min(10).max(500),
  reponses: z.array(z.object({ texte: z.string(), correcte: z.boolean() })).nullable().optional(),
  criteres_evaluation: z
    .object({
      langage: z.string().optional(),
      code_reference: z.string().optional(),
      tests_json: z.any().optional(),
      criteres_ia: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const quizIaSchema = z.object({
  titre: z.string().min(3),
  matiere_nom: z.string().min(2),
  difficulte: z.enum(["facile", "moyen", "difficile"]).nullable().optional(),
  questions: z.array(questionIaSchema),
});

const MATIERES_GENERIQUES = [
  "Droit", "Informatique", "Mathématiques", "Sciences de la Vie", "Physique",
  "Chimie", "Histoire", "Économie", "Gestion", "Psychologie",
  "Langues étrangères appliquées", "Lettres modernes", "Sciences politiques",
  "Sociologie", "Géographie",
];

function versBase64(octets: Uint8Array): string {
  const TAILLE_BLOC = 0x8000; // 32 768
  let binaire = "";
  for (let i = 0; i < octets.length; i += TAILLE_BLOC) {
    const bloc = octets.subarray(i, i + TAILLE_BLOC);
    binaire += String.fromCharCode(...bloc);
  }
  return btoa(binaire);
}

function extraireObjetJson(texte: string): unknown {
  let debut = -1;
  let profondeur = 0;
  let dansChaine = false;
  let echappe = false;

  for (let index = 0; index < texte.length; index += 1) {
    const caractere = texte[index];
    if (dansChaine) {
      if (echappe) echappe = false;
      else if (caractere === "\\") echappe = true;
      else if (caractere === '"') dansChaine = false;
      continue;
    }

    if (caractere === '"' && profondeur > 0) {
      dansChaine = true;
    } else if (caractere === "{" ) {
      if (profondeur === 0) debut = index;
      profondeur += 1;
    } else if (caractere === "}" && profondeur > 0) {
      profondeur -= 1;
      if (profondeur === 0 && debut >= 0) {
        try {
          return JSON.parse(texte.slice(debut, index + 1));
        } catch {
          debut = -1;
        }
      }
    }
  }

  throw new Error("Aucun objet JSON valide dans la réponse du modèle.");
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
    const parsed = requeteSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const requete = parsed.data;

    if (requete.type_quiz === "avance" && !requete.duree_minutes) {
      return new Response(JSON.stringify({ error: "Une durée est requise pour un questionnaire avancé." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan, pro_expires_at, abonnement_intervalle, generations_ia_ce_mois, generations_ia_reset_mois")
      .eq("id", userData.user.id)
      .single();
    const estAbonnementActif = profile?.abonnement_intervalle === "mensuel" || profile?.abonnement_intervalle === "annuel";
    const essaiExpire = profile?.pro_expires_at && new Date(profile.pro_expires_at) <= new Date() && !estAbonnementActif;
    if (essaiExpire) {
      await supabaseAdmin.from("profiles").update({ plan: "decouverte", abonnement_intervalle: null, pro_expires_at: null }).eq("id", userData.user.id);
    }
    if (profileError || profile.plan !== "pro" || essaiExpire) {
      return new Response(JSON.stringify({ error: "Fonctionnalité réservée au forfait Pro" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let quizOriginal: { id: string; titre: string; difficulte: string | null; est_avance: boolean; duree_secondes: number | null } | null = null;
    let ordresARegenerer: number[] | null = null;
    if (requete.quiz_id) {
      const { data, error } = await supabaseAdmin
        .from("quiz")
        .select("id, titre, difficulte, est_avance, duree_secondes")
        .eq("id", requete.quiz_id)
        .eq("created_by", userData.user.id)
        .eq("type", "personnalise")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ error: "Questionnaire personnalisé introuvable." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      quizOriginal = data;

      const [{ data: liaisons, error: erreurLiaisons }, { data: sources, error: erreurSources }] = await Promise.all([
        supabaseAdmin.from("quiz_questions").select("question_id, ordre").eq("quiz_id", data.id).order("ordre"),
        supabaseAdmin.from("quiz_question_sources").select("fichier_id").eq("quiz_id", data.id).limit(1),
      ]);
      if (erreurLiaisons) throw erreurLiaisons;
      if (erreurSources) throw erreurSources;

      if (requete.regeneration === "aucune") {
        const fichierExistant = sources?.[0]?.fichier_id ?? null;
        if (
          requete.nombre_questions !== (liaisons?.length ?? 0)
          || (requete.fichier_id && requete.fichier_id !== fichierExistant)
          || requete.type_quiz !== (data.est_avance ? "avance" : "standard")
          || (requete.type_quiz === "avance" && requete.duree_minutes !== Math.round((data.duree_secondes ?? 0) / 60))
        ) {
          return new Response(JSON.stringify({ error: "Le document, le nombre de questions ou le format a changé. Choisis les questions à régénérer ou régénère tout le questionnaire." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: erreurMiseAJour } = await supabaseAdmin.rpc("update_personal_quiz_metadata", {
          p_quiz_id: data.id,
          p_user_id: userData.user.id,
          p_titre: requete.titre?.trim() || data.titre,
          p_difficulte: requete.difficulte ?? data.difficulte ?? "moyen",
        });
        if (erreurMiseAJour) throw erreurMiseAJour;
        return new Response(JSON.stringify({ quiz_id: data.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (requete.regeneration === "selection") {
        const idsSelectionnes = new Set(requete.question_ids_a_regenerer ?? []);
        ordresARegenerer = (liaisons ?? [])
          .filter((liaison) => idsSelectionnes.has(liaison.question_id))
          .map((liaison) => liaison.ordre);
        if (ordresARegenerer.length !== idsSelectionnes.size) {
          return new Response(JSON.stringify({ error: "Une des questions sélectionnées n'appartient pas à ce questionnaire." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    let compteurGenerations = 0;
    if (profile.abonnement_intervalle === "mensuel") {
      const aujourdHui = new Date();
      const reset = profile.generations_ia_reset_mois ? new Date(profile.generations_ia_reset_mois) : null;
      const memeMois = !!reset && reset.getFullYear() === aujourdHui.getFullYear() && reset.getMonth() === aujourdHui.getMonth();
      compteurGenerations = memeMois ? profile.generations_ia_ce_mois : 0;
      if (compteurGenerations >= 15) {
        return new Response(
          JSON.stringify({ error: "Limite de 15 générations par mois atteinte pour le forfait Pro mensuel. Passe à l'annuel pour un accès illimité." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: fichier, error: fichierError } = await supabaseAdmin
      .from("fichiers_utilisateur")
      .select("storage_path, nom_fichier")
      .eq("id", requete.fichier_id!)
      .eq("user_id", userData.user.id)
      .single();
    if (fichierError || !fichier) {
      return new Response(JSON.stringify({ error: "Fichier introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from("fichiers-utilisateur")
      .download(fichier.storage_path);
    if (downloadError || !fileBlob) {
      return new Response(JSON.stringify({ error: "Échec du téléchargement du fichier" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const octets = new Uint8Array(await fileBlob.arrayBuffer());

    if (octets.byteLength < TAILLE_MIN) {
      return new Response(
        JSON.stringify({ error: "Le fichier est trop petit pour être un document exploitable (minimum 20 Ko)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (octets.byteLength > TAILLE_MAX) {
      return new Response(
        JSON.stringify({ error: "Le fichier dépasse la taille maximale autorisée (15 Mo)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enTete = new TextDecoder("latin1").decode(octets.slice(0, 5));
    if (enTete !== "%PDF-") {
      return new Response(JSON.stringify({ error: "Le fichier n'est pas un PDF valide." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contenuBrut = new TextDecoder("latin1").decode(octets);
    if (contenuBrut.includes("/Encrypt")) {
      return new Response(
        JSON.stringify({ error: "Les PDF protégés par mot de passe ou chiffrés ne sont pas acceptés." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pagesEstimees = (contenuBrut.match(/\/Type\s*\/Page[^s]/g) || []).length;
    if (pagesEstimees > PAGES_MAX_ESTIMEES) {
      return new Response(
        JSON.stringify({ error: `Le document semble dépasser la limite de ${PAGES_MAX_ESTIMEES} pages. Réduis-le et réessaie.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base64Pdf = versBase64(octets);
    const dureeSecondes = requete.type_quiz === "avance" ? (requete.duree_minutes ?? 15) * 60 : null;

    const listeMatieres = requete.domaine_utilisateur
      ? [...new Set([...MATIERES_GENERIQUES, requete.domaine_utilisateur])]
      : MATIERES_GENERIQUES;

    const systemPrompt = `Tu génères un questionnaire de révision à partir du document PDF fourni.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown. Le JSON doit respecter exactement cette forme :
{
  "titre": string,
  "matiere_nom": string,
  "difficulte": "facile" | "moyen" | "difficile",
  "questions": [
    {
      "notion_nom": string,
      "type": "qcm" | "qcu"${requete.type_quiz === "avance" ? ' | "code" | "dessin" | "libre"' : ""},
      "intitule": string,
      "explication": string,
      "source_page": number,
      "source_excerpt": string,
      "reponses": [{ "texte": string, "correcte": boolean }],
      "criteres_evaluation": {
        "langage": string,
        "code_reference": string,
        "tests_json": [{ "entree": any, "sortie": any }],
        "criteres_ia": string
      }
    }
  ]
}

Règles :
- Génère exactement ${requete.nombre_questions} questions, basées sur le contenu réel du document, sans jamais dépasser ${MAX_QUESTIONS_PAR_QUIZ} questions.
- Pour chaque question, indique "source_page" (numéro de page visible dans le PDF) et "source_excerpt" (citation exacte de 10 à 500 caractères du document qui justifie la question). Ne les invente pas : choisis un passage réellement présent et directement pertinent.
- "matiere_nom" doit être choisi parmi cette liste si un intitulé convient : ${listeMatieres.join(", ")}. Sinon, choisis un intitulé de matière générique et cohérent.
- "reponses" est obligatoire uniquement pour les types "qcm" et "qcu" (une seule réponse correcte pour "qcu", au moins une pour "qcm").
- "criteres_evaluation" est obligatoire uniquement pour les types "code", "dessin" et "libre" :
  - pour "code" : renseigne "langage", "code_reference" (solution correcte) et "tests_json" (cas de test).
  - pour "dessin" et "libre" : renseigne "criteres_ia" (description des éléments attendus dans la réponse).
${requete.type_quiz === "avance"
        ? '- Ce questionnaire est "avancé" : varie les types de questions ("qcm", "qcu", "code", "dessin", "libre") selon ce qui convient le mieux au contenu du document.'
        : '- Ce questionnaire est "standard" : utilise uniquement les types "qcm" et "qcu".'
      }
- "explication" est obligatoire pour toutes les questions, et doit expliquer la bonne réponse en une ou deux phrases.
${requete.difficulte ? `- Niveau de difficulté visé : ${requete.difficulte}.` : ""}
${requete.difficulte ? `- Renseigne aussi "difficulte" avec la valeur "${requete.difficulte}".` : '- Choisis "difficulte" parmi "facile", "moyen" ou "difficile" selon les questions générées.'}
${requete.titre ? `- Utilise ce titre pour le questionnaire : "${requete.titre}".` : "- Choisis un titre court et pertinent pour le questionnaire."}`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
              { type: "text", text: "Génère le questionnaire à partir de ce document, en JSON strict comme demandé." },
            ],
          },
        ],
      }),
    });

    const claudeData = await claudeResponse.json().catch(() => null);
    if (!claudeResponse.ok) {
      const typeErreur = claudeData?.error?.type ?? "réponse non JSON";
      const detailErreur = typeof claudeData?.error?.message === "string"
        ? claudeData.error.message.slice(0, 300)
        : "Aucun détail fourni par le fournisseur.";
      console.error("Échec de l'API Claude:", {
        status: claudeResponse.status,
        type: typeErreur,
        detail: detailErreur,
      });

      let messageErreur = "Le service IA est temporairement indisponible. Réessaie dans quelques instants.";
      if (claudeResponse.status === 401 || claudeResponse.status === 403) {
        messageErreur = "La clé API Anthropic est invalide ou ne dispose pas des droits nécessaires. Vérifie la configuration du service IA.";
      } else if (claudeResponse.status === 429) {
        messageErreur = `La limite d'utilisation de l'API Anthropic est atteinte. Vérifie le quota et la facturation du compte. (${detailErreur})`;
      } else if (claudeResponse.status >= 400 && claudeResponse.status < 500) {
        messageErreur = `Anthropic a refusé la requête (${claudeResponse.status}, ${typeErreur}) : ${detailErreur}`;
      } else if (claudeResponse.status >= 500) {
        messageErreur = `Le service Anthropic rencontre un problème (${claudeResponse.status}). Réessaie dans quelques instants.`;
      }

      return new Response(JSON.stringify({ error: messageErreur }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raisonArret = claudeData?.stop_reason;
    if (raisonArret === "max_tokens") {
      console.warn("Réponse Claude tronquée:", { usage: claudeData?.usage });
      return new Response(JSON.stringify({ error: "La réponse générée est trop longue. Réduis le nombre de questions et réessaie." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = Array.isArray(claudeData?.content)
      ? claudeData.content.filter((bloc: any) => bloc.type === "text").map((bloc: any) => bloc.text).join("\n").trim()
      : "";
    if (!rawText) {
      console.error("Réponse Claude sans contenu texte:", raisonArret ?? "raison inconnue");
      return new Response(JSON.stringify({ error: "Le service IA n'a pas fourni de questionnaire exploitable. Réessaie." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = extraireObjetJson(rawText);
    } catch {
      console.error("Réponse Claude non JSON:", { raisonArret: raisonArret ?? "inconnue", longueur: rawText.length });
      return new Response(JSON.stringify({ error: "La réponse du service IA est incomplète ou au mauvais format. Réessaie." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validation = quizIaSchema.safeParse(parsedJson);
    if (!validation.success) {
      const erreurs = validation.error.issues.slice(0, 5).map((issue) => ({
        chemin: issue.path.map(String).join("."),
        message: issue.message,
      }));
      console.error("Réponse Claude incompatible avec le schéma du questionnaire:", erreurs);
      const details = erreurs.map((issue) => `${issue.chemin || "réponse"}: ${issue.message}`).join("; ");
      return new Response(JSON.stringify({ error: `La réponse générée est incompatible avec le format attendu. ${details}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: matiereExistante } = await supabaseAdmin
      .from("matieres")
      .select("id")
      .ilike("nom", validation.data.matiere_nom)
      .maybeSingle();

    let matiereId: string;
    if (matiereExistante) {
      matiereId = matiereExistante.id;
    } else {
      const { data: matiereCreee, error: erreurMatiere } = await supabaseAdmin
        .from("matieres")
        .insert({ nom: validation.data.matiere_nom, description: null })
        .select("id")
        .single();
      if (erreurMatiere) throw erreurMatiere;
      matiereId = matiereCreee.id;
    }

    const payload = {
      titre: requete.titre?.trim() || `Créé — ${validation.data.titre}`,
      type: "personnalise",
      matiere_id: matiereId,
      est_avance: requete.type_quiz === "avance",
      duree_secondes: dureeSecondes,
      questions: validation.data.questions.slice(0, MAX_QUESTIONS_PAR_QUIZ).map((q, i) => ({
        notion_nom: q.notion_nom,
        type: q.type,
        intitule: q.intitule,
        explication: q.explication,
        source_page: q.source_page,
        source_excerpt: q.source_excerpt,
        points: q.type === "qcm" || q.type === "qcu" ? 1 : 2,
        ordre: i,
        reponses: q.reponses ?? undefined,
        criteres_evaluation: q.criteres_evaluation ?? undefined,
      })),
    };

    const { data: quizId, error: rpcError } = await supabaseAdmin.rpc("create_quiz_with_questions", {
      payload,
      p_created_by: userData.user.id,
      p_is_public: false,
    });
    if (rpcError) throw rpcError;

    const difficulteFinale = requete.difficulte ?? validation.data.difficulte ?? quizOriginal?.difficulte ?? "moyen";
    const { error: erreurDifficulte } = await supabaseAdmin
      .from("quiz")
      .update({ difficulte: difficulteFinale })
      .eq("id", quizId);
    if (erreurDifficulte) throw erreurDifficulte;

    const { data: questionsCreees, error: questionsCreeesError } = await supabaseAdmin
      .from("quiz_questions")
      .select("question_id")
      .eq("quiz_id", quizId)
      .order("ordre");
    if (questionsCreeesError) throw questionsCreeesError;
    if (questionsCreees?.length !== payload.questions.length) {
      throw new Error("Impossible d'associer une source à chaque question générée.");
    }

    const sources = (questionsCreees || []).flatMap((liaison: { question_id: string }, index: number) => {
      const question = payload.questions[index];
      return question ? [{
        quiz_id: quizId,
        question_id: liaison.question_id,
        fichier_id: requete.fichier_id!,
        page: question.source_page,
        extrait: question.source_excerpt,
      }] : [];
    });
    const { error: erreurSources } = await supabaseAdmin.from("quiz_question_sources").insert(sources);
    if (erreurSources) throw erreurSources;

    let quizFinalId = quizId;
    if (quizOriginal) {
      const { error: erreurRemplacement } = await supabaseAdmin.rpc("replace_personal_quiz_questions", {
        p_quiz_id: quizOriginal.id,
        p_quiz_genere_id: quizId,
        p_user_id: userData.user.id,
        p_ordres_a_remplacer: requete.regeneration === "selection" ? ordresARegenerer : null,
      });
      if (erreurRemplacement) throw erreurRemplacement;
      quizFinalId = quizOriginal.id;

      const [{ error: erreurBrouillon }, { error: erreurRevisions }] = await Promise.all([
        supabaseAdmin.from("quiz_drafts").delete().eq("quiz_id", quizOriginal.id).eq("user_id", userData.user.id),
        supabaseAdmin.from("questions_a_revoir").delete().eq("quiz_id", quizOriginal.id).eq("user_id", userData.user.id),
      ]);
      if (erreurBrouillon || erreurRevisions) {
        console.warn("État de session personnalisé non entièrement nettoyé après régénération:", {
          brouillon: erreurBrouillon?.message,
          revisions: erreurRevisions?.message,
        });
      }
    }

    if (profile.abonnement_intervalle === "mensuel") {
      await supabaseAdmin
        .from("profiles")
        .update({ generations_ia_ce_mois: compteurGenerations + 1, generations_ia_reset_mois: new Date().toISOString().slice(0, 10) })
        .eq("id", userData.user.id);
    }

    return new Response(JSON.stringify({ quiz_id: quizFinalId }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erreur generate-quiz-ia:", err);
    return new Response(JSON.stringify({ error: err?.message ?? JSON.stringify(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});