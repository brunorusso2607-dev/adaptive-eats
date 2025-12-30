import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Camera, Upload, Loader2, RotateCcw, AlertTriangle, Refrigerator, ChefHat, Clock, UtensilsCrossed, CheckCircle2, CircleAlert, CircleDashed, X, Bookmark, User, ChevronDown, ShieldCheck, ShieldAlert, Cat, Package, ImageOff, Lightbulb, SkipForward, Snowflake, DoorOpen } from "lucide-react";
import AnalysisFeedbackButton from "./AnalysisFeedbackButton";
import LegalDisclaimer from "./LegalDisclaimer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  required: boolean;
};

type AnalysisStep = "capture" | "validating" | "analyzing" | "ingredients" | "recipes";
type CapturePhase = "initial" | "porta";
type InvalidImageError = {
  categoria: string;
  descricao: string;
  mensagem: string;
  dica?: string;
  slotId: "geladeira" | "freezer" | "porta";
};

export default function FridgeScanner() {
  const [slots, setSlots] = useState<FridgeSlot[]>([
    { id: "geladeira", label: "Interior", description: "Geladeira + Freezer abertos", image: null, required: true },
    { id: "porta", label: "Portas", description: "Porta da geladeira + porta do freezer", image: null, required: false },
  ]);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("initial");
  const [currentStep, setCurrentStep] = useState<AnalysisStep>("capture");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [analysis, setAnalysis] = useState<FridgeAnalysis | null>(null);
  const [categoryError, setCategoryError] = useState<{
    categoria: string;
    descricao: string;
    mensagem: string;
    dica?: string;
  } | null>(null);
  const [invalidImageError, setInvalidImageError] = useState<InvalidImageError | null>(null);
  const [savingRecipeIndex, setSavingRecipeIndex] = useState<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<FridgeSlot["id"] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const interiorSlot = slots.find(s => s.id === "geladeira");
  const portaSlot = slots.find(s => s.id === "porta");
  const hasInteriorPhoto = interiorSlot?.image !== null;
  const photoCount = slots.filter(slot => slot.image !== null).length;

  // Smooth transition helper
  const transitionToPhase = useCallback((newPhase: CapturePhase) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCapturePhase(newPhase);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  }, []);

  // Auto-advance to next phase after capturing AND validating initial photo
  useEffect(() => {
    if (capturePhase === "initial" && hasInteriorPhoto && pendingSlot === null && !isValidating && !invalidImageError) {
      // Don't auto-advance - the validation flow handles this
    }
  }, [hasInteriorPhoto, capturePhase, pendingSlot, isValidating, invalidImageError, transitionToPhase]);

  // Quick validation of a single image
  const validateSingleImage = async (imageBase64: string, slotId: FridgeSlot["id"]): Promise<boolean> => {
    setIsValidating(true);
    setInvalidImageError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("analyze-fridge-photo", {
        body: { 
          imageBase64,
          additionalImages: [],
          areas: [slotId === "geladeira" ? "Geladeira" : slotId === "freezer" ? "Freezer" : "Porta"]
        },
      });

      if (error) throw error;

      // Check if image is invalid (not a fridge/freezer/pantry)
      if (data.categoryError || data.notFridge) {
        // Haptic feedback for invalid image
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]); // Short double vibration pattern
        }
        
        setInvalidImageError({
          categoria: data.categoria_detectada || "unknown",
          descricao: data.objeto_identificado || "",
          mensagem: data.message || "Esta imagem não parece ser de uma geladeira.",
          dica: data.dica,
          slotId
        });
        return false;
      }

      // Image is valid - store the analysis for later if this is the main photo
      if (slotId === "geladeira" && data.analysis) {
        // We'll re-analyze with all photos later, but this confirms it's a valid fridge photo
      }
      
      return true;
    } catch (error) {
      console.error("Error validating image:", error);
      toast.error("Erro ao validar imagem. Tente novamente.");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Process image after it's read
  const processImage = useCallback(async (base64: string, slotId: FridgeSlot["id"]) => {
    console.log("[FRIDGE] processImage called for slot:", slotId);
    
    // Set to validating state with the image preview
    setSlots(prev => prev.map(slot => 
      slot.id === slotId ? { ...slot, image: base64 } : slot
    ));
    setCurrentStep("validating");
    
    const isValid = await validateSingleImage(base64, slotId);
    
    if (isValid) {
      // Image is valid, proceed to next phase
      setCurrentStep("capture");
      setPendingSlot(null);
      
      const slotLabel = slotId === "geladeira" ? "Interior" : "Portas";
      toast.success(`${slotLabel} identificado!`);
      
      if (slotId === "geladeira") {
        transitionToPhase("porta");
      } else if (slotId === "porta") {
        // All photos taken, start analysis
        setTimeout(() => startAnalysis(), 300);
      }
    } else {
      // Image is invalid - remove it and stay in capture mode
      setSlots(prev => prev.map(slot => 
        slot.id === slotId ? { ...slot, image: null } : slot
      ));
      setCurrentStep("capture");
      setPendingSlot(null);
      // invalidImageError will be set by validateSingleImage
    }
  }, [validateSingleImage, transitionToPhase]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const currentPendingSlot = pendingSlot;
    
    console.log("[FRIDGE] handleFileSelect called", { file: !!file, pendingSlot: currentPendingSlot, capturePhase });
    
    if (!file) {
      console.log("[FRIDGE] No file selected");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }
    
    // Determine slot - use pendingSlot if available, otherwise infer from phase
    const targetSlot = currentPendingSlot || (
      capturePhase === "initial" ? "geladeira" : "porta"
    );
    
    console.log("[FRIDGE] Target slot determined:", targetSlot);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      await processImage(base64, targetSlot);
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
    setPendingSlot(slotId);
    cameraInputRef.current?.click();
  };

  const openGallery = (slotId: FridgeSlot["id"]) => {
    setPendingSlot(slotId);
    fileInputRef.current?.click();
  };

  const skipPhase = () => {
    if (capturePhase === "porta") {
      startAnalysis();
    }
  };

  const startAnalysis = async () => {
    const photosToAnalyze = slots.filter(slot => slot.image);
    if (photosToAnalyze.length === 0) {
      toast.error("Tire pelo menos uma foto");
      return;
    }

    setCurrentStep("analyzing");
    setIsAnalyzing(true);
    setCategoryError(null);
    
    try {
      const images = photosToAnalyze.map(slot => ({ 
        area: slot.label, 
        imageBase64: slot.image 
      }));

      const { data, error } = await supabase.functions.invoke("analyze-fridge-photo", {
        body: { 
          imageBase64: images[0].imageBase64,
          additionalImages: images.slice(1).map(img => img.imageBase64),
          areas: images.map(img => img.area)
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.categoryError || data.notFridge) {
        if (data.categoryError && data.categoria_detectada) {
          setCategoryError({
            categoria: data.categoria_detectada,
            descricao: data.objeto_identificado || "",
            mensagem: data.message || "Esta imagem não parece ser de uma geladeira ou despensa.",
            dica: data.dica
          });
        } else {
          setCategoryError({
            categoria: "unknown",
            descricao: "",
            mensagem: data.message || "Não foi possível identificar uma geladeira ou despensa na imagem.",
          });
        }
        setCurrentStep("capture");
        setCapturePhase("initial");
        return;
      }

      setAnalysis({
        ...data.analysis,
        receitas_sugeridas: data.analysis.receitas_sugeridas || []
      });
      setCurrentStep("ingredients");
      toast.success("Ingredientes identificados!");
    } catch (error) {
      console.error("Error analyzing fridge:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar fotos");
      setCurrentStep("capture");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRecipes = async () => {
    if (!analysis) return;
    
    setIsGeneratingRecipes(true);
    
    try {
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

      const complexityValue = recipe.dificuldade === "fácil" ? "rapida" as const : 
                              recipe.dificuldade === "média" ? "equilibrada" as const : 
                              "elaborada" as const;

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
      { id: "geladeira", label: "Interior", description: "Geladeira + Freezer abertos", image: null, required: true },
      { id: "porta", label: "Portas", description: "Porta da geladeira + porta do freezer", image: null, required: false },
    ]);
    setCapturePhase("initial");
    setAnalysis(null);
    setCurrentStep("capture");
    setCategoryError(null);
    setInvalidImageError(null);
    setPendingSlot(null);
    setIsValidating(false);
  };

  const retryCapture = () => {
    // Stay in the current phase - just clear the error to retry
    const currentSlot = invalidImageError?.slotId;
    setInvalidImageError(null);
    
    // Set the correct phase based on which slot had the error
    if (currentSlot === "geladeira") {
      setCapturePhase("initial");
    } else if (currentSlot === "porta") {
      setCapturePhase("porta");
    }
  };

  const getCategoryFeedback = (categoria: string) => {
    switch (categoria) {
      case "pessoa_corpo":
        return {
          icon: <User className="w-8 h-8 text-indigo-500 stroke-[1.5]" />,
          bgColor: "bg-indigo-500/10",
          borderColor: "border-indigo-500/30",
          title: "Ops! Isso não é uma geladeira 😅",
          subtitle: "Parece ser uma pessoa ou parte do corpo"
        };
      case "animal_pet":
        return {
          icon: <Cat className="w-8 h-8 text-purple-500 stroke-[1.5]" />,
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          title: "Que fofura! 🐾",
          subtitle: "Mas preciso ver o interior da sua geladeira"
        };
      case "prato_comida":
        return {
          icon: <UtensilsCrossed className="w-8 h-8 text-orange-500 stroke-[1.5]" />,
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          title: "Prato de Comida Detectado 🍽️",
          subtitle: "Use o modo 'Foto do Prato' para analisar refeições"
        };
      case "objeto_domestico":
        return {
          icon: <Package className="w-8 h-8 text-blue-500 stroke-[1.5]" />,
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          title: "Objeto Detectado",
          subtitle: "Preciso ver o interior da sua geladeira"
        };
      case "paisagem_ambiente":
        return {
          icon: <ImageOff className="w-8 h-8 text-cyan-500 stroke-[1.5]" />,
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          title: "Ambiente Detectado",
          subtitle: "Abra a geladeira e fotografe o interior"
        };
      case "documento_tela":
        return {
          icon: <Package className="w-8 h-8 text-gray-500 stroke-[1.5]" />,
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/30",
          title: "Documento ou Tela",
          subtitle: "Use o modo 'Rótulo' para analisar rótulos de produtos"
        };
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500 stroke-[1.5]" />,
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          title: "Não Reconhecido",
          subtitle: "Não consegui identificar uma geladeira nesta imagem"
        };
    }
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

  // Illustration guide component
  const PhotoGuide = ({ type }: { type: "geladeira" | "porta" }) => {
    const guides = {
      geladeira: {
        icon: <Refrigerator className="w-12 h-12 text-primary" />,
        title: "Interior Geladeira + Freezer",
        tips: [
          "Abra as duas portas (geladeira e freezer)",
          "Fotografe as prateleiras internas de ambos",
          "Certifique-se de boa iluminação"
        ]
      },
      porta: {
        icon: <DoorOpen className="w-12 h-12 text-amber-500" />,
        title: "Portas da Geladeira + Freezer",
        tips: [
          "Fotografe os compartimentos das portas",
          "Ovos, molhos, condimentos, laticínios",
          "Inclua porta do freezer se tiver itens"
        ]
      }
    };

    const guide = guides[type];

    return (
      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center shadow-sm flex-shrink-0">
            {guide.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm mb-1.5">{guide.title}</h4>
            <ul className="space-y-1">
              {guide.tips.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Lightbulb className="w-3 h-3 mt-0.5 text-primary/70 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Step: Capture photos with sequential flow
  if (currentStep === "capture") {
    return (
      <div className="space-y-4">
        {renderHiddenInputs()}
        
        {/* Header */}
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Geladeira Inteligente</h2>
          <p className="text-sm text-muted-foreground">
            {capturePhase === "initial" 
              ? "Fotografe o interior da geladeira e freezer"
              : "Deseja adicionar foto das portas?"
            }
          </p>
        </div>

        {/* Progress indicator - only show after first photo */}
        {hasInteriorPhoto && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              interiorSlot?.image ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {interiorSlot?.image ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div className={`w-6 h-0.5 ${capturePhase !== "initial" ? 'bg-primary/50' : 'bg-muted'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              portaSlot?.image ? 'bg-primary text-primary-foreground' : 
              capturePhase === "porta" ? 'bg-primary/20 text-primary ring-2 ring-primary' : 
              'bg-muted text-muted-foreground'
            }`}>
              {portaSlot?.image ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
          </div>
        )}

        {/* Category error display */}
        {categoryError && (
          <Card className={`glass-card border-2 ${getCategoryFeedback(categoryError.categoria).borderColor}`}>
            <CardContent className="p-5">
              <div className={`flex flex-col items-center gap-4 text-center p-4 rounded-xl ${getCategoryFeedback(categoryError.categoria).bgColor}`}>
                <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center shadow-md">
                  {getCategoryFeedback(categoryError.categoria).icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {getCategoryFeedback(categoryError.categoria).title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryFeedback(categoryError.categoria).subtitle}
                  </p>
                  {categoryError.descricao && (
                    <div className="mt-2 px-3 py-1.5 bg-background/50 rounded-lg inline-block">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Identificado:</span> {categoryError.descricao}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {categoryError.mensagem}
                </p>
                {categoryError.dica && (
                  <p className="text-xs text-muted-foreground italic">
                    💡 {categoryError.dica}
                  </p>
                )}
                <Button
                  variant="default"
                  onClick={resetAll}
                  className="mt-2 gradient-primary"
                  size="lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invalid image error display (validation error) */}
        {invalidImageError && (
          <Card className={`glass-card border-2 ${getCategoryFeedback(invalidImageError.categoria).borderColor} animate-scale-in`}>
            <CardContent className="p-5">
              <div className={`flex flex-col items-center gap-4 text-center p-4 rounded-xl ${getCategoryFeedback(invalidImageError.categoria).bgColor}`}>
                {/* Show which area had the error */}
                {invalidImageError.slotId !== "geladeira" && (
                  <div className="px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary">
                    Foto do {invalidImageError.slotId === "freezer" ? "Freezer" : "Porta"}
                  </div>
                )}
                <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center shadow-md">
                  {getCategoryFeedback(invalidImageError.categoria).icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {getCategoryFeedback(invalidImageError.categoria).title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryFeedback(invalidImageError.categoria).subtitle}
                  </p>
                  {invalidImageError.descricao && (
                    <div className="mt-2 px-3 py-1.5 bg-background/50 rounded-lg inline-block">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Identificado:</span> {invalidImageError.descricao}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {invalidImageError.mensagem}
                </p>
                {invalidImageError.dica && (
                  <p className="text-xs text-muted-foreground italic">
                    💡 {invalidImageError.dica}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="default"
                    onClick={retryCapture}
                    className="gradient-primary"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Tirar Nova Foto
                  </Button>
                  {invalidImageError.slotId !== "geladeira" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInvalidImageError(null);
                        startAnalysis();
                      }}
                      size="lg"
                    >
                      <SkipForward className="w-5 h-5 mr-2" />
                      Pular
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase: Initial - Take main fridge photo */}
        {capturePhase === "initial" && !categoryError && !invalidImageError && (
          <Card className={cn(
            "glass-card transition-all duration-300",
            isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100 animate-fade-in"
          )}>
            <CardContent className="p-6 space-y-4">
              <PhotoGuide type="geladeira" />
              
              <div className="space-y-3">
                <Button
                  className="w-full gradient-primary h-14"
                  onClick={() => openCamera("geladeira")}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Tirar Foto do Interior
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => openGallery("geladeira")}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Escolher da Galeria
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase: Porta - Optional door photo */}
        {capturePhase === "porta" && !categoryError && (
          <div className={cn(
            "space-y-3 transition-all duration-300",
            isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-fade-in"
          )}>
            {/* Show captured photo */}
            <div className="flex gap-2 animate-scale-in">
              {interiorSlot?.image && (
                <div className="relative aspect-video w-24 rounded-lg overflow-hidden border-2 border-primary/50 shadow-md">
                  <img src={interiorSlot.image} alt="Interior" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <p className="text-[9px] text-white font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Interior
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <PhotoGuide type="porta" />
                
                <div className="space-y-2">
                  <Button
                    className="w-full gradient-primary h-12"
                  onClick={() => openCamera("porta")}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Fotografar Portas
                </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full h-10 text-muted-foreground"
                    onClick={skipPhase}
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Analisar com {photoCount} foto{photoCount > 1 ? 's' : ''}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          📸 Quanto mais áreas fotografar, melhores as sugestões de receitas
        </p>
      </div>
    );
  }

  // Step: Validating (checking if photo is a fridge)
  if (currentStep === "validating") {
    return (
      <div className="space-y-4">
        {renderHiddenInputs()}
        
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Verificando foto...</h2>
          <p className="text-sm text-muted-foreground">
            Confirmando que é uma foto de geladeira
          </p>
        </div>

        <Card className="glass-card">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl bg-muted/50 overflow-hidden border-2 border-primary/30">
                {interiorSlot?.image && (
                  <img 
                    src={interiorSlot.image} 
                    alt="Verificando" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-lg">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-1.5 mt-2">
              <p className="font-medium text-foreground flex items-center gap-2 justify-center">
                <Refrigerator className="w-4 h-4 text-primary" />
                Validando imagem
              </p>
              <p className="text-sm text-muted-foreground">
                Verificando se a foto mostra o interior da geladeira...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: Analyzing
  if (currentStep === "analyzing") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Analisando...</h2>
          <p className="text-sm text-muted-foreground">
            Identificando ingredientes na sua geladeira
          </p>
        </div>

        <Card className="glass-card">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Refrigerator className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">Analisando {photoCount} foto{photoCount > 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">
                Identificando ingredientes e verificando suas restrições...
              </p>
            </div>

            {/* Show captured photos */}
            <div className="flex gap-2 mt-2">
              {slots.filter(s => s.image).map((slot) => (
                <div key={slot.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={slot.image!} alt={slot.label} className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Show ingredients
  if (currentStep === "ingredients" && analysis) {
    const healthyIngredients = analysis.ingredientes_identificados.filter(ing => !ing.alerta_seguranca);
    const attentionIngredients = analysis.ingredientes_identificados.filter(ing => ing.alerta_seguranca);

    const renderIngredientItem = (ing: FridgeIngredient, index: number, isAttention: boolean) => (
      <div
        key={index}
        className={`p-3 rounded-lg ${
          isAttention 
            ? "bg-amber-500/5 border border-amber-500/20" 
            : "bg-green-500/5 border border-green-500/20"
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
                    : "bg-amber-500/20 text-amber-600"
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
              <p className="text-xs text-amber-600 mt-1.5 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {ing.alerta_seguranca}
              </p>
            )}
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Section 1: Healthy Products */}
        {healthyIngredients.length > 0 && (
          <Collapsible defaultOpen>
            <Card className="glass-card border-green-500/30">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-600">
                    <ShieldCheck className="w-5 h-5" />
                    Produtos Saudáveis ({healthyIngredients.length})
                    <ChevronDown className="w-4 h-4 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2 pt-0">
                  {healthyIngredients.map((ing, index) => renderIngredientItem(ing, index, false))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Section 2: Products Needing Attention */}
        {attentionIngredients.length > 0 && (
          <Collapsible defaultOpen>
            <Card className="glass-card border-amber-500/30">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                    <ShieldAlert className="w-5 h-5" />
                    Requer Atenção ({attentionIngredients.length})
                    <ChevronDown className="w-4 h-4 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2 pt-0">
                  {attentionIngredients.map((ing, index) => renderIngredientItem(ing, index, true))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Section 3: General Safety Alerts */}
        {analysis.alertas_gerais && analysis.alertas_gerais.length > 0 && (
          <Card className="glass-card border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Alertas Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {analysis.alertas_gerais.map((alerta, index) => (
                <div key={index} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <p className="text-sm text-red-600">{alerta}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Generate Recipes Button */}
        <Button
          onClick={generateRecipes}
          disabled={isGeneratingRecipes}
          className="w-full gradient-primary h-14"
          size="lg"
        >
          {isGeneratingRecipes ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Gerando Receitas...
            </>
          ) : (
            <>
              <ChefHat className="w-5 h-5 mr-2" />
              Ver Receitas Sugeridas
            </>
          )}
        </Button>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetAll}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nova Análise
          </Button>
          <AnalysisFeedbackButton
            analysisType="fridge"
            analysisData={analysis}
          />
        </div>

        <LegalDisclaimer />
      </div>
    );
  }

  // Step 3: Show recipes
  if (currentStep === "recipes" && analysis) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Receitas para Você</h2>
          <p className="text-sm text-muted-foreground">
            Baseadas nos ingredientes da sua geladeira e seu perfil
          </p>
        </div>

        {analysis.receitas_sugeridas.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Não foi possível gerar receitas com os ingredientes disponíveis.
              </p>
              <Button
                variant="outline"
                onClick={() => setCurrentStep("ingredients")}
                className="mt-4"
              >
                Ver Ingredientes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analysis.receitas_sugeridas.map((recipe, index) => (
              <Card key={index} className="glass-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{recipe.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{recipe.descricao}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => saveRecipe(recipe, index)}
                      disabled={savingRecipeIndex === index}
                      className="flex-shrink-0"
                    >
                      {savingRecipeIndex === index ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {recipe.tempo_preparo}min
                    </span>
                    <span className="flex items-center gap-1">
                      <UtensilsCrossed className="w-4 h-4" />
                      {recipe.dificuldade}
                    </span>
                    <span className="flex items-center gap-1">
                      🔥 {recipe.calorias_estimadas}kcal
                    </span>
                  </div>

                  {/* Alert if any */}
                  {recipe.alerta_receita && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-600 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {recipe.alerta_receita}
                      </p>
                    </div>
                  )}

                  {/* Ingredients */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Ingredientes da sua geladeira:</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredientes_da_geladeira.map((ing, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                          {ing}
                        </span>
                      ))}
                    </div>
                    {recipe.ingredientes_extras.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground mt-3 mb-2">Você vai precisar também:</p>
                        <div className="flex flex-wrap gap-1">
                          {recipe.ingredientes_extras.map((ing, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              {ing}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Instructions */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <ChevronDown className="w-4 h-4" />
                      Ver instruções
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <ol className="space-y-2">
                        {recipe.instrucoes_resumidas.map((step, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStep("ingredients")}
            className="flex-1"
          >
            Ver Ingredientes
          </Button>
          <Button
            variant="outline"
            onClick={resetAll}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nova Análise
          </Button>
        </div>

        <LegalDisclaimer />
      </div>
    );
  }

  return null;
}
