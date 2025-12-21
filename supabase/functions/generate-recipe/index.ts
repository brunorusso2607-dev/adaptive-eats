import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-RECIPE] ${step}${detailsStr}`);
};

const COMPLEXITY_LABELS: Record<string, string> = {
  rapida: "rápida (até 20 minutos)",
  equilibrada: "equilibrada (20-45 minutos)",
  elaborada: "elaborada (mais de 45 minutos)",
};

const DIETARY_LABELS: Record<string, string> = {
  comum: "alimentação comum (sem restrições)",
  vegetariana: "vegetariana (sem carnes)",
  vegana: "vegana (sem produtos animais)",
  low_carb: "low carb (baixo carboidrato)",
};

const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecer (foco em saciedade e déficit calórico)",
  manter: "manter peso (calorias de manutenção)",
  ganhar_peso: "ganhar peso/massa muscular (superávit calórico e proteína alta)",
};

const CALORIE_LABELS: Record<string, string> = {
  reduzir: "reduzir calorias (porções menores, menos calóricas)",
  manter: "manter calorias normais",
  aumentar: "aumentar calorias",
  definir_depois: "calorias normais",
};

// Mapeamento de categorias com exemplos típicos para guiar a IA
const CATEGORY_EXAMPLES: Record<string, Record<string, string>> = {
  "Entradas & Leves": {
    "Saladas": "Salada Caesar, Salada Caprese, Salada de Quinoa com Legumes, Salada Tropical",
    "Molhos para salada": "Molho de Iogurte, Vinagrete, Molho Caesar, Molho de Mostarda e Mel",
    "Pastas e patês": "Homus, Guacamole, Patê de Atum, Pasta de Grão-de-Bico",
    "Antepastos": "Bruschetta, Carpaccio, Tábua de Frios, Antepasto de Berinjela",
    "Sopas leves": "Sopa de Legumes, Caldo Verde Light, Sopa de Abóbora, Consomê",
    "Caldos": "Caldo de Legumes, Caldo de Frango, Caldo Detox, Caldo de Feijão",
    "Cremes frios": "Gazpacho, Creme de Pepino, Vichyssoise, Creme de Abacate",
  },
  "Pratos Principais": {
    "Prato principal tradicional": "Arroz com Feijão e Bife, Frango Assado, Strogonoff, Feijoada Light",
    "Pratos fitness": "Frango Grelhado com Batata Doce, Tilápia com Legumes, Omelete Proteica",
    "Pratos low carb": "Espaguete de Abobrinha, Couve-Flor Refogada com Frango, Berinjela Recheada",
    "Pratos vegetarianos": "Risoto de Cogumelos, Lasanha de Berinjela, Curry de Grão-de-Bico",
    "Pratos veganos": "Buddha Bowl, Feijoada Vegana, Moqueca de Banana da Terra",
    "Pratos proteicos (high protein)": "Bife Ancho, Salmão Grelhado, Peito de Peru Assado",
    "Pratos elaborados / gourmet": "Risoto de Camarão, Medalhão ao Molho Madeira, Lombo Recheado",
    "Pratos para bulking": "Macarrão com Carne Moída, Arroz com Frango e Ovo, Bowl Calórico",
    "Pratos calóricos": "Lasanha Tradicional, Escondidinho de Carne Seca, Feijoada Completa",
  },
  "Acompanhamentos": {
    "Arroz e grãos": "Arroz à Grega, Arroz de Brócolis, Arroz Integral, Quinoa",
    "Legumes refogados": "Abobrinha Refogada, Brócolis no Alho, Mix de Legumes",
    "Purês": "Purê de Batata, Purê de Mandioquinha, Purê de Abóbora",
    "Farofas": "Farofa de Banana, Farofa de Ovos, Farofa Crocante",
    "Massas": "Espaguete ao Alho e Óleo, Penne ao Sugo, Macarrão Integral",
    "Cuscuz": "Cuscuz Nordestino, Cuscuz Marroquino, Cuscuz de Legumes",
    "Quinoa e derivados": "Quinoa com Legumes, Tabule de Quinoa, Quinoa ao Pesto",
  },
  "Café da Manhã & Lanches": {
    "Café da manhã": "Omelete com Queijo, Panqueca de Banana, Torrada com Abacate, Mingau de Aveia, Tapioca Recheada, Pão Integral com Ovos",
    "Lanches fitness": "Wrap de Frango, Sanduíche Natural, Barrinha de Proteína Caseira, Smoothie Bowl, Crepioca, Muffin de Banana",
    "Lanches calóricos": "Sanduíche de Pasta de Amendoim, Vitamina com Aveia e Banana, Panqueca com Mel",
    "Panquecas": "Panqueca de Aveia, Panqueca Americana, Panqueca de Banana, Panqueca Proteica",
    "Ovos e omeletes": "Omelete de Legumes, Ovos Mexidos, Ovo Pochê, Fritada de Espinafre",
    "Sanduíches": "Sanduíche de Frango, Sanduíche Caprese, Croissant Recheado, Bagel de Cream Cheese",
    "Tapiocas": "Tapioca de Queijo, Tapioca de Frango, Tapioca de Banana com Canela, Tapioca Fit",
  },
  "Sobremesas": {
    "Sobremesas tradicionais": "Pudim de Leite, Brigadeiro, Mousse de Maracujá, Pavê",
    "Sobremesas fitness": "Mousse de Chocolate Fit, Sorvete de Banana, Pudim Proteico",
    "Sobremesas low carb": "Cheesecake Low Carb, Brownie Sem Açúcar, Tortinha de Morango",
    "Sobremesas sem açúcar": "Gelatina Diet, Mousse de Limão Diet, Doce de Abóbora Sem Açúcar",
    "Sobremesas veganas": "Brigadeiro Vegano, Mousse de Cacau, Sorvete de Coco",
    "Bolos": "Bolo de Cenoura, Bolo de Chocolate, Bolo de Laranja, Bolo Formigueiro",
    "Tortas doces": "Torta de Limão, Torta de Maçã, Torta Holandesa, Cheesecake",
    "Doces gelados": "Sorvete Caseiro, Picolé de Frutas, Açaí na Tigela, Paleta Mexicana",
  },
  "Bebidas": {
    "Sucos naturais": "Suco de Laranja, Suco Verde Detox, Suco de Melancia, Limonada",
    "Vitaminas e smoothies": "Vitamina de Banana, Smoothie de Morango, Vitamina de Abacate",
    "Shakes proteicos": "Shake de Whey com Banana, Shake de Proteína Vegetal, Shake Pós-Treino",
    "Shakes para ganho de massa": "Shake Hipercalórico, Shake de Pasta de Amendoim, Shake com Aveia",
    "Chás": "Chá de Camomila, Chá Verde, Chá de Hibisco, Chá de Gengibre",
    "Bebidas funcionais": "Água Detox, Shot de Gengibre, Golden Milk, Kombucha",
    "Bebidas detox": "Suco Detox Verde, Água de Pepino, Suco Emagrecedor, Chá Detox",
  },
  "Snacks & Petiscos": {
    "Snacks saudáveis": "Chips de Batata Doce, Grão-de-Bico Crocante, Mix de Nuts, Palitos de Legumes",
    "Snacks low carb": "Chips de Queijo, Palitos de Pepino, Bolinhas de Carne, Ovos de Codorna",
    "Snacks calóricos": "Granola Caseira, Mix de Frutas Secas, Castanhas Caramelizadas",
    "Petiscos de forno": "Bolinha de Queijo, Empada, Pastel Assado, Coxinha de Frango Fit",
    "Petiscos de airfryer": "Batata Rústica, Calabresa Acebolada, Nuggets Caseiros, Bolinho de Bacalhau",
    "Finger foods": "Mini Hambúrguer, Espetinho Caprese, Tartine, Canapés",
  },
};

// Tipos de refeição por horário/ocasião
const MEAL_TYPE_HINTS: Record<string, string> = {
  "Café da manhã": "Esta é uma receita para o CAFÉ DA MANHÃ. Deve ser algo típico de café da manhã como ovos, pães, frutas, mingau, tapioca, panquecas, etc. NUNCA gere almoço ou jantar.",
  "Lanches fitness": "Esta é uma receita de LANCHE FITNESS. Deve ser algo leve e proteico para lanchar entre refeições, como wraps, sanduíches naturais, smoothies, crepiocas. NUNCA gere pratos principais de almoço/jantar.",
  "Lanches calóricos": "Esta é uma receita de LANCHE CALÓRICO para ganho de peso. Deve ser um lanche substancioso, não um prato principal completo.",
  "Panquecas": "Deve ser uma receita de PANQUECA - doce ou salgada, típica de café da manhã ou lanche.",
  "Ovos e omeletes": "Deve ser uma receita baseada em OVOS - omelete, ovos mexidos, fritada, etc. Típica de café da manhã.",
  "Sanduíches": "Deve ser uma receita de SANDUÍCHE - para café da manhã ou lanche, não um prato principal.",
  "Tapiocas": "Deve ser uma receita de TAPIOCA - típica de café da manhã ou lanche brasileiro.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { ingredients, type, categoryContext } = await req.json();
    logStep("Request received", { type, ingredients, categoryContext });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("Profile fetched", { 
      intolerances: profile.intolerances,
      dietary: profile.dietary_preference,
      goal: profile.goal,
      complexity: profile.recipe_complexity
    });

    // Build intolerances string - handle null/undefined case
    const intolerancesList = profile.intolerances || [];
    const intolerancesStr = intolerancesList.length > 0 && !intolerancesList.includes("nenhuma")
      ? intolerancesList.map((i: string) => {
          const labels: Record<string, string> = {
            lactose: "SEM LACTOSE (nenhum leite, queijo, manteiga, creme de leite, iogurte ou derivados)",
            gluten: "SEM GLÚTEN (nenhuma farinha de trigo, aveia, cevada, centeio)",
            acucar: "SEM AÇÚCAR (nenhum açúcar refinado, mascavo, mel, ou adoçantes calóricos)",
            amendoim: "SEM AMENDOIM (nenhum amendoim ou derivados)",
            frutos_mar: "SEM FRUTOS DO MAR (nenhum camarão, peixe, mariscos)",
            ovo: "SEM OVO (nenhum ovo ou derivados)",
          };
          return labels[i] || i;
        }).join(", ")
      : "nenhuma restrição";

    // Modo Kids special prompt
    const isKidsMode = profile.context === "modo_kids";
    
    // Weight goal modes
    const isWeightLossMode = profile.goal === "emagrecer";
    const isWeightGainMode = profile.goal === "ganhar_peso";
    const hasWeightGoal = isWeightLossMode || isWeightGainMode;
    
    // Calculate personalized macros if weight data is available
    let personalizedMacros: { targetCalories: number; protein: number; mode: string } | null = null;
    if (hasWeightGoal && profile.weight_current && profile.height && profile.age && profile.sex) {
      // Mifflin-St Jeor Formula
      let tmb: number;
      if (profile.sex === "male") {
        tmb = (10 * profile.weight_current) + (6.25 * profile.height) - (5 * profile.age) + 5;
      } else {
        tmb = (10 * profile.weight_current) + (6.25 * profile.height) - (5 * profile.age) - 161;
      }
      
      const activityFactors: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
      };
      const factor = activityFactors[profile.activity_level] || 1.55;
      const get = Math.round(tmb * factor);
      
      let targetCalories: number;
      let protein: number;
      
      if (isWeightLossMode) {
        targetCalories = Math.max(get - 500, profile.sex === "male" ? 1500 : 1200);
        protein = Math.round((profile.weight_goal || profile.weight_current) * 2);
      } else {
        // Weight gain mode
        targetCalories = get + 400;
        protein = Math.round((profile.weight_goal || profile.weight_current) * 2.2);
      }
      
      personalizedMacros = { targetCalories, protein, mode: isWeightLossMode ? "lose" : "gain" };
      logStep("Personalized macros calculated", personalizedMacros);
    }

    // Build category constraint if category is selected
    let categoryConstraint = "";
    let categoryExamples = "";
    let mealTypeHint = "";
    
    if (categoryContext && categoryContext.category && categoryContext.subcategory) {
      const category = categoryContext.category;
      const subcategory = categoryContext.subcategory;
      
      // Get examples for this category/subcategory
      if (CATEGORY_EXAMPLES[category] && CATEGORY_EXAMPLES[category][subcategory]) {
        categoryExamples = CATEGORY_EXAMPLES[category][subcategory];
      }
      
      // Get meal type hint if available
      if (MEAL_TYPE_HINTS[subcategory]) {
        mealTypeHint = MEAL_TYPE_HINTS[subcategory];
      }
      
      categoryConstraint = `
