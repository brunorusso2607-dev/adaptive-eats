import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Mail, Loader2, CheckCircle, Smartphone, Download } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");

export default function Activate() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isActivated, setIsActivated] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or browsers that don't support beforeinstallprompt
      toast.info("Para instalar o app, use o menu do navegador e selecione 'Adicionar à tela inicial'");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast.success("App instalado com sucesso!");
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("activate-account", {
        body: { email, sessionId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // If we got an action link, redirect to it (this will log the user in)
      if (data.actionLink) {
        toast.success("Conta ativada! Redirecionando...");
        setIsActivated(true);
        
        // Small delay to show success state
        setTimeout(() => {
          window.location.href = data.actionLink;
        }, 1500);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao ativar conta";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md glass-card border-border/50 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">Conta Ativada!</CardTitle>
              <CardDescription className="mt-2">
                Redirecionando para o ReceitAI...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md glass-card border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
            <ChefHat className="w-9 h-9 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-2xl">Parabéns pela compra! 🎉</CardTitle>
            <CardDescription className="mt-2">
              Digite seu email para ativar sua conta e começar a usar o ReceitAI
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email usado no pagamento</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use o mesmo email que você usou para fazer o pagamento
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-primary border-0 shadow-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                "Ativar Minha Conta"
              )}
            </Button>
          </form>

          {/* PWA Install Section */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Instale o App</p>
                <p className="text-xs text-muted-foreground">
                  Acesse o ReceitAI direto da sua tela inicial
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleInstallPWA}
                className="flex-shrink-0"
              >
                <Download className="w-4 h-4 mr-1" />
                Instalar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help link */}
      <p className="mt-6 text-sm text-muted-foreground">
        Problemas para ativar?{" "}
        <Link to="/" className="text-primary hover:underline">
          Entre em contato
        </Link>
      </p>
    </div>
  );
}
