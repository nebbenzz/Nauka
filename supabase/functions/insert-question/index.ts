import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reponseSchema = z.object({
  texte: z.string().min(1),
  est_correcte: z.boolean(),
  ordre: z.number().int().default(0),
});

const questionSchema = z.object({
  notion_id: z.string().uuid(),
  type: z.enum(["qcm", "qcu", "libre", "code", "dessin"]),
  intitule: z.string().min(3),
  difficulte: z.number().int().min(1).max(3).default(1),
  points: z.number().int().min(1).default(1),
  reponses: z.array(reponseSchema).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
    const parsed = questionSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: question, error: qError } = await supabaseAdmin
      .from("questions")
      .insert({
        notion_id: parsed.data.notion_id,
        type: parsed.data.type,
        intitule: parsed.data.intitule,
        difficulte: parsed.data.difficulte,
        points: parsed.data.points,
        source: "manuel",
        created_by: userData.user.id,
      })
      .select("id")
      .single();

    if (qError) throw qError;

    if (parsed.data.reponses?.length) {
      const rows = parsed.data.reponses.map((r) => ({ ...r, question_id: question.id }));
      const { error: rError } = await supabaseAdmin.from("reponses").insert(rows);
      if (rError) throw rError;
    }

    return new Response(JSON.stringify({ question_id: question.id }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});