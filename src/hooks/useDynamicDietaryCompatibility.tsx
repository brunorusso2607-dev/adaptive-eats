import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useUserProfileContext } from './useUserProfileContext';
import { useSafetyLabels } from './useSafetyLabels';
import { supabase } from '@/integrations/supabase/client';

/**
 * ============================================
 * HOOK DE COMPATIBILIDADE DIETÉTICA
 * ============================================
 * 
 * Este hook faz validação LOCAL de ingredientes contra as restrições do usuário,
 * usando os mapeamentos do banco de dados (intolerance_mappings e dietary_forbidden_ingredients).
 * 
 * ALINHADO COM globalSafetyEngine.ts do backend:
 * - Usa normalizeText() para remover acentos (multi-idioma)
 * - Usa containsWholeWord() para matching preciso
 * - Invalida cache quando intolerâncias mudam
 * 
 * Para análises mais complexas (fotos, etc), o backend globalSafetyEngine é usado.
 */

// ============= FALLBACKS CRÍTICOS (IGUAL AO BACKEND globalSafetyEngine.ts) =============
// Estes ingredientes são CRÍTICOS e devem ser detectados mesmo se o banco não tiver
// Inclui ingredientes em PORTUGUÊS e INGLÊS para matching multi-idioma

const CRITICAL_FALLBACK_MAPPINGS: Record<string, string[]> = {
  // === INTOLERÂNCIAS ===
  gluten: ["trigo", "wheat", "centeio", "rye", "cevada", "barley", "malte", "malt", "aveia", "oats", "farinha de trigo", "wheat flour", "gluten", "glúten", "seitan", "cerveja", "beer", "pao", "pão", "macarrao", "macarrão", "massa", "biscoito", "bolacha"],
  lactose: ["leite", "milk", "queijo", "cheese", "iogurte", "yogurt", "creme de leite", "cream", "manteiga", "butter", "nata", "whey", "soro de leite", "lactose", "requeijao", "requeijão", "ricota", "mussarela", "parmesao", "parmesão"],
  fructose: ["mel", "honey", "agave", "xarope de milho", "corn syrup", "frutose", "fructose", "xarope de frutose", "high fructose"],
  sorbitol: ["sorbitol", "ameixa", "prune", "pessego", "pêssego", "peach", "damasco", "apricot", "cereja", "cherry", "maca", "maçã", "apple", "pera", "pear", "chiclete", "gum"],
  // FODMAP: Carboidratos fermentáveis - NÃO inclui laticínios (isso é lactose)
  fodmap: ["alho", "garlic", "cebola", "onion", "maca", "maçã", "apple", "mel", "honey", "trigo", "wheat", "feijao", "feijão", "beans", "grao de bico", "grão de bico", "chickpea", "lentilha", "lentil", "ervilha", "pea", "couve-flor", "cauliflower", "brocolis", "brócolis", "broccoli", "repolho", "cabbage", "aspargo", "asparagus", "manga", "mango", "melancia", "watermelon", "damasco", "apricot", "ameixa", "plum", "pera", "pear", "cereja", "cherry", "abacate", "avocado", "cogumelo", "mushroom"],
  
  // === ALERGIAS ===
  egg: ["ovo", "egg", "ovos", "eggs", "gema", "yolk", "clara de ovo", "egg white", "albumina", "albumin", "maionese", "mayonnaise"],
  peanut: ["amendoim", "peanut", "manteiga de amendoim", "peanut butter", "pasta de amendoim"],
  nuts: ["castanha", "nut", "nozes", "walnuts", "amendoas", "amêndoas", "almonds", "avela", "avelã", "hazelnut", "pistache", "pistachio", "macadamia", "macadâmia", "peca", "pecã", "pecan", "castanha de caju", "cashew"],
  seafood: ["camarao", "camarão", "shrimp", "lagosta", "lobster", "caranguejo", "crab", "ostra", "oyster", "mexilhao", "mexilhão", "mussel", "lula", "squid", "polvo", "octopus", "marisco", "shellfish"],
  fish: ["peixe", "fish", "salmao", "salmão", "salmon", "atum", "tuna", "bacalhau", "cod", "sardinha", "sardine", "tilapia", "tilápia", "anchova", "anchovy"],
  soy: ["soja", "soy", "tofu", "molho de soja", "soy sauce", "shoyu", "edamame", "tempeh", "misso", "missô", "miso", "lecitina de soja"],
  sesame: ["gergelim", "sesame", "tahine", "tahini", "oleo de gergelim", "óleo de gergelim", "sesame oil"],
  
  // === SENSIBILIDADES ===
  histamine: ["vinho", "wine", "cerveja", "beer", "queijo curado", "aged cheese", "salame", "salami", "presunto", "ham", "atum enlatado", "canned tuna", "espinafre", "spinach", "tomate", "tomato", "vinagre", "vinegar"],
  caffeine: ["cafe", "café", "coffee", "cafeina", "cafeína", "caffeine", "cha preto", "chá preto", "black tea", "cha verde", "chá verde", "green tea", "chocolate", "guarana", "guaraná", "energetico", "energético", "energy drink", "cola", "mate"],
  sulfite: ["sulfito", "sulfite", "vinho", "wine", "cerveja", "beer", "frutas secas", "dried fruit", "vinagre", "vinegar"],
  corn: ["milho", "corn", "amido de milho", "corn starch", "fuba", "fubá", "cornmeal", "xarope de milho", "corn syrup", "polenta", "pipoca", "popcorn", "oleo de milho", "óleo de milho", "corn oil"],
  nickel: ["cacau", "cocoa", "chocolate", "aveia", "oats", "oleaginosas", "nuts", "soja", "soy", "feijao", "feijão", "beans", "lentilha", "lentil", "espinafre", "spinach"]
};

