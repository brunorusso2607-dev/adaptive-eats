import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Loader2, RotateCcw, Flame, Beef, Wheat, Droplets, AlertCircle, ScanBarcode, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Refrigerator, ArrowRight, Target, TrendingDown, TrendingUp, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import FridgeScanner from "./FridgeScanner";

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

type MetaDiaria = {
  meta_calorica_diaria: number;
  calorias_esta_refeicao: number;
  calorias_restantes: number;
  percentual_consumido: number;
  status: "leve" | "moderado" | "substancial" | "pesado";
  mensagem: string;
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
  status: "seguro" | "risco_potencial" | "contem" | "atencao" | "evitar";
  motivo?: string;
  restricao_afetada?: string;
};

type LabelAnalysis = {
  produto: string;
  veredicto: "seguro" | "risco_potencial" | "contem" | "atencao" | "evitar";
  ingredientes_analisados: LabelIngredient[];
  alertas: string[];
  ingredientes_suspeitos?: string[];
  recomendacao: string;
};

type AnalysisMode = "food" | "label" | "fridge";
type LabelStep = "front" | "back" | "complete";

export default function FoodPhotoAnalyzer() {
  const [mode, setMode] = useState<AnalysisMode>("food");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [metaDiaria, setMetaDiaria] = useState<MetaDiaria | null>(null);
  const [labelAnalysis, setLabelAnalysis] = useState<LabelAnalysis | null>(null);
  const [notFoodError, setNotFoodError] = useState<string | null>(null);
  
  // Label two-step flow
  const [labelStep, setLabelStep] = useState<LabelStep>("front");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [needsBackPhoto, setNeedsBackPhoto] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      setImagePreview(base64);
      setFoodAnalysis(null);
      setLabelAnalysis(null);
      setNeedsBackPhoto(false);
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
        setMetaDiaria(data.meta_diaria || null);
        toast.success("Análise concluída!");
      } else if (mode === "label") {
        const { data, error } = await supabase.functions.invoke("analyze-label-photo", {
          body: { 
            imageBase64: imagePreview,
            step: labelStep 
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.needsBackPhoto) {
          setNeedsBackPhoto(true);
          setFrontImage(imagePreview);
          setImagePreview(null);
          setLabelStep("back");
          toast.info("📸 Agora fotografe a lista de ingredientes no verso", {
            duration: 5000,
          });
          return;
        }

        if (data.qualityIssue) {
          setNotFoodError(data.message || "A imagem está difícil de ler. Tente uma foto mais nítida.");
          return;
        }

        if (data.notLabel) {
          setNotFoodError(data.message || "Não foi possível identificar um rótulo de ingredientes na imagem.");
          return;
        }

        setLabelAnalysis(data.analysis);
        setLabelStep("complete");
        toast.success("Verificação concluída!");
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
    setMetaDiaria(null);
    setLabelAnalysis(null);
    setNotFoodError(null);
    setLabelStep("front");
    setFrontImage(null);
    setNeedsBackPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleModeChange = (newMode: string) => {
    if (newMode === "food" || newMode === "label" || newMode === "fridge") {
      // Reset all states immediately and synchronously before changing mode
      setImagePreview(null);
      setFoodAnalysis(null);
      setMetaDiaria(null);
      setLabelAnalysis(null);
      setNotFoodError(null);
      setLabelStep("front");
      setFrontImage(null);
      setNeedsBackPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      // Set mode last to ensure all states are reset before re-render
      setMode(newMode);
    }
  };

  const getVeredictIcon = (veredicto: string) => {
    switch (veredicto) {
      case "seguro":
        return <ShieldCheck className="w-8 h-8 text-green-500" />;
      case "risco_potencial":
      case "atencao":
        return <ShieldAlert className="w-8 h-8 text-yellow-500" />;
      case "contem":
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
      case "risco_potencial":
      case "atencao":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-600";
      case "contem":
      case "evitar":
        return "bg-red-500/10 border-red-500/30 text-red-600";
      default:
        return "";
    }
  };

  const getVeredictText = (veredicto: string) => {
    switch (veredicto) {
      case "seguro":
        return "🟢 Produto Seguro";
      case "risco_potencial":
      case "atencao":
        return "🟡 Risco Potencial";
      case "contem":
      case "evitar":
        return "🔴 Contém Ingrediente Problemático";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "seguro":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium">🟢 Seguro</span>;
      case "risco_potencial":
      case "atencao":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 font-medium">🟡 Risco</span>;
      case "contem":
      case "evitar":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium">🔴 Contém</span>;
      default:
        return null;
    }
  };

  const getLabelStepInfo = () => {
    if (labelStep === "front") {
      return {
        title: "Passo 1: Fotografar Produto",
        description: "Tire uma foto do produto ou da lista de ingredientes",
        buttonText: "Fotografar Produto",
        icon: <ScanBarcode className="w-10 h-10" />
      };
    } else if (labelStep === "back") {
      return {
        title: "Passo 2: Lista de Ingredientes",
        description: "Agora fotografe a lista de ingredientes no verso do produto",
        buttonText: "Fotografar Ingredientes",
        icon: <ScanBarcode className="w-10 h-10" />
      };
    }
    return {
      title: "Verificar Rótulo",
      description: "Fotografe o rótulo de ingredientes",
      buttonText: "Fotografar Rótulo",
      icon: <ScanBarcode className="w-10 h-10" />
    };
  };

  // If fridge mode is selected, render the dedicated FridgeScanner component
  if (mode === "fridge") {
    return (
      <div className="space-y-4">
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
        </Tabs>
        
        <FridgeScanner />
      </div>
    );
  }

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
            <h2 className="text-xl font-bold text-foreground">{getLabelStepInfo().title}</h2>
            <p className="text-sm text-muted-foreground">
              {getLabelStepInfo().description}
            </p>
            
            {/* Progress indicator for two-step flow */}
            {mode === "label" && !labelAnalysis && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  labelStep === "front" || labelStep === "back" || labelStep === "complete" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  1
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  labelStep === "back" || labelStep === "complete"
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  2
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  labelStep === "complete"
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  ✓
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Show front image preview if in back step */}
      {mode === "label" && labelStep === "back" && frontImage && (
        <Card className="glass-card border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <img 
                src={frontImage} 
                alt="Frente do produto" 
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Foto da frente capturada ✓</p>
                <p className="text-xs text-muted-foreground">Agora fotografe a lista de ingredientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                ) : (
                  <ScanBarcode className="w-10 h-10" />
                )}
                <span className="text-lg font-medium">
                  {mode === "food" 
                    ? "Tirar Foto do Prato" 
                    : labelStep === "back"
                      ? "Fotografar Ingredientes"
                      : "Tirar Foto do Rótulo"
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

            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {mode === "food" 
                ? "📸 Dica: Fotografe o prato de cima para melhor precisão"
                : labelStep === "back" 
                  ? "📸 Dica: Fotografe a lista de ingredientes bem de perto e com boa iluminação"
                  : "📸 Dica: Fotografe o produto ou a lista de ingredientes"
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
                alt={mode === "food" ? "Foto do prato" : "Foto do rótulo"}
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
            
            {/* Not food/label error message */}
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

            {!foodAnalysis && !labelAnalysis && !notFoodError && (
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
                        : "Verificando ingredientes..."
                      }
                    </>
                  ) : (
                    <>
                      {mode === "food" ? (
                        <>
                          <Flame className="w-5 h-5 mr-2" />
                          Analisar Calorias
                        </>
                      ) : (
                        <>
                          <ScanBarcode className="w-5 h-5 mr-2" />
                          Verificar Ingredientes
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

              {/* Meta Diária Card */}
              {metaDiaria && (
                <Card className={`glass-card border ${
                  metaDiaria.calorias_restantes > 0 
                    ? metaDiaria.status === 'leve' ? 'border-green-500/30' :
                      metaDiaria.status === 'moderado' ? 'border-blue-500/30' :
                      metaDiaria.status === 'substancial' ? 'border-yellow-500/30' : 'border-orange-500/30'
                    : 'border-red-500/30'
                }`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Meta Diária
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Consumido nesta refeição</span>
                        <span>{metaDiaria.percentual_consumido}% da meta</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            metaDiaria.percentual_consumido <= 30 ? 'bg-green-500' :
                            metaDiaria.percentual_consumido <= 50 ? 'bg-blue-500' :
                            metaDiaria.percentual_consumido <= 75 ? 'bg-yellow-500' :
                            metaDiaria.percentual_consumido <= 100 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(metaDiaria.percentual_consumido, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{metaDiaria.calorias_esta_refeicao}</p>
                        <p className="text-xs text-muted-foreground">Esta refeição</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{metaDiaria.meta_calorica_diaria}</p>
                        <p className="text-xs text-muted-foreground">Meta diária</p>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        metaDiaria.calorias_restantes > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        <p className={`text-lg font-bold ${
                          metaDiaria.calorias_restantes > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metaDiaria.calorias_restantes > 0 ? (
                            <span className="flex items-center justify-center gap-1">
                              <TrendingDown className="w-4 h-4" />
                              {metaDiaria.calorias_restantes}
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              +{Math.abs(metaDiaria.calorias_restantes)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {metaDiaria.calorias_restantes > 0 ? 'Restantes' : 'Excedido'}
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    <p className={`text-sm ${
                      metaDiaria.calorias_restantes > 0 ? 'text-muted-foreground' : 'text-red-600'
                    }`}>
                      {metaDiaria.mensagem}
                    </p>
                  </CardContent>
                </Card>
              )}

              {foodAnalysis.alertas_intolerancia && foodAnalysis.alertas_intolerancia.length > 0 && (
                <Card className="glass-card border-red-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-500">
                      <AlertTriangle className="w-5 h-5" />
                      Alertas de Intolerância
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {foodAnalysis.alertas_intolerancia.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          alert.risco === "alto" 
                            ? "bg-red-500/10 border border-red-500/30" 
                            : alert.risco === "medio"
                            ? "bg-yellow-500/10 border border-yellow-500/30"
                            : "bg-orange-500/10 border border-orange-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{alert.alimento}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            alert.risco === "alto" 
                              ? "bg-red-500/20 text-red-600" 
                              : alert.risco === "medio"
                              ? "bg-yellow-500/20 text-yellow-600"
                              : "bg-orange-500/20 text-orange-600"
                          }`}>
                            {alert.risco === "alto" ? "Alto risco" : alert.risco === "medio" ? "Médio risco" : "Baixo risco"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <strong>Intolerância:</strong> {alert.intolerancia}
                        </p>
                        <p className="text-xs text-muted-foreground">{alert.motivo}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Individual items */}
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
                <Card className="glass-card border-yellow-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="w-5 h-5" />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {labelAnalysis.alertas.map((alert, index) => (
                      <div key={index} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-foreground">
                        {alert}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Suspicious ingredients */}
              {labelAnalysis.ingredientes_suspeitos && labelAnalysis.ingredientes_suspeitos.length > 0 && (
                <Card className="glass-card border-red-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-600">
                      <ShieldX className="w-5 h-5" />
                      Ingredientes Suspeitos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {labelAnalysis.ingredientes_suspeitos.map((ing, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-sm font-medium">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All ingredients analyzed */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Ingredientes Analisados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {labelAnalysis.ingredientes_analisados.map((ing, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{ing.nome}</span>
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
                    <p className="text-sm text-muted-foreground">{labelAnalysis.recomendacao}</p>
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
        </>
      )}
    </div>
  );
}
