/**
 * SHARED MEAL GENERATION CONFIG
 * 
 * Este arquivo contém todas as regras, listas de ingredientes proibidos,
 * funções de validação e configurações usadas por:
 * - generate-ai-meal-plan
 * - regenerate-ai-meal-alternatives
 * 
 * QUALQUER CORREÇÃO feita aqui será refletida em AMBAS as funções automaticamente.
 */

// ============= INTERFACES =============
export interface IntoleranceMapping {
  ingredient: string;
  intolerance_key: string;
}

export interface SafeKeyword {
  keyword: string;
  intolerance_key: string;
}

export interface RegionalConfig {
  language: string;
  languageName: string;
  measurementSystem?: 'metric' | 'imperial';
  typicalMeals?: string;
  culturalNotes?: string;
  mealLabels: Record<string, string>;
  dayNames?: string[];
  domesticUnits?: string;
}

export interface FoodItem {
  name: string;
  grams: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  restriction?: string;
}

// ============= REGIONAL CONFIGS =============
export const REGIONAL_CONFIGS: Record<string, RegionalConfig> = {
  'BR': {
    language: 'pt-BR',
    languageName: 'Português Brasileiro',
    measurementSystem: 'metric',
    typicalMeals: `
CAFE DA MANHA: Pao frances, tapioca, ovos, cafe com leite, frutas tropicais, iogurte
LANCHE: Frutas, castanhas, pao de queijo, sanduiches leves
ALMOCO: Arroz + feijao + proteina (frango, carne, peixe) + salada - estrutura classica brasileira
JANTAR: Similar ao almoco ou mais leve (sopas, omeletes, sanduiches)`,
    culturalNotes: 'Ingredientes brasileiros: mandioca, acai, feijao preto, frango, carne bovina, banana, mamao, laranja.',
    mealLabels: {
      cafe_manha: "Café da manhã",
      lanche_manha: "Lanche da manhã",
      almoco: "Almoço",
      lanche_tarde: "Lanche da tarde",
      jantar: "Jantar",
      ceia: "Ceia",
    },
    dayNames: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"],
    domesticUnits: 'unidade, colher de sopa, copo, fatia, prato medio, concha, porcao',
  },
  'US': {
    language: 'en-US',
    languageName: 'American English',
    measurementSystem: 'imperial',
    typicalMeals: `
BREAKFAST: Eggs, bacon, toast, oatmeal, pancakes, smoothies, cereal, yogurt
SNACK: Fruits, nuts, yogurt, granola bars, cheese sticks
LUNCH: Sandwiches, salads, wraps, soups, grain bowls
DINNER: Protein + starch + vegetables (grilled chicken, pasta, steak, fish)`,
    culturalNotes: 'American ingredients: turkey, peanut butter, sweet potatoes, chicken breast, salmon, berries, avocado.',
    mealLabels: {
      cafe_manha: "Breakfast",
      lanche_manha: "Morning Snack",
      almoco: "Lunch",
      lanche_tarde: "Afternoon Snack",
      jantar: "Dinner",
      ceia: "Late Night Snack",
    },
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    domesticUnits: 'piece, tablespoon, cup, slice, medium plate, serving, portion',
  },
  'PT': {
    language: 'pt-PT',
    languageName: 'Português Europeu',
    measurementSystem: 'metric',
    typicalMeals: `
PEQUENO-ALMOCO: Pao com manteiga, cereais, cafe, sumo de laranja
ALMOCO: Sopa, prato principal (bacalhau, carne, peixe), arroz/batatas
LANCHE: Fruta, iogurte, tostas
JANTAR: Similar ao almoco ou mais leve`,
    culturalNotes: 'Ingredientes portugueses: bacalhau, azeite, batatas, frango, peixe, legumes.',
    mealLabels: {
      cafe_manha: "Pequeno-almoço",
      lanche_manha: "Lanche da Manhã",
      almoco: "Almoço",
      lanche_tarde: "Lanche da Tarde",
      jantar: "Jantar",
      ceia: "Ceia",
    },
    dayNames: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"],
    domesticUnits: 'unidade, colher de sopa, copo, fatia, prato medio, porcao',
  },
  'MX': {
    language: 'es-MX',
    languageName: 'Español Mexicano',
    measurementSystem: 'metric',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colación Matutina",
      almoco: "Comida",
      lanche_tarde: "Colación Vespertina",
      jantar: "Cena",
      ceia: "Cena Ligera",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  },
  'ES': {
    language: 'es-ES',
    languageName: 'Español de España',
    measurementSystem: 'metric',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Media Mañana",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
      ceia: "Cena Tardía",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  },
};

export const DEFAULT_CONFIG: RegionalConfig = REGIONAL_CONFIGS['BR'];

export function getRegionalConfig(countryCode: string): RegionalConfig {
  return REGIONAL_CONFIGS[countryCode?.toUpperCase()] || DEFAULT_CONFIG;
}

// ============= FORBIDDEN INGREDIENTS (LISTA UNIFICADA) =============
// Lista completa de 17 intolerâncias padronizadas + variantes de açúcar
export const FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  // Intolerâncias básicas
  lactose: ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao', 'creme de leite', 'nata', 'coalho', 'mussarela', 'parmesao', 'ricota', 'cottage', 'cream cheese', 'chantilly', 'leite condensado', 'doce de leite', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'fromage', 'lait', 'beurre', 'formaggio', 'latte', 'burro', 'käse', 'milch', 'queso', 'crema', 'mantequilla'],
  gluten: ['trigo', 'farinha de trigo', 'cevada', 'centeio', 'wheat', 'bread', 'pasta', 'cake', 'cookie', 'biscuit', 'flour', 'barley', 'rye', 'pain', 'gateau', 'farine', 'pane', 'farina', 'brot', 'kuchen', 'mehl', 'harina', 'galleta'],
  amendoim: ['amendoim', 'pasta de amendoim', 'peanut', 'cacahuete', 'mani', 'arachide', 'erdnuss'],
  frutos_do_mar: ['camarao', 'lagosta', 'caranguejo', 'siri', 'marisco', 'lula', 'polvo', 'ostra', 'mexilhao', 'shrimp', 'lobster', 'crab', 'oyster', 'squid', 'octopus', 'crevette', 'homard', 'crabe', 'gambero', 'aragosta', 'granchio', 'garnele', 'hummer', 'krabbe', 'camaron', 'langosta', 'cangrejo'],
  peixe: ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'robalo', 'fish', 'salmon', 'tuna', 'cod', 'sardine', 'poisson', 'saumon', 'thon', 'morue', 'pesce', 'salmone', 'tonno', 'merluzzo', 'fisch', 'lachs', 'thunfisch', 'kabeljau', 'pescado', 'atun', 'bacalao'],
  ovos: ['ovo', 'ovos', 'gema', 'clara de ovo', 'omelete', 'egg', 'eggs', 'omelette', 'oeuf', 'uovo', 'uova', 'frittata', 'eier', 'omelett', 'huevo', 'huevos', 'tortilla espanola'],
  soja: ['soja', 'tofu', 'edamame', 'leite de soja', 'molho de soja', 'shoyu', 'soy', 'soya', 'sojamilch', 'sojasauce'],
  // CAFEINA: Termos específicos para evitar match com "tomate", "azeite", "iogurte"
  cafeina: ['cafe ', ' cafe', 'coffee', 'cha preto', 'cha verde', 'cha mate', 'green tea', 'black tea', 'guarana', 'chocolate', 'cacau', 'kaffee', 'schokolade', 'espresso', 'cappuccino', 'latte macchiato', 'energetico', 'red bull', 'monster'],
  milho: ['milho', 'fuba', 'polenta', 'pipoca', 'corn', 'maize', 'popcorn', 'granoturco', 'maiz', 'palomitas'],
  leguminosas: ['feijao', 'lentilha', 'grao de bico', 'ervilha seca', 'fava', 'beans', 'lentils', 'chickpeas', 'haricots', 'lentilles', 'pois chiches', 'fagioli', 'lenticchie', 'ceci', 'bohnen', 'linsen', 'kichererbsen', 'frijoles', 'lentejas', 'garbanzos'],
  
  // Intolerâncias adicionais (17 padronizadas)
  sulfitos: ['vinho', 'vinagre', 'frutas secas', 'conservas', 'wine', 'vinegar', 'dried fruits'],
  castanhas: ['castanha', 'noz', 'amêndoa', 'avelã', 'macadâmia', 'pistache', 'nuts', 'almonds', 'walnuts', 'hazelnuts', 'cashews', 'noix', 'amande', 'noisette', 'noce', 'mandorla', 'nocciola', 'nuss', 'mandel', 'haselnuss', 'nuez', 'almendra', 'avellana'],
  sesamo: ['gergelim', 'tahine', 'sesame', 'tahini', 'sésame', 'sesamo'],
  tremoco: ['tremoço', 'lupin', 'lupine', 'altramuz'],
  mostarda: ['mostarda', 'mustard', 'moutarde', 'senape', 'senf'],
  aipo: ['aipo', 'salsao', 'celery', 'céleri', 'sedano', 'sellerie'],
  moluscos: ['ostra', 'mexilhao', 'vieira', 'lula', 'polvo', 'oyster', 'mussel', 'clam', 'squid', 'octopus', 'huître', 'moule', 'coquille', 'ostrica', 'cozza', 'vongola', 'auster', 'miesmuschel'],
  fodmap: ['cebola', 'alho', 'maca', 'pera', 'mel', 'trigo', 'onion', 'garlic', 'apple', 'pear', 'honey', 'wheat', 'oignon', 'ail', 'pomme', 'poire', 'miel', 'cipolla', 'aglio', 'mela', 'zwiebel', 'knoblauch', 'apfel', 'birne', 'honig'],
  histamina: ['queijo curado', 'vinho', 'cerveja', 'embutidos', 'fermentados', 'aged cheese', 'wine', 'beer', 'cured meats', 'fermented', 'fromage affiné', 'vin', 'bière', 'charcuterie', 'formaggio stagionato', 'vino', 'birra', 'salumi', 'gereifter käse', 'wein', 'bier', 'wurst'],
  salicilatos: ['tomate', 'pimentao', 'berinjela', 'curry', 'tomato', 'pepper', 'eggplant', 'tomate', 'poivron', 'aubergine', 'pomodoro', 'peperone', 'melanzana', 'paprika', 'aubergine'],
  niquel: ['chocolate', 'cacau', 'aveia', 'lentilha', 'soja', 'cocoa', 'oats', 'lentils', 'soy', 'cacao', 'avoine', 'lentilles', 'soja', 'cioccolato', 'avena', 'lenticchie', 'schokolade', 'kakao', 'hafer', 'linsen'],
  
  // Açúcar - 3 variantes (mesmo conteúdo para consistência)
  acucar: ['acucar', 'açúcar', 'mel', 'xarope', 'rapadura', 'melado', 'sugar', 'honey', 'syrup', 'molasses', 'sucre', 'miel', 'sirop', 'zucchero', 'miele', 'sciroppo', 'zucker', 'honig', 'sirup', 'azúcar', 'jarabe'],
  acucar_diabetes: ['acucar', 'açúcar', 'mel', 'xarope', 'rapadura', 'melado', 'sugar', 'honey', 'syrup', 'molasses', 'sucre', 'miel', 'sirop', 'zucchero', 'miele', 'sciroppo', 'zucker', 'honig', 'sirup', 'azúcar', 'jarabe'],
  acucar_insulina: ['acucar', 'açúcar', 'mel', 'xarope', 'rapadura', 'melado', 'sugar', 'honey', 'syrup', 'molasses', 'sucre', 'miel', 'sirop', 'zucchero', 'miele', 'sciroppo', 'zucker', 'honig', 'sirup', 'azúcar', 'jarabe'],
};

