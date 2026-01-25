// ============================================
// SANITY CHECK - LIMITES DE CALORIAS POR CATEGORIA
// ============================================
// Garante que valores absurdos da IA sejam rejeitados
// e substituídos por fallbacks seguros por categoria.

export interface SanityCheckResult {
  isValid: boolean;
  originalValue: number;
  correctedValue?: number;
  category: string;
  reason?: string;
}

// Limites máximos de calorias por 100g/100ml
// Baseados em valores nutricionais reais de alimentos
export const CALORIE_LIMITS_PER_100: Record<string, { max: number; fallback: number; unit: string }> = {
  // Bebidas
  'cha': { max: 10, fallback: 2, unit: 'ml' },
  'infusao': { max: 10, fallback: 2, unit: 'ml' },
  'cafe': { max: 15, fallback: 2, unit: 'ml' },
  'agua': { max: 5, fallback: 0, unit: 'ml' },
  'leite_vegetal': { max: 60, fallback: 25, unit: 'ml' },
  'leite': { max: 70, fallback: 50, unit: 'ml' },
  'suco': { max: 60, fallback: 45, unit: 'ml' },
  'refrigerante': { max: 50, fallback: 42, unit: 'ml' },
  'refrigerante_zero': { max: 5, fallback: 0, unit: 'ml' },
  'bebida_alcoolica': { max: 250, fallback: 70, unit: 'ml' },
  
  // Frutas e vegetais
  'fruta': { max: 120, fallback: 50, unit: 'g' },
  'vegetal': { max: 80, fallback: 25, unit: 'g' },
  'folhoso': { max: 30, fallback: 15, unit: 'g' },
  'legume': { max: 100, fallback: 40, unit: 'g' },
  
  // Proteínas
  'carne': { max: 350, fallback: 200, unit: 'g' },
  'frango': { max: 250, fallback: 165, unit: 'g' },
  'peixe': { max: 250, fallback: 120, unit: 'g' },
  'ovo': { max: 180, fallback: 155, unit: 'g' },
  'queijo': { max: 450, fallback: 350, unit: 'g' },
  
  // Carboidratos
  'arroz': { max: 180, fallback: 130, unit: 'g' },
  'pao': { max: 320, fallback: 265, unit: 'g' },
  'massa': { max: 180, fallback: 130, unit: 'g' },
  'cereal': { max: 420, fallback: 350, unit: 'g' },
  'granola': { max: 500, fallback: 420, unit: 'g' },
  
  // Gorduras e oleaginosas
  'oleaginosa': { max: 700, fallback: 600, unit: 'g' },
  'oleo': { max: 900, fallback: 884, unit: 'g' },
  'manteiga': { max: 800, fallback: 717, unit: 'g' },
  
  // Doces e sobremesas
  'doce': { max: 450, fallback: 350, unit: 'g' },
  'gelatina': { max: 80, fallback: 60, unit: 'g' },
  'gelatina_diet': { max: 20, fallback: 10, unit: 'g' },
  'pudim': { max: 200, fallback: 130, unit: 'g' },
  
  // Laticínios
  'iogurte': { max: 150, fallback: 60, unit: 'g' },
  'iogurte_natural': { max: 100, fallback: 55, unit: 'g' },
  'creme': { max: 350, fallback: 200, unit: 'g' },
  
  // Genérico
  'default': { max: 500, fallback: 150, unit: 'g' },
};