🚨🚨🚨 REGRA MAIS IMPORTANTE - CATEGORIA OBRIGATÓRIA 🚨🚨🚨
O usuário SELECIONOU especificamente a categoria "${category}" → "${subcategory}".

${mealTypeHint}

EXEMPLOS TÍPICOS desta categoria: ${categoryExamples || subcategory}

⛔ PROIBIDO: Gerar receitas que não pertencem a esta categoria.
⛔ PROIBIDO: Gerar pratos principais (salmão, frango grelhado, carne) quando a categoria é "Café da Manhã & Lanches".
⛔ PROIBIDO: Ignorar a categoria selecionada em favor de outras preferências.

✅ OBRIGATÓRIO: A receita DEVE ser algo típico e representativo de "${subcategory}".
✅ OBRIGATÓRIO: Respeitar a categoria TEM PRIORIDADE sobre macros e calorias.

Se o usuário pediu "${subcategory}", você DEVE gerar algo dessa categoria, mesmo que pareça menos "nutritivo" ou "proteico".
`;
      
      logStep("Category constraint built", { category, subcategory, hasExamples: !!categoryExamples });
    }
    
    const kidsInstructions = isKidsMode ? `
MODO KIDS ATIVO - REGRAS ESPECIAIS:
- Nomes DIVERTIDOS e criativos (ex: "Macarrão Arco-Íris", "Bolinho do Astronauta", "Pizza do Dino")
- Descrições com emojis e linguagem amigável para crianças
- Receitas SIMPLES com no máximo 6-8 ingredientes
- Tempo de preparo CURTO (máximo 25 minutos)
- Sabores suaves e familiares (evitar temperos fortes)
- Ingredientes coloridos e visualmente atrativos
- Instruções simples que uma criança poderia ajudar
- Calorias adequadas para crianças (300-500 kcal por porção)
- Apresentação divertida (formas, cores, decorações simples)
- SEMPRE usar complexity "rapida" no Modo Kids` : "";

    const weightLossInstructions = isWeightLossMode ? `
