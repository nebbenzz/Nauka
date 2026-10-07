import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

async function verifierSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const buffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const hex = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  try {
    const signatureHeader = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    if (!signatureHeader || !(await verifierSignature(rawBody, signatureHeader, webhookSecret))) {
      return new Response(JSON.stringify({ error: "Signature invalide" }), { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.user_id;
      const intervalle = session.metadata?.intervalle ?? null;
      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: "pro",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            abonnement_intervalle: intervalle,
            generations_ia_ce_mois: 0,
            generations_ia_reset_mois: new Date().toISOString().slice(0, 10),
          })
          .eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const estActif = ["active", "trialing"].includes(subscription.status);
      const updateData: Record<string, unknown> = { plan: estActif ? "pro" : "decouverte" };
      if (!estActif) updateData.abonnement_intervalle = null;
      await supabaseAdmin.from("profiles").update(updateData).eq("stripe_customer_id", subscription.customer);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error("Erreur stripe-webhook:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erreur inconnue" }), { status: 500 });
  }
});