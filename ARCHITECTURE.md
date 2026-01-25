# ReceitAI - Arquitetura de Segurança Alimentar

## 🚨 REGRAS CRÍTICAS - NUNCA VIOLAR

### ❌ PROIBIDO:
1. **NUNCA** adicionar listas hardcoded de ingredientes em edge functions
2. **NUNCA** criar novas tabelas para restrições alimentares
3. **NUNCA** editar `globalSafetyEngine.ts` para adicionar ingredientes
4. **NUNCA** usar queries com limit < 5000 para `intolerance_mappings`
5. **NUNCA** calcular macros ANTES de validar segurança
6. **NUNCA** remover termos genéricos de listas sem testar falsos positivos

### ✅ OBRIGATÓRIO:
1. **SEMPRE** usar `globalSafetyEngine.ts` para validações
2. **SEMPRE** atualizar dados via SQL nas tabelas do banco
3. **SEMPRE** executar `test-security-validation` após mudanças
4. **SEMPRE** verificar segurança ANTES de calcular nutrientes

---

## 🔒 Fonte Única de Verdade: `globalSafetyEngine.ts`

O arquivo `supabase/functions/_shared/globalSafetyEngine.ts` é o **motor central** que lê TODAS as restrições alimentares do banco de dados com cache de 2 minutos.

---

## 📊 Tabelas de Segurança (Fonte de Dados)

| Tabela | Propósito | Exemplo |
|--------|-----------|---------|
| `intolerance_mappings` | Ingredientes proibidos por intolerância | `lactose` → `leite, queijo, manteiga` |
| `intolerance_safe_keywords` | Palavras que isentam alimentos | `lactose` → `zero lactose, sem lactose` |
| `dietary_forbidden_ingredients` | Ingredientes proibidos por dieta | `vegano` → `carne, leite, ovos` |
| `intolerance_key_normalization` | Normalização de chaves | `gluten` → `glúten` |
| `dynamic_safe_ingredients` | Falsos positivos aprovados por IA | `azeite` seguro para `lactose` |
| `dietary_profiles` | Perfis dietéticos disponíveis | `vegano`, `vegetariano`, `flexitariano` |

---

## 🛡️ Veto Layer - Arquitetura de Validação

### Ordem de Processamento (CRÍTICO)
```
1. CARREGAR restrições do usuário (intolerâncias, dieta, exclusões)
2. VALIDAR segurança de cada ingrediente via validateFood()
3. SE ingrediente proibido → is_safe=false, alert_level=CRITICAL
4. SOMENTE DEPOIS calcular macros/nutrientes
```

### Funções que DEVEM usar validateFood
- `generate-ai-meal-plan`
- `generate-recipe`
- `regenerate-meal`
- `regenerate-ai-meal-alternatives`
- `analyze-food-photo`
- `analyze-label-photo`
- `analyze-fridge-photo`
- `suggest-meal-alternatives`

---

## 🔄 Fluxo de Correção de Falsos Positivos

```
1. Usuário reporta falso positivo
   ↓
2. Admin atualiza tabela no banco:
   - intolerance_safe_keywords (para isentar termo)
   - dynamic_safe_ingredients (para aprovar ingrediente específico)
   ↓
3. globalSafetyEngine recarrega dados (cache 2min)
   ↓
4. Todos os módulos recebem correção automaticamente
```

---

## 🧪 Testes de Segurança

### Executar Testes
```bash
# Via edge function
curl -X POST https://upnqkxrvtimtlqsuuvci.supabase.co/functions/v1/test-security-validation

# Via edge function de módulos
curl -X POST https://upnqkxrvtimtlqsuuvci.supabase.co/functions/v1/run-module-tests
```

### Cobertura de Testes
- 48+ cenários de segurança
- 17 intolerâncias testadas
- Multi-idioma (PT, EN, ES, FR, DE, IT)
- Perfis dietéticos (vegano, vegetariano, pescetariano)

---

## 📁 Arquivos Relacionados

| Arquivo | Propósito |
|---------|-----------|
| `supabase/functions/_shared/globalSafetyEngine.ts` | Motor central (lê banco, cache 2min) |
| `supabase/functions/_shared/mealGenerationConfig.ts` | Config de geração + validateFood() |
| `supabase/functions/_shared/recipeConfig.ts` | Config de receitas (usa engine) |
| `supabase/functions/test-security-validation/index.ts` | Testes automatizados de segurança |
| `src/lib/safetyFallbacks.ts` | Labels cosméticos (frontend) |
| `src/hooks/useSafetyLabels.tsx` | Hook para labels (frontend) |

---

## 🏗️ Para Adicionar Nova Intolerância

1. Inserir em `onboarding_options` (categoria: `intolerances`)
2. Inserir ingredientes em `intolerance_mappings`
3. Inserir keywords seguras em `intolerance_safe_keywords` (se aplicável)
4. Adicionar normalização em `intolerance_key_normalization`
5. Atualizar `src/lib/safetyFallbacks.ts` (fallback cosmético)
6. **EXECUTAR** `test-security-validation` para validar

**Pronto!** O sistema já funciona sem alterar código.

---

## ⚠️ Lições Aprendidas (Evitar Regressões)

### Problema: Query com Limit Baixo
- **Causa**: Query padrão do Supabase limita a 1000 registros
- **Sintoma**: Ingredientes não eram bloqueados corretamente
- **Solução**: Usar `.limit(5000)` em queries de `intolerance_mappings`

### Problema: Termo Genérico Causa Falso Positivo
- **Exemplo**: `'ei'` (alemão para ovo) bloqueava `'feijao'`
- **Solução**: Remover termos muito curtos/genéricos de listas hardcoded

### Problema: Chaves de Onboarding vs Banco
- **Exemplo**: Usuário seleciona `amendoim`, banco usa `peanut`
- **Solução**: Usar `intolerance_key_normalization` para mapear

---

## 📈 Métricas de Segurança

- **Taxa de detecção**: 100% para ingredientes mapeados
- **Falsos positivos conhecidos**: Tratados via `intolerance_safe_keywords`
- **Cobertura de idiomas**: 6 idiomas principais
- **Tempo de propagação de correções**: 2 minutos (cache TTL)
