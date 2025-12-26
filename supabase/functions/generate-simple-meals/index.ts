import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getCountryConfig,
  getMealExamples,
  getIngredientPriority,
  buildGoalContextInstructions,
  FORBIDDEN_INGREDIENTS,
  DIETARY_FORBIDDEN_INGREDIENTS,
  DIETARY_LABELS,
  INTOLERANCE_LABELS,
  type UserProfile,
} from "../_shared/recipeConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// CONFIGURAÇÃO DE TIPOS DE REFEIÇÃO
// ============================================
const MEAL_TYPES = [
  { 
    key: 'cafe_manha', 
    label: 'Café da manhã', 
    calorieRange: [200, 450],
    proteinRange: [8, 25],
    characteristics: 'Energia para começar o dia. Combina carboidratos, proteínas e frutas.'
  },
  { 
    key: 'almoco', 
    label: 'Almoço', 
    calorieRange: [400, 700],
    proteinRange: [25, 45],
    characteristics: 'Refeição principal. Equilibrada com proteína, carboidrato e vegetais.'
  },
  { 
    key: 'lanche', 
    label: 'Lanche da tarde', 
    calorieRange: [150, 350],
    proteinRange: [5, 15],
    characteristics: 'Leve e nutritivo. Mantém energia até o jantar.'
  },
  { 
    key: 'jantar', 
    label: 'Jantar', 
    calorieRange: [300, 550],
    proteinRange: [20, 35],
    characteristics: 'Mais leve que o almoço. Favorece digestão noturna.'
  },
  { 
    key: 'ceia', 
    label: 'Ceia', 
    calorieRange: [80, 200],
    proteinRange: [5, 15],
    characteristics: 'Muito leve. Favorece sono reparador.'
  },
];

// ============================================
// CATEGORIAS ALINHADAS COM ONBOARDING
// ============================================
const RECIPE_CATEGORIES = [
  // Preferências dietéticas
  { key: 'comum', label: 'Tradicional/Comum', description: 'Receitas balanceadas sem restrições' },
  { key: 'vegetariana', label: 'Vegetariana', description: 'Sem carnes, com ovos e laticínios' },
  { key: 'vegana', label: 'Vegana', description: '100% vegetal, sem produtos de origem animal' },
  { key: 'low_carb', label: 'Low Carb', description: 'Baixo carboidrato, prioriza proteínas' },
  { key: 'pescetariana', label: 'Pescetariana', description: 'Peixes e frutos do mar, sem carnes' },
  { key: 'cetogenica', label: 'Cetogênica/Keto', description: 'Ultra low carb, alta gordura' },
  { key: 'flexitariana', label: 'Flexitariana', description: 'Majoritariamente vegetal' },
  // Estilos de receitas
  { key: 'fitness', label: 'Fitness/Light', description: 'Baixas calorias, alto valor nutricional' },
  { key: 'proteica', label: 'Rica em Proteínas', description: 'Alto teor proteico para ganho muscular' },
  { key: 'comfort', label: 'Comfort Food', description: 'Receitas reconfortantes e saborosas' },
  { key: 'rapida', label: 'Rápida e Prática', description: 'Preparo em até 20 minutos' },
  { key: 'regional', label: 'Regional Tradicional', description: 'Receitas típicas regionais' },
  { key: 'kids', label: 'Modo Kids', description: 'Receitas para crianças' },
];

// ============================================
// FUNÇÕES DE CONSTRUÇÃO DE RESTRIÇÕES
// ============================================