MODO EMAGRECIMENTO ATIVO - REGRAS ESPECIAIS:
- PRIORIZE ingredientes com ALTO PODER DE SACIEDADE (fibras, proteínas, água)
- Use vegetais volumosos (brócolis, couve-flor, abobrinha, folhas verdes)
- Inclua proteínas magras (frango, peixe, ovos, leguminosas)
- Adicione fibras (aveia, chia, linhaça, legumes)
- EVITE carboidratos refinados e açúcares
${personalizedMacros 
  ? `- META CALÓRICA PERSONALIZADA: ${personalizedMacros.targetCalories} kcal/dia - adapte a receita para ~${Math.round(personalizedMacros.targetCalories / 3)} kcal por refeição
- META DE PROTEÍNA: ${personalizedMacros.protein}g por dia - inclua ~${Math.round(personalizedMacros.protein / 3)}g por refeição`
  : `- Calorias por porção: 300-450 kcal (déficit calórico controlado)
- Proteína alta: mínimo 25g por porção`}
- Prefira métodos de cocção: grelhado, assado, cozido no vapor
- Adicione um campo "satiety_tip" com dica de saciedade
- Adicione um campo "satiety_score" de 1-10 (quanto maior, mais saciante)
- Inclua ingredientes termogênicos quando possível (gengibre, pimenta, canela)
⚠️ IMPORTANTE: Respeite PRIMEIRO a categoria selecionada, depois adapte para versão fit.` : "";

    const weightGainInstructions = isWeightGainMode ? `
