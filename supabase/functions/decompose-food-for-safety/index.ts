import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function para decompor alimentos complexos em ingredientes base
 * Usado para validação de segurança em entradas manuais de texto
 * 
 * Exemplo: "Big Mac" → ["pão", "carne bovina", "queijo", "alface", "cebola", "picles", "molho especial"]
 * Exemplo: "pão francês" → ["farinha de trigo", "água", "sal", "fermento"]
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName, userIntolerances = [], dietaryPreference = null } = await req.json();

    if (!foodName || typeof foodName !== "string") {
      return new Response(
        JSON.stringify({ error: "foodName é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Buscar mapeamentos de intolerâncias do banco
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar ingredientes bloqueados para as intolerâncias do usuário
    let blockedIngredients: string[] = [];
    if (userIntolerances.length > 0) {
      const { data: mappings } = await supabase
        .from("intolerance_mappings")
        .select("ingredient, intolerance_key")
        .in("intolerance_key", userIntolerances)
        .eq("severity_level", "blocked");

      if (mappings) {
        blockedIngredients = mappings.map(m => m.ingredient.toLowerCase());
      }
    }

    // Buscar safe keywords para evitar falsos positivos
    let safeKeywords: { keyword: string; intolerance_key: string }[] = [];
    if (userIntolerances.length > 0) {
      const { data: keywords } = await supabase
        .from("intolerance_safe_keywords")
        .select("keyword, intolerance_key")
        .in("intolerance_key", userIntolerances);

      if (keywords) {
        safeKeywords = keywords;
      }
    }

    console.log(`[decompose-food] Analisando: "${foodName}"`);
    console.log(`[decompose-food] Intolerâncias do usuário: ${userIntolerances.join(", ") || "nenhuma"}`);
    console.log(`[decompose-food] Total de ingredientes bloqueados: ${blockedIngredients.length}`);

    // Prompt para decompor o alimento
    const systemPrompt = `Você é um especialista em nutrição e composição de alimentos.

Sua tarefa é decompor um alimento ou prato em seus INGREDIENTES BASE.

REGRAS:
1. Liste APENAS os ingredientes principais que compõem o alimento
2. Use nomes simples e diretos (ex: "trigo" não "farinha de trigo refinada tipo 1")
3. Inclua ingredientes ocultos comuns (ex: pão contém trigo, fermento, sal)
4. Para pratos processados, liste os componentes principais
5. Retorne no formato JSON

EXEMPLOS:
- "pão" → ["trigo", "fermento", "sal", "água"]
- "Big Mac" → ["trigo", "carne bovina", "queijo", "alface", "cebola", "picles", "molho"]
- "pizza" → ["trigo", "tomate", "queijo", "orégano"]
- "cerveja" → ["cevada", "lúpulo", "água", "malte"]
- "sorvete" → ["leite", "açúcar", "creme de leite"]
- "macarrão" → ["trigo", "ovo"]
- "frango grelhado" → ["frango"]
- "arroz" → ["arroz"]

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;

    const userPrompt = `Decomponha este alimento em ingredientes base: "${foodName}"

Responda APENAS com um JSON no formato:
{
  "ingredients": ["ingrediente1", "ingrediente2", ...],
  "isProcessedFood": true/false,
  "confidence": "high" | "medium" | "low"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[decompose-food] Erro na API:", response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log(`[decompose-food] Resposta da IA:`, content);

    // Parse do JSON da resposta
    let decomposition;
    try {
      // Remove possíveis markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      decomposition = JSON.parse(cleanContent);
    } catch (e) {
      console.error("[decompose-food] Erro ao parsear resposta:", e);
      // Fallback: retorna o alimento original como único ingrediente
      decomposition = {
        ingredients: [foodName.toLowerCase()],
        isProcessedFood: false,
        confidence: "low"
      };
    }

    const ingredients: string[] = decomposition.ingredients || [foodName.toLowerCase()];

    // Verificar conflitos com intolerâncias
    const conflicts: { ingredient: string; intolerance: string; isSafe: boolean }[] = [];

    for (const ingredient of ingredients) {
      const normalizedIngredient = ingredient.toLowerCase().trim();

      for (const intolerance of userIntolerances) {
        // Verificar se o ingrediente está na lista de bloqueados
        const isBlocked = blockedIngredients.some(blocked => {
          // Match por palavra inteira para evitar falsos positivos
          const regex = new RegExp(`\\b${blocked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(normalizedIngredient) || normalizedIngredient === blocked;
        });

        if (isBlocked) {
          // Verificar se há safe keyword que neutraliza
          const safeKeyword = safeKeywords.find(sk => 
            sk.intolerance_key === intolerance && 
            normalizedIngredient.includes(sk.keyword.toLowerCase())
          );

          conflicts.push({
            ingredient: normalizedIngredient,
            intolerance,
            isSafe: !!safeKeyword
          });
        }
      }
    }

    // Filtrar conflitos reais (não neutralizados por safe keywords)
    const realConflicts = conflicts.filter(c => !c.isSafe);
    const hasConflict = realConflicts.length > 0;

    console.log(`[decompose-food] Ingredientes detectados: ${ingredients.join(", ")}`);
    console.log(`[decompose-food] Conflitos encontrados: ${realConflicts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        foodName,
        ingredients,
        isProcessedFood: decomposition.isProcessedFood || false,
        confidence: decomposition.confidence || "medium",
        hasConflict,
        conflicts: realConflicts.map(c => ({
          ingredient: c.ingredient,
          intolerance: c.intolerance
        })),
        safeToConsume: !hasConflict
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[decompose-food] Erro:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
