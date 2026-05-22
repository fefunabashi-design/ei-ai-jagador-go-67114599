import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Shield, Heart, AlertTriangle, Building2, Calendar as CalIcon, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { MultiSelect, toMultiOptions as toOptions } from "@/components/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMyTeam, useCreateMatch } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForUf, CITIES_BY_UF } from "@/lib/brCities";
import { getTeamStats } from "@/lib/stats";
import { startsWithNorm } from "@/lib/normalize";


const UFS = Object.keys(CITIES_BY_UF).sort();
const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];
const MODALIDADES = ["Campo", "Mini Campo (Society)", "Futsal"];
const CATEGORIAS = ["Adulto", "Infantil"];
const SUB_CATEGORIAS_ADULTO = ["Todas", "Esporte", "35+", "40+", "45+", "50+", "60+"];
const SUB_CATEGORIAS_INFANTIL = Array.from({ length: 14 }, (_, i) => `Sub ${i + 5}`);
const GENEROS = ["Masculino", "Feminino"];
const DIAS_SEMANA = [
  { value: "domingo", label: "Domingo" },
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
];

const WEEK_DAY_LABEL: Record<string, string> = Object.fromEntries(DIAS_SEMANA.map((d) => [d.value, d.label]));
const DAY_INDEX: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};


const TimesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: myTeam } = useMyTeam();
  const createMatch = useCreateMatch();

  // Filtros
  const [nameQuery, setNameQuery] = useState("");
  const [showNameSuggest, setShowNameSuggest] = useState(false);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedSubCategorias, setSelectedSubCategorias] = useState<string[]>([]);
  const [selectedGeneros, setSelectedGeneros] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [fieldChoice, setFieldChoice] = useState<"sim" | "nao" | "tanto">("tanto");
  const [nivelChoice, setNivelChoice] = useState<string>("todas");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("times_favorites") || "[]"); } catch { return []; }
  });
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Desafio
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
  const [newMatchLocationChoice, setNewMatchLocationChoice] = useState<"own" | "away">("own");

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("times_favorites", JSON.stringify(next));
      return next;
    });
  };

  // Pré-popular filtros conforme o time do usuário
  useEffect(() => {
    if (!myTeam || defaultsApplied) return;
    const t = myTeam as any;
    if (t.addr_uf) setSelectedUFs([String(t.addr_uf).toUpperCase()]);
    if (t.addr_cidade) setSelectedCities([t.addr_cidade]);
    if (t.region) setSelectedRegions([t.region]);
    if (t.estilo) setSelectedModalidades([t.estilo]);
    if (t.categoria) setSelectedCategorias([t.categoria]);
    if (t.sub_categoria) setSelectedSubCategorias([t.sub_categoria]);
    if (t.gender) setSelectedGeneros([t.gender]);
    if (Array.isArray(t.play_days) && t.play_days.length > 0) setSelectedDays(t.play_days);
    if (t.play_time_start) setTimeFrom(String(t.play_time_start).slice(0, 5));
    if (t.play_time_end) setTimeTo(String(t.play_time_end).slice(0, 5));
    setDefaultsApplied(true);
  }, [myTeam, defaultsApplied]);

  const toMinutes = (value?: string | null) => {
    if (!value || !value.includes(":")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const { data: registeredTeams = [] } = useQuery<any[]>({
    queryKey: ["registered_teams_all"],
    queryFn: async () => {
      const { data } = await supabase.from("public_teams").select("*");
      return data || [];
    },
  });

  // Partidas confirmadas do adversário selecionado (para bloquear datas ocupadas)
  const { data: opponentMatches = [] } = useQuery<any[]>({
    queryKey: ["opponent_matches", challengeTeam?.id],
    enabled: !!challengeTeam?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("match_date,status,home_team_id,away_team_id")
        .or(`home_team_id.eq.${challengeTeam.id},away_team_id.eq.${challengeTeam.id}`)
        .eq("status", "confirmed");
      return data || [];
    },
  });

  const busyDateKeys = useMemo(() => {
    const set = new Set<string>();
    (opponentMatches || []).forEach((m: any) => {
      const d = new Date(m.match_date);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [opponentMatches]);

  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

  // Cidades disponíveis: apenas cidades com times cadastrados (filtradas por UF se houver)
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    registeredTeams.forEach((t: any) => {
      const cidade = t.addr_cidade;
      const uf = String(t.addr_uf || "").toUpperCase();
      if (!cidade) return;
      if (selectedUFs.length > 0 && !selectedUFs.includes(uf)) return;
      set.add(cidade);
    });
    return Array.from(set).sort();
  }, [selectedUFs, registeredTeams]);

  // Subcategorias disponíveis conforme categoria selecionada
  const subCategoriaOptions = useMemo(() => {
    if (selectedCategorias.includes("Infantil") && !selectedCategorias.includes("Adulto")) {
      return SUB_CATEGORIAS_INFANTIL;
    }
    if (selectedCategorias.includes("Adulto") && !selectedCategorias.includes("Infantil")) {
      return SUB_CATEGORIAS_ADULTO;
    }
    return [...SUB_CATEGORIAS_ADULTO, ...SUB_CATEGORIAS_INFANTIL];
  }, [selectedCategorias]);

  const filteredNameSuggest = useMemo(() => {
    if (!nameQuery.trim()) return [] as any[];
    return registeredTeams.filter((t) => startsWithNorm(t.name, nameQuery)).slice(0, 8);
  }, [nameQuery, registeredTeams]);

  const filteredTeams = registeredTeams.filter((team) => {
    const t = team as any;
    const matchesName = startsWithNorm(t.name, nameQuery);
    const matchesUf = selectedUFs.length === 0 || selectedUFs.includes(String(t.addr_uf || "").toUpperCase());
    const matchesCity = selectedCities.length === 0 || selectedCities.includes(t.addr_cidade || "");
    const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(t.region || "");
    const matchesModalidade = selectedModalidades.length === 0 || selectedModalidades.includes(t.estilo || "");
    const matchesCategoria = selectedCategorias.length === 0 || selectedCategorias.includes(t.categoria || "");
    const matchesSubCategoria = selectedSubCategorias.length === 0 || selectedSubCategorias.includes(t.sub_categoria || "");
    const matchesGenero = selectedGeneros.length === 0 || selectedGeneros.includes(t.gender || "");
    const teamDaysArr: string[] = Array.isArray(t.play_days) ? t.play_days : [];
    const matchesDays = selectedDays.length === 0 || selectedDays.some((d) => teamDaysArr.includes(d));
    const matchesField =
      fieldChoice === "tanto" ||
      (fieldChoice === "sim" ? t.has_field === true : t.has_field === false);
    const teamNota = getTeamStats(t.id).nota || 0;
    const matchesNivel = nivelChoice === "todas" || teamNota >= Number(nivelChoice);
    const matchesFavorite = !onlyFavorites || favorites.includes(t.id);
    const teamStart = toMinutes(t.play_time_start);
    const teamEnd = toMinutes(t.play_time_end);
    const matchesTime =
      (!fromMinutes || (teamEnd !== null && teamEnd >= fromMinutes)) &&
      (!toMinutesFilter || (teamStart !== null && teamStart <= toMinutesFilter));
    return (
      matchesName && matchesUf && matchesCity && matchesRegion && matchesModalidade &&
      matchesCategoria && matchesSubCategoria && matchesGenero && matchesDays && matchesField &&
      matchesNivel && matchesFavorite && matchesTime
    );
  });

  const regionEnabled = selectedCities.includes("São Paulo");
  useEffect(() => {
    if (!regionEnabled && selectedRegions.length > 0) setSelectedRegions([]);
  }, [regionEnabled, selectedRegions.length]);

  const opponentMissingFields = (t: any): string[] => {
    if (!t) return ["dados do time"];
    const miss: string[] = [];
    if (!t.name) miss.push("nome");
    const hasCity = !!t.addr_cidade;
    const hasUf = !!t.addr_uf;
    if (!hasCity) miss.push("cidade");
    if (!hasUf) miss.push("UF");
    const hasAddress =
      !!t.field_address || !!t.field_name ||
      (!!t.addr_rua && (hasCity || hasUf));
    if (!hasAddress) miss.push("endereço");
    if (!Array.isArray(t.play_days) || t.play_days.length === 0) miss.push("dias de jogo");
    if (!t.play_time_start) miss.push("horário fixo");
    return miss;
  };
  const opponentReady = (t: any) => opponentMissingFields(t).length === 0;

  const teamAddress = (t: any): string => {
    if (!t) return "";
    const clean = (value?: string | null) => String(value || "").trim();
    const fieldAddress = clean(t.field_address);
    const fieldName = clean(t.field_name);
    const street = [clean(t.addr_rua), clean(t.addr_numero)].filter(Boolean).join(", ");
    const cityUf = [clean(t.addr_cidade), clean(t.addr_uf)].filter(Boolean).join("/");
    const registeredAddress = [street, clean(t.addr_bairro), cityUf, clean(t.addr_cep)].filter(Boolean).join(" - ");

    if (fieldAddress) return fieldName ? `${fieldName} — ${fieldAddress}` : fieldAddress;
    if (registeredAddress) return fieldName ? `${fieldName} — ${registeredAddress}` : registeredAddress;
    return fieldName;
  };

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
    const d = new Date(challengeDate + "T12:00:00");
    if (busyDateKeys.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) {
      toast({ title: "Data ocupada", description: "Adversário já tem jogo confirmado nesse dia.", variant: "destructive" });
      return;
    }
    const fallbackLocation = locationChoice === "own"
      ? (teamAddress(myTeam) || "Campo do mandante")
      : (teamAddress(challengeTeam) || "Campo do adversário");
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-display text-foreground">TIMES CADASTRADOS ⚽</h1>
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">Selecione uma ou mais opções por filtro</p>
            <Badge variant="secondary">{filteredTeams.length} times</Badge>
          </div>

          <Button
            onClick={() => setNewMatchOpen(true)}
            className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold"
          >
            Desafio/Adversário sem cadastro
          </Button>

          <div className="space-y-3">
            {/* 1 - Nome do Time com autocomplete (linha inteira) */}
            <div className="relative">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do Time</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nameQuery}
                  onChange={(e) => { setNameQuery(e.target.value); setShowNameSuggest(true); }}
                  onFocus={() => setShowNameSuggest(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggest(false), 150)}
                  placeholder="Digite as iniciais do time..."
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

            {/* Estado + Cidade + Região (3 colunas) */}
            <div className="grid grid-cols-3 gap-2">
              <MultiSelect
                label="Estado"
                options={toOptions(UFS)}
                selected={selectedUFs}
                onChange={(next) => {
                  setSelectedUFs(next);
                  if (next.length > 0) {
                    const allowed = new Set<string>();
                    next.forEach((uf) => getCitiesForUf(uf).forEach((c) => allowed.add(c)));
                    setSelectedCities((prev) => prev.filter((c) => allowed.has(c)));
                  }
                }}
                placeholder="Todos"
              />
              <MultiSelect
                label="Cidade"
                options={toOptions(cityOptions)}
                selected={selectedCities}
                onChange={setSelectedCities}
                placeholder="Todas"
              />
              {regionEnabled ? (
                <MultiSelect
                  label="Região"
                  options={toOptions(REGIOES)}
                  selected={selectedRegions}
                  onChange={setSelectedRegions}
                  placeholder="Todas"
                />
              ) : (
                <div className="min-w-0 opacity-60">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Região</p>
                  <div className="flex min-h-9 w-full items-center rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
                    Todas
                  </div>
                </div>
              )}
            </div>



            {/* Modalidade + Gênero (2 colunas) */}
            <div className="grid grid-cols-2 gap-2">
              <MultiSelect
                label="Modalidade"
                options={toOptions(MODALIDADES)}
                selected={selectedModalidades}
                onChange={setSelectedModalidades}
                placeholder="Todas"
              />
              <MultiSelect
                label="Gênero"
                options={toOptions(GENEROS)}
                selected={selectedGeneros}
                onChange={setSelectedGeneros}
                placeholder="Todos"
              />
            </div>

            {/* Categoria + Subcategoria (2 colunas) */}
            <div className="grid grid-cols-2 gap-2">
              <MultiSelect
                label="Categoria"
                options={toOptions(CATEGORIAS)}
                selected={selectedCategorias}
                onChange={(next) => {
                  setSelectedCategorias(next);
                  const allowed = new Set<string>();
                  if (next.length === 0 || next.includes("Adulto")) SUB_CATEGORIAS_ADULTO.forEach((s) => allowed.add(s));
                  if (next.length === 0 || next.includes("Infantil")) SUB_CATEGORIAS_INFANTIL.forEach((s) => allowed.add(s));
                  setSelectedSubCategorias((prev) => prev.filter((s) => allowed.has(s)));
                }}
                placeholder="Todas"
              />
              <MultiSelect
                label="Subcategoria"
                options={toOptions(subCategoriaOptions)}
                selected={selectedSubCategorias}
                onChange={setSelectedSubCategorias}
                placeholder="Todas"
              />
            </div>

            {/* Time com Campo + Nível (2 colunas) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time com Campo</p>
                <Select value={fieldChoice} onValueChange={(v) => setFieldChoice(v as "sim" | "nao" | "tanto")}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="tanto">Tanto Faz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nível</p>
                <Select value={nivelChoice} onValueChange={setNivelChoice}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                    <SelectItem value="6">6+</SelectItem>
                    <SelectItem value="7">7+</SelectItem>
                    <SelectItem value="8">8+</SelectItem>
                    <SelectItem value="9">9+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Favoritos */}
            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2">
                <Heart size={14} className={onlyFavorites ? "text-red-500 fill-red-500" : "text-muted-foreground"} />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mostrar apenas favoritos</p>
              </div>
              <button
                type="button"
                onClick={() => setOnlyFavorites((v) => !v)}
                className={`h-5 w-9 rounded-full transition-colors relative ${onlyFavorites ? "bg-primary" : "bg-muted"}`}
                aria-pressed={onlyFavorites}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${onlyFavorites ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>


            {/* Dia da Semana + Horário (2 colunas) */}
            <div className="grid grid-cols-2 gap-2">
              <MultiSelect
                label="Dia da Semana"
                options={DIAS_SEMANA}
                selected={selectedDays}
                onChange={setSelectedDays}
                placeholder="Todos"
              />
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="bg-background border-border h-9 px-2 text-xs" />
                  <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="bg-background border-border h-9 px-2 text-xs" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => {
                const teamTime =
                  team.play_time_start && team.play_time_end
                    ? `${team.play_time_start} até ${team.play_time_end}`
                    : team.play_time_start || team.play_time_end || "Horário não informado";
                const teamDays = Array.isArray(team.play_days) && team.play_days.length > 0
                  ? team.play_days.map((d: string) => DIAS_SEMANA.find((x) => x.value === d)?.label || d).join(", ")
                  : "Dias não informados";
                const isOwnTeam = myTeam?.id === team.id;

                return (
                  <div
                    key={team.id}
                    role={isOwnTeam ? undefined : "button"}
                    tabIndex={isOwnTeam ? -1 : 0}
                    onClick={() => { if (!isOwnTeam) setChallengeTeam(team); }}
                    onKeyDown={(e) => {
                      if (isOwnTeam) return;
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChallengeTeam(team); }
                    }}
                    className={`w-full text-left rounded-xl border border-border bg-background p-3 transition-colors ${isOwnTeam ? "opacity-80" : "cursor-pointer hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {(team as any).logo_url ? (
                          <img
                            src={(team as any).logo_url}
                            alt={team.name}
                            className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Shield size={18} className="text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="truncate">{team.name}</span>
                            {(() => { const s = getTeamStats(team.id); return <NotaBadge nota={s.nota} played={s.played} />; })()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(team as any).estilo || "Sem modalidade"} · {team.categoria || "Sem categoria"}
                            {(team as any).sub_categoria ? ` · ${(team as any).sub_categoria}` : ""}
                            {team.region ? ` · ${team.region}` : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(team as any).addr_cidade || "—"}/{(team as any).addr_uf || "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(team.id); }}
                        aria-label="Favoritar"
                        className="p-1 shrink-0"
                      >
                        <Heart
                          size={18}
                          className={favorites.includes(team.id) ? "text-red-500 fill-red-500" : "text-muted-foreground"}
                        />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{teamDays} · {teamTime}</p>
                    {!isOwnTeam ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setChallengeTeam(team); }}
                        className="mt-3 flex h-9 w-full items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        Toque para desafiar →
                      </button>
                    ) : (
                      <p className="mt-3 text-center text-[10px] font-semibold text-muted-foreground">Este é seu time</p>
                    )}
                  </div>
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
            const myHasField = (myTeam as any)?.has_field === true;
            const initialChoice: "own" | "away" = myHasField ? "own" : "away";
            setLocationChoice(initialChoice);
            setChallengeLocation("");
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
                  <div>
                    Cadastro do adversário incompleto. Faltando: <strong>{opponentMissingFields(challengeTeam).join(", ")}</strong>. Preencha os dados manualmente.
                  </div>
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
                <Label className="flex items-center gap-1 mb-1">
                  <CalIcon size={14} /> Data do jogo
                </Label>
                {(() => {
                  const playDays: string[] = Array.isArray(challengeTeam.play_days) ? challengeTeam.play_days : [];
                  const allowedDow = new Set(playDays.map((d) => DAY_INDEX[d]).filter((n) => n !== undefined));
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const selected = challengeDate ? new Date(challengeDate + "T12:00:00") : undefined;
                  const isBusy = (date: Date) =>
                    busyDateKeys.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
                  const isAvailable = (date: Date) => {
                    const d = new Date(date); d.setHours(0, 0, 0, 0);
                    if (d < today) return false;
                    if (allowedDow.size > 0 && !allowedDow.has(d.getDay())) return false;
                    if (isBusy(d)) return false;
                    return true;
                  };
                  return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selected && "text-muted-foreground"
                          )}
                        >
                          <CalIcon className="mr-2 h-4 w-4" />
                          {selected
                            ? format(selected, "PPP", { locale: ptBR })
                            : "Selecione uma data disponível"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={ptBR}
                          selected={selected}
                          onSelect={(d) => {
                            if (!d) return;
                            if (isBusy(d)) {
                              toast({ title: "Data ocupada", description: "Adversário já tem jogo confirmado nesse dia.", variant: "destructive" });
                              return;
                            }
                            if (allowedDow.size > 0 && !allowedDow.has(d.getDay())) {
                              toast({
                                title: "Dia não permitido",
                                description: `Adversário só joga: ${playDays.map((x) => WEEK_DAY_LABEL[x]).join(", ")}`,
                                variant: "destructive",
                              });
                              return;
                            }
                            setChallengeDate(format(d, "yyyy-MM-dd"));
                          }}
                          disabled={(date) => !isAvailable(date)}
                          modifiers={{ available: (date) => isAvailable(date), busy: (date) => isBusy(date) && date >= today }}
                          modifiersClassNames={{
                            available: "bg-primary/15 text-primary font-semibold",
                            busy: "line-through opacity-50",
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                        <div className="px-3 pb-3 pt-1 text-[10px] text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded bg-primary/30 border border-primary/50" />
                            Datas disponíveis do adversário
                          </div>
                          <div>Datas com jogo já confirmado ficam indisponíveis.</div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })()}
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
                    const addr = choice === "own" ? teamAddress(myTeam) : teamAddress(challengeTeam);
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
                        {teamAddress(myTeam) || "Endereço não cadastrado"}
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
                        {teamAddress(challengeTeam) || "—"}
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
            const addr = teamAddress(t);
            if (!newMatchLocation && addr) {
              setNewMatchLocation(addr);
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
              <Label className="mb-2 block">Local</Label>
              <RadioGroup
                value={newMatchLocationChoice}
                onValueChange={(v) => {
                  const choice = v as "own" | "away";
                  setNewMatchLocationChoice(choice);
                  if (choice === "own") {
                    setNewMatchLocation(teamAddress(myTeam));
                  } else {
                    setNewMatchLocation("");
                  }
                }}
                className="space-y-2 mb-2"
              >
                <label htmlFor="nm-loc-own" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                  <RadioGroupItem id="nm-loc-own" value="own" className="mt-1" />
                  <div className="text-sm">
                    <div className="font-semibold flex items-center gap-1"><Building2 size={14} /> Meu campo</div>
                    <div className="text-xs text-muted-foreground">
                      {teamAddress(myTeam) || "Endereço não cadastrado"}
                    </div>
                  </div>
                </label>
                <label htmlFor="nm-loc-away" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                  <RadioGroupItem id="nm-loc-away" value="away" className="mt-1" />
                  <div className="text-sm">
                    <div className="font-semibold flex items-center gap-1"><Building2 size={14} /> Campo do Adversário</div>
                    <div className="text-xs text-muted-foreground">Informe o endereço abaixo</div>
                  </div>
                </label>
              </RadioGroup>
              <Label htmlFor="nm-loc">Endereço do local</Label>
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

export default TimesPage;
