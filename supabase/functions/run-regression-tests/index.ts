import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  module: string;
  test: string;
  passed: boolean;
  error?: string;
  duration_ms: number;
}

interface ModuleTest {
  name: string;
  description: string;
  test: () => Promise<{ passed: boolean; error?: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: TestResult[] = [];
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('[REGRESSION] Iniciando testes de regressão...');

  // ============================================
  // MÓDULO 1: Pool de Alimentos (foods table)
  // ============================================
  const foodsTests: ModuleTest[] = [
    {
      name: "Foods: table exists and has data",
      description: "Verifica se a tabela foods existe e tem registros",
      test: async () => {
        const { count, error } = await supabase
          .from('foods')
          .select('*', { count: 'exact', head: true });
        
        if (error) return { passed: false, error: error.message };
        if (!count || count < 100) return { passed: false, error: `Apenas ${count} alimentos encontrados (esperado >100)` };
        return { passed: true };
      }
    },
    {
      name: "Foods: search by name works",
      description: "Verifica se busca por nome funciona",
      test: async () => {
        const { data, error } = await supabase
          .from('foods')
          .select('id, name')
          .ilike('name', '%arroz%')
          .limit(5);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: 'Nenhum alimento encontrado com "arroz"' };
        return { passed: true };
      }
    },
    {
      name: "Foods: nutritional data is valid",
      description: "Verifica se dados nutricionais estão preenchidos",
      test: async () => {
        const { data, error } = await supabase
          .from('foods')
          .select('id, name, calories_per_100g, protein_per_100g')
          .gt('calories_per_100g', 0)
          .limit(10);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: 'Nenhum alimento com calorias > 0' };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 2: Plano Alimentar (meal_plans)
  // ============================================
  const mealPlanTests: ModuleTest[] = [
    {
      name: "MealPlans: table structure is correct",
      description: "Verifica estrutura da tabela meal_plans",
      test: async () => {
        const { data, error } = await supabase
          .from('meal_plans')
          .select('id, user_id, name, start_date, end_date, is_active, status')
          .limit(1);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "MealPlanItems: relationship works",
      description: "Verifica relacionamento meal_plans -> meal_plan_items",
      test: async () => {
        const { data, error } = await supabase
          .from('meal_plan_items')
          .select('id, meal_plan_id, recipe_name, meal_type, day_of_week')
          .limit(1);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 3: Segurança Alimentar
  // ============================================
  const safetyTests: ModuleTest[] = [
    {
      name: "IntoleranceMappings: has data",
      description: "Verifica se mapeamentos de intolerância existem",
      test: async () => {
        const { count, error } = await supabase
          .from('intolerance_mappings')
          .select('*', { count: 'exact', head: true });
        
        if (error) return { passed: false, error: error.message };
        if (!count || count < 100) return { passed: false, error: `Apenas ${count} mapeamentos (esperado >100)` };
        return { passed: true };
      }
    },
    {
      name: "IntoleranceMappings: lactose has milk",
      description: "Verifica se lactose inclui leite",
      test: async () => {
        const { data, error } = await supabase
          .from('intolerance_mappings')
          .select('ingredient')
          .eq('intolerance_key', 'lactose')
          .ilike('ingredient', '%leite%')
          .limit(1);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: 'Lactose não inclui "leite"' };
        return { passed: true };
      }
    },
    {
      name: "IntoleranceMappings: gluten has wheat",
      description: "Verifica se glúten inclui trigo",
      test: async () => {
        const { data, error } = await supabase
          .from('intolerance_mappings')
          .select('ingredient')
          .or('intolerance_key.eq.gluten,intolerance_key.eq.glúten')
          .ilike('ingredient', '%trigo%')
          .limit(1);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: 'Glúten não inclui "trigo"' };
        return { passed: true };
      }
    },
    {
      name: "DietaryForbidden: vegan blocks meat",
      description: "Verifica se vegano bloqueia carne",
      test: async () => {
        const { data, error } = await supabase
          .from('dietary_forbidden_ingredients')
          .select('ingredient')
          .eq('dietary_key', 'vegana')
          .limit(5);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: 'Vegana não tem ingredientes proibidos' };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 4: Onboarding Options
  // ============================================
  const onboardingTests: ModuleTest[] = [
    {
      name: "OnboardingOptions: intolerances exist",
      description: "Verifica se opções de intolerância existem",
      test: async () => {
        const { data, error } = await supabase
          .from('onboarding_options')
          .select('option_id, label')
          .eq('category', 'intolerances')
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length < 5) return { passed: false, error: `Apenas ${data?.length || 0} intolerâncias ativas` };
        return { passed: true };
      }
    },
    {
      name: "OnboardingOptions: goals exist",
      description: "Verifica se objetivos existem",
      test: async () => {
        const { data, error } = await supabase
          .from('onboarding_options')
          .select('option_id, label')
          .eq('category', 'goals')
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length < 2) return { passed: false, error: `Apenas ${data?.length || 0} objetivos ativos` };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 5: Meal Time Settings
  // ============================================
  const mealTimeTests: ModuleTest[] = [
    {
      name: "MealTimeSettings: all meals configured",
      description: "Verifica se todos os tipos de refeição estão configurados",
      test: async () => {
        const { data, error } = await supabase
          .from('meal_time_settings')
          .select('meal_type, label, start_hour');
        
        if (error) return { passed: false, error: error.message };
        
        const requiredMeals = ['breakfast', 'lunch', 'afternoon_snack', 'dinner', 'supper'];
        const foundMeals = data?.map(d => d.meal_type) || [];
        const missing = requiredMeals.filter(m => !foundMeals.includes(m));
        
        if (missing.length > 0) return { passed: false, error: `Faltam: ${missing.join(', ')}` };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 6: Profiles (User Data)
  // ============================================
  const profileTests: ModuleTest[] = [
    {
      name: "Profiles: table structure correct",
      description: "Verifica estrutura da tabela profiles",
      test: async () => {
        // Just verify the query structure works
        const { error } = await supabase
          .from('profiles')
          .select('id, email, intolerances, dietary_preference, goal, strategy_id')
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 7: Nutritional Strategies
  // ============================================
  const strategyTests: ModuleTest[] = [
    {
      name: "NutritionalStrategies: has active strategies",
      description: "Verifica se existem estratégias nutricionais ativas",
      test: async () => {
        const { data, error } = await supabase
          .from('nutritional_strategies')
          .select('key, label')
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length < 3) return { passed: false, error: `Apenas ${data?.length || 0} estratégias ativas` };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 8: TESTES FUNCIONAIS (Comportamento Real)
  // ============================================
  const functionalTests: ModuleTest[] = [
    {
      name: "FUNC: Food search filter returns results for common terms",
      description: "Testa se busca por alimentos comuns retorna resultados",
      test: async () => {
        // Testar termos comuns de busca
        const searchTerms = ['frango', 'arroz', 'feijao', 'banana', 'ovo'];
        const failures: string[] = [];
        
        for (const term of searchTerms) {
          const { data, error } = await supabase
            .from('foods')
            .select('id, name')
            .or(`name.ilike.%${term}%,name_normalized.ilike.%${term}%`)
            .limit(5);
          
          if (error) {
            failures.push(`${term}: ${error.message}`);
          } else if (!data || data.length === 0) {
            failures.push(`${term}: 0 resultados`);
          }
        }
        
        if (failures.length > 0) {
          return { passed: false, error: `Busca falhou para: ${failures.join(', ')}` };
        }
        return { passed: true };
      }
    },
    {
      name: "FUNC: Food category filter works",
      description: "Testa se filtro por categoria funciona",
      test: async () => {
        // Buscar categorias distintas
        const { data: categories, error: catError } = await supabase
          .from('foods')
          .select('category')
          .not('category', 'is', null)
          .limit(100);
        
        if (catError) return { passed: false, error: catError.message };
        
        const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))];
        if (uniqueCategories.length < 3) {
          return { passed: false, error: `Apenas ${uniqueCategories.length} categorias encontradas` };
        }
        
        // Testar filtro por uma categoria
        const testCategory = uniqueCategories[0];
        const { data, error } = await supabase
          .from('foods')
          .select('id, name, category')
          .eq('category', testCategory)
          .limit(5);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: `Filtro por "${testCategory}" retornou 0 resultados` };
        
        return { passed: true };
      }
    },
    {
      name: "FUNC: Single active meal plan per user constraint",
      description: "Verifica que usuários não têm múltiplos planos ativos",
      test: async () => {
        // Buscar usuários com mais de 1 plano ativo
        const { data, error } = await supabase
          .from('meal_plans')
          .select('user_id')
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        
        // Contar planos por usuário
        const userPlanCount: Record<string, number> = {};
        data?.forEach(plan => {
          userPlanCount[plan.user_id] = (userPlanCount[plan.user_id] || 0) + 1;
        });
        
        const usersWithMultiple = Object.entries(userPlanCount)
          .filter(([, count]) => count > 1)
          .map(([userId, count]) => `${userId.slice(0, 8)}...: ${count} planos`);
        
        if (usersWithMultiple.length > 0) {
          return { 
            passed: false, 
            error: `${usersWithMultiple.length} usuários com múltiplos planos ativos` 
          };
        }
        
        return { passed: true };
      }
    },
    {
      name: "FUNC: Intolerance validation blocks correct ingredients",
      description: "Testa se validação de intolerância bloqueia ingredientes corretos",
      test: async () => {
        // Verificar mapeamentos críticos (chaves em inglês conforme banco)
        const criticalMappings = [
          { intolerance: 'lactose', shouldContain: 'milk' },
          { intolerance: 'peanut', shouldContain: 'peanut' },
          { intolerance: 'seafood', shouldContain: 'shrimp' },
          { intolerance: 'gluten', shouldContain: 'wheat' },
        ];
        
        const failures: string[] = [];
        
        for (const mapping of criticalMappings) {
          const { data, error } = await supabase
            .from('intolerance_mappings')
            .select('ingredient')
            .eq('intolerance_key', mapping.intolerance)
            .ilike('ingredient', `%${mapping.shouldContain}%`)
            .limit(1);
          
          if (error) {
            failures.push(`${mapping.intolerance}: ${error.message}`);
          } else if (!data || data.length === 0) {
            failures.push(`${mapping.intolerance} não contém "${mapping.shouldContain}"`);
          }
        }
        
        if (failures.length > 0) {
          return { passed: false, error: failures.join('; ') };
        }
        return { passed: true };
      }
    },
    {
      name: "FUNC: Safe keywords prevent false positives",
      description: "Verifica se palavras seguras existem para evitar falsos positivos",
      test: async () => {
        // Verificar se existem safe keywords
        const { count, error } = await supabase
          .from('intolerance_safe_keywords')
          .select('*', { count: 'exact', head: true });
        
        if (error) return { passed: false, error: error.message };
        if (!count || count < 10) {
          return { passed: false, error: `Apenas ${count} safe keywords (esperado >10)` };
        }
        return { passed: true };
      }
    },
    {
      name: "FUNC: Key normalization covers all intolerances",
      description: "Verifica se normalização de chaves está completa",
      test: async () => {
        // Verificar se temos normalização para intolerâncias do onboarding
        const { data: onboardingIntolerances } = await supabase
          .from('onboarding_options')
          .select('option_id')
          .eq('category', 'intolerances')
          .eq('is_active', true);
        
        const { data: normalizations } = await supabase
          .from('intolerance_key_normalization')
          .select('onboarding_key');
        
        const onboardingKeys = onboardingIntolerances?.map(o => o.option_id) || [];
        const normalizedKeys = normalizations?.map(n => n.onboarding_key) || [];
        
        const missingNormalizations = onboardingKeys.filter(k => !normalizedKeys.includes(k));
        
        if (missingNormalizations.length > 0) {
          return { 
            passed: false, 
            error: `Normalização faltando para: ${missingNormalizations.slice(0, 5).join(', ')}` 
          };
        }
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 9: ADMIN SYSTEM TESTS
  // ============================================
  const adminTests: ModuleTest[] = [
    {
      name: "ADMIN: User roles table has admins",
      description: "Verifica se existem usuários admin configurados",
      test: async () => {
        const { count, error } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');
        
        if (error) return { passed: false, error: error.message };
        if (!count || count === 0) return { passed: false, error: 'Nenhum admin configurado' };
        return { passed: true };
      }
    },
    {
      name: "ADMIN: AI prompts are configured",
      description: "Verifica se prompts de IA estão configurados",
      test: async () => {
        const { count, error } = await supabase
          .from('ai_prompts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        if (!count || count < 3) return { passed: false, error: `Apenas ${count} prompts ativos` };
        return { passed: true };
      }
    },
    {
      name: "ADMIN: App settings exist",
      description: "Verifica configurações do app",
      test: async () => {
        const { data, error } = await supabase
          .from('app_settings')
          .select('id, primary_color, logo_url')
          .limit(1);
        
        if (error) return { passed: false, error: error.message };
        if (!data || data.length === 0) return { passed: false, error: 'App settings não configurado' };
        return { passed: true };
      }
    },
    {
      name: "ADMIN: Feature flags exist",
      description: "Verifica se feature flags estão configuradas",
      test: async () => {
        const { count, error } = await supabase
          .from('feature_flags')
          .select('*', { count: 'exact', head: true });
        
        if (error) return { passed: false, error: error.message };
        if (!count || count === 0) return { passed: false, error: 'Nenhum feature flag configurado' };
        return { passed: true };
      }
    },
    {
      name: "ADMIN: Dietary profiles are active",
      description: "Verifica se perfis dietéticos estão ativos",
      test: async () => {
        const { count, error } = await supabase
          .from('dietary_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        if (!count || count < 5) return { passed: false, error: `Apenas ${count} perfis dietéticos ativos` };
        return { passed: true };
      }
    },
    {
      name: "ADMIN: Symptom types configured",
      description: "Verifica se tipos de sintomas estão configurados",
      test: async () => {
        const { count, error } = await supabase
          .from('symptom_types')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        if (error) return { passed: false, error: error.message };
        if (!count || count < 5) return { passed: false, error: `Apenas ${count} tipos de sintomas` };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 10: DASHBOARD DATA TESTS
  // ============================================
  const dashboardTests: ModuleTest[] = [
    {
      name: "DASHBOARD: Meal consumption table accessible",
      description: "Verifica se tabela de consumo está acessível",
      test: async () => {
        const { error } = await supabase
          .from('meal_consumption')
          .select('id, user_id, consumed_at, total_calories')
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "DASHBOARD: Water consumption table accessible",
      description: "Verifica se tabela de água está acessível",
      test: async () => {
        const { error } = await supabase
          .from('water_consumption')
          .select('id, user_id, amount_ml, consumed_at')
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "DASHBOARD: Weight history table accessible",
      description: "Verifica se histórico de peso está acessível",
      test: async () => {
        const { error } = await supabase
          .from('weight_history')
          .select('id, user_id, weight, recorded_at')
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "DASHBOARD: Symptom logs table accessible",
      description: "Verifica se logs de sintomas está acessível",
      test: async () => {
        const { error } = await supabase
          .from('symptom_logs')
          .select('id, user_id, symptoms, severity, logged_at')
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "DASHBOARD: Gamification tables accessible",
      description: "Verifica se tabelas de gamificação estão acessíveis",
      test: async () => {
        const { error: gamError } = await supabase
          .from('user_gamification')
          .select('id, user_id, total_xp, current_level')
          .limit(0);
        
        if (gamError) return { passed: false, error: `Gamification: ${gamError.message}` };
        
        const { error: achieveError } = await supabase
          .from('user_achievements')
          .select('id, user_id, achievement_key')
          .limit(0);
        
        if (achieveError) return { passed: false, error: `Achievements: ${achieveError.message}` };
        
        return { passed: true };
      }
    },
    {
      name: "DASHBOARD: Notifications table accessible",
      description: "Verifica se tabela de notificações está acessível",
      test: async () => {
        const { error } = await supabase
          .from('notifications')
          .select('id, user_id, title, message, is_read')
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 11: USER PROFILE TESTS
  // ============================================
  const userProfileTests: ModuleTest[] = [
    {
      name: "PROFILE: All required columns exist",
      description: "Verifica se todas as colunas do perfil existem",
      test: async () => {
        const { error } = await supabase
          .from('profiles')
          .select(`
            id, email, first_name, last_name,
            intolerances, dietary_preference, excluded_ingredients,
            goal, strategy_id,
            weight_current, weight_goal, height, age, sex,
            activity_level, country, timezone,
            default_meal_times, enabled_meals, kids_mode,
            onboarding_completed, created_at, updated_at
          `)
          .limit(0);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "PROFILE: Strategy foreign key works",
      description: "Verifica se foreign key de estratégia funciona",
      test: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, strategy_id, nutritional_strategies(key, label)')
          .not('strategy_id', 'is', null)
          .limit(1);
        
        if (error) return { passed: false, error: error.message };
        return { passed: true };
      }
    },
    {
      name: "PROFILE: Intolerances array works",
      description: "Verifica se array de intolerâncias funciona",
      test: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, intolerances')
          .not('intolerances', 'is', null)
          .limit(5);
        
        if (error) return { passed: false, error: error.message };
        // Verificar se é array válido
        if (data && data.length > 0) {
          const sample = data[0];
          if (!Array.isArray(sample.intolerances)) {
            return { passed: false, error: 'Intolerances não é um array' };
          }
        }
        return { passed: true };
      }
    }
  ];

  // ============================================
  // MÓDULO 12: DATA INTEGRITY TESTS
  // ============================================
  const dataIntegrityTests: ModuleTest[] = [
    {
      name: "INTEGRITY: All intolerance keys normalized",
      description: "Verifica se todas as chaves de intolerância têm normalização",
      test: async () => {
        const { data: onboardingIntolerances } = await supabase
          .from('onboarding_options')
          .select('option_id')
          .eq('category', 'intolerances')
          .eq('is_active', true);
        
        const { data: normalizations } = await supabase
          .from('intolerance_key_normalization')
          .select('onboarding_key, database_key');
        
        const onboardingKeys = onboardingIntolerances?.map(o => o.option_id) || [];
        const normalizedKeys = new Set(normalizations?.map(n => n.onboarding_key) || []);
        
        const missing = onboardingKeys.filter(k => !normalizedKeys.has(k));
        
        if (missing.length > 0) {
          return { passed: false, error: `Normalização faltando: ${missing.join(', ')}` };
        }
        return { passed: true };
      }
    },
    {
      name: "INTEGRITY: All intolerances have mappings",
      description: "Verifica se todas as intolerâncias têm mapeamentos de ingredientes",
      test: async () => {
        const { data: normalizations } = await supabase
          .from('intolerance_key_normalization')
          .select('database_key');
        
        // Excluir "none" que é uma chave especial que não precisa de mapeamento
        const databaseKeys = [...new Set(normalizations?.map(n => n.database_key) || [])]
          .filter(k => k !== 'none');
        
        const { data: mappings } = await supabase
          .from('intolerance_mappings')
          .select('intolerance_key');
        
        const mappedKeys = new Set(mappings?.map(m => m.intolerance_key) || []);
        
        const missing = databaseKeys.filter(k => !mappedKeys.has(k));
        
        if (missing.length > 0) {
          return { passed: false, error: `Mapeamentos faltando para: ${missing.join(', ')}` };
        }
        return { passed: true };
      }
    },
    {
      name: "INTEGRITY: Simple meals have required fields",
      description: "Verifica se refeições simples têm campos obrigatórios",
      test: async () => {
        const { data, error } = await supabase
          .from('simple_meals')
          .select('id, name, meal_type, calories, protein, carbs, fat, ingredients')
          .eq('is_active', true)
          .limit(10);
        
        if (error) return { passed: false, error: error.message };
        
        const invalid = data?.filter(m => 
          !m.name || !m.meal_type || m.calories === null
        ) || [];
        
        if (invalid.length > 0) {
          return { passed: false, error: `${invalid.length} refeições com campos faltando` };
        }
        return { passed: true };
      }
    },
    {
      name: "INTEGRITY: Meal plan items have valid structure",
      description: "Verifica se itens de plano têm estrutura válida",
      test: async () => {
        const { data, error } = await supabase
          .from('meal_plan_items')
          .select('id, recipe_name, meal_type, recipe_ingredients, recipe_instructions')
          .limit(10);
        
        if (error) return { passed: false, error: error.message };
        
        const invalid = data?.filter(item => 
          !item.recipe_name || !item.meal_type
        ) || [];
        
        if (invalid.length > 0) {
          return { passed: false, error: `${invalid.length} itens com campos faltando` };
        }
        return { passed: true };
      }
    },
    {
      name: "INTEGRITY: Multi-language intolerance coverage",
      description: "Verifica cobertura multi-idioma de intolerâncias",
      test: async () => {
        // Verificar se temos termos em múltiplos idiomas para lactose
        const { data, error } = await supabase
          .from('intolerance_mappings')
          .select('ingredient')
          .eq('intolerance_key', 'lactose')
          .or('ingredient.ilike.%milk%,ingredient.ilike.%leite%,ingredient.ilike.%lait%,ingredient.ilike.%milch%,ingredient.ilike.%leche%');
        
        if (error) return { passed: false, error: error.message };
        
        // Deve ter pelo menos 5 termos multi-idioma
        if (!data || data.length < 5) {
          return { passed: false, error: `Apenas ${data?.length || 0} termos multi-idioma para lactose` };
        }
        return { passed: true };
      }
    },
    {
      name: "INTEGRITY: Multi-language safe keywords coverage",
      description: "Verifica cobertura multi-idioma de safe keywords",
      test: async () => {
        // Verificar se temos safe keywords em múltiplos idiomas
        const { data, error } = await supabase
          .from('intolerance_safe_keywords')
          .select('keyword')
          .eq('intolerance_key', 'lactose')
          .or('keyword.ilike.%free%,keyword.ilike.%sem%,keyword.ilike.%sans%,keyword.ilike.%frei%,keyword.ilike.%sin%');
        
        if (error) return { passed: false, error: error.message };
        
        if (!data || data.length < 5) {
          return { passed: false, error: `Apenas ${data?.length || 0} safe keywords multi-idioma` };
        }
        return { passed: true };
      }
    }
  ];

  // ============================================
  // Executar todos os testes
  // ============================================
  const allTests = [
    { module: 'Foods Pool', tests: foodsTests },
    { module: 'Meal Plans', tests: mealPlanTests },
    { module: 'Food Safety', tests: safetyTests },
    { module: 'Onboarding', tests: onboardingTests },
    { module: 'Meal Times', tests: mealTimeTests },
    { module: 'User Profiles', tests: profileTests },
    { module: 'Nutritional Strategies', tests: strategyTests },
    { module: 'Functional Tests', tests: functionalTests },
    { module: 'Admin System', tests: adminTests },
    { module: 'Dashboard Data', tests: dashboardTests },
    { module: 'User Profile Schema', tests: userProfileTests },
    { module: 'Data Integrity', tests: dataIntegrityTests },
  ];

  for (const moduleGroup of allTests) {
    console.log(`\n[REGRESSION] Testando módulo: ${moduleGroup.module}`);
    
    for (const test of moduleGroup.tests) {
      const testStart = Date.now();
      try {
        const result = await test.test();
        results.push({
          module: moduleGroup.module,
          test: test.name,
          passed: result.passed,
          error: result.error,
          duration_ms: Date.now() - testStart
        });
        
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${test.name}${result.error ? ` - ${result.error}` : ''}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({
          module: moduleGroup.module,
          test: test.name,
          passed: false,
          error: errorMessage,
          duration_ms: Date.now() - testStart
        });
        console.log(`  ❌ ${test.name} - EXCEPTION: ${errorMessage}`);
      }
    }
  }

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const totalDuration = Date.now() - startTime;

  const summary = {
    timestamp: new Date().toISOString(),
    total_tests: totalTests,
    passed: passedTests,
    failed: failedTests,
    success_rate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
    duration_ms: totalDuration,
    results,
    failed_tests: results.filter(r => !r.passed).map(r => ({
      module: r.module,
      test: r.test,
      error: r.error
    }))
  };

  console.log(`\n[REGRESSION] ========== RESUMO ==========`);
  console.log(`[REGRESSION] Total: ${totalTests} | Passou: ${passedTests} | Falhou: ${failedTests}`);
  console.log(`[REGRESSION] Taxa de sucesso: ${summary.success_rate}`);
  console.log(`[REGRESSION] Duração: ${totalDuration}ms`);

  if (failedTests > 0) {
    console.log(`\n[REGRESSION] ⚠️ TESTES FALHARAM:`);
    summary.failed_tests.forEach(f => {
      console.log(`  - [${f.module}] ${f.test}: ${f.error}`);
    });
  }

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: failedTests > 0 ? 500 : 200
  });
});

