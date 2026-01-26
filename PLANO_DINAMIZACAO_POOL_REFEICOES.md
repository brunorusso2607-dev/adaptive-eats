# 🔄 PLANO DE DINAMIZAÇÃO - POOL DE REFEIÇÕES

## 🎯 OBJETIVO

Transformar o módulo Pool de Refeições em um sistema **100% DINÂMICO** que:
1. ✅ Sincroniza automaticamente com `onboarding_countries`
2. ✅ Detecta novos países adicionados e aplica regras culturais automaticamente
3. ✅ Escala para qualquer número de países sem necessidade de código hardcoded
4. ✅ Mantém consistência entre todos os módulos do sistema

---

## 📊 SITUAÇÃO ATUAL

### **Países no Onboarding (Tabela `onboarding_countries`)**
```
✅ 🇧🇷 Brasil (BR) - ATIVO
⚪ 🇺🇸 United States (US) - Inativo
⚪ 🇵🇹 Portugal (PT) - Inativo
⚪ 🇬🇧 Reino Unido (GB) - Inativo
⚪ 🇪🇸 España (ES) - Inativo
⚪ 🇲🇽 México (MX) - Inativo
⚪ 🇦🇷 Argentina (AR) - Inativo
⚪ 🇨🇱 Chile (CL) - Inativo
⚪ 🇵🇪 Perú (PE) - Inativo
```

### **Países no Pool de Refeições (Hardcoded)**
```typescript
// populate-meal-pool/index.ts - LINHA 292
const MEAL_TYPE_LABELS: Record<string, Record<string, string>> = {
  BR: { cafe_manha: "Café da manhã", ... },
  US: { cafe_manha: "Breakfast", ... },
  // FALTAM: GB, CL, PE
  // HARDCODED - não sincroniza com onboarding
};
```

### **Países no mealGenerationConfig.ts**
```typescript
// _shared/mealGenerationConfig.ts
export const REGIONAL_CONFIGS: Record<string, RegionalConfig> = {
  'BR': { ... },
  'US': { ... },
  'PT': { ... },
  'MX': { ... },
  'ES': { ... },
  'AR': { ... },
  'CO': { ... },  // Colômbia não está no onboarding!
  // FALTAM: GB, CL, PE
};
```

### ❌ **PROBLEMAS IDENTIFICADOS**

1. **Dessincronia entre módulos**
   - Onboarding tem 9 países
   - Pool de refeições tem apenas 4 países hardcoded
   - mealGenerationConfig tem 7 países (incluindo CO que não está no onboarding)

2. **Sistema estático**
   - Adicionar novo país requer editar múltiplos arquivos
   - Não há detecção automática de novos países
   - Risco de inconsistências

3. **Falta de fallback inteligente**
   - Se país não tem regras culturais, sistema falha
   - Não há herança de regras similares (ex: CL herdar de ES)

4. **Tabela `countries` não utilizada**
   - Existe tabela `countries` criada mas não está sendo usada
   - Duplicação com `onboarding_countries`

---

## 🏗️ ARQUITETURA PROPOSTA - SISTEMA DINÂMICO

### **Camada 1: Fonte Única de Verdade**

```
┌─────────────────────────────────────┐
│   onboarding_countries (DB)         │
│   - country_code                    │
│   - country_name                    │
│   - flag_emoji                      │
│   - is_active                       │
│   - sort_order                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   cultural_rules (DB) - NOVA        │
│   - country_code (FK)               │
│   - meal_type                       │
│   - required_components (JSONB)     │
│   - forbidden_components (JSONB)    │
│   - typical_beverages (JSONB)       │
│   - forbidden_beverages (JSONB)     │
│   - structure_description (TEXT)    │
│   - examples (JSONB)                │
│   - negative_examples (JSONB)       │
│   - fallback_country_code (TEXT)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   meal_components (DB) - NOVA       │
│   - country_code (FK)               │
│   - meal_type                       │
│   - component_type (carbs/proteins) │
│   - name                            │
│   - name_en                         │
│   - portion_grams                   │
│   - blocked_for (TEXT[])            │
│   - safe_for (TEXT[])               │
│   - is_alternative (BOOLEAN)        │
└─────────────────────────────────────┘
```

### **Camada 2: Sistema de Fallback Inteligente**

