import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Loader2, RotateCcw, Flame, Beef, Wheat, Droplets, AlertCircle, ScanBarcode, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Refrigerator, ArrowRight, Target, TrendingDown, TrendingUp, HelpCircle, Leaf, Package, Cat, User, FileText, ImageOff, Check, Pencil, UtensilsCrossed } from "lucide-react";
import AnalysisFeedbackButton from "./AnalysisFeedbackButton";
import LegalDisclaimer from "./LegalDisclaimer";
import FoodItemEditor from "./FoodItemEditor";
import RegisterMealFromPhotoSheet from "./RegisterMealFromPhotoSheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import FridgeScanner from "./FridgeScanner";

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
  corrigido_manualmente?: boolean;
  correcao_aplicada?: boolean; // Auto-correction was applied from saved corrections
  correcao_tipo?: "exact" | "fuzzy"; // Type of correction match
  correcao_similaridade?: number; // Similarity percentage for fuzzy matches
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

type PratoIdentificado = {
  nome?: string;
  culinaria?: string;
  descricao_curta?: string;
  confianca?: "alta" | "media" | "baixa";
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
  prato_identificado?: PratoIdentificado;
  perguntas_seguranca?: string[];
};

type PersonalizedAlert = {
  ingrediente: string;
  restricao: string;
  status: "seguro" | "risco_potencial" | "contem";
  mensagem: string;
  icone: string;
};

