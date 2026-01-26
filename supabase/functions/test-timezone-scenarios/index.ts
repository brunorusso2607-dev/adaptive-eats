import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapa de fallback de timezone por país (deve ser igual ao do frontend)
const COUNTRY_TIMEZONE_FALLBACK: Record<string, string> = {
  BR: "America/Sao_Paulo",
  US: "America/New_York",
  PT: "Europe/Lisbon",
  ES: "Europe/Madrid",
  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires",
  CO: "America/Bogota",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  IT: "Europe/Rome",
  GB: "Europe/London",
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

interface TestResult {
  scenario: string;
  description: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  passed: boolean;
  details?: string;
}

interface TestSuite {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  executionTimeMs: number;
}

// Função para obter hora atual em um timezone específico
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    
    const timeStr = formatter.format(now);
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    const dayStr = dateFormatter.format(now);
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayOfWeek = dayMap[dayStr] ?? now.getDay();
    
    return { hours, minutes, dayOfWeek };
  } catch {
    return { hours: now.getHours(), minutes: now.getMinutes(), dayOfWeek: now.getDay() };
  }
}

// Função para verificar se duas datas são do mesmo dia no timezone
function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date1) === formatter.format(date2);
  } catch {
    return date1.toDateString() === date2.toDateString();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: TestResult[] = [];

  try {
    // ============================================
    // CENÁRIO 1: Fallback de timezone por país
    // ============================================
    const countriesTest = [
      { country: "BR", expected: "America/Sao_Paulo" },
      { country: "US", expected: "America/New_York" },
      { country: "PT", expected: "Europe/Lisbon" },
      { country: "MX", expected: "America/Mexico_City" },
      { country: "DE", expected: "Europe/Berlin" },
      { country: "XX", expected: DEFAULT_TIMEZONE }, // País desconhecido
      { country: null, expected: DEFAULT_TIMEZONE }, // Sem país
    ];

    for (const test of countriesTest) {
      const actual = test.country ? (COUNTRY_TIMEZONE_FALLBACK[test.country] || DEFAULT_TIMEZONE) : DEFAULT_TIMEZONE;
      results.push({
        scenario: "country_fallback",
        description: `Fallback de timezone para país ${test.country || 'null'}`,
        input: { country: test.country },
        expected: { timezone: test.expected },
        actual: { timezone: actual },
        passed: actual === test.expected,
      });
    }

    // ============================================
    // CENÁRIO 2: Diferença de hora entre timezones
    // ============================================
    const timezoneComparisons = [
      { tz1: "America/Sao_Paulo", tz2: "America/Los_Angeles", description: "São Paulo vs Los Angeles" },
      { tz1: "America/Sao_Paulo", tz2: "Europe/Paris", description: "São Paulo vs Paris" },
      { tz1: "America/New_York", tz2: "America/Los_Angeles", description: "New York vs Los Angeles" },
      { tz1: "Europe/London", tz2: "Asia/Tokyo", description: "London vs Tokyo" },
    ];

    for (const comp of timezoneComparisons) {
      const time1 = getCurrentTimeInTimezone(comp.tz1);
      const time2 = getCurrentTimeInTimezone(comp.tz2);
      const hourDiff = Math.abs(time1.hours - time2.hours);
      
      results.push({
        scenario: "timezone_difference",
        description: comp.description,
        input: { timezone1: comp.tz1, timezone2: comp.tz2 },
        expected: { differentHours: true },
        actual: { 
          time1: `${time1.hours}:${time1.minutes.toString().padStart(2, '0')}`,
          time2: `${time2.hours}:${time2.minutes.toString().padStart(2, '0')}`,
          hourDifference: hourDiff
        },
        passed: true, // Apenas informativo
        details: `${comp.tz1}: ${time1.hours}:${time1.minutes.toString().padStart(2, '0')} | ${comp.tz2}: ${time2.hours}:${time2.minutes.toString().padStart(2, '0')}`,
      });
    }

    // ============================================
    // CENÁRIO 3: Viagem - Mudança de timezone
    // ============================================
    const travelScenarios = [
      {
        description: "Brasileiro viaja de São Paulo para Miami",
        savedTimezone: "America/Sao_Paulo",
        browserTimezone: "America/New_York",
        expectedAction: "update_and_notify",
      },
      {
        description: "Brasileiro viaja de São Paulo para Los Angeles",
        savedTimezone: "America/Sao_Paulo",
        browserTimezone: "America/Los_Angeles",
        expectedAction: "update_and_notify",
      },
      {
        description: "Usuário permanece no mesmo local",
        savedTimezone: "America/Sao_Paulo",
        browserTimezone: "America/Sao_Paulo",
        expectedAction: "no_change",
      },
      {
        description: "Primeiro acesso (sem timezone salvo)",
        savedTimezone: null,
        browserTimezone: "America/New_York",
        expectedAction: "save_without_notify",
      },
      {
        description: "Viagem Europa -> EUA",
        savedTimezone: "Europe/Paris",
        browserTimezone: "America/Chicago",
        expectedAction: "update_and_notify",
      },
    ];

    for (const scenario of travelScenarios) {
      const shouldUpdate = scenario.savedTimezone !== scenario.browserTimezone;
      const shouldNotify = shouldUpdate && scenario.savedTimezone !== null;
      
      let actualAction = "no_change";
      if (shouldUpdate && shouldNotify) {
        actualAction = "update_and_notify";
      } else if (shouldUpdate && !shouldNotify) {
        actualAction = "save_without_notify";
      }

      results.push({
        scenario: "travel_detection",
        description: scenario.description,
        input: { 
          savedTimezone: scenario.savedTimezone, 
          browserTimezone: scenario.browserTimezone 
        },
        expected: { action: scenario.expectedAction },
        actual: { 
          action: actualAction,
          shouldUpdate,
          shouldNotify
        },
        passed: actualAction === scenario.expectedAction,
      });
    }

    // ============================================
    // CENÁRIO 4: Validação de timezone IANA
    // ============================================
    const validTimezones = [
      "America/Sao_Paulo",
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];

    for (const tz of validTimezones) {
      let isValid = false;
      try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz });
        formatter.format(new Date());
        isValid = true;
      } catch {
        isValid = false;
      }

      results.push({
        scenario: "timezone_validation",
        description: `Validação do timezone IANA: ${tz}`,
        input: { timezone: tz },
        expected: { isValid: true },
        actual: { isValid },
        passed: isValid === true,
      });
    }

    // ============================================
    // CENÁRIO 5: Mesmo dia em timezones diferentes
    // ============================================
    const now = new Date();
    const sameDayTests = [
      { tz: "America/Sao_Paulo", description: "Mesmo dia em São Paulo" },
      { tz: "America/Los_Angeles", description: "Mesmo dia em Los Angeles" },
      { tz: "Europe/Paris", description: "Mesmo dia em Paris" },
      { tz: "Asia/Tokyo", description: "Mesmo dia em Tokyo" },
    ];

    for (const test of sameDayTests) {
      const isSameDay = isSameDayInTimezone(now, now, test.tz);
      
      results.push({
        scenario: "same_day_check",
        description: test.description,
        input: { timezone: test.tz, date: now.toISOString() },
        expected: { isSameDay: true },
        actual: { isSameDay },
        passed: isSameDay === true,
      });
    }

    // ============================================
    // CENÁRIO 6: Horário de refeição por timezone
    // ============================================
    const mealTimeSettings = [
      { meal_type: "breakfast", start_hour: 7 },
      { meal_type: "lunch", start_hour: 12 },
      { meal_type: "dinner", start_hour: 18 },
    ];

    const testTimezones = ["America/Sao_Paulo", "America/Los_Angeles", "Europe/Paris"];

    for (const tz of testTimezones) {
      const currentTime = getCurrentTimeInTimezone(tz);
      
      for (const meal of mealTimeSettings) {
        const isCurrentMeal = currentTime.hours >= meal.start_hour && 
          currentTime.hours < (mealTimeSettings[mealTimeSettings.indexOf(meal) + 1]?.start_hour || 24);

        results.push({
          scenario: "meal_time_detection",
          description: `${meal.meal_type} em ${tz.split('/').pop()}`,
          input: { 
            timezone: tz, 
            mealType: meal.meal_type,
            mealStartHour: meal.start_hour,
            currentHour: currentTime.hours
          },
          expected: { correctCalculation: true },
          actual: { 
            currentHour: currentTime.hours,
            currentMinutes: currentTime.minutes,
            isCurrentMeal
          },
          passed: true, // Informativo
          details: `Hora atual: ${currentTime.hours}:${currentTime.minutes.toString().padStart(2, '0')} - ${isCurrentMeal ? 'ATIVO' : 'não ativo'}`,
        });
      }
    }

    // ============================================
    // CENÁRIO 7: Mudança de dia por timezone
    // ============================================
    const dayChangeScenarios = [
      {
        description: "Meia-noite em São Paulo vs Los Angeles",
        tz1: "America/Sao_Paulo",
        tz2: "America/Los_Angeles",
      },
      {
        description: "Meia-noite em Tokyo vs New York",
        tz1: "Asia/Tokyo",
        tz2: "America/New_York",
      },
    ];

    for (const scenario of dayChangeScenarios) {
      const time1 = getCurrentTimeInTimezone(scenario.tz1);
      const time2 = getCurrentTimeInTimezone(scenario.tz2);
      const dayDiff = time1.dayOfWeek !== time2.dayOfWeek;

      results.push({
        scenario: "day_change_detection",
        description: scenario.description,
        input: { timezone1: scenario.tz1, timezone2: scenario.tz2 },
        expected: { mayHaveDifferentDays: true },
        actual: {
          day1: time1.dayOfWeek,
          day2: time2.dayOfWeek,
          differentDays: dayDiff,
          time1: `${time1.hours}:${time1.minutes.toString().padStart(2, '0')}`,
          time2: `${time2.hours}:${time2.minutes.toString().padStart(2, '0')}`,
        },
        passed: true, // Informativo
        details: `${scenario.tz1}: dia ${time1.dayOfWeek} | ${scenario.tz2}: dia ${time2.dayOfWeek}`,
      });
    }

    // Calcular estatísticas
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    const testSuite: TestSuite = {
      totalTests: results.length,
      passed,
      failed,
      results,
      executionTimeMs: Date.now() - startTime,
    };

    console.log(`[test-timezone-scenarios] Total: ${testSuite.totalTests} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);

    return new Response(JSON.stringify(testSuite, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[test-timezone-scenarios] Erro:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

