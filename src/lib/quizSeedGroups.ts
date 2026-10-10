import type { QuestionSeed, QuizSeed } from "../data/seed/types";

export interface GroupeQuizNotion {
  titre: string;
  notionsIncluses: string[];
}

export function creerQuizAgreges(
  questions: QuestionSeed[],
  groupes: GroupeQuizNotion[],
  quizzesExistants: QuizSeed[] = [],
): QuizSeed[] {
  const notionsDisponibles = new Set(questions.map((question) => question.notion));
  const notionsDejaGroupees = new Map<string, string>();
  const titresExistants = new Set(quizzesExistants.filter((quiz) => quiz.type === "global").map((quiz) => quiz.titre));

  return groupes.flatMap((groupe) => {
    const notionsIncluses = [...new Set(groupe.notionsIncluses)];
    if (notionsIncluses.length < 2) {
      throw new Error(`Le groupe « ${groupe.titre} » doit inclure au moins deux notions.`);
    }
    for (const notion of notionsIncluses) {
      if (!notionsDisponibles.has(notion)) {
        throw new Error(`La notion « ${notion} » du groupe « ${groupe.titre} » n'existe pas dans le seed.`);
      }
      const groupeExistant = notionsDejaGroupees.get(notion);
      if (groupeExistant && groupeExistant !== groupe.titre) {
        throw new Error(`La notion « ${notion} » est incluse à la fois dans « ${groupeExistant} » et « ${groupe.titre} ».`);
      }
      notionsDejaGroupees.set(notion, groupe.titre);
    }
    const questionsIncluses = questions.filter((question) => notionsIncluses.includes(question.notion));
    const niveaux = [...new Set(questionsIncluses.map((question) => question.niveau))].sort((a, b) => a - b);
    const niveauPremiereDecouverte = niveaux[0];
    return niveaux.flatMap((niveauCible) => {
      const titre = `${groupe.titre} [L${niveauCible}]`;
      if (titresExistants.has(titre)) return [];
      return [{
        titre,
        type: "global" as const,
        notionFiltre: groupe.titre,
        notionsIncluses,
        niveauNotion: niveauPremiereDecouverte,
        niveauCible,
        niveauPremiereDecouverte,
        questionIds: questionsIncluses.filter((question) => question.niveau === niveauCible).map((question) => question.id),
      }];
    });
  });
}

export function creerQuizNotionParNiveau(
  questions: QuestionSeed[],
  notionsRegroupees: string[],
  quizzesExistants: QuizSeed[] = [],
): QuizSeed[] {
  const exclusions = new Set(notionsRegroupees);
  const notions = [...new Set(questions.map((question) => question.notion))]
    .filter((notion) => !exclusions.has(notion))
    .sort((a, b) => a.localeCompare(b, "fr"));
  const titresExistants = new Set(quizzesExistants.map((quiz) => quiz.titre));

  return notions.flatMap((notion) => {
    const questionsNotion = questions.filter((question) => question.notion === notion);
    const niveaux = [...new Set(questionsNotion.map((question) => question.niveau))].sort((a, b) => a - b);
    const niveauPremiereDecouverte = niveaux[0];
    return niveaux.flatMap((niveauCible) => {
      const titre = `${notion} [L${niveauCible}]`;
      if (titresExistants.has(titre)) return [];
      return [{
        titre,
        type: "notion" as const,
        notionFiltre: notion,
        niveauNotion: niveauPremiereDecouverte,
        niveauCible,
        niveauPremiereDecouverte,
        questionIds: questionsNotion.filter((question) => question.niveau === niveauCible).map((question) => question.id),
      }];
    });
  });
}

export function creerQuizMatiereParNiveau(
  matiere: string,
  questions: QuestionSeed[],
  quizzesExistants: QuizSeed[] = [],
): QuizSeed[] {
  const niveaux = [...new Set(questions.map((question) => question.niveau))].sort((a, b) => a - b);
  if (niveaux.length === 0) return [];
  const niveauPremiereDecouverte = niveaux[0];
  const titresExistants = new Set(quizzesExistants.map((quiz) => quiz.titre));
  const niveauxAvances = niveaux.filter((niveau) => niveau >= niveauPremiereDecouverte + 2);
  const premierNiveauAvance = niveauxAvances[0];
  const niveauxIndividuels = niveauxAvances.length > 1
    ? niveaux.filter((niveau) => niveau < (premierNiveauAvance ?? Number.MAX_SAFE_INTEGER))
    : niveaux;

  const quizzes: QuizSeed[] = niveauxIndividuels.flatMap((niveauCible) => {
    const questionsDuNiveau = questions.filter((question) => question.niveau === niveauCible);
    const titreStandard = `${matiere} [L${niveauCible}]`;
    const quizStandard: QuizSeed[] = titresExistants.has(titreStandard) ? [] : [{
      titre: titreStandard,
      type: "global",
      niveauCible,
      niveauPremiereDecouverte,
      questionIds: questionsDuNiveau.map((question) => question.id),
    }];
    const questionsFermees = questionsDuNiveau.filter((question) => question.type === "qcm" || question.type === "qcu");
    const questionsDeveloppees = questionsDuNiveau.filter((question) => question.type !== "qcm" && question.type !== "qcu");
    const titreAvance = `${matiere} — épreuve avancée [L${niveauCible}]`;
    if (questionsFermees.length < 3 || questionsDeveloppees.length < 2 || titresExistants.has(titreAvance)) return quizStandard;
    return [...quizStandard, {
      titre: titreAvance,
      type: "global",
      niveauCible,
      niveauPremiereDecouverte,
      estAvance: true,
      dureeSecondes: 1200,
      questionIds: questionsDuNiveau.map((question) => question.id),
    }];
  });

  if (niveauxAvances.length > 1 && premierNiveauAvance !== undefined) {
    const questionsAvancees = questions.filter((question) => question.niveau >= premierNiveauAvance);
    const titreStandard = `${matiere} [L${premierNiveauAvance}]`;
    if (!titresExistants.has(titreStandard)) {
      quizzes.push({
        titre: titreStandard,
        type: "global",
        niveauCible: premierNiveauAvance,
        niveauPremiereDecouverte,
        niveauxInclus: niveauxAvances,
        questionIds: questionsAvancees.map((question) => question.id),
      });
    }

    const questionsFermees = questionsAvancees.filter((question) => question.type === "qcm" || question.type === "qcu");
    const questionsDeveloppees = questionsAvancees.filter((question) => question.type !== "qcm" && question.type !== "qcu");
    const titreAvance = `${matiere} — épreuve avancée [L${premierNiveauAvance}]`;
    if (questionsFermees.length >= 3 && questionsDeveloppees.length >= 2 && !titresExistants.has(titreAvance)) {
      quizzes.push({
        titre: titreAvance,
        type: "global",
        niveauCible: premierNiveauAvance,
        niveauPremiereDecouverte,
        niveauxInclus: niveauxAvances,
        estAvance: true,
        dureeSecondes: 1200,
        questionIds: questionsAvancees.map((question) => question.id),
      });
    }
  }

  return quizzes;
}