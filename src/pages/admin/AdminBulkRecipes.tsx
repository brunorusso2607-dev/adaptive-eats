import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChefHat, Play, Loader2, CheckCircle, AlertCircle, RefreshCw, Globe, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MEAL_TYPES = [
  { key: 'cafe_manha', label: 'Café da manhã', emoji: '🌅' },
  { key: 'almoco', label: 'Almoço', emoji: '🍽️' },
  { key: 'lanche', label: 'Lanche', emoji: '🥪' },
  { key: 'jantar', label: 'Jantar', emoji: '🌙' },
  { key: 'ceia', label: 'Ceia', emoji: '🌜' },
];

// Categorias alinhadas com onboarding
const CATEGORIES = [
  { key: 'comum', label: 'Tradicional/Comum', emoji: '🍳' },
  { key: 'vegetariana', label: 'Vegetariana', emoji: '🥗' },
  { key: 'vegana', label: 'Vegana', emoji: '🌱' },
  { key: 'low_carb', label: 'Low Carb', emoji: '🥩' },
  { key: 'pescetariana', label: 'Pescetariana', emoji: '🐟' },
  { key: 'cetogenica', label: 'Cetogênica/Keto', emoji: '🥑' },
  { key: 'flexitariana', label: 'Flexitariana', emoji: '🥦' },
  { key: 'fitness', label: 'Fitness/Light', emoji: '💪' },
  { key: 'proteica', label: 'Rica em Proteínas', emoji: '🍗' },
  { key: 'comfort', label: 'Comfort Food', emoji: '🍲' },
  { key: 'rapida', label: 'Rápida e Prática', emoji: '⚡' },
  { key: 'regional', label: 'Regional Tradicional', emoji: '🏠' },
  { key: 'kids', label: 'Modo Kids', emoji: '👶' },
];

// Países configurados no sistema
const COUNTRIES = [
  // América
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', language: 'pt-BR', region: 'América do Sul' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', language: 'en-US', region: 'América do Norte' },
  { code: 'MX', name: 'México', flag: '🇲🇽', language: 'es-MX', region: 'América do Norte' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', language: 'es-AR', region: 'América do Sul' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴', language: 'es-CO', region: 'América do Sul' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', language: 'es-CL', region: 'América do Sul' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', language: 'es-PE', region: 'América do Sul' },
  // Europa
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', language: 'en-GB', region: 'Europa' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', language: 'pt-PT', region: 'Europa' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', language: 'es-ES', region: 'Europa' },
  { code: 'FR', name: 'França', flag: '🇫🇷', language: 'fr-FR', region: 'Europa' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', language: 'it-IT', region: 'Europa' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', language: 'de-DE', region: 'Europa' },
  // Ásia
  { code: 'JP', name: 'Japão', flag: '🇯🇵', language: 'ja-JP', region: 'Ásia' },
];

