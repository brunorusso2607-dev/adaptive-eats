/**
 * Configuração centralizada de intolerâncias alimentares
 * 
 * @deprecated ESTE ARQUIVO ESTÁ DEPRECATED
 * A fonte de verdade para intolerâncias é o banco de dados:
 * - intolerance_key_normalization: normalização de chaves
 * - onboarding_options: labels e opções do onboarding
 * - intolerance_mappings: mapeamento ingrediente -> intolerância
 * 
 * Para frontend, usar: useSafetyLabels hook
 * Para backend, usar: globalSafetyEngine.ts
 * 
 * Este arquivo é mantido apenas para compatibilidade com código legado.
 */

// Idiomas suportados
export type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr';

// Interface para tradução de uma intolerância
interface IntoleranceTranslation {
  label: string;
  description?: string;
}

// Interface para definição completa de uma intolerância
interface IntoleranceDefinition {
  canonicalKey: string;
  translations: Record<SupportedLanguage, IntoleranceTranslation>;
  category: 'common' | 'digestive' | 'chemical' | 'other';
  icon?: string;
}

/**
 * CHAVES CANÔNICAS - Lista definitiva de todas as intolerâncias suportadas
 * Estas são as únicas chaves que devem existir no banco de dados
 */
export const CANONICAL_INTOLERANCE_KEYS = [
  'lactose',
  'gluten', 
  'egg',
  'peanut',
  'tree_nuts',
  'seafood',
  'fish',
  'soy',
  'sugar',
  'corn',
  'caffeine',
  'histamine',
  'fodmap',
  'fructose',
  'sorbitol',
  'sulfite',
  'salicylate',
  'nickel',
] as const;

export type CanonicalIntoleranceKey = typeof CANONICAL_INTOLERANCE_KEYS[number];

/**
 * MAPEAMENTO DE CHAVES LEGADAS
 * Mapeia chaves antigas/alternativas para as chaves canônicas
 */
export const LEGACY_KEY_MAPPING: Record<string, CanonicalIntoleranceKey> = {
  // Português para canônico
  'acucar': 'sugar',
  'açúcar': 'sugar',
  'ovo': 'egg',
  'ovos': 'egg',
  'amendoim': 'peanut',
  'castanhas': 'tree_nuts',
  'oleaginosas': 'tree_nuts',
  'frutos_do_mar': 'seafood',
  'soja': 'soy',
  'cafeina': 'caffeine',
  'cafe': 'caffeine',
  'peixe': 'fish',
  'milho': 'corn',
  'frutose': 'fructose',
  'sulfito': 'sulfite',
  'sorbitol': 'sorbitol',
  'salicilato': 'salicylate',
  'niquel': 'nickel',
  'histamina': 'histamine',
  
  // Inglês alternativo para canônico
  'eggs': 'egg',
  'peanuts': 'peanut',
  'nuts': 'tree_nuts',
  'treeNuts': 'tree_nuts',
  'tree-nuts': 'tree_nuts',
  
  // Espanhol para canônico
  'azucar': 'sugar',
  'azúcar': 'sugar',
  'huevo': 'egg',
  'huevos': 'egg',
  'cacahuete': 'peanut',
  'mani': 'peanut',
  'maní': 'peanut',
  'frutos_secos': 'tree_nuts',
  'mariscos': 'seafood',
  'pescado': 'fish',
  'maiz': 'corn',
  'maíz': 'corn',
  'cafeina_es': 'caffeine',
  
  // Francês para canônico
  'sucre': 'sugar',
  'oeuf': 'egg',
  'oeufs': 'egg',
  'arachide': 'peanut',
  'arachides': 'peanut',
  'fruits_de_mer': 'seafood',
  'poisson': 'fish',
  'mais': 'corn',
  'cafe_fr': 'caffeine',
};

/**
 * DEFINIÇÕES COMPLETAS DE INTOLERÂNCIAS
 * Inclui traduções para todos os idiomas suportados
 */