// Ingredientes de origem animal (para vegano/vegetariano)
export const ANIMAL_INGREDIENTS = ['carne', 'frango', 'porco', 'boi', 'peru', 'pato', 'bacon', 'presunto', 'salsicha', 'linguica', 'mortadela', 'salame', 'peito de frango', 'file', 'costela', 'picanha', 'alcatra', 'patinho', 'acém', 'maminha', 'coxa', 'sobrecoxa', 'asa', 'meat', 'chicken', 'pork', 'beef', 'turkey', 'duck', 'ham', 'sausage', 'viande', 'poulet', 'porc', 'boeuf', 'dinde', 'jambon', 'saucisse', 'carne', 'pollo', 'maiale', 'manzo', 'tacchino', 'prosciutto', 'fleisch', 'hähnchen', 'schwein', 'rind', 'pute', 'schinken', 'wurst', 'cerdo', 'res', 'pavo', 'jamon', 'salchicha'];

export const DAIRY_AND_EGGS = ['leite', 'queijo', 'iogurte', 'ovo', 'ovos', 'manteiga', 'creme de leite', 'requeijao', 'milk', 'cheese', 'yogurt', 'egg', 'eggs', 'butter', 'cream', 'lait', 'fromage', 'yaourt', 'oeuf', 'oeufs', 'beurre', 'creme', 'latte', 'formaggio', 'uovo', 'uova', 'burro', 'panna', 'milch', 'käse', 'joghurt', 'ei', 'eier', 'sahne', 'leche', 'queso', 'yogur', 'huevo', 'huevos', 'mantequilla', 'crema', 'mel', 'honey', 'miel', 'honig'];

export const FISH_INGREDIENTS = ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'fish', 'salmon', 'tuna', 'cod', 'sardine', 'poisson', 'saumon', 'thon', 'pesce', 'salmone', 'tonno', 'fisch', 'lachs', 'thunfisch', 'pescado', 'atun'];

// ============= VALIDATION FUNCTIONS =============
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function validateFood(
  food: string,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[]
): ValidationResult {
  const normalizedFood = normalizeText(food);
  
  // 1. Verificar ingredientes excluídos pelo usuário
  for (const excluded of restrictions.excludedIngredients) {
    if (normalizedFood.includes(normalizeText(excluded))) {
      return {
        isValid: false,
        reason: `Contém ingrediente excluído: ${excluded}`,
        restriction: 'excluded_ingredient',
      };
    }
  }
  
  // 2. Verificar intolerâncias
  for (const intolerance of restrictions.intolerances) {
    // Safe keywords para esta intolerância
    const safeForIntolerance = dbSafeKeywords
      .filter(sk => sk.intolerance_key === intolerance)
      .map(sk => sk.keyword);
    
    // Primeiro verifica se é seguro
    let isSafe = false;
    for (const safe of safeForIntolerance) {
      if (normalizedFood.includes(normalizeText(safe))) {
        isSafe = true;
        break;
      }
    }
    
    if (!isSafe) {
      // Verifica mapeamentos do banco
      const dbForbidden = dbMappings
        .filter(m => m.intolerance_key === intolerance)
        .map(m => m.ingredient);
      
      for (const forbidden of dbForbidden) {
        if (normalizedFood.includes(normalizeText(forbidden))) {
          return {
            isValid: false,
            reason: `Contém ${forbidden} (intolerância: ${intolerance})`,
            restriction: `intolerance_${intolerance}`,
          };
        }
      }
      
      // Verifica lista hardcoded
      const hardcodedForbidden = FORBIDDEN_INGREDIENTS[intolerance] || [];
      for (const forbidden of hardcodedForbidden) {
        if (normalizedFood.includes(normalizeText(forbidden))) {
          return {
            isValid: false,
            reason: `Contém ${forbidden} (intolerância: ${intolerance})`,
            restriction: `intolerance_${intolerance}`,
          };
        }
      }
    }
  }
  
  // 3. Verificar preferência dietética
  const diet = restrictions.dietaryPreference;
  
  if (diet === 'vegana') {
    const allAnimal = [...ANIMAL_INGREDIENTS, ...DAIRY_AND_EGGS, ...FISH_INGREDIENTS];
    for (const animal of allAnimal) {
      if (normalizedFood.includes(normalizeText(animal))) {
        return {
          isValid: false,
          reason: `Contém ingrediente animal: ${animal}`,
          restriction: 'dietary_vegan',
        };
      }
    }
  } else if (diet === 'vegetariana') {
    const meatAndFish = [...ANIMAL_INGREDIENTS, ...FISH_INGREDIENTS];
    for (const item of meatAndFish) {
      if (normalizedFood.includes(normalizeText(item))) {
        return {
          isValid: false,
          reason: `Contém carne/peixe: ${item}`,
          restriction: 'dietary_vegetarian',
        };
      }
    }
  } else if (diet === 'pescetariana') {
    for (const meat of ANIMAL_INGREDIENTS) {
      if (normalizedFood.includes(normalizeText(meat))) {
        return {
          isValid: false,
          reason: `Contém carne: ${meat}`,
          restriction: 'dietary_pescatarian',
        };
      }
    }
  }
  
  return { isValid: true };
}

// ============= FETCH INTOLERANCE MAPPINGS =============
// deno-lint-ignore no-explicit-any
export async function fetchIntoleranceMappings(supabaseClient: any): Promise<{
  mappings: IntoleranceMapping[];
  safeKeywords: SafeKeyword[];
}> {
  const [mappingsResult, safeKeywordsResult] = await Promise.all([
    supabaseClient.from('intolerance_mappings').select('ingredient, intolerance_key'),
    supabaseClient.from('intolerance_safe_keywords').select('keyword, intolerance_key'),
  ]);

  return {
    mappings: mappingsResult.data || [],
    safeKeywords: safeKeywordsResult.data || [],
  };
}

