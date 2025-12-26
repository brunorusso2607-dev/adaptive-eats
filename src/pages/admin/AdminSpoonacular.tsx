import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Utensils, 
  Key, 
  Loader2, 
  Save, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Globe, 
  Sparkles,
  RefreshCw,
  Settings,
  History,
  MapPin,
  TrendingUp,
  Zap,
  UtensilsCrossed,
  Filter,
  AlertCircle,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SpoonacularConfig {
  id: string;
  api_key_masked: string | null;
  api_key_encrypted: string | null;
  daily_limit: number;
  is_auto_enabled: boolean;
  auto_run_hour: number;
  current_region_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RegionQueue {
  id: string;
  region_name: string;
  region_code: string;
  cuisines: string[];
  priority: number;
  total_imported: number;
  last_import_at: string | null;
  is_active: boolean;
  use_ai_fallback: boolean;
}

interface ImportLog {
  id: string;
  region: string;
  cuisine: string;
  recipes_imported: number;
  recipes_failed: number;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface ImportedRecipe {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  country_code: string | null;
  source_name: string | null;
  created_at: string;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_manha: "Café da manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
};

export default function AdminSpoonacular() {
  const [config, setConfig] = useState<SpoonacularConfig | null>(null);
  const [regions, setRegions] = useState<RegionQueue[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [recipes, setRecipes] = useState<ImportedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message?: string; quota?: { used: number | null; remaining: number | null } } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [recipeFilter, setRecipeFilter] = useState<string>("all");
  const [totalRecipes, setTotalRecipes] = useState(0);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const ITEMS_PER_PAGE = 20;
  
  // Edit/Delete states
  const [editingRecipe, setEditingRecipe] = useState<ImportedRecipe | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", meal_type: "", calories: 0, country_code: "" });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchRecipes();
  }, [recipeFilter]);

  useEffect(() => {
    fetchRecipes();
  }, [currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configResult, regionsResult, logsResult, countResult] = await Promise.all([
        supabase.from("spoonacular_config").select("*").maybeSingle(),
        supabase.from("spoonacular_region_queue").select("*").order("priority"),
        supabase.from("spoonacular_import_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("simple_meals").select("id", { count: "exact", head: true }).not("source_name", "is", null),
      ]);

      if (configResult.error) throw configResult.error;
      if (regionsResult.error) throw regionsResult.error;
      if (logsResult.error) throw logsResult.error;

      setConfig(configResult.data);
      setRegions(regionsResult.data || []);
      setLogs(logsResult.data || []);
      setTotalRecipes(countResult.count || 0);
      
      // Fetch recipes
      await fetchRecipes();
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Build count query
      let countQuery = supabase
        .from("simple_meals")
        .select("id", { count: "exact", head: true })
        .not("source_name", "is", null);

      if (recipeFilter !== "all") {
        countQuery = countQuery.eq("meal_type", recipeFilter);
      }

      const { count } = await countQuery;
      setFilteredTotal(count || 0);

      // Build data query with pagination
      let query = supabase
        .from("simple_meals")
        .select("id, name, meal_type, calories, country_code, source_name, created_at")
        .not("source_name", "is", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (recipeFilter !== "all") {
        query = query.eq("meal_type", recipeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error("Erro ao buscar receitas:", error);
    }
  };

  const totalPages = Math.ceil(filteredTotal / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Edit recipe handlers
  const handleEditRecipe = (recipe: ImportedRecipe) => {
    setEditingRecipe(recipe);
    setEditForm({
      name: recipe.name,
      meal_type: recipe.meal_type,
      calories: recipe.calories,
      country_code: recipe.country_code || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecipe) return;
    
    setIsEditSaving(true);
    try {
      const { error } = await supabase
        .from("simple_meals")
        .update({
          name: editForm.name,
          meal_type: editForm.meal_type,
          calories: editForm.calories,
          country_code: editForm.country_code || null,
        })
        .eq("id", editingRecipe.id);

      if (error) throw error;
      
      toast.success("Receita atualizada com sucesso");
      setIsEditDialogOpen(false);
      setEditingRecipe(null);
      fetchRecipes();
    } catch (error) {
      console.error("Erro ao atualizar receita:", error);
      toast.error("Erro ao atualizar receita");
    } finally {
      setIsEditSaving(false);
    }
  };

  // Delete recipe handlers
  const handleDeleteRecipe = async () => {
    if (!deleteRecipeId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("simple_meals")
        .delete()
        .eq("id", deleteRecipeId);

      if (error) throw error;
      
      toast.success("Receita excluída com sucesso");
      setDeleteRecipeId(null);
      setTotalRecipes(prev => prev - 1);
      fetchRecipes();
    } catch (error) {
      console.error("Erro ao excluir receita:", error);
      toast.error("Erro ao excluir receita");
    } finally {
      setIsDeleting(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Digite a API key para testar");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-spoonacular-key', {
        body: { apiKey }
      });

      if (error) throw error;
      
      setTestResult(data);
      if (data.valid) {
        toast.success("API key válida!");
      } else {
        toast.error(data.error || "API key inválida");
      }
    } catch (error: any) {
      console.error("Erro ao testar:", error);
      setTestResult({ valid: false, message: error?.message || "Erro ao testar" });
      toast.error("Erro ao testar API key");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("A API key é obrigatória");
      return;
    }

    setIsSaving(true);
    try {
      if (config) {
        // Update existing
        const { error } = await supabase
          .from("spoonacular_config")
          .update({
            api_key_masked: maskApiKey(apiKey),
            api_key_encrypted: apiKey,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("spoonacular_config")
          .insert({
            api_key_masked: maskApiKey(apiKey),
            api_key_encrypted: apiKey,
          });

        if (error) throw error;
      }

      toast.success("API key salva com sucesso");
      setIsApiKeyDialogOpen(false);
      setApiKey("");
      setTestResult(null);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAuto = async () => {
    if (!config) return;

    try {
      const { error } = await supabase
        .from("spoonacular_config")
        .update({ is_auto_enabled: !config.is_auto_enabled })
        .eq("id", config.id);

      if (error) throw error;
      
      toast.success(config.is_auto_enabled ? "Modo automático desativado" : "Modo automático ativado");
      fetchData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao alterar configuração");
    }
  };

  const handleToggleRegion = async (region: RegionQueue) => {
    try {
      const { error } = await supabase
        .from("spoonacular_region_queue")
        .update({ is_active: !region.is_active })
        .eq("id", region.id);

      if (error) throw error;
      
      toast.success(`${region.region_name} ${region.is_active ? 'desativado' : 'ativado'}`);
      fetchData();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao alterar região");
    }
  };

  const handleManualImport = async (region?: RegionQueue) => {
    if (!config?.api_key_encrypted) {
      toast.error("Configure a API key primeiro");
      return;
    }

    setIsImporting(true);
    
    try {
      // Get the next region in queue if not specified
      const targetRegion = region || regions.find(r => r.is_active);
      
      if (!targetRegion) {
        toast.error("Nenhuma região ativa na fila");
        return;
      }

      // Pick a random cuisine from the region
      const cuisine = targetRegion.cuisines[Math.floor(Math.random() * targetRegion.cuisines.length)];
      
      // Create import log
      const { data: logData, error: logError } = await supabase
        .from("spoonacular_import_logs")
        .insert({
          region: targetRegion.region_name,
          cuisine,
          status: 'running'
        })
        .select()
        .single();

      if (logError) throw logError;

      // Call the fetch function
      const { data, error } = await supabase.functions.invoke('fetch-spoonacular-recipes', {
        body: { 
          cuisine, 
          count: config.daily_limit,
          translateToPortuguese: true
        }
      });

      if (error) throw error;

      // Update import log
      await supabase
        .from("spoonacular_import_logs")
        .update({
          recipes_imported: data.imported || 0,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq("id", logData.id);

      // Update region stats
      await supabase
        .from("spoonacular_region_queue")
        .update({
          total_imported: targetRegion.total_imported + (data.imported || 0),
          last_import_at: new Date().toISOString()
        })
        .eq("id", targetRegion.id);

      toast.success(`${data.imported || 0} receitas importadas de ${cuisine}!`);
      fetchData();
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error(error?.message || "Erro ao importar receitas");
    } finally {
      setIsImporting(false);
    }
  };

  const getTotalImported = () => regions.reduce((sum, r) => sum + r.total_imported, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Executando</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Spoonacular</h2>
          <p className="text-muted-foreground text-sm mt-1">Importação de receitas globais</p>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Spoonacular</h2>
          <p className="text-muted-foreground text-sm mt-1">Importação de receitas globais</p>
        </div>
        <Button 
          onClick={() => handleManualImport()} 
          disabled={isImporting || !config?.api_key_encrypted}
          className="gap-2"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Gerar {config?.daily_limit || 10} Receitas
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Utensils className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getTotalImported()}</p>
                <p className="text-xs text-muted-foreground">Receitas importadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{regions.filter(r => r.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Regiões ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config?.daily_limit || 15}</p>
                <p className="text-xs text-muted-foreground">Limite diário</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config?.is_auto_enabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Zap className={`w-5 h-5 ${config?.is_auto_enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{config?.is_auto_enabled ? 'ON' : 'OFF'}</p>
                <p className="text-xs text-muted-foreground">Modo automático</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Config */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Configuração da API</CardTitle>
                <p className="text-sm text-muted-foreground">Spoonacular API Key</p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={config?.api_key_encrypted 
                ? "bg-green-500/10 text-green-600 border-green-500/30" 
                : "bg-muted text-muted-foreground"
              }
            >
              {config?.api_key_encrypted ? "Configurado" : "Não configurado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="w-4 h-4" />
                API Key
              </div>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {config?.api_key_masked || "Não configurado"}
              </code>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                setApiKey("");
                setTestResult(null);
                setIsApiKeyDialogOpen(true);
              }}
            >
              <Settings className="w-4 h-4" />
              {config?.api_key_encrypted ? "Alterar API Key" : "Configurar API Key"}
            </Button>
            
            {config && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-sm">Modo Automático</p>
                  <p className="text-xs text-muted-foreground">
                    Executa diariamente às {config.auto_run_hour}h
                  </p>
                </div>
                <Switch
                  checked={config.is_auto_enabled}
                  onCheckedChange={handleToggleAuto}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Region Queue */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Fila de Regiões</CardTitle>
              <p className="text-sm text-muted-foreground">Prioridade de importação por região</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {regions.map((region, index) => (
              <div 
                key={region.id} 
                className={`p-4 rounded-lg border ${region.is_active ? 'bg-background' : 'bg-muted/30 opacity-60'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${region.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {index + 1}º
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {region.region_name}
                        {region.use_ai_fallback && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            + IA
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {region.cuisines.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{region.total_imported}</p>
                      <p className="text-xs text-muted-foreground">importadas</p>
                    </div>
                    <Switch
                      checked={region.is_active}
                      onCheckedChange={() => handleToggleRegion(region)}
                    />
                  </div>
                </div>
                
                {region.last_import_at && (
                  <p className="text-xs text-muted-foreground">
                    Última importação: {formatDistanceToNow(new Date(region.last_import_at), { addSuffix: true, locale: ptBR })}
                  </p>
                )}
                
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={isImporting || !config?.api_key_encrypted}
                    onClick={() => handleManualImport(region)}
                  >
                    <Play className="w-3 h-3" />
                    Importar agora
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Imported Recipes */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Receitas Importadas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {totalRecipes} receitas do Spoonacular
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={recipeFilter} onValueChange={setRecipeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="cafe_manha">Café da manhã</SelectItem>
                  <SelectItem value="almoco">Almoço</SelectItem>
                  <SelectItem value="lanche_tarde">Lanche</SelectItem>
                  <SelectItem value="jantar">Jantar</SelectItem>
                  <SelectItem value="ceia">Ceia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma receita importada ainda</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Calorias</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {recipe.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {MEAL_TYPE_LABELS[recipe.meal_type] || recipe.meal_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{recipe.calories} kcal</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {recipe.country_code || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[120px] truncate">
                        {recipe.source_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(recipe.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRecipe(recipe)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteRecipeId(recipe.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Pagination */}
          {filteredTotal > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTotal)} de {filteredTotal} receitas
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Histórico de Importações</CardTitle>
                <p className="text-sm text-muted-foreground">Últimas 20 execuções</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma importação realizada ainda</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Região</TableHead>
                    <TableHead>Cuisine</TableHead>
                    <TableHead>Importadas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.region}</TableCell>
                      <TableCell>{log.cuisine}</TableCell>
                      <TableCell>{log.recipes_imported}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(log.started_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* API Limit Info */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-600">Limites da API Spoonacular</p>
              <p className="text-sm text-muted-foreground mt-1">
                O plano gratuito oferece <strong>50 pontos/dia</strong>. Cada busca de receita custa ~1.5 pontos. 
                Planos pagos: $29/mo (150 pontos), $79/mo (500 pontos), $159/mo (1500 pontos).
                <a 
                  href="https://spoonacular.com/food-api/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline ml-1"
                >
                  Ver preços
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar API Key</DialogTitle>
            <DialogDescription>
              Insira sua API key do Spoonacular. Você pode obter uma em{" "}
              <a 
                href="https://spoonacular.com/food-api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                spoonacular.com/food-api
              </a>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Digite sua API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg ${testResult.valid ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="flex items-center gap-2">
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={testResult.valid ? 'text-green-600' : 'text-red-600'}>
                    {testResult.valid ? 'API key válida!' : testResult.message || 'API key inválida'}
                  </span>
                </div>
                {testResult.valid && testResult.quota && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Quota: {testResult.quota.remaining || '?'} requests restantes
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleTestApiKey}
                disabled={isTesting || !apiKey.trim()}
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Testar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveApiKey}
                disabled={isSaving || !apiKey.trim()}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recipe Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
            <DialogDescription>
              Atualize as informações da receita importada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Receita</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da receita..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Refeição</Label>
              <Select 
                value={editForm.meal_type} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, meal_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafe_manha">Café da manhã</SelectItem>
                  <SelectItem value="almoco">Almoço</SelectItem>
                  <SelectItem value="lanche_tarde">Lanche</SelectItem>
                  <SelectItem value="jantar">Jantar</SelectItem>
                  <SelectItem value="ceia">Ceia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calorias</Label>
                <Input
                  type="number"
                  value={editForm.calories}
                  onChange={(e) => setEditForm(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                  placeholder="Calorias..."
                />
              </div>
              <div className="space-y-2">
                <Label>País de Origem</Label>
                <Input
                  value={editForm.country_code}
                  onChange={(e) => setEditForm(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                  placeholder="BR, US, IT..."
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={isEditSaving || !editForm.name.trim()}
              >
                {isEditSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecipeId} onOpenChange={(open) => !open && setDeleteRecipeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A receita será removida permanentemente do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecipe}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