function buildIntoleranceInstructions(intolerances: string[] | null): string {
  if (!intolerances || intolerances.length === 0) return "";

  const forbiddenList: string[] = [];
  const labels: string[] = [];
  
  for (const intolerance of intolerances) {
    const key = intolerance.toLowerCase();
    const forbidden = FORBIDDEN_INGREDIENTS[key];
    if (forbidden) {
      forbiddenList.push(...forbidden);
    }
    const label = INTOLERANCE_LABELS[key];
    if (label) {
      labels.push(label);
    }
  }

  if (forbiddenList.length === 0) return "";

  const uniqueForbidden = [...new Set(forbiddenList)];
  
  return `

═══════════════════════════════════════════════════════════════
⛔ RESTRIÇÕES ALIMENTARES CRÍTICAS - INTOLERÂNCIAS DO USUÁRIO
═══════════════════════════════════════════════════════════════

${labels.join('\n')}

🚫 LISTA COMPLETA DE INGREDIENTES ABSOLUTAMENTE PROIBIDOS:
${uniqueForbidden.slice(0, 80).join(', ')}

⚠️ REGRA INVIOLÁVEL: NENHUM destes ingredientes ou seus derivados pode aparecer 
em QUALQUER receita. Isso inclui:
- Ingredientes diretos
- Ingredientes como parte de molhos ou preparações
- Traços ou contaminação cruzada
- Nomes alternativos ou regionais dos mesmos ingredientes

USE SEMPRE alternativas seguras e compatíveis.`;
}

function buildDietaryInstructions(category: any): string {
  const categoryKey = typeof category === 'object' ? category.key : category;
  
  const dietaryKey = ['vegetariana', 'vegana', 'low_carb', 'pescetariana', 'cetogenica', 'flexitariana'].includes(categoryKey) 
    ? categoryKey 
    : null;

  if (!dietaryKey) return "";

  const label = DIETARY_LABELS[dietaryKey];
  const forbidden = DIETARY_FORBIDDEN_INGREDIENTS[dietaryKey] || [];

  return `

═══════════════════════════════════════════════════════════════
🥗 PREFERÊNCIA ALIMENTAR: ${label?.toUpperCase()}
═══════════════════════════════════════════════════════════════

${getDietaryGuidelines(dietaryKey)}

${forbidden.length > 0 ? `
🚫 INGREDIENTES PROIBIDOS NESTA DIETA:
${forbidden.slice(0, 50).join(', ')}
` : ''}`;
}

function getDietaryGuidelines(dietaryKey: string): string {
  const guidelines: Record<string, string> = {
    vegetariana: `
✓ PERMITIDO:
  - Ovos e todos os derivados (omelete, fritada, merengue)
  - Laticínios completos (leite, queijo, iogurte, manteiga)
  - Todas as leguminosas (feijão, lentilha, grão-de-bico)
  - Proteínas vegetais (tofu, seitan, cogumelos)

✗ PROIBIDO:
  - Qualquer tipo de carne (bovina, suína, aves)
  - Peixes e frutos do mar
  - Gelatina (derivado animal)
  - Caldos de carne ou frango`,

    vegana: `
✓ PERMITIDO:
  - Leguminosas (feijão, lentilha, grão-de-bico, ervilha)
  - Proteínas vegetais (tofu, tempeh, seitan)
  - Leites vegetais (aveia, coco, amêndoa, castanha)
  - Nuts e sementes (castanhas, linhaça, chia)

✗ ABSOLUTAMENTE PROIBIDO:
  - Qualquer carne, peixe ou fruto do mar
  - Ovos e derivados
  - Leite e TODOS os laticínios
  - Mel e derivados de abelha
  - Gelatina, corantes de origem animal`,

    low_carb: `
✓ PRIORIZAR (alto consumo):
  - Proteínas: carnes, peixes, ovos, queijos
  - Vegetais low carb: folhas, brócolis, abobrinha
  - Gorduras boas: abacate, azeite, castanhas

✓ CARBOIDRATOS POR REFEIÇÃO: máximo 30g

✗ EVITAR/ELIMINAR:
  - Açúcar e doces
  - Pães, massas, arroz branco
  - Batata e tubérculos amiláceos
  - Frutas muito doces`,

    cetogenica: `
✓ PRIORIZAR (proporções keto):
  - 70-80% gorduras: abacate, azeite, manteiga, bacon
  - 20-25% proteínas: carnes, peixes, ovos
  - 5-10% carboidratos: apenas vegetais fibrosos

✓ CARBOIDRATOS POR REFEIÇÃO: máximo 10-15g

✗ ABSOLUTAMENTE PROIBIDO:
  - Qualquer açúcar ou adoçante calórico
  - Grãos, arroz, pão, massa
  - Leguminosas (feijão, lentilha)
  - Frutas (exceto pequenas porções de berries)
  - Tubérculos (batata, mandioca)`,

    pescetariana: `
✓ PERMITIDO:
  - Todos os peixes (salmão, tilápia, atum, etc.)
  - Frutos do mar (camarão, lula, mexilhão)
  - Ovos e laticínios
  - Todas as proteínas vegetais

✗ PROIBIDO:
  - Carne bovina e suína
  - Aves (frango, peru, pato)
  - Embutidos de carne`,

    flexitariana: `
✓ PRIORIZAR:
  - Base vegetal: leguminosas, vegetais, grãos
  - Proteínas vegetais como fonte principal
  - Carnes apenas ocasionalmente (1-2x semana)

📝 DIRETRIZES:
  - 70% das receitas devem ser vegetarianas
  - Quando incluir carne, preferir cortes magros
  - Valorizar ingredientes locais e sazonais`,
  };

  return guidelines[dietaryKey] || "";
}

