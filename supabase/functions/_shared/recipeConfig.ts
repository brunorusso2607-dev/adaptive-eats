// ============================================
// INTOLERAI - CONFIGURAÇÃO CENTRALIZADA DE RECEITAS
// ============================================
// Este arquivo é a RAIZ ÚNICA para todos os geradores de receitas.
// Qualquer alteração aqui afeta: generate-recipe, generate-meal-plan, regenerate-meal
//
// ARQUITETURA v2.0:
// Este arquivo agora usa INTERNAMENTE o globalSafetyEngine.ts para validação de ingredientes.

// Importar cálculos nutricionais centralizados
import {
  calculateBMR,
  calculateTDEE,
  calculateNutritionalTargets,
  calculateMealDistribution,
  getMealTarget,
  evaluateMealCompatibility,
  evaluateDayCompatibility,
  buildNutritionalContextForPrompt,
  buildMealDistributionForPrompt,
  estimateWeeklyWeightChange,
  estimateTimeToGoal,
  validateTargetsHealth,
  type UserPhysicalData,
  type NutritionalTargets,
  type MealDistribution as MealDistributionType,
  type CompatibilityResult,
} from "./nutritionalCalculations.ts";

// Importar personas culinárias por estratégia
import {
  getStrategyPromptRules,
  getStrategyPersona,
} from "./mealGenerationConfig.ts";

// ============= IMPORTS DO GLOBAL SAFETY ENGINE =============
import {
  loadSafetyDatabase,
  validateIngredient as gseValidateIngredient,
  type SafetyDatabase,
  type UserRestrictions,
} from "./globalSafetyEngine.ts";

// Re-export for consumers of recipeConfig
export {
  calculateBMR,
  calculateTDEE,
  calculateNutritionalTargets,
  calculateMealDistribution,
  getMealTarget,
  evaluateMealCompatibility,
  evaluateDayCompatibility,
  buildNutritionalContextForPrompt,
  buildMealDistributionForPrompt,
  estimateWeeklyWeightChange,
  estimateTimeToGoal,
  validateTargetsHealth,
  type NutritionalTargets,
  type MealDistributionType,
  type CompatibilityResult,
};

// ============================================
// TIPOS
// ============================================

export interface MealValidationResult {
  isValid: boolean;
  invalidIngredients: string[];
  reason: string;
}

export interface RecipeValidationSummary {
  totalMeals: number;
  validMeals: number;
  invalidMeals: number;
  issues: Array<{
    dayIndex: number;
    mealType: string;
    recipeName: string;
    invalidIngredients: string[];
  }>;
}

export interface UserProfile {
  id: string;
  sex?: string | null;
  age?: number | null;
  height?: number | null;
  weight_current?: number | null;
  weight_goal?: number | null;
  activity_level?: string | null;
  goal?: string | null;
  dietary_preference?: string | null;
  context?: string | null;
  intolerances?: string[] | null;
  excluded_ingredients?: string[] | null;
  country?: string | null; // ISO 3166-1 alpha-2 (BR, US, MX, etc.)
  kids_mode?: boolean | null;
  strategy_id?: string | null; // FK para nutritional_strategies
}

// ============================================
// TIPOS DO SISTEMA CENTRALIZADO DE PERFIL
// ============================================

export type GoalIntensity = "light" | "moderate" | "aggressive";
export type RecipeStyle = "fitness" | "regular" | "high_calorie";
// Mantido para compatibilidade, mas novas estratégias são gerenciadas pela tabela nutritional_strategies
export type UserGoal = "emagrecer" | "manter" | "ganhar_peso" | "cutting" | "fitness" | "dieta_flexivel";

export interface GoalContext {
  goalIntensity: GoalIntensity;
  recipeStyle: RecipeStyle;
  weightDifference: number;
  calorieAdjustment: number;
  proteinMultiplier: number;
}

// ============================================
// FUNÇÕES DE CRUZAMENTO DE PERFIL (CENTRALIZADAS)
// ============================================

/**
 * Calcula a intensidade do objetivo baseado na diferença de peso
 * Usado em: generate-meal-plan, regenerate-meal, generate-recipe
 */
export function calculateGoalIntensity(
  goal: string | null | undefined,
  weightCurrent: number | null | undefined,
  weightGoal: number | null | undefined
): GoalIntensity {
  if (!goal || !weightCurrent || !weightGoal) {
    return "moderate";
  }

  const difference = Math.abs(weightCurrent - weightGoal);

  // Estratégias de déficit (emagrecer, cutting)
  if (goal === "emagrecer" || goal === "cutting") {
    if (difference <= 5) return "light";
    if (difference <= 15) return "moderate";
    return "aggressive";
  }

  // Estratégias de superávit (ganhar_peso)
  if (goal === "ganhar_peso") {
    if (difference <= 5) return "light";
    if (difference <= 10) return "moderate";
    return "aggressive";
  }

  return "moderate"; // manter, fitness, dieta_flexivel
}

/**
 * Determina o estilo de receita baseado no objetivo
 */
export function calculateRecipeStyle(goal: string | null | undefined): RecipeStyle {
  if (!goal || goal === "manter" || goal === "dieta_flexivel") {
    return "regular";
  }
  if (goal === "emagrecer" || goal === "cutting" || goal === "fitness") {
    return "fitness";
  }
  if (goal === "ganhar_peso") {
    return "high_calorie";
  }
  return "regular";
}

/**
 * Obtém contexto completo do objetivo do usuário
 * Esta é a FUNÇÃO PRINCIPAL para cruzamento de dados
 */
export function getGoalContext(profile: UserProfile): GoalContext {
  const intensity = calculateGoalIntensity(
    profile.goal,
    profile.weight_current,
    profile.weight_goal
  );
  
  const recipeStyle = calculateRecipeStyle(profile.goal);
  
  const weightDifference = profile.weight_current && profile.weight_goal
    ? Math.abs(profile.weight_current - profile.weight_goal)
    : 0;

  // Ajuste de calorias baseado na intensidade e estratégia
  let calorieAdjustment = 0;
  if (profile.goal === "emagrecer") {
    calorieAdjustment = intensity === "light" ? -300 : intensity === "moderate" ? -500 : -700;
  } else if (profile.goal === "cutting") {
    // Cutting: déficit mais moderado, foco em preservar massa
    calorieAdjustment = intensity === "light" ? -250 : intensity === "moderate" ? -400 : -550;
  } else if (profile.goal === "ganhar_peso") {
    calorieAdjustment = intensity === "light" ? 250 : intensity === "moderate" ? 400 : 600;
  }
  // manter, fitness, dieta_flexivel: calorieAdjustment = 0

  // Multiplicador de proteína baseado no objetivo e intensidade
  let proteinMultiplier = 1.6; // default para manter
  if (profile.goal === "emagrecer") {
    proteinMultiplier = intensity === "aggressive" ? 2.2 : intensity === "moderate" ? 2.0 : 1.8;
  } else if (profile.goal === "cutting") {
    // Cutting: proteína mais alta para preservar massa muscular
    proteinMultiplier = intensity === "aggressive" ? 2.5 : intensity === "moderate" ? 2.2 : 2.0;
  } else if (profile.goal === "fitness") {
    // Fitness: proteína elevada sem déficit calórico
    proteinMultiplier = 2.0;
  } else if (profile.goal === "ganhar_peso") {
    proteinMultiplier = intensity === "aggressive" ? 2.4 : intensity === "moderate" ? 2.2 : 2.0;
  }

  return {
    goalIntensity: intensity,
    recipeStyle,
    weightDifference,
    calorieAdjustment,
    proteinMultiplier,
  };
}

/**
 * Generates AI prompt instructions based on goal context
 * ARCHITECTURE: Reason in English, output will be localized by outer prompt
 */
export function buildGoalContextInstructions(profile: UserProfile): string {
  const context = getGoalContext(profile);
  
  if (profile.goal === "manter") {
    return `
🎯 GOAL: WEIGHT MAINTENANCE
- Balanced and nutritious recipes
- Calories balanced to maintain current weight
- Standard macronutrient ratio`;
  }

  if (profile.goal === "emagrecer") {
    const intensityLabel = {
      light: "LIGHT (up to 5kg)",
      moderate: "MODERATE (5-15kg)", 
      aggressive: "INTENSIVE (more than 15kg)"
    }[context.goalIntensity];

    return `
🏃 GOAL: WEIGHT LOSS - ${intensityLabel}
- Loss target: ${context.weightDifference}kg
- Caloric deficit: ${Math.abs(context.calorieAdjustment)} kcal/day
- Protein: ${context.proteinMultiplier}g per kg of body weight
- PRIORITIZE: Voluminous vegetables, lean proteins, fiber
- AVOID: Refined carbohydrates, sugars, fried foods
- PREFER: Grilled, baked, steamed
- STYLE: FITNESS RECIPES - low calorie, high nutritional value`;
  }

  if (profile.goal === "cutting") {
    const intensityLabel = {
      light: "LIGHT (up to 5kg)",
      moderate: "MODERATE (5-10kg)", 
      aggressive: "INTENSIVE (more than 10kg)"
    }[context.goalIntensity];

    return `
🔪 GOAL: CUTTING - ${intensityLabel}
- Definition target: ${context.weightDifference}kg
- Caloric deficit: ${Math.abs(context.calorieAdjustment)} kcal/day
- Protein: ${context.proteinMultiplier}g per kg of body weight (HIGH to preserve mass)
- PRIORITIZE: High quality proteins, fibrous vegetables, low calorie
- AVOID: Refined carbohydrates, sugars, saturated fats
- PREFER: Lean meats, fish, eggs, green vegetables
- STYLE: CUTTING RECIPES - maximum protein, minimum calorie`;
  }

  if (profile.goal === "fitness") {
    return `
💪 GOAL: FITNESS / BODY RECOMPOSITION
- Focus on lean mass without changing weight
- Balanced calories (maintenance)
- Protein: ${context.proteinMultiplier}g per kg of body weight (HIGH)
- PRIORITIZE: Lean proteins, complex carbohydrates, healthy fats
- INCLUDE: Functional foods, high protein value
- PREFER: Balanced and nutritious meals
- STYLE: FITNESS RECIPES - focus on quality and protein`;
  }

  if (profile.goal === "ganhar_peso") {
    const intensityLabel = {
      light: "LIGHT (up to 5kg)",
      moderate: "MODERATE (5-10kg)",
      aggressive: "INTENSIVE (more than 10kg)"
    }[context.goalIntensity];

    return `
📈 GOAL: MASS GAIN - ${intensityLabel}
- Gain target: ${context.weightDifference}kg
- Caloric surplus: +${context.calorieAdjustment} kcal/day
- Protein: ${context.proteinMultiplier}g per kg of body weight
- PRIORITIZE: Quality proteins, complex carbohydrates, healthy fats
- INCLUDE: Generous portions, nutrient-dense foods
- PREFER: Nutritious caloric combinations
- STYLE: HIGH CALORIE RECIPES - nutritional density, adequate calories`;
  }

  if (profile.goal === "dieta_flexivel") {
    return `
🎯 GOAL: FLEXIBLE DIET
- User defines their own caloric goals
- Flexibility in food choices
- Respect restrictions and intolerances
- STYLE: VARIED RECIPES - focus on variety and pleasure`;
  }

  return "";
}


// ============================================
// CONFIGURAÇÃO DE CULINÁRIA POR PAÍS
// ============================================

export interface CountryCuisineConfig {
  name: string;
  language: string;
  ingredientPriority: string;
  mealTypeLabels: Record<string, string>;
  mealExamples: Record<string, string[]>;
}

