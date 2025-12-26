import { useMemo } from "react";

// Alimentos seguros por tipo de restrição
// Estes são alimentos que o usuário pode usar com segurança

const SAFE_FOODS_BY_RESTRICTION: Record<string, string[]> = {
  // Alimentos seguros para intolerantes à lactose
  lactose: [
    "leite de coco",
    "leite de amêndoas", 
    "leite de aveia",
    "leite de arroz",
    "leite de soja",
    "creme de coco",
    "iogurte de coco",
    "queijo vegano",
    "manteiga vegana",
  ],
  
  // Alimentos seguros para intolerantes ao glúten
  gluten: [
    "farinha de arroz",
    "farinha de amêndoas",
    "farinha de coco",
    "polvilho",
    "fécula de batata",
    "tapioca",
    "quinoa",
    "amaranto",
  ],
  
  // Alimentos seguros para alérgicos a amendoim
  amendoim: [
    "castanha de caju",
    "amêndoas",
    "tahine",
    "pasta de castanhas",
    "sementes de girassol",
  ],
  
  // Alimentos seguros para restrição de açúcar
  acucar: [
    "xilitol",
    "eritritol",
    "stevia",
    "monk fruit",
    "açúcar de coco",
  ],
  
  // Alimentos seguros para alérgicos a ovo
  ovo: [
    "linhaça hidratada",
    "chia hidratada",
    "banana amassada",
    "aquafaba",
    "tofu macio",
  ],
  
  // Alimentos seguros para alérgicos a frutos do mar
  frutos_mar: [
    "frango",
    "carne bovina",
    "tofu",
    "cogumelos",
    "proteína de soja",
  ],
  
  // Alimentos seguros para vegetarianos
  vegetariana: [
    "tofu",
    "grão de bico",
    "lentilha",
    "feijão",
    "proteína de soja",
    "cogumelos",
    "quinoa",
    "ovo",
  ],
  
  // Alimentos seguros para veganos
  vegana: [
    "tofu",
    "grão de bico",
    "lentilha",
    "proteína de soja",
    "cogumelos",
    "leite de coco",
    "leite de amêndoas",
    "queijo vegano",
    "seitan",
  ],
};

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
};

export function useSafeIngredientSuggestions(profile: UserProfile | null) {
  // Retorna sugestões baseadas nas restrições do usuário (independente do ingrediente original)
  const getSuggestions = useMemo(() => {
    return (_originalIngredient?: string): string[] => {
      if (!profile) return [];
      
      const userRestrictions: string[] = [];
      
      // Coletar restrições do usuário
      if (profile.intolerances) {
        profile.intolerances.forEach(i => {
          if (i !== "nenhuma") userRestrictions.push(i);
        });
      }
      
      if (profile.dietary_preference && profile.dietary_preference !== "comum") {
        userRestrictions.push(profile.dietary_preference);
      }
      
      if (userRestrictions.length === 0) return [];
      
      // Coletar todos os alimentos seguros para as restrições do usuário
      const allSafeFoods: string[] = [];
      
      for (const restriction of userRestrictions) {
        const safeFoods = SAFE_FOODS_BY_RESTRICTION[restriction];
        if (safeFoods) {
          allSafeFoods.push(...safeFoods);
        }
      }
      
      // Remover duplicatas e limitar a 6 sugestões
      const uniqueFoods = [...new Set(allSafeFoods)];
      return uniqueFoods.slice(0, 6);
    };
  }, [profile]);
  
  const getUserRestrictionLabels = useMemo(() => {
    return (): string[] => {
      if (!profile) return [];
      
      const labels: string[] = [];
      const restrictionLabels: Record<string, string> = {
        lactose: "Lactose",
        gluten: "Glúten",
        acucar: "Açúcar",
        amendoim: "Amendoim",
        frutos_mar: "Frutos do mar",
        ovo: "Ovo",
        vegana: "Vegano",
        vegetariana: "Vegetariano",
        low_carb: "Low Carb",
        pescetariana: "Pescetariano",
        cetogenica: "Cetogênica",
        flexitariana: "Flexitariano",
      };
      
      if (profile.intolerances) {
        profile.intolerances.forEach(i => {
          if (i !== "nenhuma" && restrictionLabels[i]) {
            labels.push(restrictionLabels[i]);
          }
        });
      }
      
      if (profile.dietary_preference && 
          profile.dietary_preference !== "comum" && 
          restrictionLabels[profile.dietary_preference]) {
        labels.push(restrictionLabels[profile.dietary_preference]);
      }
      
      return labels;
    };
  }, [profile]);
  
  // Nova função: verifica se o usuário tem restrições configuradas
  const hasRestrictions = useMemo(() => {
    if (!profile) return false;
    
    const hasIntolerances = profile.intolerances?.some(i => i !== "nenhuma") || false;
    const hasDietaryPref = profile.dietary_preference && profile.dietary_preference !== "comum";
    
    return hasIntolerances || hasDietaryPref;
  }, [profile]);
  
  return { getSuggestions, getUserRestrictionLabels, hasRestrictions };
}
