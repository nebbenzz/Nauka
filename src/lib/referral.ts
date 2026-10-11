import { supabase } from "./supabaseClient";

const CODE_STORAGE_KEY = "nauka-referral-code";
const NOTICE_STORAGE_KEY = "nauka-referral-notice";
const ANCIENNE_CODE_STORAGE_KEY = "notio-referral-code";
const ANCIENNE_NOTICE_STORAGE_KEY = "notio-referral-notice";

export function obtenirCodeParrainageMemorise(): string | null {
  const code = window.localStorage.getItem(CODE_STORAGE_KEY);
  if (code !== null) return code;

  const ancienCode = window.localStorage.getItem(ANCIENNE_CODE_STORAGE_KEY);
  if (ancienCode !== null) {
    window.localStorage.setItem(CODE_STORAGE_KEY, ancienCode);
    window.localStorage.removeItem(ANCIENNE_CODE_STORAGE_KEY);
  }
  return ancienCode;
}

export function signalerErreurParrainage(message: string) {
  try {
    window.sessionStorage.setItem(NOTICE_STORAGE_KEY, message);
  } catch {
    // La notification reste visible dans la session courante.
  }
  window.dispatchEvent(new Event("nauka:referral-notice"));
}

export function consommerMessageParrainage(): string | null {
  try {
    const message = window.sessionStorage.getItem(NOTICE_STORAGE_KEY)
      ?? window.sessionStorage.getItem(ANCIENNE_NOTICE_STORAGE_KEY);
    window.sessionStorage.removeItem(NOTICE_STORAGE_KEY);
    window.sessionStorage.removeItem(ANCIENNE_NOTICE_STORAGE_KEY);
    return message;
  } catch {
    return null;
  }
}

export function enregistrerCodeParrainage(code: string) {
  const codeNormalise = code.trim().toUpperCase();
  if (codeNormalise) {
    window.localStorage.setItem(CODE_STORAGE_KEY, codeNormalise);
    window.localStorage.removeItem(ANCIENNE_CODE_STORAGE_KEY);
  }
}

export function enregistrerCodeParrainageDepuisUrl() {
  const code = new URLSearchParams(window.location.search).get("parrain");
  if (code) enregistrerCodeParrainage(code);
}

async function obtenirErreurFonction(error: unknown, fallback: string): Promise<string> {
  if (typeof error === "object" && error !== null && "context" in error && error.context instanceof Response) {
    const detail = await error.context.clone().json().catch(() => null);
    if (typeof detail?.error === "string") return detail.error;
  }
  return error instanceof Error ? error.message : fallback;
}

async function retenterRecompenseSiQuestionnaireTermine(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data: resultat, error: erreurResultat } = await supabase
    .from("resultats")
    .select("quiz_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erreurResultat) return "Impossible de vérifier la récompense de parrainage pour le moment.";
  if (!resultat?.quiz_id) return null;

  const { error } = await supabase.functions.invoke("register-referral", {
    body: { action: "reward", quiz_id: resultat.quiz_id },
  });
  return error ? "La récompense sera réessayée lors de ta prochaine connexion." : null;
}

export async function enregistrerParrainageEnAttente(): Promise<string | null> {
  const code = obtenirCodeParrainageMemorise();
  let erreurParrainage: string | null = null;

  if (code) {
    const { data, error } = await supabase.functions.invoke("register-referral", { body: { action: "register", code } });
    if (!error && !data?.error) {
      if (obtenirCodeParrainageMemorise() === code) window.localStorage.removeItem(CODE_STORAGE_KEY);
    } else {
      erreurParrainage = error
        ? await obtenirErreurFonction(error, "Impossible d'enregistrer le parrainage pour le moment.")
        : data?.error ?? "Impossible d'enregistrer le parrainage pour le moment.";
      if (/(code de parrainage invalide|un autre code de parrainage est déjà associé)/i.test(erreurParrainage ?? "")) {
        if (obtenirCodeParrainageMemorise() === code) window.localStorage.removeItem(CODE_STORAGE_KEY);
      }
    }
  }

  const erreurRecompense = await retenterRecompenseSiQuestionnaireTermine();
  return erreurParrainage ?? erreurRecompense;
}

export async function recompenserParrainage(quizId: string) {
  await supabase.functions.invoke("register-referral", { body: { action: "reward", quiz_id: quizId } });
}

export async function obtenirCodeParrainage(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("register-referral", { body: { action: "get-code" } });
  return error ? null : data?.code ?? null;
}
