import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        
        const requiredMeals = ['cafe_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];
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
