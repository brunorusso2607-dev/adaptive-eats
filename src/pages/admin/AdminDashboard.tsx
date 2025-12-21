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
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/users", label: "Usuários", icon: Users },
  { path: "/admin/analytics", label: "Relatórios", icon: BarChart3 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/dashboard");
    }
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
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <nav className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {adminNavItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path 
              : location.pathname.startsWith(item.path) && item.path !== "/admin";
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <Outlet />
      </div>
    </div>
  );
}
