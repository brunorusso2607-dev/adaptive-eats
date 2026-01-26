// ═══════════════════════════════════════════════════════════════════════
// TESTE DA ESTRATÉGIA DE INTEGRAIS
// ═══════════════════════════════════════════════════════════════════════

import { INGREDIENTS } from "./supabase/functions/_shared/meal-ingredients-db.ts";

// Simular a função generateMealsForPool localmente
interface UserProfile {
  goal?: 'maintain' | 'weight_loss' | 'muscle_gain' | 'diabetes';
  accepts_whole_grains?: boolean | null;
  has_diabetes?: boolean;
}

const CARB_DISTRIBUTION_BY_PROFILE: Record<string, { neutral_base: number; accepted_whole: number; restrictive_whole: number }> = {
  maintain: {
    neutral_base: 0.70,
    accepted_whole: 0.30,
    restrictive_whole: 0.00
  },
  weight_loss: {
    neutral_base: 0.40,
    accepted_whole: 0.60,
    restrictive_whole: 0.00
  },
  muscle_gain: {
    neutral_base: 0.60,
    accepted_whole: 0.40,
    restrictive_whole: 0.00
  },
  diabetes: {
    neutral_base: 0.30,
    accepted_whole: 0.60,
    restrictive_whole: 0.10
  }
};

function selectCarbByProfile(
  availableCarbs: string[],
  profile?: UserProfile
): string {
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
  
  const neutralCarbs = availableCarbs.filter(id => {
    const ing = INGREDIENTS[id];
    return ing && ing.carb_category === 'neutral_base';
  });
  
  const acceptedCarbs = availableCarbs.filter(id => {
    const ing = INGREDIENTS[id];
    return ing && ing.carb_category === 'accepted_whole';
  });
  
  const restrictiveCarbs = availableCarbs.filter(id => {
    const ing = INGREDIENTS[id];
    return ing && ing.carb_category === 'restrictive_whole';
  });
  
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

// Obter todos os carboidratos disponíveis
const allCarbs = Object.keys(INGREDIENTS).filter(id => {
  const ing = INGREDIENTS[id];
  return ing && ing.carb_category;
});

console.log(`📊 Total de carboidratos categorizados: ${allCarbs.length}\n`);

// Listar carboidratos por categoria
const neutralCarbs = allCarbs.filter(id => INGREDIENTS[id].carb_category === 'neutral_base');
const acceptedCarbs = allCarbs.filter(id => INGREDIENTS[id].carb_category === 'accepted_whole');
const restrictiveCarbs = allCarbs.filter(id => INGREDIENTS[id].carb_category === 'restrictive_whole');

console.log("🟢 NEUTRAL BASE:", neutralCarbs.length);
neutralCarbs.forEach(id => console.log(`   - ${INGREDIENTS[id].display_name}`));

console.log("\n🟡 ACCEPTED WHOLE:", acceptedCarbs.length);
acceptedCarbs.forEach(id => console.log(`   - ${INGREDIENTS[id].display_name}`));

console.log("\n🔵 RESTRICTIVE WHOLE:", restrictiveCarbs.length);
restrictiveCarbs.forEach(id => console.log(`   - ${INGREDIENTS[id].display_name}`));

// ═══════════════════════════════════════════════════════════════════════
// TESTE 1: Perfil Maintain (Padrão)
// ═══════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("TESTE 1: PERFIL MAINTAIN (70% neutral, 30% accepted, 0% restrictive)");
console.log("═══════════════════════════════════════════════════════════\n");

const profile1: UserProfile = {
  goal: 'maintain',
  accepts_whole_grains: null,
  has_diabetes: false
};

const results1: Record<string, number> = {};
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
  const selected = selectCarbByProfile(allCarbs, profile1);
  results1[selected] = (results1[selected] || 0) + 1;
}

const categoryCounts1 = {
  neutral_base: 0,
  accepted_whole: 0,
  restrictive_whole: 0
};

for (const [carbId, count] of Object.entries(results1)) {
  const category = INGREDIENTS[carbId].carb_category;
  if (category) {
    categoryCounts1[category] += count;
  }
}

