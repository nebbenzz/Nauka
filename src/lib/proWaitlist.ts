import { supabase } from "./supabaseClient";

export const EMAIL_PRO_MEMORISE_KEY = "notio-pro-waitlist-email";

export function obtenirEmailProMemorise(): string {
  return window.localStorage.getItem(EMAIL_PRO_MEMORISE_KEY) ?? "";
}

export function memoriserEmailPro(email: string) {
  window.localStorage.setItem(EMAIL_PRO_MEMORISE_KEY, email.trim().toLowerCase());
}

export async function estInscritListePro(email: string): Promise<boolean> {
  const emailNormalise = email.trim().toLowerCase();
  if (!emailNormalise) return false;

  const { data, error } = await supabase.rpc("est_inscrit_pro_waitlist", {
    p_email: emailNormalise,
  });
  return !error && data === true;
}
