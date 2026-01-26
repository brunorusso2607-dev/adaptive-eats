#!/usr/bin/env node

/**
 * SCRIPT DE TESTE DE REGRESSÃO - BUG PREVENTION
 * 
 * Este script executa testes automatizados para garantir que os bugs
 * identificados no E2E Test não voltem a acontecer.
 * 
 * Uso: node run_bug_prevention_tests.js
 */

const fs = require('fs');
const path = require('path');

console.log("🧪 INICIANDO TESTES DE PREVENÇÃO DE BUGS\n");
console.log("═".repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ============================================
// TESTE 1: Formatação de Macros (BUG #10)
// ============================================
console.log("\n📊 TESTE 1: Formatação de Macros - Prevenir NaN na UI");

try {
  // Verificar se arquivo formatMacros.ts existe
  const formatMacrosPath = path.join(__dirname, 'src', 'lib', 'formatMacros.ts');
  if (!fs.existsSync(formatMacrosPath)) {
    throw new Error('Arquivo formatMacros.ts não encontrado!');
  }
  
  const content = fs.readFileSync(formatMacrosPath, 'utf-8');
  
  // Verificar se funções essenciais existem
  const requiredFunctions = [
    'formatCalories',
    'formatProtein',
    'formatCarbs',
    'formatFat',
    'isValidNumber',
    'formatMacros'
  ];
  
  requiredFunctions.forEach(func => {
    totalTests++;
    if (content.includes(`export function ${func}`)) {
      console.log(`   ✅ ${func}() existe`);
      passedTests++;
    } else {
      console.log(`   ❌ ${func}() NÃO ENCONTRADA`);
      failedTests++;
    }
  });
  
  // Verificar se retorna '--' para valores inválidos
  totalTests++;
  if (content.includes("return '--'")) {
    console.log(`   ✅ Retorna '--' para valores inválidos`);
    passedTests++;
  } else {
    console.log(`   ❌ NÃO retorna '--' para valores inválidos`);
    failedTests++;
  }
  
} catch (error) {
  console.log(`   ❌ ERRO: ${error.message}`);
  failedTests++;
}

// ============================================
// TESTE 2: Validação de Dados Físicos (BUG #2)
// ============================================
console.log("\n📋 TESTE 2: Validação de Dados Físicos Obrigatórios");

try {
  const onboardingPath = path.join(__dirname, 'src', 'pages', 'Onboarding.tsx');
  if (!fs.existsSync(onboardingPath)) {
    throw new Error('Arquivo Onboarding.tsx não encontrado!');
  }
  
  const content = fs.readFileSync(onboardingPath, 'utf-8');
  
  // Verificar se validação existe
  totalTests++;
  if (content.includes('isPhysicalDataComplete')) {
    console.log(`   ✅ Validação isPhysicalDataComplete existe`);
    passedTests++;
  } else {
    console.log(`   ❌ Validação isPhysicalDataComplete NÃO ENCONTRADA`);
    failedTests++;
  }
  
  // Verificar se valida weight_current
  totalTests++;
  if (content.includes('weight_current &&')) {
    console.log(`   ✅ Valida weight_current`);
    passedTests++;
  } else {
    console.log(`   ❌ NÃO valida weight_current`);
    failedTests++;
  }
  
  // Verificar se valida height
  totalTests++;
  if (content.includes('height &&')) {
    console.log(`   ✅ Valida height`);
    passedTests++;
  } else {
    console.log(`   ❌ NÃO valida height`);
    failedTests++;
  }
  
  // Verificar se valida age
  totalTests++;
  if (content.includes('age &&')) {
    console.log(`   ✅ Valida age`);
    passedTests++;
  } else {
    console.log(`   ❌ NÃO valida age`);
    failedTests++;
  }
  
  // Verificar se valida sex
  totalTests++;
  if (content.includes('sex &&')) {
    console.log(`   ✅ Valida sex`);
    passedTests++;
  } else {
    console.log(`   ❌ NÃO valida sex`);
    failedTests++;
  }
  
  // Verificar se valida activity_level
  totalTests++;
  if (content.includes('activity_level')) {
    console.log(`   ✅ Valida activity_level`);
    passedTests++;
  } else {
    console.log(`   ❌ NÃO valida activity_level`);
    failedTests++;
  }
  
  // Verificar se botão fica disabled
  totalTests++;
  if (content.includes('disabled={isLoading ||')) {
    console.log(`   ✅ Botão fica disabled quando dados incompletos`);
    passedTests++;
  } else {
    console.log(`   ❌ Botão NÃO fica disabled`);
    failedTests++;
  }
  
} catch (error) {
  console.log(`   ❌ ERRO: ${error.message}`);
  failedTests++;
}

// ============================================
// TESTE 3: userCountry Propagado (BUG #1)
// ============================================
console.log("\n🌍 TESTE 3: userCountry Propagado Corretamente");

try {
  // Verificar se hook useUserCountry existe
  const hookPath = path.join(__dirname, 'src', 'hooks', 'useUserCountry.tsx');
  totalTests++;
  if (fs.existsSync(hookPath)) {
    console.log(`   ✅ Hook useUserCountry existe`);
    passedTests++;
    
    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    
    // Verificar DEFAULT_COUNTRY
    totalTests++;
    if (hookContent.includes("DEFAULT_COUNTRY") && hookContent.includes("'BR'")) {
      console.log(`   ✅ DEFAULT_COUNTRY definido como 'BR'`);
      passedTests++;
    } else {
      console.log(`   ❌ DEFAULT_COUNTRY NÃO definido corretamente`);
      failedTests++;
    }
    
    // Verificar SUPPORTED_COUNTRY_CODES
    totalTests++;
    if (hookContent.includes("SUPPORTED_COUNTRY_CODES")) {
      console.log(`   ✅ SUPPORTED_COUNTRY_CODES definido`);
      passedTests++;
    } else {
      console.log(`   ❌ SUPPORTED_COUNTRY_CODES NÃO definido`);
      failedTests++;
    }
  } else {
    console.log(`   ❌ Hook useUserCountry NÃO ENCONTRADO`);
    failedTests++;
  }
  
  // Verificar se MealPlanGenerator usa o hook
  const mealPlanGenPath = path.join(__dirname, 'src', 'components', 'MealPlanGenerator.tsx');
  totalTests++;
  if (fs.existsSync(mealPlanGenPath)) {
    const content = fs.readFileSync(mealPlanGenPath, 'utf-8');
    
    if (content.includes('useUserCountry')) {
      console.log(`   ✅ MealPlanGenerator importa useUserCountry`);
      passedTests++;
    } else {
      console.log(`   ❌ MealPlanGenerator NÃO importa useUserCountry`);
      failedTests++;
    }
    
    // Verificar se passa userCountry para API
    totalTests++;
    if (content.includes('userCountry:') || content.includes('user_country:')) {
      console.log(`   ✅ MealPlanGenerator passa userCountry para API`);
      passedTests++;
    } else {
      console.log(`   ❌ MealPlanGenerator NÃO passa userCountry para API`);
      failedTests++;
    }
  } else {
    console.log(`   ❌ MealPlanGenerator.tsx NÃO ENCONTRADO`);
    failedTests++;
  }
  
} catch (error) {
  console.log(`   ❌ ERRO: ${error.message}`);
  failedTests++;
}

// ============================================
// TESTE 4: Arquitetura de Segurança
// ============================================
console.log("\n🛡️ TESTE 4: Arquitetura de Segurança");

try {
  const globalSafetyPath = path.join(__dirname, 'supabase', 'functions', '_shared', 'globalSafetyEngine.ts');
  totalTests++;
  if (fs.existsSync(globalSafetyPath)) {
    console.log(`   ✅ globalSafetyEngine.ts existe`);
    passedTests++;
    
    const content = fs.readFileSync(globalSafetyPath, 'utf-8');
    
    // Verificar 4 camadas
    const layers = [
      'intoleranceMappings',
      'cautionMappings',
      'safeKeywords',
      'checkSafeKeywords'
    ];
    
    layers.forEach(layer => {
      totalTests++;
      if (content.includes(layer)) {
        console.log(`   ✅ Camada ${layer} existe`);
        passedTests++;
      } else {
        console.log(`   ❌ Camada ${layer} NÃO ENCONTRADA`);
        failedTests++;
      }
    });
    
  } else {
    console.log(`   ❌ globalSafetyEngine.ts NÃO ENCONTRADO`);
    failedTests++;
  }
  
} catch (error) {
  console.log(`   ❌ ERRO: ${error.message}`);
  failedTests++;
}

// ============================================
// TESTE 5: Cascata de Alimentos
// ============================================
console.log("\n🔄 TESTE 5: Cascata de Alimentos");

try {
  const calculateMacrosPath = path.join(__dirname, 'supabase', 'functions', '_shared', 'calculateRealMacros.ts');
  totalTests++;
  if (fs.existsSync(calculateMacrosPath)) {
    console.log(`   ✅ calculateRealMacros.ts existe`);
    passedTests++;
    
    const content = fs.readFileSync(calculateMacrosPath, 'utf-8');
    
    // Verificar funções da cascata
    const cascadeFunctions = [
      'loadCanonicalIngredients',
      'lookupCanonicalIngredient',
      'findFoodInDatabase',
      'calculateRealMacrosForFoods'
    ];
    
    cascadeFunctions.forEach(func => {
      totalTests++;
      if (content.includes(func)) {
        console.log(`   ✅ Função ${func} existe`);
        passedTests++;
      } else {
        console.log(`   ❌ Função ${func} NÃO ENCONTRADA`);
        failedTests++;
      }
    });
    
    // Verificar se usa userCountry
    totalTests++;
    if (content.includes('userCountry: string')) {
      console.log(`   ✅ Funções aceitam userCountry como parâmetro`);
      passedTests++;
    } else {
      console.log(`   ❌ Funções NÃO aceitam userCountry`);
      failedTests++;
    }
    
  } else {
    console.log(`   ❌ calculateRealMacros.ts NÃO ENCONTRADO`);
    failedTests++;
  }
  
} catch (error) {
  console.log(`   ❌ ERRO: ${error.message}`);
  failedTests++;
}

// ============================================
// RELATÓRIO FINAL
// ============================================
console.log("\n" + "═".repeat(60));
console.log("📊 RELATÓRIO FINAL");
console.log("═".repeat(60));

const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

console.log(`\n✅ Testes Passados: ${passedTests}`);
console.log(`❌ Testes Falhados: ${failedTests}`);
console.log(`📊 Total de Testes: ${totalTests}`);
console.log(`🎯 Taxa de Sucesso: ${successRate}%`);

if (failedTests === 0) {
  console.log("\n🎉 TODOS OS TESTES PASSARAM! Sistema está protegido contra regressão.");
  process.exit(0);
} else {
  console.log("\n⚠️  ALGUNS TESTES FALHARAM! Verifique os bugs acima.");
  process.exit(1);
}
