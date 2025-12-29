import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  CALORIE_TABLE, 
  normalizeForCalorieTable, 
  findCaloriesPerGram, 
  calculateFoodCalories 
} from "../_shared/calorieTable.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat
} from "../_shared/nutritionPrompt.ts";
import { getAIPrompt, type AIPromptData } from "../_shared/getAIPrompt.ts";
// Importar cálculos nutricionais centralizados
import {
  calculateNutritionalTargets,
  calculateMealDistribution,
  buildNutritionalContextForPrompt,
  buildMealDistributionForPrompt,
  estimateTimeToGoal,
  validateTargetsHealth,
  type UserPhysicalData,
  type NutritionalTargets,
} from "../_shared/nutritionalCalculations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-MEAL-PLAN] ${step}${detailsStr}`);
};

// ============= TIPOS - FORMATO SIMPLIFICADO =============
interface FoodItem {
  name: string;
  grams: number;
}

interface SimpleMealOption {
  title: string;
  foods: FoodItem[];
  calories_kcal: number;
  calculated_calories?: number; // Calculado pelo script
}

interface SimpleMeal {
  meal_type: string;
  label: string;
  target_calories: number;
  options: SimpleMealOption[];
}

interface SimpleDayPlan {
  day: number;
  day_name: string;
  meals: SimpleMeal[];
  total_calories: number;
}

// ============= CONFIGURAÇÃO REGIONAL =============
interface RegionalConfig {
  language: string;
  languageName: string;
  measurementSystem: 'metric' | 'imperial';
  typicalMeals: string;
  culturalNotes: string;
  mealLabels: Record<string, string>;
  dayNames: string[];
  domesticUnits: string;
}

