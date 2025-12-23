import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertTriangle,
  Wheat,
  Utensils,
  Target,
  Flame,
  Clock,
  Users,
  Sparkles,
  Milk,
  Nut,
  Fish,
  Egg,
  Bean,
  Check,
  Leaf,
  Salad,
  Scale,
  TrendingDown,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Timer,
  ChefHat,
  User,
  Baby,
  Zap,
  Minus,
  Heart,
  Apple,
  Carrot,
  Pizza,
  Coffee,
  Droplet,
  Sun,
  Moon,
  Star,
  Shield,
  Ban,
  XCircle,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

// Mapeamento de nomes de ícones para componentes Lucide
const LUCIDE_ICONS: Record<string, LucideIcon> = {
  wheat: Wheat,
  milk: Milk,
  nut: Nut,
  fish: Fish,
  egg: Egg,
  bean: Bean,
  check: Check,
  utensils: Utensils,
  salad: Salad,
  leaf: Leaf,
  beef: Flame,
  flame: Flame,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  scale: Scale,
  minus: Minus,
  "arrow-down": ArrowDown,
  "arrow-up": ArrowUp,
  clock: Clock,
  zap: Zap,
  timer: Timer,
  "chef-hat": ChefHat,
  user: User,
  users: Users,
  baby: Baby,
  target: Target,
  heart: Heart,
  apple: Apple,
  carrot: Carrot,
  pizza: Pizza,
  coffee: Coffee,
  droplet: Droplet,
  sun: Sun,
  moon: Moon,
  star: Star,
  shield: Shield,
  "alert-triangle": AlertTriangle,
  ban: Ban,
  "x-circle": XCircle,
  "check-circle": CheckCircle,
};

