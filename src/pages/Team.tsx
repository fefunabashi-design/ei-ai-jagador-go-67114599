import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, Shield, MapPin, Phone, Mail, Instagram, Calendar, Clock, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyTeams, usePlayers } from "@/hooks/useSupabaseData";
import { getTeamStats } from "@/lib/stats";
import { supabase } from "@/integrations/supabase/client";

const computeAge = (birth?: string | null): number | null => {
  if (!birth) return null;
  const bd = new Date(birth);
  if (isNaN(bd.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => (
  <div className="flex items-start gap-2.5 py-1.5">
    <Icon size={14} className="text-primary mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground truncate">{value || "—"}</p>
    </div>
  </div>
);

const TeamDetail = ({ team, onBack }: { team: any; onBack: () => void }) => {
  const { data: players = [] } = usePlayers(team.id);
  const teamStats = getTeamStats(team.id);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const userIds = (players || []).map((p: any) => p.user_id).filter(Boolean);
    if (!userIds.length) { setAvatarMap({}); return; }
    let cancelled = false;
    (async () => {
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("user_id, avatar_url")
        .in("user_id", userIds);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { if (p.user_id && p.avatar_url) map[p.user_id] = p.avatar_url; });
      setAvatarMap(map);
    })();
    return () => { cancelled = true; };
  }, [players]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Detalhes do time</p>
          <h1 className="text-xl font-display text-foreground truncate flex items-center gap-2">
            {team.name}
            <NotaBadge nota={teamStats.nota} played={teamStats.played} />
          </h1>
        </div>
      </div>

      {/* Identidade */}
      <div className="px-5 mt-3">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl">
              {team.abbreviation || team.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg text-foreground truncate flex items-center gap-2">
              {team.name}
              <NotaBadge nota={teamStats.nota} played={teamStats.played} />
            </p>
            <p className="text-[11px] text-muted-foreground">{team.abbreviation || "—"} · {team.categoria || "Sem categoria"}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {team.format || "—"} · {teamStats.points} pts em {teamStats.played} jogo(s)
            </p>
          </div>
        </div>
      </div>

      {/* Dados do time */}
      <div className="px-5 mt-4">
        <h2 className="text-xs font-display text-foreground mb-2 uppercase tracking-wider">Dados do time</h2>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <InfoRow icon={MapPin} label="Região" value={team.region} />
          <InfoRow icon={MapPin} label="Campo / endereço" value={team.field_name || team.field_address} />
          <InfoRow icon={Calendar} label="Dias de jogo" value={(team.play_days || []).join(", ")} />
          <InfoRow
            icon={Clock}
            label="Horário"
            value={team.play_time_start ? `${team.play_time_start} - ${team.play_time_end || ""}` : null}
          />
          <InfoRow icon={Calendar} label="Fundação" value={team.foundation_date} />
          <InfoRow icon={Shield} label="Grito de guerra" value={team.war_cry} />
        </div>
      </div>

      {/* Contato */}
      <div className="px-5 mt-4">
        <h2 className="text-xs font-display text-foreground mb-2 uppercase tracking-wider">Contato</h2>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <InfoRow icon={Phone} label="Telefone" value={team.phone || team.mobile} />
          <InfoRow icon={Mail} label="E-mail" value={team.email} />
          <InfoRow icon={Instagram} label="Instagram" value={team.instagram} />
          <InfoRow icon={Users} label="Presidente" value={team.president_name} />
          <InfoRow icon={Users} label="Administrador" value={team.admin_name} />
          <InfoRow icon={Users} label="Técnico" value={team.coach_name} />
        </div>
      </div>

      {/* Jogadores */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-display text-foreground uppercase tracking-wider">Jogadores cadastrados</h2>
          <span className="text-[10px] text-muted-foreground">{players.length}</span>
        </div>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {players.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado neste time.</p>
            </div>
          ) : (
            players.map((p: any) => {
              const display = (p.nickname?.trim() || `${p.name || ""} ${p.last_name || ""}`.trim() || "Jogador");
              const age = computeAge(p.birth_date);
              const avatarUrl = p.user_id ? avatarMap[p.user_id] : undefined;
              const initial = (display[0] || "?").toUpperCase();
              return (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={display} />}
                  <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{display}</p>
                  {age !== null && (
                    <p className="text-[11px] text-muted-foreground">{age} anos</p>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Visualização somente leitura. Cadastros e alterações são feitos pelo Admin.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

const MyTeamsPage = () => {
  const navigate = useNavigate();
  const { data: myTeams = [] } = useMyTeams();
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  if (selectedTeam) {
    return <TeamDetail team={selectedTeam} onBack={() => setSelectedTeam(null)} />;
  }

  const handleSelect = (team: any) => {
    setSelectedTeam(team);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Configurações</p>
          <h1 className="text-xl font-display text-foreground truncate">MEUS TIMES</h1>
        </div>
      </div>

      <div className="px-5 pt-2 pb-4">
        <p className="text-sm text-muted-foreground">
          Times em que você joga. Toque para ver os detalhes.
        </p>
      </div>

      <div className="px-5 space-y-2">
        {myTeams.length === 0 ? (
          <div className="bg-card rounded-xl border border-border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não está incluído em nenhum time.
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              O cadastro de times e jogadores é feito pelo Admin do time.
            </p>
          </div>
        ) : (
          myTeams.map((team: any, i: number) => {
            return (
              <motion.button
                key={team.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(team)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border bg-card border-border hover:border-primary/30 transition-colors text-left"
              >
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-12 h-12 rounded-xl object-cover border border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-lg shrink-0">
                    {team.abbreviation || team.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {team.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {team.categoria || "Sem categoria"} · {team.region || "Sem região"}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </motion.button>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyTeamsPage;
