import { useMemo, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSafetyLabels } from "./useSafetyLabels";

// Mapeamento de substitutos por CATEGORIA do ingrediente original
// Estes são substitutos comuns para cada tipo de ingrediente
const SUBSTITUTES_BY_CATEGORY: Record<string, string[]> = {
  // Proteínas
  ovo: ["linhaça hidratada", "chia hidratada", "banana amassada", "aquafaba", "tofu macio"],
  ovos: ["linhaça hidratada", "chia hidratada", "banana amassada", "aquafaba", "tofu macio"],
  
  // Laticínios
  leite: ["leite de coco", "leite de amêndoas", "leite de aveia", "leite de arroz", "bebida de soja"],
  queijo: ["queijo vegano", "tofu", "castanha de caju", "nutritional yeast"],
  manteiga: ["óleo de coco", "azeite", "manteiga vegana", "ghee", "purê de abacate"],
  creme_de_leite: ["creme de coco", "leite de coco", "creme de castanhas", "iogurte vegano"],
  iogurte: ["iogurte de coco", "iogurte de soja", "coalhada", "kefir"],
  requeijao: ["cream cheese vegano", "tofu cremoso", "ricota", "pasta de castanhas"],
  
  // Farinhas e grãos
  farinha_trigo: ["farinha de arroz", "farinha de amêndoas", "polvilho", "fécula de batata", "farinha de coco"],
  farinha: ["farinha de arroz", "farinha de amêndoas", "polvilho", "fécula de batata", "farinha de coco"],
  trigo: ["arroz", "quinoa", "amaranto", "aveia sem glúten", "milho"],
  pao: ["pão sem glúten", "tapioca", "wrap de alface", "batata doce"],
  macarrao: ["macarrão de arroz", "macarrão de abobrinha", "espaguete de pupunha", "shirataki"],
  
  // Açúcares
  acucar: ["xilitol", "eritritol", "stevia", "açúcar de coco", "mel", "tâmaras"],
  mel: ["xarope de agave", "melado", "xarope de bordo", "tâmaras"],
  
  // Carnes
  carne: ["tofu", "proteína de soja", "cogumelos", "grão de bico", "seitan", "jaca verde"],
  carne_bovina: ["tofu", "proteína de soja", "cogumelos portobello", "seitan", "jaca verde"],
  frango: ["tofu", "proteína de soja", "couve-flor", "grão de bico", "seitan"],
  porco: ["tofu defumado", "cogumelos", "proteína de soja", "seitan"],
  bacon: ["bacon de coco", "tofu defumado", "chips de abobrinha", "cogumelos"],
  
  // Frutos do mar
  peixe: ["tofu", "palmito", "banana da terra", "jaca verde", "couve-flor"],
  camarao: ["palmito", "cogumelos", "couve-flor", "tofu"],
  
  // Oleaginosas
  amendoim: ["castanha de caju", "amêndoas", "tahine", "sementes de girassol", "pasta de coco"],
  nozes: ["sementes de abóbora", "castanha do pará", "amêndoas", "sementes de girassol"],
  
  // Óleos
  oleo: ["azeite", "óleo de coco", "ghee", "óleo de abacate"],
  azeite: ["óleo de coco", "óleo de abacate", "óleo de gergelim"],
  
  // Temperos
  sal: ["sal rosa", "sal marinho", "shoyu", "missô"],
  pimenta: ["gengibre", "curry", "páprica", "mostarda"],
  
  // Leguminosas
  feijao: ["lentilha", "grão de bico", "ervilha", "feijão branco", "edamame"],
  lentilha: ["feijão", "grão de bico", "ervilha", "quinoa"],
  grao_de_bico: ["feijão branco", "lentilha", "ervilha", "tofu"],
  
  // Vegetais comuns
  batata: ["batata doce", "mandioca", "inhame", "cará", "abóbora"],
  arroz: ["quinoa", "couscous", "bulgur", "cevadinha", "cauliflower rice"],
  tomate: ["pimentão vermelho", "beterraba", "abóbora", "cenoura"],
  cebola: ["alho-poró", "cebolinha", "chalota", "funcho"],
};

