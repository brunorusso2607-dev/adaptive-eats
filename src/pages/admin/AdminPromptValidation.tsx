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
  Utensils
} from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

interface ValidationResult {
  success: boolean;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  rules: ValidationRule[];
  generatedMeal: any;
  promptPreview: string;
  timestamp: string;
  error?: string;
}

const MEAL_TYPES = [
  { value: 'cafe_manha', label: 'Café da Manhã' },
  { value: 'lanche_manha', label: 'Lanche da Manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche_tarde', label: 'Lanche da Tarde' },
  { value: 'jantar', label: 'Jantar' },
  { value: 'ceia', label: 'Ceia' },
];

const COUNTRIES = [
  { value: 'BR', label: '🇧🇷 Brasil' },
  { value: 'US', label: '🇺🇸 Estados Unidos' },
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'MX', label: '🇲🇽 México' },
  { value: 'ES', label: '🇪🇸 Espanha' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'CO', label: '🇨🇴 Colômbia' },
];

export default function AdminPromptValidation() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [mealType, setMealType] = useState('almoco');
  const [countryCode, setCountryCode] = useState('BR');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [promptPreview, setPromptPreview] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showMeal, setShowMeal] = useState(true);

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

  const runValidation = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-prompt-validation', {
        body: { mealType, countryCode, testMode: 'full' }
      });
      
      if (error) throw error;
      
      setResult(data as ValidationResult);
      
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
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Erro na validação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
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
            <p className="text-muted-foreground">Teste automatizado do formato de geração de refeições</p>
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
              Selecione o tipo de refeição e país para testar
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

            <div className="flex gap-3">
              <Button 
                onClick={runValidation} 
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando e validando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Rodar Validação
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

        {/* Resultado da Validação */}
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
                {result.passedRules}/{result.totalRules} regras aprovadas • {result.timestamp}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumo */}
              <div className="flex gap-2">
                <Badge variant={result.success ? "default" : "destructive"} className="text-sm">
                  {result.success ? '✓ APROVADO' : '✗ REPROVADO'}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {result.passedRules} passou
                </Badge>
                {result.failedRules > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    {result.failedRules} falhou
                  </Badge>
                )}
              </div>

              {/* Lista de Regras */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist de Regras:</h4>
                <div className="space-y-1">
                  {result.rules.map(rule => (
                    <div 
                      key={rule.id} 
                      className={`flex items-start gap-3 p-2 rounded-lg text-sm ${
                        rule.passed ? 'bg-green-500/10' : 'bg-destructive/10'
                      }`}
                    >
                      {rule.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-muted-foreground text-xs">{rule.description}</p>
                        {rule.details && (
                          <p className="text-xs mt-1 font-mono bg-muted/50 px-2 py-1 rounded">
                            {rule.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                        <p className="font-medium">{result.generatedMeal.title}</p>
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
                        <span>🔥 {result.generatedMeal.calories_kcal} kcal</span>
                      </div>
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

        {/* Regras Implementadas */}
        <Card>
          <CardHeader>
            <CardTitle>Regras de Validação</CardTitle>
            <CardDescription>
              O que é verificado em cada refeição gerada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Título é prato, não lista</p>
                  <p className="text-muted-foreground text-xs">O título deve descrever um prato completo</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sem condimentos soltos</p>
                  <p className="text-muted-foreground text-xs">Sal, azeite, limão devem estar dentro do nome do prato</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Prato único consolidado</p>
                  <p className="text-muted-foreground text-xs">Sopas, omeletes, bowls = 1 item principal</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Mínimo 2 dicas</p>
                  <p className="text-muted-foreground text-xs">Dicas de preparo devem ter pelo menos 2 passos</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Primeira dica lista ingredientes</p>
                  <p className="text-muted-foreground text-xs">A primeira dica deve listar ingredientes com gramagens</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sem dicas vagas</p>
                  <p className="text-muted-foreground text-xs">Dicas não podem ser curtas demais ou genéricas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
