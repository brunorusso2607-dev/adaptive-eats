import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X, Flame, Beef, Wheat, Droplets, AlertCircle, HelpCircle } from "lucide-react";

type FoodItem = {
  item: string;
  item_original_language?: string;
  item_original_ai?: string; // Original item name before correction was applied
  porcao_estimada: string;
  calorias: number;
  macros: {
    proteinas: number;
    carboidratos: number;
    gorduras: number;
  };
  confianca_identificacao?: "alta" | "media" | "baixa";
  alternativas_possiveis?: string[];
  culinaria_origem?: string;
  ingredientes_visiveis?: string[];
  ingredientes_provaveis_ocultos?: string[];
  metodo_preparo_provavel?: string;
  // Track if item was manually corrected
  corrigido_manualmente?: boolean;
  // Track if auto-correction was applied
  correcao_aplicada?: boolean;
  // Track correction match type (exact or fuzzy)
  correcao_tipo?: "exact" | "fuzzy";
  // Track similarity percentage for fuzzy matches
  correcao_similaridade?: number;
};

interface FoodItemEditorProps {
  food: FoodItem;
  index: number;
  onSave: (index: number, updatedFood: FoodItem) => void;
  onSelectAlternative: (index: number, alternativeName: string) => void;
}

export default function FoodItemEditor({ food, index, onSave, onSelectAlternative }: FoodItemEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFood, setEditedFood] = useState<FoodItem>(food);
  const [originalPortion, setOriginalPortion] = useState<number | null>(null);

  // Approximate gram equivalents for common units
  const unitToGrams: Record<string, number> = {
    // Volume units (approximate for average food density)
    'ml': 1,
    'l': 1000,
    'litro': 1000,
    'litros': 1000,
    // Spoons
    'colher de sopa': 15,
    'colheres de sopa': 15,
    'cs': 15,
    'colher de chá': 5,
    'colheres de chá': 5,
    'cc': 5,
    'colher de sobremesa': 10,
    'colheres de sobremesa': 10,
    // Cups
    'xícara': 240,
    'xícaras': 240,
    'xicara': 240,
    'xicaras': 240,
    'copo': 200,
    'copos': 200,
    // Portions
    'fatia': 30,
    'fatias': 30,
    'pedaço': 50,
    'pedaços': 50,
    'porção': 100,
    'porções': 100,
    'unidade': 80,
    'unidades': 80,
    'un': 80,
    // Small items
    'ovo': 50,
    'ovos': 50,
    'dente': 3,
    'dentes': 3,
    // Grams (base)
    'g': 1,
    'gr': 1,
    'grama': 1,
    'gramas': 1,
    'kg': 1000,
    'quilo': 1000,
    'quilos': 1000,
  };

  // Extract numeric value and convert to grams equivalent
  const extractPortionInGrams = (portion: string): number | null => {
    const lowerPortion = portion.toLowerCase().trim();
    
    // Try to match: number + unit (e.g., "200g", "2 xícaras", "1 colher de sopa")
    for (const [unit, gramsPerUnit] of Object.entries(unitToGrams)) {
      // Match patterns like "2 xícaras", "200g", "1/2 copo"
      const patterns = [
        new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`, 'i'),
        new RegExp(`(\\d+)\\s*/\\s*(\\d+)\\s*${unit}\\b`, 'i'), // fractions like 1/2
      ];
      
      for (const pattern of patterns) {
        const match = lowerPortion.match(pattern);
        if (match) {
          if (match[2]) {
            // Fraction (e.g., 1/2)
            const value = parseFloat(match[1]) / parseFloat(match[2]);
            return value * gramsPerUnit;
          } else {
            const value = parseFloat(match[1].replace(',', '.'));
            return value * gramsPerUnit;
          }
        }
      }
    }
    
    // Fallback: try to find any number and assume grams
    const anyNumber = lowerPortion.match(/(\d+(?:[.,]\d+)?)/);
    if (anyNumber) {
      return parseFloat(anyNumber[1].replace(',', '.'));
    }
    
    return null;
  };

  // Handle portion change with proportional recalculation
  const handlePortionChange = (newPortionText: string) => {
    const newPortionValue = extractPortionInGrams(newPortionText);
    
    // If we have both old and new numeric values, recalculate proportionally
    if (originalPortion && newPortionValue && originalPortion > 0 && newPortionValue > 0) {
      const ratio = newPortionValue / originalPortion;
      
      setEditedFood({
        ...editedFood,
        porcao_estimada: newPortionText,
        calorias: Math.round(food.calorias * ratio),
        macros: {
          proteinas: Math.round(food.macros.proteinas * ratio * 10) / 10,
          carboidratos: Math.round(food.macros.carboidratos * ratio * 10) / 10,
          gorduras: Math.round(food.macros.gorduras * ratio * 10) / 10,
        },
      });
    } else {
      // Just update the text without recalculating
      setEditedFood({ ...editedFood, porcao_estimada: newPortionText });
    }
  };

  const handleSave = () => {
    onSave(index, {
      ...editedFood,
      corrigido_manualmente: true,
    });
    setIsEditing(false);
    setOriginalPortion(null);
  };

  const handleCancel = () => {
    setEditedFood(food);
    setIsEditing(false);
    setOriginalPortion(null);
  };

  const startEditing = () => {
    setEditedFood(food);
    setOriginalPortion(extractPortionInGrams(food.porcao_estimada));
    setIsEditing(true);
  };

  const handleAlternativeClick = (alternativeName: string) => {
    onSelectAlternative(index, alternativeName);
  };

  if (isEditing) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm text-primary">Editando alimento</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor={`item-${index}`} className="text-xs">Nome do alimento</Label>
              <Input
                id={`item-${index}`}
                value={editedFood.item}
                onChange={(e) => setEditedFood({ ...editedFood, item: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`porcao-${index}`} className="text-xs">Porção estimada</Label>
              <Input
                id={`porcao-${index}`}
                value={editedFood.porcao_estimada}
                onChange={(e) => handlePortionChange(e.target.value)}
                className="mt-1"
                placeholder="Ex: 150g, 1 xícara, 2 fatias"
              />
              {originalPortion && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Altere o peso para recalcular automaticamente
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`calorias-${index}`} className="text-xs flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  Calorias (kcal)
                </Label>
                <Input
                  id={`calorias-${index}`}
                  type="number"
                  min="0"
                  value={editedFood.calorias}
                  onChange={(e) => setEditedFood({ ...editedFood, calorias: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`proteinas-${index}`} className="text-xs flex items-center gap-1">
                  <Beef className="w-3 h-3 text-red-500" />
                  Proteínas (g)
                </Label>
                <Input
                  id={`proteinas-${index}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={editedFood.macros.proteinas}
                  onChange={(e) => setEditedFood({
                    ...editedFood,
                    macros: { ...editedFood.macros, proteinas: Number(e.target.value) || 0 }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`carbos-${index}`} className="text-xs flex items-center gap-1">
                  <Wheat className="w-3 h-3 text-amber-500" />
                  Carboidratos (g)
                </Label>
                <Input
                  id={`carbos-${index}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={editedFood.macros.carboidratos}
                  onChange={(e) => setEditedFood({
                    ...editedFood,
                    macros: { ...editedFood.macros, carboidratos: Number(e.target.value) || 0 }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`gorduras-${index}`} className="text-xs flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  Gorduras (g)
                </Label>
                <Input
                  id={`gorduras-${index}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={editedFood.macros.gorduras}
                  onChange={(e) => setEditedFood({
                    ...editedFood,
                    macros: { ...editedFood.macros, gorduras: Number(e.target.value) || 0 }
                  })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <details className="group">
      <summary className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors list-none">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            food.corrigido_manualmente 
              ? "bg-purple-500"
              : food.correcao_aplicada
              ? "bg-teal-500"
              : food.confianca_identificacao === "baixa" 
              ? "bg-yellow-500" 
              : food.confianca_identificacao === "media"
              ? "bg-blue-500"
              : "bg-green-500"
          }`} />
          <div>
            <p className="font-medium text-foreground flex items-center gap-1">
              {food.item}
              {food.corrigido_manualmente && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600">
                  editado
                </span>
              )}
              {food.correcao_aplicada && !food.corrigido_manualmente && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  food.correcao_tipo === "fuzzy" 
                    ? "bg-cyan-500/20 text-cyan-600" 
                    : "bg-teal-500/20 text-teal-600"
                }`}>
                  ✓ corrigido{food.correcao_tipo === "fuzzy" && food.correcao_similaridade ? ` (${food.correcao_similaridade}%)` : ""}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">{food.porcao_estimada}</p>
              {food.culinaria_origem && (
                <span className="text-xs text-primary/70">• {food.culinaria_origem}</span>
              )}
              {food.item_original_ai && food.item_original_ai !== food.item && (
                <span className="text-xs text-muted-foreground italic">
                  (IA: {food.item_original_ai})
                </span>
              )}
              {!food.corrigido_manualmente && !food.correcao_aplicada && food.confianca_identificacao && food.confianca_identificacao !== "alta" && (
                <span className={`text-xs ${
                  food.confianca_identificacao === "baixa" ? "text-yellow-600" : "text-blue-600"
                }`}>
                  • {food.confianca_identificacao}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-foreground">{food.calorias} kcal</p>
          <p className="text-xs text-muted-foreground">
            P:{food.macros.proteinas}g C:{food.macros.carboidratos}g G:{food.macros.gorduras}g
          </p>
        </div>
      </summary>
      
      {/* Expanded details */}
      <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-muted space-y-3 text-sm">
        {/* Edit button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.preventDefault();
            startEditing();
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Corrigir este alimento
        </Button>

        {food.item_original_language && food.item_original_language !== food.item && (
          <p className="text-muted-foreground">
            <span className="font-medium">Nome original:</span> {food.item_original_language}
          </p>
        )}
        
        {food.metodo_preparo_provavel && (
          <p className="text-muted-foreground">
            <span className="font-medium">Preparo:</span> {food.metodo_preparo_provavel}
          </p>
        )}
        
        {food.ingredientes_visiveis && food.ingredientes_visiveis.length > 0 && (
          <div>
            <p className="font-medium text-foreground mb-1">Ingredientes visíveis:</p>
            <div className="flex flex-wrap gap-1">
              {food.ingredientes_visiveis.map((ing, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {food.ingredientes_provaveis_ocultos && food.ingredientes_provaveis_ocultos.length > 0 && (
          <div>
            <p className="font-medium text-foreground mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              Ingredientes prováveis (não visíveis):
            </p>
            <div className="flex flex-wrap gap-1">
              {food.ingredientes_provaveis_ocultos.map((ing, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {food.alternativas_possiveis && food.alternativas_possiveis.length > 0 && (
          <div className="pt-2 border-t border-muted">
            <p className="font-medium text-foreground mb-2 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-blue-500" />
              Não é isso? Selecione a opção correta:
            </p>
            <div className="flex flex-wrap gap-1">
              {food.alternativas_possiveis.map((alt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-600"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAlternativeClick(alt);
                  }}
                >
                  {alt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
