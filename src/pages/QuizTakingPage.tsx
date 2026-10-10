import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../includes/Header";
import Chronometre from "../components/Chronometre";
import ZoneCode from "../components/ZoneCode";
import ZoneDessin from "../components/ZoneDessin";
import ZoneLibre from "../components/ZoneLibre";
import { useSession } from "../hooks/useSession";
import { choisirBrouillonLePlusRecent, clearQuizDraft, getQuestionsFromDraft, readQuizDraft, saveQuizDraft, type QuizDraft } from "../lib/quizDraft";
import { effacerQuizDraftDistant, lireQuizDraftDistant, sauvegarderQuizDraftDistant } from "../lib/quizDraftCloud";
import { recompenserParrainage } from "../lib/referral";
import { supabase } from "../lib/supabaseClient";
import { filtrerQuestionsParNiveau, filtrerQuestionsParNiveauCible, melanger, tirerQuestionsAvancees, tirerQuestionsStandard } from "../lib/quizSelection";

interface Reponse {
  id: string;
  texte: string;
  est_correcte: boolean;
}
interface Question {
  id: string;
  type: "qcm" | "qcu" | "code" | "dessin" | "libre";
  intitule: string;
  explication: string | null;
  points: number;
  niveau: number | null;
  notion_niveau: number | null;
  reponses: Reponse[];
}
interface QuestionAvecReponsesOrdonnees extends Omit<Question, "reponses" | "notion_niveau"> {
  notions: { niveau: number | null } | { niveau: number | null }[] | null;
  reponses: (Reponse & { ordre: number })[] | null;
}
interface LiaisonQuestion {
  questions: QuestionAvecReponsesOrdonnees | QuestionAvecReponsesOrdonnees[] | null;
}
interface DetailAvance {
  question_id: string;
  type: string;
  statut: "correct" | "partiel" | "incorrect";
  feedback: string;
  correction: string | null;
}
interface SourceQuestion {
  question_id: string;
  fichier_id: string;
  page: number;
  extrait: string;
}

function lireTiragePrecedent(quizId: string): string[] {
  try {
    const tirage = sessionStorage.getItem(`notio:quiz:${quizId}:dernier-tirage`);
    return tirage ? JSON.parse(tirage) as string[] : [];
  } catch {
    return [];
  }
}

function enregistrerTirage(quizId: string, questions: Question[]) {
  try {
    sessionStorage.setItem(
      `notio:quiz:${quizId}:dernier-tirage`,
      JSON.stringify(questions.map((question) => question.id))
    );
  } catch {
    // Le tirage reste fonctionnel si le stockage du navigateur est indisponible.
  }
}

function effacerBrouillonUtilisateur(quizId: string, userId: string) {
  clearQuizDraft(quizId, userId);
  void effacerQuizDraftDistant(quizId, userId);
}

const STYLE_STATUT: Record<string, string> = {
  correct: "bg-sage/20 text-sage",
  partiel: "bg-highlight/30 text-ink",
  incorrect: "bg-red-100 text-red-700",
};
const LABEL_STATUT: Record<string, string> = {
  correct: "Correct",
  partiel: "Partiellement correct",
  incorrect: "Incorrect",
};

function aDesReponsesSauvables(
  selections: Record<string, string[]>,
  reponsesAvancees: Record<string, string>
): boolean {
  return Object.keys(selections).length > 0 || Object.keys(reponsesAvancees).length > 0;
}

