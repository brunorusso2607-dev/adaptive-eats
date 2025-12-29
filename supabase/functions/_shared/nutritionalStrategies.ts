// ============================================
// NUTRITIONAL STRATEGIES - CONFIGURAÇÃO DINÂMICA
// ============================================
// Este arquivo gerencia as estratégias nutricionais do banco de dados
// Substitui a lógica hardcoded de goals por configurações dinâmicas

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// TIPOS
// ============================================

export interface NutritionalStrategy {
  id: string;
  key: string;
  label: string;
  description: string | null;
  calorie_modifier: number | null; // -500, 0, +400, etc. NULL para dieta flexível
  protein_per_kg: number | null; // 1.6, 2.0, 2.2, etc. NULL para dieta flexível
  carb_ratio: number | null; // 0.45 = 45%. NULL para dieta flexível
  fat_ratio: number | null; // 0.30 = 30%. NULL para dieta flexível
  is_flexible: boolean; // se true, usuário define metas manualmente
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface StrategyContext {
  strategy: NutritionalStrategy | null;
  calorieAdjustment: number;
  proteinMultiplier: number;
  carbRatio: number;
  fatRatio: number;
  isFlexible: boolean;
  recipeStyle: "fitness" | "regular" | "high_calorie";
}

// ============================================
// MAPEAMENTO DE FALLBACK (para usuários sem strategy_id)
// ============================================

const GOAL_TO_STRATEGY_KEY: Record<string, string> = {
  emagrecer: "emagrecer",
  manter: "manter",
  ganhar_peso: "ganhar_peso",
};

// Valores padrão por goal (fallback se não conseguir carregar do banco)
const DEFAULT_STRATEGY_CONFIG: Record<string, Partial<NutritionalStrategy>> = {
  emagrecer: {
    key: "emagrecer",
    calorie_modifier: -500,
    protein_per_kg: 1.8,
    carb_ratio: 0.45,
    fat_ratio: 0.30,
    is_flexible: false,
  },
  cutting: {
    key: "cutting",
    calorie_modifier: -400,
    protein_per_kg: 2.2,
    carb_ratio: 0.40,
    fat_ratio: 0.30,
    is_flexible: false,
  },
  manter: {
    key: "manter",
    calorie_modifier: 0,
    protein_per_kg: 1.6,
    carb_ratio: 0.50,
    fat_ratio: 0.25,
    is_flexible: false,
  },
  fitness: {
    key: "fitness",
    calorie_modifier: 0,
    protein_per_kg: 2.0,
    carb_ratio: 0.45,
    fat_ratio: 0.30,
    is_flexible: false,
  },
  ganhar_peso: {
    key: "ganhar_peso",
    calorie_modifier: 400,
    protein_per_kg: 2.0,
    carb_ratio: 0.50,
    fat_ratio: 0.25,
    is_flexible: false,
  },
  dieta_flexivel: {
    key: "dieta_flexivel",
    calorie_modifier: null,
    protein_per_kg: null,
    carb_ratio: null,
    fat_ratio: null,
    is_flexible: true,
  },
};

// ============================================
// FUNÇÕES DE CARREGAMENTO
// ============================================

/**
 * Carrega uma estratégia nutricional do banco de dados por ID
 */
export async function getStrategyById(strategyId: string): Promise<NutritionalStrategy | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase configuration missing");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("nutritional_strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching strategy by ID:", error);
    return null;
  }

  return data as NutritionalStrategy | null;
}

/**
 * Carrega uma estratégia nutricional do banco de dados por key
 */
export async function getStrategyByKey(key: string): Promise<NutritionalStrategy | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase configuration missing");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("nutritional_strategies")
    .select("*")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching strategy by key:", error);
    return null;
  }

  return data as NutritionalStrategy | null;
}

/**
 * Carrega todas as estratégias nutricionais ativas
 */
export async function getAllActiveStrategies(): Promise<NutritionalStrategy[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase configuration missing");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("nutritional_strategies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching all strategies:", error);
    return [];
  }

  return (data || []) as NutritionalStrategy[];
}