type PerfilUsuarioAplicado = {
  intolerances: string[];
  dietary_preference: string;
  alertas_personalizados: PersonalizedAlert[];
  resumo: string;
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

interface FoodPhotoAnalyzerProps {
  initialMode?: AnalysisMode;
  hideModeTabs?: boolean;
}

export default function FoodPhotoAnalyzer({ initialMode = "food", hideModeTabs = false }: FoodPhotoAnalyzerProps) {
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [metaDiaria, setMetaDiaria] = useState<MetaDiaria | null>(null);
  const [labelAnalysis, setLabelAnalysis] = useState<LabelAnalysis | null>(null);
  const [perfilAplicado, setPerfilAplicado] = useState<PerfilUsuarioAplicado | null>(null);
  const [correcoesAplicadas, setCorrecoesAplicadas] = useState<{
    total: number;
    exatas?: number;
    fuzzy?: number;
    detalhes?: string[];
    matches?: Array<{
      original: string;
      matched: string;
      similarity: number;
      matchType: string;
    }>;
    // Legacy fields for backwards compatibility
    quantidade?: number;
    itens?: string[];
    mensagem?: string;
  } | null>(null);
  const [notFoodError, setNotFoodError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<{
    categoria: string;
    descricao: string;
    mensagem: string;
  } | null>(null);
  
  // Label two-step flow
  const [labelStep, setLabelStep] = useState<LabelStep>("front");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [needsBackPhoto, setNeedsBackPhoto] = useState(false);
  const [backPhotoReason, setBackPhotoReason] = useState<{
    mensagem: string;
    motivo: string;
    intolerancia: string;
    produto: string;
  } | null>(null);
  
  // Register meal from photo sheet
  const [registerMealOpen, setRegisterMealOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Recalculate totals when food items are edited
  const recalculateTotals = useCallback((alimentos: FoodItem[]) => {
    const totals = alimentos.reduce(
      (acc, food) => ({
        calorias_totais: acc.calorias_totais + food.calorias,
        proteinas_totais: acc.proteinas_totais + food.macros.proteinas,
        carboidratos_totais: acc.carboidratos_totais + food.macros.carboidratos,
        gorduras_totais: acc.gorduras_totais + food.macros.gorduras,
      }),
      { calorias_totais: 0, proteinas_totais: 0, carboidratos_totais: 0, gorduras_totais: 0 }
    );
    return {
      calorias_totais: Math.round(totals.calorias_totais),
      proteinas_totais: Math.round(totals.proteinas_totais * 10) / 10,
      carboidratos_totais: Math.round(totals.carboidratos_totais * 10) / 10,
      gorduras_totais: Math.round(totals.gorduras_totais * 10) / 10,
    };
  }, []);

  // Save food correction to database
  const saveFoodCorrection = useCallback(async (
    originalFood: FoodItem, 
    correctedFood: FoodItem, 
    correctionType: 'manual' | 'alternative_selected',
    alternativeSelected?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('food_corrections').insert({
        user_id: user.id,
        original_item: originalFood.item,
        original_porcao: originalFood.porcao_estimada,
        original_calorias: originalFood.calorias,
        original_proteinas: originalFood.macros.proteinas,
        original_carboidratos: originalFood.macros.carboidratos,
        original_gorduras: originalFood.macros.gorduras,
        original_confianca: originalFood.confianca_identificacao,
        original_culinaria: originalFood.culinaria_origem,
        corrected_item: correctedFood.item,
        corrected_porcao: correctedFood.porcao_estimada,
        corrected_calorias: correctedFood.calorias,
        corrected_proteinas: correctedFood.macros.proteinas,
        corrected_carboidratos: correctedFood.macros.carboidratos,
        corrected_gorduras: correctedFood.macros.gorduras,
        correction_type: correctionType,
        alternative_selected: alternativeSelected,
        dish_context: foodAnalysis?.prato_identificado?.nome,
        cuisine_origin: correctedFood.culinaria_origem,
      });
      
      console.log('Food correction saved successfully');
    } catch (error) {
      console.error('Error saving food correction:', error);
    }
  }, [foodAnalysis?.prato_identificado?.nome]);

  // Handle food item edit
  const handleFoodItemSave = useCallback((index: number, updatedFood: FoodItem) => {
    if (!foodAnalysis) return;
    
    const originalFood = foodAnalysis.alimentos[index];
    const newAlimentos = [...foodAnalysis.alimentos];
    newAlimentos[index] = updatedFood;
    
    const newTotals = recalculateTotals(newAlimentos);
    
    setFoodAnalysis({
      ...foodAnalysis,
      alimentos: newAlimentos,
      total_geral: newTotals,
    });

    // Update meta diária if exists
    if (metaDiaria) {
      const newCaloriasRefeicao = newTotals.calorias_totais;
      const newCaloriasRestantes = metaDiaria.meta_calorica_diaria - newCaloriasRefeicao;
      const newPercentual = Math.round((newCaloriasRefeicao / metaDiaria.meta_calorica_diaria) * 100);
      
      setMetaDiaria({
        ...metaDiaria,
        calorias_esta_refeicao: newCaloriasRefeicao,
        calorias_restantes: newCaloriasRestantes,
        percentual_consumido: newPercentual,
        status: newPercentual <= 30 ? 'leve' : newPercentual <= 50 ? 'moderado' : newPercentual <= 75 ? 'substancial' : 'pesado',
      });
    }

    // Save correction to database
    saveFoodCorrection(originalFood, updatedFood, 'manual');

    toast.success("Alimento corrigido e salvo!");
  }, [foodAnalysis, metaDiaria, recalculateTotals, saveFoodCorrection]);

  // Handle selecting alternative food name
  const handleSelectAlternative = useCallback((index: number, alternativeName: string) => {
    if (!foodAnalysis) return;
    
    const originalFood = foodAnalysis.alimentos[index];
    const updatedFood: FoodItem = {
      ...originalFood,
      item: alternativeName,
      corrigido_manualmente: true,
      confianca_identificacao: "alta",
      alternativas_possiveis: originalFood.alternativas_possiveis?.filter(alt => alt !== alternativeName),
    };
    
    // Save to database with alternative_selected type
    saveFoodCorrection(originalFood, updatedFood, 'alternative_selected', alternativeName);
    
    // Update local state
    const newAlimentos = [...foodAnalysis.alimentos];
    newAlimentos[index] = updatedFood;
    
    const newTotals = recalculateTotals(newAlimentos);
    
    setFoodAnalysis({
      ...foodAnalysis,
      alimentos: newAlimentos,
      total_geral: newTotals,
    });

    toast.success("Alternativa selecionada e salva!");
  }, [foodAnalysis, saveFoodCorrection, recalculateTotals]);
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
      setBackPhotoReason(null);
      
      // Auto-analyze for food mode - skip the extra confirmation step
      if (mode === "food") {
        // Small delay to let the image preview render first
        setTimeout(() => {
          analyzeImageWithBase64(base64);
        }, 100);
      }
      
      // Auto-analyze for label mode - analyze immediately after photo
      if (mode === "label") {
        setTimeout(() => {
          analyzeLabelWithBase64(base64, labelStep);
        }, 100);
      }
    };
    reader.readAsDataURL(file);
  };

  // Separate function to analyze with a specific base64 image
  const analyzeImageWithBase64 = async (base64Image: string) => {
    setIsAnalyzing(true);
    setNotFoodError(null);
    setCategoryError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("analyze-food-photo", {
        body: { imageBase64: base64Image },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Handle structured category error with detailed feedback
      if (data.categoryError || data.notFood) {
        if (data.categoryError && data.categoria_detectada) {
          setCategoryError({
            categoria: data.categoria_detectada,
            descricao: data.objeto_identificado || "",
            mensagem: data.message || "Não consegui identificar comida nesta imagem."
          });
        } else {
          setNotFoodError(data.message || "Não foi possível identificar alimentos na imagem.");
        }
        return;
      }

      setFoodAnalysis(data.analysis);
      setMetaDiaria(data.meta_diaria || null);
      setPerfilAplicado(data.perfil_usuario_aplicado || null);
      setCorrecoesAplicadas(data.correcoes_aplicadas || null);
      
      // Show toast about corrections applied
      const corrections = data.correcoes_aplicadas;
      const totalCorrections = corrections?.total || corrections?.quantidade || 0;
      
      if (totalCorrections > 0) {
        const fuzzyCount = corrections?.fuzzy || 0;
        const exactCount = corrections?.exatas || 0;
        
        let description = "Baseado em feedbacks anteriores";
        if (fuzzyCount > 0 && exactCount > 0) {
          description = `${exactCount} exata(s), ${fuzzyCount} similar(es)`;
        } else if (fuzzyCount > 0) {
          description = `${fuzzyCount} correspondência(s) por similaridade`;
        }
        
        toast.success(`${totalCorrections} correção(ões) aplicada(s) automaticamente!`, {
          description,
          duration: 4000,
        });
      } else {
        toast.success("Análise concluída!");
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar imagem");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Separate function to analyze label with a specific base64 image
  const analyzeLabelWithBase64 = async (base64Image: string, step: LabelStep) => {
    setIsAnalyzing(true);
    setNotFoodError(null);
    setCategoryError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("analyze-label-photo", {
        body: { 
          imageBase64: base64Image,
          step: step 
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Handle rate limit from backend
      if (data.rateLimited) {
        toast.warning(data.error || "Limite atingido. Aguarde 30 segundos.", {
          duration: 5000,
        });
        return;
      }

      // Handle needsBackPhoto from backend (intelligent detection)
      if (data.needsBackPhoto) {
        console.log("[FoodPhotoAnalyzer] Backend requested second photo", data);
        
        // Store dynamic reason from the AI FIRST
        const analysisData = data.analysis || {};
        const reason = {
          mensagem: analysisData.mensagem_segunda_foto || data.message || "Para sua segurança, tire uma foto da tabela de ingredientes.",
          motivo: analysisData.motivo_duvida || "Não foi possível confirmar todos os ingredientes",
          intolerancia: analysisData.intolerancia_em_duvida || "",
          produto: analysisData.produto_identificado || "produto"
        };
        
        // Set all states for the back photo step
        // IMPORTANT: Clear perfilAplicado to avoid showing preliminary "VERIFICAR" alerts
        setPerfilAplicado(null);
        setBackPhotoReason(reason);
        setFrontImage(base64Image);
        setNeedsBackPhoto(true);
        setLabelStep("back");
        setImagePreview(null);
        
        toast.info(reason.mensagem, {
          duration: 5000,
        });
        return;
      }

      if (data.qualityIssue) {
        setNotFoodError(data.message || "A imagem está difícil de ler. Tente uma foto mais nítida.");
        return;
      }

      // Handle category validation errors with dynamic feedback
      if (data.categoryError) {
        setCategoryError({
          categoria: data.categoria_detectada || "desconhecido",
          descricao: data.descricao_objeto || "",
          mensagem: data.message || "Não foi possível identificar um produto alimentício."
        });
        return;
      }

      if (data.notLabel) {
        setNotFoodError(data.message || "Não foi possível identificar um rótulo de ingredientes na imagem.");
        return;
      }

      setLabelAnalysis(data.analysis);
      setPerfilAplicado(data.perfil_usuario_aplicado || null);
      setLabelStep("complete");
      toast.success("Verificação concluída!");
    } catch (error) {
      console.error("Error analyzing label:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar rótulo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeImage = async () => {
    if (!imagePreview) {
      toast.error("Tire ou selecione uma foto primeiro");
      return;
    }

    setIsAnalyzing(true);
    setNotFoodError(null);
    setCategoryError(null);
    
    try {
      if (mode === "food") {
        const { data, error } = await supabase.functions.invoke("analyze-food-photo", {
          body: { imageBase64: imagePreview },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // NEW: Handle structured category error with detailed feedback
        if (data.categoryError || data.notFood) {
          if (data.categoryError && data.categoria_detectada) {
            setCategoryError({
              categoria: data.categoria_detectada,
              descricao: data.objeto_identificado || "",
              mensagem: data.message || "Não consegui identificar comida nesta imagem."
            });
          } else {
            setNotFoodError(data.message || "Não foi possível identificar alimentos na imagem.");
          }
          return;
        }

        setFoodAnalysis(data.analysis);
        setMetaDiaria(data.meta_diaria || null);
        setPerfilAplicado(data.perfil_usuario_aplicado || null);
        setCorrecoesAplicadas(data.correcoes_aplicadas || null);
        
        // Show toast about corrections applied
        const corrections = data.correcoes_aplicadas;
        const totalCorrections = corrections?.total || corrections?.quantidade || 0;
        
        if (totalCorrections > 0) {
          const fuzzyCount = corrections?.fuzzy || 0;
          const exactCount = corrections?.exatas || 0;
          
          let description = "Baseado em feedbacks anteriores";
          if (fuzzyCount > 0 && exactCount > 0) {
            description = `${exactCount} exata(s), ${fuzzyCount} similar(es)`;
          } else if (fuzzyCount > 0) {
            description = `${fuzzyCount} correspondência(s) por similaridade`;
          }
          
          toast.success(`${totalCorrections} correção(ões) aplicada(s) automaticamente!`, {
            description,
            duration: 4000,
          });
        } else {
          toast.success("Análise concluída!");
        }
      } else if (mode === "label") {
        const { data, error } = await supabase.functions.invoke("analyze-label-photo", {
          body: { 
            imageBase64: imagePreview,
            step: labelStep 
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Handle rate limit from backend
        if (data.rateLimited) {
          toast.warning(data.error || "Limite atingido. Aguarde 30 segundos.", {
            duration: 5000,
          });
          return;
        }

        // Handle needsBackPhoto from backend (intelligent detection)
        if (data.needsBackPhoto) {
          console.log("[FoodPhotoAnalyzer] Backend requested second photo", data);
          
          // Store dynamic reason from the AI FIRST
          const analysisData = data.analysis || {};
          const reason = {
            mensagem: analysisData.mensagem_segunda_foto || data.message || "Para sua segurança, tire uma foto da tabela de ingredientes.",
            motivo: analysisData.motivo_duvida || "Não foi possível confirmar todos os ingredientes",
            intolerancia: analysisData.intolerancia_em_duvida || "",
            produto: analysisData.produto_identificado || "produto"
          };
          
          // Set all states for the back photo step
          // IMPORTANT: Clear perfilAplicado to avoid showing preliminary "VERIFICAR" alerts
          setPerfilAplicado(null);
          setBackPhotoReason(reason);
          setFrontImage(imagePreview);
          setNeedsBackPhoto(true);
          setLabelStep("back");
          setImagePreview(null);
          
          toast.info(reason.mensagem, {
            duration: 5000,
          });
          return;
        }

        if (data.qualityIssue) {
          setNotFoodError(data.message || "A imagem está difícil de ler. Tente uma foto mais nítida.");
          return;
        }

        // NEW: Handle category validation errors with dynamic feedback
        if (data.categoryError) {
          setCategoryError({
            categoria: data.categoria_detectada || "desconhecido",
            descricao: data.descricao_objeto || "",
            mensagem: data.message || "Não foi possível identificar um produto alimentício."
          });
          return;
        }

        if (data.notLabel) {
          setNotFoodError(data.message || "Não foi possível identificar um rótulo de ingredientes na imagem.");
          return;
        }

        setLabelAnalysis(data.analysis);
        setPerfilAplicado(data.perfil_usuario_aplicado || null);
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
    setPerfilAplicado(null);
    setCorrecoesAplicadas(null);
    setNotFoodError(null);
    setCategoryError(null);
    setLabelStep("front");
    setFrontImage(null);
    setNeedsBackPhoto(false);
    setBackPhotoReason(null);
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
      setPerfilAplicado(null);
      setCorrecoesAplicadas(null);
      setNotFoodError(null);
      setCategoryError(null);
      setLabelStep("front");
      setFrontImage(null);
      setNeedsBackPhoto(false);
      setBackPhotoReason(null);
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
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3 stroke-[1.5]" /> Contém</span>;
      default:
        return null;
    }
  };

  // Helper para obter ícone e cor baseado na categoria detectada
  const getCategoryFeedback = (categoria: string) => {
    switch (categoria) {
      case "pessoa_corpo":
        return {
          icon: <User className="w-8 h-8 text-indigo-500 stroke-[1.5]" />,
          bgColor: "bg-indigo-500/10",
          borderColor: "border-indigo-500/30",
          title: "Ops! Isso não é comida 😅",
          subtitle: "Parece ser uma pessoa ou parte do corpo"
        };
      case "animal_pet":
        return {
          icon: <Cat className="w-8 h-8 text-purple-500 stroke-[1.5]" />,
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          title: "Que fofura! 🐾",
          subtitle: "Mas preciso de uma foto do seu prato"
        };
      case "objeto_domestico":
        return {
          icon: <Package className="w-8 h-8 text-blue-500 stroke-[1.5]" />,
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          title: "Objeto Detectado",
          subtitle: "Não consegui identificar comida nesta imagem"
        };
      case "paisagem_ambiente":
        return {
          icon: <ImageOff className="w-8 h-8 text-cyan-500 stroke-[1.5]" />,
          bgColor: "bg-cyan-500/10",
          borderColor: "border-cyan-500/30",
          title: "Bela paisagem! 🌅",
          subtitle: "Mas preciso ver seu prato de comida"
        };
      case "documento_tela":
        return {
          icon: <FileText className="w-8 h-8 text-gray-500 stroke-[1.5]" />,
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/30",
          title: "Documento ou Tela",
          subtitle: "Use o modo 'Rótulo' para analisar rótulos de produtos"
        };
      case "veiculo":
        return {
          icon: <Package className="w-8 h-8 text-slate-500 stroke-[1.5]" />,
          bgColor: "bg-slate-500/10",
          borderColor: "border-slate-500/30",
          title: "Veículo Detectado 🚗",
          subtitle: "Isso não parece ser comida"
        };
      case "roupa_acessorio":
        return {
          icon: <Package className="w-8 h-8 text-pink-500 stroke-[1.5]" />,
          bgColor: "bg-pink-500/10",
          borderColor: "border-pink-500/30",
          title: "Roupa ou Acessório 👗",
          subtitle: "Preciso ver uma foto do seu prato"
        };
      case "imagem_abstrata":
        return {
          icon: <ImageOff className="w-8 h-8 text-red-500 stroke-[1.5]" />,
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          title: "Imagem Confusa",
          subtitle: "Não consegui identificar o conteúdo claramente"
        };
      case "planta_decorativa":
        return {
          icon: <Leaf className="w-8 h-8 text-green-500 stroke-[1.5]" />,
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          title: "Planta Detectada 🌿",
          subtitle: "Linda! Mas preciso ver comida"
        };
      default:
        return {
          icon: <AlertCircle className="w-8 h-8 text-yellow-500 stroke-[1.5]" />,
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          title: "Não Reconhecido",
          subtitle: "Não consegui identificar comida nesta imagem"
        };
    }
  };

  const getLabelStepInfo = () => {
    if (labelStep === "front") {
      return {
        title: "Passo 1: Fotografar Rótulo",
        description: "Tire uma foto do rótulo do produto",
        buttonText: "Tirar Foto do Rótulo",
        icon: <ScanBarcode className="w-10 h-10" />
      };
    } else if (labelStep === "back") {
      return {
        title: "Passo 2: Informação Nutricional",
        description: backPhotoReason?.mensagem || "Para sua segurança, tire uma foto da informação nutricional.",
        buttonText: "Tirar Foto da Informação Nutricional",
        icon: <ScanBarcode className="w-10 h-10" />
      };
    }
    return {
      title: "Verificar Rótulo",
      description: "Fotografe o rótulo do produto",
      buttonText: "Tirar Foto do Rótulo",
      icon: <ScanBarcode className="w-10 h-10" />
    };
  };

  // If fridge mode is selected, render the dedicated FridgeScanner component
  if (mode === "fridge") {
    return (
      <div className="space-y-4">
        {!hideModeTabs && (
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
        )}
        
        <FridgeScanner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs - only show when hideModeTabs is false */}
      {!hideModeTabs && (
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
      )}

      {/* Content based on mode */}
      {mode === "food" && (
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">Analisar Foto do Prato</h2>
          <p className="text-sm text-muted-foreground">
            Tire uma foto e verifique suas restrições + calorias
          </p>
        </div>
      )}

      {mode === "label" && (
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-bold text-foreground">{getLabelStepInfo().title}</h2>
          <p className="text-sm text-muted-foreground">
            {getLabelStepInfo().description}
          </p>
          
          {/* Progress indicator for two-step flow */}
          {!labelAnalysis && (
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
      )}

      {/* Show front image preview if in back step - simplified without preliminary alerts */}
      {mode === "label" && labelStep === "back" && frontImage && (
        <>
          <Card className="glass-card border-amber-500/50 bg-amber-500/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <img 
                  src={frontImage} 
                  alt="Frente do produto" 
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground">
                      {backPhotoReason?.produto ? `${backPhotoReason.produto} identificado` : "Produto identificado"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {backPhotoReason?.motivo || "Preciso confirmar os ingredientes para garantir sua segurança"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Texto explicativo adicional para o passo 2 */}
          <p className="text-sm text-muted-foreground text-center px-4">
            Por favor, tire uma foto da informação nutricional que está no verso ou lateral do produto.
          </p>
        </>
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
                ) : mode === "label" ? (
                  <ScanBarcode className="w-10 h-10" />
                ) : (
                  <Camera className="w-10 h-10" />
                )}
                <span className="text-lg font-medium">
                  {mode === "food" 
                    ? "Tirar Foto do Prato" 
                    : mode === "label"
                      ? getLabelStepInfo().buttonText
                      : "Tirar Foto da Geladeira"
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
                : mode === "label"
                  ? (labelStep === "back" 
                      ? "📸 Dica: Fotografe a tabela nutricional bem de perto e com boa iluminação"
                      : "📸 Dica: Fotografe o rótulo frontal do produto com boa iluminação")
                  : "📸 Dica: Fotografe sua geladeira aberta para identificar os ingredientes"
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
            
            {/* Category validation error - dynamic feedback */}
            {categoryError && (
              <CardContent className="p-4">
                <div className={`flex flex-col items-center gap-4 text-center p-5 rounded-xl border-2 ${getCategoryFeedback(categoryError.categoria).bgColor} ${getCategoryFeedback(categoryError.categoria).borderColor}`}>
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
                  <Button
                    variant="default"
                    onClick={resetAnalysis}
                    className="mt-2 gradient-primary"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Tirar Foto do Prato
                  </Button>
                </div>
              </CardContent>
            )}

            {/* Not food/label error message */}
            {notFoodError && !categoryError && (
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

            {!foodAnalysis && !labelAnalysis && !notFoodError && !categoryError && (
              <CardContent className="p-4">
                {/* For food mode: show loading state (analysis starts automatically) */}
                {mode === "food" && isAnalyzing && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analisando seu prato...</p>
                  </div>
                )}
                
                {/* For food mode: show nothing if not analyzing (shouldn't happen, but fallback) */}
                {mode === "food" && !isAnalyzing && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <p className="text-sm text-muted-foreground">Preparando análise...</p>
                  </div>
                )}
                
                {/* For label mode: show loading state (analysis starts automatically) */}
                {mode === "label" && isAnalyzing && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Verificando ingredientes...</p>
                  </div>
                )}
                
                {/* For label mode: show nothing if not analyzing (shouldn't happen, but fallback) */}
                {mode === "label" && !isAnalyzing && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <p className="text-sm text-muted-foreground">Preparando verificação...</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Food Analysis results */}
          {foodAnalysis && (
            <div className="space-y-4 animate-fade-in">
              {/* SAFETY STATUS - Compact card with food name */}
              {perfilAplicado && perfilAplicado.alertas_personalizados.length > 0 && (
                <Card className={`border shadow-sm animate-reveal animate-reveal-1 ${
                  perfilAplicado.alertas_personalizados.some(a => a.status === "contem") 
                    ? "border-destructive/50 bg-destructive/5" 
                    : perfilAplicado.alertas_personalizados.some(a => a.status === "risco_potencial")
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-green-500/50 bg-green-500/5"
                }`}>
                  <CardContent className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      {perfilAplicado.alertas_personalizados.some(a => a.status === "contem") ? (
                        <>
                          <ShieldX className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            {(foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item) && (
                              <p className="font-medium text-foreground text-sm">
                                {foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item}
                              </p>
                            )}
                            <p className="text-xs text-destructive font-medium">Não recomendado</p>
                            <p className="text-xs text-muted-foreground">
                              Contém: {perfilAplicado.alertas_personalizados.filter(a => a.status === "contem").map(a => a.restricao).join(", ")}
                            </p>
                          </div>
                        </>
                      ) : perfilAplicado.alertas_personalizados.some(a => a.status === "risco_potencial") ? (
                        <>
                          <ShieldAlert className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            {(foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item) && (
                              <p className="font-medium text-foreground text-sm">
                                {foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item}
                              </p>
                            )}
                            <p className="text-xs text-yellow-600 font-medium">Verificar antes</p>
                            <p className="text-xs text-muted-foreground">
                              Possível: {perfilAplicado.alertas_personalizados.filter(a => a.status === "risco_potencial").map(a => a.restricao).join(", ")}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            {(foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item) && (
                              <p className="font-medium text-foreground text-sm">
                                {foodAnalysis.prato_identificado?.nome || foodAnalysis.alimentos[0]?.item}
                              </p>
                            )}
                            <p className="text-xs text-green-600 font-medium">Seguro para você</p>
                            <p className="text-xs text-muted-foreground">
                              Compatível com suas restrições
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Confidence card - Gray neutral card below safety status */}
              {foodAnalysis.prato_identificado && (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/50 border border-border animate-reveal animate-reveal-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">🔍 Confiança da análise:</span>
                    <span className={`text-sm font-medium ${
                      foodAnalysis.prato_identificado.confianca === "baixa" 
                        ? "text-yellow-600" 
                        : foodAnalysis.prato_identificado.confianca === "media"
                        ? "text-blue-600"
                        : "text-foreground"
                    }`}>
                      {foodAnalysis.prato_identificado.confianca === "alta" ? "Alta" : 
                       foodAnalysis.prato_identificado.confianca === "media" ? "Média" : "Baixa"}
                    </span>
                  </div>
                  {foodAnalysis.prato_identificado.culinaria && (
                    <span className="text-sm text-muted-foreground">
                      {foodAnalysis.prato_identificado.culinaria}
                    </span>
                  )}
                </div>
              )}

              {/* Total macros card */}
              <Card className="glass-card border-primary/20 animate-reveal animate-reveal-3">
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
                <Card className={`glass-card border animate-reveal animate-reveal-4 ${
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


              {/* Individual items with confidence levels - Now editable */}
              <Card className="glass-card">
                <CardHeader 
                  className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
                  onClick={() => {
                    // Click the first food item's details element to toggle it
                    const firstDetails = document.querySelector('#food-items-list details');
                    if (firstDetails) {
                      (firstDetails as HTMLDetailsElement).open = !(firstDetails as HTMLDetailsElement).open;
                    }
                  }}
                >
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Alimentos Identificados
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Toque para editar
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent id="food-items-list" className="space-y-2">
                  {foodAnalysis.alimentos.map((food, index) => (
                    <FoodItemEditor
                      key={index}
                      food={food}
                      index={index}
                      onSave={handleFoodItemSave}
                      onSelectAlternative={handleSelectAlternative}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Safety questions */}
              {foodAnalysis.perguntas_seguranca && foodAnalysis.perguntas_seguranca.length > 0 && (
                <Card className="glass-card border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                      <HelpCircle className="w-5 h-5" />
                      Pergunte antes de comer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {foodAnalysis.perguntas_seguranca.map((pergunta, index) => (
                      <div key={index} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-foreground flex items-start gap-2">
                        <span className="text-blue-500 font-bold">{index + 1}.</span>
                        <span>{pergunta}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

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

              {/* Legal Disclaimer */}
              <LegalDisclaimer className="mt-2" />

              {/* Discrete feedback link */}
              <div className="flex justify-center">
                <AnalysisFeedbackButton 
                  analysisType="food" 
                  analysisData={{ foodAnalysis, perfilAplicado, metaDiaria }} 
                />
              </div>

              {/* Spacer for fixed footer + bottom nav */}
              <div className="h-36 md:h-24" />

              {/* Fixed Footer with Calories + Actions - positioned above mobile nav */}
              <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 z-40">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                  {/* Calories summary */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-foreground">{foodAnalysis.total_geral.calorias_totais}</span>
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>

                  {/* Action buttons */}
                  <Button
                    onClick={() => setRegisterMealOpen(true)}
                    className="flex-1 gradient-primary"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Registrar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetAnalysis}
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Register Meal Sheet */}
              <RegisterMealFromPhotoSheet
                open={registerMealOpen}
                onOpenChange={setRegisterMealOpen}
                foodAnalysis={foodAnalysis}
                onSuccess={resetAnalysis}
              />
            </div>
          )}

          {/* Label Analysis results - add profile alerts before recommendation */}
          {labelAnalysis && (
            <div className="space-y-4 animate-fade-in">
              {/* Personalized Profile Alerts for Label */}
              {perfilAplicado && perfilAplicado.alertas_personalizados.length > 0 && (
                <Card className={`glass-card border ${
                  perfilAplicado.alertas_personalizados.some(a => a.status === "contem") 
                    ? "border-red-500/30" 
                    : perfilAplicado.alertas_personalizados.some(a => a.status === "risco_potencial")
                    ? "border-yellow-500/30"
                    : "border-green-500/30"
                }`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Verificação do Seu Perfil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm font-medium text-foreground mb-2">{perfilAplicado.resumo}</p>
                    {perfilAplicado.alertas_personalizados.map((alerta, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex items-start gap-2 ${
                          alerta.status === "contem" 
                            ? "bg-red-500/10 border border-red-500/20" 
                            : alerta.status === "risco_potencial"
                            ? "bg-yellow-500/10 border border-yellow-500/20"
                            : "bg-green-500/10 border border-green-500/20"
                        }`}
                      >
                        <span className="text-lg">{alerta.icone}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alerta.restricao}</p>
                          <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

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

              {/* Feedback and Reset buttons */}
              <div className="flex items-center justify-between">
                <AnalysisFeedbackButton 
                  analysisType="label" 
                  analysisData={{ labelAnalysis, perfilAplicado }} 
                />
                <Button
                  variant="outline"
                  onClick={resetAnalysis}
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Novo Rótulo
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
