#!/usr/bin/env node

/**
 * TESTE DA API KEY DO GEMINI
 * Testa se a API Key do banco funciona com o Gemini
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

async function testGeminiApiKey() {
  console.log("🔍 TESTANDO API KEY DO GEMINI\n");
  console.log("═".repeat(60));
  
  try {
    // 1. Buscar API Key do banco
    console.log("\n1️⃣ Buscando API Key do banco...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('api_integrations')
      .select('api_key_encrypted, is_active')
      .eq('name', 'gemini')
      .maybeSingle();
    
    if (error) {
      console.log("   ❌ Erro ao buscar do banco:", error.message);
      return;
    }
    
    if (!data || !data.api_key_encrypted) {
      console.log("   ❌ API Key não encontrada no banco!");
      return;
    }
    
    console.log("   ✅ API Key encontrada");
    console.log("   ✅ Status:", data.is_active ? "ATIVA" : "INATIVA");
    console.log("   ✅ Key (primeiros 10 chars):", data.api_key_encrypted.substring(0, 10) + "...");
    
    // 2. Testar API Key com Gemini
    console.log("\n2️⃣ Testando API Key com Gemini...");
    
    const apiKey = data.api_key_encrypted;
    const model = 'gemini-2.0-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Say "Hello World" in one word' }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      })
    });
    
    console.log("   ⏱️  Status HTTP:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("   ❌ ERRO NA API DO GEMINI:");
      console.log("   Status:", response.status);
      console.log("   Resposta:", errorText);
      
      if (response.status === 400) {
        console.log("\n   💡 DIAGNÓSTICO: API Key pode estar incorreta ou modelo inválido");
      } else if (response.status === 403) {
        console.log("\n   💡 DIAGNÓSTICO: API Key sem permissão ou projeto não configurado");
      } else if (response.status === 429) {
        console.log("\n   💡 DIAGNÓSTICO: Limite de requisições atingido");
      }
      return;
    }
    
    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log("   ✅ SUCESSO! Gemini respondeu:");
    console.log("   📝 Resposta:", textResponse);
    
    console.log("\n" + "═".repeat(60));
    console.log("✅ API KEY ESTÁ FUNCIONANDO CORRETAMENTE!");
    console.log("═".repeat(60));
    
    console.log("\n💡 O erro 'non-2xx status code' pode ser causado por:");
    console.log("   1. Timeout na Edge Function (>150s)");
    console.log("   2. Erro no código da Edge Function");
    console.log("   3. Dados do usuário incompletos (peso, altura, etc)");
    console.log("   4. Problema na geração do prompt");
    
  } catch (error) {
    console.log("\n❌ ERRO:", error.message);
  }
}

testGeminiApiKey();
