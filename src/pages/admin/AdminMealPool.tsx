import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/contexts/I18nContext";
import { 
  Loader2, 
  Database, 
  RefreshCw, 
  Play, 
  Trash2, 
  Eye, 
  EyeOff,
  ChefHat,
  Globe,
  Flame,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface MealCombination {
  id: string;
  name: string;
  description: string | null;
  meal_type: string;
  meal_density?: "light" | "moderate" | "heavy";
  components: Array<{
    type: string;
    name: string;
    portion_grams?: number;
    portion_ml?: number;
    portion_label: string;
  }>;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  macro_source: string;
  macro_confidence: string;
  country_codes: string[];
  dietary_tags: string[];
  blocked_for_intolerances: string[];
  is_active: boolean;
  approval_status: ApprovalStatus;
  usage_count: number;
  created_at: string;
}

interface PoolStats {
  total: number;
  active: number;
  byMealType: Record<string, number>;
  byCountry: Record<string, number>;
  avgCalories: number;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_manha: "☕ Café da Manhã",
  lanche_manha: "🥐 Lanche da Manhã",
  almoco: "🍽️ Almoço",
  lanche_tarde: "🍎 Lanche da Tarde",
  jantar: "🌙 Jantar",
  ceia: "🌛 Ceia",
};

const COUNTRY_FLAGS: Record<string, string> = {
  BR: "🇧🇷",
  US: "🇺🇸",
  PT: "🇵🇹",
  ES: "🇪🇸",
  FR: "🇫🇷",
  IT: "🇮🇹",
  DE: "🇩🇪",
  MX: "🇲🇽",
  GB: "🇬🇧",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function AdminMealPool() {
  const { t } = useI18n();
  
  const [meals, setMeals] = useState<MealCombination[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealCombination | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [generatedMeals, setGeneratedMeals] = useState<MealCombination[]>([]);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  
  // Available countries from onboarding
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string, flag: string}>>([]);
  
  // Filters
  const [filterMealType, setFilterMealType] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>("all");
  const [filterIntolerance, setFilterIntolerance] = useState<string>("all");

  // Generation params
  const [genCountry, setGenCountry] = useState("BR");
  const [genMealType, setGenMealType] = useState("cafe_manha");
  const [genQuantity, setGenQuantity] = useState(5);
  const [genIntoleranceFilter, setGenIntoleranceFilter] = useState<string>("none");

  // Intolerance options for the filter
  const INTOLERANCE_OPTIONS = [
    { key: "none", label: "🌐 Sem filtro (geral)" },
    { key: "gluten", label: "🌾 Sem Glúten" },
    { key: "lactose", label: "🥛 Sem Lactose" },
    { key: "fodmap", label: "🍎 Low FODMAP" },
  ];

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from("onboarding_countries")
        .select("code, name, flag")
        .order("name");
      
      if (error) throw error;
      
      setAvailableCountries(data || []);
    } catch (error) {
      console.error("Error fetching countries:", error);
      // Fallback para países hardcoded se a tabela não existir
      setAvailableCountries([
        { code: "BR", name: "Brasil", flag: "🇧🇷" },
        { code: "US", name: "EUA", flag: "🇺🇸" },
        { code: "PT", name: "Portugal", flag: "🇵🇹" },
        { code: "MX", name: "México", flag: "🇲🇽" },
        { code: "AR", name: "Argentina", flag: "🇦🇷" },
        { code: "CL", name: "Chile", flag: "🇨🇱" },
        { code: "ES", name: "España", flag: "🇪🇸" },
        { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
        { code: "PE", name: "Perú", flag: "🇵🇪" },
      ]);
    }
  };

  const fetchMeals = async () => {
    setIsLoading(true);
    try {
      // Primeiro, buscar o TOTAL de registros com os filtros aplicados
      let countQuery = supabase
        .from("meal_combinations")
        .select("*", { count: "exact", head: true });

      if (filterMealType !== "all") {
        countQuery = countQuery.eq("meal_type", filterMealType);
      }
      if (filterCountry !== "all") {
        countQuery = countQuery.contains("country_codes", [filterCountry]);
      }
      if (filterActive !== "all") {
        countQuery = countQuery.eq("is_active", filterActive === "active");
      }
      if (filterApproval !== "all") {
        countQuery = countQuery.eq("approval_status", filterApproval);
      }
      if (filterIntolerance !== "all") {
        countQuery = countQuery.not("blocked_for_intolerances", "cs", `{${filterIntolerance}}`);
      }

      const { count: totalFiltered } = await countQuery;
      setFilteredTotal(totalFiltered || 0);

      // Agora buscar os dados (limitado a 100 para performance)
      let query = supabase
        .from("meal_combinations")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterMealType !== "all") {
        query = query.eq("meal_type", filterMealType);
      }
      if (filterCountry !== "all") {
        query = query.contains("country_codes", [filterCountry]);
      }
      if (filterActive !== "all") {
        query = query.eq("is_active", filterActive === "active");
      }
      if (filterApproval !== "all") {
        query = query.eq("approval_status", filterApproval);
      }
      if (filterIntolerance !== "all") {
        // Filtrar refeições que NÃO contêm o alérgeno especificado
        query = query.not("blocked_for_intolerances", "cs", `{${filterIntolerance}}`);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      // Cast the data to our interface with proper type handling
      const typedData: MealCombination[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        meal_type: item.meal_type,
        meal_density: item.meal_density as "light" | "moderate" | "heavy" | undefined,
        components: (Array.isArray(item.components) ? item.components : []) as MealCombination['components'],
        total_calories: item.total_calories,
        total_protein: item.total_protein,
        total_carbs: item.total_carbs,
        total_fat: item.total_fat,
        macro_source: item.macro_source || 'tbca',
        macro_confidence: item.macro_confidence || 'medium',
        country_codes: Array.isArray(item.country_codes) ? item.country_codes : [],
        dietary_tags: Array.isArray(item.dietary_tags) ? item.dietary_tags : [],
        blocked_for_intolerances: Array.isArray(item.blocked_for_intolerances) ? item.blocked_for_intolerances : [],
        is_active: item.is_active,
        approval_status: (item.approval_status || 'pending') as ApprovalStatus,
        usage_count: item.usage_count || 0,
        created_at: item.created_at,
      }));
      
      setMeals(typedData);

      // Calculate stats - buscar contagens REAIS do banco (não limitadas)
      const { count: total } = await supabase
        .from("meal_combinations")
        .select("*", { count: "exact", head: true });

      const { count: active } = await supabase
        .from("meal_combinations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Buscar contagens por tipo de refeição (do banco completo)
      const byMealType: Record<string, number> = {};
      for (const mealType of Object.keys(MEAL_TYPE_LABELS)) {
        let countQuery = supabase
          .from("meal_combinations")
          .select("*", { count: "exact", head: true })
          .eq("meal_type", mealType);
        
        // Aplicar filtro de país se selecionado
        if (filterCountry !== "all") {
          countQuery = countQuery.contains("country_codes", [filterCountry]);
        }
        
        const { count } = await countQuery;
        if (count && count > 0) {
          byMealType[mealType] = count;
        }
      }

      // Buscar contagens por país (do banco completo)
      const byCountry: Record<string, number> = {};
      const countryList = availableCountries.length > 0 
        ? availableCountries.map(c => c.code) 
        : ["BR", "US", "PT", "MX", "AR", "CL", "ES", "GB", "PE"];
      
      for (const countryCode of countryList) {
        let countQuery = supabase
          .from("meal_combinations")
          .select("*", { count: "exact", head: true })
          .contains("country_codes", [countryCode]);
        
        // Aplicar filtro de tipo de refeição se selecionado
        if (filterMealType !== "all") {
          countQuery = countQuery.eq("meal_type", filterMealType);
        }
        
        const { count } = await countQuery;
        if (count && count > 0) {
          byCountry[countryCode] = count;
        }
      }

      // Calcular média de calorias dos dados carregados
      let totalCalories = 0;
      typedData.forEach((meal) => {
        totalCalories += meal.total_calories;
      });

      setStats({
        total: total || 0,
        active: active || 0,
        byMealType,
        byCountry,
        avgCalories: typedData.length > 0 ? Math.round(totalCalories / typedData.length) : 0,
      });
    } catch (error) {
      console.error("Error fetching meals:", error);
      toast.error("Erro ao carregar refeições");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    fetchMeals();
  }, [filterMealType, filterCountry, filterActive, filterApproval, filterIntolerance, availableCountries]);

  const generateMeals = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("populate-meal-pool", {
        body: {
          country_code: genCountry,
          meal_type: genMealType,
          quantity: genQuantity,
          intolerance_filter: genIntoleranceFilter !== "none" ? genIntoleranceFilter : null,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`${data.inserted} refeições geradas com sucesso!`);
      
      // Buscar as refeições recém-geradas (últimas inseridas)
      if (data.inserted > 0) {
        const { data: newMeals, error: fetchError } = await supabase
          .from("meal_combinations")
          .select("*")
          .eq("meal_type", genMealType)
          .contains("country_codes", [genCountry])
          .order("created_at", { ascending: false })
          .limit(data.inserted);

        if (!fetchError && newMeals) {
          setGeneratedMeals(newMeals);
          setShowGeneratedModal(true);
        }
      }
      
      fetchMeals();
    } catch (error: any) {
      console.error("Error generating meals:", error);
      toast.error(`Erro na geração: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleActive = async (meal: MealCombination) => {
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .update({ is_active: !meal.is_active })
        .eq("id", meal.id);

      if (error) throw error;

      toast.success(meal.is_active ? "Refeição desativada" : "Refeição ativada");
      fetchMeals();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteMeal = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta refeição?")) return;

    try {
      const { error } = await supabase
        .from("meal_combinations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Refeição excluída");
      fetchMeals();
    } catch (error) {
      console.error("Error deleting meal:", error);
      toast.error("Erro ao excluir");
    }
  };

  const deleteSelectedMeals = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} refeição(ões)?`)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} refeição(ões) excluída(s)`);
      setSelectedIds(new Set());
      fetchMeals();
    } catch (error) {
      console.error("Error deleting meals:", error);
      toast.error("Erro ao excluir refeições");
    } finally {
      setIsDeleting(false);
    }
  };

  const approveSelectedMeals = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .update({ approval_status: "approved" })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} refeição(ões) aprovada(s)`);
      setSelectedIds(new Set());
      fetchMeals();
    } catch (error) {
      console.error("Error approving meals:", error);
      toast.error("Erro ao aprovar refeições");
    } finally {
      setIsDeleting(false);
    }
  };

  const rejectSelectedMeals = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .update({ approval_status: "rejected" })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} refeição(ões) rejeitada(s)`);
      setSelectedIds(new Set());
      fetchMeals();
    } catch (error) {
      console.error("Error rejecting meals:", error);
      toast.error("Erro ao rejeitar refeições");
    } finally {
      setIsDeleting(false);
    }
  };

  const changeApprovalStatus = async (meal: MealCombination, newStatus: ApprovalStatus) => {
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .update({ approval_status: newStatus })
        .eq("id", meal.id);

      if (error) throw error;

      const statusLabels = {
        approved: "aprovada",
        rejected: "rejeitada",
        pending: "marcada como pendente"
      };

      toast.success(`Refeição ${statusLabels[newStatus]}`);
      fetchMeals();
    } catch (error) {
      console.error("Error changing approval status:", error);
      toast.error("Erro ao atualizar status de aprovação");
    }
  };

  const approveAllPending = async () => {
    const pendingCount = meals.filter(m => m.approval_status === 'pending').length;
    
    if (pendingCount === 0) {
      toast.info("Não há refeições pendentes para aprovar");
      return;
    }

    if (!confirm(`Aprovar TODAS as ${pendingCount} refeições pendentes?`)) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .update({ approval_status: "approved" })
        .eq("approval_status", "pending");

      if (error) throw error;

      toast.success(`${pendingCount} refeições aprovadas com sucesso!`);
      fetchMeals();
    } catch (error) {
      console.error("Error approving all pending meals:", error);
      toast.error("Erro ao aprovar refeições");
    } finally {
      setIsDeleting(false);
    }
  };

  const updateApprovalStatus = async (ids: string[], status: ApprovalStatus) => {
    setIsApproving(true);
    try {
      const { error } = await supabase
        .from("meal_combinations")
        .update({ approval_status: status })
        .in("id", ids);

      if (error) throw error;

      const statusLabel = status === 'approved' ? 'aprovada(s)' : status === 'rejected' ? 'rejeitada(s)' : 'pendente(s)';
      toast.success(`${ids.length} refeição(ões) ${statusLabel}`);
      setSelectedIds(new Set());
      fetchMeals();
    } catch (error) {
      console.error("Error updating approval:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsApproving(false);
    }
  };

  const approveSelected = () => updateApprovalStatus(Array.from(selectedIds), 'approved');
  const rejectSelected = () => updateApprovalStatus(Array.from(selectedIds), 'rejected');

  const toggleSelectAll = () => {
    if (selectedIds.size === meals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(meals.map(m => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  if (isLoading && meals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            Pool de Refeições
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Combinações pré-validadas com macros calculados para geração de planos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMeals} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total no Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.active || 0}</div>
            <Progress 
              value={stats ? (stats.active / stats.total) * 100 : 0} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média de Calorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              {stats?.avgCalories || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">kcal por refeição</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Países
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(stats?.byCountry || {}).map(([code, count]) => (
                <Badge key={code} variant="secondary" className="text-lg">
                  {COUNTRY_FLAGS[code] || code} {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-4 h-4" />
            Gerar Novas Refeições
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">País</label>
              <Select value={genCountry} onValueChange={setGenCountry}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Refeição</label>
              <Select value={genMealType} onValueChange={setGenMealType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade</label>
              <Select value={String(genQuantity)} onValueChange={(v) => setGenQuantity(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Perfil de Intolerância</label>
              <Select value={genIntoleranceFilter} onValueChange={setGenIntoleranceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTOLERANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateMeals} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Gerar com IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Refeição</label>
              <Select value={filterMealType} onValueChange={setFilterMealType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de refeição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(MEAL_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">País</label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 Todos</SelectItem>
                {availableCountries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aprovação</label>
              <Select value={filterApproval} onValueChange={setFilterApproval}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Aprovação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">⏳ Pendentes</SelectItem>
                <SelectItem value="approved">✅ Aprovadas</SelectItem>
                <SelectItem value="rejected">❌ Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
            </div>

            <Button 
              variant="default" 
              size="sm"
              onClick={approveAllPending}
              disabled={isDeleting}
              className="bg-green-600 hover:bg-green-700 self-end"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Aprovar Todas Pendentes
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium">Intolerâncias</label>
              <Select value={filterIntolerance} onValueChange={setFilterIntolerance}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Intolerâncias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 Todas</SelectItem>
                <SelectItem value="gluten">🌾 Sem Glúten</SelectItem>
                <SelectItem value="lactose">🥛 Sem Lactose</SelectItem>
                <SelectItem value="fodmap">🍎 Low FODMAP</SelectItem>
              </SelectContent>
            </Select>
            </div>

            <Button onClick={fetchMeals} variant="default" className="mb-0">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Refeições no Pool ({filteredTotal})
          </CardTitle>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={approveSelected}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Aprovar {selectedIds.size}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={rejectSelected}
                disabled={isApproving}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeitar {selectedIds.size}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={deleteSelectedMeals}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Excluir {selectedIds.size}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma refeição no pool ainda.</p>
              <p className="text-sm">Use o gerador acima para popular o pool.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={meals.length > 0 && selectedIds.size === meals.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Refeição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Densidade</TableHead>
                    <TableHead>Calorias</TableHead>
                    <TableHead>Macros</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meals.map((meal) => (
                    <TableRow key={meal.id} className={!meal.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(meal.id)}
                          onCheckedChange={() => toggleSelect(meal.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{meal.name}</p>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {meal.components.slice(0, 4).map((comp, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="text-primary/60">•</span>
                                <span>{comp.name} ({comp.portion_label})</span>
                              </div>
                            ))}
                            {meal.components.length > 4 && (
                              <span className="text-primary/60 text-[10px]">+{meal.components.length - 4} mais</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {MEAL_TYPE_LABELS[meal.meal_type]?.split(" ")[0] || meal.meal_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {meal.meal_density ? (
                          <Badge 
                            variant="outline"
                            className={
                              meal.meal_density === "light" 
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : meal.meal_density === "moderate"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                            }
                          >
                            {meal.meal_density === "light" && "🍃 Leve"}
                            {meal.meal_density === "moderate" && "⚖️ Moderada"}
                            {meal.meal_density === "heavy" && "💪 Pesada"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                            ⚙️ Auto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{meal.total_calories}</span>
                          <span className="text-muted-foreground text-xs"> kcal</span>
                          <div className="text-xs text-muted-foreground uppercase">
                            {meal.macro_source || 'tbca'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>P: {Math.round(meal.total_protein)}g</div>
                          <div>C: {Math.round(meal.total_carbs)}g</div>
                          <div>G: {Math.round(meal.total_fat)}g</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={CONFIDENCE_COLORS[meal.macro_confidence] || ""}
                        >
                          {meal.macro_confidence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {meal.approval_status === 'approved' ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aprovada
                          </Badge>
                        ) : meal.approval_status === 'rejected' ? (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejeitada
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {meal.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMeal(meal)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(meal)}
                          >
                            {meal.is_active ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMeal(meal.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {MEAL_TYPE_LABELS[selectedMeal?.meal_type || ""]?.split(" ")[0]}
              {selectedMeal?.name}
            </DialogTitle>
            <DialogDescription>{selectedMeal?.description}</DialogDescription>
          </DialogHeader>

          {selectedMeal && (
            <div className="space-y-6">
              {/* Macros */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                    <p className="text-2xl font-bold">{selectedMeal.total_calories}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-red-500">{selectedMeal.total_protein}g</p>
                    <p className="text-xs text-muted-foreground">Proteína</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-amber-500">{selectedMeal.total_carbs}g</p>
                    <p className="text-xs text-muted-foreground">Carboidratos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-500">{selectedMeal.total_fat}g</p>
                    <p className="text-xs text-muted-foreground">Gorduras</p>
                  </CardContent>
                </Card>
              </div>

              {/* Components */}
              <div>
                <h4 className="font-medium mb-3">Componentes</h4>
                <div className="space-y-2">
                  {selectedMeal.components.map((comp, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {comp.type}
                        </Badge>
                        <span className="font-medium">{comp.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {comp.portion_label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {selectedMeal.dietary_tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags Dietéticas</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeal.dietary_tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocked */}
              {selectedMeal.blocked_for_intolerances.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Bloqueada para intolerâncias</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeal.blocked_for_intolerances.map((intol) => (
                      <Badge key={intol} variant="destructive">{intol}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                <span>Fonte: {selectedMeal.macro_source}</span>
                <span>Confiança: {selectedMeal.macro_confidence}</span>
                <span>Uso: {selectedMeal.usage_count}x</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Refeições Geradas */}
      <Dialog open={showGeneratedModal} onOpenChange={setShowGeneratedModal}>
        <DialogContent className="!w-[90vw] !max-w-[1600px] max-h-[85vh] sm:!max-w-[1600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Refeições Geradas com Sucesso
            </DialogTitle>
            <DialogDescription>
              {generatedMeals.length} nova(s) refeição(ões) adicionada(s) ao pool
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {generatedMeals.map((meal) => (
                <Card key={meal.id} className="border-2 border-green-500/20 bg-green-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold mb-1">
                          {meal.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{MEAL_TYPE_LABELS[meal.meal_type]}</span>
                          <span>•</span>
                          <span>{meal.country_codes.map(c => COUNTRY_FLAGS[c] || c).join(" ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Nova
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (confirm(`Excluir "${meal.name}"?\n\nEsta combinação será marcada como rejeitada e não será gerada novamente.`)) {
                              // Extrair IDs dos ingredientes e criar hash da combinação
                              const ingredientIds = meal.components
                                .map(c => c.name.toLowerCase().replace(/\s+/g, '_'))
                                .sort();
                              const combinationHash = ingredientIds.join('_');
                              
                              // Registrar combinação como rejeitada
                              // @ts-ignore - Nova tabela, tipos serão regenerados
                              await supabase.from("rejected_meal_combinations").insert({
                                meal_type: meal.meal_type,
                                country_code: meal.country_codes[0] || 'BR',
                                ingredient_ids: ingredientIds,
                                combination_hash: combinationHash,
                                reason: 'Rejeitada pelo admin no modal de preview'
                              });
                              
                              // Excluir refeição
                              await supabase.from("meal_combinations").delete().eq("id", meal.id);
                              setGeneratedMeals(prev => prev.filter(m => m.id !== meal.id));
                              toast.success("Refeição excluída e combinação marcada como rejeitada");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 rounded-lg bg-orange-50">
                        <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                        <p className="text-lg font-bold">{meal.total_calories}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-50">
                        <p className="text-lg font-bold text-red-500">{meal.total_protein}g</p>
                        <p className="text-xs text-muted-foreground">Proteína</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-amber-50">
                        <p className="text-lg font-bold text-amber-500">{meal.total_carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbos</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-blue-50">
                        <p className="text-lg font-bold text-blue-500">{meal.total_fat}g</p>
                        <p className="text-xs text-muted-foreground">Gorduras</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {meal.components.map((comp, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-2 rounded-md bg-white/50 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {comp.type}
                            </Badge>
                            <span className="font-medium">{comp.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {comp.portion_label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowGeneratedModal(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowGeneratedModal(false);
              fetchMeals();
            }}>
              Atualizar Lista
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
