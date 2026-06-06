import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, MapPin, Phone, Users, UserCog, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { getTeamStats, getPlayerStats } from "@/lib/stats";
import { supabase } from "@/integrations/supabase/client";
import { useMyTeam } from "@/hooks/useSupabaseData";

const OpponentDetails = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const matchId = params.get("matchId") || "";
  const teamIdParam = params.get("teamId") || "";

  const [match, setMatch] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [opponentPlayers, setOpponentPlayers] = useState<any[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const { data: myTeam } = useMyTeam();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let opp: any = null;
      if (teamIdParam) {
        const { data: full } = await supabase.from("public_teams").select("*").eq("id", teamIdParam).maybeSingle();
        opp = full;
      } else if (matchId) {
        const { data: m } = await supabase
          .from("matches")
          .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
          .eq("id", matchId).maybeSingle();
        if (cancelled) return;
        setMatch(m);
        const home = (m as any)?.home_team;
        const away = (m as any)?.away_team;
        if (myTeam && home?.id === myTeam.id) opp = away;
        else if (myTeam && away?.id === myTeam.id) opp = home;
        else opp = away || home;
        if (opp?.id) {
          const { data: full } = await supabase.from("public_teams").select("*").eq("id", opp.id).maybeSingle();
          if (full) opp = full;
        }
      }
      if (opp?.id) {
        const { data: pls } = await supabase.from("public_players" as any).select("*").eq("team_id", opp.id);
        if (!cancelled) setOpponentPlayers(pls || []);
        const userIds = (pls || []).map((p: any) => p.user_id).filter(Boolean);
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("public_profiles")
            .select("user_id, avatar_url")
            .in("user_id", userIds);
          if (!cancelled) {
            const map: Record<string, string> = {};
            (profs || []).forEach((p: any) => { if (p.user_id && p.avatar_url) map[p.user_id] = p.avatar_url; });
            setAvatarMap(map);
          }
        }
      }
      if (!cancelled) setOpponent(opp);
    })();
    return () => { cancelled = true; };
  }, [matchId, teamIdParam, myTeam?.id]);

  const activePlayers = opponentPlayers;

  const addressParts = [
    opponent?.field_address,
    [opponent?.addr_rua, opponent?.addr_numero].filter(Boolean).join(", "),
    opponent?.addr_bairro,
    [opponent?.addr_cidade, opponent?.addr_uf].filter(Boolean).join(" - "),
    opponent?.addr_cep,
  ].filter((s) => s && String(s).trim().length > 0);
  const fullAddress = addressParts.join(" · ");

  const InfoRow = ({ icon: Icon, label, value }: any) => (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
        {Icon && <Icon size={11} />} {label}
      </p>
      <p className="text-foreground">{value && String(value).trim().length ? value : "Não informado"}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <button
          onClick={() => {
            // Quando veio da lista de times (link direto via teamId), volta para /times
            // preservando os filtros salvos. Caso contrário, usa o histórico.
            if (teamIdParam) navigate("/times");
            else navigate(-1);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-2"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <h1 className="text-3xl text-foreground font-display">DETALHAR TIME</h1>
        {match && (
          <p className="text-xs text-muted-foreground mt-1">
            Adversário do jogo {new Date(match.match_date).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      <div className="px-5">
        {!opponent ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Adversário ainda não definido para esta partida.</p>
          </div>
        ) : (
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="w-full bg-secondary">
              <TabsTrigger value="team" className="flex-1 text-xs">Dados do Time</TabsTrigger>
              <TabsTrigger value="players" className="flex-1 text-xs">
                Jogadores ({activePlayers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="mt-4">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-4">
                  {opponent.logo_url ? (
                    <img src={opponent.logo_url} alt="Escudo" className="w-14 h-14 rounded-2xl object-cover border border-border" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Shield size={22} className="text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-display text-lg text-foreground flex items-center gap-2">
                      <span>{(opponent.name || "Adversário").toUpperCase()}</span>
                      {opponent.id && (() => { const s = getTeamStats(opponent.id); return <NotaBadge nota={s.nota} played={s.played} />; })()}
                    </p>
                    {opponent.categoria && (
                      <p className="text-[11px] text-muted-foreground">{opponent.categoria}{opponent.region ? ` · ${opponent.region}` : ""}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <InfoRow label="Nome do time" value={opponent.name} />
                  <InfoRow label="Subcategoria" value={opponent.sub_categoria} />
                  <InfoRow label={opponent.has_field ? "Nome do campo" : "Nome da sede"} value={opponent.field_name} />
                  <InfoRow icon={MapPin} label={opponent.has_field ? "Endereço do campo" : "Endereço da sede"} value={fullAddress} />
                  <InfoRow icon={Phone} label="Telefone do campo" value={opponent.phone} />
                  <InfoRow icon={UserCog} label="Nome do técnico" value={opponent.coach_name} />
                  <InfoRow icon={User} label="Admin do app" value={opponent.admin_name} />
                  <InfoRow icon={Phone} label="Celular do admin" value={opponent.admin_phone} />
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="players" className="mt-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Jogadores ativos ({activePlayers.length})
                  </h3>
                </div>
                {activePlayers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum jogador cadastrado neste time.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activePlayers.map((p: any) => {
                      const ps = opponent?.id ? getPlayerStats(p.id, opponent.id) : { nota: 0, played: 0 };
                      const display = p.nickname?.trim() || p.name || "Jogador";
                      const avatarUrl = p.user_id ? avatarMap[p.user_id] : undefined;
                      const initial = (display[0] || "?").toUpperCase();
                      return (
                        <li
                          key={p.id}
                          className="text-sm text-foreground bg-secondary/40 border border-border rounded-lg px-3 py-2 flex items-center gap-3"
                        >
                          <Avatar className="w-8 h-8">
                            {avatarUrl && <AvatarImage src={avatarUrl} alt={display} />}
                            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                          </Avatar>
                          <span className="truncate flex-1">{display}</span>
                          <NotaBadge nota={ps.nota} played={ps.played} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default OpponentDetails;
