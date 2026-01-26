/**
 * Filtro de Alimentos Especiais (sem glúten/sem lactose)
 * 
 * Alimentos com "sem glúten" ou "sem lactose" no nome devem aparecer
 * APENAS para usuários com as respectivas intolerâncias.
 * 
 * Usuários SEM intolerâncias devem ver apenas versões "normais" dos alimentos.
 */

// Palavras-chave que indicam versões especiais de alimentos
const GLUTEN_FREE_KEYWORDS = [
  'sem glúten',
  'sem gluten',
  'gluten-free',
  'gluten free',
  'livre de glúten',
  'livre de gluten',
];

const LACTOSE_FREE_KEYWORDS = [
  'sem lactose',
  'lactose-free',
  'lactose free',
  'livre de lactose',
  'zero lactose',
];

/**
 * Verifica se um nome contém palavras-chave de alimento sem glúten
 */
function isGlutenFreeSpecialFood(name: string): boolean {
  const nameLower = name.toLowerCase();
  return GLUTEN_FREE_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Verifica se um nome contém palavras-chave de alimento sem lactose
 */
function isLactoseFreeSpecialFood(name: string): boolean {
  const nameLower = name.toLowerCase();
  return LACTOSE_FREE_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Verifica se o usuário tem intolerância a glúten
 */
function hasGlutenIntolerance(intolerances: string[]): boolean {
  const glutenKeywords = ['gluten', 'glúten', 'celiac', 'celiaco', 'celíaco'];
  return intolerances.some(intol => 
    glutenKeywords.some(keyword => intol.toLowerCase().includes(keyword))
  );
}

/**
 * Verifica se o usuário tem intolerância a lactose
 */
function hasLactoseIntolerance(intolerances: string[]): boolean {
  const lactoseKeywords = ['lactose', 'leite', 'milk', 'dairy', 'laticínio', 'laticinio'];
  return intolerances.some(intol => 
    lactoseKeywords.some(keyword => intol.toLowerCase().includes(keyword))
  );
}

/**
 * Filtra uma refeição/alimento baseado nas intolerâncias do usuário
 * 
 * Retorna TRUE se o alimento deve ser MOSTRADO
 * Retorna FALSE se o alimento deve ser REMOVIDO
 */
export function shouldShowSpecialFood(
  foodName: string, 
  userIntolerances: string[]
): boolean {
  const intolerances = userIntolerances || [];
  
  // Se o alimento é "sem glúten", só mostrar para quem tem intolerância a glúten
  if (isGlutenFreeSpecialFood(foodName)) {
    if (!hasGlutenIntolerance(intolerances)) {
      return false; // Usuário NÃO tem intolerância a glúten, NÃO mostrar versão sem glúten
    }
  }
  
  // Se o alimento é "sem lactose", só mostrar para quem tem intolerância a lactose
  if (isLactoseFreeSpecialFood(foodName)) {
    if (!hasLactoseIntolerance(intolerances)) {
      return false; // Usuário NÃO tem intolerância a lactose, NÃO mostrar versão sem lactose
    }
  }
  
  // Alimento normal ou usuário tem a intolerância correspondente
  return true;
}

/**
 * Filtra uma lista de refeições baseado nas intolerâncias do usuário
 */
export function filterSpecialDietMeals<T extends { name: string }>(
  meals: T[],
  userIntolerances: string[]
): T[] {
  return meals.filter(meal => shouldShowSpecialFood(meal.name, userIntolerances));
}

/**
 * Filtra uma lista de refeições do pool (com estrutura de meal_combinations)
 */
export function filterPoolMeals(
  meals: any[],
  userIntolerances: string[]
): any[] {
  return meals.filter(meal => {
    // Verificar nome da refeição
    if (!shouldShowSpecialFood(meal.name || '', userIntolerances)) {
      return false;
    }
    
    // Verificar componentes da refeição
    const components = meal.components || [];
    for (const comp of components) {
      const compName = comp.name || comp.item || '';
      if (!shouldShowSpecialFood(compName, userIntolerances)) {
        return false;
      }
    }
    
    return true;
  });
}
