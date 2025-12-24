import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X, Flame, Beef, Wheat, Droplets, AlertCircle, HelpCircle } from "lucide-react";

type FoodItem = {
  item: string;
  item_original_language?: string;
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

  const handleSave = () => {
    onSave(index, {
      ...editedFood,
      corrigido_manualmente: true,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedFood(food);
    setIsEditing(false);
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
                onChange={(e) => setEditedFood({ ...editedFood, porcao_estimada: e.target.value })}
                className="mt-1"
                placeholder="Ex: 150g, 1 xícara, 2 fatias"
              />
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
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">{food.porcao_estimada}</p>
              {food.culinaria_origem && (
                <span className="text-xs text-primary/70">• {food.culinaria_origem}</span>
              )}
              {!food.corrigido_manualmente && food.confianca_identificacao && food.confianca_identificacao !== "alta" && (
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
            setIsEditing(true);
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
