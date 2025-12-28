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

// ============= TIPOS =============
interface MealOption {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: {
    item: string;
    quantity: string;
    unit: string;
    calories: number;
  }[];
  instructions: string[];
}

interface MealSlot {
  meal_type: string;
  label: string;
  target_calories: number;
  options: MealOption[];
}

interface DayPlan {
  day: number;
  day_name: string;
  meals: MealSlot[];
  total_calories: number;
}

// ============= CONFIGURAÇÃO REGIONAL =============
interface RegionalConfig {
  language: string;
  languageName: string;
  measurementSystem: 'metric' | 'imperial';
  currencySymbol: string;
  typicalMeals: string;
  culturalNotes: string;
  mealLabels: Record<string, string>;
  dayNames: string[];
  exampleIngredients: string;
}

const REGIONAL_CONFIGS: Record<string, RegionalConfig> = {
  // BRAZIL
  'BR': {
    language: 'pt-BR',
    languageName: 'Português Brasileiro',
    measurementSystem: 'metric',
    currencySymbol: 'R$',
    typicalMeals: `
- CAFÉ DA MANHÃ: Pão francês, tapioca, cuscuz, café com leite, frutas tropicais
- ALMOÇO: Arroz + feijão + proteína + salada (estrutura clássica brasileira)
- LANCHES: Frutas, pão de queijo, açaí, sanduíches naturais
- JANTAR: Similar ao almoço ou mais leve (sopas, omeletes)
- CEIA: Chá com biscoitos, frutas`,
    culturalNotes: 'Valorize ingredientes brasileiros: mandioca, açaí, cupuaçu, castanha-do-pará, feijão preto, carne de sol.',
    mealLabels: {
      cafe_manha: "Café da Manhã",
      lanche_manha: "Lanche da Manhã",
      almoco: "Almoço",
      lanche_tarde: "Lanche da Tarde",
      jantar: "Jantar",
      ceia: "Ceia",
    },
    dayNames: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Pão francês", "quantity": "2", "unit": "unidades", "calories": 150}',
  },

  // USA
  'US': {
    language: 'en-US',
    languageName: 'American English',
    measurementSystem: 'imperial',
    currencySymbol: '$',
    typicalMeals: `
- BREAKFAST: Eggs, bacon, toast, oatmeal, pancakes, smoothies, cereal
- LUNCH: Sandwiches, salads, wraps, soups, leftovers
- SNACKS: Fruits, nuts, yogurt, granola bars, cheese
- DINNER: Protein + starch + vegetables (grilled chicken, pasta, steak)
- LATE SNACK: Light options like fruit or yogurt`,
    culturalNotes: 'Use American ingredients: turkey, peanut butter, maple syrup, sweet potatoes, ranch dressing, corn.',
    mealLabels: {
      cafe_manha: "Breakfast",
      lanche_manha: "Morning Snack",
      almoco: "Lunch",
      lanche_tarde: "Afternoon Snack",
      jantar: "Dinner",
      ceia: "Evening Snack",
    },
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    exampleIngredients: '{"item": "Whole wheat bread", "quantity": "2", "unit": "slices", "calories": 140}',
  },

  // MEXICO
  'MX': {
    language: 'es-MX',
    languageName: 'Español Mexicano',
    measurementSystem: 'metric',
    currencySymbol: '$',
    typicalMeals: `
- DESAYUNO: Huevos rancheros, chilaquiles, quesadillas, licuados, fruta
- ALMUERZO/COMIDA: Sopa, arroz, frijoles, proteína, tortillas, ensalada
- COLACIÓN: Frutas, jícama, pepino con limón, tostadas
- CENA: Más ligera - tacos, quesadillas, sopas
- ANTES DE DORMIR: Leche, fruta, galletas integrales`,
    culturalNotes: 'Use ingredientes mexicanos: tortillas de maíz, frijoles negros, aguacate, chile, nopales, limón, cilantro.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colación Matutina",
      almoco: "Comida",
      lanche_tarde: "Colación Vespertina",
      jantar: "Cena",
      ceia: "Antes de Dormir",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Tortilla de maíz", "quantity": "3", "unit": "piezas", "calories": 150}',
  },

  // SPAIN
  'ES': {
    language: 'es-ES',
    languageName: 'Español de España',
    measurementSystem: 'metric',
    currencySymbol: '€',
    typicalMeals: `
- DESAYUNO: Tostada con tomate y aceite, café con leche, zumo de naranja
- ALMUERZO: Comida principal del día - paella, cocido, pescado, ensaladas
- MERIENDA: Bocadillo, fruta, café
- CENA: Más ligera - tortilla española, ensaladas, tapas
- ANTES DE DORMIR: Infusión, fruta`,
    culturalNotes: 'Use ingredientes españoles: aceite de oliva, jamón serrano, queso manchego, garbanzos, pimentón, azafrán.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Media Mañana",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
      ceia: "Antes de Dormir",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Pan de pueblo", "quantity": "2", "unit": "rebanadas", "calories": 140}',
  },

  // FRANCE
  'FR': {
    language: 'fr-FR',
    languageName: 'Français',
    measurementSystem: 'metric',
    currencySymbol: '€',
    typicalMeals: `
- PETIT-DÉJEUNER: Croissant, pain, confiture, café, jus d'orange
- DÉJEUNER: Repas principal - entrée, plat principal, fromage ou dessert
- GOÛTER: Fruit, yaourt, biscuits
- DÎNER: Plus léger - soupe, quiche, salade
- AVANT LE COUCHER: Tisane, fruit`,
    culturalNotes: 'Utilisez des ingrédients français: baguette, fromages (brie, camembert), beurre, crème fraîche, herbes de Provence.',
    mealLabels: {
      cafe_manha: "Petit-déjeuner",
      lanche_manha: "Collation du matin",
      almoco: "Déjeuner",
      lanche_tarde: "Goûter",
      jantar: "Dîner",
      ceia: "Avant le coucher",
    },
    dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
    exampleIngredients: '{"item": "Baguette", "quantity": "1/4", "unit": "pièce", "calories": 140}',
  },

  // GERMANY
  'DE': {
    language: 'de-DE',
    languageName: 'Deutsch',
    measurementSystem: 'metric',
    currencySymbol: '€',
    typicalMeals: `
- FRÜHSTÜCK: Vollkornbrot, Müsli, Wurst, Käse, Eier, Kaffee
- MITTAGESSEN: Hauptmahlzeit - Fleisch/Fisch, Kartoffeln, Gemüse
- ZWISCHENMAHLZEIT: Obst, Joghurt, Nüsse
- ABENDESSEN: Kalt - Brot, Aufschnitt, Käse, Salat
- SPÄTIMBISS: Tee, Obst`,
    culturalNotes: 'Verwenden Sie deutsche Zutaten: Vollkornbrot, Sauerkraut, Bratwurst, Kartoffeln, Quark, Senf.',
    mealLabels: {
      cafe_manha: "Frühstück",
      lanche_manha: "Vormittagssnack",
      almoco: "Mittagessen",
      lanche_tarde: "Nachmittagssnack",
      jantar: "Abendessen",
      ceia: "Spätimbiss",
    },
    dayNames: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
    exampleIngredients: '{"item": "Vollkornbrot", "quantity": "2", "unit": "Scheiben", "calories": 140}',
  },

  // ITALY
  'IT': {
    language: 'it-IT',
    languageName: 'Italiano',
    measurementSystem: 'metric',
    currencySymbol: '€',
    typicalMeals: `
- COLAZIONE: Cornetto, caffè, cappuccino, biscotti, succo
- PRANZO: Primo (pasta/risotto), secondo (carne/pesce), contorno, frutta
- SPUNTINO: Frutta, yogurt, crackers
- CENA: Più leggera - minestra, insalata, pesce
- PRIMA DI DORMIRE: Tisana, frutta`,
    culturalNotes: 'Usa ingredienti italiani: pasta, olio d\'oliva, pomodoro, mozzarella, prosciutto, parmigiano, basilico.',
    mealLabels: {
      cafe_manha: "Colazione",
      lanche_manha: "Spuntino Mattutino",
      almoco: "Pranzo",
      lanche_tarde: "Merenda",
      jantar: "Cena",
      ceia: "Prima di Dormire",
    },
    dayNames: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
    exampleIngredients: '{"item": "Pane integrale", "quantity": "2", "unit": "fette", "calories": 140}',
  },

  // ARGENTINA
  'AR': {
    language: 'es-AR',
    languageName: 'Español Argentino',
    measurementSystem: 'metric',
    currencySymbol: '$',
    typicalMeals: `
- DESAYUNO: Medialunas, tostadas, mate, café con leche
- ALMUERZO: Asado, milanesas, pastas, empanadas, ensaladas
- MERIENDA: Mate con facturas, fruta
- CENA: Similar al almuerzo - carnes, pastas, pizzas
- ANTES DE DORMIR: Infusión, fruta`,
    culturalNotes: 'Usa ingredientes argentinos: carne vacuna, dulce de leche, mate, chimichurri, empanadas, alfajores.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colación",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
      ceia: "Antes de Dormir",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Tostada de pan integral", "quantity": "2", "unit": "unidades", "calories": 140}',
  },

  // PORTUGAL
  'PT': {
    language: 'pt-PT',
    languageName: 'Português Europeu',
    measurementSystem: 'metric',
    currencySymbol: '€',
    typicalMeals: `
- PEQUENO-ALMOÇO: Pão com manteiga, cereais, café, sumo de laranja
- ALMOÇO: Sopa, prato principal (bacalhau, carne, peixe), arroz/batatas
- LANCHE: Fruta, iogurte, tostas
- JANTAR: Similar ao almoço mas pode ser mais leve
- CEIA: Chá, fruta, bolachas`,
    culturalNotes: 'Use ingredientes portugueses: bacalhau, azeite, batatas, grelos, chouriço, queijo da serra.',
    mealLabels: {
      cafe_manha: "Pequeno-almoço",
      lanche_manha: "Lanche da Manhã",
      almoco: "Almoço",
      lanche_tarde: "Lanche da Tarde",
      jantar: "Jantar",
      ceia: "Ceia",
    },
    dayNames: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Pão de mistura", "quantity": "2", "unit": "fatias", "calories": 140}',
  },

  // UK
  'GB': {
    language: 'en-GB',
    languageName: 'British English',
    measurementSystem: 'metric',
    currencySymbol: '£',
    typicalMeals: `
- BREAKFAST: Full English (eggs, bacon, beans, toast), porridge, cereal
- LUNCH: Sandwiches, jacket potatoes, soups, salads
- AFTERNOON TEA: Scones, biscuits, cake, tea
- DINNER: Roast dinner, fish and chips, pies, curries
- SUPPER: Light snack, tea, biscuits`,
    culturalNotes: 'Use British ingredients: baked beans, cheddar cheese, marmite, clotted cream, fish, lamb.',
    mealLabels: {
      cafe_manha: "Breakfast",
      lanche_manha: "Elevenses",
      almoco: "Lunch",
      lanche_tarde: "Afternoon Tea",
      jantar: "Dinner",
      ceia: "Supper",
    },
    dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    exampleIngredients: '{"item": "Wholemeal bread", "quantity": "2", "unit": "slices", "calories": 140}',
  },

  // CHILE
  'CL': {
    language: 'es-CL',
    languageName: 'Español Chileno',
    measurementSystem: 'metric',
    currencySymbol: '$',
    typicalMeals: `
- DESAYUNO: Pan con palta, huevos, café, té
- ALMUERZO: Cazuela, pastel de choclo, porotos, ensaladas
- ONCE: Pan con agregados, té (reemplaza la cena)
- CENA: Más ligera si se tomó once, o similar al almuerzo
- ANTES DE DORMIR: Fruta, infusión`,
    culturalNotes: 'Usa ingredientes chilenos: palta, porotos granados, choclo, mariscos, merkén, manjar.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colación",
      almoco: "Almuerzo",
      lanche_tarde: "Once",
      jantar: "Cena",
      ceia: "Antes de Dormir",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Pan integral", "quantity": "2", "unit": "unidades", "calories": 140}',
  },

  // COLOMBIA
  'CO': {
    language: 'es-CO',
    languageName: 'Español Colombiano',
    measurementSystem: 'metric',
    currencySymbol: '$',
    typicalMeals: `
- DESAYUNO: Arepa, huevos, calentado, chocolate, frutas
- ALMUERZO: Bandeja paisa, sancocho, arroz, frijoles, carne, ensalada
- ONCES: Empanadas, buñuelos, fruta, café
- CENA: Más ligera - sopas, arepas, huevos
- ANTES DE DORMIR: Aromática, fruta`,
    culturalNotes: 'Usa ingredientes colombianos: arepa, plátano, yuca, frijoles, hogao, ají, panela.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Medias Nueves",
      almoco: "Almuerzo",
      lanche_tarde: "Onces",
      jantar: "Cena",
      ceia: "Antes de Dormir",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    exampleIngredients: '{"item": "Arepa de maíz", "quantity": "2", "unit": "unidades", "calories": 150}',
  },
};

