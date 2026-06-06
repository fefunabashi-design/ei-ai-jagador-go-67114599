import { useState, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, LogOut, Pencil, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfile, useUpdateProfile, useUploadAvatar, useAuth } from "@/hooks/useSupabaseData";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/App";

import { getCitiesForUf } from "@/lib/brCities";

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const SYNTHETIC_EMAIL_SUFFIX = "@cpf.eaijogador.app";
const cleanSyntheticEmail = (e?: string | null) => {
  if (!e) return "";
  return String(e).toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX) ? "" : String(e);
};

const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Padrão", value: "#bfc4cb" },
  { label: "Verde", value: "#10b981" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Laranja", value: "#f97316" },
  { label: "Roxo", value: "#8b5cf6" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Preto", value: "#111827" },
  { label: "Cinza", value: "#6b7280" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requireComplete = (location.state as any)?.requireComplete === true;
  const [justSaved, setJustSaved] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState(false);
  const { status: authStatus } = useAuthContext();

  const isIncomplete = !!profile && [
    profile?.display_name,
    (profile as any)?.last_name,
    profile?.phone,
    profile?.birth_date,
    (profile as any)?.cpf,
    (profile as any)?.city,
  ].some((v) => !v || String(v).trim() === "");

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editGenderOther, setEditGenderOther] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#bfc4cb");
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Auto-open edit dialog on first login when profile is incomplete.
  // Only fires once per profile load — never re-opens after the user closes it,
  // to avoid resetting typed fields when Radix Select portals trigger outside-clicks.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (justSaved || pendingNavigate) return;
    if (autoOpenedRef.current) return;
    if (!isLoading && profile && isIncomplete) {
      autoOpenedRef.current = true;
      openEditProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile?.user_id, requireComplete, isIncomplete, justSaved, pendingNavigate]);

  // After a successful first-time save, wait until the AuthProvider re-checks
  // the profile and flips status to "ok" before navigating — otherwise the
  // dashboard route guard sees the stale "incomplete" status and bounces us
  // back to /profile, where the auto-open effect reopens the form with the
  // not-yet-refetched (blank) profile data.
  useEffect(() => {
    if (!pendingNavigate) return;
    if (authStatus === "ok") {
      setPendingNavigate(false);
      navigate("/dashboard", { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNavigate, authStatus]);

  // Intercept browser/Android back button to close the dialog first
  useEffect(() => {
    if (!editOpen) return;
    window.history.pushState({ dialog: "editProfile" }, "");
    const onPopState = () => {
      setEditOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [editOpen]);


  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const isoToBr = (iso?: string | null) => {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
  };

  const brToIso = (br: string) => {
    const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  };

  const formatBirthDate = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  };

  const formatCpf = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const isValidCpf = (value: string) => {
    const d = value.replace(/\D/g, "");
    if (d.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(d)) return false;
    const calc = (len: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += parseInt(d[i], 10) * (len + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === parseInt(d[9], 10) && calc(10) === parseInt(d[10], 10);
  };



  const openEditProfile = () => {
    setEditName(profile?.display_name || "");
    setEditLastName((profile as any)?.last_name || "");
    setEditNickname(profile?.nickname || "");
    const savedGender = (profile as any)?.gender || "";
    const knownGenders = ["Masculino", "Feminino", "Não-binário", "Prefiro não informar"];
    if (savedGender && !knownGenders.includes(savedGender)) {
      setEditGender("Outro");
      setEditGenderOther(savedGender);
    } else {
      setEditGender(savedGender);
      setEditGenderOther("");
    }
    setEditPhone(profile?.phone || "");
    setEditBirthDate(isoToBr(profile?.birth_date));
    setEditCpf((profile as any)?.cpf ? formatCpf((profile as any).cpf) : "");
    setEditState((profile as any)?.state || "");
    setEditCity((profile as any)?.city || "");
    setEditRegion(profile?.region || "");
    setEditEmail(cleanSyntheticEmail((profile as any)?.email || user?.email || ""));
    setEditPrimaryColor((profile as any)?.primary_color || "#bfc4cb");
    setEditOpen(true);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!editLastName.trim()) {
      toast({ title: "Sobrenome é obrigatório", variant: "destructive" });
      return;
    }
    if (!editPhone.trim() || editPhone.replace(/\D/g, "").length < 10) {
      toast({ title: "Celular é obrigatório", variant: "destructive" });
      return;
    }
    const isoBirth = brToIso(editBirthDate);
    if (!editBirthDate || !isoBirth) {
      toast({ title: "Data de Nascimento é obrigatória", description: "Use o formato dd/mm/aaaa.", variant: "destructive" });
      return;
    }
    if (!editCpf.trim() || !isValidCpf(editCpf)) {
      toast({ title: "CPF inválido", description: "Informe um CPF válido (com dígitos verificadores corretos).", variant: "destructive" });
      return;
    }
    if (!editCity.trim()) {
      toast({ title: "Cidade é obrigatória", variant: "destructive" });
      return;
    }
    const emailTrimmed = editEmail.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast({ title: "E-mail inválido", description: "Informe um e-mail válido ou deixe em branco.", variant: "destructive" });
      return;
    }
    const finalEmail = emailTrimmed && !emailTrimmed.toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX) ? emailTrimmed : null;
    const isSpSp = editState === "SP" && editCity === "São Paulo";
    setJustSaved(true);
    setCpfError(null);
    const genderValue = editGender === "Outro" ? editGenderOther.trim() || undefined : editGender || undefined;
    try {
      await updateProfile.mutateAsync({
        display_name: editName.trim(),
        last_name: editLastName.trim(),
        nickname: editNickname.trim() || undefined,
        gender: genderValue,
        phone: editPhone,
        birth_date: isoBirth,
        cpf: (editCpf || "").replace(/\D/g, "") || null,
        state: editState || null,
        city: editCity.trim(),
        region: isSpSp ? (editRegion || null) : null,
        email: finalEmail,
        primary_color: editPrimaryColor || null,
      } as any);
    } catch (err: any) {
      setJustSaved(false);
      const msg = String(err?.message || "");
      if (/cpf/i.test(msg)) {
        setCpfError(msg);
      }
      return;
    }
    // Apply immediately so the UI reflects the new color without reload
    const { applyPrimaryColor } = await import("@/lib/applyPrimaryColor");
    applyPrimaryColor(editPrimaryColor || null);
    setEditOpen(false);
    if (requireComplete || isIncomplete) {
      // Defer navigation until AuthProvider confirms the profile is complete
      // (status === "ok"). This avoids the bounce-back loop where the
      // dashboard guard sees a stale "incomplete" status and sends us back to
      // /profile, which then reopens the edit form with blank fields.
      setPendingNavigate(true);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    uploadAvatar.mutate(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (profile?.display_name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top bar com voltar */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/");
          }}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Configurações</p>
          <h1 className="text-xl font-display text-foreground truncate">MEUS DADOS</h1>
        </div>
      </div>

      {/* Header */}
      <div className="relative px-5 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          {/* Avatar with upload */}
          <div className="relative mb-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-primary/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-4xl">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <h1 className="text-3xl text-foreground font-display">
            {(profile?.nickname || profile?.display_name || "SEM NOME").toUpperCase()}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{cleanSyntheticEmail((profile as any)?.email || user?.email || "")}</p>
          {profile?.is_pro && (
            <span className="mt-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">PRO</span>
          )}
        </motion.div>
      </div>

      {/* Profile Info */}
      <div className="px-5 space-y-3">
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Informações Pessoais</h3>
              <button onClick={openEditProfile} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                <Pencil size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Nome", value: profile?.display_name },
                { label: "Sobrenome", value: (profile as any)?.last_name },
                { label: "Nome Social", value: profile?.nickname },
                { label: "Gênero", value: (profile as any)?.gender },
                { label: "Celular", value: profile?.phone },
                { label: "Data de Nascimento", value: isoToBr(profile?.birth_date) },
                { label: "CPF", value: (profile as any)?.cpf },
                { label: "Estado", value: (profile as any)?.state },
                { label: "Cidade", value: (profile as any)?.city },
                { label: "Região", value: profile?.region },
                { label: "E-mail", value: cleanSyntheticEmail((profile as any)?.email || user?.email) },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground text-right max-w-[60%] truncate">{item.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>


          {/* Logout */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut size={16} className="mr-2" /> Sair da Conta
          </Button>

        </motion.div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">EDITAR PERFIL</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {(requireComplete || isIncomplete) && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                Para começar a usar o app, complete os campos obrigatórios abaixo.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border-border" required />
              </div>
              <div>
                <Label>Sobrenome *</Label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Sobrenome" className="bg-secondary border-border" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome Social</Label>
                <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} placeholder="Como quer aparecer no app" className="bg-secondary border-border" />
              </div>
              <div>
                <Label>Gênero</Label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Não-binário">Não-binário</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {editGender === "Outro" && (
                  <Input
                    value={editGenderOther}
                    onChange={(e) => setEditGenderOther(e.target.value)}
                    placeholder="Especifique"
                    className="bg-secondary border-border mt-2"
                  />
                )}
              </div>
            </div>
            <div>
              <Label>Celular *</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="bg-secondary border-border"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Nascimento *</Label>
                <Input
                  inputMode="numeric"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(formatBirthDate(e.target.value))}
                  placeholder="dd/mm/aaaa"
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input
                  inputMode="numeric"
                  value={editCpf}
                  onChange={(e) => { setEditCpf(formatCpf(e.target.value)); if (cpfError) setCpfError(null); }}
                  placeholder="000.000.000-00"
                  className={`bg-secondary border-border ${cpfError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  aria-invalid={cpfError ? true : undefined}
                  required
                />
                {cpfError && (
                  <p className="mt-1 text-xs text-destructive">{cpfError}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado *</Label>
                <Select value={editState} onValueChange={(v) => { setEditState(v); setEditCity(""); }}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade *</Label>
                <Select value={editCity} onValueChange={setEditCity} disabled={!editState}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder={editState ? "Selecione" : "Escolha o Estado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getCitiesForUf(editState).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Região</Label>
              <Select
                value={editRegion}
                onValueChange={setEditRegion}
                disabled={!(editState === "SP" && editCity === "São Paulo")}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={editState === "SP" && editCity === "São Paulo" ? "Selecione" : "Disponível apenas para São Paulo - SP"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z/Sul">Z/Sul</SelectItem>
                  <SelectItem value="Z/Oeste">Z/Oeste</SelectItem>
                  <SelectItem value="Z/Norte">Z/Norte</SelectItem>
                  <SelectItem value="Z/Leste">Z/Leste</SelectItem>
                  <SelectItem value="Centro">Centro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="seu@email.com (opcional)"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label>Cor do app</Label>
              <p className="text-[11px] text-muted-foreground mb-1">Define a cor dos botões no seu app.</p>
              <Select value={editPrimaryColor} onValueChange={setEditPrimaryColor}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione uma cor">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: editPrimaryColor }}
                      />
                      <span>{COLOR_PRESETS.find((c) => c.value.toLowerCase() === editPrimaryColor.toLowerCase())?.label || "Personalizada"}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PRESETS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: c.value }}
                        />
                        <span>{c.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full bg-gradient-primary text-primary-foreground border-0 font-semibold">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
