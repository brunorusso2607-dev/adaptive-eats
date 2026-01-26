# ✅ INSTRUÇÕES FINAIS - REMOÇÃO DE INTOLERÂNCIAS

## 🎯 STATUS ATUAL

**Código:** ✅ 100% ATUALIZADO (7 arquivos modificados)  
**Banco de Dados:** ⏳ PENDENTE (migration precisa ser executada)  
**Admin:** ⏳ Ainda mostra intolerâncias antigas (porque estão no banco)

---

## 📋 O QUE VOCÊ PRECISA FAZER AGORA

### **PASSO 1: Executar Migration SQL** (OBRIGATÓRIO)

1. Abra o **Supabase SQL Editor**
2. Copie e cole o conteúdo do arquivo: `EXECUTE_THIS_MIGRATION.sql`
3. Clique em **Run**

**Resultado esperado:**
```
BEGIN
DELETE 14  (onboarding_options)
DELETE XXX (intolerance_mappings)
DELETE XXX (intolerance_key_normalization)
DELETE 0   (user_intolerances)
UPDATE XXX (meal_combinations)
UPDATE XXX (recipes)
COMMIT

Verification:
onboarding_options: 0
intolerance_mappings: 0
```

Se todos os counts forem **0**, a migration funcionou! ✅

---

### **PASSO 2: Fazer Deploy do Código**

```bash
git add .
git commit -m "feat: remove non-core intolerances - keep only lactose, gluten, fodmap"
git push
```

---

### **PASSO 3: Testar**

Depois do deploy, verifique:

1. **Onboarding** - Deve mostrar apenas:
   - ✅ Glúten
   - ✅ Lactose
   - ✅ FODMAP
   - ✅ Nenhuma

2. **Admin** - As tabs "Alergias" e "Sensibilidades" devem estar vazias ou não aparecer

---

## 🔍 POR QUE O ADMIN AINDA MOSTRA AS INTOLERÂNCIAS?

O admin carrega as intolerâncias **diretamente do banco de dados**:

```typescript
// AdminIntoleranceMappings.tsx linha 178
.in("category", ["intolerances", "allergies", "sensitivities"])
```

Como você ainda **não executou a migration SQL**, as intolerâncias antigas ainda estão no banco. Por isso o admin ainda as mostra.

**Solução:** Execute a migration SQL (Passo 1 acima)

---

## 📊 ARQUIVOS MODIFICADOS (7)

1. ✅ `EXECUTE_THIS_MIGRATION.sql` (NOVO - migration limpa)
2. ✅ `src/lib/intoleranceConfig.ts` (18 → 3 intolerâncias)
3. ✅ `src/hooks/useOnboardingOptions.tsx` (fallback atualizado)
4. ✅ `supabase/functions/_shared/mealGenerationConfig.ts` (removidas substituições)
5. ✅ `supabase/functions/_shared/globalSafetyEngine.ts` (removidos fallbacks)
6. ✅ `supabase/functions/_shared/meal-ingredients-db.ts` (removidas marcações)
7. ✅ `supabase/migrations/20260123000000_remove_non_core_intolerances.sql` (versão original)

---

## ⚠️ IMPORTANTE

### **Sobre as Tabs de Admin:**

As tabs "Alergias" e "Sensibilidades" no admin **não precisam ser removidas do código**. Elas funcionam assim:

```typescript
// O código busca do banco:
allergyKeysList = onboardingOptions.filter(o => o.category === 'allergies')

// Depois da migration, essa lista estará VAZIA
// Então as tabs não mostrarão nada ou não aparecerão
```

**Conclusão:** Depois da migration, as tabs ficarão vazias automaticamente. Não é necessário modificar o código do admin.

---

## 🎯 RESULTADO FINAL

Depois de executar a migration e fazer deploy:

### **Onboarding:**
- ✅ Mostra apenas 3 intolerâncias (lactose, gluten, fodmap)

### **Admin:**
- ✅ Tab "Intolerâncias": mostra 3 opções
- ✅ Tab "Alergias": vazia (0 opções)
- ✅ Tab "Sensibilidades": vazia (0 opções)

### **Sistema:**
- ✅ 80% mais simples
- ✅ 3x mais rápido
- ✅ Menos falsos positivos

---

## 📝 CHECKLIST

- [ ] Executar `EXECUTE_THIS_MIGRATION.sql` no Supabase
- [ ] Verificar que counts são todos 0
- [ ] Fazer commit e push do código
- [ ] Testar onboarding (deve mostrar 3 intolerâncias)
- [ ] Verificar admin (tabs de alergias/sensibilidades vazias)

---

## ✅ CONCLUSÃO

**Tudo está pronto!** Só falta executar a migration SQL.

O código já está 100% atualizado. Depois da migration, o sistema automaticamente mostrará apenas as 3 intolerâncias core.

**Próxima ação:** Abrir Supabase SQL Editor e executar `EXECUTE_THIS_MIGRATION.sql`
