// ============= TABELA CALÓRICA COMPARTILHADA =============
// Esta tabela é usada por TODOS os módulos do app para garantir consistência
// Adicione novos alimentos AQUI e eles estarão disponíveis em todo o sistema

export const CALORIE_TABLE: Record<string, number> = {
  // ================== PROTEÍNAS ==================
  'ovo': 155,
  'ovos': 155,
  'ovo mexido': 155,
  'ovos mexidos': 155,
  'ovo cozido': 155,
  'ovo frito': 200,
  'omelete': 180,
  'omelete simples': 180,
  'frango': 165,
  'frango grelhado': 165,
  'peito de frango': 165,
  'peito de frango grelhado': 165,
  'frango desfiado': 165,
  'frango assado': 180,
  'coxa de frango': 190,
  'sobrecoxa': 200,
  'carne': 180,
  'carne moida': 180,
  'carne bovina': 180,
  'bife': 180,
  'bife grelhado': 180,
  'bife acebolado': 190,
  'carne assada': 180,
  'carne de panela': 170,
  'picanha': 280,
  'costela': 300,
  'alcatra': 180,
  'patinho': 160,
  'coxao mole': 170,
  'carne de porco': 250,
  'lombo': 200,
  'pernil': 230,
  'bacon': 540,
  'linguica': 300,
  'salsicha': 280,
  'peixe': 120,
  'peixe grelhado': 120,
  'tilapia': 120,
  'tilapia grelhada': 120,
  'salmao': 200,
  'salmao grelhado': 200,
  'atum': 130,
  'atum em lata': 130,
  'sardinha': 180,
  'bacalhau': 140,
  'camarao': 100,
  'presunto': 150,
  'peito de peru': 100,
  'mortadela': 280,
  'salame': 400,
  'tofu': 80,
  'tofu firme': 85,
  'tempeh': 190,
  'seitan': 120,
  'queijo': 350,
  'queijo mussarela': 320,
  'mussarela': 320,
  'queijo branco': 250,
  'queijo minas': 250,
  'queijo cottage': 100,
  'ricota': 140,
  'requeijao': 250,
  'queijo prato': 360,
  'queijo parmesao': 430,
  'parmesao': 430,
  'gorgonzola': 350,
  
  // ================== CARBOIDRATOS ==================
  'arroz': 130,
  'arroz branco': 130,
  'arroz cozido': 130,
  'arroz integral': 120,
  'arroz integral cozido': 120,
  'arroz parboilizado': 125,
  'feijao': 95,
  'feijao preto': 95,
  'feijao carioca': 95,
  'feijao cozido': 95,
  'feijoada': 150,
  'lentilha': 115,
  'lentilha cozida': 115,
  'grao de bico': 160,
  'ervilha': 80,
  'macarrao': 130,
  'macarrao cozido': 130,
  'espaguete': 130,
  'espaguete cozido': 130,
  'penne': 130,
  'lasanha': 180,
  'nhoque': 140,
  'macarrao instantaneo': 450,
  'miojo': 450,
  'pao': 280,
  'pao frances': 280,
  'pao de forma': 265,
  'pao integral': 250,
  'pao de forma integral': 250,
  'pao de queijo': 350,
  'pao de milho': 260,
  'pao sirio': 280,
  'torrada': 380,
  'torrada integral': 360,
  'tapioca': 130,
  'tapioca com recheio': 180,
  'tapioca com queijo': 200,
  'tapioca com manteiga': 180,
  'crepioca': 160,
  'crepioca com queijo': 200,
  'cuscuz': 110,
  'cuscuz de milho': 110,
  'cuscuz nordestino': 110,
  'cuscuz marroquino': 180,
  'batata': 85,
  'batata cozida': 85,
  'batata inglesa': 85,
  'batata doce': 90,
  'batata doce cozida': 90,
  'batata frita': 320,
  'pure de batata': 100,
  'pure': 100,
  'pure de batata com frango': 130,
  'mandioca': 125,
  'mandioca cozida': 125,
  'aipim': 125,
  'macaxeira': 125,
  'mandioca frita': 280,
  'milho': 100,
  'milho cozido': 100,
  'milho verde': 100,
  'pipoca': 380,
  'aveia': 370,
  'aveia em flocos': 370,
  'aveia com banana': 120,
  'aveia com leite': 100,
  'mingau de aveia': 80,
  'granola': 450,
  'cereal': 380,
  'cereal matinal': 380,
  'farinha de trigo': 360,
  'farinha de mandioca': 360,
  'farofa': 400,
  'farofa pronta': 400,
  'polenta': 70,
  'quinoa': 120,
  'quinoa cozida': 120,
  
  // ================== FRUTAS ==================
  'banana': 90,
  'banana nanica': 90,
  'banana prata': 95,
  'maca': 55,
  'maca verde': 55,
  'maca vermelha': 55,
  'laranja': 45,
  'mamao': 40,
  'mamao papaya': 40,
  'mamao formosa': 45,
  'manga': 60,
  'manga palmer': 65,
  'manga tommy': 60,
  'abacaxi': 50,
  'melancia': 30,
  'melao': 35,
  'morango': 32,
  'morangos': 32,
  'uva': 70,
  'uvas': 70,
  'abacate': 160,
  'acai': 60,
  'acai puro': 60,
  'acai com banana': 120,
  'kiwi': 60,
  'pera': 55,
  'pessego': 40,
  'ameixa': 45,
  'cereja': 50,
  'goiaba': 55,
  'maracuja': 70,
  'coco': 350,
  'coco ralado': 380,
  'limao': 30,
  'tangerina': 45,
  'mexerica': 45,
  'jabuticaba': 45,
  'caju': 45,
  'pitaya': 50,
  'framboesa': 35,
  'mirtilo': 55,
  'blueberry': 55,
  'acerola': 30,
  'graviola': 60,
  'salada de frutas': 50,
  
  // ================== LATICÍNIOS E ALTERNATIVAS ==================
  'leite': 60,
  'leite integral': 65,
  'leite desnatado': 35,
  'leite semi desnatado': 50,
  'leite vegetal': 45,
  'leite de aveia': 45,
  'leite de amendoas': 25,
  'leite de amendoim': 50,
  'leite de coco': 180,
  'leite de soja': 45,
  'leite sem lactose': 60,
  'iogurte': 60,
  'iogurte natural': 60,
  'iogurte grego': 100,
  'iogurte desnatado': 45,
  'iogurte vegetal': 70,
  'iogurte com frutas': 90,
  'coalhada': 60,
  'creme de leite': 300,
  'chantilly': 350,
  'nata': 300,
  'manteiga': 720,
  'manteiga sem sal': 720,
  'margarina': 720,
  
  // ================== VEGETAIS E VERDURAS ==================
  'salada': 15,
  'salada verde': 15,
  'salada mista': 25,
  'alface': 15,
  'alface americana': 15,
  'alface crespa': 15,
  'tomate': 20,
  'tomate cereja': 20,
  'pepino': 15,
  'cenoura': 40,
  'cenoura crua': 40,
  'cenoura cozida': 35,
  'beterraba': 45,
  'beterraba cozida': 45,
  'brocolis': 35,
  'brocolis cozido': 35,
  'couve': 30,
  'couve refogada': 60,
  'couve flor': 25,
  'couve flor cozida': 25,
  'repolho': 25,
  'repolho roxo': 25,
  'abobrinha': 20,
  'abobrinha refogada': 35,
  'chuchu': 20,
  'chuchu cozido': 20,
  'berinjela': 25,
  'berinjela grelhada': 30,
  'espinafre': 25,
  'espinafre refogado': 45,
  'rucula': 25,
  'agriao': 20,
  'acelga': 20,
  'legumes': 30,
  'legumes cozidos': 40,
  'legumes refogados': 50,
  'legumes grelhados': 45,
  'verduras': 20,
  'verduras refogadas': 40,
  'pimentao': 25,
  'pimentao vermelho': 30,
  'pimentao amarelo': 30,
  'cebola': 40,
  'cebola roxa': 40,
  'alho': 130,
  'vagem': 35,
  'vagem cozida': 35,
  'quiabo': 30,
  'jiló': 30,
  'palmito': 25,
  'aspargo': 20,
  'cogumelo': 25,
  'champignon': 25,
  'shimeji': 30,
  'shiitake': 35,
  'abobora': 35,
  'abobora cozida': 35,
  'moranga': 40,
  'maxixe': 15,
  'inhame': 100,
  'inhame cozido': 100,
  'cara': 100,
  
  // ================== GORDURAS E OLEAGINOSAS ==================
  'azeite': 900,
  'azeite de oliva': 900,
  'oleo': 900,
  'oleo de coco': 900,
  'castanha': 600,
  'castanhas': 600,
  'castanha de caju': 570,
  'castanha do para': 650,
  'nozes': 650,
  'amendoas': 580,
  'amendoim': 570,
  'amendoim torrado': 580,
  'pasta de amendoim': 590,
  'creme de amendoim': 590,
  'macadamia': 720,
  'pistache': 560,
  'avela': 630,
  'semente de girassol': 580,
  'semente de abobora': 540,
  'chia': 490,
  'semente de chia': 490,
  'linhaca': 530,
  'gergelim': 570,
  'tahine': 590,
  
  // ================== BEBIDAS ==================
  'cafe': 2,
  'cafe puro': 2,
  'cafe expresso': 2,
  'cafe com leite': 35,
  'cafe com leite vegetal': 25,
  'cappuccino': 60,
  'suco': 45,
  'suco de laranja': 45,
  'suco natural': 45,
  'suco de uva': 60,
  'suco de maca': 45,
  'suco de abacaxi': 50,
  'suco verde': 35,
  'vitamina': 80,
  'vitamina de banana': 90,
  'smoothie': 70,
  'cha': 1,
  'cha verde': 1,
  'cha de camomila': 1,
  'agua': 0,
  'agua com gas': 0,
  'agua de coco': 20,
  'refrigerante': 40,
  'refrigerante zero': 0,
  'cerveja': 45,
  'vinho': 85,
  'vinho tinto': 85,
  'vinho branco': 80,
  'whisky': 250,
  'vodka': 230,
  
  // ================== DOCES E SOBREMESAS ==================
  'mel': 320,
  'acucar': 400,
  'acucar mascavo': 380,
  'chocolate': 550,
  'chocolate ao leite': 550,
  'chocolate amargo': 500,
  'chocolate meio amargo': 520,
  'brigadeiro': 380,
  'beijinho': 350,
  'bolo': 350,
  'bolo de chocolate': 370,
  'bolo de cenoura': 320,
  'torta': 300,
  'pudim': 250,
  'mousse': 280,
  'mousse de chocolate': 300,
  'sorvete': 200,
  'sorvete de chocolate': 220,
  'picolé': 100,
  'gelatina': 60,
  'geleia': 250,
  'doce de leite': 310,
  'paçoca': 480,
  'cocada': 400,
  'rapadura': 350,
  'biscoito': 450,
  'biscoito recheado': 480,
  'biscoito integral': 420,
  'bolacha': 450,
  'cookie': 490,
  'brownie': 400,
  'croissant': 410,
  
  // ================== PRATOS PRONTOS ==================
  'sopa': 50,
  'sopa de legumes': 40,
  'sopa de feijao': 80,
  'canja': 70,
  'caldo': 30,
  'caldo verde': 60,
  'moqueca': 150,
  'bobó': 180,
  'vatapá': 200,
  'acaraje': 300,
  'strogonoff': 180,
  'strogonoff de frango': 160,
  'strogonoff de carne': 190,
  'escondidinho': 150,
  'virado a paulista': 180,
  'baião de dois': 160,
  'galinhada': 140,
  'risoto': 150,
  'risoto de camarão': 160,
  'yakisoba': 140,
  'sushi': 150,
  'sashimi': 100,
  'temaki': 180,
  'pizza': 270,
  'hamburguer': 280,
  'x-burger': 300,
  'cachorro quente': 260,
  'hot dog': 260,
  'sanduiche': 250,
  'sanduiche natural': 180,
  'wrap': 200,
  'burrito': 220,
  'taco': 200,
  'pastel': 350,
  'coxinha': 280,
  'esfiha': 250,
  'empada': 350,
  'kibe': 250,
  'bolinho de bacalhau': 280,
  'acarajé': 300,
};

