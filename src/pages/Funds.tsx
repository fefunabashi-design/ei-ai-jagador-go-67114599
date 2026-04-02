import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, Eye, MapPin, Menu, Plus, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ongoingEvents = [
  {
    id: "1",
    title: "Torneio Relâmpago Intercampi",
    location: "Arena Poliesportiva Central",
    date: "24 OUT",
    status: "Aberto",
    progress: 62,
    raised: 1250,
    target: 2000,
    cover:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "2",
    title: "Uniforme Novo - Time B",
    location: "Loja Esportiva Oficial",
    date: "12 NOV",
    status: "Aberto",
    progress: 56,
    raised: 450,
    target: 800,
    cover:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=80",
  },
];

const pastEvents = [
  {
    id: "3",
    title: "Churrasco da Vitória",
    description: "Encerrado em 05 Out • Parque Municipal",
    amount: "R$ 540,00",
    people: "18 Jogadores",
  },
  {
    id: "4",
    title: "Inscrição Liga Regional",
    description: "Encerrado em 22 Set • Federação Mineira",
    amount: "R$ 1.500,00",
    people: "22 Jogadores",
  },
];

const months = ["Mês", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const years = ["Ano", "2024", "2023"];

const FundsPage = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState("Mês");
  const [year, setYear] = useState("Ano");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(
    () =>
      ongoingEvents.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.location.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="rounded-xl bg-surface-container px-3 py-2 text-primary shadow-sm transition hover:bg-surface-container-high">
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">Painel</p>
              <h1 className="text-lg font-black text-foreground">Vaquinhas</h1>
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high border border-border">
            <span className="text-sm font-bold text-primary">CJ</span>
          </div>
        </div>
      </header>

      <main className="pt-28 px-6 pb-32 mx-auto max-w-5xl">
        <section className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-2">Painel de Controle</p>
            <h2 className="text-4xl font-black tracking-tight text-foreground leading-tight">Eventos &amp; Arrecadações</h2>
          </div>
          <Button
            type="button"
            onClick={() => navigate("/funds/create")}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-4 rounded-xl shadow-[0_8px_24px_rgba(3,54,33,0.08)] font-bold"
          >
            <Plus size={18} />
            Novo Evento
          </Button>
        </section>

        <section className="mb-10 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar eventos..."
              className="pl-12 pr-4 py-4 rounded-xl bg-surface-container-low border-none text-on-surface placeholder:text-on-surface-variant shadow-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[120px] flex-1 sm:flex-none">
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="appearance-none w-full rounded-xl bg-surface-container-high border border-border px-3 py-3 text-sm font-semibold text-primary focus:outline-none"
              >
                {months.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary text-lg">▾</span>
            </div>
            <div className="relative min-w-[120px] flex-1 sm:flex-none">
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="appearance-none w-full rounded-xl bg-surface-container-high border border-border px-3 py-3 text-sm font-semibold text-primary focus:outline-none"
              >
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary text-lg">▾</span>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Em Andamento</h3>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                3 Ativos
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {filteredEvents.map((event) => (
                <article key={event.id} className="group overflow-hidden rounded-xl bg-surface-container-lowest border border-border shadow-[0_8px_24px_rgba(3,54,33,0.04)] transition-transform duration-300 hover:-translate-y-1">
                  <div className="bg-surface-container-high rounded-t-xl p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                          {event.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">Data</span>
                        <p className="text-xl font-black text-foreground">{event.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between p-6 gap-6">
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h4 className="text-xl font-bold leading-snug text-foreground group-hover:text-primary transition-colors">{event.title}</h4>
                        <button className="text-on-surface-variant transition hover:text-primary">
                          <span className="text-2xl">⋮</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
                        <MapPin size={16} />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-bold text-on-surface-variant">
                        <span>Progresso</span>
                        <span className="text-primary">R$ {event.raised} / R$ {event.target}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary-fixed" style={{ width: `${event.progress}%` }} />
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                        type="button"
                        onClick={() => navigate(`/funds/event/${event.id}`)}
                        className="inline-flex items-center gap-1 text-primary text-sm font-bold hover:underline"
                      >
                        Detalhes
                        <ArrowRight size={16} />
                      </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Eventos Encerrados</h3>
              <button className="text-primary font-bold text-sm hover:underline">Ver Histórico Completo</button>
            </div>
            <div className="space-y-4">
              {pastEvents.map((event) => (
                <div key={event.id} className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest text-primary">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h5 className="text-lg font-bold text-foreground">{event.title}</h5>
                        <span className="rounded-full bg-outline-variant/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
                          Encerrado
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant">{event.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 text-right md:text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-on-surface-variant font-bold">Meta Atingida</p>
                      <p className="font-bold text-primary">{event.amount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-on-surface-variant font-bold">Participantes</p>
                      <p className="font-bold">{event.people}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/funds/event/${event.id}`)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-primary transition hover:bg-surface-variant"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default FundsPage;
