import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { ScannerDemo } from "./ScannerDemo";

interface PainPointHeroProps {
  onCtaClick: () => void;
}

export function PainPointHero({ onCtaClick }: PainPointHeroProps) {
  return (
    <section className="pt-32 pb-24 px-6 gradient-hero overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            <Badge variant="secondary" className="px-4 py-2 rounded-full text-sm font-medium">
              <ShieldCheck className="w-4 h-4 mr-2" />
              95% de precisão na detecção
            </Badge>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
              Chega de{" "}
              <span className="relative">
                <span className="text-destructive">medo</span>
                <span className="absolute bottom-2 left-0 h-1 w-full bg-destructive/30" />
              </span>{" "}
              de comer fora de casa
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Se você tem <span className="font-semibold text-foreground">intolerância alimentar</span>,
              sabe a angústia de perguntar "isso tem lactose?" e torcer para o garçom estar certo.
            </p>

            <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">A verdade que ninguém conta:</span>{" "}
                  IAs genéricas erram 40% das vezes ao identificar ingredientes ocultos como
                  caseína, malte ou lecitina de soja.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="gradient-primary border-0 rounded-full px-10 py-6 text-lg font-medium shadow-glow hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                onClick={onCtaClick}
              >
                Recuperar Minha Liberdade
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                50.000+ ingredientes mapeados
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                18 intolerâncias cobertas
              </div>
            </div>
          </div>

          {/* Right: Interactive Demo */}
          <div className="hidden lg:block">
            <ScannerDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
