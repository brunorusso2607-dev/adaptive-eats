import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute Component
 * 
 * REGRA ABSOLUTA: Todas as funcionalidades do menu sidebar devem ser
 * acessíveis APENAS por administradores.
 * 
 * Este componente protege rotas administrativas e redireciona usuários
 * não-admin para o dashboard principal.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    // Aguarda carregamento da verificação de admin
    if (isLoading) return;

    // REGRA ABSOLUTA: Se não é admin, redireciona para dashboard
    if (!isAdmin) {
      console.warn("🚫 Acesso negado: Usuário não é administrador");
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, isLoading, navigate]);

  // Mostra loading enquanto verifica permissões
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // REGRA ABSOLUTA: Só renderiza conteúdo se for admin
  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
