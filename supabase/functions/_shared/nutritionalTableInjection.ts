/**
 * NUTRITIONAL TABLE INJECTION
 * 
 * Este módulo carrega os principais alimentos do banco de dados e os injeta
 * no prompt da IA para que ela possa calcular macros diretamente, sem
 * necessidade de pós-processamento.
 * 
 * Benefícios:
 * - Velocidade: elimina queries pós-geração
 * - Precisão: dados 100% do banco de dados
 * - Custo: ~$0.0004 extra por geração (insignificante)
 */

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NUTRITION-TABLE] ${step}${detailsStr}`);
};

// Mapeamento de país para fontes prioritárias
const COUNTRY_SOURCE_PRIORITY: Record<string, string[]> = {
  'BR': ['TBCA', 'taco', 'curated'],
  'US': ['usda', 'curated'],
  'FR': ['CIQUAL', 'curated'],
  'UK': ['McCance', 'curated'],
  'MX': ['BAM', 'curated'],
  'ES': ['AESAN Spain', 'curated'],
  'DE': ['BLS Germany', 'curated'],
  'IT': ['CREA', 'curated'],
};

export interface NutritionalFood {
  name: string;
  cal: number;
  prot: number;
  carb: number;
  fat: number;
}

/**
 * Carrega os principais alimentos do banco de dados para um país específico.
 * Retorna ~400 alimentos organizados por categoria.
 */
export async function loadNutritionalTable(
  supabase: any,
  countryCode: string = 'BR'
): Promise<NutritionalFood[]> {
  const prioritySources = COUNTRY_SOURCE_PRIORITY[countryCode] || COUNTRY_SOURCE_PRIORITY['BR'];
  const allFoods: NutritionalFood[] = [];

  // Categorias e limites para garantir diversidade
  const queries = [
    // Proteínas (carnes, peixes, ovos) - 80 itens
    {
      filter: `(category.ilike.%carne%,category.ilike.%pesc%,category.ilike.%ovo%,category.ilike.%fruto%mar%)`,
      limit: 80,
    },
    // Carboidratos e grãos - 60 itens
    {
      filter: `(category.ilike.%cereal%,category.ilike.%legum%,name.ilike.%arroz%,name.ilike.%feijao%,name.ilike.%pao%,name.ilike.%massa%)`,
      limit: 60,
    },
    // Frutas - 60 itens
    {
      filter: `(category.ilike.%fruta%)`,
      limit: 60,
    },
    // Vegetais e legumes - 60 itens
    {
      filter: `(category.ilike.%vegeta%,category.ilike.%legume%)`,
      limit: 60,
    },
    // Laticínios e bebidas - 60 itens
    {
      filter: `(category.ilike.%latic%,category.ilike.%leite%,category.ilike.%bebida%,name.ilike.%iogurte%,name.ilike.%queijo%)`,
      limit: 60,
    },
    // Oleaginosas e gorduras - 30 itens
    {
      filter: `(category.ilike.%gordura%,category.ilike.%oleo%,name.ilike.%castanha%,name.ilike.%amendoim%,name.ilike.%nozes%)`,
      limit: 30,
    },
  ];

  // Buscar alimentos prioritários do país
  const { data: priorityFoods } = await supabase
    .from('foods')
    .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .eq('is_recipe', false)
    .eq('is_verified', true)
    .in('source', prioritySources)
    .order('search_count', { ascending: false, nullsFirst: false })
    .limit(300);

  if (priorityFoods) {
    for (const food of priorityFoods) {
      // Limpar nome para formato compacto
      const cleanName = cleanFoodName(food.name);
      if (cleanName.length <= 35) { // Evitar nomes muito longos
        allFoods.push({
          name: cleanName,
          cal: Math.round(food.calories_per_100g),
          prot: Math.round(food.protein_per_100g * 10) / 10,
          carb: Math.round(food.carbs_per_100g * 10) / 10,
          fat: Math.round(food.fat_per_100g * 10) / 10,
        });
      }
    }
  }

  // Complementar com alimentos globais se necessário
  if (allFoods.length < 300) {
    const { data: globalFoods } = await supabase
      .from('foods')
      .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
      .eq('is_recipe', false)
      .eq('is_verified', true)
      .not('source', 'in', `(${prioritySources.join(',')})`)
      .order('search_count', { ascending: false, nullsFirst: false })
      .limit(150);

    if (globalFoods) {
      for (const food of globalFoods) {
        const cleanName = cleanFoodName(food.name);
        if (cleanName.length <= 35 && !allFoods.find(f => f.name === cleanName)) {
          allFoods.push({
            name: cleanName,
            cal: Math.round(food.calories_per_100g),
            prot: Math.round(food.protein_per_100g * 10) / 10,
            carb: Math.round(food.carbs_per_100g * 10) / 10,
            fat: Math.round(food.fat_per_100g * 10) / 10,
          });
        }
      }
    }
  }

  // Remover duplicatas por nome
  const uniqueFoods = Array.from(new Map(allFoods.map(f => [f.name.toLowerCase(), f])).values());
  
  logStep('Nutritional table loaded', { 
    country: countryCode, 
    totalFoods: uniqueFoods.length,
    sources: prioritySources 
  });

  return uniqueFoods.slice(0, 400); // Limitar a 400 para controle de tokens
}

/**
 * Limpa o nome do alimento para formato compacto
 */
function cleanFoodName(name: string): string {
  return name
    // Remover informações técnicas
    .replace(/,\s*(cru|cozido|assado|frito|grelhado).*$/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/,\s*[A-Z][a-z]+\s+[a-z]+\s*$/g, '') // Remover nomes científicos
    // Simplificar
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formata a tabela nutricional para injeção no prompt.
 * Formato ultra-compacto: nome:cal/prot/carb/fat (valores por 100g)
 */
export function formatNutritionalTableForPrompt(foods: NutritionalFood[]): string {
  // Agrupar por primeira letra para organização
  const lines: string[] = [];
  
  // Formato compacto: nome:cal/prot/carb/fat
  for (const food of foods) {
    lines.push(`${food.name}:${food.cal}/${food.prot}/${food.carb}/${food.fat}`);
  }

  return `
