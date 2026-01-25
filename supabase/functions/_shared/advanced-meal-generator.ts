// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - ADVANCED MEAL GENERATOR V2
// Sistema completo com 100+ ingredientes e combinação inteligente
// ═══════════════════════════════════════════════════════════════════════

import { INGREDIENTS, type Ingredient } from "./meal-ingredients-db.ts";
import { SMART_TEMPLATES, COMPOSITE_RULES, CULTURAL_RULES, type SmartTemplate } from "./meal-templates-smart.ts";
import { 
  validateAndFixMeal, 
  applySmartGrouping, 
  expandGenericMealName 
} from "./meal-validation-rules.ts";
import { formatPortion, humanizeIngredientName, humanizeMealName } from "./unified-meal-core/portion-formatter.ts";

// ═══════════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO DE ACENTOS - Corrige nomes sem acentos para exibição correta
// Usa códigos Unicode para garantir que os acentos sejam preservados
// ═══════════════════════════════════════════════════════════════════════
const ACCENT_CORRECTIONS: Record<string, string> = {
  "Pao": "P\u00e3o",           // Pão
  "pao": "p\u00e3o",           // pão
  "gluten": "gl\u00faten",     // glúten
  "Gluten": "Gl\u00faten",     // Glúten
  "Cafe": "Caf\u00e9",         // Café
  "cafe": "caf\u00e9",         // café
  "Macarrao": "Macarr\u00e3o", // Macarrão
  "macarrao": "macarr\u00e3o", // macarrão
  "Requeijao": "Requeij\u00e3o", // Requeijão
  "requeijao": "requeij\u00e3o", // requeijão
  "Acai": "A\u00e7a\u00ed",    // Açaí
  "acai": "a\u00e7a\u00ed",    // açaí
  "Maca": "Ma\u00e7\u00e3",    // Maçã
  "maca": "ma\u00e7\u00e3",    // maçã
  "Mamao": "Mam\u00e3o",       // Mamão
  "mamao": "mam\u00e3o",       // mamão
  "Melao": "Mel\u00e3o",       // Melão
  "melao": "mel\u00e3o",       // melão
  "Limao": "Lim\u00e3o",       // Limão
  "limao": "lim\u00e3o",       // limão
  "Feijao": "Feij\u00e3o",     // Feijão
  "feijao": "feij\u00e3o",     // feijão
  "Coracao": "Cora\u00e7\u00e3o", // Coração
  "coracao": "cora\u00e7\u00e3o", // coração
  "Linhaca": "Linha\u00e7a",   // Linhaça
  "linhaca": "linha\u00e7a",   // linhaça
  "Agua": "\u00c1gua",         // Água
  "agua": "\u00e1gua",         // água
  "Cha": "Ch\u00e1",           // Chá
  "cha": "ch\u00e1",           // chá
};

/**
 * Aplica correções de acentos a um texto
 * Processa todas as palavras conhecidas que precisam de acentos
 */
