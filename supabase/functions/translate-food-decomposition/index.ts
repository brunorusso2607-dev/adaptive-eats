import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista de palavras-chave que identificam alimentos brasileiros/regionais
const BRAZILIAN_KEYWORDS = [
  'açaí', 'acai', 'brigadeiro', 'beijinho', 'paçoca', 'pacoca',
  'coxinha', 'pão de queijo', 'pao de queijo', 'feijoada', 'farofa',
  'tapioca', 'mandioca', 'tucupi', 'tacacá', 'tacaca', 'vatapá', 'vatapa',
  'acarajé', 'acaraje', 'moqueca', 'bobó', 'bobo', 'caruru',
  'cuscuz', 'pamonha', 'curau', 'canjica', 'mungunzá', 'mungunza',
  'rapadura', 'cachaça', 'cachaca', 'caipirinha', 'guaraná', 'guarana',
  'cupuaçu', 'cupuacu', 'graviola', 'jabuticaba', 'pitanga', 'caju',
  'cajú', 'umbu', 'buriti', 'pequi', 'baru', 'licuri',
  'baião de dois', 'baiao de dois', 'arroz carreteiro', 'galinhada',
  'virado à paulista', 'virado a paulista', 'tutu', 'tropeiro',
  'quibebe', 'pirão', 'pirao', 'angu', 'polenta', 'broa',
  'queijo minas', 'requeijão', 'requeijao', 'catupiry', 'coalho',
  'carne de sol', 'charque', 'jabá', 'jaba', 'picanha',
  'linguiça', 'linguica', 'calabresa', 'mortadela',
  'goiabada', 'marmelada', 'cocada', 'quindim', 'pudim',
  'romeu e julieta', 'bolo de rolo', 'bolo de fubá', 'bolo de fuba',
  'pé de moleque', 'pe de moleque', 'maria mole', 'olho de sogra',
  'chipa', 'empada', 'pastel', 'esfiha', 'caldo de cana',
  'açúcar mascavo', 'acucar mascavo', 'melado', 'garapa',
  'feijão tropeiro', 'feijao tropeiro', 'feijão preto', 'feijao preto',
  'feijão carioca', 'feijao carioca', 'feijão fradinho', 'feijao fradinho',
  'aipim', 'macaxeira', 'inhame', 'cará', 'cara',
  'quiabo', 'maxixe', 'jiló', 'jilo', 'taioba', 'ora-pro-nóbis',
  'pimenta malagueta', 'pimenta dedo de moça', 'pimenta biquinho',
  'dendê', 'dende', 'azeite de dendê', 'leite de coco',
  'farinha de mandioca', 'farinha de tapioca', 'polvilho',
  'goma', 'beiju', 'biju', 'maniçoba', 'manicoba',
  'sarapatel', 'buchada', 'panelada', 'dobradinha',
  'mocotó', 'mocoto', 'rabada', 'feijoada completa',
  'churrasco', 'costela', 'cupim', 'fraldinha', 'maminha',
  'alcatra', 'contrafilé', 'contrafile', 'filé mignon', 'file mignon',
  'açaí na tigela', 'acai na tigela', 'tapioca recheada',
  'prato feito', 'pf ', 'marmita', 'quentinha',
  'suco de', 'vitamina de', 'batida de',
  'camarão', 'camarao', 'caranguejo', 'siri', 'lagosta',
  'bacalhau', 'sardinha', 'tilápia', 'tilapia', 'tambaqui', 'pirarucu',
  'tucunaré', 'tucunare', 'pacu', 'pintado', 'dourado',
  'piraíba', 'piraiba', 'surubim', 'jaraqui',
  'carne seca', 'jabá', 'carne de charque',
  'banana da terra', 'banana prata', 'banana nanica',
  'laranja pera', 'laranja lima', 'laranja bahia',
  'abacaxi pérola', 'abacaxi perola', 'manga palmer', 'manga tommy',
  'mamão papaya', 'mamao papaya', 'mamão formosa', 'mamao formosa',
  'goiaba', 'maracujá', 'maracuja', 'carambola', 'fruta do conde',
  'atemoia', 'cherimoia', 'sapoti', 'jaca', 'caqui',
  'nêspera', 'nespera', 'ameixa', 'pêssego', 'pessego',
  'lichia', 'rambutã', 'rambuta', 'mangostão', 'mangostao',
  'tamarindo', 'siriguela', 'cajá', 'caja', 'mangaba',
  'murici', 'bacaba', 'patauá', 'pataua', 'pupunha',
  'tucumã', 'tucuma', 'inajá', 'inaja', 'babaçu', 'babacu',
  'macaúba', 'macauba', 'bocaiúva', 'bocaiuva', 'coquinho',
  'castanha do pará', 'castanha do para', 'castanha de caju',
  'amendoim', 'pinhão', 'pinhao', 'baru',
  'erva mate', 'chimarrão', 'chimarrao', 'tererê', 'terere',
  'quentão', 'quentao', 'vinho quente', 'ponche',
  'mingau', 'canjica', 'arroz doce', 'sagu',
  'doce de leite', 'leite condensado', 'nata',
  'coalhada', 'iogurte natural', 'kefir',
  'pão francês', 'pao frances', 'pão de forma', 'pao de forma',
  'pão integral', 'pao integral', 'pão sovado', 'pao sovado',
  'rosca', 'biscoito de polvilho', 'sequilho',
  'bolacha', 'biscoito maisena', 'biscoito cream cracker',
  'sonho', 'bomba de chocolate', 'carolina',
  'churros', 'crepe', 'waffle',
  'açaí bowl', 'smoothie bowl', 'granola',
  'tapioquinha', 'crepioca', 'omelete',
  'salpicão', 'salpicao', 'maionese de batata', 'vinagrete',
  'farofa de banana', 'farofa de ovo', 'farofa acebolada',
  'feijão verde', 'feijao verde', 'feijão de corda', 'feijao de corda',
  'baião', 'baiao', 'arroz de carreteiro',
  'escondidinho', 'empadão', 'empadao', 'torta salgada',
  'quiche', 'suflê', 'sufle', 'lasanha',
  'nhoque', 'ravióli', 'ravioli', 'capeletti',
  'estrogonofe', 'strogonoff', 'fricassê', 'fricasse',
  'isca de peixe', 'bolinho de bacalhau', 'acarajé',
  'abará', 'abara', 'coxinha de galinha',
  'risole', 'rissole', 'kibe', 'quibe',
  'esfirra', 'esfiha', 'joelho',
  'croissant', 'pão de batata', 'pao de batata',
  'pão de calabresa', 'pao de calabresa',
  'mortadela italiana', 'presunto parma',
  'salame', 'copa', 'pancetta', 'bacon',
  'queijo prato', 'queijo muçarela', 'queijo mussarela',
  'queijo provolone', 'queijo gorgonzola',
  'queijo brie', 'queijo camembert', 'queijo gruyère', 'queijo gruyere',
  'requeijão cremoso', 'requeijao cremoso', 'cream cheese',
  'manteiga', 'margarina', 'ghee',
  'óleo de soja', 'oleo de soja', 'óleo de milho', 'oleo de milho',
  'óleo de girassol', 'oleo de girassol', 'óleo de canola', 'oleo de canola',
  'azeite de oliva', 'azeite extra virgem',
  'vinagre de maçã', 'vinagre de maca', 'vinagre balsâmico', 'vinagre balsamico',
  'molho inglês', 'molho ingles', 'molho shoyu', 'molho de soja',
  'molho de pimenta', 'molho barbecue', 'molho mostarda',
  'ketchup', 'maionese', 'mostarda',
  'sal grosso', 'sal marinho', 'sal rosa',
  'pimenta do reino', 'pimenta branca', 'pimenta rosa',
  'cominho', 'coentro', 'salsa', 'cebolinha',
  'alho poró', 'alho poro', 'cebola roxa', 'cebola branca',
  'tomate italiano', 'tomate cereja', 'tomate grape',
  'alface americana', 'alface crespa', 'alface roxa',
  'rúcula', 'rucula', 'agrião', 'agriao', 'espinafre',
  'couve manteiga', 'couve flor', 'brócolis', 'brocolis',
  'acelga', 'repolho', 'nabo', 'rabanete',
  'beterraba', 'cenoura', 'batata inglesa', 'batata doce',
  'batata baroa', 'mandioquinha', 'inhame',
  'chuchu', 'abobrinha', 'abóbora', 'abobora',
  'berinjela', 'pimentão', 'pimentao', 'pepino',
  'vagem', 'ervilha', 'milho verde', 'palmito',
  'aspargo', 'alcachofra', 'cogumelo', 'champignon',
  'shimeji', 'shiitake', 'portobello',
  'açafrão', 'acafrao', 'cúrcuma', 'curcuma', 'gengibre',
  'canela', 'cravo', 'noz moscada', 'cardamomo',
  'anis estrelado', 'baunilha', 'essência', 'essencia',
  'fermento químico', 'fermento quimico', 'fermento biológico', 'fermento biologico',
  'bicarbonato', 'cremor de tártaro', 'cremor de tartaro',
  'amido de milho', 'maisena', 'fécula', 'fecula',
  'farinha de trigo', 'farinha de arroz', 'farinha de aveia',
  'farinha de amêndoa', 'farinha de amendoa', 'farinha de coco',
  'farinha de linhaça', 'farinha de linhaca', 'farinha de chia',
  'aveia em flocos', 'granola', 'muesli',
  'quinoa', 'amaranto', 'chia', 'linhaça', 'linhaca',
  'gergelim', 'semente de abóbora', 'semente de girassol',
  'castanha de caju', 'castanha do pará', 'amêndoa', 'amendoa',
  'nozes', 'avelã', 'avela', 'macadâmia', 'macadamia',
  'pistache', 'pecã', 'peca',
  'chocolate ao leite', 'chocolate amargo', 'chocolate branco',
  'cacau em pó', 'cacau em po', 'nibs de cacau',
  'mel', 'melado', 'xarope de bordo', 'xarope de agave',
  'açúcar cristal', 'acucar cristal', 'açúcar refinado', 'acucar refinado',
  'açúcar demerara', 'acucar demerara', 'açúcar mascavo', 'acucar mascavo',
  'adoçante', 'adocante', 'stevia', 'xilitol', 'eritritol',
  'leite integral', 'leite desnatado', 'leite semidesnatado',
  'leite em pó', 'leite em po', 'leite condensado', 'creme de leite',
  'chantilly', 'nata', 'ricota', 'cottage',
  'iogurte grego', 'iogurte natural', 'coalhada',
  'leite de coco', 'leite de amêndoa', 'leite de amendoa',
  'leite de soja', 'leite de aveia', 'leite de arroz',
  'tofu', 'tempeh', 'seitan',
  'proteína de soja', 'proteina de soja', 'proteína de ervilha', 'proteina de ervilha',
  'whey protein', 'albumina', 'caseína', 'caseina',
  'colágeno', 'colageno', 'gelatina',
  'agar agar', 'carragena', 'goma xantana', 'goma guar',
  'lecitina de soja', 'emulsificante',
  'corante natural', 'corante artificial',
  'conservante', 'antioxidante', 'acidulante',
  'aromatizante', 'realçador de sabor', 'realcador de sabor',
  'glutamato monossódico', 'glutamato monossodico', 'msg',
  'extrato de tomate', 'molho de tomate', 'catchup',
  'molho branco', 'molho vermelho', 'molho rosé', 'molho rose',
  'molho bolonhesa', 'molho carbonara', 'molho pesto',
  'molho teriyaki', 'molho agridoce', 'molho curry',
  'pasta de amendoim', 'pasta de castanha', 'tahine',
  'húmus', 'humus', 'babaganoush', 'guacamole',
  'patê', 'pate', 'antepasto', 'bruschetta',
  'focaccia', 'ciabatta', 'baguete', 'pão italiano', 'pao italiano',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isBrazilianFood(foodName: string): boolean {
  const normalized = foodName.toLowerCase();
  return BRAZILIAN_KEYWORDS.some(keyword => normalized.includes(keyword.toLowerCase()));
}

async function callAIWithRetry(
  lovableApiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.lovable.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
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
        console.log(`Rate limited, attempt ${attempt}/${maxRetries}. Waiting...`);
        await sleep(2000 * attempt);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Error on attempt ${attempt}, retrying...`, error);
      await sleep(1000 * attempt);
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batch_size = 20, offset = 0, dry_run = true } = await req.json();

    console.log(`[translate-food-decomposition] Starting batch: offset=${offset}, batch_size=${batch_size}, dry_run=${dry_run}`);

    // Buscar registros em português que precisam de classificação/tradução
    const { data: foods, error: fetchError } = await supabase
      .from('food_decomposition_mappings')
      .select('*')
      .eq('language', 'pt')
      .eq('is_active', true)
      .order('food_name')
      .range(offset, offset + batch_size - 1);

    if (fetchError) {
      throw new Error(`Error fetching foods: ${fetchError.message}`);
    }

    if (!foods || foods.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No more records to process',
        processed: 0,
        next_offset: null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${foods.length} foods to process`);

    // Separar: brasileiros vs globais
    const brazilianFoods: typeof foods = [];
    const globalFoods: typeof foods = [];

    for (const food of foods) {
      if (isBrazilianFood(food.food_name)) {
        brazilianFoods.push(food);
      } else {
        globalFoods.push(food);
      }
    }

    console.log(`Classification: ${brazilianFoods.length} Brazilian, ${globalFoods.length} Global`);

    const updates: Array<{ id: string; food_name: string; base_ingredients: string[]; language: string }> = [];

    // Marcar brasileiros como 'br'
    for (const food of brazilianFoods) {
      updates.push({
        id: food.id,
        food_name: food.food_name, // Mantém em PT
        base_ingredients: food.base_ingredients, // Mantém em PT
        language: 'br'
      });
    }

    // Traduzir globais para inglês
    if (globalFoods.length > 0) {
      const foodsToTranslate = globalFoods.map(f => ({
        id: f.id,
        food_name: f.food_name,
        base_ingredients: f.base_ingredients
      }));

      const systemPrompt = `You are a food translation expert. Translate food names and ingredients from Portuguese to English.
      
RULES:
1. Return ONLY valid JSON, no markdown or explanation
2. Translate food_name to proper English culinary term
3. Translate each ingredient in base_ingredients to English
4. Use lowercase for all translations
5. Keep the same array structure

Example input:
[{"id":"abc","food_name":"pão integral","base_ingredients":["farinha de trigo integral","fermento","sal"]}]

Example output:
{"translations":{"abc":{"food_name":"whole wheat bread","base_ingredients":["whole wheat flour","yeast","salt"]}}}`;

      const userPrompt = `Translate these foods to English:\n${JSON.stringify(foodsToTranslate)}`;

      try {
        const aiResponse = await callAIWithRetry(lovableApiKey, systemPrompt, userPrompt);
        console.log('AI Response:', aiResponse.substring(0, 500));

        // Limpar resposta
        let cleanedResponse = aiResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const parsed = JSON.parse(cleanedResponse);
        const translations = parsed.translations || parsed;

        for (const food of globalFoods) {
          const translation = translations[food.id];
          if (translation) {
            updates.push({
              id: food.id,
              food_name: translation.food_name || food.food_name,
              base_ingredients: translation.base_ingredients || food.base_ingredients,
              language: 'en'
            });
          } else {
            // Fallback: mantém original mas marca como en
            updates.push({
              id: food.id,
              food_name: food.food_name,
              base_ingredients: food.base_ingredients,
              language: 'en'
            });
          }
        }
      } catch (aiError) {
        console.error('AI translation error:', aiError);
        // Fallback: marca como 'en' sem traduzir
        for (const food of globalFoods) {
          updates.push({
            id: food.id,
            food_name: food.food_name,
            base_ingredients: food.base_ingredients,
            language: 'en'
          });
        }
      }
    }

    // Executar updates
    if (!dry_run && updates.length > 0) {
      let successCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        // Verificar se já existe um registro com o mesmo food_name traduzido
        const { data: existing } = await supabase
          .from('food_decomposition_mappings')
          .select('id')
          .eq('food_name', update.food_name)
          .neq('id', update.id)
          .limit(1);

        if (existing && existing.length > 0) {
          // Já existe - deletar o duplicado
          console.log(`Duplicate found: deleting ${update.id} (${update.food_name})`);
          const { error: deleteError } = await supabase
            .from('food_decomposition_mappings')
            .delete()
            .eq('id', update.id);
          
          if (deleteError) {
            console.error(`Error deleting ${update.id}:`, deleteError);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          // Fazer update normalmente
          const { error: updateError } = await supabase
            .from('food_decomposition_mappings')
            .update({
              food_name: update.food_name,
              base_ingredients: update.base_ingredients,
              language: update.language
            })
            .eq('id', update.id);

          if (updateError) {
            console.error(`Error updating ${update.id}:`, updateError);
            errorCount++;
          } else {
            successCount++;
          }
        }
      }

      console.log(`Updates completed: ${successCount} success, ${errorCount} errors`);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: foods.length,
      brazilian_count: brazilianFoods.length,
      global_count: globalFoods.length,
      updates: dry_run ? updates : undefined,
      next_offset: foods.length === batch_size ? offset + batch_size : null,
      dry_run
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in translate-food-decomposition:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

