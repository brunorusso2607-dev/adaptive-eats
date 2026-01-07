import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  TrendingDown,
  TrendingUp,
  Scale,
  Dumbbell,
  Utensils,
  Sparkles,
  Target,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

type NutritionalStrategy = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  calorie_modifier: number | null;
  protein_per_kg: number | null;
  carb_ratio: number | null;
  fat_ratio: number | null;
  is_flexible: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const ICONS: Record<string, LucideIcon> = {
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  scale: Scale,
  dumbbell: Dumbbell,
  utensils: Utensils,
  sparkles: Sparkles,
  target: Target,
};

const ICON_OPTIONS = [
  { value: "trending-down", label: "Trending Down" },
  { value: "trending-up", label: "Trending Up" },
  { value: "scale", label: "Scale" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "utensils", label: "Utensils" },
  { value: "sparkles", label: "Sparkles" },
  { value: "target", label: "Target" },
];

export default function NutritionalStrategiesTab() {
  const queryClient = useQueryClient();
  const [editingStrategy, setEditingStrategy] = useState<NutritionalStrategy | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteStrategy, setDeleteStrategy] = useState<NutritionalStrategy | null>(null);
  
  const [formData, setFormData] = useState({
    key: "",
    label: "",
    description: "",
    icon: "scale",
    calorie_modifier: 0,
    protein_per_kg: 1.6,
    carb_ratio: 0.5,
    fat_ratio: 0.25,
    is_flexible: false,
    is_active: true,
    sort_order: 0,
  });

  const { data: strategies, isLoading } = useQuery({
    queryKey: ["nutritional-strategies-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutritional_strategies")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as NutritionalStrategy[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("nutritional_strategies")
        .insert({
          key: data.key,
          label: data.label,
          description: data.description || null,
          icon: data.icon || null,
          calorie_modifier: data.calorie_modifier,
          protein_per_kg: data.protein_per_kg,
          carb_ratio: data.carb_ratio,
          fat_ratio: data.fat_ratio,
          is_flexible: data.is_flexible,
          is_active: data.is_active,
          sort_order: data.sort_order,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritional-strategies-admin"] });
      toast.success("Estratégia criada com sucesso!");
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar estratégia: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from("nutritional_strategies")
        .update({
          label: data.label,
          description: data.description || null,
          icon: data.icon || null,
          calorie_modifier: data.calorie_modifier,
          protein_per_kg: data.protein_per_kg,
          carb_ratio: data.carb_ratio,
          fat_ratio: data.fat_ratio,
          is_flexible: data.is_flexible,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritional-strategies-admin"] });
      toast.success("Estratégia atualizada com sucesso!");
      setEditingStrategy(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar estratégia: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("nutritional_strategies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritional-strategies-admin"] });
      toast.success("Estratégia excluída com sucesso!");
      setDeleteStrategy(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir estratégia: ${error.message}`);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("nutritional_strategies")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritional-strategies-admin"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      label: "",
      description: "",
      icon: "scale",
      calorie_modifier: 0,
      protein_per_kg: 1.6,
      carb_ratio: 0.5,
      fat_ratio: 0.25,
      is_flexible: false,
      is_active: true,
      sort_order: 0,
    });
  };

  const openEditDialog = (strategy: NutritionalStrategy) => {
    setEditingStrategy(strategy);
    setFormData({
      key: strategy.key,
      label: strategy.label,
      description: strategy.description || "",
      icon: strategy.icon || "scale",
      calorie_modifier: strategy.calorie_modifier || 0,
      protein_per_kg: strategy.protein_per_kg || 1.6,
      carb_ratio: strategy.carb_ratio || 0.5,
      fat_ratio: strategy.fat_ratio || 0.25,
      is_flexible: strategy.is_flexible,
      is_active: strategy.is_active,
      sort_order: strategy.sort_order,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sort_order: (strategies?.length || 0) + 1,
    }));
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.key || !formData.label) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (editingStrategy) {
      updateMutation.mutate({
        id: editingStrategy.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Scale;
    return ICONS[iconName] || Scale;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Card informativo - Dados Físicos Coletados */}
      <Card className="border-border/50 mb-6 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-muted-foreground" />
            Dados Físicos Coletados no Onboarding
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Campos obrigatórios para cálculo da fórmula Mifflin-St Jeor (não editáveis)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
              <Scale className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Peso Atual</p>
                <p className="text-sm font-medium">kg</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
              <Target className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Peso Desejado</p>
                <p className="text-sm font-medium">kg</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Altura</p>
                <p className="text-sm font-medium">metros</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Idade</p>
                <p className="text-sm font-medium">anos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
              <Utensils className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Sexo Biológico</p>
                <p className="text-sm font-medium">M / F</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border/50">
              <Dumbbell className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Nível Atividade</p>
                <p className="text-sm font-medium">5 níveis</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Estes dados são salvos no perfil do usuário e usados para calcular TMB, TDEE e macros personalizados.
          </p>
        </CardContent>
      </Card>

      {/* Card de Estratégias */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-muted-foreground" />
              Estratégias Nutricionais
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Objetivos nutricionais para cálculo de macros
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nova Estratégia
          </Button>
        </CardHeader>
        <CardContent>
          {(!strategies || strategies.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma estratégia cadastrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {strategies.map((strategy) => {
                const IconComponent = getIcon(strategy.icon);
                return (
                  <div
                    key={strategy.id}
                    className="flex items-start sm:items-center gap-3 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors overflow-hidden"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab hidden sm:block flex-shrink-0 mt-3 sm:mt-0" />
                    
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-muted/50">
                      <IconComponent className="w-5 h-5 text-foreground stroke-[1.5]" />
                    </div>
                    
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{strategy.label}</span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-mono">
                          {strategy.key}
                        </span>
                        {strategy.is_flexible && (
                          <Badge variant="secondary" className="text-xs">
                            Flexível
                          </Badge>
                        )}
                        {!strategy.is_active && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                            Inativo
                          </span>
                        )}
                      </div>
                      {strategy.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 break-all">
                          {strategy.description.length > 50 
                            ? `${strategy.description.slice(0, 50)}...` 
                            : strategy.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Cal: {strategy.calorie_modifier && strategy.calorie_modifier > 0 ? "+" : ""}{strategy.calorie_modifier || 0}</span>
                        <span>Prot: {strategy.protein_per_kg || 0}g/kg</span>
                        <span>Carb: {((strategy.carb_ratio || 0) * 100).toFixed(0)}%</span>
                        <span>Fat: {((strategy.fat_ratio || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={strategy.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: strategy.id, is_active: checked })
                        }
                        className="data-[state=checked]:bg-foreground"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(strategy)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteStrategy(strategy)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingStrategy}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingStrategy(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStrategy ? "Editar Estratégia" : "Nova Estratégia"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="key" className="text-xs">
                  Chave (ID) *
                </Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="ex: cutting"
                  disabled={!!editingStrategy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-xs">
                  Nome *
                </Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: Cutting"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">
                Descrição
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição curta da estratégia"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((option) => {
                  const Icon = ICONS[option.value];
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, icon: option.value })}
                      className={`p-2 rounded-lg border transition-colors ${
                        formData.icon === option.value
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="calorie_modifier" className="text-xs">
                  Modificador Calórico
                </Label>
                <Input
                  id="calorie_modifier"
                  type="number"
                  value={formData.calorie_modifier}
                  onChange={(e) => setFormData({ ...formData, calorie_modifier: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="protein_per_kg" className="text-xs">
                  Proteína (g/kg)
                </Label>
                <Input
                  id="protein_per_kg"
                  type="number"
                  step="0.1"
                  value={formData.protein_per_kg}
                  onChange={(e) => setFormData({ ...formData, protein_per_kg: parseFloat(e.target.value) || 1.6 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="carb_ratio" className="text-xs">
                  Ratio Carb (0-1)
                </Label>
                <Input
                  id="carb_ratio"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={formData.carb_ratio}
                  onChange={(e) => setFormData({ ...formData, carb_ratio: parseFloat(e.target.value) || 0.5 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fat_ratio" className="text-xs">
                  Ratio Fat (0-1)
                </Label>
                <Input
                  id="fat_ratio"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={formData.fat_ratio}
                  onChange={(e) => setFormData({ ...formData, fat_ratio: parseFloat(e.target.value) || 0.25 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sort_order" className="text-xs">
                  Ordem
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch
                  id="is_flexible"
                  checked={formData.is_flexible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_flexible: checked })}
                  className="data-[state=checked]:bg-foreground"
                />
                <Label htmlFor="is_flexible" className="text-xs">
                  Dieta Flexível
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                className="data-[state=checked]:bg-foreground"
              />
              <Label htmlFor="is_active" className="text-xs">
                Ativo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingStrategy(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingStrategy ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStrategy} onOpenChange={() => setDeleteStrategy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estratégia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A estratégia "{deleteStrategy?.label}" será
              removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStrategy && deleteMutation.mutate(deleteStrategy.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
