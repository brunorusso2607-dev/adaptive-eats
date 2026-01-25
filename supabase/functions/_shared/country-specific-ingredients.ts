// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - COUNTRY-SPECIFIC INGREDIENTS
// Ingredientes únicos de cada país com sistema de substituição
// ═══════════════════════════════════════════════════════════════════════

import { MacroNutrients, I18nTranslation } from "./universal-ingredients-db.ts";

export interface CountrySpecificIngredient {
  id: string;
  country_code: string;
  category: string;
  macros: MacroNutrients;
  portion_default: number;
  allergens_dynamic: boolean;
  allergens_static?: string[];
  substitutes: Record<string, string>;  // Substitutos em outros países
  i18n: Record<string, I18nTranslation>;
}

// ═══════════════════════════════════════════════════════════════════════
// INGREDIENTES ESPECÍFICOS DO BRASIL
// ═══════════════════════════════════════════════════════════════════════

export const BR_SPECIFIC_INGREDIENTS: Record<string, CountrySpecificIngredient> = {
  requeijao: {
    id: "requeijao",
    country_code: "BR",
    category: "dairy",
    macros: { kcal: 180, prot: 10, carbs: 4, fat: 14, fiber: 0 },
    portion_default: 30,
    allergens_dynamic: true,
    allergens_static: ["lactose"],
    substitutes: {
      US: "cream_cheese",
      GB: "cream_cheese",
      FR: "fromage_frais",
      ES: "queso_crema",
      DE: "frischkase",
      IT: "formaggio_spalmabile",
      PT: "requeijao_pt",
      MX: "queso_crema",
      AR: "queso_crema",
      CL: "queso_crema",
      PE: "queso_crema"
    },
    i18n: {
      "pt-BR": { 
        name: "Requeijão",
        description: "Queijo cremoso brasileiro feito de soro de leite"
      },
      "en-US": { 
        name: "Brazilian cream cheese",
        description: "Creamy Brazilian cheese made from whey"
      },
      "es-ES": { 
        name: "Requesón brasileño",
        description: "Queso cremoso brasileño hecho de suero"
      }
    }
  },

  farofa: {
    id: "farofa",
    country_code: "BR",
    category: "carb",
    macros: { kcal: 365, prot: 1.5, carbs: 82, fat: 1.5, fiber: 3 },
    portion_default: 50,
    allergens_dynamic: true,
    allergens_static: [],
    substitutes: {
      US: "breadcrumbs",
      GB: "breadcrumbs",
      FR: "chapelure",
      ES: "pan_rallado",
      DE: "semmelbrosel",
      IT: "pangrattato",
      PT: "migas",
      MX: "pan_molido",
      AR: "pan_rallado",
      CL: "pan_rallado",
      PE: "pan_molido"
    },
    i18n: {
      "pt-BR": { 
        name: "Farofa",
        description: "Farinha de mandioca torrada, acompanhamento tradicional brasileiro"
      },
      "en-US": { 
        name: "Toasted cassava flour",
        description: "Traditional Brazilian side dish made from toasted cassava flour"
      },
      "es-ES": { 
        name: "Harina de yuca tostada",
        description: "Acompañamiento tradicional brasileño de harina de yuca tostada"
      }
    }
  },

  acai: {
    id: "acai",
    country_code: "BR",
    category: "fruit",
    macros: { kcal: 58, prot: 0.8, carbs: 6.2, fat: 3.9, fiber: 2.6 },
    portion_default: 100,
    allergens_dynamic: true,
    allergens_static: [],
    substitutes: {
      US: "blueberry",
      GB: "blueberry",
      FR: "myrtille",
      ES: "arandano",
      DE: "blaubeere",
      IT: "mirtillo",
      PT: "mirtilo",
      MX: "arandano",
      AR: "arandano",
      CL: "arandano",
      PE: "arandano"
    },
    i18n: {
      "pt-BR": { 
        name: "Açaí",
        description: "Fruta amazônica rica em antioxidantes"
      },
      "en-US": { 
        name: "Açaí",
        description: "Amazonian fruit rich in antioxidants"
      },
      "es-ES": { 
        name: "Açaí",
        description: "Fruta amazónica rica en antioxidantes"
      }
    }
  },

  pao_queijo: {
    id: "pao_queijo",
    country_code: "BR",
    category: "carb",
    macros: { kcal: 264, prot: 6.5, carbs: 27, fat: 14, fiber: 0.5 },
    portion_default: 50,
    allergens_dynamic: true,
    allergens_static: ["lactose"],
    substitutes: {
      US: "cheese_bread",
      GB: "cheese_scone",
      FR: "gougere",
      ES: "pan_queso",
      DE: "kasebrotchen",
      IT: "pane_formaggio",
      PT: "pao_queijo",
      MX: "pan_queso",
      AR: "pan_queso",
      CL: "pan_queso",
      PE: "pan_queso"
    },
    i18n: {
      "pt-BR": { 
        name: "Pão de queijo",
        description: "Pão tradicional brasileiro feito com polvilho e queijo"
      },
      "en-US": { 
        name: "Brazilian cheese bread",
        description: "Traditional Brazilian bread made with tapioca flour and cheese"
      },
      "es-ES": { 
        name: "Pan de queso brasileño",
        description: "Pan tradicional brasileño hecho con almidón de yuca y queso"
      }
    }
  },

  cuscuz_nordestino: {
    id: "cuscuz_nordestino",
    country_code: "BR",
    category: "carb",
    macros: { kcal: 112, prot: 2.4, carbs: 24.2, fat: 0.5, fiber: 1.2 },
    portion_default: 100,
    allergens_dynamic: true,
    allergens_static: [],
    substitutes: {
      US: "polenta",
      GB: "polenta",
      FR: "polenta",
      ES: "polenta",
      DE: "polenta",
      IT: "polenta",
      PT: "polenta",
      MX: "polenta",
      AR: "polenta",
      CL: "polenta",
      PE: "polenta"
    },
    i18n: {
      "pt-BR": { 
        name: "Cuscuz nordestino",
        description: "Prato tradicional do Nordeste brasileiro feito com fubá"
      },
      "en-US": { 
        name: "Brazilian couscous",
        description: "Traditional northeastern Brazilian dish made with cornmeal"
      },
      "es-ES": { 
        name: "Cuscús brasileño",
        description: "Plato tradicional del noreste brasileño hecho con harina de maíz"
      }
    }
  },

  mandioca: {
    id: "mandioca",
    country_code: "BR",
    category: "carb",
    macros: { kcal: 125, prot: 0.6, carbs: 30.1, fat: 0.3, fiber: 1.6 },
    portion_default: 150,
    allergens_dynamic: true,
    allergens_static: [],
    substitutes: {
      US: "potato",
      GB: "potato",
      FR: "pomme_terre",
      ES: "papa",
      DE: "kartoffel",
      IT: "patata",
      PT: "batata",
      MX: "papa",
      AR: "papa",
      CL: "papa",
      PE: "yuca"  // Peru tem yuca também
    },
    i18n: {
      "pt-BR": { 
        name: "Mandioca cozida",
        description: "Raiz tradicional brasileira, também conhecida como aipim ou macaxeira"
      },
      "en-US": { 
        name: "Boiled cassava",
        description: "Traditional Brazilian root, also known as yuca"
      },
      "es-ES": { 
        name: "Yuca cocida",
        description: "Raíz tradicional brasileña, también conocida como mandioca"
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════
// INGREDIENTES ESPECÍFICOS DOS EUA
// ═══════════════════════════════════════════════════════════════════════

export const US_SPECIFIC_INGREDIENTS: Record<string, CountrySpecificIngredient> = {
  cream_cheese: {
    id: "cream_cheese",
    country_code: "US",
    category: "dairy",
    macros: { kcal: 342, prot: 5.9, carbs: 5.5, fat: 34, fiber: 0 },
    portion_default: 30,
    allergens_dynamic: true,
    allergens_static: ["lactose"],
    substitutes: {
      BR: "requeijao",
      PT: "requeijao_pt",
      ES: "queso_crema",
      FR: "fromage_frais",
      DE: "frischkase",
      IT: "formaggio_spalmabile",
      MX: "queso_crema",
      AR: "queso_crema",
      CL: "queso_crema",
      PE: "queso_crema",
      GB: "cream_cheese"
    },
    i18n: {
      "en-US": { 
        name: "Cream cheese",
        description: "Soft, mild-tasting cheese with a smooth texture"
      },
      "pt-BR": { 
        name: "Cream cheese",
        description: "Queijo cremoso americano, similar ao requeijão"
      },
      "es-ES": { 
        name: "Queso crema",
        description: "Queso suave y cremoso de textura lisa"
      }
    }
  },

  bagel: {
    id: "bagel",
    country_code: "US",
    category: "carb",
    macros: { kcal: 257, prot: 10, carbs: 50, fat: 1.7, fiber: 2.1 },
    portion_default: 90,
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    substitutes: {
      BR: "pao_frances",
      PT: "papo_seco",
      ES: "panecillo",
      FR: "petit_pain",
      DE: "brotchen",
      IT: "panino",
      MX: "bolillo",
      AR: "pan_frances",
      CL: "pan_frances",
      PE: "pan_frances",
      GB: "bread_roll"
    },
    i18n: {
      "en-US": { 
        name: "Bagel",
        description: "Ring-shaped bread roll with a dense, chewy interior"
      },
      "pt-BR": { 
        name: "Bagel",
        description: "Pão americano em formato de anel, denso e mastigável"
      },
      "es-ES": { 
        name: "Bagel",
        description: "Pan en forma de anillo con interior denso y masticable"
      }
    }
  },

  pancakes: {
    id: "pancakes",
    country_code: "US",
    category: "carb",
    macros: { kcal: 227, prot: 6.4, carbs: 28, fat: 10, fiber: 0.9 },
    portion_default: 100,
    allergens_dynamic: true,
    allergens_static: ["gluten", "lactose", "ovo"],
    substitutes: {
      BR: "panqueca",
      PT: "panqueca",
      ES: "tortita",
      FR: "crepe",
      DE: "pfannkuchen",
      IT: "pancake",
      MX: "hotcake",
      AR: "panqueque",
      CL: "panqueque",
      PE: "panqueque",
      GB: "pancake"
    },
    i18n: {
      "en-US": { 
        name: "Pancakes",
        description: "Flat cakes made from batter and cooked on a griddle"
      },
      "pt-BR": { 
        name: "Panquecas americanas",
        description: "Bolinhos achatados feitos de massa e cozidos em chapa"
      },
      "es-ES": { 
        name: "Tortitas americanas",
        description: "Tortas planas hechas de masa y cocidas en plancha"
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════
// MAPA CONSOLIDADO DE TODOS OS INGREDIENTES ESPECÍFICOS
// ═══════════════════════════════════════════════════════════════════════

export const COUNTRY_SPECIFIC_INGREDIENTS: Record<string, Record<string, CountrySpecificIngredient>> = {
  BR: BR_SPECIFIC_INGREDIENTS,
  US: US_SPECIFIC_INGREDIENTS,
  // Adicionar outros países conforme necessário
};

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

export function getCountrySpecificIngredient(
  ingredientId: string,
  countryCode: string
): CountrySpecificIngredient | null {
  const countryIngredients = COUNTRY_SPECIFIC_INGREDIENTS[countryCode];
  return countryIngredients?.[ingredientId] || null;
}

export function getSubstituteIngredient(
  ingredientId: string,
  fromCountry: string,
  toCountry: string
): string | null {
  const ingredient = getCountrySpecificIngredient(ingredientId, fromCountry);
  if (!ingredient) return null;
  
  return ingredient.substitutes[toCountry] || null;
}

export function getAllIngredientsForCountry(countryCode: string): CountrySpecificIngredient[] {
  const countryIngredients = COUNTRY_SPECIFIC_INGREDIENTS[countryCode];
  return countryIngredients ? Object.values(countryIngredients) : [];
}

export function isIngredientAvailableInCountry(
  ingredientId: string,
  countryCode: string
): boolean {
  return getCountrySpecificIngredient(ingredientId, countryCode) !== null;
}

