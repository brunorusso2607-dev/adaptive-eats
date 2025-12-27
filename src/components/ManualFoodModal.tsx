import { useState, useEffect, useCallback, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, AlertTriangle, ShieldAlert, Check, X, Wand2 } from "lucide-react";
import { z } from "zod";
import { suggestServingByName, type ServingSuggestion } from "@/lib/servingSuggestion";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";

const UNIT_LABELS: Record<string, string> = {
  g: "gramas (g)",
  ml: "mililitros (ml)",
  un: "unidade",
  fatia: "fatia",
};

const foodSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  calories: z.number().min(0, "Calorias não pode ser negativo").max(2000, "Valor muito alto"),
  protein: z.number().min(0, "Proteína não pode ser negativo").max(200, "Valor muito alto"),
  carbs: z.number().min(0, "Carboidratos não pode ser negativo").max(200, "Valor muito alto"),
  fat: z.number().min(0, "Gordura não pode ser negativo").max(200, "Valor muito alto"),
  defaultServingSize: z.number().min(1, "Porção deve ser maior que 0").max(5000, "Valor muito alto"),
  servingUnit: z.enum(["g", "ml", "un", "fatia"]),
});

interface AIValidationResult {
  isValid: boolean;
  name?: string;
  confidence?: string;
  portion?: {
    size: number;
    unit: string;
    description: string;
  };
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  reason?: string;
  error?: string;
}

interface ManualFoodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onFoodCreated: (food: {
    id: string;
    name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    default_serving_size?: number;
    serving_unit?: string;
  }) => void;
}

