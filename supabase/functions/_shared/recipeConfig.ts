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
🧒 MODO KIDS ATIVO - REGRAS ESPECIAIS:
- Nomes DIVERTIDOS e criativos (ex: "Macarrão Arco-Íris 🌈", "Bolinho do Astronauta 🚀", "Pizza do Dino 🦕")
- Descrições com emojis e linguagem amigável para crianças
- Receitas SIMPLES com no máximo 6-8 ingredientes
- Tempo de preparo CURTO (máximo 25 minutos)
- Sabores suaves e familiares (evitar temperos fortes, pimenta, alho cru)
- Ingredientes coloridos e visualmente atrativos
- Instruções simples que uma criança poderia ajudar
- Calorias adequadas para crianças (300-500 kcal por porção)
- Apresentação divertida (formas, cores, decorações simples)
- SEMPRE usar complexity "rapida" no Modo Kids
- Texturas agradáveis (evitar alimentos muito fibrosos ou difíceis de mastigar)`;
}

/**
 * Gera instruções especiais para Modo Emagrecimento
 */
export function buildWeightLossInstructions(isWeightLossMode: boolean, macros: MacroTargets | null): string {
  if (!isWeightLossMode) return "";

  const macroText = macros
    ? `- META CALÓRICA PERSONALIZADA: ${macros.dailyCalories} kcal/dia - adapte a receita para ~${Math.round(macros.dailyCalories / 3)} kcal por refeição
- META DE PROTEÍNA: ${macros.dailyProtein}g por dia - inclua ~${Math.round(macros.dailyProtein / 3)}g por refeição`
    : `- Calorias por porção: 300-450 kcal (déficit calórico controlado)
- Proteína alta: mínimo 25g por porção`;

  return `
🏃 MODO EMAGRECIMENTO ATIVO - REGRAS ESPECIAIS:
- PRIORIZE ingredientes com ALTO PODER DE SACIEDADE (fibras, proteínas, água)
- Use vegetais volumosos (brócolis, couve-flor, abobrinha, folhas verdes)
- Inclua proteínas magras (frango, peixe, ovos, leguminosas)
- Adicione fibras (aveia, chia, linhaça, legumes)
- EVITE carboidratos refinados e açúcares
${macroText}
- Prefira métodos de cocção: grelhado, assado, cozido no vapor
- Adicione um campo "satiety_tip" com dica de saciedade
- Adicione um campo "satiety_score" de 1-10 (quanto maior, mais saciante)
- Inclua ingredientes termogênicos quando possível (gengibre, pimenta, canela)
⚠️ IMPORTANTE: Respeite PRIMEIRO a categoria selecionada, depois adapte para versão fit.`;
}

/**
 * Gera instruções especiais para Modo Ganho de Peso
 */
export function buildWeightGainInstructions(isWeightGainMode: boolean, macros: MacroTargets | null): string {
  if (!isWeightGainMode) return "";

  const macroText = macros
    ? `- META CALÓRICA PERSONALIZADA: ${macros.dailyCalories} kcal/dia - adapte a receita para ~${Math.round(macros.dailyCalories / 3)} kcal por refeição
- META DE PROTEÍNA: ${macros.dailyProtein}g por dia - inclua ~${Math.round(macros.dailyProtein / 3)}g por refeição`
    : `- Calorias por porção: 550-700 kcal (superávit calórico controlado)
- Proteína alta: mínimo 35g por porção`;

  return `
