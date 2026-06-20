import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
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
    // Note: we intentionally do NOT delete the auth user here. This endpoint is
    // unauthenticated (used in the pre-auth flow), so any destructive side
    // effect would let attackers permanently remove accounts by guessing emails.
    // Cleanup of deactivated accounts must happen via an authenticated/admin path.
    if (deactivated) {
      return new Response(JSON.stringify({ exists: false, deactivated: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ exists: true, deactivated: false }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ exists: false, deactivated: false, error: String(e) }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
      status: 200,
    });
  }
});
