import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminAccess = {
  loading: boolean;
  hasAccess: boolean;
  status: "none" | "trialing" | "active" | "expired";
  expiresAt: Date | null;
  daysLeft: number;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
};

export const useAdminAccess = (): AdminAccess => {
  const [state, setState] = useState<Omit<AdminAccess, "refresh">>({
    loading: true,
    hasAccess: false,
    status: "none",
    expiresAt: null,
    daysLeft: 0,
    isSuperAdmin: false,
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, hasAccess: false, status: "none", expiresAt: null, daysLeft: 0, isSuperAdmin: false });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_expires_at, is_super_admin")
      .eq("user_id", user.id)
      .maybeSingle();

    const expiresAt = data?.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
    const now = new Date();
    let status: AdminAccess["status"] = (data?.subscription_status as any) || "none";
    if ((status === "trialing" || status === "active") && expiresAt && expiresAt < now) status = "expired";
    const hasAccess = status === "trialing" || status === "active";
    const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000)) : 0;

    setState({ loading: false, hasAccess, status, expiresAt, daysLeft, isSuperAdmin: !!data?.is_super_admin });
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load();
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  return { ...state, refresh: load };
};
