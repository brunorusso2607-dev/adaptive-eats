import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// KILL SWITCH - FUNÇÃO DESATIVADA
// Esta função foi desativada para preservar a integridade da
// tabela intolerance_mappings que deve conter APENAS ingredientes puros.
// A expansão automática por IA foi identificada como fonte de poluição
// por inserir itens compostos e sem nível de severidade definido.
// ============================================================
const FUNCTION_DISABLED = true;

// Mapeamento de contexto para cada intolerância
const INTOLERANCE_CONTEXT: Record<string, string> = {
  lactose: "dairy products, milk derivatives, cheese, butter, cream, whey, casein, lactose",
  gluten: "wheat, barley, rye, oats, bread, pasta, flour, cereals containing gluten",
  sugar: "sucrose, glucose, fructose, sweeteners, honey, syrups, candy, desserts",
  peanut: "peanuts, groundnuts, peanut oil, peanut butter, arachis",
  seafood: "shrimp, crab, lobster, prawns, shellfish, crustaceans",
  fish: "fish, salmon, tuna, cod, anchovies, fish sauce, fish oil",
  egg: "eggs, egg whites, egg yolks, mayonnaise, albumin, meringue",
  soy: "soybeans, soy sauce, tofu, tempeh, edamame, soy lecithin, soy protein",
  sulfite: "sulfites, sulfur dioxide, wine preservatives, dried fruits with sulfites",
  treenut: "almonds, walnuts, cashews, pistachios, hazelnuts, brazil nuts, macadamia",
  sesame: "sesame seeds, tahini, sesame oil, hummus",
  lupin: "lupin flour, lupin seeds, lupin protein",
  mustard: "mustard seeds, mustard powder, mustard sauce, prepared mustard",
  celery: "celery stalks, celeriac, celery seeds, celery salt",
  mollusk: "oysters, mussels, clams, scallops, squid, octopus, snails",
  fodmap: "high FODMAP foods, onions, garlic, wheat, legumes, certain fruits",
  histamine: "aged cheeses, fermented foods, wine, cured meats, vinegar",
  salicylate: "aspirin-like compounds, berries, tomatoes, spices, mint",
  nickel: "cocoa, nuts, legumes, whole grains, canned foods",
  caffeine: "coffee, tea, energy drinks, chocolate, cola, guarana"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Kill switch - retorna erro se função desativada
  if (FUNCTION_DISABLED) {
    console.log("[expand-language-terms] Função DESATIVADA via kill switch");
    return new Response(
      JSON.stringify({
        success: false,
        error: "FUNÇÃO DESATIVADA",
        message: "Esta função foi desativada para preservar a integridade da tabela intolerance_mappings. A expansão automática por IA foi identificada como fonte de poluição. Use apenas inserção manual via painel admin.",
        disabled_at: "2025-01-02",
        reason: "Política de ingredientes puros - intolerance_mappings deve conter apenas ingredientes simples, sem compostos ou produtos processados."
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { language_code, intolerance_key, batch_size = 50 } = await req.json();

    if (!language_code) {
      return new Response(
        JSON.stringify({ error: "language_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar informações do idioma
    const { data: langData, error: langError } = await supabase
      .from("supported_languages")
      .select("*")
      .eq("code", language_code)
      .single();

    if (langError || !langData) {
      return new Response(
        JSON.stringify({ error: `Language ${language_code} not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar status para in_progress
    await supabase
      .from("supported_languages")
      .update({ expansion_status: "in_progress" })
      .eq("code", language_code);

    // Buscar termos existentes para evitar duplicatas
    const { data: existingTerms } = await supabase
      .from("intolerance_mappings")
      .select("ingredient, intolerance_key");

    const existingSet = new Set(
      existingTerms?.map(t => `${t.intolerance_key}:${t.ingredient.toLowerCase()}`) || []
    );

    // Determinar quais intolerâncias processar
    const intoleranceKeys = intolerance_key 
      ? [intolerance_key] 
      : Object.keys(INTOLERANCE_CONTEXT);

    let totalInserted = 0;
    const results: Record<string, { generated: number; inserted: number }> = {};

    for (const key of intoleranceKeys) {
      const context = INTOLERANCE_CONTEXT[key];
      if (!context) continue;

      console.log(`Processing ${key} for language ${language_code}...`);

      const systemPrompt = `You are a food safety expert specialized in food intolerances and allergies.
Your task is to generate a comprehensive list of food ingredients and products that should be avoided by people with a specific intolerance.

RULES:
1. Generate ONLY ingredients/foods in ${langData.native_name} (${language_code.toUpperCase()})
2. Include common names, brand names, regional variations, and derivatives
3. Include prepared foods, packaged products, and hidden sources
4. Each item should be on a new line
5. Do NOT include explanations, just the ingredient names
6. Be thorough - include chemical names, alternative names, and local terminology
7. Generate at least 50 unique terms`;

      const userPrompt = `Generate a list of ${batch_size} food ingredients and products in ${langData.native_name} that people with ${key.toUpperCase()} intolerance should avoid.

Context: ${context}

Focus on:
- Common foods and ingredients
- Prepared/processed foods
- Hidden sources in packaged products
- Regional/local names used in ${langData.native_name}-speaking countries
- Chemical/technical names
- Brand names if applicable

Return ONLY the list of ingredients, one per line, in ${langData.native_name}.`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          console.error(`AI error for ${key}:`, await response.text());
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        // Processar resposta
        const ingredients = content
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 1 && line.length < 100)
          .map((line: string) => line.replace(/^[-•*]\s*/, "").trim())
          .filter((line: string) => !line.match(/^\d+\./))
          .filter((ingredient: string) => {
            const normalized = `${key}:${ingredient.toLowerCase()}`;
            return !existingSet.has(normalized);
          });

        if (ingredients.length > 0) {
          // Inserir em lotes
          const toInsert = ingredients.map((ingredient: string) => ({
            intolerance_key: key,
            ingredient: ingredient,
          }));

          const { error: insertError } = await supabase
            .from("intolerance_mappings")
            .upsert(toInsert, { 
              onConflict: "intolerance_key,ingredient",
              ignoreDuplicates: true 
            });

          if (!insertError) {
            totalInserted += ingredients.length;
            // Adicionar ao set para evitar duplicatas no mesmo lote
            ingredients.forEach((ing: string) => {
              existingSet.add(`${key}:${ing.toLowerCase()}`);
            });
          }
        }

        results[key] = {
          generated: content.split("\n").length,
          inserted: ingredients.length,
        };

        // Delay entre chamadas para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`Error processing ${key}:`, err);
        results[key] = { generated: 0, inserted: 0 };
      }
    }

    // Contar total de termos no banco
    const { count: totalTerms } = await supabase
      .from("intolerance_mappings")
      .select("*", { count: "exact", head: true });

    // Atualizar status do idioma
    await supabase
      .from("supported_languages")
      .update({
        expansion_status: "completed",
        last_expansion_at: new Date().toISOString(),
        total_terms: totalTerms || 0,
      })
      .eq("code", language_code);

    return new Response(
      JSON.stringify({
        success: true,
        language: language_code,
        total_inserted: totalInserted,
        total_terms_in_database: totalTerms,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in expand-language-terms:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

