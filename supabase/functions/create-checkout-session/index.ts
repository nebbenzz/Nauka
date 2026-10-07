import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const siteUrl = Deno.env.get("SITE_URL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requeteSchema = z.object({
  price_id: z.string().min(1),
  intervalle: z.enum(["mensuel", "annuel"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = requeteSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Requête invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profil } = await supabaseAdmin
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", userData.user.id)
      .single();

    let stripeCustomerId = profil?.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const paramsCustomer = new URLSearchParams();
      paramsCustomer.set("email", profil?.email ?? userData.user.email ?? "");
      paramsCustomer.set("metadata[user_id]", userData.user.id);

      const reponseCustomer = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: paramsCustomer,
      });
      const customer = await reponseCustomer.json();
      if (customer.error) throw new Error(customer.error.message);
      stripeCustomerId = customer.id;

      await supabaseAdmin.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", userData.user.id);
    }

    const paramsSession = new URLSearchParams();
    paramsSession.set("mode", "subscription");
    paramsSession.set("customer", stripeCustomerId!);
    paramsSession.set("client_reference_id", userData.user.id);
    paramsSession.set("line_items[0][price]", parsed.data.price_id);
    paramsSession.set("line_items[0][quantity]", "1");
    paramsSession.set("success_url", `${siteUrl}/paiement-recapitulatif?statut=succes`);
    paramsSession.set("cancel_url", `${siteUrl}/abonnements?statut=annule`);
    paramsSession.set("metadata[user_id]", userData.user.id);
    paramsSession.set("metadata[intervalle]", parsed.data.intervalle);

    const reponseSession = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: paramsSession,
    });
    const session = await reponseSession.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erreur create-checkout-session:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});