import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Heart, Utensils } from "lucide-react";

interface FinalCTAProps {
  onCtaClick: () => void;
}

export const FinalCTA = forwardRef<HTMLElement, FinalCTAProps>(({ onCtaClick }, ref) => {
  return (
    <section ref={ref} className="py-24 px-6 gradient-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-full" />
        <div className="absolute bottom-10 right-10 w-48 h-48 border border-white rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border border-white rounded-full" />
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center space-y-8">
          <div className="flex justify-center gap-4 mb-6">
            <Shield className="w-12 h-12 text-white/80" />
            <Heart className="w-12 h-12 text-white/80" />
            <Utensils className="w-12 h-12 text-white/80" />
          </div>

          <h2 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight">
            Pronto para Recuperar sua{" "}
            <span className="underline decoration-white/30 underline-offset-8">
              Liberdade Alimentar
            </span>
            ?
          </h2>

          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            Chega de ansiedade antes de cada refeição. Com o ReceitAI, você come
            com confiança — sabendo exatamente o que está no seu prato.
          </p>

          <div className="pt-4">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-12 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-white text-primary hover:bg-white/90"
              onClick={onCtaClick}
            >
              Começar 7 Dias Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <p className="text-white/60 text-sm">
            Sem compromisso. Cancele quando quiser.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-8 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Veto Layer com 95% precisão
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              50.000+ ingredientes mapeados
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              18 intolerâncias cobertas
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

FinalCTA.displayName = "FinalCTA";
