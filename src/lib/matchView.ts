// Helper para interpretar uma partida do ponto de vista de UM time.
// Como cada lado agora finaliza independentemente e pode esconder a partida
// da própria agenda, qualquer tela que mostra estado/placar deve passar pelo
// `getMatchView(match, myTeamId)` em vez de ler `match.status`/`home_score`
// diretamente.

export type MatchViewStatus = "open" | "confirmed" | "cancelled" | "completed";

export interface MatchView {
  status: MatchViewStatus;
  rawStatus: string;
  isFinalizedByMe: boolean;
  isFinalizedByOpponent: boolean;
  isFinalizedAny: boolean;
  isCancelled: boolean;
  isHiddenForMe: boolean;
  mySide: "home" | "away" | null;
  // Placar "oficial" exibido (do meu lado se eu finalizei, senão do adversário, senão legacy)
  homeScore: number | null;
  awayScore: number | null;
  // Reports brutos
  myReportedHomeScore: number | null;
  myReportedAwayScore: number | null;
  opponentReportedHomeScore: number | null;
  opponentReportedAwayScore: number | null;
  hasScoreConflict: boolean;
}

export function getMatchView(match: any, myTeamId?: string | null): MatchView {
  const mySide: "home" | "away" | null = myTeamId
    ? match?.home_team_id === myTeamId
      ? "home"
      : match?.away_team_id === myTeamId
        ? "away"
        : null
    : null;

  const homeFin = !!match?.home_finalized_at;
  const awayFin = !!match?.away_finalized_at;
  const isFinalizedByMe = mySide === "home" ? homeFin : mySide === "away" ? awayFin : false;
  const isFinalizedByOpponent = mySide === "home" ? awayFin : mySide === "away" ? homeFin : false;

  const myHs = mySide === "home"
    ? match?.home_reported_home_score
    : mySide === "away"
      ? match?.away_reported_home_score
      : null;
  const myAs = mySide === "home"
    ? match?.home_reported_away_score
    : mySide === "away"
      ? match?.away_reported_away_score
      : null;
  const oppHs = mySide === "home"
    ? match?.away_reported_home_score
    : mySide === "away"
      ? match?.home_reported_home_score
      : null;
  const oppAs = mySide === "home"
    ? match?.away_reported_away_score
    : mySide === "away"
      ? match?.home_reported_away_score
      : null;

  const homeScore: number | null = myHs ?? oppHs ?? match?.home_score ?? null;
  const awayScore: number | null = myAs ?? oppAs ?? match?.away_score ?? null;

  const rawStatus: string = match?.status ?? "open";
  const isCancelled = rawStatus === "cancelled";
  const isFinalizedAny = isFinalizedByMe || isFinalizedByOpponent;

  let status: MatchViewStatus;
  if (isCancelled) status = "cancelled";
  else if (isFinalizedAny || rawStatus === "completed") status = "completed";
  else if (rawStatus === "confirmed") status = "confirmed";
  else status = "open";

  const isHiddenForMe = mySide === "home"
    ? !!match?.home_hidden
    : mySide === "away"
      ? !!match?.away_hidden
      : false;

  const hasScoreConflict =
    myHs != null && oppHs != null && (myHs !== oppHs || myAs !== oppAs);

  return {
    status,
    rawStatus,
    isFinalizedByMe,
    isFinalizedByOpponent,
    isFinalizedAny,
    isCancelled,
    isHiddenForMe,
    mySide,
    homeScore,
    awayScore,
    myReportedHomeScore: myHs ?? null,
    myReportedAwayScore: myAs ?? null,
    opponentReportedHomeScore: oppHs ?? null,
    opponentReportedAwayScore: oppAs ?? null,
    hasScoreConflict,
  };
}
