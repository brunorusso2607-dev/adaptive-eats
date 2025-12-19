import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Sparkles, Clock, Heart, Camera, Zap, Check, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Camera, title: "Foto dos Ingredientes", description: "Tire uma foto e a IA identifica tudo automaticamente." },
  { icon: Sparkles, title: "Receitas Personalizadas", description: "Receitas únicas baseadas no que você tem." },
  { icon: Clock, title: "Tempo Real", description: "Receitas geradas em segundos com passo a passo." },
  { icon: Heart, title: "Salve Favoritas", description: "Guarde suas receitas e acesse offline." },
];

const benefits = ["Reduza o desperdício", "Economize tempo", "Novas combinações", "Dietas especiais", "Acesso ilimitado", "Funciona offline"];

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
          <Badge variant="secondary" className="px-4 py-2"><Zap className="w-4 h-4 mr-2 text-accent" />7 dias grátis</Badge>
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

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-card border-2 border-primary/20 overflow-hidden">
            <CardContent className="p-0 grid md:grid-cols-2">
              <div className="p-8 space-y-6">
                <Badge className="gradient-accent border-0">Mais popular</Badge>
                <div>
                  <h3 className="font-display text-2xl font-bold">ReceitAI Premium</h3>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="font-display text-5xl font-bold">R$19</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="w-full gradient-primary border-0 shadow-glow">
                    Começar 7 dias grátis <ArrowRight className="ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="p-8 bg-secondary/50">
                <ul className="space-y-3">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
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
