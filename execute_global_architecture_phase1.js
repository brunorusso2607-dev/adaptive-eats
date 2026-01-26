// Executar migration de arquitetura global diretamente
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 EXECUTANDO GLOBAL ARCHITECTURE - PHASE 1\n");

async function executeSQL(sql, description) {
  console.log(`📝 ${description}...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error(`❌ Erro: ${error.message}`);
    return false;
  }
  
  console.log(`✅ Sucesso\n`);
  return true;
}

async function main() {
  // 1. Criar tabela food_processing_terms
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.food_processing_terms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        term text NOT NULL,
        language text NOT NULL,
        category text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_processing_terms_lang ON public.food_processing_terms(language);
    CREATE INDEX IF NOT EXISTS idx_processing_terms_lookup ON public.food_processing_terms(language, term);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_processing_terms_unique ON public.food_processing_terms(term, language);
  `, 'Criando tabela food_processing_terms');

  // 2. Criar tabela food_category_keywords
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.food_category_keywords (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword text NOT NULL,
        language text NOT NULL,
        category text NOT NULL,
        weight integer DEFAULT 1,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_category_keywords_lang ON public.food_category_keywords(language);
    CREATE INDEX IF NOT EXISTS idx_category_keywords_lookup ON public.food_category_keywords(language, keyword);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_category_keywords_unique ON public.food_category_keywords(keyword, language, category);
  `, 'Criando tabela food_category_keywords');

  // 3. Criar tabela countries
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.countries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text UNIQUE NOT NULL,
        name_en text NOT NULL,
        name_native text NOT NULL,
        flag_emoji text NOT NULL,
        default_language text NOT NULL,
        default_locale text NOT NULL,
        timezone_default text NOT NULL,
        measurement_system text DEFAULT 'metric',
        currency_code text,
        currency_symbol text,
        nutritional_sources text[] DEFAULT '{}',
        ui_config jsonb DEFAULT '{}'::jsonb,
        is_active boolean DEFAULT true NOT NULL,
        sort_order integer DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_countries_active ON public.countries(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
  `, 'Criando tabela countries');

  // 4. Adicionar colunas à tabela foods
  await executeSQL(`
    ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS country_code text;
    ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS language text;
    
    CREATE INDEX IF NOT EXISTS idx_foods_country ON public.foods(country_code);
    CREATE INDEX IF NOT EXISTS idx_foods_language ON public.foods(language);
  `, 'Adicionando country_code e language à tabela foods');

  // 5. Popular dados existentes
  await executeSQL(`
    UPDATE public.foods SET country_code = 'BR', language = 'pt' WHERE source = 'TBCA' AND country_code IS NULL;
    UPDATE public.foods SET country_code = 'BR', language = 'pt' WHERE source = 'taco' AND country_code IS NULL;
    UPDATE public.foods SET country_code = 'US', language = 'en' WHERE source = 'usda' AND country_code IS NULL;
    UPDATE public.foods SET country_code = 'MX', language = 'es' WHERE source = 'BAM' AND country_code IS NULL;
  `, 'Populando country_code e language em foods existentes');

  // 6. RLS Policies
  await executeSQL(`
    ALTER TABLE public.food_processing_terms ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access for all" ON public.food_processing_terms;
    CREATE POLICY "Allow read access for all" ON public.food_processing_terms FOR SELECT USING (true);
    
    ALTER TABLE public.food_category_keywords ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access for all" ON public.food_category_keywords;
    CREATE POLICY "Allow read access for all" ON public.food_category_keywords FOR SELECT USING (true);
    
    ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access for all" ON public.countries;
    CREATE POLICY "Allow read access for all" ON public.countries FOR SELECT USING (true);
  `, 'Configurando RLS policies');

  console.log("═".repeat(60));
  console.log("✅ PHASE 1 CONCLUÍDA COM SUCESSO!");
  console.log("═".repeat(60));
  console.log("\nTabelas criadas:");
  console.log("  ✅ food_processing_terms");
  console.log("  ✅ food_category_keywords");
  console.log("  ✅ countries");
  console.log("\nColunas adicionadas:");
  console.log("  ✅ foods.country_code");
  console.log("  ✅ foods.language");
  console.log("\nPróximo passo: Popular as tabelas com dados");
}

main().catch(console.error);
