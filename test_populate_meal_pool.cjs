#!/usr/bin/env node

/**
 * TESTE DIRETO DO POPULATE-MEAL-POOL
 * Captura erro completo da função
 */

const https = require('https');

const supabaseUrl = 'onzdkpqtzfxzcdyxczkn.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.wbKQ7vKHn5UPIEGRviPiOEErrMKubpORnmQ0NctAuN8';

async function testPopulateMealPool() {
  console.log("🧪 TESTE DO POPULATE-MEAL-POOL\n");
  console.log("═".repeat(60));
  
  const payload = JSON.stringify({
    country_code: "BR",
    meal_type: "cafe_manha",
    quantity: 5,
    dietary_filter: null,
    strategy_key: null,
    intolerance_filter: null
  });
  
  const options = {
    hostname: supabaseUrl,
    port: 443,
    path: '/functions/v1/populate-meal-pool',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  
  console.log("\n📤 Chamando função...");
  console.log("   Payload:", JSON.parse(payload));
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
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
        console.log(data);
        
        if (res.statusCode === 200) {
          console.log("\n✅ SUCESSO!");
          try {
            const responseData = JSON.parse(data);
            console.log("\n📊 Dados retornados:");
            console.log(JSON.stringify(responseData, null, 2));
          } catch (e) {
            console.log("   (Resposta não é JSON)");
          }
        } else {
          console.log("\n❌ ERRO HTTP", res.statusCode);
          
          try {
            const errorData = JSON.parse(data);
            console.log("\n🔍 ERRO DETALHADO:");
            console.log(JSON.stringify(errorData, null, 2));
          } catch (e) {
            console.log("   (Erro não é JSON válido)");
          }
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log("\n❌ ERRO NA REQUISIÇÃO:", error.message);
      reject(error);
    });
    
    req.write(payload);
    req.end();
  });
}

testPopulateMealPool().catch(console.error);
