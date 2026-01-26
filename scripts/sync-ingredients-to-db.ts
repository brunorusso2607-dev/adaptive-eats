#!/usr/bin/env tsx
// ═══════════════════════════════════════════════════════════════════════
// SCRIPT DE SINCRONIZAÇÃO AUTOMÁTICA DE INGREDIENTES
// ═══════════════════════════════════════════════════════════════════════
// Sincroniza meal-ingredients-db.ts → Supabase ingredient_pool
// Uso: npm run sync:ingredients
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { INGREDIENTS } from '../supabase/functions/_shared/meal-ingredients-db';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Mapeia categoria do ingrediente
function inferCategory(ingredientKey: string): string {
  const key = ingredientKey.toLowerCase();
  
  if (key.includes('chicken') || key.includes('beef') || key.includes('pork') || 
      key.includes('fish') || key.includes('egg') || key.includes('frango') || 
      key.includes('carne') || key.includes('peixe') || key.includes('ovo')) {
    return 'protein';
  }
  
  if (key.includes('rice') || key.includes('bread') || key.includes('pasta') ||
      key.includes('potato') || key.includes('arroz') || key.includes('pao') ||
      key.includes('batata') || key.includes('macarrao')) {
    return 'carbs';
  }
  
  if (key.includes('lettuce') || key.includes('spinach') || key.includes('broccoli') ||
      key.includes('carrot') || key.includes('tomato') || key.includes('alface') ||
      key.includes('espinafre') || key.includes('brocolis') || key.includes('cenoura')) {
    return 'vegetable';
  }
  
  if (key.includes('banana') || key.includes('apple') || key.includes('orange') ||
      key.includes('strawberry') || key.includes('maca') || key.includes('laranja') ||
      key.includes('morango') || key.includes('fruit') || key.includes('fruta')) {
    return 'fruit';
  }
  
  if (key.includes('milk') || key.includes('yogurt') || key.includes('cheese') ||
      key.includes('leite') || key.includes('iogurte') || key.includes('queijo')) {
    return 'dairy';
  }
  
  if (key.includes('coffee') || key.includes('tea') || key.includes('juice') ||
      key.includes('cafe') || key.includes('cha') || key.includes('suco')) {
    return 'beverage';
  }
  
  if (key.includes('oil') || key.includes('nuts') || key.includes('azeite') ||
      key.includes('castanha') || key.includes('amendoim')) {
    return 'fat';
  }
  
  if (key.includes('seeds') || key.includes('chia') || key.includes('sementes')) {
    return 'seeds';
  }
  
  return 'other';
}

async function syncIngredients(): Promise<SyncStats> {
  const stats: SyncStats = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  const ingredientKeys = Object.keys(INGREDIENTS);
  stats.total = ingredientKeys.length;

  console.log(`\n🔄 Sincronizando ${stats.total} ingredientes...\n`);

  for (const ingredientKey of ingredientKeys) {
    const ingredient = INGREDIENTS[ingredientKey];
    
    try {
      // Calcular macros por 100g
      const portionGrams = ingredient.portion;
      const kcalPer100g = (ingredient.kcal / portionGrams) * 100;
      const proteinPer100g = (ingredient.prot / portionGrams) * 100;
      const carbsPer100g = (ingredient.carbs / portionGrams) * 100;
      const fatPer100g = (ingredient.fat / portionGrams) * 100;
      const fiberPer100g = (ingredient.fiber / portionGrams) * 100;

      const category = inferCategory(ingredientKey);

      // Verificar se existe
      const { data: existing } = await supabase
        .from('ingredient_pool')
        .select('ingredient_key')
        .eq('ingredient_key', ingredientKey)
        .single();

      const ingredientData = {
        ingredient_key: ingredientKey,
        display_name_pt: ingredient.display_name_pt,
        display_name_en: ingredient.display_name_en,
        display_name_es: ingredient.display_name_es || null,
        category: category,
        kcal_per_100g: Math.round(kcalPer100g * 10) / 10,
        protein_per_100g: Math.round(proteinPer100g * 10) / 10,
        carbs_per_100g: Math.round(carbsPer100g * 10) / 10,
        fat_per_100g: Math.round(fatPer100g * 10) / 10,
        fiber_per_100g: Math.round(fiberPer100g * 10) / 10,
        default_portion_grams: portionGrams,
        is_alternative: false,
        country_code: ingredient.country || null
      };

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('ingredient_pool')
          .update(ingredientData)
          .eq('ingredient_key', ingredientKey);

        if (error) {
          stats.errors.push(`${ingredientKey}: ${error.message}`);
          console.log(`❌ ${ingredientKey}`);
        } else {
          stats.updated++;
          console.log(`✅ ${ingredientKey} (atualizado)`);
        }
      } else {
        // Inserir
        const { error } = await supabase
          .from('ingredient_pool')
          .insert(ingredientData);

        if (error) {
          stats.errors.push(`${ingredientKey}: ${error.message}`);
          console.log(`❌ ${ingredientKey}`);
        } else {
          stats.inserted++;
          console.log(`✨ ${ingredientKey} (novo)`);
        }
      }
    } catch (error) {
      stats.errors.push(`${ingredientKey}: ${error.message}`);
      console.log(`❌ ${ingredientKey}: ${error.message}`);
    }
  }

  return stats;
}

// Executar sincronização
(async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 SINCRONIZAÇÃO AUTOMÁTICA DE INGREDIENTES');
  console.log('═══════════════════════════════════════════════════════════');
  
  const startTime = Date.now();
  const stats = await syncIngredients();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESULTADO DA SINCRONIZAÇÃO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Total processado: ${stats.total}`);
  console.log(`✨ Novos inseridos: ${stats.inserted}`);
  console.log(`🔄 Atualizados: ${stats.updated}`);
  console.log(`⏭️  Ignorados: ${stats.skipped}`);
  console.log(`❌ Erros: ${stats.errors.length}`);
  console.log(`⏱️  Tempo: ${duration}s`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    stats.errors.forEach(error => console.log(`   - ${error}`));
    process.exit(1);
  }
  
  console.log('\n✅ Sincronização concluída com sucesso!');
  process.exit(0);
})();
