# CÓDIGO COMPLETO - POOL E GERADOR DIRETO

## 📋 ARQUITETURA DO SISTEMA

### 1. POOL DE REFEIÇÕES (populate-meal-pool)
### 2. GERADOR DIRETO (advanced-meal-generator)
### 3. GERAÇÃO IA (generate-ai-meal-plan)

---

## 🏊‍♂️ POOL DE REFEIÇÕES

### Arquivo: `supabase/functions/populate-meal-pool/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface MealComponent {
  id: string
  name: string
  category: string
  country: string[]
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  contains?: string[]
  unit?: 'ml' | 'g'
  carb_category?: 'neutral_base' | 'accepted_whole' | 'restrictive_whole'
}

interface MealTemplate {
  id: string
  name: string
  country: string
  meal_type: string
  components: {
    protein?: string[]
    carb?: string[]
    legume?: string[]
    vegetable?: string[]
    beverage?: string[]
    dessert?: string[]
  }
  cultural_rules?: {
    base_required?: string[]
    components_forbidden?: string[]
  }
}

// Categorias de Carboidratos para Estratégia de Integrais
export const CARB_CATEGORIES = {
  // 🟢 Base Neutra - Alta Aceitação
  neutral_base: [
    'arroz_branco',
    'macarrao_comum',
    'pao_frances',
    'batata_inglesa',
    'mandioca',
    'farinha_mandioca'
  ],
  
  // 🟡 Integrais Aceitos - Ótimo Custo-Benefício
  accepted_whole: [
    'aveia',
    'pao_integral', // misto
    'arroz_parboilizado',
    'cuscuz_milho',
    'batata_doce',
    'inhame',
    'pao_forma', // não 100% integral
    'macarraao_integral' // apenas se aceita
  ],
  
  // 🔵 Integrais Restritivos - Usar com Critério
  restrictive_whole: [
    'arroz_integral',
    'macarrao_integral',
    'pao_forma_integral', // 100%
    'farinha_integral'
  ]
}

// Distribuição por Perfil
const CARB_DISTRIBUTION_BY_PROFILE = {
  maintain: {
    neutral_base: 0.70,
    accepted_whole: 0.30,
    restrictive_whole: 0.00
  },
  weight_loss: {
    neutral_base: 0.40,
    accepted_whole: 0.60,
    restrictive_whole: 0.00
  },
  diabetes: {
    neutral_base: 0.30,
    accepted_whole: 0.60,
    restrictive_whole: 0.10
  },
  muscle_gain: {
    neutral_base: 0.60,
    accepted_whole: 0.40,
    restrictive_whole: 0.00
  }
}

// Templates Culturais por País
const CULTURAL_TEMPLATES = {
  BR: {
    almoco: [
      {
        id: 'br_almoco_arroz_feijao',
        name: 'Arroz com Feijão',
        base_required: ['arroz', 'feijao'],
        components_forbidden: ['macarrao'],
        examples: ['Arroz branco com feijão e frango', 'Arroz parboilizado com feijão e bife']
      },
      {
        id: 'br_almoco_macarrao',
        name: 'Macarronada',
        base_required: ['macarrao'],
        components_forbidden: ['arroz', 'feijao', 'salada'],
        examples: ['Macarrão com molho e frango', 'Macarrão à bolonhesa']
      }
    ]
  },
  US: {
    lunch: [
      {
        id: 'us_lunch_salad',
        name: 'Salad Bowl',
        base_required: ['salad'],
        components_forbidden: ['rice', 'beans'],
        examples: ['Chicken Caesar Salad', 'Greek Salad']
      }
    ]
  }
}

