import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { mockDb } from "@/lib/mockDb";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_TEAM_KEY = "active_team_id";

const emitChange = () => {
  window.dispatchEvent(new CustomEvent("supabase-data-change"));
  window.dispatchEvent(new CustomEvent("mock-db-change"));
};

const useSubscribe = (cb: () => void) => {
  useEffect(() => {
    cb();
    const h = () => cb();
    window.addEventListener("supabase-data-change", h);
    window.addEventListener("mock-db-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("supabase-data-change", h);
      window.removeEventListener("mock-db-change", h);
      window.removeEventListener("storage", h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

// =================== PROFILE ===================
export const useProfile = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const uid = await getUserId();
    if (!uid) { setData(null); setIsLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    setData({ ...(p || {}), user_id: uid, email: user?.email });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { sub.subscription.unsubscribe(); window.removeEventListener("supabase-data-change", h); };
  }, [load]);

  return { data, isLoading };
};

export const useUpdateProfile = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (updates: Record<string, unknown>) => {
    setIsPending(true);
    try {
      const uid = await getUserId();
      if (!uid) throw new Error("Não autenticado");
      const allowed: Record<string, unknown> = {};
      ["display_name","nickname","phone","birth_date","region","avatar_url","role","is_pro"].forEach(k => {
        if (k in updates) allowed[k] = (updates as any)[k];
      });
      if (Object.keys(allowed).length) {
        await supabase.from("profiles").update(allowed).eq("user_id", uid);
      }
      emitChange();
      toast({ title: "Perfil atualizado!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar perfil", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

export const useUploadAvatar = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (file: File) => {
    setIsPending(true);
    try {
      const uid = await getUserId();
      if (!uid) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", uid);
      emitChange();
      toast({ title: "Foto atualizada!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar foto", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

// =================== TEAMS ===================
export const useMyTeams = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useSubscribe(async () => {
    const uid = await getUserId();
    if (!uid) { setData([]); setIsLoading(false); return; }
    // teams owned
    const { data: owned = [] } = await supabase.from("teams").select("*").eq("owner_id", uid);
    // teams where user is a player
    const { data: playerLinks = [] } = await supabase.from("players").select("team_id").eq("user_id", uid);
    const playerTeamIds = (playerLinks || []).map((p: any) => p.team_id);
    let playerTeams: any[] = [];
    if (playerTeamIds.length) {
      const { data: pt = [] } = await supabase.from("teams").select("*").in("id", playerTeamIds);
      playerTeams = pt || [];
    }
    const map = new Map<string, any>();
    [...(owned || []), ...playerTeams].forEach(t => map.set(t.id, t));
    setData(Array.from(map.values()));
    setIsLoading(false);
  });

  return { data, isLoading };
};

export const useMyAdminTeams = () => {
  const [data, setData] = useState<any[]>([]);
  useSubscribe(async () => {
    const uid = await getUserId();
    if (!uid) { setData([]); return; }
    const { data: owned = [] } = await supabase.from("teams").select("*").eq("owner_id", uid);
    setData(owned || []);
  });
  return { data, isLoading: false };
};

export const useMyTeam = () => {
  const { data: teams = [], isLoading } = useMyTeams();
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_TEAM_KEY));

  useEffect(() => {
    const h = () => setActiveId(localStorage.getItem(ACTIVE_TEAM_KEY));
    window.addEventListener("storage", h);
    window.addEventListener("supabase-data-change", h);
    return () => { window.removeEventListener("storage", h); window.removeEventListener("supabase-data-change", h); };
  }, []);

  const active = teams.find((t: any) => t.id === activeId) || teams[0] || null;
  return { data: active, isLoading };
};

export const useSetActiveTeam = () => {
  return (teamId: string) => {
    localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
    emitChange();
  };
};

const cleanTeamPayload = (raw: Record<string, any>) => {
  const allowed = ["name","abbreviation","categoria","region","format","play_days","play_time_start","play_time_end",
    "field_name","field_address","foundation_date","war_cry","logo_url","instagram","phone","mobile","email",
    "president_name","president_email","admin_name","admin_email","admin_phone","coach_name","substitute_name",
    "founder_name","rating"];
  const out: Record<string, any> = {};
  allowed.forEach(k => { if (k in raw) out[k] = raw[k]; });
  return out;
};

export const useCreateTeam = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (data: Record<string, any>) => {
    setIsPending(true);
    try {
      const uid = await getUserId();
      if (!uid) throw new Error("Faça login para criar um time");
      const payload = { ...cleanTeamPayload(data), owner_id: uid, name: data.name };
      const { data: created, error } = await supabase.from("teams").insert(payload).select().single();
      if (error) throw error;
      localStorage.setItem(ACTIVE_TEAM_KEY, created.id);
      emitChange();
      toast({ title: "Time cadastrado com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao cadastrar time", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

export const useUpdateTeam = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (data: Record<string, any> & { id: string }) => {
    setIsPending(true);
    try {
      const { id, ...rest } = data;
      const { error } = await supabase.from("teams").update(cleanTeamPayload(rest)).eq("id", id);
      if (error) throw error;
      emitChange();
      toast({ title: "Dados do time atualizados!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar time", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

export const useDeleteTeam = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (id: string) => {
    setIsPending(true);
    try {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
      if (localStorage.getItem(ACTIVE_TEAM_KEY) === id) localStorage.removeItem(ACTIVE_TEAM_KEY);
      emitChange();
      toast({ title: "Time excluído com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao excluir time", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

export const useUploadTeamLogo = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async ({ teamId, file }: { teamId: string; file: File }) => {
    setIsPending(true);
    try {
      const uid = await getUserId();
      if (!uid) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${teamId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("team-logos").getPublicUrl(path);
      await supabase.from("teams").update({ logo_url: pub.publicUrl }).eq("id", teamId);
      emitChange();
      toast({ title: "Escudo atualizado!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar escudo", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

// =================== PLAYERS ===================
export const usePlayers = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!teamId) { setData([]); setIsLoading(false); return; }
      const { data: rows = [] } = await supabase.from("players").select("*").eq("team_id", teamId).order("created_at", { ascending: true });
      if (alive) { setData(rows || []); setIsLoading(false); }
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    window.addEventListener("mock-db-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); window.removeEventListener("mock-db-change", h); };
  }, [teamId]);

  return { data, isLoading };
};

const cleanPlayerPayload = (raw: Record<string, any>) => {
  const allowed = ["name","last_name","display_name","nickname","email","phone","position","jersey_number",
    "goals","matches","rating","birth_date","region","user_id","team_id"];
  const out: Record<string, any> = {};
  allowed.forEach(k => { if (k in raw) out[k] = raw[k]; });
  return out;
};

export const useCreatePlayer = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (data: Record<string, any>) => {
    setIsPending(true);
    try {
      if (!data.team_id) throw new Error("Selecione um time");
      const { error } = await supabase.from("players").insert(cleanPlayerPayload(data) as any);
      if (error) throw error;
      emitChange();
      toast({ title: "Jogador adicionado com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao adicionar jogador", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

export const useUpdatePlayer = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (data: Record<string, any> & { id: string }) => {
    setIsPending(true);
    try {
      const { id, ...rest } = data;
      const { error } = await supabase.from("players").update(cleanPlayerPayload(rest)).eq("id", id);
      if (error) throw error;
      emitChange();
      toast({ title: "Jogador atualizado com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar jogador", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

export const useDeletePlayer = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async ({ id }: { id: string; teamId?: string }) => {
    setIsPending(true);
    try {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
      emitChange();
      toast({ title: "Jogador removido com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao remover jogador", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending, isLoading: isPending };
};

// =================== MATCHES ===================
export const useMatches = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useSubscribe(async () => {
    const uid = await getUserId();
    if (!uid) { setData([]); setIsLoading(false); return; }
    // teams the user belongs to (owner or player)
    const { data: owned = [] } = await supabase.from("teams").select("id").eq("owner_id", uid);
    const { data: playerLinks = [] } = await supabase.from("players").select("team_id").eq("user_id", uid);
    const teamIds = Array.from(new Set([...(owned || []).map((t: any) => t.id), ...(playerLinks || []).map((p: any) => p.team_id)]));
    if (!teamIds.length) { setData([]); setIsLoading(false); return; }
    const { data: rows = [] } = await supabase
      .from("matches")
      .select("*")
      .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
      .order("match_date", { ascending: true });
    setData(rows || []);
    setIsLoading(false);
  });

  return { data, isLoading };
};

const cleanMatchPayload = (raw: Record<string, any>) => {
  const allowed = ["home_team_id","away_team_id","match_date","location","format","status","compatibility","home_score","away_score"];
  const out: Record<string, any> = {};
  allowed.forEach(k => { if (k in raw) out[k] = raw[k]; });
  return out;
};

export const useCreateMatch = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (data: Record<string, any>) => {
    setIsPending(true);
    try {
      if (!data.home_team_id) throw new Error("Selecione o time mandante");
      const { error } = await supabase.from("matches").insert(cleanMatchPayload(data) as any);
      if (error) throw error;
      emitChange();
      toast({ title: "Partida criada!" });
    } catch (e: any) {
      toast({ title: "Erro ao criar partida", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

export const useUpdateMatch = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (data: Record<string, any> & { id: string }) => {
    setIsPending(true);
    try {
      const { id, ...rest } = data;
      const { error } = await supabase.from("matches").update(cleanMatchPayload(rest)).eq("id", id);
      if (error) throw error;
      emitChange();
      toast({ title: "Partida atualizada!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar partida", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

export const useDeleteMatch = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (id: string) => {
    setIsPending(true);
    try {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
      emitChange();
      toast({ title: "Partida excluída!" });
    } catch (e: any) {
      toast({ title: "Erro ao excluir partida", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

export const useAcceptMatch = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (params: { matchId: string; awayTeamId: string }) => {
    setIsPending(true);
    try {
      const { error } = await supabase.from("matches")
        .update({ away_team_id: params.awayTeamId, status: "confirmed" })
        .eq("id", params.matchId);
      if (error) throw error;
      emitChange();
      toast({ title: "Match confirmado!", description: "Partida agendada na sua agenda." });
    } catch (e: any) {
      toast({ title: "Erro ao aceitar match", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

// =================== SUMMONS / LINEUPS ===================
export const useMatchSummons = (matchId?: string) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (matchId) {
        const { data: rows = [] } = await supabase.from("match_summons").select("*").eq("match_id", matchId);
        if (alive) { setData(rows || []); setIsLoading(false); }
      } else {
        // summons for the current user (across matches)
        const uid = await getUserId();
        if (!uid) { setData([]); setIsLoading(false); return; }
        const { data: links = [] } = await supabase.from("players").select("id").eq("user_id", uid);
        const ids = (links || []).map((p: any) => p.id);
        if (!ids.length) { setData([]); setIsLoading(false); return; }
        const { data: rows = [] } = await supabase.from("match_summons").select("*").in("player_id", ids);
        if (alive) { setData(rows || []); setIsLoading(false); }
      }
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    window.addEventListener("mock-db-change", h);

    // Realtime for live summons updates
    const ch = supabase.channel(`summons-${matchId || "me"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_summons" }, () => load())
      .subscribe();

    return () => {
      alive = false;
      window.removeEventListener("supabase-data-change", h);
      window.removeEventListener("mock-db-change", h);
      supabase.removeChannel(ch);
    };
  }, [matchId]);

  return { data, isLoading };
};

export const useCreateSummons = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  // payload: { matchId, playerId, status }
  const mutate = async (payload: { matchId: string; playerId: string; status: "pending" | "confirmed" | "declined" }) => {
    setIsPending(true);
    try {
      const { data: existing } = await supabase.from("match_summons")
        .select("id").eq("match_id", payload.matchId).eq("player_id", payload.playerId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("match_summons")
          .update({ status: payload.status, responded_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("match_summons")
          .insert({ match_id: payload.matchId, player_id: payload.playerId, status: payload.status });
        if (error) throw error;
      }
      emitChange();
    } catch (e: any) {
      toast({ title: "Erro ao confirmar presença", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

export const useMatchLineups = (matchId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!matchId) { setData([]); return; }
      const { data: rows = [] } = await supabase.from("match_lineups").select("*").eq("match_id", matchId);
      if (alive) setData(rows || []);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    const ch = supabase.channel(`lineups-${matchId || "x"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_lineups" }, () => load())
      .subscribe();
    return () => {
      alive = false;
      window.removeEventListener("supabase-data-change", h);
      supabase.removeChannel(ch);
    };
  }, [matchId]);
  return { data };
};

type LineupEntry = { match_id: string; player_id: string; position?: string };

export const useSaveLineup = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (lineupData: LineupEntry[]) => {
    setIsPending(true);
    try {
      if (!lineupData.length) { toast({ title: "Escalação vazia" }); return; }
      const matchId = lineupData[0].match_id;
      // wipe and re-insert
      await supabase.from("match_lineups").delete().eq("match_id", matchId);
      const rows = lineupData.map(l => ({ match_id: l.match_id, player_id: l.player_id, position: l.position }));
      const { error } = await supabase.from("match_lineups").insert(rows);
      if (error) throw error;
      emitChange();
      toast({ title: "Escalação salva com sucesso! ✅" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar escalação", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, isPending };
};

export const useCreateLineup = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (payload: { match_id: string; player_id: string; position?: string }) => {
    setIsPending(true);
    try {
      const { error } = await supabase.from("match_lineups").insert(payload);
      if (error) throw error;
      emitChange();
    } catch (e: any) {
      toast({ title: "Erro ao escalar jogador", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

export const useDeleteLineup = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (id: string) => {
    setIsPending(true);
    try {
      const { error } = await supabase.from("match_lineups").delete().eq("id", id);
      if (error) throw error;
      emitChange();
    } catch (e: any) {
      toast({ title: "Erro ao remover escalação", description: e?.message, variant: "destructive" });
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

// =================== PAYMENTS ===================
export const useMatchPayments = (matchId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!matchId) { setData([]); return; }
    let alive = true;
    const load = async () => {
      const { data: rows = [] } = await supabase
        .from("match_payments").select("*, player:players(*)").eq("match_id", matchId);
      if (alive) setData(rows || []);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    const ch = supabase.channel(`payments-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_payments", filter: `match_id=eq.${matchId}` }, () => load())
      .subscribe();
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); supabase.removeChannel(ch); };
  }, [matchId]);
  return { data };
};

export const useCreateMatchPayments = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async ({ matchId, playerIds, amount }: { matchId: string; playerIds: string[]; amount: number }) => {
    setIsPending(true);
    try {
      if (!playerIds.length) throw new Error("Nenhum jogador confirmado");
      const rows = playerIds.map((pid) => ({ match_id: matchId, player_id: pid, amount, status: "pending" }));
      const { error } = await supabase.from("match_payments").upsert(rows, { onConflict: "match_id,player_id" });
      if (error) throw error;
      emitChange();
    } catch (e: any) {
      toast({ title: "Erro ao criar vaquinha", description: e?.message, variant: "destructive" });
      throw e;
    } finally { setIsPending(false); }
  };
  return { mutate, mutateAsync: mutate, isPending };
};

export const useDeleteMatchPayment = () => {
  const mutate = async (id: string) => {
    const { error } = await supabase.from("match_payments").delete().eq("id", id);
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

export const useDeleteMatchPaymentsByMatch = () => {
  const mutate = async (matchId: string) => {
    const { error } = await supabase.from("match_payments").delete().eq("match_id", matchId);
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

// =================== MENSALIDADES ===================
export const useMensalidades = (playerIds: string[], ano: number) => {
  const [data, setData] = useState<any[]>([]);
  const key = playerIds.slice().sort().join(",");
  useEffect(() => {
    if (!playerIds.length) { setData([]); return; }
    let alive = true;
    const load = async () => {
      const { data: rows = [] } = await supabase
        .from("mensalidades").select("*").in("player_id", playerIds).eq("ano", ano);
      if (alive) setData(rows || []);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); };
  }, [key, ano]);
  return { data };
};

export const useUpsertMensalidade = () => {
  const mutate = async (payload: { player_id: string; ano: number; mes: number; pago: boolean; data_pagamento?: string | null }) => {
    const { error } = await supabase.from("mensalidades").upsert(payload, { onConflict: "player_id,ano,mes" });
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

export const useMensalidadeConfig = (teamId: string | undefined, ano: number) => {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    if (!teamId) { setData(null); return; }
    let alive = true;
    const load = async () => {
      const { data: row } = await supabase
        .from("mensalidade_config").select("*").eq("team_id", teamId).eq("ano", ano).maybeSingle();
      if (alive) setData(row || null);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); };
  }, [teamId, ano]);
  return { data };
};

export const useUpsertMensalidadeConfig = () => {
  const mutate = async (payload: { team_id: string; ano: number; valor_mensal: number }) => {
    const { error } = await supabase.from("mensalidade_config").upsert(payload, { onConflict: "team_id,ano" });
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

// =================== DEBITOS (CAIXA) ===================
export const useDebitos = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!teamId) { setData([]); return; }
    let alive = true;
    const load = async () => {
      const { data: rows = [] } = await supabase
        .from("debitos").select("*").eq("team_id", teamId).order("data", { ascending: false });
      if (alive) setData(rows || []);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); };
  }, [teamId]);
  return { data };
};

export const useCreateDebito = () => {
  const mutate = async (payload: any) => {
    const { error } = await supabase.from("debitos").insert(payload);
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

export const useUpdateDebito = () => {
  const mutate = async ({ id, ...rest }: any) => {
    const allowed: any = {};
    ["descricao","data","valor","tipo","observacao"].forEach(k => { if (k in rest) allowed[k] = rest[k]; });
    const { error } = await supabase.from("debitos").update(allowed).eq("id", id);
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

export const useDeleteDebito = () => {
  const mutate = async (id: string) => {
    const { error } = await supabase.from("debitos").delete().eq("id", id);
    if (error) throw error;
    emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

// =================== CHAT ===================
export const useMatchDetail = (matchId?: string) => {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    if (!matchId) { setData(null); return; }
    let alive = true;
    const load = async () => {
      const { data: row } = await supabase
        .from("matches")
        .select("*, home_team:teams!matches_home_team_fk(*), away_team:teams!matches_away_team_fk(*)")
        .eq("id", matchId).maybeSingle();
      if (alive) setData(row);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); };
  }, [matchId]);
  return { data };
};

export const useChatMessages = (matchId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!matchId) { setData([]); return; }
    let alive = true;
    const load = async () => {
      const { data: rows = [] } = await supabase
        .from("match_chat_messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true });
      if (!alive) return;
      const userIds = Array.from(new Set((rows || []).map((m: any) => m.user_id).filter(Boolean)));
      let profMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs = [] } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        (profs || []).forEach((p: any) => { profMap[p.user_id] = p; });
      }
      setData((rows || []).map((m: any) => ({ ...m, profile: profMap[m.user_id] || null })));
    };
    load();
    const ch = supabase.channel(`chat-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_chat_messages", filter: `match_id=eq.${matchId}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [matchId]);
  return { data };
};

export const useSendChatMessage = () => {
  const { toast } = useToast();
  const mutate = async ({ matchId, message }: { matchId: string; message: string }) => {
    const uid = await getUserId();
    if (!uid) { toast({ title: "Faça login", variant: "destructive" }); return; }
    const { error } = await supabase.from("match_chat_messages").insert({
      match_id: matchId, user_id: uid, message, message_type: "text",
    });
    if (error) toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
  };
  return { mutate, mutateAsync: mutate };
};

// =================== LEGACY MOCK-BASED HOOKS ===================

export const usePhotoEvents = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { setData(teamId ? mockDb.getPhotoEvents(teamId) : []); }, [teamId]);
  return { data };
};

export const usePhotoPosts = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { setData(teamId ? mockDb.getPhotoPosts(teamId) : []); }, [teamId]);
  return { data };
};

export const useCreatePhotoPost = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = async (payload: any) => {
    setIsPending(true);
    try { const r = mockDb.createPhotoPost(payload); toast({ title: "Foto publicada com sucesso! 📸" }); return r; }
    catch (e: any) { toast({ title: "Erro ao publicar foto", description: e?.message, variant: "destructive" }); throw e; }
    finally { setIsPending(false); }
  };
  return { mutate: (p: any) => { void mutateAsync(p); }, mutateAsync, isPending, isLoading: isPending };
};

export const useResenhaPosts = () => {
  const [data, setData] = useState<any[]>([]);
  useSubscribe(() => setData(mockDb.getResenhaPosts()));
  return { data };
};

export const useAppSharedImages = () => {
  const [data, setData] = useState<any[]>([]);
  useSubscribe(() => setData(mockDb.getAppSharedImages()));
  return { data };
};

export const useAuth = () => ({ data: null, user: null, session: null });
