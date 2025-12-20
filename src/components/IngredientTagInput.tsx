import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIngredientConflictCheck, ConflictType } from "@/hooks/useIngredientConflictCheck";
import IngredientConflictDialog from "@/components/IngredientConflictDialog";

// Lista de ingredientes comuns para autocomplete - extensa e detalhada
const COMMON_INGREDIENTS = [
  // Proteínas - Aves
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "file de frango",
  "frango desfiado", "frango inteiro", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  
  // Proteínas - Carnes Bovinas
  "carne", "carne moída", "carne bovina", "patinho", "patinho moído", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "t-bone", "coxão mole", "coxão duro", "lagarto", "paleta",
  "ossobuco", "rabo", "rabada", "mocotó", "carne seca", "carne de sol", "charque",
  "bife", "bife de fígado", "fígado bovino", "bucho", "dobradinha", "língua bovina",
  
  // Proteínas - Suínos
  "carne de porco", "lombo", "lombo de porco", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo", "linguiça",
  "linguiça calabresa", "linguiça toscana", "linguiça de frango", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "salsicha frankfurt", "salsicha viena",
  "presunto", "presunto parma", "presunto serrano", "copa", "salame", "mortadela",
  "tender", "leitão", "pernil defumado",
  
  // Proteínas - Peixes
  "peixe", "filé de peixe", "salmão", "filé de salmão", "salmão defumado", "salmão fresco",
  "atum", "atum em lata", "atum fresco", "tilápia", "filé de tilápia", "bacalhau",
  "bacalhau dessalgado", "sardinha", "sardinha em lata", "sardinha fresca", "merluza",
  "pescada", "pescada amarela", "robalo", "dourado", "pintado", "tambaqui", "pacu",
  "pirarucu", "truta", "linguado", "badejo", "namorado", "corvina", "tainha",
  "anchova", "cavalinha", "arenque", "carpa",
  
  // Proteínas - Frutos do Mar
  "camarão", "camarão rosa", "camarão cinza", "camarão seco", "camarão grande", "camarão médio",
  "lagosta", "lagostim", "lula", "anéis de lula", "polvo", "marisco", "mexilhão", "ostra",
  "vieira", "siri", "caranguejo", "casquinha de siri", "sururu", "camarão descascado",
  
  // Ovos
  "ovo", "ovos", "ovo de galinha", "ovo caipira", "ovo de codorna", "gema", "clara de ovo",
  "ovo cozido", "ovo frito",
  
  // Laticínios - Queijos
  "queijo", "queijo mussarela", "mussarela", "mussarela de búfala", "queijo mussarela de búfala",
  "queijo parmesão", "parmesão", "parmesão ralado", "queijo coalho", "queijo minas",
  "queijo minas frescal", "queijo minas padrão", "queijo minas curado", "queijo cheddar",
  "queijo prato", "queijo provolone", "provolone", "queijo gorgonzola", "gorgonzola",
  "queijo brie", "brie", "queijo camembert", "camembert", "queijo roquefort", "roquefort",
  "queijo gruyère", "gruyère", "queijo emmental", "emmental", "queijo suíço",
  "queijo cottage", "cottage", "queijo ricota", "ricota", "queijo feta", "feta",
  "queijo de cabra", "queijo colonial", "queijo serrano", "queijo canastra",
  "queijo do reino", "queijo estepe", "queijo gouda", "gouda", "queijo pecorino",
  "requeijão", "requeijão cremoso", "cream cheese", "catupiry", "queijo cremoso",
  "queijo ralado", "queijo branco", "queijo fresco", "queijo curado", "queijo defumado",
  "burrata", "mascarpone", "queijo azul", "queijo fundido",
  
  // Laticínios - Leites e Derivados
  "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em pó",
  "leite condensado", "leite evaporado", "leite de cabra", "leite fermentado",
  "creme de leite", "creme de leite fresco", "chantilly", "nata", "coalhada",
  "iogurte", "iogurte natural", "iogurte grego", "iogurte desnatado", "iogurte integral",
  "iogurte de morango", "iogurte de frutas", "kefir", "leitelho", "buttermilk",
  "manteiga", "manteiga com sal", "manteiga sem sal", "manteiga ghee", "ghee",
  "margarina", "creme de ricota",
  
  // Leites Vegetais
  "leite de coco", "leite de amêndoas", "leite de aveia", "leite de soja", "leite de arroz",
  "leite de castanha", "leite de avelã", "creme de coco",
  
  // Carboidratos - Arroz e Grãos
  "arroz", "arroz branco", "arroz integral", "arroz parboilizado", "arroz arbóreo",
  "arroz basmati", "arroz jasmine", "arroz negro", "arroz selvagem", "arroz cateto",
  "arroz para sushi", "risoto",
  
  // Carboidratos - Massas
  "macarrão", "macarrão espaguete", "espaguete", "macarrão penne", "penne",
  "macarrão fusilli", "fusilli", "macarrão farfalle", "farfalle", "macarrão rigatoni",
  "macarrão talharim", "talharim", "macarrão fettuccine", "fettuccine", "macarrão cabelo de anjo",
  "macarrão integral", "macarrão parafuso", "macarrão conchinha", "macarrão padre nosso",
  "lasanha", "massa de lasanha", "canelone", "ravióli", "capeletti", "tortellini",
  "nhoque", "gnocchi", "massa folhada", "massa de pastel", "massa de pizza",
  "massa de torta", "massa de empada", "massa wonton", "macarrão instantâneo", "miojo",
  "macarrão de arroz", "bifum", "udon", "soba", "ramen", "lámen",
  
  // Carboidratos - Pães e Farinhas
  "pão", "pão francês", "pão de forma", "pão integral", "pão de leite", "pão sírio",
  "pão árabe", "pão ciabatta", "pão italiano", "pão australiano", "pão brioche",
  "pão de queijo", "pão de alho", "pão de hot dog", "pão de hambúrguer", "baguete",
  "croissant", "torrada", "biscoito", "bolacha", "cream cracker", "biscoito água e sal",
  "farinha de trigo", "farinha de trigo integral", "farinha de rosca", "farinha de milho",
  "farinha de mandioca", "farinha de tapioca", "tapioca", "polvilho", "polvilho azedo",
  "polvilho doce", "fubá", "amido de milho", "maisena", "fécula de batata",
  "farinha de aveia", "farinha de arroz", "farinha de amêndoas", "farinha de coco",
  "farinha de centeio", "farinha de grão de bico", "semolina",
  
  // Carboidratos - Tubérculos
  "batata", "batata inglesa", "batata doce", "batata doce roxa", "batata baroa",
  "mandioquinha", "mandioca", "aipim", "macaxeira", "inhame", "cará", "taro",
  "batata palha", "batata frita", "purê de batata",
  
  // Leguminosas
  "feijão", "feijão preto", "feijão carioca", "feijão branco", "feijão vermelho",
  "feijão fradinho", "feijão jalo", "feijão de corda", "feijão azuki", "feijão rajado",
  "feijão rosinha", "feijão mulatinho", "feijoada",
  "lentilha", "lentilha verde", "lentilha vermelha", "grão de bico", "ervilha",
  "ervilha seca", "ervilha fresca", "ervilha em conserva", "ervilha torta",
  "soja", "grão de soja", "edamame", "tofu", "tofu firme", "tofu macio",
  "fava", "tremoço",
  
  // Cereais e Grãos
  "aveia", "aveia em flocos", "aveia flocos finos", "farelo de aveia",
  "quinoa", "quinoa branca", "quinoa vermelha", "quinoa preta",
  "trigo", "trigo para quibe", "bulgur", "triguilho", "cuscuz", "cuscuz marroquino",
  "granola", "muesli", "gérmen de trigo", "linhaça", "linhaça dourada", "linhaça marrom",
  "chia", "semente de chia", "gergelim", "gergelim branco", "gergelim preto",
  "painço", "milhete", "amaranto", "centeio", "cevada", "sorgo",
  "milho", "milho verde", "milho em conserva", "milho de pipoca", "pipoca",
  "espiga de milho", "canjica", "canjiquinha", "xerém", "polenta",
  
  // Vegetais - Folhosos
  "alface", "alface americana", "alface crespa", "alface roxa", "alface romana",
  "rúcula", "agrião", "espinafre", "couve", "couve manteiga", "couve mineira",
  "couve kale", "kale", "repolho", "repolho verde", "repolho roxo", "acelga",
  "chicória", "escarola", "endívia", "almeirão", "mostarda", "folha de mostarda",
  "broto de alfafa", "broto de feijão", "moyashi", "microgreens",
  
  // Vegetais - Crucíferos
  "brócolis", "brócolis americano", "brócolis ninja", "brócolis ramoso",
  "couve-flor", "couve-flor branca", "couve-flor roxa", "romanesco",
  "couve de bruxelas", "nabo", "rabanete",
  
  // Vegetais - Frutas (usados como legumes)
  "tomate", "tomate italiano", "tomate cereja", "tomate grape", "tomate caqui",
  "tomate holandês", "tomate seco", "tomate seco em conserva", "tomate pelado",
  "tomate em conserva", "pimentão", "pimentão verde", "pimentão vermelho",
  "pimentão amarelo", "pimentão laranja", "pepino", "pepino japonês",
  "abobrinha", "abobrinha italiana", "abobrinha brasileira", "abobrinha paulista",
  "abóbora", "abóbora cabotiã", "abóbora moranga", "abóbora japonesa", "abóbora menina",
  "abóbora seca", "berinjela", "berinjela japonesa", "jiló", "quiabo", "maxixe", "chuchu",
  
  // Vegetais - Raízes
  "cenoura", "cenoura baby", "beterraba", "rabanete", "nabo",
  
  // Vegetais - Bulbos e Talos
  "cebola", "cebola branca", "cebola roxa", "cebola pérola", "cebola caramelizada",
  "alho", "alho picado", "alho frito", "dente de alho", "cabeça de alho",
  "alho-poró", "cebolinha", "cebolinha verde", "cebola de verdeo", "chalota", "echalote",
  "erva-doce", "funcho", "aipo", "salsão", "palmito", "palmito pupunha", "palmito juçara",
  "aspargo", "aspargo verde", "aspargo branco", "bambu", "broto de bambu",
  
  // Vegetais - Cogumelos
  "cogumelo", "champignon", "champignon fresco", "champignon em conserva",
  "shimeji", "shimeji branco", "shimeji preto", "shiitake", "shiitake seco",
  "portobello", "funghi", "funghi seco", "cogumelo paris", "cogumelo do sol",
  "trufa", "trufa negra", "trufa branca",
  
  // Vegetais - Outros
  "vagem", "ervilha torta", "milho verde", "alcachofra", "coração de alcachofra",
  "azeitona", "azeitona verde", "azeitona preta", "azeitona kalamata",
  "alcaparra", "pepino em conserva", "picles", "pimenta jalapeño", "pimenta dedo de moça",
  
  // Frutas - Cítricas
  "limão", "limão taiti", "limão siciliano", "limão galego", "limão cravo",
  "laranja", "laranja pera", "laranja bahia", "laranja lima", "laranja seleta",
  "tangerina", "mexerica", "ponkan", "clementina", "bergamota",
  "lima", "lima da pérsia", "toranja", "grapefruit", "cidra", "kumquat", "kinkan",
  
  // Frutas - Tropicais
  "banana", "banana prata", "banana nanica", "banana maçã", "banana da terra", "banana ouro",
  "abacaxi", "abacaxi pérola", "manga", "manga tommy", "manga palmer", "manga espada", "manga rosa",
  "mamão", "mamão papaya", "mamão formosa", "maracujá", "maracujá doce", "polpa de maracujá",
  "coco", "coco verde", "coco seco", "coco ralado", "água de coco",
  "goiaba", "goiaba vermelha", "goiaba branca", "açaí", "polpa de açaí",
  "cupuaçu", "graviola", "pitanga", "acerola", "caju", "castanha de caju", "carambola",
  "lichia", "pitaya", "fruta do conde", "ata", "jaca", "abiu", "sapoti",
  "cacau", "jabuticaba", "seriguela", "cajá", "umbu", "mangaba", "murici",
  
  // Frutas - Temperadas
  "maçã", "maçã fuji", "maçã gala", "maçã verde", "pera", "pera williams", "pera danjou",
  "uva", "uva verde", "uva roxa", "uva itália", "uva thompson", "uva passa", "passas",
  "morango", "framboesa", "amora", "mirtilo", "blueberry", "cereja",
  "pêssego", "nectarina", "damasco", "damasco seco", "ameixa", "ameixa seca",
  "figo", "figo fresco", "figo seco", "kiwi", "kiwi verde", "kiwi gold",
  "melancia", "melão", "melão cantaloupe", "melão honeydew",
  "romã", "caqui", "nêspera", "marmelo",
  
  // Frutas Secas e Oleaginosas
  "castanha", "castanha de caju", "castanha do pará", "castanha portuguesa",
  "amendoim", "amendoim torrado", "paçoca", "nozes", "nozes pecã",
  "amêndoa", "amêndoa laminada", "amêndoa farinha", "avelã", "pistache",
  "macadâmia", "pinhão", "coco seco", "tâmara", "frutas secas", "mix de castanhas",
  
  // Ervas Frescas
  "salsinha", "salsa", "coentro", "cebolinha", "manjericão", "manjericão roxo",
  "hortelã", "menta", "alecrim", "tomilho", "orégano fresco", "sálvia",
  "estragão", "endro", "dill", "louro", "folha de louro", "capim limão",
  "capim santo", "erva-cidreira", "lavanda", "erva-doce folha",
  "curry leaves", "folha de curry", "nirá", "cheiro verde",
  
  // Temperos Secos e Especiarias
  "sal", "sal grosso", "sal marinho", "sal rosa", "flor de sal", "sal defumado",
  "pimenta", "pimenta do reino", "pimenta preta", "pimenta branca", "pimenta rosa",
  "pimenta calabresa", "pimenta caiena", "pimenta síria", "pimenta jamaica",
  "pimenta dedo de moça", "pimenta malagueta", "pimenta biquinho", "pimenta habanero",
  "páprica", "páprica doce", "páprica picante", "páprica defumada",
  "cominho", "cominho em pó", "cúrcuma", "açafrão da terra", "gengibre", "gengibre em pó",
  "canela", "canela em pau", "canela em pó", "cravo", "cravo da índia",
  "noz-moscada", "cardamomo", "anis estrelado", "erva-doce semente", "funcho semente",
  "curry", "curry em pó", "garam masala", "tandoori", "za'atar", "ras el hanout",
  "chimichurri", "tempero baiano", "tempero sírio",
  "orégano", "tomilho seco", "alecrim seco", "sálvia seca", "manjericão seco",
  "louro seco", "colorau", "urucum", "açafrão", "saffron",
  "mostarda em grão", "mostarda em pó", "semente de coentro", "semente de cominho",
  "pimenta em flocos", "chili flakes", "sumac", "feno grego",
  
  // Molhos e Condimentos
  "azeite", "azeite de oliva", "azeite extra virgem", "azeite de dendê",
  "óleo", "óleo de soja", "óleo de canola", "óleo de girassol", "óleo de milho",
  "óleo de gergelim", "óleo de coco", "óleo de abacate",
  "vinagre", "vinagre de maçã", "vinagre de vinho tinto", "vinagre de vinho branco",
  "vinagre balsâmico", "vinagre de arroz", "vinagre de álcool",
  "molho de soja", "shoyu", "molho shoyu", "tamari", "molho inglês", "worcestershire",
  "molho de ostra", "molho de peixe", "fish sauce", "molho teriyaki", "molho hoisin",
  "molho de tomate", "extrato de tomate", "passata", "polpa de tomate",
  "catchup", "ketchup", "mostarda", "mostarda dijon", "mostarda amarela",
  "maionese", "maionese caseira", "molho tártaro", "molho rosé",
  "molho barbecue", "molho pesto", "molho chimichurri", "molho tahine", "tahine",
  "pasta de amendoim", "manteiga de amendoim", "pasta de gergelim",
  "pesto", "pesto de manjericão", "harissa", "sriracha", "tabasco",
  "molho buffalo", "molho ranch", "molho caesar",
  "leite de coco", "creme de leite de coco",
  
  // Açúcares e Adoçantes
  "açúcar", "açúcar refinado", "açúcar cristal", "açúcar mascavo", "açúcar demerara",
  "açúcar de confeiteiro", "açúcar de coco", "açúcar light",
  "mel", "mel silvestre", "mel de abelha", "melado", "melado de cana",
  "xarope de bordo", "maple syrup", "xarope de agave", "xarope de milho",
  "glucose", "açúcar invertido", "stevia", "adoçante", "eritritol", "xilitol",
  
  // Chocolates e Cacau
  "chocolate", "chocolate ao leite", "chocolate meio amargo", "chocolate amargo",
  "chocolate branco", "chocolate em pó", "cacau", "cacau em pó", "nibs de cacau",
  "achocolatado", "nutella", "creme de avelã", "gotas de chocolate", "chocolate granulado",
  
  // Café e Chás
  "café", "café em pó", "café solúvel", "café expresso", "chá", "chá verde",
  "chá preto", "chá de hibisco", "chá de camomila", "chá mate", "erva mate",
  
  // Fermentos e Leveduras
  "fermento", "fermento biológico", "fermento biológico seco", "fermento fresco",
  "fermento químico", "fermento em pó", "bicarbonato", "bicarbonato de sódio",
  "cremor de tártaro", "levedura nutricional",
  
  // Conservas e Enlatados
  "milho em conserva", "ervilha em conserva", "palmito em conserva", "aspargo em conserva",
  "atum em lata", "sardinha em lata", "grão de bico em conserva", "feijão em conserva",
  "tomate pelado em lata", "cogumelo em conserva",
  
  // Bebidas para Culinária
  "vinho branco", "vinho tinto", "vinho do porto", "vinho marsala",
  "cerveja", "champagne", "conhaque", "rum", "cachaça", "licor",
  "saquê", "mirin",
  
  // Ingredientes Asiáticos
  "gengibre", "wasabi", "nori", "alga nori", "wakame", "kombu", "missô", "pasta de missô",
  "tofu", "tempeh", "leite de coco", "curry paste", "pasta de curry",
  "macarrão de arroz", "papel de arroz", "wonton", "gyoza",
  
  // Outros Ingredientes
  "gelatina", "gelatina em pó", "gelatina em folha", "ágar-ágar",
  "corante alimentício", "essência de baunilha", "extrato de baunilha", "baunilha",
  "raspas de limão", "raspas de laranja", "zest",
];

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
};

