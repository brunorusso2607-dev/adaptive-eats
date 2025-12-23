import { useState } from "react";
import { MealStatusColor, useMealStatusColorsAdmin } from "@/hooks/useMealStatusColors";
import { ColorPickerWithAlpha } from "./ColorPickerWithAlpha";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Palette, Save, RotateCcw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatusColorEditor() {
  const { colors, isLoading, isSaving, updateColor, refetch } = useMealStatusColorsAdmin();
  const [editingColors, setEditingColors] = useState<Record<string, Partial<MealStatusColor>>>({});
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear localStorage
      localStorage.removeItem("meal_status_colors_cache");
      localStorage.removeItem("meal_status_colors_cache_timestamp");
      
      // Refetch from database
      await refetch();
      
      toast.success("Cache limpo! As cores serão recarregadas do banco de dados.");
    } catch (error) {
      toast.error("Erro ao limpar cache");
    } finally {
      setIsClearing(false);
    }
  };

  const handleColorChange = (id: string, field: keyof MealStatusColor, value: string) => {
    setEditingColors(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = async (colorItem: MealStatusColor) => {
    const updates = editingColors[colorItem.id];
    if (!updates || Object.keys(updates).length === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    const success = await updateColor(colorItem.id, updates);
    if (success) {
      toast.success(`Cores de "${colorItem.label}" atualizadas!`);
      setEditingColors(prev => {
        const { [colorItem.id]: _, ...rest } = prev;
        return rest;
      });
    } else {
      toast.error("Erro ao salvar cores");
    }
  };

  const handleReset = (colorItem: MealStatusColor) => {
    setEditingColors(prev => {
      const { [colorItem.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const getEditedValue = (colorItem: MealStatusColor, field: keyof MealStatusColor): string => {
    return (editingColors[colorItem.id]?.[field] as string) ?? (colorItem[field] as string) ?? "";
  };

  const hasChanges = (id: string) => {
    return editingColors[id] && Object.keys(editingColors[id]).length > 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Cores dos Status
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearCache}
            disabled={isClearing}
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Limpar Cache
          </Button>
        </div>
        <CardDescription>
          Configure as cores para cada status de refeição. Use o seletor para escolher cores com transparência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {colors.map((colorItem) => (
            <Card key={colorItem.id} className="relative overflow-hidden">
              {/* Preview Header */}
              <div
                className="h-16 flex items-center justify-center text-sm font-semibold border-b transition-colors"
                style={{
                  backgroundColor: getEditedValue(colorItem, "background_color"),
                  color: getEditedValue(colorItem, "text_color"),
                  borderColor: getEditedValue(colorItem, "border_color") || "transparent",
                  borderWidth: getEditedValue(colorItem, "border_color") ? "2px" : "0",
                }}
              >
                {colorItem.label}
              </div>

              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome exibido</Label>
                  <Input
                    value={getEditedValue(colorItem, "label")}
                    onChange={(e) => handleColorChange(colorItem.id, "label", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <ColorPickerWithAlpha
                  label="Cor de Fundo"
                  color={getEditedValue(colorItem, "background_color")}
                  onChange={(color) => handleColorChange(colorItem.id, "background_color", color)}
                />

                <ColorPickerWithAlpha
                  label="Cor do Texto"
                  color={getEditedValue(colorItem, "text_color")}
                  onChange={(color) => handleColorChange(colorItem.id, "text_color", color)}
                />

                <ColorPickerWithAlpha
                  label="Cor da Borda"
                  color={getEditedValue(colorItem, "border_color") || "rgba(0, 0, 0, 0)"}
                  onChange={(color) => handleColorChange(colorItem.id, "border_color", color)}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSave(colorItem)}
                    disabled={isSaving || !hasChanges(colorItem.id)}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Salvar
                  </Button>
                  {hasChanges(colorItem.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReset(colorItem)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Dicas para as cores</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Use cores claras com baixa opacidade para fundos (ex: 10% de opacidade)</li>
            <li>• Use cores sólidas para texto para melhor legibilidade</li>
            <li>• A borda é opcional - deixe com 0% opacidade para remover</li>
            <li>• O preview no topo do card mostra como ficará em tempo real</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h4 className="font-medium text-sm mb-1 text-primary">Sobre o cache</h4>
          <p className="text-xs text-muted-foreground">
            O cache é limpo automaticamente sempre que você salva uma cor. Os usuários verão as novas cores
            na próxima vez que acessarem o app. Use o botão "Limpar Cache" acima apenas se precisar forçar
            uma atualização imediata no seu dispositivo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
