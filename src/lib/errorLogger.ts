import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface ErrorLogData {
  error_type: 'chunk_load' | 'network' | 'state_corruption' | 'render' | 'unhandled';
  error_message: string;
  error_stack?: string;
  component_name?: string;
  page_url?: string;
  metadata?: Json;
}

/**
 * Envia erros do frontend para o banco de dados automaticamente
 * Usado pelo ErrorBoundary e outros pontos de captura de erro
 */
export async function logFrontendError(data: ErrorLogData): Promise<void> {
  try {
    // Obter user_id se estiver logado
    const { data: { user } } = await supabase.auth.getUser();
    
    const errorLog = {
      user_id: user?.id || null,
      error_type: data.error_type,
      error_message: data.error_message.substring(0, 1000), // Limitar tamanho
      error_stack: data.error_stack?.substring(0, 5000) || null,
      component_name: data.component_name || null,
      page_url: data.page_url || window.location.href,
      user_agent: navigator.userAgent,
      metadata: data.metadata || null,
    };

    // Usar insert direto (não precisa de auth por causa da RLS policy)
    const { error } = await supabase
      .from('frontend_error_logs')
      .insert([errorLog]);

    if (error) {
      // Fallback: logar no console se falhar o insert
      console.error('[ErrorLogger] Failed to log error to database:', error);
    } else {
      console.log('[ErrorLogger] Error logged successfully');
    }
  } catch (e) {
    // Nunca deixar o logger crashar o app
    console.error('[ErrorLogger] Exception while logging:', e);
  }
}

/**
 * Classificar tipo de erro baseado na mensagem
 */
export function classifyError(error: Error): ErrorLogData['error_type'] {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  if (message.includes('loading chunk') || message.includes('loading css chunk') || message.includes('dynamically imported module')) {
    return 'chunk_load';
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch') || message.includes('networkerror')) {
    return 'network';
  }
  
  if (message.includes('cannot read') || message.includes('undefined is not') || message.includes('null is not')) {
    return 'state_corruption';
  }
  
  if (stack.includes('render') || message.includes('minified react error')) {
    return 'render';
  }
  
  return 'unhandled';
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Capturar erros não tratados
  window.addEventListener('error', (event) => {
    logFrontendError({
      error_type: classifyError(event.error || new Error(event.message)),
      error_message: event.message,
      error_stack: event.error?.stack,
      page_url: window.location.href,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      } as Json,
    });
  });

  // Capturar rejeições de Promise não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    logFrontendError({
      error_type: classifyError(error),
      error_message: error.message,
      error_stack: error.stack,
      page_url: window.location.href,
      metadata: {
        type: 'unhandled_promise_rejection',
      } as Json,
    });
  });

  console.log('[ErrorLogger] Global error handlers initialized');
}