interface IngredientTagInputProps {
  value: string[];
  onChange: (ingredients: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  userProfile?: UserProfile | null;
}

export default function IngredientTagInput({
  value,
  onChange,
  placeholder = "Digite um ingrediente...",
  disabled = false,
  onSubmit,
  userProfile = null,
}: IngredientTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estado para o diálogo de conflito
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictType | null>(null);
  const [pendingIngredient, setPendingIngredient] = useState<string | null>(null);
  
  // Hook de verificação de conflitos
  const { checkConflict } = useIngredientConflictCheck(userProfile);

  // Filtra sugestões baseado no input - abre imediatamente com 1+ caracteres
  const filteredSuggestions = inputValue.length >= 1
    ? COMMON_INGREDIENTS.filter(
        (ingredient) =>
          ingredient.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(ingredient)
      ).slice(0, 10)
    : [];

  // Adiciona ingrediente (após verificação ou confirmação)
  const doAddIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  // Tenta adicionar ingrediente (verifica conflitos primeiro)
  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) {
      setInputValue("");
      return;
    }
    
    // Verificar conflitos
    const conflict = checkConflict(trimmed);
    if (conflict) {
      setPendingIngredient(trimmed);
      setCurrentConflict(conflict);
      setConflictDialogOpen(true);
    } else {
      doAddIngredient(trimmed);
    }
  };
  
  // Confirmar adição após conflito
  const handleConflictConfirm = () => {
    if (pendingIngredient) {
      doAddIngredient(pendingIngredient);
    }
    setConflictDialogOpen(false);
    setCurrentConflict(null);
    setPendingIngredient(null);
  };
  
  // Cancelar adição após conflito
  const handleConflictCancel = () => {
    setConflictDialogOpen(false);
    setCurrentConflict(null);
    setPendingIngredient(null);
    setInputValue("");
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
    <div ref={containerRef} className="relative w-full" style={{ zIndex: showSuggestions ? 100 : 'auto' }}>
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
        <div className="absolute z-[9999] w-full mt-2 py-2 bg-popover border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto">
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
      
      {/* Diálogo de conflito */}
      <IngredientConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        conflict={currentConflict}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}
