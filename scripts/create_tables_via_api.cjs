// Script para criar tabelas via Supabase client com service role
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// ============================================
// DADOS DE FALLBACK HIERARCHY
// ============================================
const FALLBACK_HIERARCHY = [
  { country_code: 'BR', fallback_chain: [], notes: 'Brasil - País base, não precisa de fallback' },
  { country_code: 'US', fallback_chain: ['BR'], notes: 'Estados Unidos - Fallback para Brasil' },
  { country_code: 'PT', fallback_chain: ['BR'], notes: 'Portugal - Fallback para Brasil (idioma similar)' },
  { country_code: 'GB', fallback_chain: ['US', 'BR'], notes: 'Reino Unido - Fallback para EUA depois Brasil' },
  { country_code: 'ES', fallback_chain: ['PT', 'MX', 'BR'], notes: 'Espanha - Fallback para Portugal, México, Brasil' },
  { country_code: 'MX', fallback_chain: ['ES', 'BR'], notes: 'México - Fallback para Espanha, Brasil' },
  { country_code: 'AR', fallback_chain: ['ES', 'MX', 'BR'], notes: 'Argentina - Fallback para Espanha, México, Brasil' },
  { country_code: 'CL', fallback_chain: ['AR', 'ES', 'BR'], notes: 'Chile - Fallback para Argentina, Espanha, Brasil' },
  { country_code: 'PE', fallback_chain: ['MX', 'AR', 'BR'], notes: 'Peru - Fallback para México, Argentina, Brasil' },
];

