import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function verifierQuestionsEnRevision(
  supabaseAdmin: SupabaseClient,
  userId: string,
  quizId: string,
  questionIds: string[],
) {
  const idsUniques = Array.from(new Set(questionIds));
  if (idsUniques.length === 0 || idsUniques.length > 5 || idsUniques.length !== questionIds.length) return false;

  const { data, error } = await supabaseAdmin
    .from("questions_a_revoir")
    .select("question_id")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .in("question_id", idsUniques);
  if (error) throw error;

  return (data || []).length === idsUniques.length;
}

export async function actualiserQuestionsARevoir(
  supabaseAdmin: SupabaseClient,
  userId: string,
  quizId: string,
  questionsIncorrectes: string[],
  questionsCorrectes: string[],
  estRevision: boolean,
) {
  const questionsAReplanifier = estRevision
    ? Array.from(new Set([...questionsIncorrectes, ...questionsCorrectes]))
    : questionsIncorrectes;

  if (questionsAReplanifier.length > 0) {
    const { data: existantes, error: erreurLecture } = await supabaseAdmin
      .from("questions_a_revoir")
      .select("question_id, repetitions")
      .eq("user_id", userId)
      .in("question_id", questionsAReplanifier);
    if (erreurLecture) throw erreurLecture;

    const repetitionsParQuestion = new Map(
      (existantes || []).map((question: { question_id: string; repetitions: number }) => [question.question_id, question.repetitions]),
    );
    const maintenant = Date.now();
    const lignes = questionsAReplanifier.map((questionId) => {
      const repetitionExistante = repetitionsParQuestion.get(questionId);
      const estRatee = questionsIncorrectes.includes(questionId);
      const repetitions = estRevision && !estRatee && repetitionExistante !== undefined
        ? repetitionExistante + 1
        : 0;
      const delaiJours = repetitions === 0 ? 2 : Math.min(30, 2 ** (repetitions + 1));
      return {
        user_id: userId,
        question_id: questionId,
        quiz_id: quizId,
        repetitions: repetitions === undefined ? 0 : repetitions + 1,
        a_revoir_le: new Date(maintenant + delaiJours * 86400000).toISOString(),
        updated_at: new Date(maintenant).toISOString(),
      };
    });

    const { error: erreurEnregistrement } = await supabaseAdmin
      .from("questions_a_revoir")
      .upsert(lignes, { onConflict: "user_id,question_id" });
    if (erreurEnregistrement) throw erreurEnregistrement;
  }

  if (!estRevision && questionsCorrectes.length > 0) {
    const { error: erreurSuppression } = await supabaseAdmin
      .from("questions_a_revoir")
      .delete()
      .eq("user_id", userId)
      .in("question_id", questionsCorrectes);
    if (erreurSuppression) throw erreurSuppression;
  }
}
