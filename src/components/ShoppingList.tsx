import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ShoppingCart, Download, Share2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Ingredient = { item: string; quantity: string; unit: string };

type MealPlanItem = {
  id: string;
  day_of_week: number;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  is_favorite: boolean;
};

type MealPlan = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  items: MealPlanItem[];
};

type ShoppingListProps = {
  mealPlan: MealPlan;
  onBack: () => void;
};

type AggregatedIngredient = {
  item: string;
  quantities: { quantity: string; unit: string }[];
  checked: boolean;
};

export default function ShoppingList({ mealPlan, onBack }: ShoppingListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Aggregate ingredients from all meals
  const aggregatedIngredients = useMemo(() => {
    const ingredientMap = new Map<string, { quantities: { quantity: string; unit: string }[] }>();

    mealPlan.items.forEach(meal => {
      meal.recipe_ingredients.forEach(ingredient => {
        const key = ingredient.item.toLowerCase().trim();
        if (ingredientMap.has(key)) {
          ingredientMap.get(key)!.quantities.push({
            quantity: ingredient.quantity,
            unit: ingredient.unit
          });
        } else {
          ingredientMap.set(key, {
            quantities: [{ quantity: ingredient.quantity, unit: ingredient.unit }]
          });
        }
      });
    });

    // Group and format ingredients
    const result: AggregatedIngredient[] = [];
    ingredientMap.forEach((value, key) => {
      // Try to consolidate same-unit quantities
      const unitGroups = new Map<string, number>();
      value.quantities.forEach(q => {
        const num = parseFloat(q.quantity) || 0;
        const unit = q.unit.toLowerCase().trim();
        unitGroups.set(unit, (unitGroups.get(unit) || 0) + num);
      });

      const quantities: { quantity: string; unit: string }[] = [];
      unitGroups.forEach((amount, unit) => {
        quantities.push({ quantity: amount.toString(), unit });
      });

      result.push({
        item: key.charAt(0).toUpperCase() + key.slice(1),
        quantities,
        checked: checkedItems.has(key)
      });
    });

    // Sort: unchecked first, then alphabetically
    return result.sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.item.localeCompare(b.item);
    });
  }, [mealPlan.items, checkedItems]);

  const toggleItem = (item: string) => {
    const key = item.toLowerCase();
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatQuantities = (quantities: { quantity: string; unit: string }[]) => {
    return quantities.map(q => `${q.quantity} ${q.unit}`).join(" + ");
  };

  const handleExportText = () => {
    const text = aggregatedIngredients
      .map(ing => `${ing.checked ? "✓" : "○"} ${ing.item}: ${formatQuantities(ing.quantities)}`)
      .join("\n");
    
    navigator.clipboard.writeText(text);
    toast.success("Lista copiada para a área de transferência!");
  };

  const handleShare = async () => {
    const text = `Lista de Compras - ${mealPlan.name}\n\n` +
      aggregatedIngredients
        .filter(ing => !ing.checked)
        .map(ing => `• ${ing.item}: ${formatQuantities(ing.quantities)}`)
        .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `Lista de Compras - ${mealPlan.name}`, text });
      } catch (err) {
        navigator.clipboard.writeText(text);
        toast.success("Lista copiada para a área de transferência!");
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Lista copiada para a área de transferência!");
    }
  };

  const checkedCount = checkedItems.size;
  const totalCount = aggregatedIngredients.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              Lista de Compras
            </h2>
            <p className="text-sm text-muted-foreground">{mealPlan.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportText}>
            <Download className="w-4 h-4 mr-2" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <Badge variant="secondary">{checkedCount} de {totalCount} itens</Badge>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full gradient-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shopping List */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="space-y-2">
            {aggregatedIngredients.map((ingredient, index) => (
              <div
                key={`${ingredient.item}-${index}`}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-muted/50 ${
                  ingredient.checked ? "bg-muted/30 opacity-60" : ""
                }`}
                onClick={() => toggleItem(ingredient.item)}
              >
                <Checkbox
                  checked={ingredient.checked}
                  onCheckedChange={() => toggleItem(ingredient.item)}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${ingredient.checked ? "line-through text-muted-foreground" : ""}`}>
                    {ingredient.item}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatQuantities(ingredient.quantities)}
                  </p>
                </div>
                {ingredient.checked && (
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        💡 Toque nos itens para marcá-los como comprados
      </p>
    </div>
  );
}
