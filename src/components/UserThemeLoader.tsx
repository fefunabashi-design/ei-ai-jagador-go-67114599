import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyPrimaryColor } from "@/lib/applyPrimaryColor";

const THEME_LOAD_TIMEOUT_MS = 4000;

const withTimeout = <T,>(promise: PromiseLike<T>): Promise<T | null> => {
  let timeoutId: number | undefined;
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => {
      timeoutId = window.setTimeout(() => resolve(null), THEME_LOAD_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
};

const load = async () => {
  const sessionResult = await withTimeout(supabase.auth.getSession()).catch(() => null);
  const session = sessionResult?.data.session;
  if (!session) { applyPrimaryColor(null); return; }
  const result = await withTimeout(
    supabase
      .from("profiles")
      .select("primary_color")
      .eq("user_id", session.user.id)
      .maybeSingle()
  ).catch(() => null);
  const data = result?.data;
  applyPrimaryColor((data as any)?.primary_color ?? null);
};

const UserThemeLoader = () => {
  useEffect(() => {
    let alive = true;
    const timers = new Set<number>();
    const scheduleLoad = () => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (alive) void load();
      }, 0);
      timers.add(timer);
    };

    scheduleLoad();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => scheduleLoad());
    const onChange = () => scheduleLoad();
    window.addEventListener("supabase-data-change", onChange);
    return () => {
      alive = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
      window.removeEventListener("supabase-data-change", onChange);
    };
  }, []);
  return null;
};

export default UserThemeLoader;
