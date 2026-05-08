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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: me } = await admin.from("profiles").select("is_super_admin").eq("user_id", user.id).maybeSingle();
    if (!me?.is_super_admin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { payment_id, action, notes } = await req.json();
    if (!payment_id || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: payment, error: pErr } = await admin.from("admin_subscriptions").select("*").eq("id", payment_id).single();
    if (pErr || !payment) throw pErr || new Error("Pagamento não encontrado");
    if (payment.status !== "pending") throw new Error("Pagamento já revisado");

    const now = new Date();

    if (action === "reject") {
      await admin.from("admin_subscriptions").update({
        status: "rejected", reviewed_at: now.toISOString(), reviewed_by: user.id, notes,
      }).eq("id", payment_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // approve: extend by 30 days from max(now, current expires)
    const { data: targetProfile } = await admin.from("profiles").select("subscription_expires_at").eq("user_id", payment.user_id).maybeSingle();
    const current = targetProfile?.subscription_expires_at ? new Date(targetProfile.subscription_expires_at) : now;
    const base = current > now ? current : now;
    const newExpires = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await admin.from("admin_subscriptions").update({
      status: "approved",
      reviewed_at: now.toISOString(),
      reviewed_by: user.id,
      period_start: base.toISOString(),
      period_end: newExpires.toISOString(),
      notes,
    }).eq("id", payment_id);

    await admin.from("profiles").update({
      subscription_status: "active",
      subscription_expires_at: newExpires.toISOString(),
    }).eq("user_id", payment.user_id);

    return new Response(JSON.stringify({ ok: true, expires_at: newExpires.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
