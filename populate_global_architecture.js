// Popular tabelas de arquitetura global com dados de countryConfig.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 POPULANDO ARQUITETURA GLOBAL\n");

// Dados de países (migrados de countryConfig.ts)
const countries = [
  {
    code: 'BR', name_en: 'Brazil', name_native: 'Brasil', flag_emoji: '🇧🇷',
    default_language: 'pt', default_locale: 'pt-BR', timezone_default: 'America/Sao_Paulo',
    measurement_system: 'metric', currency_code: 'BRL', currency_symbol: 'R$',
    nutritional_sources: ['TBCA', 'USDA'],
    ui_config: {
      searchPlaceholder: { text: 'Digite o alimento completo (ex: arroz integral cozido)', hint: 'Seja específico: "peito de frango grelhado" ao invés de "frango"' },
      portionExample: '100g'
    },
    is_active: true, sort_order: 1
  },
  {
    code: 'US', name_en: 'United States', name_native: 'United States', flag_emoji: '🇺🇸',
    default_language: 'en', default_locale: 'en-US', timezone_default: 'America/New_York',
    measurement_system: 'imperial', currency_code: 'USD', currency_symbol: '$',
    nutritional_sources: ['USDA', 'FDA'],
    ui_config: {
      searchPlaceholder: { text: 'Type the full food name (e.g., grilled chicken breast)', hint: 'Be specific: "brown rice cooked" instead of "rice"' },
      portionExample: '1 cup, 3 oz'
    },
    is_active: true, sort_order: 2
  },
  {
    code: 'PT', name_en: 'Portugal', name_native: 'Portugal', flag_emoji: '🇵🇹',
    default_language: 'pt', default_locale: 'pt-PT', timezone_default: 'Europe/Lisbon',
    measurement_system: 'metric', currency_code: 'EUR', currency_symbol: '€',
    nutritional_sources: ['INSA', 'CIQUAL', 'USDA'],
    ui_config: {
      searchPlaceholder: { text: 'Escreva o alimento completo (ex: arroz integral cozido)', hint: 'Seja específico: "peito de frango grelhado" em vez de "frango"' },
      portionExample: '100g'
    },
    is_active: true, sort_order: 3
  },
  {
    code: 'ES', name_en: 'Spain', name_native: 'España', flag_emoji: '🇪🇸',
    default_language: 'es', default_locale: 'es-ES', timezone_default: 'Europe/Madrid',
    measurement_system: 'metric', currency_code: 'EUR', currency_symbol: '€',
    nutritional_sources: ['BEDCA', 'USDA'],
    ui_config: {
      searchPlaceholder: { text: 'Escribe el alimento completo (ej: arroz integral cocido)', hint: 'Sé específico: "pechuga de pollo a la plancha" en lugar de "pollo"' },
      portionExample: '100g'
    },
    is_active: true, sort_order: 4
  },
  {
    code: 'MX', name_en: 'Mexico', name_native: 'México', flag_emoji: '🇲🇽',
    default_language: 'es', default_locale: 'es-MX', timezone_default: 'America/Mexico_City',
    measurement_system: 'metric', currency_code: 'MXN', currency_symbol: '$',
    nutritional_sources: ['USDA', 'SMAE'],
    ui_config: {
      searchPlaceholder: { text: 'Escribe el alimento completo (ej: arroz integral cocido)', hint: 'Sé específico: "pechuga de pollo asada" en lugar de "pollo"' },
      portionExample: '100g'
    },
    is_active: true, sort_order: 5
  }
];

