import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  validateFood,
  fetchIntoleranceMappings,
  normalizeText,
} from "../_shared/mealGenerationConfig.ts";
import {
  loadSafetyDatabase,
  getDatabaseStats,
  normalizeUserIntolerances,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  name: string;
  food: string;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  };
  shouldBlock: boolean;
  expectedRestriction?: string;
}

// ============= TEST CASES =============
const TEST_CASES: TestCase[] = [
  // === LACTOSE TESTS ===
  {
    name: "Lactose: should block milk",
    food: "leite integral",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_lactose",
  },
  {
    name: "Lactose: should block cheese",
    food: "queijo mussarela",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_lactose",
  },
  {
    name: "Lactose: should block yogurt",
    food: "iogurte natural",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_lactose",
  },
  {
    name: "Lactose: should allow chicken",
    food: "peito de frango grelhado",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === GLUTEN TESTS ===
  {
    name: "Gluten: should block wheat bread",
    food: "pao de trigo",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_gluten",
  },
  {
    name: "Gluten: should block pasta",
    food: "macarrao integral",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true, // Macarrão contém glúten, deve ser bloqueado
    expectedRestriction: "intolerance_gluten",
  },
  {
    name: "Gluten: should allow rice",
    food: "arroz branco",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === PEANUT TESTS ===
  {
    name: "Peanut: should block peanut butter",
    food: "pasta de amendoim",
    restrictions: { intolerances: ["amendoim"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_amendoim",
  },
  {
    name: "Peanut: should allow almonds",
    food: "leite de amendoas",
    restrictions: { intolerances: ["amendoim"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === SEAFOOD TESTS ===
  {
    name: "Seafood: should block shrimp",
    food: "camarao ao alho",
    restrictions: { intolerances: ["frutos_do_mar"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_frutos_do_mar",
  },
  {
    name: "Seafood: should block lobster",
    food: "lagosta grelhada",
    restrictions: { intolerances: ["frutos_do_mar"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_frutos_do_mar",
  },

  // === FISH TESTS ===
  {
    name: "Fish: should block salmon",
    food: "salmao grelhado",
    restrictions: { intolerances: ["peixe"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_peixe",
  },
  {
    name: "Fish: should allow chicken",
    food: "frango assado",
    restrictions: { intolerances: ["peixe"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === EGG TESTS ===
  {
    name: "Eggs: should block eggs directly",
    food: "2 ovos cozidos",
    restrictions: { intolerances: ["ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_ovos",
  },
  {
    name: "Eggs: should block eggs directly",
    food: "2 ovos cozidos",
    restrictions: { intolerances: ["ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_ovos",
  },

  // === SOY TESTS ===
  {
    name: "Soy: should block tofu",
    food: "tofu grelhado",
    restrictions: { intolerances: ["soja"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_soja",
  },
  {
    name: "Soy: should block soy sauce",
    food: "molho de soja",
    restrictions: { intolerances: ["soja"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_soja",
  },

  // === SUGAR TESTS (Diabetes) ===
  {
    name: "Sugar: should block honey",
    food: "mel puro",
    restrictions: { intolerances: ["acucar_diabetes"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_acucar_diabetes",
  },
  {
    name: "Sugar: should block syrup",
    food: "xarope de maple",
    restrictions: { intolerances: ["acucar_diabetes"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_acucar_diabetes",
  },

  // === TREE NUTS TESTS ===
  {
    name: "Tree nuts: should block walnuts",
    food: "nozes picadas",
    restrictions: { intolerances: ["castanhas"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_castanhas",
  },
  {
    name: "Tree nuts: should block almonds",
    food: "amendoas torradas",
    restrictions: { intolerances: ["castanhas"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_castanhas",
  },

  // === VEGAN DIET TESTS ===
  {
    name: "Vegan: should block chicken",
    food: "frango grelhado",
    restrictions: { intolerances: [], dietaryPreference: "vegana", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "dietary_vegan",
  },
  {
    name: "Vegan: should block eggs",
    food: "ovos mexidos",
    restrictions: { intolerances: [], dietaryPreference: "vegana", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "dietary_vegan",
  },
  {
    name: "Vegan: should block milk",
    food: "leite integral",
    restrictions: { intolerances: [], dietaryPreference: "vegana", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "dietary_vegan",
  },
  {
    name: "Vegan: should allow vegetables",
    food: "salada de tomate",
    restrictions: { intolerances: [], dietaryPreference: "vegana", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === VEGETARIAN DIET TESTS ===
  {
    name: "Vegetarian: should block beef",
    food: "bife de alcatra",
    restrictions: { intolerances: [], dietaryPreference: "vegetariana", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "dietary_vegetarian",
  },
  {
    name: "Vegetarian: should block fish",
    food: "file de peixe",
    restrictions: { intolerances: [], dietaryPreference: "vegetariana", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "dietary_vegetarian",
  },
  {
    name: "Vegetarian: should allow eggs",
    food: "ovos mexidos",
    restrictions: { intolerances: [], dietaryPreference: "vegetariana", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "Vegetarian: should allow cheese",
    food: "queijo mussarela",
    restrictions: { intolerances: [], dietaryPreference: "vegetariana", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === PESCATARIAN DIET TESTS ===
  {
    name: "Pescatarian: should block beef",
    food: "carne moida",
    restrictions: { intolerances: [], dietaryPreference: "pescetariana", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "dietary_pescatarian",
  },
  {
    name: "Pescatarian: should allow fish",
    food: "salmao grelhado",
    restrictions: { intolerances: [], dietaryPreference: "pescetariana", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === EXCLUDED INGREDIENTS TESTS ===
  {
    name: "Excluded: should block pork",
    food: "lombo de porco",
    restrictions: { intolerances: [], dietaryPreference: "comum", excludedIngredients: ["porco"] },
    shouldBlock: true,
    expectedRestriction: "excluded_ingredient",
  },
  {
    name: "Excluded: should block liver",
    food: "figado acebolado",
    restrictions: { intolerances: [], dietaryPreference: "comum", excludedIngredients: ["figado"] },
    shouldBlock: true,
    expectedRestriction: "excluded_ingredient",
  },

  // === MULTIPLE RESTRICTIONS TESTS ===
  {
    name: "Multiple: lactose + gluten should block cheese bread",
    food: "pao de queijo",
    restrictions: { intolerances: ["lactose", "gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
  },
  {
    name: "Multiple: vegan + nut allergy should allow beans",
    food: "feijao preto",
    restrictions: { intolerances: ["castanhas"], dietaryPreference: "vegana", excludedIngredients: [] },
    shouldBlock: false,
  },

  // === FODMAP TESTS ===
  {
    name: "FODMAP: should block onion",
    food: "cebola refogada",
    restrictions: { intolerances: ["fodmap"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_fodmap",
  },
  {
    name: "FODMAP: should block garlic",
    food: "alho frito",
    restrictions: { intolerances: ["fodmap"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_fodmap",
  },

  // === HISTAMINE TESTS ===
  {
    name: "Histamine: should block aged cheese",
    food: "queijo curado",
    restrictions: { intolerances: ["histamina"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_histamina",
  },
  {
    name: "Histamine: should block wine",
    food: "molho de vinho",
    restrictions: { intolerances: ["histamina"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_histamina",
  },

  // === SALICYLATES TESTS ===
  {
    name: "Salicylates: should block tomato",
    food: "tomate fresco",
    restrictions: { intolerances: ["salicilatos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_salicilatos",
  },
  {
    name: "Salicylates: should block bell pepper",
    food: "pimentao vermelho",
    restrictions: { intolerances: ["salicilatos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_salicilatos",
  },

  // === NICKEL TESTS ===
  {
    name: "Nickel: should block chocolate",
    food: "chocolate amargo",
    restrictions: { intolerances: ["niquel"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_niquel",
  },
  {
    name: "Nickel: should block oats",
    food: "aveia em flocos",
    restrictions: { intolerances: ["niquel"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_niquel",
  },

  // === ENGLISH LANGUAGE TESTS ===
  {
    name: "English: should block milk",
    food: "whole milk",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_lactose",
  },
  {
    name: "English: should block cheese",
    food: "cheddar cheese",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_lactose",
  },
  {
    name: "English: should block eggs",
    food: "scrambled eggs",
    restrictions: { intolerances: ["ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_ovos",
  },
  {
    name: "English: should block peanuts",
    food: "peanut butter sandwich",
    restrictions: { intolerances: ["amendoim"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_amendoim",
  },

  // ============================================
  // === FALSE POSITIVE PREVENTION TESTS ===
  // ============================================
  // Estes testes garantem que alimentos seguros NÃO sejam incorretamente bloqueados
  // devido a substring matching (ex: "maçã" não deve matchear "macaron")
  
  // --- LACTOSE FALSE POSITIVES ---
  {
    name: "FALSE_POS: Lactose - maçã should NOT match anything",
    food: "maçã fresca",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Lactose - manga should NOT match anything",
    food: "manga madura",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Lactose - banana should NOT match anything",
    food: "banana prata",
    restrictions: { intolerances: ["lactose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- GLUTEN FALSE POSITIVES ---
  {
    name: "FALSE_POS: Gluten - maçã should NOT match gluten",
    food: "maçã verde",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Gluten - rice should NOT match gluten",
    food: "arroz integral",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Gluten - quinoa should NOT match gluten",
    food: "quinoa cozida",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Gluten - milho should NOT match gluten",
    food: "milho cozido",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- PEANUT FALSE POSITIVES ---
  {
    name: "FALSE_POS: Peanut - ameixa should NOT match amendoim",
    food: "ameixa seca",
    restrictions: { intolerances: ["amendoim"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Peanut - amora should NOT match amendoim",
    food: "amora silvestre",
    restrictions: { intolerances: ["amendoim"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Peanut - manga should NOT match amendoim",
    food: "manga rosa",
    restrictions: { intolerances: ["amendoim"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- TREE NUTS FALSE POSITIVES ---
  {
    name: "FALSE_POS: Tree nuts - castanha should NOT match casta",
    food: "casca de limão",
    restrictions: { intolerances: ["castanhas"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Tree nuts - noz should NOT match incorrectly",
    food: "arroz com legumes",
    restrictions: { intolerances: ["castanhas"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- EGG FALSE POSITIVES ---
  {
    name: "FALSE_POS: Egg - ovo should NOT match ovos incorrectly",
    food: "novo prato de arroz",
    restrictions: { intolerances: ["ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Egg - couve should NOT match ovo",
    food: "couve refogada",
    restrictions: { intolerances: ["ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- SOY FALSE POSITIVES ---
  {
    name: "FALSE_POS: Soy - soja should NOT match sojado incorrectly",
    food: "frango assado",
    restrictions: { intolerances: ["soja"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Soy - soy should NOT match boy/joy",
    food: "maçã fresca",
    restrictions: { intolerances: ["soja"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- FISH FALSE POSITIVES ---
  {
    name: "FALSE_POS: Fish - peixe should NOT match incorrectly",
    food: "frango grelhado",
    restrictions: { intolerances: ["peixe"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Fish - fish should NOT match dish",
    food: "main dish salad",
    restrictions: { intolerances: ["peixe"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- SEAFOOD FALSE POSITIVES ---
  {
    name: "FALSE_POS: Seafood - camarão should NOT match câmara",
    food: "maçã da câmara",
    restrictions: { intolerances: ["frutos_do_mar"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Seafood - shrimp should NOT match crimp",
    food: "vegetable dish",
    restrictions: { intolerances: ["frutos_do_mar"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- SUGAR FALSE POSITIVES ---
  {
    name: "FALSE_POS: Sugar - açúcar should NOT match maçã",
    food: "maçã gala",
    restrictions: { intolerances: ["acucar_diabetes"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Sugar - mel should NOT match caramel incorrectly",
    food: "melancia fresca",
    restrictions: { intolerances: ["acucar_diabetes"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- CORN FALSE POSITIVES ---
  {
    name: "FALSE_POS: Corn - milho should NOT match milhões",
    food: "frango com legumes",
    restrictions: { intolerances: ["milho"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Corn - corn should NOT match corner/acorn",
    food: "corner salad",
    restrictions: { intolerances: ["milho"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- CAFFEINE FALSE POSITIVES ---
  {
    name: "FALSE_POS: Caffeine - café should NOT match incorrectly",
    food: "maçã caramelizada",
    restrictions: { intolerances: ["cafeina"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Caffeine - tea should NOT match meat/heat",
    food: "meat with vegetables",
    restrictions: { intolerances: ["cafeina"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- SULFITE FALSE POSITIVES ---
  {
    name: "FALSE_POS: Sulfite - sulfito should NOT match incorrectly",
    food: "salada de alface",
    restrictions: { intolerances: ["sulfito"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- FRUCTOSE FALSE POSITIVES ---
  {
    name: "FALSE_POS: Fructose - frutose should NOT match fruta incorrectly in safe items",
    food: "frango com ervas",
    restrictions: { intolerances: ["frutose"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- HISTAMINE FALSE POSITIVES ---
  {
    name: "FALSE_POS: Histamine - histamina should NOT match incorrectly",
    food: "arroz branco",
    restrictions: { intolerances: ["histamina"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: Histamine - vinho should NOT match vizinho",
    food: "frango vizinho",
    restrictions: { intolerances: ["histamina"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- NICKEL FALSE POSITIVES ---
  {
    name: "FALSE_POS: Nickel - níquel should NOT match incorrectly",
    food: "frango grelhado simples",
    restrictions: { intolerances: ["niquel"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- SALICYLATE FALSE POSITIVES ---
  {
    name: "FALSE_POS: Salicylate - salicilato should NOT match salada incorrectly",
    food: "frango assado",
    restrictions: { intolerances: ["salicilatos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- FODMAP FALSE POSITIVES ---
  {
    name: "FALSE_POS: FODMAP - cebola should NOT match incorrectly",
    food: "frango com arroz",
    restrictions: { intolerances: ["fodmap"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "FALSE_POS: FODMAP - alho should NOT match galho",
    food: "galho de alecrim",
    restrictions: { intolerances: ["fodmap"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // --- SORBITOL FALSE POSITIVES ---
  {
    name: "FALSE_POS: Sorbitol - sorbitol should NOT match incorrectly",
    food: "arroz com legumes",
    restrictions: { intolerances: ["sorbitol"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // === CRITICAL EDGE CASE: MAÇÃ/MACARON ===
  {
    name: "CRITICAL: maçã (apple) must NOT be blocked for ANY intolerance",
    food: "maçã",
    restrictions: { intolerances: ["lactose", "gluten", "amendoim", "castanhas", "soja", "ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "CRITICAL: apple must NOT be blocked for ANY intolerance (English)",
    food: "apple",
    restrictions: { intolerances: ["lactose", "gluten", "amendoim", "castanhas", "soja", "ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "CRITICAL: manzana must NOT be blocked for ANY intolerance (Spanish)",
    food: "manzana",
    restrictions: { intolerances: ["lactose", "gluten", "amendoim", "castanhas", "soja", "ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "CRITICAL: pomme must NOT be blocked for ANY intolerance (French)",
    food: "pomme",
    restrictions: { intolerances: ["lactose", "gluten", "amendoim", "castanhas", "soja", "ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  
  // === SUBSTRING EDGE CASES ===
  {
    name: "EDGE: 'maca' alone should NOT block maçã",
    food: "suco de maçã natural",
    restrictions: { intolerances: ["lactose", "gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: false,
  },
  {
    name: "EDGE: short words should require exact match",
    food: "ovo cozido",
    restrictions: { intolerances: ["ovos"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_ovos",
  },
  {
    name: "EDGE: macaron SHOULD be blocked for gluten",
    food: "macaron de chocolate",
    restrictions: { intolerances: ["gluten"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_gluten",
  },
  {
    name: "EDGE: macadamia SHOULD be blocked for tree nuts",
    food: "nozes de macadamia",
    restrictions: { intolerances: ["castanhas"], dietaryPreference: "comum", excludedIngredients: [] },
    shouldBlock: true,
    expectedRestriction: "intolerance_castanhas",
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch intolerance mappings from database
    const { mappings, safeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    
    console.log(`[SECURITY-TEST] Running ${TEST_CASES.length} test cases...`);
    console.log(`[SECURITY-TEST] Loaded ${mappings.length} intolerance mappings, ${safeKeywords.length} safe keywords`);
    
    // Debug: verificar se amendoim está nos mappings para peanut
    const peanutMappings = mappings.filter(m => m.intolerance_key === 'peanut');
    console.log(`[SECURITY-TEST] Peanut mappings count: ${peanutMappings.length}`);
    const hasAmendoim = peanutMappings.some(m => m.ingredient.includes('amendoim'));
    console.log(`[SECURITY-TEST] Has 'amendoim' in peanut: ${hasAmendoim}`);
    
    // Debug: verificar fish mappings
    const fishMappings = mappings.filter(m => m.intolerance_key === 'fish');
    console.log(`[SECURITY-TEST] Fish mappings count: ${fishMappings.length}`);
    const hasSalmao = fishMappings.some(m => m.ingredient.includes('salmao'));
    console.log(`[SECURITY-TEST] Has 'salmao' in fish: ${hasSalmao}`);
    
    // Verificar seafood
    const seafoodMappings = mappings.filter(m => m.intolerance_key === 'seafood');
    console.log(`[SECURITY-TEST] Seafood mappings count: ${seafoodMappings.length}`);
    const hasCamarao = seafoodMappings.some(m => m.ingredient.includes('camarao'));
    console.log(`[SECURITY-TEST] Has 'camarao' in seafood: ${hasCamarao}`);
    const results: {
      passed: number;
      failed: number;
      tests: {
        name: string;
        passed: boolean;
        expected: string;
        actual: string;
        food: string;
      }[];
    } = {
      passed: 0,
      failed: 0,
      tests: [],
    };

    // Carregar database para normalização
    const safetyDb = await loadSafetyDatabase();

    for (const testCase of TEST_CASES) {
      // Normalizar intolerâncias (ex: "ovos" -> "egg")
      const normalizedIntolerances = normalizeUserIntolerances(testCase.restrictions.intolerances, safetyDb);
      
      const result = validateFood(
        testCase.food,
        { ...testCase.restrictions, intolerances: normalizedIntolerances },
        mappings,
        safeKeywords
      );

      const actualBlocked = !result.isValid;
      const passed = actualBlocked === testCase.shouldBlock;

      if (passed) {
        results.passed++;
      } else {
        results.failed++;
        console.log(`[SECURITY-TEST] ❌ FAILED: ${testCase.name}`);
        console.log(`  Food: "${testCase.food}"`);
        console.log(`  Expected blocked: ${testCase.shouldBlock}, Actual blocked: ${actualBlocked}`);
        console.log(`  Result: ${JSON.stringify(result)}`);
      }

      results.tests.push({
        name: testCase.name,
        passed,
        expected: testCase.shouldBlock ? `BLOCK (${testCase.expectedRestriction || 'any'})` : 'ALLOW',
        actual: actualBlocked ? `BLOCKED (${result.restriction})` : 'ALLOWED',
        food: testCase.food,
      });
    }

    // Summary
    const summary = {
      total: TEST_CASES.length,
      passed: results.passed,
      failed: results.failed,
      passRate: `${((results.passed / TEST_CASES.length) * 100).toFixed(1)}%`,
      status: results.failed === 0 ? 'ALL TESTS PASSED ✅' : `${results.failed} TESTS FAILED ❌`,
    };

    console.log(`[SECURITY-TEST] Summary: ${summary.status}`);
    console.log(`[SECURITY-TEST] Pass rate: ${summary.passRate} (${results.passed}/${TEST_CASES.length})`);

    // Detailed failed tests
    const failedTests = results.tests.filter(t => !t.passed);

    // Get database stats from globalSafetyEngine
    let dbStats = "Unable to load";
    try {
      const safetyDb = await loadSafetyDatabase();
      dbStats = getDatabaseStats(safetyDb);
    } catch (e) {
      console.error('[SECURITY-TEST] Error loading safety database stats:', e);
    }

    return new Response(JSON.stringify({
      summary,
      failedTests,
      allTests: results.tests,
      metadata: {
        intolerance_mappings_count: mappings.length,
        safe_keywords_count: safeKeywords.length,
        database_stats: dbStats,
        architecture: "globalSafetyEngine v1.0 - Centralized validation",
      },
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SECURITY-TEST] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