interface GenerationLog {
  id: string;
  mealType: string;
  category: string;
  country: string;
  inserted: number;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

interface DistributionPreview {
  mealType: string;
  category: string;
  quantity: number;
}

export default function AdminBulkRecipes() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, byType: {} as Record<string, number> });
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('BR');
  const [batchSize, setBatchSize] = useState(10);
  
  // Novo estado para abordagem híbrida
  const [totalRecipes, setTotalRecipes] = useState(100);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(MEAL_TYPES.map(t => t.key));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['comum', 'vegetariana', 'fitness']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchStats();
  }, [selectedCountry]);

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('simple_meals')
        .select('meal_type, country_code')
        .eq('is_active', true)
        .eq('country_code', selectedCountry);

      if (error) throw error;

      const byType: Record<string, number> = {};
      MEAL_TYPES.forEach(t => byType[t.key] = 0);
      
      data?.forEach(meal => {
        if (byType[meal.meal_type] !== undefined) {
          byType[meal.meal_type]++;
        }
      });

      setStats({ total: data?.length || 0, byType });
    } catch (error) {
      console.error('Erro ao buscar stats:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular distribuição automática
  const calculateDistribution = (): DistributionPreview[] => {
    if (selectedMealTypes.length === 0 || selectedCategories.length === 0) return [];
    
    const totalCombinations = selectedMealTypes.length * selectedCategories.length;
    const recipesPerCombination = Math.floor(totalRecipes / totalCombinations);
    const remainder = totalRecipes % totalCombinations;
    
    const distribution: DistributionPreview[] = [];
    let distributed = 0;
    
    selectedMealTypes.forEach((mealType, typeIndex) => {
      selectedCategories.forEach((category, catIndex) => {
        const index = typeIndex * selectedCategories.length + catIndex;
        const extra = index < remainder ? 1 : 0;
        const quantity = recipesPerCombination + extra;
        
        if (quantity > 0) {
          distribution.push({ mealType, category, quantity });
          distributed += quantity;
        }
      });
    });
    
    return distribution;
  };

  const distribution = calculateDistribution();

  const toggleMealType = (key: string) => {
    setSelectedMealTypes(prev => 
      prev.includes(key) 
        ? prev.filter(t => t !== key)
        : [...prev, key]
    );
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => 
      prev.includes(key) 
        ? prev.filter(c => c !== key)
        : [...prev, key]
    );
  };

  const selectAllMealTypes = () => setSelectedMealTypes(MEAL_TYPES.map(t => t.key));
  const deselectAllMealTypes = () => setSelectedMealTypes([]);
  const selectAllCategories = () => setSelectedCategories(CATEGORIES.map(c => c.key));
  const deselectAllCategories = () => setSelectedCategories([]);

  const generateBatch = async (mealType: string, category: string, quantity: number) => {
    const logId = `${mealType}-${category}-${selectedCountry}-${Date.now()}`;
    
    setLogs(prev => [...prev, {
      id: logId,
      mealType,
      category,
      country: selectedCountryData.flag,
      inserted: 0,
      status: 'running' as const,
    }]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-simple-meals', {
        body: {
          mealType,
          category,
          quantity,
          countryCode: selectedCountry,
          languageCode: selectedCountryData.language,
        },
      });

      if (error) throw error;

      setLogs(prev => prev.map(log => 
        log.id === logId 
          ? { ...log, status: 'success', inserted: data.inserted || 0 }
          : log
      ));

      return data.inserted || 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setLogs(prev => prev.map(log => 
        log.id === logId 
          ? { ...log, status: 'error', error: errorMsg }
          : log
      ));
      return 0;
    }
  };

  const handleGenerateSingle = async () => {
    if (!selectedMealType || !selectedCategory) {
      toast.error('Selecione tipo de refeição e categoria');
      return;
    }

    setIsGenerating(true);
    const inserted = await generateBatch(selectedMealType, selectedCategory, batchSize);
    setIsGenerating(false);

    if (inserted > 0) {
      toast.success(`${inserted} receitas criadas!`);
      fetchStats();
    } else {
      toast.info('Nenhuma nova receita inserida');
    }
  };

  const handleHybridGenerate = async () => {
    if (distribution.length === 0) {
      toast.error('Selecione pelo menos um tipo de refeição e uma categoria');
      return;
    }

    setIsGenerating(true);
    setLogs([]);
    
    let totalInserted = 0;

    // Embaralhar para variedade
    const shuffledDistribution = [...distribution].sort(() => Math.random() - 0.5);
    
    setProgress({ current: 0, total: shuffledDistribution.length });

    for (let i = 0; i < shuffledDistribution.length; i++) {
      const job = shuffledDistribution[i];
      
      // Dividir em lotes menores se necessário
      let remaining = job.quantity;
      while (remaining > 0) {
        const batchQuantity = Math.min(remaining, batchSize);
        const inserted = await generateBatch(job.mealType, job.category, batchQuantity);
        totalInserted += inserted;
        remaining -= batchQuantity;
        
        // Pequena pausa para evitar rate limit
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      setProgress({ current: i + 1, total: shuffledDistribution.length });

      // Pausa entre combinações
      if (i < shuffledDistribution.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);
    toast.success(`Geração concluída! ${totalInserted} receitas criadas.`);
    fetchStats();
  };

  const getMealTypeLabel = (key: string) => MEAL_TYPES.find(t => t.key === key)?.label || key;
  const getCategoryLabel = (key: string) => CATEGORIES.find(c => c.key === key)?.label || key;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Gerador de Receitas em Massa</h1>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Country Selector */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Globe className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">País para geração de receitas</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        {selectedCountryData.flag} {selectedCountryData.name}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {['América do Sul', 'América do Norte', 'Europa', 'Ásia'].map(region => (
                      <div key={region}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {region}
                        </div>
                        {COUNTRIES.filter(c => c.region === region).map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              {country.flag} {country.name}
                            </span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                Estatísticas {selectedCountryData.flag} {selectedCountryData.name}
              </span>
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total de receitas:</span>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {stats.total}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {MEAL_TYPES.map(type => (
                <div key={type.key} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{stats.byType[type.key] || 0}</div>
                  <div className="text-xs text-muted-foreground">{type.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hybrid Generation - Nova Abordagem */}
        <Card className="border-2 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              Geração Inteligente
            </CardTitle>
            <CardDescription>
              Defina o total de receitas e selecione os tipos e categorias - a distribuição é automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total de Receitas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Total de Receitas a Gerar</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Input 
                  type="number" 
                  value={totalRecipes} 
                  onChange={e => setTotalRecipes(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={1000}
                  className="w-full sm:w-32 text-xl font-bold text-center"
                />
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 200, 500].map(preset => (
                    <Button 
                      key={preset}
                      variant={totalRecipes === preset ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setTotalRecipes(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tipos de Refeição */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Tipos de Refeição</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllMealTypes}>
                    Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllMealTypes}>
                    Nenhum
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {MEAL_TYPES.map(type => (
                  <label
                    key={type.key}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all min-w-0 ${
                      selectedMealTypes.includes(type.key)
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedMealTypes.includes(type.key)}
                      onCheckedChange={() => toggleMealType(type.key)}
                      className="shrink-0"
                    />
                    <span className="text-lg shrink-0">{type.emoji}</span>
                    <span className="text-sm font-medium truncate">{type.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedMealTypes.length} tipo(s) selecionado(s)
              </p>
            </div>

            {/* Categorias */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Categorias</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllCategories}>
                    Todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllCategories}>
                    Nenhuma
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <label
                    key={cat.key}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all min-w-0 ${
                      selectedCategories.includes(cat.key)
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedCategories.includes(cat.key)}
                      onCheckedChange={() => toggleCategory(cat.key)}
                      className="shrink-0"
                    />
                    <span className="shrink-0">{cat.emoji}</span>
                    <span className="text-xs font-medium truncate">{cat.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedCategories.length} categoria(s) selecionada(s)
              </p>
            </div>

            {/* Preview da Distribuição */}
            {distribution.length > 0 && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between gap-2 h-auto py-2 px-3">
                    <span className="flex items-center gap-2 min-w-0">
                      <Settings2 className="h-4 w-4 shrink-0" />
                      <span className="truncate text-left">Ver Distribuição ({distribution.length} combinações)</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                      {Math.floor(totalRecipes / distribution.length)}/comb
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {distribution.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between text-sm bg-background p-2 rounded"
                        >
                          <span className="text-muted-foreground">
                            {getMealTypeLabel(item.mealType)} + {getCategoryLabel(item.category)}
                          </span>
                          <Badge variant="outline">{item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Barra de Progresso */}
            {isGenerating && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{progress.current} / {progress.total} combinações</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} />
              </div>
            )}

            {/* Botão de Geração */}
            <Button 
              onClick={handleHybridGenerate} 
              disabled={isGenerating || distribution.length === 0}
              size="lg"
              className="w-full h-14 text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Gerando... ({progress.current}/{progress.total})
                </>
              ) : distribution.length === 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Selecione tipos e categorias
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Gerar {totalRecipes} Receitas
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Single Generation (Collapsed) */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              Geração Manual (Avançado)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-3">
              <CardHeader>
                <CardTitle>Geração Única</CardTitle>
                <CardDescription>Gere um lote de receitas para tipo e categoria específicos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Refeição</Label>
                    <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map(type => (
                          <SelectItem key={type.key} value={type.key}>
                            {type.emoji} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>
                            {cat.emoji} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantidade por lote</Label>
                    <Input 
                      type="number" 
                      value={batchSize} 
                      onChange={e => setBatchSize(Number(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateSingle} 
                  disabled={isGenerating || !selectedMealType || !selectedCategory}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Gerar {batchSize} Receitas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Log de Geração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.slice().reverse().map(log => (
                  <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                      log.status === 'success' ? 'bg-green-500/10' :
                      log.status === 'error' ? 'bg-red-500/10' :
                      log.status === 'running' ? 'bg-yellow-500/10' :
                      'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {log.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                      {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {log.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      <span>{log.country}</span>
                      <span className="text-muted-foreground">
                        {getMealTypeLabel(log.mealType)} • {getCategoryLabel(log.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.status === 'success' && (
                        <Badge variant="outline" className="bg-green-500/10">
                          +{log.inserted}
                        </Badge>
                      )}
                      {log.status === 'error' && (
                        <span className="text-xs text-red-500 truncate max-w-32" title={log.error}>
                          {log.error}
                        </span>
                      )}
                    </div>
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
