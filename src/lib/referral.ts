import { supabase } from "./supabaseClient";

const CODE_STORAGE_KEY = "notio-referral-code";

export function enregistrerCodeParrainage(code: string) {
  const codeNormalise = code.trim().toUpperCase();
  if (codeNormalise) window.localStorage.setItem(CODE_STORAGE_KEY, codeNormalise);
}

export function enregistrerCodeParrainageDepuisUrl() {
  const code = new URLSearchParams(window.location.search).get("parrain");
  if (code) enregistrerCodeParrainage(code);
}

export async function enregistrerParrainageEnAttente(): Promise<string | null> {
  const code = window.localStorage.getItem(CODE_STORAGE_KEY);
  if (!code) return null;
  window.localStorage.removeItem(CODE_STORAGE_KEY);
  const { data, error } = await supabase.functions.invoke("register-referral", { body: { action: "register", code } });
  if (error || data?.error) return data?.error ?? "Le code de parrainage est invalide.";
  return null;
}

export async function recompenserParrainage(quizId: string) {
  await supabase.functions.invoke("register-referral", { body: { action: "reward", quiz_id: quizId } });
}

export async function obtenirCodeParrainage(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("register-referral", { body: { action: "get-code" } });
  return error ? null : data?.code ?? null;
}