// ============= FUNÇÕES UTILITÁRIAS =============

/**
 * Normaliza texto para busca na tabela (remove acentos, lowercase, trim)
 */
export function normalizeForCalorieTable(foodName: string): string {
  return foodName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca calorias por grama de um alimento
 * Retorna null se não encontrar na tabela
 */
// Palavras genéricas que causam falsos positivos
const GENERIC_WORDS_CALORIE = new Set([
  'doce', 'erva', 'verde', 'natural', 'integral', 'light', 'zero',
  'com', 'sem', 'de', 'em', 'ao', 'a', 'e', 'ou', 'para',
  'uma', 'um', 'xicara', 'copo', 'colher', 'fatia', 'pedaco',
  'pequeno', 'medio', 'grande', 'porcao', 'unidade',
]);

// Categorias de alimentos para validação cruzada
const BEVERAGE_KEYWORDS = ['cha', 'cafe', 'suco', 'agua', 'leite', 'vitamina', 'smoothie', 'infusao', 'refrigerante', 'vinho', 'cerveja'];
const SOLID_FOOD_KEYWORDS = ['batata', 'arroz', 'feijao', 'carne', 'frango', 'peixe', 'ovo', 'pao', 'bolo', 'queijo', 'salada'];

function isBeverageSearchCalorie(normalized: string): boolean {
  return BEVERAGE_KEYWORDS.some(b => normalized.includes(b));
}

function isSolidFoodKeyCalorie(key: string): boolean {
  return SOLID_FOOD_KEYWORDS.some(s => key.includes(s));
}

export function findCaloriesPerGram(foodName: string): number | null {
  const normalized = normalizeForCalorieTable(foodName);
  
  // Busca exata primeiro
  if (CALORIE_TABLE[normalized] !== undefined) {
    return CALORIE_TABLE[normalized] / 100;
  }
  
  const isBeverageSearch = isBeverageSearchCalorie(normalized);
  
  // Busca parcial com validação de categoria
  for (const [key, kcalPer100g] of Object.entries(CALORIE_TABLE)) {
    const matches = normalized.includes(key) || key.includes(normalized);
    if (matches) {
      // PROTEÇÃO: Se busca é bebida, não pode retornar sólido
      if (isBeverageSearch && isSolidFoodKeyCalorie(key)) {
        continue; // Pular este match
      }
      return kcalPer100g / 100;
    }
  }
  
  // Busca por palavras-chave individuais (MAIS RESTRITIVA)
  const words = normalized.split(/\s+/).filter(w => 
    w.length >= 3 && !GENERIC_WORDS_CALORIE.has(w)
  );
  
  for (const word of words) {
    if (CALORIE_TABLE[word] !== undefined) {
      // PROTEÇÃO: Validar categoria
      if (isBeverageSearch && isSolidFoodKeyCalorie(word)) {
        continue;
      }
      return CALORIE_TABLE[word] / 100;
    }
    
    // Buscar chaves que contenham a palavra (com validação)
    for (const [key, kcalPer100g] of Object.entries(CALORIE_TABLE)) {
      if (key.includes(word)) {
        // PROTEÇÃO: Validar categoria
        if (isBeverageSearch && isSolidFoodKeyCalorie(key)) {
          continue;
        }
        return kcalPer100g / 100;
      }
    }
  }
  
  return null;
}

/**
 * Detecta se um alimento é uma bebida/líquido de baixa caloria
 */
function isLowCalorieBeverage(foodName: string): boolean {
  const normalized = normalizeForCalorieTable(foodName);
  const lowCalorieBeverages = [
    'cha', 'cafe', 'agua', 'infusao', 'tisana',
    'tea', 'coffee', 'water', 'te', 'tisane',
  ];
  return lowCalorieBeverages.some(b => normalized.includes(b));
}

/**
 * Calcula calorias de um alimento baseado no nome e gramagem
 * Retorna o valor calculado e a fonte (tabela ou estimativa)
 */
export function calculateFoodCalories(
  foodName: string, 
  grams: number
): { calories: number; source: 'table' | 'estimate'; kcalPer100g: number | null } {
  const kcalPerGram = findCaloriesPerGram(foodName);
  
  if (kcalPerGram !== null) {
    return {
      calories: Math.round(grams * kcalPerGram),
      source: 'table',
      kcalPer100g: kcalPerGram * 100,
    };
  }
  
  // Fallback: usar valores por categoria
  // Para bebidas de baixa caloria, usar 0-2 kcal/100ml
  if (isLowCalorieBeverage(foodName)) {
    return {
      calories: Math.round(grams * 0.01), // ~1 kcal por 100ml
      source: 'estimate',
      kcalPer100g: 1,
    };
  }
  
  // Fallback genérico: estima ~1.0 kcal/g (reduzido de 1.5)
  return {
    calories: Math.round(grams * 1.0),
    source: 'estimate',
    kcalPer100g: null,
  };
}

/**
 * Extrai gramagem de uma string de porção (ex: "150g", "1 xícara (200g)")
 * Retorna null se não conseguir extrair
 */
export function extractGramsFromPortion(portionText: string): number | null {
  if (!portionText) return null;
  
  // Padrões comuns de gramagem
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*g(?:ramas?)?/i,           // "150g", "150 gramas"
    /(\d+(?:[.,]\d+)?)\s*ml/i,                      // "200ml" (considera igual a gramas para líquidos)
    /\((\d+(?:[.,]\d+)?)\s*g\)/i,                   // "(150g)"
    /aproximadamente\s+(\d+(?:[.,]\d+)?)\s*g/i,    // "aproximadamente 150g"
  ];
  
  for (const pattern of patterns) {
    const match = portionText.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  
  // Estimativas para porções comuns sem gramagem explícita
  const portionEstimates: Record<string, number> = {
    'unidade': 100,
    'fatia': 30,
    'colher de sopa': 15,
    'colher de cha': 5,
    'xicara': 200,
    'copo': 250,
    'prato': 300,
    'porcao': 150,
    'pedaco': 80,
  };
  
  const lowerPortion = portionText.toLowerCase();
  for (const [term, grams] of Object.entries(portionEstimates)) {
    if (lowerPortion.includes(term)) {
      // Tenta extrair quantidade (ex: "2 fatias" = 60g)
      const qtyMatch = lowerPortion.match(/(\d+)\s*(unidade|fatia|colher|xicara|copo|prato|porcao|pedaco)/i);
      if (qtyMatch) {
        return parseInt(qtyMatch[1]) * grams;
      }
      return grams;
    }
  }
  
  return null;
}

/**
 * Recalcula calorias de um item alimentar usando a tabela
 * Útil para validar/corrigir valores estimados pela IA
 */
export function recalculateWithTable(
  foodName: string,
  portionText: string,
  aiCalories: number
): { 
  calories: number; 
  source: 'table' | 'estimate' | 'ai_fallback'; 
  grams: number | null;
  note: string;
} {
  const grams = extractGramsFromPortion(portionText);
  
  if (grams === null) {
    return {
      calories: aiCalories,
      source: 'ai_fallback',
      grams: null,
      note: 'Não foi possível extrair gramagem, usando valor da IA',
    };
  }
  
  const result = calculateFoodCalories(foodName, grams);
  
  if (result.source === 'table') {
    return {
      calories: result.calories,
      source: 'table',
      grams,
      note: `Calculado: ${grams}g × ${result.kcalPer100g} kcal/100g`,
    };
  }
  
  // Se não está na tabela, usa valor da IA mas marca como fallback
  return {
    calories: aiCalories,
    source: 'ai_fallback',
    grams,
    note: `Alimento não mapeado na tabela, usando estimativa da IA (${grams}g)`,
  };
}

// ============= FUNÇÕES PARA RECÁLCULO EM LOTE =============

/**
 * Recalcula sugestão de alimento (formato suggest-food-ai)
 * Formato: { name, portion_grams, calories, protein, carbs, fat }
 */
export function recalculateSuggestion(suggestion: {
  name: string;
  portion_grams?: number;
  portion_description?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}): typeof suggestion & { calorie_source: string } {
  const grams = suggestion.portion_grams || extractGramsFromPortion(suggestion.portion_description || '') || 100;
  const kcalPerGram = findCaloriesPerGram(suggestion.name);
  
  if (kcalPerGram !== null) {
    const calculatedCalories = Math.round(grams * kcalPerGram);
    return {
      ...suggestion,
      calories: calculatedCalories,
      calorie_source: 'table',
    };
  }
  
  return {
    ...suggestion,
    calorie_source: 'ai',
  };
}

/**
 * Recalcula valores por 100g (formato search-ingredient, validate-food-ai)
 * Formato: { name, calories_per_100g ou per_100g.calories }
 */
export function recalculatePer100g(
  foodName: string,
  aiCaloriesPer100g: number
): { calories_per_100g: number; calorie_source: string } {
  const normalized = normalizeForCalorieTable(foodName);
  
  // Busca exata primeiro
  if (CALORIE_TABLE[normalized]) {
    return {
      calories_per_100g: CALORIE_TABLE[normalized],
      calorie_source: 'table',
    };
  }
  
  // Busca parcial
  for (const [key, kcalPer100g] of Object.entries(CALORIE_TABLE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        calories_per_100g: kcalPer100g,
        calorie_source: 'table',
      };
    }
  }
  
  return {
    calories_per_100g: aiCaloriesPer100g,
    calorie_source: 'ai',
  };
}