// ============================================
// REGRAS CULTURAIS POR PAÍS E TIPO DE REFEIÇÃO
// ============================================
const CULTURAL_RULES = [
  // ============= BRASIL =============
  {
    country_code: 'BR',
    meal_type: 'cafe_manha',
    required_components: ['carbs', 'proteins'],
    forbidden_components: ['legumes'],
    typical_beverages: ['café', 'café com leite', 'suco natural', 'água de coco'],
    forbidden_beverages: ['refrigerante', 'cerveja', 'vinho'],
    structure_description: 'Pão/Tapioca + Proteína + Bebida quente',
    examples: [
      'Pão francês + ovo mexido + café com leite',
      'Tapioca + queijo branco + café puro',
      'Aveia + banana + leite',
      'Pão integral + ovo cozido + suco de laranja',
      'Cuscuz + ovo frito + café com leite'
    ],
    negative_examples: [
      '❌ Arroz + Feijão + Café (isso é ALMOÇO, não café da manhã)',
      '❌ Macarrão com molho + Suco (não é café da manhã brasileiro)',
      '❌ Bife grelhado + Salada (isso é JANTAR, não café)'
    ],
    macro_focus: { carb: 'alto', protein: 'médio', fat: 'moderado' },
    max_prep_time: '10 minutos'
  },
  {
    country_code: 'BR',
    meal_type: 'lanche_manha',
    required_components: ['fruits'],
    forbidden_components: ['legumes', 'carbs'],
    typical_beverages: ['água', 'suco natural'],
    forbidden_beverages: ['refrigerante', 'café'],
    structure_description: '1 fruta + proteína leve opcional',
    examples: ['Maçã + castanhas', 'Banana + iogurte natural', 'Mamão + chia', 'Mix de frutas', 'Laranja'],
    negative_examples: ['❌ Pão + Queijo (muito pesado)', '❌ Arroz + Feijão (isso é ALMOÇO)'],
    macro_focus: { carb: 'moderado', protein: 'baixo', fat: 'baixo' },
    max_prep_time: '5 minutos'
  },
  {
    country_code: 'BR',
    meal_type: 'almoco',
    required_components: ['carbs', 'proteins', 'vegetables', 'legumes'],
    forbidden_components: [],
    typical_beverages: ['água', 'suco natural'],
    forbidden_beverages: ['café', 'leite', 'refrigerante'],
    structure_description: 'Arroz + Feijão + Proteína + Salada/Legumes',
    examples: [
      'Arroz branco + feijão carioca + frango grelhado + salada verde',
      'Arroz integral + feijão preto + bife grelhado + legumes refogados',
      'Arroz + feijão + peixe grelhado + brócolis',
      'Arroz + feijão + ovo frito + couve refogada'
    ],
    negative_examples: [
      '❌ Pão francês + Ovo + Café (isso é CAFÉ DA MANHÃ)',
      '❌ Só frango + salada (FALTA arroz + feijão)',
      '❌ Tapioca + queijo (isso é CAFÉ DA MANHÃ)'
    ],
    macro_focus: { carb: 'alto', protein: 'alto', fat: 'moderado' },
    max_prep_time: '30 minutos'
  },
  {
    country_code: 'BR',
    meal_type: 'lanche_tarde',
    required_components: ['carbs'],
    forbidden_components: ['legumes'],
    typical_beverages: ['café', 'suco natural', 'chá'],
    forbidden_beverages: ['refrigerante'],
    structure_description: 'Similar ao café da manhã, pode ser mais leve',
    examples: ['Pão integral + queijo branco', 'Tapioca + manteiga', 'Iogurte + granola', 'Vitamina de banana'],
    negative_examples: ['❌ Arroz + Feijão + Carne (isso é ALMOÇO/JANTAR)'],
    macro_focus: { carb: 'moderado', protein: 'moderado', fat: 'baixo' },
    max_prep_time: '10 minutos'
  },
  {
    country_code: 'BR',
    meal_type: 'jantar',
    required_components: ['proteins', 'vegetables'],
    forbidden_components: [],
    typical_beverages: ['água', 'suco natural'],
    forbidden_beverages: ['café', 'refrigerante'],
    structure_description: 'Proteína + Vegetais, carboidrato reduzido',
    examples: [
      'Frango grelhado + salada verde',
      'Omelete simples + legumes refogados',
      'Peixe grelhado + brócolis',
      'Sopa de legumes com frango'
    ],
    negative_examples: [
      '❌ Pão + Café + Fruta (isso é CAFÉ DA MANHÃ)',
      '❌ Só iogurte + granola (muito leve para jantar)'
    ],
    macro_focus: { carb: 'baixo', protein: 'alto', fat: 'moderado' },
    max_prep_time: '20 minutos'
  },
  {
    country_code: 'BR',
    meal_type: 'ceia',
    required_components: ['dairy'],
    forbidden_components: ['carbs', 'legumes'],
    typical_beverages: ['leite', 'chá'],
    forbidden_beverages: ['café', 'refrigerante'],
    structure_description: 'Proteína leve para saciedade',
    examples: ['Iogurte natural', 'Leite + banana', 'Queijo branco + mamão', 'Leite morno'],
    negative_examples: ['❌ Pão + Ovo (muito pesado)', '❌ Café (atrapalha sono)'],
    macro_focus: { carb: 'baixo', protein: 'médio', fat: 'baixo' },
    max_prep_time: '5 minutos'
  },

  // ============= ESTADOS UNIDOS =============
  {
    country_code: 'US',
    meal_type: 'cafe_manha',
    required_components: ['proteins'],
    forbidden_components: ['legumes'],
    typical_beverages: ['coffee', 'orange juice', 'milk'],
    forbidden_beverages: ['soda', 'beer'],
    structure_description: 'Protein + Bread/Grain + Fruit/Beverage',
    examples: ['Scrambled eggs + whole wheat toast + orange juice', 'Oatmeal + banana + coffee', 'Greek yogurt + granola + berries'],
    negative_examples: ['❌ Rice + Beans (THIS IS LUNCH/DINNER)', '❌ Pasta with sauce (NOT BREAKFAST)'],
    macro_focus: { carb: 'alto', protein: 'alto', fat: 'moderado' },
    max_prep_time: '15 minutes'
  },
  {
    country_code: 'US',
    meal_type: 'almoco',
    required_components: ['proteins', 'carbs'],
    forbidden_components: [],
    typical_beverages: ['water', 'iced tea', 'lemonade'],
    forbidden_beverages: ['beer', 'wine'],
    structure_description: 'Sandwich/Salad/Wrap + Side',
    examples: ['Turkey sandwich + apple slices', 'Caesar salad with grilled chicken', 'Chicken wrap + carrot sticks'],
    negative_examples: ['❌ Eggs + Toast (THIS IS BREAKFAST)', '❌ Cereal + Milk (THIS IS BREAKFAST)'],
    macro_focus: { carb: 'moderado', protein: 'alto', fat: 'moderado' },
    max_prep_time: '20 minutes'
  },
  {
    country_code: 'US',
    meal_type: 'jantar',
    required_components: ['proteins', 'vegetables', 'carbs'],
    forbidden_components: [],
    typical_beverages: ['water', 'wine', 'sparkling water'],
    forbidden_beverages: ['coffee'],
    structure_description: 'Protein + Starch + Vegetable',
    examples: ['Grilled salmon + sweet potato + broccoli', 'Chicken breast + mashed potatoes + green beans', 'Steak + baked potato + asparagus'],
    negative_examples: ['❌ Eggs + Toast (THIS IS BREAKFAST)', '❌ Sandwich (THIS IS LUNCH)'],
    macro_focus: { carb: 'moderado', protein: 'alto', fat: 'moderado' },
    max_prep_time: '30 minutes'
  },

  // ============= PORTUGAL =============
  {
    country_code: 'PT',
    meal_type: 'cafe_manha',
    required_components: ['carbs'],
    forbidden_components: ['legumes', 'proteins'],
    typical_beverages: ['café', 'café com leite', 'sumo de laranja'],
    forbidden_beverages: ['refrigerante', 'cerveja'],
    structure_description: 'Pão/Torrada + Bebida quente + Fruta/Sumo',
    examples: ['Torrada com manteiga + café com leite', 'Pão com queijo + café', 'Cereais com leite + café'],
    negative_examples: ['❌ Arroz + Peixe (isso é ALMOÇO)', '❌ Bacalhau (isso é ALMOÇO/JANTAR)'],
    macro_focus: { carb: 'alto', protein: 'baixo', fat: 'moderado' },
    max_prep_time: '10 minutos'
  },
  {
    country_code: 'PT',
    meal_type: 'almoco',
    required_components: ['proteins', 'carbs', 'vegetables'],
    forbidden_components: [],
    typical_beverages: ['água', 'vinho', 'sumo'],
    forbidden_beverages: ['café', 'leite'],
    structure_description: 'Sopa + Proteína + Arroz/Batata + Legumes',
    examples: ['Caldo verde + Bacalhau com batatas', 'Sopa de legumes + Frango assado com arroz', 'Peixe grelhado com batatas'],
    negative_examples: ['❌ Só sopa (incompleto)', '❌ Pão + Café (isso é PEQUENO-ALMOÇO)'],
    macro_focus: { carb: 'alto', protein: 'alto', fat: 'moderado' },
    max_prep_time: '30 minutos'
  },

  // ============= MÉXICO =============
  {
    country_code: 'MX',
    meal_type: 'cafe_manha',
    required_components: ['proteins'],
    forbidden_components: [],
    typical_beverages: ['café', 'jugo de naranja', 'leche'],
    forbidden_beverages: ['refresco', 'cerveza'],
    structure_description: 'Huevos + Frijoles/Tortilla + Fruta + Bebida',
    examples: ['Huevos rancheros + frijoles + tortilla', 'Chilaquiles verdes + frijoles', 'Huevos revueltos + tortilla + papaya'],
    negative_examples: ['❌ Arroz + Pollo (esto es COMIDA/CENA)', '❌ Tacos de carne (esto es COMIDA)'],
    macro_focus: { carb: 'alto', protein: 'alto', fat: 'moderado' },
    max_prep_time: '15 minutos'
  },
  {
    country_code: 'MX',
    meal_type: 'almoco',
    required_components: ['proteins', 'carbs', 'vegetables'],
    forbidden_components: [],
    typical_beverages: ['agua', 'agua de frutas', 'refresco'],
    forbidden_beverages: ['café', 'leche'],
    structure_description: 'Proteína + Arroz/Frijoles + Tortilla + Ensalada',
    examples: ['Pollo a la plancha + arroz rojo + frijoles + tortilla', 'Carne asada + frijoles + guacamole', 'Enchiladas + frijoles + ensalada'],
    negative_examples: ['❌ Huevos + Frijoles (esto es DESAYUNO)', '❌ Chilaquiles (esto es DESAYUNO)'],
    macro_focus: { carb: 'alto', protein: 'alto', fat: 'moderado' },
    max_prep_time: '30 minutos'
  },

  // ============= ESPANHA =============
  {
    country_code: 'ES',
    meal_type: 'cafe_manha',
    required_components: ['carbs'],
    forbidden_components: ['legumes', 'proteins'],
    typical_beverages: ['café', 'café con leche', 'zumo de naranja'],
    forbidden_beverages: ['refresco', 'cerveza'],
    structure_description: 'Tostada + Café/Zumo + Fruta',
    examples: ['Tostada con tomate y aceite + café con leche', 'Cereales con leche + fruta', 'Churros + chocolate'],
    negative_examples: ['❌ Paella (esto es ALMUERZO)', '❌ Tortilla española (esto es ALMUERZO)'],
    macro_focus: { carb: 'alto', protein: 'baixo', fat: 'moderado' },
    max_prep_time: '10 minutos'
  },
  {
    country_code: 'ES',
    meal_type: 'almoco',
    required_components: ['proteins', 'carbs', 'vegetables'],
    forbidden_components: [],
    typical_beverages: ['agua', 'vino', 'cerveza'],
    forbidden_beverages: ['café', 'leche'],
    structure_description: 'Proteína + Guarnición + Ensalada',
    examples: ['Merluza a la plancha + patatas + ensalada', 'Pollo asado + patatas y pimientos', 'Paella de mariscos'],
    negative_examples: ['❌ Tostada + Café (esto es DESAYUNO)', '❌ Cereales + Leche (esto es DESAYUNO)'],
    macro_focus: { carb: 'alto', protein: 'alto', fat: 'moderado' },
    max_prep_time: '30 minutos'
  },

  // ============= ARGENTINA =============
  {
    country_code: 'AR',
    meal_type: 'cafe_manha',
    required_components: ['carbs'],
    forbidden_components: ['legumes'],
    typical_beverages: ['café', 'café con leche', 'mate'],
    forbidden_beverages: ['gaseosa', 'cerveza'],
    structure_description: 'Medialunas/Tostadas + Café/Mate + Fruta',
    examples: ['Tostadas con queso crema + café con leche', 'Medialunas + café + naranja', 'Mate con tostadas'],
    negative_examples: ['❌ Asado (esto es ALMUERZO/CENA)', '❌ Milanesa (esto es ALMUERZO)'],
    macro_focus: { carb: 'alto', protein: 'baixo', fat: 'moderado' },
    max_prep_time: '10 minutos'
  },
  {
    country_code: 'AR',
    meal_type: 'almoco',
    required_components: ['proteins', 'carbs', 'vegetables'],
    forbidden_components: [],
    typical_beverages: ['agua', 'vino', 'gaseosa'],
    forbidden_beverages: ['café', 'mate'],
    structure_description: 'Carne/Proteína + Guarnición + Ensalada',
    examples: ['Bife de chorizo + papas al horno + ensalada', 'Milanesa de pollo + puré + ensalada', 'Asado + ensalada'],
    negative_examples: ['❌ Medialunas + Café (esto es DESAYUNO)', '❌ Solo mate (esto es merienda)'],
    macro_focus: { carb: 'moderado', protein: 'alto', fat: 'moderado' },
    max_prep_time: '30 minutos'
  },
];

