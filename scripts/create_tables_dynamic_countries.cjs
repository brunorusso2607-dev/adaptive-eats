// Script para criar tabelas do sistema dinâmico de países via SQL direto
const https = require('https');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

// SQL para criar as tabelas
const CREATE_TABLES_SQL = `
-- 1. TABELA CULTURAL_RULES
CREATE TABLE IF NOT EXISTS public.cultural_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  required_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  typical_beverages JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_beverages JSONB NOT NULL DEFAULT '[]'::jsonb,
  structure_description TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  negative_examples JSONB DEFAULT '[]'::jsonb,
  macro_focus JSONB DEFAULT '{}'::jsonb,
  max_prep_time TEXT DEFAULT '15 minutos',
  fallback_country_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, meal_type)
);

-- 2. TABELA MEAL_COMPONENTS_POOL
CREATE TABLE IF NOT EXISTS public.meal_components_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  component_type TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  portion_grams INTEGER,
  portion_ml INTEGER,
  portion_label TEXT,
  blocked_for TEXT[] DEFAULT '{}',
  safe_for TEXT[] DEFAULT '{}',
  is_alternative BOOLEAN DEFAULT false,
  alternatives TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA COUNTRY_FALLBACK_HIERARCHY
CREATE TABLE IF NOT EXISTS public.country_fallback_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  fallback_chain TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cultural_rules_country ON public.cultural_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_cultural_rules_meal_type ON public.cultural_rules(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_country ON public.meal_components_pool(country_code);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_meal_type ON public.meal_components_pool(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_type ON public.meal_components_pool(component_type);
CREATE INDEX IF NOT EXISTS idx_country_fallback_country ON public.country_fallback_hierarchy(country_code);
`;

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + '/rest/v1/rpc/');
    
    // Use pg_query function if available, otherwise try direct approach
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'onzdkpqtzfxzcdyxczkn.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('===========================================');
  console.log('CRIANDO TABELAS DO SISTEMA DINÂMICO');
  console.log('===========================================\n');
  
  // Como não temos função RPC para executar SQL arbitrário,
  // vamos usar a conexão direta do Supabase
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  });
  
  // Tentar criar tabelas usando funções do Supabase
  // Como não podemos executar DDL diretamente, vamos verificar se as tabelas existem
  // e instruir o usuário a executar a migration manualmente se necessário
  
  console.log('Verificando se tabelas existem...\n');
  
  // Testar cultural_rules
  const { error: e1 } = await supabase.from('cultural_rules').select('id').limit(1);
  if (e1 && e1.message.includes('does not exist')) {
    console.log('❌ Tabela cultural_rules NÃO existe');
    console.log('\nAs tabelas precisam ser criadas manualmente.');
    console.log('Execute o seguinte SQL no Supabase Dashboard:');
    console.log('SQL Editor > New Query > Cole o conteúdo abaixo:\n');
    console.log('--- INÍCIO DO SQL ---');
    console.log(CREATE_TABLES_SQL);
    console.log('--- FIM DO SQL ---\n');
    console.log('Após criar as tabelas, execute este script novamente.');
    return false;
  } else if (e1) {
    console.log('⚠️ Erro ao verificar cultural_rules:', e1.message);
  } else {
    console.log('✓ Tabela cultural_rules existe');
  }
  
  // Testar meal_components_pool
  const { error: e2 } = await supabase.from('meal_components_pool').select('id').limit(1);
  if (e2 && e2.message.includes('does not exist')) {
    console.log('❌ Tabela meal_components_pool NÃO existe');
    return false;
  } else if (e2) {
    console.log('⚠️ Erro ao verificar meal_components_pool:', e2.message);
  } else {
    console.log('✓ Tabela meal_components_pool existe');
  }
  
  // Testar country_fallback_hierarchy
  const { error: e3 } = await supabase.from('country_fallback_hierarchy').select('id').limit(1);
  if (e3 && e3.message.includes('does not exist')) {
    console.log('❌ Tabela country_fallback_hierarchy NÃO existe');
    return false;
  } else if (e3) {
    console.log('⚠️ Erro ao verificar country_fallback_hierarchy:', e3.message);
  } else {
    console.log('✓ Tabela country_fallback_hierarchy existe');
  }
  
  console.log('\n✓ Todas as tabelas existem! Pronto para popular dados.');
  return true;
}

main().then(success => {
  if (!success) {
    console.log('\n⚠️ Tabelas precisam ser criadas primeiro.');
    process.exit(1);
  }
}).catch(console.error);
