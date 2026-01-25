// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - SMART TEMPLATES
// Sistema de templates inteligentes com combinação dinâmica
// ═══════════════════════════════════════════════════════════════════════

export interface SmartSlot {
  options: string[];
  quantity: number;
  required: boolean;
}

export interface SmartTemplate {
  id: string;
  name_pattern: string;
  structure: string;
  slots: Record<string, SmartSlot>;
  portion_modifier?: number;
}

export const SMART_TEMPLATES: Record<string, SmartTemplate[]> = {
  breakfast: [
    {
      id: "cafe_pao_proteina",
      name_pattern: "{carb} com {protein} e {fruit}",
      structure: "pao_proteina_fruta",
      slots: {
        carb: { options: ["whole_wheat_bread", "french_bread"], quantity: 1, required: true },
        protein: { options: ["scrambled_eggs", "plain_omelet", "minas_cheese", "ricotta"], quantity: 1, required: true },
        fruit: { options: ["silver_banana", "red_apple", "papaya", "strawberry", "orange", "tangerine", "kiwi", "mango", "melon", "guava"], quantity: 1, required: true },
        beverage: { options: ["coffee_with_milk", "black_coffee", "green_tea", "fresh_orange_juice", "coconut_water"], quantity: 1, required: true },
      }
    },
    {
      id: "cafe_pao_forma_cottage_requeijao",
      name_pattern: "{carb} com {protein} e {fruit}",
      structure: "pao_forma_cottage_requeijao",
      slots: {
        carb: { options: ["whole_wheat_sandwich_bread"], quantity: 1, required: true },
        protein: { options: ["cottage_cheese", "light_cream_cheese"], quantity: 1, required: true },
        fruit: { options: ["silver_banana", "red_apple", "papaya", "strawberry", "orange", "tangerine", "kiwi", "mango", "melon", "guava"], quantity: 1, required: true },
        beverage: { options: ["coffee_with_milk", "black_coffee", "green_tea", "fresh_orange_juice", "coconut_water"], quantity: 1, required: true },
      }
    },
    {
      id: "cafe_tapioca",
      name_pattern: "Tapioca com {filling}",
      structure: "tapioca_recheio",
      slots: {
        carb: { options: ["tapioca"], quantity: 1, required: true },
        filling: { options: ["minas_cheese", "cottage_cheese", "ricotta", "scrambled_eggs", "mozzarella_cheese"], quantity: 1, required: true },
        beverage: { options: ["coffee_with_milk", "black_coffee", "green_tea", "fresh_orange_juice"], quantity: 1, required: true },
      }
    },
    {
      id: "cafe_iogurte",
      name_pattern: "{dairy} com {fruit} e {topping}",
      structure: "iogurte_fruta",
      slots: {
        dairy: { options: ["plain_yogurt", "greek_yogurt", "low_fat_yogurt"], quantity: 1, required: true },
        fruit: { options: ["silver_banana", "strawberry", "papaya", "mango", "kiwi", "grapes", "pineapple", "melon", "guava"], quantity: 1, required: true },
        topping: { options: ["oats", "granola", "honey", "brazil_nuts", "cashew_nuts", "peanuts", "walnuts", "shredded_coconut", "chia_seeds", "flaxseed"], quantity: 1, required: true },
      }
    },
    {
      id: "cafe_cuscuz",
      name_pattern: "Cuscuz com {protein}",
      structure: "cuscuz_proteina",
      slots: {
        carb: { options: ["corn_couscous"], quantity: 1, required: true },
        protein: { options: ["scrambled_eggs", "plain_omelet", "minas_cheese", "cottage_cheese", "ricotta", "manteiga"], quantity: 1, required: true },
        beverage: { options: ["coffee_with_milk", "black_coffee", "green_tea", "fresh_orange_juice"], quantity: 1, required: true },
      }
    },
  ],
  
  morning_snack: [
    {
      id: "lanche_fruta_nuts",
      name_pattern: "{fruit} com {nuts}",
      structure: "fruta_oleaginosa",
      slots: {
        fruit: { options: ["silver_banana", "red_apple", "pear", "mango", "papaya", "orange", "tangerine", "kiwi", "grapes", "melon", "guava", "watermelon", "acai", "pineapple", "strawberry"], quantity: 1, required: true },
        nuts: { options: ["brazil_nuts", "cashew_nuts", "peanuts", "walnuts", "amendoas", "pistache"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_iogurte",
      name_pattern: "{dairy} com {fruit}",
      structure: "iogurte_fruta",
      slots: {
        dairy: { options: ["plain_yogurt", "greek_yogurt", "low_fat_yogurt"], quantity: 1, required: true },
        fruit: { options: ["strawberry", "silver_banana", "papaya", "mango", "kiwi", "grapes", "pineapple", "melon", "guava", "acai", "red_apple", "pear", "orange"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_iogurte_granola",
      name_pattern: "{dairy} com {topping}",
      structure: "iogurte_topping",
      slots: {
        dairy: { options: ["plain_yogurt", "greek_yogurt", "low_fat_yogurt"], quantity: 1, required: true },
        topping: { options: ["granola", "oats", "chia_seeds", "flaxseed", "shredded_coconut"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_fruta_simples",
      name_pattern: "{fruit}",
      structure: "fruta_simples",
      slots: {
        fruit: { options: ["silver_banana", "red_apple", "pear", "mango", "papaya", "orange", "guava", "watermelon", "pineapple", "melon"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_batata_doce",
      name_pattern: "{carb}",
      structure: "batata_doce",
      slots: {
        carb: { options: ["boiled_sweet_potato", "baked_sweet_potato"], quantity: 1, required: true },
      }
    },
  ],
  
  lunch: [
    {
      id: "almoco_arroz_feijao_proteina",
      name_pattern: "{protein} com Arroz, {legume} e {vegetables}",
      structure: "arroz_feijao_proteina_vegetais",
      slots: {
        carb: { options: ["white_rice", "brown_rice", "parboiled_rice"], quantity: 1, required: true },
        legume: { options: ["beans", "boiled_lentils"], quantity: 1, required: true },
        protein: { 
          options: [
            "grilled_chicken_breast", "baked_chicken_thigh", "shredded_chicken", "baked_chicken_drumstick",
            "grilled_sirloin_steak", "grilled_round_steak", "sirloin_steak_with_onions", "grilled_filet_mignon", "sauteed_ground_beef", "grilled_picanha", "pot_roast",
            "grilled_tilapia", "grilled_salmon", "grilled_hake", "baked_hake"
          ], 
          quantity: 1, 
          required: true 
        },
        vegetables: { 
          options: [
            "iceberg_lettuce", "curly_lettuce", "arugula", "watercress", "sauteed_spinach", "sauteed_kale", "sauteed_chard",
            "boiled_broccoli", "boiled_cauliflower", "boiled_carrot", "sauteed_zucchini", "boiled_green_beans", "boiled_pumpkin", "boiled_chayote", "sauteed_okra", "sauteed_eggplant", "boiled_beet", "sauteed_cabbage", "sauteed_scarlet_eggplant",
            "tomato", "cucumber", "green_bell_pepper", "red_bell_pepper", "yellow_bell_pepper"
          ], 
          quantity: 1, 
          required: true 
        },
              }
    },
    {
      id: "almoco_batata_proteina",
      name_pattern: "{protein} com {carb} e {vegetables}",
      structure: "batata_proteina_vegetais",
      slots: {
        carb: { options: ["boiled_sweet_potato", "baked_sweet_potato", "boiled_potato", "baked_potato", "boiled_cassava", "mashed_potato"], quantity: 1, required: true },
        protein: { 
          options: [
            "grilled_chicken_breast", "baked_chicken_thigh", "shredded_chicken",
            "grilled_sirloin_steak", "grilled_round_steak", "sauteed_ground_beef",
            "grilled_tilapia", "grilled_salmon", "grilled_hake"
          ], 
          quantity: 1, 
          required: true 
        },
        vegetables: { 
          options: [
            "iceberg_lettuce", "curly_lettuce", "arugula", "sauteed_spinach", "sauteed_kale",
            "boiled_broccoli", "boiled_cauliflower", "boiled_carrot", "sauteed_zucchini", "boiled_green_beans", "sauteed_eggplant",
            "tomato", "cucumber", "green_bell_pepper"
          ], 
          quantity: 1, 
          required: true 
        },
              }
    },
    {
      id: "almoco_macarrao",
      name_pattern: "{protein} com Macarr\u00e3o",
      structure: "macarrao_proteina",
      slots: {
        carb: { options: ["whole_wheat_pasta", "pasta"], quantity: 1, required: true },
        protein: { 
          options: ["shredded_chicken", "grilled_chicken_breast", "sauteed_ground_beef"], 
          quantity: 1, 
          required: true 
        },
        vegetables: { 
          options: ["boiled_broccoli", "sauteed_zucchini", "green_bell_pepper", "red_bell_pepper", "tomato", "sauteed_eggplant"], 
          quantity: 1, 
          required: false 
        },
      }
    },
  ],
  
  afternoon_snack: [
    {
      id: "lanche_pao_queijo",
      name_pattern: "{carb} com {filling}",
      structure: "pao_recheio",
      slots: {
        carb: { options: ["whole_wheat_bread", "french_bread"], quantity: 1, required: true },
        filling: { options: ["minas_cheese", "ricotta", "cottage_cheese", "light_cream_cheese"], quantity: 1, required: true },
        beverage: { options: ["coffee_with_milk", "green_tea", "chamomile_tea", "black_tea", "fennel_tea", "hibiscus_tea"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_pao_forma_cottage_requeijao",
      name_pattern: "{carb} com {filling}",
      structure: "pao_forma_cottage_requeijao",
      slots: {
        carb: { options: ["whole_wheat_sandwich_bread"], quantity: 1, required: true },
        filling: { options: ["cottage_cheese", "light_cream_cheese"], quantity: 1, required: true },
        beverage: { options: ["coffee_with_milk", "green_tea", "chamomile_tea", "black_tea", "fennel_tea", "hibiscus_tea"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_tapioca",
      name_pattern: "Tapioca com {filling}",
      structure: "tapioca_recheio",
      slots: {
        carb: { options: ["tapioca"], quantity: 1, required: true },
        filling: { options: ["minas_cheese", "cottage_cheese", "ricotta", "scrambled_eggs", "mozzarella_cheese"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_iogurte_fruta",
      name_pattern: "{dairy} com {fruit}",
      structure: "iogurte_fruta",
      slots: {
        dairy: { options: ["plain_yogurt", "greek_yogurt", "low_fat_yogurt"], quantity: 1, required: true },
        fruit: { options: ["silver_banana", "strawberry", "papaya", "mango", "kiwi", "grapes", "guava", "acai", "red_apple", "pear", "orange", "pineapple", "melon"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_fruta_nuts",
      name_pattern: "{fruit} com {nuts}",
      structure: "fruta_oleaginosa",
      slots: {
        fruit: { options: ["silver_banana", "red_apple", "pear", "mango", "papaya", "orange", "tangerine", "kiwi", "grapes", "melon", "guava", "watermelon", "acai", "pineapple", "strawberry"], quantity: 1, required: true },
        nuts: { options: ["brazil_nuts", "cashew_nuts", "peanuts", "walnuts", "amendoas", "pistache"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_fruta_simples",
      name_pattern: "{fruit}",
      structure: "fruta_simples",
      slots: {
        fruit: { options: ["silver_banana", "red_apple", "pear", "mango", "papaya", "orange", "guava", "watermelon", "pineapple", "melon", "tangerine", "kiwi"], quantity: 1, required: true },
      }
    },
    {
      id: "lanche_iogurte_granola",
      name_pattern: "{dairy} com {topping}",
      structure: "iogurte_topping",
      slots: {
        dairy: { options: ["plain_yogurt", "greek_yogurt", "low_fat_yogurt"], quantity: 1, required: true },
        topping: { options: ["granola", "oats", "chia_seeds", "flaxseed", "shredded_coconut", "honey"], quantity: 1, required: true },
      }
    },
  ],
  
  dinner: [
    {
      id: "jantar_arroz_feijao",
      name_pattern: "{protein} com Arroz, {legume} e {vegetables}",
      structure: "arroz_feijao_proteina_vegetais",
      slots: {
        carb: { options: ["white_rice", "brown_rice"], quantity: 1, required: true },
        legume: { options: ["beans", "boiled_lentils"], quantity: 1, required: true },
        protein: { 
          options: [
            "grilled_chicken_breast", "baked_chicken_thigh", "shredded_chicken",
            "grilled_sirloin_steak", "grilled_round_steak", "sauteed_ground_beef",
            "grilled_tilapia", "grilled_hake", "baked_hake",
            "scrambled_eggs", "plain_omelet"
          ], 
          quantity: 1, 
          required: true 
        },
        vegetables: { 
          options: [
            "iceberg_lettuce", "curly_lettuce", "arugula", "sauteed_spinach", "sauteed_kale", "sauteed_chard",
            "boiled_broccoli", "boiled_cauliflower", "boiled_carrot", "sauteed_zucchini", "boiled_green_beans", "sauteed_eggplant", "sauteed_scarlet_eggplant",
            "tomato", "cucumber", "green_bell_pepper"
          ], 
          quantity: 1, 
          required: true 
        },
      },
      portion_modifier: 0.8,
    },
    {
      id: "jantar_batata_proteina",
      name_pattern: "{protein} com {carb} e {vegetables}",
      structure: "batata_proteina_vegetais",
      slots: {
        carb: { options: ["boiled_sweet_potato", "baked_sweet_potato", "boiled_cassava", "mashed_potato"], quantity: 1, required: true },
        protein: { 
          options: [
            "grilled_chicken_breast", "baked_chicken_thigh",
            "grilled_tilapia", "grilled_hake", "baked_hake",
            "scrambled_eggs", "plain_omelet"
          ], 
          quantity: 1, 
          required: true 
        },
        vegetables: { 
          options: [
            "iceberg_lettuce", "arugula", "sauteed_spinach", "sauteed_chard",
            "boiled_broccoli", "boiled_cauliflower", "boiled_carrot", "sauteed_zucchini", "sauteed_scarlet_eggplant",
            "tomato", "cucumber"
          ], 
          quantity: 1, 
          required: true 
        },
      },
      portion_modifier: 0.8,
    },
  ],
  
  supper: [
    {
      id: "ceia_iogurte",
      name_pattern: "{dairy}",
      structure: "lacteo",
      slots: {
        dairy: { options: ["plain_yogurt", "low_fat_yogurt", "greek_yogurt", "skim_milk", "semi_skimmed_milk"], quantity: 1, required: true },
      }
    },
    {
      id: "ceia_fruta_leite",
      name_pattern: "{fruit} com {dairy}",
      structure: "fruta_lacteo",
      slots: {
        fruit: { options: ["silver_banana", "papaya", "red_apple", "pear", "mango", "strawberry", "kiwi", "grapes", "melon", "guava"], quantity: 1, required: true },
        dairy: { options: ["skim_milk", "semi_skimmed_milk", "low_fat_yogurt", "plain_yogurt", "greek_yogurt"], quantity: 1, required: true },
      }
    },
    {
      id: "ceia_cha",
      name_pattern: "{beverage}",
      structure: "cha",
      slots: {
        beverage: { options: ["chamomile_tea", "green_tea", "black_tea", "fennel_tea", "hibiscus_tea", "lemon_balm_tea"], quantity: 1, required: true },
      }
    },
    {
      id: "ceia_fruta_simples",
      name_pattern: "{fruit}",
      structure: "fruta_simples",
      slots: {
        fruit: { options: ["silver_banana", "red_apple", "pear", "papaya", "mango", "strawberry", "kiwi", "grapes", "melon", "guava"], quantity: 1, required: true },
      }
    },
    {
      id: "ceia_iogurte_fruta",
      name_pattern: "{dairy} com {fruit}",
      structure: "iogurte_fruta",
      slots: {
        dairy: { options: ["plain_yogurt", "greek_yogurt", "low_fat_yogurt"], quantity: 1, required: true },
        fruit: { options: ["silver_banana", "strawberry", "papaya", "mango", "kiwi", "grapes", "guava", "red_apple", "pear", "melon"], quantity: 1, required: true },
      }
    },
    {
      id: "ceia_nuts_simples",
      name_pattern: "{nuts}",
      structure: "oleaginosa_simples",
      slots: {
        nuts: { options: ["brazil_nuts", "cashew_nuts", "peanuts", "walnuts", "amendoas"], quantity: 1, required: true },
      }
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// REGRAS DE COMPOSIÇÃO
// ═══════════════════════════════════════════════════════════════════════

export interface CompositeRule {
  triggers: string[];
  result_name: string;
  result_name_en: string;
  combined_portion: number;
}

export const COMPOSITE_RULES: CompositeRule[] = [
  { triggers: ["iceberg_lettuce", "tomato"], result_name: "Salada de alface com tomate", result_name_en: "Lettuce and tomato salad", combined_portion: 130 },
  { triggers: ["curly_lettuce", "tomato"], result_name: "Salada de alface com tomate", result_name_en: "Lettuce and tomato salad", combined_portion: 130 },
  { triggers: ["arugula", "tomato"], result_name: "Salada de rúcula com tomate", result_name_en: "Arugula and tomato salad", combined_portion: 120 },
  { triggers: ["iceberg_lettuce", "cucumber"], result_name: "Salada de alface com pepino", result_name_en: "Lettuce and cucumber salad", combined_portion: 130 },
  { triggers: ["arugula", "cucumber"], result_name: "Salada de rúcula com pepino", result_name_en: "Arugula and cucumber salad", combined_portion: 120 },
  { triggers: ["watercress", "tomato"], result_name: "Salada de agrião com tomate", result_name_en: "Watercress and tomato salad", combined_portion: 120 },
];

// ═══════════════════════════════════════════════════════════════════════
// REGRAS CULTURAIS
// ═══════════════════════════════════════════════════════════════════════

export const CULTURAL_RULES = {
  BR: {
    required_combinations: [
      { if: "white_rice", then: "beans", probability: 0.9 },
      { if: "brown_rice", then: "beans", probability: 0.9 },
      { if: "parboiled_rice", then: "beans", probability: 0.9 },
    ],
    
    forbidden_combinations: [
      ["whole_wheat_pasta", "beans"],
      ["whole_wheat_pasta", "white_rice"],
      ["whole_wheat_pasta", "brown_rice"],
    ],
  }
};

