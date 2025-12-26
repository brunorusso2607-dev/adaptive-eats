// ============================================
// RECEITAI - CONFIGURAÇÃO CENTRALIZADA DE RECEITAS
// ============================================
// Este arquivo é a RAIZ ÚNICA para todos os geradores de receitas.
// Qualquer alteração aqui afeta: generate-recipe, generate-meal-plan, regenerate-meal

// ============================================
// TIPOS
// ============================================

export interface UserProfile {
  id: string;
  sex?: string | null;
  age?: number | null;
  height?: number | null;
  weight_current?: number | null;
  weight_goal?: number | null;
  activity_level?: string | null;
  goal?: string | null;
  dietary_preference?: string | null;
  context?: string | null;
  intolerances?: string[] | null;
  excluded_ingredients?: string[] | null;
  country?: string | null; // ISO 3166-1 alpha-2 (BR, US, MX, etc.)
}

// ============================================
// CONFIGURAÇÃO DE CULINÁRIA POR PAÍS
// ============================================

export interface CountryCuisineConfig {
  name: string;
  language: string;
  ingredientPriority: string;
  mealTypeLabels: Record<string, string>;
  mealExamples: Record<string, string[]>;
}

export const COUNTRY_CUISINE_CONFIG: Record<string, CountryCuisineConfig> = {
  BR: {
    name: "Brasil",
    language: "pt-BR",
    ingredientPriority: "Priorize ingredientes de fácil acesso no Brasil",
    mealTypeLabels: {
      cafe_manha: "Café da Manhã",
      almoco: "Almoço",
      lanche: "Lanche da Tarde",
      jantar: "Jantar",
      ceia: "Ceia"
    },
    mealExamples: {
      cafe_manha: ["tapioca recheada", "pão francês com manteiga", "mingau de aveia", "vitamina de banana", "cuscuz nordestino"],
      almoco: ["arroz com feijão e bife", "frango grelhado com legumes", "feijoada light", "strogonoff de frango", "moqueca de peixe"],
      lanche: ["pão de queijo", "açaí na tigela", "sanduíche natural", "bolo de cenoura", "tapioca"],
      jantar: ["sopa de legumes", "omelete de legumes", "salada completa", "wrap leve", "creme de abóbora"],
      ceia: ["chá com biscoito integral", "iogurte natural", "frutas", "queijo cottage"]
    }
  },
  US: {
    name: "Estados Unidos",
    language: "en-US",
    ingredientPriority: "Prioritize ingredients commonly available in the United States",
    mealTypeLabels: {
      cafe_manha: "Breakfast",
      almoco: "Lunch",
      lanche: "Snack",
      jantar: "Dinner",
      ceia: "Late Night Snack"
    },
    mealExamples: {
      cafe_manha: ["scrambled eggs with bacon", "pancakes with maple syrup", "oatmeal with berries", "bagel with cream cheese", "avocado toast", "smoothie bowl"],
      almoco: ["grilled chicken salad", "turkey club sandwich", "burrito bowl", "mac and cheese", "chicken wrap"],
      lanche: ["protein bar", "trail mix", "apple with peanut butter", "greek yogurt", "cheese and crackers"],
      jantar: ["grilled salmon with vegetables", "BBQ chicken", "steak with mashed potatoes", "pasta primavera", "beef stir-fry"],
      ceia: ["cottage cheese", "warm milk", "handful of almonds", "banana"]
    }
  },
  MX: {
    name: "México",
    language: "es-MX",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina mexicana",
    mealTypeLabels: {
      cafe_manha: "Desayuno",
      almoco: "Comida",
      lanche: "Merienda",
      jantar: "Cena",
      ceia: "Cena Ligera"
    },
    mealExamples: {
      cafe_manha: ["huevos rancheros", "chilaquiles verdes", "molletes", "quesadillas de queso", "licuado de frutas"],
      almoco: ["tacos de carne asada", "enchiladas rojas", "pozole rojo", "mole con pollo", "chiles rellenos"],
      lanche: ["elote con mayonesa", "fruta con chile", "tostadas de aguacate", "guacamole con totopos"],
      jantar: ["sopa de tortilla", "quesadillas", "flautas de pollo", "tostadas de tinga", "tamales"],
      ceia: ["té de manzanilla", "yogur natural", "fruta picada"]
    }
  },
  PT: {
    name: "Portugal",
    language: "pt-PT",
    ingredientPriority: "Prioriza ingredientes típicos da culinária portuguesa",
    mealTypeLabels: {
      cafe_manha: "Pequeno-almoço",
      almoco: "Almoço",
      lanche: "Lanche",
      jantar: "Jantar",
      ceia: "Ceia"
    },
    mealExamples: {
      cafe_manha: ["torrada com manteiga", "pastel de nata", "iogurte com cereais", "pão com queijo", "café com leite"],
      almoco: ["bacalhau à brás", "francesinha", "caldo verde", "arroz de pato", "sardinha assada"],
      lanche: ["pastel de nata", "bolo de arroz", "sandes de presunto", "fruta"],
      jantar: ["sopa de legumes", "peixe grelhado", "omelete", "bifanas", "polvo à lagareiro"],
      ceia: ["chá de camomila", "iogurte", "fruta", "queijo fresco"]
    }
  },
  ES: {
    name: "España",
    language: "es-ES",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina española",
    mealTypeLabels: {
      cafe_manha: "Desayuno",
      almoco: "Almuerzo",
      lanche: "Merienda",
      jantar: "Cena",
      ceia: "Cena Ligera"
    },
    mealExamples: {
      cafe_manha: ["tostada con tomate", "churros con chocolate", "tortilla española", "zumo de naranja"],
      almoco: ["paella valenciana", "gazpacho andaluz", "cocido madrileño", "fabada asturiana", "pulpo a la gallega"],
      lanche: ["bocadillo de jamón", "magdalenas", "fruta de temporada"],
      jantar: ["tortilla española", "ensalada mixta", "croquetas", "gambas al ajillo", "pimientos de padrón"],
      ceia: ["yogur natural", "frutos secos", "queso manchego"]
    }
  },
  AR: {
    name: "Argentina",
    language: "es-AR",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina argentina",
    mealTypeLabels: {
      cafe_manha: "Desayuno",
      almoco: "Almuerzo",
      lanche: "Merienda",
      jantar: "Cena",
      ceia: "Cena Ligera"
    },
    mealExamples: {
      cafe_manha: ["medialunas con café", "tostadas con dulce de leche", "mate con facturas"],
      almoco: ["asado con ensalada", "milanesa napolitana", "empanadas", "locro", "bife de chorizo"],
      lanche: ["alfajores", "mate con facturas", "tostado de jamón y queso"],
      jantar: ["pizza argentina", "pasta con salsa", "provoleta", "choripán"],
      ceia: ["yogur", "fruta", "queso con membrillo"]
    }
  },
  CO: {
    name: "Colombia",
    language: "es-CO",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina colombiana",
    mealTypeLabels: {
      cafe_manha: "Desayuno",
      almoco: "Almuerzo",
      lanche: "Onces",
      jantar: "Cena",
      ceia: "Cena Ligera"
    },
    mealExamples: {
      cafe_manha: ["arepa con queso", "huevos pericos", "calentado", "changua", "pandebono"],
      almoco: ["bandeja paisa", "ajiaco bogotano", "sancocho", "arroz con pollo", "lechona"],
      lanche: ["empanadas", "buñuelos", "almojábanas", "fruta con sal"],
      jantar: ["sopa de mondongo", "tamales", "patacones con hogao"],
      ceia: ["aromática", "galletas", "queso con bocadillo"]
    }
  },
  CL: {
    name: "Chile",
    language: "es-CL",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina chilena",
    mealTypeLabels: {
      cafe_manha: "Desayuno",
      almoco: "Almuerzo",
      lanche: "Once",
      jantar: "Cena",
      ceia: "Cena Ligera"
    },
    mealExamples: {
      cafe_manha: ["pan con palta", "huevos revueltos", "tostadas con mermelada", "leche con cereales"],
      almoco: ["pastel de choclo", "cazuela de pollo", "empanadas de pino", "curanto", "porotos con riendas"],
      lanche: ["pan con queso", "kuchen", "té con sopaipillas"],
      jantar: ["caldillo de congrio", "plateada", "ensalada chilena"],
      ceia: ["té con galletas", "fruta", "yogur"]
    }
  },
  PE: {
    name: "Perú",
    language: "es-PE",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina peruana",
    mealTypeLabels: {
      cafe_manha: "Desayuno",
      almoco: "Almuerzo",
      lanche: "Lonche",
      jantar: "Cena",
      ceia: "Cena Ligera"
    },
    mealExamples: {
      cafe_manha: ["pan con chicharrón", "quinua con leche", "tamales", "jugo de papaya"],
      almoco: ["ceviche", "lomo saltado", "ají de gallina", "arroz con pollo", "causa limeña"],
      lanche: ["picarones", "anticuchos", "papa rellena"],
      jantar: ["sopa criolla", "tacu tacu", "arroz chaufa"],
      ceia: ["emoliente", "mazamorra morada", "fruta"]
    }
  },
  FR: {
    name: "France",
    language: "fr-FR",
    ingredientPriority: "Privilégiez les ingrédients typiques de la cuisine française",
    mealTypeLabels: {
      cafe_manha: "Petit-déjeuner",
      almoco: "Déjeuner",
      lanche: "Goûter",
      jantar: "Dîner",
      ceia: "Collation"
    },
    mealExamples: {
      cafe_manha: ["croissant au beurre", "pain au chocolat", "tartine avec confiture", "café au lait", "œufs brouillés"],
      almoco: ["coq au vin", "ratatouille", "quiche lorraine", "boeuf bourguignon", "salade niçoise"],
      lanche: ["madeleine", "pain au chocolat", "fruit frais"],
      jantar: ["soupe à l'oignon", "croque-monsieur", "omelette aux fines herbes", "poisson grillé"],
      ceia: ["tisane", "yaourt nature", "fromage blanc"]
    }
  },
  IT: {
    name: "Italia",
    language: "it-IT",
    ingredientPriority: "Privilegia ingredienti tipici della cucina italiana",
    mealTypeLabels: {
      cafe_manha: "Colazione",
      almoco: "Pranzo",
      lanche: "Merenda",
      jantar: "Cena",
      ceia: "Spuntino Serale"
    },
    mealExamples: {
      cafe_manha: ["cornetto con cappuccino", "pane con marmellata", "fette biscottate", "yogurt con granola"],
      almoco: ["pasta al pomodoro", "risotto ai funghi", "lasagna alla bolognese", "insalata caprese", "gnocchi al pesto"],
      lanche: ["bruschetta", "frutta fresca", "biscotti", "gelato"],
      jantar: ["minestrone", "pesce alla griglia", "pollo arrosto", "pizza margherita", "frittata"],
      ceia: ["tisana", "frutta", "parmigiano con miele"]
    }
  },
  DE: {
    name: "Deutschland",
    language: "de-DE",
    ingredientPriority: "Bevorzugen Sie typisch deutsche Zutaten",
    mealTypeLabels: {
      cafe_manha: "Frühstück",
      almoco: "Mittagessen",
      lanche: "Kaffee und Kuchen",
      jantar: "Abendessen",
      ceia: "Spätmahlzeit"
    },
    mealExamples: {
      cafe_manha: ["brötchen mit käse", "müsli mit joghurt", "rührei mit speck", "vollkornbrot"],
      almoco: ["schnitzel mit kartoffelsalat", "bratwurst mit sauerkraut", "rinderroulade", "spätzle"],
      lanche: ["apfelstrudel", "käsekuchen", "brezel"],
      jantar: ["brotzeit", "currywurst", "eintopf", "gulaschsuppe"],
      ceia: ["kräutertee", "joghurt", "obst"]
    }
  },
  GB: {
    name: "United Kingdom",
    language: "en-GB",
    ingredientPriority: "Prioritise ingredients common in British cuisine",
    mealTypeLabels: {
      cafe_manha: "Breakfast",
      almoco: "Lunch",
      lanche: "Afternoon Tea",
      jantar: "Dinner",
      ceia: "Supper"
    },
    mealExamples: {
      cafe_manha: ["full english breakfast", "porridge with berries", "toast with marmalade", "eggs benedict"],
      almoco: ["fish and chips", "shepherd's pie", "cornish pasty", "ploughman's lunch", "jacket potato"],
      lanche: ["scones with cream", "cucumber sandwiches", "victoria sponge"],
      jantar: ["roast beef with yorkshire pudding", "chicken tikka masala", "bangers and mash", "cottage pie"],
      ceia: ["warm milk", "digestive biscuits", "cheese and crackers"]
    }
  },
  JP: {
    name: "日本",
    language: "ja-JP",
    ingredientPriority: "日本で一般的に入手可能な食材を優先してください",
    mealTypeLabels: {
      cafe_manha: "朝食 (Breakfast)",
      almoco: "昼食 (Lunch)",
      lanche: "おやつ (Snack)",
      jantar: "夕食 (Dinner)",
      ceia: "夜食 (Late Snack)"
    },
    mealExamples: {
      cafe_manha: ["onigiri with nori", "miso soup with tofu", "tamagoyaki", "natto with rice", "japanese breakfast set"],
      almoco: ["ramen", "donburi", "bento box", "udon", "curry rice", "tonkatsu"],
      lanche: ["onigiri", "edamame", "mochi", "senbei", "matcha latte"],
      jantar: ["teriyaki salmon", "tonkatsu", "sukiyaki", "sashimi", "yakitori", "tempura"],
      ceia: ["green tea", "rice ball", "fruit", "taiyaki"]
    }
  },
  CN: {
    name: "中国",
    language: "zh-CN",
    ingredientPriority: "优先使用中国常见的食材",
    mealTypeLabels: {
      cafe_manha: "早餐 (Breakfast)",
      almoco: "午餐 (Lunch)",
      lanche: "点心 (Snack)",
      jantar: "晚餐 (Dinner)",
      ceia: "夜宵 (Late Snack)"
    },
    mealExamples: {
      cafe_manha: ["congee with pickles", "jianbing", "baozi", "soy milk with youtiao", "dim sum"],
      almoco: ["kung pao chicken", "mapo tofu", "sweet and sour pork", "fried rice", "dumplings"],
      lanche: ["spring rolls", "egg tarts", "sesame balls", "steamed buns"],
      jantar: ["hot pot", "peking duck", "twice-cooked pork", "steamed fish", "stir-fried vegetables"],
      ceia: ["chrysanthemum tea", "fruit", "light congee"]
    }
  },
  KR: {
    name: "한국",
    language: "ko-KR",
    ingredientPriority: "한국에서 쉽게 구할 수 있는 재료를 우선시하세요",
    mealTypeLabels: {
      cafe_manha: "아침 (Breakfast)",
      almoco: "점심 (Lunch)",
      lanche: "간식 (Snack)",
      jantar: "저녁 (Dinner)",
      ceia: "야식 (Late Snack)"
    },
    mealExamples: {
      cafe_manha: ["korean breakfast with rice and soup", "gimbap", "gyeran-jjim", "juk (rice porridge)"],
      almoco: ["bibimbap", "bulgogi", "kimchi jjigae", "samgyeopsal", "japchae"],
      lanche: ["tteokbokki", "hotteok", "kimbap", "bungeoppang"],
      jantar: ["samgyetang", "galbi", "doenjang jjigae", "jeyuk bokkeum"],
      ceia: ["barley tea", "fruit", "rice cakes"]
    }
  },
  IN: {
    name: "India",
    language: "en-IN",
    ingredientPriority: "Prioritize ingredients commonly available in India",
    mealTypeLabels: {
      cafe_manha: "Breakfast",
      almoco: "Lunch",
      lanche: "Evening Snacks",
      jantar: "Dinner",
      ceia: "Light Dinner"
    },
    mealExamples: {
      cafe_manha: ["idli with sambar", "dosa with chutney", "poha", "paratha with curd", "upma", "aloo puri"],
      almoco: ["dal tadka with rice", "chicken curry", "paneer butter masala", "biryani", "roti with sabzi"],
      lanche: ["samosa", "pakora", "chaat", "vada pav", "masala chai with biscuits"],
      jantar: ["palak paneer", "chicken tikka", "dal makhani", "khichdi", "vegetable korma"],
      ceia: ["warm milk with turmeric", "fruit", "light khichdi"]
    }
  },
  AU: {
    name: "Australia",
    language: "en-AU",
    ingredientPriority: "Prioritise ingredients commonly available in Australia",
    mealTypeLabels: {
      cafe_manha: "Breakfast",
      almoco: "Lunch",
      lanche: "Arvo Snack",
      jantar: "Dinner",
      ceia: "Supper"
    },
    mealExamples: {
      cafe_manha: ["avocado toast with poached eggs", "vegemite on toast", "acai bowl", "big breakfast", "smashed avo"],
      almoco: ["meat pie", "fish and chips", "chicken schnitzel", "poke bowl", "barramundi"],
      lanche: ["tim tams", "lamingtons", "fruit", "flat white"],
      jantar: ["grilled kangaroo", "lamb chops", "pavlova", "bbq prawns", "chicken parmigiana"],
      ceia: ["herbal tea", "yogurt", "anzac biscuits"]
    }
  },
  CA: {
    name: "Canada",
    language: "en-CA",
    ingredientPriority: "Prioritize ingredients commonly available in Canada",
    mealTypeLabels: {
      cafe_manha: "Breakfast",
      almoco: "Lunch",
      lanche: "Snack",
      jantar: "Dinner",
      ceia: "Late Snack"
    },
    mealExamples: {
      cafe_manha: ["pancakes with maple syrup", "eggs benedict", "canadian bacon", "montreal bagel", "oatmeal"],
      almoco: ["poutine", "montreal smoked meat sandwich", "tourtière", "caesar salad"],
      lanche: ["butter tarts", "nanaimo bars", "maple cookies", "apple slices"],
      jantar: ["salmon", "roast turkey", "alberta beef steak", "wild rice pilaf"],
      ceia: ["chamomile tea", "fruit", "cheese"]
    }
  },
  AE: {
    name: "الإمارات",
    language: "ar-AE",
    ingredientPriority: "Prioritize ingredients common in Middle Eastern and Emirati cuisine",
    mealTypeLabels: {
      cafe_manha: "فطور (Breakfast)",
      almoco: "غداء (Lunch)",
      lanche: "سناك (Snack)",
      jantar: "عشاء (Dinner)",
      ceia: "وجبة خفيفة (Light Meal)"
    },
    mealExamples: {
      cafe_manha: ["shakshuka", "foul medames", "labneh with pita", "manakish", "date smoothie"],
      almoco: ["chicken machboos", "lamb ouzi", "grilled kebab", "biryani", "harees"],
      lanche: ["hummus with pita", "falafel", "dates", "arabic coffee with sweets"],
      jantar: ["grilled fish", "shawarma", "stuffed vine leaves", "fattoush salad"],
      ceia: ["warm milk with honey", "dates", "light soup"]
    }
  }
};

