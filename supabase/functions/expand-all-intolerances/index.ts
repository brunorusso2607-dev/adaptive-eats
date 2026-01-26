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

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Todas as 18 intolerâncias do sistema
const ALL_INTOLERANCES = [
  { key: "lactose", context: "Intolerância à lactose - todos os laticínios, derivados do leite, compostos lácteos, aditivos com lactose, caseína, soro de leite, whey, nomes industriais, E-numbers europeus" },
  { key: "gluten", context: "Intolerância ao glúten/doença celíaca - todos os cereais com glúten (trigo, centeio, cevada, aveia contaminada), derivados, malte, amidos modificados, seitan, proteínas vegetais hidrolisadas" },
  { key: "egg", context: "Alergia a ovos - ovo, clara, gema, albumina, lecitina de ovo, ovalbumina, lisozima, merengue, maionese, derivados" },
  { key: "peanut", context: "Alergia a amendoim - amendoim, pasta de amendoim, óleo de amendoim, farinha de amendoim, derivados, nomes em outros idiomas" },
  { key: "tree_nuts", context: "Alergia a castanhas/nozes - amêndoa, noz, castanha-do-pará, castanha-de-caju, avelã, pistache, macadâmia, pecã, noz-moscada, pralinê, marzipan, derivados, óleos" },
  { key: "soy", context: "Alergia a soja - soja, tofu, tempeh, edamame, molho shoyu, missô, natto, lecitina de soja, proteína de soja, óleo de soja, derivados" },
  { key: "fish", context: "Alergia a peixe - todos os tipos de peixe (salmão, atum, bacalhau, sardinha, tilápia), óleos de peixe, molho de peixe, anchovas, derivados" },
  { key: "seafood", context: "Alergia a frutos do mar - camarão, lagosta, caranguejo, siri, lula, polvo, mexilhão, ostra, vieira, mariscos, crustáceos, moluscos, derivados" },
  { key: "sulfite", context: "Sensibilidade a sulfitos - dióxido de enxofre, metabissulfito de sódio/potássio, sulfito de sódio, conservantes E220-E228, vinhos, frutas secas" },
  { key: "histamine", context: "Intolerância à histamina - alimentos fermentados, queijos curados, embutidos, vinhos, cerveja, vinagre, conservas, peixes enlatados, tomate, espinafre, berinjela" },
  { key: "fodmap", context: "Dieta baixa em FODMAPs - oligossacarídeos (frutanos, galactanos), dissacarídeos (lactose), monossacarídeos (frutose), polióis (sorbitol, manitol, xilitol), alho, cebola, leguminosas" },
  { key: "salicylate", context: "Sensibilidade a salicilatos - aspirina, frutas (maçã, uva, morango, laranja), vegetais (tomate, pepino, pimentão), especiarias, mel, amêndoas, derivados" },
  { key: "nickel", context: "Alergia/sensibilidade ao níquel - cacau, chocolate, leguminosas, oleaginosas, grãos integrais, aveia, soja, lentilha, feijão, enlatados" },
  { key: "fructose", context: "Má absorção de frutose - frutas com alta frutose (maçã, pera, manga, melancia), mel, xarope de milho, agave, sucos de frutas" },
  { key: "sorbitol", context: "Intolerância ao sorbitol - adoçantes artificiais, chicletes sem açúcar, frutas (maçã, pera, ameixa, pêssego, damasco), produtos diet/light" },
  { key: "corn", context: "Alergia a milho - milho, fubá, amido de milho, xarope de milho, dextrose, maltodextrina, óleo de milho, pipoca, derivados" },
  { key: "caffeine", context: "Sensibilidade à cafeína - café, chá preto, chá verde, mate, guaraná, chocolate, refrigerantes de cola, energéticos, derivados" },
  { key: "sugar", context: "Restrição a açúcar/diabetes - açúcar refinado, açúcar mascavo, mel, xaropes, doces, sobremesas, refrigerantes, sucos adoçados, carboidratos simples" },
];