// ============= RESTRICTION TEXT BUILDER (17 INTOLERANCES) =============
export function getRestrictionText(
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  },
  language: string,
  shouldAddSugarQualifier: boolean = false
): string {
  const isSpanish = language.startsWith('es');
  const isFrench = language.startsWith('fr');
  const isGerman = language.startsWith('de');
  const isItalian = language.startsWith('it');
  const isPortuguese = language.startsWith('pt');

  let langKey = 'en';
  if (isSpanish) langKey = 'es';
  else if (isFrench) langKey = 'fr';
  else if (isGerman) langKey = 'de';
  else if (isItalian) langKey = 'it';
  else if (isPortuguese) langKey = 'pt';

  const parts: string[] = [];

  // Dietary preferences mapping
  const dietaryMap: Record<string, Record<string, string>> = {
    pt: {
      'comum': 'Onívoro - todos os alimentos permitidos',
      'vegetariana': 'VEGETARIANO - SEM carnes',
      'vegana': 'VEGANO - SEM carnes, ovos, laticínios',
      'low_carb': 'LOW CARB - evitar arroz, pão, massa',
      'pescetariana': 'PESCETARIANO - SEM carnes vermelhas, apenas peixe',
      'cetogenica': 'CETOGÊNICO - muito baixo em carboidratos',
      'flexitariana': 'FLEXITARIANO - predominantemente vegetariano',
    },
    en: {
      'comum': 'Omnivore - all foods allowed',
      'vegetariana': 'VEGETARIAN - NO meat',
      'vegana': 'VEGAN - NO meat, eggs, dairy',
      'low_carb': 'LOW CARB - avoid rice, bread, pasta',
      'pescetariana': 'PESCATARIAN - NO red meat, only fish',
      'cetogenica': 'KETOGENIC - very low carbs',
      'flexitariana': 'FLEXITARIAN - mostly vegetarian',
    },
    es: {
      'comum': 'Omnívoro - todos los alimentos permitidos',
      'vegetariana': 'VEGETARIANO - SIN carnes',
      'vegana': 'VEGANO - SIN carnes, huevos, lácteos',
      'low_carb': 'LOW CARB - evitar arroz, pan, pasta',
      'pescetariana': 'PESCETARIANO - SIN carnes rojas, solo pescado',
      'cetogenica': 'CETOGÉNICO - muy bajo en carbohidratos',
      'flexitariana': 'FLEXITARIANO - mayormente vegetariano',
    },
    fr: {
      'comum': 'Omnivore - tous les aliments autorisés',
      'vegetariana': 'VÉGÉTARIEN - SANS viande',
      'vegana': 'VÉGAN - SANS viande, œufs, produits laitiers',
      'low_carb': 'LOW CARB - éviter riz, pain, pâtes',
      'pescetariana': 'PESCÉTARIEN - SANS viande rouge, seulement poisson',
      'cetogenica': 'CÉTOGÈNE - très faible en glucides',
      'flexitariana': 'FLEXITARIEN - principalement végétarien',
    },
    de: {
      'comum': 'Omnivor - alle Lebensmittel erlaubt',
      'vegetariana': 'VEGETARISCH - OHNE Fleisch',
      'vegana': 'VEGAN - OHNE Fleisch, Eier, Milchprodukte',
      'low_carb': 'LOW CARB - Reis, Brot, Nudeln vermeiden',
      'pescetariana': 'PESCETARISCH - OHNE rotes Fleisch, nur Fisch',
      'cetogenica': 'KETOGEN - sehr wenig Kohlenhydrate',
      'flexitariana': 'FLEXITARISCH - überwiegend vegetarisch',
    },
    it: {
      'comum': 'Onnivoro - tutti gli alimenti consentiti',
      'vegetariana': 'VEGETARIANO - SENZA carne',
      'vegana': 'VEGANO - SENZA carne, uova, latticini',
      'low_carb': 'LOW CARB - evitare riso, pane, pasta',
      'pescetariana': 'PESCETARIANO - SENZA carne rossa, solo pesce',
      'cetogenica': 'CHETOGENICO - carboidrati molto bassi',
      'flexitariana': 'FLEXITARIANO - principalmente vegetariano',
    },
  };

  // Goal mapping
  const goalMap: Record<string, Record<string, string>> = {
    pt: {
      'emagrecer': 'OBJETIVO: Emagrecimento - priorizar proteínas magras e vegetais',
      'manter': 'OBJETIVO: Manutenção - dieta equilibrada',
      'ganhar_peso': 'OBJETIVO: Ganho de peso - incluir alimentos calóricos',
    },
    en: {
      'emagrecer': 'GOAL: Weight loss - prioritize lean proteins and vegetables',
      'manter': 'GOAL: Maintenance - balanced diet',
      'ganhar_peso': 'GOAL: Weight gain - include calorie-dense foods',
    },
    es: {
      'emagrecer': 'OBJETIVO: Pérdida de peso - priorizar proteínas magras y vegetales',
      'manter': 'OBJETIVO: Mantenimiento - dieta equilibrada',
      'ganhar_peso': 'OBJETIVO: Aumento de peso - incluir alimentos calóricos',
    },
    fr: {
      'emagrecer': 'OBJECTIF: Perte de poids - privilégier protéines maigres et légumes',
      'manter': 'OBJECTIF: Maintien - alimentation équilibrée',
      'ganhar_peso': 'OBJECTIF: Prise de poids - inclure aliments caloriques',
    },
    de: {
      'emagrecer': 'ZIEL: Gewichtsverlust - magere Proteine und Gemüse priorisieren',
      'manter': 'ZIEL: Erhaltung - ausgewogene Ernährung',
      'ganhar_peso': 'ZIEL: Gewichtszunahme - kalorienreiche Lebensmittel einbeziehen',
    },
    it: {
      'emagrecer': 'OBIETTIVO: Perdita di peso - privilegiare proteine magre e verdure',
      'manter': 'OBIETTIVO: Mantenimento - dieta equilibrata',
      'ganhar_peso': 'OBIETTIVO: Aumento di peso - includere cibi calorici',
    },
  };

  // Intolerances mapping (17 padronizadas)
  const intoleranceMap: Record<string, Record<string, string>> = {
    pt: {
      'lactose': 'SEM laticínios (leite, queijo, iogurte, manteiga)',
      'gluten': 'SEM glúten (trigo, massa, pão, cevada, centeio)',
      'amendoim': 'SEM amendoim e derivados',
      'frutos_do_mar': 'SEM frutos do mar (camarão, lagosta, caranguejo)',
      'peixe': 'SEM peixe',
      'ovos': 'SEM ovos',
      'soja': 'SEM soja (tofu, shoyu, leite de soja)',
      'sulfitos': 'SEM sulfitos (vinho, vinagre, frutas secas)',
      'castanhas': 'SEM castanhas e nozes (amêndoa, noz, avelã, castanha)',
      'sesamo': 'SEM gergelim/sésamo',
      'tremoco': 'SEM tremoço',
      'mostarda': 'SEM mostarda',
      'aipo': 'SEM aipo/salsão',
      'moluscos': 'SEM moluscos (ostra, mexilhão, lula, polvo)',
      'fodmap': 'SEM FODMAP (cebola, alho, maçã, trigo, mel)',
      'histamina': 'SEM histamina (queijo curado, vinho, embutidos)',
      'salicilatos': 'SEM salicilatos (tomate, pimentão, curry)',
      'niquel': 'SEM níquel (chocolate, aveia, lentilha)',
      'acucar': 'SEM açúcar (açúcar, mel, xarope, rapadura)',
      'acucar_diabetes': 'SEM açúcar (diabetes - controle glicêmico)',
      'acucar_insulina': 'SEM açúcar (resistência à insulina)',
      'cafeina': 'SEM cafeína',
      'milho': 'SEM milho',
      'leguminosas': 'SEM leguminosas (feijão, lentilha, grão de bico)',
    },
    en: {
      'lactose': 'NO dairy (milk, cheese, yogurt, butter)',
      'gluten': 'NO gluten (wheat, pasta, bread, barley, rye)',
      'amendoim': 'NO peanuts',
      'frutos_do_mar': 'NO shellfish (shrimp, lobster, crab)',
      'peixe': 'NO fish',
      'ovos': 'NO eggs',
      'soja': 'NO soy (tofu, soy sauce, soy milk)',
      'sulfitos': 'NO sulfites (wine, vinegar, dried fruits)',
      'castanhas': 'NO tree nuts (almonds, walnuts, hazelnuts)',
      'sesamo': 'NO sesame',
      'tremoco': 'NO lupin',
      'mostarda': 'NO mustard',
      'aipo': 'NO celery',
      'moluscos': 'NO mollusks (oysters, mussels, squid, octopus)',
      'fodmap': 'NO FODMAP (onion, garlic, apple, wheat, honey)',
      'histamina': 'NO histamine (aged cheese, wine, cured meats)',
      'salicilatos': 'NO salicylates (tomato, pepper, curry)',
      'niquel': 'NO nickel (chocolate, oats, lentils)',
      'acucar': 'NO sugar (sugar, honey, syrup)',
      'acucar_diabetes': 'NO sugar (diabetes - glycemic control)',
      'acucar_insulina': 'NO sugar (insulin resistance)',
      'cafeina': 'NO caffeine',
      'milho': 'NO corn',
      'leguminosas': 'NO legumes (beans, lentils, chickpeas)',
    },
    es: {
      'lactose': 'SIN lácteos',
      'gluten': 'SIN gluten',
      'amendoim': 'SIN maní/cacahuate',
      'frutos_do_mar': 'SIN mariscos',
      'peixe': 'SIN pescado',
      'ovos': 'SIN huevos',
      'soja': 'SIN soja',
      'sulfitos': 'SIN sulfitos',
      'castanhas': 'SIN frutos secos',
      'sesamo': 'SIN sésamo',
      'tremoco': 'SIN altramuz',
      'mostarda': 'SIN mostaza',
      'aipo': 'SIN apio',
      'moluscos': 'SIN moluscos',
      'fodmap': 'SIN FODMAP',
      'histamina': 'SIN histamina',
      'salicilatos': 'SIN salicilatos',
      'niquel': 'SIN níquel',
      'acucar': 'SIN azúcar',
      'acucar_diabetes': 'SIN azúcar (diabetes)',
      'acucar_insulina': 'SIN azúcar (insulina)',
      'cafeina': 'SIN cafeína',
      'milho': 'SIN maíz',
      'leguminosas': 'SIN legumbres',
    },
    fr: { 'lactose': 'SANS lactose', 'gluten': 'SANS gluten', 'amendoim': 'SANS arachides', 'frutos_do_mar': 'SANS fruits de mer', 'peixe': 'SANS poisson', 'ovos': 'SANS œufs', 'soja': 'SANS soja', 'sulfitos': 'SANS sulfites', 'castanhas': 'SANS fruits à coque', 'sesamo': 'SANS sésame', 'tremoco': 'SANS lupin', 'mostarda': 'SANS moutarde', 'aipo': 'SANS céleri', 'moluscos': 'SANS mollusques', 'fodmap': 'SANS FODMAP', 'histamina': 'SANS histamine', 'salicilatos': 'SANS salicylates', 'niquel': 'SANS nickel', 'acucar': 'SANS sucre', 'acucar_diabetes': 'SANS sucre (diabète)', 'acucar_insulina': 'SANS sucre (insuline)', 'cafeina': 'SANS caféine', 'milho': 'SANS maïs', 'leguminosas': 'SANS légumineuses' },
    de: { 'lactose': 'OHNE Laktose', 'gluten': 'OHNE Gluten', 'amendoim': 'OHNE Erdnüsse', 'frutos_do_mar': 'OHNE Meeresfrüchte', 'peixe': 'OHNE Fisch', 'ovos': 'OHNE Eier', 'soja': 'OHNE Soja', 'sulfitos': 'OHNE Sulfite', 'castanhas': 'OHNE Nüsse', 'sesamo': 'OHNE Sesam', 'tremoco': 'OHNE Lupinen', 'mostarda': 'OHNE Senf', 'aipo': 'OHNE Sellerie', 'moluscos': 'OHNE Weichtiere', 'fodmap': 'OHNE FODMAP', 'histamina': 'OHNE Histamin', 'salicilatos': 'OHNE Salicylate', 'niquel': 'OHNE Nickel', 'acucar': 'OHNE Zucker', 'acucar_diabetes': 'OHNE Zucker (Diabetes)', 'acucar_insulina': 'OHNE Zucker (Insulinresistenz)', 'cafeina': 'OHNE Koffein', 'milho': 'OHNE Mais', 'leguminosas': 'OHNE Hülsenfrüchte' },
    it: { 'lactose': 'SENZA lattosio', 'gluten': 'SENZA glutine', 'amendoim': 'SENZA arachidi', 'frutos_do_mar': 'SENZA frutti di mare', 'peixe': 'SENZA pesce', 'ovos': 'SENZA uova', 'soja': 'SENZA soia', 'sulfitos': 'SENZA solfiti', 'castanhas': 'SENZA frutta a guscio', 'sesamo': 'SENZA sesamo', 'tremoco': 'SENZA lupini', 'mostarda': 'SENZA senape', 'aipo': 'SENZA sedano', 'moluscos': 'SENZA molluschi', 'fodmap': 'SENZA FODMAP', 'histamina': 'SENZA istamina', 'salicilatos': 'SENZA salicilati', 'niquel': 'SENZA nichel', 'acucar': 'SENZA zucchero', 'acucar_diabetes': 'SENZA zucchero (diabete)', 'acucar_insulina': 'SENZA zucchero (insulina)', 'cafeina': 'SENZA caffeina', 'milho': 'SENZA mais', 'leguminosas': 'SENZA legumi' },
  };

  // Build parts
  const dietMap = dietaryMap[langKey] || dietaryMap['en'];
  const goalMapLang = goalMap[langKey] || goalMap['en'];
  const intMap = intoleranceMap[langKey] || intoleranceMap['en'];

  parts.push(dietMap[restrictions.dietaryPreference] || dietMap['comum']);
  parts.push(goalMapLang[restrictions.goal] || goalMapLang['manter']);

  if (restrictions.intolerances.length > 0) {
    const intoleranceTexts = restrictions.intolerances
      .map(i => intMap[i] || `NO ${i}`)
      .join('\n');
    parts.push(intoleranceTexts);
  }

  if (restrictions.excludedIngredients.length > 0) {
    const excludedLabel = isPortuguese ? 'EVITAR (preferência pessoal):' : 
                          isSpanish ? 'EVITAR:' : 
                          isFrench ? 'ÉVITER:' : 
                          isGerman ? 'VERMEIDEN:' : 
                          isItalian ? 'EVITARE:' : 'AVOID:';
    parts.push(`${excludedLabel} ${restrictions.excludedIngredients.join(', ')}`);
  }

  // Regra de qualificadores de bebidas
  if (shouldAddSugarQualifier) {
    const sugarQualifierText = isPortuguese ? `
⚠️ REGRA DE QUALIFICADORES DE BEBIDAS:
- Adicionar "(sem açúcar)" a chás, cafés e sucos
- Exemplo: "1 copo de suco de laranja (sem açúcar)"` :
    isSpanish ? `
⚠️ REGLA DE CALIFICADORES DE BEBIDAS:
- Añadir "(sin azúcar)" a tés, cafés y jugos` :
    `
⚠️ BEVERAGE QUALIFIER RULE:
- Add "(no sugar)" to teas, coffees and juices`;
    parts.push(sugarQualifierText);
  }

  return parts.join('\n');
}

