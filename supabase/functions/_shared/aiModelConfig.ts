/**
 * CENTRALIZED AI MODEL CONFIGURATION
 * 
 * Este arquivo define o modelo de IA usado em TODOS os módulos do sistema.
 * Para trocar o modelo, altere apenas a constante CURRENT_AI_MODEL.
 * 
 * IMPORTANTE: Todos os módulos devem importar esta constante.
 * 
 * COST-OPTIMIZATION: Usando gemini-2.0-flash-lite para melhor custo-benefício
 */

// Modelo atual usado em produção (LITE para otimização de custos)
export const CURRENT_AI_MODEL = "gemini-2.0-flash-lite";

// Modelos disponíveis (para referência)
export const AVAILABLE_MODELS = {
  FLASH_2_0: "gemini-2.0-flash",
  FLASH_2_0_LITE: "gemini-2.0-flash-lite",
  FLASH_2_5: "gemini-2.5-flash",
  FLASH_2_5_LITE: "gemini-2.5-flash-lite",
  PRO_2_5: "gemini-2.5-pro",
} as const;

// Endpoint base da API Google Gemini
export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Constrói a URL completa para chamada da API Gemini
 * @param apiKey - API Key do Gemini
 * @param model - Modelo a ser usado (opcional, usa CURRENT_AI_MODEL por padrão)
 * @returns URL completa para generateContent
 */
export function buildGeminiApiUrl(apiKey: string, model: string = CURRENT_AI_MODEL): string {
  return `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
}

/**
 * Configurações padrão para chamadas Gemini
 */
export const DEFAULT_GEMINI_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
} as const;

/**
 * Configurações para diferentes tipos de tarefas
 */
export const TASK_CONFIGS = {
  // Geração criativa (receitas, planos)
  creative: {
    temperature: 0.8,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
  // Análise precisa (fotos, rótulos)
  analytical: {
    temperature: 0.3,
    topK: 20,
    topP: 0.9,
    maxOutputTokens: 4096,
  },
  // Tradução/conversão
  translation: {
    temperature: 0.2,
    topK: 10,
    topP: 0.8,
    maxOutputTokens: 2048,
  },
  // Validação/verificação
  validation: {
    temperature: 0.1,
    topK: 10,
    topP: 0.8,
    maxOutputTokens: 1024,
  },
} as const;

/**
 * Helper para logging consistente
 */
export function logAICall(moduleName: string, model: string = CURRENT_AI_MODEL) {
  console.log(`[${moduleName}] Using AI model: ${model}`);
}

/**
 * Helper para tratamento de erros da API Gemini
 */
export function handleGeminiError(error: any, moduleName: string): string {
  console.error(`[${moduleName}] Gemini API error:`, error);
  
  if (error.status === 429) {
    return "Limite de requisições atingido. Aguarde alguns minutos e tente novamente.";
  }
  
  if (error.status === 503) {
    return "Modelo temporariamente indisponível. Tente novamente em alguns segundos.";
  }
  
  if (error.status === 401 || error.status === 403) {
    return "Erro de autenticação. Verifique a configuração da API Key no Admin > Gemini.";
  }
  
  return `Erro ao processar requisição: ${error.message || 'Erro desconhecido'}`;
}

