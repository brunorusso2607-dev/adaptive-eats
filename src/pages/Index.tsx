import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Check, X, Crown, Star, Quote, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTrackingPixels } from "@/hooks/useTrackingPixels";
import { HIDE_STRIPE_UI } from "@/config/bypassConfig";

// Landing page components
import { PainPointHero } from "@/components/landing/PainPointHero";
import { TechProofSection } from "@/components/landing/TechProofSection";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { FinalCTA } from "@/components/landing/FinalCTA";

// Testimonial images
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";

const testimonials = [
  {
    name: "Carolina M.",
    role: "Intolerante à Lactose",
    image: testimonial1,
    quote: "Pela primeira vez em anos, comi em um restaurante sem medo. O scanner detectou leite em pó no molho que o garçom jurou ser sem lactose."
  },
  {
    name: "Rafael S.",
    role: "Celíaco",
    image: testimonial2,
    quote: "Escaneei um rótulo que dizia 'sem glúten' e o app alertou sobre contaminação cruzada por malte. Isso salvou meu dia."
  },
  {
    name: "Fernanda L.",
    role: "FODMAP",
    image: testimonial3,
    quote: "Finalmente entendi que o mel no meu açaí era o vilão das minhas crises. O app detectou em segundos o que médicos demoraram meses."
  },
];

const plans = {
  essencial: {
    name: "Essencial",
    price: "19,90",
    priceId: "price_1Sg9N6Ch4FnxqOQFbN0RhBzy",
    tagline: "Segurança básica no dia a dia",
    features: [
      { text: "5 análises de fotos por dia", included: true },
      { text: "Scanner de rótulos ilimitado", included: true },
      { text: "18 intolerâncias cobertas", included: true },
      { text: "Veto Layer ativo", included: true },
      { text: "Planos semanais automáticos", included: false },
      { text: "Histórico de sintomas", included: false },
    ],
  },
  premium: {
    name: "Premium",
    price: "29,90",
    priceId: "price_1Sg9ODCh4FnxqOQFkKsIJZOX",
    tagline: "Proteção completa + planejamento",
    badge: "Mais popular",
    features: [
      { text: "Análises ilimitadas", included: true, highlight: true },
      { text: "Planos semanais personalizados", included: true, highlight: true },
      { text: "Scanner de geladeira", included: true },
      { text: "Correlação sintoma-alimento", included: true, highlight: true },
      { text: "Chat com IA nutricional", included: true },
      { text: "Macros e metas de peso", included: true },
      { text: "Modo Kids", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
};

export default function Index() {
  const navigate = useNavigate();
  const { trackEvent } = useTrackingPixels();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleStartCheckout = async (plan: "essencial" | "premium") => {
    setLoadingPlan(plan);
    
    // Track InitiateCheckout event
    const planDetails = plans[plan];
    trackEvent("InitiateCheckout", {
      value: parseFloat(planDetails.price.replace(",", ".")),
      currency: "BRL",
      content_name: planDetails.name,
      content_ids: [planDetails.priceId],
      content_type: "subscription",
    });
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          returnUrl: window.location.origin,
          plan,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      window.location.href = data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar checkout";
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const scrollToPricing = () => {
    // If Stripe UI is hidden, go directly to auth
    if (HIDE_STRIPE_UI) {
      navigate("/auth?mode=signup");
      return;
    }
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">IntoleraI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#tech" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tecnologia</a>
            {!HIDE_STRIPE_UI && (
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="gradient-primary border-0 rounded-full px-6">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Pain Point Focus */}
      <PainPointHero onCtaClick={scrollToPricing} />

      {/* Feature Showcase */}
      <section id="features">
        <FeatureShowcase />
      </section>

      {/* Tech Proof Section */}
      <section id="tech">
        <TechProofSection />
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Histórias Reais
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4 mb-4">
              Quem Vive com Intolerância Entende
            </h2>
            <p className="text-muted-foreground text-lg">
              Veja como o IntoleraI mudou a vida de quem sofria com as mesmas dores que você
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="glass-card card-hover border-0 overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  
                  <p className="text-foreground leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-primary">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Hidden in bypass mode */}
      {!HIDE_STRIPE_UI && (
        <section id="pricing" className="py-24 px-6 gradient-soft">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <span className="text-primary font-medium text-sm uppercase tracking-wider">
                Planos
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4 mb-4">
                Invista na Sua Segurança Alimentar
              </h2>
              <p className="text-muted-foreground text-lg">
                7 dias grátis em todos os planos. Cancele quando quiser.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Plano Essencial */}
              <Card className="glass-card border-0 relative overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      {plans.essencial.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground">R${plans.essencial.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-4">
                    "{plans.essencial.tagline}"
                  </p>
                  
                  <ul className="space-y-3">
                    {plans.essencial.features.map((feature) => (
                      <li key={feature.text} className="flex items-center gap-3">
                        {feature.included ? (
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <X className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground line-through"}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-2">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full rounded-full"
                      onClick={() => handleStartCheckout("essencial")}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === "essencial" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        "Começar 7 dias grátis"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Plano Premium */}
              <Card className="glass-card border-2 border-primary/20 relative overflow-hidden shadow-glow">
                <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
                        <Crown className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <h3 className="font-display text-2xl font-bold text-foreground">
                        {plans.premium.name}
                      </h3>
                    </div>
                    <Badge className="gradient-primary border-0 text-primary-foreground">
                      {plans.premium.badge}
                    </Badge>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground">R${plans.premium.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4">
                    "{plans.premium.tagline}"
                  </p>
                  
                  <ul className="space-y-3">
                    {plans.premium.features.map((feature) => (
                      <li key={feature.text} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feature.highlight ? "bg-primary" : "bg-primary/10"}`}>
                          <Check className={`w-3 h-3 ${feature.highlight ? "text-primary-foreground" : "text-primary"}`} />
                        </div>
                        <span className={`text-sm ${feature.highlight ? "text-foreground font-medium" : "text-foreground"}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-2">
                    <Button 
                      size="lg" 
                      className="w-full gradient-primary border-0 rounded-full shadow-glow"
                      onClick={() => handleStartCheckout("premium")}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === "premium" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        "Começar 7 dias grátis"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <FinalCTA onCtaClick={scrollToPricing} />

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">IntoleraI</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <Link to="/terms-of-use" className="hover:text-foreground transition-colors">
                Termos de Uso
              </Link>
              <a href="mailto:contato@intolerai.com" className="hover:text-foreground transition-colors">
                Contato
              </a>
            </nav>
            
            <p className="text-sm text-muted-foreground">
              © 2025 IntoleraI. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
