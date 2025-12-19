import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Sparkles, Clock, Heart, Camera, Zap, Check, ArrowRight, X, Crown, Star } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Camera, title: "Foto dos Ingredientes", description: "Tire uma foto e a IA identifica tudo automaticamente." },
  { icon: Sparkles, title: "Receitas Personalizadas", description: "Receitas únicas baseadas no que você tem." },
  { icon: Clock, title: "Tempo Real", description: "Receitas geradas em segundos com passo a passo." },
  { icon: Heart, title: "Salve Favoritas", description: "Guarde suas receitas e acesse offline." },
];

const plans = {
  essencial: {
    name: "Essencial",
    price: "19,90",
    priceId: "price_1Sg9N6Ch4FnxqOQFbN0RhBzy",
    tagline: "Para quem quer decidir o que cozinhar",
    badge: null,
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
  return (
    <div className="min-h-screen gradient-hero">
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <ChefHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">ReceitAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth?mode=signup"><Button size="sm" className="gradient-primary border-0 shadow-glow">Começar Grátis</Button></Link>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-2"><Zap className="w-4 h-4 mr-2 text-accent" />7 dias grátis em todos os planos</Badge>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Transforme ingredientes em <span className="text-gradient-primary">receitas incríveis</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A IA que entende o que você tem na geladeira e cria receitas personalizadas em segundos.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gradient-primary border-0 shadow-glow text-lg px-8 py-6 h-auto">
              Começar Trial Gratuito <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Como funciona</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                    <f.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{f.title}</h3>
                  <p className="text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4" id="pricing">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4">Escolha seu plano</h2>
            <p className="text-muted-foreground">7 dias grátis em todos os planos. Cancele quando quiser.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Plano Essencial */}
            <Card className="glass-card border-2 border-border/50 relative overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-muted-foreground" />
                  <h3 className="font-display text-2xl font-bold">Plano {plans.essencial.name}</h3>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">R${plans.essencial.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                
                <p className="text-sm text-muted-foreground italic">"{plans.essencial.tagline}"</p>
                
                <ul className="space-y-3">
                  {plans.essencial.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      {feature.included ? (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <X className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Link to={`/auth?mode=signup&plan=essencial`} className="block">
                  <Button size="lg" variant="outline" className="w-full">
                    Começar 7 dias grátis <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plano Premium */}
            <Card className="glass-card border-2 border-primary/40 relative overflow-hidden shadow-glow">
              <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-accent" />
                    <h3 className="font-display text-2xl font-bold">Plano {plans.premium.name}</h3>
                  </div>
                  <Badge className="gradient-accent border-0">{plans.premium.badge}</Badge>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">R${plans.premium.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                
                <p className="text-sm text-muted-foreground italic">"{plans.premium.tagline}"</p>
                
                <ul className="space-y-3">
                  {plans.premium.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feature.highlight ? 'gradient-primary' : 'bg-primary/20'}`}>
                        <Check className={`w-3 h-3 ${feature.highlight ? 'text-primary-foreground' : 'text-primary'}`} />
                      </div>
                      <span className={feature.highlight ? "font-medium" : ""}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Link to={`/auth?mode=signup&plan=premium`} className="block">
                  <Button size="lg" className="w-full gradient-primary border-0 shadow-glow">
                    Começar 7 dias grátis <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © 2024 ReceitAI. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
