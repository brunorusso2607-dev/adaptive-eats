import { Home, Calendar, Heart, User, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavTab = "home" | "meal-plan" | "scan" | "favorites" | "profile";

interface MobileBottomNavProps {
  activeTab: MobileNavTab;
  onTabChange: (tab: MobileNavTab) => void;
  hasMealPlan?: boolean;
  hasPendingMeal?: boolean;
}

const navItems = [
  { id: "home" as MobileNavTab, label: "Home", icon: Home },
  { id: "meal-plan" as MobileNavTab, label: "Plano", icon: Calendar },
  { id: "scan" as MobileNavTab, label: "Foto", icon: Camera, isMain: true },
  { id: "favorites" as MobileNavTab, label: "Favoritos", icon: Heart },
  { id: "profile" as MobileNavTab, label: "Perfil", icon: User },
];

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange,
  hasPendingMeal = false,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const showBadge = item.id === "home" && hasPendingMeal && !isActive;
          
          // Botão central destacado (FAB)
          if (item.isMain) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex items-center justify-center -mt-8 transition-all",
                  "w-14 h-14 rounded-full",
                  "bg-[#E07A5F] text-white",
                  "shadow-xl shadow-[#E07A5F]/50",
                  "hover:scale-105 active:scale-95 hover:brightness-110",
                  isActive && "ring-4 ring-[#E07A5F]/30"
                )}
              >
                <item.icon className="w-6 h-6" strokeWidth={2.5} />
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon 
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
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
