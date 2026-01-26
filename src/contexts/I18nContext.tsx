import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════

export type Locale = 
  | 'pt-BR' 
  | 'pt-PT' 
  | 'en-US' 
  | 'en-GB' 
  | 'es-ES' 
  | 'es-MX' 
  | 'es-AR' 
  | 'es-CL' 
  | 'es-PE' 
  | 'fr-FR' 
  | 'de-DE' 
  | 'it-IT';

export type CountryCode = 
  | 'BR' 
  | 'PT' 
  | 'US' 
  | 'GB' 
  | 'ES' 
  | 'MX' 
  | 'AR' 
  | 'CL' 
  | 'PE' 
  | 'FR' 
  | 'DE' 
  | 'IT';

interface I18nContextType {
  locale: Locale;
  countryCode: CountryCode;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  getIngredientName: (ingredientId: string) => string;
  isLoading: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// MAPEAMENTOS
// ═══════════════════════════════════════════════════════════════════════

const LOCALE_TO_COUNTRY: Record<Locale, CountryCode> = {
  'pt-BR': 'BR',
  'pt-PT': 'PT',
  'en-US': 'US',
  'en-GB': 'GB',
  'es-ES': 'ES',
  'es-MX': 'MX',
  'es-AR': 'AR',
  'es-CL': 'CL',
  'es-PE': 'PE',
  'fr-FR': 'FR',
  'de-DE': 'DE',
  'it-IT': 'IT',
};

const COUNTRY_TO_LOCALE: Record<CountryCode, Locale> = {
  BR: 'pt-BR',
  PT: 'pt-PT',
  US: 'en-US',
  GB: 'en-GB',
  ES: 'es-ES',
  MX: 'es-MX',
  AR: 'es-AR',
  CL: 'es-CL',
  PE: 'es-PE',
  FR: 'fr-FR',
  DE: 'de-DE',
  IT: 'it-IT',
};

// ═══════════════════════════════════════════════════════════════════════
// TRADUÇÕES DE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    'meal.breakfast': 'Café da Manhã',
    'meal.morning_snack': 'Lanche da Manhã',
    'meal.lunch': 'Almoço',
    'meal.afternoon_snack': 'Lanche da Tarde',
    'meal.dinner': 'Jantar',
    'meal.evening_snack': 'Ceia',
    'density.light': 'Leve',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactose',
    'allergen.gluten': 'Glúten',
    'allergen.egg': 'Ovo',
    'allergen.soy': 'Soja',
    'allergen.fish': 'Peixe',
    'allergen.shellfish': 'Frutos do Mar',
    'language.select': 'Selecionar Idioma',
    'language.current': 'Idioma Atual',
  },
  'pt-PT': {
    'meal.breakfast': 'Pequeno-almoço',
    'meal.morning_snack': 'Lanche da Manhã',
    'meal.lunch': 'Almoço',
    'meal.afternoon_snack': 'Lanche da Tarde',
    'meal.dinner': 'Jantar',
    'meal.evening_snack': 'Ceia',
    'density.light': 'Leve',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactose',
    'allergen.gluten': 'Glúten',
    'allergen.egg': 'Ovo',
    'allergen.soy': 'Soja',
    'allergen.fish': 'Peixe',
    'allergen.shellfish': 'Frutos do Mar',
    'language.select': 'Selecionar Idioma',
    'language.current': 'Idioma Actual',
  },
  'en-US': {
    'meal.breakfast': 'Breakfast',
    'meal.morning_snack': 'Morning Snack',
    'meal.lunch': 'Lunch',
    'meal.afternoon_snack': 'Afternoon Snack',
    'meal.dinner': 'Dinner',
    'meal.evening_snack': 'Evening Snack',
    'density.light': 'Light',
    'density.moderate': 'Moderate',
    'density.heavy': 'Heavy',
    'allergen.lactose': 'Lactose',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Egg',
    'allergen.soy': 'Soy',
    'allergen.fish': 'Fish',
    'allergen.shellfish': 'Shellfish',
    'language.select': 'Select Language',
    'language.current': 'Current Language',
  },
  'en-GB': {
    'meal.breakfast': 'Breakfast',
    'meal.morning_snack': 'Morning Snack',
    'meal.lunch': 'Lunch',
    'meal.afternoon_snack': 'Afternoon Snack',
    'meal.dinner': 'Dinner',
    'meal.evening_snack': 'Evening Snack',
    'density.light': 'Light',
    'density.moderate': 'Moderate',
    'density.heavy': 'Heavy',
    'allergen.lactose': 'Lactose',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Egg',
    'allergen.soy': 'Soy',
    'allergen.fish': 'Fish',
    'allergen.shellfish': 'Shellfish',
    'language.select': 'Select Language',
    'language.current': 'Current Language',
  },
  'es-ES': {
    'meal.breakfast': 'Desayuno',
    'meal.morning_snack': 'Merienda de la Mañana',
    'meal.lunch': 'Almuerzo',
    'meal.afternoon_snack': 'Merienda de la Tarde',
    'meal.dinner': 'Cena',
    'meal.evening_snack': 'Cena Ligera',
    'density.light': 'Ligera',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactosa',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Huevo',
    'allergen.soy': 'Soja',
    'allergen.fish': 'Pescado',
    'allergen.shellfish': 'Mariscos',
    'language.select': 'Seleccionar Idioma',
    'language.current': 'Idioma Actual',
  },
  'es-MX': {
    'meal.breakfast': 'Desayuno',
    'meal.morning_snack': 'Colación Matutina',
    'meal.lunch': 'Comida',
    'meal.afternoon_snack': 'Colación Vespertina',
    'meal.dinner': 'Cena',
    'meal.evening_snack': 'Cena Ligera',
    'density.light': 'Ligera',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactosa',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Huevo',
    'allergen.soy': 'Soya',
    'allergen.fish': 'Pescado',
    'allergen.shellfish': 'Mariscos',
    'language.select': 'Seleccionar Idioma',
    'language.current': 'Idioma Actual',
  },
  'es-AR': {
    'meal.breakfast': 'Desayuno',
    'meal.morning_snack': 'Merienda',
    'meal.lunch': 'Almuerzo',
    'meal.afternoon_snack': 'Merienda',
    'meal.dinner': 'Cena',
    'meal.evening_snack': 'Cena Ligera',
    'density.light': 'Liviana',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactosa',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Huevo',
    'allergen.soy': 'Soja',
    'allergen.fish': 'Pescado',
    'allergen.shellfish': 'Mariscos',
    'language.select': 'Seleccionar Idioma',
    'language.current': 'Idioma Actual',
  },
  'es-CL': {
    'meal.breakfast': 'Desayuno',
    'meal.morning_snack': 'Colación',
    'meal.lunch': 'Almuerzo',
    'meal.afternoon_snack': 'Once',
    'meal.dinner': 'Cena',
    'meal.evening_snack': 'Cena Ligera',
    'density.light': 'Liviana',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactosa',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Huevo',
    'allergen.soy': 'Soya',
    'allergen.fish': 'Pescado',
    'allergen.shellfish': 'Mariscos',
    'language.select': 'Seleccionar Idioma',
    'language.current': 'Idioma Actual',
  },
  'es-PE': {
    'meal.breakfast': 'Desayuno',
    'meal.morning_snack': 'Refrigerio',
    'meal.lunch': 'Almuerzo',
    'meal.afternoon_snack': 'Lonche',
    'meal.dinner': 'Cena',
    'meal.evening_snack': 'Cena Ligera',
    'density.light': 'Ligera',
    'density.moderate': 'Moderada',
    'density.heavy': 'Pesada',
    'allergen.lactose': 'Lactosa',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Huevo',
    'allergen.soy': 'Soya',
    'allergen.fish': 'Pescado',
    'allergen.shellfish': 'Mariscos',
    'language.select': 'Seleccionar Idioma',
    'language.current': 'Idioma Actual',
  },
  'fr-FR': {
    'meal.breakfast': 'Petit-déjeuner',
    'meal.morning_snack': 'Collation du Matin',
    'meal.lunch': 'Déjeuner',
    'meal.afternoon_snack': 'Goûter',
    'meal.dinner': 'Dîner',
    'meal.evening_snack': 'Collation du Soir',
    'density.light': 'Légère',
    'density.moderate': 'Modérée',
    'density.heavy': 'Lourde',
    'allergen.lactose': 'Lactose',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Œuf',
    'allergen.soy': 'Soja',
    'allergen.fish': 'Poisson',
    'allergen.shellfish': 'Fruits de Mer',
    'language.select': 'Sélectionner la Langue',
    'language.current': 'Langue Actuelle',
  },
  'de-DE': {
    'meal.breakfast': 'Frühstück',
    'meal.morning_snack': 'Vormittagssnack',
    'meal.lunch': 'Mittagessen',
    'meal.afternoon_snack': 'Nachmittagssnack',
    'meal.dinner': 'Abendessen',
    'meal.evening_snack': 'Abendsnack',
    'density.light': 'Leicht',
    'density.moderate': 'Mäßig',
    'density.heavy': 'Schwer',
    'allergen.lactose': 'Laktose',
    'allergen.gluten': 'Gluten',
    'allergen.egg': 'Ei',
    'allergen.soy': 'Soja',
    'allergen.fish': 'Fisch',
    'allergen.shellfish': 'Meeresfrüchte',
    'language.select': 'Sprache Auswählen',
    'language.current': 'Aktuelle Sprache',
  },
  'it-IT': {
    'meal.breakfast': 'Colazione',
    'meal.morning_snack': 'Spuntino Mattutino',
    'meal.lunch': 'Pranzo',
    'meal.afternoon_snack': 'Merenda',
    'meal.dinner': 'Cena',
    'meal.evening_snack': 'Spuntino Serale',
    'density.light': 'Leggera',
    'density.moderate': 'Moderata',
    'density.heavy': 'Pesante',
    'allergen.lactose': 'Lattosio',
    'allergen.gluten': 'Glutine',
    'allergen.egg': 'Uovo',
    'allergen.soy': 'Soia',
    'allergen.fish': 'Pesce',
    'allergen.shellfish': 'Frutti di Mare',
    'language.select': 'Seleziona Lingua',
    'language.current': 'Lingua Attuale',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CONTEXTO
// ═══════════════════════════════════════════════════════════════════════

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>('pt-BR');
  const [isLoading, setIsLoading] = useState(true);

  // Detectar idioma do navegador ao carregar
  useEffect(() => {
    const detectLocale = () => {
      // 1. Tentar carregar do localStorage
      const savedLocale = localStorage.getItem('adaptive-eats-locale');
      if (savedLocale && isValidLocale(savedLocale)) {
        return savedLocale as Locale;
      }

      // 2. Detectar do navegador
      const browserLang = navigator.language;
      
      // Tentar match exato
      if (isValidLocale(browserLang)) {
        return browserLang as Locale;
      }

      // Tentar match por idioma base (ex: pt → pt-BR)
      const baseLang = browserLang.split('-')[0];
      const matchingLocale = Object.keys(TRANSLATIONS).find(key => 
        key.startsWith(baseLang)
      );
      
      if (matchingLocale) {
        return matchingLocale as Locale;
      }

      // Fallback para português brasileiro
      return 'pt-BR';
    };

    const detectedLocale = detectLocale();
    setLocaleState(detectedLocale);
    setIsLoading(false);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('adaptive-eats-locale', newLocale);
  };

  const t = (key: string): string => {
    const translations = TRANSLATIONS[locale];
    return translations[key] || key;
  };

  const getIngredientName = (ingredientId: string): string => {
    // TODO: Integrar com backend para buscar nomes traduzidos
    // Por enquanto, retorna o ID
    return ingredientId;
  };

  const countryCode = LOCALE_TO_COUNTRY[locale];

  const value: I18nContextType = {
    locale,
    countryCode,
    setLocale,
    t,
    getIngredientName,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function isValidLocale(locale: string): boolean {
  return Object.keys(TRANSLATIONS).includes(locale);
}

export function getCountryFlag(countryCode: CountryCode): string {
  const flags: Record<CountryCode, string> = {
    BR: '🇧🇷',
    PT: '🇵🇹',
    US: '🇺🇸',
    GB: '🇬🇧',
    ES: '🇪🇸',
    MX: '🇲🇽',
    AR: '🇦🇷',
    CL: '🇨🇱',
    PE: '🇵🇪',
    FR: '🇫🇷',
    DE: '🇩🇪',
    IT: '🇮🇹',
  };
  return flags[countryCode] || '🌐';
}

export function getCountryName(countryCode: CountryCode, locale: Locale): string {
  const names: Record<CountryCode, Record<string, string>> = {
    BR: { 'pt-BR': 'Brasil', 'en-US': 'Brazil', 'es-ES': 'Brasil', 'fr-FR': 'Brésil', 'de-DE': 'Brasilien', 'it-IT': 'Brasile' },
    PT: { 'pt-BR': 'Portugal', 'en-US': 'Portugal', 'es-ES': 'Portugal', 'fr-FR': 'Portugal', 'de-DE': 'Portugal', 'it-IT': 'Portogallo' },
    US: { 'pt-BR': 'Estados Unidos', 'en-US': 'United States', 'es-ES': 'Estados Unidos', 'fr-FR': 'États-Unis', 'de-DE': 'Vereinigte Staaten', 'it-IT': 'Stati Uniti' },
    GB: { 'pt-BR': 'Reino Unido', 'en-US': 'United Kingdom', 'es-ES': 'Reino Unido', 'fr-FR': 'Royaume-Uni', 'de-DE': 'Vereinigtes Königreich', 'it-IT': 'Regno Unito' },
    ES: { 'pt-BR': 'Espanha', 'en-US': 'Spain', 'es-ES': 'España', 'fr-FR': 'Espagne', 'de-DE': 'Spanien', 'it-IT': 'Spagna' },
    MX: { 'pt-BR': 'México', 'en-US': 'Mexico', 'es-ES': 'México', 'fr-FR': 'Mexique', 'de-DE': 'Mexiko', 'it-IT': 'Messico' },
    AR: { 'pt-BR': 'Argentina', 'en-US': 'Argentina', 'es-ES': 'Argentina', 'fr-FR': 'Argentine', 'de-DE': 'Argentinien', 'it-IT': 'Argentina' },
    CL: { 'pt-BR': 'Chile', 'en-US': 'Chile', 'es-ES': 'Chile', 'fr-FR': 'Chili', 'de-DE': 'Chile', 'it-IT': 'Cile' },
    PE: { 'pt-BR': 'Peru', 'en-US': 'Peru', 'es-ES': 'Perú', 'fr-FR': 'Pérou', 'de-DE': 'Peru', 'it-IT': 'Perù' },
    FR: { 'pt-BR': 'França', 'en-US': 'France', 'es-ES': 'Francia', 'fr-FR': 'France', 'de-DE': 'Frankreich', 'it-IT': 'Francia' },
    DE: { 'pt-BR': 'Alemanha', 'en-US': 'Germany', 'es-ES': 'Alemania', 'fr-FR': 'Allemagne', 'de-DE': 'Deutschland', 'it-IT': 'Germania' },
    IT: { 'pt-BR': 'Itália', 'en-US': 'Italy', 'es-ES': 'Italia', 'fr-FR': 'Italie', 'de-DE': 'Italien', 'it-IT': 'Italia' },
  };

  const baseLocale = locale.split('-')[0];
  const countryNames = names[countryCode];
  
  return countryNames[locale] || countryNames[`${baseLocale}-${baseLocale.toUpperCase()}`] || countryNames['en-US'] || countryCode;
}
