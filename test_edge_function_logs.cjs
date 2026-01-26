#!/usr/bin/env node

/**
 * TESTE COM LOGS DETALHADOS DA EDGE FUNCTION
 * Tenta capturar o erro exato que está acontecendo
 */

const https = require('https');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.lRvIwZkxJGgCQeJAZqNOWXvFkb0Uh5SIxQWPqkGRUKs';

async function testEdgeFunction() {
  console.log("🧪 TESTANDO EDGE FUNCTION COM LOGS\n");
  console.log("═".repeat(60));
  
  const payload = JSON.stringify({
    planName: "Teste Janeiro 2026",
    mealTypes: ["breakfast", "lunch", "dinner"],
    daysCount: 3,
    startDate: "2026-01-16",
  });
  
  const options = {
    hostname: 'onzdkpqtzfxzcdyxczkn.supabase.co',
    port: 443,
    path: '/functions/v1/generate-ai-meal-plan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  
  console.log("\n📤 Enviando requisição...");
  console.log("   URL:", `https://${options.hostname}${options.path}`);
  console.log("   Payload:", payload);
  
  const startTime = Date.now();
  
  const req = https.request(options, (res) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("\n📥 Resposta recebida:");
    console.log("   Status:", res.statusCode);
    console.log("   Headers:", JSON.stringify(res.headers, null, 2));
    console.log("   Duração:", duration, "segundos");
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log("\n📄 Body da resposta:");
      console.log(data);
      
      if (res.statusCode !== 200) {
        console.log("\n❌ ERRO HTTP", res.statusCode);
        try {
          const errorData = JSON.parse(data);
          console.log("   Erro parseado:", JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log("   Erro raw:", data);
        }
      } else {
        console.log("\n✅ SUCESSO!");
        try {
          const responseData = JSON.parse(data);
          console.log("   Plano ID:", responseData.mealPlanId);
        } catch (e) {
          console.log("   Resposta não é JSON válido");
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

testEdgeFunction();
