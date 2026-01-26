/**
 * MEAL SORTER
 * 
 * Ordenação específica para Brasil
 * 
 * ORDEM PARA ALMOÇO/JANTAR:
 * 1. Proteína (frango, carne, peixe, ovo)
 * 2. Arroz
 * 3. Feijão
 * 4. Vegetais/Salada
 * 5. Outros carboidratos (batata, macarrão)
 * 6. Condimentos (azeite, limão)
 * 7. Outros
 * 8. Bebida (água, suco) - PENÚLTIMO
 * 9. Sobremesa (fruta, doce) - ÚLTIMO
 * 
 * ORDEM PARA CAFÉ DA MANHÃ:
 * 1. Proteína (ovo, queijo)
 * 2. Carboidrato (pão, tapioca)
 * 3. Laticínio (iogurte, leite)
 * 4. Gordura (manteiga, requeijão)
 * 5. Fruta
 * 6. Outros
 * 7. Bebida (café, suco) - ÚLTIMO
 * 
 * ORDEM PARA LANCHES:
 * 1. Principal (sanduíche, fruta, iogurte)
 * 2. Complemento
 * 3. Bebida - ÚLTIMO
 */

import { UnifiedComponent, MealType } from './types.ts';

// ============= ORDEM DE PRIORIDADE POR TIPO =============
const SORT_ORDER_LUNCH_DINNER: Record<string, number> = {
  'rice': 1,        // 1º: Arroz (base BR)
  'beans': 2,       // 2º: Feijão
  'protein': 3,     // 3º: Proteína
  'carb': 4,        // 4º: Outros carboidratos (batata, macarrão)
  'vegetable': 5,   // 5º: Vegetais/legumes
  'salad': 6,       // 6º: Salada (folhas)
  'fat': 7,         // 7º: Gorduras/condimentos
  'other': 8,       // 8º: Outros
  'beverage': 9,    // 9º: PENÚLTIMO - Bebida
  'dessert': 10,    // 10º: ÚLTIMO - Sobremesa
  'fruit': 10,      // 10º: ÚLTIMO - Fruta (conta como sobremesa)
};

const SORT_ORDER_BREAKFAST: Record<string, number> = {
  'protein': 1,     // 1º: Proteína (ovo, queijo)
  'carb': 2,        // 2º: Carboidrato (pão, tapioca)
  'dairy': 3,       // 3º: Laticínio (iogurte, leite)
  'fat': 4,         // 4º: Gordura (manteiga, requeijão)
  'fruit': 5,       // 5º: Fruta
  'other': 6,       // 6º: Outros
  'beverage': 7,    // 7º: ÚLTIMO - Bebida (café, suco)
  'dessert': 8,     // 8º: (raro no café, mas por segurança)
};

const SORT_ORDER_SNACK: Record<string, number> = {
  'carb': 1,        // 1º: Principal
  'protein': 1,     // 1º: Principal
  'dairy': 2,       // 2º: Complemento
  'fruit': 2,       // 2º: Complemento
  'fat': 3,         // 3º: Complemento
  'other': 4,       // 4º: Outros
  'beverage': 5,    // 5º: ÚLTIMO - Bebida
  'dessert': 6,     // 6º: ÚLTIMO - Sobremesa
};

// ============= FUNÇÃO PRINCIPAL =============
export function sortComponentsBR(
  components: UnifiedComponent[],
  mealType: MealType
): UnifiedComponent[] {
  // Selecionar ordem baseada no tipo de refeição
  let sortOrder: Record<string, number>;
  
  switch (mealType) {
    case 'breakfast':
      sortOrder = SORT_ORDER_BREAKFAST;
      break;
    case 'morning_snack':
    case 'afternoon_snack':
    case 'supper':
      sortOrder = SORT_ORDER_SNACK;
      break;
    case 'lunch':
    case 'dinner':
    default:
      sortOrder = SORT_ORDER_LUNCH_DINNER;
      break;
  }
  
  // Criar cópia para não mutar original
  const sorted = [...components];
  
  // Ordenar
  sorted.sort((a, b) => {
    const orderA = sortOrder[a.type] ?? 99;
    const orderB = sortOrder[b.type] ?? 99;
    
    // Se mesma prioridade, manter ordem original (estável)
    if (orderA === orderB) return 0;
    
    return orderA - orderB;
  });
  
  return sorted;
}

