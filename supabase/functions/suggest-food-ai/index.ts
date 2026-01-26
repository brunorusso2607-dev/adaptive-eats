import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat
} from "../_shared/nutritionPrompt.ts";
// ============= GLOBAL SAFETY ENGINE (CENTRALIZED) =============
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredient,
  getIntoleranceLabel,
  getDietaryLabel,
  type UserRestrictions,
  type SafetyDatabase,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SUGGEST-FOOD-AI] ${step}:`, details ? JSON.stringify(details) : '');
};

// Country-specific popular foods for prioritization
const COUNTRY_FOODS: Record<string, string[]> = {
  BR: ["Pão de Queijo", "Açaí", "Coxinha", "Feijoada", "Picanha", "Brigadeiro", "Tapioca", "Moqueca", "Pastel", "Acarajé"],
  US: ["Hamburger", "Hot Dog", "Mac and Cheese", "Buffalo Wings", "Pancakes", "Apple Pie", "Cheesecake", "BBQ Ribs", "Fried Chicken", "Pizza"],
  MX: ["Tacos", "Burritos", "Quesadilla", "Enchiladas", "Guacamole", "Tamales", "Churros", "Pozole", "Chilaquiles", "Elote"],
  JP: ["Ramen", "Sushi", "Onigiri", "Tempura", "Gyudon", "Okonomiyaki", "Takoyaki", "Miso Soup", "Udon", "Tonkatsu"],
  IT: ["Pizza", "Pasta", "Lasagna", "Risotto", "Tiramisu", "Gelato", "Carbonara", "Bruschetta", "Gnocchi", "Ossobuco"],
  FR: ["Croissant", "Baguette", "Quiche", "Crêpe", "Macarons", "Coq au Vin", "Ratatouille", "Bouillabaisse", "Crème Brûlée", "Escargot"],
  DE: ["Bratwurst", "Pretzel", "Schnitzel", "Sauerkraut", "Currywurst", "Spätzle", "Black Forest Cake", "Strudel", "Kartoffelsalat", "Döner"],
  ES: ["Paella", "Tapas", "Gazpacho", "Tortilla Española", "Churros", "Jamón Ibérico", "Patatas Bravas", "Croquetas", "Sangria", "Fabada"],
  PT: ["Bacalhau", "Pastel de Nata", "Francesinha", "Caldo Verde", "Sardinhas", "Arroz de Pato", "Bifana", "Açorda", "Alheira", "Pastéis de Belém"],
  AR: ["Asado", "Empanadas", "Milanesa", "Choripán", "Dulce de Leche", "Alfajores", "Locro", "Provoleta", "Chimichurri", "Matambre"],
  KR: ["Bibimbap", "Bulgogi", "Kimchi", "Korean BBQ", "Tteokbokki", "Samgyeopsal", "Gimbap", "Japchae", "Sundubu", "Fried Chicken"],
  CN: ["Fried Rice", "Kung Pao Chicken", "Dim Sum", "Peking Duck", "Chow Mein", "Mapo Tofu", "Hot Pot", "Sweet and Sour Pork", "Dumplings", "Spring Rolls"],
  TH: ["Pad Thai", "Green Curry", "Tom Yum", "Som Tam", "Massaman Curry", "Pad See Ew", "Mango Sticky Rice", "Satay", "Tom Kha", "Larb"],
  IN: ["Butter Chicken", "Biryani", "Tikka Masala", "Naan", "Samosa", "Dal", "Paneer", "Vindaloo", "Dosa", "Chai"],
  VN: ["Pho", "Banh Mi", "Spring Rolls", "Bun Cha", "Com Tam", "Cao Lau", "Banh Xeo", "Che", "Goi Cuon", "Bun Bo Hue"],
  GB: ["Fish and Chips", "Full English Breakfast", "Shepherd's Pie", "Bangers and Mash", "Roast Beef", "Yorkshire Pudding", "Cornish Pasty", "Toad in the Hole", "Scotch Egg", "Trifle"],
  AU: ["Meat Pie", "Vegemite Toast", "Pavlova", "Lamington", "Barramundi", "Tim Tam", "Fairy Bread", "Sausage Sizzle", "Damper", "ANZAC Biscuits"],
  CO: ["Bandeja Paisa", "Arepas", "Empanadas", "Sancocho", "Ajiaco", "Buñuelos", "Pandebono", "Lechona", "Tamales", "Arroz con Pollo"],
  CL: ["Empanadas", "Pastel de Choclo", "Cazuela", "Curanto", "Completo", "Sopaipillas", "Caldillo de Congrio", "Asado", "Mote con Huesillo", "Alfajores"],
  PE: ["Ceviche", "Lomo Saltado", "Ají de Gallina", "Causa", "Anticuchos", "Pollo a la Brasa", "Papa a la Huancaína", "Arroz con Pollo", "Rocoto Relleno", "Picarones"],
};

const getCountryContext = (country: string): string => {
  const foods = COUNTRY_FOODS[country];
  if (!foods) return "";
  
  const countryNames: Record<string, string> = {
    BR: "Brasil", US: "Estados Unidos", MX: "México", JP: "Japão", IT: "Itália",
    FR: "França", DE: "Alemanha", ES: "Espanha", PT: "Portugal", AR: "Argentina",
    KR: "Coreia do Sul", CN: "China", TH: "Tailândia", IN: "Índia", VN: "Vietnã",
    GB: "Reino Unido", AU: "Austrália", CO: "Colômbia", CL: "Chile", PE: "Peru"
  };
  
  return `
