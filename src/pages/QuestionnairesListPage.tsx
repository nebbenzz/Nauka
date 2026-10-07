import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../includes/Header";
import Footer from "../includes/Footer";
import SidebarQuestionnaires from "../components/SidebarQuestionnaires";
import QuestionnaireFilters, { type FiltreQuestionnaire } from "../components/QuestionnaireFilters";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabaseClient";
import { FORMATIONS } from "../data/formations";
import { estQuizCompatibleAvecNiveau, formatDureeQuiz, formatNiveauQuiz, getPreviewNotions, getScorePourcentage } from "../lib/catalogUtils";

interface QuizCard {
  id: string;
  titre: string;
  type: string;
  est_avance: boolean;
  duree_secondes: number | null;
  formation_cible: string | null;
  matiere_nom: string;
  notion_nom: string | null;
  notion_niveau: number | null;
  notions_couvertes: string[];
  nombre_questions: number;
  est_a_moi: boolean;
  dernier_score: number | null;
  dernier_score_max: number | null;
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
  const [chargement, setChargement] = useState(true);
  const [sidebarReduite, setSidebarReduite] = useState(false);
  const [sectionAnimee, setSectionAnimee] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      let formationChargee: string | null = null;
      if (session?.user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("formation, niveau_formation, plan, pro_expires_at")
          .eq("id", session.user.id)
          .single();

        formationChargee = profil?.formation ?? null;
        setNiveauUtilisateur(profil?.niveau_formation ?? null);
        const proActif = profil?.plan === "pro" && (!profil.pro_expires_at || new Date(profil.pro_expires_at) > new Date());
        setEstPro(proActif);
        if (profil?.formation) {
          const domaine = FORMATIONS.find((f) => f.label === profil.formation)?.domaine ?? null;
          setDomaineUtilisateur(domaine);
        }
      }

      const { data: quizPublics } = await supabase
        .from("quiz")
        .select("id, titre, type, est_avance, duree_secondes, formation_cible, matieres(nom), notions(nom, niveau), quiz_questions(count)")
        .eq("is_public", true);

      let quizPersonnels: any[] = [];
      if (session?.user) {
        const { data } = await supabase
          .from("quiz")
          .select("id, titre, type, est_avance, duree_secondes, formation_cible, matieres(nom), notions(nom, niveau), quiz_questions(count)")
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
        .select("quiz_id, questions(notions(nom))")
        .in("quiz_id", idsQuiz);

      const notionsParQuiz: Record<string, Set<string>> = {};
      (liaisons || []).forEach((l: any) => {
        const nom = l.questions?.notions?.nom;
        if (nom) {
          notionsParQuiz[l.quiz_id] = notionsParQuiz[l.quiz_id] || new Set();
          notionsParQuiz[l.quiz_id].add(nom);
        }
      });

      setQuizzes(
        tousLesQuiz.map((q: any) => ({
          id: q.id,
          titre: q.titre,
          type: q.type,
          est_avance: q.est_avance,
          duree_secondes: q.duree_secondes,
          formation_cible: q.formation_cible ?? null,
          matiere_nom: q.matieres?.nom ?? "",
          notion_nom: q.notions?.nom ?? null,
          notion_niveau: q.notions?.niveau ?? null,
          notions_couvertes: Array.from(notionsParQuiz[q.id] || []),
          nombre_questions: Math.min(5, q.quiz_questions?.[0]?.count ?? 0),
          est_a_moi: q.est_a_moi,
          dernier_score: dernierScoreParQuiz.get(q.id)?.score ?? null,
          dernier_score_max: dernierScoreParQuiz.get(q.id)?.score_max ?? null,
        }))
      );
      setChargement(false);
    }

