// ============================================
// SCRIPT DE VALIDAÇÃO DE TRADUÇÕES E MAPEAMENTO
// ============================================

import { UNIVERSAL_INGREDIENTS } from './supabase/functions/_shared/universal-ingredients-db.ts';

interface ValidationIssue {
  ingredientId: string;
  type: 'missing_translation' | 'empty_translation' | 'duplicate_translation' | 'invalid_format';
  locale?: string;
  details: string;
}

interface ValidationReport {
  totalIngredients: number;
  ingredientsWithIssues: number;
  issues: ValidationIssue[];
  translationCoverage: Record<string, number>;
  summary: {
    completeTranslations: number;
    incompleteTranslations: number;
    missingTranslations: number;
  };
}

const REQUIRED_LOCALES = ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'];
const PLACEHOLDER_WORDS = ['TODO', 'TBD', 'FIXME', 'XXX', 'PLACEHOLDER'];

/**
 * Valida se uma tradução é válida
 */
function isValidTranslation(name: string | undefined): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  
  // Verificar se contém placeholder
  const upperName = name.toUpperCase();
  if (PLACEHOLDER_WORDS.some(p => upperName.includes(p))) {
    return false;
  }
  
  // Verificar se é muito genérico
  const genericWords = ['FOOD', 'ALIMENTO', 'COMIDA', 'ITEM'];
  if (genericWords.includes(upperName.trim())) {
    return false;
  }
  
  return true;
}

/**
 * Valida traduções de um ingrediente
 */
function validateIngredientTranslations(ingredientId: string, ingredient: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Verificar se i18n existe
  if (!ingredient.i18n) {
    issues.push({
      ingredientId,
      type: 'missing_translation',
      details: 'Campo i18n não existe'
    });
    return issues;
  }
  
  // Verificar cada locale obrigatório
  for (const locale of REQUIRED_LOCALES) {
    const translation = ingredient.i18n[locale];
    
    // Verificar se locale existe
    if (!translation) {
      issues.push({
        ingredientId,
        type: 'missing_translation',
        locale,
        details: `Tradução ausente para ${locale}`
      });
      continue;
    }
    
    // Verificar se name existe e é válido
    if (!isValidTranslation(translation.name)) {
      issues.push({
        ingredientId,
        type: 'empty_translation',
        locale,
        details: `Nome inválido ou vazio para ${locale}: "${translation.name}"`
      });
    }
  }
  
  // Verificar duplicações (mesma tradução em múltiplos idiomas - suspeito)
  const translations = new Map<string, string[]>();
  for (const locale of REQUIRED_LOCALES) {
    const name = ingredient.i18n[locale]?.name;
    if (name) {
      const normalized = name.toLowerCase().trim();
      if (!translations.has(normalized)) {
        translations.set(normalized, []);
      }
      translations.get(normalized)!.push(locale);
    }
  }
  
  // Reportar duplicações suspeitas (exceto para nomes próprios internacionais)
  for (const [name, locales] of translations.entries()) {
    if (locales.length > 3) { // Mais de 3 idiomas com mesmo nome é suspeito
      issues.push({
        ingredientId,
        type: 'duplicate_translation',
        details: `Nome "${name}" duplicado em ${locales.length} idiomas: ${locales.join(', ')}`
      });
    }
  }
  
  return issues;
}

/**
 * Executa validação completa
 */
function validateAllTranslations(): ValidationReport {
  const issues: ValidationIssue[] = [];
  const translationCoverage: Record<string, number> = {};
  
  // Inicializar contadores
  for (const locale of REQUIRED_LOCALES) {
    translationCoverage[locale] = 0;
  }
  
  const totalIngredients = Object.keys(UNIVERSAL_INGREDIENTS).length;
  let completeTranslations = 0;
  let incompleteTranslations = 0;
  
  // Validar cada ingrediente
  for (const [id, ingredient] of Object.entries(UNIVERSAL_INGREDIENTS)) {
    const ingredientIssues = validateIngredientTranslations(id, ingredient);
    issues.push(...ingredientIssues);
    
    // Contar cobertura
    let hasAllTranslations = true;
    for (const locale of REQUIRED_LOCALES) {
      if (ingredient.i18n?.[locale]?.name && isValidTranslation(ingredient.i18n[locale].name)) {
        translationCoverage[locale]++;
      } else {
        hasAllTranslations = false;
      }
    }
    
    if (hasAllTranslations) {
      completeTranslations++;
    } else if (ingredientIssues.length > 0) {
      incompleteTranslations++;
    }
  }
  
  return {
    totalIngredients,
    ingredientsWithIssues: new Set(issues.map(i => i.ingredientId)).size,
    issues,
    translationCoverage,
    summary: {
      completeTranslations,
      incompleteTranslations,
      missingTranslations: totalIngredients - completeTranslations - incompleteTranslations
    }
  };
}

