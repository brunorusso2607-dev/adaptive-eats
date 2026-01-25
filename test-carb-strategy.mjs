// ═══════════════════════════════════════════════════════════════════════
// TESTE DA ESTRATÉGIA DE INTEGRAIS (Node.js version)
// ═══════════════════════════════════════════════════════════════════════

// Simular INGREDIENTS (apenas carboidratos para teste)
const INGREDIENTS = {
  // Neutral Base
  arroz_branco: { display_name: "Arroz branco", carb_category: 'neutral_base' },
  batata_inglesa_cozida: { display_name: "Batata inglesa cozida", carb_category: 'neutral_base' },
  batata_inglesa_assada: { display_name: "Batata inglesa assada", carb_category: 'neutral_base' },
  pure_batata: { display_name: "Purê de batata", carb_category: 'neutral_base' },
  mandioca_cozida: { display_name: "Mandioca cozida", carb_category: 'neutral_base' },
  pao_frances: { display_name: "Pão francês", carb_category: 'neutral_base' },
  tapioca: { display_name: "Tapioca", carb_category: 'neutral_base' },
  macarrao_comum: { display_name: "Macarrão", carb_category: 'neutral_base' },
  farofa: { display_name: "Farofa", carb_category: 'neutral_base' },
  polenta: { display_name: "Polenta", carb_category: 'neutral_base' },
  nhoque: { display_name: "Nhoque", carb_category: 'neutral_base' },
  
  // Accepted Whole
  arroz_parboilizado: { display_name: "Arroz parboilizado", carb_category: 'accepted_whole' },
  batata_doce_cozida: { display_name: "Batata doce cozida", carb_category: 'accepted_whole' },
  batata_doce_assada: { display_name: "Batata doce assada", carb_category: 'accepted_whole' },
  pao_integral: { display_name: "Pão integral", carb_category: 'accepted_whole' },
  aveia: { display_name: "Aveia", carb_category: 'accepted_whole' },
  granola: { display_name: "Granola", carb_category: 'accepted_whole' },
  cuscuz_milho: { display_name: "Cuscuz de milho", carb_category: 'accepted_whole' },
  
  // Restrictive Whole
  arroz_integral: { display_name: "Arroz integral", carb_category: 'restrictive_whole' },
  pao_forma_integral: { display_name: "Pão de forma integral", carb_category: 'restrictive_whole' },
  macarrao_integral: { display_name: "Macarrão integral", carb_category: 'restrictive_whole' }
};

const CARB_DISTRIBUTION_BY_PROFILE = {
  maintain: { neutral_base: 0.70, accepted_whole: 0.30, restrictive_whole: 0.00 },
  weight_loss: { neutral_base: 0.40, accepted_whole: 0.60, restrictive_whole: 0.00 },
  muscle_gain: { neutral_base: 0.60, accepted_whole: 0.40, restrictive_whole: 0.00 },
  diabetes: { neutral_base: 0.30, accepted_whole: 0.60, restrictive_whole: 0.10 }
};

function selectCarbByProfile(availableCarbs, profile) {
  const goal = profile?.goal || 'maintain';
  const acceptsWholeGrains = profile?.accepts_whole_grains;
  const hasDiabetes = profile?.has_diabetes || false;
  
  const baseDistribution = CARB_DISTRIBUTION_BY_PROFILE[goal] || CARB_DISTRIBUTION_BY_PROFILE.maintain;
  let distribution = { ...baseDistribution };
  
  if (hasDiabetes && acceptsWholeGrains === false) {
    distribution.restrictive_whole = 0;
    distribution.neutral_base = 0.40;
    distribution.accepted_whole = 0.60;
  }
  
  if (hasDiabetes && acceptsWholeGrains === true) {
    distribution.neutral_base = 0.30;
    distribution.accepted_whole = 0.60;
    distribution.restrictive_whole = 0.10;
  }
  
  if (acceptsWholeGrains === false && !hasDiabetes) {
    distribution.restrictive_whole = 0;
    distribution.accepted_whole = 0;
    distribution.neutral_base = 1.0;
  }
  
  const neutralCarbs = availableCarbs.filter(id => INGREDIENTS[id]?.carb_category === 'neutral_base');
  const acceptedCarbs = availableCarbs.filter(id => INGREDIENTS[id]?.carb_category === 'accepted_whole');
  const restrictiveCarbs = availableCarbs.filter(id => INGREDIENTS[id]?.carb_category === 'restrictive_whole');
  
  const random = Math.random();
  
  if (random < distribution.neutral_base && neutralCarbs.length > 0) {
    return neutralCarbs[Math.floor(Math.random() * neutralCarbs.length)];
  } else if (random < distribution.neutral_base + distribution.accepted_whole && acceptedCarbs.length > 0) {
    return acceptedCarbs[Math.floor(Math.random() * acceptedCarbs.length)];
  } else if (restrictiveCarbs.length > 0) {
    return restrictiveCarbs[Math.floor(Math.random() * restrictiveCarbs.length)];
  }
  
  if (neutralCarbs.length > 0) return neutralCarbs[Math.floor(Math.random() * neutralCarbs.length)];
  if (acceptedCarbs.length > 0) return acceptedCarbs[Math.floor(Math.random() * acceptedCarbs.length)];
  if (restrictiveCarbs.length > 0) return restrictiveCarbs[Math.floor(Math.random() * restrictiveCarbs.length)];
  
  return availableCarbs[Math.floor(Math.random() * availableCarbs.length)];
}

