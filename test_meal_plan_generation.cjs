#!/usr/bin/env node

/**
 * TESTE DE GERAÇÃO DE PLANO ALIMENTAR
 * Simula a chamada à Edge Function para diagnosticar o erro
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

async function testMealPlanGeneration() {
  console.log("🧪 TESTANDO GERAÇÃO DE PLANO ALIMENTAR\n");
  console.log("═".repeat(60));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'd003d59f-49b2-4e55-b3ca-1c79e0b7a5c3')
      .single();
    
    if (profileError) {
      console.log("❌ Erro ao buscar perfil:", profileError.message);
      return;
    }
    
    console.log("\n✅ Perfil carregado:");
    console.log("   Peso:", profile.weight_current);
    console.log("   Altura:", profile.height);
    console.log("   Idade:", profile.age);
    console.log("   Sexo:", profile.sex);
    console.log("   Atividade:", profile.activity_level);
    console.log("   Meta:", profile.goal);
    
    // Preparar payload para Edge Function
    const payload = {
      planName: "Teste Janeiro 2026",
      mealTypes: ["breakfast", "lunch", "dinner"],
      daysCount: 3, // Testar com apenas 3 dias primeiro
      startDate: new Date().toISOString().split('T')[0],
    };
    
    console.log("\n📤 Chamando Edge Function...");
    console.log("   Payload:", JSON.stringify(payload, null, 2));
    
    const startTime = Date.now();
    
    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('generate-ai-meal-plan', {
      body: payload,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (error) {
      console.log("\n❌ ERRO NA EDGE FUNCTION:");
      console.log("   Status:", error.status);
      console.log("   Mensagem:", error.message);
      console.log("   Detalhes:", JSON.stringify(error, null, 2));
      console.log("   Duração:", duration, "segundos");
      
      // Tentar extrair mais detalhes do erro
      if (error.context) {
        console.log("   Contexto:", JSON.stringify(error.context, null, 2));
      }
      
      return;
    }
    
    console.log("\n✅ SUCESSO!");
    console.log("   Duração:", duration, "segundos");
    console.log("   Plano ID:", data?.mealPlanId);
    console.log("   Dias gerados:", data?.daysGenerated);
    
  } catch (error) {
    console.log("\n❌ ERRO INESPERADO:", error.message);
    console.log("   Stack:", error.stack);
  }
}

testMealPlanGeneration();