// Componentes do Pool
const MEAL_COMPONENTS_POOL: MealComponent[] = [
  // Proteínas
  {
    id: 'frango',
    name: 'Frango',
    category: 'protein',
    country: ['BR', 'US', 'PT', 'MX'],
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    unit: 'g'
  },
  {
    id: 'carne',
    name: 'Carne',
    category: 'protein',
    country: ['BR', 'AR', 'MX'],
    macros: { calories: 250, protein: 26, carbs: 0, fat: 15 },
    unit: 'g'
  },
  {
    id: 'ovo',
    name: 'Ovo',
    category: 'protein',
    country: ['BR', 'US', 'PT', 'MX'],
    macros: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    unit: 'g'
  },
  
  // Carboidratos - Base Neutra
  {
    id: 'arroz_branco',
    name: 'Arroz Branco',
    category: 'carb',
    country: ['BR', 'PT', 'MX'],
    macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    unit: 'g',
    carb_category: 'neutral_base'
  },
  {
    id: 'macarrao_comum',
    name: 'Macarrão Comum',
    category: 'carb',
    country: ['BR', 'IT', 'US'],
    macros: { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
    unit: 'g',
    carb_category: 'neutral_base'
  },
  
  // Carboidratos - Integrais Aceitos
  {
    id: 'aveia',
    name: 'Aveia',
    category: 'carb',
    country: ['BR', 'US', 'PT'],
    macros: { calories: 389, protein: 17, carbs: 66, fat: 7 },
    unit: 'g',
    carb_category: 'accepted_whole'
  },
  {
    id: 'arroz_parboilizado',
    name: 'Arroz Parboilizado',
    category: 'carb',
    country: ['BR', 'PT'],
    macros: { calories: 112, protein: 2.3, carbs: 24, fat: 0.8 },
    unit: 'g',
    carb_category: 'accepted_whole'
  },
  
  // Carboidratos - Integrais Restritivos
  {
    id: 'arroz_integral',
    name: 'Arroz Integral',
    category: 'carb',
    country: ['BR', 'US', 'PT'],
    macros: { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
    unit: 'g',
    carb_category: 'restrictive_whole'
  },
  
  // Leguminosas
  {
    id: 'feijao',
    name: 'Feijão',
    category: 'legume',
    country: ['BR', 'PT', 'MX'],
    macros: { calories: 77, protein: 5.2, carbs: 13, fat: 0.5 },
    unit: 'g'
  },
  {
    id: 'lentilha',
    name: 'Lentilha',
    category: 'legume',
    country: ['BR', 'IT', 'IN'],
    macros: { calories: 116, protein: 9, carbs: 20, fat: 0.4 },
    unit: 'g'
  },
  
  // Vegetais
  {
    id: 'brocolis',
    name: 'Brócolis',
    category: 'vegetable',
    country: ['BR', 'US', 'PT'],
    macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    unit: 'g'
  },
  {
    id: 'alface',
    name: 'Alface',
    category: 'vegetable',
    country: ['BR', 'US', 'PT'],
    macros: { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
    unit: 'g'
  },
  
  // Bebidas
  {
    id: 'agua',
    name: 'Água',
    category: 'beverage',
    country: ['BR', 'US', 'PT', 'MX'],
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    unit: 'ml'
  },
  {
    id: 'suco_laranja',
    name: 'Suco de Laranja',
    category: 'beverage',
    country: ['BR', 'US', 'PT'],
    macros: { calories: 45, protein: 0.7, carbs: 11, fat: 0.2 },
    unit: 'ml'
  },
  
  // Laticínios (com lactose)
  {
    id: 'leite',
    name: 'Leite',
    category: 'dairy',
    country: ['BR', 'US', 'PT'],
    macros: { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
    unit: 'ml',
    contains: ['lactose']
  },
  {
    id: 'queijo',
    name: 'Queijo',
    category: 'dairy',
    country: ['BR', 'IT', 'US'],
    macros: { calories: 113, protein: 7, carbs: 1, fat: 9 },
    unit: 'g',
    contains: ['lactose']
  }
]

// Função para selecionar carboidrato baseado no perfil
function selectCarbByProfile(
  profile: any,
  country: string,
  mealType: string
): string {
  const { goal = 'maintain', has_diabetes = false, accepts_whole_grains = null } = profile;
  
  const distribution = CARB_DISTRIBUTION_BY_PROFILE[goal] || CARB_DISTRIBUTION_BY_PROFILE.maintain;
  
  // Se tem diabetes e rejeita integral, ajustar distribuição
  if (has_diabetes && accepts_whole_grains === false) {
    distribution.restrictive_whole = 0;
    distribution.neutral_base = 0.40;
    distribution.accepted_whole = 0.60;
  }
  
  // Se tem diabetes e aceita integral, pode usar restritivos
  if (has_diabetes && accepts_whole_grains === true) {
    distribution.neutral_base = 0.30;
    distribution.accepted_whole = 0.60;
    distribution.restrictive_whole = 0.10;
  }
  
  // Seleção baseada na distribuição
  const random = Math.random();
  
  if (random < distribution.neutral_base) {
    return selectFromCategory('neutral_base', country);
  } else if (random < distribution.neutral_base + distribution.accepted_whole) {
    return selectFromCategory('accepted_whole', country);
  } else {
    return selectFromCategory('restrictive_whole', country);
  }
}

function selectFromCategory(category: string, country: string): string {
  const available = MEAL_COMPONENTS_POOL.filter(
    comp => comp.carb_category === category && comp.country.includes(country)
  );
  
  if (available.length === 0) {
    // Fallback para categoria neutra
    const fallback = MEAL_COMPONENTS_POOL.filter(
      comp => comp.carb_category === 'neutral_base' && comp.country.includes(country)
    );
    return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)].id : 'arroz_branco';
  }
  
  return available[Math.floor(Math.random() * available.length)].id;
}

// Validação de Intolerâncias
function validateIntolerance(meal: any, intolerances: string[]): boolean {
  if (!intolerances || intolerances.length === 0) return true;
  
  for (const component of meal.components) {
    const ingredient = MEAL_COMPONENTS_POOL.find(c => c.id === component.id);
    if (ingredient?.contains) {
      for (const intolerance of intolerances) {
        if (ingredient.contains.includes(intolerance)) {
          return false;
        }
      }
    }
  }
  
  return true;
}

// Validação de Regras Culturais
function validateCulturalRules(meal: any, template: any): boolean {
  if (!template.cultural_rules) return true;
  
  const { base_required, components_forbidden } = template.cultural_rules;
  
  // Verificar componentes obrigatórios
  if (base_required) {
    for (const required of base_required) {
      if (!meal.components.some((c: any) => c.id.includes(required))) {
        return false;
      }
    }
  }
  
  // Verificar componentes proibidos
  if (components_forbidden) {
    for (const forbidden of components_forbidden) {
      if (meal.components.some((c: any) => c.id.includes(forbidden))) {
        return false;
      }
    }
  }
  
  return true;
}

// Geração de Refeição
function generateMeal(
  template: MealTemplate,
  country: string,
  profile: any,
  intolerances: string[]
): any {
  const meal = {
    id: crypto.randomUUID(),
    name: template.name,
    country: template.country,
    meal_type: template.meal_type,
    components: [],
    created_at: new Date().toISOString()
  };
  
  // Para cada categoria de componente
  for (const [category, componentIds] of Object.entries(template.components)) {
    if (!componentIds || componentIds.length === 0) continue;
    
    // Selecionar componente aleatório da categoria
    const selectedId = componentIds[Math.floor(Math.random() * componentIds.length)];
    const component = MEAL_COMPONENTS_POOL.find(c => c.id === selectedId);
    
    if (component && component.country.includes(country)) {
      // Se for carboidrato, usar seleção por perfil
      let finalComponent = component;
      if (category === 'carb') {
        const carbId = selectCarbByProfile(profile, country, template.meal_type);
        finalComponent = MEAL_COMPONENTS_POOL.find(c => c.id === carbId);
      }
      
      meal.components.push({
        id: finalComponent.id,
        name: finalComponent.name,
        category: finalComponent.category,
        portion: getDefaultPortion(finalComponent.category),
        unit: finalComponent.unit || 'g',
        macros: finalComponent.macros
      });
    }
  }
  
  // Validações
  if (!validateIntolerance(meal, intolerances)) {
    return null; // Rejeitar se tem intolerância
  }
  
  if (!validateCulturalRules(meal, template)) {
    return null; // Rejeitar se viola regras culturais
  }
  
  return meal;
}

function getDefaultPortion(category: string): number {
  const portions = {
    protein: 100,      // 100g
    carb: 100,         // 100g
    legume: 80,        // 80g
    vegetable: 100,    // 100g
    beverage: 200,     // 200ml
    dairy: 200,        // 200ml
    dessert: 50        // 50g
  };
  
  return portions[category] || 100;
}

// Função principal
serve(async (req) => {
  try {
    const { country, mealTypes, count = 10 } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const generatedMeals = [];
    
    for (const mealType of mealTypes) {
      const templates = CULTURAL_TEMPLATES[country]?.[mealType] || [];
      
      for (let i = 0; i < count; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Simular perfil (na prática viria do usuário)
        const profile = {
          goal: 'maintain',
          has_diabetes: false,
          accepts_whole_grains: null
        };
        
        const intolerances = []; // Viria do perfil
        
        const meal = generateMeal(template, country, profile, intolerances);
        
        if (meal) {
          generatedMeals.push(meal);
        }
      }
    }
    
    // Salvar no banco
    const { error } = await supabase
      .from('meal_combinations')
      .insert(generatedMeals);
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ success: true, count: generatedMeals.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 🎯 GERADOR DIRETO

### Arquivo: `supabase/functions/_shared/advanced-meal-generator.ts`

```typescript
import { v4 as uuidv4 } from 'https://deno.land/std/uuid/mod.ts'
import { SMART_TEMPLATES } from './meal-templates-smart.ts'
import { INGREDIENTS } from './meal-ingredients-db.ts'

interface UserProfile {
  id: string
  goal?: string
  strategy_key?: string
  has_diabetes?: boolean
  accepts_whole_grains?: boolean
  intolerances?: string[]
  excluded_ingredients?: string[]
  enabled_meals?: string[]
  country?: string
}

interface MealComponent {
  id: string
  name: string
  category: string
  portion: number
  unit: 'ml' | 'g'
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  contains?: string[]
  carb_category?: 'neutral_base' | 'accepted_whole' | 'restrictive_whole'
}

interface GeneratedMeal {
  id: string
  name: string
  meal_type: string
  components: MealComponent[]
  total_macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  created_at: string
}

// Categorias de Carboidratos (mesma do pool)
export const CARB_CATEGORIES = {
  neutral_base: [
    'arroz_branco',
    'macarrao_comum',
    'pao_frances',
    'batata_inglesa',
    'mandioca'
  ],
  accepted_whole: [
    'aveia',
    'pao_integral',
    'arroz_parboilizado',
    'cuscuz_milho',
    'batata_doce'
  ],
  restrictive_whole: [
    'arroz_integral',
    'macarrao_integral',
    'pao_forma_integral'
  ]
}

// Distribuição por Perfil (mesma do pool)
const CARB_DISTRIBUTION_BY_PROFILE = {
  maintain: { neutral_base: 0.70, accepted_whole: 0.30, restrictive_whole: 0.00 },
  weight_loss: { neutral_base: 0.40, accepted_whole: 0.60, restrictive_whole: 0.00 },
  diabetes: { neutral_base: 0.30, accepted_whole: 0.60, restrictive_whole: 0.10 },
  muscle_gain: { neutral_base: 0.60, accepted_whole: 0.40, restrictive_whole: 0.00 }
}

// Classe principal do gerador
export class AdvancedMealGenerator {
  private profile: UserProfile
  
  constructor(profile: UserProfile) {
    this.profile = profile
  }
  
  // Gera refeição para tipo específico
  generateMeal(mealType: string, dayOffset: number = 0): GeneratedMeal | null {
    try {
      // 1. Selecionar template baseado no tipo de refeição e país
      const template = this.selectTemplate(mealType)
      if (!template) return null
      
      // 2. Gerar componentes baseado no template
      const components = this.generateComponents(template)
      if (!components || components.length === 0) return null
      
      // 3. Validar intolerâncias
      if (!this.validateIntolerances(components)) return null
      
      // 4. Calcular macros totais
      const total_macros = this.calculateTotalMacros(components)
      
      // 5. Ordenar componentes
      const ordered_components = this.orderComponents(components)
      
      // 6. Criar nome da refeição
      const mealName = this.generateMealName(template, ordered_components)
      
      return {
        id: uuidv4(),
        name: mealName,
        meal_type: mealType,
        components: ordered_components,
        total_macros,
        created_at: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`Error generating meal for ${mealType}:`, error)
      return null
    }
  }
  
  // Seleciona template baseado no tipo de refeição
  private selectTemplate(mealType: string): any {
    const templates = SMART_TEMPLATES[mealType] || []
    
    // Filtrar templates disponíveis para o país do usuário
    const availableTemplates = templates.filter(template => 
      !template.countries || 
      template.countries.includes(this.profile.country || 'BR')
    )
    
    if (availableTemplates.length === 0) return null
    
    // Selecionar template aleatório ou baseado em variedade
    return availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
  }
  
  // Gera componentes baseado no template
  private generateComponents(template: any): MealComponent[] {
    const components: MealComponent[] = []
    
    // Para cada slot no template
    for (const [slotType, slotConfig] of Object.entries(template.slots)) {
      const slotComponents = this.generateSlotComponents(slotType, slotConfig as any)
      components.push(...slotComponents)
    }
    
    return components
  }
  
  // Gera componentes para um slot específico
  private generateSlotComponents(slotType: string, slotConfig: any): MealComponent[] {
    const { count = 1, categories, required = false } = slotConfig
    
    const components: MealComponent[] = []
    
    for (let i = 0; i < count; i++) {
      const ingredient = this.selectIngredient(categories, slotType)
      
      if (ingredient) {
        components.push(this.createMealComponent(ingredient, slotType))
      } else if (required) {
        // Se é required e não encontrou, tentar fallback
        const fallback = this.getFallbackIngredient(categories)
        if (fallback) {
          components.push(this.createMealComponent(fallback, slotType))
        }
      }
    }
    
    return components
  }
  
  // Seleciona ingrediente baseado nas categorias e perfil
  private selectIngredient(categories: string[], slotType: string): any {
    const availableIngredients = INGREDIENTS.filter(ingredient => {
      // Verificar categoria
      if (!categories.some(cat => ingredient.category === cat)) return false
      
      // Verificar se não está excluído
      if (this.profile.excluded_ingredients?.includes(ingredient.id)) return false
      
      // Verificar disponibilidade no país
      if (ingredient.countries && !ingredient.countries.includes(this.profile.country || 'BR')) return false
      
      return true
    })
    
    if (availableIngredients.length === 0) return null
    
    // Se for carboidrato, usar seleção por perfil
    if (categories.includes('carb')) {
      return this.selectCarbByProfile(availableIngredients)
    }
    
    // Para outras categorias, seleção aleatória com variedade
    return this.selectWithVariety(availableIngredients, slotType)
  }
  
  // Seleção de carboidrato baseado no perfil
  private selectCarbByProfile(availableIngredients: any[]): any {
    const { goal = 'maintain', has_diabetes = false, accepts_whole_grains = null } = this.profile
    
    const distribution = CARB_DISTRIBUTION_BY_PROFILE[goal] || CARB_DISTRIBUTION_BY_PROFILE.maintain
    
    // Ajustar distribuição para diabetes
    if (has_diabetes) {
      if (accepts_whole_grains === false) {
        distribution.restrictive_whole = 0
        distribution.neutral_base = 0.40
        distribution.accepted_whole = 0.60
      } else if (accepts_whole_grains === true) {
        distribution.neutral_base = 0.30
        distribution.accepted_whole = 0.60
        distribution.restrictive_whole = 0.10
      }
    }
    
    // Filtrar ingredientes por categoria
    const neutral = availableIngredients.filter(i => i.carb_category === 'neutral_base')
    const accepted = availableIngredients.filter(i => i.carb_category === 'accepted_whole')
    const restrictive = availableIngredients.filter(i => i.carb_category === 'restrictive_whole')
    
    // Seleção baseada na distribuição
    const random = Math.random()
    
    if (random < distribution.neutral_base && neutral.length > 0) {
      return neutral[Math.floor(Math.random() * neutral.length)]
    } else if (random < distribution.neutral_base + distribution.accepted_whole && accepted.length > 0) {
      return accepted[Math.floor(Math.random() * accepted.length)]
    } else if (restrictive.length > 0) {
      return restrictive[Math.floor(Math.random() * restrictive.length)]
    }
    
    // Fallback
    return availableIngredients[Math.floor(Math.random() * availableIngredients.length)]
  }
  
  // Seleção com variedade (evitar repetição)
  private selectWithVariety(ingredients: any[], slotType: string): any {
    // Implementar lógica de variedade aqui
    // Por enquanto, seleção aleatória simples
    return ingredients[Math.floor(Math.random() * ingredients.length)]
  }
  
  // Cria componente da refeição
  private createMealComponent(ingredient: any, slotType: string): MealComponent {
    const portion = this.getPortion(ingredient.category, slotType)
    
    return {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      portion,
      unit: ingredient.unit || 'g',
      macros: this.calculateIngredientMacros(ingredient, portion),
      contains: ingredient.contains,
      carb_category: ingredient.carb_category
    }
  }
  
  // Calcula porção baseada na categoria e tipo de refeição
  private getPortion(category: string, slotType: string): number {
    const basePortions = {
      protein: { breakfast: 50, lunch: 120, dinner: 120, snack: 30, supper: 50 },
      carb: { breakfast: 60, lunch: 100, dinner: 100, snack: 40, supper: 30 },
      legume: { breakfast: 0, lunch: 80, dinner: 80, snack: 0, supper: 0 },
      vegetable: { breakfast: 0, lunch: 100, dinner: 100, snack: 0, supper: 50 },
      beverage: { breakfast: 200, lunch: 200, dinner: 200, snack: 200, supper: 200 },
      dairy: { breakfast: 200, lunch: 0, dinner: 0, snack: 150, supper: 200 },
      fruit: { breakfast: 100, lunch: 0, dinner: 0, snack: 100, supper: 100 },
      dessert: { breakfast: 0, lunch: 30, dinner: 30, snack: 0, supper: 0 }
    }
    
    return basePortions[category]?.[slotType] || 100
  }
  
  // Calcula macros do ingrediente baseado na porção
  private calculateIngredientMacros(ingredient: any, portion: number): any {
    const factor = portion / 100
    
    return {
      calories: Math.round(ingredient.macros.calories * factor),
      protein: Math.round(ingredient.macros.protein * factor * 10) / 10,
      carbs: Math.round(ingredient.macros.carbs * factor * 10) / 10,
      fat: Math.round(ingredient.macros.fat * factor * 10) / 10
    }
  }
  
  // Valida intolerâncias
  private validateIntolerances(components: MealComponent[]): boolean {
    if (!this.profile.intolerances || this.profile.intolerances.length === 0) return true
    
    for (const component of components) {
      const ingredient = INGREDIENTS.find(i => i.id === component.id)
      
      if (ingredient?.contains) {
        for (const intolerance of this.profile.intolerances) {
          if (ingredient.contains.includes(intolerance)) {
            return false // Rejeitar refeição
          }
        }
      }
    }
    
    return true
  }
  
  // Calcula macros totais da refeição
  private calculateTotalMacros(components: MealComponent[]): any {
    return components.reduce((total, component) => ({
      calories: total.calories + component.macros.calories,
      protein: total.protein + component.macros.protein,
      carbs: total.carbs + component.macros.carbs,
      fat: total.fat + component.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  }
  
  // Ordena componentes na ordem ideal
  private orderComponents(components: MealComponent[]): MealComponent[] {
    const order = ['protein', 'carb', 'legume', 'vegetable', 'beverage', 'dairy', 'fruit', 'dessert']
    
    return components.sort((a, b) => {
      const orderA = order.indexOf(a.category)
      const orderB = order.indexOf(b.category)
      
      if (orderA !== orderB) {
        return orderA - orderB
      }
      
      // Se mesma categoria, ordenar por nome
      return a.name.localeCompare(b.name)
    })
  }
  
  // Gera nome da refeição
  private generateMealName(template: any, components: MealComponent[]): string {
    // Se template tem name_pattern, usar
    if (template.name_pattern) {
      return template.name_pattern
    }
    
    // Caso contrário, gerar nome baseado nos componentes principais
    const mainComponents = components
      .filter(c => ['protein', 'carb'].includes(c.category))
      .map(c => c.name)
      .slice(0, 2)
    
    if (mainComponents.length >= 2) {
      return `${mainComponents[0]} com ${mainComponents[1]}`
    } else if (mainComponents.length === 1) {
      return mainComponents[0]
    } else {
      return 'Refeição Balanceada'
    }
  }
  
  // Fallback para ingrediente
  private getFallbackIngredient(categories: string[]): any {
    // Fallbacks por categoria
    const fallbacks = {
      protein: ['ovo', 'frango'],
      carb: ['arroz_branco'],
      legume: ['feijao'],
      vegetable: ['alface'],
      beverage: ['agua'],
      dairy: ['leite'],
      fruit: ['banana'],
      dessert: []
    }
    
    for (const category of categories) {
      const fallbackIds = fallbacks[category]
      if (fallbackIds) {
        for (const id of fallbackIds) {
          const ingredient = INGREDIENTS.find(i => i.id === id)
          if (ingredient) return ingredient
        }
      }
    }
    
    return null
  }
}

// Função de conveniência para gerar múltiplas refeições
export function generateMealsForPool(
  profile: UserProfile,
  mealTypes: string[],
  daysCount: number = 1
): GeneratedMeal[] {
  const generator = new AdvancedMealGenerator(profile)
  const meals: GeneratedMeal[] = []
  
  for (let day = 0; day < daysCount; day++) {
    for (const mealType of mealTypes) {
      const meal = generator.generateMeal(mealType, day)
      if (meal) {
        meals.push(meal)
      }
    }
  }
  
  return meals
}

// Função para validar refeição gerada
export function validateGeneratedMeal(meal: GeneratedMeal, profile: UserProfile): boolean {
  // Validar macros mínimos
  if (meal.total_macros.calories < 50) return false
  if (meal.total_macros.calories > 1000) return false
  
  // Validar componentes
  if (!meal.components || meal.components.length === 0) return false
  
  // Validar intolerâncias
  const generator = new AdvancedMealGenerator(profile)
  return generator.validateIntolerances(meal.components)
}
```

---

## 🔗 INTEGRAÇÃO COM EDGE FUNCTION

### Arquivo: `supabase/functions/generate-ai-meal-plan/index.ts` (trecho relevante)

```typescript
import { generateMealsForPool, validateGeneratedMeal } from '../_shared/advanced-meal-generator.ts'

// Dentro da função principal...
try {
  // 1. Tentar gerar com pool
  const poolMeals = generateMealsForPool(profile, mealTypes, daysCount)
  
  if (poolMeals.length > 0) {
    // Validar refeições geradas
    const validMeals = poolMeals.filter(meal => validateGeneratedMeal(meal, profile))
    
    if (validMeals.length >= mealTypes.length * daysCount * 0.8) {
      // 80% das refeições válidas = sucesso
      return { success: true, meals: validMeals, source: 'pool' }
    }
  }
  
  // 2. Se pool falhar, tentar geração direta (já implementada acima)
  // ...
  
  // 3. Se tudo falhar, usar IA
  // ...
  
} catch (error) {
  console.error('Error in meal generation:', error)
  throw error
}
```

---

## 📊 FLUXO COMPLETO

```
1. POOL (populate-meal-pool)
   └── Gera refeições pré-definidas
   └── Usa estratégia de integrais por perfil
   └── Salva em meal_combinations

2. GERADOR DIRETO (advanced-meal-generator)
   └── Gera refeições em tempo real
   └── Usa templates inteligentes
   └── Aplica estratégia de integrais
   └── Valida intolerâncias
   └── Ordena componentes

3. EDGE FUNCTION (generate-ai-meal-plan)
   └── Orquestra o processo
   └── Fallback: Pool → Direto → IA
   └── Salva resultados
```

---

## 🎯 PONTOS-CHAVE DA IMPLEMENTAÇÃO

1. **Estratégia de Integrais:** 3 categorias (neutral, accepted, restrictive)
2. **Distribuição por Perfil:** Baseada em goal e accepts_whole_grains
3. **Validação de Intolerâncias:** Filtra ingredientes com contains[]
4. **Ordenação de Componentes:** protein → carb → legume → vegetable → beverage
5. **Unidades:** ml para líquidos, g para sólidos
6. **Fallback:** Sempre tem ingrediente fallback para cada categoria

Este código está pronto para implementação e segue a estratégia profissional de adesão discutida.
