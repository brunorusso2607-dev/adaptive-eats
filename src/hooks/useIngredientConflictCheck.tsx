import { useMemo } from "react";

// Mapeamento de ingredientes conflitantes para cada restrição
// Dinâmico: qualquer nova restrição adicionada ao perfil será validada

const LACTOSE_INGREDIENTS = [
  "leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite em pó",
  "leite condensado", "leite evaporado", "leite de cabra", "leite fermentado",
  "creme de leite", "creme de leite fresco", "chantilly", "nata", "coalhada",
  "iogurte", "iogurte natural", "iogurte grego", "iogurte desnatado", "iogurte integral",
  "iogurte de morango", "iogurte de frutas", "kefir", "leitelho", "buttermilk",
  "manteiga", "manteiga com sal", "manteiga sem sal",
  "queijo", "queijo mussarela", "mussarela", "mussarela de búfala", "queijo parmesão", "parmesão",
  "queijo coalho", "queijo minas", "queijo minas frescal", "queijo cheddar", "queijo prato",
  "queijo provolone", "provolone", "queijo gorgonzola", "gorgonzola", "queijo brie", "brie",
  "queijo camembert", "queijo roquefort", "queijo gruyère", "queijo emmental",
  "queijo cottage", "cottage", "queijo ricota", "ricota", "queijo feta", "feta",
  "queijo de cabra", "queijo colonial", "requeijão", "requeijão cremoso", "cream cheese",
  "catupiry", "queijo cremoso", "queijo ralado", "burrata", "mascarpone", "queijo azul",
  "chocolate ao leite", "achocolatado", "sorvete", "pudim", "doce de leite",
];

const GLUTEN_INGREDIENTS = [
  "farinha de trigo", "farinha de trigo integral", "trigo", "trigo para quibe",
  "pão", "pão francês", "pão de forma", "pão integral", "pão de leite", "pão sírio",
  "pão árabe", "pão ciabatta", "pão italiano", "pão brioche", "baguete", "croissant",
  "torrada", "biscoito", "bolacha", "cream cracker", "biscoito água e sal",
  "macarrão", "macarrão espaguete", "espaguete", "macarrão penne", "penne",
  "macarrão fusilli", "macarrão farfalle", "macarrão talharim", "talharim",
  "macarrão fettuccine", "lasanha", "massa de lasanha", "canelone", "ravióli",
  "capeletti", "tortellini", "nhoque", "gnocchi", "massa folhada", "massa de pastel",
  "massa de pizza", "massa de torta", "massa de empada", "miojo", "macarrão instantâneo",
  "cerveja", "cevada", "centeio", "aveia", "aveia em flocos", "farelo de aveia",
  "bulgur", "triguilho", "cuscuz", "semolina", "seitan",
  "molho de soja", "shoyu", // muitos contêm trigo
];

const SUGAR_INGREDIENTS = [
  "açúcar", "açúcar refinado", "açúcar cristal", "açúcar mascavo", "açúcar demerara",
  "açúcar de confeiteiro", "mel", "mel silvestre", "melado", "melado de cana",
  "xarope de bordo", "maple syrup", "xarope de agave", "xarope de milho", "glucose",
  "leite condensado", "doce de leite", "chocolate ao leite", "chocolate branco",
  "achocolatado", "nutella", "gotas de chocolate", "refrigerante", "suco de caixinha",
];

const PEANUT_INGREDIENTS = [
  "amendoim", "amendoim torrado", "pasta de amendoim", "manteiga de amendoim",
  "paçoca", "pé de moleque", "óleo de amendoim",
];

const SEAFOOD_INGREDIENTS = [
  "peixe", "filé de peixe", "salmão", "filé de salmão", "salmão defumado",
  "atum", "atum em lata", "atum fresco", "tilápia", "filé de tilápia", "bacalhau",
  "sardinha", "sardinha em lata", "merluza", "pescada", "robalo", "dourado",
  "pintado", "tambaqui", "pacu", "truta", "linguado", "badejo", "corvina",
  "camarão", "camarão rosa", "camarão cinza", "camarão seco", "camarão descascado",
  "lagosta", "lagostim", "lula", "anéis de lula", "polvo", "marisco", "mexilhão",
  "ostra", "vieira", "siri", "caranguejo", "casquinha de siri", "sururu",
  "molho de peixe", "fish sauce", "molho de ostra",
];

const EGG_INGREDIENTS = [
  "ovo", "ovos", "ovo de galinha", "ovo caipira", "ovo de codorna",
  "gema", "clara de ovo", "ovo cozido", "ovo frito", "omelete",
  "maionese", // geralmente contém ovo
];

