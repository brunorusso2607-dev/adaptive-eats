import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Mail, Loader2, CheckCircle, Download, MoreVertical, ArrowRight, Share, PlusSquare, Copy, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useTrackingPixels } from "@/hooks/useTrackingPixels";

import iosStep1 from "@/assets/ios-step-1-share.png";
import iosStep2 from "@/assets/ios-step-2-add-home.png";
import iosStep3 from "@/assets/ios-step-3-confirm.png";

const activateSchema = z.object({
  firstName: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(50, "Nome muito longo"),
  email: z.string().email("Email inválido"),
});

type Step = "email" | "install";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const { trackEvent } = useTrackingPixels();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOSNotSafari, setIsIOSNotSafari] = useState(false);

  // Check if user is already logged in (coming from onboarding)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is logged in, go directly to install step
        setStep("install");
      }
    };
    checkSession();
  }, []);

  // Detect platform and browser
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|edgios|opera/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(/android/.test(userAgent));
    setIsIOSNotSafari(isIOSDevice && !isSafari);

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

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/dashboard");
      toast.success("Link copiado! Cole no Safari para instalar.");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      // On Android without prompt, show helpful toast
      if (isAndroid) {
        toast.info("Toque no menu (⋮) do navegador e selecione 'Instalar app'", {
          duration: 5000,
        });
      } else {
        toast.info("Use o menu do navegador para instalar o app");
      }
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        toast.success("App instalado com sucesso! Vamos configurar seu perfil...");
        // Small delay before redirect to show success message
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 500);
      }
    } catch (error) {
      console.error("Install error:", error);
      toast.error("Erro ao instalar. Use o menu do navegador.");
    } finally {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = activateSchema.safeParse({ firstName: firstName.trim(), email });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("activate-account", {
        body: { email, firstName: firstName.trim(), sessionId },
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

        // Track Purchase/CompleteRegistration event - this is the conversion!
        trackEvent("Purchase", {
          value: 0, // Actual value comes from Stripe webhook if needed
          currency: "BRL",
          content_name: "IntoleraI Subscription",
          content_type: "subscription",
        });
        trackEvent("CompleteRegistration");
        
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

  const handleSkipInstall = async () => {
    // Check if user already completed onboarding
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (profile?.onboarding_completed) {
        window.location.href = "/dashboard";
        return;
      }
    }
    window.location.href = "/onboarding";
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
            {/* Android - Always show prominent install button */}
            {isAndroid && !isIOS && (
              <div className="space-y-4">
                <Button 
                  onClick={handleInstallPWA}
                  className="w-full gradient-primary border-0 shadow-glow h-14 text-lg font-semibold"
                >
                  <Download className="w-6 h-6 mr-2" />
                  Instalar App no Celular
                </Button>
                {!showInstallButton && (
                  <p className="text-xs text-center text-muted-foreground">
                    Se o botão não funcionar, use o menu do navegador (⋮) → "Instalar app"
                  </p>
                )}
              </div>
            )}

            {/* Desktop / Other - Show install button when prompt is available */}
            {showInstallButton && !isIOS && !isAndroid && (
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

            {/* iOS in non-Safari browser - Show warning to open in Safari */}
            {isIOSNotSafari && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        Abra no Safari para instalar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No iOS, apenas o Safari permite adicionar apps à tela inicial
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={copyLinkToClipboard}
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-600 dark:text-amber-400"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar link para abrir no Safari
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Depois de copiar, abra o Safari e cole o link na barra de endereço
                  </p>
                </div>
              </div>
            )}

            {/* iOS in Safari - Show installation steps */}
            {isIOS && !isIOSNotSafari && (
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
              Ir para o Dashboard
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
              Digite seu email para ativar sua conta e começar a usar o IntoleraI
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Seu nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Como você gostaria de ser chamado?"
                  value={firstName}
                  onChange={(e) => {
                    const value = e.target.value;
                    const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                    setFirstName(capitalized);
                  }}
                  className="pl-10"
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </div>
            </div>
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
