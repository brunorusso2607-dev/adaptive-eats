import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
  ListChecks,
  Utensils,
  Info,
  RefreshCw,
  Camera,
  Tag,
  Refrigerator,
  ChefHat,
  MessageSquare,
  RotateCcw,
  Upload,
  ImageIcon,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  passed: boolean;
  details?: string;
  severity: 'critical' | 'warning' | 'info';
}

interface ValidationResult {
  success: boolean;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  rules: ValidationRule[];
  generatedMeal?: any;
  generatedOutput?: any;
  promptPreview: string;
  rawAIResponse?: string;
  timestamp: string;
  error?: string;
  categories: Record<string, { total: number; passed: number; failed: number }>;
  moduleId?: string;
  moduleName?: string;
}

// =============================================================================
// MODULE DEFINITIONS
// =============================================================================

const AI_MODULES = [
  { 
    id: 'generate-ai-meal-plan', 
    name: 'Gerador de Plano Alimentar', 
    icon: Utensils,
    description: 'Gera refeições personalizadas com 24+ regras de validação',
    requiresImage: false,
  },
  { 
    id: 'analyze-food-photo', 
    name: 'Análise de Foto de Alimento', 
    icon: Camera,
    description: 'Identifica alimentos, calcula macros e valida segurança',
    requiresImage: true,
  },
  { 
    id: 'analyze-label-photo', 
    name: 'Análise de Rótulo', 
    icon: Tag,
    description: 'Extrai ingredientes e detecta alérgenos em rótulos',
    requiresImage: true,
  },
  { 
    id: 'analyze-fridge-photo', 
    name: 'Análise de Geladeira', 
    icon: Refrigerator,
    description: 'Identifica ingredientes e sugere receitas seguras',
    requiresImage: true,
  },
  { 
    id: 'generate-recipe', 
    name: 'Gerador de Receitas', 
    icon: ChefHat,
    description: 'Cria receitas personalizadas com ingredientes do usuário',
    requiresImage: false,
  },
  { 
    id: 'regenerate-meal', 
    name: 'Regeneração de Refeição', 
    icon: RotateCcw,
    description: 'Substitui refeições mantendo restrições do usuário',
    requiresImage: false,
  },
  { 
    id: 'chat-assistant', 
    name: 'Assistente de Chat', 
    icon: MessageSquare,
    description: 'Responde perguntas sobre alimentação e saúde',
    requiresImage: false,
  },
];

const MEAL_TYPES = [
  { value: 'all', label: '🔄 Testar Todas' },
  { value: 'breakfast', label: 'Café da Manhã' },
  { value: 'morning_snack', label: 'Lanche da Manhã' },
  { value: 'lunch', label: 'Almoço' },
  { value: 'afternoon_snack', label: 'Lanche da Tarde' },
  { value: 'dinner', label: 'Jantar' },
  { value: 'supper', label: 'Ceia' },
];

const INDIVIDUAL_MEAL_TYPES = MEAL_TYPES.filter(m => m.value !== 'all');

const COUNTRIES = [
  { value: 'BR', label: '🇧🇷 Brasil' },
  { value: 'US', label: '🇺🇸 Estados Unidos' },
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'MX', label: '🇲🇽 México' },
  { value: 'ES', label: '🇪🇸 Espanha' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'CO', label: '🇨🇴 Colômbia' },
];

// =============================================================================
// RESTRICTION LISTS - Synced with onboarding_options (option_id values)
// =============================================================================

// INTOLERÂNCIAS - chaves EN canônicas (synced with intolerance_mappings)
const INTOLERANCES = [
  { value: 'gluten', label: 'Glúten' },
  { value: 'lactose', label: 'Lactose' },
  { value: 'fructose', label: 'Frutose' },
  { value: 'sorbitol', label: 'Sorbitol' },
  { value: 'fodmap', label: 'FODMAP' },
];

// ALERGIAS - chaves EN canônicas (synced with intolerance_mappings)
const ALLERGIES = [
  { value: 'peanut', label: 'Amendoim' },
  { value: 'nuts', label: 'Oleaginosas' },
  { value: 'seafood', label: 'Frutos do Mar' },
  { value: 'fish', label: 'Peixe' },
  { value: 'egg', label: 'Ovo' },
  { value: 'soy', label: 'Soja' },
];