/**
 * Recalcula ingredientes de receita e total (formato generate-recipe, regenerate-meal)
 * Retorna ingredientes atualizados + novo total de calorias
 */
export function recalculateRecipeCalories(
  ingredients: Array<{ item?: string; name?: string; quantity?: string; grams?: number }>,
  aiTotalCalories: number
): { 
  ingredients: typeof ingredients; 
  totalCalories: number; 
  recalculated: boolean;
  sources: { table: number; ai: number };
} {
  let totalFromTable = 0;
  let countFromTable = 0;
  let countFromAi = 0;
  
  const updatedIngredients = ingredients.map(ing => {
    const name = ing.item || ing.name || '';
    const grams = ing.grams || extractGramsFromPortion(ing.quantity || '') || null;
    
    if (!grams || !name) {
      countFromAi++;
      return ing;
    }
    
    const kcalPerGram = findCaloriesPerGram(name);
    if (kcalPerGram !== null) {
      const calories = Math.round(grams * kcalPerGram);
      totalFromTable += calories;
      countFromTable++;
      return { ...ing, calculated_calories: calories };
    }
    
    countFromAi++;
    return ing;
  });
  
  // Se conseguimos calcular pelo menos 50% dos ingredientes, usa o total calculado
  const totalIngredients = countFromTable + countFromAi;
  const recalculated = totalIngredients > 0 && (countFromTable / totalIngredients) >= 0.5;
  
  // Estima proporcional se parcial
  const estimatedTotal = recalculated && countFromAi > 0
    ? Math.round(totalFromTable * (totalIngredients / countFromTable))
    : totalFromTable;
  
  return {
    ingredients: updatedIngredients,
    totalCalories: recalculated ? estimatedTotal : aiTotalCalories,
    recalculated,
    sources: { table: countFromTable, ai: countFromAi },
  };
}

