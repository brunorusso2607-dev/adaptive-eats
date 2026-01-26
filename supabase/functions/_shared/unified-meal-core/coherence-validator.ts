/**
 * COHERENCE VALIDATOR
 * 
 * Validação de coerência - evita combinações bizarras
 */

import { UnifiedComponent, MealType } from './types.ts';

// ============= COMBINAÇÕES PROIBIDAS =============
const FORBIDDEN_COMBINATIONS = [
  {
    triggers: ['sopa', 'caldo'],
    with: ['salada', 'alface', 'tomate', 'pepino', 'cenoura', 'beterraba', 'repolho', 
           'arroz', 'feij', 'macarr', 'batata frita', 'purê', 'banana', 'laranja', 'maçã'],
    reason: 'Sopa/caldo é refeição completa, não precisa de acompanhamentos',
    autoRemove: true, // Remover automaticamente os acompanhamentos
  },
  {
    triggers: ['arroz'],
    with: ['macarr', 'massa', 'lasanha', 'espaguete'],
    reason: 'Dois carboidratos pesados na mesma refeição',
  },
  {
    triggers: ['pizza'],
    with: ['arroz', 'feij', 'macarr'],
    reason: 'Pizza é uma refeição completa',
  },
  {
    triggers: ['hamburguer', 'burger', 'sanduiche', 'sandwich'],
    with: ['arroz', 'feij', 'macarr'],
    reason: 'Sanduíche/hambúrguer é uma refeição completa',
  },
  {
    triggers: ['feijoada'],
    with: ['salada de fruta', 'sorvete', 'pudim'],
    reason: 'Feijoada tradicionalmente acompanha laranja, não sobremesas pesadas',
  },
  {
    triggers: ['mingau', 'aveia'],
    with: ['arroz', 'feij', 'carne', 'frango'],
    reason: 'Mingau é refeição leve, não combina com pratos pesados',
  },
  {
    triggers: ['acai', 'açaí'],
    with: ['arroz', 'feij', 'carne', 'frango', 'peixe'],
    reason: 'Açaí é lanche/sobremesa, não combina com refeição salgada',
  },
  {
    triggers: ['cereal', 'sucrilhos', 'granola'],
    with: ['arroz', 'feij', 'carne'],
    reason: 'Cereal é café da manhã, não combina com almoço/jantar',
  },
];

// ============= LIMITES DE PORÇÃO =============
const PORTION_LIMITS = {
  oil: { max_grams: 15, reason: 'Azeite/óleo máximo 1 colher de sopa' },
  sugar: { max_grams: 10, reason: 'Açúcar máximo 2 colheres de chá' },
  salt: { max_grams: 2, reason: 'Sal máximo 1 pitada' },
  butter: { max_grams: 20, reason: 'Manteiga máximo 1 colher de sopa' },
};

// ============= INGREDIENTES QUE DEVEM ESTAR PRESENTES SE MENCIONADOS NO NOME =============
// Se o nome da refeição menciona um destes ingredientes, ele DEVE estar nos componentes
const REQUIRED_IF_IN_NAME = [
  { namePattern: /feij[aã]o/i, componentPattern: /feij[aã]o/i, name: 'Feijão' },
  { namePattern: /arroz/i, componentPattern: /arroz/i, name: 'Arroz' },
  { namePattern: /frango/i, componentPattern: /frango/i, name: 'Frango' },
  { namePattern: /carne/i, componentPattern: /carne|bife|fil[eé]/i, name: 'Carne' },
  { namePattern: /bife/i, componentPattern: /bife/i, name: 'Bife' },
  { namePattern: /peixe/i, componentPattern: /peixe|til[aá]pia|salm[aã]o|bacalhau|atum/i, name: 'Peixe' },
  { namePattern: /ovo/i, componentPattern: /ovo/i, name: 'Ovo' },
  { namePattern: /salada/i, componentPattern: /salada|alface|r[uú]cula|agri[aã]o/i, name: 'Salada' },
  { namePattern: /macarr[aã]o/i, componentPattern: /macarr[aã]o|massa|espaguete/i, name: 'Macarrão' },
  { namePattern: /batata/i, componentPattern: /batata/i, name: 'Batata' },
  { namePattern: /iogurte/i, componentPattern: /iogurte/i, name: 'Iogurte' },
  { namePattern: /queijo/i, componentPattern: /queijo|mussarela|parmesão|cottage/i, name: 'Queijo' },
  { namePattern: /tapioca/i, componentPattern: /tapioca/i, name: 'Tapioca' },
];

