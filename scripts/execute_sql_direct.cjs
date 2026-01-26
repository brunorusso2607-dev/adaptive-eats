// Script para executar SQL diretamente no Supabase usando pg
const { Client } = require('pg');

// Usando a connection string direta do Supabase (porta 5432 para conexão direta)
const connectionString = 'postgresql://postgres.onzdkpqtzfxzcdyxczkn:Bruno2607@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

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

async function main() {
  console.log('===========================================');
  console.log('CRIANDO TABELAS VIA CONEXÃO DIRETA');
  console.log('===========================================\n');
  
  const client = new Client({ connectionString });
  
  try {
    console.log('Conectando ao banco de dados...');
    await client.connect();
    console.log('✓ Conectado!\n');
    
    console.log('Executando SQL para criar tabelas...');
    await client.query(CREATE_TABLES_SQL);
    console.log('✓ Tabelas criadas com sucesso!\n');
    
    // Verificar se tabelas existem
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cultural_rules', 'meal_components_pool', 'country_fallback_hierarchy')
    `);
    
    console.log('Tabelas encontradas:');
    for (const table of tables) {
      console.log(`  ✓ ${table.table_name}`);
    }
    
    if (tables.length === 3) {
      console.log('\n✓ Todas as 3 tabelas criadas com sucesso!');
    } else {
      console.log(`\n⚠️ Apenas ${tables.length} de 3 tabelas foram criadas`);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
    console.log('\nConexão fechada.');
  }
}

main();