// Fallback para países não mapeados
const DEFAULT_CONFIG: RegionalConfig = REGIONAL_CONFIGS['US'];

function getRegionalConfig(countryCode: string): RegionalConfig {
  return REGIONAL_CONFIGS[countryCode?.toUpperCase()] || DEFAULT_CONFIG;
}

// ============= MAPEAMENTO DE INTOLERÂNCIAS MULTILÍNGUE =============
function getIntoleranceInstructions(intolerances: string[], language: string): string {
  const isSpanish = language.startsWith('es');
  const isFrench = language.startsWith('fr');
  const isGerman = language.startsWith('de');
  const isItalian = language.startsWith('it');
  const isPortuguese = language.startsWith('pt');

  const maps: Record<string, Record<string, string>> = {
    en: {
      'lactose': 'NO DAIRY (milk, cheese, yogurt, butter, cream)',
      'gluten': 'NO GLUTEN (wheat bread, pasta, oats, cookies, cakes with wheat flour)',
      'amendoim': 'NO PEANUTS AND DERIVATIVES',
      'frutos_do_mar': 'NO SHELLFISH (shrimp, lobster, crab, mussels)',
      'peixe': 'NO FISH',
      'ovos': 'NO EGGS',
      'soja': 'NO SOY AND DERIVATIVES',
      'frutose': 'LOW FRUCTOSE (avoid very sweet fruits)',
      'fodmap': 'LOW FODMAP (avoid garlic, onion, wheat, milk, excess legumes)',
      'histamina': 'LOW HISTAMINE (avoid fermented foods, cured meats, aged cheeses)',
      'cafeina': 'NO CAFFEINE (coffee, black tea, green tea, chocolate)',
      'sulfitos': 'NO SULFITES (avoid wine, dried fruits, preserves)',
      'sorbitol': 'NO SORBITOL (avoid artificial sweeteners, some fruits)',
      'salicilato': 'LOW SALICYLATE',
      'milho': 'NO CORN AND DERIVATIVES',
      'leguminosas': 'NO LEGUMES (beans, lentils, chickpeas, peas)',
    },
    es: {
      'lactose': 'SIN LÁCTEOS (leche, queso, yogur, mantequilla, crema)',
      'gluten': 'SIN GLUTEN (pan de trigo, pasta, avena, galletas, pasteles con harina de trigo)',
      'amendoim': 'SIN MANÍ/CACAHUATE Y DERIVADOS',
      'frutos_do_mar': 'SIN MARISCOS (camarón, langosta, cangrejo, mejillones)',
      'peixe': 'SIN PESCADO',
      'ovos': 'SIN HUEVOS',
      'soja': 'SIN SOJA Y DERIVADOS',
      'frutose': 'BAJA FRUCTOSA (evitar frutas muy dulces)',
      'fodmap': 'BAJO FODMAP (evitar ajo, cebolla, trigo, leche, exceso de legumbres)',
      'histamina': 'BAJA HISTAMINA (evitar fermentados, embutidos, quesos curados)',
      'cafeina': 'SIN CAFEÍNA (café, té negro, té verde, chocolate)',
      'sulfitos': 'SIN SULFITOS (evitar vino, frutas secas, conservas)',
      'sorbitol': 'SIN SORBITOL (evitar edulcorantes artificiales, algunas frutas)',
      'salicilato': 'BAJO SALICILATO',
      'milho': 'SIN MAÍZ Y DERIVADOS',
      'leguminosas': 'SIN LEGUMBRES (frijoles, lentejas, garbanzos, guisantes)',
    },
    pt: {
      'lactose': 'SEM LATICÍNIOS (leite, queijo, iogurte, manteiga, creme de leite)',
      'gluten': 'SEM GLÚTEN (pão de trigo, macarrão, aveia, biscoitos, bolos com farinha de trigo)',
      'amendoim': 'SEM AMENDOIM E DERIVADOS',
      'frutos_do_mar': 'SEM FRUTOS DO MAR (camarão, lagosta, caranguejo, mexilhão)',
      'peixe': 'SEM PEIXE',
      'ovos': 'SEM OVOS',
      'soja': 'SEM SOJA E DERIVADOS',
      'frutose': 'BAIXO EM FRUTOSE (evitar frutas muito doces)',
      'fodmap': 'LOW FODMAP (evitar alho, cebola, trigo, leite, leguminosas em excesso)',
      'histamina': 'BAIXA HISTAMINA (evitar fermentados, embutidos, queijos curados)',
      'cafeina': 'SEM CAFEÍNA (café, chá preto, chá verde, chocolate)',
      'sulfitos': 'SEM SULFITOS (evitar vinho, frutas secas, conservas)',
      'sorbitol': 'SEM SORBITOL (evitar adoçantes artificiais, algumas frutas)',
      'salicilato': 'BAIXO SALICILATO',
      'milho': 'SEM MILHO E DERIVADOS',
      'leguminosas': 'SEM LEGUMINOSAS (feijão, lentilha, grão-de-bico, ervilha)',
    },
    fr: {
      'lactose': 'SANS PRODUITS LAITIERS (lait, fromage, yaourt, beurre, crème)',
      'gluten': 'SANS GLUTEN (pain de blé, pâtes, avoine, biscuits, gâteaux à la farine de blé)',
      'amendoim': 'SANS ARACHIDES ET DÉRIVÉS',
      'frutos_do_mar': 'SANS FRUITS DE MER (crevettes, homard, crabe, moules)',
      'peixe': 'SANS POISSON',
      'ovos': 'SANS ŒUFS',
      'soja': 'SANS SOJA ET DÉRIVÉS',
      'frutose': 'FAIBLE EN FRUCTOSE (éviter les fruits très sucrés)',
      'fodmap': 'FAIBLE FODMAP (éviter ail, oignon, blé, lait, excès de légumineuses)',
      'histamina': 'FAIBLE HISTAMINE (éviter fermentés, charcuterie, fromages affinés)',
      'cafeina': 'SANS CAFÉINE (café, thé noir, thé vert, chocolat)',
      'sulfitos': 'SANS SULFITES (éviter vin, fruits secs, conserves)',
      'sorbitol': 'SANS SORBITOL (éviter édulcorants artificiels, certains fruits)',
      'salicilato': 'FAIBLE SALICYLATE',
      'milho': 'SANS MAÏS ET DÉRIVÉS',
      'leguminosas': 'SANS LÉGUMINEUSES (haricots, lentilles, pois chiches, pois)',
    },
    de: {
      'lactose': 'OHNE MILCHPRODUKTE (Milch, Käse, Joghurt, Butter, Sahne)',
      'gluten': 'OHNE GLUTEN (Weizenbrot, Nudeln, Hafer, Kekse, Kuchen mit Weizenmehl)',
      'amendoim': 'OHNE ERDNÜSSE UND DERIVATE',
      'frutos_do_mar': 'OHNE MEERESFRÜCHTE (Garnelen, Hummer, Krabben, Muscheln)',
      'peixe': 'OHNE FISCH',
      'ovos': 'OHNE EIER',
      'soja': 'OHNE SOJA UND DERIVATE',
      'frutose': 'WENIG FRUKTOSE (sehr süße Früchte vermeiden)',
      'fodmap': 'NIEDRIG FODMAP (Knoblauch, Zwiebel, Weizen, Milch, übermäßige Hülsenfrüchte vermeiden)',
      'histamina': 'WENIG HISTAMIN (Fermentiertes, Wurst, gereifter Käse vermeiden)',
      'cafeina': 'OHNE KOFFEIN (Kaffee, schwarzer Tee, grüner Tee, Schokolade)',
      'sulfitos': 'OHNE SULFITE (Wein, Trockenfrüchte, Konserven vermeiden)',
      'sorbitol': 'OHNE SORBITOL (künstliche Süßstoffe, einige Früchte vermeiden)',
      'salicilato': 'WENIG SALICYLAT',
      'milho': 'OHNE MAIS UND DERIVATE',
      'leguminosas': 'OHNE HÜLSENFRÜCHTE (Bohnen, Linsen, Kichererbsen, Erbsen)',
    },
    it: {
      'lactose': 'SENZA LATTICINI (latte, formaggio, yogurt, burro, panna)',
      'gluten': 'SENZA GLUTINE (pane di grano, pasta, avena, biscotti, torte con farina di grano)',
      'amendoim': 'SENZA ARACHIDI E DERIVATI',
      'frutos_do_mar': 'SENZA FRUTTI DI MARE (gamberetti, aragosta, granchio, cozze)',
      'peixe': 'SENZA PESCE',
      'ovos': 'SENZA UOVA',
      'soja': 'SENZA SOIA E DERIVATI',
      'frutose': 'BASSO FRUTTOSIO (evitare frutta molto dolce)',
      'fodmap': 'BASSO FODMAP (evitare aglio, cipolla, grano, latte, eccesso di legumi)',
      'histamina': 'BASSA ISTAMINA (evitare fermentati, salumi, formaggi stagionati)',
      'cafeina': 'SENZA CAFFEINA (caffè, tè nero, tè verde, cioccolato)',
      'sulfitos': 'SENZA SOLFITI (evitare vino, frutta secca, conserve)',
      'sorbitol': 'SENZA SORBITOLO (evitare dolcificanti artificiali, alcuni frutti)',
      'salicilato': 'BASSO SALICILATO',
      'milho': 'SENZA MAIS E DERIVATI',
      'leguminosas': 'SENZA LEGUMI (fagioli, lenticchie, ceci, piselli)',
    },
  };

  let langKey = 'en';
  if (isSpanish) langKey = 'es';
  else if (isFrench) langKey = 'fr';
  else if (isGerman) langKey = 'de';
  else if (isItalian) langKey = 'it';
  else if (isPortuguese) langKey = 'pt';

  const map = maps[langKey];
  return intolerances.map(i => map[i] || `NO ${i.toUpperCase()}`).join('\n- ');
}