// ============================================
// FUNÇÃO PRINCIPAL: OBTER CONTEXTO DA ESTRATÉGIA
// ============================================

interface UserProfileForStrategy {
  strategy_id?: string | null;
  goal?: string | null;
  weight_current?: number | null;
  weight_goal?: number | null;
}

/**
 * Obtém o contexto completo da estratégia nutricional para um perfil de usuário.
 * 
 * Prioridade:
 * 1. Se profile.strategy_id existe, carrega a estratégia do banco
 * 2. Se não, usa profile.goal para mapear para uma estratégia
 * 3. Se falhar, usa valores padrão (manter)
 */
export async function getStrategyContext(profile: UserProfileForStrategy): Promise<StrategyContext> {
  let strategy: NutritionalStrategy | null = null;

  // Tentar carregar por strategy_id primeiro
  if (profile.strategy_id) {
    strategy = await getStrategyById(profile.strategy_id);
  }

  // Fallback: usar goal para encontrar a estratégia
  if (!strategy && profile.goal) {
    const strategyKey = GOAL_TO_STRATEGY_KEY[profile.goal] || profile.goal;
    strategy = await getStrategyByKey(strategyKey);
  }

  // Se ainda não encontrou, usar fallback hardcoded
  if (!strategy) {
    const fallbackKey = profile.goal || "manter";
    const fallbackConfig = DEFAULT_STRATEGY_CONFIG[fallbackKey] || DEFAULT_STRATEGY_CONFIG["manter"];
    
    return {
      strategy: null,
      calorieAdjustment: fallbackConfig.calorie_modifier || 0,
      proteinMultiplier: fallbackConfig.protein_per_kg || 1.6,
      carbRatio: fallbackConfig.carb_ratio || 0.50,
      fatRatio: fallbackConfig.fat_ratio || 0.25,
      isFlexible: fallbackConfig.is_flexible || false,
      recipeStyle: determineRecipeStyle(fallbackKey),
    };
  }

  // Calcular ajuste de calorias baseado na intensidade (para estratégias com déficit/superávit)
  const intensityMultiplier = calculateIntensityMultiplier(
    strategy.key,
    profile.weight_current,
    profile.weight_goal
  );

  const baseCalorieModifier = strategy.calorie_modifier || 0;
  const adjustedCalorieModifier = Math.round(baseCalorieModifier * intensityMultiplier);

  return {
    strategy,
    calorieAdjustment: adjustedCalorieModifier,
    proteinMultiplier: strategy.protein_per_kg || 1.6,
    carbRatio: strategy.carb_ratio || 0.50,
    fatRatio: strategy.fat_ratio || 0.25,
    isFlexible: strategy.is_flexible,
    recipeStyle: determineRecipeStyle(strategy.key),
  };
}

/**
 * Calcula multiplicador de intensidade baseado na diferença de peso
 */
function calculateIntensityMultiplier(
  strategyKey: string,
  weightCurrent: number | null | undefined,
  weightGoal: number | null | undefined
): number {
  if (!weightCurrent || !weightGoal) {
    return 1.0; // intensidade padrão
  }

  const difference = Math.abs(weightCurrent - weightGoal);

  // Estratégias de déficit (emagrecer, cutting)
  if (strategyKey === "emagrecer" || strategyKey === "cutting") {
    if (difference <= 5) return 0.6; // light: -300 ao invés de -500
    if (difference <= 15) return 1.0; // moderate: valor padrão
    return 1.4; // aggressive: -700 ao invés de -500
  }

  // Estratégias de superávit (ganhar_peso, bulk)
  if (strategyKey === "ganhar_peso") {
    if (difference <= 5) return 0.625; // light: +250 ao invés de +400
    if (difference <= 10) return 1.0; // moderate: valor padrão
    return 1.5; // aggressive: +600 ao invés de +400
  }

  return 1.0; // manter, fitness, dieta_flexivel
}

/**
 * Determina o estilo de receita baseado na key da estratégia
 */