    charger();
  }, [session]);

  const rechercheLower = recherche.toLowerCase();
  const correspond = (q: QuizCard) =>
    q.titre.toLowerCase().includes(rechercheLower) ||
    q.matiere_nom.toLowerCase().includes(rechercheLower) ||
    q.notions_couvertes.some((n) => n.toLowerCase().includes(rechercheLower));

  const estPourVous = (q: QuizCard) => {
    if (!domaineUtilisateur || q.matiere_nom !== domaineUtilisateur) return false;
    return estQuizCompatibleAvecNiveau(
      {
        type: q.type,
        notion_niveau: q.notion_niveau,
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

          const niveauA = a.notion_niveau ?? 999;
          const niveauB = b.notion_niveau ?? 999;
          if (niveauA !== niveauB) return niveauA - niveauB;

          const notionA = a.notion_nom ?? "";
          const notionB = b.notion_nom ?? "";
          if (notionA !== notionB) return notionA.localeCompare(notionB);

          return a.titre.localeCompare(b.titre);
        }),
      }));
  };

  const decouvrezAussi = (domaineUtilisateur ? standards.filter((q) => !estPourVous(q)) : standards)
    .filter(correspondAuxFiltres)
    .filter((q) => !matiereSidebarClassique || q.matiere_nom === matiereSidebarClassique);
  const avancesDecouvrezAussi = (domaineUtilisateur ? avances.filter((q) => !estPourVous(q)) : avances)
    .filter(correspondAuxFiltres)
    .filter((q) => !matiereSidebarAvancee || q.matiere_nom === matiereSidebarAvancee);

  const sectionsPourVous = regrouperParMatiere(pourVous);
  const sectionsDecouvrezAussi = regrouperParMatiere(decouvrezAussi);
  const sectionsAvancesPourVous = regrouperParMatiere(avancesPourVous);
  const sectionsAvancesDecouvrezAussi = regrouperParMatiere(avancesDecouvrezAussi);

  function handleClic(quizId: string) {
    navigate(session?.user ? `/questionnaires/${quizId}` : "/connexion");
  }

  function naviguerVersSection(cible: string, terme: string) {
    const estMatiereClassique = cible.startsWith("matiere-");
    const estMatiereAvancee = cible.startsWith("avance-matiere-");
    setRecherche(estMatiereClassique || estMatiereAvancee ? "" : terme);
    setFiltre("tous");
    setMatiereFiltre("");
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
    const apercuNotions = getPreviewNotions(q.notions_couvertes);
    const niveau = formatNiveauQuiz(q);
    const typeLibelle = q.est_avance ? "Matière" : q.type === "global" ? "Matière" : "Notion";
    const etiquetteType = q.type === "notion" && niveau ? `${typeLibelle} • ${niveau}` : typeLibelle;
    const estCarteMatiere = q.type === "global" || q.est_avance;
    const texteApercu = apercuNotions.length > 0 ? apercuNotions.join(" • ") : q.notion_nom ?? "Couverture globale de la matière";

    return (
      <button
        type="button"
        onClick={() => handleClic(q.id)}
        className={q.est_avance
          ? "flex min-h-52 flex-col border border-navy/25 border-l-4 border-l-navy bg-[#F1F4F7] p-5 text-left transition-colors hover:border-navy hover:bg-[#EAF0F5]"
          : "flex min-h-52 flex-col border border-line bg-[#FCFBF7] p-5 text-left transition-colors hover:border-navy/40 hover:bg-white"}
      >
        <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-inkmuted">
          <span>{etiquetteType}</span>
          {estCarteMatiere ? (
            <div className="group/preview relative flex items-center justify-end">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-navy/20 bg-gradient-to-br from-highlight/40 via-white to-sage/10 text-navy shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-md"
                title="Aperçu du questionnaire"
                aria-label="Voir l'aperçu du questionnaire"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2.5A4.5 4.5 0 0 0 7.5 7v2.2A7.8 7.8 0 0 1 12 8a7.8 7.8 0 0 1 4.5 1.2V7A4.5 4.5 0 0 0 12 2.5Z" />
                  <path d="M6.5 9.5A5.5 5.5 0 0 0 12 15a5.5 5.5 0 0 0 5.5-5.5" />
                </svg>
              </span>
              <div className="pointer-events-none absolute right-0 bottom-full z-20 mb-2 w-52 scale-95 rounded-2xl border border-line bg-white p-2.5 text-left opacity-0 shadow-[0_12px_30px_rgba(29,53,87,0.14)] transition-all duration-150 group-hover/preview:scale-100 group-hover/preview:opacity-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-inkmuted">Aperçu</p>
                <p className="mt-1 text-[11px] leading-5 text-ink">{texteApercu}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-inkmuted">
          {scoreActuel !== null && (
            <span className="rounded-full bg-sage/15 px-2 py-1 font-bold text-sage">Dernier score : {scoreActuel}%</span>
          )}
        </div>

        <div className="flex flex-1 items-center py-4">
          <h3 className="line-clamp-2 text-left font-display text-lg font-extrabold leading-snug text-ink">{q.titre}</h3>
        </div>

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
            <span className="font-semibold text-navy transition-colors group-hover:text-ink">Ouvrir <span aria-hidden="true">→</span></span>
          )}
        </div>
        {!session?.user && <p className="mt-3 text-[11px] font-semibold text-navy">Connexion requise pour commencer</p>}
      </button>
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
                className="inline-flex items-center gap-2 border border-navy bg-navy px-4 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-ink"
              >
                <span className="text-lg leading-none">+</span>
                Créer un questionnaire
              </button>
            )}
          </div>

          <div className="relative max-w-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher une matière, une notion..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full border border-line bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-inkmuted/70 focus:border-navy focus:ring-2 focus:ring-highlight/40"
            />
          </div>

          <QuestionnaireFilters
            valeur={filtre}
            onChange={setFiltre}
            matieres={matieresDisponibles}
            matiereSelectionnee={matiereFiltre}
            onMatiereChange={setMatiereFiltre}
          />

          {chargement ? (
            <p className="mt-8 text-sm text-inkmuted">Chargement...</p>
          ) : (
            <>
              {estPro && (
                <section id="mes-questionnaires" className="mt-12 scroll-mt-24">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted ">Espace personnel</p>
                  <h2 className="mt-2 border-b border-line pb-5 font-display text-2xl font-extrabold">Mes questionnaires</h2>
                  {mesQuestionnaires.length === 0 ? (
                    <div className="mt-5 rounded-[1.5rem] border border-dashed border-line bg-white px-6 py-10 text-center">
                      <p className="font-display text-lg font-bold">Rien par ici pour l'instant.</p>
                      <p className="mt-2 text-sm text-inkmuted">Génère ton premier questionnaire à partir d'un de tes documents.</p>
                      <button
                        type="button"
                        onClick={() => navigate("/creer-questionnaire")}
                        className="mt-5 rounded-md bg-navy px-5 py-2.5 text-sm font-bold text-paper hover:bg-ink transition-colors"
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
    </div>
  );
}