export default function ManualFoodModal({
  open,
  onOpenChange,
  initialName = "",
  onFoodCreated,
}: ManualFoodModalProps) {
  const [name, setName] = useState(initialName);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [defaultServingSize, setDefaultServingSize] = useState("100");
  const [servingUnit, setServingUnit] = useState<"g" | "ml" | "un" | "fatia">("g");
  const [suggestion, setSuggestion] = useState<ServingSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<{ intolerances: string[] | null } | null>(null);
  const { checkFood, hasIntolerances } = useIntoleranceWarning();
  
  // AI auto-fill states
  const [isValidatingAI, setIsValidatingAI] = useState(false);
  const [aiValidation, setAiValidation] = useState<AIValidationResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI intolerance conflict dialog
  const [intoleranceDialog, setIntoleranceDialog] = useState<{
    open: boolean;
    conflicts: Array<{ intolerance: string; intoleranceLabel: string; foundIngredients: string[] }>;
    ingredients: string[];
    pendingData: typeof pendingFoodData;
  }>({
    open: false,
    conflicts: [],
    ingredients: [],
    pendingData: null,
  });
  const [pendingFoodData, setPendingFoodData] = useState<{
    name: string;
    normalizedName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    defaultServingSize: number;
    servingUnit: string;
  } | null>(null);

  // Fetch user profile for intolerance checking
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("intolerances")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    };

    if (open) {
      fetchProfile();
    }
  }, [open]);

  // AI validation when name changes (debounced)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset AI validation state when name changes
    setAiValidation(null);
    setAiApplied(false);

    if (name.length < 3) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsValidatingAI(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('validate-food-ai', {
          body: { foodName: name }
        });

        if (error) {
          console.error("Erro na validação de IA:", error);
          setAiValidation(null);
        } else {
          setAiValidation(data);
        }
      } catch (err) {
        console.error("Erro ao chamar validação de IA:", err);
        setAiValidation(null);
      } finally {
        setIsValidatingAI(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [name]);

  // Auto-sugestão de porção baseada no nome
  useEffect(() => {
    if (name.length >= 3) {
      const suggested = suggestServingByName(name);
      setSuggestion(suggested);
    } else {
      setSuggestion(null);
    }
  }, [name]);

  const applyAISuggestion = () => {
    if (aiValidation?.isValid && aiValidation.nutrition && aiValidation.portion) {
      setCalories(aiValidation.nutrition.calories.toString());
      setProtein(aiValidation.nutrition.protein.toString());
      setCarbs(aiValidation.nutrition.carbs.toString());
      setFat(aiValidation.nutrition.fat.toString());
      setDefaultServingSize(aiValidation.portion.size.toString());
      
      const unit = aiValidation.portion.unit;
      if (unit === 'g' || unit === 'ml' || unit === 'un' || unit === 'fatia') {
        setServingUnit(unit);
      }
      
      if (aiValidation.name) {
        setName(aiValidation.name);
      }
      
      setAiApplied(true);
      toast.success("Valores nutricionais preenchidos pela IA!");
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      setDefaultServingSize(suggestion.defaultServingSize.toString());
      setServingUnit(suggestion.servingUnit);
      toast.success("Sugestão aplicada!");
    }
  };

  // AI-powered intolerance analysis
  const analyzeWithAI = useCallback(async (foodName: string): Promise<{
    hasConflicts: boolean;
    conflicts: Array<{ intolerance: string; intoleranceLabel: string; foundIngredients: string[] }>;
    ingredients: string[];
  } | null> => {
    if (!userProfile?.intolerances || userProfile.intolerances.length === 0 || 
        userProfile.intolerances.every(i => i === "nenhuma")) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-intolerances', {
        body: { 
          foodName, 
          userIntolerances: userProfile.intolerances.filter(i => i !== "nenhuma") 
        }
      });

      if (error) {
        console.error("Erro na análise de IA:", error);
        return null;
      }

      return {
        hasConflicts: data.hasConflicts,
        conflicts: data.conflicts || [],
        ingredients: data.ingredients || [],
      };
    } catch (err) {
      console.error("Erro ao chamar análise de IA:", err);
      return null;
    }
  }, [userProfile]);

  const resetForm = () => {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setDefaultServingSize("100");
    setServingUnit("g");
    setSuggestion(null);
    setErrors({});
    setPendingFoodData(null);
    setAiValidation(null);
    setAiApplied(false);
  };

  // Save food to database
  const saveFood = async (foodData: {
    name: string;
    normalizedName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    defaultServingSize: number;
    servingUnit: string;
  }) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("foods")
        .insert({
          name: foodData.name.trim(),
          name_normalized: foodData.normalizedName,
          calories_per_100g: foodData.calories,
          protein_per_100g: foodData.protein,
          carbs_per_100g: foodData.carbs,
          fat_per_100g: foodData.fat,
          default_serving_size: foodData.defaultServingSize,
          serving_unit: foodData.servingUnit,
          source: "user_manual",
          verified: false,
          confidence: 0.5,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Este alimento já existe no banco de dados");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`${foodData.name} adicionado com sucesso!`);
      onFoodCreated({
        id: data.id,
        name: data.name,
        calories_per_100g: data.calories_per_100g,
        protein_per_100g: data.protein_per_100g,
        carbs_per_100g: data.carbs_per_100g,
        fat_per_100g: data.fat_per_100g,
        default_serving_size: data.default_serving_size ?? undefined,
        serving_unit: data.serving_unit ?? undefined,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating food:", error);
      toast.error("Erro ao cadastrar alimento");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle confirming despite intolerance conflict
  const handleConfirmDespiteConflict = async () => {
    if (intoleranceDialog.pendingData) {
      await saveFood(intoleranceDialog.pendingData);
    }
    setIntoleranceDialog({ open: false, conflicts: [], ingredients: [], pendingData: null });
  };

  const handleSubmit = async () => {
    setErrors({});

    const validation = foodSchema.safeParse({
      name,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      defaultServingSize: parseFloat(defaultServingSize) || 100,
      servingUnit,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const normalizedName = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const foodData = {
      name: name.trim(),
      normalizedName,
      calories: validation.data.calories,
      protein: validation.data.protein,
      carbs: validation.data.carbs,
      fat: validation.data.fat,
      defaultServingSize: validation.data.defaultServingSize,
      servingUnit: validation.data.servingUnit,
    };

    // First, check local intolerance detection using the hook
    if (hasIntolerances) {
      const intoleranceResult = checkFood(name);

      if (intoleranceResult.hasConflict && intoleranceResult.conflicts.length > 0) {
        setPendingFoodData(foodData);
        setIntoleranceDialog({
          open: true,
          conflicts: intoleranceResult.conflicts.map((c, idx) => ({
            intolerance: c,
            intoleranceLabel: intoleranceResult.labels[idx],
            foundIngredients: [name],
          })),
          ingredients: [name],
          pendingData: foodData,
        });
        return;
      }

      // If no local conflict, use AI analysis
      setIsAnalyzing(true);
      const aiResult = await analyzeWithAI(name);
      setIsAnalyzing(false);

      if (aiResult?.hasConflicts && aiResult.conflicts.length > 0) {
        setPendingFoodData(foodData);
        setIntoleranceDialog({
          open: true,
          conflicts: aiResult.conflicts,
          ingredients: aiResult.ingredients,
          pendingData: foodData,
        });
        return;
      }
    }

    // No conflicts, save directly
    await saveFood(foodData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Cadastrar Alimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="food-name">Nome do Alimento</Label>
            <div className="relative">
              <Input
                id="food-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Big Tasty McDonald's"
                className={`${errors.name ? "border-destructive" : ""} pr-10`}
              />
              {/* AI validation indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidatingAI && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {!isValidatingAI && aiValidation?.isValid && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {!isValidatingAI && aiValidation && !aiValidation.isValid && (
                  <X className="w-4 h-4 text-destructive" />
                )}
              </div>
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
            
            {/* AI validation feedback */}
            {!isValidatingAI && aiValidation && !aiValidation.isValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {aiValidation.reason || "Não parece ser um alimento válido"}
              </p>
            )}
          </div>

          {/* AI auto-fill suggestion */}
          {aiValidation?.isValid && aiValidation.nutrition && !aiApplied && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-green-600" />
                <div className="text-sm">
                  <span className="text-muted-foreground">IA encontrou: </span>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {aiValidation.name || name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({aiValidation.nutrition.calories} kcal)
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={applyAISuggestion}
                className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
              >
                Preencher
              </Button>
            </div>
          )}
          
          {/* Applied indicator */}
          {aiApplied && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Valores preenchidos pela IA
              </span>
            </div>
          )}

          {/* Sugestão automática de porção */}
          {suggestion && !aiApplied && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Sugestão: </span>
                  <span className="font-medium">
                    {suggestion.defaultServingSize}{suggestion.servingUnit === 'ml' ? 'ml' : 'g'} ({suggestion.description})
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={applySuggestion}
                className="text-primary hover:text-primary"
              >
                Aplicar
              </Button>
            </div>
          )}

          {/* Campos de porção padrão */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="serving-size">Porção Padrão</Label>
              <Input
                id="serving-size"
                type="number"
                value={defaultServingSize}
                onChange={(e) => setDefaultServingSize(e.target.value)}
                placeholder="100"
                min="1"
                className={errors.defaultServingSize ? "border-destructive" : ""}
              />
              {errors.defaultServingSize && (
                <p className="text-xs text-destructive">{errors.defaultServingSize}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serving-unit">Unidade</Label>
              <Select value={servingUnit} onValueChange={(v) => setServingUnit(v as typeof servingUnit)}>
                <SelectTrigger className={errors.servingUnit ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Valores nutricionais por 100g ou por unidade
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="calories">Calorias (kcal)</Label>
              <Input
                id="calories"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                min="0"
                className={errors.calories ? "border-destructive" : ""}
              />
              {errors.calories && (
                <p className="text-xs text-destructive">{errors.calories}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="protein">Proteína (g)</Label>
              <Input
                id="protein"
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className={errors.protein ? "border-destructive" : ""}
              />
              {errors.protein && (
                <p className="text-xs text-destructive">{errors.protein}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="carbs">Carboidratos (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className={errors.carbs ? "border-destructive" : ""}
              />
              {errors.carbs && (
                <p className="text-xs text-destructive">{errors.carbs}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fat">Gordura (g)</Label>
              <Input
                id="fat"
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className={errors.fat ? "border-destructive" : ""}
              />
              {errors.fat && (
                <p className="text-xs text-destructive">{errors.fat}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analisando...
              </>
            ) : isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {!isAnalyzing && "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Intolerance Conflict Dialog */}
      <AlertDialog 
        open={intoleranceDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setIntoleranceDialog({ open: false, conflicts: [], ingredients: [], pendingData: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              Alerta de Intolerância
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  A IA identificou que <span className="font-semibold">{name}</span> pode conter ingredientes incompatíveis com suas restrições:
                </p>
                
                {intoleranceDialog.ingredients.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ingredientes identificados:</p>
                    <p className="text-sm">{intoleranceDialog.ingredients.join(", ")}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {intoleranceDialog.conflicts.map((conflict, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          {conflict.intoleranceLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Encontrados: {conflict.foundIngredients.join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Deseja cadastrar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDespiteConflict}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Cadastrar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
