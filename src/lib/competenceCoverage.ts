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
  created_at: string | null;
  reponses_json: unknown;
}

export interface ActiviteNotion {
  nombreReponsesTotal: number;
  nombreReponsesRecentes: number;
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
      nombreReponsesTotal: 0,
      nombreReponsesRecentes: 0,
      derniereReponse: null,
      scoreRecent: null,
    }]),
  );
  const questionsParId = new Map(questions.map((question) => [question.id, question]));
  const dateLimite = maintenant.getTime() - fenetreJours * 24 * 60 * 60 * 1000;
  const pointsRecents = new Map<string, { obtenus: number; maximum: number }>();

  for (const resultat of resultats) {
    if (!resultat.created_at) continue;
    const dateResultat = new Date(resultat.created_at);
    if (Number.isNaN(dateResultat.getTime()) || dateResultat > maintenant) continue;

    for (const reponse of extraireReponses(resultat)) {
      const question = questionsParId.get(reponse.question_id);
      const mesure = question ? activite.get(question.notion_id) : null;
      if (!question || !mesure) continue;

      mesure.nombreReponsesTotal += 1;
      if (!mesure.derniereReponse || dateResultat.toISOString() > mesure.derniereReponse) {
        mesure.derniereReponse = dateResultat.toISOString();
      }

      if (dateResultat.getTime() < dateLimite) continue;

      mesure.nombreReponsesRecentes += 1;
      const score = scoreReponse(question, reponse);
      const points = question.points > 0 ? question.points : 1;
      const cumul = pointsRecents.get(question.notion_id) ?? { obtenus: 0, maximum: 0 };
      cumul.obtenus += points * score;
      cumul.maximum += points;
      pointsRecents.set(question.notion_id, cumul);
    }
  }

  for (const [notionId, cumul] of pointsRecents) {
    const mesure = activite.get(notionId);
    if (mesure && cumul.maximum > 0) {
      mesure.scoreRecent = Math.round((cumul.obtenus / cumul.maximum) * 100);
    }
  }

  return activite;
}

export function determinerEtatCouverture(activite: ActiviteNotion): "a-decouvrir" | "en-cours" | "maitrise" {
  if (activite.nombreReponsesTotal === 0) return "a-decouvrir";
  if (activite.nombreReponsesRecentes < 10 || (activite.scoreRecent ?? 0) < 70) return "en-cours";
  return "maitrise";
}

export function determinerFiabilite(activite: ActiviteNotion): string {
  if (activite.nombreReponsesRecentes >= 10) return "élevée";
  if (activite.nombreReponsesRecentes >= 5) return "moyenne";
  if (activite.nombreReponsesRecentes > 0) return "limitée";
  return "À actualiser";
}