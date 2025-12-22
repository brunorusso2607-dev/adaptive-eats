import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SafeAreaFooter } from "@/components/ui/safe-area-footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  Globe, Clock, Flame, ChevronRight, ArrowLeft, Check, Loader2, Sparkles, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilteredRecipeCategories } from "@/hooks/useFilteredRecipeCategories";
import IngredientTagInput from "@/components/IngredientTagInput";
import RecipeLoadingScreen from "@/components/RecipeLoadingScreen";

// Filtros opcionais (Etapa 1)
const FILTERS = {
  ingredientes: {
    id: "ingredientes",
    name: "Escolha o Ingrediente",
    emoji: "🥗",
    icon: Search,
    isIngredientSelector: true,
  },
  culinarias: {
    id: "culinarias",
    name: "Culinárias do Mundo",
    emoji: "🌍",
    icon: Globe,
    options: ["Brasileira", "Italiana", "Japonesa", "Mexicana", "Árabe", "Indiana", "Mediterrânea", "Americana"],
  },
  tempo: {
    id: "tempo",
    name: "Por Tempo de Preparo",
    emoji: "⏱️",
    icon: Clock,
    options: ["Até 10 minutos", "Até 20 minutos", "Até 30 minutos", "Mais de 30 minutos"],
  },
  metodo: {
    id: "metodo",
    name: "Por Método de Preparo",
    emoji: "🔥",
    icon: Flame,
    options: ["Airfryer", "Forno", "Panela", "Panela de pressão", "Grelhado", "Cozido", "Cru (raw food)"],
  },
};

// Tipo exportado para compatibilidade
export type RecipeCategory = {
  id: string;
  name: string;
  emoji: string;
  subcategories: string[];
};

export type SelectedFilters = {
  culinaria?: string;
  tempo?: string;
  metodo?: string;
};

interface RecipeCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (category: string, subcategory: string, filters?: SelectedFilters) => void;
  onGenerateWithIngredients?: (ingredients: string[]) => void;
  isLoading?: boolean;
  userProfile?: {
    intolerances?: string[] | null;
    dietary_preference?: string | null;
  } | null;
}