// Keywords para detectar categoria do ingrediente
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ovo: ["ovo", "ovos", "gema", "clara"],
  leite: ["leite", "leitinho"],
  queijo: ["queijo", "mussarela", "parmesão", "cheddar", "provolone", "gorgonzola", "brie", "ricota", "cottage"],
  manteiga: ["manteiga"],
  creme_de_leite: ["creme de leite", "nata"],
  iogurte: ["iogurte", "yogurt"],
  requeijao: ["requeijão", "cream cheese", "cremoso"],
  farinha_trigo: ["farinha de trigo", "farinha branca"],
  farinha: ["farinha"],
  trigo: ["trigo"],
  pao: ["pão", "pãozinho", "baguete", "ciabatta", "brioche"],
  macarrao: ["macarrão", "massa", "espaguete", "penne", "lasanha", "fusilli"],
  acucar: ["açúcar", "açucar"],
  mel: ["mel"],
  carne: ["carne"],
  carne_bovina: ["carne bovina", "bife", "alcatra", "patinho", "picanha", "costela bovina", "acém"],
  frango: ["frango", "peito de frango", "coxa", "sobrecoxa", "asa de frango"],
  porco: ["porco", "suíno", "lombo", "pernil"],
  bacon: ["bacon", "panceta", "toucinho"],
  peixe: ["peixe", "tilápia", "salmão", "atum", "bacalhau", "pescada", "robalo"],
  camarao: ["camarão", "camarões"],
  amendoim: ["amendoim", "pasta de amendoim"],
  nozes: ["nozes", "noz"],
  oleo: ["óleo", "oleo"],
  azeite: ["azeite"],
  sal: ["sal"],
  pimenta: ["pimenta"],
  feijao: ["feijão", "feijao"],
  lentilha: ["lentilha"],
  grao_de_bico: ["grão de bico", "grao de bico", "grão-de-bico"],
  batata: ["batata", "batatas"],
  arroz: ["arroz"],
  tomate: ["tomate", "tomates"],
  cebola: ["cebola", "cebolas"],
};

// Alimentos seguros por tipo de restrição do usuário (mantido para filtrar)
const SAFE_FOODS_BY_RESTRICTION: Record<string, string[]> = {
  lactose: [
    "leite de coco", "leite de amêndoas", "leite de aveia", "leite de arroz",
    "bebida de soja", "creme de coco", "iogurte de coco", "queijo vegano", "manteiga vegana",
  ],
  gluten: [
    "farinha de arroz", "farinha de amêndoas", "farinha de coco", "polvilho",
    "fécula de batata", "tapioca", "quinoa", "amaranto",
  ],
  peanut: [
    "castanha de caju", "amêndoas", "tahine", "pasta de castanhas", "sementes de girassol",
  ],
  amendoim: [ // Legacy PT key
    "castanha de caju", "amêndoas", "tahine", "pasta de castanhas", "sementes de girassol",
  ],
  sugar: ["xilitol", "eritritol", "stevia", "monk fruit", "açúcar de coco"],
  acucar: ["xilitol", "eritritol", "stevia", "monk fruit", "açúcar de coco"], // Legacy PT key
  egg: ["linhaça hidratada", "chia hidratada", "banana amassada", "aquafaba", "tofu macio"],
  ovo: ["linhaça hidratada", "chia hidratada", "banana amassada", "aquafaba", "tofu macio"], // Legacy PT key
  seafood: ["frango", "carne bovina", "tofu", "cogumelos", "proteína de soja"],
  frutos_mar: ["frango", "carne bovina", "tofu", "cogumelos", "proteína de soja"], // Legacy PT key
  vegetarian: ["tofu", "grão de bico", "lentilha", "feijão", "proteína de soja", "cogumelos", "quinoa", "ovo"],
  vegetariana: ["tofu", "grão de bico", "lentilha", "feijão", "proteína de soja", "cogumelos", "quinoa", "ovo"], // Legacy PT key
  vegan: ["tofu", "grão de bico", "lentilha", "proteína de soja", "cogumelos", "leite de coco", "leite de amêndoas", "queijo vegano", "seitan"],
  vegana: ["tofu", "grão de bico", "lentilha", "proteína de soja", "cogumelos", "leite de coco", "leite de amêndoas", "queijo vegano", "seitan"], // Legacy PT key
};

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
};

// Detecta a categoria do ingrediente baseado em keywords
function detectIngredientCategory(ingredientName: string): string | null {
  const normalized = ingredientName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        return category;
      }
    }
  }
  return null;
}