// ============= FUNÇÕES DE NORMALIZAÇÃO (ALINHADAS COM BACKEND) =============

/**
 * Normaliza texto para comparação - IGUAL ao backend globalSafetyEngine.ts
 * Remove acentos, lowercase, trim - funciona para QUALQUER idioma
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Verifica se uma palavra está contida como palavra completa - IGUAL ao backend
 * Evita falsos positivos como "alho" matchando "galho"
 */
function containsWholeWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  
  const normalizedText = normalizeText(text);
  const normalizedWord = normalizeText(word);
  
  // Se são iguais, é match perfeito
  if (normalizedText === normalizedWord) return true;
  
  // Delimitadores comuns
  const delimiters = '[\\s,;:()\\[\\]\\-\\/]';
  
  // Se o termo de busca contém múltiplas palavras, TODAS devem estar presentes
  const searchWords = normalizedWord.trim().split(/\s+/);
  if (searchWords.length > 1) {
    return searchWords.every(w => {
      const escapedW = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|${delimiters})${escapedW}(${delimiters}|$)`, 'i');
      return regex.test(normalizedText);
    });
  }
  
  // Escapar caracteres especiais de regex
  const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Padrão: (início ou delimitador) + palavra + (fim ou delimitador)
  const regex = new RegExp(`(^|${delimiters})${escapedWord}(${delimiters}|$)`, 'i');
  
  return regex.test(normalizedText);
}

export interface BackendAlertResult {
  restricao: string;
  status: 'seguro' | 'risco_potencial' | 'contem';
  ingrediente?: string;
  mensagem?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'intolerance' | 'excluded';
    key: string;
    label: string;
    ingredient: string;
    matchedTerm: string;
  }>;
  isSafe: boolean;
}

// Cache global para mapeamentos - com tracking de keys carregadas
let cachedIntoleranceMappings: Map<string, Set<string>> | null = null;
let cachedSafeKeywords: Map<string, Set<string>> | null = null;
let cachedKeyNormalization: Map<string, string[]> | null = null; // onboarding_key -> database_keys[]
let cachedForKeys: string = ''; // Track which keys the cache was loaded for

export function useDynamicDietaryCompatibility() {
  const profileContext = useUserProfileContext();
  const { getIntoleranceLabel, isLoading: labelsLoading } = useSafetyLabels();
  const [mappingsLoaded, setMappingsLoaded] = useState(false);

  // Get user restrictions for filtered queries - NORMALIZADO
  const userIntolerances = useMemo(() => {
    const raw = profileContext.intolerances || [];
    const filtered = raw.filter(i => i && i !== 'nenhuma');
    return filtered.map(i => normalizeText(i));
  }, [profileContext.intolerances]);
  
  const intolerancesKey = userIntolerances.sort().join(',');
  
  // Carrega os mapeamentos do banco de dados - INVALIDA CACHE quando intolerâncias mudam
  useEffect(() => {
    // Se cache existe MAS foi carregado para keys diferentes, invalidar
    if (cachedIntoleranceMappings && cachedForKeys !== intolerancesKey) {
      console.log('[useDynamicDietaryCompatibility] Cache invalidado - intolerâncias mudaram:', { old: cachedForKeys, new: intolerancesKey });
      cachedIntoleranceMappings = null;
      cachedSafeKeywords = null;
      cachedForKeys = '';
    }
    
    // Se já temos cache válido para estas keys, usar
    if (cachedIntoleranceMappings && cachedSafeKeywords && cachedForKeys === intolerancesKey) {
      setMappingsLoaded(true);
      return;
    }

    const loadMappings = async () => {
      if (userIntolerances.length === 0) {
        cachedIntoleranceMappings = new Map();
        cachedSafeKeywords = new Map();
        cachedKeyNormalization = new Map();
        cachedForKeys = intolerancesKey;
        setMappingsLoaded(true);
        return;
      }
      
      try {
        
        // PASSO 1: Carregar normalização de keys (onboarding_key -> database_key)
        // Isso é CRÍTICO porque o perfil pode ter "fodmap" mas o banco pode ter "FODMAP"
        const { data: normalizationData } = await supabase
          .from('intolerance_key_normalization')
          .select('onboarding_key, database_key');
        
        const keyNormalization = new Map<string, string[]>();
        if (normalizationData) {
          for (const row of normalizationData) {
            const existing = keyNormalization.get(row.onboarding_key.toLowerCase()) || [];
            if (!existing.includes(row.database_key.toLowerCase())) {
              existing.push(row.database_key.toLowerCase());
            }
            keyNormalization.set(row.onboarding_key.toLowerCase(), existing);
          }
        }
        cachedKeyNormalization = keyNormalization;
        
        // PASSO 2: Expandir userIntolerances usando normalização
        // Ex: "fodmap" pode mapear para ["fodmap", "high_fodmap"]
        const expandedKeys: string[] = [];
        for (const key of userIntolerances) {
          const normalizedKeys = keyNormalization.get(key) || [key];
          expandedKeys.push(...normalizedKeys);
        }
        // Remover duplicatas
        const uniqueExpandedKeys = [...new Set(expandedKeys)];
        
        // PASSO 3: Carregar mapeamentos usando keys expandidas
        const [intoleranceResult, safeResult] = await Promise.all([
          // Carregar mapeamentos de intolerância - usando keys EXPANDIDAS
          supabase
            .from('intolerance_mappings')
            .select('intolerance_key, ingredient, severity_level')
            .in('intolerance_key', uniqueExpandedKeys)
            .neq('severity_level', 'safe'), // Ignorar ingredientes marcados como seguros
          
          // Carregar safe keywords - usando keys EXPANDIDAS
          supabase
            .from('intolerance_safe_keywords')
            .select('intolerance_key, keyword')
            .in('intolerance_key', uniqueExpandedKeys)
        ]);

        const intoleranceMap = new Map<string, Set<string>>();
        
        if (intoleranceResult.error) {
          console.error('[useDynamicDietaryCompatibility] Erro na query:', intoleranceResult.error);
        }
        
        if (intoleranceResult.data) {
          for (const row of intoleranceResult.data) {
            const key = normalizeText(row.intolerance_key);
            if (!intoleranceMap.has(key)) {
              intoleranceMap.set(key, new Set());
            }
            // Normalizar ingrediente para matching consistente
            intoleranceMap.get(key)!.add(normalizeText(row.ingredient));
          }
        } else {
          console.warn('[useDynamicDietaryCompatibility] Nenhum mapeamento encontrado!');
        }
        // MESCLAR com fallbacks críticos (igual ao backend)
        // Isso garante que ingredientes em PORTUGUÊS sejam detectados
        for (const [key, ingredients] of Object.entries(CRITICAL_FALLBACK_MAPPINGS)) {
          const normalizedKey = normalizeText(key);
          if (!intoleranceMap.has(normalizedKey)) {
            intoleranceMap.set(normalizedKey, new Set());
          }
          const existingSet = intoleranceMap.get(normalizedKey)!;
          for (const ingredient of ingredients) {
            existingSet.add(normalizeText(ingredient));
          }
        }
        
        cachedIntoleranceMappings = intoleranceMap;

        const safeMap = new Map<string, Set<string>>();
        if (safeResult.data) {
          for (const row of safeResult.data) {
            const key = normalizeText(row.intolerance_key);
            if (!safeMap.has(key)) {
              safeMap.set(key, new Set());
            }
            safeMap.get(key)!.add(normalizeText(row.keyword));
          }
        }
        cachedSafeKeywords = safeMap;
        cachedForKeys = intolerancesKey;
        setMappingsLoaded(true);
      } catch (error) {
        console.error('[useDynamicDietaryCompatibility] Error loading mappings:', error);
        // Initialize with empty maps to avoid null checks
        cachedIntoleranceMappings = new Map();
        cachedSafeKeywords = new Map();
        cachedForKeys = intolerancesKey;
        setMappingsLoaded(true);
      }
    };

    loadMappings();
  }, [intolerancesKey]);

  // Verifica se o usuário tem restrições configuradas
  const hasRestrictions = useMemo(() => {
    const hasIntolerances = (profileContext.intolerances?.length ?? 0) > 0 && 
      !profileContext.intolerances?.includes("nenhuma");
    const hasExcluded = (profileContext.excluded_ingredients?.length ?? 0) > 0;
    return hasIntolerances || hasExcluded;
  }, [profileContext.intolerances, profileContext.excluded_ingredients]);

  // Retorna as restrições do usuário com labels amigáveis
  const getUserRestrictions = useCallback(() => {
    const restrictions: Array<{ key: string; label: string; type: 'intolerance' | 'excluded' }> = [];

    // Intolerâncias
    const userIntolerances = profileContext.intolerances || [];
    for (const intolerance of userIntolerances) {
      if (intolerance === "nenhuma" || !intolerance) continue;
      restrictions.push({
        key: intolerance,
        label: getIntoleranceLabel(intolerance),
        type: 'intolerance'
      });
    }

    // Ingredientes excluídos manualmente
    const excludedList = profileContext.excluded_ingredients || [];
    for (const excluded of excludedList) {
      restrictions.push({
        key: `excluded_${excluded}`,
        label: excluded,
        type: 'excluded'
      });
    }

    return restrictions;
  }, [profileContext.intolerances, profileContext.excluded_ingredients, getIntoleranceLabel]);

  /**
   * Verifica se um ingrediente é seguro devido a safe keywords
   * ALINHADO com backend: usa normalizeText() e containsWholeWord()
   */
  const isSafeByKeyword = useCallback((ingredientName: string, intoleranceKey: string): boolean => {
    if (!cachedSafeKeywords) return false;
    const safeKeywords = cachedSafeKeywords.get(normalizeText(intoleranceKey));
    if (!safeKeywords) return false;
    
    const normalizedIngredient = normalizeText(ingredientName);
    for (const keyword of safeKeywords) {
      if (normalizedIngredient.includes(keyword)) {
        return true;
      }
    }
    return false;
  }, []);

  /**
   * Verifica se um ingrediente conflita com uma intolerância
   * ALINHADO com backend: usa containsWholeWord() para matching preciso
   */
  const checkIngredientConflict = useCallback((
    ingredientName: string, 
    intoleranceKey: string
  ): { hasConflict: boolean; matchedIngredient?: string } => {
    if (!cachedIntoleranceMappings) return { hasConflict: false };
    
    const normalizedKey = normalizeText(intoleranceKey);
    
    // Primeiro verifica se é seguro por safe keyword
    if (isSafeByKeyword(ingredientName, normalizedKey)) {
      return { hasConflict: false };
    }
    
    const forbiddenIngredients = cachedIntoleranceMappings.get(normalizedKey);
    if (!forbiddenIngredients) {
      return { hasConflict: false };
    }
    
    const normalizedIngredient = normalizeText(ingredientName);
    
    // Verifica match usando containsWholeWord (IGUAL ao backend)
    for (const forbidden of forbiddenIngredients) {
      if (containsWholeWord(normalizedIngredient, forbidden)) {
        return { hasConflict: true, matchedIngredient: forbidden };
      }
    }
    
    return { hasConflict: false };
  }, [isSafeByKeyword]);

  /**
   * Valida ingredientes de uma refeição contra as restrições do usuário
   */
  const getMealCompatibility = useCallback((
    ingredients: unknown
  ): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    // Se não tem restrições configuradas, todas as refeições são compatíveis
    if (!hasRestrictions) return 'good';
    
    // Se mapeamentos ainda não carregaram, retorna unknown (loading state)
    if (!mappingsLoaded) return 'unknown';
    
    // Se não tem ingredientes para analisar, assume compatível
    if (!ingredients) return 'good';
    
    // Normaliza ingredientes para array de strings
    let ingredientNames: string[] = [];
    
    if (Array.isArray(ingredients)) {
      ingredientNames = ingredients.map(ing => {
        if (typeof ing === 'string') return ing;
        if (ing && typeof ing === 'object' && 'item' in ing) return (ing as {item: string}).item;
        if (ing && typeof ing === 'object' && 'name' in ing) return (ing as {name: string}).name;
        return '';
      }).filter(Boolean);
    }
    
    // Se não conseguiu extrair ingredientes, assume compatível (não penalizar)
    if (ingredientNames.length === 0) return 'good';
    
    // IMPORTANTE: Usar as keys EXPANDIDAS do cache, não as do perfil diretamente
    // O perfil tem "fodmap" mas o banco pode ter keys diferentes
    const userIntolerancesFromProfile = (profileContext.intolerances || []).filter(i => i && i !== 'nenhuma');
    
    // Expandir usando o cache de normalização
    let expandedIntolerances: string[] = [];
    for (const key of userIntolerancesFromProfile) {
      const normalizedKey = normalizeText(key);
      const expanded = cachedKeyNormalization?.get(normalizedKey) || [normalizedKey];
      expandedIntolerances.push(...expanded);
    }
    expandedIntolerances = [...new Set(expandedIntolerances)]; // Remover duplicatas
    
    const excludedIngredients = profileContext.excluded_ingredients || [];
    
    let hasIncompatible = false;
    let hasModerate = false;
    
    for (const ingredientName of ingredientNames) {
      const normalizedIngredient = normalizeText(ingredientName);
      
      // Verifica exclusões manuais (usando containsWholeWord para precisão)
      for (const excluded of excludedIngredients) {
        if (containsWholeWord(normalizedIngredient, normalizeText(excluded))) {
          hasIncompatible = true;
          break;
        }
      }
      
      if (hasIncompatible) break;
      
      // Verifica intolerâncias (usando checkIngredientConflict alinhado com backend)
      // IMPORTANTE: Usar expandedIntolerances, não userIntolerances do perfil
      for (const intolerance of expandedIntolerances) {
        const result = checkIngredientConflict(ingredientName, intolerance);
        if (result.hasConflict) {
          hasIncompatible = true;
          break;
        }
      }
      
      if (hasIncompatible) break;
    }
    
    if (hasIncompatible) return 'incompatible';
    if (hasModerate) return 'moderate';
    return 'good';
  }, [hasRestrictions, mappingsLoaded, profileContext.intolerances, profileContext.excluded_ingredients, checkIngredientConflict]);

  /**
   * Converte alertas do backend para o formato ConflictResult.
   */
  const processBackendAlerts = useCallback((backendAlerts: BackendAlertResult[]): ConflictResult => {
    if (!backendAlerts || backendAlerts.length === 0) {
      return { hasConflict: false, conflicts: [], isSafe: hasRestrictions };
    }

    const conflicts: ConflictResult['conflicts'] = [];
    
    for (const alert of backendAlerts) {
      if (alert.status === 'contem' || alert.status === 'risco_potencial') {
        const isIntolerance = (profileContext.intolerances || []).some(i => 
          alert.restricao.toLowerCase().includes(i.toLowerCase()) ||
          getIntoleranceLabel(i).toLowerCase() === alert.restricao.toLowerCase()
        );
        
        conflicts.push({
          type: isIntolerance ? 'intolerance' : 'excluded',
          key: alert.restricao,
          label: alert.restricao,
          ingredient: alert.ingrediente || '',
          matchedTerm: alert.ingrediente || alert.restricao
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      isSafe: hasRestrictions && conflicts.length === 0
    };
  }, [hasRestrictions, profileContext.intolerances, getIntoleranceLabel]);

  /**
   * Classifica a compatibilidade baseado nos alertas do backend.
   */
  const getMealCompatibilityFromAlerts = useCallback((backendAlerts: BackendAlertResult[]): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    if (!hasRestrictions) return 'unknown';
    if (!backendAlerts || backendAlerts.length === 0) return 'unknown';

    const hasBlock = backendAlerts.some(a => a.status === 'contem');
    const hasWarning = backendAlerts.some(a => a.status === 'risco_potencial');
    const allSafe = backendAlerts.every(a => a.status === 'seguro');

    if (hasBlock) return 'incompatible';
    if (hasWarning) return 'moderate';
    if (allSafe) return 'good';
    return 'unknown';
  }, [hasRestrictions]);

  /**
   * Verifica conflitos de uma refeição (mantido para compatibilidade)
   */
  const checkMealConflicts = useCallback((ingredients: unknown): ConflictResult => {
    const compatibility = getMealCompatibility(ingredients);
    return {
      hasConflict: compatibility === 'incompatible',
      conflicts: [],
      isSafe: compatibility === 'good'
    };
  }, [getMealCompatibility]);

  return {
    // Funções principais
    getUserRestrictions,
    getMealCompatibility,
    processBackendAlerts,
    getMealCompatibilityFromAlerts,
    checkMealConflicts,
    
    // Estado
    hasRestrictions,
    isLoading: profileContext.isLoading || labelsLoading || !mappingsLoaded,
    hasProfile: hasRestrictions
  };
}