type OnboardingOption = {
  id: string;
  category: string;
  option_id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  icon_name: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CategoryInfo = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const CATEGORIES: CategoryInfo[] = [
  { key: "intolerances", label: "Intolerâncias", icon: Wheat, description: "Restrições alimentares dos usuários" },
  { key: "dietary_preferences", label: "Preferências Alimentares", icon: Utensils, description: "Tipos de dieta" },
  { key: "goals", label: "Objetivos", icon: Target, description: "Metas de peso" },
  { key: "calorie_goals", label: "Meta de Calorias", icon: Flame, description: "Controle calórico" },
  { key: "complexity", label: "Complexidade de Receitas", icon: Clock, description: "Tempo de preparo" },
  { key: "context", label: "Contexto", icon: Users, description: "Para quem cozinha" },
];

export default function AdminOnboarding() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("intolerances");
  const [editingOption, setEditingOption] = useState<OnboardingOption | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState<OnboardingOption | null>(null);
  const [isGeneratingEmoji, setIsGeneratingEmoji] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  const [formData, setFormData] = useState({
    option_id: "",
    label: "",
    description: "",
    emoji: "",
    icon_name: "",
    is_active: true,
    sort_order: 0,
  });

  const generateIconName = async (label: string) => {
    if (!label.trim()) return;
    
    setIsGeneratingEmoji(true);
    try {
      console.log("Calling generate-emoji with label:", label);
      const { data, error } = await supabase.functions.invoke("generate-emoji", {
        body: { label },
      });

      console.log("generate-emoji response:", { data, error });

      if (error) {
        console.error("generate-emoji error:", error);
        toast.error("Erro ao gerar ícone");
        return;
      }
      
      if (data?.icon_name) {
        setFormData(prev => ({ ...prev, icon_name: data.icon_name, emoji: "" }));
        toast.success(`Ícone sugerido: ${data.icon_name}`);
      }
    } catch (error) {
      console.error("Error generating icon:", error);
      toast.error("Erro ao gerar ícone");
    } finally {
      setIsGeneratingEmoji(false);
    }
  };

  const generateDescription = async (label: string) => {
    if (!label.trim()) return;
    
    setIsGeneratingDescription(true);
    try {
      console.log("Calling generate-description with label:", label, "category:", selectedCategory);
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { label, category: selectedCategory },
      });

      console.log("generate-description response:", { data, error });

      if (error) {
        console.error("generate-description error:", error);
        toast.error("Erro ao gerar descrição");
        return;
      }
      
      if (data?.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast.success("Descrição gerada com sucesso!");
      }
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Erro ao gerar descrição");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Fetch all options
  const { data: options, isLoading } = useQuery({
    queryKey: ["onboarding-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_options")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as OnboardingOption[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { category: string }) => {
      const { error } = await supabase
        .from("onboarding_options")
        .insert({
          category: data.category,
          option_id: data.option_id,
          label: data.label,
          description: data.description || null,
          emoji: data.emoji || null,
          icon_name: data.icon_name || null,
          is_active: data.is_active,
          sort_order: data.sort_order,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-options"] });
      toast.success("Opção criada com sucesso!");
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar opção: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from("onboarding_options")
        .update({
          label: data.label,
          description: data.description || null,
          emoji: data.emoji || null,
          icon_name: data.icon_name || null,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-options"] });
      toast.success("Opção atualizada com sucesso!");
      setEditingOption(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar opção: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("onboarding_options")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-options"] });
      toast.success("Opção excluída com sucesso!");
      setDeleteOption(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir opção: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("onboarding_options")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-options"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      option_id: "",
      label: "",
      description: "",
      emoji: "",
      icon_name: "",
      is_active: true,
      sort_order: 0,
    });
  };

  const openEditDialog = (option: OnboardingOption) => {
    setEditingOption(option);
    setFormData({
      option_id: option.option_id,
      label: option.label,
      description: option.description || "",
      emoji: option.emoji || "",
      icon_name: option.icon_name || "",
      is_active: option.is_active,
      sort_order: option.sort_order,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    const categoryOptions = options?.filter(o => o.category === selectedCategory) || [];
    setFormData(prev => ({
      ...prev,
      sort_order: categoryOptions.length + 1,
    }));
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.option_id || !formData.label) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (editingOption) {
      updateMutation.mutate({
        id: editingOption.id,
        ...formData,
      });
    } else {
      createMutation.mutate({
        category: selectedCategory,
        ...formData,
      });
    }
  };

  const filteredOptions = options?.filter(o => o.category === selectedCategory) || [];
  const currentCategory = CATEGORIES.find(c => c.key === selectedCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Onboarding</h2>
        <p className="text-muted-foreground">
          Gerencie as opções que os usuários veem durante o cadastro
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = options?.filter(o => o.category === cat.key).length || 0;
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-4 py-2 rounded-xl"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{cat.label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <cat.icon className="w-5 h-5 text-primary" />
                    {cat.label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cat.description}
                  </p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Opção
                </Button>
              </CardHeader>
              <CardContent>
                {filteredOptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma opção cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50">
                          {option.icon_name && LUCIDE_ICONS[option.icon_name] ? (
                            (() => {
                              const IconComponent = LUCIDE_ICONS[option.icon_name];
                              return <IconComponent className="w-5 h-5 text-foreground stroke-[1.5]" />;
                            })()
                          ) : (
                            <span className="text-lg">{option.emoji || "•"}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {option.option_id}
                            </Badge>
                            {!option.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inativo
                              </Badge>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {option.description}
                            </p>
                          )}
                        </div>

                        <Switch
                          checked={option.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: option.id, is_active: checked })
                          }
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(option)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteOption(option)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingOption}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingOption(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? "Editar Opção" : "Nova Opção"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="option_id">ID da Opção *</Label>
              <Input
                id="option_id"
                value={formData.option_id}
                onChange={(e) => setFormData({ ...formData, option_id: e.target.value })}
                placeholder="gluten"
                disabled={!!editingOption}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Nome *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                onBlur={(e) => {
                  // Auto-generate icon when label loses focus and icon_name is empty
                  if (e.target.value.trim() && !formData.icon_name) {
                    generateIconName(e.target.value);
                  }
                }}
                placeholder="Glúten"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon_name">Ícone Lucide</Label>
              <div className="flex gap-2">
                <Input
                  id="icon_name"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  placeholder="wheat, milk, egg, leaf, etc."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => generateIconName(formData.label)}
                  disabled={isGeneratingEmoji || !formData.label.trim()}
                  title="Sugerir ícone com IA"
                >
                  {isGeneratingEmoji ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ícones disponíveis: wheat, milk, nut, fish, egg, bean, check, utensils, salad, leaf, flame, trending-down, trending-up, scale, clock, zap, timer, chef-hat, user, users, baby, target, apple, carrot, heart, droplet, alert-triangle, shield
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji (opcional - legado)</Label>
              <Input
                id="emoji"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                placeholder="🌾"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <div className="flex gap-2">
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Trigo, cevada, centeio"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => generateDescription(formData.label)}
                  disabled={isGeneratingDescription || !formData.label.trim()}
                  title="Gerar descrição com IA"
                >
                  {isGeneratingDescription ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordem</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingOption(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingOption ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOption} onOpenChange={() => setDeleteOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir opção?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a opção "{deleteOption?.label}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOption && deleteMutation.mutate(deleteOption.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