function buildGoalInstructions(goal: string | null): string {
  if (!goal) return "";

  const instructions: Record<string, string> = {
    emagrecer: `
═══════════════════════════════════════════════════════════════
🏃 OBJETIVO NUTRICIONAL: EMAGRECIMENTO
═══════════════════════════════════════════════════════════════

📊 ESTRATÉGIA NUTRICIONAL:
  • Déficit calórico de 300-500 kcal
  • Proteína elevada: 1.8-2.2g por kg de peso
  • Fibras abundantes para saciedade
  • Índice glicêmico baixo a moderado

🎯 PRIORIZAR NAS RECEITAS:
  • Vegetais volumosos (folhas, brócolis, abobrinha)
  • Proteínas magras (frango, peixe, ovos, leguminosas)
  • Preparações: grelhados, assados, cozidos, vapor
  • Temperos naturais (ervas, especiarias, limão)

⚠️ MINIMIZAR/EVITAR:
  • Frituras e empanados
  • Carboidratos refinados (pão branco, arroz branco)
  • Açúcares adicionados
  • Molhos cremosos e gordurosos`,

    manter: `
═══════════════════════════════════════════════════════════════
⚖️ OBJETIVO NUTRICIONAL: MANUTENÇÃO DE PESO
═══════════════════════════════════════════════════════════════

📊 ESTRATÉGIA NUTRICIONAL:
  • Calorias equilibradas conforme gasto energético
  • Macros balanceados: 50% carb, 25% prot, 25% gord
  • Variedade de grupos alimentares

🎯 PRIORIZAR NAS RECEITAS:
  • Equilíbrio entre todos os macronutrientes
  • Carboidratos complexos (arroz, batata, grãos)
  • Proteínas de qualidade
  • Gorduras saudáveis com moderação`,

    ganhar_peso: `
═══════════════════════════════════════════════════════════════
💪 OBJETIVO NUTRICIONAL: GANHO DE MASSA
═══════════════════════════════════════════════════════════════

📊 ESTRATÉGIA NUTRICIONAL:
  • Superávit calórico de 300-500 kcal
  • Proteína alta: 2.0-2.4g por kg de peso
  • Carboidratos complexos abundantes
  • Gorduras saudáveis

🎯 PRIORIZAR NAS RECEITAS:
  • Porções generosas e calóricas
  • Proteínas de alto valor biológico
  • Carboidratos densos (arroz, batata, massas)
  • Adições calóricas: azeite, castanhas, abacate

💡 DICAS PARA RECEITAS HIPERCALÓRICAS:
  • Adicionar azeite ou manteiga nas finalizações
  • Incluir nuts e sementes como toppings
  • Usar molhos nutritivos e calóricos`,
  };

  return instructions[goal] || "";
}