export default function QuizTakingPage() {
  const { id } = useParams<{ id: string }>();
  const { session, chargement: chargementSession } = useSession();
  const navigate = useNavigate();
  const revisionDue = new URLSearchParams(window.location.search).get("revision") === "due";

  const [titre, setTitre] = useState("");
  const [sourcesQuestion, setSourcesQuestion] = useState<SourceQuestion[]>([]);
  const [nomDocumentSource, setNomDocumentSource] = useState("");
  const [urlDocumentSource, setUrlDocumentSource] = useState<string | null>(null);
  const [erreurSource, setErreurSource] = useState<string | null>(null);
  const [verificationSourceRequise, setVerificationSourceRequise] = useState(false);
  const [sourceVerifiee, setSourceVerifiee] = useState(false);
  const [questionSignalee, setQuestionSignalee] = useState<string | null>(null);
  const [detailsSignalement, setDetailsSignalement] = useState("");
  const [envoiSignalement, setEnvoiSignalement] = useState(false);
  const [signalementEnvoye, setSignalementEnvoye] = useState<string | null>(null);
  const [erreurSignalement, setErreurSignalement] = useState<string | null>(null);
  const [estAvance, setEstAvance] = useState(false);
  const [dureeSecondes, setDureeSecondes] = useState<number | null>(null);
  const [questionsDisponibles, setQuestionsDisponibles] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [reponsesAvancees, setReponsesAvancees] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
  const [resultat, setResultat] = useState<{ score: number; scoreMax: number } | null>(null);
  const [resultatAvance, setResultatAvance] = useState<{ score: number; scoreMax: number; details: DetailAvance[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confirmerQuitter, setConfirmerQuitter] = useState(false);
  const [relectureImmediate, setRelectureImmediate] = useState(false);
  const [brouillon, setBrouillon] = useState<QuizDraft | null>(null);
  const [brouillonDisponible, setBrouillonDisponible] = useState(false);
  const [brouillonPret, setBrouillonPret] = useState(false);
  const [brouillonSynchronise, setBrouillonSynchronise] = useState(false);
  const estModeRelecture = revisionDue || relectureImmediate;

  useEffect(() => {
    if (!chargementSession && !session) navigate("/connexion");
  }, [chargementSession, session, navigate]);

  useEffect(() => {
    if (!id || !session?.user.id || !questions.length || resultat || resultatAvance || !brouillonPret) return;

    if (!aDesReponsesSauvables(selections, reponsesAvancees)) {
      if (!brouillonDisponible) effacerBrouillonUtilisateur(id, session.user.id);
      return;
    }

    const draft = {
      selections,
      reponsesAvancees,
      questionsIds: questions.map((question) => question.id),
      updatedAt: new Date().toISOString(),
    };
    saveQuizDraft(id, session.user.id, draft);
    const timer = window.setTimeout(() => {
      void sauvegarderQuizDraftDistant(id, session.user.id, draft).then(setBrouillonSynchronise);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [brouillonDisponible, brouillonPret, id, questions, reponsesAvancees, resultat, resultatAvance, selections, session?.user.id]);

  useEffect(() => {
    if (!id || !session?.user.id) return;

    const sauvegarderAvantSortie = () => {
      if (resultat || resultatAvance) {
        effacerBrouillonUtilisateur(id, session.user.id);
        return;
      }
      if (!aDesReponsesSauvables(selections, reponsesAvancees)) {
        if (!brouillonDisponible) effacerBrouillonUtilisateur(id, session.user.id);
        return;
      }

      const draft = {
        selections,
        reponsesAvancees,
        questionsIds: questions.map((question) => question.id),
        updatedAt: new Date().toISOString(),
      };
      saveQuizDraft(id, session.user.id, draft);
      void sauvegarderQuizDraftDistant(id, session.user.id, draft);
    };

    window.addEventListener("pagehide", sauvegarderAvantSortie);
    return () => window.removeEventListener("pagehide", sauvegarderAvantSortie);
  }, [brouillonDisponible, id, questions, reponsesAvancees, resultat, resultatAvance, selections, session?.user.id]);

  useEffect(() => {
    const user = session?.user;
    if (!id || !user) return;
    const userId = user.id;
    const quizId = id;

    async function charger() {
      const { data: quiz } = await supabase
        .from("quiz")
        .select("titre, type, est_avance, duree_secondes, niveau_cible")
        .eq("id", quizId)
        .single();
      if (quiz) {
        setTitre(quiz.titre);
        setEstAvance(quiz.est_avance);
        setDureeSecondes(quiz.duree_secondes);
      }
      let niveauUtilisateur: number | null = null;
      if (quiz?.type === "global") {
        const { data: profil } = await supabase
          .from("profiles")
          .select("niveau_formation")
          .eq("id", userId)
          .maybeSingle();
        niveauUtilisateur = profil?.niveau_formation ?? null;
      }

      const { data: sources, error: erreurChargementSources } = await supabase
        .from("quiz_question_sources")
        .select("question_id, fichier_id, page, extrait")
        .eq("quiz_id", quizId);
      if (erreurChargementSources && quiz?.type === "personnalise") {
        setVerificationSourceRequise(true);
        setErreurSource("Impossible de charger les références du document. Réessaie plus tard.");
      } else if (sources?.length) {
        setVerificationSourceRequise(true);
        setSourcesQuestion(sources as SourceQuestion[]);
        const fichierId = sources[0].fichier_id;
        const { data: fichierSource, error: erreurFichierSource } = await supabase
          .from("fichiers_utilisateur")
          .select("nom_fichier, storage_path")
          .eq("id", fichierId)
          .single();
        if (erreurFichierSource || !fichierSource) {
          setErreurSource("Le document source n'est pas accessible. Le questionnaire ne peut pas démarrer sans vérification.");
        } else {
          setNomDocumentSource(fichierSource.nom_fichier);
          const { data: urlSignee, error: erreurUrlSignee } = await supabase.storage
            .from("fichiers-utilisateur")
            .createSignedUrl(fichierSource.storage_path, 900);
          if (erreurUrlSignee || !urlSignee) {
            setErreurSource("Impossible d'ouvrir le document source. Réessaie de charger le questionnaire.");
          } else {
            setUrlDocumentSource(urlSignee.signedUrl);
          }
        }
      }

      const { data: liaisons } = await supabase
        .from("quiz_questions")
        .select("ordre, questions(id, type, intitule, explication, points, niveau, notions(niveau), reponses(id, texte, est_correcte, ordre))")
        .eq("quiz_id", quizId)
        .order("ordre");

      if (liaisons) {
        const qs: Question[] = (liaisons as unknown as LiaisonQuestion[]).flatMap(({ questions: relation }) => {
          const question = Array.isArray(relation) ? relation[0] : relation;
          if (!question) return [];
          const notion = Array.isArray(question.notions) ? question.notions[0] : question.notions;
          return [{
            id: question.id,
            type: question.type,
            intitule: question.intitule,
            explication: question.explication,
            points: question.points,
            niveau: question.niveau ?? notion?.niveau ?? null,
            notion_niveau: notion?.niveau ?? null,
            reponses: [...(question.reponses || [])].sort((a, b) => a.ordre - b.ordre),
          }];
        });
        const questionsAdaptees = typeof quiz?.niveau_cible === "number"
          ? filtrerQuestionsParNiveauCible(qs, quiz.niveau_cible, niveauUtilisateur)
          : quiz?.type === "global"
            ? filtrerQuestionsParNiveau(qs, niveauUtilisateur)
            : qs;
        let questionsPourSession = questionsAdaptees;
        if (revisionDue) {
          const { data: revisions, error: erreurRevisions } = await supabase
            .from("questions_a_revoir")
            .select("question_id")
            .eq("quiz_id", quizId)
            .lte("a_revoir_le", new Date().toISOString())
            .order("a_revoir_le")
            .limit(5);
          if (erreurRevisions) {
            setErreur("Impossible de charger les questions à revoir.");
            questionsPourSession = [];
          } else {
            const idsARevoir = new Set(((revisions || []) as { question_id: string }[]).map((revision) => revision.question_id));
            questionsPourSession = questionsAdaptees.filter((question) => idsARevoir.has(question.id));
            if (questionsPourSession.length === 0) {
              setErreur("Aucune question de ce questionnaire n'est actuellement à revoir.");
            }
          }
        }

        setQuestionsDisponibles(questionsPourSession);
        if (revisionDue) {
          setQuestions(melanger(questionsPourSession));
        } else {
          const idsPrecedents = lireTiragePrecedent(quizId);
          if (quiz?.est_avance) {
            const questionsTirees = tirerQuestionsAvancees(questionsPourSession, idsPrecedents);
            if (!questionsTirees) {
              setErreur("Cette épreuve avancée ne contient pas assez de questions pour respecter le format requis.");
            } else {
              setQuestions(questionsTirees);
              enregistrerTirage(quizId, questionsTirees);
            }
          } else {
            const questionsTirees = tirerQuestionsStandard(questionsPourSession, idsPrecedents);
            setQuestions(questionsTirees);
            enregistrerTirage(quizId, questionsTirees);
          }
        }

        const brouillonLocal = readQuizDraft(quizId, userId);
        const brouillonDistant = await lireQuizDraftDistant(quizId, userId);
        const draft = choisirBrouillonLePlusRecent(brouillonLocal, brouillonDistant);
        if (draft && draft.questionsIds.length > 0) {
          saveQuizDraft(quizId, userId, draft);
          setQuestions(getQuestionsFromDraft(draft, questionsPourSession));
          setBrouillon(draft);
          setBrouillonDisponible(true);
          setBrouillonSynchronise(await sauvegarderQuizDraftDistant(quizId, userId, draft));
        } else {
          setBrouillonSynchronise(false);
        }
        setBrouillonPret(true);
      }
      setChargement(false);
    }

    charger();
  }, [id, session?.user, revisionDue]);

  function toggleReponse(question: Question, reponseId: string) {
    setSelections((prev) => {
      const actuelles = prev[question.id] || [];
      if (question.type === "qcu") return { ...prev, [question.id]: [reponseId] };
      const nouvelles = actuelles.includes(reponseId)
        ? actuelles.filter((r) => r !== reponseId)
        : [...actuelles, reponseId];
      return { ...prev, [question.id]: nouvelles };
    });
  }

  function handleReprendreBrouillon() {
    if (!brouillon) return;
    setBrouillonSynchronise(false);
    setSelections(brouillon.selections);
    setReponsesAvancees(brouillon.reponsesAvancees);
    setBrouillon(null);
    setBrouillonDisponible(false);
  }

  function handleAbandonnerBrouillon() {
    if (!id || !session?.user.id) return;
    effacerBrouillonUtilisateur(id, session.user.id);
    setSelections({});
    setReponsesAvancees({});
    setBrouillon(null);
    setBrouillonDisponible(false);

    if (estAvance) {
      const questionsTirees = tirerQuestionsAvancees(questionsDisponibles, []);
      if (questionsTirees && id) {
        setQuestions(questionsTirees);
        enregistrerTirage(id, questionsTirees);
      }
      return;
    }

    const questionsTirees = tirerQuestionsStandard(questionsDisponibles, []);
    setQuestions(questionsTirees);
    if (id) enregistrerTirage(id, questionsTirees);
  }

  async function obtenirToken(): Promise<string | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }

  async function handleValider() {
    let score = 0;
    let scoreMax = 0;
    for (const q of questions) {
      scoreMax += q.points;
      const idsCorrects = q.reponses.filter((r) => r.est_correcte).map((r) => r.id).sort();
      const idsChoisis = (selections[q.id] || []).slice().sort();
      if (JSON.stringify(idsCorrects) === JSON.stringify(idsChoisis)) score += q.points;
    }

    setEnvoi(true);
    setErreur(null);
    const token = await obtenirToken();
    if (!token) {
      setEnvoi(false);
      setErreur("Ta session a expiré, reconnecte-toi et réessaie.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("submit-resultat", {
      body: { quiz_id: id, score, score_max: scoreMax, reponses_json: selections, revision: estModeRelecture },
      headers: { Authorization: `Bearer ${token}` },
    });
    setEnvoi(false);

    if (error) {
      setErreur("Une erreur est survenue lors de l'enregistrement du résultat.");
      return;
    }
    if (data?.error) {
      setErreur(data.error);
      return;
    }
    if (id && session?.user.id) effacerBrouillonUtilisateur(id, session.user.id);
    if (id) void recompenserParrainage(id);
    setResultat({ score, scoreMax });
  }

  async function handleValiderAvance() {
    const reponses = questions.map((q) => {
      if (q.type === "qcm" || q.type === "qcu") {
        return { question_id: q.id, type: q.type, contenu: JSON.stringify(selections[q.id] || []) };
      }
      return { question_id: q.id, type: q.type, contenu: reponsesAvancees[q.id] || "" };
    });

    setEnvoi(true);
    setErreur(null);
    const token = await obtenirToken();
    if (!token) {
      setEnvoi(false);
      setErreur("Ta session a expiré, reconnecte-toi et réessaie.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("submit-resultat-avance", {
      body: { quiz_id: id, reponses, revision: estModeRelecture },
      headers: { Authorization: `Bearer ${token}` },
    });
    setEnvoi(false);

    if (error) {
      setErreur("Une erreur est survenue lors de la correction.");
      return;
    }
    if (data?.error) {
      setErreur(data.error);
      return;
    }
    if (id && session?.user.id) effacerBrouillonUtilisateur(id, session.user.id);
    if (id) void recompenserParrainage(id);
    setResultatAvance({ score: data.score, scoreMax: data.score_max, details: data.details });
  }

  async function handleSignalerQuestion(question: Question) {
    if (!session?.user || detailsSignalement.trim().length < 10) {
      setErreurSignalement("Décris le problème en au moins 10 caractères.");
      return;
    }

    setEnvoiSignalement(true);
    setErreurSignalement(null);
    const { data: profil } = await supabase
      .from("profiles")
      .select("prenom, nom, email")
      .eq("id", session.user.id)
      .maybeSingle();
    const email = profil?.email || session.user.email;
    if (!email) {
      setEnvoiSignalement(false);
      setErreurSignalement("Aucune adresse e-mail n'est associée à ton compte.");
      return;
    }

    const nom = [profil?.prenom, profil?.nom].filter(Boolean).join(" ") || "Étudiant Notio";
    const message = [
      `Signalement du quiz « ${titre} » (ID : ${id})`,
      `Question : ${question.intitule.slice(0, 700)}`,
      `Détail : ${detailsSignalement.trim()}`,
    ].join("\n\n");
    const { data, error } = await supabase.functions.invoke("envoyer-ticket", {
      body: { nom, email, sujet: "probleme", message, site_web: "" },
    });
    setEnvoiSignalement(false);

    if (error || data?.error) {
      setErreurSignalement(typeof data?.error === "string" ? data.error : "Échec de l'envoi. Réessaie.");
      return;
    }
    setSignalementEnvoye(question.id);
    setQuestionSignalee(null);
    setDetailsSignalement("");
  }

  function afficherSignalement(question: Question) {
    if (signalementEnvoye === question.id) {
      return <p className="mt-4 text-xs font-semibold text-sage">Signalement envoyé au support.</p>;
    }

    return (
      <details className="mt-4 border-t border-line pt-3">
        <summary className="w-fit cursor-pointer select-none text-xs font-semibold text-inkmuted hover:text-ink">
          Actions
        </summary>
        <div className="pt-3">
          {questionSignalee === question.id ? (
            <div>
              <label htmlFor={`signalement-${question.id}`} className="text-xs font-semibold text-ink">Qu'est-ce qui semble incorrect ?</label>
              <textarea
                id={`signalement-${question.id}`}
                value={detailsSignalement}
                onChange={(event) => setDetailsSignalement(event.target.value)}
                maxLength={1500}
                minLength={10}
                rows={3}
                className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-navy"
              />
              {erreurSignalement && <p className="mt-2 text-xs text-red-600">{erreurSignalement}</p>}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void handleSignalerQuestion(question)} disabled={envoiSignalement} className="rounded-md bg-navy px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60">
                  {envoiSignalement ? "Envoi..." : "Envoyer le signalement"}
                </button>
                <button type="button" onClick={() => { setQuestionSignalee(null); setErreurSignalement(null); }} className="rounded-md border border-line px-3 py-2 text-xs font-semibold">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setQuestionSignalee(question.id); setErreurSignalement(null); }} className="text-xs font-semibold text-inkmuted underline decoration-line underline-offset-4 hover:text-ink">
              Signaler une erreur sur cette question
            </button>
          )}
        </div>
      </details>
    );
  }

  function handleReessayer() {
    if (id && session?.user.id) effacerBrouillonUtilisateur(id, session.user.id);
    setSelections({});
    setReponsesAvancees({});
    setResultat(null);
    setResultatAvance(null);
    if (estModeRelecture) {
      setQuestions(melanger(questionsDisponibles).slice(0, 5));
    } else if (estAvance) {
      const questionsTirees = tirerQuestionsAvancees(questionsDisponibles, questions.map((question) => question.id));
      if (questionsTirees && id) {
        setQuestions(questionsTirees);
        enregistrerTirage(id, questionsTirees);
      }
    } else {
      const questionsTirees = tirerQuestionsStandard(questionsDisponibles, questions.map((question) => question.id));
      setQuestions(questionsTirees);
      if (id) enregistrerTirage(id, questionsTirees);
    }
  }

  function obtenirQuestionsIncorrectes(): Question[] {
    if (resultatAvance) {
      const idsIncorrects = new Set(resultatAvance.details.filter((detail) => detail.statut !== "correct").map((detail) => detail.question_id));
      return questions.filter((question) => idsIncorrects.has(question.id));
    }
    if (resultat) {
      return questions.filter((question) => {
        const idsCorrects = question.reponses.filter((reponse) => reponse.est_correcte).map((reponse) => reponse.id).sort();
        const idsChoisis = (selections[question.id] || []).slice().sort();
        return JSON.stringify(idsCorrects) !== JSON.stringify(idsChoisis);
      });
    }
    return [];
  }

  function handleRevoirMesErreurs() {
    const questionsIncorrectes = obtenirQuestionsIncorrectes();
    if (questionsIncorrectes.length === 0) return;
    if (id && session?.user.id) effacerBrouillonUtilisateur(id, session.user.id);
    setQuestionsDisponibles(questionsIncorrectes);
    setQuestions(questionsIncorrectes);
    setSelections({});
    setReponsesAvancees({});
    setResultat(null);
    setResultatAvance(null);
    setRelectureImmediate(true);
  }

  if (chargement || chargementSession) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <p className="mx-auto max-w-2xl px-6 py-12 text-sm text-inkmuted">Chargement...</p>
      </div>
    );
  }

  if (brouillonDisponible && !revisionDue && !resultat && !resultatAvance) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <main className="mx-auto max-w-xl px-6 py-12">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-navy">Séance sauvegardée</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold">Reprendre ton quiz ?</h1>
            <p className="mt-3 text-sm leading-6 text-inkmuted">
              Une version incomplète de ce questionnaire a été enregistrée automatiquement. Tu peux reprendre tes réponses ou l'abandonner pour recommencer proprement.
            </p>
            <p className="mt-4 text-xs text-inkmuted">
              Dernière sauvegarde : {brouillon?.updatedAt ? new Date(brouillon.updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "À l'instant"}
            </p>
            <p className="mt-1 text-xs text-inkmuted">
              {brouillonSynchronise ? "Brouillon synchronisé à ton compte, disponible sur tes appareils." : "Brouillon conservé sur cet appareil ; vérifie ta connexion ou applique la migration pour le synchroniser."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={handleReprendreBrouillon} className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-navy transition-colors">
                Reprendre
              </button>
              <button type="button" onClick={handleAbandonnerBrouillon} className="rounded-md border border-line px-5 py-3 text-sm font-medium hover:border-ink transition-colors">
                Abandonner
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (revisionDue && questions.length === 0) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="font-display text-2xl font-extrabold">Aucune question à revoir</h1>
          <p className="mt-2 text-sm text-inkmuted">{erreur || "Tes prochains rappels apparaîtront ici lorsqu'ils seront prêts."}</p>
          <button type="button" onClick={() => navigate("/app")} className="mt-6 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-navy">
            Retour au tableau de bord
          </button>
        </main>
      </div>
    );
  }

  if (verificationSourceRequise && !sourceVerifiee && !revisionDue) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-navy">Vérification de la source</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold">Avant de commencer : vérifie ton cours</h1>
          <p className="mt-3 text-sm leading-6 text-inkmuted">Chaque question a été générée à partir d'un passage repéré dans ton PDF. Vérifie les pages et les extraits avant de lancer le questionnaire.</p>

          <section className="mt-7 border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-inkmuted">Document source</p>
                <p className="mt-1 break-all text-sm font-semibold text-ink">{nomDocumentSource || "Chargement du document..."}</p>
              </div>
              {urlDocumentSource && (
                <a href={urlDocumentSource} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 border border-navy px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-paper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></svg>
                  Ouvrir le PDF
                </a>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {questions.map((question, index) => {
                const source = sourcesQuestion.find((item) => item.question_id === question.id);
                if (!source) return null;
                return (
                  <article key={question.id} className="border-l-2 border-highlight bg-paper/70 px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-inkmuted">Question {index + 1}</p>
                      <p className="text-xs font-semibold text-navy">Page {source.page}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">{question.intitule}</p>
                    <blockquote className="mt-2 border-l border-line pl-3 text-sm italic leading-6 text-inkmuted">« {source.extrait} »</blockquote>
                  </article>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-inkmuted">Ton PDF reste privé. Le lien d'accès est temporaire et réservé à ton compte.</p>
          </section>

          {erreurSource && <p className="mt-4 text-sm text-red-600">{erreurSource}</p>}
          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-ink">
            <input type="checkbox" checked={sourceVerifiee} onChange={(event) => setSourceVerifiee(event.target.checked)} disabled={!urlDocumentSource} className="mt-1 h-4 w-4 accent-navy" />
            J'ai vérifié les extraits et les pages dans le document source.
          </label>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate("/questionnaires")} className="border border-line px-5 py-3 text-sm font-semibold text-ink hover:border-ink">Retour au catalogue</button>
            <button type="button" onClick={() => setSourceVerifiee(true)} disabled={!sourceVerifiee || !urlDocumentSource || !!erreurSource} className="bg-navy px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50">Confirmer et commencer</button>
          </div>
        </main>
      </div>
    );
  }

  // RÉCAPITULATIF — QUIZ STANDARD
  if (resultat) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="font-display text-3xl font-extrabold">Résultat — {titre}</h1>
          <p className="mt-2 text-lg text-inkmuted">
            Score : <span className="font-semibold text-ink">{resultat.score} / {resultat.scoreMax}</span>
          </p>
          <div className="mt-8 space-y-6">
            {questions.map((q) => {
              const idsChoisis = selections[q.id] || [];
              const idsCorrects = q.reponses.filter((r) => r.est_correcte).map((r) => r.id);
              const estCorrecte =
                JSON.stringify(idsChoisis.slice().sort()) === JSON.stringify(idsCorrects.slice().sort());
              return (
                <div key={q.id} className="rounded-xl border border-line bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{q.intitule}</p>
                    <span
                      className={
                        estCorrecte
                          ? "shrink-0 rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-sage"
                          : "shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                      }
                    >
                      {estCorrecte ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {q.reponses.map((r) => {
                      const choisie = idsChoisis.includes(r.id);
                      return (
                        <li
                          key={r.id}
                          className={
                            r.est_correcte
                              ? "rounded border border-sage bg-sage/10 px-3 py-1.5"
                              : choisie
                                ? "rounded border border-red-300 bg-red-50 px-3 py-1.5 text-red-700"
                                : "rounded border border-line px-3 py-1.5 text-inkmuted"
                          }
                        >
                          {r.texte}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explication && <p className="mt-3 text-xs text-inkmuted">{q.explication}</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            {obtenirQuestionsIncorrectes().length > 0 && (
              <button type="button" onClick={handleRevoirMesErreurs} className="rounded-md bg-highlight px-6 py-3 text-sm font-medium text-ink hover:bg-highlight/80 transition-colors">
                Revoir mes erreurs ({obtenirQuestionsIncorrectes().length})
              </button>
            )}
            <button type="button" onClick={handleReessayer} className="rounded-md border border-line px-6 py-3 text-sm font-medium hover:border-ink transition-colors">
              Réessayer
            </button>
            <button type="button" onClick={() => navigate("/app")} className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-navy transition-colors">
              Se reposer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RÉCAPITULATIF — QUIZ AVANCÉ
  if (resultatAvance) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="font-display text-3xl font-extrabold">Résultat — {titre}</h1>
          <p className="mt-2 text-lg text-inkmuted">
            Score : <span className="font-semibold text-ink">{resultatAvance.score} / {resultatAvance.scoreMax}</span>
          </p>
          <div className="mt-8 space-y-6">
            {questions.map((q) => {
              const detail = resultatAvance.details.find((d) => d.question_id === q.id);
              const contenu = reponsesAvancees[q.id];
              return (
                <div key={q.id} className="rounded-xl border border-line bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{q.intitule}</p>
                    {detail && (
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STYLE_STATUT[detail.statut]}`}>
                        {LABEL_STATUT[detail.statut]}
                      </span>
                    )}
                  </div>

                  {q.type === "code" ? (
                    <pre className="mt-3 overflow-x-auto rounded-md bg-ink p-4 font-mono text-xs text-paper">
                      {contenu || "(aucune réponse)"}
                    </pre>
                  ) : q.type === "dessin" ? (
                    contenu ? (
                      <img src={contenu} alt="Schéma soumis" className="mt-3 w-full rounded-md border border-line" />
                    ) : (
                      <p className="mt-3 text-xs text-inkmuted">(aucun dessin soumis)</p>
                    )
                  ) : q.type === "libre" ? (
                    <p className="mt-3 rounded-md border border-line bg-paper px-4 py-3 text-sm">
                      {contenu || "(aucune réponse)"}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-1 text-sm">
                      {q.reponses.map((r) => {
                        const idsChoisis = selections[q.id] || [];
                        const choisie = idsChoisis.includes(r.id);
                        return (
                          <li
                            key={r.id}
                            className={
                              r.est_correcte
                                ? "rounded border border-sage bg-sage/10 px-3 py-1.5"
                                : choisie
                                  ? "rounded border border-red-300 bg-red-50 px-3 py-1.5 text-red-700"
                                  : "rounded border border-line px-3 py-1.5 text-inkmuted"
                            }
                          >
                            {r.texte}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {detail && (
                    <details className="mt-3 rounded-md border border-line bg-paper px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-ink">Voir l'explication</summary>
                      <p className="mt-2 text-sm text-inkmuted">{detail.feedback}</p>
                      {detail.correction && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-inkmuted">
                            {q.type === "code" ? "Solution de référence" : q.type === "qcm" || q.type === "qcu" ? "Bonne(s) réponse(s)" : "Éléments attendus"}
                          </p>
                          {q.type === "code" ? (
                            <pre className="mt-1 overflow-x-auto rounded-md bg-ink p-3 font-mono text-xs text-paper">
                              {detail.correction}
                            </pre>
                          ) : (
                            <p className="mt-1 text-sm text-inkmuted">{detail.correction}</p>
                          )}
                        </div>
                      )}
                    </details>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            {obtenirQuestionsIncorrectes().length > 0 && (
              <button type="button" onClick={handleRevoirMesErreurs} className="rounded-md bg-highlight px-6 py-3 text-sm font-medium text-ink hover:bg-highlight/80 transition-colors">
                Revoir mes erreurs ({obtenirQuestionsIncorrectes().length})
              </button>
            )}
            <button type="button" onClick={handleReessayer} className="rounded-md border border-line px-6 py-3 text-sm font-medium hover:border-ink transition-colors">
              Réessayer
            </button>
            <button type="button" onClick={() => navigate("/app")} className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-navy transition-colors">
              Se reposer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MODE AVANCÉ — EN COURS
  if (estAvance) {
    return (
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-extrabold">{estModeRelecture ? `Révision — ${titre}` : titre}</h1>
            <div className="flex items-center gap-4">
              {!estModeRelecture && dureeSecondes !== null && <Chronometre dureeSecondes={dureeSecondes} onExpire={handleValiderAvance} />}
              <button type="button" onClick={() => setConfirmerQuitter(true)} className="text-sm text-inkmuted hover:text-red-600 transition-colors">
                Quitter
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-inkmuted">
            {estModeRelecture ? `${questions.length} question(s) à revoir — sans chronomètre` : `${questions.length} questions — épreuve chronométrée`}
          </p>

          <div className="mt-8 space-y-8">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-line bg-white p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-inkmuted">
                  Question {i + 1} —{" "}
                  {q.type === "code"
                    ? "Zone de code"
                    : q.type === "dessin"
                      ? "Zone de schéma"
                      : q.type === "libre"
                        ? "Réponse à développer"
                        : q.type === "qcm"
                          ? "Choix multiples"
                          : "Choix unique"}
                </p>
                <p className="mt-2 text-sm font-medium">{q.intitule}</p>

                {q.type === "code" ? (
                  <ZoneCode
                    valeur={reponsesAvancees[q.id] || ""}
                    onChange={(v) => setReponsesAvancees((prev) => ({ ...prev, [q.id]: v }))}
                  />
                ) : q.type === "dessin" ? (
                  <ZoneDessin onChange={(dataUrl) => setReponsesAvancees((prev) => ({ ...prev, [q.id]: dataUrl || "" }))} />
                ) : q.type === "libre" ? (
                  <ZoneLibre
                    valeur={reponsesAvancees[q.id] || ""}
                    onChange={(v) => setReponsesAvancees((prev) => ({ ...prev, [q.id]: v }))}
                  />
                ) : (
                  <div className="mt-4 space-y-2">
                    {q.reponses.map((r) => {
                      const selectionnee = (selections[q.id] || []).includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleReponse(q, r.id)}
                          className={
                            selectionnee
                              ? "block w-full rounded-md border border-ink bg-highlight/20 px-4 py-2.5 text-left text-sm transition-colors"
                              : "block w-full rounded-md border border-line px-4 py-2.5 text-left text-sm text-inkmuted transition-colors hover:border-ink"
                          }
                        >
                          {r.texte}
                        </button>
                      );
                    })}
                  </div>
                )}
                {afficherSignalement(q)}
              </div>
            ))}
          </div>

          {erreur && <p className="mt-6 text-sm text-red-600">{erreur}</p>}

          <button type="button" onClick={handleValiderAvance} disabled={envoi} className="mt-8 rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-navy disabled:opacity-60">
            {envoi ? "Analyse en cours..." : "Rendre le travail"}
          </button>
        </div>

        {confirmerQuitter && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
            <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6">
              <h2 className="font-display text-lg font-bold">Quitter le questionnaire ?</h2>
              <p className="mt-2 text-sm text-inkmuted">Ta progression sur ce questionnaire ne sera pas enregistrée.</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setConfirmerQuitter(false)} className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-medium hover:border-ink transition-colors">
                  Annuler
                </button>
                <button type="button" onClick={() => {
                  if (id && session?.user.id) effacerBrouillonUtilisateur(id, session.user.id);
                  setConfirmerQuitter(false);
                  navigate("/questionnaires");
                }} className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                  Oui, quitter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // MODE STANDARD — EN COURS
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-extrabold">{estModeRelecture ? `Révision — ${titre}` : titre}</h1>
            <button type="button" onClick={() => setConfirmerQuitter(true)} className="inline-flex items-center gap-2 rounded-md bg-red-800 px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-red-900">
              Quitter
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-line bg-white p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-inkmuted">
                Question {i + 1} — {q.type === "qcm" ? "Choix multiples" : "Choix unique"}
              </p>
              <p className="mt-2 text-sm font-medium">{q.intitule}</p>
              <div className="mt-4 space-y-2">
                {q.reponses.map((r) => {
                  const selectionnee = (selections[q.id] || []).includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleReponse(q, r.id)}
                      className={
                        selectionnee
                          ? "block w-full rounded-md border border-ink bg-highlight/20 px-4 py-2.5 text-left text-sm transition-colors"
                          : "block w-full rounded-md border border-line px-4 py-2.5 text-left text-sm text-inkmuted transition-colors hover:border-ink"
                      }
                    >
                      {r.texte}
                    </button>
                  );
                })}
              </div>
              {afficherSignalement(q)}
            </div>
          ))}
        </div>

        {erreur && <p className="mt-6 text-sm text-red-600">{erreur}</p>}

        <button type="button" onClick={handleValider} disabled={envoi} className="mt-8 rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-navy disabled:opacity-60">
          {envoi ? "Envoi..." : "Valider mes réponses"}
        </button>
      </div>

      {confirmerQuitter && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
          <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6">
            <h2 className="font-display text-lg font-bold">Quitter le questionnaire ?</h2>
            <p className="mt-2 text-sm text-inkmuted">Ta progression sur ce questionnaire ne sera pas enregistrée.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setConfirmerQuitter(false)} className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-medium hover:border-ink transition-colors">
                Annuler
              </button>
              <button type="button" onClick={() => {
                if (id && session?.user.id) effacerBrouillonUtilisateur(id, session.user.id);
                setConfirmerQuitter(false);
                navigate("/questionnaires");
              }} className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                Oui, quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}