export const COUNTRY_CUISINE_CONFIG: Record<string, CountryCuisineConfig> = {
  BR: {
    name: "Brasil",
    language: "pt-BR",
    ingredientPriority: "Priorize ingredientes de fácil acesso no Brasil",
    mealTypeLabels: {
      breakfast: "Café da Manhã",
      lunch: "Almoço",
      afternoon_snack: "Lanche da Tarde",
      dinner: "Jantar",
      supper: "Ceia"
    },
    mealExamples: {
      breakfast: ["tapioca recheada", "pão francês com manteiga", "mingau de aveia", "vitamina de banana", "cuscuz nordestino"],
      lunch: ["arroz com feijão e bife", "frango grelhado com legumes", "feijoada light", "strogonoff de frango", "moqueca de peixe"],
      afternoon_snack: ["pão de queijo", "açaí na tigela", "sanduíche natural", "bolo de cenoura", "tapioca"],
      dinner: ["sopa de legumes", "omelete de legumes", "salada completa", "wrap leve", "creme de abóbora"],
      supper: ["chá com biscoito integral", "iogurte natural", "frutas", "queijo cottage"]
    }
  },
  US: {
    name: "Estados Unidos",
    language: "en-US",
    ingredientPriority: "Prioritize ingredients commonly available in the United States",
    mealTypeLabels: {
      breakfast: "Breakfast",
      lunch: "Lunch",
      afternoon_snack: "Snack",
      dinner: "Dinner",
      supper: "Late Night Snack"
    },
    mealExamples: {
      breakfast: ["scrambled eggs with bacon", "pancakes with maple syrup", "oatmeal with berries", "bagel with cream cheese", "avocado toast", "smoothie bowl"],
      lunch: ["grilled chicken salad", "turkey club sandwich", "burrito bowl", "mac and cheese", "chicken wrap"],
      afternoon_snack: ["protein bar", "trail mix", "apple with peanut butter", "greek yogurt", "cheese and crackers"],
      dinner: ["grilled salmon with vegetables", "BBQ chicken", "steak with mashed potatoes", "pasta primavera", "beef stir-fry"],
      supper: ["cottage cheese", "warm milk", "handful of almonds", "banana"]
    }
  },
  MX: {
    name: "México",
    language: "es-MX",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina mexicana",
    mealTypeLabels: {
      breakfast: "Desayuno",
      lunch: "Comida",
      afternoon_snack: "Merienda",
      dinner: "Cena",
      supper: "Cena Ligera"
    },
    mealExamples: {
      breakfast: ["huevos rancheros", "chilaquiles verdes", "molletes", "quesadillas de queso", "licuado de frutas"],
      lunch: ["tacos de carne asada", "enchiladas rojas", "pozole rojo", "mole con pollo", "chiles rellenos"],
      afternoon_snack: ["elote con mayonesa", "fruta con chile", "tostadas de aguacate", "guacamole con totopos"],
      dinner: ["sopa de tortilla", "quesadillas", "flautas de pollo", "tostadas de tinga", "tamales"],
      supper: ["té de manzanilla", "yogur natural", "fruta picada"]
    }
  },
  PT: {
    name: "Portugal",
    language: "pt-PT",
    ingredientPriority: "Prioriza ingredientes típicos da culinária portuguesa",
    mealTypeLabels: {
      breakfast: "Pequeno-almoço",
      lunch: "Almoço",
      afternoon_snack: "Lanche",
      dinner: "Jantar",
      supper: "Ceia"
    },
    mealExamples: {
      breakfast: ["torrada com manteiga", "pastel de nata", "iogurte com cereais", "pão com queijo", "café com leite"],
      lunch: ["bacalhau à brás", "francesinha", "caldo verde", "arroz de pato", "sardinha assada"],
      afternoon_snack: ["pastel de nata", "bolo de arroz", "sandes de presunto", "fruta"],
      dinner: ["sopa de legumes", "peixe grelhado", "omelete", "bifanas", "polvo à lagareiro"],
      supper: ["chá de camomila", "iogurte", "fruta", "queijo fresco"]
    }
  },
  ES: {
    name: "España",
    language: "es-ES",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina española",
    mealTypeLabels: {
      breakfast: "Desayuno",
      lunch: "Almuerzo",
      afternoon_snack: "Merienda",
      dinner: "Cena",
      supper: "Cena Ligera"
    },
    mealExamples: {
      breakfast: ["tostada con tomate", "churros con chocolate", "tortilla española", "zumo de naranja"],
      lunch: ["paella valenciana", "gazpacho andaluz", "cocido madrileño", "fabada asturiana", "pulpo a la gallega"],
      afternoon_snack: ["bocadillo de jamón", "magdalenas", "fruta de temporada"],
      dinner: ["tortilla española", "ensalada mixta", "croquetas", "gambas al ajillo", "pimientos de padrón"],
      supper: ["yogur natural", "frutos secos", "queso manchego"]
    }
  },
  AR: {
    name: "Argentina",
    language: "es-AR",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina argentina",
    mealTypeLabels: {
      breakfast: "Desayuno",
      lunch: "Almuerzo",
      afternoon_snack: "Merienda",
      dinner: "Cena",
      supper: "Cena Ligera"
    },
    mealExamples: {
      breakfast: ["medialunas con café", "tostadas con dulce de leche", "mate con facturas"],
      lunch: ["asado con ensalada", "milanesa napolitana", "empanadas", "locro", "bife de chorizo"],
      afternoon_snack: ["alfajores", "mate con facturas", "tostado de jamón y queso"],
      dinner: ["pizza argentina", "pasta con salsa", "provoleta", "choripán"],
      supper: ["yogur", "fruta", "queso con membrillo"]
    }
  },
  CO: {
    name: "Colombia",
    language: "es-CO",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina colombiana",
    mealTypeLabels: {
      breakfast: "Desayuno",
      lunch: "Almuerzo",
      afternoon_snack: "Onces",
      dinner: "Cena",
      supper: "Cena Ligera"
    },
    mealExamples: {
      breakfast: ["arepa con queso", "huevos pericos", "calentado", "changua", "pandebono"],
      lunch: ["bandeja paisa", "ajiaco bogotano", "sancocho", "arroz con pollo", "lechona"],
      afternoon_snack: ["empanadas", "buñuelos", "almojábanas", "fruta con sal"],
      dinner: ["sopa de mondongo", "tamales", "patacones con hogao"],
      supper: ["aromática", "galletas", "queso con bocadillo"]
    }
  },
  CL: {
    name: "Chile",
    language: "es-CL",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina chilena",
    mealTypeLabels: {
      breakfast: "Desayuno",
      lunch: "Almuerzo",
      afternoon_snack: "Once",
      dinner: "Cena",
      supper: "Cena Ligera"
    },
    mealExamples: {
      breakfast: ["pan con palta", "huevos revueltos", "tostadas con mermelada", "leche con cereales"],
      lunch: ["pastel de choclo", "cazuela de pollo", "empanadas de pino", "curanto", "porotos con riendas"],
      afternoon_snack: ["pan con queso", "kuchen", "té con sopaipillas"],
      dinner: ["caldillo de congrio", "plateada", "ensalada chilena"],
      supper: ["té con galletas", "fruta", "yogur"]
    }
  },
  PE: {
    name: "Perú",
    language: "es-PE",
    ingredientPriority: "Prioriza ingredientes típicos de la cocina peruana",
    mealTypeLabels: {
      breakfast: "Desayuno",
      lunch: "Almuerzo",
      afternoon_snack: "Lonche",
      dinner: "Cena",
      supper: "Cena Ligera"
    },
    mealExamples: {
      breakfast: ["pan con chicharrón", "quinua con leche", "tamales", "jugo de papaya"],
      lunch: ["ceviche", "lomo saltado", "ají de gallina", "arroz con pollo", "causa limeña"],
      afternoon_snack: ["picarones", "anticuchos", "papa rellena"],
      dinner: ["sopa criolla", "tacu tacu", "arroz chaufa"],
      supper: ["emoliente", "mazamorra morada", "fruta"]
    }
  },
  FR: {
    name: "France",
    language: "fr-FR",
    ingredientPriority: "Privilégiez les ingrédients typiques de la cuisine française",
    mealTypeLabels: {
      breakfast: "Petit-déjeuner",
      lunch: "Déjeuner",
      afternoon_snack: "Goûter",
      dinner: "Dîner",
      supper: "Collation"
    },
    mealExamples: {
      breakfast: ["croissant au beurre", "pain au chocolat", "tartine avec confiture", "café au lait", "œufs brouillés"],
      lunch: ["coq au vin", "ratatouille", "quiche lorraine", "boeuf bourguignon", "salade niçoise"],
      afternoon_snack: ["madeleine", "pain au chocolat", "fruit frais"],
      dinner: ["soupe à l'oignon", "croque-monsieur", "omelette aux fines herbes", "poisson grillé"],
      supper: ["tisane", "yaourt nature", "fromage blanc"]
    }
  },
  IT: {
    name: "Italia",
    language: "it-IT",
    ingredientPriority: "Privilegia ingredienti tipici della cucina italiana",
    mealTypeLabels: {
      breakfast: "Colazione",
      morning_snack: "Spuntino Mattutino",
      lunch: "Pranzo",
      afternoon_snack: "Merenda",
      dinner: "Cena",
      supper: "Spuntino Serale"
    },
    mealExamples: {
      breakfast: ["cornetto con cappuccino", "pane con marmellata", "fette biscottate", "yogurt con granola"],
      morning_snack: ["frutta fresca", "yogurt", "biscotti"],
      lunch: ["pasta al pomodoro", "risotto ai funghi", "lasagna alla bolognese", "insalata caprese", "gnocchi al pesto"],
      afternoon_snack: ["bruschetta", "frutta fresca", "biscotti", "gelato"],
      dinner: ["minestrone", "pesce alla griglia", "pollo arrosto", "pizza margherita", "frittata"],
      supper: ["tisana", "frutta", "parmigiano con miele"]
    }
  },
  DE: {
    name: "Deutschland",
    language: "de-DE",
    ingredientPriority: "Bevorzugen Sie typisch deutsche Zutaten",
    mealTypeLabels: {
      breakfast: "Frühstück",
      morning_snack: "Vormittagssnack",
      lunch: "Mittagessen",
      afternoon_snack: "Kaffee und Kuchen",
      dinner: "Abendessen",
      supper: "Spätmahlzeit"
    },
    mealExamples: {
      breakfast: ["brötchen mit käse", "müsli mit joghurt", "rührei mit speck", "vollkornbrot"],
      morning_snack: ["obst", "joghurt", "nüsse"],
      lunch: ["schnitzel mit kartoffelsalat", "bratwurst mit sauerkraut", "rinderroulade", "spätzle"],
      afternoon_snack: ["apfelstrudel", "käsekuchen", "brezel"],
      dinner: ["brotzeit", "currywurst", "eintopf", "gulaschsuppe"],
      supper: ["kräutertee", "joghurt", "obst"]
    }
  },
  GB: {
    name: "United Kingdom",
    language: "en-GB",
    ingredientPriority: "Prioritise ingredients common in British cuisine",
    mealTypeLabels: {
      breakfast: "Breakfast",
      morning_snack: "Elevenses",
      lunch: "Lunch",
      afternoon_snack: "Afternoon Tea",
      dinner: "Dinner",
      supper: "Supper"
    },
    mealExamples: {
      breakfast: ["full english breakfast", "porridge with berries", "toast with marmalade", "eggs benedict"],
      morning_snack: ["biscuits with tea", "fruit", "crumpets"],
      lunch: ["fish and chips", "shepherd's pie", "cornish pasty", "ploughman's lunch", "jacket potato"],
      afternoon_snack: ["scones with cream", "cucumber sandwiches", "victoria sponge"],
      dinner: ["roast beef with yorkshire pudding", "chicken tikka masala", "bangers and mash", "cottage pie"],
      supper: ["warm milk", "digestive biscuits", "cheese and crackers"]
    }
  },
  AU: {
    name: "Australia",
    language: "en-AU",
    ingredientPriority: "Prioritise ingredients commonly available in Australia",
    mealTypeLabels: {
      breakfast: "Breakfast",
      morning_snack: "Morning Tea",
      lunch: "Lunch",
      afternoon_snack: "Arvo Snack",
      dinner: "Dinner",
      supper: "Supper"
    },
    mealExamples: {
      breakfast: ["avocado toast with poached eggs", "vegemite on toast", "acai bowl", "big breakfast", "smashed avo"],
      morning_snack: ["fruit", "flat white", "muffin"],
      lunch: ["meat pie", "fish and chips", "chicken schnitzel", "poke bowl", "barramundi"],
      afternoon_snack: ["tim tams", "lamingtons", "fruit", "flat white"],
      dinner: ["grilled kangaroo", "lamb chops", "pavlova", "bbq prawns", "chicken parmigiana"],
      supper: ["herbal tea", "yogurt", "anzac biscuits"]
    }
  },
  CA: {
    name: "Canada",
    language: "en-CA",
    ingredientPriority: "Prioritize ingredients commonly available in Canada",
    mealTypeLabels: {
      breakfast: "Breakfast",
      morning_snack: "Morning Snack",
      lunch: "Lunch",
      afternoon_snack: "Snack",
      dinner: "Dinner",
      supper: "Late Snack"
    },
    mealExamples: {
      breakfast: ["pancakes with maple syrup", "eggs benedict", "canadian bacon", "montreal bagel", "oatmeal"],
      morning_snack: ["fruit", "coffee", "muffin"],
      lunch: ["poutine", "montreal smoked meat sandwich", "tourtière", "caesar salad"],
      afternoon_snack: ["butter tarts", "nanaimo bars", "maple cookies", "apple slices"],
      dinner: ["salmon", "roast turkey", "alberta beef steak", "wild rice pilaf"],
      supper: ["chamomile tea", "fruit", "cheese"]
    }
  },
};

