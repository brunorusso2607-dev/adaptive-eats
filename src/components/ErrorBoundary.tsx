import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  errorType: 'chunk' | 'network' | 'state' | 'unknown';
}

// Configurações de recuperação automática
const RECOVERY_CONFIG = {
  maxAutoRetries: 3,
  retryDelays: [1000, 2000, 4000], // Backoff exponencial
  chunkLoadErrorPatterns: [
    'Loading chunk',
    'ChunkLoadError',
    'Loading CSS chunk',
    'Failed to fetch dynamically imported module',
    'Unable to preload CSS',
  ],
  networkErrorPatterns: [
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    'net::ERR_',
    'TypeError: Failed to fetch',
  ],
  stateErrorPatterns: [
    'Cannot read properties of undefined',
    'Cannot read properties of null',
    'is not a function',
    'Maximum update depth exceeded',
  ],
};

/**
 * Error Boundary Global com Auto-Recuperação Inteligente
 * 
 * Funcionalidades:
 * - Detecta tipo de erro (chunk, rede, estado)
 * - Tenta recuperação automática baseada no tipo
 * - Exibe UI de fallback com opções manuais
 * - Log de erros para debugging
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorType = ErrorBoundary.classifyError(error);
    return { 
      hasError: true, 
      error,
      errorType,
    };
  }

  private static classifyError(error: Error): ErrorBoundaryState['errorType'] {
    const errorMessage = error.message || error.toString();
    
    // Verifica erros de carregamento de chunk (lazy loading)
    if (RECOVERY_CONFIG.chunkLoadErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    )) {
      return 'chunk';
    }
    
    // Verifica erros de rede
    if (RECOVERY_CONFIG.networkErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    )) {
      return 'network';
    }
    
    // Verifica erros de estado corrompido
    if (RECOVERY_CONFIG.stateErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    )) {
      return 'state';
    }
    
    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("🚨 Error Boundary capturou um erro:", error);
    console.error("📍 Component stack:", errorInfo.componentStack);
    console.error("🔍 Tipo de erro detectado:", this.state.errorType);
    
    this.setState({ errorInfo });

    // Tenta recuperação automática baseada no tipo de erro
    this.attemptAutoRecovery();
  }

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private attemptAutoRecovery = (): void => {
    const { recoveryAttempts, errorType } = this.state;
    
    // Limite de tentativas automáticas
    if (recoveryAttempts >= RECOVERY_CONFIG.maxAutoRetries) {
      console.log("⚠️ Limite de tentativas de recuperação atingido");
      return;
    }

    // Determina ação de recuperação baseada no tipo de erro
    switch (errorType) {
      case 'chunk':
        this.recoverFromChunkError();
        break;
      case 'network':
        this.recoverFromNetworkError();
        break;
      case 'state':
        this.recoverFromStateError();
        break;
      default:
        // Para erros desconhecidos, não tenta recuperação automática
        console.log("🔍 Erro desconhecido - aguardando ação manual");
        break;
    }
  };

  private recoverFromChunkError = (): void => {
    const { recoveryAttempts } = this.state;
    const delay = RECOVERY_CONFIG.retryDelays[recoveryAttempts] || 4000;

    console.log(`🔄 Tentando recuperar de erro de chunk (tentativa ${recoveryAttempts + 1}/${RECOVERY_CONFIG.maxAutoRetries})...`);
    
    this.setState({ 
      isRecovering: true,
      recoveryAttempts: recoveryAttempts + 1,
    });

    this.retryTimeout = setTimeout(() => {
      // Para erros de chunk, recarregar a página é a solução mais confiável
      // pois o Service Worker pode ter uma versão desatualizada
      window.location.reload();
    }, delay);
  };

  private recoverFromNetworkError = (): void => {
    const { recoveryAttempts } = this.state;
    const delay = RECOVERY_CONFIG.retryDelays[recoveryAttempts] || 4000;

    console.log(`🌐 Tentando recuperar de erro de rede (tentativa ${recoveryAttempts + 1}/${RECOVERY_CONFIG.maxAutoRetries})...`);
    
    this.setState({ 
      isRecovering: true,
      recoveryAttempts: recoveryAttempts + 1,
    });

    this.retryTimeout = setTimeout(() => {
      // Verifica se a conexão voltou
      if (navigator.onLine) {
        console.log("✅ Conexão detectada, tentando recuperar...");
        this.handleRetry();
      } else {
        console.log("❌ Ainda sem conexão, aguardando...");
        this.setState({ isRecovering: false });
        // Adiciona listener para quando a conexão voltar
        window.addEventListener('online', this.handleOnline, { once: true });
      }
    }, delay);
  };

  private handleOnline = (): void => {
    console.log("🌐 Conexão restaurada! Tentando recuperar...");
    this.handleRetry();
  };

  private recoverFromStateError = (): void => {
    const { recoveryAttempts } = this.state;
    const delay = RECOVERY_CONFIG.retryDelays[recoveryAttempts] || 4000;

    console.log(`🔧 Tentando recuperar de erro de estado (tentativa ${recoveryAttempts + 1}/${RECOVERY_CONFIG.maxAutoRetries})...`);
    
    this.setState({ 
      isRecovering: true,
      recoveryAttempts: recoveryAttempts + 1,
    });

    this.retryTimeout = setTimeout(() => {
      // Para erros de estado, tenta limpar cache e recarregar
      try {
        // Limpa cache do React Query se disponível
        if (typeof window !== 'undefined' && (window as any).__REACT_QUERY_DEVTOOLS_GLOBAL_STORE__) {
          const queryClient = (window as any).__REACT_QUERY_DEVTOOLS_GLOBAL_STORE__;
          queryClient?.clear?.();
        }
        
        // Limpa sessionStorage (mantém localStorage para persistência)
        sessionStorage.clear();
        
        console.log("🧹 Cache limpo, tentando recuperar...");
        this.handleRetry();
      } catch {
        console.log("⚠️ Falha ao limpar cache, recarregando página...");
        window.location.reload();
      }
    }, delay);
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleRetry = (): void => {
    window.removeEventListener('online', this.handleOnline);
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRecovering: false,
      // Mantém recoveryAttempts para evitar loops infinitos
    });
  };

  private getErrorTitle(): string {
    switch (this.state.errorType) {
      case 'chunk':
        return 'Atualização disponível';
      case 'network':
        return 'Problema de conexão';
      case 'state':
        return 'Erro temporário';
      default:
        return 'Ops! Algo deu errado';
    }
  }

  private getErrorDescription(): string {
    switch (this.state.errorType) {
      case 'chunk':
        return 'Uma nova versão do app está disponível. Recarregando automaticamente...';
      case 'network':
        return 'Não foi possível conectar ao servidor. Verificando conexão...';
      case 'state':
        return 'Ocorreu um erro temporário. Tentando recuperar automaticamente...';
      default:
        return 'Encontramos um problema inesperado. Não se preocupe, seus dados estão seguros.';
    }
  }

  private getErrorIcon(): ReactNode {
    const { errorType, isRecovering } = this.state;
    
    if (isRecovering) {
      return <Loader2 className="w-10 h-10 text-primary animate-spin" />;
    }
    
    switch (errorType) {
      case 'network':
        return <Wifi className="w-10 h-10 text-warning" />;
      case 'chunk':
        return <RefreshCw className="w-10 h-10 text-primary" />;
      default:
        return <AlertTriangle className="w-10 h-10 text-destructive" />;
    }
  }

  render(): ReactNode {
    const { hasError, isRecovering, recoveryAttempts, errorType } = this.state;

    if (hasError) {
      // Se foi fornecido um fallback customizado, usa ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback com status de recuperação
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Ícone de erro */}
            <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              {this.getErrorIcon()}
            </div>

            {/* Título e descrição */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {this.getErrorTitle()}
              </h1>
              <p className="text-muted-foreground">
                {this.getErrorDescription()}
              </p>
              
              {/* Status de recuperação */}
              {isRecovering && (
                <p className="text-sm text-primary animate-pulse">
                  Recuperando... (tentativa {recoveryAttempts}/{RECOVERY_CONFIG.maxAutoRetries})
                </p>
              )}
              
              {/* Mensagem quando esgotou tentativas */}
              {!isRecovering && recoveryAttempts >= RECOVERY_CONFIG.maxAutoRetries && (
                <p className="text-sm text-muted-foreground">
                  A recuperação automática não funcionou. Tente as opções abaixo.
                </p>
              )}
            </div>

            {/* Ações - mostrar apenas se não está recuperando ou esgotou tentativas */}
            {(!isRecovering || recoveryAttempts >= RECOVERY_CONFIG.maxAutoRetries) && (
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  size="lg"
                  disabled={isRecovering}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
                
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                  disabled={isRecovering}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar página
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="w-full"
                  disabled={isRecovering}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao início
                </Button>
              </div>
            )}

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Detalhes técnicos (dev only)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-48">
                  <p className="text-xs font-mono text-destructive break-words">
                    <strong>Tipo:</strong> {errorType}
                  </p>
                  <p className="text-xs font-mono text-destructive break-words mt-1">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs font-mono text-muted-foreground mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Nota de suporte */}
            <p className="text-xs text-muted-foreground/60">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
