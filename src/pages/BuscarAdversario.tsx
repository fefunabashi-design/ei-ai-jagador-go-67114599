import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Shield, AlertTriangle, Building2, Calendar as CalIcon, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { getTeamStats } from "@/lib/stats";
import { useMyTeam, useCreateMatch } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForUf } from "@/lib/brCities";

const CATEGORIAS = ["Esporte", "35+", "40+", "45+", "50+", "60+"];
const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];

const WEEK_DAY_LABEL: Record<string, string> = {
  domingo: "Domingo", segunda: "Segunda", terca: "Terça", quarta: "Quarta",
  quinta: "Quinta", sexta: "Sexta", sabado: "Sábado",
};
const DAY_INDEX: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

const BuscarAdversarioPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: myTeam } = useMyTeam();
  const createMatch = useCreateMatch();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showCitySuggest, setShowCitySuggest] = useState(false);
  const [showNameSuggest, setShowNameSuggest] = useState(false);
  const [challengeTeam, setChallengeTeam] = useState<any | null>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [challengeTime, setChallengeTime] = useState("");
  const [locationChoice, setLocationChoice] = useState<"own" | "away">("away");
  const [challengeLocation, setChallengeLocation] = useState("");
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [newMatchOpponent, setNewMatchOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchTime, setNewMatchTime] = useState("");
  const [newMatchLocation, setNewMatchLocation] = useState("");

  // Pré-popular filtros com o cadastro do meu time
  useEffect(() => {
    if (!myTeam) return;
    const t = myTeam as any;
    if (t.addr_cidade) setCityQuery(t.addr_cidade);
    if (t.categoria) setSelectedCategories([t.categoria]);
    if (t.region) setSelectedRegions([t.region]);
    if (t.play_time_start) setTimeFrom(t.play_time_start);
    if (t.play_time_end) setTimeTo(t.play_time_end);
  }, [myTeam]);

  const opponentReady = (t: any) =>
    !!t && !!t.name && !!t.addr_cidade && !!t.addr_uf && !!t.field_address &&
    Array.isArray(t.play_days) && t.play_days.length > 0 && !!t.play_time_start;

  const isDateAllowed = (dateStr: string, allowedDays: string[]) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T12:00:00");
    return allowedDays.some((day) => DAY_INDEX[day] === d.getDay());
  };

  const handleConfirmChallenge = async () => {
    if (!myTeam || !challengeTeam) return;
    if (!challengeDate) { toast({ title: "Informe a data", variant: "destructive" }); return; }
    if (!challengeTime) { toast({ title: "Informe o horário", variant: "destructive" }); return; }
    if (Array.isArray(challengeTeam.play_days) && challengeTeam.play_days.length > 0) {
      if (!isDateAllowed(challengeDate, challengeTeam.play_days)) {
        toast({
          title: "Data inválida",
          description: `Adversário só joga: ${challengeTeam.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }
    const fallbackLocation = locationChoice === "own"
      ? ((myTeam as any).field_address || (myTeam as any).field_name || "Campo do mandante")
      : (challengeTeam.field_address || challengeTeam.field_name || "Campo do adversário");
    const location = challengeLocation.trim() || fallbackLocation;
    const match_date = new Date(`${challengeDate}T${challengeTime}`).toISOString();
    await createMatch.mutateAsync({
      home_team_id: locationChoice === "own" ? myTeam.id : challengeTeam.id,
      away_team_id: locationChoice === "own" ? challengeTeam.id : myTeam.id,
      match_date,
      location,
      status: "open",
      format: challengeTeam.format || (myTeam as any).format || "8x8",
    });
    toast({ title: "Desafio enviado!", description: `${challengeTeam.name} foi convidado.` });
    setChallengeTeam(null);
    setChallengeDate(""); setChallengeTime(""); setLocationChoice("away"); setChallengeLocation("");
    navigate("/agenda");
  };

  const handleCreateNewMatch = async () => {
    if (!myTeam) return;
    if (!newMatchOpponent.trim() || !newMatchDate || !newMatchTime || !newMatchLocation.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const match_date = new Date(`${newMatchDate}T${newMatchTime}`).toISOString();
    await createMatch.mutateAsync({
      home_team_id: myTeam.id,
      away_team_id: null,
      match_date,
      location: newMatchLocation.trim(),
      status: "confirmed",
      format: (myTeam as any).format || "8x8",
    });
    toast({ title: "Partida criada e confirmada!", description: `vs ${newMatchOpponent.trim()}` });
    setNewMatchOpen(false);
    setNewMatchOpponent(""); setNewMatchDate(""); setNewMatchTime(""); setNewMatchLocation("");
    navigate("/agenda");
  };

  const toggleFilter = (
    value: string,
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toMinutes = (value?: string | null) => {
    if (!value || !value.includes(":")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const myUf = ((myTeam as any)?.addr_uf || "SP").toUpperCase();
  const cityOptions = getCitiesForUf(myUf);

  const { data: registeredTeams = [] } = useQuery<any[]>({
    queryKey: ["registered_teams"],
    queryFn: async () => {
      const { data } = await supabase.from("public_teams").select("*");
      return data || [];
    },
  });

  const availableOpponentTeams = registeredTeams.filter(
    (team) => team.id !== myTeam?.id && ((team as any).addr_uf || "SP").toUpperCase() === myUf
  );
  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

  const filteredCitySuggest = (() => {
    if (!cityQuery.trim()) return cityOptions.slice(0, 8);
    return cityOptions.filter((c) => startsWithNorm(c, cityQuery)).slice(0, 8);
  })();

  const filteredNameSuggest = (() => {
    if (!nameQuery.trim()) return [] as any[];
    return availableOpponentTeams.filter((t) => startsWithNorm(t.name, nameQuery)).slice(0, 8);
  })();

  const filteredOpponentTeams = availableOpponentTeams.filter((team) => {
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(team.categoria || "");
    const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(team.region || "");
    const teamStart = toMinutes(team.play_time_start);
    const teamEnd = toMinutes(team.play_time_end);
    const matchesTime =
      (!fromMinutes || (teamEnd !== null && teamEnd >= fromMinutes)) &&
      (!toMinutesFilter || (teamStart !== null && teamStart <= toMinutesFilter));
    const matchesCity = startsWithNorm((team as any).addr_cidade, cityQuery);
    const matchesName = startsWithNorm(team.name, nameQuery);
    return matchesCategory && matchesRegion && matchesTime && matchesCity && matchesName;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-display text-foreground">BUSCAR ADVERSÁRIO 🔎</h1>
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">Selecione uma ou mais opções por filtro</p>
            <Badge variant="secondary">{filteredOpponentTeams.length} times</Badge>
          </div>

          <Button
            onClick={() => setNewMatchOpen(true)}
            className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
          >
            Criar Partida
          </Button>

          <div className="space-y-3">
            <div className="relative">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cidade <span className="text-primary">({myUf})</span>
              </p>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={cityQuery}
                  onChange={(e) => { setCityQuery(e.target.value); setShowCitySuggest(true); }}
                  onFocus={() => setShowCitySuggest(true)}
                  onBlur={() => setTimeout(() => setShowCitySuggest(false), 150)}
                  placeholder={`Cidades de ${myUf}...`}
                  className="pl-8 bg-background border-border h-9 text-sm"
                />
              </div>
              {showCitySuggest && filteredCitySuggest.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-auto">
                  {filteredCitySuggest.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={() => { setCityQuery(c); setShowCitySuggest(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do Time</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nameQuery}
                  onChange={(e) => { setNameQuery(e.target.value); setShowNameSuggest(true); }}
                  onFocus={() => setShowNameSuggest(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggest(false), 150)}
                  placeholder="Buscar adversário pelo nome..."
                  className="pl-8 bg-background border-border h-9 text-sm"
                />
              </div>
              {showNameSuggest && filteredNameSuggest.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-auto">
                  {filteredNameSuggest.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={() => { setNameQuery(t.name); setShowNameSuggest(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                    >
                      <span>{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{(t as any).addr_cidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleFilter(category, setSelectedCategories)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                      selectedCategories.includes(category)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Região</p>
              <div className="flex flex-wrap gap-2">
                {REGIOES.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleFilter(region, setSelectedRegions)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                      selectedRegions.includes(region)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
              <div className="grid grid-cols-2 gap-3">
                <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="bg-background border-border" />
                <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="bg-background border-border" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {filteredOpponentTeams.length > 0 ? (
              filteredOpponentTeams.map((team) => {
                const teamTime =
                  team.play_time_start && team.play_time_end
                    ? `${team.play_time_start} até ${team.play_time_end}`
                    : team.play_time_start || team.play_time_end || "Horário não informado";
                const teamDays = Array.isArray(team.play_days) && team.play_days.length > 0
                  ? team.play_days.join(", ")
                  : "Dias não informados";

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setChallengeTeam(team)}
                    className="w-full text-left rounded-xl border border-border bg-background p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{team.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {team.categoria || "Sem categoria"} · {team.region || "Sem região"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          const s = getTeamStats(team.id);
                          return <NotaBadge nota={s.nota} played={s.played} />;
                        })()}
                        <Shield size={16} className="text-primary" />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{teamDays} · {teamTime}</p>
                    <p className="mt-1 text-[10px] font-semibold text-primary">Toque para desafiar →</p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-border bg-background p-4 text-center text-sm text-muted-foreground">
                Nenhum time encontrado com esses filtros.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Desafio */}
      <Dialog
        open={!!challengeTeam}
        onOpenChange={(open) => {
          if (!open) {
            setChallengeTeam(null);
            setChallengeDate(""); setChallengeTime("");
            setLocationChoice("away"); setChallengeLocation("");
          } else if (challengeTeam) {
            setChallengeTime(challengeTeam.play_time_start || "");
            setChallengeLocation(challengeTeam.field_address || challengeTeam.field_name || "");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">DESAFIO</DialogTitle>
            <DialogDescription>
              {challengeTeam ? `Enviar desafio para ${challengeTeam.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {challengeTeam && (
            <div className="space-y-4">
              {!opponentReady(challengeTeam) && (
                <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>Cadastro do adversário incompleto — preencha os dados manualmente.</div>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3 space-y-1">
                <p><strong>Cidade:</strong> {challengeTeam.addr_cidade || "—"}{challengeTeam.addr_uf ? `/${challengeTeam.addr_uf}` : ""}</p>
                <p>
                  <strong>Joga em:</strong>{" "}
                  {Array.isArray(challengeTeam.play_days) && challengeTeam.play_days.length > 0
                    ? challengeTeam.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")
                    : "Não informado"}
                </p>
                <p><strong>Horário:</strong> {challengeTeam.play_time_start ? `${challengeTeam.play_time_start} (fixo)` : "Livre"}</p>
              </div>

              <div>
                <Label htmlFor="ch-date" className="flex items-center gap-1">
                  <CalIcon size={14} /> Data do jogo
                </Label>
                <Input
                  id="ch-date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={challengeDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && Array.isArray(challengeTeam.play_days) && challengeTeam.play_days.length > 0 && !isDateAllowed(v, challengeTeam.play_days)) {
                      toast({
                        title: "Dia não permitido",
                        description: `Adversário só joga: ${challengeTeam.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")}`,
                        variant: "destructive",
                      });
                      return;
                    }
                    setChallengeDate(v);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="ch-time" className="flex items-center gap-1">
                  <Clock size={14} /> Horário {challengeTeam.play_time_start ? "(fixo)" : ""}
                </Label>
                <Input
                  id="ch-time"
                  type="time"
                  value={challengeTime}
                  readOnly={!!challengeTeam.play_time_start}
                  onChange={(e) => setChallengeTime(e.target.value)}
                  className={challengeTeam.play_time_start ? "opacity-80 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label className="mb-2 block">Local</Label>
                <RadioGroup
                  value={locationChoice}
                  onValueChange={(v) => {
                    const choice = v as "own" | "away";
                    setLocationChoice(choice);
                    const addr = choice === "own"
                      ? ((myTeam as any)?.field_address || (myTeam as any)?.field_name || "")
                      : (challengeTeam.field_address || challengeTeam.field_name || "");
                    setChallengeLocation(addr);
                  }}
                  className="space-y-2"
                >
                  <label htmlFor="loc-own" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                    <RadioGroupItem id="loc-own" value="own" className="mt-1" />
                    <div className="text-sm">
                      <div className="font-semibold flex items-center gap-1">
                        <Building2 size={14} /> Meu campo
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(myTeam as any)?.field_address || (myTeam as any)?.field_name || "Endereço não cadastrado"}
                      </div>
                    </div>
                  </label>
                  <label htmlFor="loc-away" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                    <RadioGroupItem id="loc-away" value="away" className="mt-1" />
                    <div className="text-sm">
                      <div className="font-semibold flex items-center gap-1">
                        <Building2 size={14} /> Campo do adversário
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {challengeTeam.field_address || challengeTeam.field_name || "—"}
                      </div>
                    </div>
                  </label>
                </RadioGroup>
                <Input
                  className="mt-2"
                  value={challengeLocation}
                  onChange={(e) => setChallengeLocation(e.target.value)}
                  placeholder="Endereço do local da partida"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setChallengeTeam(null)}>Cancelar</Button>
                <Button onClick={handleConfirmChallenge} className="bg-gradient-primary text-primary-foreground border-0">
                  Enviar desafio
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Partida */}
      <Dialog
        open={newMatchOpen}
        onOpenChange={(open) => {
          setNewMatchOpen(open);
          if (open && myTeam) {
            const t = myTeam as any;
            if (!newMatchTime && t.play_time_start) setNewMatchTime(t.play_time_start);
            if (!newMatchLocation && (t.field_address || t.field_name)) {
              setNewMatchLocation(t.field_address || t.field_name);
            }
          }
        }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">NOVA PARTIDA</DialogTitle>
            <DialogDescription>Crie uma partida informando os dados manualmente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nm-opp">Nome do Time Adversário</Label>
              <Input id="nm-opp" value={newMatchOpponent} onChange={(e) => setNewMatchOpponent(e.target.value)} placeholder="Ex: Águias FC" />
            </div>
            <div>
              <Label htmlFor="nm-date">Data</Label>
              <Input id="nm-date" type="date" min={new Date().toISOString().slice(0, 10)} value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nm-time">Horário</Label>
              <Input id="nm-time" type="time" value={newMatchTime} onChange={(e) => setNewMatchTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nm-loc">Local</Label>
              <Input id="nm-loc" value={newMatchLocation} onChange={(e) => setNewMatchLocation(e.target.value)} placeholder="Endereço ou nome do campo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMatchOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateNewMatch} className="bg-gradient-primary text-primary-foreground border-0">
              Criar partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default BuscarAdversarioPage;
