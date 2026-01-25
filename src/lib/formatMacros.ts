/**
 * Helper functions para formatar valores de macros
 * Evita exibir NaN, undefined ou null na UI
 */

/**
 * Formata valor numérico para exibição
 * Retorna '--' se valor for inválido
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}

/**
 * Formata calorias para exibição
 * @param calories Valor em kcal
 * @returns String formatada (ex: "2000" ou "--")
 */
export function formatCalories(calories: number | null | undefined): string {
  return formatNumber(calories, 0);
}

/**
 * Formata proteína para exibição
 * @param protein Valor em gramas
 * @returns String formatada (ex: "150.5" ou "--")
 */
export function formatProtein(protein: number | null | undefined): string {
  return formatNumber(protein, 1);
}

/**
 * Formata carboidratos para exibição
 * @param carbs Valor em gramas
 * @returns String formatada (ex: "250.0" ou "--")
 */
export function formatCarbs(carbs: number | null | undefined): string {
  return formatNumber(carbs, 1);
}

/**
 * Formata gordura para exibição
 * @param fat Valor em gramas
 * @returns String formatada (ex: "65.5" ou "--")
 */
export function formatFat(fat: number | null | undefined): string {
  return formatNumber(fat, 1);
}

/**
 * Formata fibra para exibição
 * @param fiber Valor em gramas
 * @returns String formatada (ex: "25.0" ou "--")
 */
export function formatFiber(fiber: number | null | undefined): string {
  return formatNumber(fiber, 1);
}

/**
 * Formata peso para exibição
 * @param weight Valor em kg
 * @returns String formatada (ex: "75.5" ou "--")
 */
export function formatWeight(weight: number | null | undefined): string {
  return formatNumber(weight, 1);
}

/**
 * Formata altura para exibição
 * @param height Valor em cm
 * @returns String formatada (ex: "175" ou "--")
 */
export function formatHeight(height: number | null | undefined): string {
  return formatNumber(height, 0);
}

/**
 * Formata idade para exibição
 * @param age Valor em anos
 * @returns String formatada (ex: "30" ou "--")
 */
export function formatAge(age: number | null | undefined): string {
  return formatNumber(age, 0);
}

/**
 * Verifica se valor é válido (não é NaN, null ou undefined)
 */
export function isValidNumber(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !isNaN(value);
}

/**
 * Retorna valor ou fallback se inválido
 */
export function getValidNumber(value: number | null | undefined, fallback: number = 0): number {
  return isValidNumber(value) ? value! : fallback;
}

/**
 * Formata macros completos para exibição
 */
export interface FormattedMacros {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
}

export function formatMacros(macros: {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
}): FormattedMacros {
  return {
    calories: formatCalories(macros.calories),
    protein: formatProtein(macros.protein),
    carbs: formatCarbs(macros.carbs),
    fat: formatFat(macros.fat),
    fiber: macros.fiber !== undefined ? formatFiber(macros.fiber) : undefined,
  };
}