// ============================================
// FUNÇÕES UTILITÁRIAS DE PAÍS
// ============================================

// Meal type key normalization for backward compatibility (legacy Portuguese keys -> English)
const MEAL_TYPE_TO_CONFIG_KEY: Record<string, string> = {
  // Legacy Portuguese keys -> English standard keys
  'cafe_manha': 'breakfast',
  'lanche_manha': 'morning_snack',
  'almoco': 'lunch',
  'lanche_tarde': 'afternoon_snack',
  'lanche': 'afternoon_snack',
  'jantar': 'dinner',
  'ceia': 'supper',
  // English keys stay as-is
  'breakfast': 'breakfast',
  'morning_snack': 'morning_snack',
  'lunch': 'lunch',
  'afternoon_snack': 'afternoon_snack',
  'dinner': 'dinner',
  'supper': 'supper',
};

function normalizeConfigMealType(mealType: string): string {
  return MEAL_TYPE_TO_CONFIG_KEY[mealType] || mealType;
}

/**
 * Obtém configuração do país (fallback para BR)
 */
export function getCountryConfig(country: string | null | undefined): CountryCuisineConfig {
  return COUNTRY_CUISINE_CONFIG[country || "BR"] || COUNTRY_CUISINE_CONFIG["BR"];
}

/**
 * Obtém exemplos de refeição por tipo e país
 * Supports both English keys (breakfast, lunch, dinner) and Portuguese keys (cafe_manha, almoco, jantar)
 */
export function getMealExamples(mealType: string, country: string | null | undefined): string[] {
  const config = getCountryConfig(country);
  const normalizedKey = normalizeConfigMealType(mealType);
  // Try normalized key first, then original, then fallback
  return config.mealExamples[normalizedKey] || config.mealExamples[mealType] || config.mealExamples["lunch"] || config.mealExamples["almoco"] || [];
}

/**
 * Obtém instrução de prioridade de ingredientes por país
 */
export function getIngredientPriority(country: string | null | undefined): string {
  return getCountryConfig(country).ingredientPriority;
}

/**
 * Obtém labels de tipo de refeição por país
 * Supports both English keys (breakfast, lunch, dinner) and Portuguese keys (cafe_manha, almoco, jantar)
 */
export function getMealTypeLabel(mealType: string, country: string | null | undefined): string {
  const config = getCountryConfig(country);
  const normalizedKey = normalizeConfigMealType(mealType);
  // Try original key first (for countries using English keys), then normalized key
  return config.mealTypeLabels[mealType] || config.mealTypeLabels[normalizedKey] || MEAL_TYPE_LABELS[mealType] || mealType;
}

export interface MacroTargets {
  dailyCalories: number;
  dailyProtein: number;
  mode: "lose" | "gain" | "maintain";
}

export interface CategoryContext {
  category?: string;
  subcategory?: string;
  filters?: {
    culinaria?: string;
    tempo?: string;
    metodo?: string;
  };
}

// ============================================
// MAPEAMENTO EXPANDIDO DE INGREDIENTES PROIBIDOS
// ============================================
// @deprecated v2.0: Estas listas são mantidas apenas como FALLBACK.
// O globalSafetyEngine.ts agora é a fonte única de verdade,
// buscando dados diretamente das tabelas intolerance_mappings e dietary_forbidden_ingredients.
// Novas validações devem usar loadSafetyDatabase() e validateIngredient() do globalSafetyEngine.

export const FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  lactose: [
    // Leite e derivados diretos
    "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em pó",
    "leite condensado", "leite evaporado", "leite de vaca", "leite de cabra", "leite de búfala",
    // Queijos
    "queijo", "queijo muçarela", "queijo mussarela", "queijo parmesão", "queijo prato",
    "queijo coalho", "queijo minas", "queijo cottage", "queijo ricota", "queijo gorgonzola",
    "queijo provolone", "queijo brie", "queijo camembert", "queijo cheddar", "queijo gouda",
    "queijo gruyère", "queijo feta", "queijo roquefort", "queijo mascarpone", "queijo cream cheese",
    "queijo pecorino", "queijo manchego", "queijo emmental", "queijo suíço", "cream cheese",
    // Creme e manteiga
    "manteiga", "manteiga com sal", "manteiga sem sal", "manteiga ghee", "ghee",
    "creme de leite", "creme de leite fresco", "nata", "chantilly", "chantili",
    "creme chantilly", "creme fraîche", "creme azedo", "sour cream",
    // Iogurte
    "iogurte", "iogurte natural", "iogurte grego", "iogurte integral", "iogurte desnatado",
    "coalhada", "kefir", "leite fermentado", "yakult",
    // Requeijão e similares
    "requeijão", "requeijão cremoso", "requeijão light", "catupiry", "polenguinho",
    // Produtos processados com lactose
    "whey", "whey protein", "proteína do soro do leite", "caseína", "caseinato",
    "lactose", "soro de leite", "lactoalbumina", "lactoglobulina",
    // Doces com lactose
    "doce de leite", "brigadeiro", "leite moça", "pudim de leite",
    // Outros
    "fondue", "bechamel", "molho branco", "molho quatro queijos", "molho alfredo",
  ],
  
  gluten: [
    // Trigo e derivados
    "trigo", "farinha de trigo", "farinha branca", "farinha integral", "farinha de rosca",
    "farelo de trigo", "gérmen de trigo", "trigo integral", "trigo sarraceno",
    // Pães
    "pão", "pão francês", "pão de forma", "pão integral", "pão sírio", "pão árabe",
    "pão ciabatta", "pão italiano", "pão de leite", "pão de queijo", "torrada",
    "crouton", "croûton", "bruschetta", "focaccia", "bagel", "brioche",
    // Massas
    "macarrão", "espaguete", "penne", "fusilli", "farfalle", "lasanha", "nhoque",
    "ravióli", "tortellini", "capeletti", "talharim", "fettuccine", "massa",
    "massa folhada", "massa de pizza", "massa de torta", "massa de pastel",
    // Cereais
    "aveia", "aveia em flocos", "farelo de aveia", "cevada", "centeio", "malte",
    "cerveja", "uísque", "whisky",
    // Biscoitos e bolos
    "biscoito", "bolacha", "cookie", "bolo", "bolo pronto", "mistura para bolo",
    "wafer", "pretzel", "cream cracker",
    // Empanados
    "empanado", "milanesa", "breading", "nuggets", "croquete",
    // Molhos
    "molho shoyu", "shoyu", "molho de soja industrializado", "molho teriyaki",
    "molho inglês", "molho barbecue industrializado",
    // Outros
    "seitan", "bulgur", "cuscuz de trigo", "semolina", "sêmola",
  ],
  
  acucar: [
    // Açúcares diretos
    "açúcar", "açúcar refinado", "açúcar cristal", "açúcar mascavo", "açúcar demerara",
    "açúcar de confeiteiro", "açúcar invertido", "açúcar de coco",
    // Xaropes
    "mel", "melado", "melaço", "xarope de milho", "xarope de glicose", "xarope de agave",
    "xarope de bordo", "maple syrup", "xarope de frutose",
    // Outros doces
    "rapadura", "caramelo", "calda", "geleia", "compota", "doce",
    // Adoçantes calóricos
    "maltodextrina", "dextrose", "frutose",
  ],
  
  amendoim: [
    "amendoim", "amendoins", "pasta de amendoim", "manteiga de amendoim", "paçoca",
    "óleo de amendoim", "farinha de amendoim", "pé de moleque",
  ],
  
  frutos_mar: [
    // Peixes
    "peixe", "salmão", "atum", "tilápia", "bacalhau", "sardinha", "anchova",
    "truta", "robalo", "dourado", "pescada", "merluza", "linguado", "badejo",
    "cavala", "arenque", "carpa",
    // Frutos do mar
    "camarão", "camarões", "lagosta", "lagostim", "caranguejo", "siri",
    "lula", "polvo", "mexilhão", "marisco", "ostra", "vieira", "berbigão",
    "sururu", "vongole",
    // Derivados
    "óleo de peixe", "molho de peixe", "molho de ostra", "pasta de anchova",
    "caldo de peixe", "fumet",
  ],
  
  ovo: [
    "ovo", "ovos", "ovo inteiro", "clara de ovo", "gema de ovo", "ovo caipira",
    "ovo de codorna", "ovo cozido", "ovo frito", "ovo mexido", "omelete",
    "fritada", "gemada", "merengue", "suspiro", "clara em neve",
    // Produtos com ovo
    "maionese", "aioli", "molho holandês", "molho béarnaise", "carbonara",
    "massa fresca com ovo", "panqueca", "waffle", "brioche", "pão de ló",
  ],
  
  soja: [
    "soja", "grão de soja", "proteína de soja", "proteína texturizada de soja",
    "tofu", "tofu firme", "tofu macio", "tofu defumado",
    "leite de soja", "bebida de soja", "iogurte de soja",
    "edamame", "missô", "molho shoyu", "shoyu", "tamari",
    "tempeh", "natto", "óleo de soja", "lecitina de soja",
  ],
  
  castanhas: [
    "castanha", "castanhas", "castanha de caju", "castanha do pará", "castanha do brasil",
    "nozes", "noz", "noz pecã", "noz moscada",
    "amêndoa", "amêndoas", "farinha de amêndoa", "leite de amêndoa",
    "avelã", "avelãs", "creme de avelã", "nutella",
    "pistache", "pistaches", "macadâmia", "pinhão", "pinhões",
    "pasta de castanha", "manteiga de amêndoa", "manteiga de castanha",
  ],
};

// ============================================
// LABELS - MAPEAMENTOS LEGÍVEIS
// ============================================

export const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "SEM LACTOSE (nenhum leite, queijo, manteiga, creme de leite, iogurte, requeijão ou quaisquer derivados de leite)",
  gluten: "SEM GLÚTEN (nenhuma farinha de trigo, aveia, cevada, centeio, pão, macarrão comum, biscoitos ou derivados)",
  acucar: "SEM AÇÚCAR (nenhum açúcar refinado, mascavo, demerara, mel, xarope, ou adoçantes calóricos)",
  amendoim: "SEM AMENDOIM (nenhum amendoim, pasta de amendoim, óleo de amendoim ou derivados)",
  frutos_mar: "SEM FRUTOS DO MAR (nenhum camarão, lagosta, caranguejo, peixe, mariscos, lula, polvo ou derivados)",
  ovo: "SEM OVO (nenhum ovo inteiro, clara, gema, maionese tradicional, ou produtos com ovo)",
  soja: "SEM SOJA (nenhum tofu, leite de soja, molho shoyu, edamame ou derivados de soja)",
  castanhas: "SEM CASTANHAS (nenhuma castanha, noz, amêndoa, avelã, pistache, macadâmia ou derivados)",
};

export const DIETARY_LABELS: Record<string, string> = {
  comum: "alimentação comum (onívora, sem restrições de origem animal)",
  vegetariana: "vegetariana (sem carnes vermelhas, aves e peixes, mas permite ovos e laticínios)",
  vegana: "vegana (100% vegetal, sem NENHUM produto de origem animal: carnes, ovos, leite, mel, queijo)",
  low_carb: "low carb (baixo carboidrato, priorizar proteínas e gorduras boas, evitar açúcares e amidos)",
  pescetariana: "pescetariana (sem carnes vermelhas e aves, mas permite peixes, frutos do mar, ovos e laticínios)",
  cetogenica: "cetogênica/keto (muito baixo carboidrato, alta gordura, moderada proteína - evitar grãos, açúcares, frutas doces, tubérculos)",
  flexitariana: "flexitariana (majoritariamente vegetariana, com consumo ocasional e moderado de carnes - priorizar vegetais)",
};

// ============================================
// INGREDIENTES PROIBIDOS POR DIETA
// ============================================
// Lista de ingredientes que JAMAIS devem aparecer em receitas
// para usuários com cada preferência dietética

