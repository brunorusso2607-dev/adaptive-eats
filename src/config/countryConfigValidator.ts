/**
 * Validação de herança de configuração de países
 * Pode ser executado diretamente no console do navegador
 */

import {
  getCountryConfig,
  getSearchPlaceholder,
  getCountryLanguage,
  getNutritionalSourcesForCountry,
  getConfiguredCountries,
  hasCustomConfig,
} from './countryConfig';

// Países configurados explicitamente
const CONFIGURED_COUNTRIES = ['BR', 'PT', 'US', 'GB', 'ES', 'MX', 'AR', 'CO', 'FR', 'IT', 'DE'];

// Países não configurados (devem herdar do DEFAULT)
const UNCONFIGURED_COUNTRIES = ['JP', 'CN', 'KR', 'IN', 'AU', 'CA', 'NZ', 'ZA', 'RU', 'PL'];

export interface TestResult {
  country: string;
  status: 'passed' | 'failed';
  message: string;
  details?: Record<string, unknown>;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

/**
 * Executa todos os testes de configuração de países
 */
export function runCountryConfigTests(): TestSummary {
  const results: TestResult[] = [];

  // Teste 1: Países configurados devem ter configuração completa
  console.log('🧪 Testando países configurados...');
  CONFIGURED_COUNTRIES.forEach(code => {
    try {
      const config = getCountryConfig(code);
      const placeholder = getSearchPlaceholder(code);
      const language = getCountryLanguage(code);
      const sources = getNutritionalSourcesForCountry(code);

      const checks = {
        hasCode: config.code === code,
        hasLanguage: !!language,
        hasPlaceholder: placeholder.text.length > 10,
        hasHint: placeholder.hint.length > 10,
        hasSources: sources.length > 0,
        hasUSDA: sources.includes('USDA'),
        hasCustomConfig: hasCustomConfig(code)
      };

      const allPassed = Object.values(checks).every(v => v === true);

      results.push({
        country: code,
        status: allPassed ? 'passed' : 'failed',
        message: allPassed 
          ? `✅ ${code}: Configuração completa` 
          : `❌ ${code}: Verificações falharam`,
        details: checks
      });
    } catch (e) {
      results.push({
        country: code,
        status: 'failed',
        message: `❌ ${code}: Erro - ${e}`
      });
    }
  });

  // Teste 2: Países não configurados devem herdar do DEFAULT
  console.log('🧪 Testando herança para países não configurados...');
  UNCONFIGURED_COUNTRIES.forEach(code => {
    try {
      const config = getCountryConfig(code);
      const placeholder = getSearchPlaceholder(code);

      const checks = {
        inheritsLanguage: config.language === 'pt',
        inheritsLocale: config.locale === 'pt-BR',
        inheritsMeasurement: config.measurementSystem === 'metric',
        inheritsTBCA: config.nutritionalSources.includes('TBCA'),
        inheritsUSDA: config.nutritionalSources.includes('USDA'),
        inheritsPlaceholder: placeholder.text.includes('arroz integral'),
        noCustomConfig: !hasCustomConfig(code)
      };

      const allPassed = Object.values(checks).every(v => v === true);

      results.push({
        country: code,
        status: allPassed ? 'passed' : 'failed',
        message: allPassed 
          ? `✅ ${code}: Herança do DEFAULT funcionando` 
          : `❌ ${code}: Herança falhou`,
        details: checks
      });
    } catch (e) {
      results.push({
        country: code,
        status: 'failed',
        message: `❌ ${code}: Erro na herança - ${e}`
      });
    }
  });

  // Teste 3: Edge cases
  console.log('🧪 Testando casos especiais...');
  
  // Null/undefined
  try {
    // @ts-ignore
    const configNull = getCountryConfig(null);
    results.push({
      country: 'null',
      status: configNull.code === 'BR' ? 'passed' : 'failed',
      message: configNull.code === 'BR' ? '✅ null: Fallback para BR' : '❌ null: Fallback falhou'
    });
  } catch (e) {
    results.push({ country: 'null', status: 'failed', message: `❌ null: Erro - ${e}` });
  }

  // Lowercase
  try {
    const configLower = getCountryConfig('br');
    results.push({
      country: 'br (lowercase)',
      status: configLower.code === 'BR' ? 'passed' : 'failed',
      message: configLower.code === 'BR' ? '✅ br: Case insensitive' : '❌ br: Case sensitive falhou'
    });
  } catch (e) {
    results.push({ country: 'br', status: 'failed', message: `❌ br: Erro - ${e}` });
  }

  // Lista de países
  try {
    const countries = getConfiguredCountries();
    const hasAll = CONFIGURED_COUNTRIES.every(c => countries.includes(c));
    results.push({
      country: 'getConfiguredCountries',
      status: hasAll ? 'passed' : 'failed',
      message: hasAll 
        ? `✅ Lista: ${countries.length} países configurados` 
        : '❌ Lista: Países faltando',
      details: { countries }
    });
  } catch (e) {
    results.push({ country: 'list', status: 'failed', message: `❌ Lista: Erro - ${e}` });
  }

  const summary: TestSummary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    results
  };

  // Log resumo
  console.log('\n📊 RESUMO DOS TESTES:');
  console.log(`Total: ${summary.total}`);
  console.log(`✅ Passou: ${summary.passed}`);
  console.log(`❌ Falhou: ${summary.failed}`);
  console.log('\nDetalhes:');
  results.forEach(r => console.log(r.message));

  return summary;
}

/**
 * Valida configuração de um país específico
 */
export function validateCountry(countryCode: string): TestResult {
  try {
    const config = getCountryConfig(countryCode);
    const placeholder = getSearchPlaceholder(countryCode);
    
    return {
      country: countryCode,
      status: 'passed',
      message: `✅ ${countryCode}: Válido`,
      details: {
        code: config.code,
        language: config.language,
        locale: config.locale,
        measurementSystem: config.measurementSystem,
        nutritionalSources: config.nutritionalSources,
        placeholderText: placeholder.text.substring(0, 50) + '...',
        hasCustomConfig: hasCustomConfig(countryCode)
      }
    };
  } catch (e) {
    return {
      country: countryCode,
      status: 'failed',
      message: `❌ ${countryCode}: ${e}`
    };
  }
}
