// ============= VALIDAÇÃO RIGOROSA DE REFEIÇÕES =============

interface GeneratedMeal {
  name: string;
  description?: string;
  components: Array<{
    type: string;
    name: string;
    name_en?: string;
    portion_grams?: number;
    portion_ml?: number;
    portion_label?: string;
  }>;
  dietary_tags?: string[];
  blocked_for_intolerances: string[];
  flexible_options?: Record<string, string[]>;
  instructions?: string[];
  prep_time_minutes: number;
}

interface MealStructure {
  required: string[];
  optional: string[];
  rules: string;
  max_prep_time: string;
  examples: string[];
  macro_focus: { carb: string; protein: string; fat: string };
  negative_examples?: string[];
  forbidden_components?: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Componentes proibidos por tipo de refeição
export function getProhibitedComponentsForMealType(mealType: string): string[] {
  const prohibitions: Record<string, string[]> = {
    cafe_manha: ["legumes"],           // Feijão não é comum no café
    lanche_manha: ["legumes", "carbs"], // Lanche leve, só fruta
    almoco: [],                         // Aceita tudo
    lanche_tarde: ["legumes"],          // Lanche leve
    jantar: ["legumes"],                // Jantar mais leve que almoço
    ceia: ["carbs", "legumes"],         // Ceia muito leve
  };
  return prohibitions[mealType] || [];
}

// Exemplos negativos (o que NÃO fazer)
export function getNegativeExamplesForMealType(mealType: string): string[] {
  const negatives: Record<string, string[]> = {
    cafe_manha: [
      "❌ Arroz + Feijão + Frango (isso é ALMOÇO)",
      "❌ Bife + Salada (isso é JANTAR)",
      "❌ Macarrão + Carne moída (isso é ALMOÇO)",
      "❌ Sopa de legumes (isso é JANTAR)",
    ],
    almoco: [
      "❌ Pão + Ovo + Café (isso é CAFÉ DA MANHÃ)",
      "❌ Iogurte + Granola (isso é LANCHE)",
      "❌ Frango + Salada sem carboidrato (isso é JANTAR)",
      "❌ Banana + Aveia (isso é CAFÉ DA MANHÃ)",
    ],
    jantar: [
      "❌ Pão + Queijo + Café (isso é CAFÉ DA MANHÃ)",
      "❌ Arroz + Feijão + Frango + Salada (isso é ALMOÇO)",
      "❌ Banana + Iogurte (isso é LANCHE)",
      "❌ Macarrão + Carne moída (isso é ALMOÇO)",
    ],
    ceia: [
      "❌ Pão + Ovo (muito pesado)",
      "❌ Arroz + Feijão (isso é ALMOÇO)",
      "❌ Café (atrapalha sono)",
      "❌ Macarrão (muito pesado)",
    ],
    lanche_manha: [
      "❌ Pão + Ovo (isso é CAFÉ DA MANHÃ)",
      "❌ Arroz + Feijão (isso é ALMOÇO)",
      "❌ Frango + Salada (isso é JANTAR)",
    ],
    lanche_tarde: [
      "❌ Arroz + Feijão (isso é ALMOÇO)",
      "❌ Frango + Salada (isso é JANTAR)",
      "❌ Macarrão (muito pesado)",
    ],
  };
  return negatives[mealType] || [];
}

// Normalizar texto para comparação
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Validar refeição gerada
export function validateGeneratedMeal(
  meal: GeneratedMeal,
  mealType: string,
  structure: MealStructure,
  intoleranceFilter: string | null,
  forbiddenCombinations: string[][],
  mealComponents: Record<string, Array<{ name: string; blocked_for: string[]; safe_for?: string[] }>>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validar estrutura obrigatória
  const componentTypes = meal.components.map(c => c.type);
  for (const required of structure.required) {
    if (!componentTypes.includes(required)) {
      errors.push(`Falta componente obrigatório: ${required}`);
    }
  }

  // 2. Validar componentes proibidos para este tipo
  const prohibited = getProhibitedComponentsForMealType(mealType);
  for (const comp of meal.components) {
    if (prohibited.includes(comp.type)) {
      errors.push(`Componente proibido para ${mealType}: ${comp.type} (${comp.name})`);
    }
  }

  // 3. Validar intolerância - CRÍTICO
  if (intoleranceFilter) {
    // Verificar se a refeição está marcada como bloqueada para a intolerância filtrada
    if (meal.blocked_for_intolerances.includes(intoleranceFilter)) {
      errors.push(`Refeição bloqueada para intolerância filtrada: ${intoleranceFilter}`);
    }

    // Verificar cada componente individualmente
    for (const comp of meal.components) {
      // Buscar definição do componente
      let componentDef: { name: string; blocked_for: string[]; safe_for?: string[] } | undefined;
      
      for (const category of Object.values(mealComponents)) {
        componentDef = category.find(c => 
          normalizeText(c.name) === normalizeText(comp.name)
        );
        if (componentDef) break;
      }

      if (componentDef) {
        const isBlocked = componentDef.blocked_for.includes(intoleranceFilter);
        const isSafeFor = componentDef.safe_for?.includes(intoleranceFilter);
        
        // Se está bloqueado E NÃO é alternativa segura, é erro
        if (isBlocked && !isSafeFor) {
          errors.push(`Componente ${comp.name} não é seguro para ${intoleranceFilter}`);
        }
      } else {
        warnings.push(`Componente ${comp.name} não encontrado na definição - não foi possível validar intolerância`);
      }
    }
  }

  // 4. Validar tempo de preparo
  const maxTime = parseInt(structure.max_prep_time);
  if (meal.prep_time_minutes > maxTime) {
    errors.push(`Tempo de preparo excede máximo: ${meal.prep_time_minutes} > ${maxTime} minutos`);
  }

  // 5. Validar combinações proibidas
  for (const [ing1, ing2] of forbiddenCombinations) {
    const hasIng1 = meal.components.some(c => 
      normalizeText(c.name).includes(normalizeText(ing1))
    );
    const hasIng2 = meal.components.some(c => 
      normalizeText(c.name).includes(normalizeText(ing2))
    );
    if (hasIng1 && hasIng2) {
      errors.push(`Combinação proibida: ${ing1} + ${ing2}`);
    }
  }

  // 6. Validar que tem pelo menos 2 componentes
  if (meal.components.length < 2) {
    errors.push(`Refeição deve ter pelo menos 2 componentes (tem ${meal.components.length})`);
  }

  // 7. Validar que não tem componentes duplicados
  const componentNames = meal.components.map(c => normalizeText(c.name));
  const uniqueNames = new Set(componentNames);
  if (componentNames.length !== uniqueNames.size) {
    warnings.push("Refeição tem componentes duplicados");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
