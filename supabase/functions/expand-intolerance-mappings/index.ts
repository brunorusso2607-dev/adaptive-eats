import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapeamento de intolerâncias para contexto da IA
const INTOLERANCE_CONTEXT: Record<string, string> = {
  lactose: "Intolerância à lactose - incluir todos os laticínios, derivados do leite, compostos lácteos, aditivos com lactose, nomes industriais, E-numbers europeus relacionados",
  gluten: "Intolerância ao glúten/doença celíaca - incluir todos os cereais com glúten (trigo, centeio, cevada, aveia contaminada), derivados, malte, amidos modificados, proteínas vegetais hidrolisadas",
  amendoim: "Alergia a amendoim - incluir amendoim, pasta de amendoim, óleo de amendoim, derivados, nomes em outros idiomas",
  frutos_do_mar: "Alergia a frutos do mar - incluir camarão, lagosta, caranguejo, siri, crustáceos, derivados",
  peixe: "Alergia a peixe - incluir todos os tipos de peixe, óleos de peixe, molhos de peixe, derivados",
  ovos: "Alergia a ovos - incluir ovo, clara, gema, albumina, lecitina de ovo, derivados, nomes industriais",
  soja: "Alergia a soja - incluir soja, tofu, tempeh, molho shoyu, lecitina de soja, proteína de soja, derivados",
  sulfitos: "Sensibilidade a sulfitos - incluir todos os compostos sulfurosos, conservantes E220-E228, metabissulfito",
  castanhas: "Alergia a castanhas/nozes - incluir todas as oleaginosas (amêndoa, noz, castanha, avelã, pistache, macadâmia), derivados, óleos",
  sesamo: "Alergia a sésamo/gergelim - incluir sésamo, gergelim, tahine, óleo de gergelim, derivados",
  tremoco: "Alergia a tremoço - incluir tremoço, farinha de tremoço, derivados",
  mostarda: "Alergia a mostarda - incluir mostarda, sementes de mostarda, óleo de mostarda, derivados",
  aipo: "Alergia a aipo/salsão - incluir aipo, salsão, sementes de aipo, sal de aipo, derivados",
  moluscos: "Alergia a moluscos - incluir lula, polvo, mexilhão, ostra, vieira, caracol, derivados",
  fodmap: "Dieta baixa em FODMAPs - incluir alimentos ricos em oligossacarídeos, dissacarídeos, monossacarídeos e polióis fermentáveis",
  histamina: "Intolerância à histamina - incluir alimentos ricos em histamina ou liberadores de histamina (queijos curados, embutidos, fermentados, vinhos)",
  salicilatos: "Sensibilidade a salicilatos - incluir alimentos ricos em salicilatos naturais",
  niquel: "Alergia/sensibilidade ao níquel - incluir alimentos com alto teor de níquel (cacau, leguminosas, oleaginosas, grãos integrais)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intolerance_key, language = "pt", batch_size = 500 } = await req.json();

    if (!intolerance_key) {
      return new Response(
        JSON.stringify({ success: false, error: "intolerance_key é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar ingredientes já existentes para evitar duplicatas
    const { data: existingIngredients } = await supabase
      .from("intolerance_mappings")
      .select("ingredient")
      .eq("intolerance_key", intolerance_key);

    const existingSet = new Set(
      (existingIngredients || []).map((i) => i.ingredient.toLowerCase().trim())
    );

    console.log(`[expand] Intolerância: ${intolerance_key}, Existentes: ${existingSet.size}`);

    const context = INTOLERANCE_CONTEXT[intolerance_key] || `Intolerância/alergia a ${intolerance_key}`;

    const languageMap: Record<string, string> = {
      pt: "português brasileiro",
      en: "inglês",
      es: "espanhol",
      fr: "francês",
      de: "alemão",
      it: "italiano",
    };

    const languageName = languageMap[language] || "português brasileiro";

    const systemPrompt = `Você é um especialista em segurança alimentar e alergias/intolerâncias. 
Sua tarefa é gerar uma lista EXTENSA e EXAUSTIVA de ingredientes que devem ser evitados por pessoas com determinada restrição alimentar.

REGRAS IMPORTANTES:
1. Inclua TODOS os derivados possíveis
2. Inclua nomes em diferentes idiomas e regionais
3. Inclua nomes industriais e científicos
4. Inclua aditivos alimentares (E-numbers europeus)
5. Inclua compostos químicos relacionados
6. Inclua variações de escrita (com/sem acento, singular/plural)
7. Inclua ingredientes ocultos em produtos processados
8. NÃO inclua explicações, apenas a lista
9. Um ingrediente por linha
10. Sem numeração, apenas o nome do ingrediente`;

    const userPrompt = `${context}

Gere uma lista de ${batch_size} ingredientes em ${languageName} que devem ser ABSOLUTAMENTE evitados por pessoas com essa restrição.

Inclua:
- Ingredientes diretos
- Derivados e subprodutos
- Nomes alternativos e regionais
- Nomes em outros idiomas comuns
- Aditivos alimentares (códigos E)
- Compostos industriais
- Ingredientes ocultos em produtos processados

APENAS a lista, um ingrediente por linha, sem explicações:`;

    console.log(`[expand] Chamando Gemini para gerar ${batch_size} ingredientes...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[expand] Erro Gemini: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro na API: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    // Processar a lista de ingredientes
    const ingredients = generatedText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 1 && line.length < 100)
      .map((line: string) => line.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((line: string) => line.length > 1);

    console.log(`[expand] Gemini gerou ${ingredients.length} ingredientes`);

    // Filtrar duplicatas
    const newIngredients = ingredients.filter(
      (ing: string) => !existingSet.has(ing.toLowerCase().trim())
    );

    console.log(`[expand] Novos ingredientes (sem duplicatas): ${newIngredients.length}`);

    if (newIngredients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum ingrediente novo para adicionar",
          stats: {
            generated: ingredients.length,
            duplicates: ingredients.length,
            inserted: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inserir em lotes de 100
    const batchInsertSize = 100;
    let totalInserted = 0;
    let errors: string[] = [];

    for (let i = 0; i < newIngredients.length; i += batchInsertSize) {
      const batch = newIngredients.slice(i, i + batchInsertSize).map((ingredient: string) => ({
        intolerance_key,
        ingredient: ingredient.trim(),
      }));

      const { error: insertError } = await supabase
        .from("intolerance_mappings")
        .upsert(batch, { onConflict: "intolerance_key,ingredient", ignoreDuplicates: true });

      if (insertError) {
        console.error(`[expand] Erro ao inserir lote ${i}: ${insertError.message}`);
        errors.push(insertError.message);
      } else {
        totalInserted += batch.length;
      }
    }

    console.log(`[expand] Inseridos ${totalInserted} ingredientes para ${intolerance_key}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Expansão concluída para ${intolerance_key}`,
        stats: {
          generated: ingredients.length,
          duplicates: ingredients.length - newIngredients.length,
          inserted: totalInserted,
          errors: errors.length > 0 ? errors : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[expand] Erro geral: ${error}`);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
