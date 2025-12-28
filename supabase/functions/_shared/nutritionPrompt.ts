/**
 * PROMPT NUTRICIONAL GLOBAL - NÍVEL CLÍNICO
 * 
 * Este arquivo centraliza as regras nutricionais para todas as funções de IA do ReceitAI.
 * Deve ser usado em: generate-ai-meal-plan, generate-recipe, analyze-food-photo, suggest-food-ai
 */

// Configuração de fontes nutricionais por país
export interface NutritionalSource {
  country: string;
  sourceKey: string;
  sourceName: string;
  flag: string;
}

export const NUTRITIONAL_SOURCES: Record<string, NutritionalSource> = {
  BR: { country: "Brasil", sourceKey: "tbca", sourceName: "TBCA", flag: "🇧🇷" },
  FR: { country: "França", sourceKey: "ciqual", sourceName: "CIQUAL", flag: "🇫🇷" },
  GB: { country: "Reino Unido", sourceKey: "mccance", sourceName: "McCance & Widdowson", flag: "🇬🇧" },
  DE: { country: "Alemanha", sourceKey: "bls", sourceName: "BLS", flag: "🇩🇪" },
  ES: { country: "Espanha", sourceKey: "aesan", sourceName: "AESAN", flag: "🇪🇸" },
  IT: { country: "Itália", sourceKey: "crea", sourceName: "CREA", flag: "🇮🇹" },
  MX: { country: "México", sourceKey: "bam", sourceName: "BAM", flag: "🇲🇽" },
  US: { country: "Estados Unidos", sourceKey: "usda", sourceName: "USDA", flag: "🇺🇸" },
  PT: { country: "Portugal", sourceKey: "insa", sourceName: "INSA", flag: "🇵🇹" },
  AR: { country: "Argentina", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇦🇷" },
  CL: { country: "Chile", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇨🇱" },
  CO: { country: "Colômbia", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇨🇴" },
  PE: { country: "Peru", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇵🇪" },
};

// Formato de exibição de porções por país
export interface PortionFormat {
  system: 'metric' | 'imperial';
  examples: string[];
  domesticUnits: string;
}

export const PORTION_FORMATS: Record<string, PortionFormat> = {
  US: {
    system: 'imperial',
    examples: ['1 cup', '3 oz', '1 medium apple', '2 slices', '1 tablespoon'],
    domesticUnits: 'cup, oz, lb, tablespoon, teaspoon, slice, piece, medium, small, large'
  },
  GB: {
    system: 'metric',
    examples: ['100g', '150ml', '2 slices', '1 medium portion'],
    domesticUnits: 'g, ml, slice, piece, tablespoon, teaspoon, portion'
  },
  BR: {
    system: 'metric',
    examples: ['100g', '1 colher de sopa', '1 fatia', '1 unidade média'],
    domesticUnits: 'g, ml, colher de sopa, colher de chá, fatia, unidade, porção, concha'
  },
  DEFAULT: {
    system: 'metric',
    examples: ['100g', '150ml', '1 portion'],
    domesticUnits: 'g, ml, piece, slice, portion, tablespoon'
  }
};

export function getPortionFormat(countryCode: string): PortionFormat {
  return PORTION_FORMATS[countryCode] || PORTION_FORMATS.DEFAULT;
}

export function getNutritionalSource(countryCode: string): NutritionalSource {
  return NUTRITIONAL_SOURCES[countryCode] || NUTRITIONAL_SOURCES.US;
}

// Mapeamento de país para locale
const COUNTRY_TO_LOCALE: Record<string, string> = {
  BR: 'pt-BR',
  PT: 'pt-PT',
  US: 'en-US',
  GB: 'en-GB',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  IT: 'it-IT',
  MX: 'es-MX',
  AR: 'es-AR',
  CL: 'es-CL',
  CO: 'es-CO',
  PE: 'es-PE',
  JP: 'ja-JP',
  KR: 'ko-KR',
  CN: 'zh-CN',
};

export function getLocaleFromCountry(countryCode: string): string {
  return COUNTRY_TO_LOCALE[countryCode] || 'en-US';
}

/**
 * Gera o prompt de sistema nutricional global
 * @param countryCode - Código do país do usuário (BR, US, FR, etc.)
 * @param options - Opções adicionais para customização
 */
export function getGlobalNutritionPrompt(countryCode: string, options?: {
  includePortionGuidelines?: boolean;
  includeSourceHierarchy?: boolean;
  includeConversionRules?: boolean;
}): string {
  const source = getNutritionalSource(countryCode);
  const portionFormat = getPortionFormat(countryCode);
  const {
    includePortionGuidelines = true,
    includeSourceHierarchy = true,
    includeConversionRules = true
  } = options || {};

  let prompt = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 SISTEMA NUTRICIONAL GLOBAL - NÍVEL CLÍNICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRA ABSOLUTA DE UNIDADES:
- TODO cálculo nutricional INTERNO: exclusivamente em GRAMAS (g)
- Peso corporal interno: sempre em QUILOGRAMAS (kg)
- Líquidos: sempre em MILILITROS (ml)
- O sistema métrico é o padrão universal (95% do mundo)
`;

  if (includeConversionRules && portionFormat.system === 'imperial') {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 CONVERSÃO PARA USUÁRIOS DOS EUA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O usuário está nos EUA. EXIBA porções no formato americano:
- 1 lb = 453.592 g
- 1 oz = 28.3495 g  
- 1 cup = 240 ml (líquidos) / varia para sólidos

PROTOCOLO DE CONVERSÃO:
1. Calcule TUDO internamente em gramas
2. Armazene portion_grams com o valor em gramas
3. Exiba portion_display no formato local: "${portionFormat.examples.join('", "')}"
4. NUNCA calcule macros diretamente em oz/lb

Unidades domésticas permitidas: ${portionFormat.domesticUnits}
`;
  }

  if (includeSourceHierarchy) {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FONTE NUTRICIONAL DO USUÁRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

País: ${source.flag} ${source.country}
Fonte Primária: ${source.sourceName} (source_key: "${source.sourceKey}")

HIERARQUIA DE FONTES (use nesta ordem):
1. ${source.sourceName} (${source.country}) ← PRIORIDADE
2. Fonte regional mais próxima
3. USDA (fallback global FINAL)

❌ NUNCA misture fontes de países diferentes na mesma refeição.
❌ NUNCA invente valores nutricionais - use apenas dados reais.
`;
  }

  if (includePortionGuidelines) {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 FORMATO DE PORÇÃO (${source.country})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sistema de medidas: ${portionFormat.system === 'imperial' ? 'IMPERIAL (oz, lb, cups)' : 'MÉTRICO (g, ml)'}

Exemplos de porções aceitáveis:
${portionFormat.examples.map(ex => `- "${ex}"`).join('\n')}

Unidades domésticas permitidas: ${portionFormat.domesticUnits}

⚠️ SEMPRE inclua portion_grams com o valor em GRAMAS para cálculo interno.
`;
  }

  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧮 PROTOCOLO DE CÁLCULO (OBRIGATÓRIO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para CADA alimento:
Valor_real = (valor_por_100g / 100) × gramagem_real_em_g

- Use valores reais por 100g das bases oficiais
- NÃO arredonde resultados intermediários
- Some apenas no final

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 BLOQUEIOS ABSOLUTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Calcular macros em libras/onças
❌ Usar medidas vagas ("1 porção", "1 prato", "um pouco")
❌ Inventar valores nutricionais
❌ Ajustar calorias para "bater" meta
❌ Misturar fontes de países diferentes
❌ Arredondar para facilitar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REGRA FINAL DE SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se houver QUALQUER dúvida sobre unidade, conversão, fonte ou gramagem:
➜ Use GRAMAS + BASE OFICIAL MAIS CONSERVADORA

A VERDADE DOS DADOS SEMPRE SOBREPÕE A APRESENTAÇÃO.
`;

  return prompt;
}

/**
 * Gera instrução específica para formato de saída JSON
 */
export function getJSONOutputInstruction(countryCode: string): string {
  const source = getNutritionalSource(countryCode);
  const isImperial = countryCode === 'US';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 FORMATO DE SAÍDA JSON (OBRIGATÓRIO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada alimento DEVE incluir:
{
  "name": "Nome do alimento",
  "portion_display": "${isImperial ? '3 oz' : '100g'}",
  ${isImperial ? '"portion_display_local": "3 oz",' : ''}
  "portion_grams": 85,
  "calories": 150,
  "protein": 25,
  "carbs": 0,
  "fat": 7,
  "nutritional_source": "${source.sourceKey}"
}

Campos obrigatórios:
- portion_grams: SEMPRE em gramas (número)
- portion_display: formato natural do país
- nutritional_source: chave da fonte usada
`;
}
