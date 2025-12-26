import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SUGGEST-FOOD-AI] ${step}:`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Processing query', { query });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a GLOBAL nutrition expert with encyclopedic knowledge of foods from ALL countries and cultures.

CORE MISSION:
- Identify the food the user is searching for, even with typos or partial names
- Recognize foods in ANY LANGUAGE (English, Portuguese, Spanish, Japanese, Korean, Chinese, Arabic, French, German, Italian, Thai, etc.)
- Return 1-5 relevant suggestions with accurate nutritional values

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `O usuário digitou: "${query}". Identifique o alimento e sugira opções com valores nutricionais.` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('AI Error', { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', suggestions: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"suggestions":[]}';
    
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
