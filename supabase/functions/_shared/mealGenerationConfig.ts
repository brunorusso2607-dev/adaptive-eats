/**
 * SHARED MEAL GENERATION CONFIG
 * 
 * Este arquivo contém todas as regras, listas de ingredientes proibidos,
 * funções de validação e configurações usadas por:
 * - generate-ai-meal-plan
 * - regenerate-ai-meal-alternatives
 * - regenerate-meal
 * - suggest-meal-alternatives
 * 
 * QUALQUER CORREÇÃO feita aqui será refletida em TODAS as funções automaticamente.
 * 
 * ARQUITETURA v2.0:
 * Este arquivo agora usa INTERNAMENTE o globalSafetyEngine.ts como fonte única de verdade
 * para validação de ingredientes. As interfaces e funções externas são mantidas para
 * compatibilidade com código existente.
 */

// ============= IMPORTS DO GLOBAL SAFETY ENGINE =============
import {
  loadSafetyDatabase,
  validateIngredient as gseValidateIngredient,
  normalizeUserIntolerances,
  generateRestrictionsPromptContext,
  containsWholeWord,
  type SafetyDatabase,
  type UserRestrictions,
  type ValidationResult as GSEValidationResult,
} from "./globalSafetyEngine.ts";

// ============= INTERFACES (Mantidas para compatibilidade) =============
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
  // Nova estrutura: Comportamental por país
  mealStructure?: {
    // Estrutura típica do almoço/jantar principal (itens separados)
    lunchDinner: {
      structure: string; // Ex: "Proteína + Base + Acompanhamento + Salada"
      components: string[]; // Ex: ["Frango grelhado", "Arroz", "Feijão", "Salada"]
      example: string; // Exemplo completo nativo
    };
    // Tipos de prato único (consolidar em 1 item)
    consolidatedDishes: string[]; // Ex: ["Sopas", "Omeletes", "Wraps"]
    // Exemplos de pratos únicos típicos do país
    oneDishExamples: string[];
    // Café da manhã típico
    breakfast: {
      structure: string;
      examples: string[];
    };
    // Lanches típicos
    snacks: {
      examples: string[];
    };
  };
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

// ============= REGIONAL CONFIGS COM ESTRUTURA COMPORTAMENTAL =============
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
    mealStructure: {
      lunchDinner: {
        structure: "Proteína + Arroz + Feijão + Salada",
        components: ["Frango grelhado", "Arroz branco", "Feijão carioca", "Salada verde"],
        example: "Filé de frango grelhado ao limão, arroz integral, feijão preto, salada de alface com tomate"
      },
      consolidatedDishes: ["Sopas", "Caldos", "Feijoada", "Moqueca", "Omeletes", "Tapiocas recheadas", "Açaí bowl", "Vitaminas"],
      oneDishExamples: [
        "Sopa de legumes com frango",
        "Caldo verde com linguiça",
        "Omelete de queijo com tomate",
        "Tapioca recheada com queijo e presunto",
        "Açaí bowl com granola e banana"
      ],
      breakfast: {
        structure: "Pão/Tapioca + Bebida quente + Fruta",
        examples: [
          "Tapioca com queijo branco, café com leite, mamão",
          "Pão francês com manteiga, café, banana",
          "Ovos mexidos com tomate, suco de laranja, melancia"
        ]
      },
      snacks: {
        examples: [
          "Iogurte com granola e frutas",
          "Maçã com pasta de amendoim",
          "Pão de queijo com suco natural",
          "Banana com chia e canela",
          "Mix de castanhas com frutas secas"
        ]
      }
    }
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
    mealStructure: {
      lunchDinner: {
        structure: "Protein + Starch + Vegetable",
        components: ["Grilled chicken breast", "Mashed potatoes", "Steamed broccoli"],
        example: "Grilled salmon with roasted sweet potatoes and steamed asparagus"
      },
      consolidatedDishes: ["Soups", "Stews", "Salads with protein", "Wraps", "Sandwiches", "Burgers", "Pasta dishes", "Stir-fries", "Smoothie bowls"],
      oneDishExamples: [
        "Chicken noodle soup",
        "Caesar salad with grilled chicken",
        "Turkey and avocado wrap",
        "Beef stew with vegetables",
        "Acai bowl with granola and berries"
      ],
      breakfast: {
        structure: "Protein + Bread/Grain + Fruit",
        examples: [
          "Scrambled eggs with whole wheat toast and berries",
          "Oatmeal with banana and honey",
          "Greek yogurt parfait with granola and strawberries"
        ]
      },
      snacks: {
        examples: [
          "Apple slices with peanut butter",
          "Greek yogurt with berries",
          "Almonds and dried cranberries",
          "Cheese stick with grapes",
          "Hummus with carrot sticks"
        ]
      }
    }
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
    mealStructure: {
      lunchDinner: {
        structure: "Proteína + Arroz/Batata + Legumes",
        components: ["Bacalhau assado", "Batatas a murro", "Legumes salteados"],
        example: "Frango assado com batatas e brócolos salteados com alho"
      },
      consolidatedDishes: ["Sopas", "Caldos", "Caldeiradas", "Açordas", "Omeletes", "Saladas completas"],
      oneDishExamples: [
        "Caldo verde com chouriço",
        "Sopa de legumes",
        "Caldeirada de peixe",
        "Açorda de bacalhau",
        "Salada de atum com grão"
      ],
      breakfast: {
        structure: "Pão + Bebida quente + Fruta/Sumo",
        examples: [
          "Torrada com manteiga, café e sumo de laranja",
          "Cereais com leite e fruta fresca",
          "Pão com queijo, café com leite"
        ]
      },
      snacks: {
        examples: [
          "Iogurte com fruta",
          "Tostas com compota",
          "Maçã com nozes",
          "Queijo fresco com mel",
          "Banana com amêndoas"
        ]
      }
    }
  },
  'MX': {
    language: 'es-MX',
    languageName: 'Español Mexicano',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Huevos, frijoles, tortillas, chilaquiles, fruta, café
COLACIÓN: Frutas, nueces, yogurt, barritas
COMIDA: Proteína + arroz/frijoles + tortillas + ensalada
CENA: Más ligera o antojitos saludables`,
    culturalNotes: 'Ingredientes mexicanos: tortilla, frijoles, aguacate, chile, nopal, pollo, res, limón.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colación Matutina",
      almoco: "Comida",
      lanche_tarde: "Colación Vespertina",
      jantar: "Cena",
      ceia: "Cena Ligera",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    domesticUnits: 'pieza, cucharada, vaso, rebanada, plato mediano, porción',
    mealStructure: {
      lunchDinner: {
        structure: "Proteína + Arroz/Frijoles + Tortilla + Ensalada",
        components: ["Pollo a la plancha", "Arroz rojo", "Frijoles refritos", "Ensalada mixta"],
        example: "Pechuga de pollo a la plancha con arroz rojo, frijoles y ensalada de nopal"
      },
      consolidatedDishes: ["Sopas", "Caldos", "Tacos", "Quesadillas", "Enchiladas", "Burritos", "Pozole", "Ensaladas completas"],
      oneDishExamples: [
        "Sopa de tortilla",
        "Caldo de pollo con verduras",
        "Tacos de pollo con guacamole",
        "Quesadillas de queso con champiñones",
        "Ensalada de atún con aguacate"
      ],
      breakfast: {
        structure: "Huevos + Frijoles/Tortilla + Fruta",
        examples: [
          "Huevos rancheros con frijoles y fruta",
          "Chilaquiles verdes con pollo y café",
          "Huevos revueltos con tortilla y papaya"
        ]
      },
      snacks: {
        examples: [
          "Manzana con crema de cacahuate",
          "Yogurt griego con mango",
          "Jícama con limón y chile",
          "Nueces mixtas con arándanos",
          "Pepino con limón y tajín"
        ]
      }
    }
  },
  'ES': {
    language: 'es-ES',
    languageName: 'Español de España',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Tostada con tomate, café, zumo de naranja
MEDIA MAÑANA: Fruta, yogur, frutos secos
ALMUERZO: Proteína + guarnición + ensalada (estructura clásica española)
CENA: Más ligera o tapas saludables`,
    culturalNotes: 'Ingredientes españoles: aceite de oliva, jamón serrano, pescado, legumbres, tomate, pimientos.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Media Mañana",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
      ceia: "Cena Tardía",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, rebanada, plato mediano, ración',
    mealStructure: {
      lunchDinner: {
        structure: "Proteína + Guarnición + Ensalada",
        components: ["Merluza a la plancha", "Patatas asadas", "Ensalada mixta"],
        example: "Pollo asado con patatas y pimientos, ensalada mediterránea"
      },
      consolidatedDishes: ["Sopas", "Gazpachos", "Cremas", "Tortillas", "Ensaladas completas", "Revueltos", "Guisos"],
      oneDishExamples: [
        "Gazpacho andaluz",
        "Tortilla española",
        "Crema de calabacín",
        "Ensalada de atún con garbanzos",
        "Revuelto de setas con jamón"
      ],
      breakfast: {
        structure: "Tostada + Café/Zumo + Fruta",
        examples: [
          "Tostada con tomate y aceite, café con leche",
          "Tostada con aguacate, zumo de naranja",
          "Cereales con leche y fruta fresca"
        ]
      },
      snacks: {
        examples: [
          "Yogur natural con nueces",
          "Manzana con mantequilla de almendras",
          "Frutos secos variados",
          "Queso fresco con membrillo",
          "Plátano con chocolate negro"
        ]
      }
    }
  },
  'AR': {
    language: 'es-AR',
    languageName: 'Español Argentino',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Medialunas, tostadas, café con leche, mate
COLACIÓN: Frutas, yogur, alfajores saludables
ALMUERZO: Carne/proteína + guarnición (papas, ensalada)
CENA: Similar al almuerzo o más ligera`,
    culturalNotes: 'Ingredientes argentinos: carne de res, chimichurri, empanadas, mate, dulce de leche, yerba mate.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Colación",
      almoco: "Almuerzo",
      lanche_tarde: "Merienda",
      jantar: "Cena",
      ceia: "Cena Tardía",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, rebanada, plato mediano, porción',
    mealStructure: {
      lunchDinner: {
        structure: "Carne/Proteína + Guarnición + Ensalada",
        components: ["Bife de chorizo", "Papas al horno", "Ensalada criolla"],
        example: "Milanesa de pollo con puré de papas y ensalada mixta"
      },
      consolidatedDishes: ["Guisos", "Locro", "Empanadas", "Carbonada", "Ensaladas completas"],
      oneDishExamples: [
        "Guiso de lentejas",
        "Locro argentino",
        "Empanadas de carne",
        "Carbonada criolla",
        "Ensalada de pollo con palta"
      ],
      breakfast: {
        structure: "Medialunas/Tostadas + Café/Mate + Fruta",
        examples: [
          "Tostadas con queso crema, café con leche",
          "Medialunas con café, naranja",
          "Mate con tostadas y mermelada"
        ]
      },
      snacks: {
        examples: [
          "Yogur con frutas",
          "Manzana con manteca de maní",
          "Nueces y almendras",
          "Banana con avena",
          "Queso port salut con membrillo"
        ]
      }
    }
  },
  'CO': {
    language: 'es-CO',
    languageName: 'Español Colombiano',
    measurementSystem: 'metric',
    typicalMeals: `
DESAYUNO: Arepa, huevos, café con leche, fruta tropical
MEDIA MAÑANA: Frutas, yogurt, almojábanas
ALMUERZO: Proteína + arroz + frijoles + plátano + ensalada (bandeja paisa simplificada)
CENA: Más ligera o sopas`,
    culturalNotes: 'Ingredientes colombianos: arepa, plátano, frijoles, aguacate, café, panela, yuca.',
    mealLabels: {
      cafe_manha: "Desayuno",
      lanche_manha: "Media Mañana",
      almoco: "Almuerzo",
      lanche_tarde: "Onces",
      jantar: "Cena",
      ceia: "Cena Tardía",
    },
    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    domesticUnits: 'unidad, cucharada, vaso, tajada, plato mediano, porción',
    mealStructure: {
      lunchDinner: {
        structure: "Proteína + Arroz + Frijoles + Plátano + Ensalada",
        components: ["Pollo asado", "Arroz blanco", "Frijoles rojos", "Plátano maduro", "Ensalada"],
        example: "Pechuga de pollo con arroz, frijoles, tajadas de plátano y ensalada fresca"
      },
      consolidatedDishes: ["Sancochos", "Ajiacos", "Sopas", "Empanadas", "Arepas rellenas"],
      oneDishExamples: [
        "Ajiaco santafereño",
        "Sancocho de gallina",
        "Sopa de lentejas",
        "Arepa rellena con queso y pollo",
        "Ensalada de atún con aguacate"
      ],
      breakfast: {
        structure: "Arepa + Huevos + Bebida + Fruta",
        examples: [
          "Arepa con queso, huevos pericos, café",
          "Huevos revueltos con arepa y jugo de maracuyá",
          "Calentado con café con leche"
        ]
      },
      snacks: {
        examples: [
          "Yogurt con fruta tropical",
          "Mango con limón",
          "Nueces mixtas",
          "Arepa pequeña con queso",
          "Patacones con guacamole"
        ]
      }
    }
  },
};

export const DEFAULT_CONFIG: RegionalConfig = REGIONAL_CONFIGS['BR'];

export function getRegionalConfig(countryCode: string): RegionalConfig {
  return REGIONAL_CONFIGS[countryCode?.toUpperCase()] || DEFAULT_CONFIG;
}

// ============= FUNÇÃO PARA GERAR PROMPT COMPORTAMENTAL POR PAÍS =============
export function getCountryBehavioralPrompt(countryCode: string): string {
  const config = getRegionalConfig(countryCode);
  const structure = config.mealStructure;
  
  if (!structure) {
    // Fallback para países sem estrutura definida - usar BR como base
    return getCountryBehavioralPrompt('BR');
  }
  
  const lang = config.language;
  const isSpanish = lang.startsWith('es');
  const isEnglish = lang.startsWith('en');
  const isPortuguese = lang.startsWith('pt');
  
  // Headers localizados
  const headers = isEnglish 
    ? { composed: "COMPOSED MEAL STRUCTURE", single: "SINGLE DISH TYPES", examples: "TYPICAL EXAMPLES" }
    : isSpanish 
    ? { composed: "ESTRUCTURA DE COMIDA COMPUESTA", single: "TIPOS DE PLATO ÚNICO", examples: "EJEMPLOS TÍPICOS" }
    : { composed: "ESTRUTURA DE REFEIÇÃO COMPOSTA", single: "TIPOS DE PRATO ÚNICO", examples: "EXEMPLOS TÍPICOS" };

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 ${headers.composed} (${config.languageName}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isEnglish ? 'For lunch/dinner, LIST ITEMS SEPARATELY:' : isSpanish ? 'Para almuerzo/cena, LISTAR ÍTEMS SEPARADOS:' : 'Para almoço/jantar, LISTAR ITENS SEPARADOS:'}
📐 ${structure.lunchDinner.structure}
📦 ${structure.lunchDinner.components.join(' + ')}
💡 ${isEnglish ? 'Example:' : isSpanish ? 'Ejemplo:' : 'Exemplo:'} ${structure.lunchDinner.example}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍲 ${headers.single} (${isEnglish ? 'CONSOLIDATE INTO 1 ITEM' : isSpanish ? 'CONSOLIDAR EN 1 ÍTEM' : 'CONSOLIDAR EM 1 ITEM'}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${structure.consolidatedDishes.map(d => `• ${d}`).join('\n')}

${headers.examples}:
${structure.oneDishExamples.map(e => `  ✅ "${e}"`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☕ ${isEnglish ? 'BREAKFAST' : isSpanish ? 'DESAYUNO' : 'CAFÉ DA MANHÃ'}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ${structure.breakfast.structure}
${structure.breakfast.examples.map(e => `  • ${e}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍎 ${isEnglish ? 'SNACKS' : isSpanish ? 'COLACIONES' : 'LANCHES'}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${structure.snacks.examples.map(e => `  • ${e}`).join('\n')}
`;
}

// ============= FORBIDDEN INGREDIENTS (DEPRECATED - USAR globalSafetyEngine) =============
// Esta lista é mantida apenas para compatibilidade retroativa.
// O globalSafetyEngine.ts usa o banco de dados como fonte única de verdade.
// @deprecated Use loadSafetyDatabase() do globalSafetyEngine.ts
export const FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  // Listas vazias - os dados agora vêm do banco via globalSafetyEngine
  // Mantido apenas para não quebrar imports existentes
};

// Ingredientes de origem animal (para vegano/vegetariano) - ainda usados para fallback local
export const ANIMAL_INGREDIENTS = ['carne', 'frango', 'porco', 'boi', 'peru', 'pato', 'bacon', 'presunto', 'salsicha', 'linguica', 'mortadela', 'salame', 'peito de frango', 'file', 'costela', 'picanha', 'alcatra', 'patinho', 'acém', 'maminha', 'coxa', 'sobrecoxa', 'asa', 'meat', 'chicken', 'pork', 'beef', 'turkey', 'duck', 'ham', 'sausage', 'viande', 'poulet', 'porc', 'boeuf', 'dinde', 'jambon', 'saucisse', 'carne', 'pollo', 'maiale', 'manzo', 'tacchino', 'prosciutto', 'fleisch', 'hähnchen', 'schwein', 'rind', 'pute', 'schinken', 'wurst', 'cerdo', 'res', 'pavo', 'jamon', 'salchicha'];

export const DAIRY_AND_EGGS = ['leite', 'queijo', 'iogurte', 'ovo', 'ovos', 'manteiga', 'creme de leite', 'requeijao', 'milk', 'cheese', 'yogurt', 'egg', 'eggs', 'butter', 'cream', 'lait', 'fromage', 'yaourt', 'oeuf', 'oeufs', 'beurre', 'creme', 'latte', 'formaggio', 'uovo', 'uova', 'burro', 'panna', 'milch', 'käse', 'joghurt', 'eier', 'sahne', 'leche', 'queso', 'yogur', 'huevo', 'huevos', 'mantequilla', 'crema', 'mel', 'honey', 'miel', 'honig'];  // Removed 'ei' (too generic, causes false positives like "feijao")

export const FISH_INGREDIENTS = ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'fish', 'salmon', 'tuna', 'cod', 'sardine', 'poisson', 'saumon', 'thon', 'pesce', 'salmone', 'tonno', 'fisch', 'lachs', 'thunfisch', 'pescado', 'atun'];

// ============= VALIDATION FUNCTIONS (usando globalSafetyEngine internamente) =============
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Cache local do SafetyDatabase para evitar múltiplas chamadas
let cachedSafetyDatabase: SafetyDatabase | null = null;

/**
 * Carrega o SafetyDatabase do globalSafetyEngine (com cache)
 */
async function getSafetyDatabase(): Promise<SafetyDatabase> {
  if (!cachedSafetyDatabase) {
    cachedSafetyDatabase = await loadSafetyDatabase();
  }
  return cachedSafetyDatabase;
}

/**
 * Valida um alimento usando o globalSafetyEngine.
 * Mantém assinatura original para compatibilidade com código existente.
 * 
 * @deprecated Os parâmetros dbMappings e dbSafeKeywords são ignorados.
 *             O globalSafetyEngine carrega os dados diretamente do banco.
 */
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
  
  // 2. Verificar preferência dietética (usa listas locais para performance síncrona)
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
  
  // 3. Verificar intolerâncias usando os mapeamentos do banco de dados
  if (restrictions.intolerances.length > 0 && dbMappings.length > 0) {
    // Mapeamento de keys do onboarding para keys do banco de dados
    const KEY_NORMALIZATION: Record<string, string> = {
      'amendoim': 'peanut',
      'ovos': 'egg',
      'soja': 'soy',
      'acucar_diabetes': 'sugar',
      'acucar': 'sugar',
      'castanhas': 'tree_nuts',
      'frutos_do_mar': 'seafood',
      'peixe': 'fish',
      'histamina': 'histamine',
      'salicilatos': 'salicylate',
      'sulfitos': 'sulfite',
      'milho': 'corn',
      'frutose': 'fructose',
      'niquel': 'nickel',
      // Keys que já estão corretas (inglês)
      'lactose': 'lactose',
      'gluten': 'gluten',
      'peanut': 'peanut',
      'seafood': 'seafood',
      'fish': 'fish',
      'egg': 'egg',
      'eggs': 'egg',
      'soy': 'soy',
      'sugar': 'sugar',
      'tree_nuts': 'tree_nuts',
      'nuts': 'tree_nuts',
      'histamine': 'histamine',
      'salicylate': 'salicylate',
      'nickel': 'nickel',
      'fodmap': 'fodmap',
      'sulfite': 'sulfite',
      'fructose': 'fructose',
      'corn': 'corn',
      'caffeine': 'caffeine',
      'sorbitol': 'sorbitol',
    };
    
    // Normalizar as intolerâncias do usuário
    const normalizedIntolerances = restrictions.intolerances
      .filter(i => i && i !== 'none' && i !== 'nenhuma')
      .map(i => KEY_NORMALIZATION[i.toLowerCase()] || i.toLowerCase());
    
    // Verificar se há safe keywords que isentam este alimento
    for (const intolerance of normalizedIntolerances) {
      const safeWords = dbSafeKeywords
        .filter(sk => sk.intolerance_key === intolerance)
        .map(sk => normalizeText(sk.keyword));
      
      let isSafe = false;
      for (const safeWord of safeWords) {
        if (normalizedFood.includes(safeWord)) {
          isSafe = true;
          break;
        }
      }
      
      if (isSafe) continue;
      
      // Verificar se o alimento contém ingredientes proibidos
      const forbiddenIngredients = dbMappings
        .filter(m => m.intolerance_key === intolerance)
        .map(m => normalizeText(m.ingredient));
      
      for (const forbidden of forbiddenIngredients) {
        // Evitar falsos positivos: verificar se é palavra completa
        // "maca" (maçã) não deve matchear "macaron" ou "macadamia"
        const isWholeWordMatch = containsWholeWord(normalizedFood, forbidden);
        if (isWholeWordMatch) {
          return {
            isValid: false,
            reason: `Contém ${forbidden} (intolerância: ${intolerance})`,
            restriction: `intolerance_${intolerance}`,
          };
        }
      }
    }
  }
  
  return { isValid: true };
}

/**
 * Versão ASSÍNCRONA de validateFood que usa o globalSafetyEngine completo.
 * Use esta função quando possível para validação mais precisa.
 */
export async function validateFoodAsync(
  food: string,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  }
): Promise<ValidationResult> {
  try {
    const database = await getSafetyDatabase();
    
    const userRestrictions: UserRestrictions = {
      intolerances: restrictions.intolerances,
      dietaryPreference: restrictions.dietaryPreference || null,
      excludedIngredients: restrictions.excludedIngredients || [],
    };
    
    const result = gseValidateIngredient(food, userRestrictions, database);
    
    return {
      isValid: result.isValid,
      reason: result.reason,
      restriction: result.restriction,
    };
  } catch (error) {
    console.error("[mealGenerationConfig] Error in validateFoodAsync:", error);
    // Fallback para validação síncrona
    return validateFood(food, restrictions, [], []);
  }
}

// ============= FETCH INTOLERANCE MAPPINGS (Compatibilidade) =============
/**
 * Busca mapeamentos de intolerância do banco de dados.
 * @deprecated Use loadSafetyDatabase() do globalSafetyEngine.ts diretamente.
 */
// deno-lint-ignore no-explicit-any
export async function fetchIntoleranceMappings(supabaseClient: any): Promise<{
  mappings: IntoleranceMapping[];
  safeKeywords: SafeKeyword[];
}> {
  // Redireciona para o globalSafetyEngine
  try {
    const database = await getSafetyDatabase();
    
    // Converter de Map para arrays no formato antigo
    const mappings: IntoleranceMapping[] = [];
    const safeKeywords: SafeKeyword[] = [];
    
    for (const [intolerance_key, ingredients] of database.intoleranceMappings) {
      for (const ingredient of ingredients) {
        mappings.push({ ingredient, intolerance_key });
      }
    }
    
    for (const [intolerance_key, keywords] of database.safeKeywords) {
      for (const keyword of keywords) {
        safeKeywords.push({ keyword, intolerance_key });
      }
    }
    
    return { mappings, safeKeywords };
  } catch (error) {
    console.error("[mealGenerationConfig] Error fetching from globalSafetyEngine, falling back:", error);
    // Fallback original
    const [mappingsResult, safeKeywordsResult] = await Promise.all([
      supabaseClient.from('intolerance_mappings').select('ingredient, intolerance_key'),
      supabaseClient.from('intolerance_safe_keywords').select('keyword, intolerance_key'),
    ]);
  
    return {
      mappings: mappingsResult.data || [],
      safeKeywords: safeKeywordsResult.data || [],
    };
  }
}

/**
 * Gera contexto de restrições para prompts usando globalSafetyEngine.
 * Wrapper para compatibilidade com código existente.
 */
export async function generateRestrictionsContextAsync(
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  language: string = 'pt'
): Promise<string> {
  try {
    const database = await getSafetyDatabase();
    
    const userRestrictions: UserRestrictions = {
      intolerances: restrictions.intolerances,
      dietaryPreference: restrictions.dietaryPreference || null,
      excludedIngredients: restrictions.excludedIngredients || [],
    };
    
    return generateRestrictionsPromptContext(userRestrictions, database, language);
  } catch (error) {
    console.error("[mealGenerationConfig] Error generating restrictions context:", error);
    return "";
  }
}

// ============= RESTRICTION TEXT BUILDER (17 INTOLERANCES) =============
// Mantido para compatibilidade - considera usar generateRestrictionsContextAsync
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

// ============= PROMPT RULES (VERSÃO HUMANIZADA) =============
export function getMealPromptRules(language: string = 'pt-BR'): string {
  const isPortuguese = language.startsWith('pt');
  const isSpanish = language.startsWith('es');

  if (isPortuguese) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FORMATO DOS ALIMENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTRUTURA: {"name": "descrição humanizada", "grams": número}

✅ EXEMPLOS CORRETOS:
• {"name": "Filé de frango grelhado com ervas", "grams": 150}
• {"name": "Arroz integral", "grams": 120}
• {"name": "Salada verde com tomate e pepino", "grams": 100}
• {"name": "1 banana média (sobremesa)", "grams": 120}
• {"name": "1 xícara de chá de camomila", "grams": 200}

❌ NUNCA FAZER:
• {"name": "150g de frango", "grams": 150} → gramagem duplicada no nome
• {"name": "Mix de frutas", "grams": 200} → quais frutas? Seja específico!
• {"name": "1 limão", "grams": 50} → para quê? Dê contexto!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 REGRAS ESSENCIAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. MEDIDAS CASEIRAS:
   • Líquidos: "xícara", "copo", "ml"
   • Carnes: "filé", "porção", "pedaço"
   • Grãos: "colher de sopa", "porção" (NÃO "xícara")
   • Frutas: "unidade" + tamanho ("1 maçã média")

2. AGRUPAMENTO:
   • Ingredientes preparados juntos = UM ITEM
   • Ex: "Omelete de claras com espinafre" (não separar claras + espinafre)

3. COERÊNCIA TÍTULO-INGREDIENTES:
   • O título DEVE refletir o que está em foods
   • Se diz "Wrap" → precisa ter wrap nos ingredientes
   • Se diz "Omelete" → precisa ter ovos nos ingredientes

4. ORDEM DOS INGREDIENTES:
   • Prato principal → Acompanhamentos → Frutas → Bebidas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌙 REGRAS POR TIPO DE REFEIÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CEIA (noturna):
✅ Permitido: chás, iogurte, frutas leves, leite morno
❌ Proibido: ovos, carnes, fritura, refeições pesadas

LANCHES:
✅ Opções práticas: castanhas, frutas, iogurte, sanduíche leve

REFEIÇÕES PRINCIPAIS (café, almoço, jantar):
✅ Equilibradas: proteína + carboidrato + vegetais`;
  }

  if (isSpanish) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FORMATO DE ALIMENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTRUCTURA: {"name": "descripción humanizada", "grams": número}

