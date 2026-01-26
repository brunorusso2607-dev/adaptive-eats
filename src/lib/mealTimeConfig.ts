import { supabase } from "@/integrations/supabase/client";

export type MealTimeRange = { start: number; end: number };
export type MealTimeRanges = Record<string, MealTimeRange>;
export type MealLabels = Record<string, string>;

// Storage keys
const STORAGE_KEY_RANGES = "meal_time_ranges_cache";
const STORAGE_KEY_LABELS = "meal_time_labels_cache";
const STORAGE_KEY_ORDER = "meal_time_order_cache";
const STORAGE_KEY_TIMESTAMP = "meal_time_cache_timestamp";

// Cache global
let cachedTimeRanges: MealTimeRanges | null = null;
let cachedLabels: MealLabels | null = null;
let cachedMealOrder: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Constante: tolerância em horas para considerar refeição atrasada
export const MEAL_DELAY_TOLERANCE_HOURS = 1;

// Standard meal types - single source of truth (English keys)
export const STANDARD_MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "supper"] as const;
export type StandardMealType = typeof STANDARD_MEAL_TYPES[number];

// Valores padrão (fallback se o banco falhar)
const DEFAULT_TIME_RANGES: MealTimeRanges = {
  breakfast: { start: 6, end: 10 },
  morning_snack: { start: 10, end: 12 },
  lunch: { start: 12, end: 14 },
  afternoon_snack: { start: 14, end: 17 },
  dinner: { start: 17, end: 21 },
  supper: { start: 21, end: 24 },
};

const DEFAULT_LABELS: MealLabels = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  supper: "Ceia",
};

const DEFAULT_MEAL_ORDER = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "supper"];

// Load from localStorage on module init
function loadFromStorage(): boolean {
  try {
    const storedRanges = localStorage.getItem(STORAGE_KEY_RANGES);
    const storedLabels = localStorage.getItem(STORAGE_KEY_LABELS);
    const storedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
    const storedTimestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP);

    if (storedRanges && storedLabels && storedOrder && storedTimestamp) {
      const parsedRanges = JSON.parse(storedRanges);
      const parsedLabels = JSON.parse(storedLabels);
      const parsedOrder = JSON.parse(storedOrder);
      
      // Validate that parsed values are valid objects/arrays
      if (
        parsedRanges && typeof parsedRanges === 'object' && Object.keys(parsedRanges).length > 0 &&
        parsedLabels && typeof parsedLabels === 'object' && Object.keys(parsedLabels).length > 0 &&
        Array.isArray(parsedOrder) && parsedOrder.length > 0
      ) {
        cachedTimeRanges = parsedRanges;
        cachedLabels = parsedLabels;
        cachedMealOrder = parsedOrder;
        cacheTimestamp = parseInt(storedTimestamp, 10);
        return true;
      }
    }
  } catch (error) {
    console.warn("Error loading meal times from localStorage:", error);
  }
  return false;
}

// Save to localStorage
function saveToStorage(): void {
  try {
    if (cachedTimeRanges && cachedLabels && cachedMealOrder) {
      localStorage.setItem(STORAGE_KEY_RANGES, JSON.stringify(cachedTimeRanges));
      localStorage.setItem(STORAGE_KEY_LABELS, JSON.stringify(cachedLabels));
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(cachedMealOrder));
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    }
  } catch (error) {
    console.warn("Error saving meal times to localStorage:", error);
  }
}

// Initialize from storage
loadFromStorage();

// Calcula ranges baseado apenas em start_hour
// O "end" é o início da próxima refeição ou start + tolerância
function calculateRangesFromSettings(data: Array<{ meal_type: string; start_hour: number; sort_order: number }>): MealTimeRanges {
  const ranges: MealTimeRanges = {};
  const sorted = [...data].sort((a, b) => a.sort_order - b.sort_order);
  
  sorted.forEach((item, index) => {
    const nextItem = sorted[index + 1];
    // O fim é o início da próxima refeição, ou start + tolerância se for a última
    const end = nextItem ? Number(nextItem.start_hour) : Number(item.start_hour) + MEAL_DELAY_TOLERANCE_HOURS;
    ranges[item.meal_type] = { 
      start: Number(item.start_hour), 
      end 
    };
  });
  
  return ranges;
}

async function fetchMealTimeSettings(forceRefresh = false): Promise<void> {
  const isCacheValid = cachedTimeRanges && Date.now() - cacheTimestamp < CACHE_DURATION;
  
  // Usar cache se ainda válido e não forçando refresh
  if (!forceRefresh && isCacheValid) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("meal_time_settings")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      const labels: MealLabels = {};
      const order: string[] = [];

      data.forEach(item => {
        labels[item.meal_type] = item.label;
        order.push(item.meal_type);
      });

      // Calcular ranges baseado em start_hour apenas
      cachedTimeRanges = calculateRangesFromSettings(data);
      cachedLabels = labels;
      cachedMealOrder = order;
      cacheTimestamp = Date.now();
      
      // Save to localStorage
      saveToStorage();
    }
  } catch (error) {
    console.error("Error fetching meal time settings:", error);
    // Usar valores padrão em caso de erro
  }
}

// Inicializar cache na primeira importação (background fetch)
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
  // Garantir que nunca retorna null/undefined
  if (!cachedTimeRanges || Object.keys(cachedTimeRanges).length === 0) {
    return DEFAULT_TIME_RANGES;
  }
  return cachedTimeRanges;
}

export function getMealLabelsSync(): MealLabels {
  // Garantir que nunca retorna null/undefined
  if (!cachedLabels || Object.keys(cachedLabels).length === 0) {
    return DEFAULT_LABELS;
  }
  return cachedLabels;
}

export function getMealOrderSync(): string[] {
  // Garantir que nunca retorna null/undefined
  if (!cachedMealOrder || cachedMealOrder.length === 0) {
    return DEFAULT_MEAL_ORDER;
  }
  return cachedMealOrder;
}

// Invalidar cache (chamar quando admin atualizar os horários)
export function invalidateMealTimeCache(): void {
  cachedTimeRanges = null;
  cachedLabels = null;
  cachedMealOrder = null;
  cacheTimestamp = 0;
  
  // Also clear localStorage
  try {
    localStorage.removeItem(STORAGE_KEY_RANGES);
    localStorage.removeItem(STORAGE_KEY_LABELS);
    localStorage.removeItem(STORAGE_KEY_ORDER);
    localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  } catch (error) {
    console.warn("Error clearing meal time cache from localStorage:", error);
  }
  
  // Refetch immediately
  fetchMealTimeSettings(true);
}

// Formatar horário
export function formatMealTime(hour: number): string {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
