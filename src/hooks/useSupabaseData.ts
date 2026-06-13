import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

// ---------------------------------------------------------------------------
// Internal factories — consolidam o boilerplate repetido em ~14 mutations e
// em listas globais. NÃO mudam comportamento: assinaturas/efeitos colaterais
// (emitChange, toasts) permanecem idênticos aos hooks originais.
// ---------------------------------------------------------------------------
type MutationResult<I> = {
  mutate: (input: I) => Promise<void>;
  mutateAsync: (input: I) => Promise<void>;
  isPending: boolean;
  isLoading: boolean;
};

const createMutationHook = <I,>(opts: {
  run: (input: I) => Promise<void>;
  success?: string;
  successDescription?: string;
  error: string;
  rethrow?: boolean;
}) => (): MutationResult<I> => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const mutate = async (input: I) => {
    setIsPending(true);
    try {
      await opts.run(input);
      emitChange();
      if (opts.success) toast({ title: opts.success, description: opts.successDescription });
    } catch (e: any) {
      toast({ title: opts.error, description: e?.message, variant: "destructive" });
      if (opts.rethrow) throw e;
    } finally {
      setIsPending(false);
    }
  };
  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
};

const createListHook = <T,>(fetcher: () => Promise<T[]>) => (): { data: T[]; isLoading: boolean } => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useSubscribe(async () => {
    try {
      const rows = await fetcher();
      setData(rows);
    } finally {
      setIsLoading(false);
    }
  });
  return { data, isLoading };
};

// =================== PROFILE ===================
// =================== PROFILE ===================
// Cached via React Query — same `{ data, isLoading }` shape as before.
// Refetch é disparado pelo bridge global em App.tsx ao receber `supabase-data-change`.
export const useProfile = () => {
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return null;
      const [{ data: { user } }, { data: p }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      return { ...(p || {}), user_id: uid, email: user?.email };
    },
    staleTime: 60_000,
  });
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => { query.refetch(); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data: query.data ?? null, isLoading: query.isLoading };
};


export const useUpdateProfile = createMutationHook<Record<string, unknown>>({
  run: async (updates) => {
    const uid = await getUserId();
    if (!uid) throw new Error("Não autenticado");
    const allowed: Record<string, unknown> = {};
    ["display_name","last_name","nickname","phone","birth_date","cpf","city","state","region","avatar_url","role","is_pro","is_active","gender","email","primary_color"].forEach(k => {
      if (k in updates) allowed[k] = (updates as any)[k];
    });
    if (!Object.keys(allowed).length) return;
    // Use upsert + .select() so first-time saves work even if the profile row
    // wasn't pre-created, and we can detect silent RLS failures (returning 0
    // rows with no error) instead of falsely toasting "success".
    const payload = { user_id: uid, ...allowed };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id");
    if (error) {
      const msg = `${error.message || ""} ${(error as any).details || ""}`.toLowerCase();
      if (msg.includes("profiles_cpf_unique") || (msg.includes("cpf") && msg.includes("duplicate"))) {
        throw new Error("CPF já vinculado a outra conta. Confira os 11 dígitos. Se o CPF é seu, volte ao login e entre com ele (ou com o e-mail dessa conta) em vez de criar um novo cadastro.");
      }
      if (msg.includes("profiles_email") && msg.includes("duplicate")) {
        throw new Error("E-mail já vinculado a outra conta. Volte ao login e entre com esse e-mail em vez de criar um novo cadastro.");
      }
      throw error;
    }
    if (!data || data.length === 0) {
      throw new Error("Não foi possível salvar. Faça login novamente e tente outra vez.");
    }
  },
  success: "Perfil atualizado!",
  error: "Erro ao atualizar perfil",
  rethrow: true,
});

export const useUploadAvatar = createMutationHook<File>({
  run: async (file) => {
    const uid = await getUserId();
    if (!uid) throw new Error("Não autenticado");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", uid);
  },
  success: "Foto atualizada!",
  error: "Erro ao atualizar foto",
});