// Ingredientes de origem animal (para veganos)
const ANIMAL_INGREDIENTS = [
  // Carnes
  "carne", "carne moída", "carne bovina", "patinho", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "coxão mole", "coxão duro", "lagarto", "paleta",
  "carne seca", "carne de sol", "charque", "bife", "fígado bovino",
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango",
  "frango desfiado", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  "carne de porco", "lombo", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo",
  "linguiça", "linguiça calabresa", "linguiça toscana", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "presunto", "copa", "salame", "mortadela", "tender",
  // Peixes e frutos do mar
  ...SEAFOOD_INGREDIENTS,
  // Ovos
  ...EGG_INGREDIENTS,
  // Laticínios
  ...LACTOSE_INGREDIENTS,
  // Mel (veganos não consomem)
  "mel", "mel silvestre", "mel de abelha",
  // Gelatina (origem animal)
  "gelatina", "gelatina em pó", "gelatina em folha",
];

// Ingredientes de carne (para vegetarianos)
const MEAT_INGREDIENTS = [
  // Carnes bovinas
  "carne", "carne moída", "carne bovina", "patinho", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "coxão mole", "coxão duro", "lagarto", "paleta",
  "carne seca", "carne de sol", "charque", "bife", "fígado bovino", "língua bovina",
  // Aves
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango",
  "frango desfiado", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  // Suínos
  "carne de porco", "lombo", "lombo de porco", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo",
  "linguiça", "linguiça calabresa", "linguiça toscana", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "presunto", "copa", "salame", "mortadela", "tender",
  // Peixes e frutos do mar
  ...SEAFOOD_INGREDIENTS,
];

export type ConflictType = {
  ingredient: string;
  restriction: string;
  restrictionLabel: string;
};

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
};

// Mapeamento dinâmico de restrições para ingredientes
const getRestrictionIngredients = (restriction: string): string[] => {
  const mapping: Record<string, string[]> = {
    lactose: LACTOSE_INGREDIENTS,
    gluten: GLUTEN_INGREDIENTS,
    acucar: SUGAR_INGREDIENTS,
    amendoim: PEANUT_INGREDIENTS,
    frutos_mar: SEAFOOD_INGREDIENTS,
    ovo: EGG_INGREDIENTS,
  };
  return mapping[restriction] || [];
};

// Labels amigáveis para as restrições
const getRestrictionLabel = (restriction: string): string => {
  const labels: Record<string, string> = {
    lactose: "intolerante à lactose",
    gluten: "intolerante ao glúten",
    acucar: "restrição ao açúcar",
    amendoim: "alérgico a amendoim",
    frutos_mar: "alérgico a frutos do mar",
    ovo: "alérgico a ovo",
    vegana: "vegano(a)",
    vegetariana: "vegetariano(a)",
    low_carb: "dieta low carb",
  };
  return labels[restriction] || restriction;
};

// Função para verificar se um ingrediente conflita com uma restrição
const checkIngredientConflict = (
  ingredient: string,
  restriction: string
): boolean => {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  const restrictedIngredients = getRestrictionIngredients(restriction);
  
  return restrictedIngredients.some(restricted => 
    normalizedIngredient.includes(restricted)
  );
};

// Função para verificar conflito com dieta
const checkDietaryConflict = (
  ingredient: string,
  dietaryPreference: string
): boolean => {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  
  if (dietaryPreference === "vegana") {
    return ANIMAL_INGREDIENTS.some(animal => 
      normalizedIngredient.includes(animal)
    );
  }
  
  if (dietaryPreference === "vegetariana") {
    return MEAT_INGREDIENTS.some(meat => 
      normalizedIngredient.includes(meat)
    );
  }
  
  // Low carb: alerta para ingredientes muito calóricos/carboidratos
  // Por ora não bloqueamos, apenas as dietas restritivas
  
  return false;
};

export function useIngredientConflictCheck(profile: UserProfile | null) {
  const checkConflict = useMemo(() => {
    return (ingredient: string): ConflictType | null => {
      if (!profile) return null;
      
      const normalizedIngredient = ingredient.toLowerCase().trim();
      
      // Verificar intolerâncias
      const intolerances = profile.intolerances || [];
      for (const intolerance of intolerances) {
        if (intolerance === "nenhuma") continue;
        
        if (checkIngredientConflict(normalizedIngredient, intolerance)) {
          return {
            ingredient: normalizedIngredient,
            restriction: intolerance,
            restrictionLabel: getRestrictionLabel(intolerance),
          };
        }
      }
      
      // Verificar preferência alimentar
      const dietary = profile.dietary_preference;
      if (dietary && dietary !== "comum") {
        if (checkDietaryConflict(normalizedIngredient, dietary)) {
          return {
            ingredient: normalizedIngredient,
            restriction: dietary,
            restrictionLabel: getRestrictionLabel(dietary),
          };
        }
      }
      
      return null;
    };
  }, [profile]);
  
  return { checkConflict };
}
