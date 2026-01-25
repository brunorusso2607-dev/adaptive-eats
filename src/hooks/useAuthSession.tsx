import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = ['/', '/landingpage', '/auth', '/ativar', '/termos-de-uso', '/politica-privacidade'];

/**
 * Hook para gerenciar sessão de autenticação
 * 
 * Funcionalidades:
 * - Detecta quando sessão expira e redireciona para login
 * - Monitora eventos de autenticação
 * - Tenta refresh automático do token
 */
export function useAuthSession() {
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicRoute = useCallback(() => {
    return PUBLIC_ROUTES.some(route => location.pathname === route);
  }, [location.pathname]);

  useEffect(() => {
    // Listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH] Evento:', event);

        switch (event) {
          case 'SIGNED_OUT':
            // Usuário fez logout ou sessão expirou
            if (!isPublicRoute()) {
              toast.info('Sessão encerrada', {
                description: 'Por favor, faça login novamente.',
              });
              navigate('/auth');
            }
            break;

          case 'TOKEN_REFRESHED':
            console.log('[AUTH] Token renovado com sucesso');
            break;

          case 'USER_UPDATED':
            console.log('[AUTH] Usuário atualizado');
            break;
        }
      }
    );

    // Verificação periódica de validade da sessão
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AUTH] Erro ao verificar sessão:', error);
        return;
      }

      if (!session && !isPublicRoute()) {
        console.log('[AUTH] Sessão inválida - redirecionando para login');
        toast.warning('Sessão expirada', {
          description: 'Faça login novamente para continuar.',
        });
        navigate('/auth');
      }
    };

    // Verifica sessão a cada 5 minutos
    const intervalId = setInterval(checkSession, 5 * 60 * 1000);

    // Verifica ao montar
    if (!isPublicRoute()) {
      checkSession();
    }

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [navigate, isPublicRoute]);
}

export default useAuthSession;
