import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Global - Captura erros de renderização React
 * e exibe uma UI de fallback em vez de quebrar todo o app.
 * 
 * Funcionalidades:
 * - Captura erros em qualquer componente filho
 * - Exibe mensagem amigável ao usuário
 * - Permite recarregar a página ou voltar ao início
 * - Log de erros para debugging (pode ser enviado para serviço externo)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Atualiza o state para renderizar a UI de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log do erro para debugging
    console.error("🚨 Error Boundary capturou um erro:", error);
    console.error("📍 Component stack:", errorInfo.componentStack);
    
    this.setState({ errorInfo });

    // TODO: Enviar para serviço de monitoramento (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Se foi fornecido um fallback customizado, usa ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback padrão
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Ícone de erro */}
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>

            {/* Título e descrição */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Ops! Algo deu errado
              </h1>
              <p className="text-muted-foreground">
                Encontramos um problema inesperado. Não se preocupe, seus dados estão seguros.
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar página
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </div>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Detalhes técnicos (dev only)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-48">
                  <p className="text-xs font-mono text-destructive break-words">
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
