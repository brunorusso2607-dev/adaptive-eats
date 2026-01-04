// Configuração centralizada de países
// Novos países herdam automaticamente do DEFAULT_CONFIG

export interface CountryConfig {
  code: string;
  language: string;
  locale: string;
  measurementSystem: 'metric' | 'imperial';
  nutritionalSources: string[];
  searchPlaceholder: {
    text: string;
    hint: string;
  };
  portionExample: string;
  currencySymbol?: string;
}

// Configuração padrão (US) para países não cadastrados
const DEFAULT_CONFIG: Omit<CountryConfig, 'code'> = {
  language: 'en',
  locale: 'en-US',
  measurementSystem: 'metric',
  nutritionalSources: ['USDA', 'FDA'],
  searchPlaceholder: {
    text: 'Type the full food name (e.g., grilled chicken breast)',
    hint: 'Be specific: "brown rice cooked" instead of "rice"'
  },
  portionExample: '100g'
};

// Configurações específicas por país (sobrescrevem o DEFAULT)
const COUNTRY_OVERRIDES: Record<string, Partial<CountryConfig>> = {
  BR: {
    language: 'pt',
    locale: 'pt-BR',
    nutritionalSources: ['TBCA', 'USDA'],
    searchPlaceholder: {
      text: 'Digite o alimento completo (ex: arroz integral cozido)',
      hint: 'Seja específico: "peito de frango grelhado" ao invés de "frango"'
    },
    portionExample: '100g'
  },
  PT: {
    language: 'pt',
    locale: 'pt-PT',
    nutritionalSources: ['INSA', 'CIQUAL', 'USDA'],
    searchPlaceholder: {
      text: 'Escreva o alimento completo (ex: arroz integral cozido)',
      hint: 'Seja específico: "peito de frango grelhado" em vez de "frango"'
    },
    portionExample: '100g'
  },
  US: {
    language: 'en',
    locale: 'en-US',
    measurementSystem: 'imperial',
    nutritionalSources: ['USDA', 'FDA'],
    searchPlaceholder: {
      text: 'Type the full food name (e.g., grilled chicken breast)',
      hint: 'Be specific: "brown rice cooked" instead of "rice"'
    },
    portionExample: '1 cup, 3 oz'
  },
  GB: {
    language: 'en',
    locale: 'en-GB',
    nutritionalSources: ['McCance', 'USDA'],
    searchPlaceholder: {
      text: 'Type the full food name (e.g., grilled chicken breast)',
      hint: 'Be specific: "brown rice cooked" instead of "rice"'
    },
    portionExample: '100g'
  },
  ES: {
    language: 'es',
    locale: 'es-ES',
    nutritionalSources: ['BEDCA', 'USDA'],
    searchPlaceholder: {
      text: 'Escribe el alimento completo (ej: arroz integral cocido)',
      hint: 'Sé específico: "pechuga de pollo a la plancha" en lugar de "pollo"'
    },
    portionExample: '100g'
  },
  MX: {
    language: 'es',
    locale: 'es-MX',
    nutritionalSources: ['USDA', 'SMAE'],
    searchPlaceholder: {
      text: 'Escribe el alimento completo (ej: arroz integral cocido)',
      hint: 'Sé específico: "pechuga de pollo asada" en lugar de "pollo"'
    },
    portionExample: '100g'
  },
  AR: {
    language: 'es',
    locale: 'es-AR',
    nutritionalSources: ['USDA', 'ARGENFOODS'],
    searchPlaceholder: {
      text: 'Escribí el alimento completo (ej: arroz integral cocido)',
      hint: 'Sé específico: "pechuga de pollo a la plancha" en lugar de "pollo"'
    },
    portionExample: '100g'
  },
  CO: {
    language: 'es',
    locale: 'es-CO',
    nutritionalSources: ['USDA', 'ICBF'],
    searchPlaceholder: {
      text: 'Escribe el alimento completo (ej: arroz integral cocido)',
      hint: 'Sé específico: "pechuga de pollo a la plancha" en lugar de "pollo"'
    },
    portionExample: '100g'
  },
  FR: {
    language: 'fr',
    locale: 'fr-FR',
    nutritionalSources: ['CIQUAL', 'USDA'],
    searchPlaceholder: {
      text: 'Tapez le nom complet (ex: riz complet cuit)',
      hint: 'Soyez précis: "blanc de poulet grillé" au lieu de "poulet"'
    },
    portionExample: '100g'
  },
  IT: {
    language: 'it',
    locale: 'it-IT',
    nutritionalSources: ['CREA', 'USDA'],
    searchPlaceholder: {
      text: 'Scrivi il nome completo (es: riso integrale cotto)',
      hint: 'Sii specifico: "petto di pollo grigliato" invece di "pollo"'
    },
    portionExample: '100g'
  },
  DE: {
    language: 'de',
    locale: 'de-DE',
    nutritionalSources: ['BLS', 'USDA'],
    searchPlaceholder: {
      text: 'Vollständigen Namen eingeben (z.B.: gekochter Vollkornreis)',
      hint: 'Sei spezifisch: "gegrillte Hähnchenbrust" statt "Hähnchen"'
    },
    portionExample: '100g'
  },
  AU: {
    language: 'en',
    locale: 'en-AU',
    nutritionalSources: ['FSANZ', 'USDA'],
    searchPlaceholder: {
      text: 'Type the full food name (e.g., grilled chicken breast)',
      hint: 'Be specific: "brown rice cooked" instead of "rice"'
    },
    portionExample: '100g'
  },
  CA: {
    language: 'en',
    locale: 'en-CA',
    nutritionalSources: ['CNF', 'USDA'],
    searchPlaceholder: {
      text: 'Type the full food name (e.g., grilled chicken breast)',
      hint: 'Be specific: "brown rice cooked" instead of "rice"'
    },
    portionExample: '100g'
  },
  CL: {
    language: 'es',
    locale: 'es-CL',
    nutritionalSources: ['USDA', 'INTA'],
    searchPlaceholder: {
      text: 'Escribe el alimento completo (ej: arroz integral cocido)',
      hint: 'Sé específico: "pechuga de pollo a la plancha" en lugar de "pollo"'
    },
    portionExample: '100g'
  },
  PE: {
    language: 'es',
    locale: 'es-PE',
    nutritionalSources: ['USDA', 'CENAN'],
    searchPlaceholder: {
      text: 'Escribe el alimento completo (ej: arroz integral cocido)',
      hint: 'Sé específico: "pechuga de pollo a la plancha" en lugar de "pollo"'
    },
    portionExample: '100g'
  }
};

