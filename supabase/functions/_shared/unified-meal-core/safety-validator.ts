/**
 * SAFETY VALIDATOR
 * 
 * Validação de segurança usando globalSafetyEngine
 * Garante que ingredientes não contenham alergenos do usuário
 * SUBSTITUI ingredientes proibidos por alternativas seguras quando possível
 */

import { UnifiedComponent, UserContext } from './types.ts';
import { loadSafetyDatabase, validateIngredient, type SafetyDatabase } from '../globalSafetyEngine.ts';
import { INGREDIENTS } from '../meal-ingredients-db.ts';

// ============= MAPEAMENTO DE SUBSTITUIÇÕES =============
// ingrediente_base -> { intolerância -> ingrediente_alternativo }
const INGREDIENT_SUBSTITUTIONS: Record<string, Record<string, string>> = {
  // LACTOSE - Leites -> Leite sem lactose
  whole_milk: { lactose: 'lactose_free_milk' },
  skim_milk: { lactose: 'lactose_free_milk' },
  semi_skimmed_milk: { lactose: 'lactose_free_milk' },
  coffee_with_milk: { lactose: 'lactose_free_coffee_with_milk' },

  // LACTOSE - Queijos -> Queijo sem lactose
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
 * Busca um substituto seguro para um ingrediente proibido
 */
function findSubstitute(
  ingredientKey: string,
  intolerances: string[]
): { id: string; name_pt: string; name_en: string } | null {
  const substitutions = INGREDIENT_SUBSTITUTIONS[ingredientKey];
  if (!substitutions) return null;

  for (const intolerance of intolerances) {
    const substituteKey = substitutions[intolerance];
    if (substituteKey && INGREDIENTS[substituteKey]) {
      const substitute = INGREDIENTS[substituteKey];
      return {
        id: substituteKey,
        name_pt: substitute.display_name_pt,
        name_en: substitute.display_name_en,
      };
    }
  }

  return null;
}

// ============= RESULTADO DA VALIDAÇÃO =============
export interface SafetyResult {
  isSafe: boolean;
  blockedComponents: string[];
  substitutedComponents: { original: string; substitute: string }[];
  reasons: string[];
  warnings: string[];
}

// ============= FUNÇÃO PRINCIPAL =============
export async function validateSafety(
  components: UnifiedComponent[],
  userContext: UserContext,
  safetyDb: SafetyDatabase
): Promise<SafetyResult> {
  const blockedComponents: string[] = [];
  const substitutedComponents: { original: string; substitute: string }[] = [];
  const reasons: string[] = [];
  const warnings: string[] = [];
  
  // Validar cada componente
  for (const component of components) {
    const validation = validateIngredient(
      component.name_pt,
      {
        intolerances: userContext.intolerances,
        dietaryPreference: userContext.dietary_preference,
        excludedIngredients: userContext.excluded_ingredients,
      } as any, // Type assertion needed due to interface mismatch
      safetyDb
    );
    
    // ValidationResult usa isValid, não isSafe
    if (!validation.isValid) {
      // TENTAR SUBSTITUIR antes de bloquear
      const substitute = findSubstitute(component.ingredient_key, userContext.intolerances);
      
      if (substitute) {
        // SUBSTITUIR o componente in-place
        const originalName = component.name_pt;
        component.ingredient_key = substitute.id;
        component.name_pt = substitute.name_pt;
        component.name_en = substitute.name_en;
        
        substitutedComponents.push({
          original: originalName,
          substitute: substitute.name_pt,
        });
        
        warnings.push(`Substituído: ${originalName} → ${substitute.name_pt}`);
        console.log(`[SAFETY] Substituído: ${originalName} → ${substitute.name_pt}`);
      } else {
        // SÓ BLOQUEAR se não houver substituto
        blockedComponents.push(component.ingredient_key);
        const reason = validation.reason || 'Ingrediente bloqueado';
        reasons.push(`${component.name_pt}: ${reason}`);
      }
    }
    
    // Verificar se é caution (warning)
    if (validation.isCaution) {
      warnings.push(`${component.name_pt}: Atenção - ${validation.reason || 'ingrediente de baixa severidade'}`);
    }
  }
  
  return {
    isSafe: blockedComponents.length === 0,
    blockedComponents,
    substitutedComponents,
    reasons,
    warnings,
  };
}
