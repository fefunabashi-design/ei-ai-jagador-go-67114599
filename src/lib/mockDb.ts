// ============================================================
// MOCK DATABASE — localStorage (desenvolvimento frontend)
// Substitui Supabase enquanto o backend não está configurado.
// ============================================================

function genId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function get<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ==================== PROFILE ====================

const DEFAULT_PROFILE = {
  id: "mock-profile-id",
  user_id: "mock-user-id",
  display_name: "Desenvolvedor",
  nickname: "Dev",
  phone: "",
  birth_date: "",
  region: "",
  avatar_url: "",
  role: "player",
  is_pro: true,
  created_at: now(),
  updated_at: now(),
};

export const mockDb = {
  getProfile: () => get("mock_profile", DEFAULT_PROFILE),

  updateProfile: (updates: Record<string, unknown>) => {
    const profile = { ...mockDb.getProfile(), ...updates, updated_at: now() };
    set("mock_profile", profile);
    return profile;
  },

  // ==================== TEAMS ====================

  getTeam: (): any | null => get<any>("mock_team", null),

  createTeam: (data: Record<string, unknown>) => {
    const team = {
      ...data,
      id: genId(),
      owner_id: "mock-user-id",
      rating: 0,
      created_at: now(),
      updated_at: now(),
    };
    set("mock_team", team);
    return team;
  },

  updateTeam: (_id: string, updates: Record<string, unknown>) => {
    const team = { ...mockDb.getTeam(), ...updates, updated_at: now() };
    set("mock_team", team);
    return team;
  },

  deleteTeam: () => {
    localStorage.removeItem("mock_team");
    localStorage.removeItem("mock_players");
  },

  // ==================== PLAYERS ====================

  getPlayers: (teamId: string): any[] => {
    const players = get<any[]>("mock_players", []);
    return players
      .filter((p) => p.team_id === teamId)
      .sort((a, b) => (a.jersey_number || 0) - (b.jersey_number || 0));
  },

  createPlayer: (data: Record<string, unknown>) => {
    const players = get<any[]>("mock_players", []);
    const player = {
      goals: 0,
      matches: 0,
      rating: 0,
      is_active: true,
      ...data,
      id: genId(),
      created_at: now(),
      updated_at: now(),
    };
    set("mock_players", [...players, player]);
    return player;
  },

  updatePlayer: (id: string, updates: Record<string, unknown>) => {
    const players = get<any[]>("mock_players", []);
    const updated = players.map((p) =>
      p.id === id ? { ...p, ...updates, updated_at: now() } : p
    );
    set("mock_players", updated);
    return updated.find((p) => p.id === id);
  },

  deletePlayer: (id: string) => {
    const players = get<any[]>("mock_players", []);
    set("mock_players", players.filter((p) => p.id !== id));
  },

  // ==================== MATCHES ====================

  getMatch: (id: string): any | null => {
    const matches = get<any[]>("mock_matches", []);
    const team = mockDb.getTeam();
    const m = matches.find((m) => m.id === id);
    if (!m) return null;
    return {
      ...m,
      home_team: m.home_team_id === team?.id ? team : null,
      away_team: m.away_team_id === team?.id ? team : null,
    };
  },

  getMatches: (): any[] => {
    const matches = get<any[]>("mock_matches", []);
    const team = mockDb.getTeam();
    return matches
      .map((m) => ({
        ...m,
        home_team: m.home_team_id === team?.id ? team : null,
        away_team: m.away_team_id === team?.id ? team : null,
      }))
      .sort(
        (a, b) =>
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
  },

  createMatch: (data: Record<string, unknown>) => {
    const matches = get<any[]>("mock_matches", []);
    const match = {
      status: "open",
      ...data,
      id: genId(),
      created_at: now(),
      updated_at: now(),
    };
    set("mock_matches", [...matches, match]);
    // Auto-convocar jogadores do time
    const players = mockDb.getPlayers(data.home_team_id as string);
    players.forEach((p) => {
      mockDb._createSummonInternal({
        match_id: match.id,
        player_id: p.id,
        position: p.position,
        status: "pending",
      });
    });
    return match;
  },

  updateMatch: (id: string, updates: Record<string, unknown>) => {
    const matches = get<any[]>("mock_matches", []);
    const updated = matches.map((m) =>
      m.id === id ? { ...m, ...updates, updated_at: now() } : m
    );
    set("mock_matches", updated);
    return updated.find((m) => m.id === id);
  },

  deleteMatch: (id: string) => {
    const matches = get<any[]>("mock_matches", []);
    set("mock_matches", matches.filter((m) => m.id !== id));
    const summons = get<any[]>("mock_summons", []);
    set("mock_summons", summons.filter((s) => s.match_id !== id));
    const lineups = get<any[]>("mock_lineups", []);
    set("mock_lineups", lineups.filter((l) => l.match_id !== id));
  },

  // ==================== LINEUPS ====================

  getLineups: (matchId: string): any[] => {
    const lineups = get<any[]>("mock_lineups", []);
    const players = get<any[]>("mock_players", []);
    return lineups
      .filter((l) => l.match_id === matchId)
      .map((l) => ({
        ...l,
        player: players.find((p) => p.id === l.player_id) || null,
      }));
  },

  createLineup: (data: { match_id: string; player_id: string; position?: string }) => {
    const lineups = get<any[]>("mock_lineups", []);
    const existing = lineups.find(
      (l) => l.match_id === data.match_id && l.player_id === data.player_id
    );
    if (existing) return existing;
    const lineup = { ...data, id: genId(), created_at: now() };
    set("mock_lineups", [...lineups, lineup]);
    return lineup;
  },

  deleteLineup: (id: string) => {
    const lineups = get<any[]>("mock_lineups", []);
    set("mock_lineups", lineups.filter((l) => l.id !== id));
  },

  // ==================== SUMMONS ====================

  getSummons: (matchId: string): any[] => {
    const summons = get<any[]>("mock_summons", []);
    const players = get<any[]>("mock_players", []);
    return summons
      .filter((s) => s.match_id === matchId)
      .map((s) => ({
        ...s,
        player: players.find((p) => p.id === s.player_id) || null,
      }));
  },

  getMySummons: (): any[] => {
    const summons = get<any[]>("mock_summons", []);
    const players = get<any[]>("mock_players", []);
    const matches = get<any[]>("mock_matches", []);
    const team = mockDb.getTeam();
    return summons
      .map((s) => {
        const m = matches.find((m) => m.id === s.match_id);
        return {
          ...s,
          player: players.find((p) => p.id === s.player_id) || null,
          match: m
            ? { ...m, home_team: team, away_team: null }
            : null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  _createSummonInternal: (data: Record<string, unknown>) => {
    const summons = get<any[]>("mock_summons", []);
    const existing = summons.find(
      (s) => s.match_id === data.match_id && s.player_id === data.player_id
    );
    if (existing) return existing;
    const summon = { ...data, id: genId(), created_at: now() };
    set("mock_summons", [...summons, summon]);
    return summon;
  },

  createSummons: (items: Record<string, unknown>[]) => {
    return items.map((item) => mockDb._createSummonInternal(item));
  },

  respondSummon: (id: string, status: "confirmed" | "declined") => {
    const summons = get<any[]>("mock_summons", []);
    const updated = summons.map((s) =>
      s.id === id ? { ...s, status, responded_at: now() } : s
    );
    set("mock_summons", updated);
    const summon = updated.find((s) => s.id === id);
    if (status === "confirmed" && summon) {
      mockDb.createLineup({
        match_id: summon.match_id,
        player_id: summon.player_id,
        position: summon.position,
      });
    }
    return summon;
  },

  // ==================== PAYMENTS ====================

  getPayments: (matchId: string): any[] => {
    const payments = get<any[]>("mock_payments", []);
    const players = get<any[]>("mock_players", []);
    return payments
      .filter((p) => p.match_id === matchId)
      .map((p) => ({
        ...p,
        player: players.find((pl) => pl.id === p.player_id) || null,
      }));
  },

  createPayments: (items: Record<string, unknown>[]) => {
    const payments = get<any[]>("mock_payments", []);
    const newPayments = items.map((item) => ({
      ...item,
      id: genId(),
      created_at: now(),
    }));
    set("mock_payments", [...payments, ...newPayments]);
    return newPayments;
  },

  deletePaymentsByMatch: (matchId: string) => {
    const payments = get<any[]>("mock_payments", []);
    set("mock_payments", payments.filter((p) => p.match_id !== matchId));
  },

  deletePayment: (id: string) => {
    const payments = get<any[]>("mock_payments", []);
    set("mock_payments", payments.filter((p) => p.id !== id));
  },

  updatePayment: (id: string, updates: Record<string, unknown>) => {
    const payments = get<any[]>("mock_payments", []);
    const updated = payments.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set("mock_payments", updated);
    return updated.find((p) => p.id === id);
  },

  // ==================== CHAT ====================

  getMessages: (matchId: string): any[] =>
    get<any[]>(`mock_chat_${matchId}`, []),

  addMessage: (matchId: string, message: string) => {
    const messages = mockDb.getMessages(matchId);
    const profile = mockDb.getProfile();
    const msg = {
      id: genId(),
      match_id: matchId,
      user_id: "mock-user-id",
      message,
      message_type: "text",
      created_at: now(),
      profile: {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      },
    };
    set(`mock_chat_${matchId}`, [...messages, msg]);
    return msg;
  },

  // ==================== DÉBITOS (CAIXA) ====================

  getDebitos: (teamId: string): any[] => {
    const all = get<any[]>("mock_debitos", []);
    return all
      .filter((d) => d.team_id === teamId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },

  createDebito: (data: { team_id: string; descricao: string; data: string; valor: number; tipo?: string; observacao?: string }) => {
    const all = get<any[]>("mock_debitos", []);
    const item = { tipo: "debito", ...data, id: genId(), created_at: now() };
    set("mock_debitos", [...all, item]);
    return item;
  },

  updateDebito: (id: string, updates: Record<string, unknown>) => {
    const all = get<any[]>("mock_debitos", []);
    const updated = all.map((d) => d.id === id ? { ...d, ...updates } : d);
    set("mock_debitos", updated);
    return updated.find((d) => d.id === id);
  },

  deleteDebito: (id: string) => {
    const all = get<any[]>("mock_debitos", []);
    set("mock_debitos", all.filter((d) => d.id !== id));
  },

  // ==================== MENSALIDADES ====================

  getMensalidades: (playerIds: string[], ano: number): any[] => {
    const all = get<any[]>("mock_mensalidades", []);
    return all.filter(
      (m) => playerIds.includes(m.player_id) && m.ano === ano
    );
  },

  upsertMensalidade: (data: {
    player_id: string;
    ano: number;
    mes: number;
    pago: boolean;
    data_pagamento?: string | null;
  }) => {
    const all = get<any[]>("mock_mensalidades", []);
    const idx = all.findIndex(
      (m) =>
        m.player_id === data.player_id &&
        m.ano === data.ano &&
        m.mes === data.mes
    );
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...data };
      set("mock_mensalidades", all);
      return all[idx];
    }
    const newItem = { ...data, id: genId(), created_at: now() };
    set("mock_mensalidades", [...all, newItem]);
    return newItem;
  },

  // ==================== MENSALIDADE CONFIG ====================

  getMensalidadeConfig: (ano: number): any | null => {
    const configs = get<any[]>("mock_mensalidade_config", []);
    return configs.find((c) => c.ano === ano) || null;
  },

  upsertMensalidadeConfig: (data: {
    ano: number;
    valor_mensal: number;
    team_id: string;
  }) => {
    const configs = get<any[]>("mock_mensalidade_config", []);
    const idx = configs.findIndex((c) => c.ano === data.ano);
    if (idx >= 0) {
      configs[idx] = { ...configs[idx], ...data, updated_at: now() };
      set("mock_mensalidade_config", configs);
      return configs[idx];
    }
    const newConfig = { ...data, id: genId(), updated_at: now() };
    set("mock_mensalidade_config", [...configs, newConfig]);
    return newConfig;
  },
};
