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
    const { cpf } = await req.json();
    const onlyDigits = String(cpf || "").replace(/\D/g, "");
    if (onlyDigits.length !== 11) {
      return new Response(JSON.stringify({ error: "invalid_cpf" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("cpf", onlyDigits)
      .maybeSingle();

    if (!profile?.user_id) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userResp } = await admin.auth.admin.getUserById(profile.user_id);
    const email = userResp?.user?.email || null;

    return new Response(
      JSON.stringify({ found: true, user_id: profile.user_id, email, profile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
