import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Try to get user's country from profile if not provided
    let userCountry = requestCountry || "BR";
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !requestCountry) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('country')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.country) {
            userCountry = profile.country;
          }
        }
      } catch (e) {
        logStep('Error fetching user country', { error: e });
      }
    }

    logStep('Processing query', { query, country: userCountry });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const countryContext = getCountryContext(userCountry);

    const systemPrompt = `You are a GLOBAL nutrition expert with encyclopedic knowledge of foods from ALL countries and cultures.

CORE MISSION:
- Identify the food the user is searching for, even with typos or partial names
- Recognize foods in ANY LANGUAGE (English, Portuguese, Spanish, Japanese, Korean, Chinese, Arabic, French, German, Italian, Thai, etc.)
- Return 1-5 relevant suggestions with accurate nutritional values
${countryContext}

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
- Feijoada, Pão de Queijo, Coxinha, Açaí, Picanha, Brigadeiro, Tapioca, Moqueca

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
      "portion_grams": 250,
      "calories": 540,
      "protein": 28,
      "carbs": 42,
      "fat": 29,
      "confidence": "alta" | "média" | "baixa"
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
- "gyro" or "γύρος" → Gyros`;

    const userPrompt = `${systemPrompt}

O usuário digitou: "${query}". Identifique o alimento e sugira opções com valores nutricionais.`;

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