// ═══════════════════════════════════════════════════════════════════════
// SYNC INGREDIENTS - Edge Function para Sincronização Automática
// ═══════════════════════════════════════════════════════════════════════
// Sincroniza ingredientes do meal-ingredients-db.ts para o banco de dados
// Pode ser chamada manualmente ou via webhook/cron job
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { INGREDIENTS } from "../_shared/meal-ingredients-db.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  total_ingredients: number;
  synced: number;
  updated: number;
  inserted: number;
  errors: string[];
  skipped: string[];
}

// Mapeia categoria do ingrediente baseado em suas propriedades
function inferCategory(ingredientKey: string, ingredient: any): string {
  const key = ingredientKey.toLowerCase();
  
  // Proteínas
  if (key.includes('chicken') || key.includes('beef') || key.includes('pork') || 
      key.includes('fish') || key.includes('salmon') || key.includes('tuna') ||
      key.includes('egg') || key.includes('shrimp') || key.includes('turkey') ||
      key.includes('ham') || key.includes('frango') || key.includes('carne') ||
      key.includes('peixe') || key.includes('ovo')) {
    return 'protein';
  }
  
  // Carboidratos
  if (key.includes('rice') || key.includes('bread') || key.includes('pasta') ||
      key.includes('potato') || key.includes('sweet_potato') || key.includes('oats') ||
      key.includes('arroz') || key.includes('pao') || key.includes('batata') ||
      key.includes('macarrao') || key.includes('tapioca') || key.includes('gnocchi')) {
    return 'carbs';
  }
  
  // Vegetais
  if (key.includes('lettuce') || key.includes('spinach') || key.includes('kale') ||
      key.includes('broccoli') || key.includes('carrot') || key.includes('tomato') ||
      key.includes('cucumber') || key.includes('pepper') || key.includes('onion') ||
      key.includes('alface') || key.includes('espinafre') || key.includes('couve') ||
      key.includes('brocolis') || key.includes('cenoura') || key.includes('tomate') ||
      key.includes('pepino') || key.includes('pimentao') || key.includes('cebola')) {
    return 'vegetable';
  }
  
  // Frutas
  if (key.includes('banana') || key.includes('apple') || key.includes('orange') ||
      key.includes('strawberry') || key.includes('mango') || key.includes('pear') ||
      key.includes('grape') || key.includes('kiwi') || key.includes('watermelon') ||
      key.includes('maca') || key.includes('laranja') || key.includes('morango') ||
      key.includes('manga') || key.includes('pera') || key.includes('uva') ||
      key.includes('melancia') || key.includes('papaya') || key.includes('pineapple')) {
    return 'fruit';
  }
  
  // Laticínios
  if (key.includes('milk') || key.includes('yogurt') || key.includes('cheese') ||
      key.includes('leite') || key.includes('iogurte') || key.includes('queijo') ||
      key.includes('ricotta') || key.includes('cottage') || key.includes('butter')) {
    return 'dairy';
  }
  
  // Bebidas
  if (key.includes('coffee') || key.includes('tea') || key.includes('juice') ||
      key.includes('water') || key.includes('cafe') || key.includes('cha') ||
      key.includes('suco') || key.includes('smoothie')) {
    return 'beverage';
  }
  
  // Gorduras
  if (key.includes('oil') || key.includes('olive') || key.includes('nuts') ||
      key.includes('azeite') || key.includes('castanha') || key.includes('amendoim') ||
      key.includes('nozes') || key.includes('almonds')) {
    return 'fat';
  }
  
  // Sementes
  if (key.includes('seeds') || key.includes('chia') || key.includes('flax') ||
      key.includes('sesame') || key.includes('sementes') || key.includes('gergelim')) {
    return 'seeds';
  }
  
  // Leguminosas
  if (key.includes('beans') || key.includes('lentils') || key.includes('chickpeas') ||
      key.includes('feijao') || key.includes('lentilha') || key.includes('grao')) {
    return 'protein'; // Leguminosas são fonte de proteína
  }
  
  return 'other';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const result: SyncResult = {
      success: true,
      total_ingredients: 0,
      synced: 0,
      updated: 0,
      inserted: 0,
      errors: [],
      skipped: []
    };

    const ingredientKeys = Object.keys(INGREDIENTS);
    result.total_ingredients = ingredientKeys.length;

    console.log(`🔄 Iniciando sincronização de ${result.total_ingredients} ingredientes...`);

    // Processar cada ingrediente
    for (const ingredientKey of ingredientKeys) {
      const ingredient = INGREDIENTS[ingredientKey];
      
      try {
        // Calcular macros por 100g baseado na porção
        const portionGrams = ingredient.portion;
        const kcalPer100g = (ingredient.kcal / portionGrams) * 100;
        const proteinPer100g = (ingredient.prot / portionGrams) * 100;
        const carbsPer100g = (ingredient.carbs / portionGrams) * 100;
        const fatPer100g = (ingredient.fat / portionGrams) * 100;
        const fiberPer100g = (ingredient.fiber / portionGrams) * 100;

        // Inferir categoria se não estiver definida
        const category = inferCategory(ingredientKey, ingredient);

        // Verificar se ingrediente já existe
        const { data: existingIngredient } = await supabaseClient
          .from('ingredient_pool')
          .select('ingredient_key, updated_at')
          .eq('ingredient_key', ingredientKey)
          .single();

        if (existingIngredient) {
          // Atualizar ingrediente existente
          const { error: updateError } = await supabaseClient
            .from('ingredient_pool')
            .update({
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
              country_code: ingredient.country || null,
              updated_at: new Date().toISOString()
            })
            .eq('ingredient_key', ingredientKey);

          if (updateError) {
            result.errors.push(`Erro ao atualizar ${ingredientKey}: ${updateError.message}`);
          } else {
            result.updated++;
            result.synced++;
            console.log(`✅ Atualizado: ${ingredientKey}`);
          }
        } else {
          // Inserir novo ingrediente
          const { error: insertError } = await supabaseClient
            .from('ingredient_pool')
            .insert({
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
            });

          if (insertError) {
            result.errors.push(`Erro ao inserir ${ingredientKey}: ${insertError.message}`);
          } else {
            result.inserted++;
            result.synced++;
            console.log(`✨ Inserido: ${ingredientKey}`);
          }
        }
      } catch (error) {
        result.errors.push(`Erro ao processar ${ingredientKey}: ${error.message}`);
        console.error(`❌ Erro em ${ingredientKey}:`, error);
      }
    }

    result.success = result.errors.length === 0;

    console.log(`\n📊 Sincronização concluída:`);
    console.log(`   Total: ${result.total_ingredients}`);
    console.log(`   Sincronizados: ${result.synced}`);
    console.log(`   Inseridos: ${result.inserted}`);
    console.log(`   Atualizados: ${result.updated}`);
    console.log(`   Erros: ${result.errors.length}`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 207 // 207 Multi-Status se houver erros parciais
      }
    );

  } catch (error) {
    console.error('❌ Erro fatal na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        total_ingredients: 0,
        synced: 0,
        updated: 0,
        inserted: 0,
        errors: [error.message],
        skipped: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