// ============= PROMPT RULES (SHARED FORMAT) =============
export function getMealPromptRules(language: string = 'pt-BR'): string {
  const isPortuguese = language.startsWith('pt');
  const isSpanish = language.startsWith('es');

  if (isPortuguese) {
    return `
📐 FORMATO DOS ALIMENTOS (foods):
Cada item: {"name": "QUANTIDADE + ALIMENTO", "grams": NÚMERO}
- O campo "name" DEVE incluir APENAS medida caseira qualitativa (NUNCA números de gramas)
- O campo "grams" DEVE ser um NÚMERO PURO (sem "g"): 120, 150, 100

🚫 REGRA ANTI-DUPLICAÇÃO DE GRAMAGEM (CRÍTICO):
- NUNCA inclua números de gramas no campo "name" - a gramagem já aparece no campo "grams"
- ERRADO: "100g de atum em conserva" ❌
- CERTO: "1 porção de atum em conserva" ✓

🍳 REGRA DE COMPLETUDE CULINÁRIA (CRÍTICO):
- Gere refeições PRONTAS e COMPLETAS, não ingredientes isolados
- ERRADO: "3 claras de ovo" (ingrediente cru) ❌
- CERTO: "Omelete de claras com ervas" ✓
- ERRADO: "2 fatias de pão" (incompleto) ❌
- CERTO: "Sanduíche de pão integral com queijo e tomate" ✓
- ERRADO: "Ovos cozidos" (ingrediente isolado) ❌
- CERTO: "Salada com ovos cozidos e vegetais" ✓

🌙 REGRA DE ADEQUAÇÃO POR TIPO DE REFEIÇÃO (CRÍTICO):
**CEIA (lanche noturno) - REGRAS ESTRITAS:**
- Deve ser ULTRA-LEVE e de fácil digestão
- ALIMENTOS PROIBIDOS PARA CEIA:
  * Ovos em qualquer forma (cozidos, mexidos, omelete, etc.)
  * Carnes (frango, carne bovina, peixe, etc.)
  * Frituras ou alimentos gordurosos
  * Refeições pesadas ou completas
- ALIMENTOS PERMITIDOS PARA CEIA:
  * Chás (camomila, erva-doce, hortelã)
  * Iogurtes naturais ou light
  * Frutas leves (maçã, pera, banana)
  * Torradas ou biscoitos integrais
  * Mingaus leves (aveia, tapioca)
  * Queijos leves em pequena quantidade
  * Leite morno ou bebidas vegetais
- Exemplos CORRETOS: "Chá de camomila com 2 torradas integrais", "Iogurte natural com mel", "Mingau de aveia com canela", "Maçã com canela"
- Exemplos ERRADOS: "Ovos cozidos" ❌, "Omelete" ❌, "Ovos de codorna" ❌, "Frango desfiado" ❌
**LANCHES (manhã/tarde):**
- Opções práticas e nutritivas
- Exemplos: "Mix de castanhas com frutas secas", "Iogurte com granola", "Sanduíche natural de atum"
**REFEIÇÕES PRINCIPAIS (café, almoço, jantar):**
- Refeições completas e equilibradas
- Incluir proteína + carboidrato + vegetais quando apropriado

🥪 REGRA DE ALIMENTOS-VEÍCULO (wraps, pães, tortillas):
- Wraps, pães e tortillas são "veículos" que PRECISAM de recheio
- SEMPRE apresentar como item COMPOSTO incluindo o recheio principal
- ERRADO: listar "1 wrap integral" separado do recheio ❌
- CERTO: "1 wrap integral recheado com atum e alface" ✓

⚠️ REGRA DE MEDIDAS CASEIRAS (OBRIGATÓRIO):
- LÍQUIDOS (água, sucos, chás, leite): usar "xícara", "copo", "ml"
- PROTEÍNAS (carnes, peixes, frango): usar "filé", "pedaço", "porção"
- OVOS: usar "unidade" (ex: "2 ovos cozidos")
- GRÃOS/ARROZ/MASSAS: usar "colher de sopa", "colher de servir", "porção"
- VEGETAIS SÓLIDOS: usar "porção", "folhas", "floretes" (NUNCA "xícara")
- FRUTAS: usar "unidade" + tamaho (ex: "1 banana média")

Exemplos CORRETOS:
{"name": "1 filé médio de frango grelhado", "grams": 120}
{"name": "2 colheres de sopa de arroz integral", "grams": 150}
{"name": "1 porção de brócolis cozido", "grams": 100}
{"name": "1 banana média", "grams": 120}
{"name": "1 wrap integral recheado com atum e alface", "grams": 200}
{"name": "Chá de camomila com 2 torradas integrais", "grams": 250}

🔴 REGRA DE CONSISTÊNCIA NOME-INGREDIENTES:
O campo "title" DEVE ser um nome descritivo que reflete os ingredientes (ex: "Frango grelhado com arroz e salada")
NUNCA use nomes genéricos como "Opção 1", "Opção 2", etc.`;
  }

  if (isSpanish) {
    return `
📐 FORMATO DE ALIMENTOS (foods):
Cada item: {"name": "CANTIDAD + ALIMENTO", "grams": NÚMERO}
- El campo "name" DEBE incluir SOLO medida casera cualitativa (NUNCA números de gramos)
- El campo "grams" DEBE ser un NÚMERO PURO (sin "g"): 120, 150, 100

🚫 REGLA ANTI-DUPLICACIÓN DE GRAMAJE (CRÍTICO):
- NUNCA incluya números de gramos en el campo "name"
- INCORRECTO: "100g de atún en conserva" ❌
- CORRECTO: "1 porción de atún en conserva" ✓

⚠️ REGLA DE MEDIDAS CASERAS (OBLIGATORIO):
- LÍQUIDOS: usar "taza", "vaso", "ml"
- PROTEÍNAS: usar "filete", "porción"
- HUEVOS: usar "unidad" (ej: "2 huevos cocidos")
- GRANOS/ARROZ: usar "cucharada", "porción"
- VEGETALES SÓLIDOS: usar "porción", "hojas" (NUNCA "taza")
- FRUTAS: usar "unidad" + tamaño (ej: "1 plátano mediano")`;
  }

  // English default
  return `
📐 FOOD FORMAT (foods):
Each item: {"name": "QUANTITY + FOOD", "grams": NUMBER}
- The "name" field MUST include ONLY qualitative household measure (NEVER gram numbers)
- The "grams" field MUST be a PURE NUMBER (no "g"): 120, 150, 100

🚫 ANTI-GRAM DUPLICATION RULE (CRITICAL):
- NEVER include gram numbers in the "name" field
- WRONG: "100g of canned tuna" ❌
- CORRECT: "1 portion of canned tuna" ✓

⚠️ HOUSEHOLD MEASURE RULE (MANDATORY):
- LIQUIDS: use "cup", "glass", "ml"
- PROTEINS: use "fillet", "portion"
- EGGS: use "unit" (e.g.: "2 boiled eggs")
- GRAINS/RICE: use "tablespoon", "portion"
- SOLID VEGETABLES: use "portion", "leaves" (NEVER "cup")
- FRUITS: use "unit" + size (e.g.: "1 medium banana")`;
}

// ============= HELPER: CHECK IF SHOULD ADD SUGAR QUALIFIER =============
export function shouldAddSugarQualifier(
  intolerances: string[],
  strategyKey?: string,
  dietaryPreference?: string
): boolean {
  const hasSugarRestriction = intolerances.some((i: string) => 
    i.includes('acucar') || i === 'acucar_diabetes' || i === 'acucar_insulina'
  );
  const hasWeightLossStrategy = strategyKey === 'emagrecimento' || strategyKey === 'cutting';
  const hasKetoStrategy = dietaryPreference === 'cetogenica';
  
  return hasSugarRestriction || hasWeightLossStrategy || hasKetoStrategy;
}

// ============= MEAL POOL - 540 REFEIÇÕES PROFISSIONAIS =============
// Pool completo de refeições por estratégia e tipo de refeição
// 6 estratégias × 6 tipos de refeição × 15 opções = 540 refeições únicas

export interface MealPoolItem {
  name: string;
  strategy: string;
  mealType: string;
}