```typescript
// Hierarquia de fallback por similaridade cultural
const CULTURAL_FALLBACK_HIERARCHY: Record<string, string[]> = {
  // Países sem regras próprias herdam de países similares
  'GB': ['US', 'BR'],           // Reino Unido → EUA → Brasil
  'CL': ['AR', 'MX', 'ES'],     // Chile → Argentina → México → Espanha
  'PE': ['MX', 'CO', 'ES'],     // Peru → México → Colômbia → Espanha
  'CO': ['MX', 'ES', 'BR'],     // Colômbia → México → Espanha → Brasil
  
  // Países com regras próprias não precisam fallback
  'BR': [],
  'US': [],
  'PT': [],
  'ES': [],
  'MX': [],
  'AR': [],
};
```

### **Camada 3: Loader Dinâmico de Regras**

```typescript
// NOVA FUNÇÃO - Carrega regras do banco dinamicamente
async function loadCulturalRulesForCountry(
  supabase: SupabaseClient,
  countryCode: string,
  mealType: string
): Promise<CulturalRule | null> {
  
  // 1. Tentar carregar regras do país
  const { data: rule } = await supabase
    .from('cultural_rules')
    .select('*')
    .eq('country_code', countryCode)
    .eq('meal_type', mealType)
    .single();
  
  if (rule) return rule;
  
  // 2. Se não encontrou, usar fallback
  const fallbackChain = CULTURAL_FALLBACK_HIERARCHY[countryCode] || ['BR'];
  
  for (const fallbackCountry of fallbackChain) {
    const { data: fallbackRule } = await supabase
      .from('cultural_rules')
      .select('*')
      .eq('country_code', fallbackCountry)
      .eq('meal_type', mealType)
      .single();
    
    if (fallbackRule) {
      console.log(`Using fallback rules from ${fallbackCountry} for ${countryCode}`);
      return fallbackRule;
    }
  }
  
  // 3. Fallback final: Brasil
  const { data: brRule } = await supabase
    .from('cultural_rules')
    .select('*')
    .eq('country_code', 'BR')
    .eq('meal_type', mealType)
    .single();
  
  return brRule;
}
```

### **Camada 4: Loader Dinâmico de Componentes**

```typescript
// NOVA FUNÇÃO - Carrega componentes do banco dinamicamente
async function loadMealComponentsForCountry(
  supabase: SupabaseClient,
  countryCode: string,
  mealType: string,
  intoleranceFilter?: string
): Promise<MealComponent[]> {
  
  let query = supabase
    .from('meal_components')
    .select('*')
    .eq('country_code', countryCode)
    .eq('meal_type', mealType);
  
  // Filtrar por intolerância (incluir alternativas seguras)
  if (intoleranceFilter) {
    query = query.or(`blocked_for.not.cs.{${intoleranceFilter}},safe_for.cs.{${intoleranceFilter}}`);
  }
  
  const { data: components } = await query;
  
  if (components && components.length > 0) {
    return components;
  }
  
  // Fallback: usar componentes de país similar
  const fallbackChain = CULTURAL_FALLBACK_HIERARCHY[countryCode] || ['BR'];
  
  for (const fallbackCountry of fallbackChain) {
    const { data: fallbackComponents } = await supabase
      .from('meal_components')
      .select('*')
      .eq('country_code', fallbackCountry)
      .eq('meal_type', mealType);
    
    if (fallbackComponents && fallbackComponents.length > 0) {
      console.log(`Using fallback components from ${fallbackCountry} for ${countryCode}`);
      return fallbackComponents;
    }
  }
  
  // Fallback final: Brasil
  const { data: brComponents } = await supabase
    .from('meal_components')
    .select('*')
    .eq('country_code', 'BR')
    .eq('meal_type', mealType);
  
  return brComponents || [];
}
```

### **Camada 5: Sincronização Automática**

