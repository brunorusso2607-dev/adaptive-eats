import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { z } from "zod";

const foodSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  calories: z.number().min(0, "Calorias não pode ser negativo").max(2000, "Valor muito alto"),
  protein: z.number().min(0, "Proteína não pode ser negativo").max(200, "Valor muito alto"),
  carbs: z.number().min(0, "Carboidratos não pode ser negativo").max(200, "Valor muito alto"),
  fat: z.number().min(0, "Gordura não pode ser negativo").max(200, "Valor muito alto"),
});

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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setErrors({});
  };

  const handleSubmit = async () => {
    setErrors({});

    const validation = foodSchema.safeParse({
      name,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
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

    setIsLoading(true);

    try {
      const normalizedName = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const { data, error } = await supabase
        .from("foods")
        .insert({
          name: name.trim(),
          name_normalized: normalizedName,
          calories_per_100g: validation.data.calories,
          protein_per_100g: validation.data.protein,
          carbs_per_100g: validation.data.carbs,
          fat_per_100g: validation.data.fat,
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

      toast.success(`${name} adicionado com sucesso!`);
      onFoodCreated({
        id: data.id,
        name: data.name,
        calories_per_100g: data.calories_per_100g,
        protein_per_100g: data.protein_per_100g,
        carbs_per_100g: data.carbs_per_100g,
        fat_per_100g: data.fat_per_100g,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Cadastrar Alimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="food-name">Nome do Alimento</Label>
            <Input
              id="food-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Big Tasty McDonald's"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
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
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
