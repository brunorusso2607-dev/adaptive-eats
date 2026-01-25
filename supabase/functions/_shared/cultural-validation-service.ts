// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - CULTURAL VALIDATION SERVICE
// Sistema de validação cultural de refeições por país
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// COMBINAÇÕES PROIBIDAS POR PAÍS
// ═══════════════════════════════════════════════════════════════════════

export const FORBIDDEN_COMBINATIONS: Record<string, string[][]> = {
  // Brasil
  BR: [
    ["macarrao", "salada"],      // Macarrão não vem com salada no Brasil
    ["macarrao", "feijao"],      // Macarrão não vem com feijão
    ["batata", "arroz"],         // Batata e arroz juntos é raro
    ["requeijao", "sushi"],      // Combinação culturalmente estranha
  ],
  
  // Estados Unidos
  US: [
    ["rice", "pasta"],           // Arroz e massa juntos é incomum
    ["beans", "pasta"],          // Feijão com massa não é comum
  ],
  
  // Global (aplicado a todos os países)
  GLOBAL: [
    ["batata", "arroz"],         // Dois carboidratos pesados juntos
  ]
};

// ═══════════════════════════════════════════════════════════════════════
// HORÁRIOS DE REFEIÇÕES POR PAÍS
// ═══════════════════════════════════════════════════════════════════════

export const MEAL_TIME_RANGES: Record<string, Record<string, { start: number; end: number }>> = {
  BR: {
    cafe_manha: { start: 6, end: 10 },
    lanche_manha: { start: 9, end: 11 },
    almoco: { start: 11, end: 15 },
    lanche_tarde: { start: 15, end: 18 },
    jantar: { start: 18, end: 22 },
    ceia: { start: 21, end: 23 }
  },
  US: {
    cafe_manha: { start: 6, end: 10 },
    lanche_manha: { start: 9, end: 11 },
    almoco: { start: 11, end: 14 },
    lanche_tarde: { start: 14, end: 17 },
    jantar: { start: 17, end: 21 },
    ceia: { start: 20, end: 23 }
  }
};

// ═══════════════════════════════════════════════════════════════════════
// PORÇÕES CULTURAIS POR PAÍS
// ═══════════════════════════════════════════════════════════════════════

export const CULTURAL_PORTION_SIZES: Record<string, Record<string, number>> = {
  BR: {
    arroz: 150,          // Brasileiros comem mais arroz
    feijao: 100,         // Feijão é essencial
    carne: 120,          // Porção padrão de carne
    salada: 80,          // Salada como acompanhamento
  },
  US: {
    rice: 100,           // Americanos comem menos arroz
    beans: 50,           // Feijão menos comum
    meat: 150,           // Porções maiores de carne
    salad: 120,          // Salada como prato principal
  }
};

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE COMBINAÇÕES
// ═══════════════════════════════════════════════════════════════════════

