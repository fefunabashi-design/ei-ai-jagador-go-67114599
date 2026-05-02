import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import NotaBadge from "@/components/NotaBadge";
import { useMyTeam } from "@/hooks/useSupabaseData";
import { mockDb } from "@/lib/mockDb";
import { getCitiesForUf } from "@/lib/brCities";
import { getTeamStats } from "@/lib/stats";

const CATEGORIAS = ["Todas", "Esporte", "35+", "40+", "45+", "50+", "60+"];
const REGIOES = ["Z/L", "Z/N", "Z/O", "Z/S"];
const FORMATOS = ["Campo", "Futsal", "Mini Campo"];

const TimesPage = () => {
  const navigate = useNavigate();
  const { data: myTeam } = useMyTeam();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [showCitySuggest, setShowCitySuggest] = useState(false);
  const [showNameSuggest, setShowNameSuggest] = useState(false);

  // Pré-popular cidade com a do cadastro do jogador (via meu time)
  useEffect(() => {
    if (!myTeam) return;
    const t = myTeam as any;
    if (t.addr_cidade) setCityQuery(t.addr_cidade);
  }, [myTeam]);

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
    queryKey: ["registered_teams_all"],
    queryFn: () => mockDb.getAllTeams(),
  });

  const fromMinutes = toMinutes(timeFrom);
  const toMinutesFilter = toMinutes(timeTo);

  const filteredCitySuggest = (() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cityOptions.slice(0, 8);
    return cityOptions.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  })();

  const filteredNameSuggest = (() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return [] as any[];
    return registeredTeams.filter((t) => t.name?.toLowerCase().includes(q)).slice(0, 8);
  })();

  const includesAll = (cats: string[]) => cats.includes("Todas");

  const filteredTeams = registeredTeams.filter((team) => {
    const matchesCategory =
      selectedCategories.length === 0 ||
      includesAll(selectedCategories) ||
      selectedCategories.includes(team.categoria || "");
    const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(team.region || "");
    const matchesFormat =
      selectedFormats.length === 0 || selectedFormats.includes((team as any).format || "");
    const teamStart = toMinutes(team.play_time_start);
    const teamEnd = toMinutes(team.play_time_end);
    const matchesTime =
      (!fromMinutes || (teamEnd !== null && teamEnd >= fromMinutes)) &&
      (!toMinutesFilter || (teamStart !== null && teamStart <= toMinutesFilter));
    const matchesCity =
      !cityQuery.trim() ||
      ((team as any).addr_cidade || "").toLowerCase().includes(cityQuery.trim().toLowerCase());
    const matchesName =
      !nameQuery.trim() || (team.name || "").toLowerCase().includes(nameQuery.trim().toLowerCase());
    return matchesCategory && matchesRegion && matchesFormat && matchesTime && matchesCity && matchesName;
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
            <p className="text-[10px] text-muted-foreground">Selecione uma ou mais opções por filtro</p>
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

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Modalidade</p>
              <div className="flex flex-wrap gap-2">
                {FORMATOS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => toggleFilter(fmt, setSelectedFormats)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                      selectedFormats.includes(fmt)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
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
