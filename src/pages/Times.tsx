import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Shield, ChevronDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { useMyTeam } from "@/hooks/useSupabaseData";
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

type MultiSelectProps = {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

const MultiSelect = ({ label, options, selected, onChange, placeholder }: MultiSelectProps) => {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label || v;

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-left text-xs"
          >
            <div className="flex flex-1 flex-wrap gap-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder || "Selecione..."}</span>
              ) : (
                selected.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground"
                  >
                    {labelFor(s)}
                    <X
                      size={10}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggle(s);
                      }}
                    />
                  </span>
                ))
              )}
            </div>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
          <div className="max-h-60 overflow-auto">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

const TimesPage = () => {
  const navigate = useNavigate();
  const { data: myTeam } = useMyTeam();

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
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [defaultsApplied, setDefaultsApplied] = useState(false);

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

  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

  // Cidades disponíveis: união das cidades dos UFs selecionados (ou todas)
  const cityOptions = useMemo(() => {
    const ufs = selectedUFs.length > 0 ? selectedUFs : UFS;
    const set = new Set<string>();
    ufs.forEach((uf) => getCitiesForUf(uf).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [selectedUFs]);

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
    const teamStart = toMinutes(t.play_time_start);
    const teamEnd = toMinutes(t.play_time_end);
    const matchesTime =
      (!fromMinutes || (teamEnd !== null && teamEnd >= fromMinutes)) &&
      (!toMinutesFilter || (teamStart !== null && teamStart <= toMinutesFilter));
    return (
      matchesName && matchesUf && matchesCity && matchesRegion && matchesModalidade &&
      matchesCategoria && matchesSubCategoria && matchesGenero && matchesDays && matchesTime
    );
  });

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
            <p className="text-[10px] text-muted-foreground">Filtros pré-selecionados conforme seu time</p>
            <Badge variant="secondary">{filteredTeams.length} times</Badge>
          </div>

          <div className="space-y-3">
            {/* 1 - Nome do Time com autocomplete */}
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

            {/* 2 - Estado */}
            <MultiSelect
              label="Estado"
              options={toOptions(UFS)}
              selected={selectedUFs}
              onChange={(next) => {
                setSelectedUFs(next);
                // limpa cidades que não pertencem mais aos UFs selecionados
                if (next.length > 0) {
                  const allowed = new Set<string>();
                  next.forEach((uf) => getCitiesForUf(uf).forEach((c) => allowed.add(c)));
                  setSelectedCities((prev) => prev.filter((c) => allowed.has(c)));
                }
              }}
              placeholder="Todos os estados"
            />

            {/* 3 - Cidade */}
            <MultiSelect
              label="Cidade"
              options={toOptions(cityOptions)}
              selected={selectedCities}
              onChange={setSelectedCities}
              placeholder="Todas as cidades"
            />

            {/* 4 - Região */}
            <MultiSelect
              label="Região"
              options={toOptions(REGIOES)}
              selected={selectedRegions}
              onChange={setSelectedRegions}
              placeholder="Todas as regiões"
            />

            {/* Modalidade (mantida) */}
            <MultiSelect
              label="Modalidade"
              options={toOptions(MODALIDADES)}
              selected={selectedModalidades}
              onChange={setSelectedModalidades}
              placeholder="Todas as modalidades"
            />

            {/* 5 - Categoria */}
            <MultiSelect
              label="Categoria"
              options={toOptions(CATEGORIAS)}
              selected={selectedCategorias}
              onChange={(next) => {
                setSelectedCategorias(next);
                // limpa subcategorias incompatíveis
                const allowed = new Set<string>();
                if (next.length === 0 || next.includes("Adulto")) SUB_CATEGORIAS_ADULTO.forEach((s) => allowed.add(s));
                if (next.length === 0 || next.includes("Infantil")) SUB_CATEGORIAS_INFANTIL.forEach((s) => allowed.add(s));
                setSelectedSubCategorias((prev) => prev.filter((s) => allowed.has(s)));
              }}
              placeholder="Todas as categorias"
            />

            {/* 6 - Subcategoria */}
            <MultiSelect
              label="Subcategoria"
              options={toOptions(subCategoriaOptions)}
              selected={selectedSubCategorias}
              onChange={setSelectedSubCategorias}
              placeholder="Todas as subcategorias"
            />

            {/* 7 - Gênero */}
            <MultiSelect
              label="Gênero"
              options={toOptions(GENEROS)}
              selected={selectedGeneros}
              onChange={setSelectedGeneros}
              placeholder="Todos os gêneros"
            />

            {/* 8 - Dia da Semana */}
            <MultiSelect
              label="Dia da Semana"
              options={DIAS_SEMANA}
              selected={selectedDays}
              onChange={setSelectedDays}
              placeholder="Todos os dias"
            />

            {/* 9 - Horário */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</p>
              <div className="grid grid-cols-2 gap-3">
                <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="bg-background border-border" />
                <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="bg-background border-border" />
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

                return (
                  <div
                    key={team.id}
                    className="w-full text-left rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="truncate">{team.name}</span>
                          {(() => { const s = getTeamStats(team.id); return <NotaBadge nota={s.nota} played={s.played} />; })()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(team as any).estilo || "Sem modalidade"} · {team.categoria || "Sem categoria"}
                          {(team as any).sub_categoria ? ` · ${(team as any).sub_categoria}` : ""} · {team.region || "Sem região"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(team as any).addr_cidade || "—"}/{(team as any).addr_uf || "—"}
                          {(team as any).gender ? ` · ${(team as any).gender}` : ""}
                        </p>
                      </div>
                      <Shield size={16} className="text-primary" />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{teamDays} · {teamTime}</p>
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

      <BottomNav />
    </div>
  );
};

export default TimesPage;
