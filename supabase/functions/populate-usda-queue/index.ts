import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[USDA-QUEUE] ${step}:`, details ? JSON.stringify(details) : "");
};

// Lista MASSIVA de alimentos para importar - organizada por categorias
const FOOD_CATEGORIES: Record<string, string[]> = {
  fruits: [
    "apple", "banana", "orange", "strawberry", "blueberry", "raspberry", "blackberry",
    "grape", "watermelon", "cantaloupe", "honeydew", "pineapple", "mango", "papaya",
    "kiwi", "peach", "plum", "nectarine", "apricot", "cherry", "pomegranate", "fig",
    "date", "raisin", "prune", "cranberry", "grapefruit", "lemon", "lime", "tangerine",
    "clementine", "coconut", "avocado", "guava", "passion fruit", "dragon fruit",
    "lychee", "persimmon", "quince", "mulberry", "gooseberry", "currant", "acai",
    "starfruit", "jackfruit", "durian", "rambutan", "mangosteen", "plantain",
    "red apple", "green apple", "fuji apple", "gala apple", "granny smith apple",
    "blood orange", "navel orange", "mandarin orange", "satsuma", "kumquat",
    "red grape", "green grape", "concord grape", "seedless grape",
    "frozen strawberry", "frozen blueberry", "frozen raspberry", "frozen mango",
    "dried apricot", "dried fig", "dried mango", "dried pineapple", "dried banana",
    "canned peach", "canned pear", "canned pineapple", "canned mandarin"
  ],
  vegetables: [
    "broccoli", "carrot", "spinach", "kale", "lettuce", "tomato", "cucumber", "pepper",
    "onion", "garlic", "potato", "sweet potato", "corn", "peas", "green beans",
    "asparagus", "artichoke", "beet", "cabbage", "brussels sprouts", "cauliflower",
    "celery", "eggplant", "leek", "mushroom", "okra", "parsnip", "radish", "squash",
    "zucchini", "turnip", "rutabaga", "kohlrabi", "chard", "collard greens", "arugula",
    "watercress", "endive", "radicchio", "fennel", "ginger", "turmeric", "horseradish",
    "jicama", "taro", "yam", "cassava", "bamboo shoots", "water chestnut", "bok choy",
    "napa cabbage", "daikon", "edamame", "snow peas", "sugar snap peas",
    "red bell pepper", "green bell pepper", "yellow bell pepper", "orange bell pepper",
    "jalapeno pepper", "serrano pepper", "habanero pepper", "poblano pepper",
    "red onion", "white onion", "yellow onion", "green onion", "shallot",
    "cherry tomato", "roma tomato", "beefsteak tomato", "grape tomato", "sun-dried tomato",
    "russet potato", "red potato", "yukon gold potato", "fingerling potato",
    "butternut squash", "acorn squash", "spaghetti squash", "delicata squash",
    "portobello mushroom", "shiitake mushroom", "cremini mushroom", "oyster mushroom",
    "white mushroom", "enoki mushroom", "maitake mushroom", "chanterelle mushroom",
    "iceberg lettuce", "romaine lettuce", "butter lettuce", "mixed greens",
    "baby spinach", "frozen spinach", "frozen broccoli", "frozen peas", "frozen corn",
    "canned corn", "canned tomato", "tomato paste", "tomato sauce", "crushed tomato"
  ],
  proteins_meat: [
    "chicken breast", "chicken thigh", "chicken wing", "chicken drumstick", "ground chicken",
    "beef steak", "ground beef", "beef roast", "beef ribs", "beef liver",
    "pork chop", "pork tenderloin", "ground pork", "pork ribs", "bacon", "ham",
    "lamb chop", "lamb leg", "ground lamb", "lamb shoulder",
    "turkey breast", "ground turkey", "turkey leg", "turkey sausage",
    "duck breast", "duck leg", "goose", "venison", "bison", "rabbit",
    "veal", "organ meats", "liver", "kidney", "heart", "tongue",
    "ribeye steak", "sirloin steak", "filet mignon", "t-bone steak", "new york strip",
    "flank steak", "skirt steak", "chuck roast", "brisket", "short ribs",
    "pork belly", "pork shoulder", "pork loin", "canadian bacon", "prosciutto",
    "pancetta", "guanciale", "chorizo", "salami", "pepperoni", "sausage",
    "italian sausage", "breakfast sausage", "hot dog", "bratwurst", "kielbasa",
    "deli turkey", "deli ham", "deli roast beef", "deli chicken", "bologna",
    "corned beef", "pastrami", "beef jerky", "turkey jerky",
    "whole chicken", "rotisserie chicken", "chicken liver", "chicken gizzard",
    "bone-in chicken breast", "boneless chicken thigh", "chicken tender"
  ],
  proteins_seafood: [
    "salmon", "tuna", "cod", "tilapia", "halibut", "mackerel", "sardine", "anchovy",
    "trout", "bass", "catfish", "flounder", "sole", "snapper", "grouper", "mahi mahi",
    "swordfish", "herring", "carp", "pike", "perch",
    "shrimp", "lobster", "crab", "clam", "mussel", "oyster", "scallop", "squid",
    "octopus", "crawfish", "crayfish", "langoustine", "prawn",
    "atlantic salmon", "sockeye salmon", "king salmon", "smoked salmon", "lox",
    "ahi tuna", "yellowfin tuna", "bluefin tuna", "canned tuna", "tuna steak",
    "pacific cod", "atlantic cod", "salt cod", "fish sticks", "fish fillet",
    "jumbo shrimp", "medium shrimp", "cooked shrimp", "raw shrimp", "shrimp cocktail",
    "king crab", "snow crab", "dungeness crab", "crab meat", "crab cake",
    "maine lobster", "lobster tail", "lobster meat",
    "blue mussel", "green mussel", "smoked mussel",
    "fresh oyster", "smoked oyster", "canned oyster",
    "bay scallop", "sea scallop", "calamari", "fried calamari",
    "fish sauce", "oyster sauce", "anchovies in oil"
  ],
  dairy: [
    "milk whole", "milk skim", "milk 2%", "milk 1%", "buttermilk", "cream", "half and half",
    "yogurt plain", "yogurt greek", "yogurt flavored", "kefir",
    "cheese cheddar", "cheese mozzarella", "cheese parmesan", "cheese swiss", "cheese feta",
    "cheese gouda", "cheese brie", "cheese camembert", "cheese blue", "cheese goat",
    "cheese ricotta", "cheese cottage", "cheese cream", "cheese provolone", "cheese colby",
    "butter", "ghee", "sour cream", "whipped cream", "ice cream", "frozen yogurt",
    "heavy cream", "light cream", "whipping cream", "clotted cream",
    "nonfat greek yogurt", "lowfat yogurt", "vanilla yogurt", "strawberry yogurt",
    "sharp cheddar", "mild cheddar", "aged cheddar", "white cheddar",
    "fresh mozzarella", "buffalo mozzarella", "string cheese", "cheese curds",
    "grated parmesan", "pecorino romano", "asiago", "manchego", "gruyere",
    "mascarpone", "neufchatel", "queso fresco", "queso blanco", "paneer",
    "salted butter", "unsalted butter", "clarified butter", "cultured butter",
    "vanilla ice cream", "chocolate ice cream", "strawberry ice cream", "gelato",
    "sorbet", "sherbet", "frozen custard", "ice cream sandwich",
    "evaporated milk", "condensed milk", "powdered milk", "dry milk"
  ],
  grains: [
    "rice white", "rice brown", "rice basmati", "rice jasmine", "rice wild",
    "wheat flour", "whole wheat flour", "bread white", "bread whole wheat", "bread rye",
    "pasta spaghetti", "pasta penne", "pasta macaroni", "pasta linguine", "pasta fettuccine",
    "oatmeal", "oat bran", "steel cut oats", "rolled oats",
    "quinoa", "couscous", "bulgur", "farro", "barley", "millet", "buckwheat", "amaranth",
    "cornmeal", "polenta", "grits", "tortilla corn", "tortilla flour",
    "bagel", "muffin", "croissant", "biscuit", "pancake", "waffle",
    "long grain rice", "short grain rice", "sushi rice", "arborio rice", "black rice",
    "all purpose flour", "bread flour", "cake flour", "pastry flour", "self rising flour",
    "sourdough bread", "ciabatta", "focaccia", "pita bread", "naan bread", "flatbread",
    "english muffin", "hamburger bun", "hot dog bun", "dinner roll", "french bread",
    "pasta rigatoni", "pasta rotini", "pasta farfalle", "pasta orzo", "pasta lasagna",
    "whole wheat pasta", "gluten free pasta", "rice noodles", "egg noodles", "ramen noodles",
    "udon noodles", "soba noodles", "vermicelli", "angel hair pasta", "stuffed pasta",
    "instant oatmeal", "quick oats", "oat flour", "granola", "muesli",
    "cereal corn flakes", "cereal bran flakes", "cereal cheerios", "cereal shredded wheat",
    "cream of wheat", "cream of rice", "grits instant", "hominy"
  ],
  legumes: [
    "black beans", "kidney beans", "pinto beans", "navy beans", "cannellini beans",
    "chickpeas", "lentils green", "lentils red", "lentils brown", "split peas",
    "lima beans", "fava beans", "mung beans", "adzuki beans", "black eyed peas",
    "soybeans", "tofu firm", "tofu silken", "tempeh", "edamame",
    "peanuts", "peanut butter",
    "great northern beans", "butter beans", "cranberry beans", "red beans",
    "canned black beans", "canned kidney beans", "canned chickpeas", "canned lentils",
    "dried black beans", "dried pinto beans", "dried navy beans", "dried chickpeas",
    "hummus", "falafel", "bean sprouts", "soy sauce", "miso paste",
    "tofu extra firm", "smoked tofu", "fried tofu", "tofu skin",
    "crunchy peanut butter", "smooth peanut butter", "natural peanut butter",
    "soy milk", "soy protein", "textured vegetable protein", "seitan"
  ],
  nuts_seeds: [
    "almonds", "walnuts", "cashews", "pecans", "pistachios", "macadamia nuts",
    "hazelnuts", "brazil nuts", "pine nuts", "chestnuts",
    "sunflower seeds", "pumpkin seeds", "chia seeds", "flax seeds", "hemp seeds",
    "sesame seeds", "poppy seeds", "almond butter", "cashew butter", "tahini",
    "raw almonds", "roasted almonds", "salted almonds", "sliced almonds", "almond flour",
    "raw walnuts", "candied walnuts", "walnut pieces", "walnut halves",
    "raw cashews", "roasted cashews", "cashew pieces",
    "shelled pistachios", "roasted pistachios", "pistachio butter",
    "ground flaxseed", "whole flaxseed", "flaxseed oil",
    "hulled hemp seeds", "shelled sunflower seeds", "sunflower butter",
    "pumpkin seed butter", "mixed nuts", "trail mix", "nut butter"
  ],
  oils_fats: [
    "olive oil", "coconut oil", "vegetable oil", "canola oil", "sunflower oil",
    "avocado oil", "sesame oil", "peanut oil", "corn oil", "safflower oil",
    "lard", "tallow", "duck fat", "palm oil", "grapeseed oil", "flaxseed oil",
    "extra virgin olive oil", "light olive oil", "virgin coconut oil", "refined coconut oil",
    "toasted sesame oil", "walnut oil", "hazelnut oil", "macadamia oil",
    "mct oil", "cooking spray", "shortening", "margarine", "vegan butter"
  ],
  herbs_spices: [
    "basil fresh", "oregano", "thyme", "rosemary", "sage", "parsley", "cilantro",
    "dill", "mint", "tarragon", "chives", "bay leaf", "marjoram",
    "black pepper", "salt", "cumin", "coriander", "paprika", "cayenne pepper",
    "cinnamon", "nutmeg", "cloves", "cardamom", "allspice", "ginger ground",
    "turmeric ground", "curry powder", "chili powder", "garlic powder", "onion powder",
    "mustard seed", "fennel seed", "caraway seed", "saffron", "vanilla",
    "smoked paprika", "sweet paprika", "hot paprika", "ancho chili", "chipotle powder",
    "italian seasoning", "herbs de provence", "za'atar", "garam masala", "chinese five spice",
    "cajun seasoning", "old bay seasoning", "taco seasoning", "ranch seasoning",
    "vanilla extract", "vanilla bean", "almond extract", "lemon extract", "peppermint extract",
    "fresh ginger", "fresh turmeric", "lemongrass", "galangal", "kaffir lime leaves"
  ],
  beverages: [
    "coffee brewed", "tea black", "tea green", "tea herbal", "orange juice",
    "apple juice", "grape juice", "cranberry juice", "tomato juice",
    "coconut water", "almond milk", "soy milk", "oat milk", "rice milk",
    "espresso", "cappuccino", "latte", "americano", "cold brew coffee",
    "iced tea", "sweet tea", "chai tea", "matcha", "oolong tea", "white tea",
    "fresh squeezed orange juice", "grapefruit juice", "lemonade", "limeade",
    "vegetable juice", "carrot juice", "beet juice", "celery juice", "green juice",
    "protein shake", "smoothie", "milkshake", "horchata", "agua fresca",
    "sparkling water", "mineral water", "tonic water", "club soda",
    "cashew milk", "hemp milk", "flax milk", "pea milk", "macadamia milk"
  ],
  condiments: [
    "ketchup", "mustard", "mayonnaise", "soy sauce", "worcestershire sauce",
    "hot sauce", "barbecue sauce", "teriyaki sauce", "salsa", "guacamole",
    "hummus", "vinegar", "balsamic vinegar", "apple cider vinegar", "rice vinegar",
    "honey", "maple syrup", "molasses", "agave nectar",
    "yellow mustard", "dijon mustard", "whole grain mustard", "honey mustard",
    "sriracha", "tabasco", "frank's red hot", "cholula", "sambal oelek",
    "hoisin sauce", "fish sauce", "oyster sauce", "ponzu", "mirin",
    "red wine vinegar", "white wine vinegar", "sherry vinegar", "champagne vinegar",
    "extra virgin olive oil dressing", "ranch dressing", "caesar dressing", "italian dressing",
    "balsamic glaze", "chimichurri", "pesto", "tzatziki", "aioli",
    "relish", "pickle relish", "capers", "olives", "pickled ginger"
  ],
  baking: [
    "sugar white", "sugar brown", "powdered sugar", "raw sugar", "coconut sugar",
    "baking powder", "baking soda", "yeast active dry", "yeast instant",
    "chocolate chips", "cocoa powder", "dark chocolate", "milk chocolate", "white chocolate",
    "vanilla extract", "almond extract", "coconut extract",
    "cornstarch", "arrowroot", "tapioca starch", "potato starch",
    "gelatin", "pectin", "cream of tartar", "food coloring",
    "canned pumpkin", "evaporated milk", "condensed milk", "coconut milk canned",
    "shredded coconut", "desiccated coconut", "coconut flakes",
    "dried cranberries", "golden raisins", "currants", "candied fruit"
  ],
  snacks: [
    "potato chips", "tortilla chips", "pretzels", "popcorn", "crackers",
    "trail mix", "granola bar", "protein bar", "dried fruit", "beef jerky",
    "kettle chips", "baked chips", "veggie chips", "pita chips", "rice cakes",
    "cheese crackers", "graham crackers", "animal crackers", "saltine crackers",
    "microwave popcorn", "caramel corn", "kettle corn", "cheese popcorn",
    "fruit snacks", "fruit leather", "dried mango", "dried apricot", "dried apple",
    "dark chocolate almonds", "yogurt covered raisins", "chocolate covered pretzels",
    "energy bar", "oat bar", "nut bar", "date bar", "breakfast bar"
  ],
  prepared_foods: [
    "pizza cheese", "hamburger", "hot dog", "french fries", "mashed potatoes",
    "macaroni and cheese", "fried chicken", "grilled chicken", "roasted chicken",
    "beef stew", "chicken soup", "vegetable soup", "chili con carne", "lasagna",
    "spaghetti with meat sauce", "burrito", "taco", "enchilada", "quesadilla",
    "fried rice", "stir fry vegetables", "curry chicken", "pad thai",
    "pepperoni pizza", "veggie pizza", "margherita pizza", "deep dish pizza",
    "cheeseburger", "bacon cheeseburger", "veggie burger", "turkey burger",
    "caesar salad", "greek salad", "cobb salad", "garden salad", "chef salad",
    "chicken noodle soup", "tomato soup", "minestrone", "clam chowder", "french onion soup",
    "beef tacos", "chicken tacos", "fish tacos", "carnitas", "al pastor",
    "chicken fried rice", "shrimp fried rice", "vegetable fried rice", "egg fried rice",
    "butter chicken", "tikka masala", "vindaloo", "korma", "biryani",
    "general tso chicken", "orange chicken", "kung pao chicken", "sweet and sour pork",
    "spring rolls", "egg rolls", "dumplings", "pot stickers", "wontons",
    "sushi roll", "sashimi", "nigiri", "california roll", "spicy tuna roll"
  ],
  breakfast: [
    "eggs scrambled", "eggs fried", "eggs poached", "eggs hard boiled", "eggs soft boiled",
    "omelette", "frittata", "eggs benedict", "quiche", "shakshuka",
    "pancakes", "waffles", "french toast", "crepes", "dutch baby",
    "cereal with milk", "oatmeal with fruit", "granola with yogurt", "smoothie bowl",
    "bacon strips", "sausage links", "sausage patty", "ham steak",
    "hash browns", "home fries", "breakfast potatoes", "tater tots",
    "toast with butter", "toast with jam", "toast with avocado", "bagel with cream cheese",
    "english muffin with egg", "breakfast sandwich", "breakfast burrito", "breakfast taco"
  ],
  desserts: [
    "chocolate cake", "vanilla cake", "carrot cake", "red velvet cake", "cheesecake",
    "apple pie", "pumpkin pie", "pecan pie", "cherry pie", "blueberry pie",
    "chocolate chip cookie", "oatmeal raisin cookie", "peanut butter cookie", "sugar cookie",
    "brownie", "blondie", "lemon bar", "rice krispie treat",
    "ice cream sundae", "banana split", "milkshake chocolate", "milkshake vanilla",
    "pudding chocolate", "pudding vanilla", "creme brulee", "flan", "tiramisu",
    "mousse chocolate", "panna cotta", "custard", "creme caramel",
    "donut glazed", "donut chocolate", "danish pastry", "cinnamon roll", "sticky bun"
  ],
  baby_food: [
    "baby formula", "infant formula", "toddler formula",
    "baby cereal rice", "baby cereal oatmeal", "baby cereal multigrain",
    "baby food banana", "baby food apple", "baby food pear", "baby food peach",
    "baby food carrot", "baby food sweet potato", "baby food peas", "baby food green beans",
    "baby food chicken", "baby food turkey", "baby food beef",
    "baby puffs", "baby yogurt melts", "baby teething biscuit"
  ],
  international: [
    "tofu japanese", "miso soup", "edamame steamed", "gyoza", "tempura",
    "kimchi", "bulgogi", "bibimbap", "japchae", "korean bbq",
    "pho", "banh mi", "spring roll vietnamese", "bun cha",
    "pad see ew", "green curry", "red curry", "massaman curry", "tom yum",
    "naan bread", "samosa", "pakora", "dal", "palak paneer",
    "shawarma", "falafel wrap", "tabbouleh", "baba ganoush", "fattoush",
    "paella", "gazpacho", "patatas bravas", "churros", "sangria",
    "croissant plain", "pain au chocolat", "quiche lorraine", "coq au vin", "ratatouille",
    "bratwurst", "schnitzel", "sauerkraut", "pretzel soft", "strudel",
    "moussaka", "souvlaki", "spanakopita", "dolmas", "baklava",
    "gnocchi", "risotto", "bruschetta", "caprese salad", "osso buco"
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

