// ============================================
// MACRO SOURCE HELPERS
// ============================================
// Utility functions to determine macro source and confidence
// for meal plan items based on ingredient sources

import type { CalculatedFoodItem } from "./calculateRealMacros.ts";

/**
 * Determines the overall macro source for a meal based on its ingredients
 * Priority: canonical > database > ai_mixed > ai_estimate
 */
export function determineMacroSource(items: CalculatedFoodItem[]): string {
  if (!items || items.length === 0) {
    return 'database'; // Default fallback
  }

  const sources = items.map(item => item.source);
  const uniqueSources = [...new Set(sources)];

  // All ingredients from canonical (verified data)
  if (uniqueSources.length === 1 && uniqueSources[0] === 'canonical') {
    return 'canonical';
  }

  // Contains any AI estimates
  if (sources.some(s => s === 'ai_estimate' || s === 'category_fallback')) {
    // If ALL are AI estimates
    if (sources.every(s => s === 'ai_estimate' || s === 'category_fallback')) {
      return 'ai_estimate';
    }
    // Mixed: some from DB, some from AI
    return 'ai_mixed';
  }

  // All from database (TBCA, USDA, etc.)
  if (sources.every(s => s === 'canonical' || s === 'database' || s === 'database_global')) {
    return 'database';
  }

  // Default to database
  return 'database';
}

/**
 * Calculates confidence level based on ingredient confidences
 * high: 95-100% average confidence
 * medium: 80-94% average confidence
 * low: <80% average confidence
 */
export function calculateConfidence(items: CalculatedFoodItem[]): string {
  if (!items || items.length === 0) {
    return 'medium'; // Default fallback
  }

  const confidences = items.map(item => item.confidence || 0);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  if (avgConfidence >= 95) return 'high';
  if (avgConfidence >= 80) return 'medium';
  return 'low';
}

/**
 * Gets a human-readable label for macro source
 */
export function getMacroSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'canonical': 'Verificado',
    'database': 'TBCA',
    'ai_mixed': 'Misto (DB + IA)',
    'ai_estimate': 'IA',
  };
  return labels[source] || 'TBCA';
}

/**
 * Gets statistics about macro sources for a meal
 */
export function getMacroSourceStats(items: CalculatedFoodItem[]): {
  total: number;
  fromCanonical: number;
  fromDatabase: number;
  fromAI: number;
  matchRate: number;
} {
  if (!items || items.length === 0) {
    return { total: 0, fromCanonical: 0, fromDatabase: 0, fromAI: 0, matchRate: 0 };
  }

  const total = items.length;
  const fromCanonical = items.filter(i => i.source === 'canonical').length;
  const fromDatabase = items.filter(i => i.source === 'database' || i.source === 'database_global').length;
  const fromAI = items.filter(i => i.source === 'ai_estimate' || i.source === 'category_fallback').length;
  
  const matchRate = total > 0 ? Math.round(((fromCanonical + fromDatabase) / total) * 100) : 0;

  return { total, fromCanonical, fromDatabase, fromAI, matchRate };
}

