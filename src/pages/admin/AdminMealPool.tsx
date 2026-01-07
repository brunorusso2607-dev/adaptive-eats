import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Filter
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

interface MealCombination {
  id: string;
  name: string;
  description: string | null;
  meal_type: string;
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
  const [meals, setMeals] = useState<MealCombination[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealCombination | null>(null);
  
  // Filters
  const [filterMealType, setFilterMealType] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");

  // Generation params
  const [genCountry, setGenCountry] = useState("BR");
  const [genMealType, setGenMealType] = useState("cafe_manha");
  const [genQuantity, setGenQuantity] = useState(5);

  const fetchMeals = async () => {
    setIsLoading(true);
    try {
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

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      // Cast the data to our interface with proper type handling
      const typedData: MealCombination[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        meal_type: item.meal_type,
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
        usage_count: item.usage_count || 0,
        created_at: item.created_at,
      }));
      
      setMeals(typedData);

      // Calculate stats
      const { count: total } = await supabase
        .from("meal_combinations")
        .select("*", { count: "exact", head: true });

      const { count: active } = await supabase
        .from("meal_combinations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const byMealType: Record<string, number> = {};
      const byCountry: Record<string, number> = {};
      let totalCalories = 0;

      typedData.forEach((meal) => {
        byMealType[meal.meal_type] = (byMealType[meal.meal_type] || 0) + 1;
        meal.country_codes.forEach((code) => {
          byCountry[code] = (byCountry[code] || 0) + 1;
        });
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
    fetchMeals();
  }, [filterMealType, filterCountry, filterActive]);

  const generateMeals = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("populate-meal-pool", {
        body: {
          country_code: genCountry,
          meal_type: genMealType,
          quantity: genQuantity,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`${data.inserted} refeições geradas com sucesso!`);
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
                  <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                  <SelectItem value="US">🇺🇸 EUA</SelectItem>
                  <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                  <SelectItem value="MX">🇲🇽 México</SelectItem>
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
          <div className="flex flex-wrap gap-4">
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

            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                <SelectItem value="US">🇺🇸 EUA</SelectItem>
                <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
              </SelectContent>
            </Select>

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
        </CardContent>
      </Card>

      {/* Meals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Refeições no Pool ({meals.length})
          </CardTitle>
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
                    <TableHead>Refeição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Calorias</TableHead>
                    <TableHead>Macros</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meals.map((meal) => (
                    <TableRow key={meal.id} className={!meal.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{meal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {meal.components.length} componentes
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {MEAL_TYPE_LABELS[meal.meal_type]?.split(" ")[0] || meal.meal_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{meal.total_calories}</span>
                        <span className="text-muted-foreground text-xs"> kcal</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>P: {meal.total_protein}g</div>
                          <div>C: {meal.total_carbs}g</div>
                          <div>G: {meal.total_fat}g</div>
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
    </div>
  );
}
