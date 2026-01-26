import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to call AI with retry
async function callAIWithRetry(
  lovableApiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
        }),
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 5000; // 5s, 10s, 20s
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(2000);
    }
  }
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { table, batch_size = 50, offset = 0, dry_run = true, reanalyze = false } = await req.json();

    console.log(`Processing table: ${table}, batch_size: ${batch_size}, offset: ${offset}, dry_run: ${dry_run}, reanalyze: ${reanalyze}`);

    if (table === 'intolerance_mappings') {
      // Se reanalyze=true, processar itens 'br' que podem ser globais
      // Senão, processar apenas os que ainda estão em 'pt'
      let query = supabase
        .from('intolerance_mappings')
        .select('id, ingredient, intolerance_key, severity_level, language')
        .order('ingredient');
      
      if (reanalyze) {
        // Reprocessar itens BR que parecem ser globais
        query = query.eq('language', 'br');
      } else {
        query = query.eq('language', 'pt');
      }
      
      const { data: ingredients, error } = await query.range(offset, offset + batch_size - 1);

      if (error) throw error;

      if (!ingredients || ingredients.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No more ingredients to process',
          processed: 0,
          offset,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Preparar lista para tradução via IA
      const ingredientsToTranslate = ingredients.filter(ing => {
        // Filtrar: só processar seguros se for FODMAP
        if (ing.severity_level === 'safe' && ing.intolerance_key !== 'fodmap') {
          return false;
        }
        return true;
      });

      if (ingredientsToTranslate.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No eligible ingredients in this batch',
          processed: 0,
          offset,
          next_offset: offset + batch_size,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Usar IA para classificar e traduzir
      const ingredientNames = ingredientsToTranslate.map(i => i.ingredient);
      
      const systemPrompt = `You are a food ingredient translator and classifier. IMPORTANT: Be STRICT about what is global vs regional.

CLASSIFICATION RULES:

GLOBAL (translate to English, language: "en"):
- ALL basic vegetables: carrot, onion, garlic, broccoli, cabbage, beet, kale, lettuce, spinach, tomato, potato, beans, peas, lentils, chickpeas
- ALL basic fruits: apple, pear, peach, grape, mango, papaya, watermelon, melon, orange, banana, strawberry, cherry, plum, fig, date, tamarind
- ALL grains/cereals: wheat, rice, oat, corn, barley, rye, quinoa, millet, buckwheat
- ALL nuts/seeds: peanut, walnut, almond, cashew, pistachio, hazelnut, sesame, sunflower
- ALL proteins: chicken, beef, pork, lamb, fish (generic), shrimp, crab, lobster, salmon, tuna, cod, squid, octopus
- ALL dairy: milk, butter, cheese (generic), cream, yogurt, whey, casein, lactose
- ALL flours: wheat flour, chickpea flour, rice flour, corn flour
- ALL cooking items: oil, vinegar, salt, pepper, sugar, honey
- ALL international items: wasabi, bok choy, pak choi, shiitake, tofu, tempeh, miso, soy sauce
- ALL food additives: sorbitol, xylitol, inulin, mannitol, maltitol
- Generic terms even if written in Portuguese: alho=garlic, cebola=onion, cenoura=carrot, feijão=beans, etc.

REGIONAL_BR (keep in Portuguese, language: "br"):
- Brazilian cheeses with "queijo" prefix: queijo minas, queijo coalho, queijo canastra
- Brazilian specialty products: catupiry, requeijão, brigadeiro, paçoca, rapadura, goiabada
- Brazilian drinks: chimarrão, tereré, guaraná (the fruit), açaí
- Brazilian fish species: tambaqui, pintado, tucunaré, pacu, dourado amazônico, pirarucu
- Brazilian prepared dishes: feijoada, moqueca, vatapá, acarajé
- Products specifically named in Brazilian style: leite condensado (when meaning the BR product)

CRITICAL: Most food ingredients are GLOBAL! When in doubt, classify as GLOBAL.
Even if written in Portuguese, if it's a common ingredient worldwide, it's GLOBAL and should be translated.

Return a JSON array: [{ "original": "...", "translated": "...", "type": "global|regional_br", "language": "en|br" }]`;

      const userPrompt = `Classify and translate these ingredients. Remember: most common food ingredients are GLOBAL and should be translated to English:\n${JSON.stringify(ingredientNames)}`;

      const content = await callAIWithRetry(lovableApiKey!, systemPrompt, userPrompt);
      
      let translationResult: Array<{ original: string; translated: string; type: string; language: string }>;
      
      try {
        // Extrair JSON do response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          translationResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error('Failed to parse AI translation response');
      }

      // Criar mapa de traduções
      const translationMap = new Map<string, { translated: string; language: string }>();
      for (const item of translationResult) {
        translationMap.set(item.original.toLowerCase(), {
          translated: item.translated,
          language: item.language,
        });
      }

      // Preparar updates
      const updates: Array<{ id: string; ingredient: string; language: string }> = [];
      
      for (const ing of ingredientsToTranslate) {
        const translation = translationMap.get(ing.ingredient.toLowerCase());
        if (translation) {
          updates.push({
            id: ing.id,
            ingredient: translation.translated,
            language: translation.language,
          });
        }
      }

      if (!dry_run && updates.length > 0) {
        // Executar updates - primeiro buscar o registro original para verificar intolerance_key
        const originalRecords = ingredientsToTranslate.reduce((acc, ing) => {
          acc[ing.id] = ing;
          return acc;
        }, {} as Record<string, typeof ingredientsToTranslate[0]>);

        for (const update of updates) {
          const original = originalRecords[update.id];
          if (!original) continue;

          // Verificar se já existe um registro com o mesmo intolerance_key e ingredient traduzido
          const { data: existing } = await supabase
            .from('intolerance_mappings')
            .select('id')
            .eq('intolerance_key', original.intolerance_key)
            .eq('ingredient', update.ingredient)
            .neq('id', update.id)
            .limit(1);

          if (existing && existing.length > 0) {
            // Já existe - deletar o registro duplicado em PT
            console.log(`Duplicate found: deleting ${update.id} (${original.ingredient} -> ${update.ingredient})`);
            const { error: deleteError } = await supabase
              .from('intolerance_mappings')
              .delete()
              .eq('id', update.id);
            
            if (deleteError) {
              console.error(`Error deleting duplicate ${update.id}:`, deleteError);
            }
          } else {
            // Não existe - fazer update normalmente
            const { error: updateError } = await supabase
              .from('intolerance_mappings')
              .update({ ingredient: update.ingredient, language: update.language })
              .eq('id', update.id);
            
            if (updateError) {
              console.error(`Error updating ${update.id}:`, updateError);
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        table: 'intolerance_mappings',
        processed: updates.length,
        offset,
        next_offset: offset + batch_size,
        dry_run,
        sample_updates: updates.slice(0, 10),
        total_in_batch: ingredients.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (table === 'intolerance_safe_keywords') {
      // Buscar neutralizadores para processar
      const { data: keywords, error } = await supabase
        .from('intolerance_safe_keywords')
        .select('id, keyword, intolerance_key')
        .order('keyword')
        .range(offset, offset + batch_size - 1);

      if (error) throw error;

      if (!keywords || keywords.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No more keywords to process',
          processed: 0,
          offset,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Usar IA para classificar e traduzir
      const keywordNames = keywords.map(k => k.keyword);
      
      const systemPrompt = `You are a food safety keyword translator. Your task is to:
1. Classify each keyword as either "global" (internationally recognized) or "regional_br" (specifically Brazilian/Portuguese)
2. If "global", translate to English
3. If "regional_br", keep in Portuguese

These are "safe keywords" or "neutralizers" used in food safety - terms like "sem lactose", "lactose-free", "gluten-free", etc.

Rules:
- Technical terms (lactase, whey protein isolate) are global
- Portuguese phrases (sem glúten, sem lactose, livre de) are regional BR
- English phrases (dairy-free, gluten-free, egg-free) are global

Return a JSON array with objects: { "original": "...", "translated": "...", "type": "global|regional_br", "language": "en|br" }`;

      const userPrompt = `Classify and translate these safe keywords/neutralizers:\n${JSON.stringify(keywordNames)}`;

      const content = await callAIWithRetry(lovableApiKey!, systemPrompt, userPrompt);
      
      let translationResult: Array<{ original: string; translated: string; type: string; language: string }>;
      
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          translationResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error('Failed to parse AI translation response');
      }

      // Criar mapa de traduções
      const translationMap = new Map<string, { translated: string; language: string }>();
      for (const item of translationResult) {
        translationMap.set(item.original.toLowerCase(), {
          translated: item.translated,
          language: item.language,
        });
      }

      // Para keywords, precisamos adicionar coluna language se não existir
      // Por enquanto, só traduzir o keyword
      const updates: Array<{ id: string; keyword: string; language: string }> = [];
      
      for (const kw of keywords) {
        const translation = translationMap.get(kw.keyword.toLowerCase());
        if (translation) {
          updates.push({
            id: kw.id,
            keyword: translation.translated,
            language: translation.language,
          });
        }
      }

      if (!dry_run && updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('intolerance_safe_keywords')
            .update({ keyword: update.keyword })
            .eq('id', update.id);
          
          if (updateError) {
            console.error(`Error updating ${update.id}:`, updateError);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        table: 'intolerance_safe_keywords',
        processed: updates.length,
        offset,
        next_offset: offset + batch_size,
        dry_run,
        sample_updates: updates.slice(0, 10),
        total_in_batch: keywords.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      error: 'Invalid table. Use "intolerance_mappings" or "intolerance_safe_keywords"',
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

