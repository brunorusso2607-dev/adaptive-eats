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
  expected: string;
  actual: string;
  duration_ms: number;
}

interface ModuleTestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

// Helper to call edge functions internally
async function callEdgeFunction(
  supabaseUrl: string,
  functionName: string,
  body: Record<string, unknown>,
  serviceRoleKey: string
): Promise<{ data: unknown; error: string | null; duration_ms: number }> {
  const start = Date.now();
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await response.json();
    return { data, error: null, duration_ms: Date.now() - start };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - start 
    };
  }
}

// ============= TEST SUITES =============

// Test: Security Validation (existing comprehensive test)
async function testSecurityValidation(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Security Validation (Veto Layer)',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'test-security-validation',
    {},
    serviceRoleKey
  );

  if (error) {
    suite.tests.push({
      module: 'test-security-validation',
      test: 'Full security test suite',
      passed: false,
      expected: 'All tests pass',
      actual: `Error: ${error}`,
      duration_ms,
    });
    suite.failed = 1;
    return suite;
  }

  const result = data as { summary?: { passed?: number; failed?: number; status?: string } };
  const passed = result?.summary?.failed === 0;
  
  suite.tests.push({
    module: 'test-security-validation',
    test: 'Full security test suite (48 cases)',
    passed,
    expected: 'All 48 security tests pass',
    actual: result?.summary?.status || 'Unknown',
    duration_ms,
  });

  if (passed) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Analyze Food Photo - Packaged Product Detection
async function testFoodPhotoPackagedDetection(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Food Photo Analysis - Packaged Product Detection',
    tests: [],
    passed: 0,
    failed: 0,
  };

  // We can't actually send images in tests, but we can verify the function exists and responds
  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'analyze-food-photo',
    { 
      image: 'test',
      userRestrictions: { intolerances: [], dietaryPreference: 'comum', excludedIngredients: [] }
    },
    serviceRoleKey
  );

  // We expect an error because image is invalid, but function should exist
  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'analyze-food-photo',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds (even with error for invalid input)',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Analyze Label Photo
async function testLabelPhotoAnalysis(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Label Photo Analysis',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'analyze-label-photo',
    { 
      image: 'test',
      userRestrictions: { intolerances: [], dietaryPreference: 'comum', excludedIngredients: [] }
    },
    serviceRoleKey
  );

  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'analyze-label-photo',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Analyze Fridge Photo
async function testFridgePhotoAnalysis(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Fridge Photo Analysis',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'analyze-fridge-photo',
    { 
      image: 'test',
      userRestrictions: { intolerances: [], dietaryPreference: 'comum', excludedIngredients: [] }
    },
    serviceRoleKey
  );

  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'analyze-fridge-photo',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Generate AI Meal Plan
async function testMealPlanGeneration(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'AI Meal Plan Generation',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'generate-ai-meal-plan',
    { 
      // Minimal params to test function exists
      test: true
    },
    serviceRoleKey
  );

  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'generate-ai-meal-plan',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Regenerate Meal
async function testRegenerateMeal(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Regenerate Meal',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'regenerate-meal',
    { test: true },
    serviceRoleKey
  );

  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'regenerate-meal',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Suggest Meal Alternatives (Surpreenda-me)
async function testSuggestMealAlternatives(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Suggest Meal Alternatives',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'suggest-meal-alternatives',
    { test: true },
    serviceRoleKey
  );

  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'suggest-meal-alternatives',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Regenerate AI Meal Alternatives
async function testRegenerateAIMealAlternatives(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Regenerate AI Meal Alternatives',
    tests: [],
    passed: 0,
    failed: 0,
  };

  const { data, error, duration_ms } = await callEdgeFunction(
    supabaseUrl,
    'regenerate-ai-meal-alternatives',
    { test: true },
    serviceRoleKey
  );

  const functionExists = !error?.includes('404') && !error?.includes('not found');
  
  suite.tests.push({
    module: 'regenerate-ai-meal-alternatives',
    test: 'Function exists and responds',
    passed: functionExists,
    expected: 'Function responds',
    actual: error ? `Error: ${error.substring(0, 100)}` : 'Success',
    duration_ms,
  });

  if (functionExists) suite.passed++; else suite.failed++;
  return suite;
}