export const INTOLERANCE_DEFINITIONS: Record<CanonicalIntoleranceKey, IntoleranceDefinition> = {
  lactose: {
    canonicalKey: 'lactose',
    category: 'digestive',
    icon: '🥛',
    translations: {
      pt: { label: 'Lactose', description: 'Intolerância ao açúcar do leite' },
      en: { label: 'Lactose', description: 'Intolerance to milk sugar' },
      es: { label: 'Lactosa', description: 'Intolerancia al azúcar de la leche' },
      fr: { label: 'Lactose', description: 'Intolérance au sucre du lait' },
    },
  },
  gluten: {
    canonicalKey: 'gluten',
    category: 'digestive',
    icon: '🌾',
    translations: {
      pt: { label: 'Glúten', description: 'Intolerância à proteína do trigo' },
      en: { label: 'Gluten', description: 'Intolerance to wheat protein' },
      es: { label: 'Gluten', description: 'Intolerancia a la proteína del trigo' },
      fr: { label: 'Gluten', description: 'Intolérance à la protéine du blé' },
    },
  },
  egg: {
    canonicalKey: 'egg',
    category: 'common',
    icon: '🥚',
    translations: {
      pt: { label: 'Ovo', description: 'Alergia ou intolerância a ovos' },
      en: { label: 'Egg', description: 'Egg allergy or intolerance' },
      es: { label: 'Huevo', description: 'Alergia o intolerancia al huevo' },
      fr: { label: 'Œuf', description: 'Allergie ou intolérance aux œufs' },
    },
  },
  peanut: {
    canonicalKey: 'peanut',
    category: 'common',
    icon: '🥜',
    translations: {
      pt: { label: 'Amendoim', description: 'Alergia a amendoim' },
      en: { label: 'Peanut', description: 'Peanut allergy' },
      es: { label: 'Cacahuete', description: 'Alergia al cacahuete' },
      fr: { label: 'Arachide', description: 'Allergie aux arachides' },
    },
  },
  tree_nuts: {
    canonicalKey: 'tree_nuts',
    category: 'common',
    icon: '🌰',
    translations: {
      pt: { label: 'Oleaginosas', description: 'Alergia a castanhas e nozes' },
      en: { label: 'Tree Nuts', description: 'Tree nut allergy' },
      es: { label: 'Frutos Secos', description: 'Alergia a frutos secos' },
      fr: { label: 'Fruits à Coque', description: 'Allergie aux fruits à coque' },
    },
  },
  seafood: {
    canonicalKey: 'seafood',
    category: 'common',
    icon: '🦐',
    translations: {
      pt: { label: 'Frutos do Mar', description: 'Alergia a crustáceos e moluscos' },
      en: { label: 'Seafood', description: 'Shellfish and mollusk allergy' },
      es: { label: 'Mariscos', description: 'Alergia a mariscos' },
      fr: { label: 'Fruits de Mer', description: 'Allergie aux fruits de mer' },
    },
  },
  fish: {
    canonicalKey: 'fish',
    category: 'common',
    icon: '🐟',
    translations: {
      pt: { label: 'Peixe', description: 'Alergia a peixes' },
      en: { label: 'Fish', description: 'Fish allergy' },
      es: { label: 'Pescado', description: 'Alergia al pescado' },
      fr: { label: 'Poisson', description: 'Allergie au poisson' },
    },
  },
  soy: {
    canonicalKey: 'soy',
    category: 'common',
    icon: '🫘',
    translations: {
      pt: { label: 'Soja', description: 'Alergia ou intolerância à soja' },
      en: { label: 'Soy', description: 'Soy allergy or intolerance' },
      es: { label: 'Soja', description: 'Alergia o intolerancia a la soja' },
      fr: { label: 'Soja', description: 'Allergie ou intolérance au soja' },
    },
  },
  sugar: {
    canonicalKey: 'sugar',
    category: 'digestive',
    icon: '🍬',
    translations: {
      pt: { label: 'Açúcar', description: 'Restrição ao consumo de açúcar' },
      en: { label: 'Sugar', description: 'Sugar restriction' },
      es: { label: 'Azúcar', description: 'Restricción de azúcar' },
      fr: { label: 'Sucre', description: 'Restriction de sucre' },
    },
  },
  corn: {
    canonicalKey: 'corn',
    category: 'common',
    icon: '🌽',
    translations: {
      pt: { label: 'Milho', description: 'Alergia ou intolerância ao milho' },
      en: { label: 'Corn', description: 'Corn allergy or intolerance' },
      es: { label: 'Maíz', description: 'Alergia o intolerancia al maíz' },
      fr: { label: 'Maïs', description: 'Allergie ou intolérance au maïs' },
    },
  },
  caffeine: {
    canonicalKey: 'caffeine',
    category: 'chemical',
    icon: '☕',
    translations: {
      pt: { label: 'Cafeína', description: 'Sensibilidade à cafeína' },
      en: { label: 'Caffeine', description: 'Caffeine sensitivity' },
      es: { label: 'Cafeína', description: 'Sensibilidad a la cafeína' },
      fr: { label: 'Caféine', description: 'Sensibilité à la caféine' },
    },
  },
  histamine: {
    canonicalKey: 'histamine',
    category: 'chemical',
    icon: '🧪',
    translations: {
      pt: { label: 'Histamina', description: 'Intolerância à histamina' },
      en: { label: 'Histamine', description: 'Histamine intolerance' },
      es: { label: 'Histamina', description: 'Intolerancia a la histamina' },
      fr: { label: 'Histamine', description: 'Intolérance à l\'histamine' },
    },
  },
  fodmap: {
    canonicalKey: 'fodmap',
    category: 'digestive',
    icon: '🫃',
    translations: {
      pt: { label: 'FODMAP', description: 'Dieta baixa em FODMAPs' },
      en: { label: 'FODMAP', description: 'Low FODMAP diet' },
      es: { label: 'FODMAP', description: 'Dieta baja en FODMAPs' },
      fr: { label: 'FODMAP', description: 'Régime pauvre en FODMAPs' },
    },
  },
  fructose: {
    canonicalKey: 'fructose',
    category: 'digestive',
    icon: '🍎',
    translations: {
      pt: { label: 'Frutose', description: 'Má absorção de frutose' },
      en: { label: 'Fructose', description: 'Fructose malabsorption' },
      es: { label: 'Fructosa', description: 'Malabsorción de fructosa' },
      fr: { label: 'Fructose', description: 'Malabsorption du fructose' },
    },
  },
  sorbitol: {
    canonicalKey: 'sorbitol',
    category: 'digestive',
    icon: '🍬',
    translations: {
      pt: { label: 'Sorbitol', description: 'Intolerância ao sorbitol' },
      en: { label: 'Sorbitol', description: 'Sorbitol intolerance' },
      es: { label: 'Sorbitol', description: 'Intolerancia al sorbitol' },
      fr: { label: 'Sorbitol', description: 'Intolérance au sorbitol' },
    },
  },
  sulfite: {
    canonicalKey: 'sulfite',
    category: 'chemical',
    icon: '🍷',
    translations: {
      pt: { label: 'Sulfito', description: 'Sensibilidade a sulfitos' },
      en: { label: 'Sulfite', description: 'Sulfite sensitivity' },
      es: { label: 'Sulfito', description: 'Sensibilidad a sulfitos' },
      fr: { label: 'Sulfite', description: 'Sensibilité aux sulfites' },
    },
  },
  salicylate: {
    canonicalKey: 'salicylate',
    category: 'chemical',
    icon: '💊',
    translations: {
      pt: { label: 'Salicilato', description: 'Intolerância a salicilatos' },
      en: { label: 'Salicylate', description: 'Salicylate intolerance' },
      es: { label: 'Salicilato', description: 'Intolerancia a salicilatos' },
      fr: { label: 'Salicylate', description: 'Intolérance aux salicylates' },
    },
  },
  nickel: {
    canonicalKey: 'nickel',
    category: 'chemical',
    icon: '🔩',
    translations: {
      pt: { label: 'Níquel', description: 'Alergia ao níquel em alimentos' },
      en: { label: 'Nickel', description: 'Nickel allergy in foods' },
      es: { label: 'Níquel', description: 'Alergia al níquel en alimentos' },
      fr: { label: 'Nickel', description: 'Allergie au nickel alimentaire' },
    },
  },
};

