import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { 
  Salad, UtensilsCrossed, Wheat, Coffee, Cake, GlassWater, Cookie, Baby, 
  AlertCircle, Globe, Clock, Flame, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RecipeCategory = {
  id: string;
  name: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  subcategories: string[];
};

const RECIPE_CATEGORIES: RecipeCategory[] = [
  {
    id: "entradas",
    name: "Entradas & Leves",
    emoji: "🥗",
    icon: Salad,
    subcategories: ["Saladas", "Molhos para salada", "Pastas e patês", "Antepastos", "Sopas leves", "Caldos", "Cremes frios"],
  },
  {
    id: "principais",
    name: "Pratos Principais",
    emoji: "🍽️",
    icon: UtensilsCrossed,
    subcategories: ["Prato principal tradicional", "Pratos fitness", "Pratos low carb", "Pratos vegetarianos", "Pratos veganos", "Pratos proteicos (high protein)", "Pratos rápidos (até 15 min)", "Pratos elaborados / gourmet"],
  },
  {
    id: "acompanhamentos",
    name: "Acompanhamentos",
    emoji: "🍚",
    icon: Wheat,
    subcategories: ["Arroz e grãos", "Legumes refogados", "Purês", "Farofas", "Massas", "Cuscuz", "Quinoa e derivados"],
  },
  {
    id: "cafe_lanches",
    name: "Café da Manhã & Lanches",
    emoji: "🍳",
    icon: Coffee,
    subcategories: ["Café da manhã", "Lanches rápidos", "Lanches fitness", "Panquecas", "Ovos e omeletes", "Sanduíches", "Tapiocas"],
  },
  {
    id: "sobremesas",
    name: "Sobremesas",
    emoji: "🍰",
    icon: Cake,
    subcategories: ["Sobremesas tradicionais", "Sobremesas fitness", "Sobremesas low carb", "Sobremesas sem açúcar", "Sobremesas veganas", "Bolos", "Tortas doces", "Doces gelados"],
  },
  {
    id: "bebidas",
    name: "Bebidas",
    emoji: "🧃",
    icon: GlassWater,
    subcategories: ["Sucos naturais", "Vitaminas e smoothies", "Shakes proteicos", "Chás", "Bebidas funcionais", "Bebidas detox"],
  },
  {
    id: "snacks",
    name: "Snacks & Petiscos",
    emoji: "🍟",
    icon: Cookie,
    subcategories: ["Petiscos rápidos", "Snacks saudáveis", "Snacks low carb", "Petiscos de forno", "Petiscos de airfryer", "Finger foods"],
  },
  {
    id: "especiais",
    name: "Receitas Especiais",
    emoji: "👶",
    icon: Baby,
    subcategories: ["Receitas infantis (Kids)", "Receitas para marmita", "Receitas para congelar", "Receitas para dieta", "Receitas para emagrecimento", "Receitas para ganho de massa"],
  },
  {
    id: "restricoes",
    name: "Por Restrições Alimentares",
    emoji: "🚫",
    icon: AlertCircle,
    subcategories: ["Sem lactose", "Sem glúten", "Sem açúcar", "Sem ovo", "Sem frutos do mar", "Sem oleaginosas", "Dieta FODMAP", "Dieta cetogênica"],
  },
  {
    id: "culinarias",
    name: "Culinárias do Mundo",
    emoji: "🌍",
    icon: Globe,
    subcategories: ["Brasileira", "Italiana", "Japonesa", "Mexicana", "Árabe", "Indiana", "Mediterrânea", "Americana"],
  },
  {
    id: "tempo",
    name: "Por Tempo de Preparo",
    emoji: "⏱️",
    icon: Clock,
    subcategories: ["Até 10 minutos", "Até 20 minutos", "Até 30 minutos", "Mais de 30 minutos"],
  },
  {
    id: "metodo",
    name: "Por Método de Preparo",
    emoji: "🔥",
    icon: Flame,
    subcategories: ["Airfryer", "Forno", "Panela", "Panela de pressão", "Grelhado", "Cozido", "Cru (raw food)"],
  },
];

interface RecipeCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (category: string, subcategory: string) => void;
  isLoading?: boolean;
}

export default function RecipeCategorySheet({ 
  open, 
  onOpenChange, 
  onSelectCategory,
  isLoading = false 
}: RecipeCategorySheetProps) {
  const [expandedCategory, setExpandedCategory] = useState<string>("");

  const handleSubcategoryClick = (categoryName: string, subcategory: string) => {
    onSelectCategory(categoryName, subcategory);
    onOpenChange(false);
    setExpandedCategory("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0 overflow-hidden"
      >
        <SheetHeader className="px-6 pb-4 border-b">
          <SheetTitle className="text-center font-display text-xl">
            Escolha uma categoria
          </SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(85vh-80px)] px-4 py-4">
          <Accordion 
            type="single" 
            collapsible 
            value={expandedCategory}
            onValueChange={setExpandedCategory}
            className="space-y-2"
          >
            {RECIPE_CATEGORIES.map((category) => (
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
                        key={sub}
                        variant="ghost"
                        className={cn(
                          "justify-between h-auto py-3 px-4 rounded-xl text-left font-normal",
                          "hover:bg-primary/10 hover:text-primary transition-colors"
                        )}
                        onClick={() => handleSubcategoryClick(category.name, sub)}
                        disabled={isLoading}
                      >
                        <span>{sub}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}
