// ============================================================
// Sistema de pontuação e notas (0–10) — integrado ao Supabase
// Vitória = 3 pts | Empate = 1 pt | Derrota = 0 pts
// Apenas jogadores presentes na escalação (match_lineups) de partidas
// finalizadas (status === 'completed') recebem pontos.
// Nota = (pontos obtidos / pontos possíveis) * 10
// ============================================================

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Match = {
  id: string;
  home_team_id: string;
  away_team_id?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  status: string;
};

type Lineup = {
  match_id: string;
  player_id: string;
};

// Cache em memória, populado pelo hook useStatsData (montado no App).
let matchesCache: Match[] = [];
let lineupsCache: Lineup[] = [];

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
  return matchesCache.filter(
    (m) =>
      m.status === "completed" &&
      (m.home_team_id === teamId || m.away_team_id === teamId)
  );
}

export type TeamStats = {
  played: number;
  points: number;
  maxPoints: number;
  nota: number;
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
  const playerMatches = completed.filter((m) =>
    lineupsCache.some((l) => l.match_id === m.id && l.player_id === playerId)
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

// Hook que carrega matches + lineups do Supabase para o cache global.
// Deve ser montado uma vez (no App), mas só depois de existir sessão ativa.
export function useStatsData(enabled = true) {
  const matchesQuery = useQuery({
    queryKey: ["stats-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, home_score, away_score, status");
      if (error) throw error;
      return (data || []) as Match[];
    },
    staleTime: 60_000,
    enabled,
  });

  const lineupsQuery = useQuery({
    queryKey: ["stats-lineups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("match_id, player_id");
      if (error) throw error;
      return (data || []) as Lineup[];
    },
    staleTime: 60_000,
    enabled,
  });

  useEffect(() => {
    if (matchesQuery.data) matchesCache = matchesQuery.data;
  }, [matchesQuery.data]);

  useEffect(() => {
    if (lineupsQuery.data) lineupsCache = lineupsQuery.data;
  }, [lineupsQuery.data]);
}