function determineRecipeStyle(strategyKey: string): "fitness" | "regular" | "high_calorie" {
  switch (strategyKey) {
    case "emagrecer":
    case "cutting":
    case "fitness":
      return "fitness";
    case "ganhar_peso":
      return "high_calorie";
    default:
      return "regular";
  }
}

/**
 * Gera instruções para o prompt de IA baseado na estratégia
 */
export function buildStrategyInstructions(context: StrategyContext, weightDifference: number): string {
  if (!context.strategy) {
    return `
🎯 OBJETIVO: ALIMENTAÇÃO EQUILIBRADA
- Receitas balanceadas e nutritivas
- Proporção padrão de macronutrientes`;
  }

  const strategy = context.strategy;

  if (strategy.is_flexible) {
    return `
🎯 OBJETIVO: DIETA FLEXÍVEL
- Usuário define suas próprias metas calóricas
- Respeitar proporções de macronutrientes definidas pelo usuário
- Flexibilidade nas escolhas alimentares`;
  }

  const calorieText = context.calorieAdjustment < 0 
    ? `Déficit calórico: ${Math.abs(context.calorieAdjustment)} kcal/dia`
    : context.calorieAdjustment > 0 
      ? `Superávit calórico: +${context.calorieAdjustment} kcal/dia`
      : `Calorias equilibradas para manutenção`;

  const macroText = `
- Proteína: ${context.proteinMultiplier}g por kg de peso corporal
- Carboidratos: ${Math.round(context.carbRatio * 100)}% das calorias
- Gorduras: ${Math.round(context.fatRatio * 100)}% das calorias`;

  let styleInstructions = "";
  switch (strategy.key) {
    case "emagrecer":
      styleInstructions = `
- PRIORIZAR: Vegetais volumosos, proteínas magras, fibras
- EVITAR: Carboidratos refinados, açúcares, frituras
- PREFERIR: Grelhados, assados, cozidos no vapor
- ESTILO: RECEITAS FITNESS - baixa caloria, alto valor nutricional`;
      break;
    case "cutting":
      styleInstructions = `
- PRIORIZAR: Proteínas de alta qualidade, vegetais fibrosos
- FOCO: Preservação de massa muscular durante déficit
- EVITAR: Carboidratos refinados, açúcares
- ESTILO: RECEITAS CUTTING - alta proteína, baixa caloria`;
      break;
    case "fitness":
      styleInstructions = `
- PRIORIZAR: Proteínas magras, carboidratos complexos
- FOCO: Recomposição corporal, massa magra
- INCLUIR: Alimentos funcionais, alto valor proteico
- ESTILO: RECEITAS FITNESS - balanceadas, ricas em proteína`;
      break;
    case "ganhar_peso":
      styleInstructions = `
- PRIORIZAR: Proteínas de qualidade, carboidratos complexos, gorduras saudáveis
- INCLUIR: Porções generosas, alimentos densos em nutrientes
- PREFERIR: Combinações calóricas nutritivas
- ESTILO: RECEITAS PARA GANHO DE MASSA - calóricas e nutritivas`;
      break;
    default:
      styleInstructions = `
- Receitas balanceadas e variadas
- Proporção equilibrada de macronutrientes`;
  }

  return `
${strategy.icon || "🎯"} OBJETIVO: ${strategy.label?.toUpperCase() || strategy.key.toUpperCase()}
${strategy.description ? `- ${strategy.description}` : ""}
- Meta de peso: ${weightDifference > 0 ? `${weightDifference}kg` : "manutenção"}
- ${calorieText}
${macroText}
${styleInstructions}`;
}

/**
 * Verifica se uma estratégia é compatível com filtros de categorias
 * Mapeia novas estratégias para os goals antigos para compatibilidade
 */
export function getCompatibleGoalKeys(strategyKey: string): string[] {
  switch (strategyKey) {
    case "emagrecer":
    case "cutting":
      return ["emagrecer"];
    case "manter":
    case "fitness":
      return ["manter"];
    case "ganhar_peso":
      return ["ganhar_peso"];
    case "dieta_flexivel":
      return ["emagrecer", "manter", "ganhar_peso"]; // compatível com todas
    default:
      return ["manter"];
  }
}