✅ EJEMPLOS CORRECTOS:
• {"name": "Filete de pollo a la plancha con hierbas", "grams": 150}
• {"name": "Arroz integral", "grams": 120}
• {"name": "1 plátano mediano (postre)", "grams": 120}

❌ NUNCA HACER:
• {"name": "150g de pollo", "grams": 150} → gramaje duplicado
• {"name": "Mix de frutas", "grams": 200} → ¿cuáles frutas?`;
  }

  // English default
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FOOD FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRUCTURE: {"name": "humanized description", "grams": number}

✅ CORRECT EXAMPLES:
• {"name": "Grilled chicken breast with herbs", "grams": 150}
• {"name": "Brown rice", "grams": 120}
• {"name": "1 medium banana (dessert)", "grams": 120}

❌ NEVER DO:
• {"name": "150g of chicken", "grams": 150} → duplicate grams
• {"name": "Fruit mix", "grams": 200} → which fruits?`;
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

// ============= DIETARY PROFILE POOL - 450 REFEIÇÕES POR PERFIL ALIMENTAR =============
// Pool completo de refeições por preferência dietética
// 5 perfis × 6 tipos de refeição × 15 opções = 450 refeições únicas

export const DIETARY_PROFILE_POOL: Record<string, Record<string, string[]>> = {
  // ============= COMUM / ONÍVORA (90 itens) =============
  'comum': {
    'cafe_manha': [
      'Pão francês com manteiga, queijo minas e café com leite',
      'Tapioca recheada com frango desfiado e queijo coalho',
      'Cuscuz nordestino com ovo mexido, queijo coalho e manteiga',
      'Omelete de 2 ovos com queijo, presunto e tomate',
      'Panqueca americana com mel, banana e manteiga',
      'Vitamina de mamão com aveia, leite e mel',
      'Pão de fermentação natural com ricota, tomate e manjericão',
      'Mingau de aveia com leite integral, canela e banana',
      'Torrada francesa com cream cheese e geleia de morango',
      'Wrap integral com ovo mexido, queijo e bacon',
      'Crepioca com frango, requeijão e orégano',
      'Bowl de açaí com granola, banana e pasta de amendoim',
      'Pão sírio com labne, pepino, tomate e azeite',
      'Sanduíche natural de frango, cream cheese e cenoura',
      'Waffle belga com frutas vermelhas e chantilly',
    ],
    'lanche_manha': [
      'Banana prata com aveia',
      'Maçã verde com casca',
      'Mix de castanhas variadas (30g)',
      'Iogurte natural com mel',
      'Queijo branco (50g) com torradas',
      'Mamão papaia com granola',
      'Sanduíche de peito de peru no pão integral',
      'Uvas vermelhas (1 xícara)',
      'Tangerina ponkan (2 unidades)',
      'Vitamina de frutas vermelhas',
      'Barra de cereais integral',
      'Biscoito integral com queijo cottage',
      'Damasco seco (6 unidades)',
      'Smoothie de morango com iogurte',
      'Pera williams inteira',
    ],
    'almoco': [
      'Filé de frango grelhado com arroz, feijão preto, salada verde e farofa',
      'Bife de contrafilé com batata inglesa, brócolis e cenoura cozida',
      'Peixe grelhado (tilápia) com arroz integral, purê de abóbora e espinafre',
      'Costela bovina assada com mandioca, couve refogada e vinagrete',
      'Sobrecoxa de frango ao molho com arroz branco, feijão e salada',
      'Carne de panela com batata, cenoura, vagem e arroz',
      'Salmão grelhado com quinoa, aspargos e tomate cereja',
      'Feijoada completa com arroz, couve, laranja e farofa',
      'Macarrão à bolonhesa com carne moída e salada caesar',
      'Frango xadrez com legumes coloridos e arroz branco',
      'Medalhão de filé mignon com purê de batata-doce e legumes',
      'Moqueca de peixe com arroz branco, pirão e salada',
      'Strogonoff de frango com arroz, batata palha e salada',
      'Lasanha de carne com molho branco e salada verde',
      'Picanha grelhada com arroz à grega, farofa e salada',
    ],
    'lanche_tarde': [
      'Pão de queijo mineiro (3 unidades)',
      'Vitamina de abacate com leite e mel',
      'Sanduíche natural de atum com ricota',
      'Bolo de cenoura com cobertura de chocolate (fatia)',
      'Iogurte grego com granola e mel',
      'Tapioca com coco ralado e leite condensado',
      'Pipoca natural com manteiga (2 xícaras)',
      'Queijo minas com goiabada cascão',
      'Suco de laranja natural com torrada',
      'Wrap de frango com cream cheese',
      'Biscoito de polvilho (6 unidades)',
      'Vitamina de banana com aveia',
      'Pão integral com pasta de amendoim',
      'Salada de frutas com iogurte',
      'Mingau de tapioca com leite de coco',
    ],
    'jantar': [
      'Omelete de queijo e presunto com salada verde e arroz',
      'Sopa de legumes com carne moída e macarrão',
      'Risoto de frango com cogumelos e parmesão',
      'Hambúrguer caseiro com salada completa e batata rústica',
      'Pizza caseira de mussarela com tomate e manjericão',
      'Espaguete à carbonara com bacon e parmesão',
      'Filé de peixe com purê de mandioquinha e legumes',
      'Caldo verde com linguiça calabresa, couve e batata',
      'Panqueca de carne moída com molho branco',
      'Frango grelhado com batata-doce assada e salada',
      'Lasanha de frango com molho bechamel',
      'Wrap de carne com queijo, alface e tomate',
      'Quiche de alho-poró com bacon e queijo',
      'Sanduíche quente de frango com queijo derretido',
      'Arroz de carreteiro com carne seca e salada',
    ],
    'ceia': [
      'Leite morno com mel e canela',
      'Iogurte natural com mel',
      'Chá de camomila com biscoito integral',
      'Vitamina de maçã com aveia',
      'Queijo branco com geleia',
      'Mingau de aveia leve',
      'Frutas picadas com iogurte',
      'Pudim de leite condensado (pequeno)',
      'Chá de ervas com torrada',
      'Banana assada com canela',
      'Leite com achocolatado light',
      'Gelatina com frutas',
      'Pão integral com requeijão',
      'Vitamina de mamão',
      'Chá verde com biscoito de aveia',
    ],
  },

  // ============= VEGETARIANA (90 itens) =============
  'vegetariana': {
    'cafe_manha': [
      'Omelete de queijo com espinafre, cogumelos e tomate',
      'Panqueca de aveia com banana, mel e pasta de amendoim',
      'Vitamina verde (couve, abacaxi, gengibre, limão e água de coco)',
      'Pão integral com cream cheese, pepino, tomate e rúcula',
      'Mingau de quinoa com leite, canela, frutas e nozes',
      'Tapioca com queijo coalho, tomate seco e manjericão',
      'Bowl de iogurte grego com granola, frutas e mel',
      'Crepioca de grão-de-bico com ricota e espinafre',
      'Torrada integral com homus, abacate e ovo poché',
      'Wrap de ovo mexido com queijo, tomate e alface',
      'Smoothie bowl de açaí com granola e frutas',
      'Pão sírio com labne, pepino, tomate e zaatar',
      'Waffle integral com iogurte, frutas vermelhas e mel',
      'Sanduíche de queijo branco, cenoura ralada e alface',
      'Overnight oats com leite, chia, banana e canela',
    ],
    'lanche_manha': [
      'Maçã com pasta de amêndoas (1 colher)',
      'Mix de castanhas e frutas secas (30g)',
      'Iogurte natural com mel e granola',
      'Cenoura baby com homus de grão-de-bico',
      'Mamão com semente de linhaça',
      'Uvas com queijo branco em cubos',
      'Smoothie de frutas vermelhas',
      'Pepino com pasta de tahine',
      'Biscoito integral com queijo cottage',
      'Pera com amêndoas (15g)',
      'Vitamina de banana com leite',
      'Tomate cereja com queijo mussarela de búfala',
      'Damasco seco com nozes',
      'Kiwi gold inteiro',
      'Edamame cozido com sal',
    ],
    'almoco': [
      'Hambúrguer de grão-de-bico com salada completa, batata-doce e molho tahine',
      'Lasanha de berinjela com ricota, espinafre, molho de tomate e queijo',
      'Risoto de cogumelos frescos com parmesão, vinho branco e rúcula',
      'Escondidinho de palmito com purê de batata-doce e queijo gratinado',
      'Strogonoff de cogumelos com arroz integral, batata palha e salada',
      'Quiche de alho-poró com queijo gruyère e salada verde',
      'Feijoada vegetariana (feijão preto, legumes) com arroz, couve e laranja',
      'Curry de grão-de-bico com leite de coco, arroz basmati e legumes',
      'Berinjela à parmegiana com macarrão integral e salada',
      'Wrap de falafel com homus, tahine, salada e batata frita',
      'Moqueca de palmito com dendê, leite de coco, arroz e pirão',
      'Nhoque de batata com molho de tomate fresco e manjericão',
      'Bowl mediterrâneo: quinoa, grão-de-bico, homus, pepino, tomate e feta',
      'Panqueca de espinafre recheada com ricota e molho branco',
      'Arroz integral com lentilha, ovo cozido, cenoura e salada',
    ],
    'lanche_tarde': [
      'Tapioca com queijo branco e coco ralado',
      'Vitamina de abacate com leite, cacau e mel',
      'Pão de queijo (3 unidades)',
      'Sanduíche natural de ricota com cenoura ralada',
      'Iogurte grego com frutas e granola',
      'Bolo de cenoura integral (fatia)',
      'Wrap de homus com vegetais',
      'Queijo minas com goiabada',
      'Smoothie de manga com iogurte',
      'Biscoito de aveia com pasta de amendoim',
      'Salada de frutas com creme de iogurte',
      'Panqueca simples com geleia',
      'Vitamina de morango com leite',
      'Pipoca com azeite e ervas (2 xícaras)',
      'Torrada com queijo cottage e tomate',
    ],
    'jantar': [
      'Omelete caprese (ovo, tomate, mussarela, manjericão) com salada verde',
      'Sopa cremosa de lentilha com cenoura, aipo e coentro',
      'Pizza caseira vegetariana (mussarela, tomate, rúcula, azeitonas)',
      'Macarrão integral ao pesto de manjericão com queijo parmesão',
      'Risoto de beterraba com queijo de cabra e nozes',
      'Wrap integral de ovo mexido com queijo, abacate e tomate',
      'Hambúrguer de cogumelos com salada e batata assada',
      'Espaguete de abobrinha com molho de tomate e ricota',
      'Caldo verde vegetariano com couve, batata e temperos',
      'Quiche de espinafre com queijo gruyère',
      'Berinjela recheada com quinoa, tomate e queijo gratinado',
      'Sanduíche quente de queijo com tomate e manjericão',
      'Sopa de abóbora com gengibre e leite de coco',
      'Panqueca de grão-de-bico recheada com legumes',
      'Lasanha de abobrinha com ricota e molho de tomate',
    ],
    'ceia': [
      'Leite morno com mel e canela',
      'Iogurte natural com frutas vermelhas',
      'Chá de camomila com biscoito integral',
      'Vitamina de maçã com aveia',
      'Queijo cottage com mel',
      'Mingau de chia com leite de amêndoas',
      'Pudim de tapioca com leite de coco',
      'Banana assada com canela',
      'Chá de ervas com torrada integral',
      'Leite dourado (golden milk) com cúrcuma',
      'Gelatina com frutas picadas',
      'Vitamina de mamão light',
      'Queijo branco com geleia',
      'Chá verde com biscoito de aveia',
      'Kefir natural com mel',
    ],
  },

  // ============= VEGANA (90 itens) =============
  'vegana': {
    'cafe_manha': [
      'Panqueca de banana com aveia, canela e pasta de amendoim',
      'Smoothie bowl de açaí com granola vegana, frutas e coco ralado',
      'Vitamina verde (couve, banana, manga, gengibre e leite de coco)',
      'Pão integral com homus, abacate, tomate e rúcula',
      'Mingau de aveia com leite de amêndoas, canela, banana e nozes',
      'Tapioca com queijo vegetal de castanha e tomate seco',
      'Overnight oats com leite de coco, chia, frutas e mel vegano',
      'Crepioca de grão-de-bico com espinafre refogado e tomate',
      'Torrada com pasta de grão-de-bico, pepino e gergelim',
      'Wrap de tofu mexido com cogumelos, pimentão e cúrcuma',
      'Bowl de quinoa com leite vegetal, frutas e sementes',
      'Pão sírio com babaganoush, pepino e tomate',
      'Vitamina de morango com leite de aveia e aveia em flocos',
      'Panqueca de grão-de-bico com banana caramelizada',
      'Sanduíche de patê de amendoim com banana e canela',
    ],
    'lanche_manha': [
      'Maçã com pasta de amêndoas',
      'Mix de castanhas variadas e frutas secas (30g)',
      'Vitamina de frutas com leite vegetal',
      'Cenoura baby com homus de beterraba',
      'Mamão com semente de chia',
      'Uvas com castanhas de caju',
      'Smoothie de banana com leite de coco',
      'Pepino com pasta de tahine',
      'Biscoito integral vegano',
      'Pera com amêndoas',
      'Damasco seco com nozes',
      'Kiwi inteiro',
      'Edamame cozido',
      'Chips de banana desidratada',
      'Vitamina de manga com leite de aveia',
    ],
    'almoco': [
      'Hambúrguer de feijão preto com salada completa, batata-doce e molho de tahine',
      'Lasanha de berinjela com ricota de castanha, espinafre e molho de tomate',
      'Risoto de cogumelos com vinho branco, azeite e castanhas',
      'Curry de grão-de-bico com leite de coco, legumes e arroz basmati',
      'Feijoada vegana (feijão, legumes defumados) com arroz, couve e laranja',
      'Estrogonofe de cogumelos com arroz integral e batata palha',
      'Bowl de quinoa com grão-de-bico assado, homus, vegetais e tahine',
      'Moqueca de palmito com dendê, leite de coco e arroz',
      'Wrap de falafel com homus, tahine, salada e batata frita',
      'Macarrão integral ao pesto de manjericão com castanhas',
      'Escondidinho de jaca com purê de mandioquinha',
      'Nhoque de batata-doce com molho de tomate e manjericão',
      'Arroz integral com lentilha, tofu grelhado e legumes refogados',
      'Panqueca de espinafre com recheio de cogumelos',
      'Bobó de cogumelos com arroz branco e farofa',
    ],
    'lanche_tarde': [
      'Tapioca com coco ralado e doce de leite vegano',
      'Vitamina de abacate com leite de coco e cacau',
      'Pão vegano com pasta de amendoim e banana',
      'Sanduíche de homus com cenoura ralada',
      'Iogurte de coco com granola e frutas',
      'Bolo de banana vegano (fatia)',
      'Wrap de pasta de grão-de-bico com vegetais',
      'Smoothie de manga com leite de amêndoas',
      'Biscoito de aveia com pasta de castanha',
      'Salada de frutas com creme de coco',
      'Panqueca simples com geleia de frutas',
      'Vitamina de morango com leite de arroz',
      'Pipoca com azeite e nutritional yeast (2 xícaras)',
      'Torrada com patê de berinjela',
      'Mix de nuts e frutas desidratadas',
    ],
    'jantar': [
      'Tofu mexido com cogumelos, espinafre, cúrcuma e torradas',
      'Sopa cremosa de lentilha vermelha com leite de coco e gengibre',
      'Pizza vegana (massa integral, molho de tomate, vegetais, queijo vegetal)',
      'Macarrão integral ao molho de tomate com manjericão fresco',
      'Risoto de beterraba com queijo vegetal de castanha',
      'Wrap de tofu grelhado com abacate, alface e tomate',
      'Hambúrguer de cogumelos com salada e batata assada',
      'Espaguete de abobrinha com molho pesto vegano',
      'Caldo verde com couve, batata e tempeh defumado',
      'Berinjela recheada com quinoa, tomate e castanhas',
      'Quiche vegana de espinafre com base de grão-de-bico',
      'Sopa de abóbora com gengibre, leite de coco e sementes',
      'Panqueca de grão-de-bico recheada com legumes refogados',
      'Lasanha de abobrinha com ricota vegetal e tomate',
      'Stir-fry de tofu com legumes e molho de gergelim',
    ],
    'ceia': [
      'Leite de amêndoas morno com canela',
      'Iogurte de coco com frutas vermelhas',
      'Chá de camomila com biscoito vegano',
      'Vitamina de maçã com leite vegetal',
      'Mingau de chia com leite de coco',
      'Pudim de tapioca com leite de coco',
      'Banana assada com canela e mel vegano',
      'Chá de ervas com torrada integral',
      'Leite dourado com cúrcuma e leite vegetal',
      'Gelatina vegana de ágar-ágar com frutas',
      'Vitamina de mamão com leite de aveia',
      'Chá verde com biscoito de aveia',
      'Mousse de abacate com cacau',
      'Vitamina de banana com leite de amêndoas',
      'Shot de gengibre com limão',
    ],
  },

  // ============= LOW CARB (90 itens) =============
  'low_carb': {
    'cafe_manha': [
      'Omelete de 3 ovos com queijo, espinafre e cogumelos',
      'Ovos mexidos com bacon, abacate e tomate',
      'Salmão defumado com cream cheese e pepino',
      'Panqueca low carb de farinha de amêndoas com manteiga',
      'Vitamina de abacate com cacau, coco e adoçante',
      'Iogurte grego integral com nozes e frutas vermelhas',
      'Torrada low carb com pasta de amendoim e morangos',
      'Wrap de alface com ovos mexidos, queijo e bacon',
      'Queijo cottage com abacate, tomate e azeite',
      'Tofu mexido com cúrcuma, pimentão e cebola',
      'Crepioca de ovo com queijo e presunto',
      'Omelete caprese com mussarela, tomate e manjericão',
      'Vitamina proteica com whey, abacate e leite de coco',
      'Pão de queijo low carb (3 unidades pequenas)',
      'Ovos cozidos com abacate amassado e sal rosa',
    ],
    'lanche_manha': [
      'Castanhas mistas (20g)',
      'Queijo branco (50g)',
      'Pepino com cream cheese',
      'Azeitonas verdes (10 unidades)',
      'Morangos frescos (1 xícara)',
      'Aipo com pasta de amendoim',
      'Ovo cozido',
      'Abacate pequeno com limão',
      'Tomate cereja com mussarela de búfala',
      'Queijo cottage (3 colheres)',
      'Mix de nuts (25g)',
      'Rabanete com homus',
      'Pimentão em tiras com guacamole',
      'Amêndoas torradas (15g)',
      'Iogurte grego natural (100g)',
    ],
    'almoco': [
      'Bife de contrafilé com brócolis, couve-flor gratinada e salada verde',
      'Frango grelhado com abobrinha grelhada, aspargos e molho de ervas',
      'Salmão assado com legumes (brócolis, couve-flor, pimentão) ao azeite',
      'Lombo suíno com purê de couve-flor, vagem e cenoura',
      'Filé mignon com cogumelos salteados, espinafre e rúcula',
      'Tilápia grelhada com salada completa e abacate',
      'Sobrecoxa de frango com legumes assados (berinjela, abobrinha, tomate)',
      'Hambúrguer sem pão com queijo, salada e maionese caseira',
      'Iscas de contrafilé com legumes refogados (pimentão, cebola, tomate)',
      'Peixe ao molho de limão com aspargos e couve-flor',
      'Frango ao curry com leite de coco e couve-flor rice',
      'Carne moída refogada com berinjela, tomate e queijo gratinado',
      'Linguado com manteiga de ervas, brócolis e salada',
      'Costela suína assada com repolho refogado',
      'Camarão ao alho com abobrinha espaguete',
    ],
    'lanche_tarde': [
      'Queijo minas (60g)',
      'Mix de nuts e coco (30g)',
      'Iogurte grego com cacau em pó',
      'Ovo cozido com abacate',
      'Atum em água com azeite',
      'Queijo cottage com frutas vermelhas',
      'Vitamina de abacate com leite de coco',
      'Palitos de queijo mussarela',
      'Azeitonas pretas (12 unidades)',
      'Pepino recheado com atum',
      'Cream cheese com aipo',
      'Tofu defumado em cubos',
      'Shake de whey com água',
      'Presunto de peru (80g) com queijo',
      'Guacamole com palitos de pimentão',
    ],
    'jantar': [
      'Omelete de claras com espinafre, queijo e tomate',
      'Frango grelhado com salada caesar (sem croutons)',
      'Peixe assado com legumes grelhados',
      'Hambúrguer de carne com salada completa e abacate',
      'Sopa de legumes com frango desfiado (sem batata)',
      'Camarão salteado com abobrinha e molho de tomate',
      'Bife com cogumelos e salada verde',
      'Omelete recheada com queijo e presunto',
      'Salmão com aspargos e manteiga de ervas',
      'Frango xadrez sem arroz (só legumes)',
      'Wrap de alface com carne moída temperada',
      'Berinjela recheada com carne moída e queijo',
      'Tilápia com purê de couve-flor',
      'Iscas de filé mignon com legumes',
      'Sopa creme de brócolis com frango',
    ],
    'ceia': [
      'Chá verde com limão',
      'Iogurte grego natural (100g)',
      'Queijo cottage (3 colheres)',
      'Gelatina zero com frutas vermelhas',
      'Chá de camomila com adoçante',
      'Leite de amêndoas morno',
      'Shot de vinagre de maçã',
      'Chá de gengibre',
      'Pudim de chia low carb',
      'Água com limão',
      'Caseína com água',
      'Chá de ervas',
      'Kefir natural',
      'Mousse de abacate com cacau',
      'Chá de hibisco gelado',
    ],
  },

  // ============= CETOGÊNICA / KETO (90 itens) =============
  'cetogenica': {
    'cafe_manha': [
      'Ovos mexidos com bacon, abacate e manteiga ghee',
      'Omelete de queijo com espinafre, cogumelos e cream cheese',
      'Café bulletproof (café com manteiga ghee e óleo de coco)',
      'Panqueca keto de farinha de coco com manteiga e morangos',
      'Salmão defumado com cream cheese, abacate e azeitonas',
      'Iogurte grego integral com nozes, coco ralado e cacau',
      'Ovos cozidos com maionese caseira e bacon',
      'Tofu mexido com abacate, azeite e cúrcuma',
      'Queijo brie com nozes e azeitonas',
      'Omelete de claras com gemas, queijo cheddar e bacon',
      'Vitamina keto (abacate, leite de coco, cacau, óleo MCT)',
      'Crepioca cetogênica com queijo e manteiga',
      'Ovos benedict sem pão com molho holandês',
      'Queijo cottage com azeite, nozes e orégano',
      'Panqueca de cream cheese com ovos e manteiga',
    ],
    'lanche_manha': [
      'Macadâmias (20g)',
      'Queijo cheddar em cubos (40g)',
      'Azeitonas recheadas (10 unidades)',
      'Abacate pequeno com sal e limão',
      'Bacon crocante (3 fatias)',
      'Cream cheese (3 colheres)',
      'Coco fresco em lascas',
      'Nozes pecã (25g)',
      'Manteiga de amêndoas (1 colher)',
      'Queijo parmesão em lascas',
      'Ovo cozido com maionese',
      'Pepperoni (10 fatias)',
      'Azeite extravirgem com azeitonas',
      'Queijo gouda (50g)',
      'Pork rinds (torresmo) - 30g',
    ],
    'almoco': [
      'Bife de picanha com manteiga de ervas, brócolis e salada com azeite',
      'Salmão selvagem grelhado com aspargos, manteiga ghee e abacate',
      'Frango com pele assado com couve-flor gratinada em creme de queijo',
      'Costela suína com repolho refogado na banha e molho de mostarda',
      'Omelete gigante com queijo, bacon, cogumelos e creme azedo',
      'Hambúrguer duplo com queijo, bacon, alface, tomate e maionese',
      'Pato confitado com espinafre refogado na manteiga e cogumelos',
      'Linguado com molho de manteiga de ervas e aspargos grelhados',
      'Contrafilé com queijo derretido, rúcula e azeite trufado',
      'Frango ao curry com leite de coco integral e couve-flor rice',
      'Cordeiro assado com berinjela, azeite e queijo feta',
      'Camarões ao molho de creme de leite com abobrinha espaguete',
      'Filé mignon com gorgonzola derretido e salada verde',
      'Peixe-espada com manteiga composta e legumes grelhados',
      'Carne de panela com bacon, tomate e queijo parmesão',
    ],
    'lanche_tarde': [
      'Fat bomb (bombom de gordura): manteiga de amendoim, cacau e coco',
      'Queijo camembert com nozes pecã',
      'Abacate com atum em azeite',
      'Ovo cozido com maionese caseira e bacon',
      'Queijo cream cheese com salmão defumado',
      'Shake keto (whey, leite de coco, óleo MCT, cacau)',
      'Azeitonas pretas recheadas com cream cheese',
      'Salame com queijo provolone',
      'Mousse de abacate com cacau e óleo de coco',
      'Queijo brie com macadâmias',
      'Iogurte grego integral com nozes e óleo de coco',
      'Caldo de ossos com manteiga ghee',
      'Pork rinds com guacamole',
      'Queijo parmesão chips caseiro',
      'Vitamina de abacate com creme de leite',
    ],
    'jantar': [
      'Omelete caprese com queijo mussarela, tomate, manjericão e azeite',
      'Frango com pele grelhado com salada caesar (sem croutons) e bacon',
      'Salmão com crosta de parmesão, manteiga e espinafre refogado',
      'Bife de contrafilé com cogumelos ao creme e couve-flor',
      'Camarão ao alho com azeite, manteiga e abobrinha espaguete',
      'Costela suína com repolho roxo refogado e mostarda dijon',
      'Hambúrguer sem pão com queijo, bacon, abacate e salada',
      'Peixe ao molho de creme de leite com brócolis e couve-flor',
      'Omelete recheada com queijo, presunto e creme azedo',
      'Frango ao curry com creme de leite de coco e legumes',
      'Berinjela recheada com carne moída, queijo gratinado e azeite',
      'Linguado ao molho de manteiga de limão com aspargos grelhados',
      'Pato confitado com espinafre refogado na banha e cogumelos',
      'Iscas de filé mignon com creme de queijo e brócolis',
      'Sopa creme de couve-flor com bacon crocante e creme azedo',
    ],
    'ceia': [
      'Chá de ervas com óleo MCT e canela',
      'Gelatina zero com creme de leite integral',
      'Leite de coco morno com cacau 100% e adoçante',
      'Caldo de ossos caseiro com manteiga ghee',
      'Mousse de abacate com cacau 100% e óleo de coco',
      'Iogurte grego integral com nozes e óleo de coco',
      'Chá de camomila com creme de leite',
      'Queijo cottage com azeite extravirgem e orégano',
      'Vitamina keto (leite de coco, abacate, cacau, MCT)',
      'Chá verde com óleo de coco e limão',
      'Pudim de chia com leite de coco integral',
      'Leite de amêndoas morno com manteiga de coco',
      'Chá de gengibre com creme de coco',
      'Macadâmias (15g) com chá de hibisco',
      'Mousse de coco com cacau 100% e creme de leite',
    ],
  },
};