💪 MODO GANHO DE PESO/MASSA ATIVO - REGRAS ESPECIAIS:
- PRIORIZE receitas com ALTA DENSIDADE CALÓRICA e nutritiva
- Use fontes de proteína de qualidade (frango, carne, ovos, peixe, leguminosas)
- Inclua carboidratos complexos (arroz, batata, macarrão integral, aveia)
- Adicione gorduras saudáveis (azeite, abacate, castanhas, pasta de amendoim)
- AUMENTE porções de proteína e carboidratos
${macroText}
- Inclua snacks calóricos saudáveis
- Adicione um campo "muscle_tip" com dica para ganho de massa
- Adicione um campo "calorie_density_score" de 1-10 (quanto maior, mais calórico)
⚠️ IMPORTANTE: Respeite PRIMEIRO a categoria selecionada, depois adapte para versão calórica.`;
}

/**
 * Constrói constraint de categoria selecionada
 */
export function buildCategoryConstraint(categoryContext: CategoryContext | null): string {
  if (!categoryContext?.category || !categoryContext?.subcategory) return "";

  const category = categoryContext.category;
  const subcategory = categoryContext.subcategory;

  // Get examples for this category/subcategory
  const categoryExamples = CATEGORY_EXAMPLES[category]?.[subcategory] || "";
  
  // Get meal type hint if available
  const mealTypeHint = MEAL_TYPE_HINTS[subcategory] || "";

  return `
🚨🚨🚨 REGRA MAIS IMPORTANTE - CATEGORIA OBRIGATÓRIA 🚨🚨🚨
O usuário SELECIONOU especificamente a categoria "${category}" → "${subcategory}".

${mealTypeHint}

EXEMPLOS TÍPICOS desta categoria: ${categoryExamples || subcategory}

⛔ PROIBIDO: Gerar receitas que não pertencem a esta categoria.
⛔ PROIBIDO: Gerar pratos principais (salmão, frango grelhado, carne) quando a categoria é "Café da Manhã & Lanches".
⛔ PROIBIDO: Ignorar a categoria selecionada em favor de outras preferências.

✅ OBRIGATÓRIO: A receita DEVE ser algo típico e representativo de "${subcategory}".
✅ OBRIGATÓRIO: Respeitar a categoria TEM PRIORIDADE sobre macros e calorias.

Se o usuário pediu "${subcategory}", você DEVE gerar algo dessa categoria, mesmo que pareça menos "nutritivo" ou "proteico".
`;
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

  // Calculate personalized macros
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

  return `Você é o Mestre Chef ReceitAI, um nutricionista e chef de elite especializado em receitas personalizadas.
Seu tom é encorajador, técnico e gastronômico. Você explica brevemente uma técnica culinária em cada receita.
Você DEVE gerar receitas com valores nutricionais REAIS e PRECISOS baseados em tabelas nutricionais.

${categoryConstraint}

${kidsInstructions}
${weightLossInstructions}
${weightGainInstructions}

HIERARQUIA DE PRIORIDADES (em ordem):
1. 🥇 CATEGORIA SELECIONADA - se o usuário escolheu uma categoria, a receita DEVE ser dessa categoria
2. 🥈 INTOLERÂNCIAS - NUNCA incluir ingredientes proibidos (SEGURANÇA ALIMENTAR)
3. 🥉 PREFERÊNCIA ALIMENTAR - vegetariana, vegana, etc.
4. 🏅 OBJETIVO DE PESO - adaptar calorias/macros
5. 🏅 COMPLEXIDADE - tempo de preparo

REGRAS ABSOLUTAS - NUNCA VIOLAR:
1. INTOLERÂNCIAS/ALERGIAS:
   - ${intolerancesStr}
   - NUNCA inclua ingredientes proibidos - isso pode causar reações alérgicas graves
   - Use APENAS substitutos seguros (ex: leite de amêndoas em vez de leite se sem lactose)
   - Em caso de dúvida, sugira uma substituição segura e explique o porquê
   
2. PREFERÊNCIA ALIMENTAR: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}

3. OBJETIVO: ${GOAL_LABELS[profile.goal || "manter"]}

4. META CALÓRICA: ${CALORIE_LABELS[profile.calorie_goal || "definir_depois"]}

