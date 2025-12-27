import { useState, useEffect } from "react";
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Bot, User, Sparkles, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Recipe {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchRecipes();
    }
  }, [open, mealType, countryCode]);

  useEffect(() => {
    if (open) {
      fetchRecipes();
    }
  }, [page, search, dateFilter, sourceFilter]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('simple_meals')
        .select('id, name, meal_type, calories, protein, carbs, fat, source_module, ai_generated, created_at, is_active', { count: 'exact' })
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

      setRecipes(data || []);
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
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
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
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
                          onClick={() => setDeleteRecipeId(recipe.id)}
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