function buildCategoryInstructions(category: any): string {
  const categoryKey = typeof category === 'object' ? category.key : category;
  
  const categoryInstructions: Record<string, string> = {
    fitness: `
🏋️ ESTILO: FITNESS/LIGHT
• Calorias reduzidas (parte inferior da faixa)
• Alto teor proteico
• Baixa gordura
• Preparações limpas: grelhado, vapor, cru`,

    proteica: `
💪 ESTILO: RICA EM PROTEÍNAS
• Proteína como protagonista (30%+ das calorias)
• Fontes variadas: carnes magras, ovos, leguminosas
• Ideal para pós-treino e ganho muscular`,

    comfort: `
🍲 ESTILO: COMFORT FOOD
• Receitas aconchegantes e reconfortantes
• Sabores robustos e nostálgicos
• Texturas cremosas e satisfatórias
• Pratos que remetem à comida caseira`,

    rapida: `
⚡ ESTILO: RÁPIDA E PRÁTICA
• Tempo de preparo: máximo 20 minutos
• Poucos ingredientes (até 6)
• Técnicas simples
• Ideal para dia a dia corrido`,

    regional: `
🗺️ ESTILO: REGIONAL TRADICIONAL
• Autenticidade culinária local
• Ingredientes típicos da região
• Técnicas tradicionais de preparo
• Sabores genuínos e autênticos`,

    kids: `
👶 ESTILO: MODO KIDS
• Receitas atrativas para crianças
• Sabores suaves e texturas agradáveis
• Apresentação divertida
• Nutrientes essenciais para crescimento
• Evitar temperos fortes e picantes`,
  };

  return categoryInstructions[categoryKey] || "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase não configurado");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      mealType, 
      category, 
      quantity = 10, 
      countryCode = 'BR',
      languageCode = 'pt-BR',
      intolerances = [],
      dietaryPreference = null,
      goal = null,
    } = await req.json();

    // Get configurations
    const countryConfig = getCountryConfig(countryCode);
    const selectedMealType = MEAL_TYPES.find(m => m.key === mealType) || MEAL_TYPES[Math.floor(Math.random() * MEAL_TYPES.length)];
    const selectedCategory = typeof category === 'string' 
      ? RECIPE_CATEGORIES.find(c => c.key === category || c.label === category) || RECIPE_CATEGORIES[Math.floor(Math.random() * RECIPE_CATEGORIES.length)]
      : category || RECIPE_CATEGORIES[Math.floor(Math.random() * RECIPE_CATEGORIES.length)];
    const mealExamples = getMealExamples(selectedMealType.key, countryCode);
    const ingredientPriority = getIngredientPriority(countryCode);

    const categoryLabel = typeof selectedCategory === 'object' ? selectedCategory.label : selectedCategory;
    const categoryDescription = typeof selectedCategory === 'object' ? selectedCategory.description : '';

    console.log(`[generate-simple-meals] Gerando ${quantity} receitas: ${selectedMealType.label} - ${categoryLabel} para ${countryConfig.name}`);

    // Fetch existing recipes to avoid duplicates
    const { data: existingMeals } = await supabase
      .from('simple_meals')
      .select('name')
      .eq('country_code', countryCode);

    const existingNames = existingMeals?.map(m => m.name.toLowerCase()) || [];

    // Build all instruction sections
    const intoleranceInstructions = buildIntoleranceInstructions(intolerances);
    const dietaryInstructions = buildDietaryInstructions(selectedCategory);
    const goalInstructions = buildGoalInstructions(goal);
    const categoryStyleInstructions = buildCategoryInstructions(selectedCategory);

    // ============================================
    // PROMPT DE NÍVEL HARVARD/GOOGLE
    // ============================================
    const systemPrompt = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    RECEIT.AI - CHEF MASTER INTELLIGENCE                      ║
