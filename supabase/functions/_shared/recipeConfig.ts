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
  calorie_goal?: string | null;
  recipe_complexity?: string | null;
  context?: string | null;
  intolerances?: string[] | null;
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
};

export const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecimento (déficit calórico controlado, foco em saciedade e proteína)",
  manter: "manutenção de peso (calorias equilibradas)",
  ganhar_peso: "ganho de massa muscular (superávit calórico controlado, alta proteína)",
};

export const CALORIE_LABELS: Record<string, string> = {
  reduzir: "reduzir calorias (porções menores, menos calóricas)",
  manter: "manter calorias normais",
  aumentar: "aumentar calorias (porções maiores, mais densas)",
  definir_depois: "calorias normais",
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
  const categoryConstraint = buildCategoryConstraint(categoryContext || null);
  const kidsInstructions = buildKidsInstructions(isKidsMode);
  const weightLossInstructions = buildWeightLossInstructions(isWeightLossMode, macros);
  const weightGainInstructions = buildWeightGainInstructions(isWeightGainMode, macros);
  const safetyStatus = buildSafetyStatus(profile);

  // Build special modes section (only if applicable)
  const specialModes = [kidsInstructions, weightLossInstructions, weightGainInstructions]
    .filter(Boolean)
    .join("\n");

  return `Você é o Mestre Chef ReceitAI, nutricionista e chef especializado em receitas personalizadas.
${categoryConstraint}
${specialModes}

REGRAS (ordem de prioridade):
1. CATEGORIA: Se selecionada, a receita DEVE ser dessa categoria
2. SEGURANÇA: ${intolerancesStr} - NUNCA inclua ingredientes proibidos
3. DIETA: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
4. OBJETIVO: ${GOAL_LABELS[profile.goal || "manter"]}
5. COMPLEXIDADE: ${isKidsMode ? "rápida (até 20 min)" : COMPLEXITY_LABELS[profile.recipe_complexity || "equilibrada"]}
6. CONTEXTO: ${CONTEXT_LABELS[profile.context || "individual"]}

FORMATO JSON:
{
  "name": "Nome da Receita",
  "description": "Descrição em 1 frase",
  "safety_status": "${safetyStatus}",
  "ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
  "instructions": ["Passo 1...", "Passo 2...", "Passo 3..."],
  "prep_time": ${isKidsMode ? 20 : 30},
  "complexity": "${isKidsMode ? "rapida" : profile.recipe_complexity || "equilibrada"}",
  "servings": ${profile.context === "familia" ? 4 : isKidsMode ? 3 : 2},
  "calories": ${isKidsMode ? 400 : isWeightLossMode ? 380 : isWeightGainMode ? 600 : 450},
  "protein": ${isWeightLossMode ? 30 : isWeightGainMode ? 40 : 25},
  "carbs": ${isWeightLossMode ? 25 : isWeightGainMode ? 60 : 35},
  "fat": ${isWeightLossMode ? 12 : isWeightGainMode ? 22 : 18},
  "chef_tip": "Dica de técnica culinária"
}

Valores nutricionais são POR PORÇÃO. Responda APENAS com JSON.`;
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

    return `Gere uma receita de "${categoryContext.subcategory}"${filtersText}. Exemplos: ${examples || categoryContext.subcategory}.`;
  }

  if (type === "com_ingredientes" && ingredients) {
    return `Receita usando: ${ingredients}. Pode adicionar ingredientes básicos.`;
  }

  return "Gere uma receita saudável para meu perfil.";
}

/**
 * Constrói prompt para geração de UM DIA do plano alimentar
 * Persona: Mestre Chef ReceitAI - receitas ricas e detalhadas
 */
export function buildSingleDayPrompt(
  profile: UserProfile,
  dayIndex: number,
  dayName: string,
  macros: MacroTargets,
  previousRecipes: string[] = []
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const isKidsMode = profile.context === "modo_kids";
  const complexity = profile.recipe_complexity || "equilibrada";
  const selectedMealTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];

  const kidsNote = isKidsMode ? "\n🧒 MODO KIDS: Nomes criativos e divertidos, sabores suaves, apresentação atraente." : "";
  const avoidRecipes = previousRecipes.length > 0 
    ? `\n⚠️ NÃO REPETIR: ${previousRecipes.slice(0, 8).join(", ")}` 
    : "";

  const complexityInstructions: Record<string, string> = {
    rapida: "Receitas práticas (max 20 min). 4-5 ingredientes simples. 3-4 passos diretos.",
    equilibrada: "Receitas balanceadas (20-40 min). 6-7 ingredientes. 4-5 passos bem explicados.",
    elaborada: "Receitas sofisticadas (40+ min). 7-8 ingredientes premium. 5-6 passos com técnicas culinárias."
  };

  return `🧑‍🍳 MESTRE CHEF RECEITAI - Plano Alimentar Personalizado

📅 Gere as 5 refeições para: ${dayName}

👤 PERFIL DO CLIENTE:
• Dieta: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
• Objetivo: ${GOAL_LABELS[profile.goal || "manter"]}
• Meta diária: ${macros.dailyCalories}kcal, ${macros.dailyProtein}g proteína
• Contexto: ${CONTEXT_LABELS[profile.context || "individual"]}

🚫 RESTRIÇÕES ALIMENTARES (JAMAIS INCLUIR):
${intolerancesStr}

⏱️ COMPLEXIDADE: ${COMPLEXITY_LABELS[complexity]}
${complexityInstructions[complexity]}${kidsNote}${avoidRecipes}

🍽️ REFEIÇÕES A GERAR:
${selectedMealTypes.map((m, i) => `${i + 1}. ${MEAL_TYPE_LABELS[m]}`).join("\n")}

📋 INSTRUÇÕES DO CHEF:
• Nomes criativos e apetitosos para cada receita
• Ingredientes com quantidades precisas (g, ml, unidades)
• Modo de preparo detalhado e claro
• Macros realistas que somem ~${macros.dailyCalories}kcal no dia
• Priorize ingredientes de fácil acesso no Brasil

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
 */
export function buildRegenerateMealPrompt(
  profile: UserProfile,
  mealType: string,
  targetCalories: number,
  ingredients?: string
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const mealLabel = MEAL_TYPE_LABELS[mealType] || mealType;
  const mealExamples = MEAL_TYPE_EXAMPLES[mealType] || [];
  const isKidsMode = profile.context === "modo_kids";
  const kidsNote = isKidsMode ? " 🧒 Modo Kids: nome divertido, sabores suaves, máx 25 min." : "";
  const ingredientsNote = ingredients ? `\nINGREDIENTES OBRIGATÓRIOS: ${ingredients}` : "";

  return `Mestre Chef ReceitAI. Regenerar ${mealLabel.toUpperCase()}.

PERFIL: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}, ${GOAL_LABELS[profile.goal || "manter"]}
RESTRIÇÕES: ${intolerancesStr}${kidsNote}${ingredientsNote}

REGRAS:
1. ~${targetCalories} calorias
2. NUNCA ingredientes das restrições
3. Exemplos: ${mealExamples.join(", ")}

JSON:
{
  "recipe_name": "Nome",
  "recipe_calories": ${targetCalories},
  "recipe_protein": 25,
  "recipe_carbs": 30,
  "recipe_fat": 15,
  "recipe_prep_time": ${isKidsMode ? 20 : 30},
  "recipe_ingredients": [{"item": "ingrediente", "quantity": "100", "unit": "g"}],
  "recipe_instructions": ["Passo 1", "Passo 2"],
  "chef_tip": "Dica culinária"
}

Responda APENAS com JSON.`;
}