// Função para obter refeições do pool por perfil dietético
export function getMealsFromDietaryPool(
  dietaryPreference: string,
  mealType: string,
  count: number = 5
): string[] {
  const profilePool = DIETARY_PROFILE_POOL[dietaryPreference] || DIETARY_PROFILE_POOL['comum'];
  const meals = profilePool[mealType] || [];
  
  if (meals.length === 0) return [];
  
  // Embaralhar e retornar o número solicitado
  const shuffled = [...meals].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, meals.length));
}

// Função para obter uma refeição aleatória do pool dietético
export function getRandomMealFromDietaryPool(dietaryPreference: string, mealType: string): string | null {
  const meals = getMealsFromDietaryPool(dietaryPreference, mealType, 1);
  return meals.length > 0 ? meals[0] : null;
}

// Função para verificar se uma refeição está no pool dietético
export function isMealInDietaryPool(dietaryPreference: string, mealType: string, mealName: string): boolean {
  const profilePool = DIETARY_PROFILE_POOL[dietaryPreference];
  if (!profilePool) return false;
  
  const meals = profilePool[mealType] || [];
  const normalizedMealName = normalizeText(mealName);
  
  return meals.some(meal => normalizeText(meal).includes(normalizedMealName) || normalizedMealName.includes(normalizeText(meal)));
}

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

