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
import NutritionalStrategiesTab from "@/components/admin/NutritionalStrategiesTab";
import OnboardingCountriesTab from "@/components/admin/OnboardingCountriesTab";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Globe,
  Wheat,
  WheatOff,
  Utensils,
  Target,
  Flame,
  Clock,
  Users,
  Sparkles,
  Milk,
  MilkOff,
  Nut,
  NutOff,
  Fish,
  FishOff,
  Egg,
  EggOff,
  Bean,
  BeanOff,
  Check,
  Leaf,
  LeafyGreen,
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
  Banana,
  Cherry,
  Citrus,
  Grape,
  Sandwich,
  Soup,
  Cookie,
  Cake,
  IceCreamCone,
  Popcorn,
  Candy,
  Beer,
  Wine,
  Martini,
  CupSoda,
  CircleDot,
  Beef,
  Bird,
  Drumstick,
  Ham,
  Croissant,
  Lollipop,
  Vegan,
  Bone,
  Slice,
  CircleOff,
  Snowflake,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";

// Mapeamento de nomes de ícones para componentes Lucide
const LUCIDE_ICONS: Record<string, LucideIcon> = {
  // Grãos e cereais
  wheat: Wheat,
  "wheat-off": WheatOff,
  
  // Laticínios
  milk: Milk,
  "milk-off": MilkOff,
  
  // Oleaginosas
  nut: Nut,
  "nut-off": NutOff,
  
  // Peixes e frutos do mar
  fish: Fish,
  "fish-off": FishOff,
  
  // Ovos
  egg: Egg,
  "egg-off": EggOff,
  
  // Leguminosas
  bean: Bean,
  "bean-off": BeanOff,
  
  // Carnes
  beef: Beef,
  bird: Bird,
  drumstick: Drumstick,
  ham: Ham,
  bone: Bone,
  
  // Vegetais e folhas
  leaf: Leaf,
  "leafy-green": LeafyGreen,
  salad: Salad,
  carrot: Carrot,
  vegan: Vegan,
  
  // Frutas
  apple: Apple,
  banana: Banana,
  cherry: Cherry,
  citrus: Citrus,
  grape: Grape,
  
  // Refeições
  utensils: Utensils,
  pizza: Pizza,
  sandwich: Sandwich,
  soup: Soup,
  croissant: Croissant,
  slice: Slice,
  
  // Doces e sobremesas
  cookie: Cookie,
  cake: Cake,
  "ice-cream-cone": IceCreamCone,
  popcorn: Popcorn,
  candy: Candy,
  "candy-off": Ban, // Usando Ban como fallback para candy-off (açúcar)
  lollipop: Lollipop,
  
  // Bebidas
  coffee: Coffee,
  beer: Beer,
  wine: Wine,
  martini: Martini,
  "cup-soda": CupSoda,
  droplet: Droplet,
  
  // Dieta e nutrição
  flame: Flame,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  scale: Scale,
  minus: Minus,
  "arrow-down": ArrowDown,
  "arrow-up": ArrowUp,
  
  // Tempo e preparo
  clock: Clock,
  zap: Zap,
  timer: Timer,
  "chef-hat": ChefHat,
  snowflake: Snowflake,
  
  // Pessoas
  user: User,
  users: Users,
  baby: Baby,
  
  // Status e indicadores
  check: Check,
  "check-circle": CheckCircle,
  ban: Ban,
  "x-circle": XCircle,
  "circle-off": CircleOff,
  "circle-dot": CircleDot,
  target: Target,
  heart: Heart,
  star: Star,
  shield: Shield,
  "alert-triangle": AlertTriangle,
  
  // Outros
  sun: Sun,
  moon: Moon,
  tree: TreeDeciduous,
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

type OnboardingCategory = {
  id: string;
  category_key: string;
  label: string;
  icon_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

// Sortable Tab Item Component for DnD on tabs
function SortableCategoryTab({ 
  category, 
  isSelected,
  count,
  onClick 
}: { 
  category: OnboardingCategory;
  isSelected: boolean;
  count?: number;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const IconComponent = LUCIDE_ICONS[category.icon_name] || Target;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors select-none ${
        isSelected 
          ? 'bg-foreground text-background' 
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      }`}
      onClick={onClick}
    >
      <div 
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 opacity-50" />
      </div>
      <IconComponent className="w-4 h-4" />
      <span className="hidden sm:inline text-sm font-medium">{category.label}</span>
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
          isSelected ? 'bg-background/30' : 'bg-background/20'
        }`}>
          {count}
        </span>
      )}
    </div>
  );
}

