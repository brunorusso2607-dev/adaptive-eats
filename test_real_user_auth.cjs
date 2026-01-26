#!/usr/bin/env node

/**
 * TESTE COM USUÁRIO REAL - SIMULA EXATAMENTE O FRONTEND
 * Faz login como usuário real e testa a Edge Function
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.lRvIwZkxJGgCQeJAZqNOWXvFkb0Uh5SIxQWPqkGRUKs';

// SUBSTITUA PELAS CREDENCIAIS DO USUÁRIO REAL
const USER_EMAIL = 'bruno.russo2607@gmail.com'; // Substitua pelo email real
const USER_PASSWORD = 'teste123'; // Substitua pela senha real

async function testRealUserAuth() {
  console.log("🔐 TESTE COM USUÁRIO REAL\n");
  console.log("═".repeat(60));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Login com usuário real
    console.log("\n1️⃣ Fazendo login com usuário real...");
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    
    if (authError) {
      console.log("❌ Erro de login:", authError.message);
      console.log("\n💡 IMPORTANTE:");
      console.log("   Edite este arquivo e coloque as credenciais corretas do usuário:");
      console.log("   - USER_EMAIL");
      console.log("   - USER_PASSWORD");
      return;
    }
    
    console.log("✅ Login realizado com sucesso!");
    console.log("   User ID:", authData.user.id);
    console.log("   Email:", authData.user.email);
    console.log("   Token (primeiros 50 chars):", authData.session.access_token.substring(0, 50) + "...");
    
    // 2. Verificar perfil do usuário
    console.log("\n2️⃣ Verificando perfil do usuário...");
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("weight_current, height, age, sex, activity_level, goal, intolerances, country")
      .eq("id", authData.user.id)
      .single();
    
    if (profileError) {
      console.log("❌ Erro ao buscar perfil:", profileError.message);
      return;
    }
    
    console.log("✅ Perfil carregado:");
    console.log("   Peso:", profile.weight_current);
    console.log("   Altura:", profile.height);
    console.log("   Idade:", profile.age);
    console.log("   Sexo:", profile.sex);
    console.log("   Atividade:", profile.activity_level);
    console.log("   Meta:", profile.goal);
    console.log("   País:", profile.country);
    console.log("   Intolerâncias:", profile.intolerances);
    
    // 3. Testar Edge Function com token real
    console.log("\n3️⃣ Testando Edge Function com token REAL...");
    
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke("generate-ai-meal-plan", {
      body: {
        planName: "Teste Real Auth",
        mealTypes: ["breakfast"],
        daysCount: 1,
        startDate: "2026-01-16",
        optionsPerMeal: 1,
        userCountry: profile.country || "BR",
      },
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (error) {
      console.log("\n❌ ERRO NA EDGE FUNCTION:");
      console.log("   Mensagem:", error.message);
      console.log("   Detalhes:", JSON.stringify(error, null, 2));
      console.log("   Duração:", duration, "segundos");
      
      if (error.message.includes("Invalid JWT")) {
        console.log("\n🔍 DIAGNÓSTICO:");
        console.log("   O token JWT está sendo rejeitado");
        console.log("   Isso pode indicar um problema na Edge Function");
      } else if (error.message.includes("non-2xx")) {
        console.log("\n🔍 DIAGNÓSTICO:");
        console.log("   A Edge Function retornou erro HTTP");
        console.log("   Verificar logs no Supabase Dashboard");
      }
      
      return;
    }
    
    console.log("\n✅ SUCESSO!");
    console.log("   Duração:", duration, "segundos");
    console.log("   Resposta:", JSON.stringify(data, null, 2));
    
    // 4. Fazer logout
    await supabase.auth.signOut();
    console.log("\n✅ Logout realizado");
    
  } catch (error) {
    console.log("\n❌ ERRO INESPERADO:", error.message);
    console.log("   Stack:", error.stack);
  }
}

testRealUserAuth();
