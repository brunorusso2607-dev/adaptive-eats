import { useCallback, useMemo } from 'react';
import { useUserProfileContext } from './useUserProfileContext';

// ============================================
// SINCRONIZADO COM: supabase/functions/_shared/recipeConfig.ts
// Esta é a fonte única de verdade para validação de compatibilidade
// Qualquer alteração aqui deve refletir no backend também
// ============================================

interface IntoleranceMapping {
  forbidden: string[];
  safeKeywords: string[];
}

// EXCEÇÕES SEGURAS GLOBAIS - ingredientes que parecem problemáticos mas são seguros
const GLOBAL_SAFE_EXCEPTIONS = [
  "leite de coco", "leite de amendoas", "leite de amêndoas", "leite de aveia", "leite vegetal",
  "queijo vegano", "manteiga vegana", "iogurte vegetal", "creme de coco",
  "nata vegetal", "leite de soja", "leite de arroz", "cream cheese vegano",
  "creme de leite de coco", "iogurte de coco", "manteiga de coco",
  "leite de castanha", "leite de macadamia", "leite de quinoa",
  "sem lactose", "zero lactose", "sem gluten", "gluten free",
  "sem acucar", "zero acucar", "diet", "sugar free",
  "maionese vegana", "requeijao vegano", "chantilly vegano"
];

