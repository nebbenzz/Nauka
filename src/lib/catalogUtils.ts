export interface NiveauQuizLike {
  type?: string | null;
  notion_niveau?: number | null;
  est_avance?: boolean | null;
}

export function estQuizCompatibleAvecNiveau(quiz: NiveauQuizLike, niveauUtilisateur: number | null): boolean {
  if (niveauUtilisateur === null || niveauUtilisateur <= 0) return false;

  if (typeof quiz.notion_niveau === "number") {
    return quiz.notion_niveau <= niveauUtilisateur;
  }

  if (quiz.type === "global") return true;

  if (quiz.type === "notion") return false;

  return false;
}

export function formatNiveauQuiz(quiz: NiveauQuizLike): string {
  if (quiz.type === "notion" && typeof quiz.notion_niveau === "number" && quiz.notion_niveau > 0) {
    return `niv. ${quiz.notion_niveau}`;
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
