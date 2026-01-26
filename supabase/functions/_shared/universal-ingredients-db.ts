// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - UNIVERSAL INGREDIENTS DATABASE (i18n)
// Sistema global com suporte a múltiplos idiomas e países
// ═══════════════════════════════════════════════════════════════════════

export interface I18nTranslation {
  name: string;
  description?: string;
}

export interface MacroNutrients {
  kcal: number;
  prot: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface UniversalIngredient {
  id: string;                                    // ID universal (ex: "chicken_breast")
  category: string;                              // protein, carb, vegetable, fruit, dairy, beverage, fat
  macros: MacroNutrients;                        // Macros por 100g (padrão TACO/TBCA)
  portion_default: number;                       // Porção padrão em gramas
  countries: string[];                           // Países onde o ingrediente existe
  regional?: boolean;                            // Se true, ingrediente é regional (não universal)
  allergens_dynamic: boolean;                    // Se true, busca alérgenos do Safety Engine
  allergens_static?: string[];                   // Alérgenos fixos (fallback)
  i18n: Record<string, I18nTranslation>;        // Traduções por locale (pt-BR, en-US, etc)
}

// ═══════════════════════════════════════════════════════════════════════
// INGREDIENTES UNIVERSAIS (existem em todos os países)
// ═══════════════════════════════════════════════════════════════════════

export const UNIVERSAL_INGREDIENTS: Record<string, UniversalIngredient> = {
  // ============= PROTEÍNAS - AVES =============
  chicken_breast: {
    id: "chicken_breast",
    category: "protein",
    macros: { kcal: 159, prot: 32, carbs: 0, fat: 3.2, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Peito de frango grelhado" },
      "en-US": { name: "Grilled chicken breast" },
      "es-ES": { name: "Pechuga de pollo a la plancha" },
      "fr-FR": { name: "Blanc de poulet grillé" },
      "de-DE": { name: "Gegrillte Hähnchenbrust" },
      "it-IT": { name: "Petto di pollo alla griglia" }
    }
  },

  chicken_thigh: {
    id: "chicken_thigh",
    category: "protein",
    macros: { kcal: 185, prot: 26, carbs: 0, fat: 8.5, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Coxa de frango assada" },
      "en-US": { name: "Baked chicken thigh" },
      "es-ES": { name: "Muslo de pollo al horno" },
      "fr-FR": { name: "Cuisse de poulet rôtie" },
      "de-DE": { name: "Gebackener Hähnchenoberschenkel" },
      "it-IT": { name: "Coscia di pollo al forno" }
    }
  },

  shredded_chicken: {
    id: "shredded_chicken",
    category: "protein",
    macros: { kcal: 159, prot: 32, carbs: 0, fat: 3.2, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Frango desfiado" },
      "en-US": { name: "Shredded chicken" },
      "es-ES": { name: "Pollo deshebrado" },
      "fr-FR": { name: "Poulet effiloché" },
      "de-DE": { name: "Zerkleinertes Hähnchen" },
      "it-IT": { name: "Pollo sfilacciato" }
    }
  },

  // ============= PROTEÍNAS - CARNES BOVINAS =============
  sirloin_steak: {
    id: "sirloin_steak",
    category: "protein",
    macros: { kcal: 163, prot: 26, carbs: 0, fat: 6, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Bife de alcatra grelhado" },
      "en-US": { name: "Grilled sirloin steak" },
      "es-ES": { name: "Filete de solomillo a la plancha" },
      "fr-FR": { name: "Steak d'aloyau grillé" },
      "de-DE": { name: "Gegrilltes Lendensteak" },
      "it-IT": { name: "Bistecca di controfiletto alla griglia" }
    }
  },

  ground_beef: {
    id: "ground_beef",
    category: "protein",
    macros: { kcal: 215, prot: 21, carbs: 2, fat: 14, fiber: 0.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Carne moída refogada" },
      "en-US": { name: "Sautéed ground beef" },
      "es-ES": { name: "Carne picada salteada" },
      "fr-FR": { name: "Viande hachée sautée" },
      "de-DE": { name: "Gebratenes Hackfleisch" },
      "it-IT": { name: "Carne macinata saltata" }
    }
  },

  filet_mignon: {
    id: "filet_mignon",
    category: "protein",
    macros: { kcal: 155, prot: 28, carbs: 0, fat: 4.5, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Filé mignon grelhado" },
      "en-US": { name: "Grilled filet mignon" },
      "es-ES": { name: "Filete mignon a la plancha" },
      "fr-FR": { name: "Filet mignon grillé" },
      "de-DE": { name: "Gegrilltes Filet Mignon" },
      "it-IT": { name: "Filetto alla griglia" }
    }
  },

  // ============= PROTEÍNAS - PEIXES =============
  tilapia: {
    id: "tilapia",
    category: "protein",
    macros: { kcal: 96, prot: 20, carbs: 0, fat: 1.7, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Tilápia grelhada" },
      "en-US": { name: "Grilled tilapia" },
      "es-ES": { name: "Tilapia a la plancha" },
      "fr-FR": { name: "Tilapia grillé" },
      "de-DE": { name: "Gegrillte Tilapia" },
      "it-IT": { name: "Tilapia alla griglia" }
    }
  },

  salmon: {
    id: "salmon",
    category: "protein",
    macros: { kcal: 208, prot: 20, carbs: 0, fat: 13, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Salmão grelhado" },
      "en-US": { name: "Grilled salmon" },
      "es-ES": { name: "Salmón a la plancha" },
      "fr-FR": { name: "Saumon grillé" },
      "de-DE": { name: "Gegrillter Lachs" },
      "it-IT": { name: "Salmone alla griglia" }
    }
  },

  merluza: {
    id: "merluza",
    category: "protein",
    macros: { kcal: 82, prot: 18, carbs: 0, fat: 0.8, fiber: 0 },
    portion_default: 150,
    countries: ["BR", "PT", "ES", "AR", "CL", "PE"],
    allergens_dynamic: true,
    allergens_static: ["peixe"],
    i18n: {
      "pt-BR": { name: "Merluza assada" },
      "en-US": { name: "Baked hake" },
      "es-ES": { name: "Merluza al horno" }
    }
  },

  pescada: {
    id: "pescada",
    category: "protein",
    macros: { kcal: 89, prot: 19, carbs: 0, fat: 1.2, fiber: 0 },
    portion_default: 150,
    countries: ["BR", "PT"],
    allergens_dynamic: true,
    allergens_static: ["peixe"],
    i18n: {
      "pt-BR": { name: "Pescada grelhada" },
      "en-US": { name: "Grilled whiting" },
      "es-ES": { name: "Pescadilla a la plancha" }
    }
  },

  // ============= PROTEÍNAS - OVOS =============
  scrambled_eggs: {
    id: "scrambled_eggs",
    category: "protein",
    macros: { kcal: 155, prot: 13, carbs: 1.1, fat: 11, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["ovo"],
    i18n: {
      "pt-BR": { name: "Ovos mexidos" },
      "en-US": { name: "Scrambled eggs" },
      "es-ES": { name: "Huevos revueltos" },
      "fr-FR": { name: "Œufs brouillés" },
      "de-DE": { name: "Rührei" },
      "it-IT": { name: "Uova strapazzate" }
    }
  },

  boiled_egg: {
    id: "boiled_egg",
    category: "protein",
    macros: { kcal: 155, prot: 13, carbs: 1.1, fat: 11, fiber: 0 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["ovo"],
    i18n: {
      "pt-BR": { name: "Ovo cozido" },
      "en-US": { name: "Boiled egg" },
      "es-ES": { name: "Huevo cocido" },
      "fr-FR": { name: "Œuf dur" },
      "de-DE": { name: "Gekochtes Ei" },
      "it-IT": { name: "Uovo sodo" }
    }
  },

  // ============= CARBOIDRATOS - ARROZ =============
  white_rice: {
    id: "white_rice",
    category: "carb",
    macros: { kcal: 128, prot: 2.5, carbs: 28.2, fat: 0.2, fiber: 0.3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Arroz branco" },
      "en-US": { name: "White rice" },
      "es-ES": { name: "Arroz blanco" },
      "fr-FR": { name: "Riz blanc" },
      "de-DE": { name: "Weißer Reis" },
      "it-IT": { name: "Riso bianco" }
    }
  },

  brown_rice: {
    id: "brown_rice",
    category: "carb",
    macros: { kcal: 112, prot: 2.6, carbs: 23.5, fat: 0.9, fiber: 1.7 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Arroz integral" },
      "en-US": { name: "Brown rice" },
      "es-ES": { name: "Arroz integral" },
      "fr-FR": { name: "Riz complet" },
      "de-DE": { name: "Vollkornreis" },
      "it-IT": { name: "Riso integrale" }
    }
  },

  parboiled_rice: {
    id: "parboiled_rice",
    category: "carb",
    macros: { kcal: 123, prot: 2.5, carbs: 27.8, fat: 0.3, fiber: 0.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Arroz parboilizado" },
      "en-US": { name: "Parboiled rice" },
      "es-ES": { name: "Arroz vaporizado" },
      "fr-FR": { name: "Riz étuvé" },
      "de-DE": { name: "Parboiled Reis" },
      "it-IT": { name: "Riso parboiled" }
    }
  },

  // ============= CARBOIDRATOS - BATATAS =============
  sweet_potato: {
    id: "sweet_potato",
    category: "carb",
    macros: { kcal: 77, prot: 0.6, carbs: 18.4, fat: 0.1, fiber: 2.4 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Batata-doce cozida" },
      "en-US": { name: "Boiled sweet potato" },
      "es-ES": { name: "Batata cocida" },
      "fr-FR": { name: "Patate douce bouillie" },
      "de-DE": { name: "Gekochte Süßkartoffel" },
      "it-IT": { name: "Patata dolce bollita" }
    }
  },

  // ============= VEGETAIS =============
  broccoli: {
    id: "broccoli",
    category: "vegetable",
    macros: { kcal: 25, prot: 2.4, carbs: 4.4, fat: 0.4, fiber: 2.3 },
    portion_default: 80,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Brócolis cozido" },
      "en-US": { name: "Boiled broccoli" },
      "es-ES": { name: "Brócoli cocido" },
      "fr-FR": { name: "Brocoli bouilli" },
      "de-DE": { name: "Gekochter Brokkoli" },
      "it-IT": { name: "Broccoli bolliti" }
    }
  },

  lettuce: {
    id: "lettuce",
    category: "vegetable",
    macros: { kcal: 15, prot: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Alface" },
      "en-US": { name: "Lettuce" },
      "es-ES": { name: "Lechuga" },
      "fr-FR": { name: "Laitue" },
      "de-DE": { name: "Kopfsalat" },
      "it-IT": { name: "Lattuga" }
    }
  },

  tomato: {
    id: "tomato",
    category: "vegetable",
    macros: { kcal: 15, prot: 1.1, carbs: 3.1, fat: 0.2, fiber: 1.2 },
    portion_default: 80,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Tomate" },
      "en-US": { name: "Tomato" },
      "es-ES": { name: "Tomate" },
      "fr-FR": { name: "Tomate" },
      "de-DE": { name: "Tomate" },
      "it-IT": { name: "Pomodoro" }
    }
  },

  // ============= FRUTAS =============
  banana: {
    id: "banana",
    category: "fruit",
    macros: { kcal: 89, prot: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Banana prata" },
      "en-US": { name: "Banana" },
      "es-ES": { name: "Plátano" },
      "fr-FR": { name: "Banane" },
      "de-DE": { name: "Banane" },
      "it-IT": { name: "Banana" }
    }
  },

  apple: {
    id: "apple",
    category: "fruit",
    macros: { kcal: 52, prot: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
    portion_default: 130,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Maçã vermelha" },
      "en-US": { name: "Red apple" },
      "es-ES": { name: "Manzana roja" },
      "fr-FR": { name: "Pomme rouge" },
      "de-DE": { name: "Roter Apfel" },
      "it-IT": { name: "Mela rossa" }
    }
  },

  // ============= LATICÍNIOS =============
  plain_yogurt: {
    id: "plain_yogurt",
    category: "dairy",
    macros: { kcal: 61, prot: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose"],
    i18n: {
      "pt-BR": { name: "Iogurte natural" },
      "en-US": { name: "Plain yogurt" },
      "es-ES": { name: "Yogur natural" },
      "fr-FR": { name: "Yaourt nature" },
      "de-DE": { name: "Naturjoghurt" },
      "it-IT": { name: "Yogurt naturale" }
    }
  },

  skim_milk: {
    id: "skim_milk",
    category: "dairy",
    macros: { kcal: 35, prot: 3.4, carbs: 4.9, fat: 0.2, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose"],
    i18n: {
      "pt-BR": { name: "Leite desnatado" },
      "en-US": { name: "Skim milk" },
      "es-ES": { name: "Leche desnatada" },
      "fr-FR": { name: "Lait écrémé" },
      "de-DE": { name: "Magermilch" },
      "it-IT": { name: "Latte scremato" }
    }
  },

  // ============= BEBIDAS =============
  black_coffee: {
    id: "black_coffee",
    category: "beverage",
    macros: { kcal: 2, prot: 0.1, carbs: 0, fat: 0, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Café preto" },
      "en-US": { name: "Black coffee" },
      "es-ES": { name: "Café negro" },
      "fr-FR": { name: "Café noir" },
      "de-DE": { name: "Schwarzer Kaffee" },
      "it-IT": { name: "Caffè nero" }
    }
  },

  green_tea: {
    id: "green_tea",
    category: "beverage",
    macros: { kcal: 1, prot: 0, carbs: 0, fat: 0, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Chá verde" },
      "en-US": { name: "Green tea" },
      "es-ES": { name: "Té verde" },
      "fr-FR": { name: "Thé vert" },
      "de-DE": { name: "Grüner Tee" },
      "it-IT": { name: "Tè verde" }
    }
  },

  // ============= GORDURAS =============
  olive_oil: {
    id: "olive_oil",
    category: "fat",
    macros: { kcal: 884, prot: 0, carbs: 0, fat: 100, fiber: 0 },
    portion_default: 10,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Azeite de oliva" },
      "en-US": { name: "Olive oil" },
      "es-ES": { name: "Aceite de oliva" },
      "fr-FR": { name: "Huile d'olive" },
      "de-DE": { name: "Olivenöl" },
      "it-IT": { name: "Olio d'oliva" }
    }
  },

  // ============= INGREDIENTES ADICIONAIS - BRASILEIROS =============
  tapioca: {
    id: "tapioca",
    category: "carb",
    macros: { kcal: 358, prot: 0.2, carbs: 88.7, fat: 0.02, fiber: 0.9 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Massa de tapioca" },
      "en-US": { name: "Tapioca dough" },
      "es-ES": { name: "Masa de tapioca" },
      "fr-FR": { name: "Pâte de tapioca" },
      "de-DE": { name: "Tapiokateig" },
      "it-IT": { name: "Pasta di tapioca" }
    }
  },

  black_beans: {
    id: "black_beans",
    category: "carb",
    macros: { kcal: 77, prot: 4.5, carbs: 14, fat: 0.5, fiber: 4.8 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Feijão preto cozido" },
      "en-US": { name: "Cooked black beans" },
      "es-ES": { name: "Frijoles negros cocidos" },
      "fr-FR": { name: "Haricots noirs cuits" },
      "de-DE": { name: "Gekochte schwarze Bohnen" },
      "it-IT": { name: "Fagioli neri cotti" }
    }
  },

  feijoada: {
    id: "feijoada",
    category: "protein",
    macros: { kcal: 150, prot: 12, carbs: 8, fat: 8, fiber: 3 },
    portion_default: 300,
    countries: ["BR", "PT"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Feijoada completa" },
      "en-US": { name: "Brazilian feijoada" },
      "es-ES": { name: "Feijoada brasileña" },
      "fr-FR": { name: "Feijoada brésilienne" },
      "de-DE": { name: "Brasilianische Feijoada" },
      "it-IT": { name: "Feijoada brasiliana" }
    }
  },

  // ============= INGREDIENTES ADICIONAIS - AMERICANOS =============
  bacon: {
    id: "bacon",
    category: "protein",
    macros: { kcal: 541, prot: 37, carbs: 1.4, fat: 42, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Bacon frito" },
      "en-US": { name: "Fried bacon" },
      "es-ES": { name: "Tocino frito" },
      "fr-FR": { name: "Bacon frit" },
      "de-DE": { name: "Gebratener Speck" },
      "it-IT": { name: "Pancetta fritta" }
    }
  },

  maple_syrup: {
    id: "maple_syrup",
    category: "carb",
    macros: { kcal: 260, prot: 0, carbs: 67, fat: 0.2, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Xarope de bordo" },
      "en-US": { name: "Maple syrup" },
      "es-ES": { name: "Jarabe de arce" },
      "fr-FR": { name: "Sirop d'érable" },
      "de-DE": { name: "Ahornsirup" },
      "it-IT": { name: "Sciroppo d'acero" }
    }
  },

  oatmeal: {
    id: "oatmeal",
    category: "carb",
    macros: { kcal: 68, prot: 2.4, carbs: 12, fat: 1.4, fiber: 1.7 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Aveia cozida" },
      "en-US": { name: "Cooked oatmeal" },
      "es-ES": { name: "Avena cocida" },
      "fr-FR": { name: "Flocons d'avoine cuits" },
      "de-DE": { name: "Gekochter Haferbrei" },
      "it-IT": { name: "Avena cotta" }
    }
  },

  burger_patty: {
    id: "burger_patty",
    category: "protein",
    macros: { kcal: 250, prot: 17, carbs: 0, fat: 20, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Hambúrguer de carne" },
      "en-US": { name: "Beef burger patty" },
      "es-ES": { name: "Hamburguesa de carne" },
      "fr-FR": { name: "Steak haché" },
      "de-DE": { name: "Rindfleisch-Burger" },
      "it-IT": { name: "Hamburger di manzo" }
    }
  },

  burger_bun: {
    id: "burger_bun",
    category: "carb",
    macros: { kcal: 264, prot: 8.7, carbs: 49, fat: 3.5, fiber: 2.4 },
    portion_default: 60,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Pão de hambúrguer" },
      "en-US": { name: "Burger bun" },
      "es-ES": { name: "Pan de hamburguesa" },
      "fr-FR": { name: "Pain à hamburger" },
      "de-DE": { name: "Burgerbrötchen" },
      "it-IT": { name: "Panino per hamburger" }
    }
  },

  sweet_potato_fries: {
    id: "sweet_potato_fries",
    category: "carb",
    macros: { kcal: 140, prot: 1.6, carbs: 23, fat: 4.7, fiber: 3.3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Batata-doce frita" },
      "en-US": { name: "Sweet potato fries" },
      "es-ES": { name: "Papas fritas de batata" },
      "fr-FR": { name: "Frites de patate douce" },
      "de-DE": { name: "Süßkartoffel-Pommes" },
      "it-IT": { name: "Patatine di patata dolce" }
    }
  },

  turkey_breast: {
    id: "turkey_breast",
    category: "protein",
    macros: { kcal: 135, prot: 30, carbs: 0, fat: 0.7, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Peito de peru" },
      "en-US": { name: "Turkey breast" },
      "es-ES": { name: "Pechuga de pavo" },
      "fr-FR": { name: "Blanc de dinde" },
      "de-DE": { name: "Putenbrust" },
      "it-IT": { name: "Petto di tacchino" }
    }
  },

  whole_wheat_bread: {
    id: "whole_wheat_bread",
    category: "carb",
    macros: { kcal: 247, prot: 13, carbs: 41, fat: 3.4, fiber: 6.9 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Pão integral" },
      "en-US": { name: "Whole wheat bread" },
      "es-ES": { name: "Pan integral" },
      "fr-FR": { name: "Pain complet" },
      "de-DE": { name: "Vollkornbrot" },
      "it-IT": { name: "Pane integrale" }
    }
  },

  baked_potato: {
    id: "baked_potato",
    category: "carb",
    macros: { kcal: 93, prot: 2.5, carbs: 21, fat: 0.1, fiber: 2.2 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Batata assada" },
      "en-US": { name: "Baked potato" },
      "es-ES": { name: "Papa al horno" },
      "fr-FR": { name: "Pomme de terre au four" },
      "de-DE": { name: "Ofenkartoffel" },
      "it-IT": { name: "Patata al forno" }
    }
  },

  blueberries: {
    id: "blueberries",
    category: "fruit",
    macros: { kcal: 57, prot: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Mirtilos" },
      "en-US": { name: "Blueberries" },
      "es-ES": { name: "Arándanos" },
      "fr-FR": { name: "Myrtilles" },
      "de-DE": { name: "Blaubeeren" },
      "it-IT": { name: "Mirtilli" }
    }
  },

  // ============= FASE 1: PROTEÍNAS E LATICÍNIOS (25 NOVOS) =============
  cottage_cheese: {
    id: "cottage_cheese",
    category: "protein",
    macros: { kcal: 98, prot: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo cottage" },
      "en-US": { name: "Cottage cheese" },
      "es-ES": { name: "Queso cottage" },
      "fr-FR": { name: "Fromage cottage" },
      "de-DE": { name: "Hüttenkäse" },
      "it-IT": { name: "Formaggio cottage" }
    }
  },

  greek_yogurt: {
    id: "greek_yogurt",
    category: "dairy",
    macros: { kcal: 59, prot: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Iogurte grego natural" },
      "en-US": { name: "Greek yogurt" },
      "es-ES": { name: "Yogur griego" },
      "fr-FR": { name: "Yaourt grec" },
      "de-DE": { name: "Griechischer Joghurt" },
      "it-IT": { name: "Yogurt greco" }
    }
  },

  ham: {
    id: "ham",
    category: "protein",
    macros: { kcal: 145, prot: 21, carbs: 1.5, fat: 6, fiber: 0 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Presunto" },
      "en-US": { name: "Ham" },
      "es-ES": { name: "Jamón" },
      "fr-FR": { name: "Jambon" },
      "de-DE": { name: "Schinken" },
      "it-IT": { name: "Prosciutto cotto" }
    }
  },

  canned_tuna: {
    id: "canned_tuna",
    category: "protein",
    macros: { kcal: 116, prot: 26, carbs: 0, fat: 0.8, fiber: 0 },
    portion_default: 80,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["fish"],
    i18n: {
      "pt-BR": { name: "Atum enlatado" },
      "en-US": { name: "Canned tuna" },
      "es-ES": { name: "Atún enlatado" },
      "fr-FR": { name: "Thon en conserve" },
      "de-DE": { name: "Thunfisch aus der Dose" },
      "it-IT": { name: "Tonno in scatola" }
    }
  },

  egg_white: {
    id: "egg_white",
    category: "protein",
    macros: { kcal: 52, prot: 11, carbs: 0.7, fat: 0.2, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["egg"],
    i18n: {
      "pt-BR": { name: "Clara de ovo" },
      "en-US": { name: "Egg white" },
      "es-ES": { name: "Clara de huevo" },
      "fr-FR": { name: "Blanc d'œuf" },
      "de-DE": { name: "Eiweiß" },
      "it-IT": { name: "Albume d'uovo" }
    }
  },

  tofu: {
    id: "tofu",
    category: "protein",
    macros: { kcal: 76, prot: 8, carbs: 1.9, fat: 4.8, fiber: 0.3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["soy"],
    i18n: {
      "pt-BR": { name: "Tofu" },
      "en-US": { name: "Tofu" },
      "es-ES": { name: "Tofu" },
      "fr-FR": { name: "Tofu" },
      "de-DE": { name: "Tofu" },
      "it-IT": { name: "Tofu" }
    }
  },

  chickpeas: {
    id: "chickpeas",
    category: "protein",
    macros: { kcal: 164, prot: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Grão-de-bico cozido" },
      "en-US": { name: "Cooked chickpeas" },
      "es-ES": { name: "Garbanzos cocidos" },
      "fr-FR": { name: "Pois chiches cuits" },
      "de-DE": { name: "Gekochte Kichererbsen" },
      "it-IT": { name: "Ceci cotti" }
    }
  },

  lentils: {
    id: "lentils",
    category: "protein",
    macros: { kcal: 116, prot: 9, carbs: 20, fat: 0.4, fiber: 7.9 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Lentilha cozida" },
      "en-US": { name: "Cooked lentils" },
      "es-ES": { name: "Lentejas cocidas" },
      "fr-FR": { name: "Lentilles cuites" },
      "de-DE": { name: "Gekochte Linsen" },
      "it-IT": { name: "Lenticchie cotte" }
    }
  },

  white_beans: {
    id: "white_beans",
    category: "protein",
    macros: { kcal: 139, prot: 9.7, carbs: 25, fat: 0.3, fiber: 6.3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Feijão branco cozido" },
      "en-US": { name: "Cooked white beans" },
      "es-ES": { name: "Alubias blancas cocidas" },
      "fr-FR": { name: "Haricots blancs cuits" },
      "de-DE": { name: "Gekochte weiße Bohnen" },
      "it-IT": { name: "Fagioli bianchi cotti" }
    }
  },

  shrimp: {
    id: "shrimp",
    category: "protein",
    macros: { kcal: 99, prot: 24, carbs: 0, fat: 0.3, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["shellfish"],
    i18n: {
      "pt-BR": { name: "Camarão" },
      "en-US": { name: "Shrimp" },
      "es-ES": { name: "Camarón" },
      "fr-FR": { name: "Crevette" },
      "de-DE": { name: "Garnele" },
      "it-IT": { name: "Gamberetto" }
    }
  },

  cod_fish: {
    id: "cod_fish",
    category: "protein",
    macros: { kcal: 82, prot: 18, carbs: 0, fat: 0.7, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["fish"],
    i18n: {
      "pt-BR": { name: "Bacalhau" },
      "en-US": { name: "Cod fish" },
      "es-ES": { name: "Bacalao" },
      "fr-FR": { name: "Morue" },
      "de-DE": { name: "Kabeljau" },
      "it-IT": { name: "Merluzzo" }
    }
  },

  sardines: {
    id: "sardines",
    category: "protein",
    macros: { kcal: 208, prot: 25, carbs: 0, fat: 11, fiber: 0 },
    portion_default: 80,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["fish"],
    i18n: {
      "pt-BR": { name: "Sardinha" },
      "en-US": { name: "Sardines" },
      "es-ES": { name: "Sardinas" },
      "fr-FR": { name: "Sardines" },
      "de-DE": { name: "Sardinen" },
      "it-IT": { name: "Sardine" }
    }
  },

  beef_liver: {
    id: "beef_liver",
    category: "protein",
    macros: { kcal: 135, prot: 20, carbs: 3.9, fat: 3.6, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Fígado bovino" },
      "en-US": { name: "Beef liver" },
      "es-ES": { name: "Hígado de res" },
      "fr-FR": { name: "Foie de bœuf" },
      "de-DE": { name: "Rinderleber" },
      "it-IT": { name: "Fegato di manzo" }
    }
  },

  pork_loin: {
    id: "pork_loin",
    category: "protein",
    macros: { kcal: 143, prot: 21, carbs: 0, fat: 6, fiber: 0 },
    portion_default: 120,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Lombo suíno" },
      "en-US": { name: "Pork loin" },
      "es-ES": { name: "Lomo de cerdo" },
      "fr-FR": { name: "Filet de porc" },
      "de-DE": { name: "Schweinelende" },
      "it-IT": { name: "Lombo di maiale" }
    }
  },

  whole_milk: {
    id: "whole_milk",
    category: "dairy",
    macros: { kcal: 61, prot: 3.2, carbs: 4.6, fat: 3.2, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Leite integral" },
      "en-US": { name: "Whole milk" },
      "es-ES": { name: "Leche entera" },
      "fr-FR": { name: "Lait entier" },
      "de-DE": { name: "Vollmilch" },
      "it-IT": { name: "Latte intero" }
    }
  },

  low_fat_milk: {
    id: "low_fat_milk",
    category: "dairy",
    macros: { kcal: 42, prot: 3.4, carbs: 5, fat: 1, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Leite semidesnatado" },
      "en-US": { name: "Low-fat milk" },
      "es-ES": { name: "Leche semidesnatada" },
      "fr-FR": { name: "Lait demi-écrémé" },
      "de-DE": { name: "Fettarme Milch" },
      "it-IT": { name: "Latte parzialmente scremato" }
    }
  },

  white_cheese: {
    id: "white_cheese",
    category: "dairy",
    macros: { kcal: 264, prot: 17.4, carbs: 2.9, fat: 20.8, fiber: 0 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo branco" },
      "en-US": { name: "White cheese" },
      "es-ES": { name: "Queso blanco" },
      "fr-FR": { name: "Fromage blanc" },
      "de-DE": { name: "Weißkäse" },
      "it-IT": { name: "Formaggio bianco" }
    }
  },

  ricotta: {
    id: "ricotta",
    category: "dairy",
    macros: { kcal: 174, prot: 11.3, carbs: 3.4, fat: 13, fiber: 0 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Ricota" },
      "en-US": { name: "Ricotta" },
      "es-ES": { name: "Ricotta" },
      "fr-FR": { name: "Ricotta" },
      "de-DE": { name: "Ricotta" },
      "it-IT": { name: "Ricotta" }
    }
  },

  parmesan: {
    id: "parmesan",
    category: "dairy",
    macros: { kcal: 431, prot: 38, carbs: 4.1, fat: 29, fiber: 0 },
    portion_default: 20,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo parmesão" },
      "en-US": { name: "Parmesan cheese" },
      "es-ES": { name: "Queso parmesano" },
      "fr-FR": { name: "Parmesan" },
      "de-DE": { name: "Parmesan" },
      "it-IT": { name: "Parmigiano" }
    }
  },

  cheddar: {
    id: "cheddar",
    category: "dairy",
    macros: { kcal: 403, prot: 25, carbs: 1.3, fat: 33, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo cheddar" },
      "en-US": { name: "Cheddar cheese" },
      "es-ES": { name: "Queso cheddar" },
      "fr-FR": { name: "Cheddar" },
      "de-DE": { name: "Cheddar" },
      "it-IT": { name: "Cheddar" }
    }
  },

  brie: {
    id: "brie",
    category: "dairy",
    macros: { kcal: 334, prot: 21, carbs: 0.5, fat: 28, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo brie" },
      "en-US": { name: "Brie cheese" },
      "es-ES": { name: "Queso brie" },
      "fr-FR": { name: "Brie" },
      "de-DE": { name: "Brie" },
      "it-IT": { name: "Brie" }
    }
  },

  feta: {
    id: "feta",
    category: "dairy",
    macros: { kcal: 264, prot: 14, carbs: 4.1, fat: 21, fiber: 0 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo feta" },
      "en-US": { name: "Feta cheese" },
      "es-ES": { name: "Queso feta" },
      "fr-FR": { name: "Feta" },
      "de-DE": { name: "Feta" },
      "it-IT": { name: "Feta" }
    }
  },

  kefir: {
    id: "kefir",
    category: "dairy",
    macros: { kcal: 37, prot: 3.3, carbs: 3.8, fat: 1, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Kefir" },
      "en-US": { name: "Kefir" },
      "es-ES": { name: "Kéfir" },
      "fr-FR": { name: "Kéfir" },
      "de-DE": { name: "Kefir" },
      "it-IT": { name: "Kefir" }
    }
  },

  sour_cream: {
    id: "sour_cream",
    category: "dairy",
    macros: { kcal: 193, prot: 2.4, carbs: 4.3, fat: 19, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Creme de leite azedo" },
      "en-US": { name: "Sour cream" },
      "es-ES": { name: "Crema agria" },
      "fr-FR": { name: "Crème aigre" },
      "de-DE": { name: "Sauerrahm" },
      "it-IT": { name: "Panna acida" }
    }
  },

  // ============= FASE 2: CARBOIDRATOS (20 NOVOS) =============
  pasta: {
    id: "pasta",
    category: "carb",
    macros: { kcal: 131, prot: 5, carbs: 25, fat: 1.1, fiber: 1.8 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Macarrão cozido" },
      "en-US": { name: "Cooked pasta" },
      "es-ES": { name: "Pasta cocida" },
      "fr-FR": { name: "Pâtes cuites" },
      "de-DE": { name: "Gekochte Nudeln" },
      "it-IT": { name: "Pasta cotta" }
    }
  },

  whole_wheat_pasta: {
    id: "whole_wheat_pasta",
    category: "carb",
    macros: { kcal: 124, prot: 5.3, carbs: 26.5, fat: 0.5, fiber: 3.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Macarrão integral cozido" },
      "en-US": { name: "Whole wheat pasta" },
      "es-ES": { name: "Pasta integral" },
      "fr-FR": { name: "Pâtes complètes" },
      "de-DE": { name: "Vollkornnudeln" },
      "it-IT": { name: "Pasta integrale" }
    }
  },

  quinoa: {
    id: "quinoa",
    category: "carb",
    macros: { kcal: 120, prot: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Quinoa cozida" },
      "en-US": { name: "Cooked quinoa" },
      "es-ES": { name: "Quinoa cocida" },
      "fr-FR": { name: "Quinoa cuit" },
      "de-DE": { name: "Gekochte Quinoa" },
      "it-IT": { name: "Quinoa cotta" }
    }
  },

  couscous: {
    id: "couscous",
    category: "carb",
    macros: { kcal: 112, prot: 3.8, carbs: 23.2, fat: 0.2, fiber: 1.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Cuscuz marroquino" },
      "en-US": { name: "Couscous" },
      "es-ES": { name: "Cuscús" },
      "fr-FR": { name: "Couscous" },
      "de-DE": { name: "Couscous" },
      "it-IT": { name: "Cuscus" }
    }
  },

  white_bread: {
    id: "white_bread",
    category: "carb",
    macros: { kcal: 265, prot: 9, carbs: 49, fat: 3.2, fiber: 2.7 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Pão branco" },
      "en-US": { name: "White bread" },
      "es-ES": { name: "Pan blanco" },
      "fr-FR": { name: "Pain blanc" },
      "de-DE": { name: "Weißbrot" },
      "it-IT": { name: "Pane bianco" }
    }
  },

  sourdough_bread: {
    id: "sourdough_bread",
    category: "carb",
    macros: { kcal: 260, prot: 8.5, carbs: 48, fat: 3.5, fiber: 2.4 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Pão de fermentação natural" },
      "en-US": { name: "Sourdough bread" },
      "es-ES": { name: "Pan de masa madre" },
      "fr-FR": { name: "Pain au levain" },
      "de-DE": { name: "Sauerteigbrot" },
      "it-IT": { name: "Pane a lievitazione naturale" }
    }
  },

  pita_bread: {
    id: "pita_bread",
    category: "carb",
    macros: { kcal: 275, prot: 9.1, carbs: 55.7, fat: 1.2, fiber: 2.2 },
    portion_default: 60,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Pão sírio" },
      "en-US": { name: "Pita bread" },
      "es-ES": { name: "Pan de pita" },
      "fr-FR": { name: "Pain pita" },
      "de-DE": { name: "Pitabrot" },
      "it-IT": { name: "Pane pita" }
    }
  },

  tortilla: {
    id: "tortilla",
    category: "carb",
    macros: { kcal: 218, prot: 5.7, carbs: 36.4, fat: 5.6, fiber: 2.4 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Tortilha" },
      "en-US": { name: "Tortilla" },
      "es-ES": { name: "Tortilla" },
      "fr-FR": { name: "Tortilla" },
      "de-DE": { name: "Tortilla" },
      "it-IT": { name: "Tortilla" }
    }
  },

  crackers: {
    id: "crackers",
    category: "carb",
    macros: { kcal: 432, prot: 10.6, carbs: 71.3, fat: 10.2, fiber: 2.5 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Biscoito cream cracker" },
      "en-US": { name: "Crackers" },
      "es-ES": { name: "Galletas saladas" },
      "fr-FR": { name: "Crackers" },
      "de-DE": { name: "Cracker" },
      "it-IT": { name: "Cracker" }
    }
  },

  rice_crackers: {
    id: "rice_crackers",
    category: "carb",
    macros: { kcal: 387, prot: 7.5, carbs: 81.5, fat: 2.9, fiber: 4 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Biscoito de arroz" },
      "en-US": { name: "Rice crackers" },
      "es-ES": { name: "Galletas de arroz" },
      "fr-FR": { name: "Galettes de riz" },
      "de-DE": { name: "Reiscracker" },
      "it-IT": { name: "Gallette di riso" }
    }
  },

  granola: {
    id: "granola",
    category: "carb",
    macros: { kcal: 471, prot: 13.7, carbs: 64.7, fat: 16.1, fiber: 6.5 },
    portion_default: 40,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten", "nuts"],
    i18n: {
      "pt-BR": { name: "Granola" },
      "en-US": { name: "Granola" },
      "es-ES": { name: "Granola" },
      "fr-FR": { name: "Granola" },
      "de-DE": { name: "Granola" },
      "it-IT": { name: "Granola" }
    }
  },

  cornmeal: {
    id: "cornmeal",
    category: "carb",
    macros: { kcal: 361, prot: 8.3, carbs: 79, fat: 1.5, fiber: 4.6 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Fubá" },
      "en-US": { name: "Cornmeal" },
      "es-ES": { name: "Harina de maíz" },
      "fr-FR": { name: "Farine de maïs" },
      "de-DE": { name: "Maismehl" },
      "it-IT": { name: "Farina di mais" }
    }
  },

  polenta: {
    id: "polenta",
    category: "carb",
    macros: { kcal: 70, prot: 1.7, carbs: 15.7, fat: 0.2, fiber: 0.7 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Polenta cozida" },
      "en-US": { name: "Cooked polenta" },
      "es-ES": { name: "Polenta cocida" },
      "fr-FR": { name: "Polenta cuite" },
      "de-DE": { name: "Gekochte Polenta" },
      "it-IT": { name: "Polenta cotta" }
    }
  },

  potato: {
    id: "potato",
    category: "carb",
    macros: { kcal: 77, prot: 2, carbs: 17, fat: 0.1, fiber: 1.8 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Batata inglesa cozida" },
      "en-US": { name: "Boiled potato" },
      "es-ES": { name: "Papa cocida" },
      "fr-FR": { name: "Pomme de terre bouillie" },
      "de-DE": { name: "Gekochte Kartoffel" },
      "it-IT": { name: "Patata bollita" }
    }
  },

  yam: {
    id: "yam",
    category: "carb",
    macros: { kcal: 118, prot: 1.5, carbs: 27.9, fat: 0.2, fiber: 4.1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Inhame cozido" },
      "en-US": { name: "Cooked yam" },
      "es-ES": { name: "Ñame cocido" },
      "fr-FR": { name: "Igname cuit" },
      "de-DE": { name: "Gekochte Yamswurzel" },
      "it-IT": { name: "Igname cotto" }
    }
  },

  cassava: {
    id: "cassava",
    category: "carb",
    macros: { kcal: 125, prot: 0.6, carbs: 30.1, fat: 0.3, fiber: 1.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Mandioca cozida" },
      "en-US": { name: "Cooked cassava" },
      "es-ES": { name: "Yuca cocida" },
      "fr-FR": { name: "Manioc cuit" },
      "de-DE": { name: "Gekochte Maniok" },
      "it-IT": { name: "Manioca cotta" }
    }
  },

  corn: {
    id: "corn",
    category: "carb",
    macros: { kcal: 96, prot: 3.4, carbs: 21, fat: 1.5, fiber: 2.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Milho cozido" },
      "en-US": { name: "Cooked corn" },
      "es-ES": { name: "Maíz cocido" },
      "fr-FR": { name: "Maïs cuit" },
      "de-DE": { name: "Gekochter Mais" },
      "it-IT": { name: "Mais cotto" }
    }
  },

  green_peas: {
    id: "green_peas",
    category: "carb",
    macros: { kcal: 81, prot: 5.4, carbs: 14.5, fat: 0.4, fiber: 5.7 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Ervilha cozida" },
      "en-US": { name: "Cooked green peas" },
      "es-ES": { name: "Guisantes cocidos" },
      "fr-FR": { name: "Petits pois cuits" },
      "de-DE": { name: "Gekochte Erbsen" },
      "it-IT": { name: "Piselli cotti" }
    }
  },

  chickpea_flour: {
    id: "chickpea_flour",
    category: "carb",
    macros: { kcal: 387, prot: 22, carbs: 58, fat: 6.7, fiber: 11 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Farinha de grão-de-bico" },
      "en-US": { name: "Chickpea flour" },
      "es-ES": { name: "Harina de garbanzo" },
      "fr-FR": { name: "Farine de pois chiche" },
      "de-DE": { name: "Kichererbsenmehl" },
      "it-IT": { name: "Farina di ceci" }
    }
  },

  oat_flour: {
    id: "oat_flour",
    category: "carb",
    macros: { kcal: 404, prot: 13.9, carbs: 65.7, fat: 9.1, fiber: 9.4 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["gluten"],
    i18n: {
      "pt-BR": { name: "Farinha de aveia" },
      "en-US": { name: "Oat flour" },
      "es-ES": { name: "Harina de avena" },
      "fr-FR": { name: "Farine d'avoine" },
      "de-DE": { name: "Hafermehl" },
      "it-IT": { name: "Farina d'avena" }
    }
  },

  // ============= FASE 3: VEGETAIS (25 NOVOS) =============
  spinach: {
    id: "spinach",
    category: "vegetable",
    macros: { kcal: 23, prot: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Espinafre cru" },
      "en-US": { name: "Raw spinach" },
      "es-ES": { name: "Espinacas crudas" },
      "fr-FR": { name: "Épinards crus" },
      "de-DE": { name: "Roher Spinat" },
      "it-IT": { name: "Spinaci crudi" }
    }
  },

  kale: {
    id: "kale",
    category: "vegetable",
    macros: { kcal: 49, prot: 4.3, carbs: 8.8, fat: 0.9, fiber: 3.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Couve crua" },
      "en-US": { name: "Raw kale" },
      "es-ES": { name: "Col rizada cruda" },
      "fr-FR": { name: "Chou frisé cru" },
      "de-DE": { name: "Roher Grünkohl" },
      "it-IT": { name: "Cavolo riccio crudo" }
    }
  },

  arugula: {
    id: "arugula",
    category: "vegetable",
    macros: { kcal: 25, prot: 2.6, carbs: 3.7, fat: 0.7, fiber: 1.6 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Rúcula" },
      "en-US": { name: "Arugula" },
      "es-ES": { name: "Rúcula" },
      "fr-FR": { name: "Roquette" },
      "de-DE": { name: "Rucola" },
      "it-IT": { name: "Rucola" }
    }
  },

  cabbage: {
    id: "cabbage",
    category: "vegetable",
    macros: { kcal: 25, prot: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Repolho cru" },
      "en-US": { name: "Raw cabbage" },
      "es-ES": { name: "Repollo crudo" },
      "fr-FR": { name: "Chou cru" },
      "de-DE": { name: "Roher Kohl" },
      "it-IT": { name: "Cavolo crudo" }
    }
  },

  red_cabbage: {
    id: "red_cabbage",
    category: "vegetable",
    macros: { kcal: 31, prot: 1.4, carbs: 7.4, fat: 0.2, fiber: 2.1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Repolho roxo" },
      "en-US": { name: "Red cabbage" },
      "es-ES": { name: "Repollo morado" },
      "fr-FR": { name: "Chou rouge" },
      "de-DE": { name: "Rotkohl" },
      "it-IT": { name: "Cavolo rosso" }
    }
  },

  cauliflower: {
    id: "cauliflower",
    category: "vegetable",
    macros: { kcal: 23, prot: 1.9, carbs: 4.9, fat: 0.3, fiber: 2 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Couve-flor cozida" },
      "en-US": { name: "Cooked cauliflower" },
      "es-ES": { name: "Coliflor cocida" },
      "fr-FR": { name: "Chou-fleur cuit" },
      "de-DE": { name: "Gekochter Blumenkohl" },
      "it-IT": { name: "Cavolfiore cotto" }
    }
  },

  zucchini: {
    id: "zucchini",
    category: "vegetable",
    macros: { kcal: 17, prot: 1.2, carbs: 3.1, fat: 0.3, fiber: 1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Abobrinha" },
      "en-US": { name: "Zucchini" },
      "es-ES": { name: "Calabacín" },
      "fr-FR": { name: "Courgette" },
      "de-DE": { name: "Zucchini" },
      "it-IT": { name: "Zucchina" }
    }
  },

  eggplant: {
    id: "eggplant",
    category: "vegetable",
    macros: { kcal: 25, prot: 1, carbs: 5.9, fat: 0.2, fiber: 3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Berinjela" },
      "en-US": { name: "Eggplant" },
      "es-ES": { name: "Berenjena" },
      "fr-FR": { name: "Aubergine" },
      "de-DE": { name: "Aubergine" },
      "it-IT": { name: "Melanzana" }
    }
  },

  bell_pepper: {
    id: "bell_pepper",
    category: "vegetable",
    macros: { kcal: 20, prot: 0.9, carbs: 4.6, fat: 0.2, fiber: 1.7 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Pimentão" },
      "en-US": { name: "Bell pepper" },
      "es-ES": { name: "Pimiento" },
      "fr-FR": { name: "Poivron" },
      "de-DE": { name: "Paprika" },
      "it-IT": { name: "Peperone" }
    }
  },

  cucumber: {
    id: "cucumber",
    category: "vegetable",
    macros: { kcal: 15, prot: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Pepino" },
      "en-US": { name: "Cucumber" },
      "es-ES": { name: "Pepino" },
      "fr-FR": { name: "Concombre" },
      "de-DE": { name: "Gurke" },
      "it-IT": { name: "Cetriolo" }
    }
  },

  celery: {
    id: "celery",
    category: "vegetable",
    macros: { kcal: 16, prot: 0.7, carbs: 3, fat: 0.2, fiber: 1.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Salsão" },
      "en-US": { name: "Celery" },
      "es-ES": { name: "Apio" },
      "fr-FR": { name: "Céleri" },
      "de-DE": { name: "Sellerie" },
      "it-IT": { name: "Sedano" }
    }
  },

  beets: {
    id: "beets",
    category: "vegetable",
    macros: { kcal: 44, prot: 1.7, carbs: 10, fat: 0.2, fiber: 2 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Beterraba cozida" },
      "en-US": { name: "Cooked beets" },
      "es-ES": { name: "Remolacha cocida" },
      "fr-FR": { name: "Betterave cuite" },
      "de-DE": { name: "Gekochte Rote Bete" },
      "it-IT": { name: "Barbabietola cotta" }
    }
  },

  carrots: {
    id: "carrots",
    category: "vegetable",
    macros: { kcal: 35, prot: 0.9, carbs: 8.2, fat: 0.2, fiber: 2.8 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Cenoura cozida" },
      "en-US": { name: "Cooked carrots" },
      "es-ES": { name: "Zanahoria cocida" },
      "fr-FR": { name: "Carottes cuites" },
      "de-DE": { name: "Gekochte Karotten" },
      "it-IT": { name: "Carote cotte" }
    }
  },

  radish: {
    id: "radish",
    category: "vegetable",
    macros: { kcal: 16, prot: 0.7, carbs: 3.4, fat: 0.1, fiber: 1.6 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Rabanete" },
      "en-US": { name: "Radish" },
      "es-ES": { name: "Rábano" },
      "fr-FR": { name: "Radis" },
      "de-DE": { name: "Radieschen" },
      "it-IT": { name: "Ravanello" }
    }
  },

  asparagus: {
    id: "asparagus",
    category: "vegetable",
    macros: { kcal: 20, prot: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Aspargos cozidos" },
      "en-US": { name: "Cooked asparagus" },
      "es-ES": { name: "Espárragos cocidos" },
      "fr-FR": { name: "Asperges cuites" },
      "de-DE": { name: "Gekochter Spargel" },
      "it-IT": { name: "Asparagi cotti" }
    }
  },

  green_beans: {
    id: "green_beans",
    category: "vegetable",
    macros: { kcal: 31, prot: 1.8, carbs: 7, fat: 0.2, fiber: 3.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Vagem cozida" },
      "en-US": { name: "Cooked green beans" },
      "es-ES": { name: "Judías verdes cocidas" },
      "fr-FR": { name: "Haricots verts cuits" },
      "de-DE": { name: "Gekochte grüne Bohnen" },
      "it-IT": { name: "Fagiolini cotti" }
    }
  },

  mushrooms: {
    id: "mushrooms",
    category: "vegetable",
    macros: { kcal: 22, prot: 3.1, carbs: 3.3, fat: 0.3, fiber: 1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Cogumelos" },
      "en-US": { name: "Mushrooms" },
      "es-ES": { name: "Champiñones" },
      "fr-FR": { name: "Champignons" },
      "de-DE": { name: "Pilze" },
      "it-IT": { name: "Funghi" }
    }
  },

  cherry_tomatoes: {
    id: "cherry_tomatoes",
    category: "vegetable",
    macros: { kcal: 18, prot: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Tomate cereja" },
      "en-US": { name: "Cherry tomatoes" },
      "es-ES": { name: "Tomates cherry" },
      "fr-FR": { name: "Tomates cerises" },
      "de-DE": { name: "Kirschtomaten" },
      "it-IT": { name: "Pomodorini" }
    }
  },

  avocado: {
    id: "avocado",
    category: "vegetable",
    macros: { kcal: 160, prot: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Abacate" },
      "en-US": { name: "Avocado" },
      "es-ES": { name: "Aguacate" },
      "fr-FR": { name: "Avocat" },
      "de-DE": { name: "Avocado" },
      "it-IT": { name: "Avocado" }
    }
  },

  pumpkin: {
    id: "pumpkin",
    category: "vegetable",
    macros: { kcal: 26, prot: 1, carbs: 6.5, fat: 0.1, fiber: 0.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Abóbora cozida" },
      "en-US": { name: "Cooked pumpkin" },
      "es-ES": { name: "Calabaza cocida" },
      "fr-FR": { name: "Citrouille cuite" },
      "de-DE": { name: "Gekochter Kürbis" },
      "it-IT": { name: "Zucca cotta" }
    }
  },

  sweet_corn: {
    id: "sweet_corn",
    category: "vegetable",
    macros: { kcal: 86, prot: 3.2, carbs: 19, fat: 1.2, fiber: 2.7 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Milho verde" },
      "en-US": { name: "Sweet corn" },
      "es-ES": { name: "Maíz dulce" },
      "fr-FR": { name: "Maïs doux" },
      "de-DE": { name: "Zuckermais" },
      "it-IT": { name: "Mais dolce" }
    }
  },

  leek: {
    id: "leek",
    category: "vegetable",
    macros: { kcal: 61, prot: 1.5, carbs: 14.2, fat: 0.3, fiber: 1.8 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Alho-poró" },
      "en-US": { name: "Leek" },
      "es-ES": { name: "Puerro" },
      "fr-FR": { name: "Poireau" },
      "de-DE": { name: "Lauch" },
      "it-IT": { name: "Porro" }
    }
  },

  chard: {
    id: "chard",
    category: "vegetable",
    macros: { kcal: 19, prot: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Acelga" },
      "en-US": { name: "Swiss chard" },
      "es-ES": { name: "Acelga" },
      "fr-FR": { name: "Bette à carde" },
      "de-DE": { name: "Mangold" },
      "it-IT": { name: "Bietola" }
    }
  },

  watercress: {
    id: "watercress",
    category: "vegetable",
    macros: { kcal: 11, prot: 2.3, carbs: 1.3, fat: 0.1, fiber: 0.5 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Agrião" },
      "en-US": { name: "Watercress" },
      "es-ES": { name: "Berro" },
      "fr-FR": { name: "Cresson" },
      "de-DE": { name: "Brunnenkresse" },
      "it-IT": { name: "Crescione" }
    }
  },

  parsley: {
    id: "parsley",
    category: "vegetable",
    macros: { kcal: 36, prot: 3, carbs: 6.3, fat: 0.8, fiber: 3.3 },
    portion_default: 10,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Salsinha" },
      "en-US": { name: "Parsley" },
      "es-ES": { name: "Perejil" },
      "fr-FR": { name: "Persil" },
      "de-DE": { name: "Petersilie" },
      "it-IT": { name: "Prezzemolo" }
    }
  },

  cilantro: {
    id: "cilantro",
    category: "vegetable",
    macros: { kcal: 23, prot: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8 },
    portion_default: 10,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Coentro" },
      "en-US": { name: "Cilantro" },
      "es-ES": { name: "Cilantro" },
      "fr-FR": { name: "Coriandre" },
      "de-DE": { name: "Koriander" },
      "it-IT": { name: "Coriandolo" }
    }
  },

  // ============= FASE 4: FRUTAS (20 NOVOS) =============
  watermelon: {
    id: "watermelon",
    category: "fruit",
    macros: { kcal: 30, prot: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Melancia" },
      "en-US": { name: "Watermelon" },
      "es-ES": { name: "Sandía" },
      "fr-FR": { name: "Pastèque" },
      "de-DE": { name: "Wassermelone" },
      "it-IT": { name: "Anguria" }
    }
  },

  papaya: {
    id: "papaya",
    category: "fruit",
    macros: { kcal: 43, prot: 0.5, carbs: 10.8, fat: 0.3, fiber: 1.7 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Mamão" },
      "en-US": { name: "Papaya" },
      "es-ES": { name: "Papaya" },
      "fr-FR": { name: "Papaye" },
      "de-DE": { name: "Papaya" },
      "it-IT": { name: "Papaya" }
    }
  },

  pineapple: {
    id: "pineapple",
    category: "fruit",
    macros: { kcal: 50, prot: 0.5, carbs: 13.1, fat: 0.1, fiber: 1.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Abacaxi" },
      "en-US": { name: "Pineapple" },
      "es-ES": { name: "Piña" },
      "fr-FR": { name: "Ananas" },
      "de-DE": { name: "Ananas" },
      "it-IT": { name: "Ananas" }
    }
  },

  mango: {
    id: "mango",
    category: "fruit",
    macros: { kcal: 60, prot: 0.8, carbs: 15, fat: 0.4, fiber: 1.6 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Manga" },
      "en-US": { name: "Mango" },
      "es-ES": { name: "Mango" },
      "fr-FR": { name: "Mangue" },
      "de-DE": { name: "Mango" },
      "it-IT": { name: "Mango" }
    }
  },

  grapes: {
    id: "grapes",
    category: "fruit",
    macros: { kcal: 69, prot: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Uvas" },
      "en-US": { name: "Grapes" },
      "es-ES": { name: "Uvas" },
      "fr-FR": { name: "Raisins" },
      "de-DE": { name: "Trauben" },
      "it-IT": { name: "Uva" }
    }
  },

  pear: {
    id: "pear",
    category: "fruit",
    macros: { kcal: 57, prot: 0.4, carbs: 15.2, fat: 0.1, fiber: 3.1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Pera" },
      "en-US": { name: "Pear" },
      "es-ES": { name: "Pera" },
      "fr-FR": { name: "Poire" },
      "de-DE": { name: "Birne" },
      "it-IT": { name: "Pera" }
    }
  },

  kiwi: {
    id: "kiwi",
    category: "fruit",
    macros: { kcal: 61, prot: 1.1, carbs: 14.7, fat: 0.5, fiber: 3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Kiwi" },
      "en-US": { name: "Kiwi" },
      "es-ES": { name: "Kiwi" },
      "fr-FR": { name: "Kiwi" },
      "de-DE": { name: "Kiwi" },
      "it-IT": { name: "Kiwi" }
    }
  },

  peach: {
    id: "peach",
    category: "fruit",
    macros: { kcal: 39, prot: 0.9, carbs: 9.5, fat: 0.3, fiber: 1.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Pêssego" },
      "en-US": { name: "Peach" },
      "es-ES": { name: "Melocotón" },
      "fr-FR": { name: "Pêche" },
      "de-DE": { name: "Pfirsich" },
      "it-IT": { name: "Pesca" }
    }
  },

  plum: {
    id: "plum",
    category: "fruit",
    macros: { kcal: 46, prot: 0.7, carbs: 11.4, fat: 0.3, fiber: 1.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Ameixa" },
      "en-US": { name: "Plum" },
      "es-ES": { name: "Ciruela" },
      "fr-FR": { name: "Prune" },
      "de-DE": { name: "Pflaume" },
      "it-IT": { name: "Prugna" }
    }
  },

  apricot: {
    id: "apricot",
    category: "fruit",
    macros: { kcal: 48, prot: 1.4, carbs: 11.1, fat: 0.4, fiber: 2 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Damasco" },
      "en-US": { name: "Apricot" },
      "es-ES": { name: "Albaricoque" },
      "fr-FR": { name: "Abricot" },
      "de-DE": { name: "Aprikose" },
      "it-IT": { name: "Albicocca" }
    }
  },

  melon: {
    id: "melon",
    category: "fruit",
    macros: { kcal: 34, prot: 0.8, carbs: 8.2, fat: 0.2, fiber: 0.9 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Melão" },
      "en-US": { name: "Melon" },
      "es-ES": { name: "Melón" },
      "fr-FR": { name: "Melon" },
      "de-DE": { name: "Melone" },
      "it-IT": { name: "Melone" }
    }
  },

  tangerine: {
    id: "tangerine",
    category: "fruit",
    macros: { kcal: 53, prot: 0.8, carbs: 13.3, fat: 0.3, fiber: 1.8 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Tangerina" },
      "en-US": { name: "Tangerine" },
      "es-ES": { name: "Mandarina" },
      "fr-FR": { name: "Mandarine" },
      "de-DE": { name: "Mandarine" },
      "it-IT": { name: "Mandarino" }
    }
  },

  lemon: {
    id: "lemon",
    category: "fruit",
    macros: { kcal: 29, prot: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Limão" },
      "en-US": { name: "Lemon" },
      "es-ES": { name: "Limón" },
      "fr-FR": { name: "Citron" },
      "de-DE": { name: "Zitrone" },
      "it-IT": { name: "Limone" }
    }
  },

  lime: {
    id: "lime",
    category: "fruit",
    macros: { kcal: 30, prot: 0.7, carbs: 10.5, fat: 0.2, fiber: 2.8 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Lima" },
      "en-US": { name: "Lime" },
      "es-ES": { name: "Lima" },
      "fr-FR": { name: "Citron vert" },
      "de-DE": { name: "Limette" },
      "it-IT": { name: "Lime" }
    }
  },

  coconut: {
    id: "coconut",
    category: "fruit",
    macros: { kcal: 354, prot: 3.3, carbs: 15.2, fat: 33.5, fiber: 9 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Coco ralado" },
      "en-US": { name: "Shredded coconut" },
      "es-ES": { name: "Coco rallado" },
      "fr-FR": { name: "Noix de coco râpée" },
      "de-DE": { name: "Kokosraspeln" },
      "it-IT": { name: "Cocco grattugiato" }
    }
  },

  raspberries: {
    id: "raspberries",
    category: "fruit",
    macros: { kcal: 52, prot: 1.2, carbs: 11.9, fat: 0.7, fiber: 6.5 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Framboesas" },
      "en-US": { name: "Raspberries" },
      "es-ES": { name: "Frambuesas" },
      "fr-FR": { name: "Framboises" },
      "de-DE": { name: "Himbeeren" },
      "it-IT": { name: "Lamponi" }
    }
  },

  blackberries: {
    id: "blackberries",
    category: "fruit",
    macros: { kcal: 43, prot: 1.4, carbs: 9.6, fat: 0.5, fiber: 5.3 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Amoras" },
      "en-US": { name: "Blackberries" },
      "es-ES": { name: "Moras" },
      "fr-FR": { name: "Mûres" },
      "de-DE": { name: "Brombeeren" },
      "it-IT": { name: "More" }
    }
  },

  cherries: {
    id: "cherries",
    category: "fruit",
    macros: { kcal: 63, prot: 1.1, carbs: 16, fat: 0.2, fiber: 2.1 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Cerejas" },
      "en-US": { name: "Cherries" },
      "es-ES": { name: "Cerezas" },
      "fr-FR": { name: "Cerises" },
      "de-DE": { name: "Kirschen" },
      "it-IT": { name: "Ciliegie" }
    }
  },

  figs: {
    id: "figs",
    category: "fruit",
    macros: { kcal: 74, prot: 0.8, carbs: 19.2, fat: 0.3, fiber: 2.9 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Figos" },
      "en-US": { name: "Figs" },
      "es-ES": { name: "Higos" },
      "fr-FR": { name: "Figues" },
      "de-DE": { name: "Feigen" },
      "it-IT": { name: "Fichi" }
    }
  },

  guava: {
    id: "guava",
    category: "fruit",
    macros: { kcal: 68, prot: 2.6, carbs: 14.3, fat: 1, fiber: 5.4 },
    portion_default: 100,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Goiaba" },
      "en-US": { name: "Guava" },
      "es-ES": { name: "Guayaba" },
      "fr-FR": { name: "Goyave" },
      "de-DE": { name: "Guave" },
      "it-IT": { name: "Guava" }
    }
  },

