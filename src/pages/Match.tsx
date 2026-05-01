import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Clock, Users, Calendar as CalIcon, Building2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import BottomNav from "@/components/BottomNav";
import { useMyTeam } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { mockDb } from "@/lib/mockDb";
import { getCitiesForUf } from "@/lib/brCities";

const formats = ["Todos", "5x5", "8x8", "11x11"];

const WEEK_DAY_LABEL: Record<string, string> = {
  domingo: "Domingo",
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
};

// JS getDay() => 0 Dom ... 6 Sáb
const DAY_INDEX: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

const MatchPage = () => {
  const { toast } = useToast();
  const { data: myTeam } = useMyTeam();

  const [selectedFormat, setSelectedFormat] = useState("Todos");
  const [cityQuery, setCityQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showCitySuggest, setShowCitySuggest] = useState(false);
  const [showNameSuggest, setShowNameSuggest] = useState(false);

  // Diálogo de Desafio
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [opponent, setOpponent] = useState<any>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [challengeTime, setChallengeTime] = useState("");
  const [locationChoice, setLocationChoice] = useState<"own" | "away">("away");

  const myUf = (myTeam?.addr_uf || "SP").toUpperCase();
  const cityOptions = useMemo(() => getCitiesForUf(myUf), [myUf]);

  // Lista de adversários (todos os times menos o meu, no mesmo estado)
  const allTeams: any[] = useMemo(() => {
    const list = (mockDb as any).getAllTeams ? (mockDb as any).getAllTeams() : [];
    return list.filter((t: any) => t.id !== myTeam?.id && (t.addr_uf || "SP").toUpperCase() === myUf);
  }, [myTeam?.id, myUf]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cityOptions.slice(0, 8);
    return cityOptions.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [cityQuery, cityOptions]);

  const filteredTeamsByName = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return [] as any[];
    return allTeams.filter((t) => t.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [nameQuery, allTeams]);

  // Resultado principal
  const filteredOpponents = useMemo(() => {
    return allTeams.filter((t) => {
      if (selectedFormat !== "Todos" && t.format && t.format !== selectedFormat) return false;
      if (cityQuery.trim()) {
        const city = (t.addr_cidade || "").toLowerCase();
        if (!city.includes(cityQuery.trim().toLowerCase())) return false;
      }
      if (nameQuery.trim()) {
        if (!t.name?.toLowerCase().includes(nameQuery.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [allTeams, selectedFormat, cityQuery, nameQuery]);

  // ========= Desafio =========
  const opponentReady = (t: any) => {
    if (!t) return false;
    return Boolean(
      t.name &&
        t.addr_cidade &&
        t.addr_uf &&
        t.field_address &&
        Array.isArray(t.play_days) &&
        t.play_days.length > 0 &&
        t.play_time_start
    );
  };

  const handleSelectOpponent = (t: any) => {
    setOpponent(t);
    // Pré-popular horário fixo do adversário
    setChallengeTime(t.play_time_start || "");
    setChallengeDate("");
    setLocationChoice("away");
    setChallengeOpen(true);
  };

  const isDateAllowed = (dateStr: string, allowedDays: string[]) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + "T12:00:00");
    const idx = d.getDay();
    return allowedDays.some((day) => DAY_INDEX[day] === idx);
  };

  const handleSendChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !opponent) return;

    if (!opponentReady(opponent)) {
      toast({
        title: "Adversário sem cadastro completo",
        description: "Não é possível enviar desafio. Cadastro do adversário incompleto.",
        variant: "destructive",
      });
      return;
    }

    if (!isDateAllowed(challengeDate, opponent.play_days)) {
      toast({
        title: "Data inválida",
        description: `O adversário só joga: ${opponent.play_days
          .map((d: string) => WEEK_DAY_LABEL[d])
          .join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (challengeTime !== opponent.play_time_start) {
      toast({
        title: "Horário inválido",
        description: `Horário fixo do adversário: ${opponent.play_time_start}`,
        variant: "destructive",
      });
      return;
    }

    const location =
      locationChoice === "own"
        ? myTeam.field_address || myTeam.field_name || "Campo do time mandante"
        : opponent.field_address || opponent.field_name || "Campo do adversário";

    const matchDateIso = new Date(`${challengeDate}T${challengeTime}:00`).toISOString();

    mockDb.createMatch({
      home_team_id: locationChoice === "own" ? myTeam.id : opponent.id,
      home_team_name: locationChoice === "own" ? myTeam.name : opponent.name,
      away_team_id: locationChoice === "own" ? opponent.id : myTeam.id,
      away_team_name: locationChoice === "own" ? opponent.name : myTeam.name,
      location,
      match_date: matchDateIso,
      format: opponent.format || myTeam.format || "8x8",
      status: "open",
    });
    window.dispatchEvent(new CustomEvent("mock-db-change"));

    toast({
      title: "Desafio enviado!",
      description: `${opponent.name} foi desafiado para ${challengeDate} às ${challengeTime}.`,
    });
    setChallengeOpen(false);
  };

  const allowedDayLabels = opponent?.play_days
    ? opponent.play_days.map((d: string) => WEEK_DAY_LABEL[d]).join(", ")
    : "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-3xl text-foreground font-display">BUSCAR ADVERSÁRIO</h1>
        <p className="text-sm text-muted-foreground">
          Filtros do estado: <span className="text-primary font-semibold">{myUf}</span>
        </p>
      </div>

      <div className="px-5 space-y-3">
        {/* Filtro Cidade com autocomplete */}
        <div className="relative">
          <Label className="text-xs text-muted-foreground">Cidade</Label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setShowCitySuggest(true);
              }}
              onFocus={() => setShowCitySuggest(true)}
              onBlur={() => setTimeout(() => setShowCitySuggest(false), 150)}
              placeholder={`Cidades de ${myUf}...`}
              className="pl-9 bg-card border-border"
            />
          </div>
          {showCitySuggest && filteredCities.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-auto">
              {filteredCities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={() => {
                    setCityQuery(c);
                    setShowCitySuggest(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtro Nome do Time com autocomplete */}
        <div className="relative">
          <Label className="text-xs text-muted-foreground">Nome do Time</Label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nameQuery}
              onChange={(e) => {
                setNameQuery(e.target.value);
                setShowNameSuggest(true);
              }}
              onFocus={() => setShowNameSuggest(true)}
              onBlur={() => setTimeout(() => setShowNameSuggest(false), 150)}
              placeholder="Buscar adversário pelo nome..."
              className="pl-9 bg-card border-border"
            />
          </div>
          {showNameSuggest && filteredTeamsByName.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-auto">
              {filteredTeamsByName.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={() => {
                    setNameQuery(t.name);
                    setShowNameSuggest(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.addr_cidade}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {formats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedFormat === fmt
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {!myTeam && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-sm text-warning">
            ⚠️ Cadastre seu time para enviar desafios.
          </div>
        )}

        <div className="space-y-3 pt-2">
          {filteredOpponents.map((t, i) => (
            <motion.button
              type="button"
              key={t.id}
              onClick={() => handleSelectOpponent(t)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="w-full text-left bg-card rounded-xl border border-border p-4 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-lg text-foreground">{t.name?.toUpperCase()}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                  {t.format || "8x8"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {t.addr_cidade}/{t.addr_uf}
                </span>
                <span className="flex items-center gap-1">
                  <CalIcon size={12} />{" "}
                  {(t.play_days || []).map((d: string) => WEEK_DAY_LABEL[d]).join(", ") || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {t.play_time_start || "—"}
                </span>
              </div>
            </motion.button>
          ))}
          {filteredOpponents.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum adversário encontrado para os filtros 😕
            </p>
          )}
        </div>
      </div>

      {/* Dialog Desafio */}
      <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">DESAFIO</DialogTitle>
            <DialogDescription>
              {opponent ? `Enviar desafio para ${opponent.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {opponent && !opponentReady(opponent) ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  Cadastro do time adversário está incompleto. Não é possível enviar o desafio.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setChallengeOpen(false)}
              >
                Fechar
              </Button>
            </div>
          ) : (
            opponent && (
              <form onSubmit={handleSendChallenge} className="space-y-4">
                <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 space-y-1">
                  <p>
                    <strong>Cidade:</strong> {opponent.addr_cidade}/{opponent.addr_uf}
                  </p>
                  <p>
                    <strong>Joga em:</strong> {allowedDayLabels}
                  </p>
                  <p>
                    <strong>Horário:</strong> {opponent.play_time_start} (fixo)
                  </p>
                </div>

                <div>
                  <Label>Data do jogo</Label>
                  <Input
                    type="date"
                    value={challengeDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !isDateAllowed(v, opponent.play_days)) {
                        toast({
                          title: "Dia não permitido",
                          description: `Adversário só joga: ${allowedDayLabels}`,
                          variant: "destructive",
                        });
                        return;
                      }
                      setChallengeDate(v);
                    }}
                    min={new Date().toISOString().slice(0, 10)}
                    className="bg-secondary border-border"
                    required
                  />
                </div>

                <div>
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={challengeTime}
                    readOnly
                    className="bg-secondary border-border opacity-80 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Local</Label>
                  <RadioGroup
                    value={locationChoice}
                    onValueChange={(v) => setLocationChoice(v as "own" | "away")}
                    className="space-y-2"
                  >
                    <label
                      htmlFor="loc-own"
                      className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer"
                    >
                      <RadioGroupItem id="loc-own" value="own" className="mt-1" />
                      <div className="text-sm">
                        <div className="font-semibold flex items-center gap-1">
                          <Building2 size={14} /> Meu campo
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {myTeam?.field_address || myTeam?.field_name || "Endereço não cadastrado"}
                        </div>
                      </div>
                    </label>
                    <label
                      htmlFor="loc-away"
                      className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer"
                    >
                      <RadioGroupItem id="loc-away" value="away" className="mt-1" />
                      <div className="text-sm">
                        <div className="font-semibold flex items-center gap-1">
                          <Building2 size={14} /> Campo do adversário
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {opponent.field_address || opponent.field_name || "—"}
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
                >
                  Enviar Desafio
                </Button>
              </form>
            )
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MatchPage;
