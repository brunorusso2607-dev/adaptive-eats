import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type FeedbackType = "wrong_ingredient" | "missed_allergen" | "false_alert" | "other";

interface AnalysisFeedbackButtonProps {
  analysisType: "food" | "label" | "fridge";
  analysisData?: any;
}

const feedbackOptions: { value: FeedbackType; label: string; description: string }[] = [
  {
    value: "missed_allergen",
    label: "Alérgeno não detectado",
    description: "A análise não identificou um ingrediente problemático para mim",
  },
  {
    value: "wrong_ingredient",
    label: "Ingrediente errado",
    description: "A análise identificou um ingrediente que não estava presente",
  },
  {
    value: "false_alert",
    label: "Alerta falso",
    description: "Recebi um alerta de risco, mas o produto era seguro",
  },
  {
    value: "other",
    label: "Outro problema",
    description: "Outro tipo de erro na análise",
  },
];

export default function AnalysisFeedbackButton({ analysisType, analysisData }: AnalysisFeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedbackType) {
      toast.error("Selecione o tipo de problema");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para enviar feedback");
        return;
      }

      const { error } = await supabase.from("ai_analysis_feedback").insert({
        user_id: user.id,
        analysis_type: analysisType,
        feedback_type: feedbackType,
        description: description || null,
        analysis_data: analysisData || null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Obrigado pelo feedback!", {
        description: "Sua contribuição nos ajuda a melhorar a segurança.",
      });

      // Reset and close after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFeedbackType(null);
        setDescription("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Erro ao enviar feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnalysisTypeLabel = () => {
    switch (analysisType) {
      case "food":
        return "análise do prato";
      case "label":
        return "verificação do rótulo";
      case "fridge":
        return "análise da geladeira";
      default:
        return "análise";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Reportar problema
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Reportar Problema na Análise
          </DialogTitle>
          <DialogDescription>
            Encontrou um erro na {getAnalysisTypeLabel()}? Seu feedback nos ajuda a melhorar a precisão e segurança.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-center text-muted-foreground">
              Feedback enviado com sucesso!
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de problema *</Label>
              <RadioGroup
                value={feedbackType || ""}
                onValueChange={(value) => setFeedbackType(value as FeedbackType)}
                className="space-y-1.5"
              >
                {feedbackOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      feedbackType === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setFeedbackType(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="text-sm font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Detalhes (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva o problema com mais detalhes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!feedbackType || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Feedback"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