// Sortable Item Component for DnD
function SortableOptionItem({ 
  option, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  option: OnboardingOption; 
  onEdit: (option: OnboardingOption) => void;
  onDelete: (option: OnboardingOption) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
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
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-mono">
            {option.option_id}
          </span>
          {!option.is_active && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
              Inativo
            </span>
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
        onCheckedChange={(checked) => onToggleActive(option.id, checked)}
        className="data-[state=checked]:bg-foreground"
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(option)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <Pencil className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={() => onDelete(option)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function AdminOnboarding() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("regions");
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

  // Fetch categories from database (only intolerances)
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["onboarding-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_categories")
        .select("*")
        .in("category_key", ["intolerances", "dietary_preferences", "goals", "nutritional_strategies", "excluded_ingredients"])
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as OnboardingCategory[];
    },
  });

  // Fetch all options
  const { data: options, isLoading: optionsLoading } = useQuery({
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

  const isLoading = categoriesLoading || optionsLoading;

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

  // Reorder options mutation
  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      // Update all items in a single batch
      for (const update of updates) {
        const { error } = await supabase
          .from("onboarding_options")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-options"] });
      toast.success("Ordem atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar: ${error.message}`);
    },
  });

  // Reorder categories mutation
  const reorderCategoriesMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("onboarding_categories")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-categories"] });
      toast.success("Ordem das categorias atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar categorias: ${error.message}`);
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredOptions.findIndex((item) => item.id === active.id);
      const newIndex = filteredOptions.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(filteredOptions, oldIndex, newIndex);
      
      // Create updates with new sort_order values
      const updates = reordered.map((item, index) => ({
        id: item.id,
        sort_order: index + 1,
      }));

      reorderMutation.mutate(updates);
    }
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && categories) {
      const oldIndex = categories.findIndex((item) => item.id === active.id);
      const newIndex = categories.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(categories, oldIndex, newIndex);
      
      const updates = reordered.map((item, index) => ({
        id: item.id,
        sort_order: index + 1,
      }));

      reorderCategoriesMutation.mutate(updates);
    }
  };

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
  const currentCategory = categories?.find(c => c.category_key === selectedCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Onboarding</h2>
        <p className="text-muted-foreground">
          Gerencie as opções que os usuários veem durante o cadastro (arraste para reordenar categorias)
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        {/* Regions tab + Category tabs */}
        <div className="flex flex-wrap gap-2">
          {/* Fixed Regions Tab */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors select-none ${
              selectedCategory === "regions" 
                ? 'bg-foreground text-background' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setSelectedCategory("regions")}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Regiões</span>
          </div>

          {/* Draggable Category Tabs */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categories?.map((c) => c.id) || []}
              strategy={horizontalListSortingStrategy}
            >
              {categories?.map((cat) => {
                const count = cat.category_key === "nutritional_strategies" 
                  ? undefined 
                  : options?.filter(o => o.category === cat.category_key).length || 0;
                return (
                  <SortableCategoryTab
                    key={cat.id}
                    category={cat}
                    isSelected={selectedCategory === cat.category_key}
                    count={count}
                    onClick={() => setSelectedCategory(cat.category_key)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* Regions Tab Content */}
        <TabsContent value="regions" className="mt-6">
          <OnboardingCountriesTab />
        </TabsContent>

        {/* Nutritional Strategies Tab - uses separate component */}
        <TabsContent value="nutritional_strategies" className="mt-6">
          <NutritionalStrategiesTab />
        </TabsContent>

        {/* Excluded Ingredients Tab - informational only */}
        <TabsContent value="excluded_ingredients" className="mt-6">
          <Card className="border-border/50 bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-orange-500" />
                Alimentos que não consome
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Campo de texto livre onde o usuário adiciona ingredientes que não consome por preferência pessoal
              </p>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-background rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-sm text-muted-foreground italic">
                      Ex: carne de porco, fígado, frutos do mar...
                    </p>
                  </div>
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50 border border-border">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Campo:</strong> <code className="bg-muted px-1 rounded">excluded_ingredients</code> (array de strings)
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Tabela:</strong> <code className="bg-muted px-1 rounded">profiles</code>
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Este passo permite personalização livre — não possui opções pré-definidas para gerenciar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other categories - use onboarding_options table */}
        {categories?.filter(cat => cat.category_key !== "nutritional_strategies" && cat.category_key !== "excluded_ingredients").map((cat) => {
          const IconComponent = LUCIDE_ICONS[cat.icon_name] || Target;
          const categoryOptions = options?.filter(o => o.category === cat.category_key) || [];
          
          return (
            <TabsContent key={cat.category_key} value={cat.category_key} className="mt-6">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                      {cat.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cat.description}
                    </p>
                  </div>
                  <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                    <Plus className="w-4 h-4" />
                    Nova Opção
                  </Button>
                </CardHeader>
                <CardContent>
                  {categoryOptions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma opção cadastrada</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={categoryOptions.map((o) => o.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {categoryOptions.map((option) => (
                            <SortableOptionItem
                              key={option.id}
                              option={option}
                              onEdit={openEditDialog}
                              onDelete={setDeleteOption}
                              onToggleActive={(id, is_active) =>
                                toggleActiveMutation.mutate({ id, is_active })
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
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
              <div className="flex gap-2 items-center">
                {/* Icon Preview */}
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
                  {formData.icon_name && LUCIDE_ICONS[formData.icon_name] ? (
                    (() => {
                      const IconComponent = LUCIDE_ICONS[formData.icon_name];
                      return <IconComponent className="w-5 h-5 text-foreground stroke-[1.5]" />;
                    })()
                  ) : (
                    <Utensils className="w-5 h-5 text-muted-foreground stroke-[1.5]" />
                  )}
                </div>
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
                Ícones: wheat, milk, nut, fish, egg, bean, leaf, salad, carrot, apple, banana, cherry, citrus, grape, flame, pizza, sandwich, soup, cookie, cake, ice-cream-cone, popcorn, candy, coffee, beer, wine, martini, cup-soda, droplet, chef-hat, utensils, etc.
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
                  className="data-[state=checked]:bg-foreground"
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
              className="bg-foreground text-background hover:bg-foreground/90"
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
