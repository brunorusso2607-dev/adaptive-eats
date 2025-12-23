import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  ArrowLeft, 
  Loader2,
  Shield,
  ChevronDown,
  Wrench,
  Code2,
  Menu,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  Paintbrush,
  LogOut,
  Settings,
  Plug,
  Webhook,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SubMenuItem = {
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  subItems?: SubMenuItem[];
};

const mainMenuItems: SubMenuItem[] = [
  {
    label: "Relatórios",
    icon: BarChart3,
    subItems: [
      { path: "/admin/users", label: "Clientes", icon: Users },
      { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { path: "/admin/ai-error-logs", label: "Erros de IA", icon: AlertTriangle },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    subItems: [
      { 
        path: "/admin/system-users",
        label: "Usuários", 
        icon: Users,
      },
      { 
        label: "Integrações", 
        icon: Plug,
        subItems: [
          { path: "/admin/gemini", label: "Gemini", icon: Sparkles },
          { path: "/admin/plans", label: "Planos Stripe", icon: CreditCard },
          { path: "/admin/webhooks", label: "Webhooks", icon: Webhook },
        ],
      },
      { path: "/admin/prompt-simulator", label: "Simulador de Prompts", icon: MessageSquare },
      { path: "/admin/pixels", label: "Pixels", icon: Code2 },
      { path: "/admin/appearance", label: "Aparência", icon: Paintbrush },
    ],
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading } = useAdmin();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isItemActive = (item: SubMenuItem) => {
    if (!item.path) return false;
    return item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path) && item.path !== "/admin";
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isLoading && !isAdmin) {
        // Se não tem sessão, vai para auth, não para dashboard
        if (!session) {
          navigate("/auth");
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkAuth();
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="glass-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Gerenciamento do sistema</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Navigation Menu */}
        <nav className="mb-6">
          <div className="space-y-1">
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl mb-2 transition-all",
                location.pathname === "/admin"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <Menu className="w-4 h-4" />
              Início
            </Link>
            <div className="pl-4 space-y-1">
              {mainMenuItems.map((item) => (
                item.path ? (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isItemActive(item)
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-card/30 text-muted-foreground hover:bg-card hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ) : (
                  <Collapsible
                    key={item.label}
                    open={openMenus.includes(item.label)}
                    onOpenChange={() => toggleMenu(item.label)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                          openMenus.includes(item.label)
                            ? "bg-card/50 text-foreground"
                            : "bg-card/30 text-muted-foreground hover:bg-card hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            openMenus.includes(item.label) && "rotate-180"
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pt-1 space-y-1">
                      {item.subItems && item.subItems.length > 0 ? (
                        item.subItems.map((subItem) => (
                          subItem.path ? (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                location.pathname === subItem.path
                                  ? "bg-primary text-primary-foreground shadow-glow"
                                  : "bg-card/20 text-muted-foreground hover:bg-card hover:text-foreground"
                              )}
                            >
                              <subItem.icon className="w-4 h-4" />
                              {subItem.label}
                            </Link>
                          ) : (
                            <Collapsible
                              key={subItem.label}
                              open={openMenus.includes(subItem.label)}
                              onOpenChange={() => toggleMenu(subItem.label)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-between px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                    openMenus.includes(subItem.label)
                                      ? "bg-card/40 text-foreground"
                                      : "bg-card/20 text-muted-foreground hover:bg-card hover:text-foreground"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <subItem.icon className="w-4 h-4" />
                                    {subItem.label}
                                  </div>
                                  <ChevronDown
                                    className={cn(
                                      "w-4 h-4 transition-transform duration-200",
                                      openMenus.includes(subItem.label) && "rotate-180"
                                    )}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pl-4 pt-1 space-y-1">
                                {subItem.subItems && subItem.subItems.length > 0 ? (
                                  subItem.subItems.map((nestedItem) => (
                                    nestedItem.path && (
                                      <Link
                                        key={nestedItem.path}
                                        to={nestedItem.path}
                                        className={cn(
                                          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all",
                                          location.pathname === nestedItem.path
                                            ? "bg-primary text-primary-foreground shadow-glow"
                                            : "bg-card/10 text-muted-foreground hover:bg-card hover:text-foreground"
                                        )}
                                      >
                                        <nestedItem.icon className="w-3 h-3" />
                                        {nestedItem.label}
                                      </Link>
                                    )
                                  ))
                                ) : (
                                  <p className="px-4 py-2 text-xs text-muted-foreground italic">
                                    Em breve...
                                  </p>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        ))
                      ) : (
                        <p className="px-4 py-2 text-xs text-muted-foreground italic">
                          Em breve...
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <Outlet />
      </div>
    </div>
  );
}
