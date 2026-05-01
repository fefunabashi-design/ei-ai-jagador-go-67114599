import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, MapPin, Phone, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import { mockDb } from "@/lib/mockDb";

const OpponentDetails = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const matchId = params.get("matchId") || "";

  const match = useMemo(() => (matchId ? mockDb.getMatch(matchId) : null), [matchId]);
  const myTeam = mockDb.getTeam();

  // Determine opponent: the team in the match that is NOT myTeam
  const homeTeam = match?.home_team as any;
  const awayTeam = match?.away_team as any;
  const opponentRef =
    myTeam && homeTeam?.id === myTeam.id ? awayTeam : myTeam && awayTeam?.id === myTeam.id ? homeTeam : awayTeam;

  // Resolve full opponent record from the registered teams (to get address, phone, etc.)
  const allTeams = mockDb.getAllTeams();
  const opponent = (opponentRef?.id && allTeams.find((t: any) => t.id === opponentRef.id)) || opponentRef || null;

  const opponentPlayers = opponent?.id ? mockDb.getPlayers(opponent.id) : [];
  const summons = matchId ? mockDb.getSummons(matchId) : [];
  const opponentPlayerIds = new Set(opponentPlayers.map((p: any) => p.id));
  const confirmedOpponents = summons
    .filter((s: any) => s.status === "confirmed" && opponentPlayerIds.has(s.player_id))
    .map((s: any) => opponentPlayers.find((p: any) => p.id === s.player_id))
    .filter(Boolean);

  const fullAddress = opponent
    ? [
        opponent.addr_rua && `${opponent.addr_rua}${opponent.addr_numero ? ", " + opponent.addr_numero : ""}`,
        opponent.addr_bairro,
        opponent.addr_cidade && `${opponent.addr_cidade}${opponent.addr_uf ? " - " + opponent.addr_uf : ""}`,
        opponent.addr_cep && `CEP ${opponent.addr_cep}`,
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
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
                Confirmados ({confirmedOpponents.length})
              </TabsTrigger>
            </TabsList>

            {/* Team data */}
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
                    <p className="font-display text-lg text-foreground">{(opponent.name || "Adversário").toUpperCase()}</p>
                    {opponent.categoria && (
                      <p className="text-[11px] text-muted-foreground">{opponent.categoria}{opponent.region ? ` · ${opponent.region}` : ""}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Nome do time</p>
                    <p className="text-foreground">{opponent.name || "—"}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      <MapPin size={11} /> Endereço do campo
                    </p>
                    <p className="text-foreground">{fullAddress || "Endereço não informado"}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
                      <Phone size={11} /> Telefone do campo
                    </p>
                    <p className="text-foreground">{opponent.phone || opponent.mobile || "Não informado"}</p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* Confirmed players */}
            <TabsContent value="players" className="mt-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Jogadores confirmados ({confirmedOpponents.length})
                  </h3>
                </div>
                {confirmedOpponents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum jogador adversário confirmou presença ainda.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {confirmedOpponents.map((p: any) => (
                      <li
                        key={p.id}
                        className="text-sm text-foreground bg-success/5 border border-success/20 rounded-lg px-3 py-2"
                      >
                        {p.nickname?.trim() || p.name || "Jogador"}
                      </li>
                    ))}
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