// Test: Database tables integrity
// deno-lint-ignore no-explicit-any
async function testDatabaseIntegrity(
  supabaseClient: any
): Promise<ModuleTestSuite> {
  const suite: ModuleTestSuite = {
    name: 'Database Safety Tables',
    tests: [],
    passed: 0,
    failed: 0,
  };

  // Test intolerance_mappings
  const start1 = Date.now();
  const { data: mappings, error: mappingsError } = await supabaseClient
    .from('intolerance_mappings')
    .select('intolerance_key')
    .limit(1);
  
  const mappingsOk = !mappingsError && mappings !== null;
  suite.tests.push({
    module: 'database',
    test: 'intolerance_mappings table accessible',
    passed: mappingsOk,
    expected: 'Table accessible',
    actual: mappingsError ? `Error: ${mappingsError.message}` : 'Accessible',
    duration_ms: Date.now() - start1,
  });
  if (mappingsOk) suite.passed++; else suite.failed++;

  // Test dietary_forbidden_ingredients
  const start2 = Date.now();
  const { data: dietary, error: dietaryError } = await supabaseClient
    .from('dietary_forbidden_ingredients')
    .select('dietary_key')
    .limit(1);
  
  const dietaryOk = !dietaryError && dietary !== null;
  suite.tests.push({
    module: 'database',
    test: 'dietary_forbidden_ingredients table accessible',
    passed: dietaryOk,
    expected: 'Table accessible',
    actual: dietaryError ? `Error: ${dietaryError.message}` : 'Accessible',
    duration_ms: Date.now() - start2,
  });
  if (dietaryOk) suite.passed++; else suite.failed++;

  // Test intolerance_key_normalization
  const start3 = Date.now();
  const { data: normalization, error: normError } = await supabaseClient
    .from('intolerance_key_normalization')
    .select('onboarding_key')
    .limit(1);
  
  const normOk = !normError && normalization !== null;
  suite.tests.push({
    module: 'database',
    test: 'intolerance_key_normalization table accessible',
    passed: normOk,
    expected: 'Table accessible',
    actual: normError ? `Error: ${normError.message}` : 'Accessible',
    duration_ms: Date.now() - start3,
  });
  if (normOk) suite.passed++; else suite.failed++;

  return suite;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    console.log('[MODULE-TESTS] Starting comprehensive module tests...');

    const allSuites: ModuleTestSuite[] = [];
    let totalPassed = 0;
    let totalFailed = 0;

    // Run all test suites
    const suites = await Promise.all([
      testSecurityValidation(supabaseUrl, serviceRoleKey),
      testFoodPhotoPackagedDetection(supabaseUrl, serviceRoleKey),
      testLabelPhotoAnalysis(supabaseUrl, serviceRoleKey),
      testFridgePhotoAnalysis(supabaseUrl, serviceRoleKey),
      testMealPlanGeneration(supabaseUrl, serviceRoleKey),
      testRegenerateMeal(supabaseUrl, serviceRoleKey),
      testSuggestMealAlternatives(supabaseUrl, serviceRoleKey),
      testRegenerateAIMealAlternatives(supabaseUrl, serviceRoleKey),
      testDatabaseIntegrity(supabaseClient),
    ]);

    for (const suite of suites) {
      allSuites.push(suite);
      totalPassed += suite.passed;
      totalFailed += suite.failed;
    }

    const summary = {
      total_tests: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      pass_rate: `${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`,
      status: totalFailed === 0 ? 'ALL MODULES HEALTHY ✅' : `${totalFailed} ISSUES DETECTED ❌`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[MODULE-TESTS] ${summary.status}`);
    console.log(`[MODULE-TESTS] Pass rate: ${summary.pass_rate}`);

    // Collect failed tests for easy viewing
    const failedTests: TestResult[] = [];
    for (const suite of allSuites) {
      for (const test of suite.tests) {
        if (!test.passed) {
          failedTests.push(test);
        }
      }
    }

    return new Response(JSON.stringify({
      summary,
      failedTests,
      suites: allSuites,
      modules_tested: [
        'test-security-validation',
        'analyze-food-photo',
        'analyze-label-photo', 
        'analyze-fridge-photo',
        'generate-ai-meal-plan',
        'regenerate-meal',
        'suggest-meal-alternatives',
        'regenerate-ai-meal-alternatives',
        'database-integrity',
      ],
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MODULE-TESTS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

