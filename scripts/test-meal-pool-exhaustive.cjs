/**
 * TESTE EXAUSTIVO DO POOL DE REFEIÇÕES
 * 
 * Este script testa TODAS as combinações de geração de refeições
 * e cataloga todos os erros, gaps e inconsistências encontrados.
 */

const https = require('https');

// Configuração
const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4ODg4MzcsImV4cCI6MjA1MjQ2NDgzN30.sz8neorPB2PvPpy52KMz9VZnYlXsAkzXMBBLqPD2gwI';

// Países e tipos de refeição a testar
const COUNTRIES = ['BR'];
const MEAL_TYPES = ['cafe_manha', 'almoco', 'jantar', 'lanche_manha', 'lanche_tarde', 'ceia'];

// Contadores de erros
const errors = {
  critical: [],
  grave: [],
  medium: [],
  low: []
};

// Regras de validação
const VALIDATION_RULES = {
  // Ingredientes que NUNCA devem aparecer sozinhos como refeição
  NEVER_ALONE: ['cebola', 'alho', 'tomate', 'sal', 'pimenta', 'azeite', 'óleo', 'vinagre', 'limão', 'salsa', 'cebolinha', 'coentro', 'orégano', 'manjericão'],
  
  // Ingredientes que são TEMPEROS e não devem ser componentes principais
  TEMPEROS: ['cebola', 'alho', 'tomate', 'sal', 'pimenta', 'salsa', 'cebolinha', 'coentro', 'orégano', 'manjericão', 'cominho', 'colorau', 'páprica', 'noz-moscada', 'canela', 'cravo', 'louro'],
  
  // Porções máximas por tipo de ingrediente
  MAX_PORTIONS: {
    'azeite': 15,
    'óleo': 15,
    'manteiga': 15,
    'margarina': 15,
    'queijo': 50,
    'cebola': 30,
    'alho': 10,
    'sal': 5,
    'feijão': 150,
  },
  
  // Macros mínimos por tipo de refeição
  MIN_MACROS: {
    'cafe_manha': { calories: 150, protein: 5 },
    'almoco': { calories: 300, protein: 20 },
    'jantar': { calories: 250, protein: 15 },
    'lanche_manha': { calories: 50, protein: 0 },
    'lanche_tarde': { calories: 50, protein: 0 },
    'ceia': { calories: 50, protein: 0 },
  },
  
  // Macros máximos por tipo de refeição
  MAX_MACROS: {
    'cafe_manha': { calories: 600, fat: 30 },
    'almoco': { calories: 900, fat: 40 },
    'jantar': { calories: 800, fat: 35 },
    'lanche_manha': { calories: 300, fat: 15 },
    'lanche_tarde': { calories: 400, fat: 20 },
    'ceia': { calories: 300, fat: 15 },
  },
  
  // Proteínas que devem aparecer em almoço/jantar
  REQUIRED_PROTEINS: ['frango', 'bife', 'carne', 'peixe', 'ovo', 'linguiça', 'porco', 'peru'],
  
  // Pratos compostos (main_dish) que têm macros fixos conhecidos
  COMPOSITE_DISHES: {
    'lasanha': { min_protein: 15, min_fat: 10 },
    'escondidinho': { min_protein: 12, min_fat: 8 },
    'feijoada': { min_protein: 20, min_fat: 15 },
    'strogonoff': { min_protein: 20, min_fat: 12 },
    'risoto': { min_protein: 8, min_fat: 6 },
    'moqueca': { min_protein: 20, min_fat: 10 },
  },
  
  // Nomes genéricos que indicam problema
  GENERIC_NAMES: ['refeição', 'prato', 'comida', 'alimento', 'item', 'porção de'],
};

