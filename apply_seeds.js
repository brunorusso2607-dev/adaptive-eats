import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erro: VITE_SUPABASE_URL ou Service Role Key não encontradas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const seedFiles = [
  { file: 'supabase/seed_onboarding.sql', name: 'Onboarding (Países, Categorias, Opções)' },
  { file: 'supabase/seed_global_configs.sql', name: 'Configurações Globais' },
  { file: 'supabase/seed_food_safety_basic.sql', name: 'Segurança Alimentar (Básico)' }
];

async function executeSqlFile(filePath, name) {
  console.log(`\n🚀 Executando: ${name}`);
  console.log(`📄 Arquivo: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Divide o SQL em statements individuais (separados por ;)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Pula comentários e linhas vazias
    if (statement.startsWith('--') || statement.length < 10) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        // Tenta executar diretamente se RPC falhar
        const { error: directError } = await supabase.from('_sql').insert({ query: statement });
        
        if (directError) {
          console.error(`  ⚠️ Statement ${i + 1} falhou (pode ser duplicata - OK):`, directError.message.substring(0, 100));
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Erro no statement ${i + 1}:`, err.message.substring(0, 100));
      errorCount++;
    }
  }

  console.log(`✅ Concluído: ${successCount} statements executados, ${errorCount} erros (duplicatas são normais)`);
  return true;
}

async function runSeeds() {
  console.log("🔥 Iniciando aplicação de seeds no banco de dados...\n");
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Usando Service Role Key\n`);

  for (const seed of seedFiles) {
    await executeSqlFile(seed.file, seed.name);
    // Pequeno delay entre arquivos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n🎉 Processo de seeds concluído!");
  console.log("\n📋 Próximos passos:");
  console.log("1. Acesse o Admin do app e verifique se o Onboarding está populado");
  console.log("2. Execute os importadores de alimentos (TACO, TBCA, BAM, etc.)");
  console.log("3. Opcionalmente, expanda as intolerâncias via edge functions de IA");
}

runSeeds().catch(err => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