5. COMPLEXIDADE: ${isKidsMode ? "rápida (até 20 minutos) - OBRIGATÓRIO no Modo Kids" : COMPLEXITY_LABELS[profile.recipe_complexity || "equilibrada"]}

6. CONTEXTO: ${CONTEXT_LABELS[profile.context || "individual"]}

FORMATO DE RESPOSTA (JSON VÁLIDO):
{
  "name": "${isKidsMode ? "Nome DIVERTIDO e criativo (ex: Macarrão Arco-Íris 🌈)" : "Nome da Receita"}",
  "description": "${isKidsMode ? "Descrição curta e divertida COM EMOJIS para crianças!" : "Breve descrição em 1 frase"}",
  "safety_status": "${safetyStatus}",
  "ingredients": [
    {"item": "nome do ingrediente", "quantity": "quantidade", "unit": "unidade"}
  ],
  "instructions": {
    "inicio": ["Passos iniciais de preparação..."],
    "meio": ["Passos do cozimento principal..."],
    "finalizacao": ["Passos finais e apresentação..."]
  },
  "prep_time": ${isKidsMode ? 20 : 30},
  "complexity": "${isKidsMode ? "rapida" : profile.recipe_complexity || "equilibrada"}",
  "servings": ${profile.context === "familia" ? 4 : isKidsMode ? 3 : 2},
  "calories": ${isKidsMode ? 400 : isWeightLossMode ? 380 : isWeightGainMode ? 600 : 450},
  "protein": ${isWeightLossMode ? 30 : isWeightGainMode ? 40 : 25.5},
  "carbs": ${isWeightLossMode ? 25 : isWeightGainMode ? 60 : 35.2},
  "fat": ${isWeightLossMode ? 12 : isWeightGainMode ? 22 : 18.3},
  "chef_tip": "Uma dica de técnica culinária, tempero ou conservação que eleva o prato"${isWeightLossMode ? `,
  "satiety_score": 8,
  "satiety_tip": "Dica de saciedade para ajudar no emagrecimento"` : isWeightGainMode ? `,
  "calorie_density_score": 8,
  "muscle_tip": "Dica para ganho de massa muscular"` : ""}
}

IMPORTANTE:
- calories, protein, carbs, fat são POR PORÇÃO
- Use valores nutricionais REAIS baseados nos ingredientes
- prep_time em minutos${isKidsMode ? " (MÁXIMO 25 no Modo Kids)" : ""}
- chef_tip: uma técnica culinária ou segredo que melhora o prato
- safety_status: confirma que a receita respeita todas as restrições
${isWeightLossMode ? "- satiety_score de 1-10 baseado na composição (fibras + proteínas = maior score)\n- satiety_tip: uma dica prática de como a receita ajuda na saciedade" : ""}${isWeightGainMode ? "- calorie_density_score de 1-10 baseado na densidade calórica\n- muscle_tip: uma dica prática para maximizar ganho muscular" : ""}
- Responda APENAS com o JSON, sem texto adicional`;
}

/**
 * Constrói o User Prompt para geração de receita
 */
export function buildRecipeUserPrompt(options: RecipePromptOptions): string {
  const { categoryContext, ingredients, type } = options;

  if (categoryContext?.category && categoryContext?.subcategory) {
    let filtersText = "";
    if (categoryContext.filters) {
      const filterParts: string[] = [];
      if (categoryContext.filters.culinaria) {
        filterParts.push(`culinária ${categoryContext.filters.culinaria}`);
      }
      if (categoryContext.filters.tempo) {
        filterParts.push(`tempo de preparo: ${categoryContext.filters.tempo}`);
      }
      if (categoryContext.filters.metodo) {
        filterParts.push(`método de preparo: ${categoryContext.filters.metodo}`);
      }
      if (filterParts.length > 0) {
        filtersText = ` Considere os seguintes filtros: ${filterParts.join(", ")}.`;
      }
    }

    const examples = CATEGORY_EXAMPLES[categoryContext.category]?.[categoryContext.subcategory] || "";
    const mealHint = MEAL_TYPE_HINTS[categoryContext.subcategory] || "";

    return `🎯 CATEGORIA SELECIONADA: "${categoryContext.category}" → "${categoryContext.subcategory}"

