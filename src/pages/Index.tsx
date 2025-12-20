import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Sparkles, Clock, Heart, Camera, Check, ArrowRight, X, Crown, Star, Quote, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Testimonial images
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";

const features = [
  { 
    icon: Camera, 
    title: "Foto dos Ingredientes", 
    description: "Tire uma foto da sua geladeira e nossa IA identifica tudo automaticamente." 
  },
  { 
    icon: Sparkles, 
    title: "Receitas com IA", 
    description: "Receitas personalizadas criadas especialmente para você em segundos." 
  },
  { 
    icon: Clock, 
    title: "Rápido e Fácil", 
    description: "Passo a passo detalhado com tempo estimado para cada receita." 
  },
  { 
    icon: Heart, 
    title: "Suas Favoritas", 
    description: "Salve receitas favoritas e acesse seu histórico a qualquer momento." 
  },
];

const steps = [
  {
    number: "1",
    title: "Diga o que você tem",
    description: "Fotografe seus ingredientes ou digite manualmente o que tem disponível na cozinha."
  },
  {
    number: "2", 
    title: "Configure suas preferências",
    description: "Informe restrições alimentares, tempo disponível e tipo de refeição desejada."
  },
  {
    number: "3",
    title: "Receba receitas perfeitas",
    description: "Nossa IA cria receitas personalizadas usando exatamente o que você tem em casa."
  },
];

const testimonials = [
  {
    name: "Carolina M.",
    role: "Mãe de 2 filhos",
    image: testimonial1,
    quote: "O ReceitAI mudou completamente minha rotina! Agora consigo fazer jantares saudáveis usando o que tenho em casa, sem precisar ir ao mercado toda hora."
  },
  {
    name: "Rafael S.",
    role: "Personal Trainer",
    image: testimonial2,
    quote: "Adoro que posso configurar minhas metas nutricionais e o app sugere receitas que se encaixam perfeitamente na minha dieta. Os macros detalhados são incríveis!"
  },
  {
    name: "Fernanda L.",
    role: "Empreendedora",
    image: testimonial3,
    quote: "A rotina semanal automática é genial! Economizo horas de planejamento e ainda reduzi muito o desperdício de alimentos."
  },
];

const plans = {
  essencial: {
    name: "Essencial",
    price: "19,90",
    priceId: "price_1Sg9N6Ch4FnxqOQFbN0RhBzy",
    tagline: "Para quem quer decidir o que cozinhar",
    features: [
      { text: "5 receitas por dia", included: true },
      { text: "Geração de receitas com IA", included: true },
      { text: "Calorias por receita", included: true },
      { text: "Respeito às intolerâncias", included: true },
      { text: "Aceitar / gerar nova", included: true },
      { text: "Rotina semanal automática", included: false },
      { text: "Estimativa de emagrecimento", included: false },
    ],
  },
  premium: {
    name: "Premium",
    price: "29,90",
    priceId: "price_1Sg9ODCh4FnxqOQFkKsIJZOX",
    tagline: "Para quem quer resultado e organização",
    badge: "Mais completo",
    features: [
      { text: "Receitas ilimitadas", included: true, highlight: true },
      { text: "Rotina semanal automática", included: true, highlight: true },
      { text: "Semanas não repetitivas", included: true },
      { text: "Estimativa de emagrecimento", included: true, highlight: true },
      { text: "Macros detalhados", included: true },
      { text: "Ajuste inteligente de porções", included: true },
      { text: "Favoritas + histórico completo", included: true },
      { text: "Modo Kids", included: true, highlight: true },
    ],
  },
};

export default function Index() {
  const navigate = useNavigate();
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
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          returnUrl: window.location.origin,
          plan,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Redirect to checkout
      window.location.href = data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar checkout";
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
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
            <span className="font-display text-xl font-semibold text-foreground">ReceitAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como Funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
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

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 gradient-hero">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="space-y-8">
            <Badge variant="secondary" className="px-4 py-2 rounded-full text-sm font-medium">
              ✨ 7 dias grátis em todos os planos
            </Badge>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
              Cozinhe o que Você <span className="text-gradient-primary">Deseja</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Descubra receitas personalizadas baseadas nos ingredientes que você tem em casa. 
              ReceitAI torna cozinhar intuitivo, saudável e delicioso.
            </p>
            
            <div className="pt-4">
              <Button 
                size="lg" 
                className="gradient-primary border-0 rounded-full px-10 py-6 text-lg font-medium shadow-glow hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Por que escolher o ReceitAI?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Nossa plataforma inteligente combina seus ingredientes e preferências para criar a experiência culinária perfeita.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="glass-card card-hover border-0">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto gradient-soft rounded-2xl flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 gradient-soft">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como Funciona
            </h2>
            <p className="text-muted-foreground text-lg">
              Receitas personalizadas em 3 passos simples
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto gradient-primary rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-glow">
                  {step.number}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              O que nossos usuários dizem
            </h2>
            <p className="text-muted-foreground text-lg">
              Milhares de pessoas já transformaram sua forma de cozinhar
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
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 gradient-soft">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha seu plano
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
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feature.highlight ? 'gradient-primary' : 'bg-primary/10'}`}>
                        <Check className={`w-3 h-3 ${feature.highlight ? 'text-primary-foreground' : 'text-primary'}`} />
                      </div>
                      <span className={`text-sm ${feature.highlight ? "font-medium text-foreground" : "text-foreground"}`}>
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
                      <>
                        Começar 7 dias grátis
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            Pronto para transformar sua cozinha?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Junte-se a milhares de pessoas que já descobriram a alegria de cozinhar com inteligência artificial
          </p>
          <Button 
            size="lg" 
            className="gradient-primary border-0 rounded-full px-12 py-6 text-lg font-medium shadow-glow hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Começar Gratuitamente
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-foreground">ReceitAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 ReceitAI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
