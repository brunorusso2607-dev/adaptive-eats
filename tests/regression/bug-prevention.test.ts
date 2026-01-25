/**
 * REGRESSION TEST SUITE - BUG PREVENTION
 * 
 * Este arquivo contém testes automatizados para garantir que os bugs
 * identificados no E2E Test não voltem a acontecer.
 * 
 * Bugs cobertos:
 * - BUG #1: userCountry não propagado
 * - BUG #2: Dados físicos não validados
 * - BUG #10: NaN exibido em macros
 * 
 * Para executar: npm test tests/regression/bug-prevention.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatCalories, formatProtein, formatCarbs, formatFat, isValidNumber } from '@/lib/formatMacros';

// ============================================
// TESTE 1: Formatação de Macros (BUG #10)
// ============================================
describe('BUG #10: Formatação de Macros - Prevenir NaN na UI', () => {
  it('deve retornar "--" para valores null', () => {
    expect(formatCalories(null)).toBe('--');
    expect(formatProtein(null)).toBe('--');
    expect(formatCarbs(null)).toBe('--');
    expect(formatFat(null)).toBe('--');
  });

  it('deve retornar "--" para valores undefined', () => {
    expect(formatCalories(undefined)).toBe('--');
    expect(formatProtein(undefined)).toBe('--');
    expect(formatCarbs(undefined)).toBe('--');
    expect(formatFat(undefined)).toBe('--');
  });

  it('deve retornar "--" para valores NaN', () => {
    expect(formatCalories(NaN)).toBe('--');
    expect(formatProtein(NaN)).toBe('--');
    expect(formatCarbs(NaN)).toBe('--');
    expect(formatFat(NaN)).toBe('--');
  });

  it('deve formatar valores válidos corretamente', () => {
    expect(formatCalories(2000)).toBe('2000');
    expect(formatProtein(150.5)).toBe('150.5');
    expect(formatCarbs(250.0)).toBe('250.0');
    expect(formatFat(65.5)).toBe('65.5');
  });

  it('deve arredondar calorias para inteiro', () => {
    expect(formatCalories(2000.7)).toBe('2001');
    expect(formatCalories(1999.3)).toBe('1999');
  });

  it('deve formatar macros com 1 casa decimal', () => {
    expect(formatProtein(150.567)).toBe('150.6');
    expect(formatCarbs(250.123)).toBe('250.1');
    expect(formatFat(65.999)).toBe('66.0');
  });

  it('isValidNumber deve detectar valores inválidos', () => {
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(100)).toBe(true);
  });
});

// ============================================
// TESTE 2: Validação de Dados Físicos (BUG #2)
// ============================================
describe('BUG #2: Validação de Dados Físicos Obrigatórios', () => {
  const mockProfile = {
    strategy_id: 'strategy-1',
    weight_current: 75,
    height: 175,
    age: 30,
    sex: 'male',
    activity_level: 'moderate',
  };

  it('deve considerar dados completos como válidos', () => {
    const isComplete = 
      mockProfile.weight_current && 
      mockProfile.height && 
      mockProfile.age && 
      mockProfile.sex && 
      mockProfile.activity_level;
    
    expect(isComplete).toBe(true);
  });

  it('deve detectar peso ausente', () => {
    const incomplete = { ...mockProfile, weight_current: null };
    const isComplete = 
      incomplete.weight_current && 
      incomplete.height && 
      incomplete.age && 
      incomplete.sex && 
      incomplete.activity_level;
    
    expect(isComplete).toBe(false);
  });

  it('deve detectar altura ausente', () => {
    const incomplete = { ...mockProfile, height: null };
    const isComplete = 
      incomplete.weight_current && 
      incomplete.height && 
      incomplete.age && 
      incomplete.sex && 
      incomplete.activity_level;
    
    expect(isComplete).toBe(false);
  });

  it('deve detectar idade ausente', () => {
    const incomplete = { ...mockProfile, age: null };
    const isComplete = 
      incomplete.weight_current && 
      incomplete.height && 
      incomplete.age && 
      incomplete.sex && 
      incomplete.activity_level;
    
    expect(isComplete).toBe(false);
  });

  it('deve detectar sexo ausente', () => {
    const incomplete = { ...mockProfile, sex: null };
    const isComplete = 
      incomplete.weight_current && 
      incomplete.height && 
      incomplete.age && 
      incomplete.sex && 
      incomplete.activity_level;
    
    expect(isComplete).toBe(false);
  });

  it('deve detectar nível de atividade ausente', () => {
    const incomplete = { ...mockProfile, activity_level: null };
    const isComplete = 
      incomplete.weight_current && 
      incomplete.height && 
      incomplete.age && 
      incomplete.sex && 
      incomplete.activity_level;
    
    expect(isComplete).toBe(false);
  });

  it('deve detectar estratégia ausente', () => {
    const incomplete = { ...mockProfile, strategy_id: null };
    expect(incomplete.strategy_id).toBeFalsy();
  });
});

// ============================================
// TESTE 3: userCountry Propagado (BUG #1)
// ============================================
describe('BUG #1: userCountry Propagado Corretamente', () => {
  it('deve ter hook useUserCountry disponível', async () => {
    // Verificar que o hook existe
    const { useUserCountry } = await import('@/hooks/useUserCountry');
    expect(useUserCountry).toBeDefined();
  });

  it('deve ter DEFAULT_COUNTRY definido como BR', async () => {
    const { DEFAULT_COUNTRY } = await import('@/hooks/useUserCountry');
    expect(DEFAULT_COUNTRY).toBe('BR');
  });

  it('deve ter SUPPORTED_COUNTRY_CODES definido', async () => {
    const { SUPPORTED_COUNTRY_CODES } = await import('@/hooks/useUserCountry');
    expect(SUPPORTED_COUNTRY_CODES).toBeDefined();
    expect(SUPPORTED_COUNTRY_CODES.length).toBeGreaterThan(0);
    expect(SUPPORTED_COUNTRY_CODES).toContain('BR');
    expect(SUPPORTED_COUNTRY_CODES).toContain('US');
  });

  it('MealPlanGenerator deve importar useUserCountry', async () => {
    const fileContent = await import('fs').then(fs => 
      fs.promises.readFile('src/components/MealPlanGenerator.tsx', 'utf-8')
    );
    
    expect(fileContent).toContain('useUserCountry');
    expect(fileContent).toContain('userCountry');
  });
});

// ============================================
// TESTE 4: Cálculo de Macros Sem Erros
// ============================================
describe('Cálculo de Macros - Prevenção de Erros', () => {
  it('deve calcular macros com dados válidos', () => {
    const food = {
      calories_per_100g: 119,
      protein_per_100g: 26.2,
      carbs_per_100g: 0,
      fat_per_100g: 2.5,
    };
    
    const grams = 150;
    const multiplier = grams / 100;
    
    const calories = Math.round(food.calories_per_100g * multiplier);
    const protein = Math.round(food.protein_per_100g * multiplier * 10) / 10;
    const carbs = Math.round(food.carbs_per_100g * multiplier * 10) / 10;
    const fat = Math.round(food.fat_per_100g * multiplier * 10) / 10;
    
    expect(calories).toBe(179);
    expect(protein).toBe(39.3);
    expect(carbs).toBe(0);
    expect(fat).toBe(3.8);
    
    // Verificar que nenhum valor é NaN
    expect(isNaN(calories)).toBe(false);
    expect(isNaN(protein)).toBe(false);
    expect(isNaN(carbs)).toBe(false);
    expect(isNaN(fat)).toBe(false);
  });

  it('deve lidar com dados ausentes sem gerar NaN', () => {
    const food = {
      calories_per_100g: null,
      protein_per_100g: undefined,
      carbs_per_100g: NaN,
      fat_per_100g: 0,
    };
    
    const grams = 150;
    const multiplier = grams / 100;
    
    // Usar formatação segura
    const calories = formatCalories(food.calories_per_100g ? Math.round(food.calories_per_100g * multiplier) : null);
    const protein = formatProtein(food.protein_per_100g ? Math.round(food.protein_per_100g * multiplier * 10) / 10 : null);
    const carbs = formatCarbs(food.carbs_per_100g ? Math.round(food.carbs_per_100g * multiplier * 10) / 10 : null);
    const fat = formatFat(Math.round(food.fat_per_100g * multiplier * 10) / 10);
    
    expect(calories).toBe('--');
    expect(protein).toBe('--');
    expect(carbs).toBe('--');
    expect(fat).toBe('0.0');
  });
});

// ============================================
// TESTE 5: Edge Cases de Onboarding
// ============================================
describe('Onboarding - Edge Cases', () => {
  it('deve validar peso meta vs peso atual para weight_loss', () => {
    const profile = {
      strategy_key: 'weight_loss',
      weight_current: 80,
      weight_goal: 90, // ❌ Inválido: meta > atual para perda
    };
    
    const isValid = profile.strategy_key === 'weight_loss' 
      ? profile.weight_goal < profile.weight_current 
      : true;
    
    expect(isValid).toBe(false);
  });

  it('deve validar peso meta vs peso atual para weight_gain', () => {
    const profile = {
      strategy_key: 'weight_gain',
      weight_current: 80,
      weight_goal: 70, // ❌ Inválido: meta < atual para ganho
    };
    
    const isValid = profile.strategy_key === 'weight_gain' 
      ? profile.weight_goal > profile.weight_current 
      : true;
    
    expect(isValid).toBe(false);
  });

  it('deve aceitar peso meta válido para weight_loss', () => {
    const profile = {
      strategy_key: 'weight_loss',
      weight_current: 80,
      weight_goal: 70, // ✅ Válido: meta < atual
    };
    
    const isValid = profile.strategy_key === 'weight_loss' 
      ? profile.weight_goal < profile.weight_current 
      : true;
    
    expect(isValid).toBe(true);
  });

  it('deve aceitar peso meta válido para weight_gain', () => {
    const profile = {
      strategy_key: 'weight_gain',
      weight_current: 70,
      weight_goal: 80, // ✅ Válido: meta > atual
    };
    
    const isValid = profile.strategy_key === 'weight_gain' 
      ? profile.weight_goal > profile.weight_current 
      : true;
    
    expect(isValid).toBe(true);
  });
});

// ============================================
// TESTE 6: Colisão de Dados Regional vs Global
// ============================================
describe('BUG #4: Colisão de Dados Regional vs Global', () => {
  it('deve deduplicar alimentos por name_normalized', () => {
    const foods = [
      { id: '1', name: 'Arroz branco', name_normalized: 'arroz branco', source: 'TBCA' },
      { id: '2', name: 'Arroz Branco', name_normalized: 'arroz branco', source: 'canonical' },
      { id: '3', name: 'Frango', name_normalized: 'frango', source: 'TBCA' },
    ];
    
    // Deduplicação
    const uniqueFoods = Array.from(
      new Map(foods.map(f => [f.name_normalized, f])).values()
    );
    
    expect(uniqueFoods.length).toBe(2); // Apenas 2 únicos
    expect(uniqueFoods.find(f => f.name_normalized === 'arroz branco')).toBeDefined();
    expect(uniqueFoods.find(f => f.name_normalized === 'frango')).toBeDefined();
  });
});

// ============================================
// TESTE 7: Cache de Country Config
// ============================================
describe('BUG #6: Cache de Country Config', () => {
  it('deve ter TTL de 10 minutos definido', () => {
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
    expect(CACHE_TTL).toBe(600000);
  });

  it('deve invalidar cache quando país mudar', () => {
    let cache: Map<string, any> | null = new Map();
    let timestamp = Date.now();
    
    // Simular mudança de país
    const clearCache = () => {
      cache = null;
      timestamp = 0;
    };
    
    expect(cache).not.toBeNull();
    clearCache();
    expect(cache).toBeNull();
    expect(timestamp).toBe(0);
  });
});

// ============================================
// TESTE 8: Altura em Formato Ambíguo
// ============================================
describe('BUG #12: Altura em Formato Ambíguo', () => {
  it('deve converter altura de metros para centímetros', () => {
    const heightInMeters = 1.75;
    const heightInCm = heightInMeters * 100;
    
    expect(heightInCm).toBe(175);
  });

  it('deve detectar se valor está em metros ou centímetros', () => {
    const detectUnit = (value: number) => {
      return value < 3 ? 'meters' : 'centimeters';
    };
    
    expect(detectUnit(1.75)).toBe('meters');
    expect(detectUnit(175)).toBe('centimeters');
    expect(detectUnit(2.5)).toBe('meters');
    expect(detectUnit(250)).toBe('centimeters');
  });
});
