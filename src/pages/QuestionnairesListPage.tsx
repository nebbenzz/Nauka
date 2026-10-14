import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import SidebarQuestionnaires from "../components/SidebarQuestionnaires";
import QuestionnaireFilters, { type FiltreQuestionnaire } from "../components/QuestionnaireFilters";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import { FORMATIONS } from "../data/formations";
import { dedupliquerQuizParNotion, estQuizCompatibleAvecNiveau, formatDureeQuiz, formatNiveauQuiz, getScorePourcentage, uniformiserTitresQuestionnaires } from "../lib/catalogUtils";

interface QuizCard {
  id: string;
  titre: string;
  titreAffiche: string;
  type: string;
  est_avance: boolean;
  duree_secondes: number | null;
  formation_cible: string | null;
  difficulte: string | null;
  matiere_nom: string;
  notion_nom: string | null;
  notion_niveau: number | null;
  niveau_cible: number | null;
  niveau_premiere_decouverte: number | null;
  niveau_contenu_max: number | null;
  notions_couvertes: string[];
  nombre_questions: number;
  est_a_moi: boolean;
  dernier_score: number | null;
  dernier_score_max: number | null;
}

type SelectionAnnee = number | null;

interface FiltresAnneeProps {
  annees: number[];
  comptes: Record<number, number>;
  selection: SelectionAnnee;
  nombreTotal: number;
  onChange: (annee: SelectionAnnee) => void;
}

