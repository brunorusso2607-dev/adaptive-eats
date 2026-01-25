import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("🔧 Iniciando correção de intolerâncias...");

    // 1. Verificar estado atual
    const { data: currentStats, error: statsError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT 
            COUNT(*) as total_com_ovo,
            COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)) as marcadas_egg,
            COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as marcadas_eggs,
            COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances))) as sem_marca
          FROM meal_combinations
          WHERE 
            name ILIKE '%ovo%' OR 
            name ILIKE '%egg%' OR
            name ILIKE '%omelete%' OR
            name ILIKE '%omelet%' OR
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(components) AS comp
              WHERE comp->>'name' ILIKE '%ovo%' 
                 OR comp->>'name' ILIKE '%egg%'
                 OR comp->>'name' ILIKE '%omelete%'
                 OR comp->>'name' ILIKE '%omelet%'
            )
        `
      });

    if (statsError) {
      console.error("Erro ao verificar estado:", statsError);
      throw new Error(`Erro ao verificar estado: ${statsError.message}`);
    }

    console.log("Estado atual:", currentStats);

    // 2. Atualizar refeições com ovo no nome
    const { error: updateNameError } = await supabase
      .from('meal_combinations')
      .update({
        blocked_for_intolerances: 
          `CASE 
            WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
            WHEN NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)) 
              THEN array_append(blocked_for_intolerances, 'egg')
            ELSE blocked_for_intolerances
          END`
      })
      .or('name.ilike.%ovo%,name.ilike.%egg%,name.ilike.%omelete%,name.ilike.%omelet%')
      .not('blocked_for_intolerances', 'cs', '{egg,eggs}');

    if (updateNameError) {
      console.error("Erro ao atualizar por nome:", updateNameError);
      throw new Error(`Erro ao atualizar por nome: ${updateNameError.message}`);
    }

    console.log("✅ Refeições com ovo no nome atualizadas");

    // 3. Atualizar refeições com ovo nos componentes
    const { data: mealsWithEggInComponents, error: fetchError } = await supabase
      .from('meal_combinations')
      .select('id, name, components, blocked_for_intolerances')
      .or('name.ilike.%ovo%,name.ilike.%egg%,name.ilike.%omelete%,name.ilike.%omelet%');

    if (fetchError) {
      console.error("Erro ao buscar refeições:", fetchError);
      throw new Error(`Erro ao buscar refeições: ${fetchError.message}`);
    }

    // Atualizar manualmente as que têm ovo nos componentes
    let updatedCount = 0;
    for (const meal of mealsWithEggInComponents || []) {
      const hasEggInComponents = meal.components?.some((c: any) => 
        c.name?.toLowerCase().includes('ovo') || 
        c.name?.toLowerCase().includes('egg') ||
        c.name?.toLowerCase().includes('omelete') ||
        c.name?.toLowerCase().includes('omelet')
      );

      if (hasEggInComponents) {
        const blocked = meal.blocked_for_intolerances || [];
        if (!blocked.includes('egg') && !blocked.includes('eggs')) {
          const { error: updateError } = await supabase
            .from('meal_combinations')
            .update({ blocked_for_intolerances: [...blocked, 'egg'] })
            .eq('id', meal.id);

          if (updateError) {
            console.error(`Erro ao atualizar ${meal.name}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
    }

    console.log(`✅ ${updatedCount} refeições com ovo nos componentes atualizadas`);

    // 4. Verificar resultado final
    const { data: finalStats, error: finalError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT 
            COUNT(*) as total_com_ovo,
            COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)) as marcadas_egg,
            COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as marcadas_eggs,
            COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances))) as sem_marca
          FROM meal_combinations
          WHERE 
            name ILIKE '%ovo%' OR 
            name ILIKE '%egg%' OR
            name ILIKE '%omelete%' OR
            name ILIKE '%omelet%' OR
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(components) AS comp
              WHERE comp->>'name' ILIKE '%ovo%' 
                 OR comp->>'name' ILIKE '%egg%'
                 OR comp->>'name' ILIKE '%omelete%'
                 OR comp->>'name' ILIKE '%omelet%'
            )
        `
      });

    if (finalError) {
      console.error("Erro ao verificar resultado final:", finalError);
      throw new Error(`Erro ao verificar resultado final: ${finalError.message}`);
    }

    console.log("Resultado final:", finalStats);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Correção executada com sucesso",
        before: currentStats,
        after: finalStats,
        updatedInComponents: updatedCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na correção:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