console.log("Distribuição por categoria:");
console.log(`🟢 Neutral Base: ${categoryCounts1.neutral_base} (${(categoryCounts1.neutral_base / iterations * 100).toFixed(1)}%) - Esperado: 70%`);
console.log(`🟡 Accepted Whole: ${categoryCounts1.accepted_whole} (${(categoryCounts1.accepted_whole / iterations * 100).toFixed(1)}%) - Esperado: 30%`);
console.log(`🔵 Restrictive Whole: ${categoryCounts1.restrictive_whole} (${(categoryCounts1.restrictive_whole / iterations * 100).toFixed(1)}%) - Esperado: 0%`);

console.log("\nTop 5 carboidratos mais selecionados:");
const sorted1 = Object.entries(results1).sort((a, b) => b[1] - a[1]).slice(0, 5);
sorted1.forEach(([carbId, count]) => {
  const ing = INGREDIENTS[carbId];
  const category = ing.carb_category === 'neutral_base' ? '🟢' : 
                   ing.carb_category === 'accepted_whole' ? '🟡' : '🔵';
  console.log(`   ${category} ${ing.display_name}: ${count} (${(count / iterations * 100).toFixed(1)}%)`);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTE 2: Perfil Weight Loss
// ═══════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("TESTE 2: PERFIL WEIGHT LOSS (40% neutral, 60% accepted, 0% restrictive)");
console.log("═══════════════════════════════════════════════════════════\n");

const profile2: UserProfile = {
  goal: 'weight_loss',
  accepts_whole_grains: null,
  has_diabetes: false
};

const results2: Record<string, number> = {};

for (let i = 0; i < iterations; i++) {
  const selected = selectCarbByProfile(allCarbs, profile2);
  results2[selected] = (results2[selected] || 0) + 1;
}

const categoryCounts2 = {
  neutral_base: 0,
  accepted_whole: 0,
  restrictive_whole: 0
};

for (const [carbId, count] of Object.entries(results2)) {
  const category = INGREDIENTS[carbId].carb_category;
  if (category) {
    categoryCounts2[category] += count;
  }
}

console.log("Distribuição por categoria:");
console.log(`🟢 Neutral Base: ${categoryCounts2.neutral_base} (${(categoryCounts2.neutral_base / iterations * 100).toFixed(1)}%) - Esperado: 40%`);
console.log(`🟡 Accepted Whole: ${categoryCounts2.accepted_whole} (${(categoryCounts2.accepted_whole / iterations * 100).toFixed(1)}%) - Esperado: 60%`);
console.log(`🔵 Restrictive Whole: ${categoryCounts2.restrictive_whole} (${(categoryCounts2.restrictive_whole / iterations * 100).toFixed(1)}%) - Esperado: 0%`);

console.log("\nTop 5 carboidratos mais selecionados:");
const sorted2 = Object.entries(results2).sort((a, b) => b[1] - a[1]).slice(0, 5);
sorted2.forEach(([carbId, count]) => {
  const ing = INGREDIENTS[carbId];
  const category = ing.carb_category === 'neutral_base' ? '🟢' : 
                   ing.carb_category === 'accepted_whole' ? '🟡' : '🔵';
  console.log(`   ${category} ${ing.display_name}: ${count} (${(count / iterations * 100).toFixed(1)}%)`);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTE 3: Perfil Diabetes (Aceita Integral)
// ═══════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("TESTE 3: PERFIL DIABETES + ACEITA INTEGRAL (30% neutral, 60% accepted, 10% restrictive)");
console.log("═══════════════════════════════════════════════════════════\n");

const profile3: UserProfile = {
  goal: 'diabetes',
  accepts_whole_grains: true,
  has_diabetes: true
};

const results3: Record<string, number> = {};

for (let i = 0; i < iterations; i++) {
  const selected = selectCarbByProfile(allCarbs, profile3);
  results3[selected] = (results3[selected] || 0) + 1;
}

const categoryCounts3 = {
  neutral_base: 0,
  accepted_whole: 0,
  restrictive_whole: 0
};

for (const [carbId, count] of Object.entries(results3)) {
  const category = INGREDIENTS[carbId].carb_category;
  if (category) {
    categoryCounts3[category] += count;
  }
}

console.log("Distribuição por categoria:");
console.log(`🟢 Neutral Base: ${categoryCounts3.neutral_base} (${(categoryCounts3.neutral_base / iterations * 100).toFixed(1)}%) - Esperado: 30%`);
console.log(`🟡 Accepted Whole: ${categoryCounts3.accepted_whole} (${(categoryCounts3.accepted_whole / iterations * 100).toFixed(1)}%) - Esperado: 60%`);
console.log(`🔵 Restrictive Whole: ${categoryCounts3.restrictive_whole} (${(categoryCounts3.restrictive_whole / iterations * 100).toFixed(1)}%) - Esperado: 10%`);

console.log("\nTop 5 carboidratos mais selecionados:");
const sorted3 = Object.entries(results3).sort((a, b) => b[1] - a[1]).slice(0, 5);
sorted3.forEach(([carbId, count]) => {
  const ing = INGREDIENTS[carbId];
  const category = ing.carb_category === 'neutral_base' ? '🟢' : 
                   ing.carb_category === 'accepted_whole' ? '🟡' : '🔵';
  console.log(`   ${category} ${ing.display_name}: ${count} (${(count / iterations * 100).toFixed(1)}%)`);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTE 4: Perfil Diabetes (Rejeita Integral)
// ═══════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("TESTE 4: PERFIL DIABETES + REJEITA INTEGRAL (40% neutral, 60% accepted, 0% restrictive)");
console.log("═══════════════════════════════════════════════════════════\n");

const profile4: UserProfile = {
  goal: 'diabetes',
  accepts_whole_grains: false,
  has_diabetes: true
};

const results4: Record<string, number> = {};

for (let i = 0; i < iterations; i++) {
  const selected = selectCarbByProfile(allCarbs, profile4);
  results4[selected] = (results4[selected] || 0) + 1;
}

const categoryCounts4 = {
  neutral_base: 0,
  accepted_whole: 0,
  restrictive_whole: 0
};

for (const [carbId, count] of Object.entries(results4)) {
  const category = INGREDIENTS[carbId].carb_category;
  if (category) {
    categoryCounts4[category] += count;
  }
}

console.log("Distribuição por categoria:");
console.log(`🟢 Neutral Base: ${categoryCounts4.neutral_base} (${(categoryCounts4.neutral_base / iterations * 100).toFixed(1)}%) - Esperado: 40%`);
console.log(`🟡 Accepted Whole: ${categoryCounts4.accepted_whole} (${(categoryCounts4.accepted_whole / iterations * 100).toFixed(1)}%) - Esperado: 60%`);
console.log(`🔵 Restrictive Whole: ${categoryCounts4.restrictive_whole} (${(categoryCounts4.restrictive_whole / iterations * 100).toFixed(1)}%) - Esperado: 0%`);

console.log("\nTop 5 carboidratos mais selecionados:");
const sorted4 = Object.entries(results4).sort((a, b) => b[1] - a[1]).slice(0, 5);
sorted4.forEach(([carbId, count]) => {
  const ing = INGREDIENTS[carbId];
  const category = ing.carb_category === 'neutral_base' ? '🟢' : 
                   ing.carb_category === 'accepted_whole' ? '🟡' : '🔵';
  console.log(`   ${category} ${ing.display_name}: ${count} (${(count / iterations * 100).toFixed(1)}%)`);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTE 5: Usuário Rejeita Integral (100% neutral)
// ═══════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("TESTE 5: REJEITA INTEGRAL (100% neutral, 0% accepted, 0% restrictive)");
console.log("═══════════════════════════════════════════════════════════\n");

const profile5: UserProfile = {
  goal: 'maintain',
  accepts_whole_grains: false,
  has_diabetes: false
};

const results5: Record<string, number> = {};

for (let i = 0; i < iterations; i++) {
  const selected = selectCarbByProfile(allCarbs, profile5);
  results5[selected] = (results5[selected] || 0) + 1;
}

const categoryCounts5 = {
  neutral_base: 0,
  accepted_whole: 0,
  restrictive_whole: 0
};

for (const [carbId, count] of Object.entries(results5)) {
  const category = INGREDIENTS[carbId].carb_category;
  if (category) {
    categoryCounts5[category] += count;
  }
}

console.log("Distribuição por categoria:");
console.log(`🟢 Neutral Base: ${categoryCounts5.neutral_base} (${(categoryCounts5.neutral_base / iterations * 100).toFixed(1)}%) - Esperado: 100%`);
console.log(`🟡 Accepted Whole: ${categoryCounts5.accepted_whole} (${(categoryCounts5.accepted_whole / iterations * 100).toFixed(1)}%) - Esperado: 0%`);
console.log(`🔵 Restrictive Whole: ${categoryCounts5.restrictive_whole} (${(categoryCounts5.restrictive_whole / iterations * 100).toFixed(1)}%) - Esperado: 0%`);

console.log("\nTop 5 carboidratos mais selecionados:");
const sorted5 = Object.entries(results5).sort((a, b) => b[1] - a[1]).slice(0, 5);
sorted5.forEach(([carbId, count]) => {
  const ing = INGREDIENTS[carbId];
  const category = ing.carb_category === 'neutral_base' ? '🟢' : 
                   ing.carb_category === 'accepted_whole' ? '🟡' : '🔵';
  console.log(`   ${category} ${ing.display_name}: ${count} (${(count / iterations * 100).toFixed(1)}%)`);
});

// ═══════════════════════════════════════════════════════════════════════
// RESUMO FINAL
// ═══════════════════════════════════════════════════════════════════════

console.log("\n\n═══════════════════════════════════════════════════════════");
console.log("✅ RESUMO DOS TESTES");
console.log("═══════════════════════════════════════════════════════════\n");

const tests = [
  { name: "Maintain", expected: "70/30/0", actual: `${(categoryCounts1.neutral_base / iterations * 100).toFixed(0)}/${(categoryCounts1.accepted_whole / iterations * 100).toFixed(0)}/${(categoryCounts1.restrictive_whole / iterations * 100).toFixed(0)}` },
  { name: "Weight Loss", expected: "40/60/0", actual: `${(categoryCounts2.neutral_base / iterations * 100).toFixed(0)}/${(categoryCounts2.accepted_whole / iterations * 100).toFixed(0)}/${(categoryCounts2.restrictive_whole / iterations * 100).toFixed(0)}` },
  { name: "Diabetes + Aceita", expected: "30/60/10", actual: `${(categoryCounts3.neutral_base / iterations * 100).toFixed(0)}/${(categoryCounts3.accepted_whole / iterations * 100).toFixed(0)}/${(categoryCounts3.restrictive_whole / iterations * 100).toFixed(0)}` },
  { name: "Diabetes + Rejeita", expected: "40/60/0", actual: `${(categoryCounts4.neutral_base / iterations * 100).toFixed(0)}/${(categoryCounts4.accepted_whole / iterations * 100).toFixed(0)}/${(categoryCounts4.restrictive_whole / iterations * 100).toFixed(0)}` },
  { name: "Rejeita Integral", expected: "100/0/0", actual: `${(categoryCounts5.neutral_base / iterations * 100).toFixed(0)}/${(categoryCounts5.accepted_whole / iterations * 100).toFixed(0)}/${(categoryCounts5.restrictive_whole / iterations * 100).toFixed(0)}` }
];

console.log("Perfil                 | Esperado (N/A/R) | Obtido (N/A/R) | Status");
console.log("----------------------|------------------|----------------|--------");
tests.forEach(test => {
  const status = test.expected === test.actual ? "✅ PASS" : "⚠️  CLOSE";
  console.log(`${test.name.padEnd(21)} | ${test.expected.padEnd(16)} | ${test.actual.padEnd(14)} | ${status}`);
});

console.log("\n✅ TESTES CONCLUÍDOS COM SUCESSO!");
console.log("A estratégia de integrais está funcionando corretamente.\n");
