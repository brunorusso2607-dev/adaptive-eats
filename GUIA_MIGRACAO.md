# 🚀 Guia Completo de Migração - Lovable → Supabase

## Status Atual
✅ Banco de dados novo está pronto (todas as tabelas criadas, mas vazias)  
✅ Service Role Key configurada  
❌ Dados do sistema original precisam ser restaurados

---

## 📦 Arquivos Criados para Migração

### Seeds SQL (dados base)
1. **`supabase/seed_onboarding.sql`** - Países, categorias e opções do onboarding
2. **`supabase/seed_global_configs.sql`** - Horários, idiomas, sintomas, flags, perfis
3. **`supabase/seed_food_safety_basic.sql`** - Intolerâncias e dietas (versão básica)

### Scripts de Aplicação
1. **`apply_seeds_simple.js`** - Aplica seeds de forma simples e direta (RECOMENDADO)
2. **`apply_seeds.js`** - Versão alternativa via SQL direto

---

## 🎯 PASSO A PASSO - Migração Completa

### **FASE 1: Aplicar Seeds de Configuração** ⏱️ ~2 minutos

Execute o script que aplica todos os dados de configuração:

```bash
cd c:\adaptive-eats-main
node apply_seeds_simple.js
```

**O que isso faz:**
- ✅ Insere 4 países (BR, PT, US, GB)
- ✅ Insere 7 categorias do onboarding
- ✅ Insere ~15 opções principais (intolerâncias, alergias, preferências, objetivos)
- ✅ Insere horários de refeições
- ✅ Insere idiomas suportados
- ✅ Insere tipos de sintomas
- ✅ Insere feature flags
- ✅ Insere perfis dietéticos

**Validação:**
1. Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/editor
2. Abra a tabela `onboarding_countries` - deve ter 4 registros
3. Abra a tabela `onboarding_options` - deve ter ~15 registros
4. Acesse o Admin do app → Onboarding - deve mostrar os dados

---

### **FASE 2: Popular Base de Alimentos** ⏱️ ~30-60 minutos

Agora vamos popular a tabela `foods` com dados de bases públicas.

#### **2.1 - BAM (México) - Mais Rápido** ⏱️ ~2 minutos
```bash
# Via Supabase Dashboard:
# 1. Vá em Database → Functions
# 2. Execute: import-bam-foods
# Ou via curl:
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/import-bam-foods \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
**Resultado:** ~309 alimentos mexicanos

#### **2.2 - TACO (Brasil)** ⏱️ ~5 minutos
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/import-taco-foods \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
**Resultado:** ~500+ alimentos brasileiros

#### **2.3 - TBCA (Brasil)** ⏱️ ~10 minutos
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/import-tbca-foods \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
**Resultado:** ~3.000+ alimentos brasileiros

#### **2.4 - CIQUAL (França)** ⏱️ ~15 minutos
O arquivo já existe em `public/data/ciqual_france_2020.xls`

```bash
# Via Dashboard:
# 1. Upload do arquivo para Supabase Storage (bucket: app-assets)
# 2. Execute a função passando o storagePath
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/import-ciqual-foods \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{"storagePath": "ciqual_france_2020.xls"}'
```
**Resultado:** ~2.800+ alimentos franceses

#### **2.5 - McCance (UK)** ⏱️ ~10 minutos
```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/import-mccance-foods \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{"source": "old_foods", "batchSize": 100}'
```
**Resultado:** ~600+ alimentos britânicos

**Total esperado após todas as importações: ~7.000+ alimentos**

---

### **FASE 3: Expandir Segurança Alimentar (Opcional)** ⏱️ ~30 minutos

O seed básico tem apenas ~100 ingredientes mapeados. Para cobertura completa:

#### **Opção A: Expansão via IA (Recomendado)**
```bash
# Expande TODAS as intolerâncias de uma vez
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/expand-all-intolerances \
  -H "Authorization: Bearer ..."