GERE UMA RECEITA QUE SEJA TÍPICA E REPRESENTATIVA DE "${categoryContext.subcategory}".

${examples ? `Exemplos do que espero: ${examples}.` : ""}

${mealHint}

${filtersText}

⚠️ LEMBRE-SE: NÃO gere pratos de outra categoria. Se pedi "${categoryContext.subcategory}", a receita DEVE ser disso.`;
  }

  if (type === "com_ingredientes" && ingredients) {
    return `Gere uma receita usando estes ingredientes: ${ingredients}. Pode adicionar outros ingredientes básicos se necessário.`;
  }

  return "Gere uma receita saudável e deliciosa que se encaixe no meu perfil.";
}

/**
 * Constrói prompt para geração de plano alimentar
 */
export function buildMealPlanPrompt(
  profile: UserProfile,
  daysCount: number,
  macros: MacroTargets,
  previousRecipes: string[] = []
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const isKidsMode = profile.context === "modo_kids";
  
  // Determine number of meals based on complexity
  const mealsPerDay = profile.recipe_complexity === "rapida" ? 4 : 5;
  const selectedMealTypes = mealsPerDay === 4 
    ? ["cafe_manha", "almoco", "lanche", "jantar"]
    : ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];

  const kidsNote = isKidsMode ? `
⚠️ MODO KIDS ATIVO:
- Todas as receitas devem ter nomes DIVERTIDOS e criativos com emojis
- Sabores suaves e familiares (sem temperos fortes)
- Tempo de preparo máximo: 25 minutos
- Ingredientes coloridos e visualmente atrativos
- Porções adequadas para crianças
` : "";

  return `Você é o Mestre Chef ReceitAI. Gere um plano alimentar de ${daysCount} dias.

PERFIL COMPLETO:
- Sexo: ${SEX_LABELS[profile.sex || ""] || "não informado"}
- Idade: ${profile.age || "não informada"} anos
- Peso atual: ${profile.weight_current || "não informado"}kg
- Altura: ${profile.height || "não informada"}cm
- Peso meta: ${profile.weight_goal || profile.weight_current || "não informado"}kg

OBJETIVO: ${GOAL_LABELS[profile.goal || "manter"]}

METAS NUTRICIONAIS DIÁRIAS:
- Calorias: ${macros.dailyCalories}kcal/dia
- Proteína mínima: ${macros.dailyProtein}g/dia

PREFERÊNCIA ALIMENTAR: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}

RESTRIÇÕES/INTOLERÂNCIAS (NUNCA incluir estes ingredientes):
- ${intolerancesStr}

CONTEXTO: ${CONTEXT_LABELS[profile.context || "individual"]}

COMPLEXIDADE DAS RECEITAS: ${COMPLEXITY_LABELS[profile.recipe_complexity || "equilibrada"]}

${kidsNote}

ESTRUTURA: ${mealsPerDay} refeições por dia (${selectedMealTypes.map(m => MEAL_TYPE_LABELS[m]).join(", ")})

DISTRIBUIÇÃO CALÓRICA:
${mealsPerDay === 5 ? 
  "- Café da Manhã: 20%\n- Almoço: 30%\n- Lanche: 10%\n- Jantar: 30%\n- Ceia: 10%" :
  "- Café da Manhã: 25%\n- Almoço: 35%\n- Lanche: 10%\n- Jantar: 30%"
}

${previousRecipes.length > 0 ? `
RECEITAS A EVITAR (usadas na semana anterior - NÃO repita nenhuma delas):
${previousRecipes.map((r, i) => `${i + 1}. ${r}`).join('\n')}

IMPORTANTE: As receitas acima foram usadas recentemente. Crie receitas DIFERENTES para garantir variedade.
` : ''}

