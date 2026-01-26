/**
 * TESTES UNITÁRIOS - useDynamicDietaryCompatibility
 * 
 * Testa as funções de normalização e matching alinhadas com o backend
 */

import { describe, test, expect } from 'vitest';

// ============= FUNÇÕES DE NORMALIZAÇÃO (COPIADAS DO HOOK) =============

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' '); // Normaliza espaços
}

function containsWholeWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  
  const normalizedText = normalizeText(text);
  const normalizedWord = normalizeText(word);
  
  if (normalizedText === normalizedWord) return true;
  
  const delimiters = '[\\s,;:()\\[\\]\\-\\/]';
  
  const searchWords = normalizedWord.trim().split(/\s+/);
  if (searchWords.length > 1) {
    return searchWords.every(w => {
      const escapedW = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|${delimiters})${escapedW}(${delimiters}|$)`, 'i');
      return regex.test(normalizedText);
    });
  }
  
  const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|${delimiters})${escapedWord}(${delimiters}|$)`, 'i');
  
  return regex.test(normalizedText);
}

// ============= TESTES =============

describe('normalizeText', () => {
  test('remove acentos do português', () => {
    expect(normalizeText('Feijão')).toBe('feijao');
    expect(normalizeText('Maçã')).toBe('maca');
    expect(normalizeText('Pão')).toBe('pao');
    expect(normalizeText('Café')).toBe('cafe');
    expect(normalizeText('Açúcar')).toBe('acucar');
  });

  test('remove acentos do espanhol', () => {
    expect(normalizeText('Cebolla')).toBe('cebolla');
    expect(normalizeText('Ñoquis')).toBe('noquis');
    expect(normalizeText('Jalapeño')).toBe('jalapeno');
  });

  test('converte para lowercase', () => {
    expect(normalizeText('FEIJÃO')).toBe('feijao');
    expect(normalizeText('Garlic')).toBe('garlic');
    expect(normalizeText('BEANS')).toBe('beans');
  });

  test('normaliza espaços', () => {
    expect(normalizeText('  feijão  preto  ')).toBe('feijao preto');
    expect(normalizeText('grão   de   bico')).toBe('grao de bico');
  });

  test('retorna string vazia para input vazio', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null as any)).toBe('');
    expect(normalizeText(undefined as any)).toBe('');
  });
});

describe('containsWholeWord', () => {
  // ============= TESTES FODMAP =============
  describe('FODMAP', () => {
    test('detecta feijão (português)', () => {
      expect(containsWholeWord('Feijão preto', 'feijao')).toBe(true);
      expect(containsWholeWord('Feijão', 'feijao')).toBe(true);
      expect(containsWholeWord('feijao carioca', 'feijao')).toBe(true);
    });

    test('detecta alho (português)', () => {
      expect(containsWholeWord('Alho picado', 'alho')).toBe(true);
      expect(containsWholeWord('alho', 'alho')).toBe(true);
    });

    test('NÃO detecta falsos positivos com alho', () => {
      expect(containsWholeWord('galho', 'alho')).toBe(false);
      expect(containsWholeWord('trabalho', 'alho')).toBe(false);
    });

    test('detecta cebola (português)', () => {
      expect(containsWholeWord('Cebola roxa', 'cebola')).toBe(true);
      expect(containsWholeWord('cebola', 'cebola')).toBe(true);
    });

    test('detecta maçã (português)', () => {
      expect(containsWholeWord('Maçã verde', 'maca')).toBe(true);
      expect(containsWholeWord('maçã', 'maca')).toBe(true);
    });

    test('detecta grão de bico (termo composto)', () => {
      expect(containsWholeWord('Grão de bico cozido', 'grao de bico')).toBe(true);
      expect(containsWholeWord('grão-de-bico', 'grao de bico')).toBe(true);
    });

    test('detecta beans (inglês)', () => {
      expect(containsWholeWord('Black beans', 'beans')).toBe(true);
      expect(containsWholeWord('beans', 'beans')).toBe(true);
    });

    test('detecta garlic (inglês)', () => {
      expect(containsWholeWord('Garlic powder', 'garlic')).toBe(true);
      expect(containsWholeWord('garlic', 'garlic')).toBe(true);
    });

    test('detecta onion (inglês)', () => {
      expect(containsWholeWord('Red onion', 'onion')).toBe(true);
      expect(containsWholeWord('onion', 'onion')).toBe(true);
    });
  });

  // ============= TESTES LACTOSE =============
  describe('Lactose', () => {
    test('detecta leite (português)', () => {
      expect(containsWholeWord('Leite integral', 'leite')).toBe(true);
      expect(containsWholeWord('leite', 'leite')).toBe(true);
    });

    test('detecta queijo (português)', () => {
      expect(containsWholeWord('Queijo minas', 'queijo')).toBe(true);
      expect(containsWholeWord('queijo', 'queijo')).toBe(true);
    });

    test('detecta iogurte (português)', () => {
      expect(containsWholeWord('Iogurte natural', 'iogurte')).toBe(true);
    });

    test('detecta milk (inglês)', () => {
      expect(containsWholeWord('Whole milk', 'milk')).toBe(true);
    });

    test('detecta cheese (inglês)', () => {
      expect(containsWholeWord('Cheddar cheese', 'cheese')).toBe(true);
    });
  });

  // ============= TESTES GLUTEN =============
  describe('Gluten', () => {
    test('detecta trigo (português)', () => {
      expect(containsWholeWord('Farinha de trigo', 'trigo')).toBe(true);
      expect(containsWholeWord('trigo', 'trigo')).toBe(true);
    });

    test('detecta pão (português)', () => {
      expect(containsWholeWord('Pão francês', 'pao')).toBe(true);
    });

    test('detecta wheat (inglês)', () => {
      expect(containsWholeWord('Wheat flour', 'wheat')).toBe(true);
    });

    test('detecta bread (inglês)', () => {
      expect(containsWholeWord('White bread', 'bread')).toBe(true);
    });
  });

  // ============= TESTES DE FALSOS POSITIVOS =============
  describe('Falsos Positivos', () => {
    test('NÃO detecta substring parcial', () => {
      expect(containsWholeWord('galho', 'alho')).toBe(false);
      expect(containsWholeWord('trabalho', 'alho')).toBe(false);
      expect(containsWholeWord('espelho', 'lho')).toBe(false);
    });

    test('NÃO detecta quando não existe', () => {
      expect(containsWholeWord('arroz branco', 'feijao')).toBe(false);
      expect(containsWholeWord('frango grelhado', 'leite')).toBe(false);
    });
  });

  // ============= TESTES DE EDGE CASES =============
  describe('Edge Cases', () => {
    test('match exato', () => {
      expect(containsWholeWord('feijao', 'feijao')).toBe(true);
      expect(containsWholeWord('alho', 'alho')).toBe(true);
    });

    test('com delimitadores', () => {
      expect(containsWholeWord('arroz, feijão, salada', 'feijao')).toBe(true);
      expect(containsWholeWord('arroz/feijão/salada', 'feijao')).toBe(true);
      expect(containsWholeWord('arroz-feijão-salada', 'feijao')).toBe(true);
    });

    test('input vazio', () => {
      expect(containsWholeWord('', 'feijao')).toBe(false);
      expect(containsWholeWord('feijao', '')).toBe(false);
      expect(containsWholeWord('', '')).toBe(false);
    });
  });
});