// =================== TEAMS ===================
// Compartilhado entre todas as páginas: 1 única query cobre "my-teams" (owned + jogador-vinculado).
// Os demais hooks derivam desse cache, eliminando 2-3 refetches duplicados por página.
export const useMyTeams = () => {
  const query = useQuery({
    queryKey: ["my-teams"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return [] as any[];
      const [{ data: owned = [] }, { data: playerLinks = [] }] = await Promise.all([
        supabase.from("teams").select("*").eq("owner_id", uid),
        supabase.from("players").select("team_id").eq("user_id", uid),
      ]);
      const playerTeamIds = (playerLinks || []).map((p: any) => p.team_id);
      let playerTeams: any[] = [];
      if (playerTeamIds.length) {
        const { data: pt = [] } = await supabase.from("teams").select("*").in("id", playerTeamIds);
        playerTeams = pt || [];
      }
      const map = new Map<string, any>();
      [...(owned || []), ...playerTeams].forEach((t) => map.set(t.id, t));
      return Array.from(map.values());
    },
    staleTime: 30_000,
  });
  return { data: query.data ?? [], isLoading: query.isLoading };
};

export const useMyAdminTeams = () => {
  const query = useQuery({
    queryKey: ["my-admin-teams"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return [] as any[];
      const { data: owned = [] } = await supabase.from("teams").select("*").eq("owner_id", uid);
      return owned || [];
    },
    staleTime: 30_000,
  });
  return { data: query.data ?? [], isLoading: query.isLoading };
};

export const useMyTeam = () => {
  const { data: teams = [], isLoading } = useMyTeams();
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_TEAM_KEY));

  useEffect(() => {
    const h = () => setActiveId(localStorage.getItem(ACTIVE_TEAM_KEY));
    window.addEventListener("storage", h);
    window.addEventListener("active-team-change", h);
    return () => { window.removeEventListener("storage", h); window.removeEventListener("active-team-change", h); };
  }, []);

  const active = teams.find((t: any) => t.id === activeId) || teams[0] || null;
  return { data: active, isLoading };
};

export const useSetActiveTeam = () => {
  return (teamId: string) => {
    localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
    window.dispatchEvent(new CustomEvent("active-team-change"));
    emitChange();
  };
};

const cleanTeamPayload = (raw: Record<string, any>) => {
  const allowed = ["name","abbreviation","categoria","sub_categoria","estilo","gender","region","format","play_days","play_time_start","play_time_end","play_schedule",
    "field_name","field_address","foundation_date","war_cry","logo_url","instagram","phone","mobile","email",
    "addr_cep","addr_rua","addr_numero","addr_bairro","addr_cidade","addr_uf","observacoes","has_field",
    "president_name","president_email","president_phone",
    "admin_name","admin_email","admin_phone","admin_cpf",
    "coach_name","coach_phone","coach_email",
    "assistant_coach_name","assistant_coach_phone","assistant_coach_email",
    "substitute_name","sub1_name","sub1_phone","sub1_email","sub1_cpf",
    "founder_name","rating"];
  const out: Record<string, any> = {};
  allowed.forEach(k => { if (k in raw) out[k] = raw[k]; });
  return out;
};

export const useCreateTeam = createMutationHook<Record<string, any>>({
  run: async (data) => {
    const uid = await getUserId();
    if (!uid) throw new Error("Faça login para criar um time");
    const payload = { ...cleanTeamPayload(data), owner_id: uid, name: data.name };
    const { data: created, error } = await supabase.from("teams").insert(payload).select().single();
    if (error) throw error;
    localStorage.setItem(ACTIVE_TEAM_KEY, created.id);
  },
  success: "Time cadastrado com sucesso!",
  error: "Erro ao cadastrar time",
});

export const useUpdateTeam = createMutationHook<Record<string, any> & { id: string }>({
  run: async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from("teams").update(cleanTeamPayload(rest)).eq("id", id);
    if (error) throw error;
  },
  success: "Dados do time atualizados!",
  error: "Erro ao atualizar time",
});

