/**
 * Common TypeScript types to replace 'any' usage across the codebase
 * 
 * This file provides strongly-typed alternatives for common patterns:
 * - PWA events (BeforeInstallPromptEvent, SpeechRecognition)
 * - Error handling in catch blocks
 * - Supabase response patterns
 * - Recipe and meal plan data structures
 */

// ============= PWA Types =============

/**
 * BeforeInstallPromptEvent for PWA installation
 * Not available in standard TypeScript lib
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Speech Recognition types (Web Speech API)
 */
export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// ============= Error Types =============

/**
 * Generic error with message (for catch blocks)
 */
export interface ErrorWithMessage {
  message: string;
  code?: string;
  status?: number;
  stack?: string;
}

/**
 * Supabase error type
 */
export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Type guard to check if error has message property
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
}

// ============= Recipe & Meal Types =============

export interface Ingredient {
  item: string;
  quantity: string;
  unit: string;
}

export interface RecipeBase {
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanItemBase {
  id: string;
  meal_plan_id: string;
  meal_type: string;
  day_of_week: number;
  week_number: number;
  recipe_name: string;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  completed_at: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface ConsumptionItem {
  id: string;
  food_name: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food_id?: string | null;
}

// ============= Validation Types =============

export interface SafetyConflict {
  type: 'intolerance' | 'dietary' | 'excluded';
  key: string;
  label: string;
  intoleranceLabel?: string;
  matchedIngredient: string;
  originalIngredient: string;
  severity?: 'high' | 'low';
}

export interface ValidationResult {
  hasConflicts: boolean;
  conflicts: SafetyConflict[];
  warnings: SafetyConflict[];
  safeReasons?: string[];
}

// ============= Chart/Recharts Types =============

export interface RechartsTooltipProps<T = Record<string, unknown>> {
  payload: T;
  name: string;
  value: number;
  dataKey: string;
}

// ============= Profile Types =============

export type UserGoal = 'lose_weight' | 'maintain' | 'gain_weight';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Sex = 'male' | 'female';
export type DietaryPreference = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'flexitarian' | 'ketogenic' | 'low_carb';
export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'supper';

export interface UserProfile {
  intolerances?: string[] | null;
  excluded_ingredients?: string[] | null;
  dietary_preference?: DietaryPreference | null;
}

// ============= Declare global for PWA =============

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export {};
