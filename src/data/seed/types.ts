export interface ReponseSeed {
  texte: string;
  correcte: boolean;
}

export interface CriteresEvaluationSeed {
  langage?: string;
  codeReference?: string;
  testsJson?: unknown;
  criteresIa?: string;
  penalitePoints?: number;
}

export interface QuestionSeed {
  id: string;
  notion: string;
  niveau: number;
  type: "qcm" | "qcu" | "code" | "dessin" | "libre";
  intitule: string;
  explication: string;
  points?: number;
  reponses?: ReponseSeed[];
  criteresEvaluation?: CriteresEvaluationSeed;
}

export interface QuizSeed {
  titre: string;
  type: "notion" | "global";
  notionFiltre?: string;
  notionsIncluses?: string[];
  niveauNotion?: number;
  niveauCible?: number;
  niveauPremiereDecouverte?: number;
  niveauxInclus?: number[];
  questionIds: string[];
  formationCible?: string;
  estAvance?: boolean;
  dureeSecondes?: number;
}