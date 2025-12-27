import { useState, useEffect } from "react";
import { Trash2, Search, ChevronLeft, ChevronRight, Bot, User, Sparkles, Clock, ArrowLeft, Flame, Drumstick, Wheat, Droplets, Timer, ChefHat } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ingredient {
  name: string;
  quantity: string;
}

interface Instruction {
  step: number;
  title: string;
  description: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  source_module: string | null;
  ai_generated: boolean | null;
  created_at: string;
  is_active: boolean;
}

interface RecipeListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: string;
  mealTypeLabel: string;
  mealTypeEmoji: string;
  countryCode: string;
  onRecipesChanged?: () => void;
}

const ITEMS_PER_PAGE = 10;

const DATE_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
];

const SOURCE_FILTERS = [
  { value: 'all', label: 'Todas as fontes' },
  { value: 'admin', label: 'Admin Manual' },
  { value: 'plano_simples', label: 'AI Bulk' },
  { value: 'surpreenda_me', label: 'Surpreenda-me' },
];

export function RecipeListSheet({
  open,
  onOpenChange,
  mealType,
  mealTypeLabel,
  mealTypeEmoji,
  countryCode,
  onRecipesChanged,
}: RecipeListSheetProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSelectedRecipe(null);
      fetchRecipes();
    }
  }, [open, mealType, countryCode]);

  useEffect(() => {
    if (open && !selectedRecipe) {
      fetchRecipes();
    }
  }, [page, search, dateFilter, sourceFilter]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('simple_meals')
        .select('id, name, description, meal_type, calories, protein, carbs, fat, prep_time, ingredients, instructions, source_module, ai_generated, created_at, is_active', { count: 'exact' })
        .eq('meal_type', mealType)
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Search filter
      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Source filter
      if (sourceFilter !== 'all') {
        query = query.eq('source_module', sourceFilter);
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Parse ingredients and instructions from JSON
      const parsedRecipes = (data || []).map(recipe => ({
        ...recipe,
        ingredients: Array.isArray(recipe.ingredients) 
          ? (recipe.ingredients as unknown as Ingredient[]) 
          : [],
        instructions: Array.isArray(recipe.instructions) 
          ? (recipe.instructions as unknown as Instruction[]) 
          : [],
      }));

      setRecipes(parsedRecipes as Recipe[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar receitas:', error);
      toast.error('Erro ao carregar receitas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecipeId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('simple_meals')
        .update({ is_active: false })
        .eq('id', deleteRecipeId);

      if (error) throw error;

      toast.success('Receita removida');
      setDeleteRecipeId(null);
      setSelectedRecipe(null);
      fetchRecipes();
      onRecipesChanged?.();
    } catch (error) {
      console.error('Erro ao remover receita:', error);
      toast.error('Erro ao remover receita');
    } finally {
      setIsDeleting(false);
    }
  };

  const getSourceBadge = (recipe: Recipe) => {
    if (recipe.source_module === 'surpreenda_me') {
      return (
        <Badge variant="outline" className="text-xs gap-1 bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="h-3 w-3" />
          Surpreenda
        </Badge>
      );
    }
    if (recipe.ai_generated || recipe.source_module === 'plano_simples') {
      return (
        <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200">
          <Bot className="h-3 w-3" />
          AI
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs gap-1 bg-gray-50 text-gray-700 border-gray-200">
        <User className="h-3 w-3" />
        Manual
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Recipe Detail View
  const RecipeDetailView = ({ recipe }: { recipe: Recipe }) => (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="p-4 border-b shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedRecipe(null)}
          className="mb-3 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para lista
        </Button>
        <h2 className="text-lg font-semibold">{recipe.name}</h2>
        {recipe.description && (
          <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {getSourceBadge(recipe)}
          <span className="text-xs text-muted-foreground">{formatDate(recipe.created_at)}</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Macros Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-orange-100 rounded-full p-2">
                <Flame className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium">Calorias</p>
                <p className="text-lg font-bold text-orange-700">{recipe.calories} kcal</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-red-100 rounded-full p-2">
                <Drumstick className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Proteína</p>
                <p className="text-lg font-bold text-red-700">{recipe.protein}g</p>
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-amber-100 rounded-full p-2">
                <Wheat className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Carboidratos</p>
                <p className="text-lg font-bold text-amber-700">{recipe.carbs}g</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Droplets className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Gordura</p>
                <p className="text-lg font-bold text-blue-700">{recipe.fat}g</p>
              </div>
            </div>
          </div>

          {/* Prep time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>Tempo de preparo: <strong>{recipe.prep_time} min</strong></span>
          </div>

          <Separator />

          {/* Ingredients */}
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <span className="text-lg">🥗</span>
              Ingredientes
            </h3>
            {recipe.ingredients.length > 0 ? (
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-muted-foreground">— {ing.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem ingredientes cadastrados</p>
            )}
          </div>

          <Separator />

          {/* Instructions */}
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <ChefHat className="h-5 w-5" />
              Modo de Preparo
            </h3>
            {recipe.instructions.length > 0 ? (
              <div className="space-y-4">
                {recipe.instructions.map((inst, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {inst.step || idx + 1}
                    </div>
                    <div className="flex-1">
                      {inst.title && (
                        <p className="font-medium text-sm">{inst.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">{inst.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem instruções cadastradas</p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="p-4 border-t shrink-0">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => setDeleteRecipeId(recipe.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remover receita
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          {selectedRecipe ? (
            <RecipeDetailView recipe={selectedRecipe} />
          ) : (
            <>
              <SheetHeader className="p-4 border-b shrink-0">
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-2xl">{mealTypeEmoji}</span>
                  {mealTypeLabel}
                  <Badge variant="secondary" className="ml-2">{totalCount}</Badge>
                </SheetTitle>
              </SheetHeader>

              {/* Filters */}
              <div className="p-4 space-y-3 border-b shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1); }}>
                    <SelectTrigger className="flex-1">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FILTERS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                    <SelectTrigger className="flex-1">
                      <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_FILTERS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipe List */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-3 border rounded-lg space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))
                  ) : recipes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Nenhuma receita encontrada</p>
                      {(search || dateFilter !== 'all' || sourceFilter !== 'all') && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setDateFilter("all");
                            setSourceFilter("all");
                          }}
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  ) : (
                    recipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{recipe.name}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {recipe.calories} kcal
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              {getSourceBadge(recipe)}
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(recipe.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRecipeId(recipe.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t shrink-0">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || isLoading}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecipeId} onOpenChange={(open) => !open && setDeleteRecipeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover receita?</AlertDialogTitle>
            <AlertDialogDescription>
              A receita será desativada e não aparecerá mais para os usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
