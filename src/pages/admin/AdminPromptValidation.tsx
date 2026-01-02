import { useState } from "react";
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
  AlertCircle,
  Info,
  RefreshCw
} from "lucide-react";
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
  generatedMeal: any;
  promptPreview: string;
  rawAIResponse?: string;
  timestamp: string;
  error?: string;
  categories: Record<string, { total: number; passed: number; failed: number }>;
}

const MEAL_TYPES = [
  { value: 'all', label: '🔄 Testar Todas' },
  { value: 'cafe_manha', label: 'Café da Manhã' },
  { value: 'lanche_manha', label: 'Lanche da Manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche_tarde', label: 'Lanche da Tarde' },
  { value: 'jantar', label: 'Jantar' },
  { value: 'ceia', label: 'Ceia' },
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

export default function AdminPromptValidation() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [mealType, setMealType] = useState('almoco');
  const [countryCode, setCountryCode] = useState('BR');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [allMealsResults, setAllMealsResults] = useState<AllMealsResult[]>([]);
  const [currentTestingMeal, setCurrentTestingMeal] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showMeal, setShowMeal] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
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

  const runSingleValidation = async (targetMealType: string): Promise<ValidationResult> => {
    const { data, error } = await supabase.functions.invoke('test-prompt-validation', {
      body: { mealType: targetMealType, countryCode, testMode: 'full' }
    });
    
    if (error) throw error;
    return data as ValidationResult;
  };

  const runValidation = async () => {
    setIsRunning(true);
    setResult(null);
    setAllMealsResults([]);
    
    try {
      if (mealType === 'all') {
        // Testar todas as refeições em sequência
        const results: AllMealsResult[] = [];
        
        for (const meal of INDIVIDUAL_MEAL_TYPES) {
          setCurrentTestingMeal(meal.label);
          
          try {
            const mealResult = await runSingleValidation(meal.value);
            results.push({
              mealType: meal.value,
              mealLabel: meal.label,
              result: mealResult
            });
          } catch (error) {
            console.error(`Error testing ${meal.label}:`, error);
            results.push({
              mealType: meal.value,
              mealLabel: meal.label,
              result: {
                success: false,
                totalRules: 0,
                passedRules: 0,
                failedRules: 1,
                rules: [],
                generatedMeal: null,
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
        
        if (totalFailed === 0) {
          toast({
            title: "✅ Todas as refeições passaram!",
            description: `${totalPassed}/${results.length} refeições aprovadas`,
          });
        } else {
          toast({
            title: "⚠️ Algumas refeições falharam",
            description: `${totalFailed} refeições com falhas`,
            variant: "destructive",
          });
        }
      } else {
        // Teste individual
        const data = await runSingleValidation(mealType);
        setResult(data);
        
        if (data.success) {
          toast({
            title: "✅ Validação passou!",
            description: `${data.passedRules}/${data.totalRules} regras aprovadas`,
          });
        } else {
          toast({
            title: "⚠️ Validação com falhas",
            description: `${data.failedRules} regras falharam`,
            variant: "destructive",
          });
        }
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
      const { data, error } = await supabase.functions.invoke('test-prompt-validation', {
        body: { mealType, countryCode, testMode: 'preview' }
      });
      
      if (error) throw error;
      
      setPromptPreview(data.promptPreview);
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
            <h1 className="text-2xl font-bold">Validação do Prompt</h1>
            <p className="text-muted-foreground">Teste automatizado com 24+ regras de conformidade</p>
          </div>
        </div>

        {/* Controles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Configuração do Teste
            </CardTitle>
            <CardDescription>
              Selecione o tipo de refeição e país para testar a geração de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Progress indicator for all meals */}
            {isRunning && mealType === 'all' && currentTestingMeal && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Testando: <span className="font-medium text-foreground">{currentTestingMeal}</span>
                </p>
                <div className="flex gap-1 mt-2">
                  {INDIVIDUAL_MEAL_TYPES.map((meal, index) => {
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
                    {mealType === 'all' ? 'Testando todas...' : 'Gerando e validando...'}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {mealType === 'all' ? 'Rodar Todas as Validações' : 'Rodar Validação Completa'}
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

        {/* Resultado de Todas as Refeições */}
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

        {/* Resultado da Validação Individual */}
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
              </CardTitle>
              <CardDescription>
                {result.passedRules}/{result.totalRules} regras aprovadas • {new Date(result.timestamp).toLocaleString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumo com severidades */}
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

              {/* Resumo por Categoria */}
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

              {/* Tabs para filtrar regras */}
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

              {/* Botão de retry */}
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

              {/* Refeição Gerada */}
              {result.generatedMeal && (
                <Collapsible open={showMeal} onOpenChange={setShowMeal}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Utensils className="w-4 h-4" />
                        Ver Refeição Gerada
                      </span>
                      {showMeal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Título:</span>
                        <p className="font-medium">{result.generatedMeal.title || '(undefined)'}</p>
                      </div>
                      
                      <div>
                        <span className="text-xs text-muted-foreground">Alimentos ({result.generatedMeal.foods?.length || 0}):</span>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {(result.generatedMeal.foods || []).map((food: any, i: number) => (
                            <li key={i}>{food.name} ({food.grams}g)</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="text-xs text-muted-foreground">Dicas ({result.generatedMeal.instructions?.length || 0}):</span>
                        <ol className="list-decimal list-inside text-sm mt-1 space-y-1">
                          {(result.generatedMeal.instructions || []).map((inst: string, i: number) => (
                            <li key={i} className="text-muted-foreground">{inst}</li>
                          ))}
                        </ol>
                      </div>
                      
                      <div className="flex gap-4 text-sm">
                        <span>🔥 {result.generatedMeal.calories_kcal || 0} kcal</span>
                      </div>

                      {/* Raw AI Response */}
                      {result.rawAIResponse && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Resposta bruta da IA:</span>
                          <pre className="text-xs font-mono bg-muted p-2 rounded mt-1 overflow-auto max-h-20">
                            {result.rawAIResponse}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview do Prompt */}
        {promptPreview && showPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Preview do Prompt
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPrompt(false)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </CardTitle>
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

        {/* Categorias de Validação */}
        <Card>
          <CardHeader>
            <CardTitle>Categorias de Validação (24+ regras)</CardTitle>
            <CardDescription>
              O que é verificado em cada refeição gerada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive">Crítico</Badge>
                  Estrutura Obrigatória
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                  <li>• JSON válido com campos corretos</li>
                  <li>• Foods é array de objetos</li>
                  <li>• Cada food tem name e grams</li>
                  <li>• Calorias definidas</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500">Aviso</Badge>
                  Qualidade do Conteúdo
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                  <li>• Título descritivo (não lista)</li>
                  <li>• Sem condimentos soltos</li>
                  <li>• Pratos únicos consolidados</li>
                  <li>• Mínimo 2 dicas de preparo</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Info</Badge>
                  Ordenação e Formato
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                  <li>• Proteína primeiro</li>
                  <li>• Bebidas por último</li>
                  <li>• Frutas antes das bebidas</li>
                  <li>• Sem frutas nas dicas</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">Segurança</Badge>
                  Validações de Segurança
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                  <li>• Sem ingredientes fantasma</li>
                  <li>• Calorias realistas por refeição</li>
                  <li>• Gramagens válidas (5g-1000g)</li>
                  <li>• Refeição composta completa</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
