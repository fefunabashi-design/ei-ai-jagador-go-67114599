import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authenticated caller — this endpoint exposes PII.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const { cpf } = await req.json();
    const onlyDigits = String(cpf || "").replace(/\D/g, "");
    if (onlyDigits.length !== 11) {
      return new Response(JSON.stringify({ error: "invalid_cpf" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Only callers who own at least one team may use this lookup (it's used
    // to prefill the "add player" form on the team management screen).
    const { data: ownedTeams, error: ownedErr } = await admin
      .from("teams")
      .select("id")
      .eq("owner_id", callerId)
      .limit(1);
    if (ownedErr || !ownedTeams?.length) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return only the minimum fields the caller needs to link a player record.
    // PII (email, phone, birth_date) is intentionally NOT returned — those
    // fields are populated from the linked user's own profile after linking.
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, display_name, last_name, nickname")
      .eq("cpf", onlyDigits)
      .maybeSingle();

    if (!profile?.user_id) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        found: true,
        user_id: profile.user_id,
        profile: {
          display_name: profile.display_name,
          last_name: profile.last_name,
          nickname: profile.nickname,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
