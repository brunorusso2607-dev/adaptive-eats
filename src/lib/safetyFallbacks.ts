/**
 * Fallbacks centralizados para labels de segurança alimentar.
 * 
 * IMPORTANTE: Estes são apenas fallbacks visuais usados durante o loading inicial.
 * A validação de segurança real acontece no backend via globalSafetyEngine.ts,
 * que sempre busca dados do banco de dados.
 * 
 * O banco de dados é a fonte de verdade. Estes fallbacks existem apenas para:
 * 1. Evitar UI vazia durante carregamento
 * 2. Garantir consistência visual se o DB estiver temporariamente indisponível
 */

// ============================================================================
// INTOLERANCE LABELS
// ============================================================================

/**
 * Labels de fallback para intolerâncias.
 * 
 * SINCRONIZADO com onboarding_options (jan/2026):
 * - Intolerâncias: gluten, lactose, fructose, sorbitol, fodmap
 * - Alergias: egg, nuts, seafood, soy, peanut, fish
 * - Sensibilidades: corn, histamine, caffeine, sulfite, salicylate, nickel
 * 
 * Também inclui mapeamentos legados para compatibilidade.
 */
export const FALLBACK_INTOLERANCE_LABELS: Record<string, string> = {
  // === CHAVES CANÔNICAS DO ONBOARDING (inglês) ===
  // Intolerâncias
  gluten: "Glúten",
  lactose: "Lactose",
  fructose: "Frutose",
  sorbitol: "Sorbitol",
  fodmap: "FODMAP",
  // Alergias
  egg: "Ovos",
  nuts: "Oleaginosas",
  tree_nuts: "Oleaginosas", // alias do banco
  seafood: "Frutos do Mar",
  soy: "Soja",
  peanut: "Amendoim",
  fish: "Peixe",
  // Sensibilidades
  corn: "Milho",
  histamine: "Histamina",
  caffeine: "Cafeína",
  sulfite: "Sulfito",
  salicylate: "Salicilato",
  nickel: "Níquel",
  
  // === ALIASES LEGADOS (português) para compatibilidade ===
  amendoim: "Amendoim",
  castanhas: "Oleaginosas",
  frutos_do_mar: "Frutos do Mar",
  frutos_mar: "Frutos do Mar",
  peixe: "Peixe",
  ovo: "Ovo",
  ovos: "Ovos",
  eggs: "Ovos",
  soja: "Soja",
  acucar: "Açúcar",
  sugar: "Açúcar",
  cafeina: "Cafeína",
  histamina: "Histamina",
  sulfitos: "Sulfitos",
  sulfito: "Sulfito",
  salicilatos: "Salicilatos",
  salicilato: "Salicilato",
  niquel: "Níquel",
  frutose: "Frutose",
  milho: "Milho",
};

// ============================================================================
// DIETARY LABELS
// ============================================================================

export const FALLBACK_DIETARY_LABELS: Record<string, string> = {
  // English canonical keys
  vegan: "Vegana",
  vegetarian: "Vegetariana",
  low_carb: "Low Carb",
  pescatarian: "Pescetariana",
  ketogenic: "Cetogênica",
  flexitarian: "Flexitariana",
  omnivore: "Comum",
  // Legacy Portuguese keys for compatibility
  vegana: "Vegana",
  vegetariana: "Vegetariana",
  pescetariana: "Pescetariana",
  cetogenica: "Cetogênica",
  flexitariana: "Flexitariana",
  comum: "Comum",
};

// Versão com artigo para frases (ex: "não é adequado para vegano(a)")
export const FALLBACK_DIETARY_LABELS_WITH_ARTICLE: Record<string, string> = {
  // English canonical keys
  vegan: "vegano(a)",
  vegetarian: "vegetariano(a)",
  pescatarian: "pescetariano(a)",
  flexitarian: "flexitariano(a)",
  low_carb: "low carb",
  ketogenic: "cetogênico(a)",
  omnivore: "dieta comum",
  // Legacy Portuguese keys for compatibility
  vegana: "vegano(a)",
  vegetariana: "vegetariano(a)",
  pescetariana: "pescetariano(a)",
  flexitariana: "flexitariano(a)",
  cetogenica: "cetogênico(a)",
  comum: "dieta comum",
};

// ============================================================================
// DIETARY PREFERENCES (para selects/dropdowns)
// ============================================================================

export const FALLBACK_DIETARY_PREFERENCES = [
  { value: "omnivore", label: "Comum / Omnívora" },
  { value: "vegetarian", label: "Vegetariana" },
  { value: "vegan", label: "Vegana" },
  { value: "pescatarian", label: "Pescetariana" },
  { value: "flexitarian", label: "Flexitariana" },
  { value: "low_carb", label: "Low Carb" },
  { value: "ketogenic", label: "Cetogênica" },
] as const;

// ============================================================================
// RESTRICTION LABELS (combinado para UI de ingredientes)
// ============================================================================

export const FALLBACK_RESTRICTION_LABELS: Record<string, string> = {
  // Intolerâncias
  ...FALLBACK_INTOLERANCE_LABELS,
  // Dietas
  ...FALLBACK_DIETARY_LABELS,
};

// ============================================================================
// SAFE EXCEPTIONS (ingredientes que parecem proibidos mas são seguros)
// ============================================================================

export const FALLBACK_GLOBAL_SAFE_EXCEPTIONS = [
  "leite de coco",
  "leite de amendoas", 
  "leite de amêndoas",
  "leite de aveia",
  "leite vegetal",
  "creme de leite de coco",
  "manteiga de coco",
  "queijo vegano",
  "iogurte vegano",
  "cream cheese vegano",
  "requeijão vegano",
  "chocolate vegano",
  "maionese vegana",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtém o label de uma intolerância com fallback
 */
export function getIntoleranceLabelFallback(key: string): string {
  if (!key) return '';
  const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
  return FALLBACK_INTOLERANCE_LABELS[normalizedKey] || key;
}

/**
 * Obtém o label de uma preferência dietética com fallback
 */
export function getDietaryLabelFallback(key: string): string {
  if (!key) return '';
  const normalizedKey = key.toLowerCase();
  return FALLBACK_DIETARY_LABELS[normalizedKey] || key;
}

/**
 * Obtém o label de qualquer restrição (intolerância ou dieta) com fallback
 */
export function getRestrictionLabelFallback(
  key: string, 
  type: 'intolerance' | 'dietary' | 'excluded' = 'intolerance'
): string {
  if (!key) return '';
  
  if (type === 'dietary') {
    return getDietaryLabelFallback(key);
  }
  
  if (type === 'excluded') {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  
  return getIntoleranceLabelFallback(key);
}