export const STRATEGY_MEAL_POOL: Record<string, Record<string, string[]>> = {
  // ============= EMAGRECIMENTO (90 itens) =============
  'emagrecer': {
    'cafe_manha': [
      'Crepioca de grão-de-bico com cream cheese light, tomate seco e manjericão',
      'Mingau de amaranto com canela, maçã ralada e essência de baunilha',
      'Pão de fermentação natural com ricota batida, rúcula e tomate',
      'Omelete de claras com espinafre, cogumelos paris e queijo cottage',
      'Vitamina verde detox (couve, limão, gengibre, maçã verde e água de coco)',
      'Panqueca de aveia com banana amassada e pasta de amendoim em pó (PB2)',
      'Wrap de ovo mexido com champignon, pimentão e orégano',
      'Iogurte grego desnatado com mix de berries, chia e essência de baunilha',
      'Torrada integral com patê de atum light, pepino fatiado e endro',
      'Smoothie de mamão com hortelã, gengibre e semente de linhaça',
      'Tapioca com frango desfiado temperado e tomate cereja',
      'Cuscuz marroquino com legumes refogados e temperos árabes',
      'Overnight oats com leite desnatado, canela, maçã e nozes picadas',
      'Waffle proteico de claras com geleia de frutas vermelhas sem açúcar',
      'Crepe de espinafre recheado com ricota e tomate seco',
    ],
    'lanche_manha': [
      'Maçã verde com casca fatiada e canela',
      'Mix de morangos frescos com limão',
      'Cenoura baby com homus de grão-de-bico caseiro',
      'Pêra williams inteira',
      'Melão cantalupo em cubos com hortelã',
      'Tomates cereja com manjericão fresco',
      'Pepino japonês fatiado com vinagre de arroz e gergelim',
      'Rabanete fatiado com limão e sal rosa',
      'Kiwi gold inteiro',
      'Água de coco natural gelada',
      'Chá verde com gengibre e limão (gelado)',
      'Ameixa vermelha fresca',
      'Espargos grelhados com limão',
      'Aipo em palitos com pasta de tahine light',
      'Palmito em conserva com azeite de oliva extravirgem',
    ],
    'almoco': [
      'Peito de frango grelhado com quinoa tricolor, brócolis ao vapor e molho de iogurte',
      'Filé de tilápia assado com purê de couve-flor, vagem refogada e limão siciliano',
      'Lombo suíno magro com batata-doce assada, couve refogada e vinagrete',
      'Salmão selvagem grelhado com aspargos, tomate cereja e azeite de oliva',
      'Iscas de contrafilé bovino com abobrinha italiana grelhada e salada verde',
      'Linguado ao molho de ervas com espinafre refogado e berinjela grelhada',
      'Medalhão de filé mignon com cogumelos shitake, rúcula e tomate',
      'Peito de peru artesanal com cuscuz marroquino, cenoura glaceada e agrião',
      'Camarão cinza salteado com abobrinha espaguete, alho e pimenta calabresa',
      'Sobrecoxa desossada com arroz integral, feijão preto e couve manteiga',
      'Merluza ao vapor com purê de abóbora cabotiá e espinafre baby',
      'Frango ao curry light com arroz de couve-flor e cenoura julienne',
      'Hambúrguer de grão-de-bico com salada completa e molho tahine',
      'Carne moída extra magra refogada com berinjela, tomate e pimentão',
      'Peixe-espada grelhado com legumes mediterrâneos assados',
    ],
    'lanche_tarde': [
      'Bebida de amêndoas sem açúcar com cacau em pó',
      'Gelatina diet com pedaços de frutas vermelhas',
      'Chips de couve assada com azeite e páprica defumada',
      'Chá de hibisco gelado com limão e hortelã',
      'Pepino recheado com cottage temperado',
      'Melancia em cubos com hortelã fresca',
      'Palitos de cenoura com guacamole light',
      'Shake de whey protein isolado sabor baunilha',
      'Tofu defumado em cubos com shoyu light',
      'Suco verde de couve, abacaxi, gengibre e limão',
      'Iogurte natural desnatado com canela',
      'Wrap de alface com peito de peru defumado',
      'Edamame cozido com flor de sal',
      'Queijo cottage batido com tomate picado e manjericão',
      'Mousse de maracujá com adoçante e gelatina incolor',
    ],
    'jantar': [
      'Omelete de claras recheada com cogumelos, espinafre e queijo branco',
      'Sopa cremosa de abóbora com gengibre, cúrcuma e leite de coco',
      'Filé de robalo grelhado com salada caesar light (sem croutons)',
      'Camarão ao alho com macarrão de abobrinha e molho de tomate caseiro',
      'Peito de frango desfiado com creme de espinafre e champignon',
      'Salada completa com atum, grão-de-bico, rúcula, tomate e quinoa',
      'Merluza ao forno com legumes assados (abobrinha, berinjela, pimentão)',
      'Caldo verde detox com couve, batata-doce, alho-poró e linguiça de frango magra',
      'Wrap de alface romana com carne moída magra, tomate e pepino',
      'Sopa de lentilha com cenoura, aipo, cebola e temperos naturais',
      'Tilápia grelhada com purê de mandioquinha e couve-flor',
      'Stir-fry de frango com brócolis, pimentão e molho shoyu light',
      'Salada morna de salmão com mix de folhas e vinagrete balsâmico',
      'Berinjela recheada com carne moída, tomate e queijo light gratinado',
      'Peixe ao molho de limão com alcaparras e aspargos grelhados',
    ],
    'ceia': [
      'Pudim de chia com leite de coco e essência de baunilha',
      'Chá de camomila com erva-doce e mel (1 colher café)',
      'Leite de amêndoas morno com canela em pau',
      'Maçã assada com canela, cravo e um fio de mel',
      'Kefir de água natural gelado',
      'Infusão de melissa com hortelã',
      'Gelatina proteica sabor limão',
      'Iogurte grego light com raspas de limão',
      'Chá de mulungu com valeriana',
      'Psyllium em pó dissolvido em água com limão',
      'Bebida vegetal de coco sem açúcar morna',
      'Shot de gengibre com cúrcuma e limão',
      'Água aromatizada com pepino, limão e hortelã',
      'Chá branco gelado com frutas vermelhas',
      'Caldo de legumes light caseiro',
    ],
  },

  // ============= CUTTING EXTREMO (90 itens) =============
  'cutting': {
    'cafe_manha': [
      'Omelete de 4 claras com espinafre, cogumelos e queijo cottage',
      'Tofu firme grelhado com cúrcuma, pimenta preta e rúcula',
      'Salmão defumado com cream cheese light, alcaparras e endro',
      'Shake de whey isolado com água, canela e café expresso',
      'Peito de peru artesanal fatiado com agrião e tomate',
      'Rosbife magro com mostarda dijon e pepino',
      'Ovos mexidos com claras extras, espinafre e pimenta calabresa',
      'Carpaccio de filé mignon com rúcula, parmesão ralado e limão',
      'Patê de atum com aipo, cebola roxa e limão',
      'Frango desfiado frio com curry em pó e iogurte grego',
      'Queijo cottage batido com cacau em pó 100% e adoçante',
      'Wrap de alface com ovos cozidos e mostarda',
      'Mousse de abacate com cacau, adoçante e raspas de limão',
      'Bifes de filé mignon grelhados com chimichurri caseiro',
      'Sardinha em água com limão, cebola roxa e azeite',
    ],
    'lanche_manha': [
      'Pepino japonês inteiro com flor de sal',
      'Aipo em palitos com limão',
      'Rabanete fatiado com vinagre de maçã',
      'Aspargos crus com sal rosa',
      'Endívia com mostarda dijon',
      'Palmito natural em lança',
      'Tomate seco ao sol (4 unidades)',
      'Azeitonas kalamata (8 unidades)',
      'Picles de pepino caseiro',
      'Morangos frescos (6 unidades)',
      'Couve-flor crua com páprica',
      'Pimentão verde em tiras',
      'Nori (alga) desidratada',
      'Cogumelos champignon crus fatiados',
      'Brócolis cru com limão',
    ],
    'almoco': [
      'Filé de contrafilé grelhado com brócolis, couve-flor e espinafre refogados',
      'Peito de frango ao curry com abobrinha grelhada e rúcula',
      'Salmão selvagem com aspargos grelhados e manteiga ghee',
      'Lombo suíno magro com repolho roxo refogado e mostarda',
      'Bife de alcatra com cogumelos salteados e mix de folhas verdes',
      'Linguado grelhado com espinafre baby e azeite extravirgem',
      'Camarão salteado no alho com abobrinha espaguete ao pesto',
      'Atum selado com crosta de gergelim, rúcula e wasabi',
      'Coelho assado com ervas finas, couve manteiga e limão',
      'Filé mignon com molho de cogumelos shimeji e brócolis',
      'Frango desossado grelhado com pimentões coloridos e orégano',
      'Lula grelhada com alho, limão, escarola e pimenta',
      'Costela bovina magra desfiada com repolho e vinagre',
      'Truta salmonada com endro, limão siciliano e aspargos',
      'Codorna assada com alecrim, couve-flor e alho assado',
    ],
    'lanche_tarde': [
      'Shake de whey isolado com água e gelo',
      'Atum em água (1 lata) com limão',
      'Peito de peru fatiado (100g) com mostarda',
      'Queijo cottage (4 colheres) com orégano',
      'Tofu firme em cubos com shoyu',
      'Sardinha em água com pimenta calabresa',
      'Frango desfiado frio com curry',
      'Kefir natural puro (200ml)',
      'Caldo de ossos com sal e pimenta',
      'Gelatina proteica zero açúcar',
      'Camarão cozido (10 unidades) com limão',
      'Ovos cozidos (2 claras + 1 gema)',
      'Omelete de claras simples',
      'Queijo minas frescal light (50g)',
      'Shake de caseína micelar',
    ],
    'jantar': [
      'Merluza ao vapor com aspargos grelhados e azeite de oliva',
      'Frango grelhado com couve-flor gratinada (queijo light)',
      'Bife de contrafilé com espinafre refogado no alho',
      'Camarão ao alho com purê de couve-flor',
      'Peixe-espada grelhado com rúcula e tomate cereja',
      'Lombo suíno com repolho roxo refogado ao vinagre',
      'Sardinha assada com agrião, limão e cebola roxa',
      'Polvo grelhado com alface americana e azeite',
      'Vitela grelhada com brócolis ninja e molho de mostarda',
      'Truta ao vapor com endro, limão e espinafre',
      'Hambúrguer de frango (sem pão) com salada verde',
      'Filé de tilápia com legumes grelhados',
      'Omelete caprese com tomate, manjericão e mussarela light',
      'Carne moída refogada com berinjela e tomate',
      'Sopa de legumes com frango desfiado',
    ],
    'ceia': [
      'Chá de camomila com psyllium (1 colher)',
      'Caldo de legumes puro (sem batata)',
      'Chá de hortelã com gengibre',
      'Água morna com limão e vinagre de maçã',
      'Shake de caseína micelar com água',
      'Chá de gengibre com canela',
      'Caldo de ossos caseiro',
      'Chá de boldo com erva-doce',
      'Infusão de ervas calmantes (melissa, passiflora)',
      'Gelatina zero com limão',
      'Chá verde descafeinado',
      'Água com eletrólitos (sem calorias)',
      'Shot de vinagre de maçã diluído',
      'Chá de hibisco gelado',
      'Suplemento de magnésio em água',
    ],
  },

  // ============= MANUTENÇÃO (90 itens) =============
  'manter': {
    'cafe_manha': [
      'Pão de fermentação natural com homus de beterraba e rúcula',
      'Cuscuz nordestino com queijo coalho, ovo e manteiga ghee',
      'Vitamina de abacate com cacau, banana e leite de coco',
      'Torrada de centeio com pasta de castanha de caju e geleia de amora',
      'Mingau de fubá com leite integral, canela e raspas de laranja',
      'Panqueca americana com frutas vermelhas e mel puro',
      'Pão sírio integral com labne, pepino, tomate e zaatar',
      'Granola artesanal com iogurte integral, banana e mel',
      'Croissant integral com queijo brie e geleia de figo',
      'Muffin de milho com manteiga de garrafa',
      'Bowl de açaí com granola, banana, morango e pasta de amendoim',
      'Omelete completa com queijo, tomate, cebola e orégano',
      'Tapioca recheada com queijo coalho e coco ralado',
      'Waffle integral com iogurte grego, frutas e maple syrup',
      'Shakshuka (ovos em molho de tomate) com pão pita',
    ],
    'lanche_manha': [
      'Mamão papaia com semente de linhaça dourada',
      'Mix de nuts (castanha do pará, amêndoas, nozes) - 30g',
      'Damasco seco turco (6 unidades)',
      'Castanha de caju torrada (25g)',
      'Laranja pera inteira com bagaço',
      'Tangerina ponkan (2 unidades)',
      'Figo roxo fresco (3 unidades)',
      'Amêndoas torradas com sal rosa (20g)',
      'Coco fresco em lascas',
      'Romã em grãos com limão',
      'Banana prata com pasta de amendoim integral',
      'Tâmaras medjool recheadas com amêndoas (3 unidades)',
      'Uvas itália (1 xícara)',
      'Abacaxi pérola em cubos com hortelã',
      'Mix de frutas vermelhas congeladas',
    ],
    'almoco': [
      'Sobrecoxa de frango assada com batata inglesa rústica, salada verde e molho de mostarda',
      'Carne de panela com mandioca, cenoura, couve refogada e arroz branco',
      'Tilápia assada com crosta de ervas, arroz de coco e salada tropical',
      'Feijoada leve com couve, laranja, farofa e arroz',
      'Macarrão penne integral ao molho de tomate fresco com frango e manjericão',
      'Moqueca baiana de peixe com dendê, leite de coco, arroz branco e pirão',
      'Carne moída refogada com purê de mandioquinha, cenoura e vagem',
      'Frango ao curry tailandês com arroz basmati e legumes salteados',
      'Escondidinho de carne seca com purê de abóbora e queijo gratinado',
      'Galinhada caipira com açafrão, arroz integral e couve',
      'Strogonoff de carne com arroz branco, batata palha e salada',
      'Lasanha de berinjela com molho bolonhesa e queijos',
      'Yakisoba de frango com legumes coloridos e molho shoyu',
      'Risoto de limão siciliano com camarão e parmesão',
      'Bobó de camarão com arroz branco e farofa de dendê',
    ],
    'lanche_tarde': [
      'Coalhada seca com mel e granola',
      'Pão de queijo mineiro artesanal (3 unidades médias)',
      'Bolo de milho verde cremoso (fatia de 80g)',
      'Suco de laranja pera natural coado (300ml)',
      'Sanduíche natural de queijo branco, cenoura ralada e alface',
      'Vitamina de manga com leite integral e aveia',
      'Pipoca de panela com óleo de coco e sal (3 xícaras)',
      'Biscoito de polvilho doce (6 unidades)',
      'Tapioca com coco ralado e leite condensado',
      'Cajuzinho fit com castanha de caju',
      'Smoothie de frutas vermelhas com iogurte',
      'Sanduíche de pasta de amendoim com banana',
      'Queijo minas com goiabada cascão',
      'Bolo de cenoura com cobertura de chocolate (fatia)',
      'Wrap de atum com cream cheese',
    ],
    'jantar': [
      'Espaguete de abobrinha com camarão ao molho de tomate fresco e manjericão',
      'Risoto de cogumelos frescos com parmesão e vinho branco',
      'Sopa de legumes com cubos de carne, macarrão e coentro',
      'Omelete francesa de queijo gruyère com salada verde',
      'Panqueca de espinafre recheada com ricota e molho branco',
      'Wrap integral de atum, alface, tomate e milho',
      'Pizza de frigideira com molho de tomate, mussarela e manjericão',
      'Lasanha de berinjela com ricota, espinafre e molho de tomate',
      'Caldo verde português com linguiça calabresa, couve e batata',
      'Sanduíche natural de frango, cream cheese, cenoura e alface',
      'Quiche de alho-poró com queijo gruyère',
      'Macarrão à carbonara light com bacon de peru',
      'Peixe grelhado com legumes assados no azeite',
      'Hambúrguer caseiro com salada completa',
      'Sopa creme de abóbora com croutons e sementes',
    ],
    'ceia': [
      'Leite vegetal de coco morno com canela',
      'Vitamina de maçã verde com aveia e mel',
      'Chá de ervas com biscoito integral (2 unidades)',
      'Mingau leve de aveia com leite desnatado',
      'Salada de frutas com creme de iogurte natural',
      'Leite morno com mel puro e essência de baunilha',
      'Iogurte grego natural com mel e nozes',
      'Aveia overnight com leite de amêndoas e frutas',
      'Queijo branco (50g) com geleia de frutas vermelhas',
      'Chá de camomila com biscoito de aveia',
      'Pudim de tapioca com leite de coco',
      'Mingau de chia com cacau',
      'Banana assada com canela e mel',
      'Leite dourado (golden milk) com cúrcuma',
      'Mousse de maracujá light',
    ],
  },

  // ============= FITNESS / PERFORMANCE (90 itens) =============
  'fitness': {
    'cafe_manha': [
      'Panqueca proteica de aveia com mel, banana e pasta de amendoim',
      'Bowl de açaí proteico com whey, granola, banana e frutas vermelhas',
      'Omelete de 3 ovos inteiros com espinafre, queijo e tomate',
      'Vitamina de morango com whey, aveia, banana e leite integral',
      'Wrap integral com frango desfiado, abacate, tomate e alface',
      'Mingau de quinoa com leite, canela, banana e mel',
      'Sanduíche de pão integral com pasta de amendoim, banana e mel',
      'Crepe proteico recheado com ricota, morango e mel',
      'Bowl de iogurte grego com granola, frutas, mel e castanhas',
      'Torrada integral com ovo poché, abacate amassado e tomate',
      'French toast proteico com frutas vermelhas e maple syrup',
      'Tapioca recheada com frango, queijo e tomate',
      'Smoothie bowl com açaí, proteína, granola e frutas',
      'Ovos mexidos com queijo, presunto de peru e pão integral',
      'Panqueca de banana com aveia, ovos e canela',
    ],
    'lanche_manha': [
      'Uvas vermelhas (1 xícara) com mix de castanhas',
      'Banana prata com 1 colher de pasta de amêndoas',
      'Mix de castanhas variadas (40g)',
      'Shake pré-treino com maltodextrina e BCAA',
      'Barra de proteína (20g proteína)',
      'Frutas vermelhas congeladas (1 xícara) com iogurte',
      'Sanduíche de peito de peru com queijo branco',
      'Batata-doce assada (150g) com canela',
      'Smoothie energético de banana, aveia e mel',
      'Iogurte grego com mel e granola',
      'Tapioca simples com geleia de frutas',
      'Pão integral com geleia e queijo cottage',
      'Vitamina de banana com aveia',
      'Biscoito de arroz (4 unidades) com pasta de amendoim',
      'Maçã com amêndoas (20g)',
    ],
    'almoco': [
      'Alcatra grelhada (180g) com quinoa vermelha, batata-doce assada e mix de folhas',
      'Peito de frango grelhado (200g) com arroz integral, batata-doce e brócolis',
      'Salmão grelhado (180g) com arroz integral, aspargos e molho de limão',
      'Carne magra (150g) com macarrão integral ao molho de tomate e salada',
      'Filé de tilápia (200g) com purê de inhame, vagem e cenoura',
      'Bowl fitness: arroz integral, frango, batata-doce, ovo, abacate e salada',
      'Wrap de carne moída magra com arroz, feijão preto e vegetais',
      'Risoto integral com frango desfiado, cogumelos e parmesão',
      'Hambúrguer caseiro de patinho (150g) com pão integral e salada completa',
      'Omelete reforçada (4 ovos) com queijo, presunto, arroz e salada',
      'Macarrão integral com almôndegas de carne magra e molho de tomate',
      'Frango xadrez com legumes coloridos e arroz integral',
      'Carne de panela magra com mandioca, cenoura e salada',
      'Peixe assado com arroz de couve-flor, quinoa e legumes',
      'Strogonoff de frango light com arroz integral e batata palha',
    ],
    'lanche_tarde': [
      'Bebida láctea proteica (300ml) com banana',
      'Shake pós-treino: whey isolado, dextrose, creatina e glutamina',
      'Sanduíche de atum com pão integral, alface e tomate',
      'Batata-doce assada (200g) com canela e mel',
      'Iogurte proteico (170g) com granola e frutas',
      'Banana amassada com 1 scoop de whey e aveia',
      'Panqueca proteica simples com geleia',
      'Tapioca com frango desfiado e queijo branco',
      'Vitamina calórica: leite integral, banana, aveia, whey e pasta de amendoim',
      'Mix de nuts e frutas secas (50g)',
      'Wrap de frango com queijo e vegetais',
      'Pão integral com atum, queijo cottage e tomate',
      'Vitamina de açaí com whey e banana',
      'Crepioca proteica recheada com frango',
      'Mingau de aveia com whey, banana e canela',
    ],
    'jantar': [
      'Filé de truta grelhado (180g) com mandioquinha cozida, brócolis e cenoura',
      'Peito de frango (180g) com arroz integral, feijão e legumes refogados',
      'Carne magra grelhada com purê de batata-doce e salada verde',
      'Peixe assado com quinoa tricolor, aspargos e tomate',
      'Omelete completa (3 ovos) com queijo, presunto, arroz e salada',
      'Macarrão integral com frango desfiado ao molho de tomate',
      'Bowl balanceado: arroz, feijão, carne moída magra, ovo e salada',
      'Risoto de camarão com arroz integral e legumes',
      'Strogonoff fit de frango com arroz integral',
      'Hambúrguer artesanal (150g) com batata-doce assada e salada',
      'Salmão com arroz integral, brócolis e cenoura',
      'Frango ao curry com arroz basmati e legumes',
      'Carne de panela com purê de mandioquinha',
      'Tilápia com quinoa e legumes grelhados',
      'Lasanha proteica de frango com queijo',
    ],
    'ceia': [
      'Kefir natural (200ml) com mel',
      'Shake de caseína micelar com leite desnatado',
      'Iogurte grego (170g) com mel e canela',
      'Queijo cottage (150g) com frutas vermelhas',
      'Shake noturno: caseína, leite de amêndoas e cacau',
      'Vitamina de caseína com banana e aveia',
      'Leite integral (300ml) com whey e canela',
      'Aveia overnight com proteína e frutas',
      'Mix de sementes (chia, linhaça, girassol) com iogurte',
      'Ricota (100g) com mel e nozes',
      'Pudim de chia com proteína e frutas',
      'Mingau de aveia com caseína',
      'Queijo branco com geleia de frutas vermelhas',
      'Vitamina de maçã com whey',
      'Omelete de claras com queijo cottage',
    ],
  },

  // ============= GANHO DE PESO / BULK (90 itens) =============
  'ganhar_peso': {
    'cafe_manha': [
      'Cuscuz nordestino com manteiga, queijo coalho, ovo frito e linguiça',
      'Vitamina hipercalórica: leite integral, aveia, banana, pasta de amendoim, whey e mel',
      'Panqueca americana (4 unidades) com maple syrup, manteiga e frutas',
      'French toast (3 fatias) com banana caramelizada, mel e canela',
      'Bowl de açaí grande (500g) com granola, banana, morango e pasta de amendoim',
      'Pão francês (2 unidades) com queijo prato, presunto e manteiga',
      'Omelete de 4 ovos inteiros com queijo, presunto, arroz e torradas',
      'Mingau de aveia calórico com leite integral, banana, mel e castanhas',
      'Sanduíche duplo: pão integral, frango, queijo, ovo e abacate',
      'Tapioca grande recheada com queijo, coco ralado e leite condensado',
      'Waffle belga com nutella, banana e chantilly',
      'Torrada francesa com cream cheese, geleia e frutas',
      'Vitamina de abacate com leite condensado, cacau e aveia',
      'Bagel com cream cheese, salmão defumado e ovo poché',
      'Crepioca tripla recheada com frango, queijo e requeijão',
    ],
    'lanche_manha': [
      'Abacate amassado com cacau em pó, mel e granola',
      'Mix de castanhas variadas e frutas secas (60g)',
      'Sanduíche de pasta de amendoim integral com banana e mel',
      'Bolo de banana com aveia e nozes (fatia de 120g)',
      'Vitamina de abacate com leite integral e mel',
      'Granola artesanal (80g) com leite integral e banana',
      'Shake hipercalórico: maltodextrina, whey, aveia e pasta de amendoim',
      'Pão de queijo (4 unidades) com requeijão cremoso',
      'Tâmaras medjool (6 unidades) recheadas com pasta de castanhas',
      'Açaí na tigela (300ml) com granola e banana',
      'Sanduíche de queijo quente com presunto no pão de forma',
      'Muffin de blueberry com manteiga (2 unidades)',
      'Iogurte integral com granola, mel e frutas secas',
      'Banana com pasta de amendoim e chocolate granulado',
      'Torrada com abacate amassado e ovo frito',
    ],
    'almoco': [
      'Costela bovina assada com arroz vermelho, feijão tropeiro e farofa',
      'Picanha grelhada com batata rústica, arroz branco e vinagrete',
      'Frango à parmegiana com espaguete ao sugo e salada',
      'Feijoada completa com arroz, couve, laranja, farofa e torresmo',
      'Lasanha bolonhesa com queijo gratinado e salada verde',
      'Mocotó com arroz branco, mandioca e couve refogada',
      'Rabada com polenta cremosa, agrião e farofa de manteiga',
      'Macarronada italiana com almôndegas grandes e parmesão ralado',
      'Baião de dois completo com carne de sol, queijo coalho e ovos',
      'Galinhada caipira com pequi, arroz, feijão e couve',
      'Carne de panela com mandioca, cenoura, batata e arroz',
      'Pernil suíno assado com purê de batata, arroz e farofa',
      'Escondidinho de carne seca com purê de mandioca e queijo gratinado',
      'Arroz carreteiro gaúcho com charque, linguiça e ovos',
      'Dobradinha com feijão branco, arroz e torradas',
    ],
    'lanche_tarde': [
      'Vitamina calórica: leite integral, banana, aveia, whey, pasta de amendoim e mel',
      'Coxinha de frango com catupiry (2 unidades médias)',
      'Sanduíche natural triplo: frango, atum, queijo e vegetais',
      'Shake mass gainer com leite integral e banana',
      'Empada de frango com requeijão (3 unidades)',
      'Batata-doce assada grande (300g) com canela e mel',
      'Pastel de carne assado (2 unidades grandes)',
      'Pão de batata recheado com frango e catupiry',
      'Tapioca recheada com banana, leite condensado e canela',
      'Açaí (400ml) com granola, paçoca e leite condensado',
      'Vitamina de manga com leite integral, aveia e mel',
      'Wrap grande de carne, arroz, feijão e queijo',
      'Misto quente duplo com presunto e queijo',
      'Bolo de fubá cremoso (fatia de 150g) com café',
      'Sanduíche de pasta de amendoim com geleia e banana',
    ],
    'jantar': [
      'Nhoque de batata ao molho branco com bacon e frango',
      'Macarrão à carbonara completo com bacon, ovos e parmesão',
      'Risoto de camarão cremoso com parmesão e azeite trufado',
      'Pizza caseira de pepperoni com queijo extra (3 fatias grandes)',
      'Filé à parmegiana com arroz, batata frita e salada',
      'Strogonoff de carne com arroz branco, batata palha e salada',
      'Macarrão com frutos do mar ao molho de vinho branco',
      'Hambúrguer artesanal duplo com queijo, bacon e batata rústica',
      'Lasanha quatro queijos com molho branco e manjericão',
      'Carne de sol acebolada com macaxeira frita, arroz e feijão verde',
      'Spaghetti à bolonhesa clássico com parmesão ralado',
      'Frango recheado com queijo e presunto, arroz e legumes',
      'Lombo suíno à milanesa com purê de batata e arroz',
      'Panqueca recheada com carne moída, molho de tomate e queijo',
      'Peixe empanado com arroz, purê de batata e salada',
    ],
    'ceia': [
      'Mingau de fubá cremoso com leite integral e canela',
      'Vitamina noturna: leite integral, banana, aveia, mel e caseína',
      'Sanduíche de queijo quente com presunto',
      'Iogurte grego integral (200g) com granola, mel e frutas',
      'Açaí (250ml) com banana e granola',
      'Pudim de leite condensado caseiro (fatia de 100g)',
      'Leite integral morno (400ml) com achocolatado e mel',
      'Aveia overnight calórica com leite integral, banana e pasta de amendoim',
      'Torrada com manteiga, queijo e geleia (3 unidades)',
      'Banana amassada com aveia, mel e canela',
      'Shake de caseína com leite integral, cacau e pasta de amendoim',
      'Pão com manteiga de amendoim e mel (2 fatias)',
      'Mingau de aveia cremoso com leite integral e frutas',
      'Queijo coalho (100g) com mel e castanhas',
      'Vitamina de mamão com leite integral, aveia e mel',
    ],
  },

  // ============= DIETA FLEXÍVEL / IIFYM (90 itens) =============
  'dieta_flexivel': {
    'cafe_manha': [
      'Waffle belga com nutella, banana fatiada e chantilly',
      'Panqueca americana com bacon crocante, ovo e maple syrup',
      'French toast com cream cheese, geleia de morango e frutas',
      'Croissant recheado com presunto, queijo e ovo mexido',
      'Bowl de açaí com granola, morango, banana e leite condensado',
      'Omelete de queijo com torradas, manteiga e geleia',
      'Bagel com cream cheese, salmão defumado e alcaparras',
      'Sanduíche de ovo frito com bacon, queijo e maionese',
      'Pão de queijo (4 unidades) com requeijão e café com leite',
      'Vitamina de chocolate: leite, cacau, banana, aveia e mel',
      'Crepe de nutella com morango e chantilly',
      'Torrada francesa com doce de leite e frutas vermelhas',
      'Muffin de blueberry com manteiga e cappuccino',
      'Bowl de granola com iogurte, mel, frutas e chocolate chips',
      'Tapioca com queijo coalho, coco e leite condensado',
    ],
    'lanche_manha': [
      'Barra de chocolate meio amargo (30g) com amêndoas',
      'Cookie de chocolate chip caseiro (2 unidades)',
      'Banana com pasta de amendoim e chocolate granulado',
      'Pipoca doce de micro-ondas (1 pacote pequeno)',
      'Açaí pequeno (150ml) com granola',
      'Brownie fit (1 quadrado de 50g)',
      'Frutas vermelhas (1 xícara) com creme de baunilha',
      'Biscoito recheado (3 unidades) com leite',
      'Uvas congeladas (1 xícara) com chocolate derretido',
      'Iogurte com calda de frutas vermelhas',
      'Bolo de cenoura (fatia pequena de 60g)',
      'Sanduíche de nutella com banana',
      'Sorvete de iogurte com frutas (1 bola)',
      'Queijo com goiabada (Romeu e Julieta)',
      'Milkshake pequeno de morango (200ml)',
    ],
    'almoco': [
      'Hambúrguer artesanal gourmet com queijo cheddar, bacon e batata rústica',
      'Pizza margherita artesanal (3 fatias) com manjericão fresco',
      'Lasanha bolonhesa gratinada com queijo e salada verde',
      'Burrito mexicano de carne, arroz, feijão, queijo e guacamole',
      'Fish and chips britânico com molho tártaro e salada coleslaw',
      'Hot dog gourmet com salsicha artesanal, chili e queijo cheddar',
      'Wrap de frango empanado com queijo, bacon e molho ranch',
      'Macarrão à carbonara com bacon crocante e parmesão',
      'Taco mexicano (3 unidades) com carne, queijo, salsa e guacamole',
      'Sanduíche de costela desfiada com molho barbecue e coleslaw',
      'Bowl asiático: arroz, frango teriyaki, legumes e gergelim',
      'Quesadilla de frango com queijo, pimentão e molho sour cream',
      'Parmegiana de frango com espaguete ao sugo',
      'Beirute de carne com queijo derretido e batata frita',
      'Strogonoff cremoso com arroz branco e batata palha crocante',
    ],
    'lanche_tarde': [
      'Milkshake de oreo com chantilly (300ml)',
      'Churros recheado com doce de leite (2 unidades)',
      'Fatia de bolo de chocolate com cobertura cremosa',
      'Açaí na tigela (300ml) com leite condensado e paçoca',
      'Coxinha de frango com catupiry (1 unidade grande)',
      'Croissant de chocolate (1 unidade)',
      'Sorvete de creme (2 bolas) com calda de chocolate',
      'Esfiha de carne (3 unidades) com molho de iogurte',
      'Pipoca de cinema com manteiga (porção média)',
      'Donuts glazeado (1 unidade) com café',
      'Crepe de banana com nutella e sorvete',
      'Sanduíche de sorvete (ice cream sandwich)',
      'Palha italiana (3 pedaços) com café expresso',
      'Waffle com sorvete de baunilha e calda de frutas',
      'Pastel de queijo (2 unidades) com caldo de cana',
    ],
    'jantar': [
      'Pizza de pepperoni artesanal (3 fatias) com borda recheada',
      'Hambúrguer smash duplo com queijo, cebola caramelizada e pickles',
      'Massa ao molho de quatro queijos com bacon crocante',
      'Nachos mexicanos com carne, queijo cheddar, jalapeño e guacamole',
      'Shawarma de carne com homus, salada e molho tahine',
      'Risoto de camarão cremoso ao vinho branco',
      'Poke bowl havaiano: arroz, salmão, abacate, manga e gergelim',
      'Lasanha de frango com molho branco e queijo gratinado',
      'Kebab no pão pita com carne, salada e molho de iogurte',
      'Espaguete à bolonhesa com parmesão e manjericão fresco',
      'Burrito bowl: arroz, feijão, carne, queijo, guacamole e sour cream',
      'Cachorro-quente gourmet com purê de batata e batata palha',
      'Frango frito crocante (3 pedaços) com purê e coleslaw',
      'Panini de frango, pesto, tomate seco e mussarela',
      'Sanduíche de costela com queijo, molho barbecue e onion rings',
    ],
    'ceia': [
      'Brownie com sorvete de baunilha e calda de chocolate',
      'Petit gateau com sorvete e frutas vermelhas',
      'Pudim de leite condensado com calda de caramelo',
      'Mousse de chocolate belga com chantilly',
      'Cheesecake de frutas vermelhas (fatia pequena)',
      'Sorvete de chocolate (2 bolas) com castanhas',
      'Torta de limão siciliano (fatia de 80g)',
      'Brigadeiro gourmet (3 unidades) com café',
      'Pavê de chocolate com biscoito champagne',
      'Açaí cremoso (200ml) com leite condensado',
      'Taça de sorvete com frutas e granola',
      'Banana split com 3 sabores de sorvete',
      'Panqueca doce com nutella e morango',
      'Milkshake de chocolate (250ml) com chantilly',
      'Romeu e Julieta: queijo minas com goiabada cascão',
    ],
  },
};

