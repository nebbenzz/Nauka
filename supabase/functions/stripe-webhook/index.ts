import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const stripePriceMensuel = Deno.env.get("STRIPE_PRICE_MENSUEL");
const stripePriceAnnuel = Deno.env.get("STRIPE_PRICE_ANNUEL");

async function obtenirAbonnementStripe(subscriptionId: string) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  const abonnement = await response.json();
  if (!response.ok) {
    throw new Error(`Impossible de vérifier l'abonnement Stripe (${response.status}).`);
  }
  return abonnement;
}

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
      const userId = session.client_reference_id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      if (!userId || session.metadata?.user_id !== userId || !subscriptionId || session.mode !== "subscription") {
        throw new Error("La session Stripe ne contient pas de références d'abonnement valides.");
      }

      const abonnement = await obtenirAbonnementStripe(subscriptionId);
      const elements = abonnement.items?.data ?? [];
      if (elements.length !== 1 || abonnement.customer !== session.customer) {
        throw new Error("L'abonnement Stripe ne correspond pas à la session de paiement.");
      }

      const prix = elements[0].price;
      const intervalleStripe = prix?.recurring?.interval;
      const intervalle = prix?.id === stripePriceMensuel && intervalleStripe === "month"
        ? "mensuel"
        : prix?.id === stripePriceAnnuel && intervalleStripe === "year"
          ? "annuel"
          : null;
      if (!intervalle) {
        throw new Error("Le prix réel de l'abonnement ne correspond à aucun tarif Nauka configuré.");
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan: "pro",
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          abonnement_intervalle: intervalle,
          generations_ia_ce_mois: 0,
          generations_ia_reset_mois: new Date().toISOString().slice(0, 10),
        })
        .eq("id", userId);
      if (error) throw error;
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const estActif = ["active", "trialing"].includes(subscription.status);
      const { data: profil, error: erreurProfil } = await supabaseAdmin
        .from("profiles")
        .select("pro_expires_at")
        .eq("stripe_customer_id", subscription.customer)
        .maybeSingle();
      if (erreurProfil) throw erreurProfil;

      const bonusParrainageActif = Boolean(profil?.pro_expires_at && new Date(profil.pro_expires_at) > new Date());
      const proActif = estActif || bonusParrainageActif;
      const updateData: Record<string, unknown> = { plan: proActif ? "pro" : "decouverte" };
      if (estActif) {
        const intervalleStripe = subscription.items?.data?.[0]?.price?.recurring?.interval;
        if (intervalleStripe === "month") updateData.abonnement_intervalle = "mensuel";
        else if (intervalleStripe === "year") updateData.abonnement_intervalle = "annuel";
      } else {
        updateData.abonnement_intervalle = null;
      }
      if (!proActif) updateData.pro_expires_at = null;
      await supabaseAdmin.from("profiles").update(updateData).eq("stripe_customer_id", subscription.customer);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: unknown) {
    console.error("Erreur stripe-webhook:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }), { status: 500 });
  }
});