// Termos de processamento (migrados de calculateRealMacros.ts)
const processingTerms = [
  // Português
  { term: 'grelhado', language: 'pt', category: 'cooking_method' },
  { term: 'grelhada', language: 'pt', category: 'cooking_method' },
  { term: 'cozido', language: 'pt', category: 'cooking_method' },
  { term: 'cozida', language: 'pt', category: 'cooking_method' },
  { term: 'frito', language: 'pt', category: 'cooking_method' },
  { term: 'frita', language: 'pt', category: 'cooking_method' },
  { term: 'assado', language: 'pt', category: 'cooking_method' },
  { term: 'assada', language: 'pt', category: 'cooking_method' },
  { term: 'refogado', language: 'pt', category: 'cooking_method' },
  { term: 'refogada', language: 'pt', category: 'cooking_method' },
  { term: 'cru', language: 'pt', category: 'state' },
  { term: 'crua', language: 'pt', category: 'state' },
  { term: 'natural', language: 'pt', category: 'modifier' },
  { term: 'integral', language: 'pt', category: 'modifier' },
  { term: 'desnatado', language: 'pt', category: 'modifier' },
  { term: 'desnatada', language: 'pt', category: 'modifier' },
  { term: 'light', language: 'pt', category: 'modifier' },
  { term: 'sem pele', language: 'pt', category: 'preparation' },
  { term: 'com pele', language: 'pt', category: 'preparation' },
  { term: 'picado', language: 'pt', category: 'preparation' },
  { term: 'picada', language: 'pt', category: 'preparation' },
  { term: 'ralado', language: 'pt', category: 'preparation' },
  { term: 'ralada', language: 'pt', category: 'preparation' },
  { term: 'em cubos', language: 'pt', category: 'preparation' },
  { term: 'em fatias', language: 'pt', category: 'preparation' },
  { term: 'em tiras', language: 'pt', category: 'preparation' },
  { term: 'temperado', language: 'pt', category: 'preparation' },
  { term: 'temperada', language: 'pt', category: 'preparation' },
  { term: 'sem acucar', language: 'pt', category: 'modifier' },
  { term: 'zero', language: 'pt', category: 'modifier' },
  { term: 'diet', language: 'pt', category: 'modifier' },
  
  // Inglês
  { term: 'grilled', language: 'en', category: 'cooking_method' },
  { term: 'baked', language: 'en', category: 'cooking_method' },
  { term: 'fried', language: 'en', category: 'cooking_method' },
  { term: 'boiled', language: 'en', category: 'cooking_method' },
  { term: 'steamed', language: 'en', category: 'cooking_method' },
  { term: 'raw', language: 'en', category: 'state' },
  { term: 'cooked', language: 'en', category: 'cooking_method' },
  { term: 'sugar free', language: 'en', category: 'modifier' },
  { term: 'unsweetened', language: 'en', category: 'modifier' },
  { term: 'plain', language: 'en', category: 'modifier' },
  { term: 'whole', language: 'en', category: 'modifier' },
  { term: 'skinless', language: 'en', category: 'preparation' },
  { term: 'boneless', language: 'en', category: 'preparation' },
  { term: 'diced', language: 'en', category: 'preparation' },
  { term: 'sliced', language: 'en', category: 'preparation' },
  { term: 'chopped', language: 'en', category: 'preparation' },
  { term: 'shredded', language: 'en', category: 'preparation' },
  
  // Espanhol
  { term: 'asado', language: 'es', category: 'cooking_method' },
  { term: 'frito', language: 'es', category: 'cooking_method' },
  { term: 'cocido', language: 'es', category: 'cooking_method' },
  { term: 'hervido', language: 'es', category: 'cooking_method' },
  { term: 'crudo', language: 'es', category: 'state' },
  { term: 'sin azucar', language: 'es', category: 'modifier' },
  { term: 'integral', language: 'es', category: 'modifier' },
  { term: 'natural', language: 'es', category: 'modifier' }
];