// ============================================
// FUNÇÕES UTILITÁRIAS DE PAÍS
// ============================================

/**
 * Obtém configuração do país (fallback para BR)
 */
export function getCountryConfig(country: string | null | undefined): CountryCuisineConfig {
  return COUNTRY_CUISINE_CONFIG[country || "BR"] || COUNTRY_CUISINE_CONFIG["BR"];
}

/**
 * Obtém exemplos de refeição por tipo e país
 */
export function getMealExamples(mealType: string, country: string | null | undefined): string[] {
  const config = getCountryConfig(country);
  return config.mealExamples[mealType] || config.mealExamples["almoco"] || [];
}

/**
 * Obtém instrução de prioridade de ingredientes por país
 */
export function getIngredientPriority(country: string | null | undefined): string {
  return getCountryConfig(country).ingredientPriority;
}

/**
 * Obtém labels de tipo de refeição por país
 */
export function getMealTypeLabel(mealType: string, country: string | null | undefined): string {
  const config = getCountryConfig(country);
  return config.mealTypeLabels[mealType] || MEAL_TYPE_LABELS[mealType] || mealType;
}

export interface MacroTargets {
  dailyCalories: number;
  dailyProtein: number;
  mode: "lose" | "gain" | "maintain";
}

export interface CategoryContext {
  category?: string;
  subcategory?: string;
  filters?: {
    culinaria?: string;
    tempo?: string;
    metodo?: string;
  };
}

