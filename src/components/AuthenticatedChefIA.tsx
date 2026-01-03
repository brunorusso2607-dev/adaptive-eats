import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FloatingChefIA from "./FloatingChefIA";

// Rotas onde o Chef IA NÃO deve aparecer
const EXCLUDED_ROUTES = [
  "/",
  "/landingpage",
  "/auth",
  "/ativar",
  "/onboarding",
  "/termos-de-uso",
  "/politica-privacidade"
];

// Verifica se a rota atual está excluída
const isExcludedRoute = (pathname: string): boolean => {
  // Verifica rotas exatas
  if (EXCLUDED_ROUTES.includes(pathname)) {
    return true;
  }
  return false;
};

export default function AuthenticatedChefIA() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Verifica autenticação inicial
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsChecking(false);
    };

    checkAuth();

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Não renderiza enquanto verifica autenticação
  if (isChecking) {
    return null;
  }

  // Não renderiza se não autenticado
  if (!isAuthenticated) {
    return null;
  }

  // Não renderiza em rotas excluídas
  if (isExcludedRoute(location.pathname)) {
    return null;
  }

  return <FloatingChefIA />;
}