export const useDeleteTeam = createMutationHook<string>({
  run: async (id) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) throw error;
    if (localStorage.getItem(ACTIVE_TEAM_KEY) === id) localStorage.removeItem(ACTIVE_TEAM_KEY);
  },
  success: "Time excluído com sucesso!",
  error: "Erro ao excluir time",
});

export const useUploadTeamLogo = createMutationHook<{ teamId: string; file: File }>({
  run: async ({ teamId, file }) => {
    const uid = await getUserId();
    if (!uid) throw new Error("Não autenticado");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${teamId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("team-logos").getPublicUrl(path);
    await supabase.from("teams").update({ logo_url: pub.publicUrl }).eq("id", teamId);
  },
  success: "Escudo atualizado!",
  error: "Erro ao atualizar escudo",
});

// =================== PLAYERS ===================
export const usePlayers = (teamId?: string) => {
  const query = useQuery({
    queryKey: ["players", teamId ?? null],
    queryFn: async () => {
      if (!teamId) return [] as any[];
      const { data: rows = [] } = await supabase
        .from("players").select("*").eq("team_id", teamId)
        .order("created_at", { ascending: true });
      return rows || [];
    },
    enabled: !!teamId,
    staleTime: 30_000,
  });
  return { data: query.data ?? [], isLoading: query.isLoading };
};

const cleanPlayerPayload = (raw: Record<string, any>) => {
  const allowed = ["name","last_name","display_name","nickname","email","phone","cpf","position","jersey_number",
    "goals","matches","rating","birth_date","region","user_id","team_id"];
  const out: Record<string, any> = {};
  allowed.forEach(k => { if (k in raw) out[k] = raw[k]; });
  return out;
};

export const useCreatePlayer = createMutationHook<Record<string, any>>({
  run: async (data) => {
    if (!data.team_id) throw new Error("Selecione um time");
    const { error } = await supabase.from("players").insert(cleanPlayerPayload(data) as any);
    if (error) throw error;
  },
  success: "Jogador adicionado com sucesso!",
  error: "Erro ao adicionar jogador",
});

export const useUpdatePlayer = createMutationHook<Record<string, any> & { id: string }>({
  run: async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from("players").update(cleanPlayerPayload(rest)).eq("id", id);
    if (error) throw error;
  },
  success: "Jogador atualizado com sucesso!",
  error: "Erro ao atualizar jogador",
});

export const useDeletePlayer = createMutationHook<{ id: string; teamId?: string }>({
  run: async ({ id }) => {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) throw error;
  },
  success: "Jogador removido com sucesso!",
  error: "Erro ao remover jogador",
});