MODO GANHO DE PESO/MASSA ATIVO - REGRAS ESPECIAIS:
- PRIORIZE receitas com ALTA DENSIDADE CALÓRICA e nutritiva
- Use fontes de proteína de qualidade (frango, carne, ovos, peixe, leguminosas)
- Inclua carboidratos complexos (arroz, batata, macarrão integral, aveia)
- Adicione gorduras saudáveis (azeite, abacate, castanhas, pasta de amendoim)
- AUMENTE porções de proteína e carboidratos
${personalizedMacros 
  ? `- META CALÓRICA PERSONALIZADA: ${personalizedMacros.targetCalories} kcal/dia - adapte a receita para ~${Math.round(personalizedMacros.targetCalories / 3)} kcal por refeição
- META DE PROTEÍNA: ${personalizedMacros.protein}g por dia - inclua ~${Math.round(personalizedMacros.protein / 3)}g por refeição`
  : `- Calorias por porção: 550-700 kcal (superávit calórico controlado)
- Proteína alta: mínimo 35g por porção`}
- Inclua snacks calóricos saudáveis
- Adicione um campo "muscle_tip" com dica para ganho de massa
- Adicione um campo "calorie_density_score" de 1-10 (quanto maior, mais calórico)
⚠️ IMPORTANTE: Respeite PRIMEIRO a categoria selecionada, depois adapte para versão calórica.` : "";
    
    const systemPrompt = `Você é um nutricionista e chef especializado em receitas personalizadas.
