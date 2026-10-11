import { supabase } from "./supabaseClient";

export const EMAIL_PRO_MEMORISE_KEY = "nauka-pro-waitlist-email";
const ANCIENNE_CLE_EMAIL_PRO_MEMORISE = "notio-pro-waitlist-email";

export function obtenirEmailProMemorise(): string {
  const email = window.localStorage.getItem(EMAIL_PRO_MEMORISE_KEY);
  if (email !== null) return email;

  const ancienEmail = window.localStorage.getItem(ANCIENNE_CLE_EMAIL_PRO_MEMORISE);
  if (ancienEmail !== null) {
    window.localStorage.setItem(EMAIL_PRO_MEMORISE_KEY, ancienEmail);
    window.localStorage.removeItem(ANCIENNE_CLE_EMAIL_PRO_MEMORISE);
  }
  return ancienEmail ?? "";
}

export function memoriserEmailPro(email: string) {
  window.localStorage.setItem(EMAIL_PRO_MEMORISE_KEY, email.trim().toLowerCase());
  window.localStorage.removeItem(ANCIENNE_CLE_EMAIL_PRO_MEMORISE);
}

export async function estInscritListePro(email: string): Promise<boolean> {
  const emailNormalise = email.trim().toLowerCase();
  if (!emailNormalise) return false;

  const { data, error } = await supabase.rpc("est_inscrit_pro_waitlist", {
    p_email: emailNormalise,
  });
  return !error && data === true;
}
