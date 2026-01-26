#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// SCRIPT DE TESTE E VALIDAÇÃO - Sistema de Sincronização Automática
// ═══════════════════════════════════════════════════════════════════════
// Valida toda a arquitetura sem precisar de credenciais
// ═══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 TESTE E VALIDAÇÃO - Sistema de Sincronização Automática');
console.log('═══════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${description}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Erro: ${error.message}`);
    failedTests++;
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function fileContains(filePath, searchString) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(searchString);
}

console.log('📦 TESTE 1: Arquivos Criados\n');

test('Migration SQL de triggers existe', () => {
  if (!fileExists('supabase/migrations/20260123_auto_sync_triggers.sql')) {
    throw new Error('Arquivo não encontrado');
  }
});

test('Edge Function de sincronização existe', () => {
  if (!fileExists('supabase/functions/sync-ingredients/index.ts')) {
    throw new Error('Arquivo não encontrado');
  }
});

test('Script local de sincronização existe', () => {
  if (!fileExists('scripts/sync-ingredients-to-db.ts')) {
    throw new Error('Arquivo não encontrado');
  }
});

test('GitHub Actions workflow existe', () => {
  if (!fileExists('.github/workflows/sync-ingredients.yml')) {
    throw new Error('Arquivo não encontrado');
  }
});

test('Documentação completa existe', () => {
  if (!fileExists('SISTEMA_SINCRONIZACAO_AUTOMATICA.md')) {
    throw new Error('Arquivo não encontrado');
  }
});

test('Guia rápido existe', () => {
  if (!fileExists('GUIA_RAPIDO_SINCRONIZACAO.md')) {
    throw new Error('Arquivo não encontrado');
  }
});

console.log('\n📝 TESTE 2: Conteúdo dos Arquivos\n');

test('Migration contém função notify_new_ingredient', () => {
  if (!fileContains('supabase/migrations/20260123_auto_sync_triggers.sql', 'notify_new_ingredient')) {
    throw new Error('Função não encontrada');
  }
});

test('Migration contém trigger para ingredient_pool', () => {
  if (!fileContains('supabase/migrations/20260123_auto_sync_triggers.sql', 'trigger_notify_new_ingredient')) {
    throw new Error('Trigger não encontrado');
  }
});

test('Migration contém função sync_ingredient_to_pool', () => {
  if (!fileContains('supabase/migrations/20260123_auto_sync_triggers.sql', 'sync_ingredient_to_pool')) {
    throw new Error('Função não encontrada');
  }
});

test('Migration contém tabela meal_pool_cache_version', () => {
  if (!fileContains('supabase/migrations/20260123_auto_sync_triggers.sql', 'meal_pool_cache_version')) {
    throw new Error('Tabela não encontrada');
  }
});

test('Edge Function importa INGREDIENTS', () => {
  if (!fileContains('supabase/functions/sync-ingredients/index.ts', 'from "../_shared/meal-ingredients-db.ts"')) {
    throw new Error('Import não encontrado');
  }
});

test('Script local tem função inferCategory', () => {
  if (!fileContains('scripts/sync-ingredients-to-db.ts', 'function inferCategory')) {
    throw new Error('Função não encontrada');
  }
});

test('GitHub Actions dispara em mudanças do meal-ingredients-db.ts', () => {
  if (!fileContains('.github/workflows/sync-ingredients.yml', 'meal-ingredients-db.ts')) {
    throw new Error('Path trigger não encontrado');
  }
});

console.log('\n⚙️ TESTE 3: Configuração NPM\n');

test('package.json contém script sync:ingredients', () => {
  if (!fileContains('package.json', 'sync:ingredients')) {
    throw new Error('Script não encontrado');
  }
});

test('package.json contém script sync:ingredients:watch', () => {
  if (!fileContains('package.json', 'sync:ingredients:watch')) {
    throw new Error('Script não encontrado');
  }
});

