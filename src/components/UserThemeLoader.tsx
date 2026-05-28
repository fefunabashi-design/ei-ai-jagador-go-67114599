import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyPrimaryColor } from "@/lib/applyPrimaryColor";

const load = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { applyPrimaryColor(null); return; }
  const { data } = await supabase
    .from("profiles")
    .select("primary_color")
    .eq("user_id", session.user.id)
    .maybeSingle();
  applyPrimaryColor((data as any)?.primary_color ?? null);
};

const UserThemeLoader = () => {
  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    const onChange = () => load();
    window.addEventListener("supabase-data-change", onChange);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("supabase-data-change", onChange);
    };
  }, []);
  return null;
};

export default UserThemeLoader;
