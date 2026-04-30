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

function getMatchLabel(match: any) {
  const homeName = match?.home_team_name || "Meu Time";
  const awayName = match?.away_team_name || "Adversário";
  return `${homeName} x ${awayName}`;
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

const DEFAULT_TEAM_SEED = {
  id: "mock-team-seed-001",
  owner_id: "mock-user-id",
  name: "Corinthias",
  abbreviation: "COR",
  region: "Z/L",
  categoria: "Esporte",
  play_days: ["domingo"],
  play_time_start: "10:30",
  play_time_end: "12:30",
  phone: "(11) 3333-1910",
  mobile: "(11) 99100-1910",
  email: "contato@corinthias.com",
  instagram: "@corinthias",
  rating: 0,
  created_at: now(),
  updated_at: now(),
};

const DEFAULT_REGISTERED_TEAMS = [
  DEFAULT_TEAM_SEED,
  {
    id: "mock-team-seed-002",
    owner_id: "mock-user-id-2",
    name: "Santos",
    abbreviation: "SAN",
    region: "Z/S",
    categoria: "Esporte",
    play_days: ["domingo"],
    play_time_start: "08:30",
    play_time_end: "10:30",
    phone: "(11) 3333-1911",
    mobile: "(11) 99100-1911",
    email: "contato@santos.com",
    instagram: "@santos",
    rating: 0,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "mock-team-seed-003",
    owner_id: "mock-user-id-3",
    name: "Palmeiras",
    abbreviation: "PAL",
    region: "Z/O",
    categoria: "Esporte",
    play_days: ["sabado"],
    play_time_start: "15:00",
    play_time_end: "17:00",
    phone: "(11) 3333-1912",
    mobile: "(11) 99100-1912",
    email: "contato@palmeiras.com",
    instagram: "@palmeiras",
    rating: 0,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "mock-team-seed-004",
    owner_id: "mock-user-id-4",
    name: "Sao Paulo",
    abbreviation: "SAO",
    region: "Z/N",
    categoria: "40+",
    play_days: ["domingo"],
    play_time_start: "10:30",
    play_time_end: "12:30",
    phone: "(11) 3333-1913",
    mobile: "(11) 99100-1913",
    email: "contato@saopaulo.com",
    instagram: "@saopaulo",
    rating: 0,
    created_at: now(),
    updated_at: now(),
  },
  {
    id: "mock-team-seed-005",
    owner_id: "mock-user-id-5",
    name: "Portuguesa",
    abbreviation: "POR",
    region: "Z/L",
    categoria: "35+",
    play_days: ["sabado"],
    play_time_start: "09:00",
    play_time_end: "11:00",
    phone: "(11) 3333-1914",
    mobile: "(11) 99100-1914",
    email: "contato@portuguesa.com",
    instagram: "@portuguesa",
    rating: 0,
    created_at: now(),
    updated_at: now(),
  },
];

const DEFAULT_PLAYERS_SEED = [
  { id: "p-seed-01", name: "Hugo", last_name: "Souza", nickname: "Hugo", position: "Gol", jersey_number: 1, is_active: true },
  { id: "p-seed-02", name: "Matheus", last_name: "Franca", nickname: "Matheuzinho", position: "Lat Dir", jersey_number: 2, is_active: true },
  { id: "p-seed-03", name: "Andre", last_name: "Ramalho", nickname: "Ramalho", position: "Zaga", jersey_number: 4, is_active: true },
  { id: "p-seed-04", name: "Caca", last_name: "Oliveira", nickname: "Caca", position: "Zaga", jersey_number: 25, is_active: true },
  { id: "p-seed-05", name: "Fabricio", last_name: "Angileri", nickname: "Angileri", position: "Lat Esq", jersey_number: 6, is_active: true },
  { id: "p-seed-06", name: "Raniele", last_name: "Almeida", nickname: "Raniele", position: "Volante", jersey_number: 14, is_active: true },
  { id: "p-seed-07", name: "Jose", last_name: "Martinez", nickname: "Martinez", position: "Volante", jersey_number: 70, is_active: true },
  { id: "p-seed-08", name: "Rodrigo", last_name: "Garro", nickname: "Garro", position: "Meia", jersey_number: 10, is_active: true },
  { id: "p-seed-09", name: "Igor", last_name: "Coronado", nickname: "Coronado", position: "Meia", jersey_number: 77, is_active: true },
  { id: "p-seed-10", name: "Yuri", last_name: "Alberto", nickname: "Yuri", position: "Atacante", jersey_number: 9, is_active: true },
  { id: "p-seed-11", name: "Memphis", last_name: "Depay", nickname: "Memphis", position: "Atacante", jersey_number: 94, is_active: true },
].map((player) => ({
  ...player,
  team_id: DEFAULT_TEAM_SEED.id,
  goals: 0,
  matches: 0,
  rating: 0,
  created_at: now(),
  updated_at: now(),
}));

const DEFAULT_MATCH_SEED = {
  id: "m-seed-01",
  home_team_id: DEFAULT_TEAM_SEED.id,
  away_team_id: null,
  home_team_name: DEFAULT_TEAM_SEED.name,
  away_team_name: "Amigos da Bola",
  match_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  location: "Arena Municipal",
  format: "Futebol 7",
  status: "open",
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
  // O usuário pode ter MAIS DE UM time. "mock_team" guarda o time ATIVO no app.
  // "mock_my_teams" lista todos os times do usuário (proprietário ou jogador).

  getTeam: (): any | null => {
    const active = get<any>("mock_team", null);
    if (active) return active;
    const myTeams = mockDb.getMyTeams();
    return myTeams[0] || null;
  },

  getMyTeams: (): any[] => {
    const all = get<any[]>("mock_registered_teams", DEFAULT_REGISTERED_TEAMS);
    const myIds = get<string[]>("mock_my_team_ids", [DEFAULT_TEAM_SEED.id]);
    return all.filter((t) => myIds.includes(t.id));
  },

  setActiveTeam: (teamId: string) => {
    const all = get<any[]>("mock_registered_teams", DEFAULT_REGISTERED_TEAMS);
    const team = all.find((t) => t.id === teamId);
    if (team) {
      set("mock_team", team);
    }
    return team || null;
  },

  getAllTeams: (): any[] => get<any[]>("mock_registered_teams", DEFAULT_REGISTERED_TEAMS),

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
    const teams = mockDb.getAllTeams().filter((item) => item.id !== team.id);
    set("mock_registered_teams", [team, ...teams]);
    const myIds = get<string[]>("mock_my_team_ids", [DEFAULT_TEAM_SEED.id]);
    if (!myIds.includes(team.id)) {
      set("mock_my_team_ids", [team.id, ...myIds]);
    }
    return team;
  },

  updateTeam: (id: string, updates: Record<string, unknown>) => {
    const teams = mockDb.getAllTeams();
    const target = teams.find((t) => t.id === id) || mockDb.getTeam();
    const team = { ...target, ...updates, id, updated_at: now() };
    const active = mockDb.getTeam();
    if (active?.id === id) {
      set("mock_team", team);
    }
    set(
      "mock_registered_teams",
      teams.map((item) => (item.id === id ? team : item)),
    );
    return team;
  },

  deleteTeam: (id?: string) => {
    const active = mockDb.getTeam();
    const targetId = id || active?.id;
    if (!targetId) return;
    set(
      "mock_registered_teams",
      mockDb.getAllTeams().filter((item) => item.id !== targetId),
    );
    const myIds = get<string[]>("mock_my_team_ids", []);
    const nextIds = myIds.filter((tid) => tid !== targetId);
    set("mock_my_team_ids", nextIds);
    // Remove jogadores deste time
    const players = get<any[]>("mock_players", []);
    set("mock_players", players.filter((p) => p.team_id !== targetId));
    // Reescolhe time ativo
    if (active?.id === targetId) {
      const remaining = mockDb.getAllTeams().filter((t) => nextIds.includes(t.id));
      if (remaining[0]) set("mock_team", remaining[0]);
      else localStorage.removeItem("mock_team");
    }
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

  // ==================== FOTOS ====================

  getPhotoEvents: (teamId: string): any[] => {
    const matches = get<any[]>("mock_matches", []);

    const teamMatches = matches
      .filter((m) => m.home_team_id === teamId || m.away_team_id === teamId)
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

    const events: any[] = [];

    teamMatches.forEach((match) => {
      const baseLabel = getMatchLabel(match);

      events.push({
        id: `partida-${match.id}`,
        type: "partida",
        type_label: "Partida",
        title: baseLabel,
        date: match.match_date,
        location: match.location || "Local a definir",
        status: match.status,
        match_id: match.id,
      });

      // A vaquinha já existe no fluxo de partidas; geramos o evento automaticamente.
      events.push({
        id: `vaquinha-${match.id}`,
        type: "vaquinha",
        type_label: "Vaquinha",
        title: `Vaquinha • ${baseLabel}`,
        date: match.match_date,
        location: match.location || "Local a definir",
        status: match.status,
        match_id: match.id,
      });
    });

    return events;
  },

  getPhotoPosts: (teamId: string): any[] => {
    const posts = get<any[]>("mock_photo_posts", []);
    return posts
      .filter((p) => p.team_id === teamId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createPhotoPost: (data: {
    team_id: string;
    event_id: string;
    event_type: "partida" | "vaquinha";
    event_title: string;
    match_id?: string;
    photo_url: string;
    comment?: string;
  }) => {
    const posts = get<any[]>("mock_photo_posts", []);
    const post = {
      ...data,
      id: genId(),
      created_at: now(),
      updated_at: now(),
    };

    set("mock_photo_posts", [post, ...posts]);
    return post;
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

function seedMockData() {
  const existingTeam = get<any | null>("mock_team", null);
  const hasTeam = !!existingTeam;
  const registeredTeams = get<any[]>("mock_registered_teams", []);
  const rawPlayers = localStorage.getItem("mock_players");
  const hasPlayers = !!rawPlayers;
  const parsedPlayers = rawPlayers ? get<any[]>("mock_players", []) : [];
  const hasNonEmptyPlayers = Array.isArray(parsedPlayers) && parsedPlayers.length > 0;
  const shouldRefreshSeedTeam =
    !existingTeam ||
    existingTeam.id === DEFAULT_TEAM_SEED.id ||
    existingTeam.name === "Jagador FC";
  const rawMatches = localStorage.getItem("mock_matches");
  const hasMatches = !!rawMatches;
  const parsedMatches = rawMatches ? get<any[]>("mock_matches", []) : [];
  const hasNonEmptyMatches = Array.isArray(parsedMatches) && parsedMatches.length > 0;

  if (!hasTeam || shouldRefreshSeedTeam) {
    set("mock_team", DEFAULT_TEAM_SEED);
  }

  if (!Array.isArray(registeredTeams) || registeredTeams.length === 0 || shouldRefreshSeedTeam) {
    set("mock_registered_teams", DEFAULT_REGISTERED_TEAMS);
  }

  if (!hasPlayers || !hasNonEmptyPlayers || shouldRefreshSeedTeam) {
    set("mock_players", DEFAULT_PLAYERS_SEED);
  }

  if (!hasMatches || !hasNonEmptyMatches) {
    set("mock_matches", [DEFAULT_MATCH_SEED]);
  }
}

seedMockData();
