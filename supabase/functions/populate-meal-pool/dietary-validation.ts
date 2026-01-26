// ============= VALIDAÇÃO DE PREFERÊNCIAS ALIMENTARES =============
// Sistema completo de filtragem e validação por dieta (vegetariana, vegana, low carb, etc)

import { normalizeText } from "../_shared/mealGenerationConfig.ts";
import type { SafetyDatabase } from "../_shared/globalSafetyEngine.ts";
import { checkIngredientForDietary } from "../_shared/globalSafetyEngine.ts";

// ============= CATEGORIAS DE PROTEÍNAS (incluindo vegetais) =============

export const PROTEIN_CATEGORIES = {
  // Proteínas animais principais (carnes, peixes)
  animal_main: {
    items: [
      'frango', 'frango grelhado', 'frango desfiado', 'frango assado', 'peito de frango',
      'carne', 'bife', 'carne moida', 'carne bovina', 'bife grelhado', 'picanha', 'alcatra',
      'peixe', 'peixe grelhado', 'tilapia', 'salmao', 'atum', 'merluza', 'sardinha',
      'porco', 'lombo', 'costela', 'linguica', 'carne de porco'
    ],
    min_grams: { almoco: 120, jantar: 100 },
    allowed_meals: ['almoco', 'jantar'],
    forbidden_meals: ['cafe_manha', 'lanche_manha', 'lanche_tarde', 'ceia'],
    description: 'Proteínas animais principais - apenas almoço e jantar'
  },
  
  // Ovos
  animal_eggs: {
    items: ['ovo', 'ovo frito', 'ovo mexido', 'ovo cozido', 'omelete', 'ovo poche'],
    min_grams: { almoco: 100, jantar: 100, cafe_manha: 50 },
    allowed_meals: ['almoco', 'jantar', 'cafe_manha', 'lanche_tarde'],
    forbidden_meals: ['ceia'],
    description: 'Ovos - permitido em várias refeições'
  },
  
  // Laticínios
  dairy: {
    items: [
      'queijo', 'queijo branco', 'queijo mussarela', 'mussarela', 'queijo prato',
      'iogurte', 'iogurte natural', 'iogurte grego', 'requeijao', 'cottage'
    ],
    max_grams: 50,
    role: 'additional',
    allowed_meals: ['cafe_manha', 'lanche_manha', 'lanche_tarde', 'ceia'],
    forbidden_meals: [],
    description: 'Laticínios - complemento, não proteína principal em almoço/jantar'
  },
  
  // Processados
  processed: {
    items: ['presunto', 'peito de peru', 'salsicha', 'mortadela', 'bacon'],
    max_grams: 50,
    role: 'additional',
    allowed_meals: ['cafe_manha', 'lanche_tarde'],
    forbidden_meals: ['almoco', 'jantar', 'ceia'],
    description: 'Processados - apenas complemento, nunca principal'
  },
  
  // NOVO: Proteínas vegetais (para dietas plant-based)
  plant_based: {
    items: [
      'tofu', 'tofu grelhado', 'tofu refogado', 'tofu frito',
      'tempeh', 'seitan',
      'grao de bico', 'grao-de-bico', 'grao de bico cozido', 'falafel',
      'lentilha', 'lentilhas', 'lentilha cozida',
      'feijao', 'feijao preto', 'feijao carioca', 'feijao branco',
      'edamame', 'ervilha', 'ervilha partida',
      'quinoa', 'amaranto',
      'proteina de soja', 'proteína de soja', 'carne de soja', 'hamburguer vegetal'
    ],
    min_grams: { almoco: 150, jantar: 120, cafe_manha: 80 },
    allowed_meals: ['almoco', 'jantar', 'cafe_manha', 'lanche_tarde'],
    forbidden_meals: [],
    description: 'Proteínas vegetais para dietas vegetarianas e veganas'
  }
};

// ============= FUNÇÃO: FILTRAR COMPONENTES POR DIETA =============

export async function filterComponentsByDiet(
  components: any[],
  dietaryFilter: string | null,
  supabase: any
): Promise<any[]> {
  // Se não há filtro ou é omnívoro, retornar todos
  if (!dietaryFilter || dietaryFilter === 'omnivore') {
    return components;
  }
  
  // Buscar ingredientes proibidos para esta dieta
  const { data: dietaryForbidden } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('ingredient')
    .eq('dietary_key', dietaryFilter);
  
  if (!dietaryForbidden || dietaryForbidden.length === 0) {
    return components;
  }
  
  const forbiddenList = dietaryForbidden.map((f: any) => normalizeText(f.ingredient));
  
  // Filtrar componentes que contêm ingredientes proibidos
  const filtered = components.filter((c: any) => {
    const componentName = normalizeText(c.name);
    
    // Verificar se o componente contém algum ingrediente proibido
    const hasForbidden = forbiddenList.some((forbidden: string) => 
      componentName.includes(forbidden)
    );
    
    return !hasForbidden;
  });
  
  return filtered;
}

