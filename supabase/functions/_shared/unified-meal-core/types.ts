/**
 * UNIFIED MEAL CORE - TYPES
 * 
 * TIPOS UNIFICADOS - TODOS OS MÓDULOS USAM ESTES TIPOS
 * Qualquer mudança aqui afeta TODOS os módulos automaticamente
 */

// ============= INTERFACE DE COMPONENTE UNIFICADA =============
export interface UnifiedComponent {
  // Identificação
  ingredient_key: string;           // Ex: "boiled_eggs"
  
  // Nomes localizados
  name_pt: string;                  // Ex: "Ovo cozido"
  name_en: string;                  // Ex: "Boiled eggs"
  
  // Categorização
  type: ComponentType;              // Ex: "protein"
  category: FoodCategory;           // Ex: "eggs"
  
  // Porção em gramas (fonte de verdade)
  portion_grams: number;            // Ex: 100
  
  // Porção humanizada (calculada pelo Core)
  portion_display: PortionDisplay;  // Ex: { quantity: 2, unit: "unidade", label: "2 ovos cozidos (100g)" }
  
  // Macros (calculados pelo Core)
  macros: ComponentMacros;          // Ex: { kcal: 155, protein: 13, ... }
  
  // Safety flags
  safety: SafetyInfo;               // Ex: { contains: ["ovo"], blocked_for: ["egg"] }
}

export type ComponentType = 
  | 'protein' 
  | 'carb' 
  | 'rice'      // Específico para Brasil
  | 'beans'     // Específico para Brasil
  | 'vegetable' 
  | 'fruit' 
  | 'dairy' 
  | 'fat' 
  | 'beverage'
  | 'dessert'
  | 'composite'
  | 'other';

export type FoodCategory = 
  | 'poultry' | 'beef' | 'pork' | 'fish' | 'seafood' | 'eggs'
  | 'rice' | 'beans' | 'bread' | 'pasta' | 'tuber' | 'cereal'
  | 'leafy' | 'cruciferous' | 'root' | 'fruit'
  | 'milk' | 'cheese' | 'yogurt'
  | 'oil' | 'butter' | 'nuts'
  | 'water' | 'juice' | 'coffee' | 'tea'
  | 'other';

export interface PortionDisplay {
  quantity: number;                 // Ex: 2
  unit: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'colher_cha' | 'concha' | 'copo' | 'xicara';
  label: string;                    // Ex: "2 ovos cozidos (100g)"
}

export interface ComponentMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface SafetyInfo {
  contains: string[];               // Ex: ["ovo", "lactose"]
  blocked_for: string[];            // Ex: ["egg", "lactose"]
  is_safe_for_all: boolean;         // true se não tem alergenos
}

// ============= INTERFACE DE REFEIÇÃO UNIFICADA =============
export interface UnifiedMeal {
  // Identificação
  id?: string;                      // UUID do banco (opcional)
  name: string;                     // Ex: "Frango Grelhado com Arroz e Feijão"
  description?: string;
  
  // Tipo de refeição
  meal_type: MealType;              // Ex: "lunch"
  
  // Componentes (ORDENADOS pelo Core)
  components: UnifiedComponent[];
  
  // Totais (CALCULADOS pelo Core)
  totals: MealTotals;
  
  // Metadados
  meta: MealMeta;
  
  // Fonte (para debug)
  source: MealSource;
}

export type MealType = 
  | 'breakfast' 
  | 'morning_snack' 
  | 'lunch' 
  | 'afternoon_snack' 
  | 'dinner' 
  | 'supper';

export interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealMeta {
  country: string;                  // Ex: "BR"
  density: 'light' | 'moderate' | 'heavy';
  prep_time_minutes: number;
  blocked_for_intolerances: string[];
  dietary_tags: string[];
  confidence: 'high' | 'medium' | 'low';
  
  // Compatibilidade com meta de peso (Mifflin-St Jeor)
  target_compatibility?: {
    score: number;                  // 0-100 (100 = perfeito)
    protein_deviation: number;      // % de desvio
    carbs_deviation: number;        // % de desvio
    fat_deviation: number;          // % de desvio
    is_within_tolerance: boolean;   // true se dentro de ±15%
  };
}

export type MealSource = 
  | { type: 'pool'; meal_id: string }
  | { type: 'direct'; template_id: string }
  | { type: 'ai'; model: string; prompt_version: string }
  | { type: 'fallback'; reason: string };

// ============= TIPOS DE META DE PESO =============
export type WeightGoal = 'lose_weight' | 'maintain' | 'gain_weight';

// ============= DADOS FÍSICOS DO USUÁRIO (para Mifflin-St Jeor) =============
export interface PhysicalData {
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  sex: 'male' | 'female';
}

// ============= METAS DE MACROS POR REFEIÇÃO =============
export interface MacroTargets {
  protein: number;  // gramas
  carbs: number;    // gramas
  fat: number;      // gramas
  calories?: number; // kcal (calculado: P*4 + C*4 + F*9)
}

// ============= INTERFACE DE CONTEXTO DO USUÁRIO =============
export interface UserContext {
  // Identificação
  user_id: string;
  country: string;
  language: string;
  
  // Safety Engine - Intolerâncias e Restrições
  intolerances: string[];           // Ex: ["gluten", "lactose"]
  dietary_preference: string | null; // Ex: "vegetarian", "vegan"
  excluded_ingredients: string[];    // Ex: ["camarão", "amendoim"]
  
  // Meta de Peso (para Mifflin-St Jeor)
  goal: WeightGoal;                  // Ex: "lose_weight"
  
  // Dados Físicos (para cálculo de BMR/TDEE)
  physical_data: PhysicalData;
  
  // Metas de Macros por Refeição (calculadas pelo Mifflin-St Jeor)
  // Opcional: se não passado, será calculado internamente
  target_macros?: MacroTargets;
  
  // Campos legados (manter compatibilidade)
  goals?: string[];                  // @deprecated - usar 'goal' ao invés
}

// ============= RESULTADO DO PROCESSAMENTO =============
export interface ProcessingResult {
  success: boolean;
  meal: UnifiedMeal | null;
  errors: string[];
  warnings: string[];
  fallback_used: boolean;
  processing_time_ms: number;
}

// ============= DADOS DE PORÇÃO DO BANCO (canonical_ingredients) =============
export interface CanonicalPortionData {
  default_portion_grams: number;      // Ex: 150
  portion_unit: string;               // Ex: "pote"
  portion_unit_singular_pt: string;   // Ex: "pote de iogurte"
  portion_unit_plural_pt: string;     // Ex: "potes de iogurte"
  is_liquid: boolean;                 // Ex: true
}

