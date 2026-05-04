import { Home, Shield, Crown, MessageSquareText, CalendarDays } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Shield, label: "Times", path: "/times" },
  { icon: MessageSquareText, label: "Várzea", path: "/resenha", isCenter: true },
  { icon: CalendarDays, label: "Agenda", path: "/agenda" },
  { icon: Crown, label: "Admin", path: "/admin" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            if (item.isCenter) {
              return (
                <button
                  key="center"
                  onClick={() => setOpen(true)}
                  aria-label="Abrir menu de criação"
                  className="relative -mt-5 w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow text-primary-foreground"
                >
                  <Plus size={24} />
                </button>
              );
            }

            return (
              <button
                key={item.path + item.label}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                {item.icon && (
                  <item.icon
                    size={20}
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                  />
                )}
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display">CRIAR</SheetTitle>
            <SheetDescription>Escolha o que deseja abrir</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-2 mt-4">
            <button
              onClick={() => go("/resenha")}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <MessageSquareText size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Resenha da Várzea</p>
                <p className="text-[11px] text-muted-foreground">
                  Rede social do time · posts ficam 7 dias
                </p>
              </div>
            </button>

            <button
              onClick={() => go("/escalacao")}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Users size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Escalação</p>
                <p className="text-[11px] text-muted-foreground">Monte a escalação no campo</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
