import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, UserPlus, Plus, Plane, Briefcase, Cross, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Reason = "machucado" | "viagem" | "trabalho";

interface Props {
  matchId: string;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reasonMeta: Record<Reason, { label: string; Icon: any; className: string }> = {
  machucado: { label: "Machucado", Icon: Cross, className: "text-red-500" },
  viagem: { label: "Viagem", Icon: Plane, className: "text-blue-500" },
  trabalho: { label: "Trabalho", Icon: Briefcase, className: "text-amber-500" },
};

const MatchConfirmationList = ({ matchId, teamId, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAbsenceReason, setShowAbsenceReason] = useState(false);
  const [guestInputOpen, setGuestInputOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: players = [] } = useQuery({
    queryKey: ["confirmation-players", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, nickname, display_name, user_id")
        .eq("team_id", teamId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!teamId,
  });

  const { data: lineups = [], refetch: refetchLineups } = useQuery({
    queryKey: ["confirmation-lineups", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_lineups")
        .select("id, player_id, status, absence_reason")
        .eq("match_id", matchId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!matchId,
  });

  const { data: guests = [], refetch: refetchGuests } = useQuery({
    queryKey: ["confirmation-guests", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_guests")
        .select("id, name, inviter_name, invited_by")
        .eq("match_id", matchId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!matchId,
  });

  useEffect(() => {
    if (!open || !matchId) return;
    const ch = supabase
      .channel(`confirmation-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${matchId}` }, () => refetchLineups())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_guests", filter: `match_id=eq.${matchId}` }, () => refetchGuests())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, matchId, refetchLineups, refetchGuests]);

  const myPlayer = useMemo(() => players.find((p: any) => p.user_id === userId), [players, userId]);
  const myLineup = useMemo(() => lineups.find((l: any) => l.player_id === myPlayer?.id), [lineups, myPlayer]);

  const lineupByPlayer = useMemo(() => {
    const m = new Map<string, any>();
    lineups.forEach((l: any) => m.set(l.player_id, l));
    return m;
  }, [lineups]);

  const confirmedPlayers = players.filter((p: any) => lineupByPlayer.get(p.id)?.status === "confirmed");
  const absentPlayers = players.filter((p: any) => lineupByPlayer.get(p.id)?.status === "absent");
  const pendingPlayers = players.filter((p: any) => !lineupByPlayer.has(p.id));

  const setStatus = useMutation({
    mutationFn: async ({ status, reason }: { status: "confirmed" | "absent"; reason?: Reason | null }) => {
      if (!myPlayer) throw new Error("Você não é jogador desse time.");
      const payload: any = {
        match_id: matchId,
        player_id: myPlayer.id,
        status,
        absence_reason: status === "absent" ? reason ?? null : null,
      };
      const { error } = await supabase
        .from("match_lineups")
        .upsert(payload, { onConflict: "match_id,player_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchLineups();
      qc.invalidateQueries({ queryKey: ["confirmation-lineups", matchId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const addGuest = useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error("Faça login para adicionar convidados.");
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();
      const { error } = await supabase
        .from("match_guests")
        .insert({
          match_id: matchId,
          name: name.trim(),
          invited_by: userId,
          inviter_name: prof?.display_name ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setGuestName("");
      setGuestInputOpen(false);
      refetchGuests();
      toast({ title: "Convidado adicionado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeGuest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("match_guests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchGuests(),
  });

  const playerLabel = (p: any) => p.nickname || p.display_name || p.name || "Jogador";

  const handleConfirm = () => {
    setShowAbsenceReason(false);
    setStatus.mutate({ status: "confirmed" });
  };
  const handleAbsentClick = () => setShowAbsenceReason(true);
  const pickReason = (r: Reason) => {
    setStatus.mutate({ status: "absent", reason: r });
    setShowAbsenceReason(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmações da partida</DialogTitle>
        </DialogHeader>

        {!myPlayer && (
          <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
            Você não está cadastrado como jogador deste time, mas pode adicionar convidados.
          </div>
        )}

        {/* Ações do usuário */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={myLineup?.status === "confirmed" ? "default" : "outline"}
              className={myLineup?.status === "confirmed" ? "bg-green-600 hover:bg-green-700" : ""}
              disabled={!myPlayer || setStatus.isPending}
              onClick={handleConfirm}
            >
              <Check className="w-4 h-4 mr-1" /> Confirmado
            </Button>
            <Button
              variant={myLineup?.status === "absent" ? "default" : "outline"}
              className={myLineup?.status === "absent" ? "bg-red-600 hover:bg-red-700" : ""}
              disabled={!myPlayer || setStatus.isPending}
              onClick={handleAbsentClick}
            >
              <X className="w-4 h-4 mr-1" /> Ausente
            </Button>
            <Button variant="outline" onClick={() => setGuestInputOpen((v) => !v)}>
              <UserPlus className="w-4 h-4 mr-1" /> Convidado
            </Button>
          </div>

          {showAbsenceReason && (
            <div className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-muted/30">
              {(Object.keys(reasonMeta) as Reason[]).map((r) => {
                const { label, Icon, className } = reasonMeta[r];
                return (
                  <Button key={r} variant="outline" size="sm" onClick={() => pickReason(r)}>
                    <Icon className={`w-4 h-4 mr-1 ${className}`} /> {label}
                  </Button>
                );
              })}
            </div>
          )}

          {guestInputOpen && (
            <div className="flex gap-2">
              <Input
                placeholder="Nome do convidado"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && guestName.trim()) addGuest.mutate(guestName);
                }}
              />
              <Button
                size="sm"
                disabled={!guestName.trim() || addGuest.isPending}
                onClick={() => addGuest.mutate(guestName)}
              >
                {addGuest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Três colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Column title="Jogadores" count={pendingPlayers.length} tone="neutral">
            {pendingPlayers.map((p: any) => (
              <Row key={p.id} label={playerLabel(p)} />
            ))}
            {pendingPlayers.length === 0 && <Empty text="Todos responderam" />}
          </Column>

          <Column title="Confirmados" count={confirmedPlayers.length + guests.length} tone="success">
            {confirmedPlayers.map((p: any) => (
              <Row key={p.id} label={playerLabel(p)} icon={<Check className="w-3 h-3 text-green-600" />} />
            ))}
            {guests.map((g: any) => (
              <Row
                key={g.id}
                label={g.name}
                badge="Convidado"
                hint={g.inviter_name ? `por ${g.inviter_name}` : undefined}
                onRemove={g.invited_by === userId ? () => removeGuest.mutate(g.id) : undefined}
              />
            ))}
            {confirmedPlayers.length === 0 && guests.length === 0 && <Empty text="Ninguém confirmado" />}
          </Column>

          <Column title="Ausentes" count={absentPlayers.length} tone="danger">
            {absentPlayers.map((p: any) => {
              const reason = lineupByPlayer.get(p.id)?.absence_reason as Reason | undefined;
              const meta = reason ? reasonMeta[reason] : null;
              return (
                <Row
                  key={p.id}
                  label={playerLabel(p)}
                  icon={meta ? <meta.Icon className={`w-3 h-3 ${meta.className}`} /> : undefined}
                  hint={meta?.label}
                />
              );
            })}
            {absentPlayers.length === 0 && <Empty text="Ninguém ausente" />}
          </Column>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Column = ({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "neutral" | "success" | "danger";
  children: React.ReactNode;
}) => {
  const toneClass =
    tone === "success" ? "border-green-500/40 bg-green-500/5" :
    tone === "danger" ? "border-red-500/40 bg-red-500/5" :
    "border-border bg-muted/30";
  return (
    <div className={`rounded-md border p-2 ${toneClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">{title}</span>
        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
      </div>
      <ScrollArea className="max-h-60 pr-2">
        <div className="space-y-1">{children}</div>
      </ScrollArea>
    </div>
  );
};

const Row = ({
  label,
  icon,
  badge,
  hint,
  onRemove,
}: {
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  hint?: string;
  onRemove?: () => void;
}) => (
  <div className="flex items-center justify-between gap-2 text-xs bg-background/60 rounded px-2 py-1">
    <div className="flex items-center gap-1 min-w-0">
      {icon}
      <span className="truncate">{label}</span>
      {badge && <Badge variant="outline" className="text-[9px] ml-1">{badge}</Badge>}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="text-[10px] text-muted-foreground italic px-1 py-2">{text}</div>
);

export default MatchConfirmationList;
