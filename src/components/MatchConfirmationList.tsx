import { useEffect, useMemo, useState } from "react";
import { Check, X, HeartPulse, Plane, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMatchSummons, useCreateSummons } from "@/hooks/useSupabaseData";
import { cn } from "@/lib/utils";

interface Props {
  matchId: string;
  teamId?: string;
}

type PlayerRow = {
  id: string;
  user_id?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  nickname?: string | null;
};

type ProfileRow = {
  display_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  phone?: string | null;
} | null;

type SummonRow = {
  player_id: string;
  status?: "confirmed" | "declined" | "pending" | null;
  absence_reason?: string | null;
};

const getInitials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const REASONS = [
  { id: "injured", label: "Machucado", icon: HeartPulse },
  { id: "travel", label: "Viagem", icon: Plane },
  { id: "work", label: "Trabalho", icon: Briefcase },
];

const reasonOf = (r?: string | null) => REASONS.find((x) => x.id === r);

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const onlyDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

const findMyPlayer = (rows: PlayerRow[], uid?: string, email?: string | null, profile?: ProfileRow) => {
  const linked = rows.find((p) => p.user_id === uid);
  if (linked) return linked;

  const authEmail = normalizeText(email);
  const profilePhone = onlyDigits(profile?.phone);
  const profileFirst = normalizeText(profile?.display_name);
  const profileLast = normalizeText(profile?.last_name);
  const profileNickname = normalizeText(profile?.nickname);
  const profileFull = normalizeText([profile?.display_name, profile?.last_name].filter(Boolean).join(" "));

  let best: PlayerRow | null = null;
  let bestScore = 0;

  for (const player of rows) {
    let score = 0;
    const playerEmail = normalizeText(player.email);
    const playerPhone = onlyDigits(player.phone);
    const playerName = normalizeText(player.name);
    const playerLast = normalizeText(player.last_name);
    const playerDisplay = normalizeText(player.display_name);
    const playerNickname = normalizeText(player.nickname);
    const playerFull = normalizeText([player.name, player.last_name].filter(Boolean).join(" "));

    if (authEmail && playerEmail === authEmail) score += 30;
    if (profilePhone && playerPhone === profilePhone) score += 25;
    if (profileNickname && (playerNickname === profileNickname || playerDisplay === profileNickname)) score += 25;
    if (profileFirst && (playerName === profileFirst || playerDisplay === profileFirst)) score += 15;
    if (profileLast && playerLast === profileLast) score += 10;
    if (profileFull && playerFull === profileFull) score += 25;

    if (score > bestScore) {
      best = player;
      bestScore = score;
    }
  }

  return bestScore >= 30 ? best : null;
};

const MatchConfirmationList = ({ matchId, teamId }: Props) => {
  const { data: summons = [] } = useMatchSummons(matchId);
  const createSummon = useCreateSummons();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [pickReason, setPickReason] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLookupDone(false);
      setMyPlayerId(null);
      if (!teamId) { setLookupDone(true); return; }
      const { data = [] } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("name", { ascending: true });
      if (!alive) return;
      setPlayers(data || []);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name,last_name,nickname,phone")
          .eq("user_id", uid)
          .maybeSingle();
        if (!alive) return;
        const mine = findMyPlayer((data || []) as PlayerRow[], uid, auth?.user?.email, profile as ProfileRow);
        setMyPlayerId(mine?.id || null);
      }
      setLookupDone(true);
    })();
    return () => { alive = false; };
  }, [teamId]);

  const summonByPlayer = useMemo(() => {
    const m: Record<string, SummonRow> = {};
    for (const s of summons as SummonRow[]) m[s.player_id] = s;
    return m;
  }, [summons]);

  const mySummon = myPlayerId ? summonByPlayer[myPlayerId] : null;
  const myStatus: "confirmed" | "declined" | "pending" = mySummon?.status || "pending";

  const handleMine = async (status: "confirmed" | "declined", absenceReason?: string | null) => {
    if (!myPlayerId) return;
    await createSummon.mutateAsync({ matchId, playerId: myPlayerId, status, absenceReason });
    if (status === "confirmed" || absenceReason !== undefined) setPickReason(false);
  };

  const confirmedList = players.filter((p) => summonByPlayer[p.id]?.status === "confirmed");
  const declinedList = players.filter((p) => summonByPlayer[p.id]?.status === "declined");

  if (!teamId) {
    return <p className="text-xs text-muted-foreground text-center py-6">Time não encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-secondary/60 rounded-2xl p-3 border border-border/50">
        {lookupDone && !myPlayerId && (
          <p className="text-[11px] text-warning mb-2">
            Seu perfil não está vinculado a um jogador deste time.
          </p>
        )}
          <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Minha presença
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleMine("confirmed")}
              disabled={createSummon.isPending}
              className={cn(
                "h-11 text-sm font-semibold border",
                myStatus === "confirmed"
                  ? "bg-success text-white border-success hover:bg-success/90"
                  : "bg-success/10 text-success border-success/30 hover:bg-success/20",
              )}
            >
              <Check size={16} className="mr-1.5" /> Confirmado
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (myStatus !== "declined") handleMine("declined", null);
                setPickReason((v) => !v || myStatus !== "declined");
              }}
              disabled={createSummon.isPending}
              className={cn(
                "h-11 text-sm font-semibold",
                myStatus === "declined" &&
                  "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
              )}
            >
              <X size={16} className="mr-1.5" /> Ausente
            </Button>
          </div>

          {(pickReason || (myStatus === "declined" && !mySummon?.absence_reason)) && (
            <div className="mt-3">
              <p className="text-[11px] text-muted-foreground mb-1.5">Motivo da ausência:</p>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => {
                  const Icon = r.icon;
                  const active = mySummon?.absence_reason === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleMine("declined", r.id)}
                      disabled={createSummon.isPending}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/40",
                      )}
                    >
                      <Icon size={12} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>



      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/40 rounded-2xl p-3 border border-success/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Check size={14} className="text-success" />
            <p className="text-xs font-bold text-success">
              Confirmados <span className="text-muted-foreground font-semibold">({confirmedList.length})</span>
            </p>
          </div>
          <div className="space-y-1.5">
            {confirmedList.length === 0 && (
              <p className="text-[11px] text-muted-foreground py-2">Nenhum ainda</p>
            )}
            {confirmedList.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center text-[10px] font-bold text-success shrink-0">
                  {getInitials(p.name)}
                </div>
                <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary/40 rounded-2xl p-3 border border-destructive/20">
          <div className="flex items-center gap-1.5 mb-2">
            <X size={14} className="text-destructive" />
            <p className="text-xs font-bold text-destructive">
              Ausentes <span className="text-muted-foreground font-semibold">({declinedList.length})</span>
            </p>
          </div>
          <div className="space-y-1.5">
            {declinedList.length === 0 && (
              <p className="text-[11px] text-muted-foreground py-2">Nenhum ainda</p>
            )}
            {declinedList.map((p) => {
              const r = reasonOf(summonByPlayer[p.id]?.absence_reason);
              const Icon = r?.icon;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center text-[10px] font-bold text-destructive shrink-0">
                    {getInitials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    {r && Icon && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Icon size={10} /> {r.label}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchConfirmationList;
