import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TEMPORARY test-only function. Creates 3 fake auth.users for exercising the
// CPF-linking triggers in isolation. Protected by a shared secret header
// (not JWT) since it must be callable without a logged-in session.
// Remove this function (and the CPF_TEST_SECRET) once testing is done.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-test-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("CPF_TEST_SECRET");
    const providedSecret = req.headers.get("x-test-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const timestamp = Date.now();
    const created: Array<{ id: string; email: string }> = [];

    for (let n = 1; n <= 3; n++) {
      const email = `cpf-trigger-test-${n}-${timestamp}@example.invalid`;
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Fake CPF Trigger Test ${n}` },
      });
      if (error || !data?.user) {
        return new Response(
          JSON.stringify({ error: "create_failed", detail: error?.message, step: n }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      created.push({ id: data.user.id, email });
    }

    return new Response(JSON.stringify({ users: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