export function useSafeIngredientSuggestions(profile: UserProfile | null) {
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);

  // Retorna sugestões baseadas no ingrediente original + restrições do usuário
  const getSuggestions = useCallback((originalIngredient?: string): string[] => {
    if (!originalIngredient) return [];
    
    // 1. Detectar categoria do ingrediente original
    const category = detectIngredientCategory(originalIngredient);
    
    // 2. Buscar substitutos para essa categoria
    let substitutes: string[] = [];
    if (category && SUBSTITUTES_BY_CATEGORY[category]) {
      substitutes = [...SUBSTITUTES_BY_CATEGORY[category]];
    }
    
    // 3. Se não encontrou substitutos por categoria, retorna vazio (vai usar IA)
    if (substitutes.length === 0) {
      return [];
    }
    
    // 4. Filtrar baseado nas restrições do usuário (remover itens que conflitam)
    if (profile) {
      const userRestrictions: string[] = [];
      if (profile.intolerances) {
        profile.intolerances.forEach(i => {
          if (i !== "nenhuma") userRestrictions.push(i);
        });
      }
      if (profile.dietary_preference && profile.dietary_preference !== "comum") {
        userRestrictions.push(profile.dietary_preference);
      }
      
      // Remover substitutos que conflitam com as restrições
      if (userRestrictions.includes("lactose")) {
        substitutes = substitutes.filter(s => 
          !["leite", "queijo", "manteiga", "iogurte", "creme de leite", "requeijão"].some(l => s.toLowerCase().includes(l))
        );
      }
      if (userRestrictions.includes("gluten")) {
        substitutes = substitutes.filter(s => 
          !["trigo", "pão", "macarrão", "farinha de trigo"].some(g => s.toLowerCase().includes(g))
        );
      }
      if (userRestrictions.includes("ovo")) {
        substitutes = substitutes.filter(s => !s.toLowerCase().includes("ovo"));
      }
      if (userRestrictions.includes("amendoim")) {
        substitutes = substitutes.filter(s => !s.toLowerCase().includes("amendoim"));
      }
      if (userRestrictions.includes("vegan") || userRestrictions.includes("vegana") || 
          userRestrictions.includes("vegetarian") || userRestrictions.includes("vegetariana")) {
        substitutes = substitutes.filter(s => 
          !["carne", "frango", "peixe", "camarão", "bacon", "porco", "bovina"].some(m => s.toLowerCase().includes(m))
        );
      }
    }
    
    return substitutes.slice(0, 6);
  }, [profile]);

  // Busca sugestões via IA quando não há mapeamento estático
  const fetchAISuggestions = useCallback(async (originalIngredient: string): Promise<string[]> => {
    if (!originalIngredient) return [];
    
    setIsLoadingAISuggestions(true);
    try {
      const restrictions: string[] = [];
      if (profile?.intolerances) {
        restrictions.push(...profile.intolerances.filter(i => i !== "nenhuma"));
      }
      if (profile?.dietary_preference && profile.dietary_preference !== "comum") {
        restrictions.push(profile.dietary_preference);
      }
      
      const { data, error } = await supabase.functions.invoke("suggest-ingredient-substitutes", {
        body: { 
          ingredient: originalIngredient,
          restrictions: restrictions.length > 0 ? restrictions : undefined
        },
      });
      
      if (error) {
        console.error("Error fetching AI suggestions:", error);
        return [];
      }
      
      const suggestions = data?.suggestions || [];
      setAISuggestions(suggestions);
      return suggestions;
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      return [];
    } finally {
      setIsLoadingAISuggestions(false);
    }
  }, [profile]);

  const { getIntoleranceLabel, getDietaryLabel } = useSafetyLabels();
  
  const getUserRestrictionLabels = useCallback((): string[] => {
    if (!profile) return [];
    
    const labels: string[] = [];
    
    if (profile.intolerances) {
      profile.intolerances.forEach(i => {
        if (i !== "nenhuma") {
          labels.push(getIntoleranceLabel(i));
        }
      });
    }
    
    if (profile.dietary_preference && profile.dietary_preference !== "comum") {
      labels.push(getDietaryLabel(profile.dietary_preference));
    }
    
    return labels;
  }, [profile, getIntoleranceLabel, getDietaryLabel]);

  const hasRestrictions = useMemo(() => {
    if (!profile) return false;
    const hasIntolerances = profile.intolerances?.some(i => i !== "nenhuma") || false;
    const hasDietaryPref = profile.dietary_preference && profile.dietary_preference !== "comum";
    return hasIntolerances || hasDietaryPref;
  }, [profile]);
  
  return { 
    getSuggestions, 
    getUserRestrictionLabels, 
    hasRestrictions,
    fetchAISuggestions,
    isLoadingAISuggestions,
    aiSuggestions,
  };
}