=== USER'S COUNTRY: ${countryNames[country] || country} ===

PRIORITIZE foods from this region when the query is ambiguous:
Popular local foods: ${foods.join(", ")}

When the user types a generic term, prefer local options:
- "pão" in Brazil → suggest Pão de Queijo first
- "burger" in USA → suggest American-style burger first
- "noodles" in Japan → suggest Ramen, Udon first
- "curry" in India → suggest Indian curries first

BUT if the user clearly specifies a different cuisine (e.g., "ramen" in Brazil), respect that.
`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, country: requestCountry } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get user's country and restrictions from profile
    let userCountry = requestCountry || "BR";
    let userRestrictions: UserRestrictions = {
      intolerances: [],
      dietaryPreference: null,
      excludedIngredients: [],
    };
    
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Load safety database for validation
    let safetyDatabase: SafetyDatabase | null = null;
    try {
      safetyDatabase = await loadSafetyDatabase(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      logStep('Safety database loaded', { 
        intoleranceMappings: safetyDatabase.intoleranceMappings.size 
      });
    } catch (e) {
      logStep('Error loading safety database', { error: e });
    }
    
    if (authHeader) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('country, intolerances, dietary_preference, excluded_ingredients')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile) {
            if (profile.country) userCountry = profile.country;
            
            // Build user restrictions for safety validation
            if (safetyDatabase) {
              userRestrictions = {
                intolerances: normalizeUserIntolerances(profile.intolerances || [], safetyDatabase),
                dietaryPreference: profile.dietary_preference || null,
                excludedIngredients: profile.excluded_ingredients || [],
              };
            }
          }
        }
      } catch (e) {
        logStep('Error fetching user profile', { error: e });
      }
    }

    const hasRestrictions = userRestrictions.intolerances.length > 0 || 
                           (userRestrictions.dietaryPreference && userRestrictions.dietaryPreference !== 'comum') ||
                           userRestrictions.excludedIngredients.length > 0;

    logStep('Processing query', { query, country: userCountry });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const countryContext = getCountryContext(userCountry);

    // Build global nutrition prompt for this user's country
    const globalNutritionPrompt = getGlobalNutritionPrompt(userCountry);
    const nutritionalSource = getNutritionalSource(userCountry);
    const portionFormat = getPortionFormat(userCountry);

    const systemPrompt = `You are a GLOBAL nutrition expert with encyclopedic knowledge of foods from ALL countries and cultures.

${globalNutritionPrompt}

CORE MISSION:
- Identify the food the user is searching for, even with typos or partial names
- Recognize foods in ANY LANGUAGE (English, Portuguese, Spanish, Japanese, Korean, Chinese, Arabic, French, German, Italian, Thai, etc.)
- Return 1-5 relevant suggestions with accurate nutritional values
- Use ${nutritionalSource.sourceName} as primary nutritional source for this user
${countryContext}

=== CRITICAL: SUGGESTION ORDER PRIORITY ===

**ALWAYS return suggestions in THIS EXACT ORDER:**

1. **EXACT MATCH / THE DISH ITSELF** - If user types "feijoada", FIRST suggest "Feijoada" (the complete dish), NOT ingredients like "Feijão Preto"
2. **VARIATIONS of the dish** - Then suggest variations like "Feijoada Light", "Feijoada Completa", "Feijoada Vegetariana"
3. **RELATED DISHES** - Similar dishes from the same cuisine
4. **ONLY AS LAST RESORT** - Base ingredients (only if NO dish matches the query)

**EXAMPLES:**
- User types "feijoada" → 1st: Feijoada (the dish), 2nd: Feijoada Completa, 3rd: Feijoada Light, NOT "Feijão Preto"
- User types "farofa" → 1st: Farofa (simple), 2nd: Farofa de Bacon, 3rd: Farofa de Ovo, NOT "Farinha de Mandioca"
- User types "pizza" → 1st: Pizza Margherita, 2nd: Pizza Pepperoni, NOT "Massa de Pizza" or "Molho de Tomate"
- User types "ramen" → 1st: Ramen (complete dish), 2nd: Shoyu Ramen, 3rd: Miso Ramen, NOT "Macarrão" or "Caldo"

