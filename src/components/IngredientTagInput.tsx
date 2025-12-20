import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Lista de ingredientes comuns para autocomplete
const COMMON_INGREDIENTS = [
  // Proteínas
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "carne moída", "carne bovina",
  "patinho", "alcatra", "picanha", "costela", "linguiça", "bacon", "presunto", "salsicha",
  "ovo", "ovos", "peixe", "salmão", "atum", "tilápia", "camarão", "sardinha", "merluza",
  "carne de porco", "lombo", "pernil", "tender", "peru",
  
  // Laticínios
  "leite", "queijo", "queijo mussarela", "queijo parmesão", "queijo coalho", "queijo minas",
  "queijo cheddar", "queijo prato", "requeijão", "cream cheese", "creme de leite",
  "leite condensado", "iogurte", "iogurte natural", "manteiga", "margarina", "nata",
  
  // Carboidratos
  "arroz", "arroz integral", "arroz arbóreo", "macarrão", "espaguete", "penne", "fusili",
  "lasanha", "nhoque", "batata", "batata doce", "mandioca", "inhame", "cará",
  "pão", "pão de forma", "pão francês", "farinha de trigo", "farinha de milho", "fubá",
  "polenta", "aveia", "granola", "milho", "ervilha", "lentilha", "grão de bico", "feijão",
  "feijão preto", "feijão carioca", "quinoa", "cuscuz",
  
  // Vegetais
  "alface", "rúcula", "agrião", "espinafre", "couve", "repolho", "acelga",
  "brócolis", "couve-flor", "abobrinha", "berinjela", "pepino", "tomate", "tomate cereja",
  "cenoura", "beterraba", "chuchu", "abóbora", "moranga", "quiabo", "jiló", "maxixe",
  "pimentão", "pimentão vermelho", "pimentão amarelo", "pimentão verde",
  "cebola", "alho", "alho-poró", "cebolinha", "salsinha", "coentro", "hortelã", "manjericão",
  "orégano", "tomilho", "alecrim", "louro", "gengibre", "palmito", "aspargo", "cogumelo",
  "champignon", "shimeji", "shiitake", "vagem",
  
  // Frutas
  "banana", "maçã", "laranja", "limão", "limão siciliano", "abacaxi", "manga", "mamão",
  "melancia", "melão", "morango", "uva", "pêssego", "ameixa", "kiwi", "maracujá",
  "coco", "coco ralado", "abacate", "goiaba", "pera", "figo", "framboesa", "mirtilo",
  "açaí", "cupuaçu", "graviola", "acerola", "jabuticaba", "pitanga",
  
  // Temperos e molhos
  "sal", "pimenta", "pimenta do reino", "páprica", "curry", "açafrão", "cúrcuma",
  "cominho", "noz-moscada", "canela", "cravo", "anis estrelado", "mostarda", "ketchup",
  "maionese", "azeite", "óleo", "vinagre", "molho de soja", "shoyu", "molho inglês",
  "molho de tomate", "extrato de tomate", "catchup", "molho barbecue", "tahine",
  
  // Outros
  "açúcar", "açúcar mascavo", "mel", "xarope de bordo", "chocolate", "cacau", "café",
  "chá", "fermento", "fermento biológico", "bicarbonato", "amido de milho", "gelatina",
  "castanha", "castanha de caju", "amendoim", "amêndoa", "nozes", "pistache",
  "azeitona", "alcaparra", "passas", "damasco seco", "côco", "leite de côco",
];

interface IngredientTagInputProps {
  value: string[];
  onChange: (ingredients: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
}

export default function IngredientTagInput({
  value,
  onChange,
  placeholder = "Digite um ingrediente...",
  disabled = false,
  onSubmit,
}: IngredientTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtra sugestões baseado no input
  const filteredSuggestions = inputValue.length >= 2
    ? COMMON_INGREDIENTS.filter(
        (ingredient) =>
          ingredient.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(ingredient)
      ).slice(0, 8)
    : [];

  // Adiciona ingrediente
  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  // Remove ingrediente
  const removeIngredient = (ingredientToRemove: string) => {
    onChange(value.filter((i) => i !== ingredientToRemove));
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions.length > 0) {
        addIngredient(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        addIngredient(inputValue);
      } else if (value.length > 0 && onSubmit) {
        onSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredSuggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeIngredient(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredSuggestions.length]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container with tags */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-3 py-2 min-h-[48px] rounded-xl border border-border bg-background/50",
          "focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {value.map((ingredient) => (
          <Badge
            key={ingredient}
            variant="secondary"
            className="gap-1 py-1 px-2.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {ingredient}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeIngredient(ingredient);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {/* Input */}
        <div className="flex-1 min-w-[120px] flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : "Adicionar mais..."}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 py-2 bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addIngredient(suggestion)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Plus className="w-4 h-4 text-primary shrink-0" />
              <span className="capitalize">{suggestion}</span>
              <span className="ml-auto text-xs text-muted-foreground">adicionar</span>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      {value.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Digite e selecione ingredientes da lista ou pressione Enter para adicionar
        </p>
      )}
    </div>
  );
}