// SENSIBILIDADES - chaves EN canônicas (synced with intolerance_mappings)
const SENSITIVITIES = [
  { value: 'histamine', label: 'Histamina' },
  { value: 'caffeine', label: 'Cafeína' },
  { value: 'sulfite', label: 'Sulfito' },
  { value: 'salicylate', label: 'Salicilato' },
  { value: 'corn', label: 'Milho' },
  { value: 'nickel', label: 'Níquel' },
];

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Crítico' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Aviso' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Info' },
};

interface AllMealsResult {
  mealType: string;
  mealLabel: string;
  result: ValidationResult;
}

// =============================================================================
// VALIDATION RULES BY MODULE (for display only)
// =============================================================================

const MODULE_RULES_INFO: Record<string, { categories: { name: string; severity: string; rules: string[] }[] }> = {
  'generate-ai-meal-plan': {
    categories: [
      { name: 'Estrutura Obrigatória', severity: 'critical', rules: ['JSON válido', 'Foods é array', 'Cada food tem name/grams', 'Calorias definidas'] },
      { name: 'Qualidade do Conteúdo', severity: 'warning', rules: ['Título descritivo', 'Sem condimentos soltos', 'Pratos consolidados', 'Mínimo 2 dicas'] },
      { name: 'Ordenação e Formato', severity: 'info', rules: ['Proteína primeiro', 'Bebidas por último', 'Frutas antes de bebidas'] },
      { name: 'Segurança Alimentar', severity: 'critical', rules: ['Sem ingredientes fantasma', 'Calorias realistas', 'Gramagens válidas'] },
    ],
  },
  'analyze-food-photo': {
    categories: [
      { name: 'Detecção', severity: 'critical', rules: ['Itens identificados', 'Nome e gramagem em cada item'] },
      { name: 'Nutrição', severity: 'warning', rules: ['Calorias estimadas', 'Macros calculados'] },
      { name: 'Segurança', severity: 'critical', rules: ['Status de segurança', 'Alertas de intolerância'] },
      { name: 'Qualidade', severity: 'info', rules: ['Nome humanizado da refeição', 'Confiança informada', 'Gramagens realistas'] },
    ],
  },
  'analyze-label-photo': {
    categories: [
      { name: 'Extração', severity: 'critical', rules: ['Ingredientes extraídos', 'Nome do produto identificado'] },
      { name: 'Segurança', severity: 'critical', rules: ['Veredito de segurança', 'Alertas de alérgenos'] },
      { name: 'Qualidade', severity: 'info', rules: ['Selos identificados', 'Confiança da análise'] },
    ],
  },
  'analyze-fridge-photo': {
    categories: [
      { name: 'Detecção', severity: 'critical', rules: ['Ingredientes identificados'] },
      { name: 'Sugestões', severity: 'warning', rules: ['Receitas sugeridas', 'Sugestões seguras'] },
      { name: 'Segurança', severity: 'warning', rules: ['Ingredientes validados contra intolerâncias'] },
    ],
  },
  'generate-recipe': {
    categories: [
      { name: 'Conteúdo', severity: 'critical', rules: ['Nome da receita', 'Lista de ingredientes', 'Modo de preparo'] },
      { name: 'Nutrição', severity: 'warning', rules: ['Informações nutricionais', 'Calorias por porção'] },
      { name: 'Qualidade', severity: 'info', rules: ['Tempo de preparo', 'Porções/rendimento', 'Quantidades definidas'] },
    ],
  },
  'regenerate-meal': {
    categories: [
      { name: 'Formato', severity: 'critical', rules: ['Estrutura JSON válida', 'Nome da refeição'] },
      { name: 'Conteúdo', severity: 'critical', rules: ['Lista de alimentos', 'Calorias definidas'] },
      { name: 'Qualidade', severity: 'info', rules: ['Refeição diferente da original'] },
    ],
  },
  'chat-assistant': {
    categories: [
      { name: 'Resposta', severity: 'critical', rules: ['Resposta gerada', 'Resposta não é erro'] },
      { name: 'Qualidade', severity: 'info', rules: ['Mantém contexto', 'Idioma correto'] },
    ],
  },
};

