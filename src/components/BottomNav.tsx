import { Home, Search, Users, Crown, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: Search, label: "Match", path: "/match" },
  { icon: null, label: "+", path: "/agenda", isCenter: true },
  { icon: Users, label: "Time", path: "/team" },
  { icon: Crown, label: "Admin", path: "/agenda" },
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
            return (
              <button
                key="center"
                onClick={() => navigate(item.path)}
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
  );
};

export default BottomNav;
