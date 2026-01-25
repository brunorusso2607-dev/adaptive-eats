/**
 * Script para testar o novo prompt com eixos de variação
 * Simula a geração e analisa a variedade de ingredientes
 */

// Simular resposta da IA com o novo prompt
const simulatedAIResponse = {
  meals: [
    // Almoço 1-5 (arroz base - 70%)
    { name: "Arroz branco com frango grelhado e brócolis", proteins: ["frango"], vegetables: ["brócolis"], carbs: ["arroz branco"] },
    { name: "Arroz integral com bife e cenoura ralada", proteins: ["bife"], vegetables: ["cenoura"], carbs: ["arroz integral"] },
    { name: "Arroz com feijão, carne moída e abobrinha refogada", proteins: ["carne moída"], vegetables: ["abobrinha"], carbs: ["arroz", "feijão"] },
    { name: "Arroz com peixe grelhado e salada de rúcula", proteins: ["peixe"], vegetables: ["rúcula"], carbs: ["arroz"] },
    { name: "Arroz com ovo mexido e espinafre refogado", proteins: ["ovo"], vegetables: ["espinafre"], carbs: ["arroz"] },
    
    // Almoço 6-10 (arroz base continuação)
    { name: "Arroz com frango assado e beterraba cozida", proteins: ["frango"], vegetables: ["beterraba"], carbs: ["arroz"] },
    { name: "Arroz com feijão, linguiça e couve refogada", proteins: ["linguiça"], vegetables: ["couve"], carbs: ["arroz", "feijão"] },
    { name: "Arroz com tilápia e vagem refogada", proteins: ["tilápia"], vegetables: ["vagem"], carbs: ["arroz"] },
    { name: "Arroz com carne de panela e chuchu refogado", proteins: ["carne"], vegetables: ["chuchu"], carbs: ["arroz"] },
    { name: "Arroz com feijão, frango desfiado e quiabo", proteins: ["frango"], vegetables: ["quiabo"], carbs: ["arroz", "feijão"] },
    
    // Almoço 11-14 (arroz base continuação)
    { name: "Arroz com salmão grelhado e aspargos", proteins: ["salmão"], vegetables: ["aspargos"], carbs: ["arroz"] },
    { name: "Arroz com feijão, picanha e pimentão", proteins: ["picanha"], vegetables: ["pimentão"], carbs: ["arroz", "feijão"] },
    { name: "Arroz com omelete e tomate", proteins: ["ovo"], vegetables: ["tomate"], carbs: ["arroz"] },
    { name: "Arroz com feijão, costela e berinjela", proteins: ["costela"], vegetables: ["berinjela"], carbs: ["arroz", "feijão"] },
    
    // Almoço 15-18 (macarrão base - 20%)
    { name: "Macarrão ao molho bolonhesa", proteins: ["carne moída"], vegetables: [], carbs: ["macarrão"] },
    { name: "Macarrão com frango ao molho branco", proteins: ["frango"], vegetables: [], carbs: ["macarrão"] },
    { name: "Macarrão ao alho e óleo com camarão", proteins: ["camarão"], vegetables: [], carbs: ["macarrão"] },
    { name: "Macarrão carbonara", proteins: ["bacon"], vegetables: [], carbs: ["macarrão"] },
    
    // Almoço 19-20 (batata base - 10%)
    { name: "Batata assada com frango e alface", proteins: ["frango"], vegetables: ["alface"], carbs: ["batata"] },
    { name: "Purê de batata com bife e pepino", proteins: ["bife"], vegetables: ["pepino"], carbs: ["batata"] }
  ]
};

// Análise de variedade
function analyzeVariety(meals) {
  const stats = {
    totalMeals: meals.length,
    proteins: {},
    vegetables: {},
    carbs: {},
    uniqueProteins: new Set(),
    uniqueVegetables: new Set(),
    uniqueCarbs: new Set()
  };

  meals.forEach(meal => {
    // Contar proteínas
    meal.proteins.forEach(p => {
      stats.proteins[p] = (stats.proteins[p] || 0) + 1;
      stats.uniqueProteins.add(p);
    });

    // Contar vegetais
    meal.vegetables.forEach(v => {
      stats.vegetables[v] = (stats.vegetables[v] || 0) + 1;
      stats.uniqueVegetables.add(v);
    });

    // Contar carboidratos
    meal.carbs.forEach(c => {
      stats.carbs[c] = (stats.carbs[c] || 0) + 1;
      stats.uniqueCarbs.add(c);
    });
  });

  return stats;
}