export const DIETARY_FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  vegetariana: [
    // Carnes vermelhas
    "carne", "carne bovina", "carne de boi", "bife", "picanha", "filé mignon", "alcatra", "patinho",
    "acém", "músculo", "costela bovina", "carne moída", "hambúrguer de carne", "carne seca",
    "charque", "carne de porco", "lombo", "pernil", "bacon", "panceta", "linguiça de porco",
    "salsicha", "presunto", "mortadela", "copa", "salame", "calabresa",
    "carne de cordeiro", "cordeiro", "carneiro", "cabrito",
    // Aves
    "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "frango desfiado",
    "carne de frango", "peru", "pato", "chester", "galinha", "canja de galinha",
    // Peixes
    "peixe", "salmão", "tilápia", "bacalhau", "atum", "sardinha", "pescada", "robalo", "dourado",
    "namorado", "linguado", "merluza", "truta", "pacu", "pintado", "surubim", "pirarucu",
    // Frutos do mar
    "camarão", "lagosta", "caranguejo", "siri", "lula", "polvo", "mexilhão", "ostra", "vieira",
    "marisco", "frutos do mar",
    // Produtos derivados de carne
    "caldo de carne", "caldo de galinha", "caldo de frango", "extrato de carne", "gelatina",
    "banha", "gordura de porco", "toucinho",
  ],
  vegana: [
    // Tudo de vegetariana +
    "carne", "carne bovina", "carne de boi", "bife", "picanha", "filé mignon", "alcatra", "patinho",
    "acém", "músculo", "costela bovina", "carne moída", "hambúrguer de carne", "carne seca",
    "charque", "carne de porco", "lombo", "pernil", "bacon", "panceta", "linguiça de porco",
    "salsicha", "presunto", "mortadela", "copa", "salame", "calabresa",
    "carne de cordeiro", "cordeiro", "carneiro", "cabrito",
    "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "frango desfiado",
    "peru", "pato", "chester", "galinha",
    "peixe", "salmão", "tilápia", "bacalhau", "atum", "sardinha", "pescada", "robalo",
    "camarão", "lagosta", "caranguejo", "siri", "lula", "polvo", "mexilhão", "ostra", "vieira",
    "caldo de carne", "caldo de galinha", "caldo de frango", "extrato de carne", "gelatina",
    "banha", "gordura de porco", "toucinho",
    // Laticínios
    "leite", "leite integral", "leite desnatado", "leite condensado", "leite em pó",
    "queijo", "queijo muçarela", "queijo parmesão", "queijo prato", "queijo cottage", "queijo ricota",
    "cream cheese", "requeijão", "catupiry",
    "manteiga", "creme de leite", "nata", "chantilly", "iogurte", "coalhada", "kefir",
    "whey", "whey protein", "caseína", "soro de leite",
    // Ovos
    "ovo", "ovos", "clara de ovo", "gema de ovo", "ovo cozido", "ovo frito", "omelete",
    "maionese", "maionese tradicional",
    // Mel e derivados
    "mel", "mel de abelha", "própolis", "geleia real",
  ],
  pescetariana: [
    // Apenas carnes vermelhas e aves
    "carne", "carne bovina", "carne de boi", "bife", "picanha", "filé mignon", "alcatra", "patinho",
    "acém", "músculo", "costela bovina", "carne moída", "hambúrguer de carne", "carne seca",
    "charque", "carne de porco", "lombo", "pernil", "bacon", "panceta", "linguiça de porco",
    "salsicha", "presunto", "mortadela", "copa", "salame", "calabresa",
    "carne de cordeiro", "cordeiro", "carneiro", "cabrito",
    "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "frango desfiado",
    "peru", "pato", "chester", "galinha",
    "caldo de carne", "caldo de galinha", "caldo de frango",
    "banha", "gordura de porco", "toucinho",
  ],
  low_carb: [
    // Carboidratos refinados e açúcares
    "açúcar", "açúcar refinado", "açúcar mascavo", "açúcar demerara", "açúcar cristal",
    "mel", "melado", "xarope de milho", "xarope de glicose", "xarope de agave",
    "pão", "pão francês", "pão de forma", "pão integral", "torrada",
    "arroz branco", "arroz", "macarrão", "espaguete", "massa", "lasanha",
    "batata", "batata inglesa", "batata frita", "purê de batata",
    "farinha de trigo", "farinha branca", "amido de milho", "maisena",
    "biscoito", "bolacha", "bolo", "doce", "sobremesa açucarada",
    "refrigerante", "suco industrializado", "suco de caixinha",
    "cerveja", "bebida alcoólica doce",
  ],
  cetogenica: [
    // Ainda mais restritivo que low_carb
    "açúcar", "açúcar refinado", "açúcar mascavo", "açúcar demerara", "mel", "melado",
    "xarope de milho", "xarope de glicose", "xarope de agave",
    "pão", "pão francês", "pão de forma", "torrada", "croissant", "bolo",
    "arroz", "arroz branco", "arroz integral", "macarrão", "massa", "lasanha",
    "batata", "batata inglesa", "batata doce", "mandioca", "macaxeira", "aipim",
    "inhame", "cará", "batata baroa", "mandioquinha",
    "farinha de trigo", "farinha", "amido de milho", "maisena", "polvilho",
    "feijão", "feijão preto", "feijão carioca", "lentilha", "grão de bico", "ervilha",
    "milho", "pipoca", "canjica",
    "banana", "manga", "uva", "abacaxi", "melancia", "frutas doces",
    "biscoito", "bolacha", "doce", "sobremesa",
    "refrigerante", "suco de fruta", "suco industrializado",
  ],
};

/**
 * Retorna lista de ingredientes proibidos por preferência dietética
 */
export function getDietaryForbiddenIngredients(dietaryPreference: string | null | undefined): string[] {
  if (!dietaryPreference || dietaryPreference === "comum" || dietaryPreference === "flexitariana") {
    return [];
  }
  
  return DIETARY_FORBIDDEN_INGREDIENTS[dietaryPreference] || [];
}

/**
 * Retorna lista COMPLETA de ingredientes proibidos para o usuário
 * baseado em suas intolerâncias, preferência dietética e alimentos excluídos manualmente
 */
export function getAllForbiddenIngredientsWithDiet(profile: UserProfile): string[] {
  const forbidden: string[] = [];
  
  // Adiciona ingredientes de cada intolerância
  const intolerances = profile.intolerances || [];
  for (const intolerance of intolerances) {
    if (intolerance !== "nenhuma" && FORBIDDEN_INGREDIENTS[intolerance]) {
      forbidden.push(...FORBIDDEN_INGREDIENTS[intolerance]);
    }
  }
  
  // Adiciona ingredientes proibidos pela preferência dietética
  const dietaryForbidden = getDietaryForbiddenIngredients(profile.dietary_preference);
  forbidden.push(...dietaryForbidden);
  
  // Adiciona ingredientes excluídos manualmente
  const excluded = profile.excluded_ingredients || [];
  forbidden.push(...excluded);
  
  // Remove duplicatas e retorna
  return [...new Set(forbidden.map(i => i.toLowerCase()))];
}

/**
 * Gera lista resumida de ingredientes proibidos incluindo dieta para incluir no prompt
 */
export function buildForbiddenIngredientsListWithDiet(profile: UserProfile): string {
  const forbidden = getAllForbiddenIngredientsWithDiet(profile);
  
  if (forbidden.length === 0) {
    return "";
  }
  
  // Pega os 80 mais importantes para cobrir dietas
  const topForbidden = forbidden.slice(0, 80);
  
  return topForbidden.join(", ").toUpperCase();
}

/**
 * Gera bloco de restrições dietéticas para o prompt
 */
