import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  Salad, UtensilsCrossed, Wheat, Coffee, Cake, GlassWater, Cookie,
  Globe, Clock, Flame, ChevronRight, ArrowLeft, Check, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilteredRecipeCategories } from "@/hooks/useFilteredRecipeCategories";

// Filtros opcionais (Etapa 1)
const FILTERS = {
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
  isLoading?: boolean;
}

export default function RecipeCategorySheet({ 
  open, 
  onOpenChange, 
  onSelectCategory,
  isLoading = false 
}: RecipeCategorySheetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [expandedFilter, setExpandedFilter] = useState<string>("");
  const [expandedCategory, setExpandedCategory] = useState<string>("");
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});
  
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
    setStep(1);
    setExpandedCategory("");
  };

  const handleSubcategoryClick = (categoryName: string, subcategory: string) => {
    onSelectCategory(categoryName, subcategory, selectedFilters);
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
    }, 300);
  };

  const getSelectedCount = () => {
    return Object.keys(selectedFilters).length;
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0 overflow-hidden"
      >
        <SheetHeader className="px-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {step === 2 ? (
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
              {step === 1 ? "Personalize sua busca" : "Escolha uma categoria"}
            </SheetTitle>
            {step === 2 && <div className="w-8" />}
          </div>
          {step === 1 && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Selecione os filtros desejados (opcional)
            </p>
          )}
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(85vh-140px)] px-4 py-4">
          {step === 1 ? (
            // Etapa 1: Filtros
            <Accordion 
              type="single" 
              collapsible 
              value={expandedFilter}
              onValueChange={setExpandedFilter}
              className="space-y-2"
            >
              {Object.values(FILTERS).map((filter) => {
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
                        {filter.options.map((option) => (
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

        {/* Footer com botão Avançar (apenas na etapa 1) - com safe-area para dispositivos móveis */}
        {step === 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background border-t">
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
