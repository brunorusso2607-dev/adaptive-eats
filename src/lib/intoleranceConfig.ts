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
 * ATUALIZADO (jan/2026): APENAS CORE INTOLERANCES
 * - Intolerâncias Core: lactose, gluten, fodmap (3)
 * 
 * REMOVIDAS (não-core): egg, soy, peanut, tree_nuts, seafood, fish, salicylate, sulfite
 * Motivo: Foco em intolerâncias de alta prevalência (80% dos casos)
 */
export const CANONICAL_INTOLERANCE_KEYS = [
  // Core Intolerâncias (alta prevalência)
  'lactose',
  'gluten',
  'fodmap',
] as const;

export type CanonicalIntoleranceKey = typeof CANONICAL_INTOLERANCE_KEYS[number];

/**
 * MAPEAMENTO DE CHAVES LEGADAS
 * Mapeia chaves antigas/alternativas para as chaves canônicas
 * ATUALIZADO: Apenas core intolerances
 */
export const LEGACY_KEY_MAPPING: Record<string, CanonicalIntoleranceKey> = {
  // Português para canônico
  'glutem': 'gluten',
  'glúten': 'gluten',
  
  // Inglês alternativo
  'gluten': 'gluten',
  
  // Espanhol
  'gluten_es': 'gluten',
  
  // Francês
  'gluten_fr': 'gluten',
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
