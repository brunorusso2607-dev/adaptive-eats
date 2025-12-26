import { useMemo } from "react";

// Mapeamento de ingredientes originais -> substitutos seguros
// Estruturado por categoria de restrição

interface SafeSubstitute {
  original: string[];
  substitutes: string[];
  safeFor: string[]; // restrições para as quais este substituto é seguro
}

const SAFE_SUBSTITUTES: SafeSubstitute[] = [
  // Substitutos para lactose
  {
    original: ["leite", "leite integral", "leite desnatado"],
    substitutes: ["leite de coco", "leite de amêndoas", "leite de aveia", "leite de arroz", "leite de soja"],
    safeFor: ["lactose", "vegana"],
  },
  {
    original: ["creme de leite", "nata"],
    substitutes: ["creme de leite vegetal", "leite de coco", "creme de castanha"],
    safeFor: ["lactose", "vegana"],
  },
  {
    original: ["manteiga"],
    substitutes: ["azeite de oliva", "óleo de coco", "manteiga vegana", "margarina sem leite"],
    safeFor: ["lactose", "vegana"],
  },
  {
    original: ["queijo", "queijo mussarela", "mussarela", "queijo parmesão"],
    substitutes: ["queijo vegano", "tofu firme", "levedura nutricional"],
    safeFor: ["lactose", "vegana"],
  },
  {
    original: ["iogurte", "iogurte natural", "iogurte grego"],
    substitutes: ["iogurte de coco", "iogurte de soja", "iogurte vegano"],
    safeFor: ["lactose", "vegana"],
  },
  {
    original: ["requeijão", "cream cheese"],
    substitutes: ["pasta de tofu", "homus", "cream cheese vegano"],
    safeFor: ["lactose", "vegana"],
  },
  
  // Substitutos para glúten
  {
    original: ["farinha de trigo", "farinha"],
    substitutes: ["farinha de arroz", "farinha de amêndoas", "farinha de coco", "polvilho", "fécula de batata"],
    safeFor: ["gluten"],
  },
  {
    original: ["pão", "pão francês", "pão de forma"],
    substitutes: ["pão sem glúten", "tapioca", "wrap de arroz"],
    safeFor: ["gluten"],
  },
  {
    original: ["macarrão", "espaguete", "massa"],
    substitutes: ["macarrão de arroz", "macarrão de milho", "espaguete de abobrinha", "macarrão sem glúten"],
    safeFor: ["gluten"],
  },
  {
    original: ["aveia"],
    substitutes: ["aveia certificada sem glúten", "quinoa em flocos", "amaranto"],
    safeFor: ["gluten"],
  },
  
  // Substitutos para ovo
  {
    original: ["ovo", "ovos"],
    substitutes: ["linhaça hidratada", "chia hidratada", "banana amassada", "tofu macio"],
    safeFor: ["ovo", "vegana"],
  },
  
  // Substitutos para açúcar
  {
    original: ["açúcar", "açúcar refinado"],
    substitutes: ["xilitol", "eritritol", "stevia", "monk fruit"],
    safeFor: ["acucar"],
  },
  {
    original: ["mel"],
    substitutes: ["xarope de agave", "melado de cana", "açúcar de coco"],
    safeFor: ["vegana"],
  },
  
  // Substitutos para amendoim
  {
    original: ["amendoim", "pasta de amendoim"],
    substitutes: ["pasta de castanha de caju", "pasta de amêndoas", "tahine"],
    safeFor: ["amendoim"],
  },
  
  // Substitutos vegetarianos/veganos para carnes
  {
    original: ["carne", "carne moída", "carne bovina"],
    substitutes: ["proteína de soja", "grão de bico", "lentilha", "tofu firme", "cogumelos"],
    safeFor: ["vegetariana", "vegana"],
  },
  {
    original: ["frango", "peito de frango"],
    substitutes: ["tofu", "seitan", "jaca verde", "proteína de ervilha"],
    safeFor: ["vegetariana", "vegana"],
  },
  {
    original: ["bacon", "linguiça"],
    substitutes: ["tofu defumado", "cogumelos shiitake", "chips de coco"],
    safeFor: ["vegetariana", "vegana"],
  },
];

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
};

export function useSafeIngredientSuggestions(profile: UserProfile | null) {
  const getSuggestions = useMemo(() => {
    return (originalIngredient: string): string[] => {
      if (!profile) return [];
      
      const normalizedOriginal = originalIngredient.toLowerCase().trim();
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
      
      // Encontrar substitutos seguros
      const suggestions: string[] = [];
      
      for (const substitute of SAFE_SUBSTITUTES) {
        // Verificar se o ingrediente original está na lista
        const matchesOriginal = substitute.original.some(orig => 
          normalizedOriginal.includes(orig) || orig.includes(normalizedOriginal)
        );
        
        if (matchesOriginal) {
          // Verificar se o substituto é seguro para pelo menos uma das restrições do usuário
          const isSafeForUser = substitute.safeFor.some(safe => 
            userRestrictions.includes(safe)
          );
          
          if (isSafeForUser) {
            suggestions.push(...substitute.substitutes);
          }
        }
      }
      
      // Remover duplicatas
      return [...new Set(suggestions)];
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
  
  return { getSuggestions, getUserRestrictionLabels };
}