// ============================================
// MAPEAMENTO EXPANDIDO DE INGREDIENTES PROIBIDOS
// Sincronizado com FORBIDDEN_INGREDIENTS do recipeConfig.ts
// ============================================
const INTOLERANCE_INGREDIENTS: Record<string, IntoleranceMapping> = {
  lactose: {
    forbidden: [
      // Leite e derivados diretos
      "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em po",
      "leite condensado", "leite evaporado", "leite de vaca", "leite de cabra", "leite de bufala",
      // Queijos
      "queijo", "queijo mucaarela", "queijo mussarela", "queijo parmesao", "queijo prato",
      "queijo coalho", "queijo minas", "queijo cottage", "queijo ricota", "queijo gorgonzola",
      "queijo provolone", "queijo brie", "queijo camembert", "queijo cheddar", "queijo gouda",
      "queijo gruyere", "queijo feta", "queijo roquefort", "queijo mascarpone", "queijo cream cheese",
      "queijo pecorino", "queijo manchego", "queijo emmental", "queijo suico", "cream cheese",
      "mussarela", "parmesao", "prato", "coalho", "cottage", "ricota", "gorgonzola",
      "provolone", "brie", "camembert", "cheddar", "gouda", "feta", "mascarpone",
      // Creme e manteiga
      "manteiga", "manteiga com sal", "manteiga sem sal", "manteiga ghee", "ghee",
      "creme de leite", "creme de leite fresco", "nata", "chantilly", "chantili",
      "creme chantilly", "creme fraiche", "creme azedo", "sour cream",
      // Iogurte
      "iogurte", "iogurte natural", "iogurte grego", "iogurte integral", "iogurte desnatado",
      "coalhada", "kefir", "leite fermentado", "yakult",
      // Requeijão e similares
      "requeijao", "requeijao cremoso", "requeijao light", "catupiry", "polenguinho",
      // Produtos processados com lactose
      "whey", "whey protein", "proteina do soro do leite", "caseina", "caseinato",
      "lactose", "soro de leite", "lactoalbumina", "lactoglobulina",
      // Doces com lactose
      "doce de leite", "brigadeiro", "leite moca", "pudim de leite",
      // Outros
      "fondue", "bechamel", "molho branco", "molho quatro queijos", "molho alfredo"
    ],
    safeKeywords: [
      "leite de coco", "leite de amendoa", "leite de aveia", "leite de soja",
      "leite de arroz", "leite vegetal", "creme de coco", "iogurte vegetal",
      "iogurte de coco", "queijo vegano", "manteiga vegana", "sem lactose",
      "zero lactose", "leite de castanha", "vegano", "vegan", "plant-based"
    ]
  },
  gluten: {
    forbidden: [
      // Trigo e derivados
      "trigo", "farinha de trigo", "farinha branca", "farinha integral", "farinha de rosca",
      "farelo de trigo", "germen de trigo", "trigo integral", "trigo sarraceno",
      // Pães
      "pao", "pao frances", "pao de forma", "pao integral", "pao sirio", "pao arabe",
      "pao ciabatta", "pao italiano", "pao de leite", "torrada",
      "crouton", "bruschetta", "focaccia", "bagel", "brioche",
      // Massas
      "macarrao", "espaguete", "penne", "fusilli", "farfalle", "lasanha", "nhoque",
      "ravioli", "tortellini", "capeletti", "talharim", "fettuccine", "massa",
      "massa folhada", "massa de pizza", "massa de torta", "massa de pastel",
      // Cereais
      "aveia", "aveia em flocos", "farelo de aveia", "cevada", "centeio", "malte",
      "cerveja", "uisque", "whisky",
      // Biscoitos e bolos
      "biscoito", "bolacha", "cookie", "bolo", "bolo pronto", "mistura para bolo",
      "wafer", "pretzel", "cream cracker",
      // Empanados
      "empanado", "milanesa", "breading", "nuggets", "croquete",
      // Molhos
      "molho shoyu", "shoyu", "molho de soja industrializado", "molho teriyaki",
      "molho ingles", "molho barbecue industrializado",
      // Outros
      "seitan", "bulgur", "cuscuz de trigo", "semolina", "semola"
    ],
    safeKeywords: [
      "sem gluten", "gluten free", "farinha de arroz", "farinha de amendoa",
      "farinha de coco", "farinha de mandioca", "polvilho", "tapioca",
      "goma de tapioca", "farinha de aveia sem gluten", "pao sem gluten"
    ]
  },
  amendoim: {
    forbidden: [
      "amendoim", "amendoins", "pasta de amendoim", "manteiga de amendoim", "pacoca",
      "oleo de amendoim", "farinha de amendoim", "pe de moleque"
    ],
    safeKeywords: ["sem amendoim"]
  },
  frutos_mar: {
    forbidden: [
      // Peixes
      "peixe", "salmao", "atum", "tilapia", "bacalhau", "sardinha", "anchova",
      "truta", "robalo", "dourado", "pescada", "merluza", "linguado", "badejo",
      "cavala", "arenque", "carpa", "pacu", "pintado", "surubim", "pirarucu",
      // Frutos do mar
      "camarao", "camaroes", "lagosta", "lagostim", "caranguejo", "siri",
      "lula", "polvo", "mexilhao", "marisco", "ostra", "vieira", "berbigao",
      "sururu", "vongole",
      // Derivados
      "oleo de peixe", "molho de peixe", "molho de ostra", "pasta de anchova",
      "caldo de peixe", "fumet"
    ],
    safeKeywords: []
  },
  ovo: {
    forbidden: [
      "ovo", "ovos", "ovo inteiro", "clara de ovo", "gema de ovo", "ovo caipira",
      "ovo de codorna", "ovo cozido", "ovo frito", "ovo mexido", "omelete",
      "fritada", "gemada", "merengue", "suspiro", "clara em neve",
      // Produtos com ovo
      "maionese", "aioli", "molho holandes", "molho bearnaise", "carbonara",
      "massa fresca com ovo", "panqueca", "waffle", "brioche", "pao de lo"
    ],
    safeKeywords: ["sem ovo", "vegano", "vegan", "maionese vegana"]
  },
  soja: {
    forbidden: [
      "soja", "grao de soja", "proteina de soja", "proteina texturizada de soja",
      "tofu", "tofu firme", "tofu macio", "tofu defumado",
      "leite de soja", "bebida de soja", "iogurte de soja",
      "edamame", "misso", "molho shoyu", "shoyu", "tamari",
      "tempeh", "natto", "oleo de soja", "lecitina de soja"
    ],
    safeKeywords: ["sem soja"]
  },
  castanhas: {
    forbidden: [
      "castanha", "castanhas", "castanha de caju", "castanha do para", "castanha do brasil",
      "nozes", "noz", "noz peca", "noz moscada",
      "amendoa", "amendoas", "farinha de amendoa", "leite de amendoa",
      "avela", "avelas", "creme de avela", "nutella",
      "pistache", "pistaches", "macadamia", "pinhao", "pinhoes",
      "pasta de castanha", "manteiga de amendoa", "manteiga de castanha"
    ],
    safeKeywords: ["sem castanha", "sem nozes"]
  },
  acucar: {
    forbidden: [
      // Açúcares diretos
      "acucar", "acucar refinado", "acucar cristal", "acucar mascavo", "acucar demerara",
      "acucar de confeiteiro", "acucar invertido", "acucar de coco",
      // Xaropes
      "mel", "melado", "melaco", "xarope de milho", "xarope de glicose", "xarope de agave",
      "xarope de bordo", "maple syrup", "xarope de frutose",
      // Outros doces
      "rapadura", "caramelo", "calda", "geleia", "compota", "doce",
      // Adoçantes calóricos
      "maltodextrina", "dextrose", "frutose"
    ],
    safeKeywords: ["sem acucar", "zero acucar", "diet", "sugar free", "adocante"]
  }
};

