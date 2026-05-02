import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Share2, Lock, Clock, MapPin, Eye, CheckCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const sampleEvents = [
  {
    id: "1",
    title: "Torneio Relâmpago",
    status: "Aberto",
    dateLabel: "Setembro",
    day: "24",
    time: "19:00 - 22:00",
    location: "Arena Central de Esportes",
    raised: 1200,
    target: 1500,
    progress: 80,
    participants: [
      { name: "Ricardo Santos", role: "Jogador Titular", amount: "R$ 85,00", status: "Pago", statusClass: "text-primary" },
      { name: "Mariana Lima", role: "Convidada", amount: "R$ 85,00", status: "Pendente", statusClass: "text-error" },
      { name: "Carlos Eduardo", role: "Jogador Titular", amount: "R$ 85,00", status: "Pago", statusClass: "text-primary" },
      { name: "Fernando Silva", role: "Jogador Reserva", amount: "R$ 85,00", status: "Pago", statusClass: "text-primary" },
    ],
  },
];

const EventDetailsPage = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();

  const event = useMemo(
    () => sampleEvents.find((item) => item.id === eventId) || sampleEvents[0],
    [eventId]
  );

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition"
          >
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Event Details</h1>
        </div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition"
        >
          <MoreVertical size={20} className="text-primary" />
        </button>
      </header>

      <main className="pt-24 px-4 pb-32 mx-auto max-w-5xl space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-8 space-y-6">
            <div className="space-y-2">
              <span className="inline-block rounded-full bg-surface-container-highest px-4 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                {event.status}
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-on-background tracking-tighter leading-none">
                {event.title}
              </h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-6 sm:flex-row items-start sm:items-center">
              <div className="flex flex-col items-center justify-center border-r border-outline-variant/20 pr-6">
                <span className="text-xs uppercase tracking-tighter font-bold text-on-surface-variant transform -rotate-90">
                  {event.dateLabel}
                </span>
                <span className="text-3xl font-black text-primary">{event.day}</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                  <Clock size={16} />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface text-base font-semibold">
                  <MapPin size={16} />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-surface-container rounded-xl p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Meta Arrecadação</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-on-background tracking-tighter">R$ {Number(event.raised).toFixed(2)}</span>
                <span className="text-sm font-medium text-on-surface-variant">/ R$ {Number(event.target).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary-fixed" style={{ width: `${event.progress}%` }} />
              </div>
              <p className="text-right text-xs font-bold text-primary italic">{event.progress}% Concluído</p>
            </div>

            <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
              <button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-container px-4 py-4 text-sm font-bold text-on-primary transition hover:brightness-110 flex items-center justify-center gap-2">
                <Share2 size={18} />
                Compartilhar Vaquinha
              </button>
              <button className="w-full rounded-xl bg-surface-container-high px-4 py-4 text-sm font-bold text-primary transition hover:bg-surface-container-highest flex items-center justify-center gap-2">
                <Lock size={18} />
                Encerrar Evento
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-6 pb-12">
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black tracking-tight text-on-background">
              Participantes <span className="text-primary-dim opacity-40 font-normal">/ {event.participants.length}</span>
            </h3>
            <button className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.participants.map((participant) => (
              <div
                key={participant.name}
                className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-highest transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-dim text-primary">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-on-background">{participant.name}</p>
                    <p className="text-xs text-on-surface-variant font-medium">{participant.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary tracking-tight">{participant.amount}</p>
                  <p className={`text-[10px] uppercase tracking-widest font-bold ${participant.statusClass}`}>
                    {participant.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default EventDetailsPage;