// Palavras-chave de categoria
const categoryKeywords = [
  // Carnes - PT
  { keyword: 'frango', language: 'pt', category: 'meat', weight: 10 },
  { keyword: 'peito', language: 'pt', category: 'meat', weight: 8 },
  { keyword: 'carne', language: 'pt', category: 'meat', weight: 10 },
  { keyword: 'boi', language: 'pt', category: 'meat', weight: 9 },
  { keyword: 'porco', language: 'pt', category: 'meat', weight: 9 },
  { keyword: 'peixe', language: 'pt', category: 'seafood', weight: 10 },
  
  // Carnes - EN
  { keyword: 'chicken', language: 'en', category: 'meat', weight: 10 },
  { keyword: 'breast', language: 'en', category: 'meat', weight: 8 },
  { keyword: 'beef', language: 'en', category: 'meat', weight: 10 },
  { keyword: 'pork', language: 'en', category: 'meat', weight: 9 },
  { keyword: 'fish', language: 'en', category: 'seafood', weight: 10 },
  { keyword: 'salmon', language: 'en', category: 'seafood', weight: 9 },
  { keyword: 'tuna', language: 'en', category: 'seafood', weight: 9 },
  
  // Carnes - ES
  { keyword: 'pollo', language: 'es', category: 'meat', weight: 10 },
  { keyword: 'pechuga', language: 'es', category: 'meat', weight: 8 },
  { keyword: 'carne', language: 'es', category: 'meat', weight: 10 },
  { keyword: 'res', language: 'es', category: 'meat', weight: 9 },
  { keyword: 'cerdo', language: 'es', category: 'meat', weight: 9 },
  { keyword: 'pescado', language: 'es', category: 'seafood', weight: 10 },
  
  // Grãos - PT
  { keyword: 'arroz', language: 'pt', category: 'grains', weight: 10 },
  { keyword: 'feijao', language: 'pt', category: 'legumes', weight: 10 },
  { keyword: 'pao', language: 'pt', category: 'grains', weight: 9 },
  { keyword: 'macarrao', language: 'pt', category: 'grains', weight: 9 },
  { keyword: 'aveia', language: 'pt', category: 'grains', weight: 8 },
  
  // Grãos - EN
  { keyword: 'rice', language: 'en', category: 'grains', weight: 10 },
  { keyword: 'beans', language: 'en', category: 'legumes', weight: 10 },
  { keyword: 'bread', language: 'en', category: 'grains', weight: 9 },
  { keyword: 'pasta', language: 'en', category: 'grains', weight: 9 },
  { keyword: 'oats', language: 'en', category: 'grains', weight: 8 },
  
  // Grãos - ES
  { keyword: 'arroz', language: 'es', category: 'grains', weight: 10 },
  { keyword: 'frijoles', language: 'es', category: 'legumes', weight: 10 },
  { keyword: 'pan', language: 'es', category: 'grains', weight: 9 },
  { keyword: 'pasta', language: 'es', category: 'grains', weight: 9 },
  { keyword: 'avena', language: 'es', category: 'grains', weight: 8 },
  
  // Vegetais - PT
  { keyword: 'batata', language: 'pt', category: 'vegetables', weight: 9 },
  { keyword: 'tomate', language: 'pt', category: 'vegetables', weight: 8 },
  { keyword: 'cebola', language: 'pt', category: 'vegetables', weight: 7 },
  { keyword: 'alface', language: 'pt', category: 'vegetables', weight: 7 },
  
  // Vegetais - EN
  { keyword: 'potato', language: 'en', category: 'vegetables', weight: 9 },
  { keyword: 'tomato', language: 'en', category: 'vegetables', weight: 8 },
  { keyword: 'onion', language: 'en', category: 'vegetables', weight: 7 },
  { keyword: 'lettuce', language: 'en', category: 'vegetables', weight: 7 },
  
  // Laticínios - PT
  { keyword: 'leite', language: 'pt', category: 'dairy', weight: 10 },
  { keyword: 'queijo', language: 'pt', category: 'dairy', weight: 9 },
  { keyword: 'iogurte', language: 'pt', category: 'dairy', weight: 9 },
  
  // Laticínios - EN
  { keyword: 'milk', language: 'en', category: 'dairy', weight: 10 },
  { keyword: 'cheese', language: 'en', category: 'dairy', weight: 9 },
  { keyword: 'yogurt', language: 'en', category: 'dairy', weight: 9 }
];

async function populateCountries() {
  console.log("📍 Populando tabela countries...\n");
  
  for (const country of countries) {
    const { data: existing } = await supabase
      .from('countries')
      .select('id')
      .eq('code', country.code)
      .maybeSingle();
    
    if (existing) {
      console.log(`   ⚠️  ${country.code} já existe, pulando...`);
      continue;
    }
    
    const { error } = await supabase
      .from('countries')
      .insert(country);
    
    if (error) {
      console.error(`   ❌ Erro ao inserir ${country.code}: ${error.message}`);
    } else {
      console.log(`   ✅ ${country.code} - ${country.name_native}`);
    }
  }
}

async function populateProcessingTerms() {
  console.log("\n📝 Populando food_processing_terms...\n");
  
  let inserted = 0;
  for (const term of processingTerms) {
    const { data: existing } = await supabase
      .from('food_processing_terms')
      .select('id')
      .eq('term', term.term)
      .eq('language', term.language)
      .maybeSingle();
    
    if (existing) continue;
    
    const { error } = await supabase
      .from('food_processing_terms')
      .insert(term);
    
    if (!error) inserted++;
  }
  
  console.log(`   ✅ Inseridos ${inserted} termos de processamento`);
}

async function populateCategoryKeywords() {
  console.log("\n🏷️  Populando food_category_keywords...\n");
  
  let inserted = 0;
  for (const keyword of categoryKeywords) {
    const { data: existing } = await supabase
      .from('food_category_keywords')
      .select('id')
      .eq('keyword', keyword.keyword)
      .eq('language', keyword.language)
      .eq('category', keyword.category)
      .maybeSingle();
    
    if (existing) continue;
    
    const { error } = await supabase
      .from('food_category_keywords')
      .insert(keyword);
    
    if (!error) inserted++;
  }
  
  console.log(`   ✅ Inseridos ${inserted} keywords de categoria`);
}

async function main() {
  await populateCountries();
  await populateProcessingTerms();
  await populateCategoryKeywords();
  
  console.log("\n" + "═".repeat(60));
  console.log("✅ POPULAÇÃO DE DADOS CONCLUÍDA!");
  console.log("═".repeat(60));
  console.log("\n📊 Próximo passo:");
  console.log("   Execute o SQL em add_country_columns_to_foods.sql");
  console.log("   no Supabase SQL Editor para adicionar as colunas à tabela foods");
}

main().catch(console.error);
