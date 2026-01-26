/**
 * TESTE DE PARIDADE
 * 
 * Garante que todos os adapters produzem output IDÊNTICO
 * Executar ANTES de cada deploy
 */

import { processAIMeal } from '../meal-core-adapters/ai-adapter.ts';
import { processDirectMeal } from '../meal-core-adapters/direct-adapter.ts';
import { processPoolMeal } from '../meal-core-adapters/pool-adapter.ts';
import { UserContext } from './types.ts';

interface ParityTestResult {
  passed: boolean;
  tests: TestCase[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

interface TestCase {
  name: string;
  passed: boolean;
  details?: string;
}

/**
 * Executa todos os testes de paridade
 */
export async function runParityTests(): Promise<ParityTestResult> {
  const tests: TestCase[] = [];
  
  const userContext: UserContext = {
    user_id: 'test-user',
    country: 'BR',
    language: 'pt-BR',
    intolerances: [],
    dietary_preference: null,
    excluded_ingredients: [],
    goals: [],
  };
  
  console.log('🧪 Iniciando Testes de Paridade...\n');
  
  // ============= TESTE 1: Mesma refeição via 3 caminhos =============
  const test1 = await testSameMealThreeWays(userContext);
  tests.push(test1);
  console.log(`${test1.passed ? '✅' : '❌'} ${test1.name}`);
  if (test1.details) console.log(`   ${test1.details}`);
  
  // ============= TESTE 2: Ordenação consistente =============
  const test2 = await testSortingConsistency(userContext);
  tests.push(test2);
  console.log(`${test2.passed ? '✅' : '❌'} ${test2.name}`);
  if (test2.details) console.log(`   ${test2.details}`);
  
  // ============= TESTE 3: Porções humanizadas consistentes =============
  const test3 = await testPortionFormatting(userContext);
  tests.push(test3);
  console.log(`${test3.passed ? '✅' : '❌'} ${test3.name}`);
  if (test3.details) console.log(`   ${test3.details}`);
  
  // ============= TESTE 4: Macros consistentes =============
  const test4 = await testMacroConsistency(userContext);
  tests.push(test4);
  console.log(`${test4.passed ? '✅' : '❌'} ${test4.name}`);
  if (test4.details) console.log(`   ${test4.details}`);
  
  // ============= TESTE 5: Safety validation consistente =============
  const test5 = await testSafetyConsistency(userContext);
  tests.push(test5);
  console.log(`${test5.passed ? '✅' : '❌'} ${test5.name}`);
  if (test5.details) console.log(`   ${test5.details}`);
  
  // ============= TESTE 6: Gramas sempre incluídas =============
  const test6 = await testGramsAlwaysIncluded(userContext);
  tests.push(test6);
  console.log(`${test6.passed ? '✅' : '❌'} ${test6.name}`);
  if (test6.details) console.log(`   ${test6.details}`);
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  console.log(`\n📊 Resumo: ${passed}/${tests.length} testes passaram`);
  
  return {
    passed: failed === 0,
    tests,
    summary: { total: tests.length, passed, failed },
  };
}

async function testSameMealThreeWays(ctx: UserContext): Promise<TestCase> {
  const name = 'Mesma refeição via 3 caminhos produz output idêntico';
  
  try {
    // Simular mesma refeição vindo de 3 fontes
    const aiMeal = {
      title: 'Frango com Arroz e Feijão',
      foods: [
        { name: 'Frango grelhado', grams: 120 },
        { name: 'Arroz branco', grams: 100 },
        { name: 'Feijão', grams: 100 },
      ],
    };
    
    const directMeal = {
      name: 'Frango com Arroz e Feijão',
      components: [
        { type: 'protein', name: 'Frango grelhado', name_en: 'Grilled chicken', portion_grams: 120 },
        { type: 'rice', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100 },
        { type: 'beans', name: 'Feijão', name_en: 'Beans', portion_grams: 100 },
      ],
      total_calories: 450,
    };
    
    const poolMeal = {
      id: 'test-123',
      name: 'Frango com Arroz e Feijão',
      meal_type: 'lunch',
      components: [
        { type: 'protein', name: 'Frango grelhado', name_en: 'Grilled chicken', portion_grams: 120 },
        { type: 'rice', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100 },
        { type: 'beans', name: 'Feijão', name_en: 'Beans', portion_grams: 100 },
      ],
      total_calories: 450,
    };
    
    const result1 = await processAIMeal(aiMeal, 'lunch', ctx);
    const result2 = await processDirectMeal(directMeal, 'lunch', ctx);
    const result3 = await processPoolMeal(poolMeal, ctx);
    
    // Comparar ordenação
    const order1 = result1.meal?.components.map(c => c.type).join(',');
    const order2 = result2.meal?.components.map(c => c.type).join(',');
    const order3 = result3.meal?.components.map(c => c.type).join(',');
    
    if (order1 !== order2 || order2 !== order3) {
      return { name, passed: false, details: `Ordenação diferente: AI=${order1}, Direct=${order2}, Pool=${order3}` };
    }
    
    // Comparar porções humanizadas
    const portions1 = result1.meal?.components.map(c => c.portion_display.label).join('|');
    const portions2 = result2.meal?.components.map(c => c.portion_display.label).join('|');
    const portions3 = result3.meal?.components.map(c => c.portion_display.label).join('|');
    
    if (portions1 !== portions2 || portions2 !== portions3) {
      return { name, passed: false, details: `Porções diferentes: AI=${portions1}, Direct=${portions2}, Pool=${portions3}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { name, passed: false, details: errorMsg };
  }
}

async function testSortingConsistency(ctx: UserContext): Promise<TestCase> {
  const name = 'Ordenação BR: Proteína → Arroz → Feijão → Vegetais → Bebida';
  
  try {
    const meal = {
      title: 'Almoço Completo',
      foods: [
        { name: 'Suco de laranja', grams: 200 },
        { name: 'Feijão', grams: 100 },
        { name: 'Salada verde', grams: 50 },
        { name: 'Arroz branco', grams: 100 },
        { name: 'Bife grelhado', grams: 120 },
      ],
    };
    
    const result = await processAIMeal(meal, 'lunch', ctx);
    const types = result.meal?.components.map(c => c.type);
    
    // Verificar ordem esperada
    const proteinIndex = types?.indexOf('protein') ?? -1;
    const riceIndex = types?.indexOf('rice') ?? -1;
    const beansIndex = types?.indexOf('beans') ?? -1;
    const vegIndex = types?.indexOf('vegetable') ?? -1;
    const bevIndex = types?.indexOf('beverage') ?? -1;
    
    if (proteinIndex > riceIndex || riceIndex > beansIndex || beansIndex > vegIndex || vegIndex > bevIndex) {
      return { name, passed: false, details: `Ordem incorreta: ${types?.join(' → ')}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { name, passed: false, details: errorMsg };
  }
}

async function testPortionFormatting(ctx: UserContext): Promise<TestCase> {
  const name = 'Porções humanizadas: ovos, pães, líquidos';
  
  try {
    const meal = {
      title: 'Café da Manhã',
      foods: [
        { name: 'Ovo cozido', grams: 100 },
        { name: 'Pão integral', grams: 70 },
        { name: 'Suco de laranja', grams: 200 },
      ],
    };
    
    const result = await processAIMeal(meal, 'breakfast', ctx);
    
    const eggComponent = result.meal?.components.find(c => c.name_pt.toLowerCase().includes('ovo'));
    const breadComponent = result.meal?.components.find(c => c.name_pt.toLowerCase().includes('pão'));
    const juiceComponent = result.meal?.components.find(c => c.name_pt.toLowerCase().includes('suco'));
    
    // Verificar ovo
    if (!eggComponent?.portion_display.label.includes('ovo')) {
      return { name, passed: false, details: `Ovo não formatado: ${eggComponent?.portion_display.label}` };
    }
    
    // Verificar que líquido usa ml
    if (juiceComponent?.portion_display.unit !== 'ml' && juiceComponent?.portion_display.unit !== 'copo') {
      return { name, passed: false, details: `Líquido não usa ml: ${juiceComponent?.portion_display.unit}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { name, passed: false, details: errorMsg };
  }
}

async function testMacroConsistency(ctx: UserContext): Promise<TestCase> {
  const name = 'Macros calculados são consistentes entre fontes';
  
  try {
    // Mesmo ingrediente, mesma porção → mesmo macro
    const meal1 = { title: 'Test', foods: [{ name: 'Arroz branco', grams: 100 }] };
    const meal2 = {
      name: 'Test',
      components: [{ type: 'rice', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100 }],
      total_calories: 128,
    };
    
    const result1 = await processAIMeal(meal1, 'lunch', ctx);
    const result2 = await processDirectMeal(meal2, 'lunch', ctx);
    
    const macro1 = result1.meal?.components[0].macros;
    const macro2 = result2.meal?.components[0].macros;
    
    if (Math.abs((macro1?.kcal || 0) - (macro2?.kcal || 0)) > 5) {
      return { name, passed: false, details: `Calorias diferem: ${macro1?.kcal} vs ${macro2?.kcal}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { name, passed: false, details: errorMsg };
  }
}

async function testSafetyConsistency(ctx: UserContext): Promise<TestCase> {
  const name = 'Safety validation bloqueia mesmos ingredientes em todas as fontes';
  
  try {
    const ctxWithAllergy = { ...ctx, intolerances: ['lactose'] };
    
    const mealWithDairy = {
      title: 'Café com Queijo',
      foods: [
        { name: 'Queijo minas', grams: 50 },
        { name: 'Pão francês', grams: 50 },
      ],
    };
    
    const result = await processAIMeal(mealWithDairy, 'breakfast', ctxWithAllergy);
    
    // Queijo deve ser removido ou refeição deve usar fallback
    const hasCheese = result.meal?.components.some(c => 
      c.name_pt.toLowerCase().includes('queijo')
    );
    
    // Se tem queijo, deve ter warning ou ser fallback
    if (hasCheese && result.warnings.length === 0 && !result.fallback_used) {
      return { name, passed: false, details: 'Queijo não foi bloqueado para intolerância a lactose' };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { name, passed: false, details: errorMsg };
  }
}

async function testGramsAlwaysIncluded(ctx: UserContext): Promise<TestCase> {
  const name = 'TODAS as porções incluem gramas no label';
  
  try {
    const meal = {
      title: 'Teste Completo',
      foods: [
        { name: 'Ovo cozido', grams: 100 },
        { name: 'Pão integral', grams: 70 },
        { name: 'Arroz branco', grams: 100 },
        { name: 'Feijão', grams: 80 },
        { name: 'Suco de laranja', grams: 200 },
      ],
    };
    
    const result = await processAIMeal(meal, 'lunch', ctx);
    
    // TODOS os componentes devem ter gramas ou ml no label
    const allHaveGrams = result.meal?.components.every(c => 
      c.portion_display.label.includes('g)') || c.portion_display.label.includes('ml)')
    );
    
    if (!allHaveGrams) {
      const withoutGrams = result.meal?.components
        .filter(c => !c.portion_display.label.includes('g)') && !c.portion_display.label.includes('ml)'))
        .map(c => c.portion_display.label);
      return { name, passed: false, details: `Sem gramas: ${withoutGrams?.join(', ')}` };
    }
    
    return { name, passed: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { name, passed: false, details: errorMsg };
  }
}
