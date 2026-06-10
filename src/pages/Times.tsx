import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Shield, Heart, AlertTriangle, Building2, Calendar as CalIcon, Clock, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
import { useMyTeam, useMyAdminTeams, useCreateMatch } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { getCitiesForUf, CITIES_BY_UF } from "@/lib/brCities";
import { getTeamStats } from "@/lib/stats";
import { startsWithNorm } from "@/lib/normalize";


const UFS = Object.keys(CITIES_BY_UF).sort();
const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];
const MODALIDADES = ["Campo", "Mini Campo (Society)", "Futsal"];
const CATEGORIAS = ["Adulto", "Infantil"];
const SUB_CATEGORIAS_ADULTO = ["Esporte", "35+", "40+", "45+", "50+", "60+"];
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

const cleanValue = (value?: string | null) => String(value || "").trim();
const hasTeamField = (team: any) =>
  team?.has_field === true && (!!cleanValue(team?.field_name) || !!cleanValue(team?.field_address));
const teamFieldLocation = (team: any): string => {
  if (!hasTeamField(team)) return "";
  const fieldName = cleanValue(team?.field_name);
  const fieldAddress = cleanValue(team?.field_address);
  if (fieldName && fieldAddress) return `${fieldName} — ${fieldAddress}`;
  return fieldName || fieldAddress;
};


const TimesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: myTeam } = useMyTeam();
  const { data: myAdminTeams = [] } = useMyAdminTeams();
  const createMatch = useCreateMatch();
  const matchActionTeam = useMemo(
    () => myAdminTeams.find((team: any) => team.id === (myTeam as any)?.id) || myAdminTeams[0] || null,
    [myAdminTeams, myTeam]
  );
  const canLaunchChallenges = !!matchActionTeam;

  // Filtros — persistidos em sessionStorage para sobreviver navegação (ex: voltar de "Detalhes")
  const FILTERS_KEY = "times_filters_v1";
  const savedFilters = (() => {
    try { return JSON.parse(sessionStorage.getItem(FILTERS_KEY) || "{}"); }
    catch { return {}; }
  })();
  const [nameQuery, setNameQuery] = useState<string>(savedFilters.nameQuery || "");
  const [showNameSuggest, setShowNameSuggest] = useState(false);
  const [selectedUFs, setSelectedUFs] = useState<string[]>(savedFilters.selectedUFs || []);
  const [selectedCities, setSelectedCities] = useState<string[]>(savedFilters.selectedCities || []);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(savedFilters.selectedRegions || []);
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>(savedFilters.selectedModalidades || []);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>(savedFilters.selectedCategorias || []);
  const [selectedSubCategorias, setSelectedSubCategorias] = useState<string[]>(savedFilters.selectedSubCategorias || []);
  const [selectedGeneros, setSelectedGeneros] = useState<string[]>(savedFilters.selectedGeneros || []);
  const [selectedDays, setSelectedDays] = useState<string[]>(savedFilters.selectedDays || []);
  const [fieldChoice, setFieldChoice] = useState<"sim" | "nao" | "tanto">(savedFilters.fieldChoice || "tanto");
  const [nivelChoice, setNivelChoice] = useState<string>(savedFilters.nivelChoice || "todas");
  const [timeFrom, setTimeFrom] = useState<string>(savedFilters.timeFrom || "");
  const [timeTo, setTimeTo] = useState<string>(savedFilters.timeTo || "");
  const [defaultsApplied, setDefaultsApplied] = useState<boolean>(!!savedFilters.defaultsApplied);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(!!savedFilters.onlyFavorites);

  // Painel "Filtros" (Sheet)
  type FilterGroup = "localizacao" | "modalidade" | "genero" | "categoria" | "nivel" | "campo" | "dia" | "horario" | "favoritos";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<FilterGroup>("localizacao");
  const [openChip, setOpenChip] = useState<string | null>(null);

  // Salvar filtros sempre que mudarem
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        nameQuery, selectedUFs, selectedCities, selectedRegions, selectedModalidades,
        selectedCategorias, selectedSubCategorias, selectedGeneros, selectedDays,
        fieldChoice, nivelChoice, timeFrom, timeTo, defaultsApplied, onlyFavorites,
      }));
    } catch { /* ignore */ }
  }, [nameQuery, selectedUFs, selectedCities, selectedRegions, selectedModalidades,
      selectedCategorias, selectedSubCategorias, selectedGeneros, selectedDays,
      fieldChoice, nivelChoice, timeFrom, timeTo, defaultsApplied, onlyFavorites]);

  // Desafio
  const [challengeTeam, setChallengeTeam] = useState<any | null>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [challengeTime, setChallengeTime] = useState("");
  const [locationChoice, setLocationChoice] = useState<"own" | "away" | "other">("other");
  const [challengeLocation, setChallengeLocation] = useState("");
  const [challengeFieldName, setChallengeFieldName] = useState("");
  const [challengeFieldAddress, setChallengeFieldAddress] = useState("");
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [newMatchOpponent, setNewMatchOpponent] = useState("");
  const [newMatchDate, setNewMatchDate] = useState("");
  const [newMatchTime, setNewMatchTime] = useState("");
  const [newMatchLocation, setNewMatchLocation] = useState("");
  const [newMatchFieldName, setNewMatchFieldName] = useState("");
  const [newMatchFieldAddress, setNewMatchFieldAddress] = useState("");
  const [newMatchLocationChoice, setNewMatchLocationChoice] = useState<"own" | "other">("other");

  const toggleFavorite = async (id: string) => {
    if (!currentUserId) return;
    const isFavorite = favorites.includes(id);
    const next = isFavorite ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem(`times_favorites_${currentUserId}`, JSON.stringify(next));

    const table = supabase.from("team_favorites" as any) as any;
    const { error } = isFavorite
      ? await table.delete().eq("user_id", currentUserId).eq("team_id", id)
      : await table.insert({ user_id: currentUserId, team_id: id });

    if (error) {
      setFavorites(favorites);
      localStorage.setItem(`times_favorites_${currentUserId}`, JSON.stringify(favorites));
      toast({ title: "Erro ao atualizar favorito", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    let alive = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (alive) setCurrentUserId(data.user?.id ?? null);
    };
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!currentUserId) { setFavorites([]); return; }
    let alive = true;
    const cached = (() => {
      try { return JSON.parse(localStorage.getItem(`times_favorites_${currentUserId}`) || "[]"); }
      catch { return []; }
    })();
    setFavorites(cached);
    const loadFavorites = async () => {
      const table = supabase.from("team_favorites" as any) as any;
      const { data, error } = await table.select("team_id").eq("user_id", currentUserId);
      if (!alive || error) return;
      const ids = (data || []).map((row: any) => row.team_id).filter(Boolean);
      setFavorites(ids);
      localStorage.setItem(`times_favorites_${currentUserId}`, JSON.stringify(ids));
    };
    loadFavorites();
    return () => { alive = false; };
  }, [currentUserId]);

  useEffect(() => {
    if (newMatchOpen && (matchActionTeam as any)?.play_time_start) {
      setNewMatchTime(String((matchActionTeam as any).play_time_start).slice(0, 5));
    }
  }, [newMatchOpen, matchActionTeam]);

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

  // Pré-popular dialog de desafio quando seleciona um adversário
  useEffect(() => {
    if (!challengeTeam) return;
    setChallengeTime(challengeTeam.play_time_start ? String(challengeTeam.play_time_start).slice(0, 5) : "");
    const myHasField = hasTeamField(matchActionTeam);
    const oppHasField = hasTeamField(challengeTeam);
    const initialChoice: "own" | "away" | "other" = myHasField && !oppHasField ? "own" : oppHasField ? "away" : "other";
    setLocationChoice(initialChoice);
    setChallengeLocation(initialChoice === "own" ? teamFieldLocation(matchActionTeam) : initialChoice === "away" ? teamFieldLocation(challengeTeam) : "");
    setChallengeFieldName("");
    setChallengeFieldAddress("");
    setChallengeDate("");
  }, [challengeTeam, matchActionTeam]);

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

  const { data: myTeamMatches = [] } = useQuery<any[]>({
    queryKey: ["my_team_matches", (matchActionTeam as any)?.id],
    enabled: !!(matchActionTeam as any)?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("match_date,status,home_team_id,away_team_id")
        .or(`home_team_id.eq.${(matchActionTeam as any).id},away_team_id.eq.${(matchActionTeam as any).id}`)
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

  const myBusyDateKeys = useMemo(() => {
    const set = new Set<string>();
    (myTeamMatches || []).forEach((m: any) => {
      const d = new Date(m.match_date);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [myTeamMatches]);

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

  const WEEK_DAY_KEYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const adminScheduleForDate = (dateStr: string): { mode?: "fixed" | "flexible"; start?: string; end?: string } | null => {
    const t = matchActionTeam as any;
    if (!t || !dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const key = WEEK_DAY_KEYS[d.getDay()];
    const sched = t.play_schedule?.[key];
    return sched || null;
  };
  const isAdminTimeFlexible = (dateStr: string): boolean => {
    const sched = adminScheduleForDate(dateStr);
    if (sched) return sched.mode === "flexible";
    return !(matchActionTeam as any)?.play_time_start;
  };

  const teamAddress = (t: any): string => {
    if (!t) return "";
    const fieldAddress = cleanValue(t.field_address);
    const fieldName = cleanValue(t.field_name);
    const street = [cleanValue(t.addr_rua), cleanValue(t.addr_numero)].filter(Boolean).join(", ");
    const cityUf = [cleanValue(t.addr_cidade), cleanValue(t.addr_uf)].filter(Boolean).join("/");
    const registeredAddress = [street, cleanValue(t.addr_bairro), cityUf, cleanValue(t.addr_cep)].filter(Boolean).join(" - ");

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
    const adminTeam = matchActionTeam as any;
    if (!adminTeam || !challengeTeam) return;
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
    let location = "";
    if (locationChoice === "own") {
      if (!hasTeamField(adminTeam)) {
        toast({ title: "Seu time não tem campo cadastrado", variant: "destructive" });
        return;
      }
      location = challengeLocation.trim() || teamFieldLocation(adminTeam);
    } else if (locationChoice === "away") {
      if (!hasTeamField(challengeTeam)) {
        toast({ title: "Adversário não tem campo cadastrado", variant: "destructive" });
        return;
      }
      location = challengeLocation.trim() || teamFieldLocation(challengeTeam);
    } else {
      const nome = challengeFieldName.trim();
      const endereco = challengeFieldAddress.trim();
      if (!nome || !endereco) {
        toast({ title: "Informe nome e endereço do campo", variant: "destructive" });
        return;
      }
      location = `${nome} - ${endereco}`;
    }
    const match_date = new Date(`${challengeDate}T${challengeTime}`).toISOString();
    // O time desafiante é sempre o "home_team_id" (mandante do desafio) para passar na RLS.
    // O local (campo do mandante/adversário) é informado em `location`.
    await createMatch.mutateAsync({
      home_team_id: adminTeam.id,
      away_team_id: challengeTeam.id,
      match_date,
      location,
      status: "open",
      format: challengeTeam.format || adminTeam.format || "8x8",
    });
    toast({ title: "Desafio enviado!", description: `${challengeTeam.name} foi convidado.` });
    setChallengeTeam(null);
    setChallengeDate(""); setChallengeTime(""); setLocationChoice("other"); setChallengeLocation("");
    setChallengeFieldName(""); setChallengeFieldAddress("");
    navigate("/agenda");
  };

  const handleCreateNewMatch = async () => {
    const adminTeam = matchActionTeam as any;
    if (!adminTeam) return;
    if (!newMatchOpponent.trim() || !newMatchDate || !newMatchTime) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    let location = "";
    if (newMatchLocationChoice === "own") {
      if (!hasTeamField(adminTeam)) {
        toast({ title: "Seu time não tem campo cadastrado", variant: "destructive" });
        return;
      }
      location = newMatchLocation.trim() || teamFieldLocation(adminTeam);
    } else {
      const nome = newMatchFieldName.trim();
      const endereco = newMatchFieldAddress.trim();
      if (!nome || !endereco) {
        toast({ title: "Informe nome e endereço do campo", variant: "destructive" });
        return;
      }
      location = `${nome} - ${endereco}`;
    }
    const match_date = new Date(`${newMatchDate}T${newMatchTime}`).toISOString();
    await createMatch.mutateAsync({
      home_team_id: adminTeam.id,
      away_team_id: null,
      match_date,
      location,
      status: "confirmed",
      format: adminTeam.format || "8x8",
    });
    toast({ title: "Partida criada e confirmada!", description: `vs ${newMatchOpponent.trim()}` });
    setNewMatchOpen(false);
    setNewMatchOpponent(""); setNewMatchDate(""); setNewMatchTime(""); setNewMatchLocation(""); setNewMatchLocationChoice("other");
    setNewMatchFieldName(""); setNewMatchFieldAddress("");
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
        {/* === Barra de filtros (chips horizontais) === */}
        {(() => {
          const activeCount =
            (selectedUFs.length > 0 ? 1 : 0) +
            (selectedCities.length > 0 ? 1 : 0) +
            (selectedRegions.length > 0 ? 1 : 0) +
            (selectedModalidades.length > 0 ? 1 : 0) +
            (selectedGeneros.length > 0 ? 1 : 0) +
            (selectedCategorias.length > 0 ? 1 : 0) +
            (selectedSubCategorias.length > 0 ? 1 : 0) +
            (nivelChoice !== "todas" ? 1 : 0) +
            (fieldChoice !== "tanto" ? 1 : 0) +
            (selectedDays.length > 0 ? 1 : 0) +
            (timeFrom || timeTo ? 1 : 0) +
            (onlyFavorites ? 1 : 0);

          const Chip = ({
            id,
            label,
            value,
            active,
            onClear,
            children,
          }: {
            id: string;
            label: string;
            value?: string;
            active: boolean;
            onClear?: () => void;
            children: React.ReactNode;
          }) => (
            <Popover open={openChip === id} onOpenChange={(o) => setOpenChip(o ? id : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  <span>{active && value ? `${label}: ${value}` : label}</span>
                  {active && onClear ? (
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); onClear(); }}
                      className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/25"
                    >
                      <X size={11} />
                    </span>
                  ) : (
                    <ChevronDown size={12} className="opacity-70" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-3">
                {children}
              </PopoverContent>
            </Popover>
          );

          const summarize = (arr: string[]) =>
            arr.length === 0 ? undefined : arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`;

          return (
            <div className="sticky top-0 z-20 -mx-5 px-5 py-3 bg-background/95 backdrop-blur border-b border-border space-y-3">
              {canLaunchChallenges && (
                <Button
                  onClick={() => setNewMatchOpen(true)}
                  className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold h-9"
                >
                  Desafio/Adversário sem cadastro
                </Button>
              )}

              {/* Busca por nome (linha inteira) */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nameQuery}
                  onChange={(e) => { setNameQuery(e.target.value); setShowNameSuggest(true); }}
                  onFocus={() => setShowNameSuggest(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggest(false), 150)}
                  placeholder="Buscar time pelo nome..."
                  className="pl-8 bg-card border-border h-9 text-sm rounded-full"
                />
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

              {/* Chips roláveis */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold sticky left-0 z-10"
                >
                  <SlidersHorizontal size={13} />
                  Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
                </button>

                <Chip
                  id="estado" label="Estado" value={summarize(selectedUFs)}
                  active={selectedUFs.length > 0}
                  onClear={() => setSelectedUFs([])}
                >
                  <MultiSelect
                    label="Estado" options={toOptions(UFS)} selected={selectedUFs}
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
                </Chip>

                <Chip
                  id="cidade" label="Cidade" value={summarize(selectedCities)}
                  active={selectedCities.length > 0}
                  onClear={() => setSelectedCities([])}
                >
                  <MultiSelect
                    label="Cidade" options={toOptions(cityOptions)} selected={selectedCities}
                    onChange={setSelectedCities} placeholder="Todas"
                  />
                </Chip>

                {regionEnabled && (
                  <Chip
                    id="regiao" label="Região" value={summarize(selectedRegions)}
                    active={selectedRegions.length > 0}
                    onClear={() => setSelectedRegions([])}
                  >
                    <MultiSelect
                      label="Região" options={toOptions(REGIOES)} selected={selectedRegions}
                      onChange={setSelectedRegions} placeholder="Todas"
                    />
                  </Chip>
                )}

                <Chip
                  id="modalidade" label="Modalidade" value={summarize(selectedModalidades)}
                  active={selectedModalidades.length > 0}
                  onClear={() => setSelectedModalidades([])}
                >
                  <MultiSelect
                    label="Modalidade" options={toOptions(MODALIDADES)} selected={selectedModalidades}
                    onChange={setSelectedModalidades} placeholder="Todas"
                  />
                </Chip>

                <Chip
                  id="categoria" label="Categoria" value={summarize(selectedCategorias)}
                  active={selectedCategorias.length > 0}
                  onClear={() => { setSelectedCategorias([]); setSelectedSubCategorias([]); }}
                >
                  <div className="space-y-2">
                    <MultiSelect
                      label="Categoria" options={toOptions(CATEGORIAS)} selected={selectedCategorias}
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
                      label="Subcategoria" options={toOptions(subCategoriaOptions)} selected={selectedSubCategorias}
                      onChange={setSelectedSubCategorias} placeholder="Todas"
                    />
                  </div>
                </Chip>

                <Chip
                  id="genero" label="Gênero" value={summarize(selectedGeneros)}
                  active={selectedGeneros.length > 0}
                  onClear={() => setSelectedGeneros([])}
                >
                  <MultiSelect
                    label="Gênero" options={toOptions(GENEROS)} selected={selectedGeneros}
                    onChange={setSelectedGeneros} placeholder="Todos"
                  />
                </Chip>

                <Chip
                  id="nivel" label="Nível" value={nivelChoice !== "todas" ? `${nivelChoice}+` : undefined}
                  active={nivelChoice !== "todas"}
                  onClear={() => setNivelChoice("todas")}
                >
                  <Select value={nivelChoice} onValueChange={(v) => { setNivelChoice(v); setOpenChip(null); }}>
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
                </Chip>

                <Chip
                  id="campo" label="Com Campo"
                  value={fieldChoice === "sim" ? "Sim" : fieldChoice === "nao" ? "Não" : undefined}
                  active={fieldChoice !== "tanto"}
                  onClear={() => setFieldChoice("tanto")}
                >
                  <Select value={fieldChoice} onValueChange={(v) => { setFieldChoice(v as any); setOpenChip(null); }}>
                    <SelectTrigger className="h-9 bg-background border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="tanto">Tanto Faz</SelectItem>
                    </SelectContent>
                  </Select>
                </Chip>

                <Chip
                  id="dia" label="Dia"
                  value={selectedDays.length === 0 ? undefined :
                    selectedDays.length === 1
                      ? (DIAS_SEMANA.find((x) => x.value === selectedDays[0])?.label || selectedDays[0])
                      : `${selectedDays.length} dias`}
                  active={selectedDays.length > 0}
                  onClear={() => setSelectedDays([])}
                >
                  <MultiSelect
                    label="Dia da Semana" options={DIAS_SEMANA} selected={selectedDays}
                    onChange={setSelectedDays} placeholder="Todos"
                  />
                </Chip>

                <Chip
                  id="horario" label="Horário"
                  value={timeFrom || timeTo ? `${timeFrom || "--"}–${timeTo || "--"}` : undefined}
                  active={!!(timeFrom || timeTo)}
                  onClear={() => { setTimeFrom(""); setTimeTo(""); }}
                >
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="bg-background border-border h-9 px-2 text-xs" />
                      <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="bg-background border-border h-9 px-2 text-xs" />
                    </div>
                  </div>
                </Chip>

                <button
                  type="button"
                  onClick={() => setOnlyFavorites((v) => !v)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    onlyFavorites
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                  aria-pressed={onlyFavorites}
                >
                  <Heart size={12} className={onlyFavorites ? "fill-current" : ""} />
                  Favoritos
                </button>
              </div>
            </div>
          );
        })()}

        {/* Painel "Filtros" completo */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="text-left">Filtros</SheetTitle>
            </SheetHeader>

            <div className="flex-1 min-h-0 flex">
              {/* Coluna esquerda: grupos */}
              <div className="w-32 shrink-0 border-r border-border overflow-y-auto bg-muted/30">
                {([
                  ["localizacao", "Localização"],
                  ["modalidade", "Modalidade"],
                  ["genero", "Gênero"],
                  ["categoria", "Categoria"],
                  ["nivel", "Nível"],
                  ["campo", "Com Campo"],
                  ["dia", "Dia"],
                  ["horario", "Horário"],
                  ["favoritos", "Favoritos"],
                ] as [FilterGroup, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveGroup(key)}
                    className={cn(
                      "w-full text-left px-3 py-3 text-xs border-l-2 transition-colors",
                      activeGroup === key
                        ? "bg-background border-l-primary text-foreground font-semibold"
                        : "border-l-transparent text-muted-foreground hover:bg-background/60"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Coluna direita: opções do grupo */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeGroup === "localizacao" && (
                  <>
                    <MultiSelect
                      label="Estado" options={toOptions(UFS)} selected={selectedUFs}
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
                      label="Cidade" options={toOptions(cityOptions)} selected={selectedCities}
                      onChange={setSelectedCities} placeholder="Todas"
                    />
                    {regionEnabled ? (
                      <MultiSelect
                        label="Região" options={toOptions(REGIOES)} selected={selectedRegions}
                        onChange={setSelectedRegions} placeholder="Todas"
                      />
                    ) : (
                      <div className="opacity-60">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Região</p>
                        <div className="flex min-h-9 items-center rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
                          Disponível apenas para São Paulo
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeGroup === "modalidade" && (
                  <MultiSelect
                    label="Modalidade" options={toOptions(MODALIDADES)} selected={selectedModalidades}
                    onChange={setSelectedModalidades} placeholder="Todas"
                  />
                )}
                {activeGroup === "genero" && (
                  <MultiSelect
                    label="Gênero" options={toOptions(GENEROS)} selected={selectedGeneros}
                    onChange={setSelectedGeneros} placeholder="Todos"
                  />
                )}
                {activeGroup === "categoria" && (
                  <>
                    <MultiSelect
                      label="Categoria" options={toOptions(CATEGORIAS)} selected={selectedCategorias}
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
                      label="Subcategoria" options={toOptions(subCategoriaOptions)} selected={selectedSubCategorias}
                      onChange={setSelectedSubCategorias} placeholder="Todas"
                    />
                  </>
                )}
                {activeGroup === "nivel" && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nível mínimo</p>
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
                )}
                {activeGroup === "campo" && (
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
                )}
                {activeGroup === "dia" && (
                  <MultiSelect
                    label="Dia da Semana" options={DIAS_SEMANA} selected={selectedDays}
                    onChange={setSelectedDays} placeholder="Todos"
                  />
                )}
                {activeGroup === "horario" && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="bg-background border-border h-9 px-2 text-xs" />
                      <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="bg-background border-border h-9 px-2 text-xs" />
                    </div>
                  </div>
                )}
                {activeGroup === "favoritos" && (
                  <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Heart size={14} className={onlyFavorites ? "text-red-500 fill-red-500" : "text-muted-foreground"} />
                      <p className="text-xs font-semibold">Mostrar apenas favoritos</p>
                    </div>
                    <Switch checked={onlyFavorites} onCheckedChange={setOnlyFavorites} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border bg-background px-4 py-3 flex items-center gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setSelectedUFs([]); setSelectedCities([]); setSelectedRegions([]);
                  setSelectedModalidades([]); setSelectedCategorias([]); setSelectedSubCategorias([]);
                  setSelectedGeneros([]); setSelectedDays([]);
                  setFieldChoice("tanto"); setNivelChoice("todas");
                  setTimeFrom(""); setTimeTo(""); setOnlyFavorites(false);
                }}
              >
                Limpar filtros
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={() => setFiltersOpen(false)}
              >
                Ver {filteredTeams.length} resultados
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">{filteredTeams.length} times encontrados</p>
        </div>


          <div className="space-y-2">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => {
                const schedule: Record<string, { mode?: "fixed" | "flexible"; start?: string; end?: string }> =
                  (team as any).play_schedule || {};
                const daysArr: string[] = Array.isArray(team.play_days) ? team.play_days : [];

                const hasPerDaySchedule =
                  daysArr.length > 0 &&
                  daysArr.some((d) => schedule[d] && schedule[d].start);

                const scheduleLines = hasPerDaySchedule
                  ? daysArr
                      .map((d) => {
                        const label = DIAS_SEMANA.find((x) => x.value === d)?.label || d;
                        const sched = schedule[d];
                        if (sched?.start) {
                          const timeStr =
                            sched.mode === "flexible" && sched.end
                              ? `${sched.start}–${sched.end}`
                              : sched.start;
                          return `${label} ${timeStr}`;
                        }
                        return label;
                      })
                      .join(", ")
                  : "";

                const teamTime =
                  !hasPerDaySchedule && (team.play_time_start || team.play_time_end)
                    ? team.play_time_start && team.play_time_end
                      ? `${team.play_time_start} até ${team.play_time_end}`
                      : team.play_time_start || team.play_time_end || "Horário não informado"
                    : "";
                const teamDays =
                  !hasPerDaySchedule && daysArr.length > 0
                    ? daysArr.map((d: string) => DIAS_SEMANA.find((x) => x.value === d)?.label || d).join(", ")
                    : !hasPerDaySchedule ? "Dias não informados" : "";

                const isOwnTeam = myTeam?.id === team.id;
                const canChallengeTeam = canLaunchChallenges && !isOwnTeam;

                return (
                  <div
                    key={team.id}
                    role={canChallengeTeam ? "button" : undefined}
                    tabIndex={canChallengeTeam ? 0 : -1}
                    onClick={() => { if (canChallengeTeam) setChallengeTeam(team); }}
                    onKeyDown={(e) => {
                      if (!canChallengeTeam) return;
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChallengeTeam(team); }
                    }}
                    className={`w-full text-left rounded-xl border border-border bg-background p-3 transition-colors ${canChallengeTeam ? "cursor-pointer hover:border-primary/50" : "opacity-80"}`}
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
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {scheduleLines || `${teamDays}${teamTime ? ` · ${teamTime}` : ""}`}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/opponent-details?teamId=${team.id}`); }}
                        className="flex h-9 flex-1 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80"
                      >
                        Detalhes
                      </button>
                      {canChallengeTeam ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setChallengeTeam(team); }}
                          className="flex h-9 flex-1 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          Toque para desafiar →
                        </button>
                      ) : isOwnTeam ? (
                        <p className="flex-1 text-center text-[10px] font-semibold text-muted-foreground">Este é seu time</p>
                      ) : null}
                    </div>
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



      {/* Dialog Desafio */}
      <Dialog
        open={!!challengeTeam}
        onOpenChange={(open) => {
          if (!open) {
            setChallengeTeam(null);
            setChallengeDate(""); setChallengeTime("");
            setLocationChoice("away"); setChallengeLocation("");
          } else if (challengeTeam) {
            setChallengeTime(challengeTeam.play_time_start ? String(challengeTeam.play_time_start).slice(0, 5) : "");
            const myHasField = (matchActionTeam as any)?.has_field === true;
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
                {(() => {
                  const flex = isAdminTimeFlexible(challengeDate);
                  const sched = adminScheduleForDate(challengeDate);
                  const rangeHint = flex && sched?.start && sched?.end ? ` (${sched.start}–${sched.end})` : "";
                  return (
                    <>
                      <Label htmlFor="ch-time" className="flex items-center gap-1">
                        <Clock size={14} /> Horário {flex ? `(flexível${rangeHint})` : "(fixo)"}
                      </Label>
                      <Input
                        id="ch-time"
                        type="time"
                        value={challengeTime}
                        readOnly={!flex}
                        onChange={(e) => setChallengeTime(e.target.value)}
                        className={!flex ? "opacity-80 cursor-not-allowed" : ""}
                      />
                    </>
                  );
                })()}
              </div>


              <div>
                <Label className="mb-2 block">Local</Label>
                <RadioGroup
                  value={locationChoice ?? ""}
                  onValueChange={(v) => {
                    const choice = v as "own" | "away";
                    setLocationChoice(choice);
                    setChallengeLocation("");
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
                        {teamAddress(matchActionTeam) || "Endereço não cadastrado"}
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
                  onChange={(e) => {
                    setChallengeLocation(e.target.value);
                    if (e.target.value.trim()) setLocationChoice(null);
                  }}
                  placeholder="Outro endereço (opcional)"
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
          if (open && matchActionTeam) {
            const t = matchActionTeam as any;
            if (t.play_time_start) {
              setNewMatchTime(String(t.play_time_start).slice(0, 5));
            }
            setNewMatchLocationChoice("own");
            setNewMatchLocation("");
          } else if (!open) {
            setNewMatchOpponent(""); setNewMatchDate(""); setNewMatchTime("");
            setNewMatchLocation(""); setNewMatchLocationChoice("own");
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
              <Label className="flex items-center gap-1 mb-1">
                <CalIcon size={14} /> Data do jogo
              </Label>
              {(() => {
                const myPlayDays: string[] = Array.isArray((matchActionTeam as any)?.play_days) ? (matchActionTeam as any).play_days : [];
                const allowedDow = new Set(myPlayDays.map((d) => DAY_INDEX[d]).filter((n) => n !== undefined));
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const selected = newMatchDate ? new Date(newMatchDate + "T12:00:00") : undefined;
                const isBusy = (date: Date) =>
                  myBusyDateKeys.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
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
                        {selected ? format(selected, "PPP", { locale: ptBR }) : "Selecione uma data disponível"}
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
                            toast({ title: "Data ocupada", description: "Seu time já tem jogo confirmado nesse dia.", variant: "destructive" });
                            return;
                          }
                          if (allowedDow.size > 0 && !allowedDow.has(d.getDay())) {
                            toast({
                              title: "Dia não permitido",
                              description: `Seu time só joga: ${myPlayDays.map((x) => WEEK_DAY_LABEL[x]).join(", ")}`,
                              variant: "destructive",
                            });
                            return;
                          }
                          setNewMatchDate(format(d, "yyyy-MM-dd"));
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
                          Datas disponíveis do seu time
                        </div>
                        <div>Datas com jogo já confirmado ficam indisponíveis.</div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
            <div>
              {(() => {
                const flex = isAdminTimeFlexible(newMatchDate);
                const sched = adminScheduleForDate(newMatchDate);
                const rangeHint = flex && sched?.start && sched?.end ? ` (${sched.start}–${sched.end})` : "";
                return (
                  <>
                    <Label htmlFor="nm-time" className="flex items-center gap-1">
                      <Clock size={14} /> Horário {flex ? `(flexível${rangeHint})` : "(fixo)"}
                    </Label>
                    <Input
                      id="nm-time"
                      type="time"
                      value={newMatchTime}
                      readOnly={!flex}
                      onChange={(e) => setNewMatchTime(e.target.value)}
                      className={!flex ? "opacity-80 cursor-not-allowed" : ""}
                    />
                  </>
                );
              })()}
            </div>
            <div>
              <Label className="mb-2 block">Local</Label>
              <RadioGroup
                value={newMatchLocationChoice ?? ""}
                onValueChange={(v) => {
                  const choice = v as "own" | "away";
                  setNewMatchLocationChoice(choice);
                  setNewMatchLocation("");
                }}
                className="space-y-2"
              >
                <label htmlFor="nm-loc-own" className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
                  <RadioGroupItem id="nm-loc-own" value="own" className="mt-1" />
                  <div className="text-sm">
                    <div className="font-semibold flex items-center gap-1"><Building2 size={14} /> Meu campo</div>
                    <div className="text-xs text-muted-foreground">
                      {teamAddress(matchActionTeam) || "Endereço não cadastrado"}
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
              <Input
                className="mt-2"
                value={newMatchLocation}
                onChange={(e) => {
                  setNewMatchLocation(e.target.value);
                  if (e.target.value.trim()) setNewMatchLocationChoice(null);
                }}
                placeholder="Outro endereço (opcional)"
              />
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
