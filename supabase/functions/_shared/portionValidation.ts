// ============================================
// MÓDULO CENTRALIZADO DE VALIDAÇÃO DE PORÇÕES
// Usado por TODAS as funções de geração de refeições
// ============================================

/**
 * Normaliza texto removendo acentos e convertendo para minúsculas
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ============================================
// ALIMENTOS QUE NUNCA DEVEM USAR "XÍCARA"
// ============================================

const SOLID_FOODS = [
  // Proteínas
  'frango', 'carne', 'peixe', 'bife', 'ovo', 'atum', 'sardinha',
  'porco', 'lombo', 'costela', 'linguica', 'salsicha', 'bacon',
  'camarao', 'lagosta', 'lula', 'polvo', 'mariscos',
  'peru', 'pato', 'cordeiro', 'cabrito', 'coelho',
  
  // Vegetais sólidos
  'legumes', 'brocolis', 'couve', 'salada', 'vegetais',
  'cenoura', 'abobrinha', 'berinjela', 'tomate', 'pepino',
  'espinafre', 'alface', 'rucula', 'agriao', 'repolho',
  'vagem', 'ervilha', 'milho', 'beterraba', 'rabanete',
  'pimentao', 'chuchu', 'quiabo', 'jilo',
  
  // Tubérculos
  'batata', 'mandioca', 'inhame', 'cara', 'batata doce',
  
  // Grãos e leguminosas
  'arroz', 'feijao', 'lentilha', 'grao de bico', 'ervilha',
  'quinoa', 'cuscuz', 'farofa', 'pure',
  
  // Frutas
  'banana', 'maca', 'laranja', 'melancia', 'melao', 'abacaxi',
  'manga', 'mamao', 'uva', 'morango', 'kiwi', 'pera',
  'pessego', 'ameixa', 'figo', 'caqui', 'goiaba',
];

// ============================================
// ALIMENTOS QUE PODEM USAR "XÍCARA" (LÍQUIDOS)
// ============================================

const LIQUID_FOODS = [
  'cafe', 'cha', 'leite', 'suco', 'vitamina', 'shake',
  'agua', 'caldo', 'sopa', 'creme', 'iogurte liquido',
  'acai', 'smoothie', 'bebida',
];

// ============================================
// MAPEAMENTO DE PORÇÕES CORRETAS POR TIPO
// ============================================

interface PortionFix {
  pattern: string[];
  correctLabel: (grams: number) => string;
}

const PORTION_FIXES: PortionFix[] = [
  // Proteínas
  {
    pattern: ['frango', 'peixe', 'bife', 'file', 'lombo'],
    correctLabel: (g) => `1 filé médio (${g}g)`
  },
  {
    pattern: ['carne moida', 'carne desfiada', 'frango desfiado'],
    correctLabel: (g) => `1 porção (${g}g)`
  },
  {
    pattern: ['ovo'],
    correctLabel: (g) => g <= 50 ? `1 ovo (${g}g)` : `2 ovos (${g}g)`
  },
  {
    pattern: ['atum', 'sardinha'],
    correctLabel: (g) => `1 lata pequena (${g}g)`
  },
  
  // Vegetais
  {
    pattern: ['brocolis'],
    correctLabel: (g) => `4 floretes (${g}g)`
  },
  {
    pattern: ['couve', 'espinafre'],
    correctLabel: (g) => `2 colheres de sopa (${g}g)`
  },
  {
    pattern: ['salada', 'alface', 'rucula'],
    correctLabel: (g) => `1 prato pequeno (${g}g)`
  },
  {
    pattern: ['legumes', 'vegetais'],
    correctLabel: (g) => `1 porção (${g}g)`
  },
  {
    pattern: ['cenoura', 'abobrinha', 'berinjela', 'pepino'],
    correctLabel: (g) => `1 unidade média (${g}g)`
  },
  {
    pattern: ['tomate'],
    correctLabel: (g) => `1 tomate médio (${g}g)`
  },
  
  // Carboidratos
  {
    pattern: ['arroz'],
    correctLabel: (g) => `4 colheres de sopa (${g}g)`
  },
  {
    pattern: ['feijao', 'lentilha', 'grao de bico'],
    correctLabel: (g) => `1 concha média (${g}g)`
  },
  {
    pattern: ['batata', 'mandioca', 'inhame'],
    correctLabel: (g) => `1 unidade média (${g}g)`
  },
  {
    pattern: ['macarrao', 'massa'],
    correctLabel: (g) => `1 prato raso (${g}g)`
  },
  {
    pattern: ['cuscuz'],
    correctLabel: (g) => `1 porção de cuscuz (${g}g)`
  },
  {
    pattern: ['pure'],
    correctLabel: (g) => `2 colheres grandes (${g}g)`
  },
  
  // Frutas
  {
    pattern: ['banana', 'maca', 'laranja', 'pera'],
    correctLabel: (g) => `1 unidade média (${g}g)`
  },
  {
    pattern: ['mamao'],
    correctLabel: (g) => `1 fatia (${g}g)`
  },
  {
    pattern: ['melancia', 'melao'],
    correctLabel: (g) => `1 fatia grande (${g}g)`
  },
  {
    pattern: ['morango', 'uva'],
    correctLabel: (g) => `1 porção (${g}g)`
  },
];

// ============================================
// FUNÇÃO PRINCIPAL: VALIDAR E CORRIGIR PORÇÃO
// ============================================

export interface PortionValidationResult {
  isValid: boolean;
  originalLabel: string;
  fixedLabel: string;
  issue?: string;
}

/**
 * Valida e corrige a porção de um alimento
 * @param foodName Nome do alimento
 * @param portionLabel Label da porção original
 * @param portionGrams Gramas da porção
 * @returns Resultado da validação com correção se necessário
 */
