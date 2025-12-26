import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChefHat, Play, Loader2, CheckCircle, AlertCircle, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MEAL_TYPES = [
  { key: 'cafe_manha', label: 'Café da manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

// Categorias alinhadas com onboarding
const CATEGORIES = [
  { key: 'comum', label: 'Tradicional/Comum' },
  { key: 'vegetariana', label: 'Vegetariana' },
  { key: 'vegana', label: 'Vegana' },
  { key: 'low_carb', label: 'Low Carb' },
  { key: 'pescetariana', label: 'Pescetariana' },
  { key: 'cetogenica', label: 'Cetogênica/Keto' },
  { key: 'flexitariana', label: 'Flexitariana' },
  { key: 'fitness', label: 'Fitness/Light' },
  { key: 'proteica', label: 'Rica em Proteínas' },
  { key: 'comfort', label: 'Comfort Food' },
  { key: 'rapida', label: 'Rápida e Prática' },
  { key: 'regional', label: 'Regional Tradicional' },
  { key: 'kids', label: 'Modo Kids' },
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

export default function AdminBulkRecipes() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, byType: {} as Record<string, number> });
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('BR');
  const [batchSize, setBatchSize] = useState(10);
  const [targetTotal, setTargetTotal] = useState(500);
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

  const generateBatch = async (mealType: string, category: string) => {
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
          quantity: batchSize,
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
    const inserted = await generateBatch(selectedMealType, selectedCategory);
    setIsGenerating(false);

    if (inserted > 0) {
      toast.success(`${inserted} receitas criadas!`);
      fetchStats();
    } else {
      toast.info('Nenhuma nova receita inserida');
    }
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    setLogs([]);
    
    let totalInserted = 0;
    const jobs: { mealType: string; category: string }[] = [];

    // Criar jobs para todas as combinações
    for (const mealType of MEAL_TYPES) {
      for (const category of CATEGORIES) {
        jobs.push({ mealType: mealType.key, category: category.key });
      }
    }

    // Embaralhar para variedade
    const shuffledJobs = jobs.sort(() => Math.random() - 0.5);
    
    // Calcular quantos batches precisamos
    const remaining = Math.max(0, targetTotal - stats.total);
    const batchesNeeded = Math.ceil(remaining / batchSize);
    const jobsToRun = shuffledJobs.slice(0, batchesNeeded);

    setProgress({ current: 0, total: jobsToRun.length });

    for (let i = 0; i < jobsToRun.length; i++) {
      const job = jobsToRun[i];
      const inserted = await generateBatch(job.mealType, job.category);
      totalInserted += inserted;
      setProgress({ current: i + 1, total: jobsToRun.length });

      // Pequena pausa para evitar rate limit
      if (i < jobsToRun.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);
    toast.success(`Geração concluída! ${totalInserted} receitas criadas.`);
    fetchStats();
  };

  const remaining = Math.max(0, targetTotal - stats.total);
  const progressPercent = stats.total > 0 ? Math.min(100, (stats.total / targetTotal) * 100) : 0;

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
                    {/* Agrupar por região */}
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
                {stats.total} / {targetTotal}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-3" />
            
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

        {/* Single Generation */}
        <Card>
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
                      <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
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
                      <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
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

        {/* Bulk Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Geração em Massa</CardTitle>
            <CardDescription>
              Gere receitas automaticamente até atingir a meta de {targetTotal} receitas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta total de receitas</Label>
                <Input 
                  type="number" 
                  value={targetTotal} 
                  onChange={e => setTargetTotal(Number(e.target.value))}
                  min={50}
                  max={1000}
                />
              </div>
              <div className="space-y-2">
                <Label>Receitas faltando</Label>
                <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                  <span className="font-medium">{remaining}</span>
                </div>
              </div>
            </div>

            {isGenerating && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{progress.current} / {progress.total} lotes</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} />
              </div>
            )}

            <Button 
              onClick={handleBulkGenerate} 
              disabled={isGenerating || remaining === 0}
              variant="default"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando... ({progress.current}/{progress.total})
                </>
              ) : remaining === 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Meta Atingida!
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Gerar {remaining} Receitas Automaticamente
                </>
              )}
            </Button>
          </CardContent>
        </Card>

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
                      <span>{log.mealType}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{log.category}</span>
                    </div>
                    <div>
                      {log.status === 'success' && (
                        <Badge variant="outline" className="text-green-600">+{log.inserted}</Badge>
                      )}
                      {log.status === 'error' && (
                        <span className="text-xs text-red-500">{log.error}</span>
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
