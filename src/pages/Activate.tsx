import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Mail, Loader2, CheckCircle, Download, MoreVertical, ArrowRight, Share, PlusSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import iosStep1 from "@/assets/ios-step-1-share.png";
import iosStep2 from "@/assets/ios-step-2-add-home.png";
import iosStep3 from "@/assets/ios-step-3-confirm.png";

const emailSchema = z.string().email("Email inválido");

type Step = "email" | "install";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  // Detect platform and listen for PWA install prompt
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

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
      toast.info("Use as instruções abaixo para instalar o app");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast.success("App instalado com sucesso!");
      window.location.href = "/dashboard";
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

      // Use verifyOtp with the tokenHash to log in
      if (data.tokenHash && data.type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: data.type,
        });

        if (verifyError) {
          throw new Error(verifyError.message);
        }

        toast.success("Conta ativada com sucesso!");
        setStep("install");
      } else {
        throw new Error("Erro ao gerar link de acesso. Tente novamente.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao ativar conta";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipInstall = () => {
    window.location.href = "/dashboard";
  };

  // Step 2: Install instructions
  if (step === "install") {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md glass-card border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">Conta Ativada! 🎉</CardTitle>
              <CardDescription className="mt-2">
                Agora instale o app na sua tela inicial para acessar mais fácil
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Android / Chrome - Show install button */}
            {(showInstallButton || isAndroid) && !isIOS && (
              <div className="space-y-4">
                <Button 
                  onClick={handleInstallPWA}
                  className="w-full gradient-primary border-0 shadow-glow h-12 text-base"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Instalar App
                </Button>
              </div>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-xl p-4 space-y-5">
                  <p className="text-sm font-semibold text-center">
                    Siga os 3 passos para instalar:
                  </p>
                  
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toque no ícone de compartilhar</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        O quadrado com a seta para cima na barra inferior do Safari
                      </p>
                      <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={iosStep1} 
                          alt="Ícone de compartilhar do Safari" 
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Role para baixo e toque em:</p>
                      <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={iosStep2} 
                          alt="Adicionar à Tela de Início" 
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toque em "Adicionar"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        O app vai aparecer na sua tela inicial!
                      </p>
                      <div className="mt-2 rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={iosStep3} 
                          alt="Botão Adicionar" 
                          className="w-full h-auto"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center bg-amber-500/10 rounded-lg p-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Use o Safari para instalar. Outros navegadores não suportam no iOS.
                  </p>
                </div>
              </div>
            )}

            {/* Android manual instructions (fallback) */}
            {isAndroid && !showInstallButton && (
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
                  <p className="text-sm font-semibold text-center mb-4">
                    Siga os passos para instalar:
                  </p>
                  
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toque no menu do navegador</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Os 3 pontinhos no canto superior direito
                      </p>
                      <div className="mt-2 flex items-center justify-center p-3 bg-background/50 rounded-lg">
                        <MoreVertical className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Selecione "Instalar app" ou</p>
                      <div className="mt-2 flex items-center gap-2 p-3 bg-background/50 rounded-lg">
                        <Download className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium">Adicionar à tela inicial</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop instructions */}
            {!isIOS && !isAndroid && !showInstallButton && (
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm text-center">
                  Para instalar, use o menu do navegador e selecione "Instalar app" ou acesse pelo celular para uma melhor experiência.
                </p>
              </div>
            )}

            {/* Continue button */}
            <Button 
              variant="outline" 
              onClick={handleSkipInstall}
              className="w-full h-12"
            >
              Continuar para o app
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Email activation
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