**NEVER suggest raw ingredients when the user clearly typed a dish name!**

=== GLOBAL FAST-FOOD CHAINS ===

**McDonald's (worldwide):**
- Big Mac, Quarter Pounder, McChicken, McNuggets, Big Tasty, McFlurry, McMuffin
- Regional: McArabia (Middle East), Teriyaki McBurger (Japan), McAloo Tikki (India)

**Burger King:**
- Whopper, Whopper Jr, Chicken Royale, BK Stacker, Onion Rings

**Subway:**
- Italian BMT, Meatball Marinara, Chicken Teriyaki, Veggie Delite

**KFC:**
- Original Recipe, Crispy Strips, Popcorn Chicken, Zinger

**Starbucks:**
- Frappuccino, Caramel Macchiato, Pumpkin Spice Latte, Croissant, Muffins

**Pizza Hut / Domino's:**
- Pepperoni Pizza, Margherita, Hawaiian, Meat Lovers

**Taco Bell:**
- Crunchy Taco, Burrito Supreme, Quesadilla, Nachos Bell Grande

**Chick-fil-A:**
- Chicken Sandwich, Nuggets, Waffle Fries

**Wendy's:**
- Baconator, Dave's Single, Frosty

**Five Guys:**
- Cheeseburger, Cajun Fries

**Chipotle:**
- Burrito Bowl, Carnitas, Barbacoa, Sofritas

=== GLOBAL CUISINES ===

**Japanese (日本料理):**
- Sushi, Sashimi, Ramen, Udon, Tempura, Tonkatsu, Okonomiyaki, Takoyaki, Onigiri, Miso Soup, Gyudon, Katsu Curry

**Korean (한국 요리):**
- Bibimbap, Bulgogi, Kimchi, Korean BBQ, Japchae, Tteokbokki, Samgyeopsal, Gimbap

**Chinese (中国菜):**
- Kung Pao Chicken, Sweet and Sour Pork, Dim Sum, Fried Rice, Chow Mein, Peking Duck, Mapo Tofu, Hot Pot

**Thai (อาหารไทย):**
- Pad Thai, Green Curry, Tom Yum, Som Tam, Massaman Curry, Pad See Ew

**Indian (भारतीय भोजन):**
- Butter Chicken, Tikka Masala, Biryani, Naan, Samosa, Dal, Paneer, Vindaloo

**Mexican:**
- Tacos, Burritos, Quesadillas, Enchiladas, Guacamole, Nachos, Tamales, Churros

**Italian:**
- Pizza, Pasta, Lasagna, Risotto, Tiramisu, Gelato, Bruschetta, Carbonara, Bolognese

**American:**
- Hamburger, Hot Dog, Mac and Cheese, Buffalo Wings, Pancakes, Cheesecake, Apple Pie

**Brazilian:**
- Feijoada, Pão de Queijo, Coxinha, Açaí, Picanha, Brigadeiro, Tapioca, Moqueca, Farofa

**Middle Eastern:**
- Falafel, Hummus, Shawarma, Kebab, Tabbouleh, Baklava, Fattoush

**French:**
- Croissant, Baguette, Quiche, Crêpe, Ratatouille, Coq au Vin, Macarons

**Spanish:**
- Paella, Tapas, Gazpacho, Tortilla Española, Churros con Chocolate

**Greek:**
- Gyros, Souvlaki, Moussaka, Greek Salad, Tzatziki, Spanakopita

**Vietnamese:**
- Pho, Banh Mi, Spring Rolls, Bun Cha, Com Tam

=== RESPONSE FORMAT (JSON) ===

{
  "suggestions": [
    {
      "name": "Complete Food Name (in user's apparent language or original)",
      "name_english": "Name in English for reference",
      "cuisine": "Origin cuisine (Japanese, Brazilian, American, etc.)",
      "portion_description": "1 unit (250g)" or "100g" or "1 slice (150g)",
      "portion_display_local": "${portionFormat.examples[0]}",
      "portion_grams": 250,
      "calories": 540,
      "protein": 28,
      "carbs": 42,
      "fat": 29,
      "confidence": "alta" | "média" | "baixa",
      "nutritional_source": "${nutritionalSource.sourceKey}"
    }
  ]
}

=== RECOGNITION EXAMPLES ===