/**
 * Converte uma chave (legada ou canônica) para a chave canônica
 */
export function toCanonicalKey(key: string): CanonicalIntoleranceKey | null {
  const lowerKey = key.toLowerCase().trim();
  
  // Se já é uma chave canônica, retorna diretamente
  if (CANONICAL_INTOLERANCE_KEYS.includes(lowerKey as CanonicalIntoleranceKey)) {
    return lowerKey as CanonicalIntoleranceKey;
  }
  
  // Procurar no mapeamento de chaves legadas
  const mapped = LEGACY_KEY_MAPPING[lowerKey];
  if (mapped) {
    return mapped;
  }
  
  // Chave desconhecida
  console.warn(`[intoleranceConfig] Unknown intolerance key: ${key}`);
  return null;
}

/**
 * Converte um array de chaves (legadas ou canônicas) para chaves canônicas
 */
export function toCanonicalKeys(keys: string[]): CanonicalIntoleranceKey[] {
  const result: CanonicalIntoleranceKey[] = [];
  
  for (const key of keys) {
    if (key === 'none' || key === 'nenhuma' || !key) continue;
    
    const canonical = toCanonicalKey(key);
    if (canonical && !result.includes(canonical)) {
      result.push(canonical);
    }
  }
  
  return result;
}

/**
 * Obtém o label traduzido de uma intolerância
 */
