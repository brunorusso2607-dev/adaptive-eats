#!/usr/bin/env node

/**
 * TESTE DIRETO DA EDGE FUNCTION COM LOGS DETALHADOS
 * Simula exatamente o que o frontend faz, mas com logs completos
 */

const https = require('https');

const supabaseUrl = 'onzdkpqtzfxzcdyxczkn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

// Criar um JWT token válido manualmente para o usuário
const userId = 'd003d59f-49b2-4e55-b3ca-1c79e0b7a5c3';

async function testEdgeFunctionDirectly() {
  console.log("🧪 TESTE DIRETO COM SERVICE ROLE (BYPASS AUTH)\n");
  console.log("═".repeat(60));
  
  // Payload mínimo para teste
  const payload = JSON.stringify({
    planName: "Teste Direto",
    mealTypes: ["breakfast"],
    daysCount: 1,
    startDate: "2026-01-16",
    optionsPerMeal: 1,
    userCountry: "BR",
  });
  
  const options = {
    hostname: supabaseUrl,
    port: 443,
    path: '/functions/v1/generate-ai-meal-plan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  
  console.log("\n📤 Chamando Edge Function...");
  console.log("   Usando SERVICE ROLE KEY");
  console.log("   Payload:", payload);
  
  const startTime = Date.now();
  
  const req = https.request(options, (res) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("\n📥 Resposta recebida:");
    console.log("   Status:", res.statusCode);
    console.log("   Duração:", duration, "segundos");
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log("\n📄 Resposta completa:");
      
      if (res.statusCode === 200) {
        console.log("✅ SUCESSO!");
        try {
          const responseData = JSON.parse(data);
          console.log(JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log(data);
        }
      } else {
        console.log("❌ ERRO HTTP", res.statusCode);
        console.log("\nBody:");
        console.log(data);
        
        try {
          const errorData = JSON.parse(data);
          console.log("\n🔍 ANÁLISE DO ERRO:");
          console.log("   success:", errorData.success);
          console.log("   error:", errorData.error);
          
          // Analisar tipo de erro
          if (errorData.error && errorData.error.includes("Authentication")) {
            console.log("\n💡 DIAGNÓSTICO:");
            console.log("   ❌ Erro de autenticação");
            console.log("   A Edge Function está rejeitando o SERVICE_ROLE_KEY");
            console.log("   Isso indica que a função espera um token de usuário válido");
          } else if (errorData.error && errorData.error.includes("API key")) {
            console.log("\n💡 DIAGNÓSTICO:");
            console.log("   ❌ Problema com API Key do Gemini");
            console.log("   A função não consegue acessar a API Key do banco");
          } else if (errorData.error && errorData.error.includes("Profile")) {
            console.log("\n💡 DIAGNÓSTICO:");
            console.log("   ❌ Problema ao buscar perfil do usuário");
            console.log("   A função não consegue acessar os dados do perfil");
          } else {
            console.log("\n💡 DIAGNÓSTICO:");
            console.log("   ❌ Erro desconhecido:", errorData.error);
          }
        } catch (e) {
          console.log("\n   (Resposta não é JSON válido)");
        }
      }
    });
  });
  
  req.on('error', (error) => {
    console.log("\n❌ ERRO NA REQUISIÇÃO:", error.message);
  });
  
  req.write(payload);
  req.end();
}

testEdgeFunctionDirectly();
