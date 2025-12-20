import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Loader2, RotateCcw, Flame, Beef, Wheat, Droplets, AlertCircle, ScanBarcode, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Refrigerator, ChefHat, Clock, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type FoodItem = {
  item: string;
  porcao_estimada: string;
  calorias: number;
  macros: {
    proteinas: number;
    carboidratos: number;
    gorduras: number;
  };
};

type IntoleranceAlert = {
  alimento: string;
  intolerancia: string;
  risco: "alto" | "medio" | "baixo";
  motivo: string;
};

type FoodAnalysis = {
  alimentos: FoodItem[];
  total_geral: {
    calorias_totais: number;
    proteinas_totais: number;
    carboidratos_totais: number;
    gorduras_totais: number;
  };
  observacoes: string;
  alertas_intolerancia?: IntoleranceAlert[];
};

type LabelIngredient = {
  nome: string;
  status: "seguro" | "atencao" | "evitar";
  motivo?: string;
};

type LabelAnalysis = {
  produto: string;
  veredicto: "seguro" | "atencao" | "evitar";
  ingredientes_analisados: LabelIngredient[];
  alertas: string[];
  recomendacao: string;
};

type FridgeIngredient = {
  nome: string;
  quantidade_estimada: string;
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
};

type FridgeAnalysis = {
  ingredientes_identificados: FridgeIngredient[];
  receitas_sugeridas: FridgeRecipe[];
  dica: string;
};

type AnalysisMode = "food" | "label" | "fridge";

