import { useState, useEffect } from "react";
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
import { getCitiesForUf } from "@/lib/brCities";
import { getTeamStats } from "@/lib/stats";
import { startsWithNorm } from "@/lib/normalize";

const CATEGORIAS = ["Esporte", "35+", "40+", "45+", "50+", "60+"];
const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];
const FORMATOS = ["Campo", "Futsal", "Mini Campo"];
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type MultiSelectProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

const MultiSelect = ({ label, options, selected, onChange, placeholder }: MultiSelectProps) => {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

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
                    {s}
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
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(opt)} />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const TimesPage = () => {
  const navigate = useNavigate();
  const { data: myTeam } = useMyTeam();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showCitySuggest, setShowCitySuggest] = useState(false);
  const [showNameSuggest, setShowNameSuggest] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // Pré-popular filtros e cidade com base no time do usuário
  useEffect(() => {
    if (!myTeam || defaultsApplied) return;
    const t = myTeam as any;
    if (t.addr_cidade) setCityQuery(t.addr_cidade);
    if (t.categoria) setSelectedCategories([t.categoria]);
    if (t.region) setSelectedRegions([t.region]);
    if (t.format) setSelectedFormats([t.format]);
    if (Array.isArray(t.play_days) && t.play_days.length > 0) setSelectedDays(t.play_days);
    if (t.play_time_start) setTimeFrom(t.play_time_start.slice(0, 5));
    if (t.play_time_end) setTimeTo(t.play_time_end.slice(0, 5));
    setDefaultsApplied(true);
  }, [myTeam, defaultsApplied]);

  const toMinutes = (value?: string | null) => {
    if (!value || !value.includes(":")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const myUf = ((myTeam as any)?.addr_uf || "SP").toUpperCase();
  const cityOptions = getCitiesForUf(myUf);

  const { data: registeredTeams = [] } = useQuery<any[]>({
    queryKey: ["registered_teams_all"],
    queryFn: async () => {
      const { data } = await supabase.from("public_teams").select("*");
      return data || [];
    },
  });

  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

  const filteredCitySuggest = (() => {
    if (!cityQuery.trim()) return cityOptions.slice(0, 8);
    return cityOptions.filter((c) => startsWithNorm(c, cityQuery)).slice(0, 8);
  })();

  const filteredNameSuggest = (() => {
    if (!nameQuery.trim()) return [] as any[];
    return registeredTeams.filter((t) => startsWithNorm(t.name, nameQuery)).slice(0, 8);
  })();

  const filteredTeams = registeredTeams.filter((team) => {
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(team.categoria || "");
    const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(team.region || "");
    const matchesFormat =
      selectedFormats.length === 0 || selectedFormats.includes((team as any).format || "");
    const teamDaysArr: string[] = Array.isArray((team as any).play_days) ? (team as any).play_days : [];
    const matchesDays =
      selectedDays.length === 0 || selectedDays.some((d) => teamDaysArr.includes(d));
    const teamStart = toMinutes(team.play_time_start);
    const teamEnd = toMinutes(team.play_time_end);
    const matchesTime =
      (!fromMinutes || (teamEnd !== null && teamEnd >= fromMinutes)) &&
      (!toMinutesFilter || (teamStart !== null && teamStart <= toMinutesFilter));
    const matchesCity = startsWithNorm((team as any).addr_cidade, cityQuery);
    const matchesName = startsWithNorm(team.name, nameQuery);
    return matchesCategory && matchesRegion && matchesFormat && matchesDays && matchesTime && matchesCity && matchesName;
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
                  placeholder="Buscar time pelo nome..."
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

            <MultiSelect
              label="Modalidade"
              options={FORMATOS}
              selected={selectedFormats}
              onChange={setSelectedFormats}
            />

            <MultiSelect
              label="Categoria"
              options={CATEGORIAS}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />

            <MultiSelect
              label="Região"
              options={REGIOES}
              selected={selectedRegions}
              onChange={setSelectedRegions}
            />

            <MultiSelect
              label="Dia da Semana"
              options={DIAS_SEMANA}
              selected={selectedDays}
              onChange={setSelectedDays}
            />

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
                  ? team.play_days.join(", ")
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
                          {(team as any).format || "Sem modalidade"} · {team.categoria || "Sem categoria"} · {team.region || "Sem região"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(team as any).addr_cidade || "—"}/{(team as any).addr_uf || "—"}
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
