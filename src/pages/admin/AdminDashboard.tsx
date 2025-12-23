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
  FileText,
  Webhook,
  Sparkles,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        label: "Páginas", 
        icon: FileText,
        subItems: [
          { path: "/admin/onboarding", label: "Onboarding", icon: FileText },
        ],
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
  const [openMenus, setOpenMenus] = useState<string[]>(["Relatórios", "Configurações"]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const renderMenuItem = (item: SubMenuItem, depth: number = 0) => {
    const paddingLeft = depth * 12;

    if (item.path) {
      const linkContent = (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            isItemActive(item)
              ? "bg-primary text-primary-foreground shadow-glow"
              : "text-muted-foreground hover:bg-card hover:text-foreground",
            sidebarCollapsed && "justify-center"
          )}
          style={{ paddingLeft: sidebarCollapsed ? undefined : `${12 + paddingLeft}px` }}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>{item.label}</span>}
        </Link>
      );

      if (sidebarCollapsed) {
        return (
          <Tooltip key={item.path} delayDuration={0}>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      }

      return linkContent;
    }

    const buttonContent = (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all h-auto",
          openMenus.includes(item.label)
            ? "bg-card/50 text-foreground"
            : "text-muted-foreground hover:bg-card hover:text-foreground",
          sidebarCollapsed && "justify-center"
        )}
        style={{ paddingLeft: sidebarCollapsed ? undefined : `${12 + paddingLeft}px` }}
      >
        <div className="flex items-center gap-3">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>{item.label}</span>}
        </div>
        {!sidebarCollapsed && (
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              openMenus.includes(item.label) && "rotate-180"
            )}
          />
        )}
      </Button>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.label} delayDuration={0}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible
        key={item.label}
        open={openMenus.includes(item.label)}
        onOpenChange={() => toggleMenu(item.label)}
      >
        <CollapsibleTrigger asChild>
          {buttonContent}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {item.subItems?.map((subItem) => renderMenuItem(subItem, depth + 1))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="min-h-screen gradient-hero flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-card/80 backdrop-blur-xl border-r border-border/50 z-50 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-glow flex-shrink-0">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-display text-lg font-bold text-foreground truncate">Painel Admin</h1>
                <p className="text-xs text-muted-foreground truncate">Gerenciamento</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Início */}
          {sidebarCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/admin"
                  className={cn(
                    "flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    location.pathname === "/admin"
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  <Menu className="w-4 h-4 flex-shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Início
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                location.pathname === "/admin"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <Menu className="w-4 h-4 flex-shrink-0" />
              <span>Início</span>
            </Link>
          )}

          {/* Menu Items */}
          {mainMenuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/50 space-y-2">
          {sidebarCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                    className="w-full justify-center text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Voltar ao App
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-center text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Sair
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(false)}
                    className="w-full justify-center text-muted-foreground hover:text-foreground"
                  >
                    <PanelLeft className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Expandir
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span>Voltar ao App</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Sair</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(true)}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              >
                <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
                <span>Recolher</span>
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
