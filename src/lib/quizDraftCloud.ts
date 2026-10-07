import { supabase } from "./supabaseClient";
import { normaliserQuizDraft, type QuizDraft } from "./quizDraft";

export async function lireQuizDraftDistant(quizId: string, userId: string): Promise<QuizDraft | null> {
  const { data, error } = await supabase
    .from("quiz_drafts")
    .select("payload")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return normaliserQuizDraft(data?.payload);
}

export async function sauvegarderQuizDraftDistant(
  quizId: string,
  userId: string,
  draft: QuizDraft,
): Promise<boolean> {
  const { error } = await supabase.from("quiz_drafts").upsert({
    user_id: userId,
    quiz_id: quizId,
    payload: draft,
    updated_at: draft.updatedAt,
  }, { onConflict: "user_id,quiz_id" });
  return !error;
}

export async function effacerQuizDraftDistant(quizId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("quiz_drafts")
    .delete()
    .eq("quiz_id", quizId)
    .eq("user_id", userId);
  return !error;
}