// Função para obter refeições do pool por estratégia e tipo de refeição
export function getMealsFromPool(
  strategyKey: string,
  mealType: string,
  count: number = 5
): string[] {
  const strategyPool = STRATEGY_MEAL_POOL[strategyKey] || STRATEGY_MEAL_POOL['manter'];
  const meals = strategyPool[mealType] || [];
  
  if (meals.length === 0) return [];
  
  // Embaralhar e retornar o número solicitado
  const shuffled = [...meals].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, meals.length));
}

// Função para obter uma refeição aleatória do pool
export function getRandomMealFromPool(strategyKey: string, mealType: string): string | null {
  const meals = getMealsFromPool(strategyKey, mealType, 1);
  return meals.length > 0 ? meals[0] : null;
}

// Função para verificar se uma refeição está no pool
export function isMealInPool(strategyKey: string, mealType: string, mealName: string): boolean {
  const strategyPool = STRATEGY_MEAL_POOL[strategyKey];
  if (!strategyPool) return false;
  
  const meals = strategyPool[mealType] || [];
  const normalizedMealName = normalizeText(mealName);
  
  return meals.some(meal => normalizeText(meal).includes(normalizedMealName) || normalizedMealName.includes(normalizeText(meal)));
}

// ============= STRATEGY CULINARY PERSONAS =============
// Define distinct "culinary personas" for each nutritional strategy

