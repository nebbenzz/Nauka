import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import RevisionCalendar, { type RevisionCalendarOverride } from "../components/RevisionCalendar";
import ProgrammeLicenceInformatique from "../components/ProgrammeLicenceInformatique";
import { FORMATIONS } from "../data/formations";
import { programmeLicenceDroitLaRochelle } from "../data/programmeLicenceDroitLaRochelle";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import { useThemeColor } from "../hooks/useThemeColor";
import {
  analyserActiviteNotions,
  determinerEtatCouverture,
  determinerFiabilite,
  type ActiviteNotion,
  type QuestionProgression,
  type ResultatProgression,
} from "../lib/competenceCoverage";
import { estProgrammeLicenceDroitLaRochelle, estProgrammeLicenceInformatiqueLaRochelle } from "../lib/programmeCoverage";

interface Stats {
  quiz_completes: number;
  quiz_crees: number;
  score_moyen_global: number | null;
}

interface Competence {
  matiere_nom: string;
  notion_nom: string;
  nombre_quiz: number;
  score_moyen: number;
  score_pondere: number;
  tendance: "hausse" | "baisse" | "stable" | "nouveau";
}

interface HistoriqueItem {
  resultat_id: string;
  quiz_id: string;
  quiz_titre: string;
  matiere_nom: string;
  score: number;
  score_max: number;
  date: string;
}

interface RevisionDisponible {
  quiz_id: string;
  quiz_titre: string;
  nombre_questions: number;
}

interface NotionCouverture extends ActiviteNotion {
  id: string;
  nom: string;
  niveau: number;
  matiere_nom: string;
  etat: "a-decouvrir" | "en-cours" | "maitrise";
}

interface NotionActivite extends ActiviteNotion {
  nom: string;
  matiere_nom: string;
}

const COMPETENCES_PAR_PAGE = 8;

function niveau(score: number) {
  if (score >= 70) return { badge: "bg-sage/15 text-sage", label: "Solide", couleur: "#6B8F71" };
  if (score >= 40) return { badge: "bg-highlight/30 text-ink", label: "En progrès", couleur: "#FFDE59" };
  return { badge: "bg-navy/10 text-navy", label: "À travailler", couleur: "#1D3557" };
}

function formaterDateRevision(date: string | null): string {
  if (!date) return "Jamais révisée";
  return `Dernière réponse le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date))}`;
}

function calculerJoursAvantExamen(date: string | null): number | null {
  if (!date) return null;
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const [annee, mois, jour] = date.split("-").map(Number);
  const dateExamen = new Date(annee, mois - 1, jour);
  return Math.round((dateExamen.getTime() - aujourdHui.getTime()) / 86400000);
}

