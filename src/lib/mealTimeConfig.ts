import { supabase } from "@/integrations/supabase/client";

export type MealTimeRange = { start: number; end: number };
export type MealTimeRanges = Record<string, MealTimeRange>;
export type MealLabels = Record<string, string>;

// Cache global
let cachedTimeRanges: MealTimeRanges | null = null;
let cachedLabels: MealLabels | null = null;
let cachedMealOrder: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Valores padrão (fallback se o banco falhar)
const DEFAULT_TIME_RANGES: MealTimeRanges = {
  cafe_manha: { start: 6, end: 10 },
  almoco: { start: 10, end: 14 },
  lanche: { start: 14, end: 17 },
  lanche_tarde: { start: 14, end: 17 },
  jantar: { start: 17, end: 21 },
  ceia: { start: 21, end: 24 },
};

const DEFAULT_LABELS: MealLabels = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  lanche_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

const DEFAULT_MEAL_ORDER = ["cafe_manha", "almoco", "lanche", "lanche_tarde", "jantar", "ceia"];

async function fetchMealTimeSettings(): Promise<void> {
  // Usar cache se ainda válido
  if (cachedTimeRanges && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("meal_time_settings")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      const ranges: MealTimeRanges = {};
      const labels: MealLabels = {};
      const order: string[] = [];

      data.forEach(item => {
        ranges[item.meal_type] = { 
          start: Number(item.start_hour), 
          end: Number(item.end_hour) 
        };
        labels[item.meal_type] = item.label;
        order.push(item.meal_type);
      });

      cachedTimeRanges = ranges;
      cachedLabels = labels;
      cachedMealOrder = order;
      cacheTimestamp = Date.now();
    }
  } catch (error) {
    console.error("Error fetching meal time settings:", error);
    // Usar valores padrão em caso de erro
  }
}

// Inicializar cache na primeira importação
fetchMealTimeSettings();

export async function getMealTimeRanges(): Promise<MealTimeRanges> {
  await fetchMealTimeSettings();
  return cachedTimeRanges || DEFAULT_TIME_RANGES;
}

export async function getMealLabels(): Promise<MealLabels> {
  await fetchMealTimeSettings();
  return cachedLabels || DEFAULT_LABELS;
}

export async function getMealOrder(): Promise<string[]> {
  await fetchMealTimeSettings();
  return cachedMealOrder || DEFAULT_MEAL_ORDER;
}

// Versões síncronas que usam cache ou fallback (para funções que não podem ser async)
export function getMealTimeRangesSync(): MealTimeRanges {
  return cachedTimeRanges || DEFAULT_TIME_RANGES;
}

export function getMealLabelsSync(): MealLabels {
  return cachedLabels || DEFAULT_LABELS;
}

export function getMealOrderSync(): string[] {
  return cachedMealOrder || DEFAULT_MEAL_ORDER;
}

// Invalidar cache (chamar quando admin atualizar os horários)
export function invalidateMealTimeCache(): void {
  cachedTimeRanges = null;
  cachedLabels = null;
  cachedMealOrder = null;
  cacheTimestamp = 0;
}

// Formatar horário
export function formatMealTime(hour: number): string {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