REGRAS IMPORTANTES:
1. NÃO repita a mesma receita em dias diferentes (variedade é essencial)
${previousRecipes.length > 0 ? '2. NÃO use nenhuma das receitas listadas acima (evitar repetição da semana anterior)\n' : ''}
3. Respeite TODAS as restrições e intolerâncias alimentares - SEGURANÇA PRIMEIRO
4. Use ingredientes comuns em supermercados brasileiros
5. Cada receita deve ter ingredientes com quantidades exatas e instruções de preparo detalhadas
6. Os macros (calorias, proteínas, carboidratos, gorduras) devem ser realistas para cada receita
7. Inclua "chef_tip" com uma dica de técnica culinária para cada receita

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com a estrutura:
{
  "days": [
    {
      "day_index": 0,
      "day_name": "Segunda-feira",
      "meals": [
        {
          "meal_type": "cafe_manha",
          "recipe_name": "Nome da receita${isKidsMode ? " 🎉" : ""}",
          "recipe_calories": 400,
          "recipe_protein": 20,
          "recipe_carbs": 50,
          "recipe_fat": 15,
          "recipe_prep_time": 15,
          "recipe_ingredients": [
            {"item": "ingrediente", "quantity": "100", "unit": "g"}
          ],
          "recipe_instructions": ["Passo 1", "Passo 2"],
          "chef_tip": "Dica de técnica culinária"
        }
      ]
    }
  ]
}`;
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

  const ingredientsPrompt = ingredients
    ? `Use OBRIGATORIAMENTE os seguintes ingredientes: ${ingredients}. Pode adicionar temperos e complementos básicos.`
    : "";

  const kidsNote = isKidsMode ? `
⚠️ MODO KIDS ATIVO:
- Nome DIVERTIDO e criativo com emoji
- Sabores suaves (sem temperos fortes)
- Tempo máximo: 25 minutos
- Ingredientes coloridos
` : "";

  return `Você é o Mestre Chef ReceitAI, um nutricionista e chef especializado.

PERFIL DO USUÁRIO:
- Preferência alimentar: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
- Objetivo: ${GOAL_LABELS[profile.goal || "manter"]}
- Complexidade: ${COMPLEXITY_LABELS[profile.recipe_complexity || "equilibrada"]}
- Contexto: ${CONTEXT_LABELS[profile.context || "individual"]}

RESTRIÇÕES/INTOLERÂNCIAS (NUNCA incluir estes ingredientes):
- ${intolerancesStr}

${kidsNote}

⚠️ REGRA ABSOLUTA - TIPO DE REFEIÇÃO:
Esta receita é OBRIGATORIAMENTE para ${mealLabel.toUpperCase()}.
Exemplos de receitas apropriadas: ${mealExamples.join(", ")}
NUNCA gere receitas que não sejam apropriadas para ${mealLabel}!

OUTRAS REGRAS:
1. A receita deve ter aproximadamente ${targetCalories} calorias
2. Respeite TODAS as intolerâncias alimentares - SEGURANÇA PRIMEIRO
3. Crie uma receita DIFERENTE e criativa
4. Ingredientes e instruções completas
${ingredientsPrompt}

FORMATO DE RESPOSTA (JSON VÁLIDO):
{
  "recipe_name": "Nome da Receita${isKidsMode ? " 🎉" : ""}",
  "recipe_calories": ${targetCalories},
  "recipe_protein": 25,
  "recipe_carbs": 30,
  "recipe_fat": 15,
  "recipe_prep_time": ${isKidsMode ? 20 : 30},
  "recipe_ingredients": [
    {"item": "ingrediente", "quantity": "100", "unit": "g"}
  ],
  "recipe_instructions": ["Passo 1...", "Passo 2..."],
  "chef_tip": "Dica de técnica culinária"
}

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;
}
