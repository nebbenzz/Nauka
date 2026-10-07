import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../includes/Header";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
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

export default function CreerQuestionnairePage() {
  const { session, chargement: chargementSession } = useSession();
  const navigate = useNavigate();
  const { couleur } = useThemeColor();

  const [plan, setPlan] = useState<"decouverte" | "pro" | null>(null);
  const [domaineUtilisateur, setDomaineUtilisateur] = useState<string | null>(null);

  const [titre, setTitre] = useState("");
  const [nombreQuestions, setNombreQuestions] = useState(5);
  const [typeQuiz, setTypeQuiz] = useState<"standard" | "avance">("standard");
  const [dureeMinutes, setDureeMinutes] = useState(15);
  const [difficulte, setDifficulte] = useState<"" | "facile" | "moyen" | "difficile">("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etape, setEtape] = useState<"idle" | "televersement" | "generation">("idle");

  useEffect(() => {
    if (!chargementSession && !session) navigate("/connexion");
  }, [chargementSession, session, navigate]);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("plan, pro_expires_at, formation")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        const proActif = data?.plan === "pro" && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
        setPlan(proActif ? "pro" : "decouverte");
        if (data?.formation) {
          const domaine = FORMATIONS.find((f) => f.label === data.formation)?.domaine ?? null;
          setDomaineUtilisateur(domaine);
        }
      });
  }, [session]);

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
    if (!fichier || !session?.user) return;
    setErreur(null);

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

    setEtape("generation");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setEtape("idle");
      setErreur("Ta session a expiré, reconnecte-toi et réessaie.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("generate-quiz-ia", {
      body: {
        fichier_id: fichierInsere.id,
        titre: titre.trim() || undefined,
        nombre_questions: nombreQuestions,
        type_quiz: typeQuiz,
        duree_minutes: typeQuiz === "avance" ? dureeMinutes : undefined,
        difficulte: difficulte || undefined,
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
          <h1 className="mt-2 font-display text-3xl font-extrabold">Créer un questionnaire</h1>
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
            <p className="mt-1 text-sm text-inkmuted">Ajoute le cours à partir duquel le questionnaire sera créé.</p>
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
            {erreurFichier && <p className="mt-2 text-xs text-red-600">{erreurFichier}</p>}
          </section>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={!fichier || enCours}
            style={{ backgroundColor: couleur }}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {etape === "televersement"
              ? "Envoi du document..."
              : etape === "generation"
              ? "Génération en cours (peut prendre une minute)..."
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