// =================== MATCHES ===================
export const useMatches = () => {
  const query = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return [] as any[];
      const [{ data: owned = [] }, { data: playerLinks = [] }] = await Promise.all([
        supabase.from("teams").select("id").eq("owner_id", uid),
        supabase.from("players").select("team_id").eq("user_id", uid),
      ]);
      const ownedIds = new Set((owned || []).map((t: any) => t.id));
      const teamIds = Array.from(new Set([
        ...ownedIds,
        ...(playerLinks || []).map((p: any) => p.team_id),
      ]));
      if (!teamIds.length) return [];
      const { data: rows = [] } = await supabase
        .from("matches")
        .select("*")
        .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`)
        .order("match_date", { ascending: true });
      // Fetch team data via public_teams view (bypasses owner-only RLS on base teams table)
      const allTeamIds = Array.from(new Set(
        (rows || []).flatMap((m: any) => [m.home_team_id, m.away_team_id]).filter(Boolean)
      ));
      const { data: teamsData = [] } = allTeamIds.length
        ? await supabase.from("public_teams").select("*").in("id", allTeamIds)
        : { data: [] as any[] };
      const teamMap = new Map((teamsData || []).map((t: any) => [t.id, t]));
      const withTeams = (rows || []).map((m: any) => ({
        ...m,
        home_team: m.home_team_id ? teamMap.get(m.home_team_id) || null : null,
        away_team: m.away_team_id ? teamMap.get(m.away_team_id) || null : null,
      }));
      // Esconder partidas que o meu time marcou como removidas
      const filtered = withTeams.filter((m: any) => {
        const isMyHome = ownedIds.has(m.home_team_id) || (playerLinks || []).some((p: any) => p.team_id === m.home_team_id);
        const isMyAway = m.away_team_id && (ownedIds.has(m.away_team_id) || (playerLinks || []).some((p: any) => p.team_id === m.away_team_id));
        if (isMyHome && m.home_hidden) return false;
        if (isMyAway && m.away_hidden) return false;
        return true;
      });
      return filtered;

    },
    staleTime: 30_000,
  });
  return { data: query.data ?? [], isLoading: query.isLoading };
};

const cleanMatchPayload = (raw: Record<string, any>) => {
  const allowed = [
    "home_team_id","away_team_id","match_date","location","format","status","compatibility",
    "home_score","away_score",
    "home_finalized_at","away_finalized_at",
    "home_reported_home_score","home_reported_away_score",
    "away_reported_home_score","away_reported_away_score",
    "home_hidden","away_hidden",
  ];
  const out: Record<string, any> = {};
  allowed.forEach(k => { if (k in raw) out[k] = raw[k]; });
  return out;
};

export const useCreateMatch = createMutationHook<Record<string, any>>({
  run: async (data) => {
    if (!data.home_team_id) throw new Error("Selecione o time mandante");
    const { error } = await supabase.from("matches").insert(cleanMatchPayload(data) as any);
    if (error) throw error;
  },
  success: "Partida criada!",
  error: "Erro ao criar partida",
});

export const useUpdateMatch = createMutationHook<Record<string, any> & { id: string }>({
  run: async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from("matches").update(cleanMatchPayload(rest)).eq("id", id);
    if (error) throw error;
  },
  success: "Partida atualizada!",
  error: "Erro ao atualizar partida",
});

// Hard delete — usado apenas para partidas em aberto que ainda não têm adversário.
// Para partidas com adversário, use useHideMatch (só remove da minha agenda) ou
// useCancelMatch (cancela para os dois).
export const useDeleteMatch = createMutationHook<string>({
  run: async (id) => {
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) throw error;
  },
  success: "Partida excluída!",
  error: "Erro ao excluir partida",
});

// Remove a partida da agenda do meu time apenas. O adversário continua vendo.
export const useHideMatch = createMutationHook<{ matchId: string; myTeamId: string }>({
  run: async ({ matchId, myTeamId }) => {
    const { data: match, error: fetchErr } = await supabase
      .from("matches").select("home_team_id, away_team_id").eq("id", matchId).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!match) throw new Error("Partida não encontrada");
    const patch: Record<string, any> = {};
    if (match.home_team_id === myTeamId) patch.home_hidden = true;
    else if (match.away_team_id === myTeamId) patch.away_hidden = true;
    else throw new Error("Você não faz parte desta partida");
    const { error } = await supabase.from("matches").update(patch).eq("id", matchId);
    if (error) throw error;
  },
  success: "Partida removida da sua agenda.",
  error: "Erro ao remover partida",
});

// Marca a partida como cancelada para AMBOS os times (fica no histórico).
export const useCancelMatch = createMutationHook<string>({
  run: async (matchId) => {
    const { error } = await supabase.from("matches")
      .update({ status: "cancelled" })
      .eq("id", matchId);
    if (error) throw error;
  },
  success: "Partida cancelada.",
  successDescription: "O adversário foi avisado.",
  error: "Erro ao cancelar partida",
});

export const useAcceptMatch = createMutationHook<{ matchId: string; awayTeamId: string }>({
  run: async ({ matchId, awayTeamId }) => {
    const { data, error } = await supabase.from("matches")
      .update({ away_team_id: awayTeamId, status: "confirmed" })
      .eq("id", matchId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Não foi possível aceitar este desafio. Verifique se você é dono do time.");
    }
  },
  success: "Match confirmado!",
  successDescription: "Partida agendada na sua agenda.",
  error: "Erro ao aceitar match",
});

// Finaliza a partida pelo MEU lado, gravando placar reportado pelo meu time.
// Não muda `status` global da partida — o lado oposto pode finalizar com placar próprio.
export const useFinalizeMatchForTeam = createMutationHook<{
  matchId: string;
  mySide: "home" | "away";
  homeScore: number;
  awayScore: number;
}>({
  run: async ({ matchId, mySide, homeScore, awayScore }) => {
    const patch: Record<string, any> =
      mySide === "home"
        ? {
            home_finalized_at: new Date().toISOString(),
            home_reported_home_score: homeScore,
            home_reported_away_score: awayScore,
          }
        : {
            away_finalized_at: new Date().toISOString(),
            away_reported_home_score: homeScore,
            away_reported_away_score: awayScore,
          };
    const { error } = await supabase.from("matches").update(patch).eq("id", matchId);
    if (error) throw error;
  },
  success: "Partida finalizada!",
  error: "Erro ao finalizar",
});

// =================== LINEUPS ===================


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
    let ch: any = null;
    (async () => {
      if (!matchId) return;
      const { data: allowed } = await supabase.rpc("can_access_match_realtime", { _match_id: matchId });
      if (!alive || !allowed) return;
      ch = supabase.channel(`lineups-${matchId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${matchId}` }, () => load())
        .subscribe();
    })();
    return () => {
      alive = false;
      window.removeEventListener("supabase-data-change", h);
      if (ch) supabase.removeChannel(ch);
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

export const useCreateLineup = createMutationHook<{ match_id: string; player_id: string; position?: string }>({
  run: async (payload) => {
    const { error } = await supabase.from("match_lineups").insert(payload);
    if (error) throw error;
  },
  error: "Erro ao escalar jogador",
});

export const useDeleteLineup = createMutationHook<string>({
  run: async (id) => {
    const { error } = await supabase.from("match_lineups").delete().eq("id", id);
    if (error) throw error;
  },
  error: "Erro ao remover escalação",
});

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
    let ch: any = null;
    (async () => {
      if (!matchId) return;
      const { data: allowed } = await supabase.rpc("can_access_match_realtime", { _match_id: matchId });
      if (!alive || !allowed) return;
      ch = supabase.channel(`payments-${matchId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "match_payments", filter: `match_id=eq.${matchId}` }, () => load())
        .subscribe();
    })();
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); if (ch) supabase.removeChannel(ch); };
  }, [matchId]);
  return { data };
};

