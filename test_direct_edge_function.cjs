#!/usr/bin/env node

/**
 * TESTE DIRETO DA EDGE FUNCTION
 * Usa service role key para bypassar autenticação e testar a função diretamente
 */

const https = require('https');

const supabaseUrl = 'onzdkpqtzfxzcdyxczkn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

async function testDirectEdgeFunction() {
  console.log("🧪 TESTE DIRETO DA EDGE FUNCTION (SERVICE ROLE)\n");
  console.log("═".repeat(60));
  
  const payload = JSON.stringify({
    planName: "Teste Direto",
    mealTypes: ["breakfast"],
    daysCount: 1,
    startDate: "2026-01-16",
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
  
  console.log("\n📤 Enviando requisição com SERVICE ROLE KEY...");
  console.log("   Isso bypassa autenticação de usuário");
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
      console.log("\n📄 Body da resposta:");
      
      if (res.statusCode === 200) {
        console.log("✅ SUCESSO!");
        try {
          const responseData = JSON.parse(data);
          console.log("   Plano gerado:", JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log("   Resposta (não JSON):", data);
        }
      } else {
        console.log("❌ ERRO HTTP", res.statusCode);
        console.log("   Resposta:", data);
        
        try {
          const errorData = JSON.parse(data);
          console.log("\n🔍 ANÁLISE DO ERRO:");
          console.log("   Código:", errorData.code);
          console.log("   Mensagem:", errorData.message);
          
          if (errorData.message) {
            console.log("\n💡 DIAGNÓSTICO:");
            
            if (errorData.message.includes('JWT')) {
              console.log("   ❌ Problema de autenticação JWT");
              console.log("   Mesmo com service role key, JWT está sendo rejeitado");
              console.log("   Isso indica problema na Edge Function ou configuração do Supabase");
            } else if (errorData.message.includes('API key')) {
              console.log("   ❌ Problema com API Key do Gemini");
              console.log("   A Edge Function não consegue acessar a API Key");
            } else if (errorData.message.includes('timeout')) {
              console.log("   ❌ Timeout na execução");
              console.log("   A função está demorando muito para executar");
            } else {
              console.log("   ❌ Erro desconhecido:", errorData.message);
            }
          }
        } catch (e) {
          console.log("   Erro raw (não JSON):", data);
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

testDirectEdgeFunction();
