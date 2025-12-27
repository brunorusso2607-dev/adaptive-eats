import { useCallback, useMemo } from 'react';
import { useUserProfileContext } from './useUserProfileContext';

// Mapeamento de intolerâncias para ingredientes problemáticos
const INTOLERANCE_INGREDIENTS: Record<string, string[]> = {
  lactose: [
    "leite", "queijo", "iogurte", "manteiga", "creme de leite", "nata", "requeijão",
    "cream cheese", "ricota", "mussarela", "muçarela", "parmesão", "gorgonzola",
    "provolone", "coalho", "cottage", "mascarpone", "brie", "camembert", "emmental",
    "cheddar", "gouda", "feta", "chantilly", "whey", "soro de leite", "kefir",
    "coalhada", "catupiry", "leite condensado", "doce de leite", "ghee", "caseína",
    "molho branco", "molho alfredo", "bechamel", "fondue"
  ],
  gluten: [
    "trigo", "farinha de trigo", "farinha branca", "pão", "macarrão", "espaguete",
    "massa", "lasanha", "biscoito", "bolacha", "bolo", "aveia", "cevada", "centeio",
    "cerveja", "molho shoyu", "shoyu", "seitan", "bulgur", "cuscuz", "semolina",
    "crouton", "empanado", "milanesa", "farinha de rosca", "torrada", "croissant",
    "pizza", "pastel", "penne", "fusilli", "talharim", "fettuccine", "ravióli"
  ],
  amendoim: [
    "amendoim", "pasta de amendoim", "manteiga de amendoim", "paçoca", "óleo de amendoim"
  ],
  frutos_mar: [
    "camarão", "lagosta", "caranguejo", "siri", "lula", "polvo", "mexilhão", "ostra",
    "vieira", "marisco", "peixe", "salmão", "atum", "tilápia", "bacalhau", "sardinha",
    "anchova", "truta", "robalo", "pescada", "merluza"
  ],
  ovo: [
    "ovo", "ovos", "clara", "gema", "omelete", "fritada", "maionese", "merengue"
  ],
  soja: [
    "soja", "tofu", "leite de soja", "molho shoyu", "shoyu", "tempeh", "missô",
    "edamame", "proteína de soja"
  ],
  castanhas: [
    "castanha", "nozes", "noz", "amêndoa", "avelã", "pistache", "macadâmia", "pinhão",
    "caju", "castanha de caju", "castanha do pará"
  ],
  acucar: [
    "açúcar", "mel", "melado", "xarope", "rapadura", "caramelo", "doce", "açúcar mascavo",
    "açúcar demerara", "açúcar refinado"
  ]
};

// Ingredientes proibidos por dieta
const DIETARY_FORBIDDEN: Record<string, string[]> = {
  vegetariana: [
    "carne", "frango", "peixe", "camarão", "bacon", "presunto", "salsicha", "linguiça",
    "bife", "picanha", "alcatra", "filé", "cordeiro", "porco", "peru", "pato",
    "atum", "salmão", "sardinha", "lagosta", "caranguejo", "lula", "polvo"
  ],
  vegana: [
    // Todos os de vegetariana +
    "carne", "frango", "peixe", "camarão", "bacon", "presunto", "salsicha", "linguiça",
    "bife", "picanha", "alcatra", "filé", "cordeiro", "porco", "peru", "pato",
    "atum", "salmão", "sardinha", "lagosta", "caranguejo", "lula", "polvo",
    // Laticínios
    "leite", "queijo", "iogurte", "manteiga", "creme de leite", "requeijão",
    "cream cheese", "ricota", "mussarela", "parmesão", "chantilly", "whey", "kefir",
    // Ovos
    "ovo", "ovos", "clara", "gema", "maionese",
    // Mel
    "mel"
  ],
  pescetariana: [
    "carne", "frango", "bacon", "presunto", "salsicha", "linguiça", "bife", "picanha",
    "alcatra", "filé", "cordeiro", "porco", "peru", "pato"
  ],
  low_carb: [
    "açúcar", "pão", "arroz branco", "macarrão", "massa", "batata inglesa", "farinha de trigo"
  ],
  cetogenica: [
    "açúcar", "pão", "arroz", "macarrão", "massa", "batata", "feijão", "lentilha",
    "grão de bico", "milho", "farinha de trigo"
  ]
};

// Labels amigáveis
const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "Lactose",
  gluten: "Glúten",
  amendoim: "Amendoim",
  frutos_mar: "Frutos do Mar",
  ovo: "Ovo",
  soja: "Soja",
  castanhas: "Castanhas",
  acucar: "Açúcar"
};

const DIETARY_LABELS: Record<string, string> = {
  vegetariana: "Carne/Peixe",
  vegana: "Produto Animal",
  pescetariana: "Carne",
  low_carb: "Alto Carboidrato",
  cetogenica: "Carboidrato"
};