export function validateCulturalCombinations(
  ingredientIds: string[],
  countryCode: string
): {
  is_valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Verificar combinações proibidas do país
  const countryForbidden = FORBIDDEN_COMBINATIONS[countryCode] || [];
  const globalForbidden = FORBIDDEN_COMBINATIONS.GLOBAL || [];
  const allForbidden = [...countryForbidden, ...globalForbidden];
  
  for (const [ingredient1, ingredient2] of allForbidden) {
    const hasIngredient1 = ingredientIds.some(id => 
      id.toLowerCase().includes(ingredient1.toLowerCase())
    );
    const hasIngredient2 = ingredientIds.some(id => 
      id.toLowerCase().includes(ingredient2.toLowerCase())
    );
    
    if (hasIngredient1 && hasIngredient2) {
      violations.push(`Forbidden combination: ${ingredient1} + ${ingredient2}`);
    }
  }
  
  return {
    is_valid: violations.length === 0,
    violations
  };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE DENSIDADE POR TIPO DE REFEIÇÃO
// ═══════════════════════════════════════════════════════════════════════

export function validateMealDensity(
  mealType: string,
  density: "light" | "moderate" | "heavy",
  countryCode: string
): {
  is_valid: boolean;
  recommendation?: string;
} {
  // Regras gerais (aplicadas a todos os países)
  const densityRules: Record<string, ("light" | "moderate" | "heavy")[]> = {
    cafe_manha: ["light", "moderate"],
    lanche_manha: ["light"],
    almoco: ["moderate", "heavy"],
    lanche_tarde: ["light"],
    jantar: ["light", "moderate"],
    ceia: ["light"]
  };
  
  const allowedDensities = densityRules[mealType] || ["light", "moderate", "heavy"];
  const is_valid = allowedDensities.includes(density);
  
  if (!is_valid) {
    return {
      is_valid: false,
      recommendation: `For ${mealType}, density should be: ${allowedDensities.join(" or ")}`
    };
  }
  
  return { is_valid: true };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE PROTEÍNA POR TIPO DE REFEIÇÃO
// ═══════════════════════════════════════════════════════════════════════

export function validateProteinForMealType(
  mealType: string,
  ingredientIds: string[]
): {
  is_valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Proteínas pesadas (não devem estar no café da manhã ou ceia)
  const heavyProteins = ["beef", "steak", "pork", "lamb", "bife", "carne"];
  
  // Verificar café da manhã
  if (mealType === "cafe_manha") {
    for (const protein of heavyProteins) {
      const hasHeavyProtein = ingredientIds.some(id => 
        id.toLowerCase().includes(protein.toLowerCase())
      );
      
      if (hasHeavyProtein) {
        violations.push(`Heavy protein (${protein}) not appropriate for breakfast`);
      }
    }
  }
  
  // Verificar ceia
  if (mealType === "ceia") {
    for (const protein of heavyProteins) {
      const hasHeavyProtein = ingredientIds.some(id => 
        id.toLowerCase().includes(protein.toLowerCase())
      );
      
      if (hasHeavyProtein) {
        violations.push(`Heavy protein (${protein}) not appropriate for evening snack`);
      }
    }
    
    // Ceia deve ter apenas laticínios ou frutas
    const hasChicken = ingredientIds.some(id => 
      id.toLowerCase().includes("chicken") || id.toLowerCase().includes("frango")
    );
    
    if (hasChicken) {
      violations.push("Chicken not appropriate for evening snack");
    }
  }
  
  // Verificar almoço/jantar (deve ter proteína)
  if (mealType === "almoco" || mealType === "jantar") {
    const proteins = [
      "chicken", "beef", "pork", "fish", "egg", "tofu",
      "frango", "carne", "peixe", "ovo"
    ];
    
    const hasProtein = ingredientIds.some(id => 
      proteins.some(protein => id.toLowerCase().includes(protein.toLowerCase()))
    );
    
    if (!hasProtein) {
      violations.push("Lunch/dinner should contain protein");
    }
  }
  
  return {
    is_valid: violations.length === 0,
    violations
  };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO COMPLETA
// ═══════════════════════════════════════════════════════════════════════

export function validateMealCulturally(
  mealType: string,
  ingredientIds: string[],
  density: "light" | "moderate" | "heavy",
  countryCode: string
): {
  is_valid: boolean;
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];
  
  // 1. Validar combinações culturais
  const combinationResult = validateCulturalCombinations(ingredientIds, countryCode);
  if (!combinationResult.is_valid) {
    violations.push(...combinationResult.violations);
  }
  
  // 2. Validar densidade
  const densityResult = validateMealDensity(mealType, density, countryCode);
  if (!densityResult.is_valid && densityResult.recommendation) {
    warnings.push(densityResult.recommendation);
  }
  
  // 3. Validar proteína
  const proteinResult = validateProteinForMealType(mealType, ingredientIds);
  if (!proteinResult.is_valid) {
    violations.push(...proteinResult.violations);
  }
  
  return {
    is_valid: violations.length === 0,
    violations,
    warnings
  };
}

