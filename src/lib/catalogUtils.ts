import { FORMATIONS } from "../data/formations";

export interface DomaineCatalogue<T> {
  id: string;
  nom: string;
  formationCible: string | null;
  quizs: T[];
}

export interface FormationCatalogue<T> {
  id: string;
  nom: string;
  ciblesFormation: Array<string | null>;
  domaines: DomaineCatalogue<T>[];
  quizs: T[];
}

export interface GroupeCatalogue<T> {
  type: string;
  formations: FormationCatalogue<T>[];
}

interface QuizCatalogue {
  formation_cible: string | null;
  matiere_nom: string;
  niveau_cible?: number | null;
  notion_niveau?: number | null;
  niveau_contenu_max?: number | null;
}

const ordreTypesFormation = ["Licence", "Master", "BTS", "BUT", "Prépa", "Autres formations"];

function slugifier(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function determinerTypeFormation(quiz: QuizCatalogue): string {
  const { formation_cible: formationCible } = quiz;
  if (!formationCible) {
    const niveau = quiz.niveau_cible ?? quiz.notion_niveau ?? quiz.niveau_contenu_max ?? 1;
    return niveau >= 4 ? "Master" : "Licence";
  }

  const formation = FORMATIONS.find((item) => item.label === formationCible);
  const type = formation?.type
    ?? (/^BTS\b/i.test(formationCible) ? "BTS"
      : /^BUT\b/i.test(formationCible) ? "BUT"
        : /^(?:L[1-3]|Licence)\b/i.test(formationCible) ? "Licence"
          : /^(?:M[1-2]|Master)\b/i.test(formationCible) ? "Master"
          : /^(?:CPGE|Prépa)\b/i.test(formationCible) ? "Prépa"
            : null);

  if (type === "Licence" || type === "Master") return type;
  if (type === "BTS" || type === "BUT") return type;
  if (type === "Prépa") return "Prépa";
  return "Autres formations";
}

export function grouperQuizParFormation<T extends QuizCatalogue>(quizs: T[]): GroupeCatalogue<T>[] {
  const groupes = new Map<string, {
    type: string;
    formations: Map<string, {
      id: string;
      nom: string;
      ciblesFormation: Array<string | null>;
      domaines: Map<string, DomaineCatalogue<T>>;
      quizs: T[];
    }>;
  }>();

  for (const quiz of quizs) {
    const type = determinerTypeFormation(quiz);
    const matiere = quiz.matiere_nom || "Autres";
    const formationUniversitaire = type === "Licence" || type === "Master";
    const nomFormation = formationUniversitaire ? matiere : quiz.formation_cible ?? matiere;
    const groupeType = groupes.get(type) ?? { type, formations: new Map() };
    const groupeFormation = groupeType.formations.get(nomFormation) ?? {
      id: [type, nomFormation].map(slugifier).join("--"),
      nom: nomFormation,
      ciblesFormation: [],
      domaines: new Map(),
      quizs: [],
    };
    if (!groupeFormation.ciblesFormation.includes(quiz.formation_cible)) {
      groupeFormation.ciblesFormation.push(quiz.formation_cible);
    }
    if (formationUniversitaire) {
      groupeFormation.quizs.push(quiz);
      groupeType.formations.set(nomFormation, groupeFormation);
      groupes.set(type, groupeType);
      continue;
    }

    const cleDomaine = JSON.stringify([quiz.formation_cible, matiere]);
    const domaine = groupeFormation.domaines.get(cleDomaine) ?? {
      id: [type, nomFormation, matiere].map(slugifier).join("--"),
      nom: matiere,
      formationCible: quiz.formation_cible,
      quizs: [],
    };

    domaine.quizs.push(quiz);
    groupeFormation.domaines.set(cleDomaine, domaine);
    groupeType.formations.set(nomFormation, groupeFormation);
    groupes.set(type, groupeType);
  }

  return Array.from(groupes.values())
    .sort((a, b) => ordreTypesFormation.indexOf(a.type) - ordreTypesFormation.indexOf(b.type) || a.type.localeCompare(b.type, "fr"))
    .map((groupeType) => ({
      type: groupeType.type,
      formations: Array.from(groupeType.formations.values())
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
        .map((groupeFormation) => ({
          id: groupeFormation.id,
          nom: groupeFormation.nom,
          ciblesFormation: groupeFormation.ciblesFormation,
          domaines: Array.from(groupeFormation.domaines.values()).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
          quizs: groupeFormation.quizs,
        })),
    }));
}

export interface NiveauQuizLike {
  type?: string | null;
  notion_niveau?: number | null;
  notion_nom?: string | null;
  niveau_cible?: number | null;
  niveau_premiere_decouverte?: number | null;
  niveau_contenu_max?: number | null;
  est_avance?: boolean | null;
}

export interface QuizTitreLike {
  id: string;
  titre: string;
  type: string | null;
  est_avance: boolean;
  matiere_nom: string;
  notion_nom: string | null;
  notion_niveau: number | null;
  niveau_cible?: number | null;
  niveau_premiere_decouverte?: number | null;
  niveau_contenu_max?: number | null;
}

export interface QuizNotionLike extends QuizTitreLike {
  est_a_moi: boolean;
  dernier_score: number | null;
  notions_couvertes?: string[];
}

interface DetailTitreQuiz {
  base: string;
  descriptor: "fondamentaux" | "approfondissement" | "avancé";
}

function normaliserCle(valeur: string): string {
  return valeur.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function premiereDecouverteQuiz(quiz: QuizTitreLike): number | null {
  return quiz.niveau_premiere_decouverte ?? quiz.notion_niveau ?? quiz.niveau_contenu_max ?? null;
}

function descripteurProgression(premiereDecouverte: number | null, niveauCible: number | null): DetailTitreQuiz["descriptor"] {
  if (premiereDecouverte === null || niveauCible === null) return "fondamentaux";
  const ecart = niveauCible - premiereDecouverte;
  return ecart <= 0 ? "fondamentaux" : ecart === 1 ? "approfondissement" : "avancé";
}

function normaliserBaseTitreQuiz(quiz: QuizTitreLike): string {
  const source = quiz.notion_nom || quiz.matiere_nom || quiz.titre;
  const sansNiveau = source
    .trim()
    .replace(/\s+[—–-]\s+(?:L[1-5]|Licence|initiation|novice|débutant|intermédiaire(?:\s+\d+)?|compétent(?:e)?(?:\s+\d+)?|avancé(?:e)?|avancée)(?:\s+\d+)?$/iu, "")
    .trim();
  const parties = sansNiveau.split(/\s+[—–-]\s+/u);
  const base = parties.length > 1 ? `${parties[0]} (${parties.slice(1).join(" - ")})` : sansNiveau;
  return quiz.est_avance && quiz.type !== "notion" ? `${base} (format avancé)` : base;
}

export function uniformiserTitresQuestionnaires<T extends QuizTitreLike>(
  quizzes: T[],
  niveauUtilisateur: number | null,
): Array<T & { titreAffiche: string }> {
  const quizStandards = quizzes.map((quiz) => quiz.type === "personnalise" ? null : quiz);
  const indicesStandards = quizStandards.flatMap((quiz, index) => quiz ? [index] : []);
  if (indicesStandards.length !== quizzes.length) {
    const titresStandards = uniformiserTitresQuestionnaires(
      indicesStandards.map((index) => quizzes[index]),
      niveauUtilisateur,
    );
    const titreParIndex = new Map(indicesStandards.map((index, standardIndex) => [index, titresStandards[standardIndex].titreAffiche]));
    return quizzes.map((quiz, index) => ({
      ...quiz,
      titreAffiche: quiz.type === "personnalise" ? quiz.titre : titreParIndex.get(index) ?? quiz.titre,
    }));
  }

  const bases = quizzes.map(normaliserBaseTitreQuiz);
  const premieresDecouvertesParBase = new Map<string, number>();
  quizzes.forEach((quiz, index) => {
    const premiereDecouverte = premiereDecouverteQuiz(quiz);
    if (premiereDecouverte === null) return;
    const cle = `${normaliserCle(quiz.matiere_nom)}|${normaliserCle(bases[index])}`;
    const premiereExistante = premieresDecouvertesParBase.get(cle);
    if (premiereExistante === undefined || premiereDecouverte < premiereExistante) {
      premieresDecouvertesParBase.set(cle, premiereDecouverte);
    }
  });

  const details: DetailTitreQuiz[] = quizzes.map((quiz, index) => {
    const cle = `${normaliserCle(quiz.matiere_nom)}|${normaliserCle(bases[index])}`;
    const premiereDecouverte = premieresDecouvertesParBase.get(cle) ?? premiereDecouverteQuiz(quiz);
    const niveauDuQuiz = quiz.niveau_cible ?? (quiz.type === "notion" ? quiz.notion_niveau : niveauUtilisateur ?? quiz.notion_niveau);
    return {
      base: bases[index],
      descriptor: descripteurProgression(premiereDecouverte, niveauDuQuiz),
    };
  });
  return quizzes.map((quiz, index) => {
    const { base, descriptor } = details[index];
    return { ...quiz, titreAffiche: `${base} - ${descriptor}` };
  });
}

export function dedupliquerQuizParNotion<T extends QuizNotionLike>(quizzes: T[], niveauUtilisateur: number | null): T[] {
  const resultat: T[] = [];
  const indexParGroupe = new Map<string, number>();
  const groupesCouvrantNotions = new Set<string>();
  const matieresAvecGroupesGlobauxParAnnee = new Set<string>();
  const notionsAvecVariantesAnnuelles = new Set<string>();
  const premierNiveauGlobalParDescripteur = new Map<string, number>();

  for (const quiz of quizzes) {
    if ((quiz.type !== "global" && quiz.type !== "notion") || quiz.niveau_cible === null || quiz.niveau_cible === undefined) continue;
    const matiere = normaliserCle(quiz.matiere_nom);
    const format = quiz.est_avance ? "avance" : "classique";
    if (!quiz.notion_nom) {
      matieresAvecGroupesGlobauxParAnnee.add(`${matiere}|${format}`);
      const descriptor = descripteurProgression(premiereDecouverteQuiz(quiz), quiz.niveau_cible);
      const cle = `${matiere}|${format}|${descriptor}`;
      const niveauExistant = premierNiveauGlobalParDescripteur.get(cle);
      if (niveauExistant === undefined || quiz.niveau_cible < niveauExistant) {
        premierNiveauGlobalParDescripteur.set(cle, quiz.niveau_cible);
      }
      continue;
    }
    const notionCanonique = normaliserBaseTitreQuiz(quiz)
      .replace(/\s+\([^()]*\)$/u, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    notionsAvecVariantesAnnuelles.add(`${matiere}|${notionCanonique}|${format}`);
    for (const notion of quiz.notions_couvertes ?? []) {
      groupesCouvrantNotions.add(`${matiere}|${normaliserCle(notion)}|${quiz.niveau_cible}|${format}`);
    }
  }

  function priorite(quiz: T): [number, number, number, number, number, string] {
    const niveauQuiz = quiz.niveau_cible ?? quiz.notion_niveau;
    const compatibleAvecNiveau = niveauUtilisateur !== null && niveauQuiz !== null && niveauQuiz <= niveauUtilisateur;
    const distanceNiveau = niveauUtilisateur === null || niveauQuiz === null
      ? Number.MAX_SAFE_INTEGER
      : Math.abs(niveauUtilisateur - niveauQuiz);
    return [
      quiz.type === "global" && quiz.notion_nom ? 1 : 0,
      quiz.niveau_cible === null || quiz.niveau_cible === undefined ? 0 : 1,
      compatibleAvecNiveau ? 1 : 0,
      -distanceNiveau,
      quiz.dernier_score === null ? 0 : 1,
      quiz.titre,
    ];
  }

  function estPrioritaire(candidat: T, actuel: T): boolean {
    const prioriteCandidat = priorite(candidat);
    const prioriteActuelle = priorite(actuel);
    for (let index = 0; index < prioriteCandidat.length - 1; index += 1) {
      if (prioriteCandidat[index] !== prioriteActuelle[index]) {
        return prioriteCandidat[index] > prioriteActuelle[index];
      }
    }
    return prioriteCandidat[5].localeCompare(prioriteActuelle[5], "fr") < 0;
  }

  quizzes.forEach((quiz) => {
    if (quiz.est_a_moi || (quiz.type !== "notion" && quiz.type !== "global") || (quiz.type === "notion" && !quiz.notion_nom)) {
      resultat.push(quiz);
      return;
    }

    const matiere = normaliserCle(quiz.matiere_nom);
    const estQuizGlobalMatiere = quiz.type === "global" && !quiz.notion_nom;
    const niveau = quiz.niveau_cible ?? quiz.notion_niveau;
    const niveauCle = niveau ?? "legacy";
    const format = quiz.est_avance ? "avance" : "classique";
    if (estQuizGlobalMatiere && quiz.niveau_cible == null && matieresAvecGroupesGlobauxParAnnee.has(`${matiere}|${format}`)) return;
    if (estQuizGlobalMatiere && niveau !== null) {
      const descriptor = descripteurProgression(premiereDecouverteQuiz(quiz), niveau);
      const premierNiveau = premierNiveauGlobalParDescripteur.get(`${matiere}|${format}|${descriptor}`);
      if (premierNiveau !== undefined && niveau > premierNiveau) return;
    }
    const notionCanonique = normaliserBaseTitreQuiz(quiz)
      .replace(/\s+\([^()]*\)$/u, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (quiz.niveau_cible == null && quiz.notion_nom && notionsAvecVariantesAnnuelles.has(`${matiere}|${notionCanonique}|${format}`)) return;
    if (quiz.type === "notion" && quiz.notion_nom && niveau !== null) {
      if (groupesCouvrantNotions.has(`${matiere}|${normaliserCle(quiz.notion_nom)}|${niveau}|${format}`)) return;
    }
    if (quiz.type !== "notion" && quiz.type !== "global") {
      resultat.push(quiz);
      return;
    }
    const cle = estQuizGlobalMatiere
      ? `global|${matiere}|${format}|${niveauCle}`
      : `notion|${matiere}|${notionCanonique}|${format}|${niveauCle}`;
    const indexExistant = indexParGroupe.get(cle);
    if (indexExistant === undefined) {
      indexParGroupe.set(cle, resultat.length);
      resultat.push(quiz);
    } else if (estPrioritaire(quiz, resultat[indexExistant])) {
      resultat[indexExistant] = quiz;
    }
  });

  return resultat;
}

export function estQuizCompatibleAvecNiveau(quiz: NiveauQuizLike, niveauUtilisateur: number | null): boolean {
  if (niveauUtilisateur === null || niveauUtilisateur <= 0) return false;

  if (typeof quiz.niveau_cible === "number") return quiz.niveau_cible <= niveauUtilisateur;

  if (quiz.type === "global") {
    const premiereDecouverte = quiz.niveau_premiere_decouverte ?? quiz.notion_niveau;
    return quiz.notion_nom
      ? typeof premiereDecouverte === "number" && premiereDecouverte <= niveauUtilisateur
      : true;
  }

  const niveauApplicable = quiz.niveau_premiere_decouverte ?? quiz.notion_niveau;
  if (typeof niveauApplicable === "number") {
    return niveauApplicable <= niveauUtilisateur;
  }

  if (quiz.type === "notion") return false;

  return false;
}

export function formatNiveauQuiz(quiz: NiveauQuizLike): string {
  const niveau = quiz.niveau_cible ?? quiz.notion_niveau;
  if (quiz.type === "notion" && typeof niveau === "number" && niveau > 0) {
    return `niv. ${niveau}`;
  }
  return "";
}

export function formatDureeQuiz(dureeSecondes: number | null | undefined): string {
  if (!dureeSecondes || dureeSecondes <= 0) return "—";
  return `${Math.max(1, Math.round(dureeSecondes / 60))} min`;
}

export function getScorePourcentage(score: number | null | undefined, scoreMax: number | null | undefined): number | null {
  if (typeof score !== "number" || typeof scoreMax !== "number" || scoreMax <= 0) return null;
  return Math.round((score / scoreMax) * 100);
}

export function getPreviewNotions(notions: string[]): string[] {
  return notions.filter(Boolean).slice(0, 3);
}