export default function RecipeCategorySheet({ 
  open, 
  onOpenChange, 
  onSelectCategory,
  onGenerateWithIngredients,
  isLoading = false,
  userProfile = null,
}: RecipeCategorySheetProps) {
  const [step, setStep] = useState<1 | 2 | "ingredients">(1);
  const [expandedFilter, setExpandedFilter] = useState<string>("");
  const [expandedCategory, setExpandedCategory] = useState<string>("");
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});
  const [ingredients, setIngredients] = useState<string[]>([]);
  // Bloqueia scroll do body quando está na etapa de ingredientes
  useEffect(() => {
    if (step === "ingredients") {
      // Salva o scroll atual e trava o body
      const scrollY = window.scrollY;
      const originalStyle = document.body.style.cssText;
      
      document.body.style.cssText = `
        position: fixed;
        top: -${scrollY}px;
        left: 0;
        right: 0;
        overflow: hidden;
        touch-action: none;
      `;
      
      // Handler global para bloquear touchmove exceto no dropdown
      const handleTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const isInsideScrollable = target.closest('.ios-scroll-fix');
        if (!isInsideScrollable) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        document.body.style.cssText = originalStyle;
        window.scrollTo(0, scrollY);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [step]);
  
  // Usa o hook para buscar categorias filtradas pelo perfil
  const { categories: filteredCategories, isLoading: isCategoriesLoading, profile } = useFilteredRecipeCategories();

  const handleFilterSelect = (filterId: string, option: string) => {
    setSelectedFilters(prev => {
      // Se clicar na mesma opção, remove a seleção
      if (prev[filterId as keyof SelectedFilters] === option) {
        const newFilters = { ...prev };
        delete newFilters[filterId as keyof SelectedFilters];
        return newFilters;
      }
      return { ...prev, [filterId]: option };
    });
    setExpandedFilter("");
  };

  const handleAdvance = () => {
    setStep(2);
    setExpandedFilter("");
  };

  const handleBack = () => {
    if (step === "ingredients") {
      setStep(1);
      setIngredients([]);
    } else {
      setStep(1);
    }
    setExpandedCategory("");
  };

  const handleSubcategoryClick = (categoryName: string, subcategory: string) => {
    onSelectCategory(categoryName, subcategory, selectedFilters);
    handleClose();
  };

  const handleIngredientOptionClick = () => {
    setStep("ingredients");
    setExpandedFilter("");
  };

  const handleGenerateWithIngredients = () => {
    if (ingredients.length === 0) return;
    
    if (onGenerateWithIngredients) {
      onGenerateWithIngredients(ingredients);
    }
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setStep(1);
      setExpandedFilter("");
      setExpandedCategory("");
      setSelectedFilters({});
      setIngredients([]);
    }, 300);
  };

  const getSelectedCount = () => {
    return Object.keys(selectedFilters).length;
  };

  return (
    <>
      {/* Fullscreen loading overlay - shown outside Sheet */}
      {isLoading && <RecipeLoadingScreen />}
      
      <Sheet open={open && !isLoading} onOpenChange={handleClose}>
        <SheetContent 
          side={step === "ingredients" ? "top" : "bottom"} 
          className={cn(
            "px-0 flex flex-col",
            step === "ingredients" 
              ? "h-[100dvh] rounded-b-3xl pt-safe overflow-hidden" 
              : "h-[85vh] rounded-t-3xl overflow-hidden"
          )}
        >
          {/* Wrapper para conteúdo */}
          <div className="flex flex-col flex-1 overflow-hidden">
          <SheetHeader className="px-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 || step === "ingredients" ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : getSelectedCount() > 0 ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-2 text-muted-foreground hover:text-destructive"
                onClick={() => setSelectedFilters({})}
              >
                Limpar
              </Button>
            ) : (
              <div className="w-14" />
            )}
            <SheetTitle className="text-center font-display text-xl flex-1">
              {step === 1 
                ? "Personalize sua busca" 
                : step === "ingredients"
                  ? "Escolha os ingredientes"
                  : "Escolha uma categoria"}
            </SheetTitle>
            {(step === 2 || step === "ingredients") && <div className="w-8" />}
          </div>
          {step === 1 && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Selecione os filtros desejados (opcional)
            </p>
          )}
          {step === "ingredients" && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Digite e selecione ingredientes da lista
            </p>
          )}
        </SheetHeader>
        
        <div 
          className={cn(
            "px-4 py-4 flex-1",
            step === "ingredients" ? "overflow-hidden" : "overflow-y-auto h-[calc(85vh-140px)]"
          )}
        >
          {step === 1 ? (
            // Etapa 1: Filtros incluindo opção de ingredientes
            <Accordion 
              type="single" 
              collapsible 
              value={expandedFilter}
              onValueChange={setExpandedFilter}
              className="space-y-2"
            >
              {Object.values(FILTERS).map((filter) => {
                // Opção de ingredientes é especial - não é um accordion, é um botão
                if ('isIngredientSelector' in filter && filter.isIngredientSelector) {
                  return (
                    <div
                      key={filter.id}
                      className="border rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                      onClick={handleIngredientOptionClick}
                    >
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                          {filter.emoji}
                        </div>
                        <span className="font-medium text-left flex-1">{filter.name}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                }

                const filterKey = filter.id === "culinarias" ? "culinaria" : filter.id;
                const isSelected = !!selectedFilters[filterKey as keyof SelectedFilters];
                const selectedValue = selectedFilters[filterKey as keyof SelectedFilters];
                
                return (
                  <AccordionItem 
                    key={filter.id} 
                    value={filter.id}
                    className={cn(
                      "border rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all",
                      isSelected 
                        ? "border-primary shadow-md bg-primary/5" 
                        : "data-[state=open]:border-primary/50 data-[state=open]:shadow-md"
                    )}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-primary/5">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10"
                        )}>
                          {isSelected ? <Check className="w-5 h-5" /> : filter.emoji}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-left">{filter.name}</span>
                          {isSelected && (
                            <span className="text-xs text-primary">{selectedValue}</span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {'options' in filter && filter.options?.map((option) => (
                          <Button
                            key={option}
                            variant={selectedValue === option ? "default" : "outline"}
                            className={cn(
                              "h-auto py-3 px-3 rounded-xl text-left font-normal text-sm",
                              selectedValue === option 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                            )}
                            onClick={() => handleFilterSelect(filterKey, option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : step === "ingredients" ? (
            // Etapa de Ingredientes
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <IngredientTagInput
                  value={ingredients}
                  onChange={setIngredients}
                  placeholder="Digite um ingrediente..."
                  disabled={isLoading}
                  onSubmit={handleGenerateWithIngredients}
                  userProfile={userProfile || profile}
                />
              </div>
              
              {ingredients.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {ingredients.length} ingrediente{ingredients.length !== 1 ? "s" : ""} selecionado{ingredients.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          ) : isCategoriesLoading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando categorias...</p>
            </div>
          ) : (
            // Etapa 2: Categorias filtradas pelo perfil
            <div className="space-y-3">
              {profile && (
                <div className="bg-primary/5 rounded-xl p-3 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    📋 Categorias personalizadas para seu perfil
                  </p>
                </div>
              )}
              <Accordion 
                type="single" 
                collapsible 
                value={expandedCategory}
                onValueChange={setExpandedCategory}
                className="space-y-2"
              >
                {filteredCategories.map((category) => (
                  <AccordionItem 
                    key={category.id} 
                    value={category.id}
                    className="border rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm data-[state=open]:border-primary/50 data-[state=open]:shadow-md transition-all"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                          {category.emoji}
                        </div>
                        <span className="font-medium text-left">{category.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      <div className="grid grid-cols-1 gap-1 pt-2">
                        {category.subcategories.map((sub) => (
                          <Button
                            key={sub.name}
                            variant="ghost"
                            className={cn(
                              "justify-between h-auto py-3 px-4 rounded-xl text-left font-normal",
                              "hover:bg-primary/10 hover:text-primary transition-colors"
                            )}
                            onClick={() => handleSubcategoryClick(category.name, sub.name)}
                            disabled={isLoading}
                          >
                            <span>{sub.name}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>

        {/* Footer com botão Avançar (apenas na etapa 1) ou Gerar Receita (na etapa de ingredientes) */}
        {step === 1 && (
          <SafeAreaFooter>
            <Button 
              onClick={handleAdvance} 
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              {getSelectedCount() > 0 
                ? `Avançar (${getSelectedCount()} ${getSelectedCount() === 1 ? 'filtro' : 'filtros'})` 
                : "Avançar sem filtros"
              }
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </SafeAreaFooter>
        )}
        
        {step === "ingredients" && (
          <SafeAreaFooter>
            <Button 
              onClick={handleGenerateWithIngredients} 
              className="w-full h-12 rounded-xl text-base font-medium gradient-primary border-0"
              disabled={ingredients.length === 0 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              Gerar Receita
            </Button>
          </SafeAreaFooter>
        )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