==========================================================
📊 TABELA NUTRICIONAL DE REFERÊNCIA (POR 100g)
==========================================================
Formato: ALIMENTO:CALORIAS/PROTEÍNA/CARBOIDRATO/GORDURA

${lines.join('\n')}

⚠️ REGRA DE USO DA TABELA (CRÍTICO):
1. Use EXATAMENTE os valores desta tabela para calcular macros
2. Para calcular: (valor_por_100g × gramas_usadas) / 100
3. Exemplo: "Frango (Peito)" 120g = (119×120)/100 = 143 kcal
4. Se o alimento não estiver na tabela, use seu conhecimento nutricional
5. O campo "calories_kcal" DEVE refletir a soma calculada dos alimentos

🔢 REGRA DE PRECISÃO NUTRICIONAL (OBRIGATÓRIO):
- Cada item em "foods" representa uma porção específica em gramas
- Calcule as calorias de cada item: (cal_por_100g × grams) / 100
- O "calories_kcal" total da refeição = soma das calorias de todos os itens
- NUNCA invente valores - use a tabela ou seu conhecimento verificado

Exemplo de cálculo para uma refeição:
- Frango (Peito) 150g: (119 × 150) / 100 = 178 kcal
- Arroz branco cozido 120g: (128 × 120) / 100 = 154 kcal
- Brócolis 80g: (34 × 80) / 100 = 27 kcal
- TOTAL: 178 + 154 + 27 = 359 kcal (usar este valor em calories_kcal)
==========================================================
`;
}

/**
 * Função principal: carrega tabela e gera texto para injeção no prompt
 */
export async function getNutritionalTablePrompt(
  supabase: any,
  countryCode: string = 'BR'
): Promise<string> {
  const foods = await loadNutritionalTable(supabase, countryCode);
  return formatNutritionalTableForPrompt(foods);
}
