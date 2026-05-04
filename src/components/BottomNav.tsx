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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.isCenter) {
            const Icon = item.icon!;
            return (
              <button
                key="center"
                onClick={() => navigate(item.path)}
                aria-label="Abrir Resenha da Várzea"
                className="relative -mt-5 flex flex-col items-center"
              >
                <span className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow text-primary-foreground">
                  <Icon size={22} />
                </span>
                <span
                  className={`mt-0.5 text-[10px] font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
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
  );
};

export default BottomNav;

