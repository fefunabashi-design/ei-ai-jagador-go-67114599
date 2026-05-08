import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await admin.from("profiles").select("subscription_status, trial_started_at").eq("user_id", user.id).maybeSingle();

    if (profile?.trial_started_at) {
      return new Response(JSON.stringify({ error: "Trial já foi iniciado anteriormente. Para continuar, é necessário pagar a mensalidade." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Antifraude: bloqueia trial se o e-mail (ou nome de time informado) já apareceu em algum cadastro anterior
    const body = await req.json().catch(() => ({}));
    const teamName: string | undefined = body?.team_name;

    const { data: blocked } = await admin.rpc("is_trial_blocked", {
      _email: user.email ?? "",
      _team_name: teamName ?? null,
    });

    if (blocked === true) {
      return new Response(JSON.stringify({
        error: "Este e-mail ou time já utilizou o período de teste anteriormente. Para acessar o Admin, é necessário pagar a mensalidade de R$ 29,90.",
        code: "TRIAL_BLOCKED",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await admin
      .from("profiles")
      .update({
        trial_started_at: now.toISOString(),
        subscription_status: "trialing",
        subscription_expires_at: expires.toISOString(),
      })
      .eq("user_id", user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, expires_at: expires.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