export interface StrategyPersona {
  key: string;
  label: string;
  philosophy: string;
  foodStyle: string;
  recommendedFoods: string[];
  avoidFoods: string[];
  mealExamples: Record<string, string[]>;
  portionStyle: string;
  specialNotes: string;
}

export const STRATEGY_PERSONAS: Record<string, StrategyPersona> = {
  // ============= EMAGRECIMENTO =============
  'emagrecer': {
    key: 'emagrecer',
    label: 'Emagrecimento',
    philosophy: 'Déficit calórico moderado com foco em saciedade e nutrientes',
    foodStyle: 'Pratos leves, magros, alto volume, baixa caloria',
    recommendedFoods: [
      'Peito de frango grelhado',
      'Peixe assado ou grelhado (tilápia, pescada)',
      'Saladas volumosas com folhas verdes',
      'Vegetais cozidos no vapor',
      'Frutas de baixo índice glicêmico (morango, maçã)',
      'Ovos (moderado)',
      'Iogurte natural desnatado',
      'Arroz integral (porções pequenas)',
      'Sopas de legumes',
      'Wrap integral com recheio leve',
    ],
    avoidFoods: [
      'Frituras',
      'Fast food',
      'Doces e sobremesas',
      'Massas cremosas',
      'Pães brancos',
      'Refrigerantes',
      'Alimentos ultraprocessados',
    ],
    mealExamples: {
      cafe_manha: getMealsFromPool('emagrecer', 'cafe_manha', 3),
      lanche_manha: getMealsFromPool('emagrecer', 'lanche_manha', 3),
      almoco: getMealsFromPool('emagrecer', 'almoco', 3),
      lanche_tarde: getMealsFromPool('emagrecer', 'lanche_tarde', 3),
      jantar: getMealsFromPool('emagrecer', 'jantar', 3),
      ceia: getMealsFromPool('emagrecer', 'ceia', 3),
    },
    portionStyle: 'Porções controladas, pratos volumosos mas baixa caloria',
    specialNotes: 'Foco em proteínas magras e vegetais. Evitar carboidratos refinados.',
  },

  // ============= CUTTING =============
  'cutting': {
    key: 'cutting',
    label: 'Cutting',
    philosophy: 'Déficit agressivo com proteína muito alta para preservar massa muscular',
    foodStyle: 'Estilo bodybuilding, pratos funcionais e repetitivos, "comida limpa"',
    recommendedFoods: [
      'Peito de frango (MUITO)',
      'Claras de ovo',
      'Tilápia',
      'Brócolis',
      'Espinafre',
      'Arroz integral (apenas pré/pós treino)',
      'Batata doce (pré treino)',
      'Whey protein',
      'Atum em água',
      'Peito de peru',
    ],
    avoidFoods: [
      'Qualquer fritura',
      'Doces',
      'Fast food',
      'Carboidratos fora das janelas de treino',
      'Gorduras em excesso',
      'Alimentos processados',
      'Frutas muito doces',
    ],
    mealExamples: {
      cafe_manha: getMealsFromPool('cutting', 'cafe_manha', 3),
      lanche_manha: getMealsFromPool('cutting', 'lanche_manha', 3),
      almoco: getMealsFromPool('cutting', 'almoco', 3),
      lanche_tarde: getMealsFromPool('cutting', 'lanche_tarde', 3),
      jantar: getMealsFromPool('cutting', 'jantar', 3),
      ceia: getMealsFromPool('cutting', 'ceia', 3),
    },
    portionStyle: 'Proteína abundante, carboidratos mínimos, gordura muito baixa',
    specialNotes: 'Pratos podem parecer monótonos mas são funcionais. Foco absoluto em proteína.',
  },

  // ============= MANUTENÇÃO =============
  'manter': {
    key: 'manter',
    label: 'Manutenção',
    philosophy: 'Equilíbrio e variedade, sustentabilidade a longo prazo',
    foodStyle: 'Comida caseira tradicional, equilibrada, todos os grupos alimentares',
    recommendedFoods: [
      'Todos os grupos alimentares em equilíbrio',
      'Arroz e feijão (clássico brasileiro)',
      'Carnes variadas (frango, carne, peixe)',
      'Vegetais diversos',
      'Frutas variadas',
      'Pães integrais',
      'Massas (moderado)',
      'Laticínios',
      'Ovos',
    ],
    avoidFoods: [
      'Excessos de qualquer tipo',
      'Ultraprocessados em excesso',
    ],
    mealExamples: {
      cafe_manha: getMealsFromPool('manter', 'cafe_manha', 3),
      lanche_manha: getMealsFromPool('manter', 'lanche_manha', 3),
      almoco: getMealsFromPool('manter', 'almoco', 3),
      lanche_tarde: getMealsFromPool('manter', 'lanche_tarde', 3),
      jantar: getMealsFromPool('manter', 'jantar', 3),
      ceia: getMealsFromPool('manter', 'ceia', 3),
    },
    portionStyle: 'Porções normais, equilibradas, sem exageros nem restrições',
    specialNotes: 'Variedade é chave. Pode incluir comfort foods ocasionais.',
  },

  // ============= FITNESS =============
  'fitness': {
    key: 'fitness',
    label: 'Fitness',
    philosophy: 'Performance, energia e recuperação muscular',
    foodStyle: 'Atlético, funcional, timing nutricional estratégico',
    recommendedFoods: [
      'Frango e carnes magras',
      'Ovos inteiros',
      'Arroz e batata doce',
      'Aveia',
      'Banana (pré/pós treino)',
      'Whey protein',
      'Vegetais coloridos',
      'Frutas energéticas',
      'Pasta de amendoim',
      'Castanhas',
    ],
    avoidFoods: [
      'Ultraprocessados',
      'Açúcar refinado em excesso',
      'Frituras pesadas',
      'Álcool em excesso',
    ],
    mealExamples: {
      cafe_manha: getMealsFromPool('fitness', 'cafe_manha', 3),
      lanche_manha: getMealsFromPool('fitness', 'lanche_manha', 3),
      almoco: getMealsFromPool('fitness', 'almoco', 3),
      lanche_tarde: getMealsFromPool('fitness', 'lanche_tarde', 3),
      jantar: getMealsFromPool('fitness', 'jantar', 3),
      ceia: getMealsFromPool('fitness', 'ceia', 3),
    },
    portionStyle: 'Proteína adequada, carboidratos estratégicos, gorduras saudáveis',
    specialNotes: 'Foco em timing nutricional. Carboidratos concentrados no pré/pós treino.',
  },

  // ============= BULK (GANHAR PESO) =============
  'ganhar_peso': {
    key: 'ganhar_peso',
    label: 'Ganhar Peso (Bulk)',
    philosophy: 'Superávit calórico para ganho de massa muscular',
    foodStyle: 'Porções GRANDES, alimentos calóricos densos, carboidratos abundantes',
    recommendedFoods: [
      'Arroz branco ou integral (porções generosas)',
      'Massas',
      'Batata doce (grandes porções)',
      'Pão (várias fatias)',
      'Carne vermelha',
      'Frango com pele',
      'Ovos inteiros (múltiplos)',
      'Pasta de amendoim',
      'Abacate',
      'Banana',
      'Granola',
      'Leite integral',
      'Queijos',
      'Shakes calóricos',
      'Panquecas proteicas',
      'Hambúrgueres caseiros proteicos',
    ],
    avoidFoods: [
      'Alimentos sem valor nutricional (junk food vazio)',
    ],
    mealExamples: {
      cafe_manha: getMealsFromPool('ganhar_peso', 'cafe_manha', 3),
      lanche_manha: getMealsFromPool('ganhar_peso', 'lanche_manha', 3),
      almoco: getMealsFromPool('ganhar_peso', 'almoco', 3),
      lanche_tarde: getMealsFromPool('ganhar_peso', 'lanche_tarde', 3),
      jantar: getMealsFromPool('ganhar_peso', 'jantar', 3),
      ceia: getMealsFromPool('ganhar_peso', 'ceia', 3),
    },
    portionStyle: 'Porções GENEROSAS, múltiplas refeições, nunca pular refeições',
    specialNotes: 'Foco em quantidade. Hambúrgueres e massas são bem-vindos. Shakes calóricos ajudam.',
  },

  // ============= DIETA FLEXÍVEL (IIFYM) =============
  'dieta_flexivel': {
    key: 'dieta_flexivel',
    label: 'Dieta Flexível',
    philosophy: 'If It Fits Your Macros (IIFYM) - Nenhum alimento é proibido se couber nos macros',
    foodStyle: '80% alimentos nutritivos, 20% comfort foods. VARIEDADE máxima, inclui hambúrgueres, pizzas, doces',
    recommendedFoods: [
      // Comfort foods OBRIGATÓRIOS para diferenciar
      'Hambúrguer artesanal/caseiro',
      'Pizza caseira ou artesanal',
      'Sobremesas (brownie, bolo, sorvete)',
      'Tacos e burritos',
      'Waffles e panquecas doces',
      'Sanduíches gourmet',
      'Massas variadas',
      'Chocolate (porção controlada)',
      'Sorvete (porção controlada)',
      // Base saudável (80%)
      'Proteínas variadas',
      'Carboidratos diversos',
      'Vegetais coloridos',
      'Frutas variadas',
    ],
    avoidFoods: [
      'Nenhum alimento é estritamente proibido',
      'Apenas controle de macros',
    ],
    mealExamples: {
      cafe_manha: getMealsFromPool('dieta_flexivel', 'cafe_manha', 3),
      lanche_manha: getMealsFromPool('dieta_flexivel', 'lanche_manha', 3),
      almoco: getMealsFromPool('dieta_flexivel', 'almoco', 3),
      lanche_tarde: getMealsFromPool('dieta_flexivel', 'lanche_tarde', 3),
      jantar: getMealsFromPool('dieta_flexivel', 'jantar', 3),
      ceia: getMealsFromPool('dieta_flexivel', 'ceia', 3),
    },
    portionStyle: 'Macros são o guia, não tipos de alimentos. Caber nos macros = pode comer.',
    specialNotes: 'OBRIGATÓRIO incluir comfort foods! Hambúrgueres, pizzas, sobremesas fazem parte da estratégia. Diferenciar claramente de dietas restritivas.',
  },
};