// ============================================
// MAPEAMENTO EXPANDIDO DE INGREDIENTES PROIBIDOS
// ============================================
// Lista COMPLETA de todos os ingredientes e derivados que JAMAIS
// devem aparecer em receitas para usuários com cada intolerância

export const FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  lactose: [
    // Leite e derivados diretos
    "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em pó",
    "leite condensado", "leite evaporado", "leite de vaca", "leite de cabra", "leite de búfala",
    // Queijos
    "queijo", "queijo muçarela", "queijo mussarela", "queijo parmesão", "queijo prato",
    "queijo coalho", "queijo minas", "queijo cottage", "queijo ricota", "queijo gorgonzola",
    "queijo provolone", "queijo brie", "queijo camembert", "queijo cheddar", "queijo gouda",
    "queijo gruyère", "queijo feta", "queijo roquefort", "queijo mascarpone", "queijo cream cheese",
    "queijo pecorino", "queijo manchego", "queijo emmental", "queijo suíço", "cream cheese",
    // Creme e manteiga
    "manteiga", "manteiga com sal", "manteiga sem sal", "manteiga ghee", "ghee",
    "creme de leite", "creme de leite fresco", "nata", "chantilly", "chantili",
    "creme chantilly", "creme fraîche", "creme azedo", "sour cream",
    // Iogurte
    "iogurte", "iogurte natural", "iogurte grego", "iogurte integral", "iogurte desnatado",
    "coalhada", "kefir", "leite fermentado", "yakult",
    // Requeijão e similares
    "requeijão", "requeijão cremoso", "requeijão light", "catupiry", "polenguinho",
    // Produtos processados com lactose
    "whey", "whey protein", "proteína do soro do leite", "caseína", "caseinato",
    "lactose", "soro de leite", "lactoalbumina", "lactoglobulina",
    // Doces com lactose
    "doce de leite", "brigadeiro", "leite moça", "pudim de leite",
    // Outros
    "fondue", "bechamel", "molho branco", "molho quatro queijos", "molho alfredo",
  ],
  
  gluten: [
    // Trigo e derivados
    "trigo", "farinha de trigo", "farinha branca", "farinha integral", "farinha de rosca",
    "farelo de trigo", "gérmen de trigo", "trigo integral", "trigo sarraceno",
    // Pães
    "pão", "pão francês", "pão de forma", "pão integral", "pão sírio", "pão árabe",
    "pão ciabatta", "pão italiano", "pão de leite", "pão de queijo", "torrada",
    "crouton", "croûton", "bruschetta", "focaccia", "bagel", "brioche",
    // Massas
    "macarrão", "espaguete", "penne", "fusilli", "farfalle", "lasanha", "nhoque",
    "ravióli", "tortellini", "capeletti", "talharim", "fettuccine", "massa",
    "massa folhada", "massa de pizza", "massa de torta", "massa de pastel",
    // Cereais
    "aveia", "aveia em flocos", "farelo de aveia", "cevada", "centeio", "malte",
    "cerveja", "uísque", "whisky",
    // Biscoitos e bolos
    "biscoito", "bolacha", "cookie", "bolo", "bolo pronto", "mistura para bolo",
    "wafer", "pretzel", "cream cracker",
    // Empanados
    "empanado", "milanesa", "breading", "nuggets", "croquete",
    // Molhos
    "molho shoyu", "shoyu", "molho de soja industrializado", "molho teriyaki",
    "molho inglês", "molho barbecue industrializado",
    // Outros
    "seitan", "bulgur", "cuscuz de trigo", "semolina", "sêmola",
  ],
  
  acucar: [
    // Açúcares diretos
    "açúcar", "açúcar refinado", "açúcar cristal", "açúcar mascavo", "açúcar demerara",
    "açúcar de confeiteiro", "açúcar invertido", "açúcar de coco",
    // Xaropes
    "mel", "melado", "melaço", "xarope de milho", "xarope de glicose", "xarope de agave",
    "xarope de bordo", "maple syrup", "xarope de frutose",
    // Outros doces
    "rapadura", "caramelo", "calda", "geleia", "compota", "doce",
    // Adoçantes calóricos
    "maltodextrina", "dextrose", "frutose",
  ],
  
  amendoim: [
    "amendoim", "amendoins", "pasta de amendoim", "manteiga de amendoim", "paçoca",
    "óleo de amendoim", "farinha de amendoim", "pé de moleque",
  ],
  
  frutos_mar: [
    // Peixes
    "peixe", "salmão", "atum", "tilápia", "bacalhau", "sardinha", "anchova",
    "truta", "robalo", "dourado", "pescada", "merluza", "linguado", "badejo",
    "cavala", "arenque", "carpa",
    // Frutos do mar
    "camarão", "camarões", "lagosta", "lagostim", "caranguejo", "siri",
    "lula", "polvo", "mexilhão", "marisco", "ostra", "vieira", "berbigão",
    "sururu", "vongole",
    // Derivados
    "óleo de peixe", "molho de peixe", "molho de ostra", "pasta de anchova",
    "caldo de peixe", "fumet",
  ],
  
  ovo: [
    "ovo", "ovos", "ovo inteiro", "clara de ovo", "gema de ovo", "ovo caipira",
    "ovo de codorna", "ovo cozido", "ovo frito", "ovo mexido", "omelete",
    "fritada", "gemada", "merengue", "suspiro", "clara em neve",
    // Produtos com ovo
    "maionese", "aioli", "molho holandês", "molho béarnaise", "carbonara",
    "massa fresca com ovo", "panqueca", "waffle", "brioche", "pão de ló",
  ],
  
  soja: [
    "soja", "grão de soja", "proteína de soja", "proteína texturizada de soja",
    "tofu", "tofu firme", "tofu macio", "tofu defumado",
    "leite de soja", "bebida de soja", "iogurte de soja",
    "edamame", "missô", "molho shoyu", "shoyu", "tamari",
    "tempeh", "natto", "óleo de soja", "lecitina de soja",
  ],
  
  castanhas: [
    "castanha", "castanhas", "castanha de caju", "castanha do pará", "castanha do brasil",
    "nozes", "noz", "noz pecã", "noz moscada",
    "amêndoa", "amêndoas", "farinha de amêndoa", "leite de amêndoa",
    "avelã", "avelãs", "creme de avelã", "nutella",
    "pistache", "pistaches", "macadâmia", "pinhão", "pinhões",
    "pasta de castanha", "manteiga de amêndoa", "manteiga de castanha",
  ],
};

