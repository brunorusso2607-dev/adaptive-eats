import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Save, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MealPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status?: string;
}

interface MealPlanEditorProps {
  planId: string;
  onClose: () => void;
  onPlanUpdated?: () => void;
  onPlanDeleted?: () => void;
}

export default function MealPlanEditor({ 
  planId, 
  onClose, 
  onPlanUpdated,
  onPlanDeleted 
}: MealPlanEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [planName, setPlanName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch plan data
  useEffect(() => {
    const fetchPlan = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("meal_plans")
          .select("id, name, start_date, end_date, is_active, status")
          .eq("id", planId)
          .single();

        if (error) throw error;

        setPlan({
          id: data.id,
          name: data.name,
          start_date: data.start_date,
          end_date: data.end_date,
          is_active: data.is_active,
          status: data.status ?? undefined,
        });
        setPlanName(data.name);
      } catch (error) {
        console.error("Error fetching plan:", error);
        toast.error("Erro ao carregar plano");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [planId, onClose]);

  const handleNameChange = (value: string) => {
    setPlanName(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!plan) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meal_plans")
        .update({
          name: planName.trim() || plan.name,
          updated_at: new Date().toISOString()
        })
        .eq("id", planId);

      if (error) throw error;

      toast.success("Plano atualizado com sucesso");
      setHasChanges(false);
      onPlanUpdated?.();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Erro ao atualizar plano");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("meal_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      toast.success("Plano excluído com sucesso");
      onPlanDeleted?.();
      onClose();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Erro ao excluir plano");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return `${format(start, "dd 'de' MMMM", { locale: ptBR })} até ${format(end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando plano...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-muted-foreground">Plano não encontrado</p>
        <Button variant="outline" onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Editar Plano</h2>
            <p className="text-sm text-muted-foreground">
              Altere o nome ou exclua o plano
            </p>
          </div>
        </div>
      </div>

      {/* Plan Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Informações do Plano
          </CardTitle>
          <CardDescription>
            {formatDateRange(plan.start_date, plan.end_date)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Name */}
          <div className="space-y-2">
            <Label htmlFor="plan-name">Nome do Plano</Label>
            <Input
              id="plan-name"
              value={planName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Dezembro 2025"
              className="max-w-sm"
            />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {plan.is_active ? (
              <span className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                Ativo
              </span>
            ) : (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                Inativo
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              disabled={isDeleting || isSaving}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Plano
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todas as refeições deste plano serão excluídas permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gradient-primary border-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}