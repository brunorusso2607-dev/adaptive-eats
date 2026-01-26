#!/usr/bin/env node

/**
 * Script para popular TODOS os tipos de refeição para TODAS as intolerâncias
 * Garante cobertura completa do pool de refeições
 */

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjI3MTcsImV4cCI6MjA2MjgzODcxN30.A6s34xwGv6Jz8Uh4sMXN5CMYdGT-JWLM_BM9kZrLzIE";

const MEAL_TYPES = [
  "cafe_manha",
  "lanche_manha", 
  "almoco",
  "lanche_tarde",
  "jantar",
  "ceia"
];

const INTOLERANCES = [
  null,        // Sem intolerância
  "gluten",
  "lactose",
  "eggs",
  "nuts",
  "seafood",
  "fish",
  "soy",
  "peanut"
];

const COUNTRIES = ["BR"]; // Começar com Brasil

async function populateMeals(country, mealType, intolerance, quantity = 10) {
  const intoleranceLabel = intolerance || "sem_intolerancia";
  console.log(`\n🔄 Gerando ${quantity} refeições: ${country} - ${mealType} - ${intoleranceLabel}`);
  
  const body = {
    country_code: country,
    meal_type: mealType,
    quantity: quantity,
    intolerance_filter: intolerance
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/populate-meal-pool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro HTTP ${response.status}: ${errorText}`);
      return { success: false, generated: 0, inserted: 0, skipped: 0 };
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Sucesso: ${result.inserted} inseridas, ${result.skipped} duplicadas`);
      return result;
    } else {
      console.error(`❌ Falha: ${result.error || 'Erro desconhecido'}`);
      return { success: false, generated: 0, inserted: 0, skipped: 0 };
    }
  } catch (error) {
    console.error(`❌ Erro de rede: ${error.message}`);
    return { success: false, generated: 0, inserted: 0, skipped: 0 };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 INICIANDO POPULAÇÃO MASSIVA DO POOL DE REFEIÇÕES");
  console.log("=" .repeat(60));
  
  const stats = {
    total: 0,
    inserted: 0,
    skipped: 0,
    failed: 0
  };

  for (const country of COUNTRIES) {
    console.log(`\n🌍 País: ${country}`);
    console.log("-".repeat(60));
    
    for (const mealType of MEAL_TYPES) {
      console.log(`\n📋 Tipo de refeição: ${mealType}`);
      
      for (const intolerance of INTOLERANCES) {
        const result = await populateMeals(country, mealType, intolerance, 10);
        
        stats.total += result.generated || 0;
        stats.inserted += result.inserted || 0;
        stats.skipped += result.skipped || 0;
        if (!result.success) stats.failed++;
        
        // Aguardar 2 segundos entre requests para não sobrecarregar
        await sleep(2000);
      }
      
      // Aguardar 5 segundos entre tipos de refeição
      await sleep(5000);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 ESTATÍSTICAS FINAIS");
  console.log("=".repeat(60));
  console.log(`Total geradas:     ${stats.total}`);
  console.log(`Total inseridas:   ${stats.inserted}`);
  console.log(`Total duplicadas:  ${stats.skipped}`);
  console.log(`Total falhas:      ${stats.failed}`);
  console.log(`Taxa de sucesso:   ${((stats.inserted / stats.total) * 100).toFixed(1)}%`);
  console.log("=".repeat(60));
  console.log("✅ POPULAÇÃO CONCLUÍDA!");
}

main().catch(console.error);
