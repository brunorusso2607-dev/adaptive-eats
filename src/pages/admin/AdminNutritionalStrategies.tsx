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

export default function AdminNutritionalStrategies() {
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

  // Fetch all strategies
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

  // Create mutation
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

  // Update mutation
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

  // Delete mutation
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

  // Toggle active mutation
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
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Estratégias Nutricionais
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as estratégias nutricionais disponíveis no onboarding e perfil
        </p>
      </div>

      <Card className="bg-card border border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-medium">Estratégias</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {strategies?.length || 0} estratégias cadastradas
            </p>
          </div>
          <Button 
            onClick={openCreateDialog}
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Estratégia
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {strategies?.map((strategy) => {
              const IconComponent = getIcon(strategy.icon);
              return (
                <div
                  key={strategy.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground/50">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{strategy.label}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {strategy.key}
                        </Badge>
                        {strategy.is_flexible && (
                          <Badge variant="secondary" className="text-[10px]">
                            Flexível
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {strategy.description || "Sem descrição"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Cal: {strategy.calorie_modifier > 0 ? "+" : ""}{strategy.calorie_modifier}</span>
                        <span>Prot: {strategy.protein_per_kg}g/kg</span>
                        <span>Carb: {((strategy.carb_ratio || 0) * 100).toFixed(0)}%</span>
                        <span>Fat: {((strategy.fat_ratio || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={strategy.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: strategy.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(strategy)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteStrategy(strategy)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {(!strategies || strategies.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma estratégia cadastrada</p>
              </div>
            )}
          </div>
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
                  className="h-9"
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
                  className="h-9"
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
                className="h-9"
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
                  className="h-9"
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
                  className="h-9"
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
                  className="h-9"
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
                  className="h-9"
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
                  className="h-9"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch
                  id="is_flexible"
                  checked={formData.is_flexible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_flexible: checked })}
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
    </div>
  );
}