function IconTendance({ tendance }: { tendance: Competence["tendance"] }) {
  if (tendance === "nouveau") return null;
  if (tendance === "hausse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-sage">
        <path d="M6 15l6-6 6 6" />
      </svg>
    );
  }
  if (tendance === "baisse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-navy">
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-inkmuted">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function AnneauProgression({ pourcentage, couleur, taille = 68 }: { pourcentage: number; couleur: string; taille?: number }) {
  const rayon = (taille - 8) / 2;
  const circonference = 2 * Math.PI * rayon;
  const decalage = circonference - (Math.min(100, pourcentage) / 100) * circonference;
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
      <circle cx={taille / 2} cy={taille / 2} r={rayon} fill="none" stroke="#E4E2DC" strokeWidth="6" />
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={rayon}
        fill="none"
        stroke={couleur}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circonference}
        strokeDashoffset={decalage}
        transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill="#1B1D22">
        {Math.round(pourcentage)}%
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const { session } = useSession();
  const { couleur: couleurPerso } = useThemeColor();
  const [prenom, setPrenom] = useState("");
  const [plan, setPlan] = useState<"decouverte" | "pro">("decouverte");
  const [quizRestants, setQuizRestants] = useState<number | null>(null);
  const [objectifRevision, setObjectifRevision] = useState<string | null>(null);
  const [dateExamen, setDateExamen] = useState<string | null>(null);
  const [sessionsParSemaine, setSessionsParSemaine] = useState(3);
  const [dureeSessionMinutes, setDureeSessionMinutes] = useState(10);
  const [joursRestants, setJoursRestants] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [pageCompetences, setPageCompetences] = useState(0);
  const [couvertureProgramme, setCouvertureProgramme] = useState<NotionCouverture[]>([]);
  const [notionsCatalogue, setNotionsCatalogue] = useState<NotionCouverture[]>([]);
  const [activitesNotions, setActivitesNotions] = useState<NotionActivite[]>([]);
  const [formationProgramme, setFormationProgramme] = useState("");
  const [etablissementProgramme, setEtablissementProgramme] = useState("");
  const [niveauFormationProgramme, setNiveauFormationProgramme] = useState<number | null>(null);
  const [chargementCouverture, setChargementCouverture] = useState(true);
  const [erreurCouverture, setErreurCouverture] = useState(false);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [revisionsDisponibles, setRevisionsDisponibles] = useState<RevisionDisponible[]>([]);
  const [planificationsPersonnalisees, setPlanificationsPersonnalisees] = useState<RevisionCalendarOverride[]>([]);
  const [erreurPlanification, setErreurPlanification] = useState<string | null>(null);
  const [enregistrementObjectif, setEnregistrementObjectif] = useState(false);
  const [messageObjectif, setMessageObjectif] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    async function chargerProfilEtProgramme() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("prenom, formation, niveau_formation, etablissement, plan, pro_expires_at, abonnement_intervalle, quiz_completes_today, quiz_completes_reset_date, objectif_revision, date_examen, sessions_par_semaine, duree_session_minutes")
          .eq("id", userId)
          .single();
        if (error || !data) throw error ?? new Error("Profil introuvable");

        setPrenom(data.prenom || "");
        const estAbonnementActif = data.abonnement_intervalle === "mensuel" || data.abonnement_intervalle === "annuel";
        const proActif = data.plan === "pro" && (estAbonnementActif || !data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
        setPlan(proActif ? "pro" : "decouverte");
        setObjectifRevision(data.objectif_revision);
        setDateExamen(data.date_examen);
        setSessionsParSemaine(data.sessions_par_semaine ?? 3);
        setDureeSessionMinutes(data.duree_session_minutes ?? 10);
        setJoursRestants(calculerJoursAvantExamen(data.date_examen));
        if (!proActif) {
          const today = new Date().toISOString().slice(0, 10);
          const utilises = data.quiz_completes_reset_date === today ? data.quiz_completes_today : 0;
          setQuizRestants(Math.max(0, 5 - utilises));
        }

        setFormationProgramme(data.formation || "");
        setEtablissementProgramme(data.etablissement || "");
        const formation = FORMATIONS.find((candidate) => candidate.label === data.formation);
        const domaine = formation?.domaine;
        const niveauFormation = data.niveau_formation ?? formation?.niveauOrdinal;
        setNiveauFormationProgramme(niveauFormation ?? null);
        if (!domaine || !niveauFormation) {
          setCouvertureProgramme([]);
          setNotionsCatalogue([]);
          setChargementCouverture(false);
          return;
        }

        const nomMatiere = domaine === "Biologie" ? "Sciences de la Vie" : domaine;
        const { data: matiere, error: erreurMatiere } = await supabase
          .from("matieres")
          .select("id")
          .eq("nom", nomMatiere)
          .maybeSingle();
        if (erreurMatiere) throw erreurMatiere;
        if (!matiere) {
          setCouvertureProgramme([]);
          setNotionsCatalogue([]);
          setChargementCouverture(false);
          return;
        }

        const { data: toutesNotions, error: erreurNotions } = await supabase
          .from("notions")
          .select("id, nom, niveau, matiere_id, matieres(nom)");
        if (erreurNotions) throw erreurNotions;
        const notionsDisponibles = toutesNotions || [];
        const notionsProgramme = notionsDisponibles
          .filter((notion) => notion.matiere_id === matiere.id && notion.niveau <= niveauFormation)
          .sort((a, b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom, "fr"));
        if (notionsProgramme.length === 0) {
          setCouvertureProgramme([]);
          setChargementCouverture(false);
          return;
        }

        const idsNotions = notionsDisponibles.map((notion) => notion.id);
        const { data: questions, error: erreurQuestions } = await supabase
          .from("questions")
          .select("id, notion_id, type, points, reponses(id, est_correcte)")
          .in("notion_id", idsNotions);
        if (erreurQuestions) throw erreurQuestions;

        const resultats: ResultatProgression[] = [];
        for (let debut = 0; ; debut += 1000) {
          const { data: page, error: erreurResultats } = await supabase
            .from("resultats")
            .select("id, created_at, reponses_json")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(debut, debut + 999);
          if (erreurResultats) throw erreurResultats;
          resultats.push(...((page || []) as ResultatProgression[]));
          if (!page || page.length < 1000) break;
        }

        const notionsPourAnalyse = notionsDisponibles.map((notion) => ({ id: notion.id }));
        const activites = analyserActiviteNotions(
          notionsPourAnalyse,
          (questions || []) as unknown as QuestionProgression[],
          resultats,
        );
        setNotionsCatalogue(notionsDisponibles.flatMap((notion) => {
          const matiereAssociee = Array.isArray(notion.matieres) ? notion.matieres[0] : notion.matieres;
          if (!matiereAssociee?.nom) return [];
          const activite = activites.get(notion.id) ?? {
            nombreQuestionsDistinctesTotal: 0,
            nombreQuestionsDistinctesRecentes: 0,
            nombreSessionsRecentes: 0,
            derniereReponse: null,
            scoreRecent: null,
          };
          return [{
            id: notion.id,
            nom: notion.nom,
            niveau: notion.niveau,
            matiere_nom: matiereAssociee.nom,
            ...activite,
            etat: determinerEtatCouverture(activite),
          }];
        }));
        setActivitesNotions(notionsDisponibles.flatMap((notion) => {
          const matiereAssociee = Array.isArray(notion.matieres) ? notion.matieres[0] : notion.matieres;
          const activite = activites.get(notion.id);
          if (!matiereAssociee?.nom || !activite) return [];
          return [{ ...activite, nom: notion.nom, matiere_nom: matiereAssociee.nom }];
        }));
        setCouvertureProgramme(notionsProgramme.map((notion) => {
          const activite = activites.get(notion.id) ?? {
            nombreQuestionsDistinctesTotal: 0,
            nombreQuestionsDistinctesRecentes: 0,
            nombreSessionsRecentes: 0,
            derniereReponse: null,
            scoreRecent: null,
          };
          return {
            ...notion,
            matiere_nom: nomMatiere,
            ...activite,
            etat: determinerEtatCouverture(activite),
          };
        }));
        setErreurCouverture(false);
      } catch {
        setErreurCouverture(true);
        setCouvertureProgramme([]);
        setNotionsCatalogue([]);
        setActivitesNotions([]);
      } finally {
        setChargementCouverture(false);
      }
    }

    void chargerProfilEtProgramme();

    async function chargerPlanificationsPersonnalisees() {
      const { data, error } = await supabase
        .from("revision_calendar_overrides")
        .select("jour_initial, jour_cible, ignoree")
        .eq("user_id", userId);
      if (error) {
        setErreurPlanification("Applique la migration des séances personnalisées pour modifier ton calendrier.");
        setPlanificationsPersonnalisees([]);
        return;
      }
      setPlanificationsPersonnalisees((data || []) as RevisionCalendarOverride[]);
      setErreurPlanification(null);
    }

    void chargerPlanificationsPersonnalisees();

    supabase.rpc("get_stats_utilisateur").then(({ data }) => {
      if (data && data[0]) setStats(data[0]);
    });

    supabase.rpc("get_competences_utilisateur").then(({ data }) => {
      if (data) {
        setCompetences(data);
        setPageCompetences(0);
      }
    });

    supabase.rpc("get_historique_utilisateur", { p_limite: 365 }).then(({ data }) => {
      if (data) setHistorique(data);
    });

    async function chargerQuestionsARevoir() {
      const { data, error } = await supabase
        .from("questions_a_revoir")
        .select("question_id, quiz_id")
        .eq("user_id", userId)
        .lte("a_revoir_le", new Date().toISOString())
        .order("a_revoir_le")
        .limit(25);
      if (error || !data?.length) {
        setRevisionsDisponibles([]);
        return;
      }

      const questionsARevoir = data as { question_id: string; quiz_id: string }[];
      const idsQuiz = Array.from(new Set(questionsARevoir.map((question) => question.quiz_id)));
      const { data: quizs, error: erreurQuizs } = await supabase.from("quiz").select("id, titre").in("id", idsQuiz);
      if (erreurQuizs) return;

      const titresQuiz = new Map(((quizs || []) as { id: string; titre: string }[]).map((quiz) => [quiz.id, quiz.titre]));
      const nombresParQuiz = new Map<string, number>();
      questionsARevoir.forEach((question) => {
        nombresParQuiz.set(question.quiz_id, (nombresParQuiz.get(question.quiz_id) || 0) + 1);
      });
      setRevisionsDisponibles(Array.from(nombresParQuiz, ([quiz_id, nombre_questions]) => ({
        quiz_id,
        nombre_questions,
        quiz_titre: titresQuiz.get(quiz_id) || "Questionnaire",
      })));
    }

    void chargerQuestionsARevoir();
  }, [session]);

  async function handleSupprimerObjectif() {
    if (!session?.user) return;
    setMessageObjectif(null);
    const { error } = await supabase.from("profiles").update({ objectif_revision: null, date_examen: null }).eq("id", session.user.id);
    if (error) {
      setMessageObjectif("Impossible d’effacer l’objectif. Réessaie.");
      return;
    }
    setObjectifRevision(null);
    setDateExamen(null);
    setJoursRestants(null);
    setMessageObjectif("Objectif d’examen effacé.");
  }

  async function handleEnregistrerObjectif() {
    if (!session?.user) return;
    setEnregistrementObjectif(true);
    setMessageObjectif(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        objectif_revision: objectifRevision?.trim() || null,
        date_examen: dateExamen || null,
        sessions_par_semaine: sessionsParSemaine,
        duree_session_minutes: dureeSessionMinutes,
      })
      .eq("id", session.user.id);
    setEnregistrementObjectif(false);
    if (error) {
      setMessageObjectif("Impossible d’enregistrer les objectifs. Réessaie.");
      return;
    }
    setJoursRestants(calculerJoursAvantExamen(dateExamen));
    setMessageObjectif("Objectifs mis à jour.");
  }

  async function enregistrerOverrideCalendrier(
    jourInitial: string,
    jourCible: string | null,
    ignoree: boolean,
  ): Promise<boolean> {
    if (!session?.user.id) return false;
    const modification: RevisionCalendarOverride = { jour_initial: jourInitial, jour_cible: jourCible, ignoree };
    const { error } = await supabase.from("revision_calendar_overrides").upsert({
      user_id: session.user.id,
      ...modification,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,jour_initial" });
    if (error) return false;

    setPlanificationsPersonnalisees((actuelles) => [
      ...actuelles.filter((element) => element.jour_initial !== jourInitial),
      modification,
    ]);
    setErreurPlanification(null);
    return true;
  }

  function handleReplanifierSeance(jourInitial: string, jourCible: string) {
    return enregistrerOverrideCalendrier(jourInitial, jourCible, false);
  }

  function handleIgnorerSeance(jourInitial: string) {
    return enregistrerOverrideCalendrier(jourInitial, null, true);
  }

  const nombrePagesCompetences = Math.max(1, Math.ceil(competences.length / COMPETENCES_PAR_PAGE));
  const competencesAffichees = competences.slice(
    pageCompetences * COMPETENCES_PAR_PAGE,
    (pageCompetences + 1) * COMPETENCES_PAR_PAGE,
  );
  const activiteParNotion = new Map(activitesNotions.map((notion) => [`${notion.matiere_nom}|${notion.nom}`, notion]));
  const categoriesCouverture = [
    { etat: "a-decouvrir" as const, libelle: "À découvrir", description: "Aucune réponse pour l’instant", notions: couvertureProgramme.filter((notion) => notion.etat === "a-decouvrir") },
    { etat: "en-cours" as const, libelle: "En cours", description: "Des réponses, maîtrise à consolider", notions: couvertureProgramme.filter((notion) => notion.etat === "en-cours") },
    { etat: "maitrise" as const, libelle: "Maîtrisé", description: "Réussite récente et confirmée", notions: couvertureProgramme.filter((notion) => notion.etat === "maitrise") },
  ];
  const afficherProgrammeLaRochelle = estProgrammeLicenceInformatiqueLaRochelle(formationProgramme, etablissementProgramme);
  const afficherProgrammeDroitLaRochelle = estProgrammeLicenceDroitLaRochelle(formationProgramme, etablissementProgramme);

  const notionPrioritaire = competences
    .filter((competence) => competence.notion_nom.trim())
    .slice()
    .sort((a, b) => a.score_pondere - b.score_pondere)[0];
  const lienRevision = notionPrioritaire
    ? `/questionnaires?recherche=${encodeURIComponent(notionPrioritaire.notion_nom)}`
    : "/questionnaires";
  const debutSemaine = new Date();
  debutSemaine.setHours(0, 0, 0, 0);
  debutSemaine.setDate(debutSemaine.getDate() - ((debutSemaine.getDay() + 6) % 7));
  const finSemaine = new Date(debutSemaine);
  finSemaine.setDate(finSemaine.getDate() + 7);
  const sessionsCetteSemaine = historique.filter((evenement) => {
    const dateSession = new Date(evenement.date);
    return dateSession >= debutSemaine && dateSession < finSemaine;
  }).length;
  const progressionSemaine = Math.min(100, Math.round((sessionsCetteSemaine / sessionsParSemaine) * 100));
  const sessionsRestantes = Math.max(0, sessionsParSemaine - sessionsCetteSemaine);

  const stamps = [
    { label: "Complétés", value: stats?.quiz_completes ?? 0 },
    { label: "Créés", value: stats?.quiz_crees ?? 0 },
    { label: "Moyenne", value: stats?.score_moyen_global != null ? `${stats.score_moyen_global}%` : "—" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-6 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-inkmuted">
              <span className="h-4 w-1 rounded-sm" style={{ backgroundColor: couleurPerso }} aria-hidden="true" />
              Tableau de bord
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              Bonjour{prenom ? ` ${prenom}` : ""}, on reprend là où tu en es.
            </h1>
            <p className="mt-3 text-sm leading-6 text-inkmuted">Retrouve tes points forts, tes prochaines notions et le fil de ta progression.</p>
            {plan === "decouverte" && quizRestants !== null && (
              <p className="mt-3 text-xs font-medium text-inkmuted">
                {quizRestants} session{quizRestants !== 1 ? "s" : ""} disponible{quizRestants !== 1 ? "s" : ""} aujourd'hui
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-lg border border-line bg-white lg:min-w-[22rem]">
            {stamps.map((stamp) => (
              <div key={stamp.label} className="flex min-w-0 flex-col justify-center px-3 py-3 text-center sm:px-5">
                <span className="font-display text-xl font-extrabold leading-none text-ink">{stamp.value}</span>
                <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-inkmuted">{stamp.label}</span>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-6 flex flex-col gap-5 border-y border-highlight/60 bg-highlight/15 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6" aria-labelledby="prochaine-revision">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-inkmuted">Ta prochaine révision</p>
            {notionPrioritaire ? (
              <>
                <h2 id="prochaine-revision" className="mt-2 font-display text-xl font-extrabold text-ink">
                  Priorité : {notionPrioritaire.notion_nom}
                </h2>
                <p className="mt-1 text-sm text-inkmuted">
                  {notionPrioritaire.matiere_nom} · {Math.round(notionPrioritaire.score_pondere)}% de maîtrise estimée · {notionPrioritaire.nombre_quiz} session{notionPrioritaire.nombre_quiz !== 1 ? "s" : ""}
                </p>
                <p className="mt-2 text-sm text-inkmuted">Un questionnaire ciblé pour retravailler cette notion.</p>
              </>
            ) : (
              <>
                <h2 id="prochaine-revision" className="mt-2 font-display text-xl font-extrabold text-ink">Choisis ton premier questionnaire</h2>
                <p className="mt-1 text-sm text-inkmuted">Après une première session, Nauka pourra te proposer les notions à revoir en priorité.</p>
              </>
            )}
          </div>
          <Link to={lienRevision} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-bold text-paper transition-colors hover:bg-ink">
            {notionPrioritaire ? "Réviser cette notion" : "Choisir un questionnaire"}
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        {revisionsDisponibles.length > 0 && (
          <section className="mt-8 border-t border-line pt-6" aria-labelledby="questions-a-revoir">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-navy">Rappel espacé</p>
                <h2 id="questions-a-revoir" className="mt-2 font-display text-2xl font-extrabold">Questions à revoir</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {revisionsDisponibles.map((revision) => (
                <Link
                  key={revision.quiz_id}
                  to={`/questionnaires/${revision.quiz_id}?revision=due`}
                  className="flex items-center justify-between gap-3 border border-line bg-white px-4 py-4 transition-colors hover:border-navy/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{revision.quiz_titre}</span>
                    <span className="mt-1 block text-xs text-inkmuted">{revision.nombre_questions} question{revision.nombre_questions !== 1 ? "s" : ""} à revoir</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-lg text-navy">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 border-y border-line py-6" aria-labelledby="objectif-hebdomadaire">
          <div className="grid gap-7 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage">Ton planning</p>
              <h2 id="objectif-hebdomadaire" className="mt-2 font-display text-2xl font-extrabold">Rythme et examen</h2>
              <p className="mt-2 text-sm text-inkmuted">{sessionsParSemaine} séances par semaine · {dureeSessionMinutes} min par séance</p>
              {objectifRevision && <p className="mt-3 text-sm font-semibold text-ink">{objectifRevision}</p>}
              {joursRestants !== null && joursRestants >= 0 && (
                <p className="mt-1 text-sm text-inkmuted">
                  {joursRestants === 0 ? "Examen aujourd’hui" : joursRestants === 1 ? "Examen demain" : `Examen dans ${joursRestants} jours`}
                  {dateExamen && ` · ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${dateExamen}T12:00:00`))}`}
                </p>
              )}
              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">{sessionsCetteSemaine} / {sessionsParSemaine} séances cette semaine</span>
                <span className="text-inkmuted">{sessionsRestantes === 0 ? "Objectif atteint" : `${sessionsRestantes} restante${sessionsRestantes !== 1 ? "s" : ""}`}</span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-line/60"
                role="progressbar"
                aria-label="Progression de l’objectif hebdomadaire"
                aria-valuemin={0}
                aria-valuemax={sessionsParSemaine}
                aria-valuenow={Math.min(sessionsCetteSemaine, sessionsParSemaine)}
              >
                <div className="h-full rounded-full bg-sage transition-[width]" style={{ width: `${progressionSemaine}%` }} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="objectif-revision" className="text-xs font-medium text-inkmuted">Objectif (facultatif)</label>
                <input
                  id="objectif-revision"
                  type="text"
                  placeholder="Ex. Préparer les partiels de janvier"
                  value={objectifRevision ?? ""}
                  onChange={(event) => setObjectifRevision(event.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div>
                <label htmlFor="date-examen-dashboard" className="text-xs font-medium text-inkmuted">Date d’examen (facultatif)</label>
                <input
                  id="date-examen-dashboard"
                  type="date"
                  value={dateExamen ?? ""}
                  onChange={(event) => setDateExamen(event.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div>
                <label htmlFor="sessions-par-semaine-dashboard" className="text-xs font-medium text-inkmuted">Séances par semaine</label>
                <select
                  id="sessions-par-semaine-dashboard"
                  value={sessionsParSemaine}
                  onChange={(event) => setSessionsParSemaine(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
                >
                  {Array.from({ length: 7 }, (_, index) => index + 1).map((nombre) => (
                    <option key={nombre} value={nombre}>{nombre} séance{nombre > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="duree-session-dashboard" className="text-xs font-medium text-inkmuted">Durée par séance</label>
                <select
                  id="duree-session-dashboard"
                  value={dureeSessionMinutes}
                  onChange={(event) => setDureeSessionMinutes(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
                >
                  {[5, 10, 15, 20, 30, 45].map((duree) => (
                    <option key={duree} value={duree}>{duree} minutes</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button type="button" onClick={() => void handleEnregistrerObjectif()} disabled={enregistrementObjectif} className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-navy disabled:opacity-60">
                  {enregistrementObjectif ? "Enregistrement…" : "Enregistrer"}
                </button>
                {(objectifRevision || dateExamen) && (
                  <button type="button" onClick={() => void handleSupprimerObjectif()} className="text-sm font-medium text-inkmuted underline underline-offset-4 hover:text-ink">
                    Effacer l’objectif d’examen
                  </button>
                )}
                {messageObjectif && <p role="status" className="text-xs text-inkmuted">{messageObjectif}</p>}
                <Link to={lienRevision} className="ml-auto text-sm font-semibold text-navy underline underline-offset-4">Commencer une séance</Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <RevisionCalendar
            dateExamen={dateExamen}
            evenements={historique}
            sessionsParSemaine={sessionsParSemaine}
            dureeSessionMinutes={dureeSessionMinutes}
            sessionsCetteSemaine={sessionsCetteSemaine}
            planificationsPersonnalisees={planificationsPersonnalisees}
            onReplanifier={handleReplanifierSeance}
            onIgnorer={handleIgnorerSeance}
            erreurPlanification={erreurPlanification}
          />
        </div>

        <section className="mt-10" aria-labelledby="programme-et-maitrise">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted">Vue d’ensemble</p>
              <h2 id="programme-et-maitrise" className="mt-2 font-display text-2xl font-extrabold">Programme et maîtrise</h2>
              <p className="mt-1 text-sm text-inkmuted">Survole ou sélectionne un anneau pour voir la fraîcheur et la fiabilité de l’estimation.</p>
            </div>
            {competences.length > COMPETENCES_PAR_PAGE && (
              <nav className="flex items-center gap-3" aria-label="Pagination des notions">
                <button
                  type="button"
                  onClick={() => setPageCompetences((page) => Math.max(0, page - 1))}
                  disabled={pageCompetences === 0}
                  aria-label="Page précédente"
                  title="Page précédente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <span className="min-w-16 text-center text-xs font-medium tabular-nums text-inkmuted" aria-live="polite">
                  {pageCompetences + 1} / {nombrePagesCompetences}
                </span>
                <button
                  type="button"
                  onClick={() => setPageCompetences((page) => Math.min(nombrePagesCompetences - 1, page + 1))}
                  disabled={pageCompetences >= nombrePagesCompetences - 1}
                  aria-label="Page suivante"
                  title="Page suivante"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </nav>
            )}
          </header>

          {competencesAffichees.length === 0 ? (
            <p className="py-6 text-sm text-inkmuted">Complète un premier questionnaire pour afficher tes estimations de maîtrise.</p>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {competencesAffichees.map((notion) => {
                const niveauNotion = niveau(notion.score_pondere);
                const activite = activiteParNotion.get(`${notion.matiere_nom}|${notion.notion_nom}`);
                const tooltipId = `fiabilite-${encodeURIComponent(`${notion.matiere_nom}-${notion.notion_nom}`)}`;
                return (
                  <li key={`${notion.matiere_nom}|${notion.notion_nom}`} className="flex min-w-0 flex-col items-center text-center">
                    <span className="mb-2 max-w-full truncate font-mono text-[10px] uppercase tracking-wide text-inkmuted" title={notion.matiere_nom}>
                      {notion.matiere_nom}
                    </span>
                    <div className="group relative inline-flex">
                      <span
                        tabIndex={0}
                        aria-label={`${notion.notion_nom} : ${Math.round(notion.score_pondere)}% de maîtrise estimée`}
                        aria-describedby={activite ? tooltipId : undefined}
                        className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
                      >
                        <AnneauProgression pourcentage={notion.score_pondere} couleur={niveauNotion.couleur} />
                        {notion.tendance !== "nouveau" && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-white p-0.5"><IconTendance tendance={notion.tendance} /></span>}
                      </span>
                      {activite && (
                        <div id={tooltipId} role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-56 max-w-[calc(100vw-3rem)] -translate-x-1/2 border border-line bg-white p-3 text-left text-xs text-ink shadow-lg group-hover:block group-focus-within:block">
                          <p className="font-semibold">Taux de fiabilité : {determinerFiabilite(activite)}</p>
                          <p className="mt-1">{activite.nombreQuestionsDistinctesRecentes} question{activite.nombreQuestionsDistinctesRecentes === 1 ? "" : "s"} distincte{activite.nombreQuestionsDistinctesRecentes === 1 ? "" : "s"} · {activite.nombreSessionsRecentes} séance{activite.nombreSessionsRecentes === 1 ? "" : "s"} sur les 90 derniers jours</p>
                          <p className="mt-1">Score récent : {activite.scoreRecent === null ? "indisponible" : `${activite.scoreRecent}%`}</p>
                          <p className="mt-1 text-inkmuted">{formaterDateRevision(activite.derniereReponse)}</p>
                          {(activite.nombreQuestionsDistinctesRecentes < 10 || activite.nombreSessionsRecentes < 2) && <p className="mt-2 font-semibold text-navy">Refais un quiz sur des questions différentes pour confirmer cette estimation.</p>}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 max-w-32 text-xs font-bold leading-4 text-ink">{notion.notion_nom}</p>
                    <p className="mt-1 text-[11px] text-inkmuted">{notion.nombre_quiz} quiz</p>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-7 border-t border-line pt-6" aria-labelledby="couverture-programme">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-inkmuted">Préparation à l’examen</p>
                <h3 id="couverture-programme" className="mt-2 font-display text-xl font-extrabold">Couverture du programme</h3>
              </div>
            </div>

            {chargementCouverture ? (
              <p className="mt-4 text-sm text-inkmuted">Chargement de la couverture du programme…</p>
            ) : erreurCouverture ? (
              <p className="mt-4 text-sm text-inkmuted">La couverture du programme est momentanément indisponible.</p>
            ) : !formationProgramme ? (
              <p className="mt-4 text-sm text-inkmuted">
                Renseigne ta formation pour voir les notions à découvrir. <Link to="/profil" className="font-semibold text-navy underline underline-offset-4">Compléter mon profil</Link>
              </p>
            ) : (afficherProgrammeLaRochelle || afficherProgrammeDroitLaRochelle) && niveauFormationProgramme !== null ? (
              <ProgrammeLicenceInformatique
                niveauFormation={niveauFormationProgramme}
                notions={notionsCatalogue}
                programme={afficherProgrammeDroitLaRochelle ? programmeLicenceDroitLaRochelle : undefined}
              />
            ) : couvertureProgramme.length === 0 ? (
              <p className="mt-4 text-sm text-inkmuted">Aucune notion n’est encore référencée pour cette formation.</p>
            ) : (
              <div className="mt-5 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categoriesCouverture.map((categorie) => (
                  <details
                    key={categorie.etat}
                    className={`group border border-line border-t-4 bg-white transition-colors open:border-ink ${categorie.etat === "a-decouvrir" ? "border-t-navy" : categorie.etat === "en-cours" ? "border-t-highlight" : "border-t-sage"}`}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                      <span className="min-w-0">
                        <span className="block font-display text-base font-bold text-ink">{categorie.libelle}</span>
                        <span className="mt-1 block text-xs text-inkmuted">{categorie.description}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-display text-2xl font-extrabold tabular-nums text-ink">{categorie.notions.length}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-inkmuted transition-transform group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                      </span>
                    </summary>
                    {categorie.notions.length > 0 ? (
                      <ul className="border-t border-line px-4">
                        {categorie.notions.map((notion) => (
                          <li key={notion.id} className="border-b border-line/70 last:border-0">
                            <Link to={`/questionnaires?recherche=${encodeURIComponent(notion.nom)}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-navy">
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-ink">{notion.nom}</span>
                                <span className="mt-0.5 block text-xs text-inkmuted">Niveau {notion.niveau}</span>
                              </span>
                              <span className="shrink-0 text-right text-[11px] text-inkmuted">{formaterDateRevision(notion.derniereReponse)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-inkmuted">Aucune notion pour le moment.</p>
                    )}
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}