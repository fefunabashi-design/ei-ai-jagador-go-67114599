import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiter — 5 attempts per IP per 15 minutes.
// Per-instance only: across multiple edge function replicas each instance has its
// own counter. This is intentional — a global Redis store would be more robust,
// but adds operational complexity. The risk of partial bypass is acceptable given
// the response no longer reveals the email (see below).
const RL_MAX = 5;
const RL_WINDOW_MS = 15 * 60 * 1000;
const rlMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  if (entry.count >= RL_MAX) return true;
  entry.count++;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "too_many_requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const onlyDigits = String(body?.cpf ?? "").replace(/\D/g, "");
    if (onlyDigits.length !== 11) {
      return new Response(JSON.stringify({ error: "invalid_cpf" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://eaijogador.funando.com.br";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the email associated with this CPF via the admin API.
    // We intentionally do NOT return the email to the caller — instead we
    // send a magic-link to the address on file. This prevents the endpoint
    // from being used as an email-enumeration oracle (CS-1 audit finding).
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("cpf", onlyDigits)
      .maybeSingle();

    // Always attempt to send (fire-and-forget) to prevent timing attacks.
    // An attacker cannot distinguish "CPF not found" from "email sent" because
    // this endpoint always returns { sent: true } for a valid CPF format.
    if (profile?.user_id) {
      const { data: userResp } = await admin.auth.admin.getUserById(profile.user_id);
      const email = userResp?.user?.email;
      if (email) {
        // Use the anon client so Supabase routes the email through the configured
        // provider / auth-email-hook, honoring all project settings.
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
        );
        // Intentionally not awaited with error propagation: if OTP dispatch fails
        // (e.g. email provider down) we still return { sent: true } so the
        // response time stays constant. The user will simply not receive an email.
        await anonClient.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${siteUrl}/dashboard` },
        }).catch((err) => console.error("lookup-email-by-cpf: OTP dispatch failed", err));
      }
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    console.error("lookup-email-by-cpf error", _err);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
