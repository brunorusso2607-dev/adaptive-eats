import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { HIDE_STRIPE_UI } from "@/config/bypassConfig";

const emailSchema = z.string().email("Email inválido");

const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
};

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Defer the admin check to avoid Supabase deadlock
        setTimeout(async () => {
          const isAdmin = await checkIsAdmin(session.user.id);
          navigate(isAdmin ? "/admin" : "/dashboard");
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isAdmin = await checkIsAdmin(session.user.id);
        navigate(isAdmin ? "/admin" : "/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the activate-account function to verify payment and get login link
      const { data, error } = await supabase.functions.invoke("activate-account", {
        body: { email },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // If we got a tokenHash, verify it to log the user in
      if (data.tokenHash && data.type) {
        const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: data.type,
        });

        if (verifyError) {
          throw new Error("Erro ao verificar login. Tente novamente.");
        }

        // Check if user is admin and redirect accordingly
        if (authData.user) {
          const isAdmin = await checkIsAdmin(authData.user.id);
          toast.success("Login realizado com sucesso!");
          navigate(isAdmin ? "/admin" : "/dashboard");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao fazer login";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-5">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar</span>
        </Link>
      </header>

      {/* Auth Form */}
      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <Card className="w-full max-w-md bg-card border border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-5 pb-2">
            <div className="mx-auto w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight">Bem-vindo ao ReceitAI</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Digite seu email para acessar sua conta
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11"
                    disabled={isLoading}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use o email que você cadastrou na sua assinatura
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {!HIDE_STRIPE_UI && (
              <div className="mt-6 pt-6 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Ainda não tem uma conta?{" "}
                  <Link to="/#pricing" className="text-primary hover:underline font-medium">
                    Assine agora
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
