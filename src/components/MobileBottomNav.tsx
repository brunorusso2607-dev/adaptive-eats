import { Home, Calendar, Heart, User, Camera, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavTab = "home" | "meal-plan" | "scan" | "history" | "profile";

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
  { id: "history" as MobileNavTab, label: "Histórico", icon: ClipboardList },
  { id: "profile" as MobileNavTab, label: "Perfil", icon: User },
];

export default function MobileBottomNav({ 
  activeTab, 
  onTabChange,
  hasPendingMeal = false,
}: MobileBottomNavProps) {
  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-white/95 dark:bg-card/95 backdrop-blur-xl border-t border-border"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const showBadge = item.id === "home" && hasPendingMeal && !isActive;
          
          // FAB central - único elemento saturado
          if (item.isMain) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex items-center justify-center -mt-6 transition-all duration-200",
                  "w-14 h-14 rounded-full",
                  "bg-primary text-primary-foreground",
                  "shadow-lg shadow-primary/25",
                  "hover:bg-[#D3D3D3] hover:text-foreground hover:scale-105 active:scale-95",
                  isActive && "ring-4 ring-primary/20"
                )}
              >
                <item.icon className="w-6 h-6" strokeWidth={2} />
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
                    isActive && "scale-105"
                  )} 
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px]",
                isActive ? "font-medium" : "font-normal"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