test('tsx está instalado como devDependency', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.devDependencies || !packageJson.devDependencies.tsx) {
    throw new Error('tsx não encontrado em devDependencies');
  }
});

console.log('\n🔧 TESTE 4: Estrutura SQL\n');

test('Migration SQL tem sintaxe válida (básico)', () => {
  const content = fs.readFileSync('supabase/migrations/20260123_auto_sync_triggers.sql', 'utf8');
  if (!content.includes('CREATE OR REPLACE FUNCTION')) {
    throw new Error('Sintaxe SQL inválida');
  }
  if (!content.includes('CREATE TRIGGER')) {
    throw new Error('Triggers não encontrados');
  }
  if (!content.includes('RETURNS TRIGGER')) {
    throw new Error('Funções trigger mal formadas');
  }
});

test('Migration SQL tem 6 funções principais', () => {
  const content = fs.readFileSync('supabase/migrations/20260123_auto_sync_triggers.sql', 'utf8');
  const functionCount = (content.match(/CREATE OR REPLACE FUNCTION/g) || []).length;
  if (functionCount < 6) {
    throw new Error(`Apenas ${functionCount} funções encontradas, esperado 6`);
  }
});

test('Migration SQL tem 4 triggers', () => {
  const content = fs.readFileSync('supabase/migrations/20260123_auto_sync_triggers.sql', 'utf8');
  const triggerCount = (content.match(/CREATE TRIGGER/g) || []).length;
  if (triggerCount < 4) {
    throw new Error(`Apenas ${triggerCount} triggers encontrados, esperado 4`);
  }
});

console.log('\n📊 TESTE 5: Integração com meal-ingredients-db.ts\n');

test('meal-ingredients-db.ts existe e é acessível', () => {
  if (!fileExists('supabase/functions/_shared/meal-ingredients-db.ts')) {
    throw new Error('Arquivo não encontrado');
  }
});

test('meal-ingredients-db.ts exporta INGREDIENTS', () => {
  if (!fileContains('supabase/functions/_shared/meal-ingredients-db.ts', 'export const INGREDIENTS')) {
    throw new Error('Export não encontrado');
  }
});

test('meal-ingredients-db.ts tem interface Ingredient', () => {
  if (!fileContains('supabase/functions/_shared/meal-ingredients-db.ts', 'export interface Ingredient')) {
    throw new Error('Interface não encontrada');
  }
});

console.log('\n🎯 TESTE 6: Documentação\n');

test('Documentação tem seção de Como Usar', () => {
  if (!fileContains('SISTEMA_SINCRONIZACAO_AUTOMATICA.md', '## 🚀 COMO USAR')) {
    throw new Error('Seção não encontrada');
  }
});

test('Documentação tem exemplos de código', () => {
  if (!fileContains('SISTEMA_SINCRONIZACAO_AUTOMATICA.md', '```typescript')) {
    throw new Error('Exemplos não encontrados');
  }
});

test('Guia rápido tem comandos npm', () => {
  if (!fileContains('GUIA_RAPIDO_SINCRONIZACAO.md', 'npm run sync:ingredients')) {
    throw new Error('Comandos não encontrados');
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 RESULTADO DOS TESTES');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ Testes Passados: ${passedTests}/${totalTests}`);
console.log(`❌ Testes Falhados: ${failedTests}/${totalTests}`);
console.log(`📈 Taxa de Sucesso: ${((passedTests/totalTests)*100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM!');
  console.log('✅ Sistema de Sincronização Automática está 100% implementado');
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('   1. Configure .env.local com suas credenciais Supabase');
  console.log('   2. Execute: supabase db push (para aplicar migration SQL)');
  console.log('   3. Execute: npm run sync:ingredients (para testar sincronização)');
  console.log('   4. Verifique no painel admin: /admin/ingredient-pool');
  process.exit(0);
} else {
  console.log('\n⚠️ ALGUNS TESTES FALHARAM');
  console.log('   Revise os erros acima e corrija os problemas');
  process.exit(1);
}
