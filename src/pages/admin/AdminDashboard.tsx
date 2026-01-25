import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import FloatingChefIA from "@/components/FloatingChefIA";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  PanelLeft,
  X,
  Clock,
  ToggleLeft,
  ChefHat,
  Apple,
  Activity,
  Globe,
  Utensils,
  Leaf,
  Database
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SubMenuItem = {
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  subItems?: SubMenuItem[];
};

const mainMenuItems: SubMenuItem[] = [
  {
    label: "Monitoramento",
    icon: Activity,
    subItems: [
      { path: "/admin/ai-usage", label: "Uso de IA", icon: Sparkles },
    ],
  },
  {
    label: "Usuários",
    icon: Users,
    subItems: [
      { path: "/admin/users", label: "Clientes", icon: Users },
      { path: "/admin/system-users", label: "Administradores", icon: Shield },
    ],
  },
{
  label: "Conteúdo",
    icon: Apple,
    subItems: [
      { path: "/admin/foods", label: "Base de Alimentos", icon: Apple },
      { path: "/admin/meal-pool", label: "Pool de Refeições", icon: Database },
      { path: "/admin/ingredient-pool", label: "Mapeamento de Ingredientes", icon: ChefHat },
      { path: "/admin/intolerance-mappings", label: "Mapeamento Intolerâncias", icon: AlertTriangle },
      { path: "/admin/food-decomposition", label: "Decomposição Alimentos", icon: Utensils },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    subItems: [
      { 
        label: "Páginas", 
        icon: FileText,
        subItems: [
          { path: "/admin/onboarding", label: "Onboarding", icon: FileText },
          { path: "/admin/meal-times", label: "Horário das Refeições", icon: Clock },
          { path: "/admin/languages", label: "Idiomas", icon: Globe },
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
      { path: "/admin/appearance", label: "Aparência", icon: Paintbrush },
      { path: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft },
      { path: "/admin/pixels", label: "Pixels", icon: Code2 },
    ],
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading } = useAdmin();
  const isMobile = useIsMobile();
  const [openMenus, setOpenMenus] = useState<string[]>(["Conteúdo", "Relatórios", "Configurações"]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const renderMenuItem = (item: SubMenuItem, depth: number = 0, forMobile: boolean = false) => {
    const paddingLeft = depth * 10;
    const isCollapsed = !forMobile && sidebarCollapsed;

    if (item.path) {
      const linkContent = (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => forMobile && setMobileMenuOpen(false)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-normal transition-all",
            isItemActive(item)
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            isCollapsed && "justify-center"
          )}
          style={{ paddingLeft: isCollapsed ? undefined : `${12 + paddingLeft}px` }}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>{item.label}</span>}
        </Link>
      );

      if (isCollapsed && !forMobile) {
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
          "w-full justify-between px-3 py-2 rounded-lg text-[13px] font-normal transition-all h-auto",
          openMenus.includes(item.label)
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          isCollapsed && "justify-center"
        )}
        style={{ paddingLeft: isCollapsed ? undefined : `${12 + paddingLeft}px` }}
      >
        <div className="flex items-center gap-2.5">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>{item.label}</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground",
              openMenus.includes(item.label) && "rotate-180"
            )}
          />
        )}
      </Button>
    );

    if (isCollapsed && !forMobile) {
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
          {item.subItems?.map((subItem) => renderMenuItem(subItem, depth + 1, forMobile))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const SidebarContent = ({ forMobile = false }: { forMobile?: boolean }) => {
    const isCollapsed = !forMobile && sidebarCollapsed;

    return (
      <>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* Início */}
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/admin"
                  onClick={() => forMobile && setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-normal transition-all",
                    location.pathname === "/admin"
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Início
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/admin"
              onClick={() => forMobile && setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-normal transition-all",
                location.pathname === "/admin"
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Início</span>
            </Link>
          )}

          {/* Menu Items */}
          {mainMenuItems.map((item) => renderMenuItem(item, 0, forMobile))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/40 space-y-1">
          {isCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                    className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Voltar ao App
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-center text-muted-foreground hover:text-destructive hover:bg-muted/50 rounded-lg"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Sair
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(false)}
                    className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                  >
                    <PanelLeft className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Expandir
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigate("/dashboard");
                  forMobile && setMobileMenuOpen(false);
                }}
                className="w-full justify-start gap-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span>Voltar ao App</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start gap-2.5 text-[13px] font-normal text-muted-foreground hover:text-destructive hover:bg-muted/50 rounded-lg"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Sair</span>
              </Button>
              {!forMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-full justify-start gap-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                >
                  <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
                  <span>Recolher</span>
                </Button>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen gradient-hero">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-background" />
              </div>
              <span className="font-display font-bold text-foreground">Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="rounded-xl text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Sheet Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-card/95 backdrop-blur-xl flex flex-col">
            <SheetHeader className="p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-background" />
                </div>
                <div>
                  <SheetTitle className="font-display text-lg font-bold text-foreground text-left">
                    Painel Admin
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">Gerenciamento</p>
                </div>
              </div>
            </SheetHeader>
            <SidebarContent forMobile />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="p-4">
          <Outlet />
        </main>

        {/* Floating Chef IA */}
        <FloatingChefIA />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - Clean white like reference */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r border-border/40 z-50 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Sidebar Header - Minimal */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-background" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-medium text-foreground text-sm">Admin</span>
            )}
          </div>
        </div>

        <SidebarContent />
      </aside>

      {/* Main Content - Clean background */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 bg-muted/30",
          sidebarCollapsed ? "ml-16" : "ml-56"
        )}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Floating Chef IA */}
      <FloatingChefIA />
    </div>
  );
}
