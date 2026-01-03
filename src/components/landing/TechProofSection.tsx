import { motion } from "framer-motion";
import { Database, Shield, Eye, Scan, CheckCircle2, Server } from "lucide-react";

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

export function TechProofSection() {
  return (
    <section className="py-24 px-6 bg-foreground text-background">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
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
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {techFeatures.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-background/5 backdrop-blur-sm rounded-2xl p-6 border border-background/10"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <p className="text-4xl font-bold text-primary">{feature.stat}</p>
              <p className="text-background font-semibold mt-1">{feature.label}</p>
              <p className="text-background/60 text-sm mt-2">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Veto Layer Explanation */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
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
              {vetoLayerSteps.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-background">{item.title}</p>
                    <p className="text-background/60 text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Code Block Visual */}
            <div className="bg-black/50 rounded-2xl p-6 font-mono text-sm overflow-hidden">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <pre className="text-background/80 overflow-x-auto">
                <code>{`// globalSafetyEngine.ts
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
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg"
            >
              Código Real
            </motion.div>
          </motion.div>
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <p className="text-background/50 text-sm mb-6">Bases de dados integradas</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-60">
            {["ANVISA", "FDA", "OpenFoodFacts", "TACO", "USDA"].map((badge) => (
              <span key={badge} className="text-background font-medium">
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
