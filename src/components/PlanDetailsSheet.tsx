import { Crown, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: string;
  features: string[];
  isTrialing: boolean;
  trialEndDate: string | null;
  isActive: boolean;
}

export default function PlanDetailsSheet({
  open,
  onOpenChange,
  planName,
  planPrice,
  features,
  isTrialing,
  trialEndDate,
  isActive,
}: PlanDetailsSheetProps) {
  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Erro ao abrir portal de assinatura");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] p-6">
        <SheetHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 gradient-xp rounded-2xl flex items-center justify-center mb-3 shadow-[var(--shadow-glow-xp)]">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <SheetTitle className="font-display text-xl">
            Plano {planName}
          </SheetTitle>
          
          {/* Status Badge */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {isTrialing ? (
              <span className="px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                Trial Ativo
              </span>
            ) : isActive ? (
              <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                Ativo
              </span>
            ) : null}
          </div>
          
          {/* Trial End Date */}
          {isTrialing && trialEndDate && (
            <p className="text-sm text-muted-foreground mt-2">
              Seu trial termina em{" "}
              <span className="font-medium text-foreground">
                {new Date(trialEndDate).toLocaleDateString("pt-BR")}
              </span>
            </p>
          )}
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display text-3xl font-bold text-foreground">
                R${planPrice}
              </span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Incluído no seu plano
            </p>
            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Manage Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleManageSubscription}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Gerenciar assinatura
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