  // ============= FASE 5: GORDURAS E SEMENTES (15 NOVOS) =============
  peanut_butter: {
    id: "peanut_butter",
    category: "fat",
    macros: { kcal: 588, prot: 25, carbs: 20, fat: 50, fiber: 6 },
    portion_default: 20,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["peanuts"],
    i18n: {
      "pt-BR": { name: "Pasta de amendoim" },
      "en-US": { name: "Peanut butter" },
      "es-ES": { name: "Mantequilla de maní" },
      "fr-FR": { name: "Beurre de cacahuète" },
      "de-DE": { name: "Erdnussbutter" },
      "it-IT": { name: "Burro di arachidi" }
    }
  },

  almond_butter: {
    id: "almond_butter",
    category: "fat",
    macros: { kcal: 614, prot: 21, carbs: 19, fat: 55, fiber: 12 },
    portion_default: 20,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["nuts"],
    i18n: {
      "pt-BR": { name: "Pasta de amêndoa" },
      "en-US": { name: "Almond butter" },
      "es-ES": { name: "Mantequilla de almendra" },
      "fr-FR": { name: "Beurre d'amande" },
      "de-DE": { name: "Mandelbutter" },
      "it-IT": { name: "Burro di mandorle" }
    }
  },

  tahini: {
    id: "tahini",
    category: "fat",
    macros: { kcal: 595, prot: 17, carbs: 21, fat: 54, fiber: 9.3 },
    portion_default: 20,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["sesame"],
    i18n: {
      "pt-BR": { name: "Tahine" },
      "en-US": { name: "Tahini" },
      "es-ES": { name: "Tahini" },
      "fr-FR": { name: "Tahin" },
      "de-DE": { name: "Tahini" },
      "it-IT": { name: "Tahina" }
    }
  },