// ============= PREFERÊNCIAS ALIMENTARES MULTILÍNGUE =============
function getDietaryInstructions(preference: string, language: string): string {
  const isSpanish = language.startsWith('es');
  const isFrench = language.startsWith('fr');
  const isGerman = language.startsWith('de');
  const isItalian = language.startsWith('it');
  const isPortuguese = language.startsWith('pt');

  const instructions: Record<string, Record<string, string>> = {
    en: {
      'comum': 'Omnivore diet - all foods allowed (meat, fish, eggs, dairy, vegetables)',
      'vegetariana': 'VEGETARIAN - NO MEAT (may include eggs, dairy)',
      'vegana': 'VEGAN - 100% PLANT-BASED (no meat, no eggs, no dairy, no honey)',
      'low_carb': 'LOW CARB - Maximum 50g carbs per day. Focus on proteins and healthy fats.',
      'pescetariana': 'PESCATARIAN - No red meat or poultry. May include fish and seafood.',
      'cetogenica': 'KETOGENIC - Maximum 20g carbs per day. High fat, moderate protein.',
      'flexitariana': 'FLEXITARIAN - Predominantly vegetarian, but may include meat occasionally.',
    },
    es: {
      'comum': 'Dieta omnívora - todos los alimentos permitidos (carnes, pescados, huevos, lácteos, vegetales)',
      'vegetariana': 'VEGETARIANA - SIN CARNES (puede incluir huevos, lácteos)',
      'vegana': 'VEGANA - 100% VEGETAL (sin carnes, sin huevos, sin lácteos, sin miel)',
      'low_carb': 'LOW CARB - Máximo 50g de carbohidratos por día. Enfoque en proteínas y grasas saludables.',
      'pescetariana': 'PESCETARIANA - Sin carnes rojas ni aves. Puede incluir pescados y mariscos.',
      'cetogenica': 'CETOGÉNICA - Máximo 20g de carbohidratos por día. Alto en grasas, moderado en proteínas.',
      'flexitariana': 'FLEXITARIANA - Predominantemente vegetariana, pero puede incluir carnes ocasionalmente.',
    },
    pt: {
      'comum': 'Dieta onívora - todos os alimentos permitidos (carnes, peixes, ovos, laticínios, vegetais)',
      'vegetariana': 'VEGETARIANA - SEM CARNES (pode incluir ovos, laticínios)',
      'vegana': 'VEGANA - 100% VEGETAL (sem carnes, sem ovos, sem laticínios, sem mel)',
      'low_carb': 'LOW CARB - Máximo 50g de carboidratos por dia. Foco em proteínas e gorduras saudáveis.',
      'pescetariana': 'PESCETARIANA - Sem carnes vermelhas e aves. Pode incluir peixes e frutos do mar.',
      'cetogenica': 'CETOGÊNICA - Máximo 20g de carboidratos por dia. Alto em gorduras, moderado em proteínas.',
      'flexitariana': 'FLEXITARIANA - Predominantemente vegetariana, mas pode incluir carnes ocasionalmente.',
    },
    fr: {
      'comum': 'Régime omnivore - tous les aliments autorisés (viandes, poissons, œufs, produits laitiers, légumes)',
      'vegetariana': 'VÉGÉTARIEN - SANS VIANDE (peut inclure œufs, produits laitiers)',
      'vegana': 'VÉGAN - 100% VÉGÉTAL (sans viande, sans œufs, sans produits laitiers, sans miel)',
      'low_carb': 'LOW CARB - Maximum 50g de glucides par jour. Focus sur protéines et graisses saines.',
      'pescetariana': 'PESCÉTARIEN - Sans viande rouge ni volaille. Peut inclure poissons et fruits de mer.',
      'cetogenica': 'CÉTOGÈNE - Maximum 20g de glucides par jour. Riche en graisses, modéré en protéines.',
      'flexitariana': 'FLEXITARIEN - Principalement végétarien, mais peut inclure de la viande occasionnellement.',
    },
    de: {
      'comum': 'Omnivore Ernährung - alle Lebensmittel erlaubt (Fleisch, Fisch, Eier, Milchprodukte, Gemüse)',
      'vegetariana': 'VEGETARISCH - OHNE FLEISCH (kann Eier, Milchprodukte enthalten)',
      'vegana': 'VEGAN - 100% PFLANZLICH (ohne Fleisch, ohne Eier, ohne Milchprodukte, ohne Honig)',
      'low_carb': 'LOW CARB - Maximal 50g Kohlenhydrate pro Tag. Fokus auf Proteine und gesunde Fette.',
      'pescetariana': 'PESCETARISCH - Ohne rotes Fleisch und Geflügel. Kann Fisch und Meeresfrüchte enthalten.',
      'cetogenica': 'KETOGEN - Maximal 20g Kohlenhydrate pro Tag. Reich an Fetten, mäßig an Proteinen.',
      'flexitariana': 'FLEXITARISCH - Überwiegend vegetarisch, kann aber gelegentlich Fleisch enthalten.',
    },
    it: {
      'comum': 'Dieta onnivora - tutti gli alimenti consentiti (carne, pesce, uova, latticini, verdure)',
      'vegetariana': 'VEGETARIANA - SENZA CARNE (può includere uova, latticini)',
      'vegana': 'VEGANA - 100% VEGETALE (senza carne, senza uova, senza latticini, senza miele)',
      'low_carb': 'LOW CARB - Massimo 50g di carboidrati al giorno. Focus su proteine e grassi sani.',
      'pescetariana': 'PESCETARIANA - Senza carne rossa e pollame. Può includere pesce e frutti di mare.',
      'cetogenica': 'CHETOGENICA - Massimo 20g di carboidrati al giorno. Alto in grassi, moderato in proteine.',
      'flexitariana': 'FLEXITARIANA - Prevalentemente vegetariana, ma può includere carne occasionalmente.',
    },
  };

  let langKey = 'en';
  if (isSpanish) langKey = 'es';
  else if (isFrench) langKey = 'fr';
  else if (isGerman) langKey = 'de';
  else if (isItalian) langKey = 'it';
  else if (isPortuguese) langKey = 'pt';

  return instructions[langKey][preference] || instructions[langKey]['comum'];
}

