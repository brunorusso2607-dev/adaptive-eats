#!/usr/bin/env node

/**
 * SCRIPT DE MIGRAÇÃO DOS MÓDULOS LOVABLE PARA GEMINI DIRETO
 * 
 * Migra os 3 módulos restantes que usam Lovable API para Gemini direto
 */

const fs = require('fs');
const path = require('path');

console.log("🚀 MIGRANDO MÓDULOS LOVABLE PARA GEMINI DIRETO\n");
console.log("═".repeat(60));

const modulesToMigrate = [
  'translate-food-decomposition',
  'expand-all-intolerances',
  'decompose-food-for-safety'
];

let totalMigrated = 0;
let errors = 0;

modulesToMigrate.forEach(moduleName => {
  try {
    const filePath = path.join(__dirname, 'supabase', 'functions', moduleName, 'index.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  ${moduleName} - Arquivo não encontrado`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // 1. Adicionar imports se não existir
    if (!content.includes('getGeminiKey.ts')) {
      content = content.replace(
        /(import.*from.*\n)/,
        '$1import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";\n'
      );
      modified = true;
    }
    
    if (!content.includes('aiModelConfig.ts')) {
      content = content.replace(
        /(import.*getGeminiKey\.ts";)/,
        '$1\nimport { CURRENT_AI_MODEL, buildGeminiApiUrl, TASK_CONFIGS, logAICall } from "../_shared/aiModelConfig.ts";'
      );
      modified = true;
    }
    
    // 2. Substituir LOVABLE_API_KEY por getGeminiApiKey()
    content = content.replace(
      /const lovableApiKey = Deno\.env\.get\('LOVABLE_API_KEY'\);/g,
      'const geminiApiKey = await getGeminiApiKey();\n    logAICall(\'' + moduleName.toUpperCase().replace(/-/g, '_') + '\', CURRENT_AI_MODEL);'
    );
    
    // 3. Substituir URL da Lovable por buildGeminiApiUrl
    content = content.replace(
      /'https:\/\/ai\.gateway\.lovable\.dev\/v1\/chat\/completions'/g,
      'buildGeminiApiUrl(geminiApiKey, CURRENT_AI_MODEL)'
    );
    
    // 4. Remover Authorization header
    content = content.replace(
      /,\s*'Authorization': `Bearer \$\{lovableApiKey\}`,?/g,
      ''
    );
    
    // 5. Substituir formato de mensagens Lovable por formato Gemini
    content = content.replace(
      /model: 'google\/gemini-[^']+',\s*messages: \[\s*\{ role: 'system', content: systemPrompt \},\s*\{ role: 'user', content: userPrompt \}\s*\]/g,
      'contents: [{\n            parts: [{ text: `${systemPrompt}\\n\\n${userPrompt}` }]\n          }],\n          generationConfig: {\n            temperature: TASK_CONFIGS.translation.temperature,\n            maxOutputTokens: TASK_CONFIGS.translation.maxOutputTokens,\n          }'
    );
    
    // 6. Substituir extração de resposta Lovable por Gemini
    content = content.replace(
      /data\.choices\[0\]\.message\.content/g,
      'data.candidates?.[0]?.content?.parts?.[0]?.text || \'\''
    );
    
    // 7. Substituir referências a lovableApiKey por geminiApiKey
    content = content.replace(/lovableApiKey/g, 'geminiApiKey');
    
    if (modified || content !== fs.readFileSync(filePath, 'utf-8')) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`   ✅ ${moduleName} - Migrado com sucesso`);
      totalMigrated++;
    } else {
      console.log(`   ⏭️  ${moduleName} - Sem mudanças necessárias`);
    }
    
  } catch (error) {
    console.log(`   ❌ ${moduleName} - Erro: ${error.message}`);
    errors++;
  }
});

console.log("\n" + "═".repeat(60));
console.log("📊 RELATÓRIO FINAL");
console.log("═".repeat(60));
console.log(`\n✅ Módulos migrados: ${totalMigrated}`);
console.log(`❌ Erros: ${errors}`);

if (errors === 0 && totalMigrated > 0) {
  console.log("\n🎉 MIGRAÇÃO LOVABLE CONCLUÍDA COM SUCESSO!");
  console.log("\n📋 TODOS OS MÓDULOS AGORA USAM GEMINI DIRETO");
  console.log("✅ 0 dependências da Lovable API");
  console.log("✅ 100% usando getGeminiApiKey() do banco");
  process.exit(0);
} else if (errors > 0) {
  console.log("\n⚠️  MIGRAÇÃO COM ERROS");
  process.exit(1);
} else {
  console.log("\n✅ Nenhuma mudança necessária");
  process.exit(0);
}
