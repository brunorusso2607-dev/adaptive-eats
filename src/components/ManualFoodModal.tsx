import { useState, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Search, Check, Database } from "lucide-react";
import { cn } from "@/lib/utils";

// Interface para alimentos do banco de dados
interface FoodResult {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_serving_size: number;
  serving_unit: string;
  source: string;
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
  const [searchQuery, setSearchQuery] = useState(initialName);
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery(initialName);
      setSearchResults([]);
      setSelectedFood(null);
      setQuantity("100");
    }
  }, [open, initialName]);

  // Debounced search for foods from database
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('lookup-ingredient', {
          body: { query: searchQuery.trim(), limit: 10 }
        });

        if (error) {
          console.error("Erro na busca:", error);
          setSearchResults([]);
        } else {
          setSearchResults(data?.results || []);
        }
      } catch (err) {
        console.error("Erro ao buscar alimentos:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Handle food selection
  const handleSelectFood = (food: FoodResult) => {
    setSelectedFood(food);
    setSearchQuery(food.name);
    setSearchResults([]);
    setQuantity(food.default_serving_size?.toString() || "100");
  };

  // Calculate macros based on quantity
  const calculateMacros = (food: FoodResult, grams: number) => {
    const factor = grams / 100;
    return {
      calories: Math.round(food.calories_per_100g * factor),
      protein: Math.round(food.protein_per_100g * factor * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
      fat: Math.round(food.fat_per_100g * factor * 10) / 10,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedFood) {
      toast.error("Selecione um alimento da lista");
      return;
    }

    const quantityNum = parseFloat(quantity) || 100;
    if (quantityNum <= 0) {
      toast.error("Quantidade deve ser maior que 0");
      return;
    }

    setIsLoading(true);

    try {
      // Return the selected food with the specified quantity
      onFoodCreated({
        id: selectedFood.id,
        name: selectedFood.name,
        calories_per_100g: selectedFood.calories_per_100g,
        protein_per_100g: selectedFood.protein_per_100g,
        carbs_per_100g: selectedFood.carbs_per_100g,
        fat_per_100g: selectedFood.fat_per_100g,
        default_serving_size: quantityNum,
        serving_unit: selectedFood.serving_unit || 'g',
      });

      toast.success(`${selectedFood.name} adicionado!`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao adicionar alimento");
    } finally {
      setIsLoading(false);
    }
  };

  const macros = selectedFood ? calculateMacros(selectedFood, parseFloat(quantity) || 100) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Adicionar Alimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="space-y-2">
            <Label htmlFor="food-search">Buscar Alimento</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="food-search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedFood(null);
                }}
                placeholder="Digite: arroz, frango, iogurte..."
                className="pl-9 pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {selectedFood && !isSearching && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && !selectedFood && (
            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-1">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleSelectFood(food)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors",
                      "flex items-center justify-between gap-2"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.calories_per_100g} kcal/100{food.serving_unit || 'g'}
                      </p>
                    </div>
                    <Database className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* No results message */}
          {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !selectedFood && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum alimento encontrado para "{searchQuery}"
            </p>
          )}

          {/* Selected food info */}
          {selectedFood && (
            <>
              {/* Macros display */}
              {macros && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    {macros.calories} kcal • {macros.protein}g prot • {macros.carbs}g carb • {macros.fat}g gord
                  </span>
                </div>
              )}

              {/* Quantity input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <div className="relative">
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    min="1"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    {selectedFood.serving_unit || 'g'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedFood}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