```typescript
// NOVA FUNÇÃO - Sincroniza países do onboarding
async function syncCountriesFromOnboarding(
  supabase: SupabaseClient
): Promise<string[]> {
  
  // Buscar países ativos do onboarding
  const { data: countries } = await supabase
    .from('onboarding_countries')
    .select('country_code, country_name, flag_emoji, is_active')
    .eq('is_active', true)
    .order('sort_order');
  
  if (!countries) return [];
  
  const countryCodes = countries.map(c => c.country_code);
  
  console.log(`Synced ${countryCodes.length} active countries from onboarding:`, countryCodes);
  
  return countryCodes;
}
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### **FASE 1: Criar Estrutura de Banco de Dados** (2-3h)

**1.1. Criar tabela `cultural_rules`**
```sql
CREATE TABLE public.cultural_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES onboarding_countries(country_code),
  meal_type TEXT NOT NULL, -- cafe_manha, almoco, jantar, etc.
  
  -- Estrutura obrigatória
  required_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["carbs", "proteins", "beverages"]
  
  forbidden_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["legumes", "rice"] (para café da manhã)
  
  typical_beverages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["café", "café com leite", "suco natural"]
  
  forbidden_beverages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["refrigerante", "cerveja"]
  
  structure_description TEXT,
  -- Ex: "Pão/Tapioca + Bebida quente + Fruta"
  
  examples JSONB DEFAULT '[]'::jsonb,
  -- Ex: ["Pão francês + Ovo + Café", "Tapioca + Queijo + Suco"]
  
  negative_examples JSONB DEFAULT '[]'::jsonb,
  -- Ex: ["❌ Arroz + Feijão + Café (isso é ALMOÇO)"]
  
  fallback_country_code TEXT,
  -- País de onde herdar regras se não definido
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(country_code, meal_type)
);

CREATE INDEX idx_cultural_rules_country ON cultural_rules(country_code);
CREATE INDEX idx_cultural_rules_meal_type ON cultural_rules(meal_type);
```

**1.2. Criar tabela `meal_components`**
```sql
CREATE TABLE public.meal_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES onboarding_countries(country_code),
  meal_type TEXT NOT NULL,
  component_type TEXT NOT NULL, -- carbs, proteins, vegetables, etc.
  
  name TEXT NOT NULL,
  name_en TEXT,
  portion_grams INTEGER,
  portion_ml INTEGER,
  portion_label TEXT,
  
  blocked_for TEXT[] DEFAULT '{}',
  -- Ex: ["gluten", "lactose"]
  
  safe_for TEXT[] DEFAULT '{}',
  -- Ex: ["lactose"] (para "Leite sem lactose")
  
  is_alternative BOOLEAN DEFAULT false,
  -- Se é alternativa para intolerância
  
  alternatives TEXT[] DEFAULT '{}',
  -- Lista de alternativas disponíveis
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_components_country ON meal_components(country_code);
CREATE INDEX idx_meal_components_meal_type ON meal_components(meal_type);
CREATE INDEX idx_meal_components_type ON meal_components(component_type);
CREATE INDEX idx_meal_components_blocked ON meal_components USING GIN(blocked_for);
CREATE INDEX idx_meal_components_safe ON meal_components USING GIN(safe_for);
```

**1.3. Popular dados iniciais (Migration)**
- Migrar dados hardcoded de `MEAL_COMPONENTS` para `meal_components`
- Migrar dados de `MEAL_STRUCTURES` para `cultural_rules`
- Para países BR, US, PT, MX, ES, AR

---

### **FASE 2: Criar Sistema de Fallback** (1-2h)

**2.1. Implementar `CULTURAL_FALLBACK_HIERARCHY`**
- Definir hierarquia de fallback por similaridade cultural
- GB → US → BR
- CL → AR → MX → ES
- PE → MX → CO → ES

**2.2. Implementar `loadCulturalRulesForCountry()`**
- Buscar regras do país
- Se não encontrar, usar fallback
- Logar qual país está sendo usado como fallback

**2.3. Implementar `loadMealComponentsForCountry()`**
- Buscar componentes do país
- Se não encontrar, usar fallback
- Aplicar filtro de intolerância

---

### **FASE 3: Modificar populate-meal-pool** (2-3h)

**3.1. Adicionar sincronização automática**
```typescript
// No início da função serve()
const activeCountries = await syncCountriesFromOnboarding(supabaseClient);

// Validar se country_code está ativo
if (!activeCountries.includes(country_code)) {
  return new Response(
    JSON.stringify({ error: `Country ${country_code} is not active in onboarding` }),
    { status: 400 }
  );
}
```

**3.2. Substituir MEAL_COMPONENTS hardcoded**
```typescript
// ANTES (hardcoded):
const components = MEAL_COMPONENTS[componentType];

// DEPOIS (dinâmico):
const components = await loadMealComponentsForCountry(
  supabaseClient,
  country_code,
  meal_type,
  intolerance_filter
);
```

**3.3. Substituir MEAL_STRUCTURES hardcoded**
```typescript
// ANTES (hardcoded):
const structure = MEAL_STRUCTURES[meal_type];