async function expandSingleIntolerance(
  supabase: any,
  intoleranceKey: string,
  context: string,
  language: string,
  batchSize: number = 300
): Promise<{ generated: number; inserted: number; duplicates: number }> {
  
  const { data: existingIngredients } = await supabase
    .from("intolerance_mappings")
    .select("ingredient")
    .eq("intolerance_key", intoleranceKey);

  const existingSet = new Set(
    (existingIngredients || []).map((i: any) => i.ingredient.toLowerCase().trim())
  );

  const languageMap: Record<string, string> = {
    pt: "português brasileiro",
    en: "inglês americano",
    es: "espanhol latinoamericano",
  };

  const systemPrompt = `Você é um especialista em segurança alimentar, alergias e intolerâncias alimentares.
Gere uma lista EXTENSA e EXAUSTIVA de ingredientes que devem ser evitados.

REGRAS:
1. Inclua TODOS os derivados e subprodutos possíveis
2. Inclua nomes regionais e coloquiais
3. Inclua nomes industriais e científicos
4. Inclua aditivos alimentares (E-numbers europeus)
5. Inclua compostos químicos relacionados
6. Inclua variações de escrita
7. Inclua ingredientes ocultos em produtos processados
8. Um ingrediente por linha, sem numeração
9. APENAS o nome, sem explicações`;

  const userPrompt = `${context}

Gere ${batchSize} ingredientes em ${languageMap[language]} que devem ser ABSOLUTAMENTE evitados.
Seja EXAUSTIVO - inclua cada variação, derivado, nome alternativo possível.

APENAS a lista, um por linha:`;

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
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    console.error(`[expand-all] Erro Gemini para ${intoleranceKey}/${language}: ${response.status}`);
    return { generated: 0, inserted: 0, duplicates: 0 };
  }

  const data = await response.json();
  const generatedText = data.choices?.[0]?.message?.content || "";

  const ingredients = generatedText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 1 && line.length < 100)
    .map((line: string) => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((line: string) => line.length > 1);

  const newIngredients = ingredients.filter(
    (ing: string) => !existingSet.has(ing.toLowerCase().trim())
  );

  if (newIngredients.length === 0) {
    return { generated: ingredients.length, inserted: 0, duplicates: ingredients.length };
  }

  const batchInsertSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < newIngredients.length; i += batchInsertSize) {
    const batch = newIngredients.slice(i, i + batchInsertSize).map((ingredient: string) => ({
      intolerance_key: intoleranceKey,
      ingredient: ingredient.trim(),
    }));

    const { error } = await supabase
      .from("intolerance_mappings")
      .upsert(batch, { onConflict: "intolerance_key,ingredient", ignoreDuplicates: true });

    if (!error) {
      totalInserted += batch.length;
    }
  }

  return {
    generated: ingredients.length,
    inserted: totalInserted,
    duplicates: ingredients.length - newIngredients.length,
  };
}

async function runExpansion(batchSize: number, languages: string[], rounds: number) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log(`[expand-all] Iniciando ${rounds} rodadas de expansão para ${ALL_INTOLERANCES.length} intolerâncias em ${languages.length} idiomas...`);

  let totalInserted = 0;

  // Múltiplas rodadas para gerar mais variações
  for (let round = 1; round <= rounds; round++) {
    console.log(`[expand-all] ===== RODADA ${round}/${rounds} =====`);
    
    for (const intolerance of ALL_INTOLERANCES) {
      for (const lang of languages) {
        console.log(`[expand-all] R${round} - Processando ${intolerance.key} em ${lang}...`);

        try {
          const result = await expandSingleIntolerance(
            supabase,
            intolerance.key,
            intolerance.context,
            lang,
            batchSize
          );

          totalInserted += result.inserted;
          console.log(`[expand-all] R${round} - ${intolerance.key}/${lang}: +${result.inserted} novos`);

          // Pausa para não sobrecarregar a API
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`[expand-all] Erro em ${intolerance.key}/${lang}: ${err}`);
        }
      }
    }
    
    console.log(`[expand-all] Rodada ${round} concluída. Total inseridos até agora: ${totalInserted}`);
  }

  const { count } = await supabase
    .from("intolerance_mappings")
    .select("*", { count: "exact", head: true });

  console.log(`[expand-all] ✅ CONCLUÍDO! Total inseridos: ${totalInserted}, Total no banco: ${count}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Kill switch - retorna erro se função desativada
  if (FUNCTION_DISABLED) {
    console.log("[expand-all-intolerances] Função DESATIVADA via kill switch");
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
    const { batch_size = 500, languages = ["pt", "en", "es"], rounds = 5 } = await req.json().catch(() => ({}));

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar waitUntil para processar em background
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    (globalThis as any).EdgeRuntime?.waitUntil?.(runExpansion(batch_size, languages, rounds)) 
      || runExpansion(batch_size, languages, rounds).catch(console.error);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { count: currentCount } = await supabase
      .from("intolerance_mappings")
      .select("*", { count: "exact", head: true });

    // 18 intolerâncias × 3 idiomas × 5 rodadas × 500 ingredientes = 135.000 tentativas
    // Com ~40% de duplicados esperados = ~50.000+ ingredientes únicos
    const estimatedTotal = ALL_INTOLERANCES.length * languages.length * rounds * batch_size * 0.4;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Expansão massiva iniciada em background com Gemini Flash Lite",
        info: {
          intolerances_to_process: ALL_INTOLERANCES.length,
          languages: languages,
          rounds: rounds,
          batch_size_per_request: batch_size,
          total_api_calls: ALL_INTOLERANCES.length * languages.length * rounds,
          estimated_new_ingredients: Math.round(estimatedTotal),
          current_total: currentCount,
          model: "google/gemini-2.5-flash-lite",
          note: "Acompanhe os logs da função para ver o progresso"
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[expand-all] Erro geral: ${error}`);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