function normalizeAccents(text: string): string {
  let result = text;
  for (const [wrong, correct] of Object.entries(ACCENT_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
    result = result.replace(regex, correct);
  }
  return result;
}

interface Component {
  type: string;
  name: string;
  name_en: string;
  portion_grams: number;
  portion_label: string;
  ingredient_key?: string;
}

interface GeneratedMeal {
  name: string;
  description: string;
  meal_type: string;
  meal_density: "light" | "moderate" | "heavy";
  components: Component[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  macro_source: string;
  macro_confidence: string;
  country_codes: string[];
  blocked_for_intolerances: string[];
  prep_time_minutes: number;
}

// ═══════════════════════════════════════════════════════════════════════
// CARB STRATEGY - WHOLE GRAINS DISTRIBUTION BY PROFILE
// ═══════════════════════════════════════════════════════════════════════

interface UserProfile {
  goal?: 'maintain' | 'weight_loss' | 'muscle_gain' | 'diabetes';
  accepts_whole_grains?: boolean | null;
  has_diabetes?: boolean;
  excluded_ingredients?: string[];  // Ingredientes excluídos pelo usuário (ex: ["camarão", "amendoim"])
}

// Distribuição de carboidratos por objetivo do usuário
const CARB_DISTRIBUTION_BY_PROFILE: Record<string, { neutral_base: number; accepted_whole: number; restrictive_whole: number }> = {
  maintain: {
    neutral_base: 0.70,    // 70% base neutra (arroz branco, macarrão comum, pão francês)
    accepted_whole: 0.30,  // 30% integrais aceitos (aveia, pão integral misto, arroz parboilizado)
    restrictive_whole: 0.00 // 0% integrais restritivos (arroz integral, macarrão integral)
  },
  weight_loss: {
    neutral_base: 0.40,
    accepted_whole: 0.60,
    restrictive_whole: 0.00
  },
  muscle_gain: {
    neutral_base: 0.60,
    accepted_whole: 0.40,
    restrictive_whole: 0.00
  },
  diabetes: {
    neutral_base: 0.30,
    accepted_whole: 0.60,
    restrictive_whole: 0.10
  }
};

// ═══════════════════════════════════════════════════════════════════════
// INGREDIENT SUBSTITUTIONS BY INTOLERANCE
// Baseado nos dados do ingredient_pool (alternativas cadastradas)
// Lógica: ingrediente_base -> alternativa (mesmo tipo de alimento)
// ═══════════════════════════════════════════════════════════════════════

// Mapeamento: ingrediente_base -> { intolerância -> ingrediente_alternativo }
// Baseado em ingredient_pool.replaces_ingredients e safe_for_intolerances
const INGREDIENT_SUBSTITUTIONS: Record<string, Record<string, string>> = {
  // LACTOSE - Leites -> Leite sem lactose
  whole_milk: { lactose: 'lactose_free_milk' },
  skim_milk: { lactose: 'lactose_free_milk' },
  semi_skimmed_milk: { lactose: 'lactose_free_milk' },
  coffee_with_milk: { lactose: 'lactose_free_coffee_with_milk' },

  // LACTOSE - Queijos -> Queijo sem lactose (mesmo tipo)
  minas_cheese: { lactose: 'lactose_free_minas_cheese' },
  mozzarella_cheese: { lactose: 'lactose_free_minas_cheese' },
  prato_cheese: { lactose: 'lactose_free_minas_cheese' },
  cottage_cheese: { lactose: 'lactose_free_cottage' },
  ricotta_cheese: { lactose: 'lactose_free_ricotta' },
  ricotta: { lactose: 'lactose_free_ricotta' },
  light_cream_cheese: { lactose: 'lactose_free_cream_cheese' },
  cream_cheese: { lactose: 'lactose_free_cream_cheese' },

  // LACTOSE - Iogurtes -> Iogurte sem lactose
  plain_yogurt: { lactose: 'lactose_free_yogurt' },
  greek_yogurt: { lactose: 'lactose_free_yogurt' },
  low_fat_yogurt: { lactose: 'lactose_free_yogurt' },
  natural_yogurt: { lactose: 'lactose_free_yogurt' },

  // GLÚTEN - Pães -> Pão sem glúten
  whole_wheat_bread: { gluten: 'gluten_free_bread' },
  french_bread: { gluten: 'gluten_free_bread' },
  whole_wheat_sandwich_bread: { gluten: 'gluten_free_bread' },
  sandwich_bread: { gluten: 'gluten_free_bread' },

  // GLÚTEN - Massas -> Macarrão sem glúten
  pasta: { gluten: 'gluten_free_pasta' },
  whole_wheat_pasta: { gluten: 'gluten_free_pasta' },
  spaghetti: { gluten: 'gluten_free_pasta' },

  // GLÚTEN - Aveia -> Aveia sem glúten
  oats: { gluten: 'gluten_free_oats' },
};

/**
 * Substitui ingredientes que contêm alérgenos por alternativas seguras
 * Só substitui se a alternativa existir no INGREDIENTS
 */
function substituteIngredientForIntolerance(ingredientId: string, intolerances: string[]): string {
  if (intolerances.length === 0) return ingredientId;

  const substitutions = INGREDIENT_SUBSTITUTIONS[ingredientId];
  if (!substitutions) return ingredientId;

  for (const intolerance of intolerances) {
    const alternativeId = substitutions[intolerance];
    if (alternativeId && INGREDIENTS[alternativeId]) {
      return alternativeId;
    }
  }

  return ingredientId;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// Seed aleatório para garantir variação entre execuções
let randomSeed = Date.now();

function selectRandom<T>(array: T[]): T {
  // Usar apenas Math.random() puro para máxima aleatoriedade
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function resetRandomSeed() {
  randomSeed = Date.now() + Math.floor(Math.random() * 1000000);
}

// ═══════════════════════════════════════════════════════════════════════
// CARB SELECTION BY PROFILE
// ═══════════════════════════════════════════════════════════════════════

function selectCarbByProfile(
  availableCarbs: string[],
  profile?: UserProfile
): string {
  // Se não há perfil, usar distribuição padrão (maintain)
  const goal = profile?.goal || 'maintain';
  const acceptsWholeGrains = profile?.accepts_whole_grains;
  const hasDiabetes = profile?.has_diabetes || false;
  
  // Obter distribuição base
  const baseDistribution = CARB_DISTRIBUTION_BY_PROFILE[goal] || CARB_DISTRIBUTION_BY_PROFILE.maintain;
  let distribution = { ...baseDistribution };
  
  // AJUSTE 1: Se tem diabetes E rejeita integral → zero integrais restritivos
  if (hasDiabetes && acceptsWholeGrains === false) {
    distribution.restrictive_whole = 0;
    distribution.neutral_base = 0.40;
    distribution.accepted_whole = 0.60;
  }
  
  // AJUSTE 2: Se tem diabetes E aceita integral → pode usar restritivos
  if (hasDiabetes && acceptsWholeGrains === true) {
    distribution.neutral_base = 0.30;
    distribution.accepted_whole = 0.60;
    distribution.restrictive_whole = 0.10;
  }
  
  // AJUSTE 3: Se rejeita integral (sem diabetes) → zero integrais
  if (acceptsWholeGrains === false && !hasDiabetes) {
    distribution.restrictive_whole = 0;
    distribution.accepted_whole = 0;
    distribution.neutral_base = 1.0;
  }
  
  // Filtrar carboidratos disponíveis por categoria
  const neutralCarbs = availableCarbs.filter(id => {
    const ing = INGREDIENTS[id];
    return ing && ing.carb_category === 'neutral_base';
  });
  
  const acceptedCarbs = availableCarbs.filter(id => {
    const ing = INGREDIENTS[id];
    return ing && ing.carb_category === 'accepted_whole';
  });
  
  const restrictiveCarbs = availableCarbs.filter(id => {
    const ing = INGREDIENTS[id];
    return ing && ing.carb_category === 'restrictive_whole';
  });
  
  // Seleção ponderada baseada na distribuição
  const random = Math.random();
  
  if (random < distribution.neutral_base && neutralCarbs.length > 0) {
    return selectRandom(neutralCarbs);
  } else if (random < distribution.neutral_base + distribution.accepted_whole && acceptedCarbs.length > 0) {
    return selectRandom(acceptedCarbs);
  } else if (restrictiveCarbs.length > 0) {
    return selectRandom(restrictiveCarbs);
  }
  
  // Fallback: se não encontrou na categoria sorteada, tentar outras
  if (neutralCarbs.length > 0) return selectRandom(neutralCarbs);
  if (acceptedCarbs.length > 0) return selectRandom(acceptedCarbs);
  if (restrictiveCarbs.length > 0) return selectRandom(restrictiveCarbs);
  
  // Último fallback: qualquer carboidrato disponível
  return selectRandom(availableCarbs);
}

// ═══════════════════════════════════════════════════════════════════════
// EXCLUDED INGREDIENTS FILTER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Normaliza texto para comparação (remove acentos, lowercase)
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * MAPEAMENTO INTELIGENTE DE CATEGORIAS
 * Permite que o usuário exclua categorias genéricas como "carne", "salada", "verdura"
 * e o sistema expande para todos os ingredientes relacionados
 */
const CATEGORY_MAPPINGS: Record<string, string[]> = {
  // CARNES
  'carne': ['beef', 'steak', 'sirloin', 'round', 'filet', 'mignon', 'picanha', 'ribs', 'costela', 'ground_beef', 'moida', 'panela', 'liver', 'figado', 'alcatra', 'patinho', 'bife'],
  'carne vermelha': ['beef', 'steak', 'sirloin', 'round', 'filet', 'mignon', 'picanha', 'ribs', 'costela', 'ground_beef', 'moida', 'panela', 'liver', 'figado', 'alcatra', 'patinho', 'bife'],
  'carne bovina': ['beef', 'steak', 'sirloin', 'round', 'filet', 'mignon', 'picanha', 'ribs', 'costela', 'ground_beef', 'moida', 'panela', 'liver', 'figado', 'alcatra', 'patinho', 'bife'],
  'boi': ['beef', 'steak', 'sirloin', 'round', 'filet', 'mignon', 'picanha', 'ribs', 'costela', 'ground_beef', 'moida', 'panela', 'liver', 'figado', 'alcatra', 'patinho', 'bife'],
  
  // AVES
  'frango': ['chicken', 'frango', 'breast', 'thigh', 'drumstick', 'coxa', 'sobrecoxa', 'peito', 'passarinho'],
  'ave': ['chicken', 'turkey', 'peru', 'frango', 'breast', 'thigh', 'drumstick', 'coxa', 'sobrecoxa', 'peito'],
  'aves': ['chicken', 'turkey', 'peru', 'frango', 'breast', 'thigh', 'drumstick', 'coxa', 'sobrecoxa', 'peito'],
  
  // PORCO
  'porco': ['pork', 'bacon', 'ham', 'presunto', 'linguica', 'sausage', 'lombo', 'pernil'],
  'suino': ['pork', 'bacon', 'ham', 'presunto', 'linguica', 'sausage', 'lombo', 'pernil'],
  
  // PEIXES E FRUTOS DO MAR
  'peixe': ['fish', 'tilapia', 'salmon', 'salmao', 'hake', 'pescada', 'merluza', 'tuna', 'atum', 'sardine', 'sardinha', 'cod', 'bacalhau', 'dourado'],
  'peixes': ['fish', 'tilapia', 'salmon', 'salmao', 'hake', 'pescada', 'merluza', 'tuna', 'atum', 'sardine', 'sardinha', 'cod', 'bacalhau', 'dourado'],
  'frutos do mar': ['shrimp', 'camarao', 'crab', 'caranguejo', 'lobster', 'lagosta', 'squid', 'lula', 'octopus', 'polvo', 'mussel', 'mexilhao', 'oyster', 'ostra'],
  'marisco': ['shrimp', 'camarao', 'crab', 'caranguejo', 'lobster', 'lagosta', 'squid', 'lula', 'octopus', 'polvo', 'mussel', 'mexilhao', 'oyster', 'ostra'],
  'camarao': ['shrimp', 'camarao', 'grilled_shrimp'],
  
  // OVOS
  'ovo': ['egg', 'ovo', 'scrambled', 'boiled', 'omelet', 'omelete', 'mexido', 'cozido', 'frito'],
  'ovos': ['egg', 'ovo', 'scrambled', 'boiled', 'omelet', 'omelete', 'mexido', 'cozido', 'frito'],
  
  // LATICÍNIOS
  'leite': ['milk', 'leite', 'dairy', 'laticinios'],
  'queijo': ['cheese', 'queijo', 'mussarela', 'mozzarella', 'parmesao', 'parmesan', 'cottage', 'ricota', 'ricotta', 'coalho', 'minas', 'cheddar', 'provolone'],
  'queijos': ['cheese', 'queijo', 'mussarela', 'mozzarella', 'parmesao', 'parmesan', 'cottage', 'ricota', 'ricotta', 'coalho', 'minas', 'cheddar', 'provolone'],
  'iogurte': ['yogurt', 'iogurte', 'greek_yogurt', 'natural_yogurt'],
  'laticinios': ['milk', 'leite', 'cheese', 'queijo', 'yogurt', 'iogurte', 'cream', 'creme', 'butter', 'manteiga', 'requeijao', 'cottage', 'ricota'],
  'derivados de leite': ['milk', 'leite', 'cheese', 'queijo', 'yogurt', 'iogurte', 'cream', 'creme', 'butter', 'manteiga', 'requeijao', 'cottage', 'ricota'],
  
  // VEGETAIS E VERDURAS
  'verdura': ['lettuce', 'alface', 'spinach', 'espinafre', 'kale', 'couve', 'arugula', 'rucula', 'chard', 'acelga', 'cabbage', 'repolho', 'watercress', 'agriao', 'chicory', 'chicoria', 'endive', 'escarola'],
  'verduras': ['lettuce', 'alface', 'spinach', 'espinafre', 'kale', 'couve', 'arugula', 'rucula', 'chard', 'acelga', 'cabbage', 'repolho', 'watercress', 'agriao', 'chicory', 'chicoria', 'endive', 'escarola'],
  'folha': ['lettuce', 'alface', 'spinach', 'espinafre', 'kale', 'couve', 'arugula', 'rucula', 'chard', 'acelga', 'watercress', 'agriao'],
  'folhas': ['lettuce', 'alface', 'spinach', 'espinafre', 'kale', 'couve', 'arugula', 'rucula', 'chard', 'acelga', 'watercress', 'agriao'],
  'legume': ['carrot', 'cenoura', 'zucchini', 'abobrinha', 'eggplant', 'berinjela', 'squash', 'abobora', 'beet', 'beterraba', 'chayote', 'chuchu', 'okra', 'quiabo', 'green_beans', 'vagem', 'pea', 'ervilha', 'corn', 'milho'],
  'legumes': ['carrot', 'cenoura', 'zucchini', 'abobrinha', 'eggplant', 'berinjela', 'squash', 'abobora', 'beet', 'beterraba', 'chayote', 'chuchu', 'okra', 'quiabo', 'green_beans', 'vagem', 'pea', 'ervilha', 'corn', 'milho'],
  'vegetal': ['vegetable', 'carrot', 'cenoura', 'broccoli', 'brocolis', 'cauliflower', 'couve_flor', 'zucchini', 'abobrinha', 'eggplant', 'berinjela', 'pepper', 'pimentao', 'tomato', 'tomate', 'cucumber', 'pepino', 'onion', 'cebola'],
  'vegetais': ['vegetable', 'carrot', 'cenoura', 'broccoli', 'brocolis', 'cauliflower', 'couve_flor', 'zucchini', 'abobrinha', 'eggplant', 'berinjela', 'pepper', 'pimentao', 'tomato', 'tomate', 'cucumber', 'pepino', 'onion', 'cebola'],
  
  // SALADAS
  'salada': ['salad', 'salada', 'lettuce', 'alface', 'tomato', 'tomate', 'cucumber', 'pepino', 'carrot', 'cenoura', 'beet', 'beterraba', 'arugula', 'rucula', 'spinach', 'espinafre', 'cabbage', 'repolho', 'mixed_salad', 'green_salad'],
  'saladas': ['salad', 'salada', 'lettuce', 'alface', 'tomato', 'tomate', 'cucumber', 'pepino', 'carrot', 'cenoura', 'beet', 'beterraba', 'arugula', 'rucula', 'spinach', 'espinafre', 'cabbage', 'repolho', 'mixed_salad', 'green_salad'],
  
  // FRUTAS
  'fruta': ['fruit', 'fruta', 'apple', 'maca', 'banana', 'orange', 'laranja', 'papaya', 'mamao', 'mango', 'manga', 'pineapple', 'abacaxi', 'watermelon', 'melancia', 'melon', 'melao', 'grape', 'uva', 'strawberry', 'morango', 'kiwi', 'pear', 'pera', 'peach', 'pessego'],
  'frutas': ['fruit', 'fruta', 'apple', 'maca', 'banana', 'orange', 'laranja', 'papaya', 'mamao', 'mango', 'manga', 'pineapple', 'abacaxi', 'watermelon', 'melancia', 'melon', 'melao', 'grape', 'uva', 'strawberry', 'morango', 'kiwi', 'pear', 'pera', 'peach', 'pessego'],
  
  // CARBOIDRATOS
  'arroz': ['rice', 'arroz', 'white_rice', 'brown_rice', 'parboiled'],
  'macarrao': ['pasta', 'macarrao', 'spaghetti', 'penne', 'fusilli', 'lasagna', 'lasanha', 'noodle', 'gnocchi', 'nhoque'],
  'massa': ['pasta', 'macarrao', 'spaghetti', 'penne', 'fusilli', 'lasagna', 'lasanha', 'noodle', 'gnocchi', 'nhoque'],
  'pao': ['bread', 'pao', 'french_bread', 'whole_wheat', 'integral', 'toast', 'torrada', 'baguette', 'ciabatta', 'brioche'],
  'paes': ['bread', 'pao', 'french_bread', 'whole_wheat', 'integral', 'toast', 'torrada', 'baguette', 'ciabatta', 'brioche'],
  'batata': ['potato', 'batata', 'sweet_potato', 'doce', 'mashed', 'pure', 'fries', 'frita', 'baked', 'assada', 'boiled', 'cozida'],
  
  // LEGUMINOSAS
  'feijao': ['beans', 'feijao', 'black_beans', 'preto', 'carioca', 'fradinho', 'feijoada'],
  'leguminosa': ['beans', 'feijao', 'lentils', 'lentilha', 'chickpea', 'grao_de_bico', 'pea', 'ervilha', 'soy', 'soja'],
  'leguminosas': ['beans', 'feijao', 'lentils', 'lentilha', 'chickpea', 'grao_de_bico', 'pea', 'ervilha', 'soy', 'soja'],
  
  // OLEAGINOSAS
  'castanha': ['nut', 'castanha', 'cashew', 'caju', 'brazil_nut', 'para', 'almond', 'amendoa', 'walnut', 'noz', 'hazelnut', 'avela', 'peanut', 'amendoim', 'pistachio', 'pistache', 'macadamia'],
  'nozes': ['nut', 'castanha', 'cashew', 'caju', 'brazil_nut', 'para', 'almond', 'amendoa', 'walnut', 'noz', 'hazelnut', 'avela', 'peanut', 'amendoim', 'pistachio', 'pistache', 'macadamia'],
  'oleaginosa': ['nut', 'castanha', 'cashew', 'caju', 'brazil_nut', 'para', 'almond', 'amendoa', 'walnut', 'noz', 'hazelnut', 'avela', 'peanut', 'amendoim', 'pistachio', 'pistache', 'macadamia'],
  'oleaginosas': ['nut', 'castanha', 'cashew', 'caju', 'brazil_nut', 'para', 'almond', 'amendoa', 'walnut', 'noz', 'hazelnut', 'avela', 'peanut', 'amendoim', 'pistachio', 'pistache', 'macadamia'],
  
  // BEBIDAS
  'cafe': ['coffee', 'cafe', 'espresso', 'cappuccino', 'latte'],
  'cha': ['tea', 'cha', 'green_tea', 'verde', 'black_tea', 'preto', 'herbal', 'ervas', 'chamomile', 'camomila', 'mint', 'hortela'],
  'suco': ['juice', 'suco', 'orange_juice', 'laranja', 'grape_juice', 'uva', 'apple_juice', 'maca', 'pineapple_juice', 'abacaxi'],
  'refrigerante': ['soda', 'refrigerante', 'cola', 'guarana', 'sprite', 'fanta'],
  
  // DOCES
  'doce': ['sweet', 'doce', 'candy', 'bala', 'chocolate', 'cake', 'bolo', 'cookie', 'biscoito', 'ice_cream', 'sorvete', 'pudding', 'pudim', 'brigadeiro', 'beijinho'],
  'doces': ['sweet', 'doce', 'candy', 'bala', 'chocolate', 'cake', 'bolo', 'cookie', 'biscoito', 'ice_cream', 'sorvete', 'pudding', 'pudim', 'brigadeiro', 'beijinho'],
  'sobremesa': ['dessert', 'sobremesa', 'sweet', 'doce', 'cake', 'bolo', 'pie', 'torta', 'ice_cream', 'sorvete', 'pudding', 'pudim', 'mousse', 'fruit_salad', 'salada_de_frutas'],
  'sobremesas': ['dessert', 'sobremesa', 'sweet', 'doce', 'cake', 'bolo', 'pie', 'torta', 'ice_cream', 'sorvete', 'pudding', 'pudim', 'mousse', 'fruit_salad', 'salada_de_frutas'],
  
  // EMBUTIDOS
  'embutido': ['sausage', 'linguica', 'salami', 'salame', 'ham', 'presunto', 'bacon', 'mortadela', 'pepperoni', 'chorizo', 'calabresa'],
  'embutidos': ['sausage', 'linguica', 'salami', 'salame', 'ham', 'presunto', 'bacon', 'mortadela', 'pepperoni', 'chorizo', 'calabresa'],
  'frios': ['sausage', 'linguica', 'salami', 'salame', 'ham', 'presunto', 'bacon', 'mortadela', 'pepperoni', 'chorizo', 'calabresa', 'turkey_breast', 'peito_de_peru'],
  
  // GORDURAS
  'gordura': ['oil', 'oleo', 'fat', 'gordura', 'butter', 'manteiga', 'lard', 'banha', 'margarine', 'margarina', 'olive_oil', 'azeite'],
  'oleo': ['oil', 'oleo', 'olive_oil', 'azeite', 'vegetable_oil', 'canola', 'sunflower', 'girassol', 'coconut_oil', 'coco'],
  'azeite': ['olive_oil', 'azeite', 'extra_virgin'],
};

/**
 * Expande termos de categoria para lista de palavras-chave de ingredientes
 */
function expandCategoryTerms(excludedTerms: string[]): string[] {
  const expanded: string[] = [];
  
  for (const term of excludedTerms) {
    const normalizedTerm = normalizeForComparison(term);
    
    // Verificar se é uma categoria mapeada
    if (CATEGORY_MAPPINGS[normalizedTerm]) {
      expanded.push(...CATEGORY_MAPPINGS[normalizedTerm]);
      console.log(`[EXCLUDED] Categoria "${term}" expandida para: ${CATEGORY_MAPPINGS[normalizedTerm].join(', ')}`);
    }
    
    // Sempre adicionar o termo original também
    expanded.push(normalizedTerm);
  }
  
  // Remover duplicatas
  return [...new Set(expanded)];
}

/**
 * Verifica se um ingrediente (por ID) está na lista de excluídos do usuário
 * Compara o nome em PT do ingrediente com os termos excluídos
 * Suporta categorias genéricas como "carne", "salada", "verdura"
 */
function isIngredientExcluded(ingredientId: string, excludedIngredients: string[]): boolean {
  if (!excludedIngredients || excludedIngredients.length === 0) {
    return false;
  }
  
  const ingredient = INGREDIENTS[ingredientId];
  if (!ingredient) {
    return false;
  }
  
  // Expandir categorias para termos específicos
  const expandedExclusions = expandCategoryTerms(excludedIngredients);
  
  const ingredientNameNormalized = normalizeForComparison(ingredient.display_name_pt);
  const ingredientIdNormalized = normalizeForComparison(ingredientId.replace(/_/g, ' '));
  const ingredientNameEnNormalized = normalizeForComparison(ingredient.display_name_en || '');
  
  for (const excluded of expandedExclusions) {
    const excludedNormalized = normalizeForComparison(excluded);
    
    // Verificar se o nome PT do ingrediente contém o termo excluído
    if (ingredientNameNormalized.includes(excludedNormalized)) {
      return true;
    }
    
    // Verificar se o ID do ingrediente contém o termo excluído
    if (ingredientIdNormalized.includes(excludedNormalized)) {
      return true;
    }
    
    // Verificar se o nome EN do ingrediente contém o termo excluído
    if (ingredientNameEnNormalized.includes(excludedNormalized)) {
      return true;
    }
    
    // Verificar match exato
    if (ingredientNameNormalized === excludedNormalized || ingredientIdNormalized === excludedNormalized) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filtra opções de ingredientes removendo os excluídos pelo usuário
 */
function filterExcludedIngredients(options: string[], excludedIngredients: string[]): string[] {
  if (!excludedIngredients || excludedIngredients.length === 0) {
    return options;
  }
  
  return options.filter(id => !isIngredientExcluded(id, excludedIngredients));
}

/**
 * Valida se o nome da refeição é coerente com os componentes
 */
function validateMealNameCoherence(mealName: string, components: Component[]): {
  valid: boolean;
  regenerate: boolean;
  reason?: string;
} {
  if (!mealName || components.length === 0) {
    return { valid: false, regenerate: true, reason: 'Nome ou componentes vazios' };
  }
  
  const nameLower = mealName.toLowerCase();
  
  // Lista de ingredientes que podem ser mencionados no título
  const ingredientKeywords = [
    // Frutas
    { keyword: 'mamão', keys: ['papaya'] },
    { keyword: 'melão', keys: ['melon'] },
    { keyword: 'melancia', keys: ['watermelon'] },
    { keyword: 'banana', keys: ['silver_banana', 'banana'] },
    { keyword: 'maçã', keys: ['red_apple', 'apple'] },
    { keyword: 'morango', keys: ['strawberry'] },
    { keyword: 'kiwi', keys: ['kiwi'] },
    // Proteínas
    { keyword: 'frango', keys: ['grilled_chicken_breast', 'baked_chicken_thigh', 'shredded_chicken', 'chicken'] },
    { keyword: 'carne', keys: ['grilled_sirloin_steak', 'sauteed_ground_beef', 'pot_roast', 'beef'] },
    { keyword: 'bife', keys: ['grilled_sirloin_steak', 'grilled_rump_steak', 'sirloin', 'rump', 'alcatra', 'patinho'] },
    { keyword: 'alcatra', keys: ['grilled_sirloin_steak', 'sirloin', 'alcatra'] },
    { keyword: 'patinho', keys: ['grilled_rump_steak', 'rump', 'patinho'] },
    { keyword: 'ovo', keys: ['scrambled_eggs', 'boiled_eggs', 'plain_omelet'] },
    { keyword: 'omelete', keys: ['plain_omelet', 'omelet'] },
    { keyword: 'peixe', keys: ['grilled_tilapia', 'baked_hake', 'grilled_salmon', 'fish'] },
    { keyword: 'tilápia', keys: ['grilled_tilapia', 'tilapia'] },
    { keyword: 'salmão', keys: ['grilled_salmon', 'salmon'] },
    { keyword: 'sardinha', keys: ['canned_sardines', 'sardine'] },
    { keyword: 'atum', keys: ['canned_tuna', 'tuna'] },
    // Laticínios
    { keyword: 'iogurte', keys: ['plain_yogurt', 'greek_yogurt', 'low_fat_yogurt'] },
    { keyword: 'queijo', keys: ['minas_cheese', 'cottage_cheese', 'ricotta'] },
    // Oleaginosas
    { keyword: 'amendoim', keys: ['peanuts'] },
    { keyword: 'castanha', keys: ['brazil_nuts', 'cashew_nuts'] },
  ];
  
  // Verificar cada ingrediente mencionado no título
  for (const { keyword, keys } of ingredientKeywords) {
    if (nameLower.includes(keyword)) {
      const hasIngredient = components.some(c => 
        keys.some(key => 
          (c as any).ingredient_key === key || 
          c.name?.toLowerCase().includes(keyword)
        )
      );
      
      if (!hasIngredient) {
        return { 
          valid: false, 
          regenerate: true, 
          reason: `Ingrediente "${keyword}" no título não existe nos componentes` 
        };
      }
    }
  }
  
  return { valid: true, regenerate: false };
}

function calculateMealDensity(calories: number, mealType: string): "light" | "moderate" | "heavy" {
  // Definir limites de calorias por tipo de refeição
  const thresholds: Record<string, { light: number; moderate: number }> = {
    breakfast: { light: 300, moderate: 450 },
    morning_snack: { light: 150, moderate: 250 },
    lunch: { light: 400, moderate: 600 },
    afternoon_snack: { light: 150, moderate: 250 },
    dinner: { light: 350, moderate: 550 },
    supper: { light: 100, moderate: 200 },
  };

  const threshold = thresholds[mealType] || { light: 300, moderate: 500 };

  if (calories <= threshold.light) {
    return "light";
  } else if (calories <= threshold.moderate) {
    return "moderate";
  } else {
    return "heavy";
  }
}

/**
 * @deprecated Use sortComponentsBR from unified-meal-core/meal-sorter.ts instead.
 * This function is kept for backward compatibility but will be removed in future versions.
 * The Unified Core applies sorting automatically via processRawMeal().
 */
function sortComponents(components: Component[]): Component[] {
  // ORDEM CORRETA PARA ALMOÇO/JANTAR BR:
  // 1. Arroz (carb com arroz)
  // 2. Feijão/Leguminosas
  // 3. Proteína
  // 4. Outros carboidratos
  // 5. Vegetais
  // 6. Salada
  // 7. Frutas
  // 8. Laticínios
  // 9. Gorduras
  // 10. Bebidas
  // 11. Outros
  
  return components.sort((a, b) => {
    const getOrder = (comp: Component): number => {
      const name = comp.name.toLowerCase();
      const type = comp.type;
      
      // 1. Arroz SEMPRE primeiro
      if (name.includes('arroz')) return 1;
      
      // 2. Feijão/Leguminosas segundo
      if (type === 'legume' || name.includes('feij') || name.includes('lentilha') || name.includes('grao de bico')) return 2;
      
      // 3. Proteína terceiro
      if (type === 'protein') return 3;
      
      // 4. Outros carboidratos (batata, macarrão, etc)
      if (type === 'carb') return 4;
      
      // 5. Vegetais
      if (type === 'vegetable' && !name.includes('salada') && !name.includes('alface') && !name.includes('rucula')) return 5;
      
      // 6. Salada
      if (name.includes('salada') || name.includes('alface') || name.includes('rucula')) return 6;
      
      // 7. Frutas
      if (type === 'fruit') return 7;
      
      // 8. Laticínios
      if (type === 'dairy') return 8;
      
      // 9. Gorduras
      if (type === 'fat') return 9;
      
      // 10. Bebidas
      if (type === 'beverage') return 10;
      
      // 11. Outros
      return 11;
    };
    
    return getOrder(a) - getOrder(b);
  });
}

function getComponentType(ingredientId: string): string {
  // LEGUMINOSAS (verificar ANTES de proteínas - português E inglês)
  // NOTA: "beans" e "pea" são muito genéricos - usar termos específicos
  // "green_beans" (vagem) é VEGETABLE, não legume
  if (ingredientId.includes("feijao") || ingredientId.includes("feijão") || 
      (ingredientId.includes("beans") && !ingredientId.includes("green_beans")) ||
      ingredientId.includes("lentilha") || ingredientId.includes("lentil") ||
      ingredientId.includes("grao_de_bico") || ingredientId.includes("chickpea") ||
      (ingredientId.includes("ervilha") && !ingredientId.includes("vagem")) ||
      ingredientId.includes("fava") || ingredientId.includes("soja") || ingredientId.includes("soy") ||
      ingredientId.includes("edamame")) {
    return "legume";
  }
  
  // PROTEÍNAS (português E inglês)
  // IMPORTANTE: Verificar que NÃO é vegetal antes de classificar como proteína
  const isVegetable = ingredientId.includes("berinjela") || ingredientId.includes("eggplant") ||
                      ingredientId.includes("jilo") || ingredientId.includes("abobrinha") ||
                      ingredientId.includes("pimentao") || ingredientId.includes("bell_pepper");
  
  if (!isVegetable && (
      ingredientId.includes("frango") || ingredientId.includes("chicken") ||
      ingredientId.includes("bife") || ingredientId.includes("steak") ||
      ingredientId.includes("carne") || ingredientId.includes("beef") || ingredientId.includes("meat") ||
      ingredientId.includes("peixe") || ingredientId.includes("fish") ||
      ingredientId.includes("tilapia") || ingredientId.includes("salmao") || ingredientId.includes("salmon") ||
      ingredientId.includes("pescada") || ingredientId.includes("hake") ||
      ingredientId.includes("merluza") ||
      ingredientId.includes("peru") || ingredientId.includes("turkey") ||
      ingredientId.includes("presunto") || ingredientId.includes("ham") ||
      ingredientId.includes("picanha") || ingredientId.includes("costela") || ingredientId.includes("rib") ||
      ingredientId.includes("figado") || ingredientId.includes("liver") ||
      ingredientId.includes("passarinho") || ingredientId.includes("sobrecoxa") || ingredientId.includes("thigh") ||
      ingredientId.includes("atum") || ingredientId.includes("tuna") ||
      ingredientId.includes("sardinha") || ingredientId.includes("sardine") ||
      ingredientId.includes("bacalhau") || ingredientId.includes("cod") ||
      ingredientId.includes("camarao") || ingredientId.includes("shrimp") ||
      ingredientId.includes("pot_roast") || ingredientId.includes("panela") ||
      ingredientId.includes("mignon") || ingredientId.includes("alcatra") ||
      ingredientId.includes("patinho") || ingredientId.includes("moida") || ingredientId.includes("ground") ||
      ingredientId.includes("omelete") || ingredientId.includes("omelet") ||
      ingredientId.includes("ovo") || ingredientId.includes("egg"))) {
    return "protein";
  }
  
  // CARBOIDRATOS (português E inglês) - verificar ANTES de vegetais
  if (ingredientId.includes("arroz") || ingredientId.includes("rice") ||
      ingredientId.includes("batata") || ingredientId.includes("potato") ||
      ingredientId.includes("pao") || ingredientId.includes("bread") ||
      ingredientId.includes("tapioca") || ingredientId.includes("macarrao") || ingredientId.includes("pasta") ||
      ingredientId.includes("aveia") || ingredientId.includes("oats") ||
      ingredientId.includes("granola") || ingredientId.includes("cuscuz") || ingredientId.includes("couscous") ||
      ingredientId.includes("pure") || ingredientId.includes("mashed") ||
      ingredientId.includes("mandioca") || ingredientId.includes("cassava") ||
      ingredientId.includes("farofa") || ingredientId.includes("polenta") ||
      ingredientId.includes("nhoque") || ingredientId.includes("gnocchi")) {
    return "carb";
  }
  
  // VEGETAIS (português e inglês)
  if (ingredientId.includes("alface") || ingredientId.includes("lettuce") ||
      ingredientId.includes("rucula") || ingredientId.includes("arugula") ||
      ingredientId.includes("agriao") || ingredientId.includes("watercress") ||
      ingredientId.includes("brocolis") || ingredientId.includes("broccoli") ||
      ingredientId.includes("couve") || ingredientId.includes("kale") || ingredientId.includes("chard") ||
      ingredientId.includes("cenoura") || ingredientId.includes("carrot") ||
      ingredientId.includes("abobrinha") || ingredientId.includes("zucchini") ||
      ingredientId.includes("tomate") || ingredientId.includes("tomato") ||
      ingredientId.includes("pepino") || ingredientId.includes("cucumber") ||
      ingredientId.includes("pimentao") || ingredientId.includes("bell_pepper") ||
      ingredientId.includes("vagem") || ingredientId.includes("green_beans") ||
      ingredientId.includes("abobora") || ingredientId.includes("pumpkin") ||
      ingredientId.includes("espinafre") || ingredientId.includes("spinach") ||
      ingredientId.includes("chuchu") || ingredientId.includes("chayote") ||
      ingredientId.includes("quiabo") || ingredientId.includes("okra") ||
      ingredientId.includes("berinjela") || ingredientId.includes("eggplant") || ingredientId.includes("scarlet") ||
      ingredientId.includes("sauteed_") || ingredientId.includes("refogad") ||
      ingredientId.includes("beterraba") || ingredientId.includes("beet") ||
      ingredientId.includes("maxixe") || ingredientId.includes("jilo") || ingredientId.includes("gherkin") ||
      ingredientId.includes("repolho") || ingredientId.includes("cabbage") ||
      ingredientId.includes("acelga") || ingredientId.includes("cauliflower") ||
      ingredientId.includes("cebola") || ingredientId.includes("onion") ||
      ingredientId.includes("alho") || ingredientId.includes("garlic") ||
      ingredientId.includes("cheiro_verde") || ingredientId.includes("salada") || ingredientId.includes("salad")) {
    return "vegetable";
  }
  
  // FRUTAS
  if (ingredientId.includes("banana") || ingredientId.includes("maca") || ingredientId.includes("morango") ||
      ingredientId.includes("mamao") || ingredientId.includes("manga") || ingredientId.includes("pera") ||
      ingredientId.includes("laranja") || ingredientId.includes("melancia") || ingredientId.includes("melao") ||
      ingredientId.includes("abacaxi") || ingredientId.includes("goiaba") || ingredientId.includes("uva") ||
      ingredientId.includes("kiwi") || ingredientId.includes("tangerina") || ingredientId.includes("abacate") ||
      ingredientId.includes("acai")) {
    return "fruit";
  }
  
  // BEBIDAS (verificar ANTES de laticínios - cafe_com_leite tem "leite" no nome)
  if (ingredientId.includes("cafe") || ingredientId.includes("coffee") ||
      ingredientId.includes("cha") || ingredientId.includes("tea") ||
      ingredientId.includes("suco") || ingredientId.includes("juice") ||
      ingredientId.includes("agua") || ingredientId.includes("water") ||
      ingredientId.includes("vitamina") || ingredientId.includes("smoothie")) {
    return "beverage";
  }
  
  // LATICÍNIOS
  if (ingredientId.includes("iogurte") || ingredientId.includes("queijo") || ingredientId.includes("ricota") ||
      ingredientId.includes("requeijao") || ingredientId.includes("leite")) {
    return "dairy";
  }
  
  // GORDURAS E SEMENTES
  if (ingredientId.includes("azeite") || ingredientId.includes("castanha") || ingredientId.includes("amendoim") ||
      ingredientId.includes("nozes") || ingredientId.includes("chia") || ingredientId.includes("linhaca") ||
      ingredientId.includes("gergelim") || ingredientId.includes("coco_ralado")) {
    return "fat";
  }
  
  // OUTROS (molhos, condimentos)
  if (ingredientId.includes("molho") || ingredientId.includes("shoyu") || ingredientId.includes("vinagre") ||
      ingredientId.includes("mel")) {
    return "other";
  }
  
  return "other";
}

/**
 * @deprecated Use applyCompositeRules from unified-meal-core/cultural-rules.ts instead.
 * This function is kept for backward compatibility but will be removed in future versions.
 * The Unified Core applies composite rules automatically via processRawMeal().
 */
function applyCompositeRules(selectedIngredients: string[]): { name: string; name_en: string; ingredients: string[] } | null {
  for (const rule of COMPOSITE_RULES) {
    const hasAllTriggers = rule.triggers.every(trigger => selectedIngredients.includes(trigger));
    if (hasAllTriggers) {
      return {
        name: rule.result_name,
        name_en: rule.result_name_en,
        ingredients: rule.triggers,
      };
    }
  }
  return null;
}

/**
 * @deprecated Use validateCulturalRules from unified-meal-core/cultural-rules.ts instead.
 * This function is kept for backward compatibility but will be removed in future versions.
 * The Unified Core applies cultural rules automatically via processRawMeal().
 */
function validateCulturalRules(selectedIngredients: string[], country: string): boolean {
  const rules = CULTURAL_RULES[country as keyof typeof CULTURAL_RULES];
  if (!rules) return true;
  
  for (const forbidden of rules.forbidden_combinations) {
    const hasAll = forbidden.every(ing => selectedIngredients.includes(ing));
    if (hasAll) return false;
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// MEAL TYPE NORMALIZATION (Suporta inglês E português para compatibilidade)
// ═══════════════════════════════════════════════════════════════════════

// Mapeamento bidirecional para garantir compatibilidade
const MEAL_TYPE_ALIASES: Record<string, string[]> = {
  // Inglês (padrão) -> aliases que também devem funcionar
  breakfast: ['cafe_manha', 'cafe_da_manha', 'café_manha'],
  morning_snack: ['lanche_manha', 'lanche_da_manha'],
  lunch: ['almoco', 'almoço'],
  afternoon_snack: ['lanche_tarde', 'lanche_da_tarde', 'lanche'],
  dinner: ['jantar'],
  supper: ['ceia', 'evening_snack'],
};

// Criar mapeamento reverso: português -> inglês
const NORMALIZE_TO_ENGLISH: Record<string, string> = {};
for (const [english, aliases] of Object.entries(MEAL_TYPE_ALIASES)) {
  NORMALIZE_TO_ENGLISH[english] = english; // inglês -> inglês
  for (const alias of aliases) {
    NORMALIZE_TO_ENGLISH[alias] = english; // português -> inglês
  }
}

function normalizeMealType(mealType: string): string {
  return NORMALIZE_TO_ENGLISH[mealType] || mealType;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════

export function generateMealsForPool(
  mealType: string,
  quantity: number,
  country: string = "BR",
  intolerances: string[] = [],
  rejectedCombinations: Set<string> = new Set(),
  profile?: UserProfile
): GeneratedMeal[] {
  // Reinicializar seed aleatório para garantir variação entre execuções
  resetRandomSeed();
  
  // NORMALIZAR para inglês (suporta entrada em PT ou EN)
  const normalizedMealType = normalizeMealType(mealType);
  
  // Buscar templates com o tipo normalizado (inglês)
  let templates = SMART_TEMPLATES[normalizedMealType] || [];
  
  // Fallback: tentar com tipo original caso não encontre
  if (templates.length === 0) {
    templates = SMART_TEMPLATES[mealType] || [];
    console.log(`[MEAL-GENERATOR] Fallback to original type: ${mealType}, found: ${templates.length} templates`);
  }
  
  if (templates.length === 0) {
    console.error(`[MEAL-GENERATOR] No templates for: ${mealType} (normalized: ${normalizedMealType})`);
    console.error(`[MEAL-GENERATOR] Available keys: ${Object.keys(SMART_TEMPLATES).join(', ')}`);
    throw new Error(`No templates for meal type: ${mealType}`);
  }
  
  console.log(`[MEAL-GENERATOR] Found ${templates.length} templates for ${normalizedMealType}`);

  const meals: GeneratedMeal[] = [];
  const usedCombinations = new Set<string>();
  let attempts = 0;
  
  // Calcular maxAttempts baseado no número de templates e complexidade
  const avgOptionsPerSlot = templates.reduce((sum, t) => {
    const slotsCount = Object.values(t.slots).reduce((s, slot) => s + slot.options.length, 0);
    return sum + slotsCount;
  }, 0) / templates.length;
  
  // AUMENTAR tentativas para garantir 100% de sucesso
  // Refeições simples (lanches, ceia) precisam de MAIS tentativas devido a menos opções
  const multiplier = avgOptionsPerSlot > 30 ? 1000 : avgOptionsPerSlot > 15 ? 800 : 500;
  const maxAttempts = quantity * multiplier;
  
  console.log(`[MEAL-GENERATOR] Iniciando: ${quantity} refeições, ${maxAttempts} tentativas (${multiplier}x), templates: ${templates.length}, avgOptions: ${avgOptionsPerSlot.toFixed(1)}`);
  
  // Timeout protection: máximo 45 segundos de execução
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 45000; // 45 segundos (deixa margem para o resto do código)

  while (meals.length < quantity && attempts < maxAttempts) {
    // Verificar timeout a cada 100 tentativas para não impactar performance
    if (attempts % 100 === 0 && Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.warn(`[MEAL-GENERATOR] Timeout protection: Geradas ${meals.length} de ${quantity} refeições em ${attempts} tentativas`);
      break; // Parar e retornar o que conseguiu gerar
    }
    
    // Log de progresso a cada 1000 tentativas
    if (attempts > 0 && attempts % 1000 === 0) {
      console.log(`[MEAL-GENERATOR] Progresso: ${meals.length}/${quantity} refeições em ${attempts} tentativas`);
    }
    
    attempts++;
    
    const template = selectRandom(templates);
    const portionModifier = template.portion_modifier || 1.0;
    
    const selectedIngredients: Record<string, string[]> = {};
    const allSelectedIds: string[] = [];
    const globalUsed = new Set<string>();
    
    // ✅ FILTRAR INGREDIENTES EXCLUÍDOS PELO USUÁRIO
    const excludedIngredients = profile?.excluded_ingredients || [];
    
    for (const [slotName, slot] of Object.entries(template.slots)) {
      selectedIngredients[slotName] = [];
      
      // Filtrar opções removendo ingredientes excluídos
      const availableOptions = filterExcludedIngredients(slot.options, excludedIngredients);
      
      // Se não sobrou nenhuma opção após filtrar, pular este template
      if (availableOptions.length === 0) {
        console.warn(`[MEAL-GENERATOR] Slot ${slotName} sem opções após filtrar excluídos, pulando template`);
        break;
      }
      
      for (let i = 0; i < slot.quantity; i++) {
        let ingredientId: string;
        
        // ✅ ESTRATÉGIA DE INTEGRAIS: Se é slot de carboidrato, usar seleção por perfil
        const isCarbSlot = slotName.toLowerCase().includes('carb') || 
                          slotName.toLowerCase().includes('grain') ||
                          slotName.toLowerCase().includes('starch');
        
        if (isCarbSlot && profile) {
          // Filtrar apenas carboidratos do slot (ingredientes com carb_category)
          const carbOptions = availableOptions.filter(id => {
            const ing = INGREDIENTS[id];
            return ing && ing.carb_category;
          });
          
          // Se há carboidratos categorizados, usar seleção inteligente
          if (carbOptions.length > 0) {
            ingredientId = selectCarbByProfile(carbOptions, profile);
          } else {
            // Fallback: seleção aleatória normal
            ingredientId = selectRandom(availableOptions);
          }
        } else {
          // Seleção aleatória normal para não-carboidratos
          ingredientId = selectRandom(availableOptions);
        }
        
        let retries = 0;
        const maxRetries = 100;
        
        // Garantir que não há duplicação GLOBAL (não apenas no slot)
        while (globalUsed.has(ingredientId) && retries < maxRetries) {
          if (isCarbSlot && profile) {
            const carbOptions = availableOptions.filter(id => {
              const ing = INGREDIENTS[id];
              return ing && ing.carb_category && !globalUsed.has(id);
            });
            if (carbOptions.length > 0) {
              ingredientId = selectCarbByProfile(carbOptions, profile);
            } else {
              ingredientId = selectRandom(availableOptions.filter(id => !globalUsed.has(id)));
            }
          } else {
            ingredientId = selectRandom(availableOptions);
          }
          retries++;
        }
        
        // Se atingiu limite de retries, logar e continuar (aceitar duplicação)
        if (retries >= maxRetries) {
          console.warn(`[MEAL-GENERATOR] Hit retry limit for slot ${slotName}, accepting duplicate: ${ingredientId}`);
        }
        
        globalUsed.add(ingredientId);
        selectedIngredients[slotName].push(ingredientId);
        allSelectedIds.push(ingredientId);
      }
    }
    
    if (!validateCulturalRules(allSelectedIds, country)) {
      continue;
    }
    
    // Substituir ingredientes por alternativas seguras quando intolerance_filter é passado
    const substitutedIds = allSelectedIds.map(id => substituteIngredientForIntolerance(id, intolerances));
    
    // Atualizar selectedIngredients com os IDs substituídos
    for (const [slotName, ingredientIds] of Object.entries(selectedIngredients)) {
      selectedIngredients[slotName] = ingredientIds.map(id => substituteIngredientForIntolerance(id, intolerances));
    }
    
    // Verificar se combinação foi rejeitada pelo admin (usando IDs substituídos)
    const combinationHash = [...substitutedIds].sort().join("_");
    if (rejectedCombinations.has(combinationHash)) {
      continue;
    }
    
    if (usedCombinations.has(combinationHash)) continue;
    usedCombinations.add(combinationHash);
    
    const composite = applyCompositeRules(substitutedIds);
    
    const components: Component[] = [];
    let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
    const blocked = new Set<string>();
    
    if (composite) {
      let compositeKcal = 0, compositeProt = 0, compositeCarbs = 0, compositeFat = 0, compositeFiber = 0;
      
      for (const ingId of composite.ingredients) {
        const ing = INGREDIENTS[ingId];
        if (!ing) continue;
        const portion = Math.round(ing.portion * portionModifier);
        const factor = portion / 100;
        
        compositeKcal += ing.kcal * factor;
        compositeProt += ing.prot * factor;
        compositeCarbs += ing.carbs * factor;
        compositeFat += ing.fat * factor;
        compositeFiber += ing.fiber * factor;
        
        ing.contains.forEach(a => blocked.add(a));
      }
      
      const compositePortion = composite.ingredients.reduce((sum, id) => sum + Math.round((INGREDIENTS[id]?.portion || 100) * portionModifier), 0);
      components.push({
        type: "composite",
        name: composite.name,
        name_en: composite.name_en,
        portion_grams: compositePortion,
        portion_label: `1 porção de ${composite.name.toLowerCase()} (${compositePortion}g)`,
      });
      
      totalCal += compositeKcal;
      totalProt += compositeProt;
      totalCarbs += compositeCarbs;
      totalFat += compositeFat;
      totalFiber += compositeFiber;
      
      for (const ingId of substitutedIds) {
        if (composite.ingredients.includes(ingId)) continue;
        
        const ing = INGREDIENTS[ingId];
        if (!ing) continue;
        const portion = Math.round(ing.portion * portionModifier);
        const factor = portion / 100;
        
        const compType = getComponentType(ingId);
        
        // Usar formatPortion do Unified Core para porções humanizadas
        const portionDisplay = formatPortion(ingId, portion, 'pt-BR', compType);
        
        // Humanizar nome do ingrediente
        const humanizedName = humanizeIngredientName(ingId, ing.display_name_pt);
        
        components.push({
          type: compType,
          name: normalizeAccents(humanizedName),
          name_en: ing.display_name_en,
          portion_grams: portion,
          portion_label: portionDisplay.label,
          ingredient_key: ingId,
        });
        
        totalCal += ing.kcal * factor;
        totalProt += ing.prot * factor;
        totalCarbs += ing.carbs * factor;
        totalFat += ing.fat * factor;
        totalFiber += ing.fiber * factor;
        
        ing.contains.forEach(a => blocked.add(a));
      }
    } else {
      for (const ingId of substitutedIds) {
        const ing = INGREDIENTS[ingId];
        if (!ing) continue;
        const portion = Math.round(ing.portion * portionModifier);
        const factor = portion / 100;
        
        const compType = getComponentType(ingId);
        
        // Usar formatPortion do Unified Core para porções humanizadas
        const portionDisplay = formatPortion(ingId, portion, 'pt-BR', compType);
        
        // Humanizar nome do ingrediente
        const humanizedName = humanizeIngredientName(ingId, ing.display_name_pt);
        
        components.push({
          type: compType,
          name: normalizeAccents(humanizedName),
          name_en: ing.display_name_en,
          portion_grams: portion,
          portion_label: portionDisplay.label,
          ingredient_key: ingId,
        });
        
        totalCal += ing.kcal * factor;
        totalProt += ing.prot * factor;
        totalCarbs += ing.carbs * factor;
        totalFat += ing.fat * factor;
        totalFiber += ing.fiber * factor;
        
        ing.contains.forEach(a => blocked.add(a));
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ADICIONAR AZEITE AUTOMATICAMENTE QUANDO TEM SALADA
    // Saladas (alface, rúcula, pepino, tomate, etc) precisam de azeite
    // ═══════════════════════════════════════════════════════════════════════
    const SALAD_VEGETABLES = [
      "iceberg_lettuce", "curly_lettuce", "arugula", "watercress",
      "tomato", "cucumber", "green_bell_pepper", "red_bell_pepper", "yellow_bell_pepper"
    ];
    
    const hasSaladVegetable = substitutedIds.some(id => SALAD_VEGETABLES.includes(id));
    
    if (hasSaladVegetable && !blocked.has('lactose')) {
      // Adicionar azeite extra virgem
      const oliveOil = INGREDIENTS['extra_virgin_olive_oil'] || INGREDIENTS['olive_oil'];
      if (oliveOil) {
        const oliveOilId = INGREDIENTS['extra_virgin_olive_oil'] ? 'extra_virgin_olive_oil' : 'olive_oil';
        const portion = 10; // 10ml = 1 colher de sopa
        const factor = portion / 100;
        
        const portionDisplay = formatPortion(oliveOilId, portion, 'pt-BR', 'other');
        
        components.push({
          type: 'other',
          name: 'Azeite extra virgem',
          name_en: 'Extra virgin olive oil',
          portion_grams: portion,
          portion_label: portionDisplay.label || 'colher de sopa de azeite (10ml)',
          ingredient_key: oliveOilId,
        });
        
        totalCal += oliveOil.kcal * factor;
        totalProt += oliveOil.prot * factor;
        totalCarbs += oliveOil.carbs * factor;
        totalFat += oliveOil.fat * factor;
        totalFiber += oliveOil.fiber * factor;
      }
    }
    
    let mealName = template.name_pattern;
    for (const [slotName, ingredientIds] of Object.entries(selectedIngredients)) {
      if (ingredientIds.length === 1) {
        const ing = INGREDIENTS[ingredientIds[0]];
        if (ing) {
          mealName = mealName.replace(`{${slotName}}`, ing.display_name_pt);
        }
      } else if (ingredientIds.length > 1) {
        // Se é slot de vegetais e tem composição, usar nome composto
        if (slotName === "vegetables" && composite) {
          mealName = mealName.replace(`{${slotName}}`, composite.name);
        } else if (slotName === "vegetables") {
          // Simplificar: apenas "Salada" em vez de listar todos
          mealName = mealName.replace(`{${slotName}}`, "Salada");
        } else {
          // Para outros slots, listar normalmente
          const names = ingredientIds
            .map(id => INGREDIENTS[id]?.display_name_pt)
            .filter(Boolean);
          if (names.length > 0) {
            mealName = mealName.replace(`{${slotName}}`, names.join(" e "));
          }
        }
      }
    }
    
    // Remover placeholders não substituídos (refeição incompleta)
    if (mealName.includes("{")) {
      console.warn(`[MEAL-GENERATOR] Skipping meal with unresolved placeholders: ${mealName}`);
      continue;
    }
    
    // Aplicar normalização de acentos ao nome final
    mealName = normalizeAccents(mealName);
    
    const description = `Refeição balanceada típica brasileira para ${mealType.replace("_", " ")}`;
    
    // Determinar confiança: sempre high, exceto se não tem componentes
    const confidence = components.length > 0 ? "high" : "low";
    
    // Calcular densidade baseado em calorias e tipo de refeição
    const density = calculateMealDensity(Math.round(totalCal), mealType);
    
    // ═══════════════════════════════════════════════════════════════════════
    // FASE 4: VALIDAÇÃO E AGRUPAMENTO INTELIGENTE
    // ═══════════════════════════════════════════════════════════════════════
    
    // Aplicar validações e agrupamento
    const validationResult = validateAndFixMeal(
      mealName,
      components,
      Math.round(totalCal),
      mealType
    );
    
    // Se a validação falhou, pular esta refeição
    if (!validationResult.valid) {
      continue;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // FASE 4.1: VALIDAÇÃO DE COMPOSIÇÃO (ingredientes que não podem estar sozinhos)
    // ═══════════════════════════════════════════════════════════════════════
    const compositionIssues: string[] = [];
    const presentTypes = new Set(components.map(c => c.type));
    
    // Lista de ingredientes que NUNCA devem aparecer em refeições principais (almoço/jantar)
    // Estes são temperos/guarnições que não fazem sentido como componente de destaque
    const FORBIDDEN_INGREDIENTS = [
      'pimentao', 'pimentão', 'bell_pepper', 'green_bell_pepper', 'red_bell_pepper', 'yellow_bell_pepper',
      'cebola', 'onion', 'sauteed_onion', 'alho', 'garlic', 'sauteed_garlic',
      'cheiro verde', 'parsley', 'salsinha', 'coentro', 'cilantro',
      'cenoura ralada', 'grated_carrot'
    ];
    
    // REMOVER ingredientes proibidos dos componentes (não apenas validar)
    const filteredComponents = components.filter(comp => {
      const ingredientKey = (comp as any).ingredient_key || '';
      const compNameLower = comp.name.toLowerCase();
      
      const isForbidden = FORBIDDEN_INGREDIENTS.some(inv => 
        compNameLower.includes(inv) || ingredientKey.includes(inv)
      );
      
      if (isForbidden) {
        console.log(`[POOL] Removendo ingrediente proibido: ${comp.name}`);
        return false;
      }
      return true;
    });
    
    // Atualizar components com a lista filtrada
    components.length = 0;
    components.push(...filteredComponents);
    
    // Se após remover ingredientes proibidos, não sobrou nada além de proteína, rejeitar
    // EXCEÇÃO: Lanches e ceia podem ter apenas dairy, fruit ou nuts
    const isSnackOrSupper = ['lanche_manha', 'lanche_tarde', 'morning_snack', 'afternoon_snack', 'supper', 'ceia'].includes(normalizedMealType) || 
                           ['lanche_manha', 'lanche_tarde', 'morning_snack', 'afternoon_snack', 'supper', 'ceia'].includes(mealType);
    
    const hasValidAccompaniment = components.some(c => 
      c.type === 'carb' || c.type === 'vegetable' || c.type === 'legume' || 
      c.type === 'dairy' || c.type === 'fruit' || c.type === 'fat'
    );
    
    // Para almoço/jantar, exigir carb/vegetable/legume
    // Para lanches/ceia, aceitar dairy/fruit/fat também
    if (!isSnackOrSupper && !hasValidAccompaniment && components.length > 0) {
      compositionIssues.push('Refeição sem acompanhamento válido após remoção de ingredientes proibidos');
    }
    
    // Verificar ingredientes que nunca podem estar sozinhos (regra do banco de dados)
    for (const comp of components) {
      const ingredientKey = (comp as any).ingredient_key || '';
      const ingredient = INGREDIENTS[ingredientKey];
      
      if (ingredient?.never_use_alone && components.length <= 2) {
        const mustCombineWith = ingredient.must_combine_with || ['carb', 'vegetable'];
        const hasRequiredCompanion = mustCombineWith.some(reqType => 
          components.some(c => c !== comp && c.type === reqType)
        );
        
        if (!hasRequiredCompanion) {
          compositionIssues.push(`${comp.name} precisa de acompanhamento (${mustCombineWith.join(' ou ')})`);
        }
      }
    }
    
    if (compositionIssues.length > 0) {
      console.log(`[POOL] Composição inválida: ${compositionIssues.join(', ')} - Pulando refeição`);
      continue;
    }
    
    // Usar componentes agrupados se houver auto-fix
    let finalComponents = validationResult.autoFixed && validationResult.fixedComponents
      ? validationResult.fixedComponents.map(c => ({
          type: c.type,
          name: c.name,
          name_en: c.name_en || c.name,
          portion_grams: c.portion_grams || 0,
          portion_label: c.portion_label || `${c.portion_grams || 0}g`,
          ingredient_key: (c as any).ingredient_key || ''
        }))
      : components;
    
    // ═══════════════════════════════════════════════════════════════════════
    // FASE 4.2: RECLASSIFICAR TIPOS BASEADO NO ingredient_key
    // Garante que todos os tipos estejam corretos independente de como foram definidos
    // ═══════════════════════════════════════════════════════════════════════
    finalComponents = finalComponents.map(c => {
      const key = (c as any).ingredient_key || '';
      if (key) {
        const correctType = getComponentType(key);
        if (correctType !== 'other' && c.type !== correctType) {
          console.log(`[POOL] Reclassificando ${c.name}: ${c.type} → ${correctType}`);
          return { ...c, type: correctType };
        }
      }
      return c;
    });
    
    // Expandir nome genérico se necessário
    let finalMealName = expandGenericMealName(mealName, validationResult.fixedComponents || components);
    
    // Validar coerência título-componentes
    const coherenceCheck = validateMealNameCoherence(finalMealName, finalComponents);
    if (!coherenceCheck.valid) {
      console.log(`[POOL] Coerência falhou: ${coherenceCheck.reason} - Regenerando nome`);
      // Regenerar nome baseado nos componentes reais
      const mainComponent = finalComponents.find(c => c.type === 'protein' || c.type === 'dairy' || c.type === 'fruit');
      const secondComponent = finalComponents.find(c => c !== mainComponent && (c.type === 'carb' || c.type === 'legume' || c.type === 'fruit' || c.type === 'topping'));
      const thirdComponent = finalComponents.find(c => c !== mainComponent && c !== secondComponent && c.type === 'vegetable');
      
      if (mainComponent && secondComponent) {
        // Para almoço/jantar, incluir "e Salada" se tiver vegetais
        if (thirdComponent && (normalizedMealType === 'lunch' || normalizedMealType === 'dinner')) {
          finalMealName = `${mainComponent.name} com ${secondComponent.name} e Salada`;
        } else {
          finalMealName = `${mainComponent.name} com ${secondComponent.name}`;
        }
      } else if (mainComponent) {
        finalMealName = mainComponent.name;
      } else {
        // Se não conseguiu regenerar um nome válido, pular esta refeição
        console.log(`[POOL] Não foi possível gerar nome válido - Pulando refeição`);
        continue;
      }
    }
    
    // Aplicar humanização ao nome da refeição
    finalMealName = humanizeMealName(finalMealName, finalComponents.map(c => ({
      name: c.name,
      type: c.type,
      ingredient_key: (c as any).ingredient_key
    })));
    
    // Ordenar componentes: arroz, feijão, proteína, vegetais, frutas, laticínios, gorduras, bebidas
    const sortedComponents = sortComponents(finalComponents);
    
    meals.push({
      name: finalMealName,
      description,
      meal_type: mealType,
      meal_density: density,
      components: sortedComponents,
      total_calories: Math.round(totalCal),
      total_protein: Math.round(totalProt * 10) / 10,
      total_carbs: Math.round(totalCarbs * 10) / 10,
      total_fat: Math.round(totalFat * 10) / 10,
      total_fiber: Math.round(totalFiber * 10) / 10,
      macro_source: "taco_tbca",
      macro_confidence: confidence,
      country_codes: [country],
      blocked_for_intolerances: Array.from(blocked),
      prep_time_minutes: 15,
    });
  }

  // Log informativo sobre geração
  const rejectionRate = attempts > 0 ? ((1 - meals.length / attempts) * 100).toFixed(1) : 0;
  
  if (meals.length < quantity) {
    console.warn(`[MEAL-GENERATOR] Atingiu limite de tentativas. Geradas ${meals.length} de ${quantity} refeições solicitadas.`);
    console.warn(`[MEAL-GENERATOR] Tentativas: ${attempts}/${maxAttempts}`);
    console.warn(`[MEAL-GENERATOR] Taxa de rejeição: ${rejectionRate}%`);
    console.warn(`[MEAL-GENERATOR] Sugestão: Considere relaxar validações ou adicionar mais templates.`);
  } else {
    console.log(`[MEAL-GENERATOR] Sucesso! Geradas ${meals.length} refeições em ${attempts} tentativas (taxa de rejeição: ${rejectionRate}%)`);
  }
  
  console.log(`[MEAL-GENERATOR] Concluído: ${meals.length}/${quantity} em ${attempts} tentativas (${((Date.now() - startTime) / 1000).toFixed(2)}s)`);
  
  return meals;
}

// ═══════════════════════════════════════════════════════════════════════
// UNIFIED MEAL CORE INTEGRATION - WRAPPER FUNCTION
// ═══════════════════════════════════════════════════════════════════════

import { processDirectMeal } from './meal-core-adapters/direct-adapter.ts';
import type { UserContext, UnifiedMeal } from './unified-meal-core/types.ts';

// ═══════════════════════════════════════════════════════════════════════
// generateMealsWithCore - ÚNICA FUNÇÃO PARA GERAÇÃO DE REFEIÇÕES
// 
// CASCATA EM 3 NÍVEIS:
// 1. POOL (meal_combinations) → Se não encontrar...
// 2. TEMPLATES (SMART_TEMPLATES) → Se não encontrar...
// 3. IA (Gemini) → Último recurso
//
// TODAS AS FONTES processam pelo Unified Core para garantir:
// - Formatação consistente (ml para líquidos, g para sólidos)
// - Nomes padronizados do INGREDIENTS
// - Validação de coerência e segurança
// - Macros calculados corretamente
// ═══════════════════════════════════════════════════════════════════════

export interface GenerateMealsOptions {
  source?: 'pool' | 'templates' | 'ai' | 'auto';  // 'auto' = cascata completa
  supabaseClient?: any;  // Cliente Supabase para buscar pool
  googleApiKey?: string; // API key para Gemini (nível 3)
  poolMeals?: any[];     // Pool já carregado (evita query repetida)
}

/**
 * ÚNICA FUNÇÃO PARA GERAÇÃO DE REFEIÇÕES
 * 
 * Cascata automática: Pool → Templates → IA
 * TODAS as fontes processam pelo Unified Core
 */
export async function generateMealsWithCore(
  quantity: number,
  mealType: string,
  targetCalories: number,
  country: string,
  userIntolerances: string[],
  userContext: UserContext,
  options: GenerateMealsOptions = {}
): Promise<UnifiedMeal[]> {
  const { source = 'auto', supabaseClient, googleApiKey, poolMeals } = options;
  const startTime = Date.now();
  
  console.log(`[CORE] ══════════════════════════════════════════════════`);
  console.log(`[CORE] Gerando ${quantity} refeições (${mealType}) via Unified Core`);
  console.log(`[CORE] Source: ${source} | País: ${country} | Calorias: ${targetCalories}`);
  console.log(`[CORE] ══════════════════════════════════════════════════`);
  
  const unifiedMeals: UnifiedMeal[] = [];
  let remaining = quantity;
  
  // ═══════════════════════════════════════════════════════════════════════
  // NÍVEL 1: POOL (meal_combinations do banco)
  // ═══════════════════════════════════════════════════════════════════════
  if ((source === 'auto' || source === 'pool') && remaining > 0) {
    console.log(`[CORE] 🔍 NÍVEL 1: Buscando no Pool...`);
    console.log(`[CORE] Pool recebido: ${poolMeals?.length || 0} refeições`);
    
    try {
      let availablePoolMeals = poolMeals || [];
      
      // Se não passou pool, buscar do banco
      if (!poolMeals && supabaseClient) {
        const { data: dbMeals } = await supabaseClient
          .from("meal_combinations")
          .select("*")
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .eq("meal_type", mealType);
        
        availablePoolMeals = dbMeals || [];
      }
      
      // Filtrar por país, intolerâncias e ingredientes excluídos
      const excludedIngredients = userContext.excluded_ingredients || [];
      
      // Log detalhado para diagnóstico
      let filteredByCountry = 0;
      let filteredByIntolerance = 0;
      let filteredByExcluded = 0;
      let filteredByCalories = 0;
      
      const compatibleMeals = availablePoolMeals.filter((meal: any) => {
        // Filtro de país
        if (meal.country_codes) {
          const codes = typeof meal.country_codes === 'string' 
            ? JSON.parse(meal.country_codes) 
            : meal.country_codes;
          if (Array.isArray(codes) && codes.length > 0 && !codes.includes(country)) {
            filteredByCountry++;
            return false;
          }
        }
        
        // Filtro de intolerâncias
        if (meal.blocked_for_intolerances && userIntolerances.length > 0) {
          const hasBlocked = userIntolerances.some(
            (intol: string) => meal.blocked_for_intolerances.includes(intol)
          );
          if (hasBlocked) {
            filteredByIntolerance++;
            return false;
          }
        }
        
        // ✅ FILTRO DE INGREDIENTES EXCLUÍDOS PELO USUÁRIO (com expansão de categorias)
        if (excludedIngredients.length > 0 && meal.components) {
          // Expandir categorias para termos específicos
          const expandedExclusions = expandCategoryTerms(excludedIngredients);
          
          const components = typeof meal.components === 'string' 
            ? JSON.parse(meal.components) 
            : meal.components;
          
          if (Array.isArray(components)) {
            for (const component of components) {
              const componentName = component.name || component.name_pt || '';
              const ingredientKey = component.ingredient_key || '';
              const nameNorm = normalizeForComparison(componentName);
              const keyNorm = normalizeForComparison(ingredientKey.replace(/_/g, ' '));
              
              // Verificar se algum componente está na lista de excluídos expandida
              for (const excluded of expandedExclusions) {
                const excludedNorm = normalizeForComparison(excluded);
                
                if (nameNorm.includes(excludedNorm) || keyNorm.includes(excludedNorm)) {
                  console.log(`[CORE] Pool: Excluindo "${meal.name}" - contém "${componentName}" (excluído: "${excluded}")`);
                  filteredByExcluded++;
                  return false;
                }
              }
            }
          }
        }
        
        // Filtro de calorias (±100% - mais flexível para garantir uso do pool)
        // Exemplo: target 400kcal aceita 200-800kcal
        const minCal = targetCalories * 0.3;  // Mínimo 30% do target
        const maxCal = targetCalories * 2.0;  // Máximo 200% do target
        if (meal.total_calories < minCal || meal.total_calories > maxCal) {
          filteredByCalories++;
          return false;
        }
        
        return true;
      });
      
      console.log(`[CORE] Pool: ${compatibleMeals.length} refeições compatíveis de ${availablePoolMeals.length} disponíveis`);
      console.log(`[CORE] Pool: Filtrados - país: ${filteredByCountry}, intolerância: ${filteredByIntolerance}, excluídos: ${filteredByExcluded}, calorias: ${filteredByCalories}`);
      console.log(`[CORE] Pool: targetCalories=${targetCalories}, range=${targetCalories * 0.5}-${targetCalories * 1.5}`);
      
      // Processar refeições do pool pelo Unified Core
      const shuffled = compatibleMeals.sort(() => Math.random() - 0.5);
      const toProcess = shuffled.slice(0, remaining);
      
      console.log(`[CORE] Pool: Processando ${toProcess.length} refeições do pool`);
      
      for (const poolMeal of toProcess) {
        try {
          console.log(`[CORE] Pool: Tentando processar "${poolMeal.name}" (id: ${poolMeal.id})`);
          const result = await processPoolMealThroughCore(poolMeal, mealType, userContext);
          if (result) {
            unifiedMeals.push(result);
            remaining--;
            console.log(`[CORE] ✅ Pool: ${result.name} (source.type: ${result.source?.type})`);
          } else {
            console.log(`[CORE] ⚠️ Pool: "${poolMeal.name}" retornou null`);
          }
        } catch (e) {
          console.warn(`[CORE] ⚠️ Pool meal failed:`, e);
        }
      }
      
      if (remaining === 0) {
        console.log(`[CORE] ✅ NÍVEL 1 suficiente: ${unifiedMeals.length} refeições do Pool`);
      }
    } catch (error) {
      console.warn(`[CORE] ⚠️ Pool error:`, error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // NÍVEL 2: TEMPLATES (SMART_TEMPLATES) - USA generateMealsForPool
  // MESMA função usada pelo populate-meal-pool para garantir refeições IDÊNTICAS
  // ═══════════════════════════════════════════════════════════════════════
  if ((source === 'auto' || source === 'templates') && remaining > 0) {
    console.log(`[CORE] 🔧 NÍVEL 2: Gerando via SMART_TEMPLATES... (faltam ${remaining})`);
    
    try {
      // Usar generateMealsForPool - MESMA função do populate-meal-pool
      // ✅ Passar profile com excluded_ingredients para filtrar ingredientes
      const profileForGenerator: UserProfile = {
        goal: userContext.goal as any,
        excluded_ingredients: userContext.excluded_ingredients || [],
      };
      
      const templateMeals = generateMealsForPool(
        mealType,
        remaining,
        country,
        userIntolerances,
        new Set(), // rejectedCombinations
        profileForGenerator
      );
      
      console.log(`[CORE] Templates: ${templateMeals.length} refeições geradas via SMART_TEMPLATES`);
      
      // Processar pelo Unified Core para manter compatibilidade
      for (const meal of templateMeals) {
        try {
          const directMeal = {
            name: meal.name,
            components: meal.components.map(c => ({
              type: c.type,
              name: c.name,
              name_en: c.name_en,
              portion_grams: c.portion_grams,
              ingredient_key: c.ingredient_key,
            })),
            total_calories: meal.total_calories,
          };
          
          const result = await processDirectMeal(
            directMeal,
            mealType as any,
            userContext,
            'smart_template'
          );
          
          if (result.success && result.meal) {
            unifiedMeals.push(result.meal);
            remaining--;
            console.log(`[CORE] ✅ Template: ${result.meal.name}`);
          } else if (result.fallback_used && result.meal) {
            unifiedMeals.push(result.meal);
            remaining--;
            console.log(`[CORE] 🔄 Template (fallback): ${result.meal.name}`);
          }
        } catch (e) {
          console.warn(`[CORE] ⚠️ Template meal failed:`, e);
        }
      }
      
      if (remaining === 0) {
        console.log(`[CORE] ✅ NÍVEL 2 suficiente: ${unifiedMeals.length} refeições`);
      }
    } catch (error) {
      console.warn(`[CORE] ⚠️ Templates error:`, error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // NÍVEL 3: IA (Gemini) - ÚLTIMO RECURSO
  // ═══════════════════════════════════════════════════════════════════════
  if ((source === 'auto' || source === 'ai') && remaining > 0 && googleApiKey) {
    console.log(`[CORE] 🤖 NÍVEL 3: Gerando via IA... (faltam ${remaining})`);
    
    try {
      // Importar adapter de IA
      const { processAIMeal } = await import('./meal-core-adapters/ai-adapter.ts');
      
      // Gerar via Gemini (simplificado - apenas ingredientes)
      const aiMeals = await generateMealsViaGemini(
        remaining,
        mealType,
        targetCalories,
        country,
        userIntolerances,
        googleApiKey
      );
      
      console.log(`[CORE] IA: ${aiMeals.length} refeições geradas`);
      
      // Processar pelo Unified Core
      for (const aiMeal of aiMeals) {
        try {
          const result = await processAIMeal(aiMeal, mealType as any, userContext);
          
          if (result.success && result.meal) {
            unifiedMeals.push(result.meal);
            remaining--;
            console.log(`[CORE] ✅ IA: ${result.meal.name}`);
          }
        } catch (e) {
          console.warn(`[CORE] ⚠️ AI meal failed:`, e);
        }
      }
    } catch (error) {
      console.warn(`[CORE] ⚠️ AI error:`, error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // FALLBACK DE EMERGÊNCIA
  // ═══════════════════════════════════════════════════════════════════════
  if (remaining > 0) {
    console.log(`[CORE] 🚨 EMERGÊNCIA: Usando fallback para ${remaining} refeições`);
    
    const { getEmergencyFallback } = await import('./unified-meal-core/fallback-meals.ts');
    
    for (let i = 0; i < remaining; i++) {
      const fallback = getEmergencyFallback(mealType as any, userContext);
      if (fallback) {
        unifiedMeals.push(fallback);
        console.log(`[CORE] 🔄 Fallback: ${fallback.name}`);
      }
    }
  }
  
  const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[CORE] ══════════════════════════════════════════════════`);
  console.log(`[CORE] ✅ Concluído: ${unifiedMeals.length}/${quantity} em ${processingTime}s`);
  console.log(`[CORE] ══════════════════════════════════════════════════`);
  
  return unifiedMeals;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════════

async function processPoolMealThroughCore(
  poolMeal: any,
  mealType: string,
  userContext: UserContext
): Promise<UnifiedMeal | null> {
  const { processPoolMeal } = await import('./meal-core-adapters/pool-adapter.ts');
  
  // Garantir que poolMeal tem meal_type definido
  const mealWithType = { ...poolMeal, meal_type: poolMeal.meal_type || mealType };
  
  // Log para diagnóstico
  console.log(`[POOL-CORE] Processando: ${poolMeal.name}`);
  console.log(`[POOL-CORE] Components: ${JSON.stringify(poolMeal.components?.slice(0, 2) || 'undefined')}`);
  
  const result = await processPoolMeal(mealWithType, userContext);
  
  console.log(`[POOL-CORE] Resultado: success=${result.success}, meal=${result.meal?.name || 'null'}, errors=${result.errors?.length || 0}`);
  if (result.errors && result.errors.length > 0) {
    console.log(`[POOL-CORE] Erros: ${JSON.stringify(result.errors)}`);
  }
  
  if (result.success && result.meal) {
    console.log(`[POOL-CORE] ✅ source.type: ${result.meal.source?.type}`);
    return result.meal;
  }
  
  return null;
}

async function generateMealsViaGemini(
  quantity: number,
  mealType: string,
  targetCalories: number,
  country: string,
  intolerances: string[],
  apiKey: string
): Promise<any[]> {
  // Prompt simplificado - apenas ingredientes e porções
  const prompt = `Gere ${quantity} opções de ${mealType} para ${country}.
Calorias alvo: ${targetCalories}kcal.
${intolerances.length > 0 ? `Evitar: ${intolerances.join(', ')}` : ''}

Responda APENAS em JSON:
{
  "meals": [
    {
      "name": "Nome da refeição",
      "ingredients": [
        {"name": "ingrediente", "grams": 100}
      ]
    }
  ]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extrair JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.meals || [];
  } catch (error) {
    console.error(`[CORE] Gemini error:`, error);
    return [];
  }
}

