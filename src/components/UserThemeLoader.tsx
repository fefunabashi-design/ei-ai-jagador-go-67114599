import { useEffect, useRef } from "react";
import { useAuthContext } from "@/App";
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

const loadForUser = async (userId: string | null) => {
  if (!userId) { applyPrimaryColor(null); return; }
  const result = await withTimeout(
    supabase
      .from("profiles")
      .select("primary_color")
      .eq("user_id", userId)
      .maybeSingle()
  ).catch(() => null);
  const data = result?.data;
  applyPrimaryColor((data as any)?.primary_color ?? null);
};

const UserThemeLoader = () => {
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;
  const lastLoadedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastLoadedRef.current === userId) return;
    lastLoadedRef.current = userId;
    void loadForUser(userId);
  }, [userId]);

  useEffect(() => {
    const onChange = () => { void loadForUser(userId); };
    window.addEventListener("supabase-data-change", onChange);
    return () => window.removeEventListener("supabase-data-change", onChange);
  }, [userId]);

  return null;
};

export default UserThemeLoader;