Você DEVE gerar receitas com valores nutricionais REAIS e PRECISOS baseados em tabelas nutricionais.

${categoryConstraint}

${kidsInstructions}
${weightLossInstructions}
${weightGainInstructions}

HIERARQUIA DE PRIORIDADES (em ordem):
1. 🥇 CATEGORIA SELECIONADA - se o usuário escolheu uma categoria, a receita DEVE ser dessa categoria
2. 🥈 INTOLERÂNCIAS - nunca incluir ingredientes proibidos
3. 🥉 PREFERÊNCIA ALIMENTAR - vegetariana, vegana, etc.
4. 🏅 OBJETIVO DE PESO - adaptar calorias/macros
5. 🏅 COMPLEXIDADE - tempo de preparo

REGRAS ABSOLUTAS - NUNCA VIOLAR:
1. INTOLERÂNCIAS: ${intolerancesStr}
   - NUNCA inclua ingredientes proibidos
   - Use APENAS substitutos seguros (ex: leite de amêndoas em vez de leite se sem lactose)
   
2. PREFERÊNCIA ALIMENTAR: ${DIETARY_LABELS[profile.dietary_preference]}

3. OBJETIVO: ${GOAL_LABELS[profile.goal]}

4. META CALÓRICA: ${CALORIE_LABELS[profile.calorie_goal]}

5. COMPLEXIDADE: ${isKidsMode ? "rápida (até 20 minutos) - OBRIGATÓRIO no Modo Kids" : COMPLEXITY_LABELS[profile.recipe_complexity]}

6. CONTEXTO: ${profile.context === "familia" ? "receita para família (4 porções)" : isKidsMode ? "MODO KIDS: receita divertida para crianças (2-3 porções), nomes criativos, emojis na descrição!" : "receita individual (2 porções)"}

FORMATO DE RESPOSTA (JSON VÁLIDO):
{
  "name": "${isKidsMode ? "Nome DIVERTIDO e criativo (ex: Macarrão Arco-Íris 🌈)" : "Nome da Receita"}",
  "description": "${isKidsMode ? "Descrição curta e divertida COM EMOJIS para crianças!" : "Breve descrição em 1 frase"}",
  "ingredients": [
    {"item": "nome do ingrediente", "quantity": "quantidade", "unit": "unidade"},
    ...
  ],
  "instructions": [
    "${isKidsMode ? "Passo simples que uma criança poderia ajudar..." : "Passo 1..."}",
    ...
  ],
  "prep_time": ${isKidsMode ? 20 : 30},
  "complexity": "${isKidsMode ? "rapida" : profile.recipe_complexity}",
  "servings": ${profile.context === "familia" ? 4 : isKidsMode ? 3 : 2},
  "calories": ${isKidsMode ? 400 : isWeightLossMode ? 380 : isWeightGainMode ? 600 : 450},
  "protein": ${isWeightLossMode ? 30 : isWeightGainMode ? 40 : 25.5},
  "carbs": ${isWeightLossMode ? 25 : isWeightGainMode ? 60 : 35.2},
  "fat": ${isWeightLossMode ? 12 : isWeightGainMode ? 22 : 18.3}${isWeightLossMode ? `,
  "satiety_score": 8,
  "satiety_tip": "Dica de saciedade para ajudar no emagrecimento"` : isWeightGainMode ? `,
  "calorie_density_score": 8,
  "muscle_tip": "Dica para ganho de massa muscular"` : ""}
}

