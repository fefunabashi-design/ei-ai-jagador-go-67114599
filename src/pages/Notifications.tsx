import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Megaphone, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";

type NotificationItem = {
  id: string;
  type: "system" | "admin";
  title: string;
  message: string;
  created_at: string;
};

// Por enquanto vazio. Avisos serão enviados pelo desenvolvedor (system)
// ou pelo administrador do time (admin). Sem mock de dados pessoais.
const notifications: NotificationItem[] = [];

const Notifications = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avisos</p>
          <h1 className="text-xl font-display text-foreground truncate">NOTIFICAÇÕES</h1>
        </div>
      </div>

      <div className="px-5 mt-4">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border border-dashed p-8 text-center"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Bell size={20} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Sem novos avisos</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Aqui aparecem apenas comunicados oficiais enviados pelo desenvolvedor do app
              ou pelo administrador do seu time.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border p-4 flex gap-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === "system" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                }`}>
                  {n.type === "system" ? <Sparkles size={16} /> : <Megaphone size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                      {n.type === "system" ? "App" : "Admin"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
