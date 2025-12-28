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

  return `Voce e um NUTRICIONISTA CLINICO de nivel mundial com 20 anos de experiencia.

IDIOMA: Responda INTEIRAMENTE em ${regional.languageName}
PAIS/REGIAO: Gere refeicoes tipicas e culturalmente apropriadas para esta regiao

FUNCAO: Gerar REFEICOES COMPLETAS E REALISTAS para ${dayName} (Dia ${dayNumber})

REGRAS ABSOLUTAS:
- Gere apenas ALIMENTOS E REFEICOES PRONTAS PARA CONSUMO
- As refeicoes devem ser SIMPLES, COMUNS e ACESSIVEIS
- NAO use emojis
- NAO mencione objetivos corporais ou resultados
- NAO de conselhos medicos
- Use UNIDADES DOMESTICAS: ${regional.domesticUnits}

META CALORICA DIARIA: ${dailyCalories} kcal

REFEICOES DO DIA:
${mealsDescription}

RESTRICOES OBRIGATORIAS:
${restrictionText}

CONTEXTO CULTURAL:
${regional.typicalMeals}

${regional.culturalNotes}

ESTRUTURA OBRIGATORIA:
Para CADA refeicao, gere EXATAMENTE ${optionsPerMeal} OPCOES DIFERENTES.
CADA OPCAO deve ter:
- Nome claro da refeicao
- Lista de alimentos prontos com quantidades em unidades domesticas
- Calorias aproximadas

GUIA DE REFEICOES POR TIPO (MUITO IMPORTANTE):
- CAFE DA MANHA: paes, tapioca, ovos, frutas, iogurte, cereais, cafe, sucos
- LANCHE MANHA/TARDE: frutas, iogurte, castanhas, barra de cereais, sanduiche leve
- ALMOCO: prato principal completo (proteina + carboidrato + legumes/salada), refeicao quente e substancial
- JANTAR: prato principal completo similar ao almoco (proteina + carboidrato + vegetais), sopas completas, omeletes substanciais - NAO use apenas pao/fatias de pao como acompanhamento principal
- CEIA: lanche leve noturno, cha, leite, frutas

REGRA CRITICA JANTAR: O jantar deve ser uma REFEICAO COMPLETA E SUBSTANCIAL, nunca apenas "sopa com fatia de pao". Inclua sempre proteina significativa (grelhados, refogados, omeletes ricos) com acompanhamentos substantivos.

PADRAO DE QUALIDADE:
- Opcoes devem parecer criadas por nutricionista humano experiente
- Nao repetir mesmas refeicoes entre opcoes
- Variar fontes de proteina, carboidrato e gordura
- Manter coerencia alimentar (nao usar comida de almoco no cafe da manha)

RESPONDA EXCLUSIVAMENTE EM JSON VALIDO:
{
  "day": ${dayNumber},
  "day_name": "${dayName}",
  "meals": [${mealsJsonTemplate}
  ],
  "total_calories": ${dailyCalories}
}

IMPORTANTE: Cada opcao deve ter uma lista "foods" com strings simples descrevendo o alimento e quantidade.
Exemplo correto: ["2 ovos mexidos", "2 fatias de pao integral", "1 xicara de cafe"]

GERE AGORA o cardapio completo com ${optionsPerMeal} opcoes DIFERENTES para cada refeicao.`;
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

    // Build meals with target calories and regional labels
    const meals = mealTypes.map((type: string) => ({
      type,
      label: regional.mealLabels[type] || type,
      targetCalories: Math.round(dailyCalories * (CALORIE_DISTRIBUTION[type] || 0.10)),
    }));

    // Generate plan for each day
    const generatedDays: SimpleDayPlan[] = [];

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
        generatedDays.push(dayPlan);
        
        logStep(`Day ${dayIndex + 1} generated successfully`, { 
          mealsCount: dayPlan.meals?.length,
          totalCalories: dayPlan.total_calories 
        });
      } catch (parseError) {
        logStep("JSON parse error", { error: parseError, content: content.substring(0, 500) });
        throw new Error(`Failed to parse AI response for day ${dayIndex + 1}`);
      }
    }

    logStep("All days generated", { totalDays: generatedDays.length });

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