IMPORTANTE:
- calories, protein, carbs, fat são POR PORÇÃO
- Use valores nutricionais REAIS baseados nos ingredientes
- prep_time em minutos${isKidsMode ? " (MÁXIMO 25 no Modo Kids)" : ""}${isWeightLossMode ? "\n- satiety_score de 1-10 baseado na composição (fibras + proteínas = maior score)\n- satiety_tip: uma dica prática de como a receita ajuda na saciedade" : ""}${isWeightGainMode ? "\n- calorie_density_score de 1-10 baseado na densidade calórica\n- muscle_tip: uma dica prática para maximizar ganho muscular" : ""}
- Responda APENAS com o JSON, sem texto adicional`;

    let userPrompt: string;
    if (categoryContext && categoryContext.category && categoryContext.subcategory) {
      let filtersText = "";
      if (categoryContext.filters) {
        const filterParts: string[] = [];
        if (categoryContext.filters.culinaria) {
          filterParts.push(`culinária ${categoryContext.filters.culinaria}`);
        }
        if (categoryContext.filters.tempo) {
          filterParts.push(`tempo de preparo: ${categoryContext.filters.tempo}`);
        }
        if (categoryContext.filters.metodo) {
          filterParts.push(`método de preparo: ${categoryContext.filters.metodo}`);
        }
        if (filterParts.length > 0) {
          filtersText = ` Considere os seguintes filtros: ${filterParts.join(", ")}.`;
        }
      }
      
      // Prompt reforçado para categoria
      userPrompt = `🎯 CATEGORIA SELECIONADA: "${categoryContext.category}" → "${categoryContext.subcategory}"

GERE UMA RECEITA QUE SEJA TÍPICA E REPRESENTATIVA DE "${categoryContext.subcategory}".

${CATEGORY_EXAMPLES[categoryContext.category]?.[categoryContext.subcategory] 
  ? `Exemplos do que espero: ${CATEGORY_EXAMPLES[categoryContext.category][categoryContext.subcategory]}.` 
  : ""}

${MEAL_TYPE_HINTS[categoryContext.subcategory] || ""}

${filtersText}

⚠️ LEMBRE-SE: NÃO gere pratos de outra categoria. Se pedi "${categoryContext.subcategory}", a receita DEVE ser disso.`;
      
    } else if (type === "automatica") {
      userPrompt = "Gere uma receita saudável e deliciosa que se encaixe no meu perfil.";
    } else {
      userPrompt = `Gere uma receita usando estes ingredientes: ${ingredients}. Pode adicionar outros ingredientes básicos se necessário.`;
    }

    logStep("Calling Google Gemini API", { promptLength: userPrompt.length });

    // Call Google Gemini API - using gemini-2.5-flash-lite with lower temperature for more precision
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4, // Reduced from 0.7 for more precise category adherence
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Google Gemini error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    logStep("AI response received");

    // Extract recipe from Google Gemini response format
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Invalid AI response format");
    }

    // Parse JSON from response
    let recipe;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recipe = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), content: content.slice(0, 200) });
      throw new Error("Não foi possível processar a receita. Tente novamente.");
    }

    logStep("Recipe parsed", { 
      name: recipe.name, 
      calories: recipe.calories,
      category: categoryContext?.category,
      subcategory: categoryContext?.subcategory 
    });

    return new Response(JSON.stringify({
      success: true,
      recipe: {
        ...recipe,
        input_ingredients: ingredients || null,
        is_kids_mode: isKidsMode,
        is_weight_loss_mode: isWeightLossMode,
        is_weight_gain_mode: isWeightGainMode,
        requested_category: categoryContext?.category || null,
        requested_subcategory: categoryContext?.subcategory || null,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});