// Função para obter persona por strategy_key (do banco) ou goal (legado)
export function getStrategyPersona(strategyKey?: string, goal?: string): StrategyPersona {
  // Primeiro tenta pelo strategy_key
  if (strategyKey && STRATEGY_PERSONAS[strategyKey]) {
    return STRATEGY_PERSONAS[strategyKey];
  }
  
  // Fallback para goal legado
  if (goal && STRATEGY_PERSONAS[goal]) {
    return STRATEGY_PERSONAS[goal];
  }
  
  // Default para manutenção
  return STRATEGY_PERSONAS['manter'];
}

// ============= STRATEGY-SPECIFIC PROMPT RULES =============
export function getStrategyPromptRules(strategyKey: string, language: string = 'pt-BR'): string {
  const persona = getStrategyPersona(strategyKey);
  const isPortuguese = language.startsWith('pt');
  
  // Obter exemplos dinâmicos do pool
  const poolExamples = {
    cafe_manha: getMealsFromPool(strategyKey, 'cafe_manha', 3),
    lanche_manha: getMealsFromPool(strategyKey, 'lanche_manha', 3),
    almoco: getMealsFromPool(strategyKey, 'almoco', 3),
    lanche_tarde: getMealsFromPool(strategyKey, 'lanche_tarde', 3),
    jantar: getMealsFromPool(strategyKey, 'jantar', 3),
    ceia: getMealsFromPool(strategyKey, 'ceia', 3),
  };
  
  if (isPortuguese) {
    return `
🎯 PERSONA CULINÁRIA: ${persona.label.toUpperCase()}
📖 Filosofia: ${persona.philosophy}
🍽️ Estilo de pratos: ${persona.foodStyle}

✅ ALIMENTOS RECOMENDADOS PARA ESTE PERFIL:
${persona.recommendedFoods.map(f => `- ${f}`).join('\n')}

❌ ALIMENTOS A EVITAR NESTE PERFIL:
${persona.avoidFoods.map(f => `- ${f}`).join('\n')}

📏 ESTILO DE PORÇÕES:
${persona.portionStyle}

💡 NOTAS ESPECIAIS:
${persona.specialNotes}

📋 EXEMPLOS DO POOL PARA ${persona.label.toUpperCase()} (USE COMO REFERÊNCIA):
- CAFÉ DA MANHÃ: ${poolExamples.cafe_manha.join(' | ')}
- LANCHE MANHÃ: ${poolExamples.lanche_manha.join(' | ')}
- ALMOÇO: ${poolExamples.almoco.join(' | ')}
- LANCHE TARDE: ${poolExamples.lanche_tarde.join(' | ')}
- JANTAR: ${poolExamples.jantar.join(' | ')}
- CEIA: ${poolExamples.ceia.join(' | ')}

⚠️ REGRA CRÍTICA: Os pratos gerados DEVEM refletir a persona "${persona.label}". 
${strategyKey === 'dieta_flexivel' ? '🍔🍕🍰 OBRIGATÓRIO: Inclua comfort foods como hambúrgueres, pizzas, sobremesas!' : ''}
${strategyKey === 'cutting' ? '💪 Priorizar pratos com ALTA proteína e estilo bodybuilding.' : ''}
${strategyKey === 'ganhar_peso' ? '📈 Priorizar porções GENEROSAS e alimentos calóricos densos.' : ''}
`;
  }
  
  // English fallback
  return `
🎯 CULINARY PERSONA: ${persona.label.toUpperCase()}
📖 Philosophy: ${persona.philosophy}
🍽️ Dish Style: ${persona.foodStyle}

✅ RECOMMENDED FOODS FOR THIS PROFILE:
${persona.recommendedFoods.map(f => `- ${f}`).join('\n')}

📏 PORTION STYLE: ${persona.portionStyle}

💡 SPECIAL NOTES: ${persona.specialNotes}
`;
}
