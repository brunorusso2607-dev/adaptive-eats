#!/usr/bin/env node

/**
 * VERIFICA DADOS DO PERFIL DO USUÁRIO
 * Identifica se falta algum dado obrigatório
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

async function checkUserProfile() {
  console.log("🔍 VERIFICANDO PERFIL DO USUÁRIO\n");
  console.log("═".repeat(60));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Buscar último usuário criado (provavelmente você)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.log("❌ Erro ao buscar perfil:", error.message);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log("❌ Nenhum perfil encontrado!");
      return;
    }
    
    const profile = profiles[0];
    
    console.log("\n📋 DADOS DO PERFIL:\n");
    console.log("ID:", profile.id);
    console.log("País:", profile.country || "❌ NÃO DEFINIDO");
    console.log("Onboarding:", profile.onboarding_completed ? "✅ Completo" : "❌ Incompleto");
    
    console.log("\n📊 DADOS FÍSICOS:");
    const physicalData = {
      'Peso Atual': profile.weight_current,
      'Peso Meta': profile.weight_goal,
      'Altura': profile.height,
      'Idade': profile.age,
      'Sexo': profile.sex,
      'Nível de Atividade': profile.activity_level,
      'Meta': profile.goal,
      'Estratégia': profile.strategy_id,
    };
    
    let missingData = [];
    
    for (const [key, value] of Object.entries(physicalData)) {
      if (value === null || value === undefined) {
        console.log(`   ❌ ${key}: NÃO DEFINIDO`);
        missingData.push(key);
      } else {
        console.log(`   ✅ ${key}: ${value}`);
      }
    }
    
    console.log("\n🍽️ RESTRIÇÕES:");
    console.log("   Intolerâncias:", profile.intolerances?.length || 0);
    console.log("   Ingredientes Excluídos:", profile.excluded_ingredients?.length || 0);
    console.log("   Preferência Alimentar:", profile.dietary_preference || "comum");
    
    console.log("\n" + "═".repeat(60));
    
    if (missingData.length > 0) {
      console.log("❌ DADOS FALTANDO:");
      missingData.forEach(data => console.log(`   - ${data}`));
      console.log("\n💡 SOLUÇÃO: Complete o onboarding com todos os dados");
    } else {
      console.log("✅ TODOS OS DADOS ESTÃO COMPLETOS!");
      console.log("\n💡 O erro pode ser:");
      console.log("   1. Timeout na geração (17 dias = muito tempo)");
      console.log("   2. Erro no código da Edge Function");
      console.log("   3. Problema no prompt gerado");
    }
    
  } catch (error) {
    console.log("\n❌ ERRO:", error.message);
  }
}

checkUserProfile();
