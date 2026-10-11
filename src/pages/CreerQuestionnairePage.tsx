import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../includes/Header";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import { removeQuizSessionState } from "../lib/quizSessionState";
import { clearQuizDraft } from "../lib/quizDraft";
import { FORMATIONS } from "../data/formations";
import { useThemeColor } from "../hooks/useThemeColor";

const TAILLE_MIN_MO = 0.02;
const TAILLE_MAX_MO = 15;

function IconStandard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="5" cy="6" r="2" />
      <line x1="10" y1="6" x2="21" y2="6" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <circle cx="5" cy="18" r="2" />
      <line x1="10" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconAvance() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function IconTrombone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M8 12V6a4 4 0 0 1 8 0v10a2.5 2.5 0 0 1-5 0V8" />
    </svg>
  );
}

function formaterDureeEcoulee(secondes: number): string {
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return `${minutes}:${String(reste).padStart(2, "0")}`;
}

export default function CreerQuestionnairePage() {
  const { session, chargement: chargementSession } = useSession();
  const navigate = useNavigate();
  const { couleur } = useThemeColor();
  const quizIdModification = new URLSearchParams(window.location.search).get("quiz_id");

  const [plan, setPlan] = useState<"decouverte" | "pro" | null>(null);
  const [domaineUtilisateur, setDomaineUtilisateur] = useState<string | null>(null);

  const [titre, setTitre] = useState("");
  const [nombreQuestions, setNombreQuestions] = useState(5);
  const [typeQuiz, setTypeQuiz] = useState<"standard" | "avance">("standard");
  const [dureeMinutes, setDureeMinutes] = useState(15);
  const [difficulte, setDifficulte] = useState<"" | "facile" | "moyen" | "difficile">("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierExistant, setFichierExistant] = useState<{ id: string; nom: string } | null>(null);
  const [questionsExistantes, setQuestionsExistantes] = useState<{ id: string; intitule: string; ordre: number }[]>([]);
  const [questionsARegenerer, setQuestionsARegenerer] = useState<string[]>([]);
  const [parametresInitiaux, setParametresInitiaux] = useState<{ estAvance: boolean; dureeMinutes: number | null; difficulte: string } | null>(null);
  const [chargementModification, setChargementModification] = useState(Boolean(quizIdModification));
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etape, setEtape] = useState<"idle" | "televersement" | "generation">("idle");
  const [debutTraitement, setDebutTraitement] = useState<number | null>(null);
  const [dureeTraitement, setDureeTraitement] = useState(0);

  useEffect(() => {
    if (etape === "idle" || debutTraitement === null) return;
    const intervalle = window.setInterval(() => {
      setDureeTraitement(Math.floor((Date.now() - debutTraitement) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalle);
  }, [debutTraitement, etape]);

  useEffect(() => {
    if (!chargementSession && !session) navigate("/connexion");
  }, [chargementSession, session, navigate]);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("plan, pro_expires_at, abonnement_intervalle, formation")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        const estAbonnementActif = data?.abonnement_intervalle === "mensuel" || data?.abonnement_intervalle === "annuel";
        const proActif = data?.plan === "pro" && (estAbonnementActif || !data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
        setPlan(proActif ? "pro" : "decouverte");
        if (data?.formation) {
          const domaine = FORMATIONS.find((f) => f.label === data.formation)?.domaine ?? null;
          setDomaineUtilisateur(domaine);
        }
      });
  }, [session]);

  useEffect(() => {
    const utilisateurId = session?.user?.id;
    if (!quizIdModification || !utilisateurId) return;

    async function chargerQuizAModifier() {
      const { data: quiz, error: erreurQuiz } = await supabase
        .from("quiz")
        .select("id, titre, type, est_avance, duree_secondes, difficulte")
        .eq("id", quizIdModification)
        .eq("created_by", utilisateurId)
        .eq("type", "personnalise")
        .maybeSingle();

      if (erreurQuiz || !quiz) {
        setErreur("Ce questionnaire personnalisé est introuvable ou ne t'appartient pas.");
        setChargementModification(false);
        return;
      }

      setTitre(quiz.titre);
      setTypeQuiz(quiz.est_avance ? "avance" : "standard");
      setDureeMinutes(quiz.duree_secondes ? Math.round(quiz.duree_secondes / 60) : 15);
      setDifficulte((quiz.difficulte ?? "moyen") as typeof difficulte);
      setParametresInitiaux({
        estAvance: quiz.est_avance,
        dureeMinutes: quiz.duree_secondes ? Math.round(quiz.duree_secondes / 60) : null,
        difficulte: quiz.difficulte ?? "moyen",
      });

      const [{ data: liaisons }, { data: source }] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("ordre, questions(id, intitule)")
          .eq("quiz_id", quiz.id)
          .order("ordre"),
        supabase
          .from("quiz_question_sources")
          .select("fichier_id")
          .eq("quiz_id", quiz.id)
          .limit(1)
          .maybeSingle(),
      ]);

      const questions = (liaisons ?? []).flatMap((liaison) => {
        const question = Array.isArray(liaison.questions) ? liaison.questions[0] : liaison.questions;
        return question ? [{ id: question.id, intitule: question.intitule, ordre: liaison.ordre }] : [];
      });
      setQuestionsExistantes(questions);
      setNombreQuestions(Math.min(5, Math.max(3, questions.length)));

      if (source?.fichier_id) {
        const { data: fichierSource } = await supabase
          .from("fichiers_utilisateur")
          .select("id, nom_fichier")
          .eq("id", source.fichier_id)
          .eq("user_id", utilisateurId)
          .maybeSingle();
        if (fichierSource) setFichierExistant({ id: fichierSource.id, nom: fichierSource.nom_fichier });
      }
      setChargementModification(false);
    }

    void chargerQuizAModifier();
  }, [quizIdModification, session?.user?.id]);

  function handleFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErreurFichier(null);
    setFichier(null);
    if (!f) return;

    if (f.type !== "application/pdf") {
      setErreurFichier("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    const tailleMo = f.size / (1024 * 1024);
    if (tailleMo < TAILLE_MIN_MO) {
      setErreurFichier("Ce fichier est trop petit pour être un document exploitable.");
      return;
    }
    if (tailleMo > TAILLE_MAX_MO) {
      setErreurFichier(`Ce fichier dépasse la taille maximale autorisée (${TAILLE_MAX_MO} Mo).`);
      return;
    }
    setFichier(f);
  }

  async function handleSoumettre(e: FormEvent) {
    e.preventDefault();
    if ((!fichier && !fichierExistant) || !session?.user) return;
    setErreur(null);

    const fichierChange = fichier !== null;
    const nombreChange = quizIdModification !== null && nombreQuestions !== questionsExistantes.length;
    const formatChange = !!parametresInitiaux && (
      (typeQuiz === "avance") !== parametresInitiaux.estAvance
      || (typeQuiz === "avance" && dureeMinutes !== parametresInitiaux.dureeMinutes)
    );
    const difficulteChange = !!parametresInitiaux && (difficulte || "moyen") !== parametresInitiaux.difficulte;
    const toutesARegenerer = !quizIdModification || fichierChange || nombreChange || formatChange || difficulteChange || questionsARegenerer.length === questionsExistantes.length;
    const regeneration = !quizIdModification
      ? undefined
      : toutesARegenerer
        ? "tout"
        : questionsARegenerer.length > 0
          ? "selection"
          : "aucune";

    if (regeneration !== "aucune") {
      setDebutTraitement(Date.now());
      setDureeTraitement(0);
    }

    let fichierId = fichierExistant?.id;
    if (fichier) {
      setEtape("televersement");
      const nomSanitise = fichier.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const chemin = `${session.user.id}/${Date.now()}-${nomSanitise}`;

      const { error: erreurUpload } = await supabase.storage.from("fichiers-utilisateur").upload(chemin, fichier);
      if (erreurUpload) {
        setEtape("idle");
        setErreur("Échec de l'envoi du fichier. Réessaie.");
        return;
      }

      const { data: fichierInsere, error: erreurInsertion } = await supabase
        .from("fichiers_utilisateur")
        .insert({ user_id: session.user.id, nom_fichier: fichier.name, storage_path: chemin })
        .select("id")
        .single();
      if (erreurInsertion || !fichierInsere) {
        setEtape("idle");
        setErreur("Échec de l'enregistrement du fichier. Réessaie.");
        return;
      }
      fichierId = fichierInsere.id;
    }

    if (regeneration !== "aucune") setEtape("generation");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setEtape("idle");
      setErreur("Ta session a expiré, reconnecte-toi et réessaie.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("generate-quiz-ia", {
      body: {
        fichier_id: fichierId,
        quiz_id: quizIdModification ?? undefined,
        regeneration,
        question_ids_a_regenerer: regeneration === "selection" ? questionsARegenerer : undefined,
        titre: titre.trim() || undefined,
        nombre_questions: regeneration === "selection" ? questionsARegenerer.length : nombreQuestions,
        type_quiz: typeQuiz,
        duree_minutes: typeQuiz === "avance" ? dureeMinutes : undefined,
        difficulte: difficulte || null,
        domaine_utilisateur: domaineUtilisateur || undefined,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    setEtape("idle");

    if (error) {
      let messageErreur = "La génération a échoué. Réessaie.";
      if ("context" in error && error.context instanceof Response) {
        const detail = await error.context.clone().json().catch(() => null);
        if (typeof detail?.error === "string") messageErreur = detail.error;
      }
      setErreur(messageErreur);
      return;
    }
    if (data?.error) {
      setErreur(typeof data.error === "string" ? data.error : "La génération a échoué. Réessaie.");
      return;
    }

    if (quizIdModification && regeneration !== "aucune") {
      clearQuizDraft(quizIdModification, session.user.id);
      try {
        removeQuizSessionState(`${quizIdModification}:dernier-tirage`);
        removeQuizSessionState(`${quizIdModification}:source-verifiee:${session.user.id}`);
        removeQuizSessionState(`${quizIdModification}:reponses-revelees:${session.user.id}`);
      } catch {
        // La régénération est terminée même si le navigateur bloque le stockage local.
      }
    }

    navigate(`/questionnaires/${data.quiz_id}`);
  }

  if (chargementSession || plan === null) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <p className="mx-auto max-w-2xl px-6 py-12 text-sm text-inkmuted">Chargement...</p>
      </div>
    );
  }

  if (chargementModification) {
    return <div className="min-h-screen bg-paper"><Header /><p className="mx-auto max-w-2xl px-6 py-12 text-sm text-inkmuted">Chargement du questionnaire...</p></div>;
  }

  if (plan !== "pro") {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-extrabold">Fonctionnalité réservée au forfait Pro</h1>
          <p className="mt-3 text-sm text-inkmuted">
            La création de questionnaires personnalisés à partir de tes propres documents est disponible avec le forfait Pro.
          </p>
          <button
            type="button"
            onClick={() => navigate("/abonnements")}
            className="mt-6 rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-navy transition-colors"
          >
            Passer au forfait Pro
          </button>
        </div>
      </div>
    );
  }

  const enCours = etape !== "idle";

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <a href="/questionnaires" className="inline-flex items-center gap-1.5 text-sm text-inkmuted hover:text-ink transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour aux questionnaires
        </a>
        <div className="mt-5 border-b border-line pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-inkmuted">Questionnaire personnalisé</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{quizIdModification ? "Modifier un questionnaire" : "Créer un questionnaire"}</h1>
          <p className="mt-2 text-sm text-inkmuted">
          Génère un questionnaire personnalisé à partir de tes propres cours.
          </p>
        </div>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form onSubmit={handleSoumettre} className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">Réglages du questionnaire</h2>
            <p className="mt-1 text-sm text-inkmuted">Définis le format et le niveau de ta session.</p>
            <label htmlFor="titre-questionnaire" className="mt-5 block text-xs font-medium text-inkmuted">Titre (facultatif)</label>
            <input
              id="titre-questionnaire"
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Laisse vide pour un titre généré automatiquement"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nombre-questions" className="text-xs font-medium text-inkmuted">Nombre de questions (3 à 5)</label>
                <input
                  id="nombre-questions"
                  type="number"
                  min={3}
                  max={5}
                  value={nombreQuestions}
                  onChange={(e) => setNombreQuestions(Math.min(5, Math.max(3, Number(e.target.value))))}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div>
                <label htmlFor="difficulte" className="text-xs font-medium text-inkmuted">Difficulté (facultatif)</label>
                <select
                  id="difficulte"
                  value={difficulte}
                  onChange={(e) => setDifficulte(e.target.value as typeof difficulte)}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                >
                  <option value="">Aléatoire</option>
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">Format</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTypeQuiz("standard")}
                style={typeQuiz === "standard" ? { borderColor: couleur, backgroundColor: `${couleur}14` } : undefined}
                className={
                  typeQuiz === "standard"
                    ? "rounded-md border-2 p-4 text-left transition-colors"
                    : "rounded-md border border-line bg-white p-4 text-left transition-colors hover:border-ink/30"
                }
              >
                <IconStandard />
                <p className="mt-2 text-sm font-bold">Standard</p>
                <p className="mt-0.5 text-xs text-inkmuted">QCM et QCU, sans chronomètre.</p>
              </button>
              <button
                type="button"
                onClick={() => setTypeQuiz("avance")}
                style={typeQuiz === "avance" ? { borderColor: couleur, backgroundColor: `${couleur}14` } : undefined}
                className={
                  typeQuiz === "avance"
                    ? "rounded-md border-2 p-4 text-left transition-colors"
                    : "rounded-md border border-line bg-white p-4 text-left transition-colors hover:border-ink/30"
                }
              >
                <IconAvance />
                <p className="mt-2 text-sm font-bold">Avancé</p>
                <p className="mt-0.5 text-xs text-inkmuted">Chronométré, code, dessin, réponses rédigées.</p>
              </button>
            </div>

            {typeQuiz === "avance" && (
              <div className="mt-3">
                <label htmlFor="duree-minutes" className="text-xs font-medium text-inkmuted">Durée en minutes (5 à 30)</label>
                <input
                  id="duree-minutes"
                  type="number"
                  min={5}
                  max={30}
                  value={dureeMinutes}
                  onChange={(e) => setDureeMinutes(Math.min(30, Math.max(5, Number(e.target.value))))}
                  className="mt-1 w-full max-w-[10rem] rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">Document source</h2>
            <p className="mt-1 text-sm text-inkmuted">{quizIdModification ? "Conserve le PDF actuel ou remplace-le pour régénérer les questions." : "Ajoute le cours à partir duquel le questionnaire sera créé."}</p>
            <p className="mt-2 text-xs leading-5 text-inkmuted">Ton PDF reste privé et n'est jamais ajouté au catalogue public.</p>
            <label
              htmlFor="fichier-pdf"
              className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-line bg-paper/60 px-4 py-8 text-center transition-colors hover:border-ink/40 hover:bg-paper"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-highlight/30 text-ink">
                <IconTrombone />
              </span>
              <span className="text-sm font-medium">Clique pour joindre un PDF</span>
              <span className="text-xs text-inkmuted">PDF non chiffré, entre 20 Ko et {TAILLE_MAX_MO} Mo, une soixantaine de pages maximum.</span>
              <input id="fichier-pdf" type="file" accept="application/pdf" onChange={handleFichier} className="hidden" />
            </label>
            {fichier && !erreurFichier && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-md border border-sage/30 bg-sage/10 px-3 py-2 text-xs text-sage">
                {fichier.name} — {(fichier.size / (1024 * 1024)).toFixed(2)} Mo
              </p>
            )}
            {!fichier && fichierExistant && <p className="mt-3 text-xs text-inkmuted">PDF actuel : {fichierExistant.nom}</p>}
            {erreurFichier && <p className="mt-2 text-xs text-red-600">{erreurFichier}</p>}
          </section>

          {quizIdModification && questionsExistantes.length > 0 && (
            <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">Questions à régénérer</h2>
                  <p className="mt-1 text-sm text-inkmuted">Laisse la sélection vide pour conserver toutes les questions.</p>
                </div>
                <div className="flex gap-3 text-xs font-semibold">
                  <button type="button" onClick={() => setQuestionsARegenerer(questionsExistantes.map((question) => question.id))} className="text-navy underline underline-offset-2">Tout sélectionner</button>
                  <button type="button" onClick={() => setQuestionsARegenerer([])} className="text-inkmuted underline underline-offset-2">Tout désélectionner</button>
                </div>
              </div>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {questionsExistantes.map((question, index) => (
                  <label key={question.id} className="flex cursor-pointer items-start gap-3 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={questionsARegenerer.includes(question.id)}
                      onChange={(event) => setQuestionsARegenerer((actuelles) => event.target.checked
                        ? [...actuelles, question.id]
                        : actuelles.filter((id) => id !== question.id))}
                      className="mt-1 h-4 w-4 shrink-0 flex-none accent-navy"
                      style={{ width: "1rem", height: "1rem" }}
                    />
                    <span><span className="font-semibold text-ink">Question {index + 1}.</span> {question.intitule}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-inkmuted">Remplacer le PDF, le nombre de questions ou le format régénère tout le questionnaire. La régénération d’une sélection ne regénère que les questions cochées.</p>
            </section>
          )}

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          {enCours && (
            <section role="status" aria-live="polite" className="border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-navy">Progression</p>
                  <h2 className="mt-1 font-display text-lg font-bold">{etape === "televersement" ? "Envoi du document" : "Analyse et génération"}</h2>
                </div>
                <p className="font-mono text-sm font-semibold tabular-nums text-ink" aria-label="Durée écoulée">{formaterDureeEcoulee(dureeTraitement)}</p>
              </div>

              <ol className="mt-5 space-y-4">
                <li className="flex items-start gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${etape === "televersement" ? "bg-navy text-white" : "bg-sage/20 text-sage"}`}>
                    {etape === "televersement" ? "1" : "✓"}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">Transfert du PDF</span>
                    <span className="mt-0.5 block text-xs text-inkmuted">{etape === "televersement" ? "Envoi sécurisé vers ton espace privé…" : "Document transmis"}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${etape === "generation" ? "animate-pulse bg-navy text-white" : "border border-line bg-white text-inkmuted"}`}>
                    2
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${etape === "generation" ? "text-ink" : "text-inkmuted"}`}>Lecture du cours et création des questions</span>
                    <span className="mt-0.5 block text-xs text-inkmuted">Claude analyse le document et prépare le questionnaire.</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-white text-xs font-bold text-inkmuted">3</span>
                  <span>
                    <span className="block text-sm font-semibold text-inkmuted">Validation et enregistrement</span>
                    <span className="mt-0.5 block text-xs text-inkmuted">Le questionnaire s’ouvrira dès que cette étape sera terminée.</span>
                  </span>
                </li>
              </ol>
              <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-inkmuted">L’analyse peut prendre un moment selon la taille du PDF. Garde cette page ouverte pendant le traitement.</p>
            </section>
          )}

          <button
            type="submit"
            disabled={(!fichier && !fichierExistant) || enCours}
            style={{ backgroundColor: couleur }}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {etape === "televersement"
              ? "Envoi du document..."
              : etape === "generation"
              ? "Génération en cours (peut prendre une minute)..."
              : quizIdModification
                ? "Enregistrer les modifications"
                : "Générer le questionnaire"}
          </button>
        </form>

        <aside className="rounded-lg border border-line bg-white p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">Récapitulatif</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-inkmuted">Questions</dt>
              <dd className="text-right font-semibold">{nombreQuestions}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-inkmuted">Difficulté</dt>
              <dd className="text-right font-semibold">{difficulte || "Aléatoire"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-inkmuted">Format</dt>
              <dd className="text-right font-semibold">{typeQuiz === "avance" ? "Avancé" : "Standard"}</dd>
            </div>
            {typeQuiz === "avance" && (
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="text-inkmuted">Durée</dt>
                <dd className="text-right font-semibold">{dureeMinutes} min</dd>
              </div>
            )}
            <div className="py-3">
              <dt className="text-inkmuted">Document</dt>
              <dd className="mt-1 break-words font-medium">{fichier?.name || "Aucun document sélectionné"}</dd>
            </div>
          </dl>
        </aside>
        </div>
      </div>
    </div>
  );
}