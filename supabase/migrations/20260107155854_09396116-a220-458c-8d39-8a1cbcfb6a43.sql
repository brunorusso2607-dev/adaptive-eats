import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function resgateFinal() {
  console.log("🚀 FORÇANDO RESGATE DA TABELA CORRETA...");
  // Esta é a tabela que vimos no seu SQL (image_9b2469)
  const { data, error } = await supabase.from('canonical_ingredients').select('*');

  if (error) {
    console.error("❌ Erro:", error.message);
    return;
  }

  fs.writeFileSync('ingredientes_backup.json', JSON.stringify(data, null, 2));
  console.log(`\n🎉 SUCESSO! ${data.length} registros salvos.`);
}

resgateFinal();