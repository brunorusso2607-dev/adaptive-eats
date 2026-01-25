/**
 * NUTRITIONAL TABLE INJECTION
 * 
 * Este módulo carrega os principais alimentos do banco de dados e os injeta
 * no prompt da IA para que ela possa calcular macros diretamente, sem
 * necessidade de pós-processamento.
 * 
 * Benefícios:
 * - Velocidade: elimina queries pós-geração
 * - Precisão: dados 100% do banco de dados
 * - Custo: ~$0.0004 extra por geração (insignificante)
 */

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NUTRITION-TABLE] ${step}${detailsStr}`);
};

// Mapeamento de país para fontes prioritárias
const COUNTRY_SOURCE_PRIORITY: Record<string, string[]> = {
  'BR': ['TBCA', 'taco', 'curated'],
  'US': ['usda', 'curated'],
  'FR': ['CIQUAL', 'curated'],
  'UK': ['McCance', 'curated'],
  'MX': ['BAM', 'curated'],
  'ES': ['AESAN Spain', 'curated'],
  'DE': ['BLS Germany', 'curated'],
  'IT': ['CREA', 'curated'],
};

export interface NutritionalFood {
  name: string;
  cal: number;
  prot: number;
  carb: number;
  fat: number;
}

/**
 * Carrega os principais alimentos do banco de dados para um país específico.
 * Retorna ~400 alimentos organizados por categoria.
 */
export async function loadNutritionalTable(
  supabase: any,
  countryCode: string = 'BR'
): Promise<NutritionalFood[]> {
  const prioritySources = COUNTRY_SOURCE_PRIORITY[countryCode] || COUNTRY_SOURCE_PRIORITY['BR'];
  const allFoods: NutritionalFood[] = [];

  // Categorias e limites para garantir diversidade
  const queries = [
    // Proteínas (carnes, peixes, ovos) - 80 itens
    {
      filter: `(category.ilike.%carne%,category.ilike.%pesc%,category.ilike.%ovo%,category.ilike.%fruto%mar%)`,
      limit: 80,
    },
    // Carboidratos e grãos - 60 itens
    {
      filter: `(category.ilike.%cereal%,category.ilike.%legum%,name.ilike.%arroz%,name.ilike.%feijao%,name.ilike.%pao%,name.ilike.%massa%)`,
      limit: 60,
    },
    // Frutas - 60 itens
    {
      filter: `(category.ilike.%fruta%)`,
      limit: 60,
    },
    // Vegetais e legumes - 60 itens
    {
      filter: `(category.ilike.%vegeta%,category.ilike.%legume%)`,
      limit: 60,
    },
    // Laticínios e bebidas - 60 itens
    {
      filter: `(category.ilike.%latic%,category.ilike.%leite%,category.ilike.%bebida%,name.ilike.%iogurte%,name.ilike.%queijo%)`,
      limit: 60,
    },
    // Oleaginosas e gorduras - 30 itens
    {
      filter: `(category.ilike.%gordura%,category.ilike.%oleo%,name.ilike.%castanha%,name.ilike.%amendoim%,name.ilike.%nozes%)`,
      limit: 30,
    },
  ];

  // Buscar alimentos prioritários do país
  const { data: priorityFoods } = await supabase
    .from('foods')
    .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .eq('is_recipe', false)
    .eq('is_verified', true)
    .in('source', prioritySources)
    .order('search_count', { ascending: false, nullsFirst: false })
    .limit(300);

  if (priorityFoods) {
    for (const food of priorityFoods) {
      // Limpar nome para formato compacto
      const cleanName = cleanFoodName(food.name);
      if (cleanName.length <= 35) { // Evitar nomes muito longos
        allFoods.push({
          name: cleanName,
          cal: Math.round(food.calories_per_100g),
          prot: Math.round(food.protein_per_100g * 10) / 10,
          carb: Math.round(food.carbs_per_100g * 10) / 10,
          fat: Math.round(food.fat_per_100g * 10) / 10,
        });
      }
    }
  }

  // Complementar com alimentos globais se necessário
  if (allFoods.length < 300) {
    const { data: globalFoods } = await supabase
      .from('foods')
      .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
      .eq('is_recipe', false)
      .eq('is_verified', true)
      .not('source', 'in', `(${prioritySources.join(',')})`)
      .order('search_count', { ascending: false, nullsFirst: false })
      .limit(150);

    if (globalFoods) {
      for (const food of globalFoods) {
        const cleanName = cleanFoodName(food.name);
        if (cleanName.length <= 35 && !allFoods.find(f => f.name === cleanName)) {
          allFoods.push({
            name: cleanName,
            cal: Math.round(food.calories_per_100g),
            prot: Math.round(food.protein_per_100g * 10) / 10,
            carb: Math.round(food.carbs_per_100g * 10) / 10,
            fat: Math.round(food.fat_per_100g * 10) / 10,
          });
        }
      }
    }
  }

  // Remover duplicatas por nome
  const uniqueFoods = Array.from(new Map(allFoods.map(f => [f.name.toLowerCase(), f])).values());
  
  logStep('Nutritional table loaded', { 
    country: countryCode, 
    totalFoods: uniqueFoods.length,
    sources: prioritySources 
  });

  return uniqueFoods.slice(0, 400); // Limitar a 400 para controle de tokens
}

/**
 * Limpa o nome do alimento para formato compacto
 */
function cleanFoodName(name: string): string {
  return name
    // Remover informações técnicas
    .replace(/,\s*(cru|cozido|assado|frito|grelhado).*$/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/,\s*[A-Z][a-z]+\s+[a-z]+\s*$/g, '') // Remover nomes científicos
    // Simplificar
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formata a tabela nutricional para injeção no prompt.
 * Formato ultra-compacto: nome:cal/prot/carb/fat (valores por 100g)
 */
export function formatNutritionalTableForPrompt(foods: NutritionalFood[]): string {
  // Agrupar por primeira letra para organização
  const lines: string[] = [];
  
  // Formato compacto: nome:cal/prot/carb/fat
  for (const food of foods) {
    lines.push(`${food.name}:${food.cal}/${food.prot}/${food.carb}/${food.fat}`);
  }

  return `