// ============= RESULTADO DA VALIDAÇÃO =============
export interface CoherenceResult {
  isCoherent: boolean;
  errors: string[];
  warnings: string[];
  canAutoFix: boolean;
  fixedComponents?: UnifiedComponent[];
  fixes: string[];
}

// ============= FUNÇÃO PRINCIPAL =============
export function validateCoherence(
  components: UnifiedComponent[],
  mealType: MealType,
  country: string,
  mealName?: string // Nome da refeição para validar presença de ingredientes
): CoherenceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: string[] = [];
  let fixedComponents: UnifiedComponent[] | undefined;
  
  // Concatenar todos os nomes para busca
  const allNames = components.map(c => c.name_pt.toLowerCase()).join(' | ');
  
  // ============= VERIFICAR INGREDIENTES OBRIGATÓRIOS PELO NOME =============
  // Se o nome da refeição menciona um ingrediente, ele DEVE estar nos componentes
  if (mealName) {
    const mealNameLower = mealName.toLowerCase();
    
    for (const rule of REQUIRED_IF_IN_NAME) {
      // Se o nome da refeição contém o ingrediente
      if (rule.namePattern.test(mealNameLower)) {
        // Verificar se algum componente contém esse ingrediente
        const hasIngredient = components.some(c => 
          rule.componentPattern.test(c.name_pt.toLowerCase()) ||
          rule.componentPattern.test(c.ingredient_key.toLowerCase())
        );
        
        if (!hasIngredient) {
          errors.push(`Nome "${mealName}" menciona ${rule.name}, mas não está nos ingredientes`);
        }
      }
    }
  }
  
  // ============= VERIFICAR COMBINAÇÕES PROIBIDAS =============
  for (const combo of FORBIDDEN_COMBINATIONS) {
    const hasTrigger = combo.triggers.some(t => allNames.includes(t));
    const hasConflict = combo.with.some(w => allNames.includes(w));
    
    if (hasTrigger && hasConflict) {
      errors.push(combo.reason);
    }
  }
  
  // ============= VERIFICAR LIMITES DE PORÇÃO =============
  for (const component of components) {
    const category = component.category;
    const limit = PORTION_LIMITS[category as keyof typeof PORTION_LIMITS];
    
    if (limit && component.portion_grams > limit.max_grams) {
      warnings.push(`${component.name_pt}: ${limit.reason} (atual: ${component.portion_grams}g)`);
      
      // Auto-fix: ajustar porção
      if (!fixedComponents) {
        fixedComponents = components.map(c => ({ ...c }));
      }
      const toFix = fixedComponents.find(c => c.ingredient_key === component.ingredient_key);
      if (toFix) {
        toFix.portion_grams = limit.max_grams;
        fixes.push(`Ajustado ${component.name_pt} de ${component.portion_grams}g para ${limit.max_grams}g`);
      }
    }
  }
  
  // ============= VERIFICAR MÍNIMOS POR TIPO DE REFEIÇÃO =============
  if (mealType === 'lunch' || mealType === 'dinner') {
    const hasProtein = components.some(c => c.type === 'protein');
    if (!hasProtein) {
      warnings.push('Almoço/jantar sem proteína');
    }
  }
  
  return {
    isCoherent: errors.length === 0,
    errors,
    warnings,
    canAutoFix: errors.length === 0 && fixes.length > 0,
    fixedComponents,
    fixes,
  };
}