const REGIONAL_CONFIGS: Record<string, RegionalConfig> = {
  // BRAZIL
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
      cafe_manha: "Cafe da manha",
      lanche_manha: "Lanche da manha",
      almoco: "Almoco",
      lanche_tarde: "Lanche da tarde",
      jantar: "Jantar",
    },
    dayNames: ["Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado", "Domingo"],
    domesticUnits: 'unidade, colher de sopa, copo, fatia, prato medio, concha, porcao',
  },

  // USA
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
    },
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    domesticUnits: 'piece, tablespoon, cup, slice, medium plate, serving, portion',
  },

  // MEXICO
  'MX': {
    language: 'es-MX',
    languageName: 'Espanol Mexicano',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Huevos rancheros, chilaquiles, quesadillas, licuados, fruta, frijoles
COLACION: Frutas, jicama, pepino con limon, tostadas, nueces
COMIDA: Sopa, arroz, frijoles, proteina, tortillas, ensalada
CENA: Tacos, quesadillas, sopas, platillos mas ligeros`,
    culturalNotes: 'Ingredientes mexicanos: tortillas de maiz, frijoles negros, aguacate, chile, pollo, carne, huevos.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colacion Matutina",
      almoco: "Comida",
      lanche_tarde: "Colacion Vespertina",
      jantar: "Cena",
    },
    dayNames: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
    domesticUnits: 'pieza, cucharada, vaso, rebanada, plato mediano, porcion',
  },

  // SPAIN
  'ES': {
    language: 'es-ES',
    languageName: 'Espanol de Espana',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Tostada con tomate y aceite, cafe con leche, zumo de naranja, cereales
ALMUERZO: Comida principal - paella, cocido, pescado, ensaladas, legumbres
MERIENDA: Bocadillo, fruta, cafe, yogur
CENA: Tortilla espanola, ensaladas, sopas, platos ligeros`,
    culturalNotes: 'Ingredientes espanoles: aceite de oliva, jamon serrano, queso, garbanzos, pescado, pollo.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Media Manana",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
    },
    dayNames: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, rebanada, plato mediano, racion',
  },

  // FRANCE
  'FR': {
    language: 'fr-FR',
    languageName: 'Francais',
    measurementSystem: 'metric',
    typicalMeals: `
PETIT-DEJEUNER: Croissant, pain, confiture, cafe, jus orange, yaourt
DEJEUNER: Repas principal - entree, plat principal, fromage ou dessert
GOUTER: Fruit, yaourt, biscuits
DINER: Soupe, quiche, salade, plats legers`,
    culturalNotes: 'Ingredients francais: baguette, fromages, beurre, poulet, poisson, legumes frais.',
    mealLabels: {
      cafe_manha: "Petit-dejeuner",
      lanche_manha: "Collation du matin",
      almoco: "Dejeuner",
      lanche_tarde: "Gouter",
      jantar: "Diner",
    },
    dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
    domesticUnits: 'piece, cuillere a soupe, verre, tranche, assiette moyenne, portion',
  },

  // GERMANY
  'DE': {
    language: 'de-DE',
    languageName: 'Deutsch',
    measurementSystem: 'metric',
    typicalMeals: `
FRUHSTUCK: Vollkornbrot, Musli, Wurst, Kase, Eier, Kaffee
MITTAGESSEN: Fleisch oder Fisch, Kartoffeln, Gemuse
ZWISCHENMAHLZEIT: Obst, Joghurt, Nusse
ABENDESSEN: Brot, Aufschnitt, Kase, Salat`,
    culturalNotes: 'Deutsche Zutaten: Vollkornbrot, Kartoffeln, Hahnchen, Fisch, Quark, Gemuse.',
    mealLabels: {
      cafe_manha: "Fruhstuck",
      lanche_manha: "Vormittagssnack",
      almoco: "Mittagessen",
      lanche_tarde: "Nachmittagssnack",
      jantar: "Abendessen",
    },
    dayNames: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
    domesticUnits: 'Stuck, Essloffel, Glas, Scheibe, mittlerer Teller, Portion',
  },

  // ITALY
  'IT': {
    language: 'it-IT',
    languageName: 'Italiano',
    measurementSystem: 'metric',
    typicalMeals: `
COLAZIONE: Cornetto, caffe, cappuccino, biscotti, succo, yogurt
PRANZO: Primo (pasta/risotto), secondo (carne/pesce), contorno, frutta
SPUNTINO: Frutta, yogurt, crackers
CENA: Minestra, insalata, pesce, piatti leggeri`,
    culturalNotes: 'Ingredienti italiani: pasta, olio oliva, pomodoro, mozzarella, pollo, pesce, verdure.',
    mealLabels: {
      cafe_manha: "Colazione",
      lanche_manha: "Spuntino Mattutino",
      almoco: "Pranzo",
      lanche_tarde: "Merenda",
      jantar: "Cena",
    },
    dayNames: ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato", "Domenica"],
    domesticUnits: 'pezzo, cucchiaio, bicchiere, fetta, piatto medio, porzione',
  },

  // ARGENTINA
  'AR': {
    language: 'es-AR',
    languageName: 'Espanol Argentino',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Medialunas, tostadas, mate, cafe con leche, frutas
ALMUERZO: Asado, milanesas, pastas, empanadas, ensaladas
MERIENDA: Mate con facturas, fruta, yogur
CENA: Carnes, pastas, pizzas, ensaladas`,
    culturalNotes: 'Ingredientes argentinos: carne vacuna, pollo, pastas, empanadas, verduras, frutas.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colacion",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
    },
    dayNames: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, rebanada, plato mediano, porcion',
  },

  // PORTUGAL
  'PT': {
    language: 'pt-PT',
    languageName: 'Portugues Europeu',
    measurementSystem: 'metric',
    typicalMeals: `
PEQUENO-ALMOCO: Pao com manteiga, cereais, cafe, sumo de laranja
ALMOCO: Sopa, prato principal (bacalhau, carne, peixe), arroz/batatas
LANCHE: Fruta, iogurte, tostas
JANTAR: Similar ao almoco ou mais leve`,
    culturalNotes: 'Ingredientes portugueses: bacalhau, azeite, batatas, frango, peixe, legumes.',
    mealLabels: {
      cafe_manha: "Pequeno-almoco",
      lanche_manha: "Lanche da Manha",
      almoco: "Almoco",
      lanche_tarde: "Lanche da Tarde",
      jantar: "Jantar",
    },
    dayNames: ["Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado", "Domingo"],
    domesticUnits: 'unidade, colher de sopa, copo, fatia, prato medio, porcao',
  },

  // UK
  'GB': {
    language: 'en-GB',
    languageName: 'British English',
    measurementSystem: 'metric',
    typicalMeals: `
BREAKFAST: Eggs, bacon, toast, porridge, cereal, yogurt
LUNCH: Sandwiches, jacket potatoes, soups, salads
AFTERNOON TEA: Scones, biscuits, fruit, tea
DINNER: Roast dinner, fish and chips, pies, grilled meats`,
    culturalNotes: 'British ingredients: chicken, fish, potatoes, beans, cheese, vegetables, eggs.',
    mealLabels: {
      cafe_manha: "Breakfast",
      lanche_manha: "Elevenses",
      almoco: "Lunch",
      lanche_tarde: "Afternoon Tea",
      jantar: "Dinner",
    },
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    domesticUnits: 'piece, tablespoon, cup, slice, medium plate, serving, portion',
  },

  // CHILE
  'CL': {
    language: 'es-CL',
    languageName: 'Espanol Chileno',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Pan con palta, huevos, cafe, te
ALMUERZO: Cazuela, porotos, pollo, carne, ensaladas
ONCE: Pan con agregados, te
CENA: Platos ligeros o similar al almuerzo`,
    culturalNotes: 'Ingredientes chilenos: palta, porotos, pollo, carne, pescado, verduras, frutas.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colacion",
      almoco: "Almuerzo",
      lanche_tarde: "Once",
      jantar: "Cena",
    },
    dayNames: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, rebanada, plato mediano, porcion',
  },

  // COLOMBIA
  'CO': {
    language: 'es-CO',
    languageName: 'Espanol Colombiano',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Arepa, huevos, calentado, chocolate, frutas
ALMUERZO: Arroz, frijoles, carne, pollo, ensalada
ONCES: Empanadas, fruta, cafe
CENA: Sopas, arepas, huevos, platos ligeros`,
    culturalNotes: 'Ingredientes colombianos: arepa, platano, yuca, frijoles, pollo, carne, frutas.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Medias Nueves",
      almoco: "Almuerzo",
      lanche_tarde: "Onces",
      jantar: "Cena",
    },
    dayNames: ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, tajada, plato mediano, porcion',
  },
};

const DEFAULT_CONFIG: RegionalConfig = REGIONAL_CONFIGS['US'];

function getRegionalConfig(countryCode: string): RegionalConfig {
  return REGIONAL_CONFIGS[countryCode?.toUpperCase()] || DEFAULT_CONFIG;
}

// ============= RESTRICOES MULTILINGUE - SIMPLIFICADO =============
function getRestrictionText(restrictions: {
  intolerances: string[];
  dietaryPreference: string;
  excludedIngredients: string[];
  goal: string;
}, language: string): string {
  const isSpanish = language.startsWith('es');
  const isFrench = language.startsWith('fr');
  const isGerman = language.startsWith('de');
  const isItalian = language.startsWith('it');
  const isPortuguese = language.startsWith('pt');

  // Intolerances mapping
  const intoleranceMap: Record<string, Record<string, string>> = {
    en: {
      'lactose': 'NO dairy products',
      'gluten': 'NO gluten (wheat, pasta, bread)',
      'amendoim': 'NO peanuts',
      'frutos_do_mar': 'NO shellfish',
      'peixe': 'NO fish',
      'ovos': 'NO eggs',
      'soja': 'NO soy',
      'cafeina': 'NO caffeine',
      'milho': 'NO corn',
      'leguminosas': 'NO legumes',
    },
    es: {
      'lactose': 'SIN lacteos',
      'gluten': 'SIN gluten (trigo, pasta, pan)',
      'amendoim': 'SIN mani/cacahuate',
      'frutos_do_mar': 'SIN mariscos',
      'peixe': 'SIN pescado',
      'ovos': 'SIN huevos',
      'soja': 'SIN soja',
      'cafeina': 'SIN cafeina',
      'milho': 'SIN maiz',
      'leguminosas': 'SIN legumbres',
    },
    pt: {
      'lactose': 'SEM laticinios',
      'gluten': 'SEM gluten (trigo, massa, pao)',
      'amendoim': 'SEM amendoim',
      'frutos_do_mar': 'SEM frutos do mar',
      'peixe': 'SEM peixe',
      'ovos': 'SEM ovos',
      'soja': 'SEM soja',
      'cafeina': 'SEM cafeina',
      'milho': 'SEM milho',
      'leguminosas': 'SEM leguminosas',
    },
    fr: {
      'lactose': 'SANS produits laitiers',
      'gluten': 'SANS gluten (ble, pates, pain)',
      'amendoim': 'SANS arachides',
      'frutos_do_mar': 'SANS fruits de mer',
      'peixe': 'SANS poisson',
      'ovos': 'SANS oeufs',
      'soja': 'SANS soja',
      'cafeina': 'SANS cafeine',
      'milho': 'SANS mais',
      'leguminosas': 'SANS legumineuses',
    },
    de: {
      'lactose': 'OHNE Milchprodukte',
      'gluten': 'OHNE Gluten (Weizen, Nudeln, Brot)',
      'amendoim': 'OHNE Erdnusse',
      'frutos_do_mar': 'OHNE Meeresfruchte',
      'peixe': 'OHNE Fisch',
      'ovos': 'OHNE Eier',
      'soja': 'OHNE Soja',
      'cafeina': 'OHNE Koffein',
      'milho': 'OHNE Mais',
      'leguminosas': 'OHNE Hulsenfruchte',
    },
    it: {
      'lactose': 'SENZA latticini',
      'gluten': 'SENZA glutine (grano, pasta, pane)',
      'amendoim': 'SENZA arachidi',
      'frutos_do_mar': 'SENZA frutti di mare',
      'peixe': 'SENZA pesce',
      'ovos': 'SENZA uova',
      'soja': 'SENZA soia',
      'cafeina': 'SENZA caffeina',
      'milho': 'SENZA mais',
      'leguminosas': 'SENZA legumi',
    },
  };

  // Dietary preferences
  const dietaryMap: Record<string, Record<string, string>> = {
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
      'comum': 'Omnivoro - todos los alimentos permitidos',
      'vegetariana': 'VEGETARIANO - SIN carnes',
      'vegana': 'VEGANO - SIN carnes, huevos, lacteos',
      'low_carb': 'LOW CARB - evitar arroz, pan, pasta',
      'pescetariana': 'PESCETARIANO - SIN carnes rojas, solo pescado',
      'cetogenica': 'CETOGENICO - muy bajo en carbohidratos',
      'flexitariana': 'FLEXITARIANO - mayormente vegetariano',
    },
    pt: {
      'comum': 'Onivoro - todos os alimentos permitidos',
      'vegetariana': 'VEGETARIANO - SEM carnes',
      'vegana': 'VEGANO - SEM carnes, ovos, laticinios',
      'low_carb': 'LOW CARB - evitar arroz, pao, massa',
      'pescetariana': 'PESCETARIANO - SEM carnes vermelhas, apenas peixe',
      'cetogenica': 'CETOGENICO - muito baixo em carboidratos',
      'flexitariana': 'FLEXITARIANO - predominantemente vegetariano',
    },
    fr: {
      'comum': 'Omnivore - tous les aliments autorises',
      'vegetariana': 'VEGETARIEN - SANS viande',
      'vegana': 'VEGAN - SANS viande, oeufs, produits laitiers',
      'low_carb': 'LOW CARB - eviter riz, pain, pates',
      'pescetariana': 'PESCETARIEN - SANS viande rouge, seulement poisson',
      'cetogenica': 'CETOGENE - tres faible en glucides',
      'flexitariana': 'FLEXITARIEN - principalement vegetarien',
    },
    de: {
      'comum': 'Omnivor - alle Lebensmittel erlaubt',
      'vegetariana': 'VEGETARISCH - OHNE Fleisch',
      'vegana': 'VEGAN - OHNE Fleisch, Eier, Milchprodukte',
      'low_carb': 'LOW CARB - Reis, Brot, Nudeln vermeiden',
      'pescetariana': 'PESCETARISCH - OHNE rotes Fleisch, nur Fisch',
      'cetogenica': 'KETOGEN - sehr wenig Kohlenhydrate',
      'flexitariana': 'FLEXITARISCH - uberwiegend vegetarisch',
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
    en: {
      'emagrecer': 'GOAL: Weight loss - prioritize lean proteins and vegetables',
      'manter': 'GOAL: Maintenance - balanced diet',
      'ganhar_peso': 'GOAL: Weight gain - include calorie-dense foods',
    },
    es: {
      'emagrecer': 'OBJETIVO: Perder peso - priorizar proteinas magras y vegetales',
      'manter': 'OBJETIVO: Mantenimiento - dieta equilibrada',
      'ganhar_peso': 'OBJETIVO: Ganar peso - incluir alimentos caloricos',
    },
    pt: {
      'emagrecer': 'OBJETIVO: Emagrecimento - priorizar proteinas magras e vegetais',
      'manter': 'OBJETIVO: Manutencao - dieta equilibrada',
      'ganhar_peso': 'OBJETIVO: Ganho de peso - incluir alimentos caloricos',
    },
    fr: {
      'emagrecer': 'OBJECTIF: Perte de poids - privilegier proteines maigres et legumes',
      'manter': 'OBJECTIF: Maintien - alimentation equilibree',
      'ganhar_peso': 'OBJECTIF: Prise de poids - inclure aliments caloriques',
    },
    de: {
      'emagrecer': 'ZIEL: Gewichtsverlust - magere Proteine und Gemuse priorisieren',
      'manter': 'ZIEL: Erhaltung - ausgewogene Ernahrung',
      'ganhar_peso': 'ZIEL: Gewichtszunahme - kalorienreiche Lebensmittel einbeziehen',
    },
    it: {
      'emagrecer': 'OBIETTIVO: Perdita di peso - privilegiare proteine magre e verdure',
      'manter': 'OBIETTIVO: Mantenimento - dieta equilibrata',
      'ganhar_peso': 'OBIETTIVO: Aumento di peso - includere cibi calorici',
    },
  };

  let langKey = 'en';
  if (isSpanish) langKey = 'es';
  else if (isFrench) langKey = 'fr';
  else if (isGerman) langKey = 'de';
  else if (isItalian) langKey = 'it';
  else if (isPortuguese) langKey = 'pt';

  const parts: string[] = [];

  // Dietary preference
  parts.push(dietaryMap[langKey][restrictions.dietaryPreference] || dietaryMap[langKey]['comum']);

  // Goal
  parts.push(goalMap[langKey][restrictions.goal] || goalMap[langKey]['manter']);

  // Intolerances
  if (restrictions.intolerances.length > 0) {
    const intoleranceTexts = restrictions.intolerances
      .map(i => intoleranceMap[langKey][i] || `NO ${i}`)
      .join(', ');
    parts.push(intoleranceTexts);
  }

  // Excluded ingredients
  if (restrictions.excludedIngredients.length > 0) {
    const excludedLabel = isPortuguese ? 'Evitar:' : isSpanish ? 'Evitar:' : isFrench ? 'Eviter:' : isGerman ? 'Vermeiden:' : isItalian ? 'Evitare:' : 'Avoid:';
    parts.push(`${excludedLabel} ${restrictions.excludedIngredients.join(', ')}`);
  }

  return parts.join('\n');
}

// ============= PROMPT DO NUTRICIONISTA HIBRIDO (SIMPLES + INTELIGENTE) =============
function buildSimpleNutritionistPrompt(params: {
  dailyCalories: number;
  meals: { type: string; label: string; targetCalories: number; targetProtein?: number; targetCarbs?: number; targetFat?: number }[];
  optionsPerMeal: number;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  dayNumber: number;
  dayName: string;
  regional: RegionalConfig;
  countryCode: string;
  baseSystemPrompt?: string; // Prompt base do banco de dados
  nutritionalContext?: string; // Contexto nutricional enriquecido
}): string {
  const { dailyCalories, meals, optionsPerMeal, restrictions, dayNumber, dayName, regional, countryCode, baseSystemPrompt, nutritionalContext } = params;

  const restrictionText = getRestrictionText(restrictions, regional.language);
  
  // Obter prompt nutricional global para o país do usuário
  const globalNutritionPrompt = getGlobalNutritionPrompt(countryCode, {
    includePortionGuidelines: true,
    includeSourceHierarchy: true,
    includeConversionRules: true
  });
  
  const portionFormat = getPortionFormat(countryCode);
  const nutritionalSource = getNutritionalSource(countryCode);

  const mealsDescription = meals.map(m => 
    `- ${m.label}: ${m.targetCalories} kcal`
  ).join('\n');

  const mealsJsonTemplate = meals.map(m => `
    {
      "meal_type": "${m.type}",
      "label": "${m.label}",
      "target_calories": ${m.targetCalories},
      "options": [
        {
          "title": "Nome claro da refeicao",
          "foods": [
            {"name": "ovos mexidos", "grams": 100},
            {"name": "pao frances", "grams": 50},
            {"name": "cafe com leite", "grams": 200}
          ],
          "calories_kcal": ${m.targetCalories}
        }
      ]
    }`).join(',');

  // Usa o prompt do banco se disponível, senão usa o fallback hardcoded
  const systemPromptBase = baseSystemPrompt || `Voce e um NUTRICIONISTA CLINICO de nivel mundial, com mais de 20 anos de experiencia pratica atendendo pessoas comuns em consultorio, hospitais e clinicas.

Voce cria refeicoes como um profissional humano criaria para si mesmo, sua familia ou seus pacientes reais.

REGRA DE OURO: Priorize NATURALIDADE ALIMENTAR acima de otimizacao nutricional. Comida com alma, nao formula.`;

  // Adicionar contexto nutricional enriquecido se disponível
  const enrichedNutritionalContext = nutritionalContext ? `
--------------------------------------------------
PERFIL NUTRICIONAL CALCULADO (PRECISAO CIENTIFICA):
--------------------------------------------------
${nutritionalContext}
` : '';

  return `${systemPromptBase}

${globalNutritionPrompt}
${enrichedNutritionalContext}
IDIOMA: Responda INTEIRAMENTE em ${regional.languageName}
PAIS/REGIAO: ${nutritionalSource.flag} ${nutritionalSource.country} - Gere refeicoes tipicas, comuns e culturalmente apropriadas
FONTE NUTRICIONAL: ${nutritionalSource.sourceName} (${nutritionalSource.sourceKey})

FUNCAO: Gerar REFEICOES COMPLETAS, REALISTAS E NATURAIS para ${dayName} (Dia ${dayNumber})

--------------------------------------------------
ORDEM DE EXECUCAO OBRIGATORIA (CRITICA):
--------------------------------------------------
1. Escolha primeiro refeicoes comuns, populares e culturalmente reconhecidas
2. Aplique TODAS as restricoes alimentares obrigatorias
3. Ajuste as quantidades para atingir as calorias definidas
4. Revise naturalidade, variedade e apelo humano
5. Corrija qualquer opcao que pareca artificial, generica, repetitiva ou pouco comum
6. Somente apos essa revisao gere o JSON final

--------------------------------------------------
ESTRUTURA NUTRICIONAL OBRIGATORIA (INVISIVEL AO USUARIO):
--------------------------------------------------
Toda refeicao PRINCIPAL (almoco e jantar) DEVE conter:
1. PROTEINA PRINCIPAL: fonte clara de proteina (carne, frango, peixe, ovos, leguminosas)
2. CARBOIDRATO BASE: fonte de energia (arroz, batata, mandioca, macarrao, pao)
3. FIBRAS/VEGETAIS: legumes, verduras ou salada
4. GORDURA MODERADA: azeite, castanhas ou presente no preparo

Todo CAFE DA MANHA deve conter:
1. PROTEINA: ovos, queijo, iogurte, presunto ou similar
2. CARBOIDRATO: pao, tapioca, cereais ou frutas
3. BEBIDA: cafe, leite, suco ou cha

Todo LANCHE deve conter:
1. Pelo menos 1 fonte de proteina (iogurte, queijo, castanhas, ovo)
2. Acompanhamento (fruta, pao, biscoito integral)

--------------------------------------------------
MINIMOS DE PROTEINA (NAO MOSTRAR AO USUARIO):
--------------------------------------------------
- Almoco: minimo 25g de proteina (equivale a ~120g de carne/frango/peixe)
- Jantar: minimo 25g de proteina
- Cafe da manha: minimo 12g de proteina (2 ovos ou equivalente)
- Lanches: minimo 8g de proteina cada

--------------------------------------------------
REGRAS DE VARIACAO ENTRE OPCOES (CRITICO):
--------------------------------------------------
Para cada refeicao com multiplas opcoes:
1. NUNCA repita a mesma proteina principal em mais de 1 opcao
   - Se opcao 1 tem frango, opcao 2 deve ter carne/peixe/ovo
   - Se opcao 1 tem ovo, opcao 2 deve ter queijo/iogurte
2. VARIE o carboidrato base entre opcoes
   - Se opcao 1 tem arroz, opcao 2 pode ter batata ou macarrao
3. VARIE o estilo de preparacao
   - Grelhado, cozido, refogado, assado - nao repita
4. As opcoes devem ser VISIVELMENTE diferentes
   - Usuario deve olhar e ver 3 pratos distintos, nao variacoes do mesmo

EXEMPLO DE VARIACAO CORRETA (Almoco):
- Opcao 1: Arroz + feijao + FRANGO grelhado + salada
- Opcao 2: Pure de batata + CARNE moida + legumes refogados
- Opcao 3: Macarrao + PEIXE assado + brocolis

EXEMPLO DE VARIACAO INCORRETA (evitar):
- Opcao 1: Arroz + feijao + frango grelhado + salada
- Opcao 2: Arroz + feijao + frango assado + legumes (ERRADO: mesma proteina)
- Opcao 3: Arroz + feijao + frango desfiado + tomate (ERRADO: mesma proteina)

--------------------------------------------------
REGRAS ABSOLUTAS (NAO NEGOCIAVEIS):
--------------------------------------------------
- Gere apenas ALIMENTOS E REFEICOES PRONTAS PARA CONSUMO
- As refeicoes devem ser SIMPLES, COMUNS e ACESSIVEIS
- As refeicoes devem parecer "comida de verdade", nao dieta artificial
- Evite cardapios excessivamente monotonos ou com aparencia hospitalar
- NAO use emojis
- NAO mencione objetivos corporais ou resultados
- NAO de conselhos medicos
- NAO use linguagem tecnica excessiva
- NAO utilize medidas fracionadas complexas (1/4, 1/2, 1/3) - use apenas numeros inteiros ou "meia"
- NAO separe clara e gema de ovos - use ovos inteiros
- Use APENAS unidades domesticas naturais: ${regional.domesticUnits}

--------------------------------------------------
META CALORICA DIARIA: ${dailyCalories} kcal
--------------------------------------------------
REFEICOES DO DIA:
${mealsDescription}

--------------------------------------------------
RESTRICOES OBRIGATORIAS:
--------------------------------------------------
${restrictionText}

COMPLIANCE DE RESTRICOES (CRITICO):
- Se houver intolerancia declarada, TODOS os alimentos devem respeitar ESTRITAMENTE
- NAO inclua NENHUM alimento que contenha ou derive do ingrediente restrito
- Em caso de duvida, substitua por alternativa segura

--------------------------------------------------
PROIBICOES ABSOLUTAS PARA INTOLERANCIA A LACTOSE:
--------------------------------------------------
- NAO use NUNCA: queijo, iogurte natural, leite, manteiga, requeijao, creme de leite, pao de queijo, queijo coalho
- USE NO LUGAR: queijo vegetal, iogurte vegetal, leite vegetal, margarina vegetal
- "Tapioca com queijo" deve virar "Tapioca com ovo" ou "Tapioca com frango"
- "Omelete de queijo" deve virar "Omelete de legumes" ou "Omelete de tomate"
- "Iogurte natural" deve virar "Iogurte vegetal" ou fruta
- "Cafe com leite" deve virar "Cafe puro" ou "Cafe com leite vegetal"
- "Pao de queijo" deve virar "Pao frances" ou "Tapioca"
- QUALQUER prato com queijo ou derivado lacteo esta PROIBIDO

--------------------------------------------------
CONTEXTO CULTURAL:
--------------------------------------------------
${regional.typicalMeals}

${regional.culturalNotes}

--------------------------------------------------
TABELA DE REFERENCIA CALORICA (USE OBRIGATORIAMENTE):
--------------------------------------------------
PROTEINAS:
- 1 ovo: 70 kcal | 2 ovos: 140 kcal
- 100g frango grelhado: 165 kcal
- 100g carne bovina magra: 180 kcal
- 100g peixe: 120 kcal
- 1 fatia presunto: 30 kcal
- 100g tofu: 80 kcal

CARBOIDRATOS:
- 1 pao frances (50g): 150 kcal
- 2 fatias pao integral: 140 kcal
- 1 tapioca media: 70 kcal (sem recheio)
- 100g arroz cozido: 130 kcal
- 100g macarrao cozido: 130 kcal
- 100g batata cozida: 85 kcal
- 1 banana: 90 kcal
- 1 maca: 70 kcal
- 1 fatia mamao: 45 kcal

LATICINIOS/ALTERNATIVAS:
- 1 pote iogurte natural (170g): 100 kcal
- 1 pote iogurte vegetal (170g): 120 kcal
- 1 fatia queijo mussarela: 80 kcal
- 200ml leite: 120 kcal
- 200ml leite vegetal: 60 kcal

OUTROS:
- 1 colher sopa granola: 55 kcal
- 1 colher sopa azeite: 90 kcal
- 30g castanhas/nozes: 180 kcal
- 1 xicara cafe puro: 5 kcal
- 1 xicara cafe com leite: 70 kcal
- 1 xicara cafe com leite vegetal: 40 kcal

CALCULO OBRIGATORIO:
- Some as calorias de CADA ingrediente usando esta tabela
- O total DEVE bater com o alvo (margem de ±5%)
- Se nao bater, ajuste quantidades ou substitua ingredientes

--------------------------------------------------
FORMATO DE SAIDA DOS ALIMENTOS (CRITICO):
--------------------------------------------------
CADA alimento DEVE ser um objeto com:
- "name": nome do alimento (ex: "arroz cozido", "frango grelhado")
- "grams": quantidade em gramas (numero inteiro)

REGRAS DE GRAMAGEM:
- SEMPRE especifique a quantidade em gramas
- Use valores realistas baseados em porcoes comuns
- Porcoes de referencia:
  * 1 ovo = 50g
  * 1 pao frances = 50g
  * 1 fatia pao = 30g
  * 1 xicara cafe = 50ml (use 50g)
  * 1 copo leite = 200ml (use 200g)
  * 1 prato arroz = 150g
  * 1 concha feijao = 80g
  * 1 file frango = 120g
  * 1 bife = 120g
  * 1 banana = 100g
  * 1 maca = 150g
  * 1 pote iogurte = 170g
  * 1 colher sopa = 15g
  * 1 fatia mamao = 100g

--------------------------------------------------
ESTRUTURA DE GERACAO:
--------------------------------------------------
Para CADA refeicao, gere EXATAMENTE ${optionsPerMeal} OPCOES GENUINAMENTE DIFERENTES.
CADA OPCAO deve ter:
- "title": Nome claro e simples da refeicao
- "foods": Array de objetos com "name" e "grams"
- "calories_kcal": Estimativa de calorias (sera recalculado pelo sistema)

Descreva refeicoes como as pessoas falam no dia a dia, nao como lista de ingredientes.

--------------------------------------------------
GUIA DE REFEICOES POR TIPO (OBRIGATORIO):
--------------------------------------------------
CAFE DA MANHA:
- Familiar, agradavel e mastigavel
- Paes, tapioca recheada, ovos, frutas, iogurte vegetal, cafe, sucos
- Evite combinacoes incomuns ou artificiais

LANCHE MANHA/TARDE:
- Pratico e reconhecivel
- Frutas, iogurte vegetal, castanhas, sanduiche leve, bolo simples

ALMOCO:
- Prato de comida de verdade
- Refeicao quente, completa e substancial
- Sempre com proteina + carboidrato + salada ou legumes

JANTAR:
- Refeicao completa e substancial
- Nunca fragil ou leve demais
- Sempre com proteina clara e acompanhamento real

--------------------------------------------------
REGRA CRITICA DO JANTAR:
--------------------------------------------------
- Jantar NUNCA pode ser apenas sopa ou apenas salada
- Sopa, quando usada, deve conter proteina e base solida (ex: frango, legumes, arroz ou macarrao)
- Jantar deve satisfazer fome real

--------------------------------------------------
REGRAS DE ALIMENTOS COMPLETOS:
--------------------------------------------------
- TAPIOCA: sempre "1 tapioca media recheada com [recheio]"
- OMELETE: sempre com ingredientes descritos
- SANDUICHE: sempre com recheio descrito
- SALADA: sempre listar ingredientes principais
- SOPA: sempre indicar tipo e ingredientes principais

--------------------------------------------------
BLOQUEIO DE COMIDA GENERICA (CRITICO):
--------------------------------------------------
- NAO use termos vagos como "proteina", "porcao de carne" ou "legumes"
- Sempre especifique alimentos de forma cotidiana (ex: bife grelhado, frango desfiado, cenoura e abobrinha refogadas)
- Se a descricao nao parecer algo que alguem falaria em casa ou no restaurante, descarte

--------------------------------------------------
REGRA DE VARIEDADE DIARIA (OBRIGATORIA):
--------------------------------------------------
- A mesma proteina principal nao pode aparecer em mais de duas refeicoes no mesmo dia
- Evite ovos no jantar se ja foram usados no cafe da manha
- Varie frango, carne, peixe e ovos ao longo do dia

--------------------------------------------------
CONTROLE ANTI-REPETICAO:
--------------------------------------------------
- NAO repita estruturas similares entre opcoes
- Varie preparacoes (grelhado, cozido, refogado, assado)
- Cada opcao deve ser genuinamente diferente

--------------------------------------------------
BLOQUEIOS EXPLICITOS (OBRIGATORIO):
--------------------------------------------------
- NAO gere lanches sem proteina (fruta sozinha NAO e lanche valido)
- NAO gere cafe da manha sem proteina (cafe + pao NAO e valido sozinho)
- NAO gere almoco/jantar sem proteina clara identificavel
- Evite mingau, vitaminas ou preparacoes liquidas como escolha principal
- Evite combinar vitamina + granola + pao na mesma opcao
- Evite construcoes que parecam pensadas para bater macro, nao para prazer alimentar

--------------------------------------------------
BLOQUEIO DE VIES NUTRICIONAL (OBRIGATORIO):
--------------------------------------------------
- IGNORE completamente termos como "emagrecer", "manter peso" ou "ganhar peso" ao escolher os alimentos
- Nunca associe "vegetariano" ou "sem lactose" a comida liquida, leve ou restritiva
- Refeicoes devem continuar robustas, mastigaveis e completas

--------------------------------------------------
SCORING DE NATURALIDADE (VALIDACAO INTERNA):
--------------------------------------------------
Antes de incluir cada opcao, avalie mentalmente:
- Popularidade cultural (0-3): essa refeicao e comum e reconhecivel na regiao?
- Simplicidade (0-2): e facil de preparar e entender?
- Coerencia de combinacao (0-3): os alimentos combinam bem juntos?
- Apelo humano (0-2): alguem escolheria isso por vontade propria?
- Proteina adequada (0-2): atinge o minimo de proteina para o tipo de refeicao?
Se a soma for menor que 8, descarte e gere outra opcao.

--------------------------------------------------
PADRAO DE QUALIDADE HUMANA (VALIDACAO FINAL):
--------------------------------------------------
- "Uma pessoa comum faria ou pediria isso?"
- "Parece comida ou parece dieta?"
- "As 3 opcoes sao visivelmente diferentes entre si?"
- Se parecer dieta, descarte
- Se parecer algo que so uma IA sugeriria, descarte

--------------------------------------------------
REVISAO FINAL OBRIGATORIA (SILENCIOSA):
--------------------------------------------------
Antes de responder:
- Revise se ha refeicoes artificiais, repetitivas ou estranhas
- Corrija internamente qualquer problema
- Nao mencione esta revisao na resposta

--------------------------------------------------
RESPONDA EXCLUSIVAMENTE EM JSON VALIDO:
--------------------------------------------------
{
  "day": ${dayNumber},
  "day_name": "${dayName}",
  "meals": [${mealsJsonTemplate}
  ],
  "total_calories": ${dailyCalories}
}

IMPORTANTE - FORMATO DOS ALIMENTOS:
- Cada alimento DEVE ser um objeto com "name" (string) e "grams" (numero)
- NAO use strings simples para alimentos
- Exemplo correto:
  {
    "title": "Cafe da manha completo",
    "foods": [
      {"name": "ovos mexidos", "grams": 100},
      {"name": "pao frances", "grams": 50},
      {"name": "cafe com leite vegetal", "grams": 200}
    ],
    "calories_kcal": 350
  }
- Exemplo ERRADO (nao use):
  "foods": ["2 ovos mexidos", "1 pao frances"]

GERE AGORA o cardapio completo com ${optionsPerMeal} OPCOES DIFERENTES para cada refeicao.`;
}

// ============= DISTRIBUICAO CALORICA =============
const CALORIE_DISTRIBUTION: Record<string, number> = {
  cafe_manha: 0.22,
  lanche_manha: 0.08,
  almoco: 0.30,
  lanche_tarde: 0.10,
  jantar: 0.22,
  ceia: 0.08,
};

// ============= INGREDIENTES PROIBIDOS POR RESTRICAO =============
const FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  // Intolerâncias
  lactose: ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao', 'creme de leite', 'nata', 'coalho', 'mussarela', 'parmesao', 'ricota', 'cottage', 'cream cheese', 'chantilly', 'leite condensado', 'doce de leite', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'fromage', 'lait', 'beurre', 'formaggio', 'latte', 'burro', 'käse', 'milch', 'queso', 'crema', 'mantequilla'],
  gluten: ['trigo', 'pao', 'massa', 'macarrao', 'pizza', 'bolo', 'biscoito', 'bolacha', 'torrada', 'farinha de trigo', 'cevada', 'centeio', 'aveia', 'wheat', 'bread', 'pasta', 'cake', 'cookie', 'biscuit', 'flour', 'barley', 'rye', 'oat', 'pain', 'gateau', 'farine', 'pane', 'torta', 'farina', 'brot', 'kuchen', 'mehl', 'pan', 'harina', 'galleta'],
  amendoim: ['amendoim', 'pasta de amendoim', 'peanut', 'cacahuete', 'mani', 'arachide', 'erdnuss'],
  frutos_do_mar: ['camarao', 'lagosta', 'caranguejo', 'siri', 'marisco', 'lula', 'polvo', 'ostra', 'mexilhao', 'shrimp', 'lobster', 'crab', 'oyster', 'squid', 'octopus', 'crevette', 'homard', 'crabe', 'gambero', 'aragosta', 'granchio', 'garnele', 'hummer', 'krabbe', 'camaron', 'langosta', 'cangrejo'],
  peixe: ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'robalo', 'fish', 'salmon', 'tuna', 'cod', 'sardine', 'poisson', 'saumon', 'thon', 'morue', 'pesce', 'salmone', 'tonno', 'merluzzo', 'fisch', 'lachs', 'thunfisch', 'kabeljau', 'pescado', 'atun', 'bacalao'],
  ovos: ['ovo', 'ovos', 'gema', 'clara', 'omelete', 'egg', 'eggs', 'omelette', 'oeuf', 'omelette', 'uovo', 'uova', 'frittata', 'ei', 'eier', 'omelett', 'huevo', 'huevos', 'tortilla'],
  soja: ['soja', 'tofu', 'edamame', 'leite de soja', 'molho de soja', 'shoyu', 'soy', 'soya', 'sojamilch', 'sojasauce'],
  cafeina: ['cafe', 'cha preto', 'cha verde', 'guarana', 'chocolate', 'coffee', 'tea', 'cafe', 'the', 'caffe', 'te', 'kaffee', 'tee', 'schokolade'],
  milho: ['milho', 'fuba', 'polenta', 'pipoca', 'corn', 'maize', 'mais', 'polenta', 'popcorn', 'granoturco', 'maiz', 'palomitas'],
  leguminosas: ['feijao', 'lentilha', 'grao de bico', 'ervilha', 'fava', 'beans', 'lentils', 'chickpeas', 'peas', 'haricots', 'lentilles', 'pois chiches', 'petits pois', 'fagioli', 'lenticchie', 'ceci', 'piselli', 'bohnen', 'linsen', 'kichererbsen', 'erbsen', 'frijoles', 'lentejas', 'garbanzos', 'guisantes'],
};

// Ingredientes de origem animal (para vegano/vegetariano)
const ANIMAL_INGREDIENTS = ['carne', 'frango', 'porco', 'boi', 'peru', 'pato', 'bacon', 'presunto', 'salsicha', 'linguica', 'mortadela', 'salame', 'peito de frango', 'file', 'costela', 'picanha', 'alcatra', 'patinho', 'acém', 'maminha', 'coxa', 'sobrecoxa', 'asa', 'meat', 'chicken', 'pork', 'beef', 'turkey', 'duck', 'ham', 'sausage', 'viande', 'poulet', 'porc', 'boeuf', 'dinde', 'jambon', 'saucisse', 'carne', 'pollo', 'maiale', 'manzo', 'tacchino', 'prosciutto', 'fleisch', 'hähnchen', 'schwein', 'rind', 'pute', 'schinken', 'wurst', 'cerdo', 'res', 'pavo', 'jamon', 'salchicha'];

const DAIRY_AND_EGGS = ['leite', 'queijo', 'iogurte', 'ovo', 'ovos', 'manteiga', 'creme de leite', 'requeijao', 'milk', 'cheese', 'yogurt', 'egg', 'eggs', 'butter', 'cream', 'lait', 'fromage', 'yaourt', 'oeuf', 'oeufs', 'beurre', 'creme', 'latte', 'formaggio', 'uovo', 'uova', 'burro', 'panna', 'milch', 'käse', 'joghurt', 'ei', 'eier', 'sahne', 'leche', 'queso', 'yogur', 'huevo', 'huevos', 'mantequilla', 'crema', 'mel', 'honey', 'miel', 'honig'];

const FISH_INGREDIENTS = ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'fish', 'salmon', 'tuna', 'cod', 'sardine', 'poisson', 'saumon', 'thon', 'pesce', 'salmone', 'tonno', 'fisch', 'lachs', 'thunfisch', 'pescado', 'atun'];

// ============= VALIDACAO POS-GERACAO =============
interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    food: string;
    reason: string;
    restriction: string;
  }>;
  cleanedFoods: string[];
}

interface IntoleranceMapping {
  ingredient: string;
  intolerance_key: string;
}

interface SafeKeyword {
  keyword: string;
  intolerance_key: string;
}

async function fetchIntoleranceMappings(supabaseClient: any): Promise<{
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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function checkForbiddenIngredient(
  food: string,
  forbiddenList: string[],
  safeKeywords: string[] = []
): boolean {
  const normalizedFood = normalizeText(food);
  
  // Primeiro verifica se é seguro (ex: "leite de coco" é seguro para lactose)
  for (const safe of safeKeywords) {
    if (normalizedFood.includes(normalizeText(safe))) {
      return false; // É seguro, não é proibido
    }
  }
  
  // Depois verifica se contém ingrediente proibido
  for (const forbidden of forbiddenList) {
    if (normalizedFood.includes(normalizeText(forbidden))) {
      return true; // Contém ingrediente proibido
    }
  }
  
  return false;
}

function validateFood(
  food: string,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[]
): { isValid: boolean; reason?: string; restriction?: string } {
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
    // Vegano: sem carne, peixe, laticínios, ovos
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
    // Vegetariano: sem carne e peixe
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
    // Pescetariano: sem carne, mas pode peixe
    for (const meat of ANIMAL_INGREDIENTS) {
      if (normalizedFood.includes(normalizeText(meat))) {
        return {
          isValid: false,
          reason: `Contém carne: ${meat}`,
          restriction: 'dietary_pescetarian',
        };
      }
    }
  }
  
  return { isValid: true };
}

// ============= CÁLCULO DE CALORIAS (usa tabela compartilhada) =============
function calculateOptionCalories(foods: FoodItem[]): number {
  return foods.reduce((total, food) => {
    const result = calculateFoodCalories(food.name, food.grams);
    return total + result.calories;
  }, 0);
}

function validateMealPlan(
  dayPlan: SimpleDayPlan,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[]
): {
  validatedPlan: SimpleDayPlan;
  violations: Array<{ meal: string; food: string; reason: string; restriction: string }>;
} {
  const violations: Array<{ meal: string; food: string; reason: string; restriction: string }> = [];
  
  const validatedMeals = dayPlan.meals.map(meal => {
    const validatedOptions = meal.options.map(option => {
      const cleanedFoods: FoodItem[] = [];
      
      for (const food of option.foods) {
        const foodName = typeof food === 'string' ? food : food.name;
        const validation = validateFood(foodName, restrictions, dbMappings, dbSafeKeywords);
        
        if (validation.isValid) {
          cleanedFoods.push(food);
        } else {
          violations.push({
            meal: meal.label,
            food: foodName,
            reason: validation.reason || 'Restrição violada',
            restriction: validation.restriction || 'unknown',
          });
        }
      }
      
      // Calcular calorias baseado na tabela
      const calculatedCalories = calculateOptionCalories(cleanedFoods);
      
      return {
        ...option,
        foods: cleanedFoods.length > 0 ? cleanedFoods : [{ name: 'Opção removida por restrição', grams: 0 }],
        calculated_calories: calculatedCalories,
        calories_kcal: calculatedCalories, // Substitui o valor da IA pelo calculado
      };
    });
    
    return {
      ...meal,
      options: validatedOptions,
    };
  });
  
  return {
    validatedPlan: {
      ...dayPlan,
      meals: validatedMeals,
    },
    violations,
  };
}

// ============= MAIN SERVER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("AI Meal Plan Generator - Hybrid Mode (Simple + Smart)");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request
    const requestBody = await req.json();
    const {
      dailyCalories: requestedCalories, // Pode ser undefined, será calculado
      daysCount = 1,
      optionsPerMeal = 3,
      mealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"],
      // Novos parâmetros para salvar no banco (vindos do MealPlanGenerator)
      planName,
      startDate,
      existingPlanId,
      weekNumber,
      customMealTimes,
      saveToDatabase = false, // Por padrão não salva (modo teste admin)
    } = requestBody;
    
    // Detectar automaticamente se deve salvar no banco
    const shouldSaveToDatabase = saveToDatabase || planName || startDate;

    logStep("Request params", { requestedCalories, daysCount, optionsPerMeal, mealTypes, shouldSaveToDatabase });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    
    // Get regional configuration based on user's country
    const userCountry = profile.country || 'BR';
    const regional = getRegionalConfig(userCountry);
    
    logStep("Regional config", { country: userCountry, language: regional.language });

    const restrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || 'comum',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'manter',
    };

    logStep("User restrictions", restrictions);

    // ============= CÁLCULOS NUTRICIONAIS CENTRALIZADOS =============
    // Calcular targets nutricionais baseados no perfil do usuário
    let nutritionalTargets: NutritionalTargets | null = null;
    let dailyCalories = requestedCalories || 2000; // Fallback padrão
    let nutritionalContext = ""; // Contexto para enriquecer o prompt
    
    if (profile.weight_current && profile.height && profile.age && profile.sex) {
      const physicalData: UserPhysicalData = {
        sex: profile.sex ?? null,
        age: profile.age ?? null,
        height: profile.height ?? null,
        weight_current: profile.weight_current ?? null,
        weight_goal: profile.weight_goal ?? null,
        activity_level: profile.activity_level ?? null,
      };

      // Determinar parâmetros de estratégia baseado no objetivo
      const goal = profile.goal || 'manter';
      const dietaryPreference = profile.dietary_preference || 'comum';
      
      let calorieModifier = 0;
      let proteinPerKg = 1.6;
      let carbRatio = 0.45;
      let fatRatio = 0.30;

      // Ajustes por objetivo
      if (goal === 'emagrecer') {
        calorieModifier = -500;
        proteinPerKg = 2.0;
      } else if (goal === 'ganhar_peso') {
        calorieModifier = 400;
        proteinPerKg = 2.2;
      }

      // Ajustes por dieta
      if (dietaryPreference === 'cetogenica') {
        carbRatio = 0.10;
        fatRatio = 0.70;
      } else if (dietaryPreference === 'low_carb') {
        carbRatio = 0.25;
        fatRatio = 0.40;
      }

      const strategyParams = {
        calorieModifier,
        proteinPerKg,
        carbRatio,
        fatRatio,
      };

      nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
      
      if (nutritionalTargets) {
        // Se não foi passado dailyCalories na request, usar o calculado
        if (!requestedCalories) {
          dailyCalories = nutritionalTargets.targetCalories;
        }
        
        // Gerar contexto nutricional para o prompt
        nutritionalContext = buildNutritionalContextForPrompt(nutritionalTargets);
        nutritionalContext += "\n" + buildMealDistributionForPrompt(nutritionalTargets, mealTypes);
        
        // Validar saúde dos targets
        const healthCheck = validateTargetsHealth(nutritionalTargets);
        if (!healthCheck.isHealthy) {
          logStep("⚠️ Health warnings", { warnings: healthCheck.warnings });
        }
        
        // Estimar tempo para atingir meta (se aplicável)
        if (profile.weight_goal && calorieModifier !== 0) {
          const timeEstimate = estimateTimeToGoal(
            profile.weight_current,
            profile.weight_goal,
            calorieModifier
          );
          if (timeEstimate) {
            logStep("Goal time estimate", { weeks: timeEstimate.weeks, months: timeEstimate.months });
          }
        }
        
        logStep("Nutritional targets calculated", {
          bmr: nutritionalTargets.bmr,
          tdee: nutritionalTargets.tdee,
          targetCalories: nutritionalTargets.targetCalories,
          protein: nutritionalTargets.protein,
          carbs: nutritionalTargets.carbs,
          fat: nutritionalTargets.fat,
        });
      }
    } else {
      logStep("Incomplete profile data, using default calories", { dailyCalories });
    }

    // Fetch intolerance mappings from database for validation
    logStep("Fetching intolerance mappings from database");
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings loaded", { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // Buscar prompt do banco de dados
    let aiPromptData: AIPromptData | null = null;
    try {
      aiPromptData = await getAIPrompt('generate-ai-meal-plan');
      logStep("AI Prompt loaded from database", { 
        functionId: aiPromptData.function_id,
        model: aiPromptData.model,
        promptLength: aiPromptData.system_prompt.length 
      });
    } catch (promptError) {
      logStep("Warning: Could not load AI prompt from database, using fallback", { 
        error: promptError instanceof Error ? promptError.message : 'Unknown error' 
      });
    }

    // Build meals with target calories and regional labels
    // Usar distribuição centralizada se temos targets calculados
    let meals;
    if (nutritionalTargets) {
      const mealDistribution = calculateMealDistribution(nutritionalTargets, mealTypes);
      meals = mealDistribution.map((dist) => ({
        type: dist.mealType,
        label: regional.mealLabels[dist.mealType] || dist.label,
        targetCalories: dist.calories,
        targetProtein: dist.protein,
        targetCarbs: dist.carbs,
        targetFat: dist.fat,
      }));
      logStep("Meal distribution calculated from nutritional targets", { 
        meals: meals.map(m => ({ type: m.type, cal: m.targetCalories, prot: m.targetProtein })) 
      });
    } else {
      meals = mealTypes.map((type: string) => ({
        type,
        label: regional.mealLabels[type] || type,
        targetCalories: Math.round(dailyCalories * (CALORIE_DISTRIBUTION[type] || 0.10)),
      }));
    }

    // Generate plan for each day
    const generatedDays: SimpleDayPlan[] = [];
    const allViolations: Array<{ day: number; meal: string; food: string; reason: string; restriction: string }> = [];

    for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
      const dayName = regional.dayNames[dayIndex % 7];
      
      logStep(`Generating day ${dayIndex + 1}`, { dayName, language: regional.language });

      const prompt = buildSimpleNutritionistPrompt({
        dailyCalories,
        meals,
        optionsPerMeal,
        restrictions,
        dayNumber: dayIndex + 1,
        dayName,
        regional,
        countryCode: userCountry,
        baseSystemPrompt: aiPromptData?.system_prompt, // Passa o prompt do banco
        nutritionalContext, // Contexto nutricional enriquecido
      });

      // Call Google AI API directly
      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

      // Usar modelo do banco ou fallback para gemini-2.0-flash-lite
      const modelName = aiPromptData?.model || 'gemini-2.0-flash-lite';
      logStep(`Using AI model: ${modelName}`);

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            }
          }),
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        logStep("AI API Error", { status: aiResponse.status, error: errorText });
        
        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }
        throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      logStep("AI response received", { contentLength: content.length });

      // Parse JSON from response
      try {
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const dayPlan: SimpleDayPlan = JSON.parse(content);
        
        // ============= VALIDAÇÃO PÓS-GERAÇÃO =============
        logStep(`Validating day ${dayIndex + 1} against restrictions`);
        
        const validationResult = validateMealPlan(
          dayPlan,
          {
            intolerances: restrictions.intolerances,
            dietaryPreference: restrictions.dietaryPreference,
            excludedIngredients: restrictions.excludedIngredients,
          },
          dbMappings,
          dbSafeKeywords
        );
        
        // Registrar violações encontradas
        if (validationResult.violations.length > 0) {
          logStep(`⚠️ VIOLATIONS FOUND on day ${dayIndex + 1}`, {
            count: validationResult.violations.length,
            violations: validationResult.violations,
          });
          
          // Adicionar ao array de todas as violações
          validationResult.violations.forEach(v => {
            allViolations.push({
              day: dayIndex + 1,
              ...v,
            });
          });
        } else {
          logStep(`✓ Day ${dayIndex + 1} passed validation - no violations`);
        }
        
        // Usar o plano validado (com alimentos problemáticos removidos)
        generatedDays.push(validationResult.validatedPlan);
        
        logStep(`Day ${dayIndex + 1} generated and validated`, { 
          mealsCount: validationResult.validatedPlan.meals?.length,
          totalCalories: validationResult.validatedPlan.total_calories,
          violationsRemoved: validationResult.violations.length,
        });
      } catch (parseError) {
        logStep("JSON parse error", { error: parseError, content: content.substring(0, 500) });
        throw new Error(`Failed to parse AI response for day ${dayIndex + 1}`);
      }
    }

    // Log summary of all violations
    if (allViolations.length > 0) {
      logStep("⚠️ TOTAL VIOLATIONS SUMMARY", {
        totalViolations: allViolations.length,
        byRestriction: allViolations.reduce((acc, v) => {
          acc[v.restriction] = (acc[v.restriction] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });
    } else {
      logStep("✓ ALL DAYS PASSED VALIDATION - no violations detected");
    }

    logStep("All days generated and validated", { totalDays: generatedDays.length });

    // ============= SALVAR NO BANCO DE DADOS (se solicitado) =============
    if (shouldSaveToDatabase) {
      logStep("Saving to database...");
      
      const start = startDate ? new Date(startDate) : new Date();
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + daysCount - 1);
      
      let mealPlanIdToUse = existingPlanId;
      let mealPlan;
      
      if (existingPlanId) {
        // Atualizar plano existente
        const { data: existingPlan, error: fetchError } = await supabaseClient
          .from("meal_plans")
          .select("*")
          .eq("id", existingPlanId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !existingPlan) {
          throw new Error("Plano alimentar não encontrado");
        }

        const newEndDate = endDate.toISOString().split('T')[0];
        
        const updateData: any = { 
          updated_at: new Date().toISOString(),
          custom_meal_times: customMealTimes || existingPlan.custom_meal_times || null
        };
        
        if (newEndDate > existingPlan.end_date) {
          updateData.end_date = newEndDate;
        }
        
        await supabaseClient
          .from("meal_plans")
          .update(updateData)
          .eq("id", existingPlanId);
        
        mealPlan = { ...existingPlan, custom_meal_times: customMealTimes || existingPlan.custom_meal_times };
        mealPlanIdToUse = existingPlan.id;
        logStep("Updated existing meal plan", { planId: mealPlanIdToUse });
      } else {
        // Criar novo plano
        const { data: newPlan, error: planError } = await supabaseClient
          .from("meal_plans")
          .insert({
            user_id: user.id,
            name: planName || `Plano ${start.toLocaleDateString('pt-BR')}`,
            start_date: start.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_active: true,
            custom_meal_times: customMealTimes || null
          })
          .select()
          .single();

        if (planError) throw new Error(`Error creating meal plan: ${planError.message}`);
        
        mealPlan = newPlan;
        mealPlanIdToUse = newPlan.id;
        logStep("Meal plan created", { planId: mealPlanIdToUse });

        // Desativar outros planos
        await supabaseClient
          .from("meal_plans")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .neq("id", mealPlanIdToUse);
      }

      // Converter os dias gerados para meal_plan_items
      const items: any[] = [];
      const targetWeekNum = weekNumber || 1;
      
      for (let dayIndex = 0; dayIndex < generatedDays.length; dayIndex++) {
        const day = generatedDays[dayIndex];
        
        for (const meal of day.meals) {
          // Pegar a primeira opção de cada refeição (optionsPerMeal = 1)
          const firstOption = meal.options?.[0];
          if (!firstOption) continue;
          
          // Converter foods para o formato recipe_ingredients
          const recipeIngredients = (firstOption.foods || []).map((food: any) => {
            if (typeof food === 'string') {
              return { item: food, quantity: "", unit: "" };
            }
            return {
              item: food.name || food.item || "",
              quantity: food.grams ? `${food.grams}g` : (food.quantity || ""),
              unit: food.unit || ""
            };
          });
          
          items.push({
            meal_plan_id: mealPlanIdToUse,
            day_of_week: dayIndex,
            meal_type: meal.meal_type,
            recipe_name: firstOption.title || meal.label,
            recipe_calories: firstOption.calculated_calories || firstOption.calories_kcal || meal.target_calories,
            recipe_protein: 0, // A IA não retorna macros detalhados neste formato
            recipe_carbs: 0,
            recipe_fat: 0,
            recipe_prep_time: 15,
            recipe_ingredients: recipeIngredients,
            recipe_instructions: [],
            week_number: targetWeekNum
          });
        }
      }

      logStep("Inserting meal items", { count: items.length });

      const { error: itemsError } = await supabaseClient
        .from("meal_plan_items")
        .insert(items);

      if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
      logStep("Meal plan items created", { count: items.length });

      return new Response(
        JSON.stringify({
          success: true,
          mealPlan: {
            id: mealPlanIdToUse,
            ...mealPlan,
            items: items
          },
          stats: {
            daysGenerated: generatedDays.length,
            totalMeals: items.length,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retorno padrão para modo teste (sem salvar no banco)
    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          daily_calories: dailyCalories,
          options_per_meal: optionsPerMeal,
          restrictions,
          regional: {
            country: userCountry,
            language: regional.language,
            measurement_system: regional.measurementSystem,
          },
          days: generatedDays,
        },
        validation: {
          totalViolationsRemoved: allViolations.length,
          violations: allViolations.length > 0 ? allViolations : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("Error", { message: errorMessage, stack: errorStack });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