// ============================================
// LABELS - MAPEAMENTOS LEGÍVEIS
// ============================================

export const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "SEM LACTOSE (nenhum leite, queijo, manteiga, creme de leite, iogurte, requeijão ou quaisquer derivados de leite)",
  gluten: "SEM GLÚTEN (nenhuma farinha de trigo, aveia, cevada, centeio, pão, macarrão comum, biscoitos ou derivados)",
  acucar: "SEM AÇÚCAR (nenhum açúcar refinado, mascavo, demerara, mel, xarope, ou adoçantes calóricos)",
  amendoim: "SEM AMENDOIM (nenhum amendoim, pasta de amendoim, óleo de amendoim ou derivados)",
  frutos_mar: "SEM FRUTOS DO MAR (nenhum camarão, lagosta, caranguejo, peixe, mariscos, lula, polvo ou derivados)",
  ovo: "SEM OVO (nenhum ovo inteiro, clara, gema, maionese tradicional, ou produtos com ovo)",
  soja: "SEM SOJA (nenhum tofu, leite de soja, molho shoyu, edamame ou derivados de soja)",
  castanhas: "SEM CASTANHAS (nenhuma castanha, noz, amêndoa, avelã, pistache, macadâmia ou derivados)",
};

export const DIETARY_LABELS: Record<string, string> = {
  comum: "alimentação comum (onívora, sem restrições de origem animal)",
  vegetariana: "vegetariana (sem carnes vermelhas, aves e peixes, mas permite ovos e laticínios)",
  vegana: "vegana (100% vegetal, sem NENHUM produto de origem animal: carnes, ovos, leite, mel, queijo)",
  low_carb: "low carb (baixo carboidrato, priorizar proteínas e gorduras boas, evitar açúcares e amidos)",
  pescetariana: "pescetariana (sem carnes vermelhas e aves, mas permite peixes, frutos do mar, ovos e laticínios)",
  cetogenica: "cetogênica/keto (muito baixo carboidrato, alta gordura, moderada proteína - evitar grãos, açúcares, frutas doces, tubérculos)",
  flexitariana: "flexitariana (majoritariamente vegetariana, com consumo ocasional e moderado de carnes - priorizar vegetais)",
};

export const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecimento (déficit calórico controlado, foco em saciedade e proteína)",
  manter: "manutenção de peso (calorias equilibradas)",
  ganhar_peso: "ganho de massa muscular (superávit calórico controlado, alta proteína)",
};

// Deriva meta calórica automaticamente do objetivo do usuário
export function deriveCalorieGoalFromGoal(goal: string | null | undefined): string {
  switch (goal) {
    case "emagrecer": return "reduzir";
    case "ganhar_peso": return "aumentar";
    default: return "manter";
  }
}

export const CALORIE_LABELS: Record<string, string> = {
  reduzir: "reduzir calorias (porções menores, menos calóricas)",
  manter: "manter calorias normais",
  aumentar: "aumentar calorias (porções maiores, mais densas)",
};

export const COMPLEXITY_LABELS: Record<string, string> = {
  rapida: "rápida e prática (até 20 minutos de preparo)",
  equilibrada: "equilibrada (20-40 minutos de preparo)",
  elaborada: "elaborada (mais de 40 minutos, receitas mais sofisticadas)",
};

export const CONTEXT_LABELS: Record<string, string> = {
  individual: "pessoa individual (2 porções)",
  familia: "família (4 porções, receitas que agradam a todos)",
  modo_kids: "modo kids (receitas divertidas e kid-friendly)",
};

