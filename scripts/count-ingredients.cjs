// Script para contar ingredientes no meal-ingredients-db.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'supabase', 'functions', '_shared', 'meal-ingredients-db.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Extrair o objeto INGREDIENTS
const match = content.match(/export const INGREDIENTS: Record<string, Ingredient> = \{([\s\S]*)\};/);
if (!match) {
  console.error('❌ Não foi possível encontrar o objeto INGREDIENTS');
  process.exit(1);
}

const ingredientsContent = match[1];

// Contar ingredientes (cada linha que termina com },)
const ingredientLines = ingredientsContent.split('\n').filter(line => {
  const trimmed = line.trim();
  return trimmed.match(/^[a-z_]+:/);
});

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('📊 CONTAGEM DE INGREDIENTES - meal-ingredients-db.ts');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`✅ Total de ingredientes: ${ingredientLines.length}`);

// Contar por categoria (comentários)
const categories = {
  'PROTEÍNAS - AVES': 0,
  'PROTEÍNAS - CARNES BOVINAS': 0,
  'PROTEÍNAS - PEIXES': 0,
  'PROTEÍNAS - OVOS': 0,
  'PROTEÍNAS - EMBUTIDOS': 0,
  'PROTEÍNAS - CARNES ESPECIAIS': 0,
  'PROTEÍNAS - PEIXES E FRUTOS DO MAR': 0,
  'PROTEÍNAS - VEGETAIS': 0,
  'CARBOIDRATOS - ARROZ': 0,
  'CARBOIDRATOS - BATATAS': 0,
  'CARBOIDRATOS - PÃES': 0,
  'CARBOIDRATOS - OUTROS': 0,
  'CARBOIDRATOS - ADICIONAIS': 0,
  'LEGUMINOSAS': 0,
  'VEGETAIS - FOLHAS': 0,
  'VEGETAIS - LEGUMES COZIDOS': 0,
  'VEGETAIS - SALADA CRUA': 0,
  'VEGETAIS - TEMPEROS/AROMÁTICOS': 0,
  'FRUTAS': 0,
  'LATICÍNIOS': 0,
  'BEBIDAS': 0,
  'GORDURAS': 0,
  'SEMENTES E OUTROS': 0
};

let currentCategory = null;
const lines = ingredientsContent.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  
  // Detectar categoria
  if (trimmed.startsWith('//')) {
    const categoryName = trimmed.replace('//', '').trim();
    if (categories.hasOwnProperty(categoryName)) {
      currentCategory = categoryName;
    }
  }
  
  // Contar ingrediente
  if (trimmed.match(/^[a-z_]+:/) && currentCategory) {
    categories[currentCategory]++;
  }
}

console.log('\n📋 Ingredientes por categoria:\n');
let total = 0;
for (const [category, count] of Object.entries(categories)) {
  if (count > 0) {
    console.log(`   ${category.padEnd(40)} ${count.toString().padStart(3)}`);
    total += count;
  }
}

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`✅ TOTAL VERIFICADO: ${total} ingredientes`);
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Comparar com banco (180 esperados)
const expected = 170; // 180 total - 10 alternativos
if (total === expected) {
  console.log('✅ SINCRONIZAÇÃO COMPLETA! meal-ingredients-db.ts tem 170 ingredientes base.');
  console.log('✅ Banco tem 180 ingredientes (170 base + 10 alternativos).\n');
} else {
  console.log(`⚠️  DESSINCRONIZADO! Esperado: ${expected}, Encontrado: ${total}`);
  console.log(`   Diferença: ${expected - total} ingredientes faltando\n`);
}
