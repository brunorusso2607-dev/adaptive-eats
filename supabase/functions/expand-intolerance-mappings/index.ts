import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ⛔ KILL SWITCH - Função desativada temporariamente para evitar re-inserção de termos
// Mudar para false quando a limpeza manual estiver concluída
const FUNCTION_DISABLED = true;

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapeamento de intolerâncias para contexto da IA
const INTOLERANCE_CONTEXT: Record<string, string> = {
  lactose: "Intolerância à lactose - incluir APENAS ingredientes puros: laticínios, derivados do leite, compostos lácteos, proteínas do leite, aditivos com lactose",
  gluten: "Intolerância ao glúten/doença celíaca - incluir APENAS ingredientes puros: cereais com glúten (trigo, centeio, cevada, aveia), farinhas, malte, amidos, proteínas vegetais",
  amendoim: "Alergia a amendoim - incluir APENAS: amendoim, pasta de amendoim, óleo de amendoim, derivados puros",
  frutos_do_mar: "Alergia a frutos do mar - incluir APENAS: camarão, lagosta, caranguejo, siri, crustáceos puros",
  peixe: "Alergia a peixe - incluir APENAS: tipos de peixe, óleos de peixe, derivados puros",
  ovos: "Alergia a ovos - incluir APENAS: ovo, clara, gema, albumina, lecitina de ovo, proteínas do ovo",
  soja: "Alergia a soja - incluir APENAS: soja, tofu, tempeh, proteína de soja, lecitina de soja, derivados puros",
  sulfitos: "Sensibilidade a sulfitos - incluir APENAS: compostos sulfurosos, conservantes E220-E228, metabissulfito",
  castanhas: "Alergia a castanhas/nozes - incluir APENAS: oleaginosas puras (amêndoa, noz, castanha, avelã, pistache, macadâmia), óleos de oleaginosas",
  sesamo: "Alergia a sésamo/gergelim - incluir APENAS: sésamo, gergelim, tahine, óleo de gergelim",
  tremoco: "Alergia a tremoço - incluir APENAS: tremoço, farinha de tremoço",
  mostarda: "Alergia a mostarda - incluir APENAS: mostarda, sementes de mostarda, óleo de mostarda",
  aipo: "Alergia a aipo/salsão - incluir APENAS: aipo, salsão, sementes de aipo, sal de aipo",
  moluscos: "Alergia a moluscos - incluir APENAS: lula, polvo, mexilhão, ostra, vieira, caracol",
  fodmap: "Dieta baixa em FODMAPs - incluir APENAS ingredientes ricos em FODMAPs puros",
  histamina: "Intolerância à histamina - incluir APENAS ingredientes puros ricos em histamina",
  salicilatos: "Sensibilidade a salicilatos - incluir APENAS ingredientes puros ricos em salicilatos",
  niquel: "Alergia/sensibilidade ao níquel - incluir APENAS ingredientes puros com alto teor de níquel",
};

// Lista de padrões para detectar pratos prontos/industrializados (NÃO DEVEM SER INCLUÍDOS)
const PREPARED_DISH_PATTERNS = [
  // Pratos brasileiros
  /beijinho/i, /brigadeiro/i, /coxinha/i, /esfiha/i, /empada/i, /pastel/i,
  /pizza/i, /lasanha/i, /strogonoff/i, /feijoada/i, /acarajé/i, /tapioca/i,
  /pão de queijo/i, /quibe/i, /kibe/i, /à milanesa/i, /milanesa/i,
  /à parmegiana/i, /parmegiana/i, /panqueca/i, /crepe/i, /waffle/i,
  /torta/i, /bolo/i, /pudim/i, /mousse/i, /sorvete/i, /frozen/i,
  
  // Pratos genéricos
  /sanduíche/i, /sandwich/i, /hambúrguer/i, /burger/i, /hot dog/i,
  /nugget/i, /empanado/i, /croquete/i, /bolinho/i, /risoto/i,
  /macarrão/i, /massa$/i, /spaghetti/i, /fettuccine/i, /ravioli/i,
  /nhoque/i, /gnocchi/i, /cannelloni/i, /cappelletti/i,
  
  // Doces/sobremesas
  /chocolate ao leite/i, /chocolate branco/i, /bombom/i, /trufa/i,
  /doce de leite/i, /dulce de leche/i, /leite condensado/i,
  /chantilly/i, /granola/i, /muesli/i, /cereal/i,
  
  // Bebidas preparadas
  /milk shake/i, /milkshake/i, /smoothie/i, /frappuccino/i,
  /cappuccino/i, /café com leite/i,
  
  // Molhos compostos
  /molho bechamel/i, /molho branco/i, /molho rosa/i, /molho bolonhesa/i,
  
  // Pratos internacionais
  /sushi/i, /temaki/i, /gyoza/i, /ramen/i, /pad thai/i,
  /burrito/i, /taco/i, /quesadilla/i, /nachos/i,
  /croissant/i, /brioche/i, /pretzel/i,
  
  // Padrões gerais de pratos compostos
  /com .+/i, // "arroz com feijão", "frango com batata"
  /à .+/i,   // "à carbonara", "à bolonhesa"
  /ao .+/i,  // "ao molho", "ao forno"
];

