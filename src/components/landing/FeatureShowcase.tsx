import { forwardRef, useState } from "react";
import { Camera, ScanLine, Refrigerator, Shield, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Camera,
    title: "O Olho Clínico",
    tagline: "Analisar Prato",
    description:
      "Nossa tecnologia não vê apenas 'comida' — ela detecta o brilho suspeito de um molho que indica lactose oculta ou a textura de um empanado que esconde glúten.",
    highlights: [
      "Decomposição automática em ingredientes base",
      "Detecção de derivados industriais",
      "Alerta de contaminação cruzada",
    ],
  },
  {
    icon: ScanLine,
    title: "A Auditoria de Rótulos",
    tagline: "Verificar Rótulo",
    description:
      "Integrado ao OpenFoodFacts e bases ANVISA/FDA, o IntoleraI é o único que audita rótulos em tempo real, garantindo que o 'Sem Glúten' da embalagem seja verdade na sua mesa.",
    highlights: [
      "Leitura de tabela nutricional",
      "Verificação de selos regulatórios",
      "Alerta de marketing enganoso",
    ],
  },
  {
    icon: Refrigerator,
    title: "A Geladeira Inteligente",
    tagline: "Escanear Geladeira",
    description:
      "Transforme o desperdício em segurança. Escaneie sua geladeira e receba receitas que respeitam seu DNA nutricional e o prazo de validade dos seus alimentos.",
    highlights: [
      "Identificação visual de ingredientes",
      "Sugestões anti-desperdício",
      "Receitas 100% seguras para você",
    ],
  },
];

export const FeatureShowcase = forwardRef<HTMLElement>((_, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <section ref={ref} className="py-24 px-6 gradient-soft">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Três Super-Poderes
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4 mb-4">
              Tecnologia a Favor da Sua Segurança
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Cada funcionalidade foi projetada para um cenário real de quem vive
              com intolerâncias alimentares
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title}>
              <Card className="h-full glass-card card-hover border-0 overflow-hidden group">
                <CardContent className="p-8 space-y-6">
                  {/* Icon & Tag */}
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {feature.tagline}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Highlights */}
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-full px-6 py-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Todas as análises passam pelo{" "}
              <span className="text-primary">Veto Layer</span> — sua camada extra de segurança
            </span>
          </div>
        </div>
      </div>
    </section>
  );
});

FeatureShowcase.displayName = "FeatureShowcase";
