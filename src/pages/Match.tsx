import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MatchCard from "@/components/MatchCard";
import BottomNav from "@/components/BottomNav";

const formats = ["Todos", "5x5", "8x8", "11x11"];

const mockMatches = [
  { homeTeam: "Tropa do Bruxo", location: "Campo Sintético JK", time: "Sáb 14h", format: "5x5", compatibility: 92, status: "open" as const },
  { homeTeam: "Real Várzea", location: "Arena Pelada Sul", time: "Sáb 16h", format: "8x8", compatibility: 85, status: "open" as const },
  { homeTeam: "Pé de Ouro FC", location: "Campão do Zé", time: "Dom 9h", format: "11x11", compatibility: 78, status: "open" as const },
  { homeTeam: "Os Crias FC", awayTeam: "Vila Nova SC", location: "Campo do Zé", time: "Sáb 16h", format: "8x8", status: "confirmed" as const },
  { homeTeam: "Bola Murcha FC", location: "Quadra Central", time: "Dom 15h", format: "5x5", compatibility: 71, status: "open" as const },
];

const MatchPage = () => {
  const [selectedFormat, setSelectedFormat] = useState("Todos");
  const [search, setSearch] = useState("");

  const filtered = mockMatches.filter((m) => {
    if (selectedFormat !== "Todos" && m.format !== selectedFormat) return false;
    if (search && !m.homeTeam.toLowerCase().includes(search.toLowerCase()) && !m.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-4xl text-foreground mb-1">ENCONTRAR MATCH</h1>
        <p className="text-sm text-muted-foreground">Busque o adversário ideal pra sua pelada</p>
      </div>

      <div className="px-5 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar time ou local..."
              className="pl-9 bg-card border-border"
            />
          </div>
          <Button variant="outline" size="icon" className="border-border">
            <SlidersHorizontal size={16} />
          </Button>
        </div>

        {/* Map hint */}
        <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm">
          <MapPin size={16} />
          <span>Ver campos próximos no mapa</span>
        </button>

        {/* Format filter */}
        <div className="flex gap-2">
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

        {/* Results */}
        <div className="space-y-3">
          {filtered.map((match, i) => (
            <MatchCard key={i} {...match} delay={i * 0.05} />
          ))}
          {filtered.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground text-sm py-8"
            >
              Nenhum match encontrado 😕
            </motion.p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default MatchPage;