// ============================================
// COMPONENTES DE REFEIÇÃO POR PAÍS
// ============================================
const MEAL_COMPONENTS = [
  // BRASIL - Carboidratos
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Arroz branco', name_en: 'White rice', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Arroz integral', name_en: 'Brown rice', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Macarrão', name_en: 'Pasta', portion_grams: 80, blocked_for: ['gluten'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Pão francês', name_en: 'French bread', portion_grams: 50, blocked_for: ['gluten'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Pão integral', name_en: 'Whole wheat bread', portion_grams: 50, blocked_for: ['gluten'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Tapioca', name_en: 'Tapioca', portion_grams: 50, blocked_for: [], safe_for: ['gluten'] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Batata cozida', name_en: 'Boiled potato', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Batata doce', name_en: 'Sweet potato', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Cuscuz', name_en: 'Couscous', portion_grams: 100, blocked_for: [], safe_for: ['gluten'] },
  { country_code: 'BR', meal_type: 'all', component_type: 'carbs', name: 'Pão sem glúten', name_en: 'Gluten-free bread', portion_grams: 50, blocked_for: [], safe_for: ['gluten'], is_alternative: true },
  
  // BRASIL - Proteínas
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Frango grelhado', name_en: 'Grilled chicken', portion_grams: 120, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Bife grelhado', name_en: 'Grilled beef steak', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Ovo mexido', name_en: 'Scrambled eggs', portion_grams: 100, blocked_for: ['egg'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Ovo cozido', name_en: 'Boiled egg', portion_grams: 50, blocked_for: ['egg'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Peixe grelhado', name_en: 'Grilled fish', portion_grams: 120, blocked_for: ['fish', 'seafood'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Queijo branco', name_en: 'White cheese', portion_grams: 30, blocked_for: ['lactose', 'milk'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'proteins', name: 'Queijo sem lactose', name_en: 'Lactose-free cheese', portion_grams: 30, blocked_for: [], safe_for: ['lactose'], is_alternative: true },
  
  // BRASIL - Vegetais
  { country_code: 'BR', meal_type: 'all', component_type: 'vegetables', name: 'Salada verde', name_en: 'Green salad', portion_grams: 80, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'vegetables', name: 'Legumes cozidos', name_en: 'Steamed vegetables', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'vegetables', name: 'Brócolis', name_en: 'Broccoli', portion_grams: 80, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'vegetables', name: 'Couve refogada', name_en: 'Sautéed collard greens', portion_grams: 50, blocked_for: [], safe_for: [] },
  
  // BRASIL - Frutas
  { country_code: 'BR', meal_type: 'all', component_type: 'fruits', name: 'Banana', name_en: 'Banana', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'fruits', name: 'Maçã', name_en: 'Apple', portion_grams: 150, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'fruits', name: 'Mamão', name_en: 'Papaya', portion_grams: 150, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'fruits', name: 'Laranja', name_en: 'Orange', portion_grams: 150, blocked_for: [], safe_for: [] },
  
  // BRASIL - Laticínios
  { country_code: 'BR', meal_type: 'all', component_type: 'dairy', name: 'Leite', name_en: 'Milk', portion_ml: 200, blocked_for: ['lactose', 'milk'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'dairy', name: 'Iogurte natural', name_en: 'Natural yogurt', portion_grams: 170, blocked_for: ['lactose', 'milk'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'dairy', name: 'Leite sem lactose', name_en: 'Lactose-free milk', portion_ml: 200, blocked_for: [], safe_for: ['lactose'], is_alternative: true },
  { country_code: 'BR', meal_type: 'all', component_type: 'dairy', name: 'Leite de coco', name_en: 'Coconut milk', portion_ml: 200, blocked_for: [], safe_for: ['lactose', 'milk', 'nuts'], is_alternative: true },
  
  // BRASIL - Leguminosas
  { country_code: 'BR', meal_type: 'all', component_type: 'legumes', name: 'Feijão carioca', name_en: 'Pinto beans', portion_grams: 80, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'legumes', name: 'Feijão preto', name_en: 'Black beans', portion_grams: 80, blocked_for: [], safe_for: [] },
  
  // BRASIL - Bebidas
  { country_code: 'BR', meal_type: 'all', component_type: 'beverages', name: 'Café puro', name_en: 'Black coffee', portion_ml: 100, blocked_for: ['caffeine'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'beverages', name: 'Café com leite', name_en: 'Coffee with milk', portion_ml: 200, blocked_for: ['lactose', 'milk', 'caffeine'], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'beverages', name: 'Suco de laranja', name_en: 'Orange juice', portion_ml: 200, blocked_for: [], safe_for: [] },
  { country_code: 'BR', meal_type: 'all', component_type: 'beverages', name: 'Café descafeinado', name_en: 'Decaf coffee', portion_ml: 100, blocked_for: [], safe_for: ['caffeine'], is_alternative: true },

  // ESTADOS UNIDOS
  { country_code: 'US', meal_type: 'all', component_type: 'carbs', name: 'Whole wheat bread', name_en: 'Whole wheat bread', portion_grams: 35, blocked_for: ['gluten'], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'carbs', name: 'Oatmeal', name_en: 'Oatmeal', portion_grams: 40, blocked_for: ['gluten'], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'carbs', name: 'Brown rice', name_en: 'Brown rice', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'carbs', name: 'Sweet potato', name_en: 'Sweet potato', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'carbs', name: 'Quinoa', name_en: 'Quinoa', portion_grams: 80, blocked_for: [], safe_for: ['gluten'] },
  
  { country_code: 'US', meal_type: 'all', component_type: 'proteins', name: 'Scrambled eggs', name_en: 'Scrambled eggs', portion_grams: 100, blocked_for: ['egg'], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'proteins', name: 'Grilled chicken breast', name_en: 'Grilled chicken breast', portion_grams: 120, blocked_for: [], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'proteins', name: 'Grilled salmon', name_en: 'Grilled salmon', portion_grams: 120, blocked_for: ['fish', 'seafood'], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'proteins', name: 'Greek yogurt', name_en: 'Greek yogurt', portion_grams: 170, blocked_for: ['lactose', 'milk'], safe_for: [] },
  
  { country_code: 'US', meal_type: 'all', component_type: 'vegetables', name: 'Steamed broccoli', name_en: 'Steamed broccoli', portion_grams: 80, blocked_for: [], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'vegetables', name: 'Mixed salad', name_en: 'Mixed salad', portion_grams: 100, blocked_for: [], safe_for: [] },
  
  { country_code: 'US', meal_type: 'all', component_type: 'fruits', name: 'Berries', name_en: 'Berries', portion_grams: 100, blocked_for: [], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'fruits', name: 'Banana', name_en: 'Banana', portion_grams: 100, blocked_for: [], safe_for: [] },
  
  { country_code: 'US', meal_type: 'all', component_type: 'beverages', name: 'Coffee', name_en: 'Coffee', portion_ml: 200, blocked_for: ['caffeine'], safe_for: [] },
  { country_code: 'US', meal_type: 'all', component_type: 'beverages', name: 'Orange juice', name_en: 'Orange juice', portion_ml: 200, blocked_for: [], safe_for: [] },
];

async function main() {
  console.log('===========================================');
  console.log('SETUP SISTEMA DINÂMICO DE PAÍSES');
  console.log('===========================================\n');

  // 1. Testar conexão
  console.log('1. Testando conexão com Supabase...');
  const { data: testData, error: testError } = await supabase
    .from('onboarding_countries')
    .select('country_code')
    .limit(1);
  
  if (testError) {
    console.log('   ❌ Erro de conexão:', testError.message);
    return;
  }
  console.log('   ✓ Conexão OK\n');

  // 2. Popular fallback hierarchy
  console.log('2. Populando fallback hierarchy...');
  let fallbackSuccess = 0;
  for (const fallback of FALLBACK_HIERARCHY) {
    const { error } = await supabase
      .from('country_fallback_hierarchy')
      .upsert(fallback, { onConflict: 'country_code' });
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Tabela country_fallback_hierarchy não existe');
        console.log('   Execute a migration primeiro!');
        return;
      }
      console.log(`   ⚠️ ${fallback.country_code}: ${error.message}`);
    } else {
      fallbackSuccess++;
    }
  }
  console.log(`   ✓ ${fallbackSuccess}/${FALLBACK_HIERARCHY.length} países configurados\n`);
  
  // 3. Popular cultural rules
  console.log('3. Populando regras culturais...');
  let rulesSuccess = 0;
  for (const rule of CULTURAL_RULES) {
    const { error } = await supabase
      .from('cultural_rules')
      .upsert(rule, { onConflict: 'country_code,meal_type' });
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Tabela cultural_rules não existe');
        console.log('   Execute a migration primeiro!');
        return;
      }
      console.log(`   ⚠️ ${rule.country_code}/${rule.meal_type}: ${error.message}`);
    } else {
      rulesSuccess++;
    }
  }
  console.log(`   ✓ ${rulesSuccess}/${CULTURAL_RULES.length} regras configuradas\n`);
  
  // 4. Popular meal components
  console.log('4. Populando componentes de refeição...');
  
  // Primeiro, limpar componentes existentes para evitar duplicados
  const { error: deleteError } = await supabase
    .from('meal_components_pool')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError && !deleteError.message.includes('does not exist')) {
    console.log('   ⚠️ Erro ao limpar componentes:', deleteError.message);
  }
  
  let componentSuccess = 0;
  for (const component of MEAL_COMPONENTS) {
    const { error } = await supabase
      .from('meal_components_pool')
      .insert(component);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Tabela meal_components_pool não existe');
        console.log('   Execute a migration primeiro!');
        return;
      }
      if (!error.message.includes('duplicate')) {
        console.log(`   ⚠️ ${component.name}: ${error.message}`);
      }
    } else {
      componentSuccess++;
    }
  }
  console.log(`   ✓ ${componentSuccess}/${MEAL_COMPONENTS.length} componentes inseridos\n`);
  
  // 5. Verificar países do onboarding
  console.log('5. Verificando países do onboarding...');
  const { data: onboardingCountries } = await supabase
    .from('onboarding_countries')
    .select('country_code, country_name, is_active')
    .order('sort_order');
  
  if (onboardingCountries) {
    console.log('   Países cadastrados:');
    for (const country of onboardingCountries) {
      const status = country.is_active ? '✓ ATIVO' : '○ inativo';
      
      // Verificar se tem fallback
      const { data: fallback } = await supabase
        .from('country_fallback_hierarchy')
        .select('fallback_chain')
        .eq('country_code', country.country_code)
        .single();
      
      const hasFallback = fallback ? '✓' : '⚠️';
      console.log(`   ${status} ${country.country_code} - ${country.country_name} [fallback: ${hasFallback}]`);
    }
  }
  
  // 6. Resumo final
  console.log('\n===========================================');
  console.log('RESUMO FINAL');
  console.log('===========================================');
  
  const { count: rulesCount } = await supabase
    .from('cultural_rules')
    .select('*', { count: 'exact', head: true });
  
  const { count: componentsCount } = await supabase
    .from('meal_components_pool')
    .select('*', { count: 'exact', head: true });
  
  const { count: fallbackCount } = await supabase
    .from('country_fallback_hierarchy')
    .select('*', { count: 'exact', head: true });
  
  console.log(`- Regras culturais: ${rulesCount || 0}`);
  console.log(`- Componentes: ${componentsCount || 0}`);
  console.log(`- Fallback hierarchy: ${fallbackCount || 0}`);
  console.log('\n✓ SETUP CONCLUÍDO COM SUCESSO!');
}

main().catch(console.error);
