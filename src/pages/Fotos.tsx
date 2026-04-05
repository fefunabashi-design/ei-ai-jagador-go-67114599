import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, CalendarDays, Search, ImagePlus, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePhotoPost, useMyTeam, usePhotoEvents, usePhotoPosts } from "@/hooks/useSupabaseData";

const months = [
  { value: "all", label: "Todos os meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const getEventDateLabel = (date: string) =>
  new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const FotosPage = () => {
  const { data: myTeam } = useMyTeam();
  const { data: events = [] } = usePhotoEvents(myTeam?.id);
  const { data: initialPosts = [] } = usePhotoPosts(myTeam?.id);
  const createPhotoPost = useCreatePhotoPost();

  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const years = useMemo(() => {
    const values = new Set<string>();
    events.forEach((event) => {
      values.add(String(new Date(event.date).getFullYear()));
    });

    return ["all", ...Array.from(values).sort((a, b) => Number(b) - Number(a))];
  }, [events]);

  const postsByEvent = useMemo(() => {
    return posts.reduce((acc: Record<string, any[]>, post) => {
      if (!acc[post.event_id]) acc[post.event_id] = [];
      acc[post.event_id].push(post);
      return acc;
    }, {});
  }, [posts]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const date = new Date(event.date);
      const monthOk = month === "all" || Number(month) === date.getMonth() + 1;
      const yearOk = year === "all" || String(date.getFullYear()) === year;
      const searchOk =
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.type_label.toLowerCase().includes(search.toLowerCase()) ||
        (event.location || "").toLowerCase().includes(search.toLowerCase());

      return monthOk && yearOk && searchOk;
    });
  }, [events, month, search, year]);

  const openPublishModal = (event: any) => {
    setSelectedEvent(event);
    setComment("");
    setPhotoPreview("");
    setModalOpen(true);
  };

  const handlePickFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!selectedEvent || !myTeam || !photoPreview) return;

    const created = await createPhotoPost.mutateAsync({
      team_id: myTeam.id,
      event_id: selectedEvent.id,
      event_type: selectedEvent.type,
      event_title: selectedEvent.title,
      match_id: selectedEvent.match_id,
      photo_url: photoPreview,
      comment,
    });

    setPosts((prev) => [created, ...prev]);
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-8 pb-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Camera size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display text-foreground">FOTOS DO TIME</h1>
          <p className="text-xs text-muted-foreground">Publique imagens vinculadas a eventos</p>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar evento por nome, tipo ou local"
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "all" ? "Todos os anos" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {myTeam && filteredEvents.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground text-center">
            Nenhum evento encontrado com os filtros atuais.
          </div>
        )}

        {!myTeam && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm text-primary">Crie seu time para liberar os eventos de foto.</p>
          </div>
        )}

        {filteredEvents.map((event, index) => {
          const hasPhoto = (postsByEvent[event.id] || []).length > 0;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{event.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <CalendarDays size={12} /> {getEventDateLabel(event.date)}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin size={12} /> {event.location || "Local a definir"}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                    hasPhoto
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {hasPhoto ? "Foto publicada" : "Sem foto"}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-primary font-semibold uppercase tracking-wide">
                  {event.type_label}
                </span>
                <Button size="sm" onClick={() => openPublishModal(event)}>
                  <ImagePlus size={14} className="mr-1" />
                  Publicar
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar foto do evento</DialogTitle>
            <DialogDescription>
              {selectedEvent ? selectedEvent.title : "Selecione um evento"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Imagem</p>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => handlePickFile(event.target.files?.[0] || null)}
              />
            </div>

            {photoPreview && (
              <img
                src={photoPreview}
                alt="Pré-visualização"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Comentário</p>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Descreva o momento deste evento"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handlePublish}
              disabled={!photoPreview || createPhotoPost.isPending}
              className="w-full"
            >
              {createPhotoPost.isPending ? "Publicando..." : "Publicar foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default FotosPage;