║            Sistema Avançado de Geração de Receitas Nutricionais              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Você é o CHEF MASTER AI - um sistema de inteligência artificial de ponta, treinado 
pelo melhor conhecimento culinário mundial, combinando:

🎓 FORMAÇÃO ACADÊMICA:
  • Graduação em Gastronomia pela Le Cordon Bleu Paris
  • Mestrado em Ciências da Nutrição por Harvard
  • Doutorado em Food Science pelo MIT
  • Certificação em Culinária Brasileira pelo SENAC

👨‍🍳 EXPERIÊNCIA PROFISSIONAL:
  • 20 anos como Chef Executivo em restaurantes estrelados Michelin
  • Consultor culinário para Google, Apple e Meta
  • Autor de 15 livros de receitas best-sellers
  • Especialista em adaptação de receitas para restrições alimentares

═══════════════════════════════════════════════════════════════════════════════
📍 CONTEXTO GEOGRÁFICO: ${countryConfig.name.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

🌍 ESPECIALIZAÇÃO REGIONAL:
  • Idioma nativo: ${countryConfig.language}
  • ${ingredientPriority}
  • Conhecimento profundo da cultura gastronômica local
  • Domínio de técnicas culinárias tradicionais e contemporâneas

🍽️ EXEMPLOS AUTÊNTICOS DE ${selectedMealType.label.toUpperCase()}:
  ${mealExamples.join(', ')}

═══════════════════════════════════════════════════════════════════════════════
🎯 MISSÃO: GERAR RECEITAS PARA "${selectedMealType.label.toUpperCase()}"
═══════════════════════════════════════════════════════════════════════════════

📋 CARACTERÍSTICAS DESTA REFEIÇÃO:
  • ${selectedMealType.characteristics}
  • Faixa calórica ideal: ${selectedMealType.calorieRange[0]}-${selectedMealType.calorieRange[1]} kcal
  • Proteína recomendada: ${selectedMealType.proteinRange[0]}-${selectedMealType.proteinRange[1]}g

📂 CATEGORIA SELECIONADA: ${categoryLabel}
  ${categoryDescription}

${categoryStyleInstructions}

${goalInstructions}

${dietaryInstructions}

${intoleranceInstructions}

═══════════════════════════════════════════════════════════════════════════════
📊 PADRÕES DE QUALIDADE NUTRICIONAL
═══════════════════════════════════════════════════════════════════════════════

✓ VALORES NUTRICIONAIS DEVEM SER:
  • Baseados em porções reais e mensuráveis
  • Calculados com precisão científica
  • Coerentes com os ingredientes listados
  • Dentro das faixas calóricas especificadas

✓ INGREDIENTES DEVEM SER:
  • Acessíveis em supermercados de ${countryConfig.name}
  • Listados com quantidades precisas (gramas, ml, unidades)
  • Organizados na ordem de uso
  • Entre 3 e 8 ingredientes por receita

✓ CADA RECEITA DEVE TER:
  • Nome criativo, apetitoso e autêntico
  • Descrição que desperte o apetite (1 frase)
  • Tempo de preparo realista
  • Valores nutricionais precisos

═══════════════════════════════════════════════════════════════════════════════
⚙️ FORMATO DE SAÍDA
═══════════════════════════════════════════════════════════════════════════════

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO.
NÃO inclua markdown, comentários ou texto adicional.
NÃO use \`\`\`json ou qualquer formatação.
APENAS o JSON puro e válido.

Idioma do conteúdo: ${countryConfig.language === 'pt-BR' ? 'Português Brasileiro' : countryConfig.language}
`;

    const userPrompt = `
═══════════════════════════════════════════════════════════════════════════════
📝 TAREFA: GERAR ${quantity} RECEITAS ÚNICAS
═══════════════════════════════════════════════════════════════════════════════

PARÂMETROS:
  • Tipo de refeição: ${selectedMealType.label}
  • Categoria: ${categoryLabel}
  • Calorias por porção: ${selectedMealType.calorieRange[0]}-${selectedMealType.calorieRange[1]} kcal
  • País: ${countryConfig.name}

${existingNames.length > 0 ? `
⚠️ RECEITAS JÁ EXISTENTES (NÃO REPETIR):
${existingNames.slice(0, 40).join(', ')}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
📋 ESTRUTURA JSON OBRIGATÓRIA
═══════════════════════════════════════════════════════════════════════════════

{
  "recipes": [
    {
      "name": "Nome Criativo da Receita",
      "description": "Descrição curta e apetitosa que desperta o desejo de comer",
      "calories": 350,
      "protein": 25,
      "carbs": 30,
      "fat": 12,
      "prep_time": 20,
      "ingredients": [
        {"name": "ingrediente principal", "quantity": "200g"},
        {"name": "segundo ingrediente", "quantity": "100g"},
        {"name": "tempero", "quantity": "a gosto"}
      ],
      "compatible_meal_times": ["${selectedMealType.key}"]
    }
  ]
}

═══════════════════════════════════════════════════════════════════════════════
✅ CHECKLIST DE QUALIDADE (VERIFICAR ANTES DE RESPONDER)
═══════════════════════════════════════════════════════════════════════════════

□ Todas as ${quantity} receitas são ÚNICAS e DIFERENTES entre si?
□ Nenhuma receita repete conceito ou ingrediente principal de outra?
□ Os valores nutricionais estão dentro da faixa especificada?
□ Os ingredientes são acessíveis em ${countryConfig.name}?
□ O tempo de preparo é realista para a complexidade?
□ As descrições são apetitosas e envolventes?
□ NENHUM ingrediente proibido foi incluído?
□ O JSON está formatado corretamente sem erros de sintaxe?

GERE AS ${quantity} RECEITAS AGORA:`;

    console.log(`[generate-simple-meals] Chamando API com country: ${countryCode}, category: ${categoryLabel}`);

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-simple-meals] Erro na API:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Clean markdown if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("[generate-simple-meals] Resposta recebida, parseando JSON...");

    let recipes;
    try {
      const parsed = JSON.parse(content);
      recipes = parsed.recipes || parsed;
    } catch (parseError) {
      console.error("[generate-simple-meals] Erro ao parsear JSON:", parseError);
      console.error("[generate-simple-meals] Conteúdo:", content.substring(0, 500));
      throw new Error("Formato de resposta inválido da IA");
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error("Nenhuma receita gerada");
    }

    // Prepare data for insertion
    const categoryKey = typeof selectedCategory === 'object' ? selectedCategory.key : selectedCategory;
    const mealsToInsert = recipes
      .filter(r => r.name && !existingNames.includes(r.name.toLowerCase()))
      .map((recipe, index) => ({
        name: recipe.name,
        description: recipe.description || null,
        calories: Math.round(recipe.calories) || 300,
        protein: Math.round(recipe.protein) || 15,
        carbs: Math.round(recipe.carbs) || 30,
        fat: Math.round(recipe.fat) || 10,
        prep_time: recipe.prep_time || 15,
        ingredients: recipe.ingredients || [],
        meal_type: selectedMealType.key,
        compatible_meal_times: recipe.compatible_meal_times || [selectedMealType.key],
        country_code: countryCode,
        language_code: languageCode,
        is_active: true,
        ai_generated: true,
        component_type: categoryKey,
        sort_order: index,
      }));

    if (mealsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Todas as receitas geradas já existem no banco",
        inserted: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('simple_meals')
      .insert(mealsToInsert)
      .select('id, name');

    if (insertError) {
      console.error("[generate-simple-meals] Erro ao inserir:", insertError);
      throw new Error(`Erro ao salvar receitas: ${insertError.message}`);
    }

    console.log(`[generate-simple-meals] ✅ Inseridas ${insertedData?.length || 0} receitas com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedData?.length || 0,
      mealType: selectedMealType.label,
      category: categoryLabel,
      country: countryConfig.name,
      recipes: insertedData?.map(r => r.name) || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-simple-meals] Erro geral:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