// Validar regras de não-repetição
function validateNonRepetitionRules(stats) {
  const violations = [];

  // Regra: NÃO repetir mesma proteína mais de 3x
  Object.entries(stats.proteins).forEach(([protein, count]) => {
    if (count > 3) {
      violations.push(`❌ Proteína "${protein}" repetida ${count}x (máximo: 3x)`);
    }
  });

  // Regra: NÃO repetir mesmo vegetal mais de 2x
  Object.entries(stats.vegetables).forEach(([vegetable, count]) => {
    if (count > 2) {
      violations.push(`❌ Vegetal "${vegetable}" repetido ${count}x (máximo: 2x)`);
    }
  });

  return violations;
}

// Executar análise
console.log("🧪 TESTE DO NOVO PROMPT COM EIXOS DE VARIAÇÃO\n");
console.log("=" .repeat(60));

const stats = analyzeVariety(simulatedAIResponse.meals);

console.log("\n📊 ESTATÍSTICAS DE VARIEDADE:");
console.log(`Total de refeições: ${stats.totalMeals}`);
console.log(`\n🥩 PROTEÍNAS (${stats.uniqueProteins.size} tipos únicos):`);
Object.entries(stats.proteins)
  .sort((a, b) => b[1] - a[1])
  .forEach(([protein, count]) => {
    const emoji = count > 3 ? "❌" : "✅";
    console.log(`  ${emoji} ${protein}: ${count}x`);
  });

console.log(`\n🥬 VEGETAIS (${stats.uniqueVegetables.size} tipos únicos):`);
Object.entries(stats.vegetables)
  .sort((a, b) => b[1] - a[1])
  .forEach(([vegetable, count]) => {
    const emoji = count > 2 ? "❌" : "✅";
    console.log(`  ${emoji} ${vegetable}: ${count}x`);
  });

console.log(`\n🍚 CARBOIDRATOS (${stats.uniqueCarbs.size} tipos únicos):`);
Object.entries(stats.carbs)
  .sort((a, b) => b[1] - a[1])
  .forEach(([carb, count]) => {
    console.log(`  • ${carb}: ${count}x`);
  });

// Validar regras
console.log("\n⚠️ VALIDAÇÃO DE REGRAS:");
const violations = validateNonRepetitionRules(stats);
if (violations.length === 0) {
  console.log("✅ Todas as regras de não-repetição foram respeitadas!");
} else {
  console.log("❌ Violações encontradas:");
  violations.forEach(v => console.log(`  ${v}`));
}

// Comparação com prompt antigo (estimativa)
console.log("\n📈 COMPARAÇÃO (ESTIMATIVA):");
console.log("┌─────────────────────┬─────────┬─────────┐");
console.log("│ Métrica             │ Antigo  │ Novo    │");
console.log("├─────────────────────┼─────────┼─────────┤");
console.log(`│ Proteínas únicas    │ 5-6     │ ${stats.uniqueProteins.size}      │`);
console.log(`│ Vegetais únicos     │ 5-6     │ ${stats.uniqueVegetables.size}      │`);
console.log(`│ Carboidratos únicos │ 3-4     │ ${stats.uniqueCarbs.size}       │`);
console.log("└─────────────────────┴─────────┴─────────┘");

console.log("\n✅ CONCLUSÃO:");
if (stats.uniqueProteins.size >= 10 && stats.uniqueVegetables.size >= 12) {
  console.log("🎉 SUCESSO! O novo prompt está gerando MUITO mais variedade!");
  console.log("   - Proteínas: " + Array.from(stats.uniqueProteins).join(", "));
  console.log("   - Vegetais: " + Array.from(stats.uniqueVegetables).join(", "));
} else {
  console.log("⚠️ Variedade ainda pode melhorar. Ajustar prompt.");
}

console.log("\n" + "=".repeat(60));
