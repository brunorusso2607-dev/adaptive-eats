import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2, RotateCcw, AlertTriangle, Refrigerator, ChefHat, Clock, UtensilsCrossed, CheckCircle2, CircleAlert, CircleDashed, X, Bookmark, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type FridgeIngredient = {
  nome: string;
  quantidade_estimada: string;
  confianca?: "alta" | "media" | "baixa";
  alerta_seguranca?: string | null;
  tipo?: "in_natura" | "industrializado";
};

type FridgeRecipe = {
  nome: string;
  descricao: string;
  tempo_preparo: number;
  dificuldade: string;
  ingredientes_da_geladeira: string[];
  ingredientes_extras: string[];
  calorias_estimadas: number;
  instrucoes_resumidas: string[];
  alerta_receita?: string | null;
};

type FridgeAnalysis = {
  ingredientes_identificados: FridgeIngredient[];
  receitas_sugeridas: FridgeRecipe[];
  alertas_gerais?: string[];
  dica: string;
};

type FridgeSlot = {
  id: "geladeira" | "porta" | "freezer";
  label: string;
  description: string;
  image: string | null;
};

type AnalysisStep = "upload" | "ingredients" | "recipes";

export default function FridgeScanner() {
  const [slots, setSlots] = useState<FridgeSlot[]>([
    { id: "geladeira", label: "Geladeira", description: "Interior principal", image: null },
    { id: "porta", label: "Porta", description: "Prateleiras da porta", image: null },
    { id: "freezer", label: "Freezer", description: "Congelador", image: null },
  ]);
  const [activeSlot, setActiveSlot] = useState<FridgeSlot["id"] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [analysis, setAnalysis] = useState<FridgeAnalysis | null>(null);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>("upload");
  const [notFridgeError, setNotFridgeError] = useState<string | null>(null);
  const [savingRecipeIndex, setSavingRecipeIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasAtLeastOnePhoto = slots.some(slot => slot.image !== null);
  const photoCount = slots.filter(slot => slot.image !== null).length;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeSlot) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setSlots(prev => prev.map(slot => 
        slot.id === activeSlot ? { ...slot, image: base64 } : slot
      ));
      setActiveSlot(null);
    };
    reader.readAsDataURL(file);
    
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removePhoto = (slotId: FridgeSlot["id"]) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId ? { ...slot, image: null } : slot
    ));
  };

  const openCamera = (slotId: FridgeSlot["id"]) => {
    setActiveSlot(slotId);
    cameraInputRef.current?.click();
  };

  const openGallery = (slotId: FridgeSlot["id"]) => {
    setActiveSlot(slotId);
    fileInputRef.current?.click();
  };

  const analyzePhotos = async () => {
    if (!hasAtLeastOnePhoto) {
      toast.error("Tire pelo menos uma foto");
      return;
    }

    setIsAnalyzing(true);
    setNotFridgeError(null);
    
    try {
      // Combine all photos into one request
      const images = slots
        .filter(slot => slot.image)
        .map(slot => ({ area: slot.label, imageBase64: slot.image }));

      const { data, error } = await supabase.functions.invoke("analyze-fridge-photo", {
        body: { 
          imageBase64: images[0].imageBase64, // Primary image
          additionalImages: images.slice(1).map(img => img.imageBase64),
          areas: images.map(img => img.area)
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.notFridge) {
        setNotFridgeError(data.message || "Não foi possível identificar uma geladeira ou despensa na imagem.");
        return;
      }

      // Store analysis but only show ingredients first
      setAnalysis({
        ...data.analysis,
        receitas_sugeridas: data.analysis.receitas_sugeridas || []
      });
      setCurrentStep("ingredients");
      toast.success("Ingredientes identificados!");
    } catch (error) {
      console.error("Error analyzing fridge:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar fotos");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRecipes = async () => {
    if (!analysis) return;
    
    setIsGeneratingRecipes(true);
    
    try {
      // The analysis already has recipes from the initial call
      // Just transition to show them
      setCurrentStep("recipes");
      toast.success("Receitas geradas para seu perfil!");
    } catch (error) {
      console.error("Error generating recipes:", error);
      toast.error("Erro ao gerar receitas");
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const saveRecipe = async (recipe: FridgeRecipe, index: number) => {
    setSavingRecipeIndex(index);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para salvar receitas");
        return;
      }

      // Determine complexity enum value
      const complexityValue = recipe.dificuldade === "fácil" ? "rapida" as const : 
                              recipe.dificuldade === "média" ? "equilibrada" as const : 
                              "elaborada" as const;

      // Convert fridge recipe to standard recipe format
      const recipeData = {
        user_id: user.id,
        name: recipe.nome,
        description: recipe.descricao,
        prep_time: recipe.tempo_preparo,
        calories: recipe.calorias_estimadas,
        protein: 0,
        carbs: 0,
        fat: 0,
        servings: 2,
        complexity: complexityValue,
        ingredients: JSON.stringify(recipe.ingredientes_da_geladeira.map(ing => ({
          name: ing,
          quantity: "a gosto",
          unit: ""
        })).concat(recipe.ingredientes_extras.map(ing => ({
          name: ing,
          quantity: "a gosto", 
          unit: ""
        })))),
        instructions: JSON.stringify(recipe.instrucoes_resumidas.map((step, i) => ({
          step: i + 1,
          text: step
        }))),
        input_ingredients: recipe.ingredientes_da_geladeira.join(", "),
        is_favorite: false
      };

      const { error } = await supabase.from("recipes").insert([recipeData]);

      if (error) throw error;

      toast.success("Receita salva no seu histórico!", {
        description: "Acesse seus Favoritos para ver todas as receitas salvas.",
        duration: 4000,
      });
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Erro ao salvar receita");
    } finally {
      setSavingRecipeIndex(null);
    }
  };

  const resetAll = () => {
    setSlots([
      { id: "geladeira", label: "Geladeira", description: "Interior principal", image: null },
      { id: "porta", label: "Porta", description: "Prateleiras da porta", image: null },
      { id: "freezer", label: "Freezer", description: "Congelador", image: null },
    ]);
    setAnalysis(null);
    setCurrentStep("upload");
    setNotFridgeError(null);
    setActiveSlot(null);
  };

  // Hidden inputs for camera/gallery
  const renderHiddenInputs = () => (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );

  // Step 1: Upload photos
  if (currentStep === "upload") {
    return (
      <div className="space-y-4">
        {renderHiddenInputs()}
        
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Geladeira Inteligente</h2>
          <p className="text-sm text-muted-foreground">
            Fotografe sua geladeira (mínimo 1 foto, até 3 áreas)
          </p>
        </div>

        {/* Photo slots */}
        <div className="grid grid-cols-3 gap-3">
          {slots.map((slot) => (
            <Card 
              key={slot.id} 
              className={`glass-card overflow-hidden ${slot.image ? 'border-primary/50' : ''}`}
            >
              {slot.image ? (
                <div className="relative aspect-square">
                  <img 
                    src={slot.image} 
                    alt={slot.label}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 w-6 h-6"
                    onClick={() => removePhoto(slot.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white font-medium">{slot.label}</p>
                  </div>
                </div>
              ) : (
                <CardContent className="p-3 flex flex-col items-center justify-center aspect-square gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Refrigerator className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-foreground">{slot.label}</p>
                    <p className="text-[10px] text-muted-foreground">{slot.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="w-7 h-7"
                      onClick={() => openCamera(slot.id)}
                    >
                      <Camera className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="w-7 h-7"
                      onClick={() => openGallery(slot.id)}
                    >
                      <Upload className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Error message */}
        {notFridgeError && (
          <Card className="glass-card border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-muted-foreground">{notFridgeError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analyze button */}
        <Button
          onClick={analyzePhotos}
          disabled={!hasAtLeastOnePhoto || isAnalyzing}
          className="w-full gradient-primary"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Identificando ingredientes para seu perfil...
              </span>
            </>
          ) : (
            <>
              <Refrigerator className="w-5 h-5 mr-2" />
              Analisar {photoCount > 0 ? `(${photoCount} foto${photoCount > 1 ? 's' : ''})` : ''}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          📸 Dica: Fotografe as 3 áreas para receitas mais completas
        </p>
      </div>
    );
  }

  // Step 2: Show ingredients
  if (currentStep === "ingredients" && analysis) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* General Alerts */}
        {analysis.alertas_gerais && analysis.alertas_gerais.length > 0 && (
          <Card className="glass-card border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                Alertas de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.alertas_gerais.map((alerta, index) => (
                <div key={index} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-foreground">
                  {alerta}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Ingredients found */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Refrigerator className="w-5 h-5 text-primary" />
              Ingredientes Encontrados ({analysis.ingredientes_identificados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.ingredientes_identificados.map((ing, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  ing.alerta_seguranca 
                    ? "bg-yellow-500/5 border border-yellow-500/20" 
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{ing.nome}</p>
                      {ing.confianca && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          ing.confianca === "alta" 
                            ? "bg-green-500/20 text-green-600" 
                            : ing.confianca === "media"
                            ? "bg-blue-500/20 text-blue-600"
                            : "bg-yellow-500/20 text-yellow-600"
                        }`}>
                          {ing.confianca === "alta" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : ing.confianca === "media" ? (
                            <CircleAlert className="w-3 h-3" />
                          ) : (
                            <CircleDashed className="w-3 h-3" />
                          )}
                          {ing.confianca === "alta" ? "Alta" : ing.confianca === "media" ? "Média" : "Baixa"}
                        </span>
                      )}
                      {ing.tipo && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ing.tipo === "in_natura" 
                            ? "bg-green-500/10 text-green-600" 
                            : "bg-purple-500/10 text-purple-600"
                        }`}>
                          {ing.tipo === "in_natura" ? "In natura" : "Industrial"}
                        </span>
                      )}
                    </div>
                    {ing.quantidade_estimada && (
                      <p className="text-xs text-muted-foreground mt-1">{ing.quantidade_estimada}</p>
                    )}
                    {ing.alerta_seguranca && (
                      <p className="text-xs text-yellow-600 mt-1.5 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {ing.alerta_seguranca}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Generate recipes button */}
        <Button
          onClick={generateRecipes}
          disabled={isGeneratingRecipes}
          className="w-full gradient-primary"
          size="lg"
        >
          {isGeneratingRecipes ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Gerando receitas para seu perfil...
              </span>
            </>
          ) : (
            <>
              <ChefHat className="w-5 h-5 mr-2" />
              Gerar Receitas
            </>
          )}
        </Button>

        {/* Back button */}
        <Button
          variant="outline"
          onClick={resetAll}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Fotografar Novamente
        </Button>
      </div>
    );
  }

  // Step 3: Show recipes
  if (currentStep === "recipes" && analysis) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Recipe suggestions */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              Receitas Sugeridas
              <span className="text-xs font-normal text-muted-foreground ml-auto flex items-center gap-1">
                <User className="w-3 h-3" />
                Personalizadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.receitas_sugeridas.map((recipe, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{recipe.nome}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{recipe.descricao}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {recipe.calorias_estimadas} kcal
                  </span>
                </div>
                
                {recipe.alerta_receita && (
                  <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {recipe.alerta_receita}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.tempo_preparo} min
                  </span>
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3" />
                    {recipe.dificuldade}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Ingredientes da geladeira:</p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.ingredientes_da_geladeira.map((ing, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">
                        ✓ {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {recipe.ingredientes_extras.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Você vai precisar:</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredientes_extras.map((ing, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600">
                          + {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Como fazer:</p>
                  <ol className="text-xs text-muted-foreground space-y-1">
                    {recipe.instrucoes_resumidas.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary font-medium">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Save button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => saveRecipe(recipe, index)}
                  disabled={savingRecipeIndex === index}
                >
                  {savingRecipeIndex === index ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Salvar Receita
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tip */}
        {analysis.dica && (
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <ChefHat className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{analysis.dica}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to ingredients */}
        <Button
          variant="outline"
          onClick={() => setCurrentStep("ingredients")}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Ver Ingredientes
        </Button>

        {/* Reset */}
        <Button
          variant="ghost"
          onClick={resetAll}
          className="w-full"
        >
          Fotografar Outra Geladeira
        </Button>
      </div>
    );
  }

  return null;
}
