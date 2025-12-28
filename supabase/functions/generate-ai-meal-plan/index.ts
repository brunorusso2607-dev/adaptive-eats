import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-MEAL-PLAN] ${step}${detailsStr}`);
};

// ============= TIPOS - FORMATO SIMPLIFICADO =============
interface SimpleMealOption {
  title: string;
  foods: string[];
  calories_kcal: number;
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
  meals: { type: string; label: string; targetCalories: number }[];
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
}): string {
  const { dailyCalories, meals, optionsPerMeal, restrictions, dayNumber, dayName, regional } = params;

  const restrictionText = getRestrictionText(restrictions, regional.language);

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
            "2 ovos mexidos",
            "2 fatias de pao",
            "1 xicara de cafe"
          ],
          "calories_kcal": ${m.targetCalories}
        }
      ]
    }`).join(',');

  return `Voce e um NUTRICIONISTA CLINICO de nivel mundial, com mais de 20 anos de experiencia pratica atendendo pessoas comuns em consultorio, hospitais e clinicas.

Voce cria refeicoes como um profissional humano criaria para si mesmo, sua familia ou seus pacientes reais.

REGRA DE OURO: Priorize NATURALIDADE ALIMENTAR acima de otimizacao nutricional. Comida com alma, nao formula.

IDIOMA: Responda INTEIRAMENTE em ${regional.languageName}
PAIS/REGIAO: Gere refeicoes tipicas, comuns e culturalmente apropriadas para esta regiao

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
ESTRUTURA DE GERACAO:
--------------------------------------------------
Para CADA refeicao, gere EXATAMENTE ${optionsPerMeal} OPCOES GENUINAMENTE DIFERENTES.
CADA OPCAO deve ter:
- Nome claro e simples da refeicao
- Lista de alimentos prontos com quantidades intuitivas
- Calorias CALCULADAS somando cada ingrediente (NAO estimar)

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

IMPORTANTE:
- Cada opcao deve conter uma lista "foods" com strings simples
- Exemplo correto: ["2 ovos mexidos", "1 pao frances", "1 xicara de cafe"]

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
      const cleanedFoods: string[] = [];
      
      for (const food of option.foods) {
        const validation = validateFood(food, restrictions, dbMappings, dbSafeKeywords);
        
        if (validation.isValid) {
          cleanedFoods.push(food);
        } else {
          violations.push({
            meal: meal.label,
            food,
            reason: validation.reason || 'Restrição violada',
            restriction: validation.restriction || 'unknown',
          });
          // Não adiciona o alimento violador
        }
      }
      
      return {
        ...option,
        foods: cleanedFoods.length > 0 ? cleanedFoods : ['Opção removida por restrição'],
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
      dailyCalories = 2000,
      daysCount = 1,
      optionsPerMeal = 3,
      mealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"],
    } = requestBody;

    logStep("Request params", { dailyCalories, daysCount, optionsPerMeal, mealTypes });

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

    // Fetch intolerance mappings from database for validation
    logStep("Fetching intolerance mappings from database");
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings loaded", { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // Build meals with target calories and regional labels
    const meals = mealTypes.map((type: string) => ({
      type,
      label: regional.mealLabels[type] || type,
      targetCalories: Math.round(dailyCalories * (CALORIE_DISTRIBUTION[type] || 0.10)),
    }));

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
      });

      // Call Google AI API directly
      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
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
