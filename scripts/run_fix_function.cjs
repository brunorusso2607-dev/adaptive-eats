#!/usr/bin/env node

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjI3MTcsImV4cCI6MjA2MjgzODcxN30.Qs0JZKPKl4Hf-ksVJgPvGKNHQRqLJHCpXzZlKmXJZUo";

async function runFixFunction() {
  console.log("🔧 EXECUTANDO EDGE FUNCTION DE CORREÇÃO");
  console.log("=" .repeat(60));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-meal-intolerances`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    
    console.log("\n✅ RESULTADO DA CORREÇÃO:");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log("\n🎉 CORREÇÃO EXECUTADA COM SUCESSO!");
      console.log("\n📊 ESTATÍSTICAS:");
      console.log("Antes:", result.before);
      console.log("Depois:", result.after);
      console.log(`Refeições atualizadas nos componentes: ${result.updatedInComponents}`);
      
      if (result.after && result.after[0] && result.after[0].sem_marca === 0) {
        console.log("\n✅ TODAS as refeições com ovo estão marcadas!");
        console.log("\n🔄 Próximo passo:");
        console.log("1. Recarregue a página do AdminMealPool");
        console.log("2. Selecione '🥚 Sem Ovo'");
        console.log("3. Clique em 'Filtrar'");
        console.log("4. Nenhuma refeição com ovo deve aparecer!");
      } else {
        console.log("\n⚠️  Ainda existem refeições sem marcação");
      }
    } else {
      console.error("\n❌ Erro na correção:", result.error);
    }
    
  } catch (error) {
    console.error("\n❌ Erro ao executar função:", error.message);
  }
}

runFixFunction().catch(console.error);