export default function AdminPromptValidation() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [selectedModule, setSelectedModule] = useState('generate-ai-meal-plan');
  const [mealType, setMealType] = useState('lunch');
  const [countryCode, setCountryCode] = useState('BR');
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedSensitivities, setSelectedSensitivities] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [allMealsResults, setAllMealsResults] = useState<AllMealsResult[]>([]);
  const [currentTestingMeal, setCurrentTestingMeal] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [promptMeta, setPromptMeta] = useState<{ isHardcoded?: boolean; note?: string; model?: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Image upload state for modules that require images
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string }[]>([]);
  
  const currentModuleInfo = AI_MODULES.find(m => m.id === selectedModule);
  const moduleRulesInfo = MODULE_RULES_INFO[selectedModule];

  // Reset results when module changes
  useEffect(() => {
    setResult(null);
    setAllMealsResults([]);
    setPromptPreview(null);
    setPromptMeta(null);
    setShowPrompt(false);
    // Clear uploaded images when module changes
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
  }, [selectedModule]);

  // Get required image count for module
  const getRequiredImageCount = () => {
    if (selectedModule === 'analyze-fridge-photo') return 2;
    if (['analyze-food-photo', 'analyze-label-photo'].includes(selectedModule)) return 1;
    return 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxImages = getRequiredImageCount();
    const newImages: { file: File; preview: string }[] = [];

    for (let i = 0; i < Math.min(files.length, maxImages - uploadedImages.length); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setUploadedImages(prev => [...prev, ...newImages].slice(0, maxImages));
    e.target.value = ''; // Reset input
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Acesso negado</p>
      </div>
    );
  }

  // =============================================================================
  // VALIDATION FUNCTIONS
  // =============================================================================

  const runMealPlanValidation = async (targetMealType: string): Promise<ValidationResult> => {
    // Combina todas as restrições para teste
    const allRestrictions = [...selectedIntolerances, ...selectedAllergies, ...selectedSensitivities];
    
    const { data, error } = await supabase.functions.invoke('test-prompt-validation', {
      body: { 
        mealType: targetMealType, 
        countryCode, 
        testMode: 'full',
        intolerances: allRestrictions
      }
    });
    if (error) throw error;
    return data as ValidationResult;
  };

  const runModuleValidation = async (): Promise<ValidationResult> => {
    // Convert uploaded images to base64 for modules that need them
    let imageData: string[] = [];
    if (currentModuleInfo?.requiresImage && uploadedImages.length > 0) {
      imageData = await Promise.all(uploadedImages.map(img => convertImageToBase64(img.file)));
    }

    // Combina todas as restrições para teste
    const allRestrictions = [...selectedIntolerances, ...selectedAllergies, ...selectedSensitivities];

    const { data, error } = await supabase.functions.invoke('test-all-prompts-validation', {
      body: { 
        moduleId: selectedModule, 
        testMode: 'full',
        testParams: {
          countryCode,
          intolerances: allRestrictions,
          images: imageData,
        }
      }
    });
    if (error) throw error;
    return data as ValidationResult;
  };

  const runValidation = async () => {
    setIsRunning(true);
    setResult(null);
    setAllMealsResults([]);
    
    try {
      // Special handling for meal plan module with "all" option
      if (selectedModule === 'generate-ai-meal-plan' && mealType === 'all') {
        const results: AllMealsResult[] = [];
        
        for (const meal of INDIVIDUAL_MEAL_TYPES) {
          setCurrentTestingMeal(meal.label);
          
          try {
            const mealResult = await runMealPlanValidation(meal.value);
            results.push({
              mealType: meal.value,
              mealLabel: meal.label,
              result: mealResult
            });
          } catch (error) {
            results.push({
              mealType: meal.value,
              mealLabel: meal.label,
              result: {
                success: false,
                totalRules: 0,
                passedRules: 0,
                failedRules: 1,
                rules: [],
                promptPreview: '',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Erro desconhecido',
                categories: {}
              }
            });
          }
        }
        
        setCurrentTestingMeal(null);
        setAllMealsResults(results);
        
        const totalPassed = results.filter(r => r.result.success).length;
        const totalFailed = results.length - totalPassed;
        
        toast({
          title: totalFailed === 0 ? "✅ Todas as refeições passaram!" : "⚠️ Algumas refeições falharam",
          description: `${totalPassed}/${results.length} refeições aprovadas`,
          variant: totalFailed === 0 ? "default" : "destructive",
        });
      } else if (selectedModule === 'generate-ai-meal-plan') {
        // Single meal type for meal plan
        const data = await runMealPlanValidation(mealType);
        setResult(data);
        
        toast({
          title: data.success ? "✅ Validação passou!" : "⚠️ Validação com falhas",
          description: `${data.passedRules}/${data.totalRules} regras aprovadas`,
          variant: data.success ? "default" : "destructive",
        });
      } else {
        // Other modules
        const data = await runModuleValidation();
        setResult(data);
        
        toast({
          title: data.success ? "✅ Validação passou!" : "⚠️ Validação com falhas",
          description: `${data.passedRules}/${data.totalRules} regras aprovadas`,
          variant: data.success ? "default" : "destructive",
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Erro na validação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentTestingMeal(null);
    }
  };

  const loadPromptPreview = async () => {
    setIsLoadingPreview(true);
    
    try {
      let data;
      
      if (selectedModule === 'generate-ai-meal-plan') {
        const response = await supabase.functions.invoke('test-prompt-validation', {
          body: { mealType, countryCode, testMode: 'preview' }
        });
        if (response.error) throw response.error;
        data = response.data;
      } else {
        const response = await supabase.functions.invoke('test-all-prompts-validation', {
          body: { moduleId: selectedModule, testMode: 'preview' }
        });
        if (response.error) throw response.error;
        data = response.data;
      }
      
      setPromptPreview(data.promptPreview);
      setPromptMeta({
        isHardcoded: data.isHardcoded,
        note: data.note,
        model: data.model
      });
      setShowPrompt(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Erro ao carregar preview",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const categories = result?.categories || {};
  const categoryNames = Object.keys(categories);

  const filteredRules = result?.rules.filter(rule => {
    if (activeTab === 'all') return true;
    if (activeTab === 'failed') return !rule.passed;
    return rule.category === activeTab;
  }) || [];

  const criticalFailed = result?.rules.filter(r => !r.passed && r.severity === 'critical').length || 0;
  const warningsFailed = result?.rules.filter(r => !r.passed && r.severity === 'warning').length || 0;

  const generatedOutput = result?.generatedMeal || result?.generatedOutput;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Validação de Prompts</h1>
            <p className="text-muted-foreground">Teste automatizado de todos os módulos de IA</p>
          </div>
        </div>

        {/* Module Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Selecione o Módulo
            </CardTitle>
            <CardDescription>
              Escolha qual módulo de IA deseja validar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {AI_MODULES.map(module => {
                const Icon = module.icon;
                const isSelected = selectedModule === module.id;
                
                return (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      {module.requiresImage && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">IMG</Badge>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                      {module.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                  </button>
                );
              })}
            </div>
            
            {currentModuleInfo && (
              <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                {currentModuleInfo.description}
                {currentModuleInfo.requiresImage && (
                  <span className="block mt-1 text-blue-500">
                    📸 Faça upload da(s) imagem(ns) na seção de configuração abaixo para testar este módulo.
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentModuleInfo && <currentModuleInfo.icon className="w-5 h-5" />}
              Configuração do Teste
            </CardTitle>
            <CardDescription>
              {selectedModule === 'generate-ai-meal-plan' 
                ? 'Selecione o tipo de refeição e país para testar a geração de IA'
                : 'Configure os parâmetros de teste para este módulo'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Meal Type selector - only for meal plan module */}
              {selectedModule === 'generate-ai-meal-plan' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Refeição</label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Country selector - always visible */}
              <div>
                <label className="text-sm font-medium mb-2 block">País</label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Intolerâncias de Teste - para TODOS os módulos */}
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">🚫 Intolerâncias de Teste</label>
                <div className="flex flex-wrap gap-2">
                  {INTOLERANCES.map(intol => (
                    <Badge
                      key={intol.value}
                      variant={selectedIntolerances.includes(intol.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedIntolerances(prev =>
                          prev.includes(intol.value)
                            ? prev.filter(i => i !== intol.value)
                            : [...prev, intol.value]
                        );
                      }}
                    >
                      {intol.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Alergias de Teste - para TODOS os módulos */}
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">⚠️ Alergias de Teste</label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGIES.map(allergy => (
                    <Badge
                      key={allergy.value}
                      variant={selectedAllergies.includes(allergy.value) ? "destructive" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedAllergies(prev =>
                          prev.includes(allergy.value)
                            ? prev.filter(i => i !== allergy.value)
                            : [...prev, allergy.value]
                        );
                      }}
                    >
                      {allergy.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sensibilidades de Teste - para TODOS os módulos */}
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block">🔶 Sensibilidades de Teste</label>
                <div className="flex flex-wrap gap-2">
                  {SENSITIVITIES.map(sens => (
                    <Badge
                      key={sens.value}
                      variant={selectedSensitivities.includes(sens.value) ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedSensitivities(prev =>
                          prev.includes(sens.value)
                            ? prev.filter(i => i !== sens.value)
                            : [...prev, sens.value]
                        );
                      }}
                    >
                      {sens.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Image upload - for modules that require images */}
              {currentModuleInfo?.requiresImage && (
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-2 block">
                    {selectedModule === 'analyze-fridge-photo' 
                      ? 'Fotos da Geladeira (Interior + Portas)' 
                      : selectedModule === 'analyze-label-photo'
                        ? 'Foto do Rótulo'
                        : 'Foto do Alimento'}
                    <span className="text-muted-foreground ml-2">
                      ({uploadedImages.length}/{getRequiredImageCount()})
                    </span>
                  </label>
                  
                  <div className="flex flex-wrap gap-3 mt-2">
                    {/* Preview uploaded images */}
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={img.preview} 
                          alt={`Preview ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {selectedModule === 'analyze-fridge-photo' && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">
                            {index === 0 ? 'Interior' : 'Portas'}
                          </span>
                        )}
                      </div>
                    ))}
                    
                    {/* Upload button */}
                    {uploadedImages.length < getRequiredImageCount() && (
                      <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          multiple={selectedModule === 'analyze-fridge-photo'}
                        />
                      </label>
                    )}
                  </div>
                  
                  {selectedModule === 'analyze-fridge-photo' && uploadedImages.length < 2 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      📷 Envie 2 fotos: uma do interior e outra das portas da geladeira
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress indicator for all meals */}
            {isRunning && selectedModule === 'generate-ai-meal-plan' && mealType === 'all' && currentTestingMeal && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Testando: <span className="font-medium text-foreground">{currentTestingMeal}</span>
                </p>
                <div className="flex gap-1 mt-2">
                  {INDIVIDUAL_MEAL_TYPES.map((meal) => {
                    const tested = allMealsResults.find(r => r.mealType === meal.value);
                    const isCurrent = currentTestingMeal === meal.label;
                    return (
                      <div
                        key={meal.value}
                        className={`h-2 flex-1 rounded ${
                          tested 
                            ? tested.result.success 
                              ? 'bg-green-500' 
                              : 'bg-destructive'
                            : isCurrent 
                              ? 'bg-primary animate-pulse' 
                              : 'bg-muted-foreground/20'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={runValidation} 
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {selectedModule === 'generate-ai-meal-plan' && mealType === 'all' 
                      ? 'Testando todas...' 
                      : 'Validando...'}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {selectedModule === 'generate-ai-meal-plan' && mealType === 'all'
                      ? 'Rodar Todas as Validações'
                      : 'Rodar Validação'}
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={loadPromptPreview}
                disabled={isLoadingPreview}
              >
                {isLoadingPreview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Prompt
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* All Meals Results (for meal plan "all" option) */}
        {allMealsResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Resultado de Todas as Refeições
              </CardTitle>
              <CardDescription>
                {allMealsResults.filter(r => r.result.success).length}/{allMealsResults.length} refeições aprovadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allMealsResults.map((item) => {
                const criticalCount = item.result.rules.filter(r => !r.passed && r.severity === 'critical').length;
                const warningCount = item.result.rules.filter(r => !r.passed && r.severity === 'warning').length;
                
                return (
                  <Collapsible key={item.mealType}>
                    <CollapsibleTrigger asChild>
                      <div 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
                          item.result.success 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : 'bg-destructive/10 border border-destructive/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.result.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className="font-medium">{item.mealLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.result.passedRules}/{item.result.totalRules} ✓
                          </Badge>
                          {criticalCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {criticalCount} crítico
                            </Badge>
                          )}
                          {warningCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                              {warningCount} aviso
                            </Badge>
                          )}
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 ml-8 space-y-2">
                      {item.result.error && (
                        <p className="text-sm text-destructive">{item.result.error}</p>
                      )}
                      {item.result.rules.filter(r => !r.passed).map(rule => (
                        <div 
                          key={rule.id}
                          className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm"
                        >
                          <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{rule.name}</span>
                            {rule.details && (
                              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{rule.details}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {item.result.success && (
                        <p className="text-sm text-muted-foreground">Todas as regras passaram ✓</p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Single Validation Result */}
        {result && (
          <Card className={result.success ? 'border-green-500/50' : 'border-destructive/50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                )}
                Resultado da Validação
                {result.moduleName && (
                  <Badge variant="outline" className="ml-2">{result.moduleName}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {result.passedRules}/{result.totalRules} regras aprovadas • {new Date(result.timestamp).toLocaleString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary with severities */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={result.success ? "default" : "destructive"} className="text-sm">
                  {result.success ? '✓ APROVADO' : '✗ REPROVADO'}
                </Badge>
                <Badge variant="outline" className="text-sm bg-green-500/10 text-green-600 border-green-500/30">
                  ✓ {result.passedRules} passou
                </Badge>
                {criticalFailed > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    🚫 {criticalFailed} crítico
                  </Badge>
                )}
                {warningsFailed > 0 && (
                  <Badge variant="outline" className="text-sm bg-orange-500/10 text-orange-600 border-orange-500/30">
                    ⚠️ {warningsFailed} aviso
                  </Badge>
                )}
              </div>

              {/* Category Summary */}
              {Object.keys(categories).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(categories).map(([cat, stats]) => (
                    <div 
                      key={cat}
                      className={`p-2 rounded-lg text-xs ${
                        stats.failed === 0 ? 'bg-green-500/10' : 'bg-orange-500/10'
                      }`}
                    >
                      <p className="font-medium truncate">{cat}</p>
                      <p className="text-muted-foreground">
                        {stats.passed}/{stats.total} ✓
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs for filtering rules */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" className="text-xs">
                    Todas ({result.rules.length})
                  </TabsTrigger>
                  <TabsTrigger value="failed" className="text-xs text-destructive">
                    Falhas ({result.failedRules})
                  </TabsTrigger>
                  {categoryNames.slice(0, 4).map(cat => (
                    <TabsTrigger key={cat} value={cat} className="text-xs hidden md:inline-flex">
                      {cat.split(' ')[0]}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeTab} className="mt-3">
                  <ScrollArea className="h-80">
                    <div className="space-y-1 pr-4">
                      {filteredRules.map(rule => {
                        const severity = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.info;
                        const SeverityIcon = severity.icon;
                        
                        return (
                          <div 
                            key={rule.id} 
                            className={`flex items-start gap-3 p-2 rounded-lg text-sm ${
                              rule.passed ? 'bg-green-500/10' : severity.bg
                            }`}
                          >
                            {rule.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            ) : (
                              <SeverityIcon className={`w-4 h-4 ${severity.color} mt-0.5 shrink-0`} />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{rule.name}</p>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {rule.category}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs">{rule.description}</p>
                              {rule.details && (
                                <p className="text-xs mt-1 font-mono bg-muted/50 px-2 py-1 rounded truncate">
                                  {rule.details}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Retry button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runValidation}
                disabled={isRunning}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                Rodar Novamente
              </Button>

              {/* Generated Output */}
              {generatedOutput && (
                <Collapsible open={showOutput} onOpenChange={setShowOutput}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Utensils className="w-4 h-4" />
                        Ver Output Gerado
                      </span>
                      {showOutput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <ScrollArea className="h-64">
                      <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                        {JSON.stringify(generatedOutput, null, 2)}
                      </pre>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {/* Prompt Preview */}
        {promptPreview && showPrompt && (
          <Card className={promptMeta?.isHardcoded ? 'border-green-500/50' : 'border-orange-500/50'}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Preview do Prompt
                  {promptMeta?.isHardcoded ? (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      ✓ Hardcoded Real
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                      ⚠️ Banco de Dados
                    </Badge>
                  )}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPrompt(false)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </CardTitle>
              {promptMeta?.note && (
                <CardDescription className={promptMeta?.isHardcoded ? 'text-green-600' : 'text-orange-600'}>
                  {promptMeta.note}
                </CardDescription>
              )}
              {promptMeta?.model && (
                <Badge variant="outline" className="w-fit mt-1">
                  Modelo: {promptMeta.model}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                  {promptPreview}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Validation Rules Info */}
        {moduleRulesInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Regras de Validação - {currentModuleInfo?.name}</CardTitle>
              <CardDescription>
                O que é verificado neste módulo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {moduleRulesInfo.categories.map((cat, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={
                          cat.severity === 'critical' ? 'bg-destructive/10 text-destructive' :
                          cat.severity === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-blue-500/10 text-blue-500'
                        }
                      >
                        {cat.severity === 'critical' ? 'Crítico' : cat.severity === 'warning' ? 'Aviso' : 'Info'}
                      </Badge>
                      {cat.name}
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                      {cat.rules.map((rule, i) => (
                        <li key={i}>• {rule}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
