// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - i18n SERVICE
// Sistema de internacionalização com detecção automática de idioma
// ═══════════════════════════════════════════════════════════════════════

import { UNIVERSAL_INGREDIENTS, getIngredientName } from "./universal-ingredients-db.ts";
import { COUNTRY_SPECIFIC_INGREDIENTS, getCountrySpecificIngredient, getSubstituteIngredient } from "./country-specific-ingredients.ts";

// ═══════════════════════════════════════════════════════════════════════
// MAPEAMENTOS DE PAÍS → LOCALE
// ═══════════════════════════════════════════════════════════════════════

const COUNTRY_TO_LOCALE: Record<string, string> = {
  BR: "pt-BR",
  PT: "pt-PT",
  US: "en-US",
  GB: "en-GB",
  ES: "es-ES",
  MX: "es-MX",
  AR: "es-AR",
  CL: "es-CL",
  PE: "es-PE",
  FR: "fr-FR",
  DE: "de-DE",
  IT: "it-IT",
};

const LOCALE_TO_COUNTRY: Record<string, string> = {
  "pt-BR": "BR",
  "pt-PT": "PT",
  "en-US": "US",
  "en-GB": "GB",
  "es-ES": "ES",
  "es-MX": "MX",
  "es-AR": "AR",
  "es-CL": "CL",
  "es-PE": "PE",
  "fr-FR": "FR",
  "de-DE": "DE",
  "it-IT": "IT",
};

// ═══════════════════════════════════════════════════════════════════════
// CLASSE I18N SERVICE
// ═══════════════════════════════════════════════════════════════════════

export class I18nService {
  private locale: string;
  private countryCode: string;