interface Ingredient {
  item: string;
  quantity?: string | number;
  unit?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'intolerance' | 'dietary' | 'excluded';
    key: string;
    label: string;
    ingredient: string;
    matchedTerm: string;
  }>;
  isSafe: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function useDynamicDietaryCompatibility() {
  const profileContext = useUserProfileContext();
  
  // Verifica se o usuário tem restrições configuradas
  const hasRestrictions = useMemo(() => {
    const hasIntolerances = (profileContext.intolerances?.length ?? 0) > 0 && 
      !profileContext.intolerances?.includes("nenhuma");
    const hasExcluded = (profileContext.excluded_ingredients?.length ?? 0) > 0;
    const hasDietaryRestriction = profileContext.dietary_preference && 
      profileContext.dietary_preference !== "comum" &&
      profileContext.dietary_preference !== "flexitariana";
    return hasIntolerances || hasExcluded || hasDietaryRestriction;
  }, [profileContext.intolerances, profileContext.excluded_ingredients, profileContext.dietary_preference]);

  // Função principal de checagem de conflitos
  const checkMealConflicts = useCallback((ingredients: Ingredient[] | unknown): ConflictResult => {
    if (!ingredients) {
      return { hasConflict: false, conflicts: [], isSafe: false };
    }

    const ingredientList = Array.isArray(ingredients) ? ingredients : [];
    const conflicts: ConflictResult['conflicts'] = [];

    // Percorre cada ingrediente da receita
    for (const ing of ingredientList) {
      const itemName = typeof ing === "string" ? ing : ing?.item;
      if (!itemName) continue;

      const normalizedItem = normalizeText(itemName);

      // 1. Verifica intolerâncias do usuário
      const userIntolerances = profileContext.intolerances || [];
      for (const intolerance of userIntolerances) {
        if (intolerance === "nenhuma" || !intolerance) continue;
        
        const forbiddenIngredients = INTOLERANCE_INGREDIENTS[intolerance] || [];
        for (const forbidden of forbiddenIngredients) {
          const normalizedForbidden = normalizeText(forbidden);
          if (normalizedItem.includes(normalizedForbidden) || 
              normalizedForbidden.includes(normalizedItem)) {
            // Evitar duplicatas
            const exists = conflicts.some(c => 
              c.type === 'intolerance' && 
              c.key === intolerance && 
              c.ingredient === itemName
            );
            if (!exists) {
              conflicts.push({
                type: 'intolerance',
                key: intolerance,
                label: INTOLERANCE_LABELS[intolerance] || intolerance,
                ingredient: itemName,
                matchedTerm: forbidden
              });
            }
            break;
          }
        }
      }

      // 2. Verifica preferência dietética
      const dietaryPref = profileContext.dietary_preference;
      if (dietaryPref && dietaryPref !== "comum" && dietaryPref !== "flexitariana") {
        const forbiddenByDiet = DIETARY_FORBIDDEN[dietaryPref] || [];
        for (const forbidden of forbiddenByDiet) {
          const normalizedForbidden = normalizeText(forbidden);
          if (normalizedItem.includes(normalizedForbidden) || 
              normalizedForbidden.includes(normalizedItem)) {
            const exists = conflicts.some(c => 
              c.type === 'dietary' && 
              c.key === dietaryPref && 
              c.ingredient === itemName
            );
            if (!exists) {
              conflicts.push({
                type: 'dietary',
                key: dietaryPref,
                label: DIETARY_LABELS[dietaryPref] || dietaryPref,
                ingredient: itemName,
                matchedTerm: forbidden
              });
            }
            break;
          }
        }
      }

      // 3. Verifica ingredientes excluídos manualmente
      const excludedList = profileContext.excluded_ingredients || [];
      for (const excluded of excludedList) {
        const normalizedExcluded = normalizeText(excluded);
        if (normalizedItem.includes(normalizedExcluded) || 
            normalizedExcluded.includes(normalizedItem)) {
          const exists = conflicts.some(c => 
            c.type === 'excluded' && 
            c.matchedTerm === excluded && 
            c.ingredient === itemName
          );
          if (!exists) {
            conflicts.push({
              type: 'excluded',
              key: `excluded_${excluded}`,
              label: excluded,
              ingredient: itemName,
              matchedTerm: excluded
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      isSafe: hasRestrictions && conflicts.length === 0
    };
  }, [profileContext.intolerances, profileContext.dietary_preference, profileContext.excluded_ingredients, hasRestrictions]);

  // Classifica a compatibilidade de uma refeição
  const getMealCompatibility = useCallback((ingredients: Ingredient[] | unknown): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    if (!hasRestrictions) return 'unknown';
    
    const result = checkMealConflicts(ingredients);
    
    if (result.isSafe) return 'good';
    if (result.conflicts.length === 0) return 'unknown';
    
    // Se tem conflito de intolerância ou excluído = incompatível
    const hasHardConflict = result.conflicts.some(c => 
      c.type === 'intolerance' || c.type === 'excluded'
    );
    
    if (hasHardConflict) return 'incompatible';
    
    // Se tem apenas conflito de dieta = moderado (depende da rigidez da pessoa)
    return 'moderate';
  }, [checkMealConflicts, hasRestrictions]);

  return {
    checkMealConflicts,
    getMealCompatibility,
    hasRestrictions,
    isLoading: profileContext.isLoading,
    hasProfile: hasRestrictions
  };
}