// ============================================
// INGREDIENTES PROIBIDOS POR DIETA
// Sincronizado com DIETARY_FORBIDDEN_INGREDIENTS do recipeConfig.ts
// ============================================
const DIETARY_FORBIDDEN: Record<string, string[]> = {
  vegetariana: [
    // Carnes vermelhas
    "carne", "carne bovina", "carne de boi", "bife", "picanha", "file mignon", "alcatra", "patinho",
    "acem", "musculo", "costela bovina", "carne moida", "hamburguer de carne", "carne seca",
    "charque", "carne de porco", "lombo", "pernil", "bacon", "panceta", "linguica de porco",
    "salsicha", "presunto", "mortadela", "copa", "salame", "calabresa",
    "carne de cordeiro", "cordeiro", "carneiro", "cabrito",
    // Aves
    "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "frango desfiado",
    "carne de frango", "peru", "pato", "chester", "galinha", "canja de galinha",
    // Peixes
    "peixe", "salmao", "tilapia", "bacalhau", "atum", "sardinha", "pescada", "robalo", "dourado",
    "namorado", "linguado", "merluza", "truta", "pacu", "pintado", "surubim", "pirarucu",
    // Frutos do mar
    "camarao", "lagosta", "caranguejo", "siri", "lula", "polvo", "mexilhao", "ostra", "vieira",
    "marisco", "frutos do mar",
    // Produtos derivados de carne
    "caldo de carne", "caldo de galinha", "caldo de frango", "extrato de carne", "gelatina",
    "banha", "gordura de porco", "toucinho"
  ],
  vegana: [
    // Carnes (tudo de vegetariana)
    "carne", "carne bovina", "carne de boi", "bife", "picanha", "file mignon", "alcatra", "patinho",
    "acem", "musculo", "costela bovina", "carne moida", "hamburguer de carne", "carne seca",
    "charque", "carne de porco", "lombo", "pernil", "bacon", "panceta", "linguica de porco",
    "salsicha", "presunto", "mortadela", "copa", "salame", "calabresa",
    "carne de cordeiro", "cordeiro", "carneiro", "cabrito",
    "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "frango desfiado",
    "peru", "pato", "chester", "galinha",
    "peixe", "salmao", "tilapia", "bacalhau", "atum", "sardinha", "pescada", "robalo",
    "camarao", "lagosta", "caranguejo", "siri", "lula", "polvo", "mexilhao", "ostra", "vieira",
    "caldo de carne", "caldo de galinha", "caldo de frango", "extrato de carne", "gelatina",
    "banha", "gordura de porco", "toucinho",
    // Laticínios
    "leite", "leite integral", "leite desnatado", "leite condensado", "leite em po",
    "queijo", "queijo mucaarela", "queijo parmesao", "queijo prato", "queijo cottage", "queijo ricota",
    "cream cheese", "requeijao", "catupiry",
    "manteiga", "creme de leite", "nata", "chantilly", "iogurte", "coalhada", "kefir",
    "whey", "whey protein", "caseina", "soro de leite",
    // Ovos
    "ovo", "ovos", "clara de ovo", "gema de ovo", "ovo cozido", "ovo frito", "omelete",
    "maionese", "maionese tradicional",
    // Mel e derivados
    "mel", "mel de abelha", "propolis", "geleia real"
  ],
  pescetariana: [
    // Apenas carnes vermelhas e aves
    "carne", "carne bovina", "carne de boi", "bife", "picanha", "file mignon", "alcatra", "patinho",
    "acem", "musculo", "costela bovina", "carne moida", "hamburguer de carne", "carne seca",
    "charque", "carne de porco", "lombo", "pernil", "bacon", "panceta", "linguica de porco",
    "salsicha", "presunto", "mortadela", "copa", "salame", "calabresa",
    "carne de cordeiro", "cordeiro", "carneiro", "cabrito",
    "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango", "frango desfiado",
    "peru", "pato", "chester", "galinha",
    "caldo de carne", "caldo de galinha", "caldo de frango",
    "banha", "gordura de porco", "toucinho"
  ],
  low_carb: [
    // Carboidratos refinados e açúcares
    "acucar", "acucar refinado", "acucar mascavo", "acucar demerara", "acucar cristal",
    "mel", "melado", "xarope de milho", "xarope de glicose", "xarope de agave",
    "pao", "pao frances", "pao de forma", "pao integral", "torrada",
    "arroz branco", "arroz", "macarrao", "espaguete", "massa", "lasanha",
    "batata", "batata inglesa", "batata frita", "pure de batata",
    "farinha de trigo", "farinha branca", "amido de milho", "maisena",
    "biscoito", "bolacha", "bolo", "doce", "sobremesa acucarada",
    "refrigerante", "suco industrializado", "suco de caixinha",
    "cerveja", "bebida alcoolica doce"
  ],
  cetogenica: [
    // Ainda mais restritivo que low_carb
    "acucar", "acucar refinado", "acucar mascavo", "acucar demerara", "mel", "melado",
    "xarope de milho", "xarope de glicose", "xarope de agave",
    "pao", "pao frances", "pao de forma", "torrada", "croissant", "bolo",
    "arroz", "arroz branco", "arroz integral", "macarrao", "massa", "lasanha",
    "batata", "batata inglesa", "batata doce", "mandioca", "macaxeira", "aipim",
    "inhame", "cara", "batata baroa", "mandioquinha",
    "farinha de trigo", "farinha", "amido de milho", "maisena", "polvilho",
    "feijao", "feijao preto", "feijao carioca", "lentilha", "grao de bico", "ervilha",
    "milho", "pipoca", "canjica",
    "banana", "manga", "uva", "abacaxi", "melancia", "frutas doces",
    "biscoito", "bolacha", "doce", "sobremesa",
    "refrigerante", "suco de fruta", "suco industrializado"
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

      // PRIMEIRO: Verifica exceções globais seguras (ex: leite de coco, queijo vegano)
      const isGlobalSafe = GLOBAL_SAFE_EXCEPTIONS.some(safe => 
        normalizedItem.includes(normalizeText(safe))
      );
      
      // Se o ingrediente é globalmente seguro, pula toda a verificação
      if (isGlobalSafe) continue;

      // 1. Verifica intolerâncias do usuário
      const userIntolerances = profileContext.intolerances || [];
      for (const intolerance of userIntolerances) {
        if (intolerance === "nenhuma" || !intolerance) continue;
        
        const mapping = INTOLERANCE_INGREDIENTS[intolerance];
        if (!mapping) continue;

        // Verifica se o ingrediente tem uma keyword de segurança específica
        const isSafe = mapping.safeKeywords.some(safe => 
          normalizedItem.includes(normalizeText(safe))
        );
        
        // Se tem keyword de segurança, pula este ingrediente para esta intolerância
        if (isSafe) continue;

        // Verifica ingredientes proibidos
        for (const forbidden of mapping.forbidden) {
          const normalizedForbidden = normalizeText(forbidden);
          // Match mais preciso: verifica se o termo proibido está no ingrediente
          // Mas não o contrário (evita que "leite" match "leite de coco")
          if (normalizedItem.includes(normalizedForbidden)) {
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
          if (normalizedItem.includes(normalizedForbidden)) {
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