// ============= FUNÇÃO: VALIDAR REFEIÇÃO POR DIETA =============

export function validateMealForDietaryPreference(
  meal: any,
  dietaryFilter: string | null,
  safetyDb: SafetyDatabase
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Se não há filtro ou é omnívoro, validar como válido
  if (!dietaryFilter || dietaryFilter === 'omnivore') {
    return { valid: true, errors: [], warnings: [] };
  }
  
  // Validar cada componente da refeição
  for (const comp of meal.components || []) {
    const check = checkIngredientForDietary(
      comp.name,
      dietaryFilter,
      safetyDb
    );
    
    if (!check.isValid) {
      errors.push(`"${comp.name}" não é compatível com ${dietaryFilter}: ${check.reason}`);
    }
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings 
  };
}

// ============= FUNÇÃO: VALIDAR PROTEÍNAS COM SUPORTE A DIETAS =============

export function validateProteinForMealTypeWithDiet(
  meal: any,
  mealType: string,
  dietaryFilter: string | null
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!meal.components || !Array.isArray(meal.components)) {
    return { valid: true, errors: [], warnings: [] };
  }
  
  const proteinComponents = meal.components.filter((c: any) => 
    c.type === 'protein' || c.type === 'dairy' || c.type === 'legumes'
  );
  
  // Verificar se é dieta plant-based
  const isPlantBased = ['vegana', 'vegetariana'].includes(dietaryFilter || '');
  
  if (proteinComponents.length === 0) {
    if (mealType === 'almoco' || mealType === 'jantar') {
      if (isPlantBased) {
        warnings.push(`${mealType} vegetariano/vegano deve ter proteína vegetal (tofu, leguminosas, grão-de-bico)`);
      } else {
        errors.push(`${mealType} DEVE ter proteína animal (frango, carne, peixe ou 2 ovos)`);
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }
  
  // Validar proteínas por tipo de refeição
  for (const comp of proteinComponents) {
    const compNameNorm = normalizeText(comp.name || '');
    const portionGrams = comp.portion_grams || 0;
    
    let category = null;
    
    // Identificar categoria da proteína
    if (PROTEIN_CATEGORIES.animal_main.items.some((p: string) => compNameNorm.includes(normalizeText(p)))) {
      category = 'animal_main';
    } else if (PROTEIN_CATEGORIES.animal_eggs.items.some((p: string) => compNameNorm.includes(normalizeText(p)))) {
      category = 'animal_eggs';
    } else if (PROTEIN_CATEGORIES.dairy.items.some((p: string) => compNameNorm.includes(normalizeText(p)))) {
      category = 'dairy';
    } else if (PROTEIN_CATEGORIES.processed.items.some((p: string) => compNameNorm.includes(normalizeText(p)))) {
      category = 'processed';
    } else if (PROTEIN_CATEGORIES.plant_based.items.some((p: string) => compNameNorm.includes(normalizeText(p)))) {
      category = 'plant_based';
    }
    
    if (!category) continue;
    
    // ALMOÇO/JANTAR
    if (mealType === 'almoco' || mealType === 'jantar') {
      // Se é plant-based, aceitar proteínas vegetais
      if (isPlantBased && category === 'plant_based') {
        // OK - proteína vegetal para dieta plant-based
        continue;
      }
      
      // Se não é plant-based, validar proteínas animais
      if (!isPlantBased) {
        if (category === 'dairy') {
          const hasAnimalProtein = proteinComponents.some((p: any) => {
            const pName = normalizeText(p.name || '');
            return PROTEIN_CATEGORIES.animal_main.items.some((item: string) => pName.includes(normalizeText(item))) ||
                   (PROTEIN_CATEGORIES.animal_eggs.items.some((item: string) => pName.includes(normalizeText(item))) && (p.portion_grams || 0) >= 100);
          });
          
          if (!hasAnimalProtein) {
            errors.push(`"${comp.name}" não pode ser proteína PRINCIPAL em ${mealType}`);
          }
        }
        
        if (category === 'processed') {
          errors.push(`"${comp.name}" é proteína processada, não pode ser principal em ${mealType}`);
        }
        
        if (category === 'animal_eggs' && portionGrams > 0 && portionGrams < 100) {
          const hasOtherProtein = proteinComponents.some((p: any) => {
            if (p === comp) return false;
            const pName = normalizeText(p.name || '');
            return PROTEIN_CATEGORIES.animal_main.items.some((item: string) => pName.includes(normalizeText(item)));
          });
          
          if (!hasOtherProtein) {
            warnings.push(`"${comp.name}" (${portionGrams}g) pode ser insuficiente`);
          }
        }
      }
    }
    
    // CAFÉ DA MANHÃ
    if (mealType === 'cafe_manha') {
      if (category === 'animal_main') {
        errors.push(`"${comp.name}" é muito pesado para café da manhã`);
      }
    }
    
    // CEIA
    if (mealType === 'ceia') {
      if (category === 'animal_main' || category === 'animal_eggs') {
        errors.push(`"${comp.name}" é muito pesado para ceia`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
