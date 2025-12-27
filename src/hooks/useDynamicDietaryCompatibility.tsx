import { useCallback, useMemo } from 'react';
import { useUserProfileContext } from './useUserProfileContext';

// Mapeamento de intolerâncias para ingredientes problemáticos
// Com keywords de segurança para evitar falsos positivos (ex: "leite de coco" não é lactose)
interface IntoleranceMapping {
  forbidden: string[];
  safeKeywords: string[];
}

const INTOLERANCE_INGREDIENTS: Record<string, IntoleranceMapping> = {
  lactose: {
    forbidden: [
      "leite integral", "leite desnatado", "leite em pó", "leite pasteurizado",
      "queijo", "iogurte", "manteiga", "creme de leite", "nata", "requeijão",
      "cream cheese", "ricota", "mussarela", "muçarela", "parmesão", "gorgonzola",
      "provolone", "coalho", "cottage", "mascarpone", "brie", "camembert", "emmental",
      "cheddar", "gouda", "feta", "chantilly", "whey", "soro de leite", "kefir",
      "coalhada", "catupiry", "leite condensado", "doce de leite", "caseína",
      "molho branco", "molho alfredo", "bechamel", "fondue"
    ],
    safeKeywords: [
      "sem lactose", "zero lactose", "leite de coco", "leite de amendoa", "leite de aveia",
      "leite de arroz", "leite vegetal", "creme de coco", "iogurte vegetal", "iogurte de coco",
      "queijo vegano", "manteiga vegana", "leite de castanha", "leite de soja"
    ]
  },
  gluten: {
    forbidden: [
      "trigo", "farinha de trigo", "farinha branca", "pao", "macarrao", "espaguete",
      "massa de lasanha", "biscoito", "bolacha", "bolo", "cevada", "centeio",
      "cerveja", "molho shoyu", "shoyu", "seitan", "bulgur", "cuscuz", "semolina",
      "crouton", "empanado", "milanesa", "farinha de rosca", "torrada", "croissant",
      "pizza", "pastel", "penne", "fusilli", "talharim", "fettuccine", "ravioli"
    ],
    safeKeywords: [
      "sem gluten", "gluten free", "farinha de arroz", "farinha de amendoa",
      "farinha de coco", "farinha de mandioca", "polvilho", "tapioca", "goma de tapioca"
    ]
  },
  amendoim: {
    forbidden: [
      "amendoim", "pasta de amendoim", "manteiga de amendoim", "pacoca", "oleo de amendoim"
    ],
    safeKeywords: ["sem amendoim"]
  },
  frutos_mar: {
    forbidden: [
      "camarao", "lagosta", "caranguejo", "siri", "lula", "polvo", "mexilhao", "ostra",
      "vieira", "marisco", "salmao", "atum", "tilapia", "bacalhau", "sardinha",
      "anchova", "truta", "robalo", "pescada", "merluza", "peixe"
    ],
    safeKeywords: []
  },
  ovo: {
    forbidden: [
      "ovo", "ovos", "clara de ovo", "gema", "omelete", "fritada", "maionese", "merengue"
    ],
    safeKeywords: ["sem ovo", "vegano", "vegan"]
  },
  soja: {
    forbidden: [
      "soja", "tofu", "leite de soja", "molho shoyu", "shoyu", "tempeh", "misso",
      "edamame", "proteina de soja"
    ],
    safeKeywords: ["sem soja"]
  },
  castanhas: {
    forbidden: [
      "castanha", "nozes", "noz", "amendoa", "avela", "pistache", "macadamia", "pinhao",
      "caju", "castanha de caju", "castanha do para"
    ],
    safeKeywords: ["sem castanha", "sem nozes"]
  },
  acucar: {
    forbidden: [
      "acucar", "mel", "melado", "xarope", "rapadura", "caramelo", "acucar mascavo",
      "acucar demerara", "acucar refinado"
    ],
    safeKeywords: ["sem acucar", "zero acucar", "diet", "sugar free"]
  }
};

// Ingredientes proibidos por dieta
const DIETARY_FORBIDDEN: Record<string, string[]> = {
  vegetariana: [
    "carne", "frango", "peixe", "camarao", "bacon", "presunto", "salsicha", "linguica",
    "bife", "picanha", "alcatra", "file", "cordeiro", "porco", "peru", "pato",
    "atum", "salmao", "sardinha", "lagosta", "caranguejo", "lula", "polvo"
  ],
  vegana: [
    "carne", "frango", "peixe", "camarao", "bacon", "presunto", "salsicha", "linguica",
    "bife", "picanha", "alcatra", "file", "cordeiro", "porco", "peru", "pato",
    "atum", "salmao", "sardinha", "lagosta", "caranguejo", "lula", "polvo",
    "leite", "queijo", "iogurte", "manteiga", "creme de leite", "requeijao",
    "cream cheese", "ricota", "mussarela", "parmesao", "chantilly", "whey", "kefir",
    "ovo", "ovos", "clara", "gema", "maionese", "mel"
  ],
  pescetariana: [
    "carne", "frango", "bacon", "presunto", "salsicha", "linguica", "bife", "picanha",
    "alcatra", "file", "cordeiro", "porco", "peru", "pato"
  ],
  low_carb: [
    "acucar", "pao", "arroz branco", "macarrao", "massa", "batata inglesa", "farinha de trigo"
  ],
  cetogenica: [
    "acucar", "pao", "arroz", "macarrao", "massa", "batata", "feijao", "lentilha",
    "grao de bico", "milho", "farinha de trigo"
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
        
        const mapping = INTOLERANCE_INGREDIENTS[intolerance];
        if (!mapping) continue;

        // PRIMEIRO: Verifica se o ingrediente tem uma keyword de segurança
        const isSafe = mapping.safeKeywords.some(safe => 
          normalizedItem.includes(normalizeText(safe))
        );
        
        // Se tem keyword de segurança, pula este ingrediente para esta intolerância
        if (isSafe) continue;

        // Verifica ingredientes proibidos
        for (const forbidden of mapping.forbidden) {
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