export const useCreateMatchPayments = createMutationHook<{ matchId: string; playerIds: string[]; amount: number }>({
  run: async ({ matchId, playerIds, amount }) => {
    if (!playerIds.length) throw new Error("Nenhum jogador confirmado");
    const rows = playerIds.map((pid) => ({ match_id: matchId, player_id: pid, amount, status: "pending" }));
    const { error } = await supabase.from("match_payments").upsert(rows, { onConflict: "match_id,player_id" });
    if (error) throw error;
  },
  error: "Erro ao criar vaquinha",
  rethrow: true,
});

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

export const useMensalidadeConfig = (teamId: string | undefined, ano: number, mes: number | null = null) => {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    if (!teamId) { setData(null); return; }
    let alive = true;
    const load = async () => {
      if (mes != null) {
        // Pega a edição mais recente com mes <= alvo (vigência por faixa)
        const { data: rows } = await supabase
          .from("mensalidade_config").select("*")
          .eq("team_id", teamId).eq("ano", ano)
          .not("mes", "is", null).lte("mes", mes)
          .order("mes", { ascending: false }).limit(1);
        if (rows && rows[0]) { if (alive) setData(rows[0]); return; }
        const { data: fallback } = await supabase
          .from("mensalidade_config").select("*")
          .eq("team_id", teamId).eq("ano", ano).is("mes", null).maybeSingle();
        if (alive) setData(fallback || null);
        return;
      }
      // "Ano todo": pega o mais recente cadastrado (qualquer mês ou padrão do ano)
      const { data: rows } = await supabase
        .from("mensalidade_config").select("*")
        .eq("team_id", teamId).eq("ano", ano)
        .order("updated_at", { ascending: false }).limit(1);
      if (alive) setData((rows && rows[0]) || null);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); };
  }, [teamId, ano, mes]);
  return { data };
};