// ============= OBJETIVOS MULTILÍNGUE =============
function getGoalInstructions(goal: string, language: string): string {
  const isSpanish = language.startsWith('es');
  const isFrench = language.startsWith('fr');
  const isGerman = language.startsWith('de');
  const isItalian = language.startsWith('it');
  const isPortuguese = language.startsWith('pt');

  const instructions: Record<string, Record<string, string>> = {
    en: {
      'emagrecer': 'GOAL: WEIGHT LOSS - Prioritize lean proteins, fiber, low caloric density. Avoid sugars and refined carbs.',
      'manter': 'GOAL: MAINTENANCE - Balanced diet with all macronutrients.',
      'ganhar_peso': 'GOAL: WEIGHT/MUSCLE GAIN - Include calorie-dense foods, quality proteins, complex carbs.',
    },
    es: {
      'emagrecer': 'OBJETIVO: PÉRDIDA DE PESO - Priorizar proteínas magras, fibra, baja densidad calórica. Evitar azúcares y carbohidratos refinados.',
      'manter': 'OBJETIVO: MANTENIMIENTO - Dieta equilibrada con todos los macronutrientes.',
      'ganhar_peso': 'OBJETIVO: GANANCIA DE PESO/MASA - Incluir alimentos densos en calorías, proteínas de calidad, carbohidratos complejos.',
    },
    pt: {
      'emagrecer': 'OBJETIVO: EMAGRECIMENTO - Priorize proteínas magras, fibras, baixa densidade calórica. Evite açúcares e carboidratos refinados.',
      'manter': 'OBJETIVO: MANUTENÇÃO - Dieta equilibrada com todos os macronutrientes.',
      'ganhar_peso': 'OBJETIVO: GANHO DE PESO/MASSA - Incluir alimentos densos em calorias, proteínas de qualidade, carboidratos complexos.',
    },
    fr: {
      'emagrecer': 'OBJECTIF: PERTE DE POIDS - Privilégier protéines maigres, fibres, faible densité calorique. Éviter sucres et glucides raffinés.',
      'manter': 'OBJECTIF: MAINTIEN - Alimentation équilibrée avec tous les macronutriments.',
      'ganhar_peso': 'OBJECTIF: PRISE DE POIDS/MASSE - Inclure aliments denses en calories, protéines de qualité, glucides complexes.',
    },
    de: {
      'emagrecer': 'ZIEL: GEWICHTSVERLUST - Magere Proteine, Ballaststoffe, niedrige Kaloriendichte priorisieren. Zucker und raffinierte Kohlenhydrate vermeiden.',
      'manter': 'ZIEL: ERHALTUNG - Ausgewogene Ernährung mit allen Makronährstoffen.',
      'ganhar_peso': 'ZIEL: GEWICHTS-/MUSKELZUNAHME - Kalorienreiche Lebensmittel, hochwertige Proteine, komplexe Kohlenhydrate einbeziehen.',
    },
    it: {
      'emagrecer': 'OBIETTIVO: PERDITA DI PESO - Privilegiare proteine magre, fibre, bassa densità calorica. Evitare zuccheri e carboidrati raffinati.',
      'manter': 'OBIETTIVO: MANTENIMENTO - Dieta equilibrata con tutti i macronutrienti.',
      'ganhar_peso': 'OBIETTIVO: AUMENTO DI PESO/MASSA - Includere cibi densi di calorie, proteine di qualità, carboidrati complessi.',
    },
  };

  let langKey = 'en';
  if (isSpanish) langKey = 'es';
  else if (isFrench) langKey = 'fr';
  else if (isGerman) langKey = 'de';
  else if (isItalian) langKey = 'it';
  else if (isPortuguese) langKey = 'pt';

  return instructions[langKey][goal] || instructions[langKey]['manter'];
}

