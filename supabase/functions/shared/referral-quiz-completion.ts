import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function enregistrerCompletionQuizParrainage(
  supabaseAdmin: SupabaseClient,
  userId: string,
  quizId: string,
  resultatId: string,
) {
  const { data: parrainage, error: erreurParrainage } = await supabaseAdmin
    .from("referrals")
    .select("id")
    .eq("referred_id", userId)
    .is("rewarded_at", null)
    .maybeSingle();
  if (erreurParrainage) throw erreurParrainage;
  if (!parrainage) return;

  const { error } = await supabaseAdmin.from("referral_quiz_completions").insert({
    user_id: userId,
    quiz_id: quizId,
    result_id: resultatId,
  });
  if (error) throw error;
}