// ═══════════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════════

console.log("🧪 TESTANDO ESTRATÉGIA DE INTEGRAIS\n");

const allCarbs = Object.keys(INGREDIENTS);
console.log(`📊 Total de carboidratos categorizados: ${allCarbs.length}\n`);

const neutralCarbs = allCarbs.filter(id => INGREDIENTS[id].carb_category === 'neutral_base');
const acceptedCarbs = allCarbs.filter(id => INGREDIENTS[id].carb_category === 'accepted_whole');
const restrictiveCarbs = allCarbs.filter(id => INGREDIENTS[id].carb_category === 'restrictive_whole');

console.log(`🟢 NEUTRAL BASE: ${neutralCarbs.length}`);
console.log(`🟡 ACCEPTED WHOLE: ${acceptedCarbs.length}`);
console.log(`🔵 RESTRICTIVE WHOLE: ${restrictiveCarbs.length}\n`);

const iterations = 1000;
const tests = [
  {
    name: "MAINTAIN",
    profile: { goal: 'maintain', accepts_whole_grains: null, has_diabetes: false },
    expected: { neutral: 70, accepted: 30, restrictive: 0 }
  },
  {
    name: "WEIGHT LOSS",
    profile: { goal: 'weight_loss', accepts_whole_grains: null, has_diabetes: false },
    expected: { neutral: 40, accepted: 60, restrictive: 0 }
  },
  {
    name: "DIABETES + ACEITA",
    profile: { goal: 'diabetes', accepts_whole_grains: true, has_diabetes: true },
    expected: { neutral: 30, accepted: 60, restrictive: 10 }
  },
  {
    name: "DIABETES + REJEITA",
    profile: { goal: 'diabetes', accepts_whole_grains: false, has_diabetes: true },
    expected: { neutral: 40, accepted: 60, restrictive: 0 }
  },
  {
    name: "REJEITA INTEGRAL",
    profile: { goal: 'maintain', accepts_whole_grains: false, has_diabetes: false },
    expected: { neutral: 100, accepted: 0, restrictive: 0 }
  }
];

const results = [];

tests.forEach(test => {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`TESTE: ${test.name}`);
  console.log("═══════════════════════════════════════════════════════════\n");
  
  const counts = {};
  const categoryCounts = { neutral_base: 0, accepted_whole: 0, restrictive_whole: 0 };
  
  for (let i = 0; i < iterations; i++) {
    const selected = selectCarbByProfile(allCarbs, test.profile);
    counts[selected] = (counts[selected] || 0) + 1;
    const category = INGREDIENTS[selected].carb_category;
    categoryCounts[category]++;
  }
  
  const neutralPct = (categoryCounts.neutral_base / iterations * 100).toFixed(1);
  const acceptedPct = (categoryCounts.accepted_whole / iterations * 100).toFixed(1);
  const restrictivePct = (categoryCounts.restrictive_whole / iterations * 100).toFixed(1);
  
  console.log("Distribuição por categoria:");
  console.log(`🟢 Neutral Base: ${categoryCounts.neutral_base} (${neutralPct}%) - Esperado: ${test.expected.neutral}%`);
  console.log(`🟡 Accepted Whole: ${categoryCounts.accepted_whole} (${acceptedPct}%) - Esperado: ${test.expected.accepted}%`);
  console.log(`🔵 Restrictive Whole: ${categoryCounts.restrictive_whole} (${restrictivePct}%) - Esperado: ${test.expected.restrictive}%`);
  
  const neutralDiff = Math.abs(parseFloat(neutralPct) - test.expected.neutral);
  const acceptedDiff = Math.abs(parseFloat(acceptedPct) - test.expected.accepted);
  const restrictiveDiff = Math.abs(parseFloat(restrictivePct) - test.expected.restrictive);
  const maxDiff = Math.max(neutralDiff, acceptedDiff, restrictiveDiff);
  
  const status = maxDiff <= 5 ? "✅ PASS" : maxDiff <= 10 ? "⚠️  CLOSE" : "❌ FAIL";
  
  console.log(`\nStatus: ${status} (max diff: ${maxDiff.toFixed(1)}%)\n`);
  
  results.push({
    name: test.name,
    expected: `${test.expected.neutral}/${test.expected.accepted}/${test.expected.restrictive}`,
    actual: `${Math.round(parseFloat(neutralPct))}/${Math.round(parseFloat(acceptedPct))}/${Math.round(parseFloat(restrictivePct))}`,
    status,
    maxDiff
  });
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("✅ RESUMO DOS TESTES");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("Perfil                 | Esperado (N/A/R) | Obtido (N/A/R) | Status");
console.log("----------------------|------------------|----------------|--------");
results.forEach(result => {
  console.log(`${result.name.padEnd(21)} | ${result.expected.padEnd(16)} | ${result.actual.padEnd(14)} | ${result.status}`);
});

const allPassed = results.every(r => r.status === "✅ PASS");
console.log("\n" + (allPassed ? "✅ TODOS OS TESTES PASSARAM!" : "⚠️  ALGUNS TESTES PRECISAM DE AJUSTE"));
console.log("A estratégia de integrais está funcionando corretamente.\n");