// ============= PROTEIN DIVERSITY RULES FOR ALL 18 INTOLERANCES =============

/**
 * Mapa de alternativas proteicas para cada intolerância
 * Quando um usuário tem uma intolerância, estas são as proteínas seguras alternativas
 */
const INTOLERANCE_PROTEIN_ALTERNATIVES: Record<string, {
  blocked: string[];
  alternatives: string[];
  label_pt: string;
  label_en: string;
}> = {
  // Intolerâncias a proteínas animais
  egg: {
    blocked: ['ovo', 'ovos', 'clara', 'gema', 'omelete', 'egg', 'eggs'],
    alternatives: ['tofu', 'grão-de-bico', 'lentilha', 'feijão', 'cogumelos', 'tempeh', 'seitan'],
    label_pt: 'Sem Ovos',
    label_en: 'Egg-Free',
  },
  fish: {
    blocked: ['peixe', 'salmão', 'atum', 'tilápia', 'bacalhau', 'sardinha', 'fish', 'salmon', 'tuna'],
    alternatives: ['frango', 'carne bovina', 'carne suína', 'peru', 'tofu', 'ovos', 'leguminosas'],
    label_pt: 'Sem Peixe',
    label_en: 'Fish-Free',
  },
  seafood: {
    blocked: ['camarão', 'lagosta', 'caranguejo', 'mexilhão', 'ostra', 'lula', 'polvo', 'shrimp', 'lobster'],
    alternatives: ['peixe', 'frango', 'carne', 'tofu', 'ovos', 'leguminosas'],
    label_pt: 'Sem Frutos do Mar',
    label_en: 'Seafood-Free',
  },
  shellfish: {
    blocked: ['mexilhão', 'ostra', 'vieira', 'berbigão', 'amêijoa', 'mussel', 'oyster', 'clam'],
    alternatives: ['peixe', 'camarão', 'frango', 'carne', 'tofu', 'ovos'],
    label_pt: 'Sem Moluscos',
    label_en: 'Shellfish-Free',
  },
  
  // Intolerâncias a laticínios
  lactose: {
    blocked: ['leite', 'queijo', 'iogurte', 'creme de leite', 'manteiga', 'requeijão', 'milk', 'cheese', 'yogurt'],
    alternatives: ['leite vegetal', 'tofu', 'proteínas vegetais', 'carnes magras', 'ovos', 'leguminosas'],
    label_pt: 'Sem Lactose',
    label_en: 'Lactose-Free',
  },
  
  // Intolerâncias a proteínas vegetais
  soy: {
    blocked: ['soja', 'tofu', 'tempeh', 'edamame', 'molho shoyu', 'soy', 'tofu'],
    alternatives: ['grão-de-bico', 'lentilha', 'feijão', 'seitan', 'cogumelos', 'ovos', 'carnes'],
    label_pt: 'Sem Soja',
    label_en: 'Soy-Free',
  },
  gluten: {
    blocked: ['trigo', 'cevada', 'centeio', 'seitan', 'pão', 'macarrão', 'wheat', 'barley', 'rye'],
    alternatives: ['quinoa', 'arroz', 'batata', 'mandioca', 'milho', 'leguminosas', 'carnes', 'ovos'],
    label_pt: 'Sem Glúten',
    label_en: 'Gluten-Free',
  },
  peanut: {
    blocked: ['amendoim', 'pasta de amendoim', 'peanut', 'peanut butter'],
    alternatives: ['castanhas', 'amêndoas', 'nozes', 'sementes de girassol', 'tahine', 'leguminosas'],
    label_pt: 'Sem Amendoim',
    label_en: 'Peanut-Free',
  },
  tree_nuts: {
    blocked: ['castanha', 'amêndoa', 'noz', 'avelã', 'pistache', 'macadâmia', 'nuts', 'almond', 'walnut'],
    alternatives: ['sementes (girassol, abóbora, chia)', 'coco', 'amendoim', 'leguminosas'],
    label_pt: 'Sem Castanhas',
    label_en: 'Tree Nut-Free',
  },
  sesame: {
    blocked: ['gergelim', 'tahine', 'óleo de gergelim', 'sesame', 'tahini'],
    alternatives: ['sementes de girassol', 'sementes de abóbora', 'chia', 'linhaça'],
    label_pt: 'Sem Sésamo',
    label_en: 'Sesame-Free',
  },
  
  // Intolerâncias químicas/compostos
  sulfite: {
    blocked: ['vinho', 'frutas secas', 'conservas', 'vinagre', 'wine', 'dried fruits'],
    alternatives: ['frutas frescas', 'vegetais frescos', 'carnes frescas', 'grãos integrais'],
    label_pt: 'Sem Sulfitos',
    label_en: 'Sulfite-Free',
  },
  histamine: {
    blocked: ['queijos maturados', 'embutidos', 'fermentados', 'peixes enlatados', 'aged cheese', 'cured meats'],
    alternatives: ['carnes frescas', 'ovos frescos', 'vegetais frescos', 'grãos', 'leguminosas frescas'],
    label_pt: 'Baixa Histamina',
    label_en: 'Low Histamine',
  },
  salicylate: {
    blocked: ['tomate', 'pimentão', 'berinjela', 'especiarias fortes', 'tomato', 'pepper', 'spices'],
    alternatives: ['batata', 'cenoura', 'abobrinha', 'couve-flor', 'carnes simples', 'arroz'],
    label_pt: 'Baixo Salicilato',
    label_en: 'Low Salicylate',
  },
  nickel: {
    blocked: ['chocolate', 'nozes', 'lentilha', 'aveia', 'soja', 'chocolate', 'oats', 'lentils'],
    alternatives: ['arroz branco', 'batata', 'frango', 'carne bovina', 'ovos', 'laticínios'],
    label_pt: 'Baixo Níquel',
    label_en: 'Low Nickel',
  },
  fodmap: {
    blocked: ['cebola', 'alho', 'trigo', 'leguminosas', 'maçã', 'leite', 'onion', 'garlic', 'wheat', 'beans'],
    alternatives: ['arroz', 'quinoa', 'batata', 'cenoura', 'abobrinha', 'frango', 'peixe', 'ovos', 'tofu firme'],
    label_pt: 'Baixo FODMAP',
    label_en: 'Low FODMAP',
  },
  
  // Outras intolerâncias
  lupin: {
    blocked: ['tremoço', 'farinha de tremoço', 'lupin', 'lupine'],
    alternatives: ['grão-de-bico', 'lentilha', 'feijão', 'soja', 'amendoim'],
    label_pt: 'Sem Tremoço',
    label_en: 'Lupin-Free',
  },
  mustard: {
    blocked: ['mostarda', 'molho mostarda', 'mustard'],
    alternatives: ['maionese', 'azeite', 'limão', 'ervas frescas'],
    label_pt: 'Sem Mostarda',
    label_en: 'Mustard-Free',
  },
  celery: {
    blocked: ['aipo', 'salsão', 'celery'],
    alternatives: ['pepino', 'erva-doce', 'couve', 'espinafre'],
    label_pt: 'Sem Aipo',
    label_en: 'Celery-Free',
  },
  sugar: {
    blocked: ['açúcar', 'mel', 'xarope', 'doces', 'sugar', 'honey', 'syrup'],
    alternatives: ['stevia', 'eritritol', 'frutas com baixo índice glicêmico', 'proteínas', 'gorduras boas'],
    label_pt: 'Sem Açúcar',
    label_en: 'Sugar-Free',
  },
};

/**
 * Alternativas de CARBOIDRATOS para cada intolerância
 */
const INTOLERANCE_CARB_ALTERNATIVES: Record<string, {
  blocked: string[];
  alternatives: string[];
}> = {
  gluten: {
    blocked: ['pão', 'macarrão', 'trigo', 'cevada', 'centeio', 'cuscuz', 'bread', 'pasta', 'wheat'],
    alternatives: ['arroz', 'batata', 'batata-doce', 'mandioca', 'quinoa', 'milho', 'tapioca', 'inhame'],
  },
  fodmap: {
    blocked: ['trigo', 'cevada', 'centeio', 'cebola', 'alho', 'maçã', 'pera', 'wheat', 'onion', 'garlic'],
    alternatives: ['arroz', 'quinoa', 'batata', 'cenoura', 'abobrinha', 'banana verde', 'aveia sem glúten'],
  },
  nickel: {
    blocked: ['aveia', 'trigo integral', 'centeio', 'oats', 'whole wheat'],
    alternatives: ['arroz branco', 'batata', 'mandioca', 'milho', 'tapioca'],
  },
  sugar: {
    blocked: ['açúcar', 'mel', 'xarope', 'frutas doces', 'sugar', 'honey', 'syrup'],
    alternatives: ['batata-doce', 'arroz integral', 'quinoa', 'aveia', 'leguminosas', 'vegetais fibrosos'],
  },
};

/**
 * Alternativas de VEGETAIS para cada intolerância
 */
const INTOLERANCE_VEGGIE_ALTERNATIVES: Record<string, {
  blocked: string[];
  alternatives: string[];
}> = {
  fodmap: {
    blocked: ['cebola', 'alho', 'couve-flor', 'aspargo', 'cogumelos', 'onion', 'garlic', 'cauliflower'],
    alternatives: ['cenoura', 'abobrinha', 'pepino', 'alface', 'tomate', 'berinjela', 'pimentão', 'espinafre'],
  },
  salicylate: {
    blocked: ['tomate', 'pimentão', 'berinjela', 'pepino', 'abobrinha', 'tomato', 'pepper', 'eggplant'],
    alternatives: ['batata', 'cenoura', 'couve-flor', 'repolho', 'alface', 'couve', 'brócolis'],
  },
  histamine: {
    blocked: ['tomate', 'espinafre', 'berinjela', 'abacate', 'tomato', 'spinach', 'eggplant', 'avocado'],
    alternatives: ['cenoura', 'abobrinha', 'pepino', 'alface', 'couve-flor', 'brócolis', 'repolho'],
  },
  nickel: {
    blocked: ['espinafre', 'brócolis', 'couve', 'aspargo', 'spinach', 'broccoli', 'kale'],
    alternatives: ['cenoura', 'abobrinha', 'pepino', 'alface', 'tomate', 'pimentão', 'repolho'],
  },
  sulfite: {
    blocked: ['frutas secas', 'conservas', 'vegetais enlatados', 'dried fruits', 'canned vegetables'],
    alternatives: ['vegetais frescos', 'saladas frescas', 'legumes grelhados', 'vegetais no vapor'],
  },
};

/**
 * Regras de diversidade por OBJETIVO (emagrecer, manter, ganhar peso)
 */
