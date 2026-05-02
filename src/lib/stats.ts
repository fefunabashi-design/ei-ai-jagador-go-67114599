// ============================================================
// Sistema de pontuação e notas (0–10)
// Vitória = 3 pts | Empate = 1 pt | Derrota = 0 pts
// Apenas jogadores CONFIRMADOS na escalação da partida finalizada
// ("status === 'completed'") recebem pontos.
// Nota = (pontos obtidos / pontos possíveis) * 10
// ============================================================

type Match = {
  id: string;
  home_team_id: string;
  away_team_id?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  status: string;
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function pointsForTeam(match: Match, teamId: string): number {
  const home = match.home_score ?? 0;
  const away = match.away_score ?? 0;
  const isHome = match.home_team_id === teamId;
  const isAway = match.away_team_id === teamId;
  if (!isHome && !isAway) return 0;
  if (home === away) return 1;
  const teamScore = isHome ? home : away;
  const oppScore = isHome ? away : home;
  return teamScore > oppScore ? 3 : 0;
}

function getCompletedMatchesForTeam(teamId: string): Match[] {
  const matches = get<Match[]>("mock_matches", []);
  return matches.filter(
    (m) =>
      m.status === "completed" &&
      (m.home_team_id === teamId || m.away_team_id === teamId)
  );
}

export type TeamStats = {
  played: number;
  points: number;
  maxPoints: number;
  nota: number; // 0..10
};

export function getTeamStats(teamId: string): TeamStats {
  const completed = getCompletedMatchesForTeam(teamId);
  const played = completed.length;
  const points = completed.reduce((acc, m) => acc + pointsForTeam(m, teamId), 0);
  const maxPoints = played * 3;
  const nota = maxPoints > 0 ? (points / maxPoints) * 10 : 0;
  return { played, points, maxPoints, nota };
}

export type PlayerStats = TeamStats;

export function getPlayerStats(playerId: string, teamId: string): PlayerStats {
  const completed = getCompletedMatchesForTeam(teamId);
  const lineups = get<any[]>("mock_lineups", []);
  // Apenas partidas onde o jogador estava confirmado na escalação
  const playerMatches = completed.filter((m) =>
    lineups.some((l) => l.match_id === m.id && l.player_id === playerId)
  );
  const played = playerMatches.length;
  const points = playerMatches.reduce(
    (acc, m) => acc + pointsForTeam(m, teamId),
    0
  );
  const maxPoints = played * 3;
  const nota = maxPoints > 0 ? (points / maxPoints) * 10 : 0;
  return { played, points, maxPoints, nota };
}

export function formatNota(nota: number): string {
  return nota.toFixed(1);
}