export function getIntoleranceLabel(
  key: string,
  language: SupportedLanguage = 'pt'
): string {
  const canonical = toCanonicalKey(key);
  if (!canonical) return key;
  
  const definition = INTOLERANCE_DEFINITIONS[canonical];
  return definition?.translations[language]?.label || key;
}

/**
 * Obtém a descrição traduzida de uma intolerância
 */
export function getIntoleranceDescription(
  key: string,
  language: SupportedLanguage = 'pt'
): string | undefined {
  const canonical = toCanonicalKey(key);
  if (!canonical) return undefined;
  
  const definition = INTOLERANCE_DEFINITIONS[canonical];
  return definition?.translations[language]?.description;
}

/**
 * Obtém o ícone de uma intolerância
 */
export function getIntoleranceIcon(key: string): string {
  const canonical = toCanonicalKey(key);
  if (!canonical) return '❓';
  
  return INTOLERANCE_DEFINITIONS[canonical]?.icon || '❓';
}

/**
 * Retorna todas as intolerâncias com seus labels no idioma especificado
 */
export function getAllIntolerancesWithLabels(
  language: SupportedLanguage = 'pt'
): Array<{ key: CanonicalIntoleranceKey; label: string; icon: string; category: string }> {
  return CANONICAL_INTOLERANCE_KEYS.map(key => ({
    key,
    label: INTOLERANCE_DEFINITIONS[key].translations[language].label,
    icon: INTOLERANCE_DEFINITIONS[key].icon || '❓',
    category: INTOLERANCE_DEFINITIONS[key].category,
  }));
}

/**
 * LABELS SIMPLES (compatibilidade com código existente)
 * Usa português como padrão
 */
export const INTOLERANCE_LABELS: Record<string, string> = Object.fromEntries(
  CANONICAL_INTOLERANCE_KEYS.map(key => [
    key,
    INTOLERANCE_DEFINITIONS[key].translations.pt.label
  ])
);
