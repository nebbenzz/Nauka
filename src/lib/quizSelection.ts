export interface QuestionSelection {
  id: string;
  type: "qcm" | "qcu" | "code" | "dessin" | "libre";
}

export function melanger<T>(elements: T[]): T[] {
  const resultat = [...elements];
  for (let index = resultat.length - 1; index > 0; index -= 1) {
    const indexAleatoire = Math.floor(Math.random() * (index + 1));
    [resultat[index], resultat[indexAleatoire]] = [resultat[indexAleatoire], resultat[index]];
  }
  return resultat;
}

export function estQuestionStandard(question: QuestionSelection): boolean {
  return question.type === "qcm" || question.type === "qcu";
}

export function filtrerQuestionsParNiveau<T extends { notion_niveau: number | null }>(
  questions: T[],
  niveauUtilisateur: number | null
): T[] {
  if (niveauUtilisateur === null || niveauUtilisateur <= 0) return questions;
  return questions.filter((question) =>
    question.notion_niveau !== null && question.notion_niveau <= niveauUtilisateur
  );
}

export function eviterMemeTirage<T extends QuestionSelection>(
  tirage: T[],
  questionsDisponibles: T[],
  idsPrecedents: string[],
  estAvance: boolean
): T[] {
  const idsTires = new Set(tirage.map((question) => question.id));
  const memeEnsemble = tirage.length === idsPrecedents.length
    && tirage.every((question) => idsPrecedents.includes(question.id));

  if (memeEnsemble) {
    const indicesRemplacables = tirage
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => questionsDisponibles.some((candidate) =>
        !idsTires.has(candidate.id)
        && (!estAvance || estQuestionStandard(candidate) === estQuestionStandard(question))
      ));

    if (indicesRemplacables.length > 0) {
      const remplacement = indicesRemplacables[Math.floor(Math.random() * indicesRemplacables.length)];
      const candidats = questionsDisponibles.filter((candidate) =>
        !idsTires.has(candidate.id)
        && (!estAvance || estQuestionStandard(candidate) === estQuestionStandard(remplacement.question))
      );
      tirage[remplacement.index] = candidats[Math.floor(Math.random() * candidats.length)];
    }
  }

  const resultat = melanger(tirage);
  if (resultat.length > 1 && resultat.every((question, index) => question.id === idsPrecedents[index])) {
    [resultat[0], resultat[1]] = [resultat[1], resultat[0]];
  }
  return resultat;
}

export function tirerQuestionsStandard<T extends QuestionSelection>(
  questions: T[],
  idsPrecedents: string[] = []
): T[] {
  const questionsStandard = questions.filter((question) => estQuestionStandard(question));
  if (questionsStandard.length === 0) return [] as T[];
  return eviterMemeTirage(melanger(questionsStandard).slice(0, 5), questionsStandard, idsPrecedents, false) as T[];
}

export function tirerQuestionsAvancees<T extends QuestionSelection>(
  questions: T[],
  idsPrecedents: string[] = []
): T[] | null {
  const questionsFermees = questions.filter((question) => estQuestionStandard(question));
  const questionsDeveloppees = questions.filter((question) => !estQuestionStandard(question));

  if (questionsFermees.length < 3 || questionsDeveloppees.length < 2) return null;

  const selectionInitiale = [
    ...melanger(questionsFermees).slice(0, 3),
    ...melanger(questionsDeveloppees).slice(0, 2),
  ];
  const idsSelectionnes = new Set(selectionInitiale.map((question) => question.id));
  const questionsRestantes = questions.filter((question) => !idsSelectionnes.has(question.id));
  const complement = melanger(questionsRestantes).slice(0, 5 - selectionInitiale.length);

  return eviterMemeTirage([...selectionInitiale, ...complement], questions, idsPrecedents, true);
}