/**
 * Retorna a configuração completa de um país
 * Países não configurados herdam automaticamente do DEFAULT_CONFIG
 */
export function getCountryConfig(countryCode: string): CountryConfig {
  const code = countryCode?.toUpperCase() || 'BR';
  const overrides = COUNTRY_OVERRIDES[code] || {};
  
  return {
    code,
    ...DEFAULT_CONFIG,
    ...overrides
  };
}

/**
 * Retorna apenas o placeholder de busca para um país
 */
export function getSearchPlaceholder(countryCode: string): { text: string; hint: string } {
  return getCountryConfig(countryCode).searchPlaceholder;
}

/**
 * Retorna o idioma de um país
 */
export function getCountryLanguage(countryCode: string): string {
  return getCountryConfig(countryCode).language;
}

/**
 * Retorna o locale completo de um país
 */
export function getCountryLocale(countryCode: string): string {
  return getCountryConfig(countryCode).locale;
}

/**
 * Retorna as fontes nutricionais prioritárias de um país
 */
export function getNutritionalSourcesForCountry(countryCode: string): string[] {
  return getCountryConfig(countryCode).nutritionalSources;
}

/**
 * Retorna se o país usa sistema imperial
 */
export function usesImperialSystem(countryCode: string): boolean {
  return getCountryConfig(countryCode).measurementSystem === 'imperial';
}

/**
 * Lista todos os países configurados
 */
export function getConfiguredCountries(): string[] {
  return Object.keys(COUNTRY_OVERRIDES);
}

/**
 * Verifica se um país tem configuração específica
 */
export function hasCustomConfig(countryCode: string): boolean {
  return countryCode?.toUpperCase() in COUNTRY_OVERRIDES;
}
