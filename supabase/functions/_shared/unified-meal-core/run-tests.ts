/**
 * SCRIPT DE EXECUÇÃO DOS TESTES DE PARIDADE
 * 
 * Execute este arquivo para validar que todos os módulos estão funcionando corretamente
 * 
 * Uso:
 * deno run --allow-net --allow-env run-tests.ts
 */

import { runParityTests } from './test-parity.ts';

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   UNIFIED MEAL CORE - TESTES DE PARIDADE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    const result = await runParityTests();
    
    console.log('\n═══════════════════════════════════════════════════════');
    if (result.passed) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
      console.log(`   ${result.summary.passed}/${result.summary.total} testes bem-sucedidos`);
      console.log('═══════════════════════════════════════════════════════\n');
      Deno.exit(0);
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM');
      console.log(`   ${result.summary.passed}/${result.summary.total} testes passaram`);
      console.log(`   ${result.summary.failed} teste(s) falharam`);
      console.log('\n📋 Testes que falharam:');
      result.tests.filter(t => !t.passed).forEach(t => {
        console.log(`   ❌ ${t.name}`);
        if (t.details) console.log(`      ${t.details}`);
      });
      console.log('═══════════════════════════════════════════════════════\n');
      Deno.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERRO AO EXECUTAR TESTES:');
    console.error(error);
    console.log('═══════════════════════════════════════════════════════\n');
    Deno.exit(1);
  }
}

main();