export default function FoodPhotoAnalyzer() {
  const [mode, setMode] = useState<AnalysisMode>("food");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [labelAnalysis, setLabelAnalysis] = useState<LabelAnalysis | null>(null);
  const [fridgeAnalysis, setFridgeAnalysis] = useState<FridgeAnalysis | null>(null);
  const [notFoodError, setNotFoodError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }

    // Convert to base64 and compress if needed
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setFoodAnalysis(null);
      setLabelAnalysis(null);
      setFridgeAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imagePreview) {
      toast.error("Tire ou selecione uma foto primeiro");
      return;
    }

    setIsAnalyzing(true);
    setNotFoodError(null);
    
    try {
      if (mode === "food") {
        const { data, error } = await supabase.functions.invoke("analyze-food-photo", {
          body: { imageBase64: imagePreview },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.notFood) {
          setNotFoodError(data.message || "Não foi possível identificar alimentos na imagem.");
          return;
        }

        setFoodAnalysis(data.analysis);
        toast.success("Análise concluída!");
      } else if (mode === "label") {
        const { data, error } = await supabase.functions.invoke("analyze-label-photo", {
          body: { imageBase64: imagePreview },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.notLabel) {
          setNotFoodError(data.message || "Não foi possível identificar um rótulo de ingredientes na imagem.");
          return;
        }

        setLabelAnalysis(data.analysis);
        toast.success("Verificação concluída!");
      } else if (mode === "fridge") {
        const { data, error } = await supabase.functions.invoke("analyze-fridge-photo", {
          body: { imageBase64: imagePreview },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.notFridge) {
          setNotFoodError(data.message || "Não foi possível identificar uma geladeira ou despensa na imagem.");
          return;
        }

        setFridgeAnalysis(data.analysis);
        toast.success("Receitas sugeridas com sucesso!");
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar imagem");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setImagePreview(null);
    setFoodAnalysis(null);
    setLabelAnalysis(null);
    setFridgeAnalysis(null);
    setNotFoodError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleModeChange = (newMode: string) => {
    if (newMode === "food" || newMode === "label" || newMode === "fridge") {
      setMode(newMode);
      resetAnalysis();
    }
  };

  const getVeredictIcon = (veredicto: string) => {
    switch (veredicto) {
      case "seguro":
        return <ShieldCheck className="w-8 h-8 text-green-500" />;
      case "atencao":
        return <ShieldAlert className="w-8 h-8 text-yellow-500" />;
      case "evitar":
        return <ShieldX className="w-8 h-8 text-red-500" />;
      default:
        return null;
    }
  };

  const getVeredictColor = (veredicto: string) => {
    switch (veredicto) {
      case "seguro":
        return "bg-green-500/10 border-green-500/30 text-green-600";
      case "atencao":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-600";
      case "evitar":
        return "bg-red-500/10 border-red-500/30 text-red-600";
      default:
        return "";
    }
  };

  const getVeredictText = (veredicto: string) => {
    switch (veredicto) {
      case "seguro":
        return "Produto Seguro";
      case "atencao":
        return "Atenção Necessária";
      case "evitar":
        return "Evitar Consumo";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "seguro":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">OK</span>;
      case "atencao":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600">⚠️</span>;
      case "evitar":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600">❌</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="food" className="flex items-center gap-1 text-xs sm:text-sm">
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Analisar</span> Comida
          </TabsTrigger>
          <TabsTrigger value="label" className="flex items-center gap-1 text-xs sm:text-sm">
            <ScanBarcode className="w-4 h-4" />
            <span className="hidden sm:inline">Verificar</span> Rótulo
          </TabsTrigger>
          <TabsTrigger value="fridge" className="flex items-center gap-1 text-xs sm:text-sm">
            <Refrigerator className="w-4 h-4" />
            Geladeira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="mt-4">
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">Analisar Foto do Prato</h2>
            <p className="text-sm text-muted-foreground">
              Tire uma foto do seu prato e descubra as calorias estimadas
            </p>
          </div>
        </TabsContent>

        <TabsContent value="label" className="mt-4">
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">Verificar Rótulo</h2>
            <p className="text-sm text-muted-foreground">
              Fotografe o rótulo de ingredientes e verifique se é seguro para você
            </p>
          </div>
        </TabsContent>

        <TabsContent value="fridge" className="mt-4">
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-xl font-bold text-foreground">Geladeira Inteligente</h2>
            <p className="text-sm text-muted-foreground">
              Fotografe sua geladeira e receba sugestões de receitas personalizadas
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Image capture/upload section */}
      {!imagePreview ? (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* Camera button */}
              <Button
                variant="default"
                size="lg"
                className="w-full h-32 flex flex-col gap-2 gradient-primary"
                onClick={() => cameraInputRef.current?.click()}
              >
                {mode === "food" ? (
                  <Camera className="w-10 h-10" />
                ) : mode === "label" ? (
                  <ScanBarcode className="w-10 h-10" />
                ) : (
                  <Refrigerator className="w-10 h-10" />
                )}
                <span className="text-lg font-medium">
                  {mode === "food" 
                    ? "Tirar Foto do Prato" 
                    : mode === "label"
                    ? "Fotografar Rótulo"
                    : "Fotografar Geladeira"
                  }
                </span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Upload button */}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-16 flex gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5" />
                <span>Escolher da Galeria</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {mode === "food" 
                ? "📸 Dica: Fotografe o prato de cima para melhor precisão"
                : mode === "label"
                ? "📸 Dica: Fotografe a lista de ingredientes bem de perto"
                : "📸 Dica: Abra a geladeira e fotografe todos os ingredientes visíveis"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Image preview */}
          <Card className="glass-card overflow-hidden">
            <div className="relative">
              <img
                src={imagePreview}
                alt={mode === "food" ? "Foto do prato" : mode === "label" ? "Foto do rótulo" : "Foto da geladeira"}
                className="w-full h-64 object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={resetAnalysis}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Not food/label/fridge error message */}
            {notFoodError && (
              <CardContent className="p-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  </div>
                  <p className="text-muted-foreground">{notFoodError}</p>
                  <Button
                    variant="outline"
                    onClick={resetAnalysis}
                    className="mt-2"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Tentar Outra Foto
                  </Button>
                </div>
              </CardContent>
            )}

            {!foodAnalysis && !labelAnalysis && !fridgeAnalysis && !notFoodError && (
              <CardContent className="p-4">
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {mode === "food" 
                        ? "Analisando..." 
                        : mode === "label" 
                        ? "Verificando..." 
                        : "Buscando receitas..."
                      }
                    </>
                  ) : (
                    <>
                      {mode === "food" ? (
                        <>
                          <Flame className="w-5 h-5 mr-2" />
                          Analisar Calorias
                        </>
                      ) : mode === "label" ? (
                        <>
                          <ScanBarcode className="w-5 h-5 mr-2" />
                          Verificar Ingredientes
                        </>
                      ) : (
                        <>
                          <ChefHat className="w-5 h-5 mr-2" />
                          Sugerir Receitas
                        </>
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Food Analysis results */}
          {foodAnalysis && (
            <div className="space-y-4 animate-fade-in">
              {/* Total macros card */}
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Estimado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-3 rounded-lg bg-orange-500/10">
                      <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                      <p className="text-xl font-bold text-foreground">{foodAnalysis.total_geral.calorias_totais}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-500/10">
                      <Beef className="w-5 h-5 mx-auto mb-1 text-red-500" />
                      <p className="text-xl font-bold text-foreground">{foodAnalysis.total_geral.proteinas_totais}g</p>
                      <p className="text-xs text-muted-foreground">proteína</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-500/10">
                      <Wheat className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                      <p className="text-xl font-bold text-foreground">{foodAnalysis.total_geral.carboidratos_totais}g</p>
                      <p className="text-xs text-muted-foreground">carbos</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-500/10">
                      <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                      <p className="text-xl font-bold text-foreground">{foodAnalysis.total_geral.gorduras_totais}g</p>
                      <p className="text-xs text-muted-foreground">gordura</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Intolerance Alerts */}
              {foodAnalysis.alertas_intolerancia && foodAnalysis.alertas_intolerancia.length > 0 && (
                <Card className="glass-card border-red-500/30 bg-red-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-500">
                      <AlertTriangle className="w-5 h-5" />
                      Alerta de Intolerância
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {foodAnalysis.alertas_intolerancia.map((alerta, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          alerta.risco === "alto" 
                            ? "bg-red-500/20 border border-red-500/30" 
                            : alerta.risco === "medio"
                            ? "bg-yellow-500/20 border border-yellow-500/30"
                            : "bg-orange-500/10 border border-orange-500/20"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {alerta.risco === "alto" ? (
                            <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : alerta.risco === "medio" ? (
                            <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{alerta.alimento}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                alerta.risco === "alto" 
                                  ? "bg-red-500/30 text-red-600" 
                                  : alerta.risco === "medio"
                                  ? "bg-yellow-500/30 text-yellow-600"
                                  : "bg-orange-500/20 text-orange-600"
                              }`}>
                                {alerta.risco === "alto" ? "Risco Alto" : alerta.risco === "medio" ? "Risco Médio" : "Risco Baixo"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Intolerância:</strong> {alerta.intolerancia}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {alerta.motivo}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Individual foods */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Alimentos Identificados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {foodAnalysis.alimentos.map((food, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-foreground">{food.item}</p>
                        <p className="text-xs text-muted-foreground">{food.porcao_estimada}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{food.calorias} kcal</p>
                        <p className="text-xs text-muted-foreground">
                          P:{food.macros.proteinas}g C:{food.macros.carboidratos}g G:{food.macros.gorduras}g
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Notes */}
              {foodAnalysis.observacoes && (
                <Card className="glass-card border-yellow-500/20">
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{foodAnalysis.observacoes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reset button */}
              <Button
                variant="outline"
                onClick={resetAnalysis}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Analisar Outra Foto
              </Button>
            </div>
          )}

          {/* Label Analysis results */}
          {labelAnalysis && (
            <div className="space-y-4 animate-fade-in">
              {/* Verdict card */}
              <Card className={`glass-card border ${getVeredictColor(labelAnalysis.veredicto)}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-3 text-center">
                    {getVeredictIcon(labelAnalysis.veredicto)}
                    <div>
                      <h3 className="text-xl font-bold">{getVeredictText(labelAnalysis.veredicto)}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{labelAnalysis.produto}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alerts */}
              {labelAnalysis.alertas && labelAnalysis.alertas.length > 0 && (
                <Card className="glass-card border-red-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-5 h-5" />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {labelAnalysis.alertas.map((alerta, index) => (
                      <div key={index} className="p-3 rounded-lg bg-red-500/10 text-sm">
                        {alerta}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Ingredients analyzed */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ingredientes Analisados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {labelAnalysis.ingredientes_analisados.map((ing, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{ing.nome}</p>
                          {getStatusBadge(ing.status)}
                        </div>
                        {ing.motivo && (
                          <p className="text-xs text-muted-foreground mt-1">{ing.motivo}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recommendation */}
              <Card className="glass-card border-primary/20">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{labelAnalysis.recomendacao}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Reset button */}
              <Button
                variant="outline"
                onClick={resetAnalysis}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Verificar Outro Rótulo
              </Button>
            </div>
          )}

          {/* Fridge Analysis results */}
          {fridgeAnalysis && (
            <div className="space-y-4 animate-fade-in">
              {/* Ingredients found */}
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Refrigerator className="w-5 h-5 text-primary" />
                    Ingredientes Encontrados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {fridgeAnalysis.ingredientes_identificados.map((ing, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {ing.nome}
                        {ing.quantidade_estimada && (
                          <span className="text-xs opacity-70 ml-1">({ing.quantidade_estimada})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recipe suggestions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  Receitas Sugeridas
                </h3>
                
                {fridgeAnalysis.receitas_sugeridas.map((recipe, index) => (
                  <Card key={index} className="glass-card">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground">{recipe.nome}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {recipe.tempo_preparo}min
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{recipe.descricao}</p>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2 py-1 rounded bg-green-500/10 text-green-600">
                            {recipe.dificuldade}
                          </span>
                          <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-600 flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            ~{recipe.calorias_estimadas} kcal
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Da sua geladeira:</p>
                            <div className="flex flex-wrap gap-1">
                              {recipe.ingredientes_da_geladeira.map((ing, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  ✓ {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          {recipe.ingredientes_extras.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Você pode precisar:</p>
                              <div className="flex flex-wrap gap-1">
                                {recipe.ingredientes_extras.map((ing, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {ing}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border">
                          <p className="text-xs font-medium text-foreground mb-2">Modo de preparo rápido:</p>
                          <ol className="space-y-1">
                            {recipe.instrucoes_resumidas.map((step, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className="font-medium text-primary">{i + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tip */}
              {fridgeAnalysis.dica && (
                <Card className="glass-card border-yellow-500/20">
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{fridgeAnalysis.dica}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reset button */}
              <Button
                variant="outline"
                onClick={resetAnalysis}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Analisar Outra Geladeira
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