// ============= TESTE DE INTEGRAÇÃO SIMULADO =============
describe('Integração - Simulação de Validação de Refeição', () => {
  const FODMAP_INGREDIENTS = ['feijao', 'alho', 'cebola', 'maca', 'mel', 'trigo', 'grao de bico', 'lentilha'];
  const LACTOSE_INGREDIENTS = ['leite', 'queijo', 'iogurte', 'creme de leite', 'manteiga', 'requeijao'];
  const GLUTEN_INGREDIENTS = ['trigo', 'centeio', 'cevada', 'aveia', 'farinha de trigo', 'pao'];

  function checkMealForIntolerance(ingredients: string[], forbiddenList: string[]): { hasConflict: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    for (const ingredient of ingredients) {
      for (const forbidden of forbiddenList) {
        if (containsWholeWord(ingredient, forbidden)) {
          conflicts.push(`${ingredient} contém ${forbidden}`);
        }
      }
    }
    return { hasConflict: conflicts.length > 0, conflicts };
  }

  test('Refeição com Feijão deve ser incompatível com FODMAP', () => {
    const mealIngredients = ['Arroz branco', 'Feijão preto', 'Frango grelhado', 'Salada'];
    const result = checkMealForIntolerance(mealIngredients, FODMAP_INGREDIENTS);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  test('Refeição com Pão deve ser incompatível com Gluten', () => {
    const mealIngredients = ['Pão francês', 'Ovo mexido', 'Goiaba'];
    const result = checkMealForIntolerance(mealIngredients, GLUTEN_INGREDIENTS);
    expect(result.hasConflict).toBe(true);
  });

  test('Refeição com Queijo deve ser incompatível com Lactose', () => {
    const mealIngredients = ['Pão francês', 'Queijo minas'];
    const result = checkMealForIntolerance(mealIngredients, LACTOSE_INGREDIENTS);
    expect(result.hasConflict).toBe(true);
  });

  test('Refeição sem ingredientes problemáticos deve ser compatível', () => {
    const mealIngredients = ['Arroz branco', 'Frango grelhado', 'Salada de alface'];
    const resultFodmap = checkMealForIntolerance(mealIngredients, FODMAP_INGREDIENTS);
    const resultLactose = checkMealForIntolerance(mealIngredients, LACTOSE_INGREDIENTS);
    const resultGluten = checkMealForIntolerance(mealIngredients, GLUTEN_INGREDIENTS);
    
    expect(resultFodmap.hasConflict).toBe(false);
    expect(resultLactose.hasConflict).toBe(false);
    expect(resultGluten.hasConflict).toBe(false);
  });

  test('Refeição da imagem: Arroz com Feijão deve ser incompatível com FODMAP', () => {
    // Refeição da imagem do usuário
    const mealIngredients = ['Arroz', 'Feijão', 'Peito de frango grelhado', 'Salada de alface com tomate'];
    const result = checkMealForIntolerance(mealIngredients, FODMAP_INGREDIENTS);
    expect(result.hasConflict).toBe(true);
    console.log('Conflitos encontrados:', result.conflicts);
  });
});