// ============= PROMPT DO NUTRICIONISTA PROFISSIONAL INTERNACIONAL =============
function buildNutritionistPrompt(params: {
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

  const intoleranceInstructions = getIntoleranceInstructions(restrictions.intolerances, regional.language);
  const dietaryInstructions = getDietaryInstructions(restrictions.dietaryPreference, regional.language);
  const goalInstructions = getGoalInstructions(restrictions.goal, regional.language);

  const mealsDescription = meals.map(m => 
    `- ${m.label} (${m.type}): ~${m.targetCalories} kcal`
  ).join('\n');

  const measurementNote = regional.measurementSystem === 'imperial' 
    ? 'Use IMPERIAL measurements: cups, tablespoons, teaspoons, oz, lbs'
    : 'Use METRIC measurements: grams, ml, kg';

  return `You are an INTERNATIONAL PROFESSIONAL NUTRITIONIST with 20 years of clinical and sports nutrition experience.

LANGUAGE: Respond ENTIRELY in ${regional.languageName}
COUNTRY/REGION: Generate meals typical and culturally appropriate for this region

MISSION: Create a COMPLETE meal plan for ${dayName} (Day ${dayNumber}) with EXACTLY ${optionsPerMeal} options per meal.

═══════════════════════════════════════════════════
DAILY CALORIE TARGET: ${dailyCalories} kcal
═══════════════════════════════════════════════════

MEALS FOR THE DAY:
${mealsDescription}

═══════════════════════════════════════════════════
CULTURAL CONTEXT - IMPORTANT:
═══════════════════════════════════════════════════

${regional.typicalMeals}

${regional.culturalNotes}

${measurementNote}

═══════════════════════════════════════════════════
MANDATORY RESTRICTIONS (NEVER VIOLATE):
═══════════════════════════════════════════════════

DIETARY PREFERENCE:
${dietaryInstructions}

${restrictions.intolerances.length > 0 ? `INTOLERANCES/ALLERGIES:
- ${intoleranceInstructions}` : 'No registered intolerances.'}

${restrictions.excludedIngredients.length > 0 ? `USER EXCLUDED INGREDIENTS:
${restrictions.excludedIngredients.map(i => `- ${i}`).join('\n')}` : ''}

${goalInstructions}

═══════════════════════════════════════════════════
RESPONSE FORMAT - CRITICAL:
═══════════════════════════════════════════════════

Respond EXCLUSIVELY with valid JSON, no markdown, no explanations.
Use double quotes for all strings.
Do not use special characters that break JSON.
ALL TEXT MUST BE IN ${regional.languageName}.

{
  "day": ${dayNumber},
  "day_name": "${dayName}",
  "meals": [
    {
      "meal_type": "cafe_manha",
      "label": "${regional.mealLabels.cafe_manha}",
      "target_calories": 500,
      "options": [
        {
          "name": "Complete Dish Name in ${regional.languageName}",
          "description": "Short description in ${regional.languageName}",
          "calories": 485,
          "protein": 22,
          "carbs": 45,
          "fat": 18,
          "prep_time": 15,
          "ingredients": [
            ${regional.exampleIngredients}
          ],
          "instructions": [
            "Step 1 in ${regional.languageName}",
            "Step 2 in ${regional.languageName}"
          ]
        }
      ]
    }
  ],
  "total_calories": ${dailyCalories}
}

GENERATE NOW the complete meal plan with ${optionsPerMeal} DIFFERENT options for each meal.
Each option must be a COMPLETE DISH with all ingredients and instructions.
Nutritional values must be REALISTIC and sum approximately to the target calories of each meal.
USE CULTURALLY APPROPRIATE INGREDIENTS AND DISHES FOR THE REGION.`;
}

// ============= DISTRIBUIÇÃO CALÓRICA =============
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
    logStep("AI Meal Plan Generator started - International Version");

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
      mealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"],
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
    const generatedDays: DayPlan[] = [];

    for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
      const dayName = regional.dayNames[dayIndex % 7];
      
      logStep(`Generating day ${dayIndex + 1}`, { dayName, language: regional.language });

      const prompt = buildNutritionistPrompt({
        dailyCalories,
        meals,
        optionsPerMeal,
        restrictions,
        dayNumber: dayIndex + 1,
        dayName,
        regional,
      });

      // Call Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        logStep("AI API Error", { status: aiResponse.status, error: errorText });
        
        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }
        if (aiResponse.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      
      logStep("AI response received", { contentLength: content.length });

      // Parse JSON from response
      try {
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const dayPlan: DayPlan = JSON.parse(content);
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