/**
 * Gera relatório formatado
 */
function generateReport(report: ValidationReport): string {
  const lines: string[] = [];
  
  lines.push('# 🔍 RELATÓRIO DE VALIDAÇÃO DE TRADUÇÕES');
  lines.push('');
  lines.push(`**Data:** ${new Date().toLocaleString('pt-BR')}`);
  lines.push('');
  
  // Resumo
  lines.push('## 📊 RESUMO GERAL');
  lines.push('');
  lines.push(`- **Total de Ingredientes:** ${report.totalIngredients}`);
  lines.push(`- **Traduções Completas:** ${report.summary.completeTranslations} (${Math.round(report.summary.completeTranslations / report.totalIngredients * 100)}%)`);
  lines.push(`- **Traduções Incompletas:** ${report.summary.incompleteTranslations}`);
  lines.push(`- **Ingredientes com Problemas:** ${report.ingredientsWithIssues}`);
  lines.push(`- **Total de Problemas:** ${report.issues.length}`);
  lines.push('');
  
  // Cobertura por idioma
  lines.push('## 🌐 COBERTURA POR IDIOMA');
  lines.push('');
  lines.push('| Idioma | Traduções | Cobertura |');
  lines.push('|--------|-----------|-----------|');
  for (const locale of REQUIRED_LOCALES) {
    const count = report.translationCoverage[locale];
    const percentage = Math.round(count / report.totalIngredients * 100);
    const status = percentage === 100 ? '✅' : percentage >= 95 ? '⚠️' : '❌';
    lines.push(`| ${status} ${locale} | ${count}/${report.totalIngredients} | ${percentage}% |`);
  }
  lines.push('');
  
  // Problemas por tipo
  const issuesByType = new Map<string, ValidationIssue[]>();
  for (const issue of report.issues) {
    if (!issuesByType.has(issue.type)) {
      issuesByType.set(issue.type, []);
    }
    issuesByType.get(issue.type)!.push(issue);
  }
  
  lines.push('## ⚠️ PROBLEMAS IDENTIFICADOS');
  lines.push('');
  
  for (const [type, issues] of issuesByType.entries()) {
    lines.push(`### ${type.replace(/_/g, ' ').toUpperCase()} (${issues.length})`);
    lines.push('');
    
    // Mostrar apenas os primeiros 20 de cada tipo
    const displayIssues = issues.slice(0, 20);
    for (const issue of displayIssues) {
      const locale = issue.locale ? ` [${issue.locale}]` : '';
      lines.push(`- **${issue.ingredientId}**${locale}: ${issue.details}`);
    }
    
    if (issues.length > 20) {
      lines.push(`- ... e mais ${issues.length - 20} problemas`);
    }
    lines.push('');
  }
  
  // Status final
  lines.push('## ✅ STATUS FINAL');
  lines.push('');
  if (report.issues.length === 0) {
    lines.push('🎉 **TODAS AS TRADUÇÕES ESTÃO VÁLIDAS!**');
  } else if (report.summary.completeTranslations / report.totalIngredients >= 0.95) {
    lines.push('⚠️ **TRADUÇÕES MAJORITARIAMENTE COMPLETAS** - Alguns ajustes necessários');
  } else {
    lines.push('❌ **TRADUÇÕES INCOMPLETAS** - Ação necessária');
  }
  lines.push('');
  
  return lines.join('\n');
}

// Executar validação
console.log('🔍 Iniciando validação de traduções...\n');

const report = validateAllTranslations();
const reportText = generateReport(report);

console.log(reportText);

// Exportar para arquivo
Deno.writeTextFileSync('./RELATORIO_VALIDACAO_TRADUCOES.md', reportText);
console.log('\n✅ Relatório salvo em: RELATORIO_VALIDACAO_TRADUCOES.md');
