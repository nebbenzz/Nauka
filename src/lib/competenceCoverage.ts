export interface NotionProgression {
  id: string;
}

export interface QuestionProgression {
  id: string;
  notion_id: string;
  type: "qcm" | "qcu" | "code" | "dessin" | "libre";
  points: number;
  reponses: { id: string; est_correcte: boolean }[];
}

export interface ResultatProgression {
  id: string;
  created_at: string | null;
  reponses_json: unknown;
}

export interface ActiviteNotion {
  nombreQuestionsDistinctesTotal: number;
  nombreQuestionsDistinctesRecentes: number;
  nombreSessionsRecentes: number;
  derniereReponse: string | null;
  scoreRecent: number | null;
}

interface ReponseHistorique {
  question_id: string;
  contenu?: unknown;
  statut?: string;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function extraireReponses(resultat: ResultatProgression): ReponseHistorique[] {
  if (!estObjet(resultat.reponses_json)) return [];

  const details = resultat.reponses_json.details;
  if (Array.isArray(details)) {
    return details.flatMap((detail) => {
      if (!estObjet(detail) || typeof detail.question_id !== "string") return [];
      return [{ question_id: detail.question_id, statut: typeof detail.statut === "string" ? detail.statut : undefined }];
    });
  }

  return Object.entries(resultat.reponses_json).flatMap(([questionId, contenu]) => {
    if (questionId === "details") return [];
    return [{ question_id: questionId, contenu }];
  });
}

function scoreReponse(question: QuestionProgression, reponse: ReponseHistorique): number {
  if (reponse.statut === "correct") return 1;
  if (reponse.statut === "partiel") return 0.5;
  if (reponse.statut === "incorrect") return 0;

  if (question.type !== "qcm" && question.type !== "qcu") return 0;
  if (!Array.isArray(reponse.contenu)) return 0;

  const bonnesReponses = question.reponses
    .filter((option) => option.est_correcte)
    .map((option) => option.id)
    .sort();
  const choix = reponse.contenu.filter((id): id is string => typeof id === "string").sort();
  return JSON.stringify(choix) === JSON.stringify(bonnesReponses) ? 1 : 0;
}

export function analyserActiviteNotions(
  notions: NotionProgression[],
  questions: QuestionProgression[],
  resultats: ResultatProgression[],
  maintenant = new Date(),
  fenetreJours = 90,
): Map<string, ActiviteNotion> {
  const activite = new Map<string, ActiviteNotion>(
    notions.map((notion) => [notion.id, {
      nombreQuestionsDistinctesTotal: 0,
      nombreQuestionsDistinctesRecentes: 0,
      nombreSessionsRecentes: 0,
      derniereReponse: null,
      scoreRecent: null,
    }]),
  );
  const questionsParId = new Map(questions.map((question) => [question.id, question]));
  const dateLimite = maintenant.getTime() - fenetreJours * 24 * 60 * 60 * 1000;
  const questionsTotalesParNotion = new Map<string, Set<string>>();
  const sessionsRecentesParNotion = new Map<string, Set<string>>();
  const dernieresReponsesRecentes = new Map<string, Map<string, { date: number; score: number; points: number }>>();

  for (const resultat of resultats) {
    if (!resultat.created_at) continue;
    const dateResultat = new Date(resultat.created_at);
    if (Number.isNaN(dateResultat.getTime()) || dateResultat > maintenant) continue;
    const notionsReponduesDansSession = new Set<string>();

    for (const reponse of extraireReponses(resultat)) {
      const question = questionsParId.get(reponse.question_id);
      const mesure = question ? activite.get(question.notion_id) : null;
      if (!question || !mesure) continue;

      const questionsTotales = questionsTotalesParNotion.get(question.notion_id) ?? new Set<string>();
      questionsTotales.add(question.id);
      questionsTotalesParNotion.set(question.notion_id, questionsTotales);
      if (!mesure.derniereReponse || dateResultat.toISOString() > mesure.derniereReponse) {
        mesure.derniereReponse = dateResultat.toISOString();
      }

      if (dateResultat.getTime() < dateLimite) continue;

      notionsReponduesDansSession.add(question.notion_id);
      const reponsesParQuestion = dernieresReponsesRecentes.get(question.notion_id) ?? new Map();
      const precedente = reponsesParQuestion.get(question.id);
      if (!precedente || dateResultat.getTime() >= precedente.date) {
        reponsesParQuestion.set(question.id, {
          date: dateResultat.getTime(),
          score: scoreReponse(question, reponse),
          points: question.points > 0 ? question.points : 1,
        });
      }
      dernieresReponsesRecentes.set(question.notion_id, reponsesParQuestion);
    }

    for (const notionId of notionsReponduesDansSession) {
      const sessions = sessionsRecentesParNotion.get(notionId) ?? new Set<string>();
      sessions.add(resultat.id);
      sessionsRecentesParNotion.set(notionId, sessions);
    }
  }

  for (const [notionId, questionsVues] of questionsTotalesParNotion) {
    const mesure = activite.get(notionId);
    if (mesure) mesure.nombreQuestionsDistinctesTotal = questionsVues.size;
  }

  for (const [notionId, sessions] of sessionsRecentesParNotion) {
    const mesure = activite.get(notionId);
    if (mesure) mesure.nombreSessionsRecentes = sessions.size;
  }

  for (const [notionId, reponsesParQuestion] of dernieresReponsesRecentes) {
    const mesure = activite.get(notionId);
    if (!mesure) continue;

    mesure.nombreQuestionsDistinctesRecentes = reponsesParQuestion.size;
    let pointsObtenus = 0;
    let pointsPossibles = 0;
    for (const reponse of reponsesParQuestion.values()) {
      pointsObtenus += reponse.points * reponse.score;
      pointsPossibles += reponse.points;
    }
    if (pointsPossibles > 0) {
      mesure.scoreRecent = Math.round((pointsObtenus / pointsPossibles) * 100);
    }
  }

  return activite;
}

export function determinerEtatCouverture(activite: ActiviteNotion): "a-decouvrir" | "en-cours" | "maitrise" {
  if (activite.nombreQuestionsDistinctesTotal === 0) return "a-decouvrir";
  if (activite.nombreQuestionsDistinctesRecentes < 10 || activite.nombreSessionsRecentes < 2 || (activite.scoreRecent ?? 0) < 70) return "en-cours";
  return "maitrise";
}

export function determinerFiabilite(activite: ActiviteNotion): string {
  if (activite.nombreQuestionsDistinctesRecentes >= 10 && activite.nombreSessionsRecentes >= 2) return "élevée";
  if (activite.nombreQuestionsDistinctesRecentes >= 5 && activite.nombreSessionsRecentes >= 2) return "moyenne";
  if (activite.nombreQuestionsDistinctesRecentes > 0) return "limitée";
  return "À actualiser";
}