  hummus: {
    id: "hummus",
    category: "fat",
    macros: { kcal: 166, prot: 8, carbs: 14, fat: 10, fiber: 6 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["sesame"],
    i18n: {
      "pt-BR": { name: "Homus" },
      "en-US": { name: "Hummus" },
      "es-ES": { name: "Hummus" },
      "fr-FR": { name: "Houmous" },
      "de-DE": { name: "Hummus" },
      "it-IT": { name: "Hummus" }
    }
  },

  guacamole: {
    id: "guacamole",
    category: "fat",
    macros: { kcal: 160, prot: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
    portion_default: 50,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Guacamole" },
      "en-US": { name: "Guacamole" },
      "es-ES": { name: "Guacamole" },
      "fr-FR": { name: "Guacamole" },
      "de-DE": { name: "Guacamole" },
      "it-IT": { name: "Guacamole" }
    }
  },

  almonds: {
    id: "almonds",
    category: "fat",
    macros: { kcal: 579, prot: 21, carbs: 21.6, fat: 49.9, fiber: 12.5 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["nuts"],
    i18n: {
      "pt-BR": { name: "Amêndoas" },
      "en-US": { name: "Almonds" },
      "es-ES": { name: "Almendras" },
      "fr-FR": { name: "Amandes" },
      "de-DE": { name: "Mandeln" },
      "it-IT": { name: "Mandorle" }
    }
  },

  walnuts: {
    id: "walnuts",
    category: "fat",
    macros: { kcal: 654, prot: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["nuts"],
    i18n: {
      "pt-BR": { name: "Nozes" },
      "en-US": { name: "Walnuts" },
      "es-ES": { name: "Nueces" },
      "fr-FR": { name: "Noix" },
      "de-DE": { name: "Walnüsse" },
      "it-IT": { name: "Noci" }
    }
  },

  cashews: {
    id: "cashews",
    category: "fat",
    macros: { kcal: 553, prot: 18.2, carbs: 30.2, fat: 43.8, fiber: 3.3 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["nuts"],
    i18n: {
      "pt-BR": { name: "Castanha de caju" },
      "en-US": { name: "Cashews" },
      "es-ES": { name: "Anacardos" },
      "fr-FR": { name: "Noix de cajou" },
      "de-DE": { name: "Cashewnüsse" },
      "it-IT": { name: "Anacardi" }
    }
  },

  brazil_nuts: {
    id: "brazil_nuts",
    category: "fat",
    macros: { kcal: 656, prot: 14.3, carbs: 12.3, fat: 66.4, fiber: 7.5 },
    portion_default: 30,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["nuts"],
    i18n: {
      "pt-BR": { name: "Castanha do Pará" },
      "en-US": { name: "Brazil nuts" },
      "es-ES": { name: "Nueces de Brasil" },
      "fr-FR": { name: "Noix du Brésil" },
      "de-DE": { name: "Paranüsse" },
      "it-IT": { name: "Noci del Brasile" }
    }
  },

  chia_seeds: {
    id: "chia_seeds",
    category: "fat",
    macros: { kcal: 486, prot: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4 },
    portion_default: 15,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Chia" },
      "en-US": { name: "Chia seeds" },
      "es-ES": { name: "Semillas de chía" },
      "fr-FR": { name: "Graines de chia" },
      "de-DE": { name: "Chiasamen" },
      "it-IT": { name: "Semi di chia" }
    }
  },

  flax_seeds: {
    id: "flax_seeds",
    category: "fat",
    macros: { kcal: 534, prot: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3 },
    portion_default: 15,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Linhaça" },
      "en-US": { name: "Flax seeds" },
      "es-ES": { name: "Semillas de lino" },
      "fr-FR": { name: "Graines de lin" },
      "de-DE": { name: "Leinsamen" },
      "it-IT": { name: "Semi di lino" }
    }
  },

  sesame_seeds: {
    id: "sesame_seeds",
    category: "fat",
    macros: { kcal: 573, prot: 17.7, carbs: 23.4, fat: 49.7, fiber: 11.8 },
    portion_default: 15,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["sesame"],
    i18n: {
      "pt-BR": { name: "Gergelim" },
      "en-US": { name: "Sesame seeds" },
      "es-ES": { name: "Semillas de sésamo" },
      "fr-FR": { name: "Graines de sésame" },
      "de-DE": { name: "Sesamsamen" },
      "it-IT": { name: "Semi di sesamo" }
    }
  },

  honey: {
    id: "honey",
    category: "fat",
    macros: { kcal: 304, prot: 0.3, carbs: 82.4, fat: 0, fiber: 0.2 },
    portion_default: 20,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Mel" },
      "en-US": { name: "Honey" },
      "es-ES": { name: "Miel" },
      "fr-FR": { name: "Miel" },
      "de-DE": { name: "Honig" },
      "it-IT": { name: "Miele" }
    }
  },

  jam: {
    id: "jam",
    category: "fat",
    macros: { kcal: 278, prot: 0.4, carbs: 69, fat: 0.1, fiber: 1 },
    portion_default: 20,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Geleia" },
      "en-US": { name: "Jam" },
      "es-ES": { name: "Mermelada" },
      "fr-FR": { name: "Confiture" },
      "de-DE": { name: "Marmelade" },
      "it-IT": { name: "Marmellata" }
    }
  },