  constructor(locale?: string, countryCode?: string) {
    if (locale && countryCode) {
      this.locale = locale;
      this.countryCode = countryCode;
    } else if (countryCode) {
      this.countryCode = countryCode;
      this.locale = this.mapCountryToLocale(countryCode);
    } else if (locale) {
      this.locale = locale;
      this.countryCode = this.mapLocaleToCountry(locale);
    } else {
      // Fallback padrão
      this.locale = "pt-BR";
      this.countryCode = "BR";
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DETECÇÃO DE IDIOMA
  // ═══════════════════════════════════════════════════════════════════════

  static detectLocaleFromBrowser(acceptLanguage: string): string {
    // Parse Accept-Language header
    // Exemplo: "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
    const languages = acceptLanguage
      .split(",")
      .map(lang => {
        const [locale, qValue] = lang.trim().split(";q=");
        return {
          locale: locale.trim(),
          quality: qValue ? parseFloat(qValue) : 1.0
        };
      })
      .sort((a, b) => b.quality - a.quality);

    // Tentar encontrar locale exato
    for (const { locale } of languages) {
      if (LOCALE_TO_COUNTRY[locale]) {
        return locale;
      }
    }

    // Tentar encontrar por idioma base
    for (const { locale } of languages) {
      const baseLocale = locale.split("-")[0];
      const matchingLocale = Object.keys(LOCALE_TO_COUNTRY).find(key => 
        key.startsWith(baseLocale)
      );
      if (matchingLocale) {
        return matchingLocale;
      }
    }

    // Fallback para inglês
    return "en-US";
  }

  static async detectLocaleFromIp(ip: string): Promise<string> {
    try {
      // Usar serviço de geolocalização (exemplo com ipapi.co)
      // Em produção, usar serviço próprio ou Cloudflare
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();
      
      const countryCode = data.country_code;
      const locale = COUNTRY_TO_LOCALE[countryCode];
      
      return locale || "en-US";
    } catch (error) {
      console.error("Error detecting locale from IP:", error);
      return "en-US";
    }
  }

  static async detectLocale(
    ip?: string,
    acceptLanguage?: string
  ): Promise<string> {
    // Prioridade: IP > Accept-Language > Fallback
    if (ip) {
      const localeFromIp = await this.detectLocaleFromIp(ip);
      if (localeFromIp !== "en-US") return localeFromIp;
    }

    if (acceptLanguage) {
      return this.detectLocaleFromBrowser(acceptLanguage);
    }

    return "en-US";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAPEAMENTOS
  // ═══════════════════════════════════════════════════════════════════════

  mapCountryToLocale(countryCode: string): string {
    return COUNTRY_TO_LOCALE[countryCode] || "en-US";
  }

  mapLocaleToCountry(locale: string): string {
    return LOCALE_TO_COUNTRY[locale] || "US";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRADUÇÃO DE INGREDIENTES
  // ═══════════════════════════════════════════════════════════════════════

  getIngredientName(ingredientId: string): string {
    // Tentar ingrediente universal primeiro
    const universalIngredient = UNIVERSAL_INGREDIENTS[ingredientId];
    if (universalIngredient) {
      return getIngredientName(ingredientId, this.locale);
    }

    // Tentar ingrediente específico do país
    const specificIngredient = getCountrySpecificIngredient(ingredientId, this.countryCode);
    if (specificIngredient) {
      const translation = specificIngredient.i18n[this.locale];
      if (translation) return translation.name;

      // Fallback para idioma base
      const baseLocale = this.locale.split("-")[0];
      const fallbackLocale = Object.keys(specificIngredient.i18n).find(key => 
        key.startsWith(baseLocale)
      );
      if (fallbackLocale) {
        return specificIngredient.i18n[fallbackLocale].name;
      }

      // Fallback para inglês
      return specificIngredient.i18n["en-US"]?.name || ingredientId;
    }

    // Não encontrou, retornar ID
    return ingredientId;
  }

  getIngredientDescription(ingredientId: string): string | undefined {
    // Tentar ingrediente universal primeiro
    const universalIngredient = UNIVERSAL_INGREDIENTS[ingredientId];
    if (universalIngredient) {
      return universalIngredient.i18n[this.locale]?.description;
    }

    // Tentar ingrediente específico do país
    const specificIngredient = getCountrySpecificIngredient(ingredientId, this.countryCode);
    if (specificIngredient) {
      return specificIngredient.i18n[this.locale]?.description;
    }

    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUBSTITUIÇÃO DE INGREDIENTES
  // ═══════════════════════════════════════════════════════════════════════

  getIngredientForCountry(
    ingredientId: string,
    targetCountry: string
  ): string {
    // Se o ingrediente é universal, retornar o mesmo
    if (UNIVERSAL_INGREDIENTS[ingredientId]) {
      return ingredientId;
    }

    // Se o ingrediente é específico, buscar substituto
    const specificIngredient = getCountrySpecificIngredient(ingredientId, this.countryCode);
    if (specificIngredient) {
      const substitute = specificIngredient.substitutes[targetCountry];
      if (substitute) return substitute;
    }

    // Tentar buscar substituto reverso
    const substitute = getSubstituteIngredient(ingredientId, this.countryCode, targetCountry);
    if (substitute) return substitute;

    // Não encontrou substituto, retornar original
    return ingredientId;
  }

  translateIngredientList(
    ingredientIds: string[],
    targetCountry?: string
  ): string[] {
    const country = targetCountry || this.countryCode;
    
    return ingredientIds.map(id => {
      // Buscar substituto se necessário
      const substitutedId = this.getIngredientForCountry(id, country);
      return substitutedId;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRADUÇÃO DE INTERFACE
  // ═══════════════════════════════════════════════════════════════════════

  t(key: string): string {
    const translations = UI_TRANSLATIONS[this.locale] || UI_TRANSLATIONS["en-US"];
    return translations[key] || key;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════

  getLocale(): string {
    return this.locale;
  }

  getCountryCode(): string {
    return this.countryCode;
  }

  getLanguageCode(): string {
    return this.locale.split("-")[0];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TRADUÇÕES DE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  "pt-BR": {
    "meal.breakfast": "Café da Manhã",
    "meal.morning_snack": "Lanche da Manhã",
    "meal.lunch": "Almoço",
    "meal.afternoon_snack": "Lanche da Tarde",
    "meal.dinner": "Jantar",
    "meal.evening_snack": "Ceia",
    "density.light": "Leve",
    "density.moderate": "Moderada",
    "density.heavy": "Pesada",
    "allergen.lactose": "Lactose",
    "allergen.gluten": "Glúten",
    "allergen.egg": "Ovo",
    "allergen.soy": "Soja",
    "allergen.fish": "Peixe",
    "allergen.shellfish": "Frutos do Mar",
  },
  "en-US": {
    "meal.breakfast": "Breakfast",
    "meal.morning_snack": "Morning Snack",
    "meal.lunch": "Lunch",
    "meal.afternoon_snack": "Afternoon Snack",
    "meal.dinner": "Dinner",
    "meal.evening_snack": "Evening Snack",
    "density.light": "Light",
    "density.moderate": "Moderate",
    "density.heavy": "Heavy",
    "allergen.lactose": "Lactose",
    "allergen.gluten": "Gluten",
    "allergen.egg": "Egg",
    "allergen.soy": "Soy",
    "allergen.fish": "Fish",
    "allergen.shellfish": "Shellfish",
  },
  "es-ES": {
    "meal.breakfast": "Desayuno",
    "meal.morning_snack": "Merienda de la Mañana",
    "meal.lunch": "Almuerzo",
    "meal.afternoon_snack": "Merienda de la Tarde",
    "meal.dinner": "Cena",
    "meal.evening_snack": "Cena Ligera",
    "density.light": "Ligera",
    "density.moderate": "Moderada",
    "density.heavy": "Pesada",
    "allergen.lactose": "Lactosa",
    "allergen.gluten": "Gluten",
    "allergen.egg": "Huevo",
    "allergen.soy": "Soja",
    "allergen.fish": "Pescado",
    "allergen.shellfish": "Mariscos",
  },
  "fr-FR": {
    "meal.breakfast": "Petit-déjeuner",
    "meal.morning_snack": "Collation du Matin",
    "meal.lunch": "Déjeuner",
    "meal.afternoon_snack": "Goûter",
    "meal.dinner": "Dîner",
    "meal.evening_snack": "Collation du Soir",
    "density.light": "Légère",
    "density.moderate": "Modérée",
    "density.heavy": "Lourde",
    "allergen.lactose": "Lactose",
    "allergen.gluten": "Gluten",
    "allergen.egg": "Œuf",
    "allergen.soy": "Soja",
    "allergen.fish": "Poisson",
    "allergen.shellfish": "Fruits de Mer",
  },
  "de-DE": {
    "meal.breakfast": "Frühstück",
    "meal.morning_snack": "Vormittagssnack",
    "meal.lunch": "Mittagessen",
    "meal.afternoon_snack": "Nachmittagssnack",
    "meal.dinner": "Abendessen",
    "meal.evening_snack": "Abendsnack",
    "density.light": "Leicht",
    "density.moderate": "Mäßig",
    "density.heavy": "Schwer",
    "allergen.lactose": "Laktose",
    "allergen.gluten": "Gluten",
    "allergen.egg": "Ei",
    "allergen.soy": "Soja",
    "allergen.fish": "Fisch",
    "allergen.shellfish": "Meeresfrüchte",
  },
  "it-IT": {
    "meal.breakfast": "Colazione",
    "meal.morning_snack": "Spuntino Mattutino",
    "meal.lunch": "Pranzo",
    "meal.afternoon_snack": "Merenda",
    "meal.dinner": "Cena",
    "meal.evening_snack": "Spuntino Serale",
    "density.light": "Leggera",
    "density.moderate": "Moderata",
    "density.heavy": "Pesante",
    "allergen.lactose": "Lattosio",
    "allergen.gluten": "Glutine",
    "allergen.egg": "Uovo",
    "allergen.soy": "Soia",
    "allergen.fish": "Pesce",
    "allergen.shellfish": "Frutti di Mare",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTION PARA CRIAR INSTÂNCIA
// ═══════════════════════════════════════════════════════════════════════

export async function createI18nService(
  req?: Request
): Promise<I18nService> {
  if (!req) {
    return new I18nService("pt-BR", "BR");
  }

  // Extrair IP do request
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
             req.headers.get("x-real-ip") || 
             "unknown";

  // Extrair Accept-Language
  const acceptLanguage = req.headers.get("accept-language") || undefined;

  // Detectar locale
  const locale = await I18nService.detectLocale(
    ip !== "unknown" ? ip : undefined,
    acceptLanguage
  );

  const countryCode = LOCALE_TO_COUNTRY[locale] || "US";

  return new I18nService(locale, countryCode);
}