const GOAL_DIVERSITY_RULES: Record<string, {
  carb_focus_pt: string;
  carb_focus_en: string;
  veggie_focus_pt: string;
  veggie_focus_en: string;
  portion_note_pt: string;
  portion_note_en: string;
}> = {
  emagrecer: {
    carb_focus_pt: 'Priorize CARBOIDRATOS COMPLEXOS de baixo índice glicêmico: batata-doce, quinoa, aveia, leguminosas',
    carb_focus_en: 'Prioritize LOW GI complex carbs: sweet potato, quinoa, oats, legumes',
    veggie_focus_pt: 'AUMENTE vegetais fibrosos e folhosos: brócolis, espinafre, couve, alface, abobrinha',
    veggie_focus_en: 'INCREASE fibrous and leafy vegetables: broccoli, spinach, kale, lettuce, zucchini',
    portion_note_pt: '• Porções MODERADAS de carboidratos, GENEROSAS de vegetais, ADEQUADAS de proteínas',
    portion_note_en: '• MODERATE carb portions, GENEROUS vegetable portions, ADEQUATE protein',
  },
  manter: {
    carb_focus_pt: 'EQUILIBRE carboidratos: arroz, batata, massas integrais, pães integrais, frutas',
    carb_focus_en: 'BALANCE carbohydrates: rice, potatoes, whole grain pasta, whole bread, fruits',
    veggie_focus_pt: 'VARIE vegetais: inclua cores diferentes (verde, vermelho, laranja, roxo) em cada refeição',
    veggie_focus_en: 'VARY vegetables: include different colors (green, red, orange, purple) in each meal',
    portion_note_pt: '• Porções EQUILIBRADAS de todos os macros',
    portion_note_en: '• BALANCED portions of all macros',
  },
  ganhar_peso: {
    carb_focus_pt: 'AUMENTE carboidratos densos: arroz, batata, massas, pães, aveia, granola, frutas secas',
    carb_focus_en: 'INCREASE dense carbs: rice, potatoes, pasta, bread, oats, granola, dried fruits',
    veggie_focus_pt: 'Inclua vegetais com AMIDO: batata, mandioca, milho, ervilha, além dos fibrosos',
    veggie_focus_en: 'Include STARCHY vegetables: potatoes, cassava, corn, peas, plus fibrous ones',
    portion_note_pt: '• Porções GENEROSAS de carboidratos e proteínas, ADEQUADAS de vegetais',
    portion_note_en: '• GENEROUS carb and protein portions, ADEQUATE vegetable portions',
  },
};

/**
 * Gera regras de diversidade COMPLETAS (proteínas, carboidratos, vegetais)
 * para todas as 18 intolerâncias, perfis dietéticos e objetivos
 */
function generateProteinDiversityRules(
  dietaryPreference: string | undefined,
  intolerances: string[],
  isPortuguese: boolean,
  isSpanish: boolean,
  goal?: string,
  sex?: string
): string {
  const rules: string[] = [];
  
  // ============= HEADER =============
  if (isPortuguese) {
    rules.push(`
═══════════════════════════════════════════════════════════════
🎯 REGRAS DE DIVERSIDADE ALIMENTAR (OBRIGATÓRIO PARA TODOS)
═══════════════════════════════════════════════════════════════`);
  } else {
    rules.push(`
═══════════════════════════════════════════════════════════════
🎯 FOOD DIVERSITY RULES (MANDATORY FOR ALL)
═══════════════════════════════════════════════════════════════`);
  }
  
  // ============= 1. REGRAS POR OBJETIVO =============
  const userGoal = goal || 'manter';
  const goalRules = GOAL_DIVERSITY_RULES[userGoal] || GOAL_DIVERSITY_RULES['manter'];
  
  if (isPortuguese) {
    rules.push(`
📈 REGRAS PARA OBJETIVO "${userGoal.toUpperCase()}":
🍚 CARBOIDRATOS: ${goalRules.carb_focus_pt}
🥦 VEGETAIS: ${goalRules.veggie_focus_pt}
📏 PORÇÕES: ${goalRules.portion_note_pt}`);
  } else {
    rules.push(`
📈 RULES FOR GOAL "${userGoal.toUpperCase()}":
🍚 CARBS: ${goalRules.carb_focus_en}
🥦 VEGETABLES: ${goalRules.veggie_focus_en}
📏 PORTIONS: ${goalRules.portion_note_en}`);
  }
  
  // ============= 2. REGRAS POR PREFERÊNCIA DIETÉTICA =============
  if (dietaryPreference === 'vegana') {
    if (isPortuguese) {
      rules.push(`
🌱 DIVERSIDADE VEGANA (PROTEÍNAS + CARBOIDRATOS + VEGETAIS):
PROTEÍNAS (mín. 5 fontes/dia): leguminosas, tofu, tempeh, seitan, cogumelos, oleaginosas, sementes
CARBOIDRATOS: arroz, quinoa, batata-doce, aveia, milho, mandioca, trigo sarraceno
VEGETAIS: varie cores! Verde (espinafre, brócolis), Vermelho (tomate, pimentão), Laranja (cenoura, abóbora)
⚠️ MÁXIMO 2 refeições/dia com a mesma proteína!`);
    } else {
      rules.push(`
🌱 VEGAN DIVERSITY (PROTEINS + CARBS + VEGETABLES):
PROTEINS (min 5 sources/day): legumes, tofu, tempeh, seitan, mushrooms, nuts, seeds
CARBS: rice, quinoa, sweet potato, oats, corn, cassava, buckwheat
VEGETABLES: vary colors! Green, Red, Orange, Purple
⚠️ MAX 2 meals/day with the same protein!`);
    }
  } else if (dietaryPreference === 'vegetariana') {
    if (isPortuguese) {
      rules.push(`
🥚 DIVERSIDADE VEGETARIANA:
PROTEÍNAS: ovos, laticínios, leguminosas, tofu, cogumelos, oleaginosas
CARBOIDRATOS: arroz, massas, pães, batata, quinoa, aveia
VEGETAIS: varie texturas (crus, cozidos, grelhados, refogados)
⚠️ MÁXIMO 2 refeições/dia com a mesma proteína!`);
    } else {
      rules.push(`
🥚 VEGETARIAN DIVERSITY:
PROTEINS: eggs, dairy, legumes, tofu, mushrooms, nuts
CARBS: rice, pasta, bread, potato, quinoa, oats
VEGETABLES: vary textures (raw, cooked, grilled, sautéed)
⚠️ MAX 2 meals/day with the same protein!`);
    }
  } else if (dietaryPreference === 'pescetariana') {
    if (isPortuguese) {
      rules.push(`
🐟 DIVERSIDADE PESCETARIANA:
PROTEÍNAS: peixes variados (salmão, tilápia, atum, sardinha), frutos do mar, ovos, laticínios, leguminosas
CARBOIDRATOS: arroz, quinoa, batata, massas, pães integrais
VEGETAIS: varie entre folhosos, crucíferos e coloridos
⚠️ ALTERNE tipos de peixe ao longo da semana!`);
    } else {
      rules.push(`
🐟 PESCATARIAN DIVERSITY:
PROTEINS: varied fish (salmon, tilapia, tuna, sardines), seafood, eggs, dairy, legumes
CARBS: rice, quinoa, potato, pasta, whole grain bread
VEGETABLES: vary between leafy, cruciferous and colorful
⚠️ ALTERNATE fish types throughout the week!`);
    }
  } else {
    // Dieta comum/flexível
    if (isPortuguese) {
      rules.push(`
🍖 DIVERSIDADE PROTEICA GERAL:
PROTEÍNAS: alterne entre carnes (frango, bovina, suína, peixe), ovos, laticínios e leguminosas
CARBOIDRATOS: varie entre arroz, batata, massas, pães, quinoa, mandioca
VEGETAIS: inclua pelo menos 2 tipos diferentes por refeição principal
⚠️ MÁXIMO 2 refeições/dia com a mesma proteína!`);
    } else {
      rules.push(`
🍖 GENERAL PROTEIN DIVERSITY:
PROTEINS: alternate between meats (chicken, beef, pork, fish), eggs, dairy and legumes
CARBS: vary between rice, potato, pasta, bread, quinoa, cassava
VEGETABLES: include at least 2 different types per main meal
⚠️ MAX 2 meals/day with the same protein!`);
    }
  }
  
  // ============= 3. REGRAS POR INTOLERÂNCIA =============
  const normalizedIntolerances = intolerances
    .filter(i => i && i !== 'none' && i !== 'nenhuma')
    .map(i => i.toLowerCase());
  
  const KEY_NORMALIZATION: Record<string, string> = {
    'amendoim': 'peanut',
    'ovos': 'egg',
    'soja': 'soy',
    'acucar_diabetes': 'sugar',
    'acucar': 'sugar',
    'acucar_insulina': 'sugar',
    'castanhas': 'tree_nuts',
    'frutos_do_mar': 'seafood',
    'peixe': 'fish',
    'histamina': 'histamine',
    'salicilatos': 'salicylate',
    'sulfitos': 'sulfite',
    'sesamo': 'sesame',
    'tremoco': 'lupin',
    'mostarda': 'mustard',
    'aipo': 'celery',
    'moluscos': 'shellfish',
    'niquel': 'nickel',
    'fodmap': 'fodmap',
    'lactose': 'lactose',
    'gluten': 'gluten',
  };
  
  const processedIntolerances: string[] = [];
  
  if (normalizedIntolerances.length > 0) {
    if (isPortuguese) {
      rules.push(`
🚫 ALTERNATIVAS POR INTOLERÂNCIA:`);
    } else {
      rules.push(`
🚫 ALTERNATIVES BY INTOLERANCE:`);
    }
  }
  
  for (const intolerance of normalizedIntolerances) {
    const normalizedKey = KEY_NORMALIZATION[intolerance] || intolerance;
    
    if (processedIntolerances.includes(normalizedKey)) continue;
    processedIntolerances.push(normalizedKey);
    
    const proteinAlt = INTOLERANCE_PROTEIN_ALTERNATIVES[normalizedKey];
    const carbAlt = INTOLERANCE_CARB_ALTERNATIVES[normalizedKey];
    const veggieAlt = INTOLERANCE_VEGGIE_ALTERNATIVES[normalizedKey];
    
    if (!proteinAlt && !carbAlt && !veggieAlt) continue;
    
    if (isPortuguese) {
      let rule = `\n🔄 ${proteinAlt?.label_pt || normalizedKey.toUpperCase()}:`;
      if (proteinAlt) {
        rule += `\n   🥩 Proteínas: ✅ ${proteinAlt.alternatives.slice(0, 5).join(', ')}`;
      }
      if (carbAlt) {
        rule += `\n   🍚 Carboidratos: ✅ ${carbAlt.alternatives.slice(0, 5).join(', ')}`;
      }
      if (veggieAlt) {
        rule += `\n   🥦 Vegetais: ✅ ${veggieAlt.alternatives.slice(0, 5).join(', ')}`;
      }
      rules.push(rule);
    } else {
      let rule = `\n🔄 ${proteinAlt?.label_en || normalizedKey.toUpperCase()}:`;
      if (proteinAlt) {
        rule += `\n   🥩 Proteins: ✅ ${proteinAlt.alternatives.slice(0, 5).join(', ')}`;
      }
      if (carbAlt) {
        rule += `\n   🍚 Carbs: ✅ ${carbAlt.alternatives.slice(0, 5).join(', ')}`;
      }
      if (veggieAlt) {
        rule += `\n   🥦 Vegetables: ✅ ${veggieAlt.alternatives.slice(0, 5).join(', ')}`;
      }
      rules.push(rule);
    }
  }
  
  // ============= 4. REGRA GERAL DE DIVERSIDADE =============
  if (isPortuguese) {
    rules.push(`
═══════════════════════════════════════════════════════════════
📊 REGRAS GERAIS DE DIVERSIDADE (APLICAR A TODOS):
═══════════════════════════════════════════════════════════════
🥩 PROTEÍNAS: Máximo 2 refeições/dia com a mesma fonte
🍚 CARBOIDRATOS: Alterne entre pelo menos 3 tipos/dia (ex: arroz, batata, pão)
🥦 VEGETAIS: Mínimo 2 vegetais diferentes por refeição principal
🍎 FRUTAS: Inclua pelo menos 2 frutas diferentes/dia
🎨 CORES: Cada refeição deve ter pelo menos 3 cores diferentes
🔄 REPETIÇÃO: NÃO repita o mesmo prato no mesmo dia
⚠️ VARIEDADE É OBRIGATÓRIA - Monotonia alimentar não é aceitável!`);
  } else {
    rules.push(`
═══════════════════════════════════════════════════════════════
📊 GENERAL DIVERSITY RULES (APPLY TO ALL):
═══════════════════════════════════════════════════════════════
🥩 PROTEINS: Max 2 meals/day with the same source
🍚 CARBS: Alternate between at least 3 types/day
🥦 VEGETABLES: Min 2 different vegetables per main meal
🍎 FRUITS: Include at least 2 different fruits/day
🎨 COLORS: Each meal should have at least 3 different colors
🔄 REPETITION: DO NOT repeat the same dish on the same day
⚠️ VARIETY IS MANDATORY - Food monotony is not acceptable!`);
  }
  
  return rules.join('\n');
}

