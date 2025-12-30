# ReceitAI - Arquitetura de Segurança Alimentar

## 🔒 Fonte Única de Verdade: `globalSafetyEngine.ts`

O arquivo `supabase/functions/_shared/globalSafetyEngine.ts` é o **motor central** que lê TODAS as restrições alimentares do banco de dados. **Nunca edite este arquivo para adicionar/remover ingredientes** - apenas atualize as tabelas do banco.

---

## 📊 Tabelas de Segurança (Fonte de Dados)

| Tipo de Correção | Tabela | Exemplo |
|------------------|--------|---------|
| Ingrediente proibido por **intolerância** | `intolerance_mappings` | `lactose` → `leite, queijo, manteiga` |
| Palavra-chave **segura** (evita falso positivo) | `intolerance_safe_keywords` | `lactose` → `zero lactose, sem lactose` |
| Ingrediente proibido por **dieta** | `dietary_forbidden_ingredients` | `vegano` → `carne, leite, ovos` |
| Normalização de chaves | `intolerance_key_normalization` | `gluten` → `glúten` |
| Falso positivo aprovado por IA | `dynamic_safe_ingredients` | `azeite` seguro para `lactose` |
| Perfis dietéticos disponíveis | `dietary_profiles` | `vegano`, `vegetariano`, `flexitariano` |

---

## ⚠️ REGRAS OBRIGATÓRIAS

### ✅ FAZER:
- Atualizar dados nas tabelas acima via SQL (INSERT/UPDATE/DELETE)
- Usar `globalSafetyEngine.ts` para validações em edge functions
- Importar de `globalSafetyEngine.ts` em novos módulos

### ❌ NUNCA FAZER:
- Criar novas tabelas para restrições alimentares
- Adicionar listas hardcoded em edge functions
- Editar `globalSafetyEngine.ts` para adicionar ingredientes
- Duplicar lógica de validação em outros arquivos

---

## 🔄 Fluxo de Correção

```
1. Usuário reporta falso positivo
   ↓
2. Admin atualiza tabela no banco (ex: intolerance_safe_keywords)
   ↓
3. globalSafetyEngine recarrega dados (cache 5min)
   ↓
4. Todos os módulos recebem correção automaticamente:
   - analyze-food-photo
   - analyze-label-photo
   - analyze-fridge-photo
   - generate-ai-meal-plan
   - generate-recipe
   - regenerate-meal
   - suggest-meal-alternatives
```

---

## 📁 Arquivos Relacionados

| Arquivo | Propósito |
|---------|-----------|
| `supabase/functions/_shared/globalSafetyEngine.ts` | Motor central (lê banco) |
| `supabase/functions/_shared/mealGenerationConfig.ts` | Config de geração (usa engine) |
| `supabase/functions/_shared/recipeConfig.ts` | Config de receitas (usa engine) |
| `src/lib/safetyFallbacks.ts` | Labels cosméticos (frontend) |
| `src/hooks/useSafetyLabels.tsx` | Hook para labels (frontend) |

---

## 🏗️ Para Adicionar Nova Intolerância

1. Inserir em `onboarding_options` (categoria: `intolerances`)
2. Inserir ingredientes em `intolerance_mappings`
3. Inserir keywords seguras em `intolerance_safe_keywords` (se aplicável)
4. Adicionar normalização em `intolerance_key_normalization`
5. Atualizar `src/lib/safetyFallbacks.ts` (fallback cosmético)

**Pronto!** O sistema já funciona sem alterar código.
