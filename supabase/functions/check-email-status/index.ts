import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security trade-off (CS-2 audit finding):
// This endpoint intentionally operates without authentication because it is called
// during the pre-auth signup flow — the user has no session yet. The risk of
// user-enumeration is accepted and mitigated by:
//   1. Rate limiting (5 requests / 15 min per IP, per-instance).
//   2. The response distinguishes only "exists / deactivated", not the user id.
//   3. The endpoint is not usable for credential stuffing — it returns no secrets.
// A fully anonymous "does this email exist?" endpoint is a common pattern in auth
// UX (e.g., Google, GitHub). The rate limit is the primary countermeasure.

// In-memory rate limiter — 5 attempts per IP per 15 minutes.
// Per-instance: partial bypass is possible across edge replicas but the risk
// is low given the endpoint reveals no secrets.
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "too_many_requests" }), {
      status: 429,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ exists: false, deactivated: false }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const normalized = email.trim().toLowerCase();

    // Find user by email via admin API. Paginate so older projects with more users
    // don't miss accounts beyond the first page.
    let user = null;
    for (let page = 1; page <= 20 && !user; page++) {
      const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (listError) throw listError;
      user = list?.users?.find((u) => (u.email || "").toLowerCase() === normalized) ?? null;
      if (!list?.users?.length || list.users.length < 100) break;
    }
    if (!user) {
      return new Response(JSON.stringify({ exists: false, deactivated: false }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    const deactivated = profile ? profile.is_active === false : false;
    if (deactivated) {
      return new Response(JSON.stringify({ exists: false, deactivated: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ exists: true, deactivated: false }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    // B-1 fix: return 500 so callers can distinguish server failures from
    // a valid "does not exist" response (previously this returned 200).
    console.error("check-email-status error", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
      status: 500,
    });
  }
});
