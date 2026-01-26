/**
 * CULTURAL RULES - REGRAS CULTURAIS E DE COMPOSIÇÃO
 * 
 * Centraliza todas as regras culturais e de composição de refeições.
 * Movido de meal-templates-smart.ts para o Unified Core.
 * 
 * TODAS as fontes (Pool, Templates, IA) passam por estas regras.
 */

import type { UnifiedComponent, MealType } from './types.ts';

// ═══════════════════════════════════════════════════════════════════════
// REGRAS DE COMPOSIÇÃO (COMPOSITE_RULES)
// Combina ingredientes que naturalmente vão juntos
// ═══════════════════════════════════════════════════════════════════════

export interface CompositeRule {
  triggers: string[];           // ingredient_keys que ativam a regra
  result_name_pt: string;       // Nome em português
  result_name_en: string;       // Nome em inglês
  combined_portion: number;     // Porção combinada em gramas
}

export const COMPOSITE_RULES: CompositeRule[] = [
  // Saladas compostas
  { triggers: ["iceberg_lettuce", "tomato"], result_name_pt: "Salada de alface com tomate", result_name_en: "Lettuce and tomato salad", combined_portion: 130 },
  { triggers: ["curly_lettuce", "tomato"], result_name_pt: "Salada de alface com tomate", result_name_en: "Lettuce and tomato salad", combined_portion: 130 },
  { triggers: ["arugula", "tomato"], result_name_pt: "Salada de rúcula com tomate", result_name_en: "Arugula and tomato salad", combined_portion: 120 },
  { triggers: ["iceberg_lettuce", "cucumber"], result_name_pt: "Salada de alface com pepino", result_name_en: "Lettuce and cucumber salad", combined_portion: 130 },
  { triggers: ["arugula", "cucumber"], result_name_pt: "Salada de rúcula com pepino", result_name_en: "Arugula and cucumber salad", combined_portion: 120 },
  { triggers: ["watercress", "tomato"], result_name_pt: "Salada de agrião com tomate", result_name_en: "Watercress and tomato salad", combined_portion: 120 },
  { triggers: ["iceberg_lettuce", "tomato", "cucumber"], result_name_pt: "Salada mista", result_name_en: "Mixed salad", combined_portion: 150 },
];

// ═══════════════════════════════════════════════════════════════════════
// REGRAS CULTURAIS POR PAÍS
// Define combinações obrigatórias e proibidas
// ═══════════════════════════════════════════════════════════════════════

export interface RequiredCombination {
  if: string;           // Se este ingrediente estiver presente
  then: string;         // Este também deve estar
  probability: number;  // Probabilidade (0-1)
}

export interface CulturalRuleSet {
  required_combinations: RequiredCombination[];
  forbidden_combinations: string[][];  // Pares/grupos que não podem coexistir
}

export const CULTURAL_RULES: Record<string, CulturalRuleSet> = {
  BR: {
    required_combinations: [
      // Arroz + Feijão é padrão brasileiro (90% das vezes)
      { if: "white_rice", then: "beans", probability: 0.9 },
      { if: "brown_rice", then: "beans", probability: 0.9 },
      { if: "parboiled_rice", then: "beans", probability: 0.9 },
    ],
    forbidden_combinations: [
      // Macarrão NUNCA com feijão ou arroz no Brasil
      ["whole_wheat_pasta", "beans"],
      ["whole_wheat_pasta", "white_rice"],
      ["whole_wheat_pasta", "brown_rice"],
      ["pasta", "beans"],
      ["pasta", "white_rice"],
      ["pasta", "brown_rice"],
      // Macarrão NUNCA com salada no Brasil
      ["whole_wheat_pasta", "iceberg_lettuce"],
      ["whole_wheat_pasta", "curly_lettuce"],
      ["whole_wheat_pasta", "arugula"],
      ["pasta", "iceberg_lettuce"],
      ["pasta", "curly_lettuce"],
      ["pasta", "arugula"],
      // Batata e arroz não combinam
      ["boiled_potato", "white_rice"],
      ["boiled_potato", "brown_rice"],
      ["baked_potato", "white_rice"],
      ["baked_potato", "brown_rice"],
      ["boiled_sweet_potato", "white_rice"],
      ["boiled_sweet_potato", "brown_rice"],
    ],
  },
  
  US: {
    required_combinations: [],
    forbidden_combinations: [
      // Arroz e feijão juntos não é comum nos EUA
      ["white_rice", "beans"],
    ],
  },
  
  PT: {
    required_combinations: [
      // Arroz + Feijão também é comum em Portugal
      { if: "white_rice", then: "beans", probability: 0.7 },
    ],
    forbidden_combinations: [],
  },
  
  MX: {
    required_combinations: [
      // Arroz + Feijão é comum no México
      { if: "white_rice", then: "beans", probability: 0.8 },
    ],
    forbidden_combinations: [],
  },
  
  AR: {
    required_combinations: [],
    forbidden_combinations: [
      // Argentina: carne não combina com feijão
      ["grilled_sirloin_steak", "beans"],
      ["grilled_picanha", "beans"],
    ],
  },
};

