#!/usr/bin/env node

/**
 * TESTE DE TOKEN DE AUTENTICAÇÃO
 * Verifica se o token JWT está válido e funcionando
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.lRvIwZkxJGgCQeJAZqNOWXvFkb0Uh5SIxQWPqkGRUKs';

async function testAuthToken() {
  console.log("🔐 TESTANDO TOKEN DE AUTENTICAÇÃO\n");
  console.log("═".repeat(60));
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Tentar obter sessão atual
    console.log("\n1️⃣ Verificando sessão atual...");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log("❌ Erro ao obter sessão:", sessionError.message);
      return;
    }
    
    if (!sessionData.session) {
      console.log("❌ Nenhuma sessão ativa encontrada");
      console.log("\n💡 SOLUÇÃO:");
      console.log("   O usuário precisa fazer login novamente no app");
      console.log("   O token JWT expirou ou não foi criado corretamente");
      return;
    }
    
    console.log("✅ Sessão ativa encontrada");
    console.log("   User ID:", sessionData.session.user.id);
    console.log("   Email:", sessionData.session.user.email);
    console.log("   Token expira em:", new Date(sessionData.session.expires_at * 1000).toLocaleString());
    
    // Verificar se token está válido
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = sessionData.session.expires_at;
    
    if (expiresAt < now) {
      console.log("\n❌ TOKEN EXPIRADO!");
      console.log("   Expirou em:", new Date(expiresAt * 1000).toLocaleString());
      console.log("   Agora:", new Date(now * 1000).toLocaleString());
      console.log("\n💡 SOLUÇÃO: Fazer logout e login novamente");
      return;
    }
    
    console.log("✅ Token válido");
    console.log("   Tempo restante:", Math.floor((expiresAt - now) / 60), "minutos");
    
    // Testar chamada à Edge Function com o token
    console.log("\n2️⃣ Testando chamada à Edge Function...");
    
    const { data, error } = await supabase.functions.invoke('generate-ai-meal-plan', {
      body: {
        planName: "Teste Auth",
        mealTypes: ["breakfast"],
        daysCount: 1,
        startDate: "2026-01-16",
      },
    });
    
    if (error) {
      console.log("❌ Erro na Edge Function:", error.message);
      console.log("   Detalhes:", JSON.stringify(error, null, 2));
      
      if (error.message.includes('Invalid JWT') || error.message.includes('401')) {
        console.log("\n💡 DIAGNÓSTICO:");
        console.log("   O token está sendo rejeitado pela Edge Function");
        console.log("   Isso pode acontecer se:");
        console.log("   1. O usuário fez login em outro dispositivo");
        console.log("   2. A sessão foi invalidada no servidor");
        console.log("   3. Há um problema com a configuração do Supabase");
        console.log("\n💡 SOLUÇÃO:");
        console.log("   1. Limpar cache do navegador");
        console.log("   2. Fazer logout completo");
        console.log("   3. Fazer login novamente");
      }
      
      return;
    }
    
    console.log("✅ Edge Function respondeu com sucesso!");
    console.log("   Resposta:", JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log("\n❌ ERRO INESPERADO:", error.message);
    console.log("   Stack:", error.stack);
  }
}

testAuthToken();
