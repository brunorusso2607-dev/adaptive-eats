import { Home, Calendar, Heart, User, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavTab = "home" | "meal-plan" | "scan" | "favorites" | "profile";

interface MobileBottomNavProps {
  activeTab: MobileNavTab;
  onTabChange: (tab: MobileNavTab) => void;
  hasMealPlan?: boolean;
}

const navItems = [
  { id: "home" as MobileNavTab, label: "Home", icon: Home },
  { id: "meal-plan" as MobileNavTab, label: "Plano", icon: Calendar },
  { id: "scan" as MobileNavTab, label: "Foto", icon: Camera },
  { id: "favorites" as MobileNavTab, label: "Favoritos", icon: Heart },
  { id: "profile" as MobileNavTab, label: "Perfil", icon: User },
];

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
