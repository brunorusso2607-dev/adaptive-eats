import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[USDA-QUEUE] ${step}:`, details ? JSON.stringify(details) : "");
};

// Lista extensa de alimentos para importar - organizada por categorias
const FOOD_CATEGORIES = {
  fruits: [
    "apple", "banana", "orange", "strawberry", "blueberry", "raspberry", "blackberry",
    "grape", "watermelon", "cantaloupe", "honeydew", "pineapple", "mango", "papaya",
    "kiwi", "peach", "plum", "nectarine", "apricot", "cherry", "pomegranate", "fig",
    "date", "raisin", "prune", "cranberry", "grapefruit", "lemon", "lime", "tangerine",
    "clementine", "coconut", "avocado", "guava", "passion fruit", "dragon fruit",
    "lychee", "persimmon", "quince", "mulberry", "gooseberry", "currant", "acai",
    "starfruit", "jackfruit", "durian", "rambutan", "mangosteen", "plantain"
  ],
  vegetables: [
    "broccoli", "carrot", "spinach", "kale", "lettuce", "tomato", "cucumber", "pepper",
    "onion", "garlic", "potato", "sweet potato", "corn", "peas", "green beans",
    "asparagus", "artichoke", "beet", "cabbage", "brussels sprouts", "cauliflower",
    "celery", "eggplant", "leek", "mushroom", "okra", "parsnip", "radish", "squash",
    "zucchini", "turnip", "rutabaga", "kohlrabi", "chard", "collard greens", "arugula",
    "watercress", "endive", "radicchio", "fennel", "ginger", "turmeric", "horseradish",
    "jicama", "taro", "yam", "cassava", "bamboo shoots", "water chestnut", "bok choy",
    "napa cabbage", "daikon", "edamame", "snow peas", "sugar snap peas"
  ],
  proteins_meat: [
    "chicken breast", "chicken thigh", "chicken wing", "chicken drumstick", "ground chicken",
    "beef steak", "ground beef", "beef roast", "beef ribs", "beef liver",
    "pork chop", "pork tenderloin", "ground pork", "pork ribs", "bacon", "ham",
    "lamb chop", "lamb leg", "ground lamb", "lamb shoulder",
    "turkey breast", "ground turkey", "turkey leg", "turkey sausage",
    "duck breast", "duck leg", "goose", "venison", "bison", "rabbit",
    "veal", "organ meats", "liver", "kidney", "heart", "tongue"
  ],
  proteins_seafood: [
    "salmon", "tuna", "cod", "tilapia", "halibut", "mackerel", "sardine", "anchovy",
    "trout", "bass", "catfish", "flounder", "sole", "snapper", "grouper", "mahi mahi",
    "swordfish", "herring", "carp", "pike", "perch",
    "shrimp", "lobster", "crab", "clam", "mussel", "oyster", "scallop", "squid",
    "octopus", "crawfish", "crayfish", "langoustine", "prawn"
  ],
  dairy: [
    "milk whole", "milk skim", "milk 2%", "milk 1%", "buttermilk", "cream", "half and half",
    "yogurt plain", "yogurt greek", "yogurt flavored", "kefir",
    "cheese cheddar", "cheese mozzarella", "cheese parmesan", "cheese swiss", "cheese feta",
    "cheese gouda", "cheese brie", "cheese camembert", "cheese blue", "cheese goat",
    "cheese ricotta", "cheese cottage", "cheese cream", "cheese provolone", "cheese colby",
    "butter", "ghee", "sour cream", "whipped cream", "ice cream", "frozen yogurt"
  ],
  grains: [
    "rice white", "rice brown", "rice basmati", "rice jasmine", "rice wild",
    "wheat flour", "whole wheat flour", "bread white", "bread whole wheat", "bread rye",
    "pasta spaghetti", "pasta penne", "pasta macaroni", "pasta linguine", "pasta fettuccine",
    "oatmeal", "oat bran", "steel cut oats", "rolled oats",
    "quinoa", "couscous", "bulgur", "farro", "barley", "millet", "buckwheat", "amaranth",
    "cornmeal", "polenta", "grits", "tortilla corn", "tortilla flour",
    "bagel", "muffin", "croissant", "biscuit", "pancake", "waffle"
  ],
  legumes: [
    "black beans", "kidney beans", "pinto beans", "navy beans", "cannellini beans",
    "chickpeas", "lentils green", "lentils red", "lentils brown", "split peas",
    "lima beans", "fava beans", "mung beans", "adzuki beans", "black eyed peas",
    "soybeans", "tofu firm", "tofu silken", "tempeh", "edamame",
    "peanuts", "peanut butter"
  ],
  nuts_seeds: [
    "almonds", "walnuts", "cashews", "pecans", "pistachios", "macadamia nuts",
    "hazelnuts", "brazil nuts", "pine nuts", "chestnuts",
    "sunflower seeds", "pumpkin seeds", "chia seeds", "flax seeds", "hemp seeds",
    "sesame seeds", "poppy seeds", "almond butter", "cashew butter", "tahini"
  ],
  oils_fats: [
    "olive oil", "coconut oil", "vegetable oil", "canola oil", "sunflower oil",
    "avocado oil", "sesame oil", "peanut oil", "corn oil", "safflower oil",
    "lard", "tallow", "duck fat", "palm oil", "grapeseed oil", "flaxseed oil"
  ],
  herbs_spices: [
    "basil fresh", "oregano", "thyme", "rosemary", "sage", "parsley", "cilantro",
    "dill", "mint", "tarragon", "chives", "bay leaf", "marjoram",
    "black pepper", "salt", "cumin", "coriander", "paprika", "cayenne pepper",
    "cinnamon", "nutmeg", "cloves", "cardamom", "allspice", "ginger ground",
    "turmeric ground", "curry powder", "chili powder", "garlic powder", "onion powder",
    "mustard seed", "fennel seed", "caraway seed", "saffron", "vanilla"
  ],
  beverages: [
    "coffee brewed", "tea black", "tea green", "tea herbal", "orange juice",
    "apple juice", "grape juice", "cranberry juice", "tomato juice",
    "coconut water", "almond milk", "soy milk", "oat milk", "rice milk"
  ],
  condiments: [
    "ketchup", "mustard", "mayonnaise", "soy sauce", "worcestershire sauce",
    "hot sauce", "barbecue sauce", "teriyaki sauce", "salsa", "guacamole",
    "hummus", "vinegar", "balsamic vinegar", "apple cider vinegar", "rice vinegar",
    "honey", "maple syrup", "molasses", "agave nectar"
  ],
  snacks: [
    "potato chips", "tortilla chips", "pretzels", "popcorn", "crackers",
    "trail mix", "granola bar", "protein bar", "dried fruit", "beef jerky"
  ],
  prepared_foods: [
    "pizza cheese", "hamburger", "hot dog", "french fries", "mashed potatoes",
    "macaroni and cheese", "fried chicken", "grilled chicken", "roasted chicken",
    "beef stew", "chicken soup", "vegetable soup", "chili con carne", "lasagna",
    "spaghetti with meat sauce", "burrito", "taco", "enchilada", "quesadilla",
    "fried rice", "stir fry vegetables", "curry chicken", "pad thai"
  ]
};

// Função para obter todos os alimentos em ordem
function getAllFoods(): Array<{ term: string; category: string }> {
  const allFoods: Array<{ term: string; category: string }> = [];
  
  for (const [category, foods] of Object.entries(FOOD_CATEGORIES)) {
    for (const food of foods) {
      allFoods.push({ term: food, category });
    }
  }
  
  return allFoods;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parâmetros: quantos alimentos adicionar por execução
    const body = await req.json().catch(() => ({}));
    const itemsToAdd = body.itemsToAdd || 50; // 50 por hora = 500/10 execuções por hora
    const forceRefill = body.forceRefill || false;

    logStep("Starting queue population", { itemsToAdd, forceRefill });

    // Verificar quantos itens pendentes existem na fila
    const { count: pendingCount } = await supabase
      .from("usda_import_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    logStep("Current pending items", { pendingCount });

    // Se já tiver muitos pendentes, não adicionar mais (a menos que forceRefill)
    if (!forceRefill && (pendingCount || 0) >= 100) {
      logStep("Queue has enough items, skipping");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Fila já tem itens suficientes", 
          pendingCount,
          added: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar todos os termos já na fila (para não duplicar)
    const { data: existingItems } = await supabase
      .from("usda_import_queue")
      .select("search_term");

    const existingTerms = new Set(
      (existingItems || []).map(item => item.search_term.toLowerCase())
    );

    // Buscar todos os alimentos já importados (para não duplicar)
    const { data: existingFoods } = await supabase
      .from("foods")
      .select("name")
      .eq("source", "usda");

    const existingFoodNames = new Set(
      (existingFoods || []).map(food => food.name.toLowerCase())
    );

    logStep("Existing items", { 
      inQueue: existingTerms.size, 
      inFoods: existingFoodNames.size 
    });

    // Obter todos os alimentos disponíveis
    const allFoods = getAllFoods();
    
    // Filtrar os que ainda não foram adicionados
    const newFoods = allFoods.filter(food => 
      !existingTerms.has(food.term.toLowerCase()) &&
      !existingFoodNames.has(food.term.toLowerCase())
    );

    logStep("Available new foods", { count: newFoods.length });

    if (newFoods.length === 0) {
      logStep("No new foods to add");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Todos os alimentos já foram adicionados à fila ou importados", 
          added: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Selecionar próximos itens para adicionar
    const itemsToInsert = newFoods.slice(0, itemsToAdd).map((food, index) => ({
      search_term: food.term,
      category: food.category,
      priority: 10 - Math.floor(index / 10), // Prioridade decrescente
      status: "pending",
      attempts: 0,
    }));

    logStep("Inserting items", { count: itemsToInsert.length });

    // Inserir na fila
    const { error: insertError } = await supabase
      .from("usda_import_queue")
      .insert(itemsToInsert);

    if (insertError) {
      throw new Error(`Erro ao inserir na fila: ${insertError.message}`);
    }

    logStep("Successfully added items to queue", { 
      added: itemsToInsert.length,
      categories: [...new Set(itemsToInsert.map(i => i.category))]
    });

    return new Response(
      JSON.stringify({
        success: true,
        added: itemsToInsert.length,
        remainingNew: newFoods.length - itemsToInsert.length,
        pendingInQueue: (pendingCount || 0) + itemsToInsert.length,
        categories: [...new Set(itemsToInsert.map(i => i.category))],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("Error", { error: error.message });
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