export const useMensalidadeConfigsAno = (teamId: string | undefined, ano: number) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!teamId) { setData([]); return; }
    let alive = true;
    const load = async () => {
      const { data: rows = [] } = await supabase
        .from("mensalidade_config").select("*")
        .eq("team_id", teamId).eq("ano", ano);
      if (alive) setData(rows || []);
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    return () => { alive = false; window.removeEventListener("supabase-data-change", h); };
  }, [teamId, ano]);
  return { data };
};


export const useUpsertMensalidadeConfig = () => {
  const mutate = async (payload: { team_id: string; ano: number; valor_mensal: number; mes?: number | null }) => {
    const row = { team_id: payload.team_id, ano: payload.ano, valor_mensal: payload.valor_mensal, mes: payload.mes ?? null };
    const { error } = await supabase
      .from("mensalidade_config")
      .upsert(row, { onConflict: "team_id,ano,mes" });
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
        .select("*")
        .eq("id", matchId).maybeSingle();
      if (!row) { if (alive) setData(null); return; }
      const ids = [row.home_team_id, row.away_team_id].filter(Boolean);
      const { data: teamsData = [] } = ids.length
        ? await supabase.from("public_teams").select("*").in("id", ids)
        : { data: [] as any[] };
      const teamMap = new Map((teamsData || []).map((t: any) => [t.id, t]));
      const merged = {
        ...row,
        home_team: row.home_team_id ? teamMap.get(row.home_team_id) || null : null,
        away_team: row.away_team_id ? teamMap.get(row.away_team_id) || null : null,
      };
      if (alive) setData(merged);
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
        const { data: profs = [] } = await supabase.from("public_profiles").select("user_id, display_name, nickname, avatar_url").in("user_id", userIds);
        (profs || []).forEach((p: any) => { profMap[p.user_id] = p; });
      }
      setData((rows || []).map((m: any) => ({ ...m, profile: profMap[m.user_id] || null })));
    };
    load();
    const h = () => load();
    window.addEventListener("supabase-data-change", h);
    const poll = window.setInterval(load, 5000);
    let ch: any = null;
    (async () => {
      if (!matchId) return;
      const { data: allowed } = await supabase.rpc("can_access_match_realtime", { _match_id: matchId });
      if (!alive || !allowed) return;
      ch = supabase.channel(`chat:${matchId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "match_chat_messages", filter: `match_id=eq.${matchId}` }, () => load())
        .subscribe();
    })();
    return () => {
      alive = false;
      window.removeEventListener("supabase-data-change", h);
      window.clearInterval(poll);
      if (ch) supabase.removeChannel(ch);
    };
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
    else emitChange();
  };
  return { mutate, mutateAsync: mutate };
};

// =================== PHOTOS / RESENHA ===================

export const usePhotoPosts = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  const load = useCallback(async () => {
    if (!teamId) { setData([]); return; }
    const { data: rows } = await supabase
      .from("photo_posts").select("*").eq("team_id", teamId)
      .order("created_at", { ascending: false });
    setData(rows || []);
  }, [teamId]);
  useEffect(() => { load(); }, [load]);
  useSubscribe(load);
  return { data };
};

export const usePhotoEvents = (teamId?: string) => {
  const { data: posts } = usePhotoPosts(teamId);
  const events = (() => {
    const map = new Map<string, any>();
    for (const p of posts) {
      const key = p.event_id || `${p.event_type}-${p.event_title}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          event_id: p.event_id,
          event_type: p.event_type,
          title: p.event_title,
          match_id: p.match_id,
          created_at: p.created_at,
          count: 0,
        });
      }
      map.get(key).count += 1;
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();
  return { data: events };
};