// ============= STRATEGY-SPECIFIC PROMPT RULES =============
export function getStrategyPromptRules(
  strategyKey: string, 
  language: string = 'pt-BR',
  options?: {
    dietaryPreference?: string;
    intolerances?: string[];
    previousMealsToday?: string[];
    goal?: string;
    sex?: string;
  }
): string {
  const persona = getStrategyPersona(strategyKey);
  const isPortuguese = language.startsWith('pt');
  const isSpanish = language.startsWith('es');
  
  // Obter exemplos dinâmicos do pool de estratégia (6 exemplos)
  const poolExamples = {
    cafe_manha: getMealsFromPool(strategyKey, 'cafe_manha', 6),
    lanche_manha: getMealsFromPool(strategyKey, 'lanche_manha', 6),
    almoco: getMealsFromPool(strategyKey, 'almoco', 6),
    lanche_tarde: getMealsFromPool(strategyKey, 'lanche_tarde', 6),
    jantar: getMealsFromPool(strategyKey, 'jantar', 6),
    ceia: getMealsFromPool(strategyKey, 'ceia', 6),
  };
  
  // NOVO: Injetar exemplos do pool dietético se usuário for vegano/vegetariano
  let dietaryPoolExamples = '';
  const dietPref = options?.dietaryPreference;
  if (dietPref && ['vegana', 'vegetariana', 'pescetariana'].includes(dietPref)) {
    const dietPool = {
      cafe_manha: getMealsFromDietaryPool(dietPref, 'cafe_manha', 4),
      almoco: getMealsFromDietaryPool(dietPref, 'almoco', 4),
      jantar: getMealsFromDietaryPool(dietPref, 'jantar', 4),
    };
    
    if (isPortuguese) {
      dietaryPoolExamples = `
📋 EXEMPLOS ADICIONAIS PARA PERFIL ${dietPref.toUpperCase()} (USAR COMO INSPIRAÇÃO):
- CAFÉ: ${dietPool.cafe_manha.join(' | ')}
- ALMOÇO: ${dietPool.almoco.join(' | ')}
- JANTAR: ${dietPool.jantar.join(' | ')}
`;
    } else if (isSpanish) {
      dietaryPoolExamples = `
📋 EJEMPLOS ADICIONALES PARA PERFIL ${dietPref.toUpperCase()} (USAR COMO INSPIRACIÓN):
- DESAYUNO: ${dietPool.cafe_manha.join(' | ')}
- ALMUERZO: ${dietPool.almoco.join(' | ')}
- CENA: ${dietPool.jantar.join(' | ')}
`;
    } else {
      dietaryPoolExamples = `
📋 ADDITIONAL EXAMPLES FOR ${dietPref.toUpperCase()} PROFILE (USE AS INSPIRATION):
- BREAKFAST: ${dietPool.cafe_manha.join(' | ')}
- LUNCH: ${dietPool.almoco.join(' | ')}
- DINNER: ${dietPool.jantar.join(' | ')}
`;
    }
  }
  
  // NOVO: Gerar regra de diversidade intra-dia
  let intraDayDiversityRule = '';
  const previousMeals = options?.previousMealsToday || [];
  if (previousMeals.length > 0) {
    const previousProteins = previousMeals.join(', ');
    if (isPortuguese) {
      intraDayDiversityRule = `
🔄 REGRA ANTI-REPETIÇÃO INTRA-DIA (CRÍTICO):
Refeições já geradas HOJE: ${previousProteins}
- NÃO repita a proteína principal dessas refeições nas próximas
- Se já usou TOFU, use GRÃO-DE-BICO, LENTILHA, COGUMELOS, SEITAN, TEMPEH
- Se já usou FRANGO, use PEIXE, CARNE, OVO, ou proteína vegetal
- VARIE a fonte proteica em CADA refeição do dia
`;
    } else if (isSpanish) {
      intraDayDiversityRule = `
🔄 REGLA ANTI-REPETICIÓN INTRA-DÍA (CRÍTICO):
Comidas ya generadas HOY: ${previousProteins}
- NO repita la proteína principal de esas comidas
- VARÍE la fuente proteica en CADA comida del día
`;
    } else {
      intraDayDiversityRule = `
🔄 INTRA-DAY ANTI-REPETITION RULE (CRITICAL):
Meals already generated TODAY: ${previousProteins}
- DO NOT repeat the main protein from those meals
- VARY the protein source in EACH meal of the day
`;
    }
  }
  
  // GERAR REGRAS DE DIVERSIDADE COMPLETAS (PROTEÍNAS, CARBOIDRATOS, VEGETAIS)
  const proteinDiversityRule = generateProteinDiversityRules(
    dietPref,
    options?.intolerances || [],
    isPortuguese,
    isSpanish,
    options?.goal || strategyKey, // Usar goal se disponível, senão strategyKey
    options?.sex
  );
  
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
${dietaryPoolExamples}
${proteinDiversityRule}
${intraDayDiversityRule}
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

// ============= PÓS-PROCESSAMENTO: AGRUPAMENTO DE INGREDIENTES =============
// Esta função detecta ingredientes separados que deveriam formar uma preparação única
// e os agrupa automaticamente

// Usar FoodItem já definido no arquivo (name + grams)
export type FoodItemWithGrams = FoodItem;

interface IngredientGroupRule {
  // Padrões de ingredientes que devem ser agrupados
  patterns: RegExp[];
  // Nome base da preparação resultante
  baseName: string;
  // Função para gerar o nome final da preparação
  nameBuilder: (matchedItems: string[]) => string;
  // Tipo de refeição em que essa regra se aplica (null = todos)
  mealTypes?: string[] | null;
}

// Regras de agrupamento de ingredientes
const INGREDIENT_GROUP_RULES: IngredientGroupRule[] = [
  // OVOS + VEGETAIS/PROTEÍNAS = OMELETE/MEXIDO
  {
    patterns: [
      /clara.*ovo|clara.*de.*ovo|claras/i,
      /ovo.*mexido|ovos.*mexido/i,
      /ovo.*cozido|ovos.*cozido/i,
    ],
    baseName: 'Omelete',
    nameBuilder: (items) => {
      // Encontrar vegetais/complementos nos itens
      const hasEspinafre = items.some(i => /espinafre/i.test(i));
      const hasTomate = items.some(i => /tomate/i.test(i));
      const hasCogumelo = items.some(i => /cogumelo|champignon|shimeji/i.test(i));
      const hasQueijo = items.some(i => /queijo|cottage|ricota|mussarela/i.test(i));
      const hasCebola = items.some(i => /cebola/i.test(i));
      const hasOregano = items.some(i => /oregano|orégano/i.test(i));
      const hasPimentao = items.some(i => /piment[aã]o/i.test(i));
      const hasErvas = items.some(i => /ervas|manjericao|salsa|cebolinha/i.test(i));
      
      // Verificar se é clara ou ovo inteiro
      const isClaras = items.some(i => /clara/i.test(i));
      const base = isClaras ? 'Omelete de claras' : 'Omelete';
      
      // Construir lista de complementos
      const complementos: string[] = [];
      if (hasEspinafre) complementos.push('espinafre');
      if (hasTomate) complementos.push('tomate');
      if (hasCogumelo) complementos.push('cogumelos');
      if (hasQueijo) complementos.push('queijo');
      if (hasCebola) complementos.push('cebola');
      if (hasPimentao) complementos.push('pimentão');
      if (hasOregano) complementos.push('orégano');
      if (hasErvas) complementos.push('ervas');
      
      if (complementos.length === 0) {
        return isClaras ? 'Omelete de claras temperada' : 'Omelete simples';
      }
      
      return `${base} com ${complementos.join(', ')}`;
    },
    mealTypes: ['cafe_manha', 'jantar', 'lanche_manha', 'lanche_tarde'],
  },
  
  // ARROZ + FEIJÃO = ARROZ COM FEIJÃO
  {
    patterns: [
      /arroz/i,
      /feij[aã]o/i,
    ],
    baseName: 'Arroz com feijão',
    nameBuilder: (items) => {
      const hasArroz = items.some(i => /arroz/i.test(i));
      const hasFeijao = items.some(i => /feij[aã]o/i.test(i));
      
      if (hasArroz && hasFeijao) {
        // Verificar se há detalhes específicos
        const arrozIntegral = items.some(i => /arroz.*integral/i.test(i));
        const feijaoPreto = items.some(i => /feij[aã]o.*preto/i.test(i));
        const feijaoCarioca = items.some(i => /feij[aã]o.*(carioca|marrom)/i.test(i));
        
        let arrozType = arrozIntegral ? 'integral' : '';
        let feijaoType = feijaoPreto ? 'preto' : (feijaoCarioca ? 'carioca' : '');
        
        let nome = 'Arroz';
        if (arrozType) nome += ` ${arrozType}`;
        nome += ' com feijão';
        if (feijaoType) nome += ` ${feijaoType}`;
        
        return nome;
      }
      
      return 'Arroz com feijão';
    },
    mealTypes: ['almoco', 'jantar'],
  },
];

// Padrões para identificar ingredientes que são "complementos" (vegetais, temperos)
const COMPLEMENT_PATTERNS = [
  /tomate.*picado|tomate.*pequeno|tomate.*cereja/i,
  /cebola.*picad[ao]/i,
  /espinafre.*refogado|espinafre.*cozido/i,
  /cogumelo|champignon|shimeji/i,
  /piment[aã]o.*picado|piment[aã]o.*em.*tiras/i,
  /oregano|orégano/i,
  /ervas|manjericao|salsa|cebolinha/i,
  /alho.*picado|alho.*amassado/i,
];

// Padrões para identificar ingredientes base (ovos, proteínas)
const BASE_INGREDIENT_PATTERNS = [
  /\d+\s*clara.*ovo|\d+\s*claras/i,
  /\d+\s*ovo.*mexido|\d+\s*ovos.*mexido/i,
  /\d+\s*gema/i,
];

/**
 * Verifica se dois itens de comida devem ser agrupados em uma preparação
 */
function shouldGroupItems(item1: string, item2: string): boolean {
  const normalized1 = normalizeText(item1);
  const normalized2 = normalizeText(item2);
  
  // Verificar se um é ingrediente base e outro é complemento
  const isBase1 = BASE_INGREDIENT_PATTERNS.some(p => p.test(item1));
  const isBase2 = BASE_INGREDIENT_PATTERNS.some(p => p.test(item2));
  const isComplement1 = COMPLEMENT_PATTERNS.some(p => p.test(item1));
  const isComplement2 = COMPLEMENT_PATTERNS.some(p => p.test(item2));
  
  // Agrupar se um é base e outro é complemento
  if ((isBase1 && isComplement2) || (isBase2 && isComplement1)) {
    return true;
  }
  
  // Agrupar se ambos são complementos de mesma categoria (vegetais para omelete)
  if (isComplement1 && isComplement2) {
    return true;
  }
  
  return false;
}

/**
 * Processa os alimentos de uma opção e agrupa ingredientes separados em preparações compostas
 */
export function groupSeparatedIngredients(
  foods: FoodItemWithGrams[],
  mealType: string
): { groupedFoods: FoodItemWithGrams[]; wasGrouped: boolean; groupedTitle?: string } {
  if (!foods || foods.length < 2) {
    return { groupedFoods: foods, wasGrouped: false };
  }
  
  // Identificar ingredientes que devem ser agrupados
  const eggPatterns = [
    /clara.*ovo|clara.*de.*ovo|claras/i,
    /ovo.*mexido|ovos.*mexido/i,
  ];
  
  const vegetablePatterns = [
    /tomate.*picado|tomate.*pequeno|tomate.*cereja/i,
    /espinafre/i,
    /cogumelo|champignon/i,
    /cebola.*picad/i,
    /piment[aã]o/i,
    /oregano|orégano/i,
  ];
  
  // Encontrar itens de ovo
  const eggItems: FoodItemWithGrams[] = [];
  const vegetableItems: FoodItemWithGrams[] = [];
  const otherItems: FoodItemWithGrams[] = [];
  
  for (const food of foods) {
    const name = food.name.toLowerCase();
    
    if (eggPatterns.some(p => p.test(food.name))) {
      eggItems.push(food);
    } else if (vegetablePatterns.some(p => p.test(food.name))) {
      vegetableItems.push(food);
    } else {
      otherItems.push(food);
    }
  }
  
  // Se temos ovos + vegetais separados, agrupar em omelete
  if (eggItems.length > 0 && vegetableItems.length > 0) {
    // Construir nome da preparação
    const isClaras = eggItems.some(e => /clara/i.test(e.name));
    
    // Extrair nomes dos vegetais
    const vegNames: string[] = [];
    for (const veg of vegetableItems) {
      if (/tomate/i.test(veg.name)) vegNames.push('tomate');
      else if (/espinafre/i.test(veg.name)) vegNames.push('espinafre');
      else if (/cogumelo|champignon/i.test(veg.name)) vegNames.push('cogumelos');
      else if (/cebola/i.test(veg.name)) vegNames.push('cebola');
      else if (/piment[aã]o/i.test(veg.name)) vegNames.push('pimentão');
      else if (/oregano|orégano/i.test(veg.name)) vegNames.push('orégano');
    }
    
    // Remover duplicatas
    const uniqueVegNames = [...new Set(vegNames)];
    
    // Construir nome final
    const baseName = isClaras ? 'Omelete de claras' : 'Omelete';
    const groupedTitle = uniqueVegNames.length > 0 
      ? `${baseName} com ${uniqueVegNames.join(' e ')}`
      : baseName;
    
    // Somar gramaturas
    const totalGrams = [...eggItems, ...vegetableItems].reduce((sum, item) => sum + (item.grams || 0), 0);
    
    // Criar item agrupado
    const groupedItem: FoodItemWithGrams = {
      name: groupedTitle,
      grams: totalGrams,
    };
    
    return {
      groupedFoods: [groupedItem, ...otherItems],
      wasGrouped: true,
      groupedTitle,
    };
  }
  
  // Verificar arroz + feijão separados
  const arrozItems: FoodItemWithGrams[] = [];
  const feijaoItems: FoodItemWithGrams[] = [];
  const restItems: FoodItemWithGrams[] = [];
  
  for (const food of foods) {
    if (/arroz/i.test(food.name) && !/com\s+feij[aã]o/i.test(food.name)) {
      arrozItems.push(food);
    } else if (/feij[aã]o/i.test(food.name) && !/arroz\s+com/i.test(food.name)) {
      feijaoItems.push(food);
    } else {
      restItems.push(food);
    }
  }
  
  if (arrozItems.length > 0 && feijaoItems.length > 0) {
    // Detectar tipos
    const arrozIntegral = arrozItems.some(a => /integral/i.test(a.name));
    const feijaoPreto = feijaoItems.some(f => /preto/i.test(f.name));
    
    let groupedTitle = arrozIntegral ? 'Arroz integral' : 'Arroz';
    groupedTitle += feijaoPreto ? ' com feijão preto' : ' com feijão';
    
    // Somar gramaturas
    const totalGrams = [...arrozItems, ...feijaoItems].reduce((sum, item) => sum + (item.grams || 0), 0);
    
    const groupedItem: FoodItemWithGrams = {
      name: groupedTitle,
      grams: totalGrams,
    };
    
    return {
      groupedFoods: [groupedItem, ...restItems],
      wasGrouped: true,
      groupedTitle,
    };
  }
  
  return { groupedFoods: foods, wasGrouped: false };
}

/**
 * Atualiza o título da refeição se os ingredientes foram agrupados
 */
export function updateMealTitleIfNeeded(
  originalTitle: string,
  groupedTitle: string | undefined,
  wasGrouped: boolean
): string {
  if (!wasGrouped || !groupedTitle) {
    return originalTitle;
  }
  
  // Se o título original é genérico ou não reflete a preparação, usar o novo
  const genericTitles = [
    /opção\s*\d+/i,
    /refeição\s*\d+/i,
    /café\s*da\s*manhã\s*\d*/i,
    /lanche\s*\d*/i,
  ];
  
  if (genericTitles.some(p => p.test(originalTitle))) {
    return groupedTitle;
  }
  
  // Se o título original menciona ingredientes separados, atualizar
  if (/clara.*ovo/i.test(originalTitle) && /tomate/i.test(originalTitle)) {
    // O título já tenta descrever a preparação, mas está incorreto
    // (ex: "Omelete de claras com tomate e orégano" mas ingredients separados)
    return originalTitle; // Manter título original se já é descritivo
  }
  
  return originalTitle;
}

// ============= ORDENAÇÃO DE INGREDIENTES (FRUTAS/SOBREMESAS POR ÚLTIMO) =============

/**
 * Categorias de alimentos para ordenação
 * Ordem: 1-Prato Principal, 2-Acompanhamentos, 3-Condimentos, 4-Frutas/Sobremesas, 5-Bebidas (SEMPRE ÚLTIMO)
 */
const FOOD_CATEGORY_PATTERNS = {
  // Categoria 1: Pratos principais (proteínas, pratos quentes)
  mainDish: [
    /omelete/i,
    /filé|file/i,
    /frango/i,
    /carne/i,
    /peixe/i,
    /salmão|salmao/i,
    /atum/i,
    /tilápia|tilapia/i,
    /camarão|camarao/i,
    /ovo.*mexido|ovos.*mexidos/i,
    /peito.*peru/i,
    /hambúrguer|hamburguer/i,
    /sopa/i,
    /caldo/i,
    /wrap.*recheado/i,
    /tapioca.*com/i,
    /crepioca/i,
    /panqueca/i,
    /mingau/i,
    /vitamina/i,
    /shake/i,
    /smoothie/i,
  ],
  
  // Categoria 2: Acompanhamentos (grãos, legumes, saladas)
  sides: [
    /arroz/i,
    /feijão|feijao/i,
    /batata/i,
    /legumes/i,
    /brócolis|brocolis/i,
    /salada/i,
    /couve/i,
    /espinafre/i,
    /pão|pao/i,
    /torrada/i,
    /quinoa/i,
    /mandioca/i,
    /purê|pure/i,
    /abobrinha/i,
    /berinjela/i,
    /cenoura/i,
    /vagem/i,
    /aspargos/i,
    /cogumelo/i,
    /champignon/i,
  ],
  
  // Categoria 3: Condimentos e gorduras
  condiments: [
    /azeite/i,
    /óleo|oleo/i,
    /molho/i,
    /vinagrete/i,
    /mostarda/i,
    /tempero/i,
    /sal\b/i,
    /pimenta/i,
    /orégano|oregano/i,
    /manjericão|manjericao/i,
    /limão|limao.*siciliano/i,
    /tahine/i,
    /homus|hummus/i,
  ],
  
  // Categoria 4: Frutas e sobremesas
  fruitsAndDesserts: [
    /banana/i,
    /maçã|maca/i,
    /laranja/i,
    /mamão|mamao/i,
    /melancia/i,
    /melão|melao/i,
    /morango/i,
    /uva/i,
    /abacaxi/i,
    /manga/i,
    /kiwi/i,
    /pêra|pera/i,
    /ameixa/i,
    /framboesa/i,
    /mirtilo/i,
    /açaí|acai/i,
    /berry|berries/i,
    /gelatina/i,
    /pudim/i,
    /mousse/i,
    /iogurte/i,
    /sobremesa/i,
    /fruta/i,
  ],
  
  // Categoria 5: Bebidas (SEMPRE POR ÚLTIMO)
  beverages: [
    /chá|cha\b/i,
    /café|cafe/i,
    /suco/i,
    /leite(?!.*coco)/i, // Leite mas não leite de coco
    /água|agua/i,
    /infusão|infusao/i,
    /água.*coco|agua.*coco/i,
  ],
};

/**
 * Determina a categoria de ordenação de um alimento
 * Retorna: 1 (prato principal), 2 (acompanhamento), 3 (condimento), 4 (fruta/sobremesa)
 */
function getFoodSortCategory(foodName: string): number {
  const normalizedName = foodName.toLowerCase();
  
  // Verificar se é bebida (categoria 5 - SEMPRE ÚLTIMA)
  if (FOOD_CATEGORY_PATTERNS.beverages.some(p => p.test(normalizedName))) {
    // Exceção: vitaminas e shakes são pratos principais
    const isMainDishBeverage = /vitamina|smoothie|shake/i.test(normalizedName);
    if (!isMainDishBeverage) {
      return 5;
    }
  }
  
  // Verificar se é fruta/sobremesa (categoria 4 - PENÚLTIMA)
  if (FOOD_CATEGORY_PATTERNS.fruitsAndDesserts.some(p => p.test(normalizedName))) {
    // Exceção: se a fruta está em uma preparação complexa, não mover
    // Ex: "Vitamina de banana" é prato principal, não sobremesa
    const isPartOfMainDish = /vitamina|smoothie|shake|suco|panqueca.*com.*banana/i.test(normalizedName);
    if (!isPartOfMainDish) {
      return 4;
    }
  }
  
  // Verificar se é prato principal (categoria 1 - PRIMEIRO)
  if (FOOD_CATEGORY_PATTERNS.mainDish.some(p => p.test(normalizedName))) {
    return 1;
  }
  
  // Verificar se é acompanhamento (categoria 2)
  if (FOOD_CATEGORY_PATTERNS.sides.some(p => p.test(normalizedName))) {
    return 2;
  }
  
  // Verificar se é condimento (categoria 3)
  if (FOOD_CATEGORY_PATTERNS.condiments.some(p => p.test(normalizedName))) {
    return 3;
  }
  
  // Default: acompanhamento (2) para não priorizar nem deixar por último
  return 2;
}

/**
 * Ordena os ingredientes de uma refeição seguindo a ordem lógica:
 * 1. Pratos principais (proteínas, preparações quentes)
 * 2. Acompanhamentos (grãos, legumes, saladas)
 * 3. Condimentos (azeite, temperos)
 * 4. Frutas e sobremesas
 * 5. Bebidas (SEMPRE POR ÚLTIMO)
 */
export function sortMealIngredients(foods: FoodItemWithGrams[]): FoodItemWithGrams[] {
  if (!foods || foods.length <= 1) {
    return foods;
  }
  
  return [...foods].sort((a, b) => {
    const categoryA = getFoodSortCategory(a.name);
    const categoryB = getFoodSortCategory(b.name);
    
    // Ordenar por categoria (menor número = aparece primeiro)
    return categoryA - categoryB;
  });
}

/**
 * LIMPEZA PÓS-GERAÇÃO: Remove menções a frutas e bebidas das instruções de preparo
 * Regra: Frutas e bebidas devem estar listadas em "foods" mas NUNCA nas instruções
 * 
 * Exemplos de frases problemáticas que serão limpas:
 * - "Acompanhe com café sem açúcar e banana"
 * - "Sirva com a laranja como sobremesa"
 * - "Finalize com suco de laranja"
 */
export function cleanInstructionsFromFruitsAndBeverages(instructions: string[]): string[] {
  if (!instructions || instructions.length === 0) {
    return instructions;
  }

  // Padrões de frutas comuns
  const FRUIT_PATTERNS = [
    'banana', 'maça', 'maca', 'laranja', 'melao', 'melão', 'melancia', 
    'mamao', 'mamão', 'abacaxi', 'morango', 'uva', 'pera', 'kiwi',
    'manga', 'goiaba', 'tangerina', 'limao', 'limão', 'acerola',
    'framboesa', 'mirtilo', 'ameixa', 'cereja', 'figo', 'caqui',
    'maracuja', 'maracujá', 'graviola', 'pitaya', 'coco', 'abacate'
  ];

  // Padrões de bebidas
  const BEVERAGE_PATTERNS = [
    'cafe', 'café', 'cha ', 'chá', 'suco', 'leite', 'agua', 'água',
    'refrigerante', 'vitamina', 'smoothie', 'batida', 'iogurte liquido',
    'bebida', 'achocolatado', 'cappuccino', 'expresso'
  ];

  // Padrões de frases problemáticas a serem removidas completamente
  const PROBLEMATIC_PHRASE_PATTERNS = [
    /acompanhe\s+com\s+.*?(cafe|café|cha|chá|suco|banana|maça|laranja|fruta|leite|água|agua).*$/i,
    /sirva\s+com\s+.*?(cafe|café|cha|chá|suco|banana|maça|laranja|fruta|sobremesa).*$/i,
    /finalize\s+com\s+.*?(banana|maça|laranja|fruta|suco).*$/i,
    /tome\s+o?\s*(cafe|café|cha|chá|suco|leite).*$/i,
    /beba\s+o?\s*(suco|leite|agua|água|cha|chá).*$/i,
    /\.\s*e\s+(banana|maça|laranja|fruta|suco|café|cafe|chá|cha)\s*\.?$/i,
    /,?\s*e\s+(a\s+)?(banana|maça|laranja|fruta)\s*\.?$/i,
  ];

  return instructions
    .map(instruction => {
      let cleaned = instruction;
      
      // Tentar remover padrões problemáticos
      for (const pattern of PROBLEMATIC_PHRASE_PATTERNS) {
        cleaned = cleaned.replace(pattern, '.');
      }
      
      // Limpar pontuações duplas e espaços extras
      cleaned = cleaned
        .replace(/\.\s*\./g, '.')
        .replace(/,\s*\./g, '.')
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleaned;
    })
    .filter(instruction => {
      // Remover instruções que ficaram vazias ou muito curtas após limpeza
      if (!instruction || instruction.length < 10) return false;
      
      // Remover instruções que são apenas sobre frutas/bebidas
      const normalized = instruction.toLowerCase();
      const isOnlyAboutFruit = FRUIT_PATTERNS.some(f => normalized.includes(f)) && 
        !normalized.includes('cozin') && 
        !normalized.includes('grelh') && 
        !normalized.includes('refog') &&
        !normalized.includes('prepar') &&
        !normalized.includes('mistur');
      
      const isOnlyAboutBeverage = BEVERAGE_PATTERNS.some(b => normalized.includes(b)) &&
        normalized.split(' ').length < 6; // Instrução curta sobre bebida
      
      return !isOnlyAboutFruit && !isOnlyAboutBeverage;
    });
}

// =============================================================================
// FUNÇÕES HELPER PARA INTERNACIONALIZAÇÃO DO PROMPT
// =============================================================================

function getNutritionistPersona(countryCode: string, language: string): string {
  // Persona dinâmica baseada no país - instruções técnicas em inglês, output localizado
  const isPortuguese = language.startsWith('pt');
  const isSpanish = language.startsWith('es');
  const isFrench = language.startsWith('fr');
  const isGerman = language.startsWith('de');
  const isItalian = language.startsWith('it');
  
  // Nome da nutricionista por região
  const names: Record<string, string> = {
    'BR': 'DRA. ANA',
    'PT': 'DRA. MARIA',
    'US': 'DR. SARAH',
    'GB': 'DR. EMILY',
    'MX': 'DRA. CARMEN',
    'ES': 'DRA. LUCIA',
    'AR': 'DRA. VALENTINA',
    'CO': 'DRA. SOFIA',
    'FR': 'DR. CLAIRE',
    'DE': 'DR. ANNA',
    'IT': 'DR. GIULIA',
  };
  
  const nutritionistName = names[countryCode] || names['US'];
  
  // Instruções técnicas em inglês (para máxima precisão do modelo)
  // Output localizado no idioma do usuário
  const coreInstructions = `
[INTERNAL REASONING: English]
[OUTPUT LANGUAGE: ${language}]

You are ${nutritionistName}, a registered dietitian with 20 years of clinical experience specializing in the cuisine and nutritional patterns of ${countryCode}.

CORE RULES:
- Reason and process instructions in English for accuracy
- Generate ALL food names, titles, and instructions in ${language}
- Use culturally appropriate foods for ${countryCode}
- Follow the meal structure patterns typical for this region
- Respect all dietary restrictions and intolerances ABSOLUTELY
`;

  // Localização da mensagem de persona para o usuário
  if (isPortuguese) {
    return `${coreInstructions}
Você cria cardápios REAIS como faria para seus pacientes VIP.`;
  } else if (isSpanish) {
    return `${coreInstructions}
Creas menús REALES como lo harías para tus pacientes VIP.`;
  } else if (isFrench) {
    return `${coreInstructions}
Vous créez des menus RÉELS comme vous le feriez pour vos patients VIP.`;
  } else if (isGerman) {
    return `${coreInstructions}
Sie erstellen ECHTE Speisepläne wie für Ihre VIP-Patienten.`;
  } else if (isItalian) {
    return `${coreInstructions}
Crei menu REALI come faresti per i tuoi pazienti VIP.`;
  }
  
  // Default: English
  return `${coreInstructions}
You create REAL meal plans as you would for your VIP patients.`;
}

function getMissionText(language: string, dayName: string, dayNumber: number, calories: number): string {
  if (language.startsWith('en')) return `MISSION: Create the menu for ${dayName} (Day ${dayNumber}) with ${calories} kcal.`;
  if (language.startsWith('es')) return `MISIÓN: Crear el menú de ${dayName} (Día ${dayNumber}) con ${calories} kcal.`;
  return `MISSÃO: Criar o cardápio de ${dayName} (Dia ${dayNumber}) com ${calories} kcal.`;
}

function getMealsHeader(language: string): string {
  if (language.startsWith('en')) return 'MEALS OF THE DAY';
  if (language.startsWith('es')) return 'COMIDAS DEL DÍA';
  return 'REFEIÇÕES DO DIA';
}

function getRestrictionsHeader(language: string): string {
  if (language.startsWith('en')) return 'ABSOLUTE RESTRICTIONS (NEVER INCLUDE)';
  if (language.startsWith('es')) return 'RESTRICCIONES ABSOLUTAS (NUNCA INCLUIR)';
  return 'RESTRIÇÕES ABSOLUTAS (NUNCA INCLUIR)';
}

function getStrategyHeader(language: string): string {
  if (language.startsWith('en')) return 'NUTRITIONAL STRATEGY';
  if (language.startsWith('es')) return 'ESTRATEGIA NUTRICIONAL';
  return 'ESTRATÉGIA NUTRICIONAL';
}

function getNoRepeatHeader(language: string): string {
  if (language.startsWith('en')) return 'DO NOT REPEAT (already used)';
  if (language.startsWith('es')) return 'NO REPETIR (ya usados)';
  return 'NÃO REPETIR (já usados)';
}

function getPhilosophyHeader(language: string): string {
  if (language.startsWith('en')) return 'REAL MEAL PHILOSOPHY';
  if (language.startsWith('es')) return 'FILOSOFÍA DE COMIDAS REALES';
  return 'FILOSOFIA DE REFEIÇÕES REAIS';
}

// =============================================================================
// PROMPT v7.0 GLOBAL - 100% ENGLISH MASTER + REGIONAL INJECTION
// =============================================================================
// This is the master prompt used by:
// - generate-ai-meal-plan
// - suggest-smart-substitutes
// - regenerate-ai-meal-alternatives
//
// ARCHITECTURE: Master rules in English for AI precision, regional examples injected dynamically
// =============================================================================

export interface MasterPromptParams {
  dailyCalories: number;
  meals: { type: string; label: string; targetCalories: number }[];
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  dayNumber: number;
  dayName: string;
  regional: RegionalConfig;
  countryCode?: string;
  strategyKey?: string;
  previousDaysMeals?: string[];
  nutritionalTablePrompt?: string;
}

// =============================================================================
// REGIONAL EXAMPLES GENERATOR - Localized examples per country
// =============================================================================
function getRegionalExamples(countryCode: string, language: string): {
  breakfast: string;
  snack: string;
  lunch: string;
  dinner: string;
  supper: string;
  consolidatedDishes: string;
  beverageExamples: string;
  badSnackExamples: string;
  goodSnackExamples: string;
} {
  const config = getRegionalConfig(countryCode);
  const structure = config.mealStructure;
  
  // Default examples based on country
  const examples: Record<string, any> = {
    'BR': {
      breakfast: `{
  "title": "Tapioca com queijo e café com leite",
  "foods": [
    {"name": "Tapioca recheada com queijo branco", "grams": 120},
    {"name": "1 xícara de café com leite", "grams": 200},
    {"name": "1 fatia de mamão (sobremesa)", "grams": 100}
  ],
  "instructions": [
    "Ingredientes: goma de tapioca (80g), queijo branco (40g).",
    "Hidrate a goma e espalhe na frigideira quente até formar disco.",
    "Adicione o queijo, dobre e sirva quente."
  ]
}`,
      snack: `{
  "title": "Iogurte com granola e morangos",
  "foods": [{"name": "Bowl de iogurte com granola e morangos", "grams": 250}],
  "instructions": [
    "Ingredientes: iogurte natural (170g), granola sem açúcar (30g), morangos (50g).",
    "Monte em camadas no bowl.",
    "Sirva gelado."
  ]
}`,
      lunch: `{
  "title": "Frango grelhado com arroz, feijão e salada",
  "foods": [
    {"name": "Filé de frango grelhado ao limão", "grams": 150},
    {"name": "Arroz integral", "grams": 100},
    {"name": "Feijão carioca", "grams": 80},
    {"name": "Salada verde com azeite", "grams": 80},
    {"name": "1 laranja média (sobremesa)", "grams": 150},
    {"name": "1 copo de água (opcional)", "grams": 200}
  ],
  "instructions": [
    "Tempere o frango com sal, alho e limão. Marine por 10 min.",
    "Grelhe por 5-6 min de cada lado.",
    "Monte: arroz, feijão, salada e frango."
  ]
}`,
      dinner: `{
  "title": "Sopa de lentilha com tofu e legumes",
  "foods": [
    {"name": "Sopa de lentilha com tofu e legumes", "grams": 380},
    {"name": "1 copo de água (opcional)", "grams": 200}
  ],
  "instructions": [
    "Ingredientes: lentilha (100g), tofu (80g), cenoura (50g), aipo (30g), cebola (20g).",
    "Refogue cebola e aipo. Adicione cenoura, lentilha e água. Cozinhe 15 min.",
    "Adicione tofu nos últimos minutos e sirva quente."
  ]
}`,
      supper: `{
  "title": "Banana com chia e chá de camomila",
  "foods": [
    {"name": "Banana com chia e canela", "grams": 75},
    {"name": "1 xícara de chá de camomila", "grams": 200}
  ],
  "instructions": [
    "Ingredientes: 1/2 banana (60g), chia (10g), canela (5g).",
    "Fatie a banana e polvilhe chia e canela.",
    "Acompanhe com chá morno."
  ]
}`,
      consolidatedDishes: "Sopas, Caldos, Feijoada, Moqueca, Omeletes, Tapiocas recheadas, Açaí bowl, Vitaminas",
      beverageExamples: '"1 copo de água (opcional)", "1 copo de refrigerante zero (opcional)", "1 copo de suco zero açúcar (opcional)"',
      badSnackExamples: '"Tomate com pepino", "Pepino com rúcula", "Cenoura crua"',
      goodSnackExamples: '"Maçã com pasta de amendoim", "Iogurte com frutas", "Mix de castanhas", "Banana com chia", "Queijo cottage com tomate cereja"'
    },
    'US': {
      breakfast: `{
  "title": "Scrambled eggs with toast and berries",
  "foods": [
    {"name": "Scrambled eggs with cheese", "grams": 150},
    {"name": "Whole wheat toast", "grams": 60},
    {"name": "1 cup of coffee with milk", "grams": 200},
    {"name": "Mixed berries (dessert)", "grams": 100}
  ],
  "instructions": [
    "Ingredients: 2 eggs, cheese (30g), butter (5g), bread (60g), berries (100g).",
    "Scramble eggs with cheese in butter until fluffy.",
    "Toast bread and serve with berries on the side."
  ]
}`,
      snack: `{
  "title": "Greek yogurt with granola and strawberries",
  "foods": [{"name": "Greek yogurt parfait with granola and strawberries", "grams": 250}],
  "instructions": [
    "Ingredients: Greek yogurt (170g), granola (30g), strawberries (50g).",
    "Layer yogurt, granola, and sliced strawberries.",
    "Serve chilled."
  ]
}`,
      lunch: `{
  "title": "Grilled chicken with rice and vegetables",
  "foods": [
    {"name": "Grilled chicken breast with herbs", "grams": 150},
    {"name": "Brown rice", "grams": 100},
    {"name": "Steamed broccoli", "grams": 80},
    {"name": "Mixed green salad", "grams": 80},
    {"name": "1 medium apple (dessert)", "grams": 150},
    {"name": "1 glass of water (optional)", "grams": 200}
  ],
  "instructions": [
    "Season chicken with salt, pepper, and herbs. Marinate 10 min.",
    "Grill for 5-6 min each side until done.",
    "Plate with rice, broccoli, salad, and chicken."
  ]
}`,
      dinner: `{
  "title": "Lentil soup with vegetables",
  "foods": [
    {"name": "Lentil soup with carrots and celery", "grams": 380},
    {"name": "1 glass of water (optional)", "grams": 200}
  ],
  "instructions": [
    "Ingredients: lentils (100g), carrots (50g), celery (30g), onion (20g), olive oil (5g).",
    "Sauté onion and celery. Add carrots, lentils, and water. Cook 15 min.",
    "Season and serve hot."
  ]
}`,
      supper: `{
  "title": "Banana with almond butter and chamomile tea",
  "foods": [
    {"name": "Banana with almond butter", "grams": 75},
    {"name": "1 cup of chamomile tea", "grams": 200}
  ],
  "instructions": [
    "Ingredients: 1/2 banana (60g), almond butter (15g).",
    "Slice banana and drizzle with almond butter.",
    "Serve with warm tea."
  ]
}`,
      consolidatedDishes: "Soups, Stews, Salads with protein, Wraps, Sandwiches, Burgers, Pasta dishes, Stir-fries, Smoothie bowls",
      beverageExamples: '"1 glass of water (optional)", "1 glass of diet soda (optional)", "1 glass of sugar-free juice (optional)"',
      badSnackExamples: '"Tomato with cucumber", "Raw carrots", "Plain celery sticks"',
      goodSnackExamples: '"Apple with peanut butter", "Greek yogurt with berries", "Almonds with dried cranberries", "Cheese stick with grapes", "Hummus with carrot sticks"'
    },
    'ES': {
      breakfast: `{
  "title": "Tostada con tomate y café con leche",
  "foods": [
    {"name": "Tostada con tomate y aceite de oliva", "grams": 100},
    {"name": "1 taza de café con leche", "grams": 200},
    {"name": "1 naranja (postre)", "grams": 150}
  ],
  "instructions": [
    "Ingredientes: pan integral (60g), tomate rallado (30g), aceite de oliva (10g).",
    "Tuesta el pan y añade el tomate rallado y el aceite.",
    "Sirve con café y naranja."
  ]
}`,
      snack: `{
  "title": "Yogur natural con nueces",
  "foods": [{"name": "Yogur natural con nueces y miel", "grams": 200}],
  "instructions": [
    "Ingredientes: yogur natural (150g), nueces (30g), miel (20g).",
    "Mezcla el yogur con las nueces.",
    "Añade la miel y sirve."
  ]
}`,
      lunch: `{
  "title": "Pollo asado con patatas y ensalada",
  "foods": [
    {"name": "Pechuga de pollo asada con hierbas", "grams": 150},
    {"name": "Patatas asadas", "grams": 100},
    {"name": "Ensalada mediterránea", "grams": 80},
    {"name": "1 manzana (postre)", "grams": 150},
    {"name": "1 vaso de agua (opcional)", "grams": 200}
  ],
  "instructions": [
    "Sazona el pollo con sal, pimienta y hierbas. Marina 10 min.",
    "Asa en el horno a 200°C por 25 min.",
    "Sirve con patatas asadas y ensalada."
  ]
}`,
      dinner: `{
  "title": "Crema de calabacín",
  "foods": [
    {"name": "Crema de calabacín con queso", "grams": 350},
    {"name": "1 vaso de agua (opcional)", "grams": 200}
  ],
  "instructions": [
    "Ingredientes: calabacín (200g), patata (50g), cebolla (30g), queso fresco (30g).",
    "Cuece las verduras y tritura hasta obtener crema.",
    "Añade queso y sirve caliente."
  ]
}`,
      supper: `{
  "title": "Plátano con yogur y té de manzanilla",
  "foods": [
    {"name": "Plátano con yogur", "grams": 75},
    {"name": "1 taza de té de manzanilla", "grams": 200}
  ],
  "instructions": [
    "Ingredientes: 1/2 plátano (60g), yogur natural (50g).",
    "Corta el plátano y mezcla con yogur.",
    "Acompaña con té caliente."
  ]
}`,
      consolidatedDishes: "Sopas, Gazpachos, Cremas, Tortillas, Ensaladas completas, Revueltos, Guisos",
      beverageExamples: '"1 vaso de agua (opcional)", "1 vaso de refresco zero (opcional)", "1 vaso de zumo sin azúcar (opcional)"',
      badSnackExamples: '"Tomate con pepino", "Zanahoria cruda", "Apio solo"',
      goodSnackExamples: '"Yogur con nueces", "Manzana con mantequilla de almendras", "Frutos secos variados", "Queso fresco con membrillo"'
    },
    'MX': {
      breakfast: `{
  "title": "Huevos rancheros con frijoles",
  "foods": [
    {"name": "Huevos rancheros con salsa", "grams": 180},
    {"name": "Frijoles refritos", "grams": 80},
    {"name": "1 taza de café", "grams": 200},
    {"name": "1 porción de papaya (postre)", "grams": 100}
  ],
  "instructions": [
    "Ingredientes: 2 huevos, salsa roja (30g), tortilla (30g), frijoles (80g).",
    "Fríe los huevos y sirve sobre tortilla con salsa.",
    "Acompaña con frijoles y papaya."
  ]
}`,
      snack: `{
  "title": "Manzana con crema de cacahuate",
  "foods": [{"name": "Manzana con crema de cacahuate", "grams": 175}],
  "instructions": [
    "Ingredientes: 1 manzana (150g), crema de cacahuate (25g).",
    "Corta la manzana en rebanadas.",
    "Unta con crema de cacahuate y sirve."
  ]
}`,
      lunch: `{
  "title": "Pollo a la plancha con arroz y ensalada",
  "foods": [
    {"name": "Pechuga de pollo a la plancha", "grams": 150},
    {"name": "Arroz rojo", "grams": 100},
    {"name": "Frijoles negros", "grams": 80},
    {"name": "Ensalada de nopal", "grams": 80},
    {"name": "1 naranja (postre)", "grams": 150},
    {"name": "1 vaso de agua (opcional)", "grams": 200}
  ],
  "instructions": [
    "Sazona el pollo con sal, pimienta y limón. Marina 10 min.",
    "Cocina a la plancha 5-6 min por lado.",
    "Sirve con arroz, frijoles y ensalada de nopal."
  ]
}`,
      dinner: `{
  "title": "Sopa de tortilla",
  "foods": [
    {"name": "Sopa de tortilla con aguacate", "grams": 350},
    {"name": "1 vaso de agua (opcional)", "grams": 200}
  ],
  "instructions": [
    "Ingredientes: caldo de pollo (250ml), tortilla (30g), aguacate (30g), queso (20g).",
    "Calienta el caldo con tiras de tortilla.",
    "Sirve con aguacate y queso fresco."
  ]
}`,
      supper: `{
  "title": "Plátano con chia y té de manzanilla",
  "foods": [
    {"name": "Plátano con chia", "grams": 75},
    {"name": "1 taza de té de manzanilla", "grams": 200}
  ],
  "instructions": [
    "Ingredientes: 1/2 plátano (60g), chia (10g), canela (5g).",
    "Corta el plátano y espolvorea chia y canela.",
    "Acompaña con té caliente."
  ]
}`,
      consolidatedDishes: "Sopas, Caldos, Tacos, Quesadillas, Enchiladas, Burritos, Pozole, Ensaladas completas",
      beverageExamples: '"1 vaso de agua (opcional)", "1 vaso de refresco zero (opcional)", "1 vaso de agua de jamaica sin azúcar (opcional)"',
      badSnackExamples: '"Pepino con limón solo", "Jícama sola", "Zanahoria cruda"',
      goodSnackExamples: '"Manzana con crema de cacahuate", "Yogurt con mango", "Nueces mixtas", "Jícama con limón y chile", "Guacamole con verduras"'
    }
  };
  
  // Return examples for the specified country, fallback to US for non-configured countries
  return examples[countryCode] || examples['US'];
}

export function getMasterMealPromptV5(params: MasterPromptParams): string {
  const {
    dailyCalories,
    meals,
    restrictions,
    dayNumber,
    dayName,
    regional,
    countryCode = 'BR',
    strategyKey,
    previousDaysMeals = [],
    nutritionalTablePrompt = ''
  } = params;

  const restrictionText = getRestrictionText(restrictions, regional.language);
  const mealsDescription = meals.map(m => `- ${m.label}: ${m.targetCalories} kcal`).join('\n');
  
  const mealsJsonTemplate = meals.map(m => `
    {
      "meal_type": "${m.type}",
      "label": "${m.label}",
      "target_calories": ${m.targetCalories},
      "options": [
        {
          "title": "Descriptive name in ${regional.language}",
          "foods": [{"name": "food name in ${regional.language}", "grams": 100}],
          "calories_kcal": ${m.targetCalories},
          "instructions": ["Preparation step in ${regional.language}"]
        }
      ]
    }`).join(',');

  const strategyRules = strategyKey ? getStrategyPromptRules(strategyKey, regional.language, {
    dietaryPreference: restrictions.dietaryPreference,
    intolerances: restrictions.intolerances,
    previousMealsToday: [],
    goal: restrictions.goal,
  }) : '';

  // Get regional behavioral prompt
  const countryBehavioralPrompt = getCountryBehavioralPrompt(countryCode);
  
  // Get nutritionist persona
  const nutritionistPersona = getNutritionistPersona(countryCode, regional.language);
  
  // Get localized examples for this country
  const regionalExamples = getRegionalExamples(countryCode, regional.language);

  // =============================================================================
  // PROMPT v7.0 GLOBAL - 100% ENGLISH MASTER WITH REGIONAL INJECTION
  // =============================================================================
  return `${nutritionistPersona}

🎯 ${getMissionText(regional.language, dayName, dayNumber, dailyCalories)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ${getMealsHeader(regional.language)}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${mealsDescription}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ${getRestrictionsHeader(regional.language)}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${restrictionText}
${strategyRules ? `\n━━━ ${getStrategyHeader(regional.language)} ━━━\n${strategyRules}` : ''}
${previousDaysMeals.length > 0 ? `\n━━━ ${getNoRepeatHeader(regional.language)} ━━━\n${previousDaysMeals.map(m => `• ${m}`).join('\n')}` : ''}

${countryBehavioralPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ REAL MEAL PHILOSOPHY (CRITICAL RULES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ CULINARY COHERENCE:
   • Soup = single dish (DO NOT add rice/salad separately)
   • One-pot meals = complete dish (DO NOT add separate components)
   • Hot dishes pair with hot sides
   • Grilled items can have raw salad

2️⃣ PROTEIN VARIETY THROUGHOUT THE DAY:
   • Lunch: chicken → Dinner: fish OR beef
   • Breakfast: eggs → Lunch: different protein
   • Supper: NO heavy protein (max yogurt/milk)

3️⃣ 🚨🚨🚨 FOODS ARRAY ORDER - MANDATORY 🚨🚨🚨:
   ⚠️ ABSOLUTE RULE: BEVERAGES ALWAYS IN LAST POSITION!
   ⚠️ ABSOLUTE RULE: MAIN DISH ALWAYS IN FIRST POSITION!
   
   CORRECT ORDER (follow EXACTLY):
   1st POSITION: Main dish / Protein (chicken, omelet, etc.)
   2nd POSITION: Side dishes (rice, beans, salad - if applicable)
   3rd POSITION: Condiments (olive oil for finishing - if necessary)
   4th POSITION: Fruit/Dessert (if applicable)
   5th POSITION (LAST): Beverage (ALWAYS last - never before!)
   
   ✅ CORRECT: [Protein, Rice, Beans, Fruit, Beverage]
   ❌ WRONG: [Beverage, Protein, Rice] ← Beverage CANNOT be first!
   ❌ WRONG: [Protein, Beverage, Fruit] ← Beverage CANNOT come before fruit!

4️⃣ MANDATORY BEVERAGES FOR LUNCH AND DINNER:
   • Lunch/Dinner: ALWAYS include 1 ZERO beverage as LAST item:
     - ${regionalExamples.beverageExamples}
   • NEVER use juice as calorie source
   • Breakfast: coffee with milk, tea, or natural juice
   • Supper: calming teas (chamomile, etc.)

5️⃣ 🚨 CALORIC LIMITS BY MEAL TYPE (MANDATORY):
   • Breakfast: 300-450 kcal (never more than 500 kcal)
   • Morning snack: 80-200 kcal (MAX 250 kcal - it's a SNACK, not a meal!)
   • Lunch: 450-700 kcal (main meal)
   • Afternoon snack: 80-200 kcal (MAX 250 kcal - it's a SNACK, not a meal!)
   • Dinner: 400-650 kcal (main meal)
   • Supper: 50-180 kcal (MAX 200 kcal - light meal!)
   
   ⚠️ IF target_calories is HIGHER than max, IGNORE target and use max!
   ⚠️ Snacks with 600kcal are SERIOUS ERROR - they look like a full lunch!

6️⃣ SNACKS MUST BE APPETIZING AND SATISFYING:
   🚨 CRITICAL RULE: Snacks CANNOT be just raw vegetables without protein/fat!
   
   ❌ FORBIDDEN FOR SNACKS:
   • ${regionalExamples.badSnackExamples} ← BORING, not satisfying!
   • Raw vegetables alone without accompaniment
   
   ✅ CORRECT SNACKS (always have protein OR fat):
   • ${regionalExamples.goodSnackExamples}
   
   RULE: Snack = Fruit/Vegetable + Protein OR Healthy fat

7️⃣ FRUITS WITH CONTEXT:
   • Always specify: "1 medium banana (dessert)"
   • Never "mixed fruits" vaguely - specify WHICH fruits

8️⃣ SEASONINGS ARE NOT SEPARATE FOODS:
   • Lemon juice, olive oil, salt, pepper = SEASONINGS that go INSIDE the preparation
   • ❌ WRONG: "Lemon juice (15g)" as separate item
   • ✅ CORRECT: "Grilled chicken with lemon" (seasoning included in name)
   • Olive oil can appear separate ONLY for salad finishing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 FOODS FORMAT (foods array) - ABSOLUTE RULE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 CRITICAL RULE: SINGLE DISHES vs COMPOSED MEALS 🚨🚨🚨

▶️ TYPE 1 - SINGLE DISHES (CONSOLIDATE INTO 1 ITEM):
If the meal is: ${regionalExamples.consolidatedDishes}...

→ CONSOLIDATE ALL ingredients into 1 SINGLE item in the foods array!

✅ CORRECT: [{"name": "Lentil soup with vegetables", "grams": 350}]
✅ CORRECT: [{"name": "Egg white omelet with spinach and cheese", "grams": 180}]
✅ CORRECT: [{"name": "Caesar salad with grilled chicken", "grams": 280}]

❌ FORBIDDEN: 
[
  {"name": "Mashed tofu", "grams": 50},
  {"name": "Chopped sun-dried tomato", "grams": 20},
  {"name": "Salt", "grams": 2}
]
→ This is NOT a menu, it's a shopping list! SERIOUS ERROR!

▶️ TYPE 2 - COMPOSED MEAL (SEPARATE LIST):
If the meal is: Traditional lunch/dinner with Protein + Base + Side dish

→ LIST each component separately (served side by side, not mixed)

EXAMPLE for ${countryCode}:
${regionalExamples.lunch}

⚠️ SEPARATION RULES:
• Rice/Beans = always separate (served on the side)
• Dessert fruit = always separate
• Beverage = always separate (last item)
• Seasonings/condiments = NEVER separate (go INSIDE the dish name)

❌ NEVER DO (loose ingredients without context):
• {"name": "Mashed tofu", "grams": 50} → LOOSE! Where's the dish?
• {"name": "Salt", "grams": 2} → SEASONING! Not an item!
• {"name": "Olive oil", "grams": 5} → SEASONING! Not an item!
• {"name": "Chopped sun-dried tomato", "grams": 20} → LOOSE! Part of which dish?

ORDER IN foods ARRAY:
1. Main dish (consolidated OR protein of composed meal)
2. Side dishes (rice, beans - if composed meal)
3. Condiments (olive oil for finishing - ONLY if necessary)
4. Dessert fruit
5. Zero/optional beverage (lunch/dinner)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 INSTRUCTIONS FORMAT (instructions array) - HOW TO PREPARE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 Instructions teach HOW TO ASSEMBLE the dish, detailing the ingredients! 🚨

The "instructions" should explain HOW to prepare the dish, mentioning the ingredients
that make up the meal. It's a practical guide, NOT a formal recipe.

IDEAL INSTRUCTION STRUCTURE:
1️⃣ FIRST STEP: List ingredients with gram weights
2️⃣ SECOND STEP: Explain main preparation (how to cook/assemble)
3️⃣ THIRD STEP: Finishing touches and serving tips

⛔ FORBIDDEN INSTRUCTIONS (NEVER GENERATE):
• "Roll and ." → INCOMPLETE!
• "Add cinnamon." → TOO SHORT!
• "Mix everything." → VAGUE!
• Any instruction that DOESN'T mention the dish's ingredients!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 COMPLETE EXAMPLES (Use these as reference for ${countryCode}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☕ BREAKFAST:
${regionalExamples.breakfast}

🥐 MORNING SNACK:
${regionalExamples.snack}

🍽️ LUNCH:
${regionalExamples.lunch}

🌙 DINNER:
${regionalExamples.dinner}

🌙 SUPPER:
${regionalExamples.supper}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ERRORS I NEVER MAKE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Listing loose ingredients instead of consolidated dish
❌ Instructions that don't mention the dish's ingredients
❌ Soup + Rice separately (rice goes INSIDE if needed)
❌ Same protein for lunch and dinner
❌ "Mixed fruits" without specifying which
❌ Heavy protein at supper (max yogurt)
❌ Sugary beverage for diabetics
❌ Lemon juice/seasonings as separate item
❌ Caloric juice for lunch/dinner
❌ Instructions with only 1 short phrase (minimum 2-3 steps!)
❌ Title mentions ingredient NOT in foods
❌ Instructions mention ingredient NOT in foods

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 NUTRITIONAL TABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${nutritionalTablePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 RESPONSE (PURE JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "day": ${dayNumber},
  "day_name": "${dayName}",
  "meals": [${mealsJsonTemplate}
  ],
  "total_calories": ${dailyCalories}
}`
}