// Palavras-chave para detectar categoria do alimento
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cha': ['cha', 'tea', 'te', 'camomila', 'erva-doce', 'hortela', 'mate', 'verde', 'preto', 'infusao'],
  'cafe': ['cafe', 'coffee', 'espresso', 'cappuccino', 'latte'],
  'agua': ['agua', 'water', 'agua de coco'],
  'leite_vegetal': ['leite de coco', 'leite vegetal', 'leite de amendoa', 'leite de aveia', 'leite de arroz', 'leite de soja', 'coconut milk', 'almond milk', 'oat milk', 'plant milk', 'bebida vegetal'],
  'leite': ['leite', 'milk', 'leche'],
  'suco': ['suco', 'juice', 'jugo', 'nectar'],
  'refrigerante_zero': ['zero', 'diet', 'light', 'sem acucar', 'sugar free', 'sin azucar'],
  'refrigerante': ['refrigerante', 'soda', 'cola', 'guarana'],
  'fruta': ['fruta', 'fruit', 'banana', 'maca', 'laranja', 'morango', 'manga', 'abacaxi', 'melancia', 'mamao', 'uva', 'pera', 'kiwi', 'pessego'],
  'folhoso': ['alface', 'rucula', 'agriao', 'espinafre', 'couve', 'lettuce', 'spinach', 'kale'],
  'vegetal': ['legume', 'vegetal', 'vegetable', 'verdura', 'salada', 'tomate', 'pepino', 'cenoura', 'brocolis', 'abobrinha'],
  'legume': ['batata', 'mandioca', 'inhame', 'abobora', 'beterraba', 'potato', 'yam'],
  'carne': ['carne', 'beef', 'boi', 'porco', 'pork', 'cordeiro', 'lamb', 'bife', 'steak', 'picanha', 'alcatra', 'costela'],
  'frango': ['frango', 'chicken', 'pollo', 'peru', 'turkey', 'ave'],
  'peixe': ['peixe', 'fish', 'pescado', 'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau', 'camarao', 'shrimp'],
  'ovo': ['ovo', 'egg', 'huevo', 'clara', 'gema', 'omelete', 'omelette'],
  'queijo': ['queijo', 'cheese', 'queso', 'mussarela', 'parmesao', 'cottage', 'ricota'],
  'arroz': ['arroz', 'rice'],
  'pao': ['pao', 'bread', 'pan', 'torrada', 'toast', 'bisnaga', 'baguete'],
  'massa': ['massa', 'pasta', 'macarrao', 'espaguete', 'lasanha', 'noodle'],
  'cereal': ['cereal', 'aveia', 'oat', 'granola', 'muesli', 'flocos'],
  'oleaginosa': ['castanha', 'amendoa', 'nozes', 'nut', 'pistache', 'amendoim', 'peanut'],
  'oleo': ['oleo', 'oil', 'azeite', 'olive'],
  'manteiga': ['manteiga', 'butter', 'margarina'],
  'gelatina_diet': ['gelatina diet', 'gelatina zero', 'gelatina light', 'gelatina sem acucar'],
  'gelatina': ['gelatina', 'gelatin', 'jelly'],
  'doce': ['doce', 'sweet', 'chocolate', 'bolo', 'cake', 'brigadeiro', 'pudim', 'sobremesa', 'dessert'],
  'iogurte': ['iogurte', 'yogurt', 'yogur', 'coalhada'],
  'creme': ['creme', 'cream', 'nata', 'chantilly'],
};

/**
 * Normaliza texto para comparação (remove acentos, lowercase)
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Detecta a categoria do alimento baseado no nome
 */
export function detectFoodCategory(foodName: string): string {
  const normalized = normalizeForComparison(foodName);
  
  // Ordem importa: categorias mais específicas primeiro
  const categoryOrder = [
    'refrigerante_zero', 'gelatina_diet', 'leite_vegetal',
    'cha', 'cafe', 'agua', 'suco', 'refrigerante', 'leite',
    'folhoso', 'fruta', 'vegetal', 'legume',
    'frango', 'peixe', 'ovo', 'queijo', 'carne',
    'arroz', 'pao', 'massa', 'cereal',
    'oleaginosa', 'oleo', 'manteiga',
    'gelatina', 'iogurte', 'creme', 'doce',
  ];
  
  for (const category of categoryOrder) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords) {
      for (const keyword of keywords) {
        const normalizedKeyword = normalizeForComparison(keyword);
        if (normalized.includes(normalizedKeyword)) {
          return category;
        }
      }
    }
  }
  
  return 'default';
}

/**
 * Verifica se o valor de calorias está dentro do limite aceitável
 */
export function validateCaloriesPerUnit(
  foodName: string,
  caloriesPer100: number
): SanityCheckResult {
  const category = detectFoodCategory(foodName);
  const limits = CALORIE_LIMITS_PER_100[category] || CALORIE_LIMITS_PER_100['default'];
  
  if (caloriesPer100 <= limits.max) {
    return {
      isValid: true,
      originalValue: caloriesPer100,
      category,
    };
  }
  
  // Valor excede o limite - usar fallback
  return {
    isValid: false,
    originalValue: caloriesPer100,
    correctedValue: limits.fallback,
    category,
    reason: `Valor ${caloriesPer100} kcal/100${limits.unit} excede limite de ${limits.max} para categoria '${category}'. Corrigido para ${limits.fallback}.`,
  };
}

/**
 * Aplica sanity check e retorna valor corrigido se necessário
 */
export function applySanityCheck(
  foodName: string,
  estimatedCalories: number,
  grams: number
): { calories: number; wasAdjusted: boolean; reason?: string } {
  // Calcular calorias por 100g/ml
  const caloriesPer100 = (estimatedCalories / grams) * 100;
  
  const result = validateCaloriesPerUnit(foodName, caloriesPer100);
  
  if (result.isValid) {
    return { calories: estimatedCalories, wasAdjusted: false };
  }
  
  // Recalcular com valor corrigido
  const correctedCalories = Math.round((result.correctedValue! / 100) * grams);
  
  console.log(`[SANITY-CHECK] ${result.reason}`);
  
  return {
    calories: correctedCalories,
    wasAdjusted: true,
    reason: result.reason,
  };
}

/**
 * Retorna o fallback de calorias para uma categoria
 */
export function getCategoryFallback(foodName: string, grams: number): number {
  const category = detectFoodCategory(foodName);
  const limits = CALORIE_LIMITS_PER_100[category] || CALORIE_LIMITS_PER_100['default'];
  return Math.round((limits.fallback / 100) * grams);
}