// DEPOIS (dinâmico):
const culturalRule = await loadCulturalRulesForCountry(
  supabaseClient,
  country_code,
  meal_type
);
```

**3.4. Atualizar buildMealPoolPrompt()**
- Usar dados de `culturalRule` ao invés de hardcoded
- Incluir `negative_examples` do banco
- Incluir `structure_description` do banco

---

### **FASE 4: Criar Interface de Administração** (2-3h)

**4.1. Criar página AdminCulturalRules**
- Listar regras culturais por país
- Editar regras existentes
- Adicionar novas regras para novos países
- Visualizar fallback chain

**4.2. Criar página AdminMealComponents**
- Listar componentes por país e tipo de refeição
- Adicionar/editar/remover componentes
- Marcar alternativas para intolerâncias
- Importar componentes de outro país (copiar)

**4.3. Adicionar validação de sincronização**
- Mostrar países do onboarding sem regras culturais
- Alertar sobre países sem componentes
- Sugerir países para usar como fallback

---

### **FASE 5: Atualizar mealGenerationConfig.ts** (1h)

**5.1. Deprecar REGIONAL_CONFIGS hardcoded**
- Manter apenas para fallback local
- Adicionar comentário de deprecação
- Migrar para usar banco de dados

**5.2. Criar função de carregamento dinâmico**
```typescript
export async function getRegionalConfigFromDB(
  supabase: SupabaseClient,
  countryCode: string
): Promise<RegionalConfig> {
  // Carregar do banco
  // Se não encontrar, usar fallback hardcoded
}
```

---

### **FASE 6: Testes e Validação** (2h)

**6.1. Testar com países existentes**
- Gerar refeições para BR, US, PT, MX, ES, AR
- Validar que regras culturais estão sendo aplicadas
- Verificar que componentes estão corretos

**6.2. Testar com países novos (GB, CL, PE)**
- Verificar que fallback está funcionando
- Validar que refeições fazem sentido culturalmente
- Ajustar hierarquia de fallback se necessário

**6.3. Testar adição de novo país**
- Adicionar país fictício no onboarding
- Verificar que sistema detecta automaticamente
- Validar que fallback é aplicado corretamente

---

## ⏱️ TEMPO TOTAL ESTIMADO: 10-14 HORAS

**Distribuição:**
- Fase 1 (Banco de dados): 2-3h
- Fase 2 (Fallback): 1-2h
- Fase 3 (populate-meal-pool): 2-3h
- Fase 4 (Admin UI): 2-3h
- Fase 5 (mealGenerationConfig): 1h
- Fase 6 (Testes): 2h

---

## 🎯 RESULTADO ESPERADO

### ✅ **Sistema 100% Dinâmico**
- Sincroniza automaticamente com `onboarding_countries`
- Detecta novos países sem necessidade de código
- Aplica regras culturais automaticamente via fallback

### ✅ **Escalável**
- Adicionar novo país: apenas cadastrar no onboarding
- Sistema aplica fallback inteligente automaticamente
- Admin pode adicionar regras específicas depois

### ✅ **Consistente**
- Única fonte de verdade: `onboarding_countries`
- Todas as regras culturais no banco
- Sem hardcoded, sem dessincronia

### ✅ **Manutenível**
- Interface admin para gerenciar regras
- Visualização clara de fallbacks
- Fácil adicionar/editar regras culturais

---

## 📊 FLUXO DE FUNCIONAMENTO

```
1. Admin adiciona novo país no onboarding
   ↓
2. populate-meal-pool detecta automaticamente
   ↓
3. Sistema busca regras culturais no banco
   ↓
4. Se não encontrar, usa fallback inteligente
   ↓
5. Gera refeições culturalmente apropriadas
   ↓
6. Admin pode adicionar regras específicas depois
   ↓
7. Sistema passa a usar regras específicas
```

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

1. **Migração gradual**
   - Manter hardcoded como fallback durante transição
   - Migrar país por país para o banco
   - Validar antes de remover hardcoded

2. **Performance**
   - Cache de regras culturais em memória
   - Carregar uma vez por execução da função
   - Índices otimizados no banco

3. **Fallback inteligente**
   - Hierarquia baseada em similaridade cultural real
   - Logar quando fallback é usado
   - Permitir admin customizar fallback

4. **Validação**
   - Validar que país existe no onboarding antes de gerar
   - Alertar se país não tem regras culturais
   - Sugerir fallback apropriado

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar este plano**
2. **Implementar Fase 1 (Banco de dados)**
3. **Popular dados iniciais**
4. **Testar com países existentes**
5. **Implementar fases seguintes incrementalmente**

---

**Este plano garante que o sistema seja 100% dinâmico e escalável para qualquer número de países!**
