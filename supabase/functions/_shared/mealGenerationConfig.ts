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
      cafe_manha: ['Omelete de claras com espinafre', 'Iogurte natural com frutas vermelhas', 'Tapioca com queijo cottage'],
      lanche_manha: ['1 maçã', 'Mix de castanhas (30g)', 'Iogurte natural'],
      almoco: ['Frango grelhado com salada volumosa e arroz integral', 'Peixe assado com legumes e quinoa', 'Salada de atum com folhas verdes'],
      lanche_tarde: ['Frutas frescas', 'Cenoura baby com hummus', 'Iogurte com chia'],
      jantar: ['Salmão com brócolis', 'Sopa de legumes com frango desfiado', 'Omelete com salada'],
      ceia: ['Chá de camomila', 'Iogurte light', 'Maçã com canela'],
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
      cafe_manha: ['Omelete de 6 claras com espinafre', 'Aveia com whey', 'Peito de frango com ovo'],
      lanche_manha: ['Shake de whey', 'Peito de peru com pepino', 'Claras de ovo cozidas'],
      almoco: ['Peito de frango grelhado com brócolis e arroz integral', 'Tilápia grelhada com espinafre e batata doce', 'Carne magra com salada verde'],
      lanche_tarde: ['Whey protein', 'Peito de frango fatiado', 'Atum em lata'],
      jantar: ['Tilápia com legumes verdes', 'Peito de frango com salada', 'Claras mexidas com vegetais'],
      ceia: ['Caseína ou queijo cottage', 'Iogurte grego natural', 'Shake leve de caseína'],
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
      cafe_manha: ['Pão integral com queijo e presunto', 'Tapioca com queijo e presunto', 'Ovos mexidos com pão integral'],
      lanche_manha: ['Frutas frescas', 'Iogurte com granola', 'Pão de queijo'],
      almoco: ['Arroz, feijão, frango grelhado e salada', 'Macarrão com carne moída e salada', 'Peixe com purê e legumes'],
      lanche_tarde: ['Sanduíche natural', 'Frutas com iogurte', 'Bolo caseiro'],
      jantar: ['Sopa de legumes com carne', 'Omelete com salada', 'Arroz com frango e vegetais'],
      ceia: ['Chá com biscoitos', 'Leite com aveia', 'Frutas leves'],
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
      cafe_manha: ['Panqueca de banana com aveia e whey', 'Ovos mexidos com pão integral e abacate', 'Smoothie proteico com frutas'],
      lanche_manha: ['Banana com pasta de amendoim', 'Shake proteico', 'Mix de castanhas'],
      almoco: ['Frango grelhado com batata doce e legumes', 'Carne com arroz integral e salada colorida', 'Bowl de quinoa com frango e vegetais'],
      lanche_tarde: ['Shake pós-treino', 'Sanduíche proteico', 'Iogurte grego com frutas'],
      jantar: ['Salmão com vegetais assados', 'Frango com arroz e brócolis', 'Omelete com vegetais'],
      ceia: ['Iogurte grego', 'Queijo cottage', 'Shake de caseína'],
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
      cafe_manha: ['Panquecas proteicas com banana e mel', '4 ovos mexidos com pão e queijo', 'Vitamina de banana com aveia e pasta de amendoim'],
      lanche_manha: ['Shake calórico (leite + banana + aveia + whey)', 'Sanduíche de pasta de amendoim', 'Mix de castanhas com frutas secas'],
      almoco: ['Arroz generoso com feijão, carne moída e salada', 'Macarronada com frango e queijo', 'Hambúrguer caseiro com batata'],
      lanche_tarde: ['Shake com frutas e whey', 'Pão com pasta de amendoim e banana', 'Iogurte com granola e mel'],
      jantar: ['Massa com carne e molho', 'Arroz com frango e purê', 'Steak com batatas e vegetais'],
      ceia: ['Vitamina de banana com aveia', 'Iogurte integral com granola', 'Sanduíche proteico'],
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
      cafe_manha: ['Waffles com frutas e mel', 'Panqueca americana com bacon', 'Ovos com torradas e abacate', 'Açaí bowl'],
      lanche_manha: ['Barra de chocolate (30g)', 'Frutas com iogurte', 'Cookie proteico'],
      almoco: ['Hambúrguer artesanal com salada', 'Pizza caseira com vegetais', 'Burrito bowl', 'Wrap recheado especial'],
      lanche_tarde: ['Brownie caseiro', 'Milkshake proteico', 'Sanduíche gourmet'],
      jantar: ['Pizza caseira', 'Tacos mexicanos', 'Hambúrguer com batata assada', 'Massa carbonara'],
      ceia: ['Sorvete (1 bola)', 'Chocolate quente', 'Biscoitos com leite'],
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

📋 EXEMPLOS DE REFEIÇÕES PARA ${persona.label.toUpperCase()}:
- CAFÉ DA MANHÃ: ${persona.mealExamples.cafe_manha.join(', ')}
- LANCHE MANHÃ: ${persona.mealExamples.lanche_manha.join(', ')}
- ALMOÇO: ${persona.mealExamples.almoco.join(', ')}
- LANCHE TARDE: ${persona.mealExamples.lanche_tarde.join(', ')}
- JANTAR: ${persona.mealExamples.jantar.join(', ')}
- CEIA: ${persona.mealExamples.ceia.join(', ')}

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