export const SEX_LABELS: Record<string, string> = {
  male: "homem",
  female: "mulher",
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

// ============================================
// EXEMPLOS POR CATEGORIA
// ============================================

export const CATEGORY_EXAMPLES: Record<string, Record<string, string>> = {
  "Entradas & Leves": {
    "Saladas": "Salada Caesar, Salada Caprese, Salada de Quinoa com Legumes, Salada Tropical",
    "Molhos para salada": "Molho de Iogurte, Vinagrete, Molho Caesar, Molho de Mostarda e Mel",
    "Pastas e patês": "Homus, Guacamole, Patê de Atum, Pasta de Grão-de-Bico",
    "Antepastos": "Bruschetta, Carpaccio, Tábua de Frios, Antepasto de Berinjela",
    "Sopas leves": "Sopa de Legumes, Caldo Verde Light, Sopa de Abóbora, Consomê",
    "Caldos": "Caldo de Legumes, Caldo de Frango, Caldo Detox, Caldo de Feijão",
    "Cremes frios": "Gazpacho, Creme de Pepino, Vichyssoise, Creme de Abacate",
  },
  "Pratos Principais": {
    "Prato principal tradicional": "Arroz com Feijão e Bife, Frango Assado, Strogonoff, Feijoada Light",
    "Pratos fitness": "Frango Grelhado com Batata Doce, Tilápia com Legumes, Omelete Proteica",
    "Pratos low carb": "Espaguete de Abobrinha, Couve-Flor Refogada com Frango, Berinjela Recheada",
    "Pratos vegetarianos": "Risoto de Cogumelos, Lasanha de Berinjela, Curry de Grão-de-Bico",
    "Pratos veganos": "Buddha Bowl, Feijoada Vegana, Moqueca de Banana da Terra",
    "Pratos proteicos (high protein)": "Bife Ancho, Salmão Grelhado, Peito de Peru Assado",
    "Pratos elaborados / gourmet": "Risoto de Camarão, Medalhão ao Molho Madeira, Lombo Recheado",
    "Pratos para bulking": "Macarrão com Carne Moída, Arroz com Frango e Ovo, Bowl Calórico",
    "Pratos calóricos": "Lasanha Tradicional, Escondidinho de Carne Seca, Feijoada Completa",
  },
  "Acompanhamentos": {
    "Arroz e grãos": "Arroz à Grega, Arroz de Brócolis, Arroz Integral, Quinoa",
    "Legumes refogados": "Abobrinha Refogada, Brócolis no Alho, Mix de Legumes",
    "Purês": "Purê de Batata, Purê de Mandioquinha, Purê de Abóbora",
    "Farofas": "Farofa de Banana, Farofa de Ovos, Farofa Crocante",
    "Massas": "Espaguete ao Alho e Óleo, Penne ao Sugo, Macarrão Integral",
    "Cuscuz": "Cuscuz Nordestino, Cuscuz Marroquino, Cuscuz de Legumes",
    "Quinoa e derivados": "Quinoa com Legumes, Tabule de Quinoa, Quinoa ao Pesto",
  },
  "Café da Manhã & Lanches": {
    "Café da manhã": "Omelete com Queijo, Panqueca de Banana, Torrada com Abacate, Mingau de Aveia, Tapioca Recheada, Pão Integral com Ovos",
    "Lanches fitness": "Wrap de Frango, Sanduíche Natural, Barrinha de Proteína Caseira, Smoothie Bowl, Crepioca, Muffin de Banana",
    "Lanches calóricos": "Sanduíche de Pasta de Amendoim, Vitamina com Aveia e Banana, Panqueca com Mel",
    "Panquecas": "Panqueca de Aveia, Panqueca Americana, Panqueca de Banana, Panqueca Proteica",
    "Ovos e omeletes": "Omelete de Legumes, Ovos Mexidos, Ovo Pochê, Fritada de Espinafre",
    "Sanduíches": "Sanduíche de Frango, Sanduíche Caprese, Croissant Recheado, Bagel de Cream Cheese",
    "Tapiocas": "Tapioca de Queijo, Tapioca de Frango, Tapioca de Banana com Canela, Tapioca Fit",
  },
  "Sobremesas": {
    "Sobremesas tradicionais": "Pudim de Leite, Brigadeiro, Mousse de Maracujá, Pavê",
    "Sobremesas fitness": "Mousse de Chocolate Fit, Sorvete de Banana, Pudim Proteico",
    "Sobremesas low carb": "Cheesecake Low Carb, Brownie Sem Açúcar, Tortinha de Morango",
    "Sobremesas sem açúcar": "Gelatina Diet, Mousse de Limão Diet, Doce de Abóbora Sem Açúcar",
    "Sobremesas veganas": "Brigadeiro Vegano, Mousse de Cacau, Sorvete de Coco",
    "Bolos": "Bolo de Cenoura, Bolo de Chocolate, Bolo de Laranja, Bolo Formigueiro",
    "Tortas doces": "Torta de Limão, Torta de Maçã, Torta Holandesa, Cheesecake",
    "Doces gelados": "Sorvete Caseiro, Picolé de Frutas, Açaí na Tigela, Paleta Mexicana",
  },
  "Bebidas": {
    "Sucos naturais": "Suco de Laranja, Suco Verde Detox, Suco de Melancia, Limonada",
    "Vitaminas e smoothies": "Vitamina de Banana, Smoothie de Morango, Vitamina de Abacate",
    "Shakes proteicos": "Shake de Whey com Banana, Shake de Proteína Vegetal, Shake Pós-Treino",
    "Shakes para ganho de massa": "Shake Hipercalórico, Shake de Pasta de Amendoim, Shake com Aveia",
    "Chás": "Chá de Camomila, Chá Verde, Chá de Hibisco, Chá de Gengibre",
    "Bebidas funcionais": "Água Detox, Shot de Gengibre, Golden Milk, Kombucha",
    "Bebidas detox": "Suco Detox Verde, Água de Pepino, Suco Emagrecedor, Chá Detox",
  },
  "Snacks & Petiscos": {
    "Snacks saudáveis": "Chips de Batata Doce, Grão-de-Bico Crocante, Mix de Nuts, Palitos de Legumes",
    "Snacks low carb": "Chips de Queijo, Palitos de Pepino, Bolinhas de Carne, Ovos de Codorna",
    "Snacks calóricos": "Granola Caseira, Mix de Frutas Secas, Castanhas Caramelizadas",
    "Petiscos de forno": "Bolinha de Queijo, Empada, Pastel Assado, Coxinha de Frango Fit",
    "Petiscos de airfryer": "Batata Rústica, Calabresa Acebolada, Nuggets Caseiros, Bolinho de Bacalhau",
    "Finger foods": "Mini Hambúrguer, Espetinho Caprese, Tartine, Canapés",
  },
};

// Tipos de refeição por horário/ocasião
export const MEAL_TYPE_HINTS: Record<string, string> = {
  "Café da manhã": "Esta é uma receita para o CAFÉ DA MANHÃ. Deve ser algo típico de café da manhã como ovos, pães, frutas, mingau, tapioca, panquecas, etc. NUNCA gere almoço ou jantar.",
  "Lanches fitness": "Esta é uma receita de LANCHE FITNESS. Deve ser algo leve e proteico para lanchar entre refeições, como wraps, sanduíches naturais, smoothies, crepiocas. NUNCA gere pratos principais de almoço/jantar.",
  "Lanches calóricos": "Esta é uma receita de LANCHE CALÓRICO para ganho de peso. Deve ser um lanche substancioso, não um prato principal completo.",
  "Panquecas": "Deve ser uma receita de PANQUECA - doce ou salgada, típica de café da manhã ou lanche.",
  "Ovos e omeletes": "Deve ser uma receita baseada em OVOS - omelete, ovos mexidos, fritada, etc. Típica de café da manhã.",
  "Sanduíches": "Deve ser uma receita de SANDUÍCHE - para café da manhã ou lanche, não um prato principal.",
  "Tapiocas": "Deve ser uma receita de TAPIOCA - típica de café da manhã ou lanche brasileiro.",
};

// Exemplos de receitas apropriadas para cada tipo de refeição (para regenerate-meal)
export const MEAL_TYPE_EXAMPLES: Record<string, string[]> = {
  cafe_manha: ["ovos mexidos", "mingau de aveia", "panqueca", "smoothie de frutas", "tapioca", "pão com queijo", "iogurte com granola", "crepioca", "vitamina de banana"],
  almoco: ["frango grelhado com arroz", "peixe assado", "carne com legumes", "macarrão com molho", "strogonoff", "risoto", "feijoada light", "moqueca"],
  lanche: ["sanduíche natural", "wrap de frango", "barra de cereal caseira", "frutas com pasta de amendoim", "bolo integral", "cookies proteicos", "açaí"],
  jantar: ["sopa de legumes", "omelete", "salada completa", "wrap leve", "peixe grelhado", "frango desfiado", "quiche", "creme de abóbora"],
  ceia: ["chá com biscoito integral", "iogurte", "frutas", "castanhas", "leite morno", "queijo cottage", "banana com canela"],
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Retorna lista COMPLETA de ingredientes proibidos para o usuário
 * baseado em suas intolerâncias e alimentos excluídos manualmente
 */
export function getAllForbiddenIngredients(profile: UserProfile): string[] {
  const forbidden: string[] = [];
  
  // Adiciona ingredientes de cada intolerância
  const intolerances = profile.intolerances || [];
  for (const intolerance of intolerances) {
    if (intolerance !== "nenhuma" && FORBIDDEN_INGREDIENTS[intolerance]) {
      forbidden.push(...FORBIDDEN_INGREDIENTS[intolerance]);
    }
  }
  
  // Adiciona ingredientes excluídos manualmente
  const excluded = profile.excluded_ingredients || [];
  forbidden.push(...excluded);
  
  // Remove duplicatas e retorna
  return [...new Set(forbidden.map(i => i.toLowerCase()))];
}

/**
 * Gera lista resumida de ingredientes proibidos para incluir no prompt
 * (máximo 50 itens para não sobrecarregar)
 */
export function buildForbiddenIngredientsList(profile: UserProfile): string {
  const forbidden = getAllForbiddenIngredients(profile);
  
  if (forbidden.length === 0) {
    return "";
  }
  
  // Pega os 50 mais importantes (os primeiros de cada categoria são os mais comuns)
  const topForbidden = forbidden.slice(0, 50);
  
  return topForbidden.join(", ").toUpperCase();
}

/**
 * Calcula TMB (Taxa Metabólica Basal) e GET (Gasto Energético Total)
 * Usando a fórmula de Mifflin-St Jeor
 */
export function calculateMacroTargets(profile: UserProfile): MacroTargets {
  const ACTIVITY_FACTORS: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  // Valores padrão se dados incompletos
  let dailyCalories = 2000;
  let dailyProtein = 60;
  let mode: "lose" | "gain" | "maintain" = "maintain";

  if (profile.weight_current && profile.height && profile.age && profile.sex) {
    let tmb: number;
    
    // Fórmula de Mifflin-St Jeor
    if (profile.sex === "male") {
      tmb = (10 * profile.weight_current) + (6.25 * profile.height) - (5 * profile.age) + 5;
    } else {
      tmb = (10 * profile.weight_current) + (6.25 * profile.height) - (5 * profile.age) - 161;
    }

    const factor = ACTIVITY_FACTORS[profile.activity_level || "moderate"] || 1.55;
    const get = Math.round(tmb * factor);

    if (profile.goal === "emagrecer") {
      dailyCalories = Math.max(get - 500, profile.sex === "male" ? 1500 : 1200);
      dailyProtein = Math.round((profile.weight_goal || profile.weight_current) * 2);
      mode = "lose";
    } else if (profile.goal === "ganhar_peso") {
      dailyCalories = get + 400;
      dailyProtein = Math.round((profile.weight_goal || profile.weight_current) * 2.2);
      mode = "gain";
    } else {
      dailyCalories = get;
      dailyProtein = Math.round(profile.weight_current * 1.6);
      mode = "maintain";
    }
  }

  return { dailyCalories, dailyProtein, mode };
}

/**
 * Constrói string detalhada de intolerâncias
 */
export function buildIntolerancesString(profile: UserProfile): string {
  const intolerancesList = profile.intolerances || [];
  
  if (intolerancesList.length === 0 || intolerancesList.includes("nenhuma")) {
    return "nenhuma restrição alimentar";
  }

  return intolerancesList
    .map((i: string) => INTOLERANCE_LABELS[i] || i.toUpperCase())
    .join("\n- ");
}

/**
 * Constrói string de alimentos excluídos (preferências pessoais do usuário)
 */
export function buildExcludedIngredientsString(profile: UserProfile): string {
  const excludedList = profile.excluded_ingredients || [];
  
  if (excludedList.length === 0) {
    return "";
  }

  return excludedList.map((i: string) => i.toUpperCase()).join(", ");
}

/**
 * Gera instruções especiais para Modo Kids
 */
export function buildKidsInstructions(isKidsMode: boolean): string {
  if (!isKidsMode) return "";

  return `
🧒 MODO KIDS:
- Nomes DIVERTIDOS com emojis (ex: "Macarrão Arco-Íris 🌈")
- Máximo 6-8 ingredientes, preparo até 25 min
- Sabores suaves, ingredientes coloridos
- Calorias: 300-500 kcal, complexity: "rapida"`;
}

/**
 * Gera instruções especiais para Modo Emagrecimento
 */
export function buildWeightLossInstructions(isWeightLossMode: boolean, macros: MacroTargets | null): string {
  if (!isWeightLossMode) return "";

  const targetCal = macros ? Math.round(macros.dailyCalories / 3) : 380;
  const targetProt = macros ? Math.round(macros.dailyProtein / 3) : 28;

  return `
🏃 MODO EMAGRECIMENTO:
- Meta por refeição: ~${targetCal} kcal, ~${targetProt}g proteína
- PRIORIZE: vegetais volumosos, proteínas magras, fibras
- EVITE: carboidratos refinados e açúcares
- Métodos: grelhado, assado, vapor`;
}

/**
 * Gera instruções especiais para Modo Ganho de Peso
 */
export function buildWeightGainInstructions(isWeightGainMode: boolean, macros: MacroTargets | null): string {
  if (!isWeightGainMode) return "";

  const targetCal = macros ? Math.round(macros.dailyCalories / 3) : 600;
  const targetProt = macros ? Math.round(macros.dailyProtein / 3) : 38;

  return `
💪 MODO GANHO DE MASSA:
- Meta por refeição: ~${targetCal} kcal, ~${targetProt}g proteína
- PRIORIZE: proteínas de qualidade, carboidratos complexos, gorduras saudáveis
- AUMENTE: porções de proteína e carboidratos`;
}

/**
 * Constrói constraint de categoria selecionada
 */
export function buildCategoryConstraint(categoryContext: CategoryContext | null): string {
  if (!categoryContext?.category || !categoryContext?.subcategory) return "";

  const category = categoryContext.category;
  const subcategory = categoryContext.subcategory;
  const categoryExamples = CATEGORY_EXAMPLES[category]?.[subcategory] || "";
  const mealTypeHint = MEAL_TYPE_HINTS[subcategory] || "";

  return `
🚨 CATEGORIA OBRIGATÓRIA: "${category}" → "${subcategory}"
${mealTypeHint ? `${mealTypeHint}\n` : ""}Exemplos: ${categoryExamples || subcategory}
⛔ NÃO gere receitas de outra categoria. A categoria TEM PRIORIDADE sobre macros.`;
}

/**
 * Gera o status de segurança alimentar
 */
export function buildSafetyStatus(profile: UserProfile): string {
  const parts: string[] = [];
  
  const intolerances = profile.intolerances || [];
  if (intolerances.length > 0 && !intolerances.includes("nenhuma")) {
    intolerances.forEach((i: string) => {
      const label = {
        lactose: "Lactose",
        gluten: "Glúten", 
        acucar: "Açúcar",
        amendoim: "Amendoim",
        frutos_mar: "Frutos do Mar",
        ovo: "Ovo",
        soja: "Soja",
        castanhas: "Castanhas",
      }[i] || i;
      parts.push(label);
    });
  }

  if (profile.dietary_preference === "vegana") {
    parts.push("Produtos Animais");
  } else if (profile.dietary_preference === "vegetariana") {
    parts.push("Carnes");
  }

  if (parts.length === 0) {
    return "✅ Sem restrições alimentares";
  }

  return `✅ Totalmente livre de: ${parts.join(", ")}`;
}

// ============================================
// BUILDERS DE PROMPT PRINCIPAL
// ============================================

export interface RecipePromptOptions {
  profile: UserProfile;
  categoryContext?: CategoryContext | null;
  ingredients?: string | null;
  type?: "automatica" | "com_ingredientes" | "categoria";
  mealType?: string; // para regenerate-meal
  targetCalories?: number; // para regenerate-meal
}

/**
 * Constrói o System Prompt completo para geração de receita
 */
export function buildRecipeSystemPrompt(options: RecipePromptOptions): string {
  const { profile, categoryContext } = options;

  const isKidsMode = profile.context === "modo_kids";
  const isWeightLossMode = profile.goal === "emagrecer";
  const isWeightGainMode = profile.goal === "ganhar_peso";
  const hasWeightGoal = isWeightLossMode || isWeightGainMode;

  let macros: MacroTargets | null = null;
  if (hasWeightGoal && profile.weight_current && profile.height && profile.age && profile.sex) {
    macros = calculateMacroTargets(profile);
  }

  const intolerancesStr = buildIntolerancesString(profile);
  const excludedIngredientsStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsList(profile);
  const categoryConstraint = buildCategoryConstraint(categoryContext || null);
  const kidsInstructions = buildKidsInstructions(isKidsMode);
  const weightLossInstructions = buildWeightLossInstructions(isWeightLossMode, macros);
  const weightGainInstructions = buildWeightGainInstructions(isWeightGainMode, macros);
  const safetyStatus = buildSafetyStatus(profile);

  // Build special modes section (only if applicable)
  const specialModes = [kidsInstructions, weightLossInstructions, weightGainInstructions]
    .filter(Boolean)
    .join("\n");

  // Build excluded ingredients constraint
  const excludedConstraint = excludedIngredientsStr 
    ? `\n🚫 ALIMENTOS QUE O USUÁRIO NÃO CONSOME (JAMAIS INCLUIR): ${excludedIngredientsStr}`
    : "";

  // Build forbidden ingredients list
  const forbiddenBlock = forbiddenList 
    ? `\n\n🚨🚨🚨 LISTA NEGRA DE INGREDIENTES - NUNCA USE NENHUM DESTES:\n${forbiddenList}\n🚨🚨🚨`
    : "";

  // Build comprehensive safety block
  const safetyBlock = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  🚨🚨🚨 SEGURANÇA ALIMENTAR - PRIORIDADE ABSOLUTA 🚨🚨🚨                     ║
║  VERIFICAR ANTES DE QUALQUER COISA! NÃO PROSSIGA SEM LER!                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

⛔ INTOLERÂNCIAS/ALERGIAS DO USUÁRIO - INGREDIENTES PROIBIDOS:
${intolerancesStr}
${excludedConstraint}
${forbiddenBlock}

📋 CHECKLIST OBRIGATÓRIO (executar ANTES de gerar receita):
✓ Verificar CADA ingrediente contra a LISTA NEGRA acima
✓ Verificar ingredientes "escondidos" em molhos e temperos  
✓ Verificar ingredientes excluídos manualmente pelo usuário
✓ QUEIJOS VEGETAIS contêm caseína = PROIBIDOS para intolerantes a lactose
✓ Se qualquer ingrediente for duvidoso, NÃO incluir

⚠️ ATENÇÃO ESPECIAL - INGREDIENTES QUE PARECEM SEGUROS MAS NÃO SÃO:
- "Queijo vegetal" / "queijo sem lactose" → MUITOS contêm traços de leite
- "Manteiga ghee" → É derivado de leite = PROIBIDO para lactose
- "Molho shoyu" → Contém trigo = PROIBIDO para glúten
- "Maionese" → Contém ovo = PROIBIDO para alergia a ovo
- "Proteína isolada" → Pode conter soja ou leite

🔴 EM CASO DE DÚVIDA: NÃO INCLUA O INGREDIENTE!

╔══════════════════════════════════════════════════════════════════════════════╗
║  SE VOCÊ INCLUIR QUALQUER INGREDIENTE PROIBIDO, A RECEITA SERÁ REJEITADA   ║
╚══════════════════════════════════════════════════════════════════════════════╝`;

  return `Você é o Mestre Chef ReceitAI, nutricionista e chef especializado em receitas personalizadas e SEGURAS.

${safetyBlock}
${categoryConstraint}
${specialModes}

REGRAS (ordem de prioridade ESTRITA):
1. 🚨 SEGURANÇA PRIMEIRO: NUNCA inclua ingredientes da LISTA NEGRA - verificar CADA ingrediente
2. CATEGORIA: Se selecionada, a receita DEVE ser dessa categoria
3. DIETA: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
4. OBJETIVO: ${GOAL_LABELS[profile.goal || "manter"]}
5. COMPLEXIDADE: ${isKidsMode ? "rápida (até 20 min)" : COMPLEXITY_LABELS["equilibrada"]}
6. CONTEXTO: ${CONTEXT_LABELS[profile.context || "individual"]}

FORMATO JSON:
{
  "name": "Nome da Receita",
  "description": "Descrição em 1 frase",
  "safety_status": "${safetyStatus}",
  "is_safe": true,
  "safety_check": {
    "verified_against_intolerances": true,
    "verified_against_excluded": true,
    "contains_hidden_allergens": false
  },
  "ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
  "instructions": ["Passo 1...", "Passo 2...", "Passo 3..."],
  "prep_time": ${isKidsMode ? 20 : 30},
  "complexity": "${isKidsMode ? "rapida" : "equilibrada"}",
  "servings": ${profile.context === "familia" ? 4 : isKidsMode ? 3 : 2},
  "calories": ${isKidsMode ? 400 : isWeightLossMode ? 380 : isWeightGainMode ? 600 : 450},
  "protein": ${isWeightLossMode ? 30 : isWeightGainMode ? 40 : 25},
  "carbs": ${isWeightLossMode ? 25 : isWeightGainMode ? 60 : 35},
  "fat": ${isWeightLossMode ? 12 : isWeightGainMode ? 22 : 18},
  "chef_tip": "Dica de técnica culinária"
}

Valores nutricionais são POR PORÇÃO. Responda APENAS com JSON.`
}

/**
 * Constrói o User Prompt para geração de receita
 */
export function buildRecipeUserPrompt(options: RecipePromptOptions): string {
  const { categoryContext, ingredients, type } = options;

  if (categoryContext?.category && categoryContext?.subcategory) {
    const examples = CATEGORY_EXAMPLES[categoryContext.category]?.[categoryContext.subcategory] || "";
    let filtersText = "";
    if (categoryContext.filters) {
      const parts: string[] = [];
      if (categoryContext.filters.culinaria) parts.push(categoryContext.filters.culinaria);
      if (categoryContext.filters.tempo) parts.push(categoryContext.filters.tempo);
      if (categoryContext.filters.metodo) parts.push(categoryContext.filters.metodo);
      if (parts.length > 0) filtersText = ` (${parts.join(", ")})`;
    }

    return `Gere uma receita de "${categoryContext.subcategory}"${filtersText}. Exemplos: ${examples || categoryContext.subcategory}. LEMBRE-SE: verificar a LISTA NEGRA de ingredientes antes de gerar!`;
  }

  if (type === "com_ingredientes" && ingredients) {
    return `Receita usando: ${ingredients}. Pode adicionar ingredientes básicos. ATENÇÃO: verificar se cada ingrediente está na LISTA NEGRA!`;
  }

  return "Gere uma receita saudável e SEGURA para meu perfil. Verifique a LISTA NEGRA de ingredientes!";
}

/**
 * Constrói prompt para geração de UM DIA do plano alimentar
 * Persona: Mestre Chef ReceitAI - receitas ricas e detalhadas
 * Agora com suporte a regionalização por país
 */
export function buildSingleDayPrompt(
  profile: UserProfile,
  dayIndex: number,
  dayName: string,
  macros: MacroTargets,
  previousRecipes: string[] = []
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const excludedIngredientsStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsList(profile);
  const isKidsMode = profile.context === "modo_kids";
  const complexity = "equilibrada";
  const selectedMealTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];

  // Regionalização por país
  const countryConfig = getCountryConfig(profile.country);
  const ingredientPriority = getIngredientPriority(profile.country);
  
  // Gerar exemplos regionalizados para cada tipo de refeição
  const regionalExamples = selectedMealTypes.map(mealType => {
    const examples = getMealExamples(mealType, profile.country);
    const label = countryConfig.mealTypeLabels[mealType] || MEAL_TYPE_LABELS[mealType];
    return `${label}: ${examples.slice(0, 3).join(", ")}`;
  }).join("\n");

  const kidsNote = isKidsMode ? "\n🧒 MODO KIDS: Nomes criativos e divertidos, sabores suaves, apresentação atraente." : "";
  const avoidRecipes = previousRecipes.length > 0 
    ? `\n⚠️ NÃO REPETIR: ${previousRecipes.slice(0, 8).join(", ")}` 
    : "";

  const excludedConstraint = excludedIngredientsStr 
    ? `\n\n🚫 ALIMENTOS QUE O USUÁRIO NÃO CONSOME:\n${excludedIngredientsStr}`
    : "";

  const forbiddenBlock = forbiddenList 
    ? `\n\n🚨 LISTA NEGRA - NUNCA USE NENHUM DESTES INGREDIENTES:\n${forbiddenList}`
    : "";

  const complexityInstructions: Record<string, string> = {
    rapida: "Receitas práticas (max 20 min). 4-5 ingredientes simples. 3-4 passos diretos.",
    equilibrada: "Receitas balanceadas (20-40 min). 6-7 ingredientes. 4-5 passos bem explicados.",
    elaborada: "Receitas sofisticadas (40+ min). 7-8 ingredientes premium. 5-6 passos com técnicas culinárias."
  };

  return `🧑‍🍳 MESTRE CHEF RECEITAI - Plano Alimentar Personalizado

📅 Gere as 5 refeições para: ${dayName}
🌍 PAÍS/REGIÃO: ${countryConfig.name} - Gere receitas típicas desta culinária!

╔══════════════════════════════════════════════════════════════════════════════╗
║  🚨 SEGURANÇA ALIMENTAR - PRIORIDADE MÁXIMA! LER ANTES DE TUDO! 🚨          ║
╚══════════════════════════════════════════════════════════════════════════════╝

⛔ RESTRIÇÕES DO USUÁRIO - JAMAIS INCLUIR ESTES INGREDIENTES:
${intolerancesStr}${excludedConstraint}${forbiddenBlock}

📋 ANTES DE GERAR CADA RECEITA:
✓ Verificar CADA ingrediente contra as restrições acima
✓ "Queijo vegetal" / "sem lactose" → VERIFICAR se realmente não tem lactose
✓ Molhos prontos → Podem conter glúten ou leite escondido
✓ EM CASO DE DÚVIDA: NÃO INCLUA!

👤 PERFIL DO CLIENTE:
• Dieta: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
• Objetivo: ${GOAL_LABELS[profile.goal || "manter"]}
• Meta diária: ${macros.dailyCalories}kcal, ${macros.dailyProtein}g proteína
• Contexto: ${CONTEXT_LABELS[profile.context || "individual"]}

⏱️ COMPLEXIDADE: ${COMPLEXITY_LABELS[complexity]}
${complexityInstructions[complexity]}${kidsNote}${avoidRecipes}

🍽️ REFEIÇÕES A GERAR (com exemplos regionais de ${countryConfig.name}):
${regionalExamples}

📋 INSTRUÇÕES DO CHEF:
• Nomes criativos e apetitosos para cada receita
• Ingredientes com quantidades precisas (g, ml, unidades)
• Modo de preparo detalhado e claro
• Macros realistas que somem ~${macros.dailyCalories}kcal no dia
• ${ingredientPriority}
• 🚨 VERIFICAR CADA INGREDIENTE CONTRA AS RESTRIÇÕES!

🔧 FORMATO JSON (responda APENAS com JSON válido):
{"day_index":${dayIndex},"day_name":"${dayName}","meals":[
  {"meal_type":"cafe_manha","recipe_name":"Nome Criativo","recipe_calories":450,"recipe_protein":25,"recipe_carbs":50,"recipe_fat":15,"recipe_prep_time":15,
   "recipe_ingredients":[{"item":"Ingrediente","quantity":"100","unit":"g"}],
   "recipe_instructions":["Passo 1 detalhado","Passo 2 detalhado"]}
]}`;
}

/**
 * Constrói prompt para geração de plano alimentar completo (mantido para compatibilidade)
 */
export function buildMealPlanPrompt(
  profile: UserProfile,
  daysCount: number,
  macros: MacroTargets,
  previousRecipes: string[] = []
): string {
  // Agora usa buildSingleDayPrompt internamente, mas mantém interface
  return buildSingleDayPrompt(profile, 0, "Segunda-feira", macros, previousRecipes);
}

/**
 * Constrói prompt para regeneração de refeição individual
 * Agora com suporte a regionalização por país
 */
export function buildRegenerateMealPrompt(
  profile: UserProfile,
  mealType: string,
  targetCalories: number,
  ingredients?: string
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const excludedIngredientsStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsList(profile);
  
  // Regionalização por país
  const countryConfig = getCountryConfig(profile.country);
  const mealLabel = countryConfig.mealTypeLabels[mealType] || MEAL_TYPE_LABELS[mealType] || mealType;
  const mealExamples = getMealExamples(mealType, profile.country);
  const ingredientPriority = getIngredientPriority(profile.country);
  
  const isKidsMode = profile.context === "modo_kids";
  const kidsNote = isKidsMode ? " 🧒 Modo Kids: nome divertido, sabores suaves, máx 25 min." : "";
  const ingredientsNote = ingredients ? `\nINGREDIENTES OBRIGATÓRIOS: ${ingredients}` : "";
  
  const excludedConstraint = excludedIngredientsStr 
    ? `\nALIMENTOS PROIBIDOS (usuário não consome): ${excludedIngredientsStr}`
    : "";

  const forbiddenBlock = forbiddenList 
    ? `\n\n🚨 LISTA NEGRA - NUNCA USE:\n${forbiddenList}`
    : "";

  return `Mestre Chef ReceitAI. Regenerar ${mealLabel.toUpperCase()}.
🌍 PAÍS/REGIÃO: ${countryConfig.name} - Gere receita típica desta culinária!

╔══════════════════════════════════════════════════════════════════════════════╗
║  🚨 SEGURANÇA ALIMENTAR - PRIORIDADE MÁXIMA! 🚨                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

PERFIL: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}, ${GOAL_LABELS[profile.goal || "manter"]}

⛔ JAMAIS INCLUIR (verificar CADA ingrediente):
${intolerancesStr}${excludedConstraint}${forbiddenBlock}

📋 CHECKLIST DE SEGURANÇA:
✓ Verificar CADA ingrediente contra intolerâncias
✓ Verificar ingredientes "escondidos" em molhos
✓ Verificar alimentos proibidos pelo usuário
✓ EM CASO DE DÚVIDA: NÃO INCLUA!
${kidsNote}${ingredientsNote}

REGRAS:
1. 🚨 SEGURANÇA PRIMEIRO: NUNCA ingredientes das restrições
2. ~${targetCalories} calorias
3. ${ingredientPriority}
4. Exemplos típicos de ${countryConfig.name}: ${mealExamples.slice(0, 5).join(", ")}

JSON:
{
  "recipe_name": "Nome",
  "recipe_calories": ${targetCalories},
  "recipe_protein": 25,
  "recipe_carbs": 30,
  "recipe_fat": 15,
  "recipe_prep_time": ${isKidsMode ? 20 : 30},
  "is_safe": true,
  "recipe_ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
  "recipe_instructions": ["Passo 1", "Passo 2"],
  "chef_tip": "Dica culinária"
}

Responda APENAS com JSON.`;
}