```
**Resultado:** ~2.000+ ingredientes mapeados

#### **Opção B: Expansão Manual por Intolerância**
```bash
# Exemplo: expandir apenas lactose
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/expand-intolerance-mappings \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{"intoleranceKey": "lactose", "count": 500}'
```

---

### **FASE 4: Popular Pool de Refeições (Opcional)** ⏱️ ~2 horas

Após ter alimentos suficientes, você pode gerar o pool de refeições:

```bash
curl -X POST https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "country": "Brasil",
    "mealType": "cafe_manha",
    "intoleranceProfile": "Sem filtro",
    "quantity": 5
  }'
```

**IMPORTANTE:** Isso consome créditos de IA (Gemini). Faça em pequenos lotes.

---

## ✅ Checklist de Validação

Após executar as fases, valide:

### **Admin → Onboarding**
- [ ] Aba "Regiões" mostra 4 países
- [ ] Aba "Intolerâncias" mostra ~5 opções
- [ ] Aba "Alergias" mostra ~7 opções
- [ ] Aba "Preferências Alimentares" mostra ~7 opções

### **Admin → Conteúdo**
- [ ] Base de Alimentos mostra 7.000+ alimentos
- [ ] Mapeamento Intolerâncias mostra 100+ (básico) ou 2.000+ (expandido)
- [ ] Proibidos por Dieta mostra ~50+ ingredientes

### **Funcionalidades do App**
- [ ] Onboarding funciona (usuário consegue selecionar opções)
- [ ] Busca de alimentos funciona
- [ ] Geração de plano alimentar funciona
- [ ] Análise de foto funciona

---

## 🚨 Troubleshooting

### Erro: "duplicate key value violates unique constraint"
**Solução:** Isso é normal! Significa que o dado já existe. Ignore.

### Erro: "relation does not exist"
**Solução:** A tabela não foi criada. Execute `supabase db push` antes.

### Importador retorna 0 alimentos
**Solução:** Verifique se a URL/arquivo está acessível. Tente novamente.

### Seeds não aplicam
**Solução:** Verifique se o Service Role Key está correto no script.

---

## 📊 Comparação: Original vs Migrado

| Item | Sistema Original | Após Migração Básica | Após Migração Completa |
|------|------------------|---------------------|----------------------|
| Países | 4 | 4 ✅ | 4 ✅ |
| Opções Onboarding | ~50 | ~15 ⚠️ | ~50 ✅ |
| Alimentos | ~10.000+ | ~7.000 ⚠️ | ~10.000+ ✅ |
| Intolerâncias Mapeadas | ~2.846 | ~100 ⚠️ | ~2.000+ ✅ |
| Pool de Refeições | ~500+ | 0 ❌ | ~500+ ✅ |

**Legenda:**
- ✅ Igual ao original
- ⚠️ Funcional mas incompleto
- ❌ Vazio (precisa gerar)

---

## 🎯 Recomendação de Execução

**Para começar a usar o sistema HOJE:**
1. Execute FASE 1 (seeds) - 2 minutos
2. Execute FASE 2.1 e 2.2 (BAM + TACO) - 7 minutos
3. Valide no Admin

**Para ter 80% do sistema original:**
1. Execute FASE 1 (seeds)
2. Execute FASE 2 completa (todos os importadores)
3. Execute FASE 3 Opção A (expansão via IA)

**Para ter 100% igual ao original:**
- Você precisaria do backup do banco original (não disponível)
- Alternativa: execute todas as fases + gere pool de refeições

---

## 📝 Notas Importantes

1. **Service Role Key:** Nunca commite no Git! Use apenas localmente.
2. **Créditos de IA:** Expansão de intolerâncias e pool de refeições consomem créditos Gemini.
3. **Tempo total:** Migração básica = 10 min | Migração completa = 2-3 horas
4. **Dados de usuários:** NÃO foram migrados (como você pediu)

---

**Criado em:** 13/01/2026  
**Versão:** 1.0  
**Projeto:** adaptive-eats-main
