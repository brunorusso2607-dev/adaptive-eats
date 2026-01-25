#!/usr/bin/env node

/**
 * SCRIPT DE MIGRAÇÃO AUTOMÁTICA PARA GEMINI 2.0 FLASH-LITE
 * 
 * Este script atualiza TODOS os módulos para usar:
 * 1. gemini-2.0-flash-lite (modelo centralizado)
 * 2. getGeminiApiKey() do banco (não mais env var)
 * 3. CURRENT_AI_MODEL de aiModelConfig.ts
 * 
 * Uso: node migrate_all_modules_to_flash_lite.js
 */

const fs = require('fs');
const path = require('path');

console.log("🚀 INICIANDO MIGRAÇÃO PARA GEMINI 2.0 FLASH-LITE\n");
console.log("═".repeat(60));

let totalFiles = 0;
let updatedFiles = 0;
let errors = 0;

// Padrões a substituir
const patterns = [
  // Substituir modelos antigos
  {
    old: /gemini-2\.5-flash-lite/g,
    new: 'gemini-2.0-flash-lite',
    description: 'Atualizar modelo 2.5 para 2.0 lite'
  },
  {
    old: /gemini-2\.5-flash(?!-)/g,
    new: 'gemini-2.0-flash-lite',
    description: 'Atualizar modelo 2.5 flash para 2.0 lite'
  },
  {
    old: /gemini-2\.0-flash(?!-)/g,
    new: 'gemini-2.0-flash-lite',
    description: 'Atualizar modelo 2.0 flash para 2.0 lite'
  },
  {
    old: /gemini-1\.5-flash/g,
    new: 'gemini-2.0-flash-lite',
    description: 'Atualizar modelo 1.5 para 2.0 lite'
  },
  // Substituir URLs hardcoded
  {
    old: /`https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{modelName\}:generateContent\?key=\$\{([^}]+)\}`/g,
    new: 'buildGeminiApiUrl($1, modelName)',
    description: 'Usar buildGeminiApiUrl() em vez de URL hardcoded'
  },
  {
    old: /`https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-[^:]+:generateContent\?key=\$\{([^}]+)\}`/g,
    new: 'buildGeminiApiUrl($1, CURRENT_AI_MODEL)',
    description: 'Usar buildGeminiApiUrl() com CURRENT_AI_MODEL'
  },
  // Substituir env var por getGeminiApiKey()
  {
    old: /const GOOGLE_AI_API_KEY = Deno\.env\.get\('GOOGLE_AI_API_KEY'\);[\s\S]*?if \(!GOOGLE_AI_API_KEY\) \{[\s\S]*?throw new Error\('GOOGLE_AI_API_KEY not configured'\);[\s\S]*?\}/g,
    new: 'const GOOGLE_AI_API_KEY = await getGeminiApiKey();\n    logAICall(\'MODULE-NAME\', CURRENT_AI_MODEL);',
    description: 'Substituir env var por getGeminiApiKey()'
  }
];

// Módulos a processar
const modulesToProcess = [
  'analyze-food-photo',
  'analyze-label-photo',
  'generate-recipe',
  'chat-assistant',
  'test-prompt-validation',
  'suggest-meal-alternatives',
  'regenerate-meal',
  'regenerate-ai-meal-alternatives',
  'generate-emoji',
  'generate-description',
  'validate-ingredients',
  'validate-food-ai',
  'test-all-prompts-validation',
  'get-hardcoded-prompts'
];

function processFile(filePath, moduleName) {
  try {
    totalFiles++;
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    let changes = [];
    
    // Aplicar todos os padrões
    patterns.forEach(pattern => {
      const matches = content.match(pattern.old);
      if (matches) {
        content = content.replace(pattern.old, pattern.new);
        modified = true;
        changes.push(pattern.description);
      }
    });
    
    // Adicionar imports se necessário
    if (modified && !content.includes('aiModelConfig.ts')) {
      const importLine = 'import { CURRENT_AI_MODEL, buildGeminiApiUrl, TASK_CONFIGS, logAICall, handleGeminiError } from "../_shared/aiModelConfig.ts";\n';
      
      // Inserir após o import do getGeminiKey
      if (content.includes('getGeminiKey.ts')) {
        content = content.replace(
          /(import.*getGeminiKey\.ts";)/,
          '$1\n' + importLine
        );
      } else {
        // Inserir após os primeiros imports
        content = content.replace(
          /(import.*from.*\n)/,
          '$1' + importLine
        );
      }
    }
    
    // Substituir nome do módulo no logAICall
    content = content.replace(/logAICall\('MODULE-NAME'/g, `logAICall('${moduleName.toUpperCase()}'`);
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      updatedFiles++;
      console.log(`   ✅ ${moduleName}`);
      changes.forEach(change => console.log(`      - ${change}`));
      return true;
    } else {
      console.log(`   ⏭️  ${moduleName} (sem mudanças necessárias)`);
      return false;
    }
    
  } catch (error) {
    errors++;
    console.log(`   ❌ Erro ao processar ${moduleName}: ${error.message}`);
    return false;
  }
}

// Processar todos os módulos
console.log("\n📝 PROCESSANDO MÓDULOS:\n");

modulesToProcess.forEach(moduleName => {
  const filePath = path.join(__dirname, 'supabase', 'functions', moduleName, 'index.ts');
  processFile(filePath, moduleName);
});

// Relatório final
console.log("\n" + "═".repeat(60));
console.log("📊 RELATÓRIO FINAL");
console.log("═".repeat(60));

console.log(`\n✅ Arquivos processados: ${totalFiles}`);
console.log(`✅ Arquivos atualizados: ${updatedFiles}`);
console.log(`❌ Erros: ${errors}`);

const successRate = totalFiles > 0 ? ((updatedFiles / totalFiles) * 100).toFixed(1) : 0;
console.log(`🎯 Taxa de sucesso: ${successRate}%`);

if (errors === 0 && updatedFiles > 0) {
  console.log("\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("1. Revisar as mudanças nos arquivos");
  console.log("2. Testar os módulos atualizados");
  console.log("3. Fazer commit das mudanças");
  process.exit(0);
} else if (errors > 0) {
  console.log("\n⚠️  MIGRAÇÃO CONCLUÍDA COM ERROS");
  console.log("Revise os erros acima e corrija manualmente");
  process.exit(1);
} else {
  console.log("\n✅ Nenhuma mudança necessária");
  process.exit(0);
}