// Fallback para países sem regras específicas
const DEFAULT_CULTURAL_RULES: CulturalRuleSet = {
  required_combinations: [],
  forbidden_combinations: [],
};

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES DE VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════

/**
 * Valida se uma combinação de ingredientes respeita as regras culturais
 */
export function validateCulturalRules(
  ingredientKeys: string[],
  country: string
): { isValid: boolean; violations: string[] } {
  const rules = CULTURAL_RULES[country] || DEFAULT_CULTURAL_RULES;
  const violations: string[] = [];
  
  // Verificar combinações proibidas
  for (const forbidden of rules.forbidden_combinations) {
    const allPresent = forbidden.every(ing => ingredientKeys.includes(ing));
    if (allPresent) {
      violations.push(`Combinação proibida para ${country}: ${forbidden.join(' + ')}`);
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Aplica regras de composição (combina ingredientes que vão juntos)
 */
export function applyCompositeRules(
  components: UnifiedComponent[]
): { components: UnifiedComponent[]; applied: string[] } {
  const applied: string[] = [];
  const ingredientKeys = components.map(c => c.ingredient_key);
  
  // Verificar cada regra de composição
  for (const rule of COMPOSITE_RULES) {
    const allTriggersPresent = rule.triggers.every(t => ingredientKeys.includes(t));
    
    if (allTriggersPresent) {
      // Encontrar os componentes que serão combinados
      const toMerge = components.filter(c => rule.triggers.includes(c.ingredient_key));
      
      if (toMerge.length >= 2) {
        // Calcular macros combinados
        const combinedMacros = {
          kcal: toMerge.reduce((sum, c) => sum + c.macros.kcal, 0),
          protein: toMerge.reduce((sum, c) => sum + c.macros.protein, 0),
          carbs: toMerge.reduce((sum, c) => sum + c.macros.carbs, 0),
          fat: toMerge.reduce((sum, c) => sum + c.macros.fat, 0),
          fiber: toMerge.reduce((sum, c) => sum + c.macros.fiber, 0),
        };
        
        // Criar componente combinado
        const combinedComponent: UnifiedComponent = {
          ingredient_key: `composite_${rule.triggers.join('_')}`,
          name_pt: rule.result_name_pt,
          name_en: rule.result_name_en,
          type: 'composite',
          category: 'other',
          portion_grams: rule.combined_portion,
          portion_display: {
            quantity: 1,
            unit: 'g',
            label: `${rule.result_name_pt} (${rule.combined_portion}g)`,
          },
          macros: combinedMacros,
          safety: {
            contains: toMerge.flatMap(c => c.safety.contains),
            blocked_for: toMerge.flatMap(c => c.safety.blocked_for),
            is_safe_for_all: toMerge.every(c => c.safety.is_safe_for_all),
          },
        };
        
        // Remover componentes originais e adicionar o combinado
        const filteredComponents = components.filter(c => !rule.triggers.includes(c.ingredient_key));
        filteredComponents.push(combinedComponent);
        
        applied.push(rule.result_name_pt);
        
        // Retornar com a composição aplicada
        return {
          components: filteredComponents,
          applied,
        };
      }
    }
  }
  
  // Nenhuma regra aplicada
  return { components, applied };
}

/**
 * Verifica se uma refeição precisa de ingredientes obrigatórios
 * e retorna sugestões de adição
 */
export function checkRequiredCombinations(
  ingredientKeys: string[],
  country: string
): { missing: string[]; suggestions: string[] } {
  const rules = CULTURAL_RULES[country] || DEFAULT_CULTURAL_RULES;
  const missing: string[] = [];
  const suggestions: string[] = [];
  
  for (const req of rules.required_combinations) {
    if (ingredientKeys.includes(req.if) && !ingredientKeys.includes(req.then)) {
      // Aplicar probabilidade
      if (Math.random() < req.probability) {
        missing.push(req.then);
        suggestions.push(`Adicionar ${req.then} (${country}: ${req.if} geralmente vem com ${req.then})`);
      }
    }
  }
  
  return { missing, suggestions };
}
