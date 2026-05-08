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

    // Find user by email via admin API
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = list?.users?.find((u) => (u.email || "").toLowerCase() === normalized);
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
    return new Response(JSON.stringify({ exists: true, deactivated }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ exists: false, deactivated: false, error: String(e) }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
      status: 200,
    });
  }
});