  mustard: {
    id: "mustard",
    category: "fat",
    macros: { kcal: 66, prot: 3.7, carbs: 5.8, fat: 3.3, fiber: 3.3 },
    portion_default: 10,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Mostarda" },
      "en-US": { name: "Mustard" },
      "es-ES": { name: "Mostaza" },
      "fr-FR": { name: "Moutarde" },
      "de-DE": { name: "Senf" },
      "it-IT": { name: "Senape" }
    }
  },

  // ============= FASE 6: BEBIDAS (8 NOVOS - green_tea e black_coffee já existiam) =============
  black_tea: {
    id: "black_tea",
    category: "beverage",
    macros: { kcal: 2, prot: 0, carbs: 0.3, fat: 0, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Chá preto" },
      "en-US": { name: "Black tea" },
      "es-ES": { name: "Té negro" },
      "fr-FR": { name: "Thé noir" },
      "de-DE": { name: "Schwarzer Tee" },
      "it-IT": { name: "Tè nero" }
    }
  },

  herbal_tea: {
    id: "herbal_tea",
    category: "beverage",
    macros: { kcal: 2, prot: 0, carbs: 0.4, fat: 0, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Chá de ervas" },
      "en-US": { name: "Herbal tea" },
      "es-ES": { name: "Té de hierbas" },
      "fr-FR": { name: "Tisane" },
      "de-DE": { name: "Kräutertee" },
      "it-IT": { name: "Tisana" }
    }
  },

  coconut_water: {
    id: "coconut_water",
    category: "beverage",
    macros: { kcal: 19, prot: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Água de coco" },
      "en-US": { name: "Coconut water" },
      "es-ES": { name: "Agua de coco" },
      "fr-FR": { name: "Eau de coco" },
      "de-DE": { name: "Kokoswasser" },
      "it-IT": { name: "Acqua di cocco" }
    }
  },

  almond_milk: {
    id: "almond_milk",
    category: "beverage",
    macros: { kcal: 24, prot: 1, carbs: 1, fat: 2.5, fiber: 0.5 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["nuts"],
    i18n: {
      "pt-BR": { name: "Leite de amêndoas" },
      "en-US": { name: "Almond milk" },
      "es-ES": { name: "Leche de almendras" },
      "fr-FR": { name: "Lait d'amande" },
      "de-DE": { name: "Mandelmilch" },
      "it-IT": { name: "Latte di mandorle" }
    }
  },

  soy_milk: {
    id: "soy_milk",
    category: "beverage",
    macros: { kcal: 54, prot: 3.3, carbs: 6, fat: 1.8, fiber: 0.6 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["soy"],
    i18n: {
      "pt-BR": { name: "Leite de soja" },
      "en-US": { name: "Soy milk" },
      "es-ES": { name: "Leche de soja" },
      "fr-FR": { name: "Lait de soja" },
      "de-DE": { name: "Sojamilch" },
      "it-IT": { name: "Latte di soia" }
    }
  },

  coffee_with_milk: {
    id: "coffee_with_milk",
    category: "beverage",
    macros: { kcal: 37, prot: 1.9, carbs: 2.8, fat: 1.9, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Café com leite" },
      "en-US": { name: "Coffee with milk" },
      "es-ES": { name: "Café con leche" },
      "fr-FR": { name: "Café au lait" },
      "de-DE": { name: "Milchkaffee" },
      "it-IT": { name: "Caffè latte" }
    }
  },

  cappuccino: {
    id: "cappuccino",
    category: "beverage",
    macros: { kcal: 46, prot: 2.4, carbs: 3.5, fat: 2.4, fiber: 0 },
    portion_default: 150,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Cappuccino" },
      "en-US": { name: "Cappuccino" },
      "es-ES": { name: "Capuchino" },
      "fr-FR": { name: "Cappuccino" },
      "de-DE": { name: "Cappuccino" },
      "it-IT": { name: "Cappuccino" }
    }
  },

  smoothie: {
    id: "smoothie",
    category: "beverage",
    macros: { kcal: 90, prot: 2, carbs: 20, fat: 0.5, fiber: 2 },
    portion_default: 250,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Smoothie de frutas" },
      "en-US": { name: "Fruit smoothie" },
      "es-ES": { name: "Batido de frutas" },
      "fr-FR": { name: "Smoothie aux fruits" },
      "de-DE": { name: "Frucht-Smoothie" },
      "it-IT": { name: "Frullato di frutta" }
    }
  },

  vegetable_juice: {
    id: "vegetable_juice",
    category: "beverage",
    macros: { kcal: 45, prot: 2, carbs: 9, fat: 0.5, fiber: 2 },
    portion_default: 200,
    countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Suco verde" },
      "en-US": { name: "Green juice" },
      "es-ES": { name: "Jugo verde" },
      "fr-FR": { name: "Jus vert" },
      "de-DE": { name: "Grüner Saft" },
      "it-IT": { name: "Succo verde" }
    }
  },

  // ============= INGREDIENTES REGIONAIS BRASILEIROS (40) =============
  // Carboidratos Regionais
  pao_de_queijo: {
    id: "pao_de_queijo",
    category: "carb",
    regional: true,
    macros: { kcal: 335, prot: 9, carbs: 45, fat: 13, fiber: 1.5 },
    portion_default: 50,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: ["gluten", "lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Pão de queijo" },
      "en-US": { name: "Brazilian cheese bread" },
      "es-ES": { name: "Pan de queso brasileño" },
      "fr-FR": { name: "Pain au fromage brésilien" },
      "de-DE": { name: "Brasilianisches Käsebrot" },
      "it-IT": { name: "Pane al formaggio brasiliano" }
    }
  },

  cuscuz_paulista: {
    id: "cuscuz_paulista",
    category: "carb",
    regional: true,
    macros: { kcal: 112, prot: 3, carbs: 23, fat: 1, fiber: 1.2 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Cuscuz paulista" },
      "en-US": { name: "São Paulo-style couscous" },
      "es-ES": { name: "Cuscús paulista" },
      "fr-FR": { name: "Couscous de São Paulo" },
      "de-DE": { name: "Paulista-Couscous" },
      "it-IT": { name: "Cuscus paulista" }
    }
  },

  cuscuz_nordestino: {
    id: "cuscuz_nordestino",
    category: "carb",
    regional: true,
    macros: { kcal: 112, prot: 2, carbs: 25, fat: 0.5, fiber: 1 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Cuscuz nordestino" },
      "en-US": { name: "Northeastern Brazilian couscous" },
      "es-ES": { name: "Cuscús del nordeste brasileño" },
      "fr-FR": { name: "Couscous du Nordeste" },
      "de-DE": { name: "Nordost-brasilianischer Couscous" },
      "it-IT": { name: "Cuscus del nordest brasiliano" }
    }
  },

  beiju: {
    id: "beiju",
    category: "carb",
    regional: true,
    macros: { kcal: 98, prot: 0.2, carbs: 25, fat: 0.1, fiber: 0.1 },
    portion_default: 50,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Beiju" },
      "en-US": { name: "Beiju (tapioca flatbread)" },
      "es-ES": { name: "Beiju" },
      "fr-FR": { name: "Beiju" },
      "de-DE": { name: "Beiju" },
      "it-IT": { name: "Beiju" }
    }
  },

  farinha_mandioca: {
    id: "farinha_mandioca",
    category: "carb",
    regional: true,
    macros: { kcal: 365, prot: 1.4, carbs: 88, fat: 0.3, fiber: 2.5 },
    portion_default: 30,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Farinha de mandioca" },
      "en-US": { name: "Cassava flour" },
      "es-ES": { name: "Harina de yuca" },
      "fr-FR": { name: "Farine de manioc" },
      "de-DE": { name: "Maniokmehl" },
      "it-IT": { name: "Farina di manioca" }
    }
  },

  farofa: {
    id: "farofa",
    category: "carb",
    regional: true,
    macros: { kcal: 380, prot: 2, carbs: 75, fat: 8, fiber: 2 },
    portion_default: 50,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Farofa" },
      "en-US": { name: "Farofa (toasted cassava flour)" },
      "es-ES": { name: "Farofa" },
      "fr-FR": { name: "Farofa" },
      "de-DE": { name: "Farofa" },
      "it-IT": { name: "Farofa" }
    }
  },

  pirao: {
    id: "pirao",
    category: "carb",
    regional: true,
    macros: { kcal: 85, prot: 1, carbs: 18, fat: 1, fiber: 0.5 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: ["fish"],
    i18n: {
      "pt-BR": { name: "Pirão" },
      "en-US": { name: "Pirão (fish broth porridge)" },
      "es-ES": { name: "Pirão" },
      "fr-FR": { name: "Pirão" },
      "de-DE": { name: "Pirão" },
      "it-IT": { name: "Pirão" }
    }
  },

  angu: {
    id: "angu",
    category: "carb",
    regional: true,
    macros: { kcal: 70, prot: 1.5, carbs: 15, fat: 0.5, fiber: 0.8 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Angu" },
      "en-US": { name: "Angu (cornmeal porridge)" },
      "es-ES": { name: "Angu" },
      "fr-FR": { name: "Angu" },
      "de-DE": { name: "Angu" },
      "it-IT": { name: "Angu" }
    }
  },

  polvilho_azedo: {
    id: "polvilho_azedo",
    category: "carb",
    regional: true,
    macros: { kcal: 351, prot: 0.1, carbs: 88, fat: 0.1, fiber: 0.2 },
    portion_default: 30,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Polvilho azedo" },
      "en-US": { name: "Sour tapioca starch" },
      "es-ES": { name: "Almidón de tapioca agrio" },
      "fr-FR": { name: "Amidon de tapioca aigre" },
      "de-DE": { name: "Saure Tapiokastärke" },
      "it-IT": { name: "Amido di tapioca acido" }
    }
  },

  // Laticínios Regionais
  requeijao: {
    id: "requeijao",
    category: "dairy",
    regional: true,
    macros: { kcal: 270, prot: 8, carbs: 4, fat: 25, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "PT"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Requeijão" },
      "en-US": { name: "Brazilian cream cheese" },
      "es-ES": { name: "Requesón brasileño" },
      "fr-FR": { name: "Fromage à tartiner brésilien" },
      "de-DE": { name: "Brasilianischer Frischkäse" },
      "it-IT": { name: "Formaggio spalmabile brasiliano" }
    }
  },

  queijo_coalho: {
    id: "queijo_coalho",
    category: "dairy",
    regional: true,
    macros: { kcal: 330, prot: 25, carbs: 3, fat: 25, fiber: 0 },
    portion_default: 50,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo coalho" },
      "en-US": { name: "Coalho cheese" },
      "es-ES": { name: "Queso coalho" },
      "fr-FR": { name: "Fromage coalho" },
      "de-DE": { name: "Coalho-Käse" },
      "it-IT": { name: "Formaggio coalho" }
    }
  },

  queijo_minas_frescal: {
    id: "queijo_minas_frescal",
    category: "dairy",
    regional: true,
    macros: { kcal: 264, prot: 17.4, carbs: 3.8, fat: 20.8, fiber: 0 },
    portion_default: 50,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo minas frescal" },
      "en-US": { name: "Minas fresh cheese" },
      "es-ES": { name: "Queso minas fresco" },
      "fr-FR": { name: "Fromage minas frais" },
      "de-DE": { name: "Minas-Frischkäse" },
      "it-IT": { name: "Formaggio minas fresco" }
    }
  },

  queijo_minas_padrao: {
    id: "queijo_minas_padrao",
    category: "dairy",
    regional: true,
    macros: { kcal: 361, prot: 24, carbs: 1.6, fat: 29, fiber: 0 },
    portion_default: 50,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Queijo minas padrão" },
      "en-US": { name: "Minas standard cheese" },
      "es-ES": { name: "Queso minas estándar" },
      "fr-FR": { name: "Fromage minas standard" },
      "de-DE": { name: "Minas-Standardkäse" },
      "it-IT": { name: "Formaggio minas standard" }
    }
  },

  doce_leite: {
    id: "doce_leite",
    category: "dairy",
    regional: true,
    macros: { kcal: 315, prot: 6, carbs: 55, fat: 8, fiber: 0 },
    portion_default: 30,
    countries: ["BR", "AR"],
    allergens_dynamic: true,
    allergens_static: ["lactose", "milk"],
    i18n: {
      "pt-BR": { name: "Doce de leite" },
      "en-US": { name: "Dulce de leche" },
      "es-ES": { name: "Dulce de leche" },
      "fr-FR": { name: "Confiture de lait" },
      "de-DE": { name: "Milchkaramell" },
      "it-IT": { name: "Dulce de leche" }
    }
  },

  // Frutas e Derivados Regionais
  acai_polpa: {
    id: "acai_polpa",
    category: "fruit",
    regional: true,
    macros: { kcal: 58, prot: 1.5, carbs: 6.2, fat: 3.9, fiber: 2.6 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Açaí (polpa)" },
      "en-US": { name: "Açaí pulp" },
      "es-ES": { name: "Pulpa de açaí" },
      "fr-FR": { name: "Pulpe d'açaí" },
      "de-DE": { name: "Açaí-Fruchtfleisch" },
      "it-IT": { name: "Polpa di açaí" }
    }
  },

  caju_fruta: {
    id: "caju_fruta",
    category: "fruit",
    regional: true,
    macros: { kcal: 43, prot: 1, carbs: 10, fat: 0.2, fiber: 1.7 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Caju (fruta)" },
      "en-US": { name: "Cashew fruit" },
      "es-ES": { name: "Fruta de marañón" },
      "fr-FR": { name: "Fruit de cajou" },
      "de-DE": { name: "Cashewfrucht" },
      "it-IT": { name: "Frutto di anacardio" }
    }
  },

  jabuticaba: {
    id: "jabuticaba",
    category: "fruit",
    regional: true,
    macros: { kcal: 45, prot: 0.6, carbs: 11, fat: 0.1, fiber: 1.2 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Jabuticaba" },
      "en-US": { name: "Jabuticaba" },
      "es-ES": { name: "Jabuticaba" },
      "fr-FR": { name: "Jabuticaba" },
      "de-DE": { name: "Jabuticaba" },
      "it-IT": { name: "Jabuticaba" }
    }
  },

  goiabada: {
    id: "goiabada",
    category: "fruit",
    regional: true,
    macros: { kcal: 270, prot: 0.5, carbs: 70, fat: 0.1, fiber: 2 },
    portion_default: 30,
    countries: ["BR", "PT"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Goiabada" },
      "en-US": { name: "Guava paste" },
      "es-ES": { name: "Dulce de guayaba" },
      "fr-FR": { name: "Pâte de goyave" },
      "de-DE": { name: "Guavenpaste" },
      "it-IT": { name: "Pasta di guava" }
    }
  },

  // Proteínas Regionais
  linguica_toscana: {
    id: "linguica_toscana",
    category: "protein",
    regional: true,
    macros: { kcal: 296, prot: 16, carbs: 1, fat: 25, fiber: 0 },
    portion_default: 100,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Linguiça toscana" },
      "en-US": { name: "Tuscan sausage" },
      "es-ES": { name: "Salchicha toscana" },
      "fr-FR": { name: "Saucisse toscane" },
      "de-DE": { name: "Toskanische Wurst" },
      "it-IT": { name: "Salsiccia toscana" }
    }
  },

  // Vegetais Regionais
  // Bebidas Regionais
  guarana_natural: {
    id: "guarana_natural",
    category: "beverage",
    regional: true,
    macros: { kcal: 11, prot: 0.1, carbs: 2.8, fat: 0, fiber: 0 },
    portion_default: 200,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Guaraná natural" },
      "en-US": { name: "Natural guarana drink" },
      "es-ES": { name: "Guaraná natural" },
      "fr-FR": { name: "Boisson au guarana naturel" },
      "de-DE": { name: "Natürliches Guarana-Getränk" },
      "it-IT": { name: "Bevanda al guaranà naturale" }
    }
  },

  mate_gelado: {
    id: "mate_gelado",
    category: "beverage",
    regional: true,
    macros: { kcal: 2, prot: 0, carbs: 0.5, fat: 0, fiber: 0 },
    portion_default: 200,
    countries: ["BR", "AR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Mate gelado" },
      "en-US": { name: "Iced mate tea" },
      "es-ES": { name: "Mate helado" },
      "fr-FR": { name: "Maté glacé" },
      "de-DE": { name: "Eisgekühlter Mate-Tee" },
      "it-IT": { name: "Mate freddo" }
    }
  },

  // Outros Regionais
  melado_cana: {
    id: "melado_cana",
    category: "carb",
    regional: true,
    macros: { kcal: 290, prot: 0.3, carbs: 75, fat: 0, fiber: 0 },
    portion_default: 20,
    countries: ["BR"],
    allergens_dynamic: true,
    allergens_static: [],
    i18n: {
      "pt-BR": { name: "Melado de cana" },
      "en-US": { name: "Sugarcane molasses" },
      "es-ES": { name: "Melaza de caña" },
      "fr-FR": { name: "Mélasse de canne" },
      "de-DE": { name: "Zuckerrohrmelasse" },
      "it-IT": { name: "Melassa di canna" }
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

export function getIngredientName(ingredientId: string, locale: string = "pt-BR"): string {
  const ingredient = UNIVERSAL_INGREDIENTS[ingredientId];
  if (!ingredient) return ingredientId;
  
  // Tentar locale exato
  if (ingredient.i18n[locale]) {
    return ingredient.i18n[locale].name;
  }
  
  // Fallback para idioma base (ex: pt-BR → pt)
  const baseLocale = locale.split("-")[0];
  const fallbackLocale = Object.keys(ingredient.i18n).find(key => key.startsWith(baseLocale));
  if (fallbackLocale) {
    return ingredient.i18n[fallbackLocale].name;
  }
  
  // Fallback final para inglês
  return ingredient.i18n["en-US"]?.name || ingredientId;
}

export function getIngredientsByCountry(countryCode: string): UniversalIngredient[] {
  return Object.values(UNIVERSAL_INGREDIENTS).filter(ing => 
    ing.countries.includes(countryCode)
  );
}

/**
 * Retorna todos os ingredientes disponíveis para um país específico
 * Inclui ingredientes universais + regionais do país
 */
export function getIngredientsForCountry(countryCode: string): UniversalIngredient[] {
  return Object.values(UNIVERSAL_INGREDIENTS).filter(ingredient => 
    ingredient.countries.includes(countryCode)
  );
}

/**
 * Retorna apenas ingredientes regionais de um país
 */
export function getRegionalIngredientsForCountry(countryCode: string): UniversalIngredient[] {
  return Object.values(UNIVERSAL_INGREDIENTS).filter(ingredient => 
    ingredient.regional === true && ingredient.countries.includes(countryCode)
  );
}

/**
 * Retorna apenas ingredientes universais (não regionais)
 */
export function getUniversalIngredients(): UniversalIngredient[] {
  return Object.values(UNIVERSAL_INGREDIENTS).filter(ingredient => 
    !ingredient.regional
  );
}

export function getIngredientMacros(ingredientId: string): MacroNutrients | null {
  const ingredient = UNIVERSAL_INGREDIENTS[ingredientId];
  return ingredient ? ingredient.macros : null;
}