- "big t" → Big Tasty McDonald's
- "whopp" → Whopper Burger King
- "ラーメン" or "ramen" → Ramen (Japanese Noodle Soup)
- "비빔밥" or "bibim" → Bibimbap (Korean Rice Bowl)
- "pho" or "phở" → Pho (Vietnamese Noodle Soup)
- "tikka" → Chicken Tikka Masala
- "açaí" or "acai" → Açaí Bowl
- "pao de q" → Pão de Queijo
- "タコス" or "taco" → Tacos
- "فلافل" or "falafel" → Falafel
- "crois" → Croissant
- "gyro" or "γύρος" → Gyros
- "feijoada" → Feijoada (complete dish), NOT "Feijão Preto"
- "farofa" → Farofa (side dish), NOT "Farinha de Mandioca"`;

    const userPrompt = `${systemPrompt}

O usuário digitou: "${query}". Identifique o alimento COMPLETO (prato/receita) que ele quer, NÃO ingredientes base. Sugira o prato primeiro, depois variações.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Google AI Error', { status: response.status, error: errorText });
      throw new Error(`Google AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"suggestions":[]}';
    
    logStep('AI Response received', { contentLength: content.length });

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      logStep('JSON parse error', { error: e, content });
      parsed = { suggestions: [] };
    }

    // Recalcular macros usando tabela foods (fonte real de dados)
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const serviceClient = createClient(supabaseUrl, serviceRoleKey);
      
      // Convert suggestions to foods format for real macro calculation
      const foodsForCalculation = parsed.suggestions.map((s: any) => ({
        name: s.name || s.name_english || '',
        grams: s.portion_grams || 100,
        estimated_calories: s.calories,
        estimated_protein: s.protein,
        estimated_carbs: s.carbs,
        estimated_fat: s.fat
      }));
      
      try {
        const { items, matchRate, fromDb, fromAi } = await calculateRealMacrosForFoods(serviceClient, foodsForCalculation);
        
        // Update suggestions with real macros AND safety validation
        parsed.suggestions = parsed.suggestions.map((s: any, index: number) => {
          const calculatedItem = items[index];
          const foodName = s.name || s.name_english || '';
          
          // ============= SAFETY VALIDATION =============
          let safetyConflict = null;
          let hasConflict = false;
          
          if (safetyDatabase && hasRestrictions) {
            const validation = validateIngredient(foodName, userRestrictions, safetyDatabase);
            if (!validation.isValid) {
              hasConflict = true;
              safetyConflict = {
                type: validation.restriction?.startsWith('intolerance_') ? 'intolerance' :
                      validation.restriction?.startsWith('dietary_') ? 'dietary' : 'excluded',
                label: validation.matchedIngredient || validation.reason || '',
                restriction: validation.restriction || '',
              };
            }
          }
          
          if (calculatedItem) {
            return {
              ...s,
              calories: Math.round(calculatedItem.calories),
              protein: Math.round(calculatedItem.protein),
              carbs: Math.round(calculatedItem.carbs),
              fat: Math.round(calculatedItem.fat),
              fiber: calculatedItem.fiber ? Math.round(calculatedItem.fiber) : undefined,
              macro_source: calculatedItem.source,
              food_id: calculatedItem.food_id,
              // Safety validation result
              has_conflict: hasConflict,
              conflict_info: safetyConflict,
            };
          }
          return { 
            ...s, 
            macro_source: 'ai_estimate',
            has_conflict: hasConflict,
            conflict_info: safetyConflict,
          };
        });
        
        logStep('Macros recalculated with foods table', { 
          count: parsed.suggestions.length,
          matchRate: Math.round(matchRate),
          fromDb,
          fromAi,
          sources: parsed.suggestions.map((s: any) => s.macro_source),
          conflicts: parsed.suggestions.filter((s: any) => s.has_conflict).length,
        });
      } catch (calcError) {
        logStep('Error calculating real macros', { error: String(calcError) });
        // Keep AI estimates if calculation fails, still apply safety validation
        parsed.suggestions = parsed.suggestions.map((s: any) => {
          const foodName = s.name || s.name_english || '';
          let safetyConflict = null;
          let hasConflict = false;
          
          if (safetyDatabase && hasRestrictions) {
            const validation = validateIngredient(foodName, userRestrictions, safetyDatabase);
            if (!validation.isValid) {
              hasConflict = true;
              safetyConflict = {
                type: validation.restriction?.startsWith('intolerance_') ? 'intolerance' :
                      validation.restriction?.startsWith('dietary_') ? 'dietary' : 'excluded',
                label: validation.matchedIngredient || validation.reason || '',
                restriction: validation.restriction || '',
              };
            }
          }
          
          return { 
            ...s, 
            macro_source: 'ai_estimate',
            has_conflict: hasConflict,
            conflict_info: safetyConflict,
          };
        });
      }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
