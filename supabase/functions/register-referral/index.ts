import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const payloadSchema = z.object({ action: z.enum(["get-code", "register", "reward"]), code: z.string().trim().min(4).max(32).optional(), quiz_id: z.string().uuid().optional() });

async function genererCodeUnique(admin: ReturnType<typeof createClient>): Promise<string> {
  for (let tentative = 0; tentative < 5; tentative += 1) {
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const { data: existant, error } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (error) throw error;
    if (!existant) return code;
  }
  throw new Error("Impossible de générer un code de parrainage unique");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non authentifié");
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData.user) throw new Error("Token invalide");

    const parsed = payloadSchema.safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (parsed.data.action === "get-code") {
      const { data: profile, error: profileError } = await admin.from("profiles").select("referral_code").eq("id", userData.user.id).single();
      if (profileError) throw profileError;
      if (profile.referral_code) return new Response(JSON.stringify({ code: profile.referral_code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const code = await genererCodeUnique(admin);
      const { error: updateError } = await admin.from("profiles").update({ referral_code: code }).eq("id", userData.user.id);
      if (updateError) throw updateError;
      return new Response(JSON.stringify({ code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (parsed.data.action === "reward") {
      if (!parsed.data.quiz_id) throw new Error("Questionnaire manquant");
      const { data: rewarded, error: rewardError } = await supabaseAuth.rpc("recompenser_parrainage", {
        p_referred_id: userData.user.id,
        p_quiz_id: parsed.data.quiz_id,
      });
      if (rewardError) throw rewardError;
      return new Response(JSON.stringify({ rewarded: Boolean(rewarded) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const code = parsed.data.code?.toUpperCase();
    if (!code) throw new Error("Code de parrainage manquant");
    const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!referrer || referrer.id === userData.user.id) throw new Error("Code de parrainage invalide");
    const { error } = await admin.from("referrals").insert({ referrer_id: referrer.id, referred_id: userData.user.id, code });
    if (error && error.code !== "23505") throw error;
    return new Response(JSON.stringify({ registered: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : JSON.stringify(error);
    console.error("Erreur register-referral:", error);
    return new Response(JSON.stringify({ error: message || "Erreur inattendue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