export const useCreatePhotoPost = createMutationHook<any>({
  run: async (payload) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Usuário não autenticado");
    const { error } = await supabase.from("photo_posts").insert({
      team_id: payload.team_id,
      event_type: payload.event_type || "partida",
      event_id: payload.event_id || payload.match_id || crypto.randomUUID(),
      event_title: payload.event_title || payload.title || "Evento",
      photo_url: payload.photo_url,
      comment: payload.comment || null,
      match_id: payload.match_id || null,
      author_id: userId,
    });
    if (error) throw error;
  },
  success: "Foto publicada com sucesso! 📸",
  error: "Erro ao publicar foto",
  rethrow: true,
});

export const useResenhaPosts = () => {
  const [data, setData] = useState<any[]>([]);
  const load = useCallback(async () => {
    const { data: posts } = await supabase
      .from("resenha_posts").select("*")
      .order("created_at", { ascending: false });
    if (!posts || posts.length === 0) { setData([]); return; }
    const ids = posts.map((p) => p.id);
    const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
    const teamIds = Array.from(new Set(posts.map((p) => p.team_id).filter(Boolean) as string[]));
    const [{ data: profiles }, { data: reactions }, { data: comments }, { data: teams }] = await Promise.all([
      supabase.from("public_profiles").select("user_id, display_name, avatar_url").in("user_id", authorIds),
      supabase.from("resenha_reactions").select("*").in("post_id", ids),
      supabase.from("resenha_comments").select("*").in("post_id", ids),
      teamIds.length ? supabase.from("public_teams").select("id, name").in("id", teamIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const commentIds = (comments || []).map((c: any) => c.id);
    const { data: commentReactions } = commentIds.length
      ? await supabase.from("resenha_comment_reactions").select("*").in("comment_id", commentIds)
      : { data: [] as any[] };
    const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const teamMap = new Map((teams || []).map((t: any) => [t.id, t]));
    const commentAuthorIds = Array.from(new Set((comments || []).map((c: any) => c.author_id)));
    const missing = commentAuthorIds.filter((id) => !profMap.has(id));
    if (missing.length) {
      const { data: cps } = await supabase.from("public_profiles").select("user_id, display_name, avatar_url").in("user_id", missing);
      (cps || []).forEach((p: any) => profMap.set(p.user_id, p));
    }
    const mapComment = (c: any) => {
      const ca = profMap.get(c.author_id) as any;
      const reacts = (commentReactions || []).filter((r: any) => r.comment_id === c.id);
      return {
        id: c.id,
        text: c.text,
        created_at: c.created_at,
        author_id: c.author_id,
        parent_comment_id: c.parent_comment_id || null,
        author_name: ca?.display_name || "Usuário",
        author_avatar: ca?.avatar_url || null,
        likes: reacts.filter((r: any) => r.type === "like").map((r: any) => r.user_id),
        dislikes: reacts.filter((r: any) => r.type === "dislike").map((r: any) => r.user_id),
      };
    };
    setData(
      posts.map((p) => {
        const author = profMap.get(p.author_id) as any;
        const team = p.team_id ? (teamMap.get(p.team_id) as any) : null;
        const postReactions = (reactions || []).filter((r: any) => r.post_id === p.id);
        const flatComments = (comments || [])
          .filter((c: any) => c.post_id === p.id)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(mapComment);
        const roots = flatComments.filter((c: any) => !c.parent_comment_id);
        const repliesMap = new Map<string, any[]>();
        flatComments.forEach((c: any) => {
          if (c.parent_comment_id) {
            const arr = repliesMap.get(c.parent_comment_id) || [];
            arr.push(c);
            repliesMap.set(c.parent_comment_id, arr);
          }
        });
        const threaded = roots.map((r: any) => ({ ...r, replies: repliesMap.get(r.id) || [] }));
        return {
          ...p,
          author_name: author?.display_name || "Usuário",
          author_avatar: author?.avatar_url || null,
          team_name: team?.name || null,
          likes: postReactions.filter((r: any) => r.type === "like").map((r: any) => r.user_id),
          dislikes: postReactions.filter((r: any) => r.type === "dislike").map((r: any) => r.user_id),
          comments: threaded,
        };
      })
    );

  }, []);
  useEffect(() => { load(); }, [load]);
  useSubscribe(load);
  return { data };
};

export const useCreateResenhaPost = () => {
  const { toast } = useToast();
  const mutateAsync = async (payload: { photo_url: string; caption?: string; match_id?: string | null; match_label?: string | null; team_id?: string | null }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Não autenticado");
    const { error } = await supabase.from("resenha_posts").insert({
      author_id: userId,
      photo_url: payload.photo_url,
      caption: payload.caption || null,
      match_id: payload.match_id || null,
      match_label: payload.match_label || null,
      team_id: payload.team_id || null,
    });
    if (error) { toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" }); throw error; }
    emitChange();
  };
  return { mutateAsync, mutate: (p: any) => { void mutateAsync(p); } };
};

export const useToggleResenhaReaction = () => {
  const mutateAsync = async (postId: string, type: "like" | "dislike") => {
    const userId = await getUserId();
    if (!userId) return;
    const { data: existing } = await supabase
      .from("resenha_reactions").select("*").eq("post_id", postId).eq("user_id", userId).maybeSingle();
    if (existing) {
      if ((existing as any).type === type) {
        await supabase.from("resenha_reactions").delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("resenha_reactions").update({ type }).eq("id", (existing as any).id);
      }
    } else {
      await supabase.from("resenha_reactions").insert({ post_id: postId, user_id: userId, type });
    }
    emitChange();
  };
  return { mutateAsync, mutate: (postId: string, type: "like" | "dislike") => { void mutateAsync(postId, type); } };
};

export const useAddResenhaComment = () => {
  const mutateAsync = async (postId: string, text: string, parentCommentId?: string | null) => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from("resenha_comments").insert({
      post_id: postId,
      author_id: userId,
      text,
      parent_comment_id: parentCommentId || null,
    } as any);
    if (!error) emitChange();
  };
  return {
    mutateAsync,
    mutate: (postId: string, text: string, parentCommentId?: string | null) => { void mutateAsync(postId, text, parentCommentId); },
  };
};

export const useToggleResenhaCommentReaction = () => {
  const mutateAsync = async (commentId: string, type: "like" | "dislike") => {
    const userId = await getUserId();
    if (!userId) return;
    const { data: existing } = await supabase
      .from("resenha_comment_reactions").select("*").eq("comment_id", commentId).eq("user_id", userId).maybeSingle();
    if (existing) {
      if ((existing as any).type === type) {
        await supabase.from("resenha_comment_reactions").delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("resenha_comment_reactions").update({ type }).eq("id", (existing as any).id);
      }
    } else {
      await supabase.from("resenha_comment_reactions").insert({ comment_id: commentId, user_id: userId, type });
    }
    emitChange();
  };
  return { mutateAsync, mutate: (commentId: string, type: "like" | "dislike") => { void mutateAsync(commentId, type); } };
};


export const useDeleteResenhaPost = () => {
  const mutateAsync = async (postId: string) => {
    const { error } = await supabase.from("resenha_posts").delete().eq("id", postId);
    if (!error) emitChange();
  };
  return { mutateAsync, mutate: (postId: string) => { void mutateAsync(postId); } };
};

export const useAppSharedImages = () => {
  const [data, setData] = useState<any[]>([]);
  const load = useCallback(async () => {
    const { data: photos } = await supabase
      .from("photo_posts").select("id, photo_url, event_title, created_at")
      .order("created_at", { ascending: false }).limit(60);
    setData((photos || []).map((p: any) => ({ id: p.id, url: p.photo_url, label: p.event_title })));
  }, []);
  useEffect(() => { load(); }, [load]);
  useSubscribe(load);
  return { data };
};

export const useAuth = () => ({ data: null, user: null, session: null });
