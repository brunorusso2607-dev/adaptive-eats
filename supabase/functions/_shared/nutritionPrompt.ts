/**
 * GLOBAL NUTRITIONAL PROMPT - CLINICAL LEVEL
 * 
 * This file centralizes nutritional rules for all IntoleraI AI functions.
 * Should be used in: generate-ai-meal-plan, generate-recipe, analyze-food-photo, suggest-food-ai
 */

// Nutritional data sources configuration by country
export interface NutritionalSource {
  country: string;
  sourceKey: string;
  sourceName: string;
  flag: string;
}

export const NUTRITIONAL_SOURCES: Record<string, NutritionalSource> = {
  BR: { country: "Brazil", sourceKey: "tbca", sourceName: "TBCA", flag: "🇧🇷" },
  FR: { country: "France", sourceKey: "ciqual", sourceName: "CIQUAL", flag: "🇫🇷" },
  GB: { country: "United Kingdom", sourceKey: "mccance", sourceName: "McCance & Widdowson", flag: "🇬🇧" },
  DE: { country: "Germany", sourceKey: "bls", sourceName: "BLS", flag: "🇩🇪" },
  ES: { country: "Spain", sourceKey: "aesan", sourceName: "AESAN", flag: "🇪🇸" },
  IT: { country: "Italy", sourceKey: "crea", sourceName: "CREA", flag: "🇮🇹" },
  MX: { country: "Mexico", sourceKey: "bam", sourceName: "BAM", flag: "🇲🇽" },
  US: { country: "United States", sourceKey: "usda", sourceName: "USDA", flag: "🇺🇸" },
  PT: { country: "Portugal", sourceKey: "insa", sourceName: "INSA", flag: "🇵🇹" },
  AR: { country: "Argentina", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇦🇷" },
  CL: { country: "Chile", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇨🇱" },
  CO: { country: "Colombia", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇨🇴" },
  PE: { country: "Peru", sourceKey: "tbca", sourceName: "TBCA (fallback)", flag: "🇵🇪" },
};

// Portion display format by country
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
    examples: ['100g', '1 tablespoon', '1 slice', '1 medium unit'],
    domesticUnits: 'g, ml, tablespoon, teaspoon, slice, unit, portion, ladle'
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

// Country to locale mapping
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
 * Generates the global nutritional system prompt
 * @param countryCode - User's country code (BR, US, FR, etc.)
 * @param options - Additional options for customization
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
🌍 GLOBAL NUTRITIONAL SYSTEM - CLINICAL LEVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSOLUTE UNIT RULE:
- ALL INTERNAL nutritional calculations: exclusively in GRAMS (g)
- Body weight internally: always in KILOGRAMS (kg)
- Liquids: always in MILLILITERS (ml)
- The metric system is the universal standard (95% of the world)
`;

  if (includeConversionRules && portionFormat.system === 'imperial') {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 CONVERSION FOR US USERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User is in the USA. DISPLAY portions in American format:
- 1 lb = 453.592 g
- 1 oz = 28.3495 g  
- 1 cup = 240 ml (liquids) / varies for solids

CONVERSION PROTOCOL:
1. Calculate EVERYTHING internally in grams
2. Store portion_grams with the value in grams
3. Display portion_display in local format: "${portionFormat.examples.join('", "')}"
4. NEVER calculate macros directly in oz/lb

Allowed domestic units: ${portionFormat.domesticUnits}
`;
  }

  if (includeSourceHierarchy) {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 USER'S NUTRITIONAL SOURCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Country: ${source.flag} ${source.country}
Primary Source: ${source.sourceName} (source_key: "${source.sourceKey}")

SOURCE HIERARCHY (use in this order):
1. ${source.sourceName} (${source.country}) ← PRIORITY
2. Closest regional source
3. USDA (global FINAL fallback)

❌ NEVER mix sources from different countries in the same meal.
❌ NEVER invent nutritional values - use only real data.
`;
  }

  if (includePortionGuidelines) {
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 PORTION FORMAT (${source.country})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Measurement system: ${portionFormat.system === 'imperial' ? 'IMPERIAL (oz, lb, cups)' : 'METRIC (g, ml)'}

Acceptable portion examples:
${portionFormat.examples.map(ex => `- "${ex}"`).join('\n')}

Allowed domestic units: ${portionFormat.domesticUnits}

⚠️ ALWAYS include portion_grams with the value in GRAMS for internal calculation.
`;
  }

  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧮 CALCULATION PROTOCOL (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EACH food:
Real_value = (value_per_100g / 100) × real_grams

- Use real values per 100g from official databases
- DO NOT round intermediate results
- Sum only at the end

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 ABSOLUTE BLOCKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Calculating macros in pounds/ounces
❌ Using vague measurements ("1 portion", "1 plate", "a little")
❌ Inventing nutritional values
❌ Adjusting calories to "hit" target
❌ Mixing sources from different countries
❌ Rounding for convenience

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 FINAL SAFETY RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If there is ANY doubt about unit, conversion, source, or gram weight:
➜ Use GRAMS + MOST CONSERVATIVE OFFICIAL DATABASE

DATA TRUTH ALWAYS OVERRIDES PRESENTATION.
`;

  return prompt;
}

/**
 * Generates specific instruction for JSON output format
 */
export function getJSONOutputInstruction(countryCode: string): string {
  const source = getNutritionalSource(countryCode);
  const isImperial = countryCode === 'US';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 JSON OUTPUT FORMAT (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each food MUST include:
{
  "name": "Food name",
  "portion_display": "${isImperial ? '3 oz' : '100g'}",
  ${isImperial ? '"portion_display_local": "3 oz",' : ''}
  "portion_grams": 85,
  "calories": 150,
  "protein": 25,
  "carbs": 0,
  "fat": 7,
  "nutritional_source": "${source.sourceKey}"
}

Mandatory fields:
- portion_grams: ALWAYS in grams (number)
- portion_display: natural format for the country
- nutritional_source: source key used
`;
}