export function validateAndFixPortion(
  foodName: string,
  portionLabel: string,
  portionGrams: number = 100
): PortionValidationResult {
  const normalizedName = normalizeText(foodName);
  const normalizedLabel = normalizeText(portionLabel);
  
  // Verificar se usa xícara
  const usesXicara = normalizedLabel.includes('xicara') || portionLabel.includes('xícara');
  
  if (!usesXicara) {
    return {
      isValid: true,
      originalLabel: portionLabel,
      fixedLabel: portionLabel
    };
  }
  
  // Verificar se é um alimento líquido (xícara é OK)
  const isLiquid = LIQUID_FOODS.some(liquid => normalizedName.includes(liquid));
  if (isLiquid) {
    return {
      isValid: true,
      originalLabel: portionLabel,
      fixedLabel: portionLabel
    };
  }
  
  // Verificar se é um alimento sólido (xícara é ERRADO)
  const isSolid = SOLID_FOODS.some(solid => normalizedName.includes(solid));
  if (!isSolid) {
    // Não é sólido conhecido, manter como está
    return {
      isValid: true,
      originalLabel: portionLabel,
      fixedLabel: portionLabel
    };
  }
  
  // É sólido com xícara - PRECISA CORRIGIR
  let fixedLabel = portionLabel;
  
  // Encontrar a correção apropriada
  for (const fix of PORTION_FIXES) {
    const matches = fix.pattern.some(p => normalizedName.includes(p));
    if (matches) {
      fixedLabel = fix.correctLabel(portionGrams);
      break;
    }
  }
  
  // Se não encontrou correção específica, usar genérica
  if (fixedLabel === portionLabel) {
    fixedLabel = `1 porção (${portionGrams}g)`;
  }
  
  return {
    isValid: false,
    originalLabel: portionLabel,
    fixedLabel,
    issue: `Alimento sólido "${foodName}" não deve usar "xícara"`
  };
}

// ============================================
// FUNÇÃO: CORRIGIR COMPONENTES DE UMA REFEIÇÃO
// ============================================

export interface MealComponent {
  name: string;
  name_en?: string;
  type?: string;
  portion_grams?: number;
  portion_ml?: number;
  portion_label: string;
  [key: string]: any;
}

/**
 * Corrige todos os componentes de uma refeição
 * @param components Array de componentes
 * @returns Array de componentes corrigidos
 */
export function fixMealComponents(components: MealComponent[]): MealComponent[] {
  return components.map(comp => {
    const grams = comp.portion_grams || comp.portion_ml || 100;
    const validation = validateAndFixPortion(comp.name, comp.portion_label, grams);
    
    if (!validation.isValid) {
      console.log(`[PORTION-FIX] ${comp.name}: "${validation.originalLabel}" → "${validation.fixedLabel}"`);
    }
    
    return {
      ...comp,
      portion_label: validation.fixedLabel
    };
  });
}

// ============================================
// FUNÇÃO: VALIDAR VARIEDADE DE PROTEÍNAS
// ============================================

const PROTEIN_TYPES = {
  frango: ['frango', 'galinha', 'peru'],
  carne: ['carne', 'bife', 'bovina', 'lombo', 'costela'],
  peixe: ['peixe', 'atum', 'salmao', 'tilapia', 'sardinha'],
  ovo: ['ovo', 'omelete'],
  porco: ['porco', 'bacon', 'linguica', 'salsicha'],
};

export interface VarietyValidationResult {
  isValid: boolean;
  proteinCounts: Record<string, number>;
  issues: string[];
  suggestions: string[];
}

/**
 * Valida a variedade de proteínas em um conjunto de refeições
 * @param meals Array de refeições
 * @param maxSameProtein Máximo de refeições com a mesma proteína
 * @returns Resultado da validação
 */
export function validateProteinVariety(
  meals: Array<{ name: string; components: MealComponent[] }>,
  maxSameProtein: number = 2
): VarietyValidationResult {
  const proteinCounts: Record<string, number> = {};
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  for (const meal of meals) {
    for (const comp of meal.components || []) {
      const normalizedName = normalizeText(comp.name);
      
      for (const [proteinType, keywords] of Object.entries(PROTEIN_TYPES)) {
        if (keywords.some(kw => normalizedName.includes(kw))) {
          proteinCounts[proteinType] = (proteinCounts[proteinType] || 0) + 1;
        }
      }
    }
  }
  
  let isValid = true;
  
  for (const [proteinType, count] of Object.entries(proteinCounts)) {
    if (count > maxSameProtein) {
      isValid = false;
      issues.push(`${proteinType} aparece ${count}x (máximo ${maxSameProtein})`);
      
      // Sugerir substituições
      const alternatives = Object.keys(PROTEIN_TYPES).filter(p => 
        p !== proteinType && (!proteinCounts[p] || proteinCounts[p] < maxSameProtein)
      );
      if (alternatives.length > 0) {
        suggestions.push(`Substituir algumas refeições de ${proteinType} por: ${alternatives.join(', ')}`);
      }
    }
  }
  
  return { isValid, proteinCounts, issues, suggestions };
}

// ============================================
// EXPORTAR TODAS AS FUNÇÕES
// ============================================

export {
  normalizeText,
  SOLID_FOODS,
  LIQUID_FOODS,
  PORTION_FIXES,
};