function isPreparedDish(ingredient: string): boolean {
  const normalized = ingredient.toLowerCase().trim();
  
  // Verificar padrões de pratos prontos
  for (const pattern of PREPARED_DISH_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  // Verificar se contém palavras que indicam combinação
  const combinationWords = [' com ', ' e ', ' c/', ' ao ', ' à ', ' de '];
  for (const word of combinationWords) {
    if (normalized.includes(word) && normalized.split(' ').length > 3) {
      return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ⛔ KILL SWITCH - Função desativada
  if (FUNCTION_DISABLED) {
    console.log("[expand] ⛔ Função DESATIVADA - kill switch ativo");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Função temporariamente desativada. Limpeza manual em andamento.",
        disabled: true,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { intolerance_key, language = "pt", batch_size = 100 } = await req.json();

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

    // PROMPT CORRIGIDO: Foco em ingredientes PUROS apenas
    const systemPrompt = `Você é um especialista em segurança alimentar e alergias/intolerâncias.
Sua tarefa é gerar uma lista de INGREDIENTES PUROS que devem ser evitados.

REGRAS CRÍTICAS - LEIA COM ATENÇÃO:

✅ INCLUIR APENAS:
- Ingredientes puros e isolados (ex: leite, queijo mussarela, farinha de trigo)
- Derivados químicos/biológicos (ex: caseína, lactose, glúten, albumina)
- Aditivos alimentares (códigos E)
- Tipos específicos do ingrediente base (ex: queijo brie, queijo cheddar)
- Proteínas isoladas (ex: proteína do soro, whey)

❌ NUNCA INCLUIR:
- Pratos prontos (ex: pizza, lasanha, coxinha, brigadeiro, beijinho)
- Receitas compostas (ex: arroz com leite, pão de queijo)
- Produtos industrializados de marca
- Sobremesas (ex: pudim, mousse, sorvete, bolo)
- Combinações de ingredientes (ex: "frango à milanesa")
- Alimentos preparados (ex: empanado, à parmegiana)

FORMATO:
- Um ingrediente por linha
- Apenas o nome do ingrediente puro
- Sem numeração, bullets ou explicações`;

    const userPrompt = `${context}

Liste ${batch_size} INGREDIENTES PUROS em ${languageName} que devem ser evitados.

Lembre-se: APENAS ingredientes puros, NUNCA pratos prontos ou receitas.

Lista:`;

    console.log(`[expand] Chamando Gemini para gerar ${batch_size} ingredientes PUROS...`);

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
        temperature: 0.3, // Reduzido para respostas mais consistentes
        max_tokens: 4000,
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
    const rawIngredients = generatedText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 1 && line.length < 80)
      .map((line: string) => line.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((line: string) => line.length > 1);

    console.log(`[expand] Gemini gerou ${rawIngredients.length} itens brutos`);

    // FILTRO CRÍTICO: Remover pratos prontos
    const pureIngredients = rawIngredients.filter((ing: string) => {
      const isPrepared = isPreparedDish(ing);
      if (isPrepared) {
        console.log(`[expand] REJEITADO (prato pronto): ${ing}`);
      }
      return !isPrepared;
    });

    console.log(`[expand] Após filtro de pureza: ${pureIngredients.length} ingredientes puros`);

    // Filtrar duplicatas
    const newIngredients = pureIngredients.filter(
      (ing: string) => !existingSet.has(ing.toLowerCase().trim())
    );

    console.log(`[expand] Novos ingredientes (sem duplicatas): ${newIngredients.length}`);

    if (newIngredients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum ingrediente novo para adicionar",
          stats: {
            generated: rawIngredients.length,
            filtered_as_prepared_dishes: rawIngredients.length - pureIngredients.length,
            duplicates: pureIngredients.length,
            inserted: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inserir em lotes de 50
    const batchInsertSize = 50;
    let totalInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < newIngredients.length; i += batchInsertSize) {
      const batch = newIngredients.slice(i, i + batchInsertSize).map((ingredient: string) => ({
        intolerance_key,
        ingredient: ingredient.trim(),
      }));

      const { error: insertError } = await supabase
        .from("intolerance_mappings")
        .upsert(batch, { onConflict: "intolerance_key,ingredient", ignoreDuplicates: true });

      if (insertError !== null && insertError !== undefined) {
        console.error(`[expand] Erro ao inserir lote ${i}: ${insertError.message}`);
        errors.push(insertError.message);
      } else {
        totalInserted += batch.length;
      }
    }

    console.log(`[expand] Inseridos ${totalInserted} ingredientes PUROS para ${intolerance_key}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Expansão concluída para ${intolerance_key}`,
        stats: {
          generated: rawIngredients.length,
          filtered_as_prepared_dishes: rawIngredients.length - pureIngredients.length,
          duplicates: pureIngredients.length - newIngredients.length,
          inserted: totalInserted,
          errors: errors.length > 0 ? errors : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[expand] Erro geral: ${err}`);
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