function FiltresAnnee({ annees, comptes, selection, nombreTotal, onChange }: FiltresAnneeProps) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3" aria-label="Filtrer les questionnaires par année d'étude">
      <span className="text-xs font-semibold text-inkmuted">Année d'étude</span>
      <div role="group" aria-label="Année des questionnaires recommandés" className="inline-flex max-w-full flex-wrap gap-1 rounded-md border border-line bg-white p-1">
        <button
          type="button"
          aria-pressed={selection === null}
          onClick={() => onChange(null)}
          className={selection === null
            ? "min-h-10 rounded-md bg-navy px-3 text-xs font-bold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-1"
            : "min-h-10 rounded-md px-3 text-xs font-semibold text-inkmuted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-1"}
        >
          Toutes ({nombreTotal})
        </button>
        {annees.map((annee) => (
          <button
            key={annee}
            type="button"
            aria-pressed={selection === annee}
            onClick={() => onChange(annee)}
            className={selection === annee
              ? "min-h-10 rounded-md bg-navy px-3 text-xs font-bold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-1"
              : "min-h-10 rounded-md px-3 text-xs font-semibold text-inkmuted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-1"}
          >
            Année {annee} ({comptes[annee] ?? 0})
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuestionnairesListPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [domaineUtilisateur, setDomaineUtilisateur] = useState<string | null>(null);
  const [niveauUtilisateur, setNiveauUtilisateur] = useState<number | null>(null);
  const [estPro, setEstPro] = useState(false);
  const [recherche, setRecherche] = useState(() => new URLSearchParams(window.location.search).get("recherche") ?? "");
  const [filtre, setFiltre] = useState<FiltreQuestionnaire>("tous");
  const [matiereFiltre, setMatiereFiltre] = useState("");
  const [matiereSidebarClassique, setMatiereSidebarClassique] = useState("");
  const [matiereSidebarAvancee, setMatiereSidebarAvancee] = useState("");
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<SelectionAnnee>(null);
  const [anneeAvanceeSelectionnee, setAnneeAvanceeSelectionnee] = useState<SelectionAnnee>(null);
  const [chargement, setChargement] = useState(true);
  const [sidebarReduite, setSidebarReduite] = useState(false);
  const [sectionAnimee, setSectionAnimee] = useState<string | null>(null);
  const [erreurGestion, setErreurGestion] = useState<string | null>(null);
  const [quizASupprimer, setQuizASupprimer] = useState<QuizCard | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    async function charger() {
      let formationChargee: string | null = null;
      let niveauFormationChargee: number | null = null;
      if (session?.user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("formation, niveau_formation, plan, pro_expires_at, abonnement_intervalle")
          .eq("id", session.user.id)
          .single();

        formationChargee = profil?.formation ?? null;
        niveauFormationChargee = profil?.niveau_formation ?? null;
        setNiveauUtilisateur(niveauFormationChargee);
        const estAbonnementActif = profil?.abonnement_intervalle === "mensuel" || profil?.abonnement_intervalle === "annuel";
        const proActif = profil?.plan === "pro" && (estAbonnementActif || !profil.pro_expires_at || new Date(profil.pro_expires_at) > new Date());
        setEstPro(proActif);
        if (profil?.formation) {
          const domaine = FORMATIONS.find((f) => f.label === profil.formation)?.domaine ?? null;
          setDomaineUtilisateur(domaine);
        }
      }

      const { data: quizPublics } = await supabase
        .from("quiz")
        .select("id, titre, type, est_avance, duree_secondes, formation_cible, difficulte, niveau_cible, niveau_premiere_decouverte, matieres(nom), notions(nom, niveau), quiz_questions(count)")
        .eq("is_public", true);

      let quizPersonnels: any[] = [];
      if (session?.user) {
        const { data } = await supabase
          .from("quiz")
          .select("id, titre, type, est_avance, duree_secondes, formation_cible, difficulte, niveau_cible, niveau_premiere_decouverte, matieres(nom), notions(nom, niveau), quiz_questions(count)")
          .eq("created_by", session.user.id);
        quizPersonnels = data || [];
      }

      let dernierScoreParQuiz = new Map<string, { score: number; score_max: number }>();
      if (session?.user) {
        const { data: derniersResultats } = await supabase
          .from("resultats")
          .select("quiz_id, score, score_max, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false, nullsFirst: false });

        const resultatsParQuiz = new Map<string, { score: number; score_max: number }>();
        for (const resultat of derniersResultats || []) {
          const quizId = resultat.quiz_id as string;
          if (!resultatsParQuiz.has(quizId)) {
            resultatsParQuiz.set(quizId, { score: resultat.score as number, score_max: resultat.score_max as number });
          }
        }
        dernierScoreParQuiz = resultatsParQuiz;
      }

      const quizCharges = [
        ...(quizPublics || []).map((q: any) => ({ ...q, est_a_moi: false })),
        ...quizPersonnels.map((q: any) => ({ ...q, est_a_moi: true })),
      ];
      const formationCibleDisponible = formationChargee
        ? quizCharges.some((q: any) => !q.est_a_moi && q.formation_cible === formationChargee)
        : false;
      const tousLesQuiz = quizCharges.filter((q: any) => {
        if (q.est_a_moi) return true;
        if (formationCibleDisponible) return q.formation_cible === formationChargee;
        return !q.formation_cible;
      });

      if (tousLesQuiz.length === 0) {
        setChargement(false);
        return;
      }

      const idsQuiz = tousLesQuiz.map((q) => q.id);
      const { data: liaisons } = await supabase
        .from("quiz_questions")
        .select("quiz_id, questions(niveau, notions(nom, niveau))")
        .in("quiz_id", idsQuiz);

      const notionsParQuiz: Record<string, Set<string>> = {};
      const niveauxParQuiz: Record<string, Set<number>> = {};
      (liaisons || []).forEach((l: any) => {
        const nom = l.questions?.notions?.nom;
        if (nom) {
          notionsParQuiz[l.quiz_id] = notionsParQuiz[l.quiz_id] || new Set();
          notionsParQuiz[l.quiz_id].add(nom);
        }
        const niveau = l.questions?.niveau ?? l.questions?.notions?.niveau;
        if (typeof niveau === "number") {
          niveauxParQuiz[l.quiz_id] = niveauxParQuiz[l.quiz_id] || new Set();
          niveauxParQuiz[l.quiz_id].add(niveau);
        }
      });

      const quizCards: QuizCard[] = tousLesQuiz.map((q: any) => {
        const niveauxQuiz = Array.from(niveauxParQuiz[q.id] || []);
        return {
          id: q.id,
          titre: q.titre,
          titreAffiche: q.titre,
          type: q.type,
          est_avance: q.est_avance,
          duree_secondes: q.duree_secondes,
          formation_cible: q.formation_cible ?? null,
          difficulte: q.difficulte ?? null,
          matiere_nom: q.matieres?.nom ?? "",
          notion_nom: q.notions?.nom ?? null,
          notion_niveau: q.notions?.niveau ?? null,
          niveau_cible: q.niveau_cible ?? null,
          niveau_premiere_decouverte: q.niveau_premiere_decouverte ?? (niveauxQuiz.length > 0 ? Math.min(...niveauxQuiz) : q.notions?.niveau ?? null),
          niveau_contenu_max: niveauxQuiz.length > 0 ? Math.max(...niveauxQuiz) : q.notions?.niveau ?? null,
          notions_couvertes: Array.from(notionsParQuiz[q.id] || []),
          nombre_questions: Math.min(5, q.quiz_questions?.[0]?.count ?? 0),
          est_a_moi: q.est_a_moi,
          dernier_score: dernierScoreParQuiz.get(q.id)?.score ?? null,
          dernier_score_max: dernierScoreParQuiz.get(q.id)?.score_max ?? null,
        };
      });
      setQuizzes(uniformiserTitresQuestionnaires(dedupliquerQuizParNotion(quizCards, niveauFormationChargee), niveauFormationChargee));
      setChargement(false);
    }

    charger();
  }, [session]);

  const rechercheLower = recherche.toLowerCase();
  const correspond = (q: QuizCard) =>
    q.titre.toLowerCase().includes(rechercheLower) ||
    q.titreAffiche.toLowerCase().includes(rechercheLower) ||
    q.matiere_nom.toLowerCase().includes(rechercheLower) ||
    (q.notion_nom?.toLowerCase().includes(rechercheLower) ?? false) ||
    q.notions_couvertes.some((n) => n.toLowerCase().includes(rechercheLower));

  const estPourVous = (q: QuizCard) => {
    if (!domaineUtilisateur || q.matiere_nom !== domaineUtilisateur) return false;
    return estQuizCompatibleAvecNiveau(
      {
        type: q.type,
        notion_nom: q.notion_nom,
        notion_niveau: q.notion_niveau,
        niveau_cible: q.niveau_cible,
        niveau_premiere_decouverte: q.niveau_premiere_decouverte,
        niveau_contenu_max: q.niveau_contenu_max,
        est_avance: q.est_avance,
      },
      niveauUtilisateur,
    );
  };

  const matieresDisponibles = Array.from(new Set(quizzes.filter((q) => !q.est_a_moi).map((q) => q.matiere_nom).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const standardsDisponibles = quizzes.filter((q) => !q.est_a_moi && !q.est_avance);
  const avancesDisponibles = quizzes.filter((q) => !q.est_a_moi && q.est_avance);
  const matieresSidebarClassiques = Array.from(new Set(
    (domaineUtilisateur ? standardsDisponibles.filter((q) => !estPourVous(q)) : standardsDisponibles)
      .map((q) => q.matiere_nom)
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b));
  const matieresSidebarAvancees = Array.from(new Set(
    (domaineUtilisateur ? avancesDisponibles.filter((q) => !estPourVous(q)) : avancesDisponibles)
      .map((q) => q.matiere_nom)
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b));
  const resultatsRecherche = quizzes.filter(correspond);
  const publics = resultatsRecherche.filter((q) => !q.est_a_moi);
  const mesQuestionnaires = resultatsRecherche.filter((q) => q.est_a_moi);

  const standards = publics.filter((q) => !q.est_avance);
  const avances = publics.filter((q) => q.est_avance);

  const pourVous = domaineUtilisateur ? standards.filter(estPourVous) : [];
  const avancesPourVous = domaineUtilisateur ? avances.filter(estPourVous) : [];

  const correspondAuxFiltres = (q: QuizCard) => {
    if (matiereFiltre && q.matiere_nom !== matiereFiltre) return false;
    if (filtre === "classiques") return !q.est_avance;
    if (filtre === "avances") return q.est_avance;
    return true;
  };

  const prioriteType = (q: QuizCard) => {
    if (q.type === "global") return q.est_avance ? 1 : 0;
    if (q.type === "notion") return 2 + (q.notion_niveau ?? 999);
    return 999;
  };

  const regrouperParMatiere = (liste: QuizCard[]) => {
    const groupes = new Map<string, QuizCard[]>();

    liste.forEach((q) => {
      const matiere = q.matiere_nom || "Autres";
      const groupe = groupes.get(matiere) ?? [];
      groupe.push(q);
      groupes.set(matiere, groupe);
    });

    return Array.from(groupes.entries())
      .sort(([matiereA], [matiereB]) => matiereA.localeCompare(matiereB))
      .map(([matiere, quizs]) => ({
        matiere,
        quizs: [...quizs].sort((a, b) => {
          const differencePriorite = prioriteType(a) - prioriteType(b);
          if (differencePriorite !== 0) return differencePriorite;

          const niveauA = a.niveau_cible ?? a.notion_niveau ?? 999;
          const niveauB = b.niveau_cible ?? b.notion_niveau ?? 999;
          if (niveauA !== niveauB) return niveauA - niveauB;

          const notionA = a.notion_nom ?? "";
          const notionB = b.notion_nom ?? "";
          if (notionA !== notionB) return notionA.localeCompare(notionB);

          return a.titre.localeCompare(b.titre);
        }),
      }));
  };

  const regrouperParAnnee = (liste: QuizCard[]) => {
    const groupes = new Map<number | null, QuizCard[]>();
    liste.forEach((quiz) => {
      const niveau = quiz.niveau_cible ?? quiz.notion_niveau;
      const groupe = groupes.get(niveau) ?? [];
      groupe.push(quiz);
      groupes.set(niveau, groupe);
    });

    return Array.from(groupes.entries())
      .sort(([anneeA], [anneeB]) => {
        if (anneeA === niveauUtilisateur) return -1;
        if (anneeB === niveauUtilisateur) return 1;
        if (anneeA === null) return 1;
        if (anneeB === null) return -1;
        return anneeB - anneeA;
      })
      .map(([annee, quizs]) => ({
        annee,
        quizs: [...quizs].sort((a, b) => a.titre.localeCompare(b.titre, "fr")),
      }));
  };

  const filtrerParAnnee = (liste: QuizCard[], selection: SelectionAnnee) =>
    selection === null ? liste : liste.filter((quiz) => (quiz.niveau_cible ?? quiz.notion_niveau) === selection || (quiz.niveau_cible ?? quiz.notion_niveau) === null);

  const compterParAnnee = (liste: QuizCard[]): Record<number, number> => {
    const comptes: Record<number, number> = {};
    liste.forEach((quiz) => {
      const niveau = quiz.niveau_cible ?? quiz.notion_niveau;
      if (niveau !== null) comptes[niveau] = (comptes[niveau] ?? 0) + 1;
    });
    return comptes;
  };

  const decouvrezAussi = (domaineUtilisateur ? standards.filter((q) => !estPourVous(q)) : standards)
    .filter(correspondAuxFiltres)
    .filter((q) => !matiereSidebarClassique || q.matiere_nom === matiereSidebarClassique);
  const avancesDecouvrezAussi = (domaineUtilisateur ? avances.filter((q) => !estPourVous(q)) : avances)
    .filter(correspondAuxFiltres)
    .filter((q) => !matiereSidebarAvancee || q.matiere_nom === matiereSidebarAvancee);

  const sectionsPourVous = regrouperParMatiere(pourVous);
  const groupesPourVousParAnnee = regrouperParAnnee(filtrerParAnnee(pourVous, anneeSelectionnee));
  const anneesPourVous = Object.keys(compterParAnnee(pourVous)).map(Number).sort((a, b) => a - b);
  const comptesPourVous = compterParAnnee(pourVous);
  const sectionsDecouvrezAussi = regrouperParMatiere(decouvrezAussi);
  const sectionsAvancesPourVous = regrouperParMatiere(avancesPourVous);
  const groupesAvancesPourVousParAnnee = regrouperParAnnee(filtrerParAnnee(avancesPourVous, anneeAvanceeSelectionnee));
  const anneesAvanceesPourVous = Object.keys(compterParAnnee(avancesPourVous)).map(Number).sort((a, b) => a - b);
  const comptesAvancesPourVous = compterParAnnee(avancesPourVous);
  const sectionsAvancesDecouvrezAussi = regrouperParMatiere(avancesDecouvrezAussi);

  function handleClic(quizId: string) {
    navigate(session?.user ? `/questionnaires/${quizId}` : "/connexion");
  }

  async function supprimerQuiz(quiz: QuizCard) {
    if (!session?.user) return;
    setErreurGestion(null);
    setSuppressionEnCours(true);
    const { error } = await supabase.functions.invoke("manage-personal-quiz", {
      body: { action: "delete", quiz_id: quiz.id },
      headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}` },
    });
    setSuppressionEnCours(false);
    if (error) {
      setErreurGestion("Impossible de supprimer ce questionnaire. Réessaie.");
      return;
    }
    setQuizzes((actuels) => actuels.filter((actuel) => actuel.id !== quiz.id));
    setQuizASupprimer(null);
  }

  function naviguerVersSection(cible: string, terme: string) {
    const estMatiereClassique = cible.startsWith("matiere-");
    const estMatiereAvancee = cible.startsWith("avance-matiere-");
    setRecherche(estMatiereClassique || estMatiereAvancee ? "" : terme);
    setFiltre("tous");
    setMatiereFiltre("");
    if (cible === "pour-vous") setAnneeSelectionnee(null);
    if (cible === "avances-pour-vous") setAnneeAvanceeSelectionnee(null);
    if (estMatiereClassique) setMatiereSidebarClassique(terme);
    if (estMatiereAvancee) setMatiereSidebarAvancee(terme);
    if (cible === "pour-vous") setMatiereSidebarClassique("");
    if (cible === "avances-pour-vous") setMatiereSidebarAvancee("");
    setSectionAnimee(cible);
    window.setTimeout(() => {
      document.getElementById(cible)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    window.setTimeout(() => setSectionAnimee(null), 900);
  }

  function Carte({ q }: { q: QuizCard }) {
    const scoreActuel = getScorePourcentage(q.dernier_score, q.dernier_score_max);
    const niveau = formatNiveauQuiz(q);
    const estPersonnalise = q.type === "personnalise";
    const typeLibelle = estPersonnalise ? "Notion créée" : q.est_avance || (q.type === "global" && !q.notion_nom) ? "Matière" : "Notion";
    const niveauEtiquette = q.type === "notion" ? niveau : q.notion_nom && q.notion_niveau ? `niv. ${q.notion_niveau}` : "";
    const difficulteEtiquette = q.difficulte === "facile" ? "facile" : q.difficulte === "difficile" ? "dif." : q.difficulte === "moyen" ? "moy." : "";
    const etiquetteType = estPersonnalise
      ? `${typeLibelle}${difficulteEtiquette ? ` • ${difficulteEtiquette}` : ""}`
      : niveauEtiquette ? `${typeLibelle} • ${niveauEtiquette}` : typeLibelle;

    return (
      <article className={estPersonnalise
        ? "flex min-h-52 flex-col border border-sage/35 border-l-4 border-l-sage bg-[#F3F6F0] p-5 text-left transition-colors hover:border-sage/60 hover:bg-[#EEF3E9]"
        : q.est_avance
          ? "flex min-h-52 flex-col border border-navy/25 border-l-4 border-l-navy bg-[#F1F4F7] p-5 text-left transition-colors hover:border-navy hover:bg-[#EAF0F5]"
          : "flex min-h-52 flex-col border border-line bg-[#FCFBF7] p-5 text-left transition-colors hover:border-navy/40 hover:bg-white"}>
        <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-inkmuted">
          <span>{etiquetteType}</span>
          {estPersonnalise && (
            <div className="flex items-center gap-2 normal-case tracking-normal">
              <button type="button" onClick={() => navigate(`/creer-questionnaire?quiz_id=${q.id}`)} className="text-xs font-semibold text-navy underline underline-offset-2">Modifier</button>
              <button type="button" onClick={() => setQuizASupprimer(q)} aria-label={`Supprimer ${q.titreAffiche}`} title="Supprimer le questionnaire" className="inline-flex h-8 w-8 items-center justify-center border border-line text-inkmuted transition-colors hover:border-red-300 hover:text-red-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-inkmuted">
          {scoreActuel !== null && (
            <span className="rounded-full bg-sage/15 px-2 py-1 font-bold text-sage">Dernier score : {scoreActuel}%</span>
          )}
        </div>

        <button type="button" onClick={() => handleClic(q.id)} className="flex flex-1 items-center py-4 text-left">
          <h3 className="line-clamp-2 font-display text-lg font-extrabold leading-snug text-ink">{q.titreAffiche}</h3>
        </button>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-4 text-xs text-inkmuted">
          <span>{q.nombre_questions} questions</span>
          {q.est_avance && q.duree_secondes ? (
            <span className="flex items-center gap-1.5 font-semibold text-navy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <circle cx="12" cy="12" r="8.5" />
                <polyline points="12 7.5 12 12 15 14" />
              </svg>
              {formatDureeQuiz(q.duree_secondes)}
            </span>
          ) : (
            <button type="button" onClick={() => handleClic(q.id)} className="font-semibold text-navy transition-colors hover:text-ink">Ouvrir <span aria-hidden="true">→</span></button>
          )}
        </div>
        {!session?.user && <p className="mt-3 text-[11px] font-semibold text-navy">Connexion requise pour commencer</p>}
      </article>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <SidebarQuestionnaires
        reduit={sidebarReduite}
        onToggle={setSidebarReduite}
        onNaviguer={naviguerVersSection}
        matieresClassiques={matieresSidebarClassiques}
        matieresAvancees={matieresSidebarAvancees}
        estPro={estPro}
      />

      <div className={sidebarReduite ? "ml-16 transition-all" : "ml-64 transition-all"}>
        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-navy">Bibliothèque de révision</p>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Questionnaires</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-inkmuted">Choisis une matière ou avance notion par notion. Valide tes acquis à travers des questions de type QCM et QCU.</p>
            </div>
            {estPro && (
              <button
                type="button"
                onClick={() => navigate("/creer-questionnaire")}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-navy bg-navy px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                <span className="text-lg leading-none">+</span>
                Créer un questionnaire
              </button>
            )}
          </div>

          <aside aria-label="Informations sur les formations et contact" className="mb-8 flex flex-col gap-4 border border-line border-l-4 border-l-highlight bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-lg font-bold">La bibliothèque va s'agrandir.</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-inkmuted">
                Davantage de formations seront bientôt couvertes par des questionnaires. Tu as rencontré un problème ou une remarque à nous faire remonter ? N'hésite pas à nous écrire.
              </p>
            </div>
            <Link to="/contact" className="inline-flex min-h-10 shrink-0 items-center justify-center border border-navy px-4 py-2 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
              Formulaire de contact
            </Link>
          </aside>

          <div className="relative max-w-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher une matière, une notion..."
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                if (e.target.value.trim()) {
                  setAnneeSelectionnee(null);
                  setAnneeAvanceeSelectionnee(null);
                }
              }}
              className="min-h-11 w-full rounded-md border border-line bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-inkmuted/70 focus:border-navy focus:ring-2 focus:ring-highlight/50 focus:ring-offset-1"
            />
          </div>

          <QuestionnaireFilters
            valeur={filtre}
            onChange={setFiltre}
            matieres={matieresDisponibles}
            matiereSelectionnee={matiereFiltre}
            onMatiereChange={setMatiereFiltre}
          />

          {erreurGestion && <p role="alert" className="mt-4 text-sm text-red-700">{erreurGestion}</p>}

          {chargement ? (
            <p className="mt-8 text-sm text-inkmuted">Chargement...</p>
          ) : (
            <>
              {estPro && (
                <section id="mes-questionnaires" className="mt-12 scroll-mt-24">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted ">Espace personnel</p>
                  <h2 className="mt-2 border-b border-line pb-5 font-display text-2xl font-extrabold">Mes questionnaires</h2>
                  {mesQuestionnaires.length === 0 ? (
                    <div className="mt-5 rounded-md border border-dashed border-line bg-white px-6 py-10 text-center">
                      <p className="font-display text-lg font-bold">Rien par ici pour l'instant.</p>
                      <p className="mt-2 text-sm text-inkmuted">Génère ton premier questionnaire à partir d'un de tes documents.</p>
                      <button
                        type="button"
                        onClick={() => navigate("/creer-questionnaire")}
                        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-navy px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                      >
                        Créer mon premier questionnaire
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {mesQuestionnaires.map((q) => <Carte key={q.id} q={q} />)}
                    </div>
                  )}
                </section>
              )}

              {resultatsRecherche.length === 0 ? (
                <p className="mt-8 text-sm text-inkmuted">Aucun questionnaire ne correspond à tes critères.</p>
              ) : (
                <>
                  {domaineUtilisateur && sectionsPourVous.length > 0 && (
                    <section id="pour-vous" className={sectionAnimee === "pour-vous" ? "section-focus mt-12 scroll-mt-24" : "mt-12 scroll-mt-24"}>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted">Sélection</p>
                      <h2 className="mt-2 font-display text-2xl font-extrabold">Pour vous</h2>
                      {niveauUtilisateur !== null && niveauUtilisateur > 1 ? (
                        <>
                          <FiltresAnnee annees={anneesPourVous} comptes={comptesPourVous} selection={anneeSelectionnee} nombreTotal={pourVous.length} onChange={setAnneeSelectionnee} />
                          <div className="mt-5 divide-y divide-line border-y border-line">
                            {groupesPourVousParAnnee.map(({ annee, quizs }) => (
                              <details key={annee ?? "tous-niveaux"} className="group" open={recherche.trim().length > 0 || annee === niveauUtilisateur || annee === anneeSelectionnee || annee === null}>
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 marker:hidden">
                                  <span className="min-w-0">
                                    <span className="block font-display text-lg font-bold text-ink">{annee === null ? "Tous niveaux" : `Année ${annee}`}</span>
                                    <span className="mt-1 block text-xs text-inkmuted">{annee === niveauUtilisateur ? "Année actuelle · " : ""}{quizs.length} questionnaire{quizs.length === 1 ? "" : "s"}</span>
                                  </span>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-inkmuted transition-transform group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                                </summary>
                                <div className="grid gap-3 pb-5 sm:grid-cols-2 lg:grid-cols-3">
                                  {quizs.map((quiz) => <Carte key={quiz.id} q={quiz} />)}
                                </div>
                              </details>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="mt-6 space-y-10 border-t border-line pt-6">
                        {sectionsPourVous.map(({ matiere, quizs }) => (
                          <div key={matiere} id={`pour-vous-${matiere}`}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-inkmuted">Matière</p>
                                <h3 className="mt-1 font-display text-xl font-extrabold">{matiere}</h3>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {quizs.map((q) => <Carte key={q.id} q={q} />)}
                            </div>
                          </div>
                        ))}
                        </div>
                      )}
                    </section>
                  )}

                  {sectionsDecouvrezAussi.length > 0 && (
                    <section id="decouvrez-aussi" className={sectionAnimee === "decouvrez-aussi" || sectionAnimee?.startsWith("matiere-") ? "section-focus mt-12 scroll-mt-24" : "mt-12 scroll-mt-24"}>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted">Catalogue</p>
                      <h2 className="mt-2 font-display text-2xl font-extrabold">
                        {domaineUtilisateur ? "Découvrez aussi" : "Tous les questionnaires"}
                      </h2>
                      <div className="mt-6 space-y-10 border-t border-line pt-6">
                        {sectionsDecouvrezAussi.map(({ matiere, quizs }) => (
                          <div key={matiere} id={`matiere-${matiere}`}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-inkmuted">Matière</p>
                                <h3 className="mt-1 font-display text-xl font-extrabold">{matiere}</h3>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {quizs.map((q) => <Carte key={q.id} q={q} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {avances.length > 0 && (
                    <section id="avances" className={sectionAnimee === "avances-pour-vous" || sectionAnimee === "avances-decouvrir" || sectionAnimee?.startsWith("avance-matiere-") ? "section-focus relative mt-16 scroll-mt-24 bg-paper/45 py-10 text-ink sm:py-12" : "relative mt-16 scroll-mt-24 bg-paper/45 py-10 text-ink sm:py-12"}>
                      <div className="relative">
                        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
                          <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-navy">Format chronométré</p>
                            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Questionnaires avancées</h2>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-inkmuted">
                              Des formats plus exigeants pour vérifier tes acquis dans des conditions proches de l'examen.
                            </p>
                          </div>
                        </div>

                        {domaineUtilisateur && sectionsAvancesPourVous.length > 0 && (
                          <div id="avances-pour-vous" className="mt-8 scroll-mt-24">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted">Sélection</p>
                            <h2 className="mt-2 font-display text-2xl font-extrabold">Pour vous</h2>
                            {niveauUtilisateur !== null && niveauUtilisateur > 1 ? (
                              <>
                                <FiltresAnnee annees={anneesAvanceesPourVous} comptes={comptesAvancesPourVous} selection={anneeAvanceeSelectionnee} nombreTotal={avancesPourVous.length} onChange={setAnneeAvanceeSelectionnee} />
                                <div className="mt-5 divide-y divide-line border-y border-line">
                                  {groupesAvancesPourVousParAnnee.map(({ annee, quizs }) => (
                                    <details key={annee ?? "tous-niveaux"} className="group" open={recherche.trim().length > 0 || annee === niveauUtilisateur || annee === anneeAvanceeSelectionnee || annee === null}>
                                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 marker:hidden">
                                        <span className="min-w-0">
                                          <span className="block font-display text-lg font-bold text-ink">{annee === null ? "Tous niveaux" : `Année ${annee}`}</span>
                                          <span className="mt-1 block text-xs text-inkmuted">{annee === niveauUtilisateur ? "Année actuelle · " : ""}{quizs.length} questionnaire{quizs.length === 1 ? "" : "s"}</span>
                                        </span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-inkmuted transition-transform group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                                      </summary>
                                      <div className="grid gap-3 pb-5 sm:grid-cols-2 lg:grid-cols-3">
                                        {quizs.map((quiz) => <Carte key={quiz.id} q={quiz} />)}
                                      </div>
                                    </details>
                                  ))}
                                </div>
                              </>
                            ) : (
                            <div className="mt-6 space-y-10">
                              {sectionsAvancesPourVous.map(({ matiere, quizs }) => (
                                <div key={matiere} id={`avances-pour-vous-${matiere}`}>
                                  <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-inkmuted">Matière</p>
                                      <h3 className="mt-1 font-display text-xl font-extrabold">{matiere}</h3>
                                    </div>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {quizs.map((q) => <Carte key={q.id} q={q} />)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            )}
                          </div>
                        )}

                        {sectionsAvancesDecouvrezAussi.length > 0 && (
                          <div id="avances-decouvrir" className="mt-8 scroll-mt-24">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted">Catalogue</p>
                            <h2 className="mt-2 font-display text-2xl font-extrabold">
                              {domaineUtilisateur ? "Découvrez aussi" : "Tous les questionnaires avancés"}
                            </h2>
                            <div className="mt-6 space-y-10">
                              {sectionsAvancesDecouvrezAussi.map(({ matiere, quizs }) => (
                                <div key={matiere} id={`avance-matiere-${matiere}`}>
                                  <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-inkmuted">Matière</p>
                                      <h3 className="mt-1 font-display text-xl font-extrabold">{matiere}</h3>
                                    </div>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {quizs.map((q) => <Carte key={q.id} q={q} />)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
      <Footer sidebarReduite={sidebarReduite} />
      {quizASupprimer && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
          <section role="dialog" aria-modal="true" aria-labelledby="titre-suppression-questionnaire" className="w-full max-w-sm rounded-md border border-line bg-white p-6 shadow-xl">
            <h2 id="titre-suppression-questionnaire" className="font-display text-lg font-bold">Supprimer ce questionnaire ?</h2>
            <p className="mt-2 text-sm text-inkmuted">« {quizASupprimer.titreAffiche} » sera supprimé. Cette action est définitive.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setQuizASupprimer(null)} disabled={suppressionEnCours} className="min-h-10 flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 disabled:opacity-60">Annuler</button>
              <button type="button" onClick={() => void supprimerQuiz(quizASupprimer)} disabled={suppressionEnCours} className="min-h-10 flex-1 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{suppressionEnCours ? "Suppression..." : "Supprimer"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}