// Função para chamar a Edge Function
async function callMealPoolFunction(country_code, meal_type, quantity = 5) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      country_code,
      meal_type,
      quantity
    });

    const options = {
      hostname: 'onzdkpqtzfxzcdyxczkn.supabase.co',
      port: 443,
      path: '/functions/v1/populate-meal-pool',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Função para validar uma refeição
function validateMeal(meal, mealType, countryCode) {
  const issues = [];
  const nameLower = (meal.name || '').toLowerCase();
  const components = meal.components || [];
  
  // 1. Validar nome genérico
  for (const generic of VALIDATION_RULES.GENERIC_NAMES) {
    if (nameLower.includes(generic)) {
      issues.push({
        severity: 'grave',
        type: 'nome_generico',
        message: `Nome genérico detectado: "${meal.name}" contém "${generic}"`,
        meal: meal.name
      });
    }
  }
  
  // 2. Validar componentes vazios
  if (components.length === 0) {
    issues.push({
      severity: 'critical',
      type: 'sem_componentes',
      message: `Refeição "${meal.name}" não tem componentes`,
      meal: meal.name
    });
    return issues;
  }
  
  // 3. Validar temperos como componentes principais
  for (const comp of components) {
    const compNameLower = (comp.name || '').toLowerCase();
    
    for (const tempero of VALIDATION_RULES.TEMPEROS) {
      if (compNameLower === tempero || compNameLower.startsWith(tempero + ' ')) {
        // Verificar se é o único componente ou se tem porção grande
        if (components.length <= 2 || (comp.portion_grams && comp.portion_grams > 50)) {
          issues.push({
            severity: 'grave',
            type: 'tempero_como_componente',
            message: `Tempero "${comp.name}" (${comp.portion_grams}g) listado como componente principal em "${meal.name}"`,
            meal: meal.name
          });
        }
      }
    }
  }
  
  // 4. Validar porções absurdas
  for (const comp of components) {
    const compNameLower = (comp.name || '').toLowerCase();
    const portionGrams = comp.portion_grams || 0;
    
    for (const [ingredient, maxPortion] of Object.entries(VALIDATION_RULES.MAX_PORTIONS)) {
      if (compNameLower.includes(ingredient) && portionGrams > maxPortion) {
        issues.push({
          severity: 'grave',
          type: 'porcao_absurda',
          message: `${comp.name}: ${portionGrams}g excede máximo de ${maxPortion}g em "${meal.name}"`,
          meal: meal.name
        });
      }
    }
  }
  
  // 5. Validar ingrediente no nome mas não nos componentes
  const proteinKeywords = ['bife', 'frango', 'peixe', 'carne', 'ovo', 'linguiça'];
  const componentNames = components.map(c => (c.name || '').toLowerCase()).join(' ');
  
  for (const protein of proteinKeywords) {
    if (nameLower.includes(protein) && !componentNames.includes(protein)) {
      issues.push({
        severity: 'critical',
        type: 'proteina_omitida',
        message: `Proteína "${protein}" no nome mas não nos componentes: "${meal.name}"`,
        meal: meal.name
      });
    }
  }
  
  // 6. Validar macros mínimos
  const minMacros = VALIDATION_RULES.MIN_MACROS[mealType] || { calories: 100, protein: 0 };
  const maxMacros = VALIDATION_RULES.MAX_MACROS[mealType] || { calories: 1000, fat: 50 };
  
  if (meal.total_calories && meal.total_calories < minMacros.calories) {
    issues.push({
      severity: 'medium',
      type: 'calorias_baixas',
      message: `Calorias muito baixas: ${meal.total_calories} kcal (mín: ${minMacros.calories}) em "${meal.name}"`,
      meal: meal.name
    });
  }
  
  if (meal.total_calories && meal.total_calories > maxMacros.calories) {
    issues.push({
      severity: 'medium',
      type: 'calorias_altas',
      message: `Calorias muito altas: ${meal.total_calories} kcal (máx: ${maxMacros.calories}) em "${meal.name}"`,
      meal: meal.name
    });
  }
  
  // 7. Validar proteína mínima para almoço/jantar
  if ((mealType === 'almoco' || mealType === 'jantar') && meal.total_protein < minMacros.protein) {
    issues.push({
      severity: 'grave',
      type: 'proteina_baixa',
      message: `Proteína muito baixa: ${meal.total_protein}g (mín: ${minMacros.protein}) em "${meal.name}"`,
      meal: meal.name
    });
  }
  
  // 8. Validar pratos compostos com macros suspeitos
  for (const [dish, macros] of Object.entries(VALIDATION_RULES.COMPOSITE_DISHES)) {
    if (nameLower.includes(dish)) {
      if (meal.total_protein < macros.min_protein) {
        issues.push({
          severity: 'grave',
          type: 'prato_composto_macro_errado',
          message: `${dish}: Proteína ${meal.total_protein}g (mín esperado: ${macros.min_protein}g) em "${meal.name}"`,
          meal: meal.name
        });
      }
      if (meal.total_fat < macros.min_fat) {
        issues.push({
          severity: 'grave',
          type: 'prato_composto_macro_errado',
          message: `${dish}: Gordura ${meal.total_fat}g (mín esperado: ${macros.min_fat}g) em "${meal.name}"`,
          meal: meal.name
        });
      }
    }
  }
  
  // 9. Validar duplicação de ingredientes
  const compNamesArray = components.map(c => (c.name || '').toLowerCase());
  const duplicates = compNamesArray.filter((item, index) => compNamesArray.indexOf(item) !== index);
  if (duplicates.length > 0) {
    issues.push({
      severity: 'medium',
      type: 'ingrediente_duplicado',
      message: `Ingredientes duplicados: ${duplicates.join(', ')} em "${meal.name}"`,
      meal: meal.name
    });
  }
  
  // 10. Validar arroz sem feijão no Brasil (almoço/jantar)
  if (countryCode === 'BR' && (mealType === 'almoco' || mealType === 'jantar')) {
    const hasArroz = componentNames.includes('arroz');
    const hasFeijao = componentNames.includes('feijão') || componentNames.includes('feijao');
    const isComposite = components.some(c => c.type === 'main_dish');
    
    if (!isComposite && hasArroz && !hasFeijao) {
      issues.push({
        severity: 'medium',
        type: 'arroz_sem_feijao',
        message: `Brasil: Arroz sem feijão em "${meal.name}" (exceto pratos compostos)`,
        meal: meal.name
      });
    }
  }
  
  // 11. Validar macro_confidence baixa
  if (meal.macro_confidence === 'low') {
    issues.push({
      severity: 'low',
      type: 'macro_confidence_baixa',
      message: `Confiança baixa nos macros de "${meal.name}" (fonte: ${meal.macro_source})`,
      meal: meal.name
    });
  }
  
  // 12. Validar cebola/alho em prato "acebolado" ou "ao alho"
  if (nameLower.includes('acebolado') || nameLower.includes('ao alho') || nameLower.includes('com cebola')) {
    for (const comp of components) {
      const compNameLower = (comp.name || '').toLowerCase();
      if (compNameLower === 'cebola' || compNameLower === 'alho') {
        issues.push({
          severity: 'medium',
          type: 'tempero_separado',
          message: `Tempero "${comp.name}" separado em prato composto "${meal.name}"`,
          meal: meal.name
        });
      }
    }
  }
  
  return issues;
}

// Função principal de teste
async function runExhaustiveTests() {
  console.log('='.repeat(80));
  console.log('🧪 TESTE EXAUSTIVO DO POOL DE REFEIÇÕES');
  console.log('='.repeat(80));
  console.log(`Data: ${new Date().toISOString()}`);
  console.log('');
  
  const allIssues = [];
  const summary = {
    total_meals_tested: 0,
    total_issues: 0,
    critical: 0,
    grave: 0,
    medium: 0,
    low: 0,
    by_meal_type: {},
    by_issue_type: {}
  };
  
  for (const country of COUNTRIES) {
    console.log(`\n🌍 Testando país: ${country}`);
    console.log('-'.repeat(40));
    
    for (const mealType of MEAL_TYPES) {
      console.log(`\n  📋 Tipo: ${mealType}`);
      
      try {
        const result = await callMealPoolFunction(country, mealType, 10);
        
        if (result.error) {
          console.log(`    ❌ Erro na chamada: ${result.error}`);
          allIssues.push({
            severity: 'critical',
            type: 'api_error',
            message: `Erro na API para ${country}/${mealType}: ${result.error}`,
            meal: 'N/A'
          });
          continue;
        }
        
        const meals = result.meals || result.inserted || [];
        console.log(`    📊 Refeições geradas: ${meals.length}`);
        
        // Validar cada refeição
        for (const meal of meals) {
          summary.total_meals_tested++;
          const issues = validateMeal(meal, mealType, country);
          
          for (const issue of issues) {
            allIssues.push({
              ...issue,
              country,
              mealType
            });
            
            summary.total_issues++;
            summary[issue.severity]++;
            
            // Contar por tipo de refeição
            if (!summary.by_meal_type[mealType]) {
              summary.by_meal_type[mealType] = 0;
            }
            summary.by_meal_type[mealType]++;
            
            // Contar por tipo de erro
            if (!summary.by_issue_type[issue.type]) {
              summary.by_issue_type[issue.type] = 0;
            }
            summary.by_issue_type[issue.type]++;
          }
          
          if (issues.length > 0) {
            console.log(`    ⚠️ ${meal.name}: ${issues.length} problema(s)`);
          }
        }
        
      } catch (error) {
        console.log(`    ❌ Exceção: ${error.message}`);
        allIssues.push({
          severity: 'critical',
          type: 'exception',
          message: `Exceção para ${country}/${mealType}: ${error.message}`,
          meal: 'N/A'
        });
      }
      
      // Pequena pausa para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Gerar relatório final
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(80));
  
  console.log(`\n📈 RESUMO GERAL:`);
  console.log(`   Total de refeições testadas: ${summary.total_meals_tested}`);
  console.log(`   Total de problemas encontrados: ${summary.total_issues}`);
  console.log(`   - CRÍTICOS: ${summary.critical}`);
  console.log(`   - GRAVES: ${summary.grave}`);
  console.log(`   - MÉDIOS: ${summary.medium}`);
  console.log(`   - BAIXOS: ${summary.low}`);
  
  console.log(`\n📋 PROBLEMAS POR TIPO DE REFEIÇÃO:`);
  for (const [mealType, count] of Object.entries(summary.by_meal_type).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${mealType}: ${count} problemas`);
  }
  
  console.log(`\n🔍 PROBLEMAS POR CATEGORIA:`);
  for (const [issueType, count] of Object.entries(summary.by_issue_type).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${issueType}: ${count}`);
  }
  
  // Listar todos os problemas críticos e graves
  console.log(`\n❌ PROBLEMAS CRÍTICOS (${summary.critical}):`);
  for (const issue of allIssues.filter(i => i.severity === 'critical')) {
    console.log(`   [${issue.country}/${issue.mealType}] ${issue.message}`);
  }
  
  console.log(`\n⚠️ PROBLEMAS GRAVES (${summary.grave}):`);
  for (const issue of allIssues.filter(i => i.severity === 'grave')) {
    console.log(`   [${issue.country}/${issue.mealType}] ${issue.message}`);
  }
  
  console.log(`\n⚡ PROBLEMAS MÉDIOS (${summary.medium}):`);
  for (const issue of allIssues.filter(i => i.severity === 'medium')) {
    console.log(`   [${issue.country}/${issue.mealType}] ${issue.message}`);
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('FIM DO RELATÓRIO');
  console.log('='.repeat(80));
  
  // Retornar dados para análise
  return { summary, issues: allIssues };
}

// Executar testes
runExhaustiveTests()
  .then(result => {
    console.log('\n✅ Teste concluído com sucesso');
    process.exit(result.summary.critical > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