export function buildDietaryRestrictionBlock(profile: UserProfile): string {
  const preference = profile.dietary_preference;
  
  if (!preference || preference === "comum") {
    return "";
  }
  
  const dietLabel = DIETARY_LABELS[preference] || preference;
  const forbiddenIngredients = getDietaryForbiddenIngredients(preference);
  
  if (forbiddenIngredients.length === 0) {
    return "";
  }
  
  // Pega os 30 principais ingredientes para o bloco específico
  const mainForbidden = forbiddenIngredients.slice(0, 30).join(", ").toUpperCase();
  
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  🥗 DIETA ${dietLabel.toUpperCase()} - RESTRIÇÕES OBRIGATÓRIAS                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

⛔ INGREDIENTES PROIBIDOS PELA DIETA ${preference.toUpperCase()}:
${mainForbidden}

📋 REGRAS DA DIETA:
${preference === "vegetariana" ? "✓ PERMITIDO: ovos, leite, queijos, mel\n✗ PROIBIDO: qualquer tipo de carne, peixe, frutos do mar" : ""}
${preference === "vegana" ? "✗ PROIBIDO: QUALQUER produto de origem animal (carnes, ovos, leite, mel, queijo, manteiga, iogurte)\n✓ USE APENAS: ingredientes 100% vegetais" : ""}
${preference === "pescetariana" ? "✓ PERMITIDO: peixes, frutos do mar, ovos, laticínios\n✗ PROIBIDO: carnes vermelhas, aves (frango, peru, pato)" : ""}
${preference === "low_carb" ? "✗ EVITAR: açúcares, pães, arroz, massas, batatas, farinhas\n✓ PRIORIZAR: proteínas, vegetais baixos em carb, gorduras boas" : ""}
${preference === "cetogenica" ? "✗ PROIBIDO: carboidratos (pães, arroz, massas, batatas, feijões, frutas doces)\n✓ PRIORIZAR: gorduras saudáveis, proteínas moderadas, vegetais folhosos" : ""}

🔴 SE QUALQUER RECEITA CONTIVER INGREDIENTE PROIBIDO, SERÁ REJEITADA!
`;
}

export const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecimento (déficit calórico controlado, foco em saciedade e proteína)",
  manter: "manutenção de peso (calorias equilibradas)",
  ganhar_peso: "ganho de massa muscular (superávit calórico controlado, alta proteína)",
};

// Deriva meta calórica automaticamente do objetivo do usuário
export function deriveCalorieGoalFromGoal(goal: string | null | undefined): string {
  switch (goal) {
    case "emagrecer": return "reduzir";
    case "ganhar_peso": return "aumentar";
    default: return "manter";
  }
}

export const CALORIE_LABELS: Record<string, string> = {
  reduzir: "reduzir calorias (porções menores, menos calóricas)",
  manter: "manter calorias normais",
  aumentar: "aumentar calorias (porções maiores, mais densas)",
};

export const COMPLEXITY_LABELS: Record<string, string> = {
  rapida: "rápida e prática (até 20 minutos de preparo)",
  equilibrada: "equilibrada (20-40 minutos de preparo)",
  elaborada: "elaborada (mais de 40 minutos, receitas mais sofisticadas)",
};

export const CONTEXT_LABELS: Record<string, string> = {
  individual: "pessoa individual (2 porções)",
  familia: "família (4 porções, receitas que agradam a todos)",
  modo_kids: "modo kids (receitas divertidas e kid-friendly)",
};

export const SEX_LABELS: Record<string, string> = {
  male: "homem",
  female: "mulher",
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

// ============================================
// EXEMPLOS POR CATEGORIA
// ============================================

export const CATEGORY_EXAMPLES: Record<string, Record<string, string>> = {
  "Entradas & Leves": {
    "Saladas": "Salada Caesar, Salada Caprese, Salada de Quinoa com Legumes, Salada Tropical",
    "Molhos para salada": "Molho de Iogurte, Vinagrete, Molho Caesar, Molho de Mostarda e Mel",
    "Pastas e patês": "Homus, Guacamole, Patê de Atum, Pasta de Grão-de-Bico",
    "Antepastos": "Bruschetta, Carpaccio, Tábua de Frios, Antepasto de Berinjela",
    "Sopas leves": "Sopa de Legumes, Caldo Verde Light, Sopa de Abóbora, Consomê",
    "Caldos": "Caldo de Legumes, Caldo de Frango, Caldo Detox, Caldo de Feijão",
    "Cremes frios": "Gazpacho, Creme de Pepino, Vichyssoise, Creme de Abacate",
  },
  "Pratos Principais": {
    "Prato principal tradicional": "Arroz com Feijão e Bife, Frango Assado, Strogonoff, Feijoada Light",
    "Pratos fitness": "Frango Grelhado com Batata Doce, Tilápia com Legumes, Omelete Proteica",
    "Pratos low carb": "Espaguete de Abobrinha, Couve-Flor Refogada com Frango, Berinjela Recheada",
    "Pratos vegetarianos": "Risoto de Cogumelos, Lasanha de Berinjela, Curry de Grão-de-Bico",
    "Pratos veganos": "Buddha Bowl, Feijoada Vegana, Moqueca de Banana da Terra",
    "Pratos proteicos (high protein)": "Bife Ancho, Salmão Grelhado, Peito de Peru Assado",
    "Pratos elaborados / gourmet": "Risoto de Camarão, Medalhão ao Molho Madeira, Lombo Recheado",
    "Pratos para bulking": "Macarrão com Carne Moída, Arroz com Frango e Ovo, Bowl Calórico",
    "Pratos calóricos": "Lasanha Tradicional, Escondidinho de Carne Seca, Feijoada Completa",
  },
  "Acompanhamentos": {
    "Arroz e grãos": "Arroz à Grega, Arroz de Brócolis, Arroz Integral, Quinoa",
    "Legumes refogados": "Abobrinha Refogada, Brócolis no Alho, Mix de Legumes",
    "Purês": "Purê de Batata, Purê de Mandioquinha, Purê de Abóbora",
    "Farofas": "Farofa de Banana, Farofa de Ovos, Farofa Crocante",
    "Massas": "Espaguete ao Alho e Óleo, Penne ao Sugo, Macarrão Integral",
    "Cuscuz": "Cuscuz Nordestino, Cuscuz Marroquino, Cuscuz de Legumes",
    "Quinoa e derivados": "Quinoa com Legumes, Tabule de Quinoa, Quinoa ao Pesto",
  },
  "Café da Manhã & Lanches": {
    "Café da manhã": "Omelete com Queijo, Panqueca de Banana, Torrada com Abacate, Mingau de Aveia, Tapioca Recheada, Pão Integral com Ovos",
    "Lanches fitness": "Wrap de Frango, Sanduíche Natural, Barrinha de Proteína Caseira, Smoothie Bowl, Crepioca, Muffin de Banana",
    "Lanches calóricos": "Sanduíche de Pasta de Amendoim, Vitamina com Aveia e Banana, Panqueca com Mel",
    "Panquecas": "Panqueca de Aveia, Panqueca Americana, Panqueca de Banana, Panqueca Proteica",
    "Ovos e omeletes": "Omelete de Legumes, Ovos Mexidos, Ovo Pochê, Fritada de Espinafre",
    "Sanduíches": "Sanduíche de Frango, Sanduíche Caprese, Croissant Recheado, Bagel de Cream Cheese",
    "Tapiocas": "Tapioca de Queijo, Tapioca de Frango, Tapioca de Banana com Canela, Tapioca Fit",
  },
  "Sobremesas": {
    "Sobremesas tradicionais": "Pudim de Leite, Brigadeiro, Mousse de Maracujá, Pavê",
    "Sobremesas fitness": "Mousse de Chocolate Fit, Sorvete de Banana, Pudim Proteico",
    "Sobremesas low carb": "Cheesecake Low Carb, Brownie Sem Açúcar, Tortinha de Morango",
    "Sobremesas sem açúcar": "Gelatina Diet, Mousse de Limão Diet, Doce de Abóbora Sem Açúcar",
    "Sobremesas veganas": "Brigadeiro Vegano, Mousse de Cacau, Sorvete de Coco",
    "Bolos": "Bolo de Cenoura, Bolo de Chocolate, Bolo de Laranja, Bolo Formigueiro",
    "Tortas doces": "Torta de Limão, Torta de Maçã, Torta Holandesa, Cheesecake",
    "Doces gelados": "Sorvete Caseiro, Picolé de Frutas, Açaí na Tigela, Paleta Mexicana",
  },
  "Bebidas": {
    "Sucos naturais": "Suco de Laranja, Suco Verde Detox, Suco de Melancia, Limonada",
    "Vitaminas e smoothies": "Vitamina de Banana, Smoothie de Morango, Vitamina de Abacate",
    "Shakes proteicos": "Shake de Whey com Banana, Shake de Proteína Vegetal, Shake Pós-Treino",
    "Shakes para ganho de massa": "Shake Hipercalórico, Shake de Pasta de Amendoim, Shake com Aveia",
    "Chás": "Chá de Camomila, Chá Verde, Chá de Hibisco, Chá de Gengibre",
    "Bebidas funcionais": "Água Detox, Shot de Gengibre, Golden Milk, Kombucha",
    "Bebidas detox": "Suco Detox Verde, Água de Pepino, Suco Emagrecedor, Chá Detox",
  },
  "Snacks & Petiscos": {
    "Snacks saudáveis": "Chips de Batata Doce, Grão-de-Bico Crocante, Mix de Nuts, Palitos de Legumes",
    "Snacks low carb": "Chips de Queijo, Palitos de Pepino, Bolinhas de Carne, Ovos de Codorna",
    "Snacks calóricos": "Granola Caseira, Mix de Frutas Secas, Castanhas Caramelizadas",
    "Petiscos de forno": "Bolinha de Queijo, Empada, Pastel Assado, Coxinha de Frango Fit",
    "Petiscos de airfryer": "Batata Rústica, Calabresa Acebolada, Nuggets Caseiros, Bolinho de Bacalhau",
    "Finger foods": "Mini Hambúrguer, Espetinho Caprese, Tartine, Canapés",
  },
};

// Tipos de refeição por horário/ocasião
export const MEAL_TYPE_HINTS: Record<string, string> = {
  "Café da manhã": "Esta é uma receita para o CAFÉ DA MANHÃ. Deve ser algo típico de café da manhã como ovos, pães, frutas, mingau, tapioca, panquecas, etc. NUNCA gere almoço ou jantar.",
  "Lanches fitness": "Esta é uma receita de LANCHE FITNESS. Deve ser algo leve e proteico para lanchar entre refeições, como wraps, sanduíches naturais, smoothies, crepiocas. NUNCA gere pratos principais de almoço/jantar.",
  "Lanches calóricos": "Esta é uma receita de LANCHE CALÓRICO para ganho de peso. Deve ser um lanche substancioso, não um prato principal completo.",
  "Panquecas": "Deve ser uma receita de PANQUECA - doce ou salgada, típica de café da manhã ou lanche.",
  "Ovos e omeletes": "Deve ser uma receita baseada em OVOS - omelete, ovos mexidos, fritada, etc. Típica de café da manhã.",
  "Sanduíches": "Deve ser uma receita de SANDUÍCHE - para café da manhã ou lanche, não um prato principal.",
  "Tapiocas": "Deve ser uma receita de TAPIOCA - típica de café da manhã ou lanche brasileiro.",
};

// Exemplos de receitas apropriadas para cada tipo de refeição (para regenerate-meal)
export const MEAL_TYPE_EXAMPLES: Record<string, string[]> = {
  cafe_manha: ["ovos mexidos", "mingau de aveia", "panqueca", "smoothie de frutas", "tapioca", "pão com queijo", "iogurte com granola", "crepioca", "vitamina de banana"],
  almoco: ["frango grelhado com arroz", "peixe assado", "carne com legumes", "macarrão com molho", "strogonoff", "risoto", "feijoada light", "moqueca"],
  lanche: ["sanduíche natural", "wrap de frango", "barra de cereal caseira", "frutas com pasta de amendoim", "bolo integral", "cookies proteicos", "açaí"],
  jantar: ["sopa de legumes", "omelete", "salada completa", "wrap leve", "peixe grelhado", "frango desfiado", "quiche", "creme de abóbora"],
  ceia: ["chá com biscoito integral", "iogurte", "frutas", "castanhas", "leite morno", "queijo cottage", "banana com canela"],
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Retorna lista COMPLETA de ingredientes proibidos para o usuário
 * baseado em suas intolerâncias e alimentos excluídos manualmente
 */
/**
 * @deprecated v2.0: Use validateIngredientAsync ou globalSafetyEngine diretamente.
 * Esta função usa listas hardcoded como fallback.
 */
export function getAllForbiddenIngredients(profile: UserProfile): string[] {
  const forbidden: string[] = [];
  
  // Adiciona ingredientes de cada intolerância (fallback hardcoded)
  const intolerances = profile.intolerances || [];
  for (const intolerance of intolerances) {
    if (intolerance !== "nenhuma" && FORBIDDEN_INGREDIENTS[intolerance]) {
      forbidden.push(...FORBIDDEN_INGREDIENTS[intolerance]);
    }
  }
  
  // Adiciona ingredientes excluídos manualmente
  const excluded = profile.excluded_ingredients || [];
  forbidden.push(...excluded);
  
  // Remove duplicatas e retorna
  return [...new Set(forbidden.map(i => i.toLowerCase()))];
}

/**
 * Gera lista resumida de ingredientes proibidos para incluir no prompt
 * (máximo 50 itens para não sobrecarregar)
 */
export function buildForbiddenIngredientsList(profile: UserProfile): string {
  const forbidden = getAllForbiddenIngredients(profile);
  
  if (forbidden.length === 0) {
    return "";
  }
  
  // Pega os 50 mais importantes (os primeiros de cada categoria são os mais comuns)
  const topForbidden = forbidden.slice(0, 50);
  
  return topForbidden.join(", ").toUpperCase();
}

/**
 * Calcula TMB (Taxa Metabólica Basal) e GET (Gasto Energético Total)
 * REFATORADO: Agora usa os cálculos centralizados de nutritionalCalculations.ts
 * Mantém interface MacroTargets para compatibilidade com código existente
 */
export function calculateMacroTargets(profile: UserProfile): MacroTargets {
  // Valores padrão se dados incompletos
  let dailyCalories = 2000;
  let dailyProtein = 60;
  let mode: "lose" | "gain" | "maintain" = "maintain";

  if (profile.weight_current && profile.height && profile.age && profile.sex) {
    // Converter perfil para UserPhysicalData
    const physicalData: UserPhysicalData = {
      sex: profile.sex ?? null,
      age: profile.age ?? null,
      height: profile.height ?? null,
      weight_current: profile.weight_current ?? null,
      weight_goal: profile.weight_goal ?? null,
      activity_level: profile.activity_level ?? null,
    };

    // Obter contexto do objetivo para determinar parâmetros da estratégia
    const goalContext = getGoalContext(profile);

    // Determinar parâmetros da estratégia baseado no objetivo
    const strategyParams = {
      calorieModifier: goalContext.calorieAdjustment,
      proteinPerKg: goalContext.proteinMultiplier,
      carbRatio: profile.goal === "cetogenica" ? 0.10 : 
                 profile.goal === "low_carb" ? 0.25 : 0.45,
      fatRatio: profile.goal === "cetogenica" ? 0.70 : 
                profile.goal === "low_carb" ? 0.40 : 0.30,
    };

    // Usar cálculos centralizados
    const targets = calculateNutritionalTargets(physicalData, strategyParams);

    if (targets) {
      dailyCalories = targets.targetCalories;
      dailyProtein = targets.protein;

      // Aplicar mínimos de segurança
      const minCalories = profile.sex === "male" ? 1500 : 1200;
      dailyCalories = Math.max(dailyCalories, minCalories);
    }

    // Determinar modo baseado no objetivo
    if (profile.goal === "emagrecer" || profile.goal === "cutting") {
      mode = "lose";
    } else if (profile.goal === "ganhar_peso") {
      mode = "gain";
    } else {
      mode = "maintain";
    }
  }

  return { dailyCalories, dailyProtein, mode };
}

/**
 * Versão estendida que retorna NutritionalTargets completo
 * Para uso em funções que precisam de todos os macros
 */
export function calculateFullNutritionalTargets(profile: UserProfile): NutritionalTargets | null {
  if (!profile.weight_current || !profile.height || !profile.age || !profile.sex) {
    return null;
  }

  const physicalData: UserPhysicalData = {
    sex: profile.sex ?? null,
    age: profile.age ?? null,
    height: profile.height ?? null,
    weight_current: profile.weight_current ?? null,
    weight_goal: profile.weight_goal ?? null,
    activity_level: profile.activity_level ?? null,
  };

  const goalContext = getGoalContext(profile);

  const strategyParams = {
    calorieModifier: goalContext.calorieAdjustment,
    proteinPerKg: goalContext.proteinMultiplier,
    carbRatio: profile.goal === "cetogenica" ? 0.10 : 
               profile.goal === "low_carb" ? 0.25 : 0.45,
    fatRatio: profile.goal === "cetogenica" ? 0.70 : 
              profile.goal === "low_carb" ? 0.40 : 0.30,
  };

  return calculateNutritionalTargets(physicalData, strategyParams);
}

/**
 * Constrói string detalhada de intolerâncias
 */
export function buildIntolerancesString(profile: UserProfile): string {
  const intolerancesList = profile.intolerances || [];
  
  if (intolerancesList.length === 0 || intolerancesList.includes("nenhuma")) {
    return "nenhuma restrição alimentar";
  }

  return intolerancesList
    .map((i: string) => INTOLERANCE_LABELS[i] || i.toUpperCase())
    .join("\n- ");
}

/**
 * Constrói string de alimentos excluídos (preferências pessoais do usuário)
 */
export function buildExcludedIngredientsString(profile: UserProfile): string {
  const excludedList = profile.excluded_ingredients || [];
  
  if (excludedList.length === 0) {
    return "";
  }

  return excludedList.map((i: string) => i.toUpperCase()).join(", ");
}

/**
 * Gera instruções especiais para Modo Kids
 */
export function buildKidsInstructions(isKidsMode: boolean): string {
  if (!isKidsMode) return "";

  return `
🧒 MODO KIDS:
- Nomes DIVERTIDOS com emojis (ex: "Macarrão Arco-Íris 🌈")
- Máximo 6-8 ingredientes, preparo até 25 min
- Sabores suaves, ingredientes coloridos
- Calorias: 300-500 kcal, complexity: "rapida"`;
}

/**
 * Gera instruções especiais para Modo Emagrecimento
 */
export function buildWeightLossInstructions(isWeightLossMode: boolean, macros: MacroTargets | null): string {
  if (!isWeightLossMode) return "";

  const targetCal = macros ? Math.round(macros.dailyCalories / 3) : 380;
  const targetProt = macros ? Math.round(macros.dailyProtein / 3) : 28;

  return `
🏃 MODO EMAGRECIMENTO:
- Meta por refeição: ~${targetCal} kcal, ~${targetProt}g proteína
- PRIORIZE: vegetais volumosos, proteínas magras, fibras
- EVITE: carboidratos refinados e açúcares
- Métodos: grelhado, assado, vapor`;
}

/**
 * Gera instruções especiais para Modo Ganho de Peso
 */
export function buildWeightGainInstructions(isWeightGainMode: boolean, macros: MacroTargets | null): string {
  if (!isWeightGainMode) return "";

  const targetCal = macros ? Math.round(macros.dailyCalories / 3) : 600;
  const targetProt = macros ? Math.round(macros.dailyProtein / 3) : 38;

  return `
💪 MODO GANHO DE MASSA:
- Meta por refeição: ~${targetCal} kcal, ~${targetProt}g proteína
- PRIORIZE: proteínas de qualidade, carboidratos complexos, gorduras saudáveis
- AUMENTE: porções de proteína e carboidratos`;
}

/**
 * Constrói constraint de categoria selecionada
 */
export function buildCategoryConstraint(categoryContext: CategoryContext | null): string {
  if (!categoryContext?.category || !categoryContext?.subcategory) return "";

  const category = categoryContext.category;
  const subcategory = categoryContext.subcategory;
  const categoryExamples = CATEGORY_EXAMPLES[category]?.[subcategory] || "";
  const mealTypeHint = MEAL_TYPE_HINTS[subcategory] || "";

  return `
🚨 CATEGORIA OBRIGATÓRIA: "${category}" → "${subcategory}"
${mealTypeHint ? `${mealTypeHint}\n` : ""}Exemplos: ${categoryExamples || subcategory}
⛔ NÃO gere receitas de outra categoria. A categoria TEM PRIORIDADE sobre macros.`;
}

/**
 * Gera o status de segurança alimentar
 */
export function buildSafetyStatus(profile: UserProfile): string {
  const parts: string[] = [];
  
  const intolerances = profile.intolerances || [];
  if (intolerances.length > 0 && !intolerances.includes("nenhuma")) {
    intolerances.forEach((i: string) => {
      const label = {
        lactose: "Lactose",
        gluten: "Glúten", 
        acucar: "Açúcar",
        amendoim: "Amendoim",
        frutos_mar: "Frutos do Mar",
        ovo: "Ovo",
        soja: "Soja",
        castanhas: "Castanhas",
      }[i] || i;
      parts.push(label);
    });
  }

  if (profile.dietary_preference === "vegana") {
    parts.push("Produtos Animais");
  } else if (profile.dietary_preference === "vegetariana") {
    parts.push("Carnes");
  }

  if (parts.length === 0) {
    return "✅ Sem restrições alimentares";
  }

  return `✅ Totalmente livre de: ${parts.join(", ")}`;
}

// ============================================
// BUILDERS DE PROMPT PRINCIPAL
// ============================================

export interface RecipePromptOptions {
  profile: UserProfile;
  categoryContext?: CategoryContext | null;
  ingredients?: string | null;
  type?: "automatica" | "com_ingredientes" | "categoria";
  mealType?: string; // para regenerate-meal
  targetCalories?: number; // para regenerate-meal
}

/**
 * Constrói o System Prompt completo para geração de receita (SURPREENDA-ME)
 * 
 * 🍳 CHEF DE COZINHA PROFISSIONAL COM CONHECIMENTO GLOBAL
 * Este prompt mantém a persona de chef para geração de RECEITAS elaboradas
 * com instruções detalhadas de preparo, ingredientes e técnicas culinárias.
 */
export function buildRecipeSystemPrompt(options: RecipePromptOptions): string {
  const { profile, categoryContext } = options;

  const isKidsMode = profile.context === "modo_kids" || profile.kids_mode === true;
  const isWeightLossMode = profile.goal === "emagrecer";
  const isWeightGainMode = profile.goal === "ganhar_peso";
  const hasWeightGoal = isWeightLossMode || isWeightGainMode;

  let macros: MacroTargets | null = null;
  if (hasWeightGoal && profile.weight_current && profile.height && profile.age && profile.sex) {
    macros = calculateMacroTargets(profile);
  }

  // Obter contexto completo do objetivo
  const goalContext = getGoalContext(profile);
  const goalContextInstructions = buildGoalContextInstructions(profile);

  const intolerancesStr = buildIntolerancesString(profile);
  const excludedIngredientsStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsList(profile);
  const categoryConstraint = buildCategoryConstraint(categoryContext || null);
  const kidsInstructions = buildKidsInstructions(isKidsMode);
  const safetyStatus = buildSafetyStatus(profile);

  // Build special modes section com instruções de objetivo
  const specialModes = [kidsInstructions, goalContextInstructions]
    .filter(Boolean)
    .join("\n");

  // Build excluded ingredients constraint
  const excludedConstraint = excludedIngredientsStr
    ? `\n🚫 ALIMENTOS QUE O USUÁRIO NÃO CONSOME (JAMAIS INCLUIR): ${excludedIngredientsStr}`
    : "";

  // Build forbidden ingredients list
  const forbiddenBlock = forbiddenList 
    ? `\n\n🚨🚨🚨 LISTA NEGRA DE INGREDIENTES - NUNCA USE NENHUM DESTES:\n${forbiddenList}\n🚨🚨🚨`
    : "";

  // Build comprehensive safety block
  const safetyBlock = `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║  🚨🚨🚨 TOLERÂNCIA ZERO - SEGURANÇA ALIMENTAR ABSOLUTA 🚨🚨🚨                                ║
║  ESTE USUÁRIO TEM RESTRIÇÕES SÉRIAS - QUALQUER ERRO PODE CAUSAR PROBLEMAS DE SAÚDE!        ║
║  LER COMPLETAMENTE ANTES DE GERAR QUALQUER COISA!                                           ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝

⛔ INTOLERÂNCIAS/ALERGIAS DO USUÁRIO - INGREDIENTES 100% PROIBIDOS:
${intolerancesStr}
${excludedConstraint}
${forbiddenBlock}

🛑 REGRA ABSOLUTA - TOLERÂNCIA ZERO:
1. Se você tiver QUALQUER DÚVIDA sobre um ingrediente → NÃO USE
2. Se não tiver CERTEZA ABSOLUTA que é seguro → NÃO USE
3. Se o ingrediente PODE conter algo proibido → NÃO USE
4. Na dúvida, SEMPRE escolha o ingrediente mais seguro e comum

📋 CHECKLIST OBRIGATÓRIO (executar para CADA ingrediente):
✓ Este ingrediente está na LISTA NEGRA? → Se SIM, não use
✓ Este ingrediente PODE conter algo da lista? → Se TALVEZ, não use  
✓ Existe alternativa mais segura? → Se SIM, use a alternativa
✓ Tenho 100% de certeza que é seguro? → Se NÃO, não use

⚠️ INGREDIENTES TRAIÇOEIROS - PARECEM SEGUROS MAS NÃO SÃO:
- "Queijo vegetal" / "queijo sem lactose" → MUITOS contêm traços de leite → NÃO USE
- "Manteiga ghee" → É derivado de leite = PROIBIDO para lactose → NÃO USE
- "Molho shoyu" → Contém trigo = PROIBIDO para glúten → NÃO USE
- "Maionese" → Contém ovo = PROIBIDO para alergia a ovo → NÃO USE
- "Proteína isolada" / "whey" → Contém leite → NÃO USE
- "Molho inglês" → Contém glúten → NÃO USE
- "Cream cheese" → Contém lactose → NÃO USE
- "Requeijão" → Contém lactose → NÃO USE

🔴 INSTRUÇÃO CRÍTICA - SE HOUVER QUALQUER DÚVIDA:
→ NÃO inclua o ingrediente
→ Substitua por alternativa 100% segura
→ Ou retorne is_safe: false para que o sistema gere outra receita

╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║  🚨 CAMPO OBRIGATÓRIO NO JSON: "is_safe": true OU "is_safe": false                          ║
║  SE is_safe: false → A RECEITA SERÁ DESCARTADA E OUTRA SERÁ GERADA AUTOMATICAMENTE         ║
║  USE is_safe: false SE TIVER QUALQUER DÚVIDA SOBRE QUALQUER INGREDIENTE!                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝`;

  return `Você é o Mestre Chef ReceitAI, um chef de cozinha profissional com conhecimento global em gastronomia, especializado em criar receitas personalizadas, criativas e SEGURAS.

${safetyBlock}
${categoryConstraint}
${specialModes}

REGRAS (ordem de prioridade ESTRITA):
1. 🚨 SEGURANÇA PRIMEIRO: NUNCA inclua ingredientes da LISTA NEGRA - verificar CADA ingrediente
2. CATEGORIA: Se selecionada, a receita DEVE ser dessa categoria
3. DIETA: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
4. OBJETIVO: ${GOAL_LABELS[profile.goal || "manter"]}
5. COMPLEXIDADE: ${isKidsMode ? "rápida (até 20 min)" : COMPLEXITY_LABELS["equilibrada"]}
6. CONTEXTO: ${CONTEXT_LABELS[profile.context || "individual"]}

FORMATO JSON:
{
  "name": "Nome da Receita",
  "description": "Descrição em 1 frase",
  "safety_status": "${safetyStatus}",
  "is_safe": true,
  "safety_check": {
    "verified_against_intolerances": true,
    "verified_against_excluded": true,
    "contains_hidden_allergens": false
  },
  "ingredients": [
    {"item": "ingrediente", "quantity": "100", "unit": "g", "calories": 150, "protein": 10, "carbs": 15, "fat": 5}
  ],
  "instructions": ["Passo 1...", "Passo 2...", "Passo 3..."],
  "prep_time": ${isKidsMode ? 20 : 30},
  "complexity": "${isKidsMode ? "rapida" : "equilibrada"}",
  "servings": ${profile.context === "familia" ? 4 : isKidsMode ? 3 : 2},
  "calories": ${isKidsMode ? 400 : isWeightLossMode ? 380 : isWeightGainMode ? 600 : 450},
  "protein": ${isWeightLossMode ? 30 : isWeightGainMode ? 40 : 25},
  "carbs": ${isWeightLossMode ? 25 : isWeightGainMode ? 60 : 35},
  "fat": ${isWeightLossMode ? 12 : isWeightGainMode ? 22 : 18},
  "chef_tip": "Dica de técnica culinária"
}

📊 IMPORTANTE: Cada ingrediente DEVE incluir seus macros (calories, protein, carbs, fat).
A SOMA dos macros dos ingredientes DEVE ser igual aos totais da receita.

Valores nutricionais são POR PORÇÃO. Responda APENAS com JSON.`
}

/**
 * Constrói o User Prompt para geração de receita
 */
export function buildRecipeUserPrompt(options: RecipePromptOptions): string {
  const { categoryContext, ingredients, type } = options;

  if (categoryContext?.category && categoryContext?.subcategory) {
    const examples = CATEGORY_EXAMPLES[categoryContext.category]?.[categoryContext.subcategory] || "";
    let filtersText = "";
    if (categoryContext.filters) {
      const parts: string[] = [];
      if (categoryContext.filters.culinaria) parts.push(categoryContext.filters.culinaria);
      if (categoryContext.filters.tempo) parts.push(categoryContext.filters.tempo);
      if (categoryContext.filters.metodo) parts.push(categoryContext.filters.metodo);
      if (parts.length > 0) filtersText = ` (${parts.join(", ")})`;
    }

    return `Gere uma receita de "${categoryContext.subcategory}"${filtersText}. Exemplos: ${examples || categoryContext.subcategory}. LEMBRE-SE: verificar a LISTA NEGRA de ingredientes antes de gerar!`;
  }

  if (type === "com_ingredientes" && ingredients) {
    return `Receita usando: ${ingredients}. Pode adicionar ingredientes básicos. ATENÇÃO: verificar se cada ingrediente está na LISTA NEGRA!`;
  }

  return "Gere uma receita saudável e SEGURA para meu perfil. Verifique a LISTA NEGRA de ingredientes!";
}

/**
 * Constrói prompt para geração de UM DIA do plano alimentar
 * 🥗 NUTRICIONISTA PROFISSIONAL - Cardápio simples com alimentos e porções
 * 
 * MODO NUTRICIONISTA: Gera listas de alimentos com gramaturas precisas,
 * SEM receitas elaboradas ou instruções de preparo.
 */
export function buildSingleDayPrompt(
  profile: UserProfile,
  dayIndex: number,
  dayName: string,
  macros: MacroTargets,
  previousRecipes: string[] = []
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const excludedIngredientsStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsListWithDiet(profile);
  const dietaryBlock = buildDietaryRestrictionBlock(profile);
  const isKidsMode = profile.context === "modo_kids";
  const countryConfig = getCountryConfig(profile.country);
  
  const kidsNote = isKidsMode ? " 🧒 MODO KIDS - Alimentos kid-friendly." : "";
  const avoidMeals = previousRecipes.length > 0 
    ? `\n⚠️ NÃO REPETIR: ${previousRecipes.slice(0, 8).join(", ")}` 
    : "";

  const excludedConstraint = excludedIngredientsStr 
    ? `\n❌ Alimentos excluídos pelo usuário: ${excludedIngredientsStr}` : "";
  const forbiddenBlock = forbiddenList 
    ? `\n🚫 Lista negra (NUNCA usar): ${forbiddenList}` : "";

  // Distribuição calórica equilibrada
  const breakfastCal = Math.round(macros.dailyCalories * 0.25);
  const lunchCal = Math.round(macros.dailyCalories * 0.30);
  const snackCal = Math.round(macros.dailyCalories * 0.15);
  const dinnerCal = Math.round(macros.dailyCalories * 0.25);
  const suppCal = Math.round(macros.dailyCalories * 0.05);

  return `🥗 CARDÁPIO NUTRICIONAL - ${dayName}
🌍 ${countryConfig.name} | 🎯 Meta: ${macros.dailyCalories} kcal/dia | ${macros.dailyProtein}g proteína

${dietaryBlock}

⛔ RESTRIÇÕES ALIMENTARES - TOLERÂNCIA ZERO:
${intolerancesStr}${excludedConstraint}${forbiddenBlock}

🔒 REGRA: Se dúvida sobre ingrediente → is_safe: false${kidsNote}${avoidMeals}

📊 PERFIL NUTRICIONAL:
• Dieta: ${DIETARY_LABELS[profile.dietary_preference || "comum"]}
• Objetivo: ${GOAL_LABELS[profile.goal || "manter"]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 GERAR 5 REFEIÇÕES (cardápio de nutricionista):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• cafe_manha (~${breakfastCal} kcal)
  Exemplo: "Café da manhã proteico"
  Alimentos: pão integral, ovos, frutas, iogurte natural

• almoco (~${lunchCal} kcal) 
  Exemplo: "Almoço completo"
  Alimentos: arroz, feijão, proteína (frango/peixe/carne), salada, legumes

• lanche (~${snackCal} kcal)
  Exemplo: "Lanche nutritivo"
  Alimentos: frutas, castanhas, iogurte, sanduíche natural

• jantar (~${dinnerCal} kcal)
  Exemplo: "Jantar leve"
  Alimentos: proteína magra, legumes, salada, carboidrato leve

• ceia (~${suppCal} kcal)
  Exemplo: "Ceia leve"
  Alimentos: chá, frutas, iogurte, leite

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FORMATO DOS INGREDIENTES (OBRIGATÓRIO):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CADA ingrediente DEVE ter:
• item: nome do alimento
• quantity: número da porção
• unit: medida caseira + gramas entre parênteses
• calories: calorias do ingrediente (número)
• protein: gramas de proteína (número)
• carbs: gramas de carboidrato (número)
• fat: gramas de gordura (número)

Exemplos CORRETOS:
✅ {"item": "Arroz integral cozido", "quantity": "4", "unit": "col. sopa (100g)", "calories": 130, "protein": 3, "carbs": 28, "fat": 1}
✅ {"item": "Peito de frango grelhado", "quantity": "1", "unit": "filé médio (120g)", "calories": 165, "protein": 31, "carbs": 0, "fat": 4}
✅ {"item": "Banana prata", "quantity": "1", "unit": "unidade média (90g)", "calories": 80, "protein": 1, "carbs": 21, "fat": 0}
✅ {"item": "Azeite de oliva", "quantity": "1", "unit": "col. sopa (13ml)", "calories": 117, "protein": 0, "carbs": 0, "fat": 13}

📊 IMPORTANTE: A SOMA das calorias/macros dos ingredientes DEVE ser igual aos totais da refeição!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 FORMATO JSON (responda APENAS isto):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "day_index": ${dayIndex},
  "day_name": "${dayName}",
  "meals": [
    {
      "meal_type": "cafe_manha",
      "recipe_name": "Café da manhã equilibrado",
      "is_safe": true,
      "recipe_calories": ${breakfastCal},
      "recipe_protein": 20,
      "recipe_carbs": 45,
      "recipe_fat": 12,
      "recipe_prep_time": 10,
      "recipe_ingredients": [
        {"item": "Pão integral", "quantity": "2", "unit": "fatias (50g)", "calories": 120, "protein": 4, "carbs": 22, "fat": 2},
        {"item": "Ovo cozido", "quantity": "2", "unit": "unidades (100g)", "calories": 155, "protein": 13, "carbs": 1, "fat": 11},
        {"item": "Banana", "quantity": "1", "unit": "unidade média (90g)", "calories": 80, "protein": 1, "carbs": 21, "fat": 0}
      ],
      "recipe_instructions": []
    },
    ... (almoco, lanche, jantar, ceia)
  ]
}

⚠️ REGRAS CRÍTICAS:
1. recipe_instructions SEMPRE vazio: []
2. recipe_name = descrição simples da refeição
3. recipe_ingredients = lista de ALIMENTOS com porções E MACROS individuais
4. A SOMA dos macros dos ingredientes DEVE ser igual ao total da refeição
5. recipe_protein, recipe_carbs, recipe_fat = totais calculados pela soma dos ingredientes
6. Se is_safe: false, a refeição será regenerada

🔴 REGRA DE CONSISTÊNCIA NOME-INGREDIENTES (CRÍTICA):
O nome da refeição DEVE refletir EXATAMENTE os ingredientes listados.
• Se o nome diz "com sementes" → ingredientes DEVEM incluir sementes
• Se o nome diz "com frutas" → ingredientes DEVEM incluir frutas
• Se o nome diz "com mel" → ingredientes DEVEM incluir mel
• NUNCA prometa algo no nome que não está na lista de ingredientes!
Exemplo ERRADO: Nome "Iogurte com sementes" mas só tem iogurte → PROIBIDO
Exemplo CERTO: Nome "Iogurte natural" com ingrediente iogurte → OK

Responda APENAS com JSON válido.`;
}

/**
 * Constrói adaptação cultural baseada no país do usuário
 */
function buildCountryAdaptation(country?: string): string {
  const adaptations: Record<string, string> = {
    BR: `🇧🇷 BRASIL:
   • Base: arroz, feijão, mandioca/aipim, frutas tropicais (mamão, manga, abacaxi)
   • Proteínas: frango, carne bovina, ovos, peixes (tilápia, sardinha)
   • Café: pão francês, tapioca, cuscuz nordestino, frutas da estação
   • Lanches: frutas tropicais, castanha-do-pará, açaí (sem excesso de açúcar)
   • Almoço típico: arroz + feijão + proteína + salada`,
    
    US: `🇺🇸 ESTADOS UNIDOS:
   • Base: quinoa, arroz integral, batata doce, aveia
   • Proteínas: frango, peru, salmão, ovos, tofu
   • Café: oatmeal, smoothie bowls, ovos mexidos, greek yogurt
   • Lanches: trail mix, veggies + hummus, protein bars caseiras
   • Almoço típico: grain bowl + proteína + legumes`,
    
    PT: `🇵🇹 PORTUGAL:
   • Base: arroz, batata, pão integral, leguminosas (grão-de-bico, lentilhas)
   • Proteínas: bacalhau, sardinha, frango, ovos
   • Café: torradas integrais, queijo fresco, fruta
   • Lanches: fruta da época, frutos secos, iogurte
   • Almoço típico: prato completo com sopa + segundo`,
    
    JP: `🇯🇵 JAPÃO:
   • Base: arroz (gohan), soba, udon, vegetais fermentados
   • Proteínas: peixe, tofu, edamame, ovos (tamago)
   • Café: arroz + peixe grelhado + missoshiru + tsukemono
   • Lanches: onigiri, edamame, frutas (maçã, pêra japonesa)
   • Almoço típico: teishoku (prato equilibrado)`,
    
    MX: `🇲🇽 MÉXICO:
   • Base: tortillas de milho, feijão preto, arroz
   • Proteínas: frango, carne, ovos, feijão
   • Café: huevos rancheros, frutas, chilaquiles leves
   • Lanches: jicama com limão, frutas com tajín (sem excesso)
   • Almoço típico: tacos/burritos saudáveis com vegetais`,
    
    IN: `🇮🇳 ÍNDIA:
   • Base: arroz basmati, roti/chapati integral, dal (lentilhas)
   • Proteínas: lentilhas, grão-de-bico, paneer, frango (se não vegetariano)
   • Café: idli, dosa, upma, poha, frutas
   • Lanches: chana, frutas, lassi natural
   • Almoço típico: thali equilibrado`,
    
    ES: `🇪🇸 ESPANHA:
   • Base: arroz, batatas, pão integral, leguminosas
   • Proteínas: peixe, frango, ovos, leguminosas
   • Café: tostadas con tomate, frutas
   • Lanches: frutas, frutos secos, iogurte
   • Almoço típico: plato combinado`,
    
    FR: `🇫🇷 FRANÇA:
   • Base: pão integral, batatas, legumes
   • Proteínas: peixe, frango, ovos, queijos (moderação)
   • Café: croissant integral, frutas, iogurte
   • Lanches: frutas, queijo com nozes
   • Almoço típico: entrée + plat + dessert leve`,
    
    IT: `🇮🇹 ITÁLIA:
   • Base: massa integral, risoto, polenta, pão
   • Proteínas: peixe, frango, leguminosas
   • Café: caffè + brioche integral, frutas
   • Lanches: frutas, nozes, bruschetta leve
   • Almoço típico: primo + secondo + contorno`,
    
    DE: `🇩🇪 ALEMANHA:
   • Base: pão integral (vollkornbrot), batatas, aveia
   • Proteínas: peixe, frango, ovos, queijos
   • Café: Frühstück completo - pão + queijo + embutidos magros + frutas
   • Lanches: frutas, iogurte, nozes
   • Almoço típico: proteína + batatas + vegetais`,
    
    AR: `🇦🇷 ARGENTINA:
   • Base: arroz, batatas, pão, massas
   • Proteínas: carne bovina (cortes magros), frango, ovos
   • Café: medialunas integrais, frutas, iogurte
   • Lanches: frutas, alfajores caseiros saudáveis
   • Almoço típico: asado magro + ensalada`,
    
    CO: `🇨🇴 COLÔMBIA:
   • Base: arroz, arepa, plátano, yuca
   • Proteínas: frango, carne, ovos, feijão
   • Café: arepa + huevos + frutas tropicais
   • Lanches: frutas tropicais (lulo, maracuyá, guanábana)
   • Almoço típico: bandeja paisa equilibrada`,
    
    AU: `🇦🇺 AUSTRÁLIA:
   • Base: aveia, pão integral, quinoa, batata doce
   • Proteínas: peixe, frango, ovos, tofu
   • Café: avocado toast, smoothie bowls, granola
   • Lanches: frutas, nuts, vegemite toast
   • Almoço típico: salad bowl com proteína`
  };
  
  const normalizedCountry = (country || "BR").toUpperCase();
  
  return adaptations[normalizedCountry] || adaptations["BR"] || 
    `🌍 CULINÁRIA INTERNACIONAL:
   • Priorize ingredientes frescos e locais
   • Use proteínas magras e carboidratos complexos
   • Inclua vegetais variados em todas as refeições principais`;
}

/**
 * Constrói prompt para geração de plano alimentar completo (mantido para compatibilidade)
 */
export function buildMealPlanPrompt(
  profile: UserProfile,
  daysCount: number,
  macros: MacroTargets,
  previousRecipes: string[] = []
): string {
  // Agora usa buildSingleDayPrompt internamente, mas mantém interface
  return buildSingleDayPrompt(profile, 0, "Segunda-feira", macros, previousRecipes);
}

/**
 * Constrói prompt para regeneração de refeição individual
 * 🥗 NUTRICIONISTA - Cardápio simples com alimentos e porções
 */
export function buildRegenerateMealPrompt(
  profile: UserProfile,
  mealType: string,
  targetCalories: number,
  ingredients?: string,
  nutritionalContext?: string,
  strategyKey?: string
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const excludedIngredientsStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsListWithDiet(profile);
  const dietaryBlock = buildDietaryRestrictionBlock(profile);
  const countryConfig = getCountryConfig(profile.country);
  const mealLabel = countryConfig.mealTypeLabels[mealType] || MEAL_TYPE_LABELS[mealType] || mealType;
  
  const isKidsMode = profile.context === "modo_kids";
  const kidsNote = isKidsMode ? " 🧒 Alimentos kid-friendly." : "";
  const ingredientsNote = ingredients ? `\n🥘 INCLUIR ESTES ALIMENTOS: ${ingredients}` : "";
  
  const excludedConstraint = excludedIngredientsStr 
    ? `\n❌ Excluídos: ${excludedIngredientsStr}` : "";
  const forbiddenBlock = forbiddenList 
    ? `\n🚫 Proibidos: ${forbiddenList}` : "";

  // Orientações por tipo de refeição
  const mealGuidelines: Record<string, string> = {
    cafe_manha: "Carboidrato + proteína + fruta. Ex: pão, ovos, banana",
    almoco: "Proteína + carboidrato + vegetais + salada",
    lanche: "Leve e nutritivo: frutas, iogurte, castanhas, sanduíche",
    jantar: "Proteína magra + vegetais + carboidrato leve",
    ceia: "Muito leve: chá, fruta, iogurte ou leite"
  };

  // Include nutritional context if available
  const nutritionalBlock = nutritionalContext 
    ? `\n${nutritionalContext}\n` 
    : "";

  // Strategy-specific persona rules
  const strategyRulesText = strategyKey ? getStrategyPromptRules(strategyKey, profile.country === 'US' ? 'en-US' : 'pt-BR', {
    dietaryPreference: profile.dietary_preference || undefined,
    intolerances: profile.intolerances || [],
    goal: profile.goal || undefined, // Passar objetivo do perfil
  }) : '';
  const strategyBlock = strategyRulesText ? `
==========================================================
🎯 ESTRATÉGIA NUTRICIONAL DO USUÁRIO (CRÍTICO):
==========================================================
${strategyRulesText}
` : '';

  return `🥗 NUTRICIONISTA - Gerar ${mealLabel}
🌍 ${countryConfig.name} | 🎯 Meta: ~${targetCalories} kcal${kidsNote}
${nutritionalBlock}
${dietaryBlock}
${strategyBlock}
⛔ RESTRIÇÕES (NUNCA incluir):
${intolerancesStr}${excludedConstraint}${forbiddenBlock}

🔒 Dúvida sobre ingrediente → is_safe: false${ingredientsNote}

📋 ${mealLabel}: ${mealGuidelines[mealType] || "Refeição equilibrada"}

📐 FORMATO DOS INGREDIENTES:
Cada item: {"item": "QUANTIDADE + ALIMENTO", "quantity": "NÚMERO", "unit": "g"}
- O campo "item" DEVE incluir APENAS medida caseira qualitativa (NUNCA números de gramas)
- O campo "quantity" DEVE ser o valor numérico em gramas (ex: "120")
- O campo "unit" DEVE ser sempre "g"

🚫 REGRA ANTI-DUPLICAÇÃO DE GRAMAGEM (CRÍTICO):
- NUNCA inclua números de gramas no campo "item" - a gramagem já aparece no campo "quantity"
- ERRADO: "100g de atum em conserva" ❌
- CERTO: "1 porção de atum em conserva" ✓

🥪 REGRA DE ALIMENTOS-VEÍCULO (wraps, pães, tortillas):
- Wraps, pães e tortillas são "veículos" que PRECISAM de recheio
- SEMPRE apresentar como item COMPOSTO incluindo o recheio principal
- ERRADO: listar "1 wrap integral" separado do recheio ❌
- CERTO: "1 wrap integral recheado com atum e alface" ✓

⚠️ REGRA DE MEDIDAS CASEIRAS (OBRIGATÓRIO):
- LÍQUIDOS (água, sucos, chás, leite, caldos): usar "xícara", "copo", "ml"
- PROTEÍNAS (carnes, peixes, frango): usar "filé", "pedaço", "porção"
- OVOS: usar "unidade" (ex: "2 ovos cozidos")
- GRÃOS/ARROZ/MASSAS: usar "colher de sopa", "colher de servir"
- VEGETAIS SÓLIDOS (brócolis, cenoura, alface): usar "porção", "folhas", "floretes" (NUNCA "xícara")
- FRUTAS: usar "unidade" + tamanho (ex: "1 banana média")
- GORDURAS/ÓLEOS: usar "colher de sopa", "colher de chá"

Exemplos CORRETOS:
• {"item": "2 colheres de sopa de arroz integral", "quantity": "100", "unit": "g"}
• {"item": "1 filé médio de frango grelhado", "quantity": "120", "unit": "g"}
• {"item": "1 porção de brócolis cozido", "quantity": "100", "unit": "g"}
• {"item": "1 xícara de chá verde", "quantity": "200", "unit": "g"}
• {"item": "1 wrap integral recheado com frango e alface", "quantity": "180", "unit": "g"}
• {"item": "1 porção de atum em conserva", "quantity": "100", "unit": "g"}

Exemplos INCORRETOS (NÃO FAZER):
• {"item": "100g de atum em conserva", "quantity": "100", "unit": "g"} ❌ (gramagem duplicada)
• {"item": "1 wrap integral", "quantity": "50", "unit": "g"} ❌ (wrap sem recheio)

🔧 JSON (SEM recipe_instructions):
{
  "recipe_name": "${mealLabel} nutritivo",
  "is_safe": true,
  "recipe_calories": ${targetCalories},
  "recipe_protein": 25,
  "recipe_carbs": 35,
  "recipe_fat": 12,
  "recipe_prep_time": ${isKidsMode ? 10 : 15},
  "recipe_ingredients": [
    {"item": "1 filé médio de frango grelhado", "quantity": "120", "unit": "g"},
    {"item": "2 colheres de sopa de arroz integral", "quantity": "100", "unit": "g"}
  ],
  "recipe_instructions": []
}

Responda APENAS JSON válido.`;
}

// ============================================
// VALIDAÇÃO PÓS-GERAÇÃO (USA GLOBAL SAFETY ENGINE)
// ============================================

// Cache do SafetyDatabase para evitar múltiplas chamadas
let cachedSafetyDatabase: SafetyDatabase | null = null;

/**
 * Carrega o SafetyDatabase do globalSafetyEngine (com cache)
 */
async function getRecipeSafetyDatabase(): Promise<SafetyDatabase> {
  if (!cachedSafetyDatabase) {
    cachedSafetyDatabase = await loadSafetyDatabase();
  }
  return cachedSafetyDatabase;
}

/**
 * Normaliza texto para comparação (remove acentos, lowercase)
 */
function normalizeText(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') {
    return "";
  }
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Valida um ingrediente individual usando o globalSafetyEngine.
 * Esta é a função RECOMENDADA para validação completa.
 */
export async function validateIngredientAsync(
  ingredientName: string,
  profile: UserProfile
): Promise<{ isValid: boolean; matchedForbidden: string | null; reason?: string }> {
  try {
    const database = await getRecipeSafetyDatabase();
    
    const userRestrictions: UserRestrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || null,
      excludedIngredients: profile.excluded_ingredients || [],
    };
    
    const result = gseValidateIngredient(ingredientName, userRestrictions, database);
    
    return {
      isValid: result.isValid,
      matchedForbidden: result.restriction || null,
      reason: result.reason,
    };
  } catch (error) {
    console.error("[recipeConfig] Error in validateIngredientAsync:", error);
    // Em caso de erro, retorna inválido por segurança
    return {
      isValid: false,
      matchedForbidden: null,
      reason: `Erro ao validar ingrediente: ${error}`,
    };
  }
}

/**
 * Valida uma receita individual contra as restrições do usuário.
 * Usa o globalSafetyEngine como fonte única de verdade.
 */
export async function validateRecipeAsync(
  recipe: {
    recipe_name: string;
    recipe_ingredients: Array<{ item: string; quantity?: string; unit?: string }>;
  },
  profile: UserProfile
): Promise<MealValidationResult> {
  const invalidIngredients: string[] = [];
  
  try {
    const database = await getRecipeSafetyDatabase();
    
    const userRestrictions: UserRestrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || null,
      excludedIngredients: profile.excluded_ingredients || [],
    };
    
    for (const ingredient of recipe.recipe_ingredients) {
      const ingredientName = typeof ingredient === 'string' 
        ? ingredient 
        : ((ingredient as any)?.item || (ingredient as any)?.name || '');
      
      if (!ingredientName) continue;
      
      const result = gseValidateIngredient(ingredientName, userRestrictions, database);
      
      if (!result.isValid) {
        invalidIngredients.push(`${ingredientName} (${result.reason})`);
      }
    }
    
    if (invalidIngredients.length > 0) {
      return {
        isValid: false,
        invalidIngredients,
        reason: `Ingredientes proibidos encontrados: ${invalidIngredients.join(", ")}`
      };
    }
    
    return { isValid: true, invalidIngredients: [], reason: "" };
  } catch (error) {
    console.error("[recipeConfig] Error in validateRecipeAsync:", error);
    // Em caso de erro, retorna inválido por segurança
    return {
      isValid: false,
      invalidIngredients: [],
      reason: `Erro ao validar receita: ${error}`
    };
  }
}

/**
 * Valida todo o plano alimentar e retorna um resumo.
 * Usa o globalSafetyEngine como fonte única de verdade.
 */
export async function validateMealPlanAsync(
  mealPlanData: {
    days: Array<{
      day_index: number;
      day_name: string;
      meals: Array<{
        meal_type: string;
        recipe_name: string;
        recipe_ingredients: Array<{ item: string; quantity?: string; unit?: string }>;
      }>;
    }>;
  },
  profile: UserProfile
): Promise<RecipeValidationSummary> {
  const summary: RecipeValidationSummary = {
    totalMeals: 0,
    validMeals: 0,
    invalidMeals: 0,
    issues: []
  };
  
  for (const day of mealPlanData.days) {
    for (const meal of day.meals) {
      summary.totalMeals++;
      
      const validation = await validateRecipeAsync(
        {
          recipe_name: meal.recipe_name,
          recipe_ingredients: meal.recipe_ingredients || []
        },
        profile
      );
      
      if (validation.isValid) {
        summary.validMeals++;
      } else {
        summary.invalidMeals++;
        summary.issues.push({
          dayIndex: day.day_index,
          mealType: meal.meal_type,
          recipeName: meal.recipe_name,
          invalidIngredients: validation.invalidIngredients
        });
      }
    }
  }
  
  return summary;
}

/**
 * Filtra ingredientes proibidos de uma lista (útil para sugestões).
 * Usa o globalSafetyEngine como fonte única de verdade.
 */
export async function filterForbiddenFromListAsync(
  ingredients: string[],
  profile: UserProfile
): Promise<string[]> {
  const database = await getRecipeSafetyDatabase();
  
  const userRestrictions: UserRestrictions = {
    intolerances: profile.intolerances || [],
    dietaryPreference: profile.dietary_preference || null,
    excludedIngredients: profile.excluded_ingredients || [],
  };
  
  return ingredients.filter(ingredient => {
    const result = gseValidateIngredient(ingredient, userRestrictions, database);
    return result.isValid;
  });
}

