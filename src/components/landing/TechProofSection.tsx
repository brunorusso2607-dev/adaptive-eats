import { forwardRef } from "react";
import { Database, Shield, Eye, Server } from "lucide-react";

const techFeatures = [
  {
    icon: Database,
    stat: "50.000+",
    label: "Ingredientes Mapeados",
    description: "Banco de dados próprio com ingredientes regionais e industriais",
  },
  {
    icon: Shield,
    stat: "18",
    label: "Intolerâncias Cobertas",
    description: "Lactose, glúten, FODMAP, frutos do mar e mais 14 categorias",
  },
  {
    icon: Eye,
    stat: "95%",
    label: "Precisão de Detecção",
    description: "Veto Layer determinístico que nunca falha em ingredientes críticos",
  },
  {
    icon: Server,
    stat: "45",
    label: "Tabelas de Segurança",
    description: "Arquitetura robusta com validação em múltiplas camadas",
  },
];

const vetoLayerSteps = [
  {
    step: 1,
    title: "Análise Visual",
    description: "IA identifica cada ingrediente visível no prato",
  },
  {
    step: 2,
    title: "Decomposição",
    description: "Ingredientes compostos são separados em componentes base",
  },
  {
    step: 3,
    title: "Validação Veto Layer",
    description: "Cada componente é cruzado contra suas intolerâncias",
  },
  {
    step: 4,
    title: "Veredicto Final",
    description: "Resultado binário: Seguro ou Bloqueado — sem meias-palavras",
  },
];

export const TechProofSection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} className="py-24 px-6 bg-foreground text-background">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Tecnologia Exclusiva
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-4 mb-6">
              Por que 95% de Precisão?
            </h2>
            <p className="text-background/70 text-lg max-w-2xl mx-auto">
              Enquanto outras IAs "chutam" o que você come, nós construímos uma{" "}
              <span className="text-primary font-semibold">Muralha de Segurança</span>{" "}
              que cruza dados visuais com milhares de ingredientes reais.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {techFeatures.map((feature) => (
            <div
              key={feature.label}
              className="bg-background/5 backdrop-blur-sm rounded-2xl p-6 border border-background/10"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <p className="text-4xl font-bold text-primary">{feature.stat}</p>
              <p className="text-background font-semibold mt-1">{feature.label}</p>
              <p className="text-background/60 text-sm mt-2">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Veto Layer Explanation */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="font-display text-2xl md:text-3xl font-bold mb-6">
              O "Veto Layer" Explicado
            </h3>
            <p className="text-background/70 mb-8">
              Diferente de chatbots que apenas "sugerem", nosso motor de segurança
              <span className="text-primary font-semibold"> bloqueia ativamente </span>
              qualquer ingrediente que represente risco para você. É determinístico,
              não probabilístico.
            </p>

            <div className="space-y-4">
              {vetoLayerSteps.map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-background">{item.title}</p>
                    <p className="text-background/60 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Code Block Visual */}
            <div className="bg-[#1a1a2e] rounded-2xl p-6 font-mono text-sm overflow-hidden border border-white/10">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap text-xs md:text-sm leading-relaxed">
                <code className="block">{`// globalSafetyEngine.ts
validateIngredient(ingredient, userProfile) {
  // 1. Normalize ingredient name
  const normalized = normalize(ingredient);
  
  // 2. Check against 50,000+ mappings
  const conflicts = checkIntolerances(
    normalized, 
    userProfile.intolerances
  );
  
  // 3. VETO: Any conflict = BLOCKED
  if (conflicts.length > 0) {
    return {
      safe: false,
      reason: conflicts[0].reason,
      severity: "CRITICAL"
    };
  }
  
  return { safe: true };
}`}</code>
              </pre>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10">
              Código Real
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-20 text-center">
          <p className="text-background/50 text-sm mb-6">Bases de dados integradas</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-60">
            {["ANVISA", "FDA", "OpenFoodFacts", "TACO", "USDA"].map((badge) => (
              <span key={badge} className="text-background font-medium">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

TechProofSection.displayName = "TechProofSection";
