import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Check, X, Flame, Beef, Wheat, Droplets, AlertCircle, HelpCircle, Search, Database, Sparkles } from "lucide-react";
import UnifiedFoodSearchBlock, { SelectedFoodItem } from "./UnifiedFoodSearchBlock";

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
  // Unidentified food item - needs user correction
  nao_identificado?: boolean;
  descricao_visual?: string; // Visual description when unidentified
  // Nutritional data source tracking
  calculo_fonte?: "tabela_foods" | "estimativa_ia"; // Source of nutritional data
  alimento_encontrado?: string; // Name matched in the database
  food_id?: string; // ID from foods table if found
  gramas_usadas?: number; // Grams used for calculation
};

interface FoodItemEditorProps {
  food: FoodItem;
  index: number;
  onSave: (index: number, updatedFood: FoodItem) => void;
  onSelectAlternative: (index: number, alternativeName: string) => void;
}

export default function FoodItemEditor({ food, index, onSave, onSelectAlternative }: FoodItemEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(food.nao_identificado ?? false); // Start in search mode if unidentified
  const [editedFood, setEditedFood] = useState<FoodItem>(food);
  const [originalPortion, setOriginalPortion] = useState<number | null>(null);
  const [portionQuantity, setPortionQuantity] = useState<string>("1");
  const [portionUnit, setPortionUnit] = useState<string>("g");

  // Handle food selection from search
  const handleFoodSelected = useCallback((selectedFood: SelectedFoodItem) => {
    const updatedFood: FoodItem = {
      ...food,
      item: selectedFood.name,
      calorias: Math.round(selectedFood.calories),
      macros: {
        proteinas: Math.round(selectedFood.protein * 10) / 10,
        carboidratos: Math.round(selectedFood.carbs * 10) / 10,
        gorduras: Math.round(selectedFood.fat * 10) / 10,
      },
      porcao_estimada: `${selectedFood.quantity_grams}g`,
      corrigido_manualmente: true,
      nao_identificado: false, // No longer unidentified
      descricao_visual: food.descricao_visual, // Keep original description for reference
    };
    
    onSave(index, updatedFood);
    setIsSearching(false);
  }, [food, index, onSave]);

  // Food-specific units with approximate gram values
  const foodSpecificUnits: Record<string, { value: string; label: string; grams: number }[]> = useMemo(() => ({
    // Fruits
    banana: [{ value: "banana", label: "1 banana média (~120g)", grams: 120 }],
    maçã: [{ value: "maca", label: "1 maçã média (~180g)", grams: 180 }],
    maca: [{ value: "maca", label: "1 maçã média (~180g)", grams: 180 }],
    laranja: [{ value: "laranja", label: "1 laranja média (~150g)", grams: 150 }],
    pera: [{ value: "pera", label: "1 pera média (~170g)", grams: 170 }],
    pêra: [{ value: "pera", label: "1 pera média (~170g)", grams: 170 }],
    mamão: [{ value: "mamao", label: "1 fatia média (~150g)", grams: 150 }],
    mamao: [{ value: "mamao", label: "1 fatia média (~150g)", grams: 150 }],
    manga: [{ value: "manga", label: "1 manga média (~200g)", grams: 200 }],
    abacaxi: [{ value: "abacaxi", label: "1 fatia (~100g)", grams: 100 }],
    melancia: [{ value: "melancia", label: "1 fatia (~200g)", grams: 200 }],
    melão: [{ value: "melao", label: "1 fatia (~150g)", grams: 150 }],
    melao: [{ value: "melao", label: "1 fatia (~150g)", grams: 150 }],
    morango: [{ value: "morango", label: "1 unidade (~12g)", grams: 12 }],
    uva: [{ value: "uva", label: "1 cacho (~100g)", grams: 100 }],
    kiwi: [{ value: "kiwi", label: "1 kiwi (~75g)", grams: 75 }],
    limão: [{ value: "limao", label: "1 limão (~65g)", grams: 65 }],
    limao: [{ value: "limao", label: "1 limão (~65g)", grams: 65 }],
    abacate: [{ value: "abacate", label: "1/2 abacate (~100g)", grams: 100 }],
    // Eggs
    ovo: [{ value: "ovo", label: "1 ovo (~50g)", grams: 50 }],
    ovos: [{ value: "ovo", label: "1 ovo (~50g)", grams: 50 }],
    // Bread
    pão: [
      { value: "fatia_pao", label: "1 fatia (~25g)", grams: 25 },
      { value: "pao_frances", label: "1 pão francês (~50g)", grams: 50 },
    ],
    pao: [
      { value: "fatia_pao", label: "1 fatia (~25g)", grams: 25 },
      { value: "pao_frances", label: "1 pão francês (~50g)", grams: 50 },
    ],
    torrada: [{ value: "torrada", label: "1 torrada (~15g)", grams: 15 }],
    biscoito: [{ value: "biscoito", label: "1 unidade (~8g)", grams: 8 }],
    bolacha: [{ value: "bolacha", label: "1 unidade (~8g)", grams: 8 }],
  }), []);

  // Detect food-specific units based on food name
  const detectedFoodUnits = useMemo(() => {
    const foodName = food.item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const units: { value: string; label: string; grams: number }[] = [];
    
    for (const [keyword, foodUnits] of Object.entries(foodSpecificUnits)) {
      const normalizedKeyword = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (foodName.includes(normalizedKeyword)) {
        units.push(...foodUnits);
      }
    }
    
    return units;
  }, [food.item, foodSpecificUnits]);

  // Base unit options for dropdown
  const baseUnitOptions = useMemo(() => [
    { value: "g", label: "Gramas (g)", grams: 1 },
    { value: "kg", label: "Quilos (kg)", grams: 1000 },
    { value: "ml", label: "Mililitros (ml)", grams: 1 },
    { value: "copo", label: "Copo (200ml)", grams: 200 },
    { value: "xicara", label: "Xícara (240ml)", grams: 240 },
    { value: "colher_sopa", label: "Colher de sopa (15g)", grams: 15 },
    { value: "colher_cha", label: "Colher de chá (5g)", grams: 5 },
    { value: "colher_sobremesa", label: "Colher de sobremesa (10g)", grams: 10 },
    { value: "fatia", label: "Fatia (~30g)", grams: 30 },
    { value: "pedaco", label: "Pedaço (~50g)", grams: 50 },
    { value: "unidade", label: "Unidade (~80g)", grams: 80 },
  ], []);

  // Combine food-specific units with base units (food-specific first)
  const unitOptions = useMemo(() => {
    if (detectedFoodUnits.length > 0) {
      return [...detectedFoodUnits, ...baseUnitOptions];
    }
    return baseUnitOptions;
  }, [detectedFoodUnits, baseUnitOptions]);

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

  // Handle dropdown-based portion change
  const handleDropdownPortionChange = (quantity: string, unitValue: string) => {
    const unit = unitOptions.find(u => u.value === unitValue);
    if (!unit) return;

    const numQuantity = parseFloat(quantity.replace(',', '.')) || 0;
    const newPortionInGrams = numQuantity * unit.grams;
    
    // Build display text
    const unitLabels: Record<string, string> = {
      g: 'g',
      kg: 'kg',
      ml: 'ml',
      copo: 'copo(s)',
      xicara: 'xícara(s)',
      colher_sopa: 'colher(es) de sopa',
      colher_cha: 'colher(es) de chá',
      colher_sobremesa: 'colher(es) de sobremesa',
      fatia: 'fatia(s)',
      pedaco: 'pedaço(s)',
      unidade: 'unidade(s)',
    };
    const displayText = `${quantity} ${unitLabels[unitValue] || unitValue}`;
    
    // Recalculate proportionally
    if (originalPortion && newPortionInGrams > 0 && originalPortion > 0) {
      const ratio = newPortionInGrams / originalPortion;
      
      setEditedFood({
        ...editedFood,
        porcao_estimada: displayText,
        calorias: Math.round(food.calorias * ratio),
        macros: {
          proteinas: Math.round(food.macros.proteinas * ratio * 10) / 10,
          carboidratos: Math.round(food.macros.carboidratos * ratio * 10) / 10,
          gorduras: Math.round(food.macros.gorduras * ratio * 10) / 10,
        },
      });
    } else {
      setEditedFood({ ...editedFood, porcao_estimada: displayText });
    }
  };

  const handleQuantityChange = (newQuantity: string) => {
    setPortionQuantity(newQuantity);
    handleDropdownPortionChange(newQuantity, portionUnit);
  };

  const handleUnitChange = (newUnit: string) => {
    setPortionUnit(newUnit);
    handleDropdownPortionChange(portionQuantity, newUnit);
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

  // Parse initial portion to set quantity and unit
  const parseInitialPortion = (portion: string): { quantity: string; unit: string } => {
    const lowerPortion = portion.toLowerCase().trim();
    
    // Check for known units
    const unitMappings: Array<{ patterns: string[]; unit: string }> = [
      { patterns: ['colher de sopa', 'colheres de sopa', 'cs'], unit: 'colher_sopa' },
      { patterns: ['colher de chá', 'colheres de chá', 'cc'], unit: 'colher_cha' },
      { patterns: ['colher de sobremesa', 'colheres de sobremesa'], unit: 'colher_sobremesa' },
      { patterns: ['xícara', 'xícaras', 'xicara', 'xicaras'], unit: 'xicara' },
      { patterns: ['copo', 'copos'], unit: 'copo' },
      { patterns: ['fatia', 'fatias'], unit: 'fatia' },
      { patterns: ['pedaço', 'pedaços', 'pedaco', 'pedacos'], unit: 'pedaco' },
      { patterns: ['unidade', 'unidades', 'un'], unit: 'unidade' },
      { patterns: ['kg', 'quilo', 'quilos'], unit: 'kg' },
      { patterns: ['ml', 'mililitro', 'mililitros'], unit: 'ml' },
      { patterns: ['g', 'gr', 'grama', 'gramas'], unit: 'g' },
    ];

    for (const mapping of unitMappings) {
      for (const pattern of mapping.patterns) {
        const regex = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${pattern}\\b`, 'i');
        const match = lowerPortion.match(regex);
        if (match) {
          return { quantity: match[1].replace(',', '.'), unit: mapping.unit };
        }
      }
    }

    // Fallback: try to find a number
    const numMatch = lowerPortion.match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      return { quantity: numMatch[1].replace(',', '.'), unit: 'g' };
    }

    return { quantity: '1', unit: 'g' };
  };

  const startEditing = () => {
    setEditedFood(food);
    setOriginalPortion(extractPortionInGrams(food.porcao_estimada));
    const parsed = parseInitialPortion(food.porcao_estimada);
    setPortionQuantity(parsed.quantity);
    setPortionUnit(parsed.unit);
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
              <Label className="text-xs">Porção estimada</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id={`porcao-qty-${index}`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={portionQuantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-20"
                  placeholder="Qtd"
                />
                <Select value={portionUnit} onValueChange={handleUnitChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {originalPortion && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Altere quantidade ou unidade para recalcular automaticamente
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

  // Unidentified food - show search UI
  if (food.nao_identificado && isSearching) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">Alimento não identificado</p>
              <p className="text-xs text-muted-foreground">
                &quot;{food.descricao_visual || food.item}&quot;
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Busque o alimento correto abaixo
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearching(false)}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="border-t border-amber-500/20 pt-3">
            <UnifiedFoodSearchBlock
              onSelectFood={handleFoodSelected}
              scrollHeight="h-[200px]"
              autoFocus={true}
              confirmButtonLabel="Usar este alimento"
              initialQuery={food.item}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Unidentified food - show compact warning card (if user closed search)
  if (food.nao_identificado && !isSearching) {
    return (
      <div 
        className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition-colors"
        onClick={() => setIsSearching(true)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground flex items-center gap-1">
              {food.descricao_visual || food.item}
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">
                não identificado
              </span>
            </p>
            <p className="text-xs text-amber-600">
              Toque para corrigir
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <span className="text-xs text-muted-foreground">--</span>
          <Search className="w-4 h-4 text-amber-500" />
        </div>
      </div>
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
          {/* Data source indicator */}
          {food.calculo_fonte && (
            <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5 mt-0.5">
              {food.calculo_fonte === "tabela_foods" ? (
                <>
                  <Database className="w-2.5 h-2.5 text-green-500" />
                  <span className="text-green-600">TACO/USDA</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                  <span className="text-purple-600">IA</span>
                </>
              )}
            </p>
          )}
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

        {/* Nutritional data source info */}
        {food.calculo_fonte && (
          <div className={`p-2 rounded-lg ${
            food.calculo_fonte === "tabela_foods" 
              ? "bg-green-500/10 border border-green-500/30" 
              : "bg-purple-500/10 border border-purple-500/30"
          }`}>
            <div className="flex items-center gap-2">
              {food.calculo_fonte === "tabela_foods" ? (
                <>
                  <Database className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs font-medium text-green-600">Dados de fonte oficial</p>
                    <p className="text-[10px] text-muted-foreground">
                      {food.alimento_encontrado 
                        ? `Encontrado: "${food.alimento_encontrado}"`
                        : "Tabela TACO/USDA"
                      }
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-xs font-medium text-purple-600">Estimativa por IA</p>
                    <p className="text-[10px] text-muted-foreground">Valores aproximados</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