// ============= CATEGORIZAÇÃO POR NOME (FALLBACK) =============
export function categorizeByName(name: string): string {
  const lower = name.toLowerCase();
  
  // Proteínas animais - EXPANDIDO
  if (/frango|chicken|galinha|peito|asa|coxa|sobrecoxa/i.test(lower)) return 'protein';
  if (/carne|beef|boi|bife|picanha|alcatra|patinho|file|filé|moida|moída/i.test(lower)) return 'protein';
  if (/peixe|fish|tilapia|tilápia|salmao|salmão|atum|bacalhau|merluza|pescada/i.test(lower)) return 'protein';
  if (/porco|pork|suino|suíno|lombo|costela|linguica|linguiça/i.test(lower)) return 'protein';
  if (/ovo|egg|ovos|omelete/i.test(lower)) return 'protein';
  if (/camarao|camarão|shrimp|frutos do mar|seafood/i.test(lower)) return 'protein';
  if (/sardinha|anchova|robalo|dourado/i.test(lower)) return 'protein';
  
  // Arroz (específico BR)
  if (/arroz|rice/i.test(lower)) return 'rice';
  
  // Feijão (específico BR)
  if (/feijao|feijão|bean|lentilha/i.test(lower)) return 'beans';
  
  // Saladas (folhas) - SEPARADO de vegetais
  if (/salada|alface|rucula|rúcula|agriao|agrião/i.test(lower)) return 'salad';
  
  // Vegetais/Legumes - EXPANDIDO
  if (/tomate|pepino|cenoura|brocolis|brócolis|couve/i.test(lower)) return 'vegetable';
  if (/vegetal|vegetais|verdura|legume/i.test(lower)) return 'vegetable';
  if (/abobrinha|abobora|abóbora|berinjela|vagem|chuchu|quiabo/i.test(lower)) return 'vegetable';
  if (/espinafre|acelga|repolho/i.test(lower)) return 'vegetable';
  if (/beterraba|maxixe|jilo|jiló|pimentao|pimentão/i.test(lower)) return 'vegetable';
  
  // Carboidratos (não arroz) - EXPANDIDO
  if (/batata|potato|mandioca|macaxeira|aipim|pure|purê/i.test(lower)) return 'carb';
  if (/macarrao|macarrão|pasta|penne|espaguete|lasanha/i.test(lower)) return 'carb';
  if (/pao|pão|bread|torrada|tapioca|cuscuz/i.test(lower)) return 'carb';
  if (/farofa|polenta|nhoque|inhame/i.test(lower)) return 'carb';
  
  // Bebidas
  if (/agua|água|water/i.test(lower)) return 'beverage';
  if (/suco|juice|refresco/i.test(lower)) return 'beverage';
  if (/cafe|café|coffee|cha|chá|tea/i.test(lower)) return 'beverage';
  
  // Laticínios
  if (/leite|milk|iogurte|yogurt|queijo|cheese|requeijao|requeijão/i.test(lower)) return 'dairy';
  
  // Frutas - EXPANDIDO
  if (/fruta|banana|maca|maçã|laranja|mamao|mamão|melancia|abacaxi/i.test(lower)) return 'fruit';
  if (/morango|uva|manga|kiwi|goiaba|melao|melão|pera|pessego|pêssego/i.test(lower)) return 'fruit';
  
  // Sobremesas
  if (/doce|sobremesa|bolo|pudim|mousse|sorvete/i.test(lower)) return 'dessert';
  
  // Gorduras
  if (/azeite|oleo|óleo|oil|manteiga|butter/i.test(lower)) return 'fat';
  
  return 'other';
}
