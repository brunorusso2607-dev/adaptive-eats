// Script de população emergencial - Criar dados básicos para sistema funcionar
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzA3NjUsImV4cCI6MjA1MTUwNjc2NX0.Oe8wYqJPZvHqxqKlNdGVXjLhqLGvKhLqELqLGvKhLqE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🚨 POPULAÇÃO EMERGENCIAL - CRIANDO DADOS BÁSICOS\n");

async function emergencyPopulation() {
  try {
    // 1. ONBOARDING_OPTIONS - Criar opções básicas
    console.log("📊 1. Criando onboarding_options...");
    
    const onboardingOptions = [
      // Intolerâncias
      { category: 'intolerances', option_id: 'lactose', label: 'Lactose', emoji: '🥛', icon_name: 'milk', is_active: true, sort_order: 1 },
      { category: 'intolerances', option_id: 'gluten', label: 'Glúten', emoji: '🌾', icon_name: 'wheat', is_active: true, sort_order: 2 },
      { category: 'intolerances', option_id: 'fodmap', label: 'FODMAP', emoji: '🫘', icon_name: 'bean', is_active: true, sort_order: 3 },
      { category: 'intolerances', option_id: 'fructose', label: 'Frutose', emoji: '🍯', icon_name: 'honey', is_active: true, sort_order: 4 },
      { category: 'intolerances', option_id: 'histamine', label: 'Histamina', emoji: '🧪', icon_name: 'flask', is_active: true, sort_order: 5 },
      { category: 'intolerances', option_id: 'eggs', label: 'Ovos', emoji: '🥚', icon_name: 'egg', is_active: true, sort_order: 6 },
      { category: 'intolerances', option_id: 'none', label: 'Nenhuma', emoji: '✅', icon_name: 'check', is_active: true, sort_order: 99 },
      
      // Alergias
      { category: 'allergies', option_id: 'peanut', label: 'Amendoim', emoji: '🥜', icon_name: 'nut', is_active: true, sort_order: 1 },
      { category: 'allergies', option_id: 'nuts', label: 'Oleaginosas', emoji: '🌰', icon_name: 'acorn', is_active: true, sort_order: 2 },
      { category: 'allergies', option_id: 'seafood', label: 'Frutos do Mar', emoji: '🦐', icon_name: 'fish', is_active: true, sort_order: 3 },
      { category: 'allergies', option_id: 'fish', label: 'Peixe', emoji: '🐟', icon_name: 'fish', is_active: true, sort_order: 4 },
      { category: 'allergies', option_id: 'eggs', label: 'Ovos', emoji: '🥚', icon_name: 'egg', is_active: true, sort_order: 5 },
      { category: 'allergies', option_id: 'soy', label: 'Soja', emoji: '🫘', icon_name: 'bean', is_active: true, sort_order: 6 },
      
      // Sensibilidades
      { category: 'sensitivities', option_id: 'caffeine', label: 'Cafeína', emoji: '☕', icon_name: 'coffee', is_active: true, sort_order: 1 },
      { category: 'sensitivities', option_id: 'histamine', label: 'Histamina', emoji: '🧪', icon_name: 'flask', is_active: true, sort_order: 2 },
      { category: 'sensitivities', option_id: 'nickel', label: 'Níquel', emoji: '🔧', icon_name: 'wrench', is_active: true, sort_order: 3 },
      { category: 'sensitivities', option_id: 'salicylate', label: 'Salicilato', emoji: '💊', icon_name: 'pill', is_active: true, sort_order: 4 },
      
      // Preferências Dietéticas
      { category: 'dietary_preferences', option_id: 'omnivore', label: 'Comum', emoji: '🍽️', icon_name: 'utensils', is_active: true, sort_order: 1 },
      { category: 'dietary_preferences', option_id: 'vegetarian', label: 'Vegetariana', emoji: '🥗', icon_name: 'salad', is_active: true, sort_order: 2 },
      { category: 'dietary_preferences', option_id: 'vegan', label: 'Vegana', emoji: '🌱', icon_name: 'leaf', is_active: true, sort_order: 3 },
      { category: 'dietary_preferences', option_id: 'low_carb', label: 'Low Carb', emoji: '🥩', icon_name: 'beef', is_active: true, sort_order: 4 },
      { category: 'dietary_preferences', option_id: 'pescatarian', label: 'Pescetariana', emoji: '🐟', icon_name: 'fish', is_active: true, sort_order: 5 },
      
      // Objetivos
      { category: 'goals', option_id: 'lose_weight', label: 'Emagrecer', emoji: '⬇️', icon_name: 'trending-down', is_active: true, sort_order: 1 },
      { category: 'goals', option_id: 'maintain', label: 'Manter peso', emoji: '⚖️', icon_name: 'scale', is_active: true, sort_order: 2 },
      { category: 'goals', option_id: 'gain_weight', label: 'Ganhar peso', emoji: '⬆️', icon_name: 'trending-up', is_active: true, sort_order: 3 },
    ];

    const { error: optionsError } = await supabase
      .from('onboarding_options')
      .insert(onboardingOptions);

    if (optionsError) {
      console.error('❌ Erro ao inserir onboarding_options:', optionsError);
    } else {
      console.log(`✅ ${onboardingOptions.length} opções de onboarding criadas`);
    }

    // 2. INTOLERANCE_MAPPINGS - Criar mapeamentos básicos
    console.log("\n📊 2. Criando intolerance_mappings...");
    
    const intoleranceMappings = [
      // Glúten - High Risk
      { intolerance_key: 'gluten', ingredient: 'trigo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'farinha de trigo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'pão', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'macarrão', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'pizza', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'cevada', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'centeio', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'cerveja', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'wheat', language: 'en', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'bread', language: 'en', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'pasta', language: 'en', severity_level: 'high' },
      { intolerance_key: 'gluten', ingredient: 'beer', language: 'en', severity_level: 'high' },
      
      // Lactose - High Risk
      { intolerance_key: 'lactose', ingredient: 'leite', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'queijo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'iogurte', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'manteiga', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'creme de leite', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'sorvete', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'milk', language: 'en', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'cheese', language: 'en', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'yogurt', language: 'en', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'butter', language: 'en', severity_level: 'high' },
      { intolerance_key: 'lactose', ingredient: 'ice cream', language: 'en', severity_level: 'high' },
      
      // FODMAP - High Risk
      { intolerance_key: 'fodmap', ingredient: 'cebola', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'alho', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'trigo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'mel', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'maçã', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'peru', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'onion', language: 'en', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'garlic', language: 'en', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'honey', language: 'en', severity_level: 'high' },
      { intolerance_key: 'fodmap', ingredient: 'apple', language: 'en', severity_level: 'high' },
      
      // Frutose - Low Risk (atenção)
      { intolerance_key: 'fructose', ingredient: 'frutose', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'fructose', ingredient: 'xarope de milho', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'fructose', ingredient: 'mel', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'fructose', ingredient: 'fructose', language: 'en', severity_level: 'low' },
      { intolerance_key: 'fructose', ingredient: 'corn syrup', language: 'en', severity_level: 'low' },
      { intolerance_key: 'fructose', ingredient: 'honey', language: 'en', severity_level: 'low' },
      
      // Histamina - Low Risk (atenção)
      { intolerance_key: 'histamine', ingredient: 'queijo curado', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'salame', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'vinho tinto', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'chocolate', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'aged cheese', language: 'en', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'salami', language: 'en', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'red wine', language: 'en', severity_level: 'low' },
      { intolerance_key: 'histamine', ingredient: 'chocolate', language: 'en', severity_level: 'low' },
      
      // Ovos - High Risk
      { intolerance_key: 'eggs', ingredient: 'ovo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'clara de ovo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'gema de ovo', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'maionese', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'egg', language: 'en', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'egg white', language: 'en', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'egg yolk', language: 'en', severity_level: 'high' },
      { intolerance_key: 'eggs', ingredient: 'mayonnaise', language: 'en', severity_level: 'high' },
      
      // Amendoim - High Risk
      { intolerance_key: 'peanut', ingredient: 'amendoim', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'peanut', ingredient: 'manteiga de amendoim', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'peanut', ingredient: 'peanut', language: 'en', severity_level: 'high' },
      { intolerance_key: 'peanut', ingredient: 'peanut butter', language: 'en', severity_level: 'high' },
      
      // Oleaginosas - High Risk
      { intolerance_key: 'nuts', ingredient: 'castanha', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'nuts', ingredient: 'noz', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'nuts', ingredient: 'amêndoa', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'nuts', ingredient: 'nut', language: 'en', severity_level: 'high' },
      { intolerance_key: 'nuts', ingredient: 'walnut', language: 'en', severity_level: 'high' },
      { intolerance_key: 'nuts', ingredient: 'almond', language: 'en', severity_level: 'high' },
      
      // Frutos do Mar - High Risk
      { intolerance_key: 'seafood', ingredient: 'camarão', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'seafood', ingredient: 'lagosta', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'seafood', ingredient: 'siri', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'seafood', ingredient: 'shrimp', language: 'en', severity_level: 'high' },
      { intolerance_key: 'seafood', ingredient: 'lobster', language: 'en', severity_level: 'high' },
      { intolerance_key: 'seafood', ingredient: 'crab', language: 'en', severity_level: 'high' },
      
      // Peixe - High Risk
      { intolerance_key: 'fish', ingredient: 'salmão', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fish', ingredient: 'tilápia', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fish', ingredient: 'bacalhau', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'fish', ingredient: 'salmon', language: 'en', severity_level: 'high' },
      { intolerance_key: 'fish', ingredient: 'tilapia', language: 'en', severity_level: 'high' },
      { intolerance_key: 'fish', ingredient: 'cod', language: 'en', severity_level: 'high' },
      
      // Soja - High Risk
      { intolerance_key: 'soy', ingredient: 'soja', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'soy', ingredient: 'tofu', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'soy', ingredient: 'molho de soja', language: 'pt', severity_level: 'high' },
      { intolerance_key: 'soy', ingredient: 'soy', language: 'en', severity_level: 'high' },
      { intolerance_key: 'soy', ingredient: 'tofu', language: 'en', severity_level: 'high' },
      { intolerance_key: 'soy', ingredient: 'soy sauce', language: 'en', severity_level: 'high' },
      
      // Cafeína - Low Risk (atenção)
      { intolerance_key: 'caffeine', ingredient: 'café', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'caffeine', ingredient: 'chá', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'caffeine', ingredient: 'energético', language: 'pt', severity_level: 'low' },
      { intolerance_key: 'caffeine', ingredient: 'coffee', language: 'en', severity_level: 'low' },
      { intolerance_key: 'caffeine', ingredient: 'tea', language: 'en', severity_level: 'low' },
      { intolerance_key: 'caffeine', ingredient: 'energy drink', language: 'en', severity_level: 'low' },
    ];

    // Inserir em lotes para evitar timeout
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < intoleranceMappings.length; i += batchSize) {
      const batch = intoleranceMappings.slice(i, i + batchSize);
      
      const { error: mappingsError } = await supabase
        .from('intolerance_mappings')
        .insert(batch);
      
      if (mappingsError) {
        console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, mappingsError.message);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${batch.length} mapeamentos inseridos`);
      }
    }
    
    console.log(`✅ Total de ${insertedCount} mapeamentos de intolerância criados`);

    // 3. INTOLERANCE_SAFE_KEYWORDS - Criar neutralizadores
    console.log("\n📊 3. Criando intolerance_safe_keywords...");
    
    const safeKeywords = [
      // Glúten
      { intolerance_key: 'gluten', keyword: 'sem glúten' },
      { intolerance_key: 'gluten', keyword: 'gluten-free' },
      { intolerance_key: 'gluten', keyword: 'sem trigo' },
      { intolerance_key: 'gluten', keyword: 'wheat-free' },
      { intolerance_key: 'gluten', keyword: 'arroz' },
      { intolerance_key: 'gluten', keyword: 'milho' },
      { intolerance_key: 'gluten', keyword: 'quinoa' },
      { intolerance_key: 'gluten', keyword: 'tapioca' },
      
      // Lactose
      { intolerance_key: 'lactose', keyword: 'sem lactose' },
      { intolerance_key: 'lactose', keyword: 'lactose-free' },
      { intolerance_key: 'lactose', keyword: 'zero lactose' },
      { intolerance_key: 'lactose', keyword: 'leite vegetal' },
      { intolerance_key: 'lactose', keyword: 'leite de amêndoas' },
      { intolerance_key: 'lactose', keyword: 'leite de coco' },
      { intolerance_key: 'lactose', keyword: 'almond milk' },
      { intolerance_key: 'lactose', keyword: 'coconut milk' },
      
      // FODMAP
      { intolerance_key: 'fodmap', keyword: 'baixo fodmap' },
      { intolerance_key: 'fodmap', keyword: 'low fodmap' },
      { intolerance_key: 'fodmap', keyword: 'fodmap free' },
      { intolerance_key: 'fodmap', keyword: 'arroz' },
      { intolerance_key: 'fodmap', keyword: 'batata doce' },
      { intolerance_key: 'fodmap', keyword: 'cenoura' },
      { intolerance_key: 'fodmap', keyword: 'sweet potato' },
      
      // Ovos
      { intolerance_key: 'eggs', keyword: 'sem ovos' },
      { intolerance_key: 'eggs', keyword: 'egg-free' },
      { intolerance_key: 'eggs', keyword: 'ovo vegetal' },
      { intolerance_key: 'eggs', keyword: 'aquafaba' },
      
      // Vegetariana/Vegana
      { intolerance_key: 'vegetarian', keyword: 'sem carne' },
      { intolerance_key: 'vegetarian', keyword: 'meat-free' },
      { intolerance_key: 'vegan', keyword: 'sem produtos de origem animal' },
      { intolerance_key: 'vegan', keyword: 'plant-based' },
      { intolerance_key: 'vegan', keyword: 'vegan' },
    ];

    const { error: keywordsError } = await supabase
      .from('intolerance_safe_keywords')
      .insert(safeKeywords);

    if (keywordsError) {
      console.error('❌ Erro ao inserir safe_keywords:', keywordsError);
    } else {
      console.log(`✅ ${safeKeywords.length} keywords seguros criados`);
    }

    // 4. DIETARY_FORBIDDEN_INGREDIENTS - Criar restrições dietéticas
    console.log("\n📊 4. Criando dietary_forbidden_ingredients...");
    
    const dietaryForbidden = [
      // Vegetariana
      { dietary_key: 'vegetarian', ingredient: 'carne bovina', language: 'pt', category: 'meat' },
      { dietary_key: 'vegetarian', ingredient: 'carne de porco', language: 'pt', category: 'meat' },
      { dietary_key: 'vegetarian', ingredient: 'frango', language: 'pt', category: 'meat' },
      { dietary_key: 'vegetarian', ingredient: 'peixe', language: 'pt', category: 'fish' },
      { dietary_key: 'vegetarian', ingredient: 'camarão', language: 'pt', category: 'seafood' },
      { dietary_key: 'vegetarian', ingredient: 'beef', language: 'en', category: 'meat' },
      { dietary_key: 'vegetarian', ingredient: 'pork', language: 'en', category: 'meat' },
      { dietary_key: 'vegetarian', ingredient: 'chicken', language: 'en', category: 'meat' },
      { dietary_key: 'vegetarian', ingredient: 'fish', language: 'en', category: 'fish' },
      { dietary_key: 'vegetarian', ingredient: 'shrimp', language: 'en', category: 'seafood' },
      
      // Vegana
      { dietary_key: 'vegan', ingredient: 'carne', language: 'pt', category: 'meat' },
      { dietary_key: 'vegan', ingredient: 'leite', language: 'pt', category: 'dairy' },
      { dietary_key: 'vegan', ingredient: 'ovo', language: 'pt', category: 'eggs' },
      { dietary_key: 'vegan', ingredient: 'mel', language: 'pt', category: 'honey' },
      { dietary_key: 'vegan', ingredient: 'queijo', language: 'pt', category: 'dairy' },
      { dietary_key: 'vegan', ingredient: 'manteiga', language: 'pt', category: 'dairy' },
      { dietary_key: 'vegan', ingredient: 'meat', language: 'en', category: 'meat' },
      { dietary_key: 'vegan', ingredient: 'milk', language: 'en', category: 'dairy' },
      { dietary_key: 'vegan', ingredient: 'egg', language: 'en', category: 'eggs' },
      { dietary_key: 'vegan', ingredient: 'honey', language: 'en', category: 'honey' },
      { dietary_key: 'vegan', ingredient: 'cheese', language: 'en', category: 'dairy' },
      { dietary_key: 'vegan', ingredient: 'butter', language: 'en', category: 'dairy' },
      
      // Low Carb
      { dietary_key: 'low_carb', ingredient: 'arroz', language: 'pt', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'macarrão', language: 'pt', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'pão', language: 'pt', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'batata', language: 'pt', category: 'vegetables' },
      { dietary_key: 'low_carb', ingredient: 'milho', language: 'pt', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'rice', language: 'en', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'pasta', language: 'en', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'bread', language: 'en', category: 'grains' },
      { dietary_key: 'low_carb', ingredient: 'potato', language: 'en', category: 'vegetables' },
      { dietary_key: 'low_carb', ingredient: 'corn', language: 'en', category: 'grains' },
      
      // Pescetariana
      { dietary_key: 'pescatarian', ingredient: 'carne bovina', language: 'pt', category: 'meat' },
      { dietary_key: 'pescatarian', ingredient: 'carne de porco', language: 'pt', category: 'meat' },
      { dietary_key: 'pescatarian', ingredient: 'frango', language: 'pt', category: 'meat' },
      { dietary_key: 'pescatarian', ingredient: 'beef', language: 'en', category: 'meat' },
      { dietary_key: 'pescatarian', ingredient: 'pork', language: 'en', category: 'meat' },
      { dietary_key: 'pescatarian', ingredient: 'chicken', language: 'en', category: 'meat' },
    ];

    const { error: dietaryError } = await supabase
      .from('dietary_forbidden_ingredients')
      .insert(dietaryForbidden);

    if (dietaryError) {
      console.error('❌ Erro ao inserir dietary_forbidden:', dietaryError);
    } else {
      console.log(`✅ ${dietaryForbidden.length} ingredientes dietéticos criados`);
    }

    console.log("\n🎉 POPULAÇÃO EMERGENCIAL CONCLUÍDA!");
    console.log("📊 RESUMO:");
    console.log(`  - ${onboardingOptions.length} opções de onboarding`);
    console.log(`  - ${intoleranceMappings.length} mapeamentos de intolerância`);
    console.log(`  - ${safeKeywords.length} keywords seguros`);
    console.log(`  - ${dietaryForbidden.length} restrições dietéticas`);
    console.log("\n✅ Sistema básico funcional! Onboarding e validação devem funcionar.");

  } catch (error) {
    console.error('❌ Erro na população emergencial:', error);
  }
}

emergencyPopulation();
