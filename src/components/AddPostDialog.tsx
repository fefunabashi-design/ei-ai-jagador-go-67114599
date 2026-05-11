import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_BYTES = 25 * 1024 * 1024;

const AddPostDialog = ({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) => {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<"imagem" | "video">("imagem");
  const [origem, setOrigem] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [legenda, setLegenda] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTipo("imagem"); setOrigem("upload"); setFile(null); setUrl(""); setLegenda("");
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      let finalUrl = url.trim();

      if (origem === "upload") {
        if (!file) { toast({ title: "Selecione um arquivo", variant: "destructive" }); return; }
        if (file.size > MAX_BYTES) { toast({ title: "Arquivo muito grande", description: "Máximo 25 MB.", variant: "destructive" }); return; }
        const ext = file.name.split(".").pop() || (tipo === "imagem" ? "jpg" : "mp4");
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
        finalUrl = pub.publicUrl;
      } else {
        if (!/^https?:\/\//i.test(finalUrl)) { toast({ title: "URL inválida", description: "Cole um link começando com http(s)://", variant: "destructive" }); return; }
      }

      if (legenda.length > 500) { toast({ title: "Legenda muito longa", variant: "destructive" }); return; }

      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        tipo,
        url: finalUrl,
        legenda: legenda.trim() || null,
      });
      if (error) throw error;

      toast({ title: "Post publicado!" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v as any); setFile(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Origem da mídia</Label>
            <RadioGroup value={origem} onValueChange={(v) => setOrigem(v as any)} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="upload" /> Upload
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="url" /> Colar URL
              </label>
            </RadioGroup>
          </div>

          {origem === "upload" ? (
            <div className="space-y-2">
              <Label>Arquivo (máx 25 MB)</Label>
              <Input
                type="file"
                accept={tipo === "imagem" ? "image/*" : "video/*"}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder={tipo === "video" ? "https://youtube.com/..." : "https://..."}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea value={legenda} onChange={(e) => setLegenda(e.target.value)} maxLength={500} placeholder="Conta a história do lance..." />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPostDialog;
