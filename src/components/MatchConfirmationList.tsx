import { useEffect, useMemo, useState } from "react";
import { Check, X, Plus, Plane, Briefcase, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useMatchSummons, useCreateSummons } from "@/hooks/useSupabaseData";
import { toast } from "@/hooks/use-toast";
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

type GuestRow = {
  id: string;
  name: string;
  inviter_name: string | null;
  invited_by: string;
};

const getInitials = (name: string) => {
  const parts = (name || "").trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Cruz vermelha (médica) representada por dois traços; usamos um SVG inline
const RedCross = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
  </svg>
);

const REASONS = [
  { id: "injured", label: "Machucado", icon: (p: { size?: number }) => <RedCross size={p.size} /> },
  { id: "travel", label: "Viagem", icon: Plane },
  { id: "work", label: "Trabalho", icon: Briefcase },
] as const;

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
  const [myInviterName, setMyInviterName] = useState<string>("");
  const [lookupDone, setLookupDone] = useState(false);
  const [pickReason, setPickReason] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [savingGuest, setSavingGuest] = useState(false);

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
        const inviter =
          (profile?.nickname && profile.nickname.trim()) ||
          (profile?.display_name && profile.display_name.trim()) ||
          (mine?.nickname && mine.nickname.trim()) ||
          (mine?.name && mine.name.trim()) ||
          (auth?.user?.email ?? "");
        setMyInviterName(inviter);
      }
      setLookupDone(true);
    })();
    return () => { alive = false; };
  }, [teamId]);

  const loadGuests = async () => {
    const { data = [] } = await supabase
      .from("match_guests")
      .select("id,name,inviter_name,invited_by")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    setGuests((data || []) as GuestRow[]);
  };

  useEffect(() => {
    loadGuests();
    const channel = supabase
      .channel(`match_guests:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_guests", filter: `match_id=eq.${matchId}` }, () => loadGuests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

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

  const handleAddGuest = async () => {
    const name = guestName.trim();
    if (!name) return;
    setSavingGuest(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { setSavingGuest(false); return; }
    const { error } = await supabase.from("match_guests").insert({
      match_id: matchId,
      name,
      invited_by: uid,
      inviter_name: myInviterName || null,
    });
    setSavingGuest(false);
    if (error) {
      toast({ title: "Erro ao adicionar convidado", description: error.message, variant: "destructive" });
      return;
    }
    setGuestName("");
    setGuestOpen(false);
    loadGuests();
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
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => { setGuestOpen(false); setPickReason(false); handleMine("confirmed"); }}
            disabled={createSummon.isPending || !myPlayerId}
            className={cn(
              "h-11 text-xs font-semibold border px-2",
              myStatus === "confirmed"
                ? "bg-success text-white border-success hover:bg-success/90"
                : "bg-success/10 text-success border-success/30 hover:bg-success/20",
            )}
          >
            <Check size={14} className="mr-1" /> Confirmado
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setGuestOpen(false);
              if (myStatus !== "declined") handleMine("declined", null);
              setPickReason((v) => !v || myStatus !== "declined");
            }}
            disabled={createSummon.isPending || !myPlayerId}
            className={cn(
              "h-11 text-xs font-semibold px-2",
              myStatus === "declined" &&
                "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
            )}
          >
            <X size={14} className="mr-1" /> Ausente
          </Button>
          <Button
            variant="outline"
            onClick={() => { setPickReason(false); setGuestOpen((v) => !v); }}
            className={cn(
              "h-11 text-xs font-semibold px-2",
              guestOpen && "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
            )}
          >
            <UserPlus size={14} className="mr-1" /> Convidado
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
                      r.id === "injured" && !active && "text-destructive",
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

        {guestOpen && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">Nome do convidado:</p>
            <div className="flex gap-2">
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: João Silva"
                className="h-9 bg-background"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddGuest(); }}
              />
              <Button
                onClick={handleAddGuest}
                disabled={!guestName.trim() || savingGuest}
                className="h-9 px-3 bg-gradient-primary text-primary-foreground border-0"
              >
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pendentes - lista vertical entre os botões e as colunas */}
      {(() => {
        const pendingList = players.filter((p) => {
          const s = summonByPlayer[p.id]?.status;
          return s !== "confirmed" && s !== "declined";
        });
        if (pendingList.length === 0) return null;
        return (
          <div className="bg-secondary/40 rounded-2xl p-3 border border-border/40">
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={14} className="text-foreground" />
              <p className="text-xs font-bold text-foreground">
                Aguardando confirmação <span className="text-muted-foreground font-semibold">({pendingList.length})</span>
              </p>
            </div>
            <div className="space-y-1.5">
              {pendingList.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {getInitials(p.name || "")}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-2">
        {/* Confirmados (jogadores + convidados) */}
        <div className="bg-secondary/40 rounded-2xl p-3 border border-success/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Check size={14} className="text-success" />
            <p className="text-xs font-bold text-success">
              Confirmados <span className="text-muted-foreground font-semibold">({confirmedList.length + guests.length})</span>
            </p>
          </div>
          <div className="space-y-1.5">
            {confirmedList.length === 0 && guests.length === 0 && (
              <p className="text-[11px] text-muted-foreground py-2">Nenhum ainda</p>
            )}
            {confirmedList.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center text-[10px] font-bold text-success shrink-0">
                  {getInitials(p.name || "")}
                </div>
                <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
              </div>
            ))}
            {guests.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {getInitials(g.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {g.name}
                    {g.inviter_name && (
                      <span className="text-muted-foreground font-normal"> ({g.inviter_name})</span>
                    )}
                  </p>
                  <p className="text-[9px] text-primary uppercase tracking-wide font-bold">Convidado</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ausentes */}
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
                    {getInitials(p.name || "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    {r && Icon && (
                      <p className={cn(
                        "text-[10px] flex items-center gap-1",
                        r.id === "injured" ? "text-destructive" : "text-muted-foreground",
                      )}>
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
