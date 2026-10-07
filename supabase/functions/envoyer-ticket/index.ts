import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const emailDestination = "notio.service@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requeteSchema = z.object({
  nom: z.string().min(1).max(100),
  email: z.string().email(),
  sujet: z.enum(["probleme", "commentaire", "question", "autre"]),
  message: z.string().min(10).max(3000),
  site_web: z.string().max(0).optional().default(""),
});

const LABELS_SUJET: Record<string, string> = {
  probleme: "Signalement d'un problème",
  commentaire: "Commentaire",
  question: "Question",
  autre: "Autre",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const parsed = requeteSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Formulaire invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.data.site_web) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const ilYA10Minutes = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("email", parsed.data.email)
      .gte("created_at", ilYA10Minutes);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Trop de messages envoyés récemment. Réessaie dans quelques minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await supabaseAuth.auth.getUser();
      userId = userData.user?.id ?? null;
    }

    const { data: ticket, error: erreurInsertion } = await supabaseAdmin
      .from("tickets")
      .insert({
        nom: parsed.data.nom,
        email: parsed.data.email,
        sujet: parsed.data.sujet,
        message: parsed.data.message,
        user_id: userId,
      })
      .select("id")
      .single();
    if (erreurInsertion) throw erreurInsertion;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Notio <onboarding@resend.dev>",
          to: [emailDestination],
          reply_to: parsed.data.email,
          subject: `[Notio] ${LABELS_SUJET[parsed.data.sujet]} — ${parsed.data.nom}`,
          text: `Nouveau ticket #${ticket.id}\n\nDe : ${parsed.data.nom} (${parsed.data.email})\nSujet : ${LABELS_SUJET[parsed.data.sujet]}\n\n${parsed.data.message}`,
        }),
      });
    } catch (erreurEmail) {
      console.error("Échec de l'envoi de l'email de notification:", erreurEmail);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erreur envoyer-ticket:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});