==========================================================
📊 TABELA NUTRICIONAL DE REFERÊNCIA (POR 100g)
==========================================================
Formato: ALIMENTO:CALORIAS/PROTEÍNA/CARBOIDRATO/GORDURA

${lines.join('\n')}

⚠️ REGRA DE USO DA TABELA (CRÍTICO):
1. Use EXATAMENTE os valores desta tabela para calcular macros
2. Para calcular: (valor_por_100g × gramas_usadas) / 100
3. Exemplo: "Frango (Peito)" 120g = (119×120)/100 = 143 kcal
4. Se o alimento não estiver na tabela, use seu conhecimento nutricional
5. O campo "calories_kcal" DEVE refletir a soma calculada dos alimentos

🔢 REGRA DE PRECISÃO NUTRICIONAL (OBRIGATÓRIO):
- Cada item em "foods" representa uma porção específica em gramas
- Calcule as calorias de cada item: (cal_por_100g × grams) / 100
- O "calories_kcal" total da refeição = soma das calorias de todos os itens
- NUNCA invente valores - use a tabela ou seu conhecimento verificado

Exemplo de cálculo para uma refeição:
- Frango (Peito) 150g: (119 × 150) / 100 = 178 kcal
- Arroz branco cozido 120g: (128 × 120) / 100 = 154 kcal
- Brócolis 80g: (34 × 80) / 100 = 27 kcal
- TOTAL: 178 + 154 + 27 = 359 kcal (usar este valor em calories_kcal)
==========================================================
`;
}

/**
 * Função principal: carrega tabela e gera texto para injeção no prompt
 */
export async function getNutritionalTablePrompt(
  supabase: any,
  countryCode: string = 'BR'
): Promise<string> {
  const foods = await loadNutritionalTable(supabase, countryCode);
  return formatNutritionalTableForPrompt(foods);
}

// ============================================
// LOOKUP RÁPIDO NA TABELA EM MEMÓRIA
// ============================================

// Palavras genéricas que NÃO devem ser usadas para match parcial
// Evita falsos positivos como "chá com erva-doce" → "Batata Doce"
const GENERIC_WORDS_TO_IGNORE = [
  'doce', 'salgado', 'salgada', 'cozido', 'cozida', 'frito', 'frita',
  'assado', 'assada', 'grelhado', 'grelhada', 'natural', 'integral',
  'com', 'sem', 'light', 'diet', 'zero', 'tradicional', 'caseiro', 'caseira',
  'grande', 'pequeno', 'pequena', 'medio', 'media', 'especial',
  'simples', 'cremoso', 'cremosa', 'suave', 'forte', 'leve', 'pesado',
  'fresco', 'fresca', 'maduro', 'madura', 'verde', 'preto', 'branco', 'branca',
  'amarelo', 'amarela', 'vermelho', 'vermelha', 'roxo', 'roxa',
];

// Categorias de bebidas para validação de compatibilidade
const BEVERAGE_KEYWORDS = [
  'cha', 'tea', 'te', 'cafe', 'coffee', 'agua', 'water', 
  'suco', 'juice', 'leite', 'milk', 'bebida', 'infusao',
  'camomila', 'hortela', 'mate', 'refrigerante', 'soda', 'hibisco'
];

// Categorias de alimentos sólidos para validação
const SOLID_FOOD_KEYWORDS = [
  'batata', 'arroz', 'feijao', 'carne', 'frango', 'peixe',
  'pao', 'massa', 'ovo', 'queijo', 'legume', 'vegetal', 'fruta'
];

// Termos que indicam cortes de carne (falsos positivos para "chá")
// "chã de dentro" e "chã de fora" são cortes bovinos que normalizam para "cha"
const MEAT_CUT_INDICATORS = [
  'coxao', 'dentro', 'fora', 'boi', 'bovina', 'bovino', 
  'polpa', 'alcatra', 'patinho', 'gordura', 'charque'
];

/**
 * Detecta se o termo é uma bebida
 */
function isBeverageTerm(text: string): boolean {
  const normalized = normalizeForLookup(text);
  return BEVERAGE_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * Detecta se o alimento é um sólido (não bebida)
 * Também detecta cortes de carne que podem fazer falso match com "chá"
 */
function isSolidFood(text: string): boolean {
  const normalized = normalizeForLookup(text);
  
  // Verificar palavras-chave de sólidos
  if (SOLID_FOOD_KEYWORDS.some(kw => normalized.includes(kw))) {
    return true;
  }
  
  // Detectar cortes de carne que contém "chã" (normaliza para "cha")
  // Ex: "coxão mole (chã de dentro)" - isso é carne, não chá!
  if (MEAT_CUT_INDICATORS.some(kw => normalized.includes(kw))) {
    return true;
  }
  
  return false;
}

/**
 * Validação de sanidade: bebidas de baixa caloria não têm proteína alta
 * Chá de camomila tem ~0g proteína, não 30g!
 */
function isNutritionallyCompatible(
  searchTerm: string,
  foodPer100g: { cal: number; prot: number }
): boolean {
  const isBeverageSearch = isBeverageTerm(searchTerm);
  
  // Bebidas simples (chá, café, água) não devem ter mais que 5g proteína/100ml
  if (isBeverageSearch) {
    // Se tem mais de 10g proteína por 100g, definitivamente não é chá/café/água
    if (foodPer100g.prot > 10) {
      return false;
    }
    // Chás e cafés puros têm no máximo ~10 kcal/100ml
    const lowCalBeverages = ['cha', 'cafe', 'agua', 'infusao', 'camomila', 'hortela', 'hibisco', 'mate'];
    const isLowCalBeverage = lowCalBeverages.some(kw => normalizeForLookup(searchTerm).includes(kw));
    if (isLowCalBeverage && foodPer100g.cal > 20) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normaliza texto para comparação (remove acentos, lowercase)
 */
function normalizeForLookup(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai termos de busca do nome do alimento
 */
function extractSearchTerms(name: string): string[] {
  const normalized = normalizeForLookup(name);
  
  // Remover modificadores comuns
  const modifiers = [
    'grelhado', 'grelhada', 'cozido', 'cozida', 'frito', 'frita',
    'assado', 'assada', 'refogado', 'refogada', 'cru', 'crua',
    'picado', 'picada', 'ralado', 'ralada', 'integral', 'light',
    'sem pele', 'com pele', 'temperado', 'temperada', 'natural',
    'medio', 'media', 'pequeno', 'pequena', 'grande',
    'porcao', 'unidade', 'fatia', 'pedaco', 'file', 'fatiado',
  ];
  
  let cleaned = normalized;
  for (const mod of modifiers) {
    cleaned = cleaned.replace(new RegExp(`\\b${mod}\\b`, 'g'), '').trim();
  }
  
  // Remover preposições
  cleaned = cleaned
    .replace(/\b(de|do|da|dos|das|com|sem|e|a|o|um|uma|ao|em)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const terms = [normalized, cleaned];
  
  // Primeira palavra significativa
  const words = cleaned.split(' ').filter(w => w.length >= 3);
  if (words[0]) terms.push(words[0]);
  
  return [...new Set(terms)].filter(t => t.length >= 2);
}

export interface LookupResult {
  found: boolean;
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  matchedName?: string;
  confidence: number;
}

/**
 * Busca um alimento na tabela nutricional em memória.
 * Retorna macros calculados para a gramagem especificada.
 * Inclui validação de categoria E validação nutricional para evitar falsos positivos.
 */
export function lookupFromNutritionalTable(
  table: NutritionalFood[],
  foodName: string,
  grams: number
): LookupResult {
  if (!table || table.length === 0) {
    return { found: false, confidence: 0 };
  }
  
  const searchTerms = extractSearchTerms(foodName);
  const isBeverageSearch = isBeverageTerm(foodName);
  
  // Criar índice normalizado da tabela (cache local)
  const normalizedTable = table.map(f => ({
    ...f,
    normalized: normalizeForLookup(f.name),
  }));
  
  // Helper para validar match
  const isValidMatch = (f: { name: string; normalized: string; cal: number; prot: number }) => {
    // Verificar compatibilidade de categoria
    if (isBeverageSearch && isSolidFood(f.name)) {
      return false;
    }
    // Verificar compatibilidade nutricional
    if (!isNutritionallyCompatible(foodName, { cal: f.cal, prot: f.prot })) {
      return false;
    }
    return true;
  };
  
  // Helper para construir resultado
  const buildResult = (food: typeof normalizedTable[0], confidence: number): LookupResult => {
    const factor = grams / 100;
    return {
      found: true,
      macros: {
        calories: Math.round(food.cal * factor),
        protein: Math.round(food.prot * factor * 10) / 10,
        carbs: Math.round(food.carb * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
      },
      matchedName: food.name,
      confidence,
    };
  };
  
  // FASE 1: Match exato (com validação) - ÚNICA FASE DE MATCH NO DB
  // Match parcial foi REMOVIDO pois causava falsos positivos (chá → carne)
  for (const term of searchTerms) {
    const exactMatch = normalizedTable.find(f => f.normalized === term && isValidMatch(f));
    if (exactMatch) {
      return buildResult(exactMatch, 100);
    }
  }
  
  // FASE 2: REMOVIDA - Match parcial causava falsos positivos
  // A IA já recebe a tabela nutricional injetada no prompt e sabe calcular corretamente
  // Confiar na IA é mais seguro do que fazer match parcial arriscado
  
  // FALLBACK para bebidas de baixa caloria: retornar valor padrão
  const lowCalBeverages = ['cha', 'cafe', 'agua', 'infusao', 'camomila', 'hortela', 'hibisco', 'mate'];
  const normalizedSearch = normalizeForLookup(foodName);
  if (lowCalBeverages.some(kw => normalizedSearch.includes(kw))) {
    const factor = grams / 100;
    // Valor padrão para chás/cafés: 2 kcal/100ml
    return {
      found: true,
      macros: {
        calories: Math.round(2 * factor),
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      matchedName: `${foodName} (fallback)`,
      confidence: 70,
    };
  }
  
  return { found: false, confidence: 0 };
}

/**
 * Batch lookup: busca múltiplos alimentos de uma vez na tabela em memória.
 * Retorna Map com resultados encontrados.
 */
export function batchLookupFromNutritionalTable(
  table: NutritionalFood[],
  foods: Array<{ name: string; grams: number }>
): Map<string, LookupResult> {
  const results = new Map<string, LookupResult>();
  
  for (const food of foods) {
    const result = lookupFromNutritionalTable(table, food.name, food.grams);
    results.set(food.name, result);
  }
  
  return results;
}

