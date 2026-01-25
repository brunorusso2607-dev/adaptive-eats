# 🧪 Teste do Sistema de Substituição Inteligente

## ✅ Implementação Completa

### Arquivos Criados/Modificados:

**Backend:**
- ✅ `supabase/functions/_shared/ingredientClassifier.ts` - Classificador de ingredientes
- ✅ `supabase/functions/get-ingredient-substitutes/index.ts` - Edge Function deployada

**Frontend:**
- ✅ `src/hooks/useIngredientSubstitutes.ts` - Hook React
- ✅ `src/components/IngredientSubstituteDropdown.tsx` - Componente UI
- ✅ `src/components/MealRecipeDetail.tsx` - Integrado com dropdown

## 📋 Como Testar

### Pré-requisitos:
1. Ter um plano de 30 dias gerado (usando o pool)
2. Verificar que as refeições têm `from_pool = true`
3. Ter perfil configurado com restrições (opcional)

### Passo a Passo:

1. **Gerar Plano de 30 Dias**
   ```
   - Ir em "Criar Plano Alimentar"
   - Selecionar 30 dias
   - Clicar em "Gerar Plano Alimentar"
   - Aguardar conclusão (deve usar pool, não IA)
   ```

2. **Abrir Detalhes de uma Refeição**
   ```
   - No calendário, clicar em qualquer refeição
   - Verificar se aparece badge "POOL" (confirma que veio do pool)
   - Ver lista de ingredientes com calorias
   ```

3. **Testar Substituição**
   ```
   - Passar o mouse sobre um ingrediente
   - Clicar no botão [🔄] que aparece à direita
   - Dropdown deve abrir com substituições
   - Ver badges de qualidade (Perfeito, Ótimo, Bom)
   - Ver diferença de calorias e proteína
   - Clicar em uma substituição
   - Aguardar confirmação "Ingrediente substituído!"
   - Página deve recarregar com novo ingrediente
   ```

### Cenários de Teste:

#### ✅ Teste 1: Substituir Proteína
- **Ingrediente:** Frango grelhado 100g
- **Esperado:** Ver opções como Peru, Tilápia, Carne moída
- **Validar:** Calorias similares (±20%)

#### ✅ Teste 2: Substituir Carboidrato
- **Ingrediente:** Arroz branco 100g
- **Esperado:** Ver opções como Arroz integral, Macarrão, Batata
- **Validar:** Categoria correta (carbohydrate)

#### ✅ Teste 3: Substituir Vegetal
- **Ingrediente:** Brócolis 100g
- **Esperado:** Ver opções como Couve-flor, Vagem, Abobrinha
- **Validar:** Baixas calorias mantidas

#### ✅ Teste 4: Respeitar Restrições
- **Setup:** Adicionar intolerância a lactose no perfil
- **Ingrediente:** Qualquer proteína
- **Esperado:** NÃO ver queijo, leite, iogurte nas opções
- **Validar:** Filtro de restrições funcionando

#### ✅ Teste 5: Sem Substituições
- **Ingrediente:** Ingrediente muito específico/raro
- **Esperado:** Mensagem "Nenhuma substituição disponível"
- **Validar:** Tratamento de caso vazio

### Logs para Verificar:

Abrir console do navegador (F12) e procurar:

```javascript
// Ao abrir dropdown
"Finding substitutes for:" { ingredientId, ingredientName, currentGrams }
"Original ingredient category:" "protein" // ou outra categoria
"Found X initial candidates"
"Y candidates in same category (protein)"
"Z candidates after restrictions filter"
"Returning N substitutes"

// Ao aplicar substituição
"Ingrediente substituído!" // Toast de sucesso
```

### Validações Importantes:

1. **Match Score**
   - Perfeito (verde): score ≥ 90
   - Ótimo (azul): score ≥ 75
   - Bom (cinza): score ≥ 60
   - Regular (outline): score < 60

2. **Diferença Calórica**
   - ✓ verde: ≤ 10%
   - ⚠️ amarelo: 10-20%
   - ⚠️ laranja: > 20%

3. **Recálculo de Macros**
   - Verificar que totais da refeição são atualizados
   - Conferir no banco de dados:
     ```sql
     SELECT recipe_ingredients, recipe_calories, recipe_protein 
     FROM meal_plan_items 
     WHERE id = 'ID_DA_REFEICAO';
     ```

## 🐛 Troubleshooting

### Problema: Botão [🔄] não aparece
**Causa:** Refeição não é do pool (`from_pool = false`)
**Solução:** Gerar novo plano de 30 dias (deve usar pool agora)

### Problema: Dropdown vazio
**Causa:** Não há ingredientes similares no `canonical_ingredients`
**Solução:** Normal para ingredientes muito específicos

### Problema: Erro ao substituir
**Causa:** Estrutura de dados incompatível
**Solução:** Verificar logs do console e reportar

### Problema: Macros não recalculam
**Causa:** Hook não está atualizando corretamente
**Solução:** Verificar `useIngredientSubstitutes.ts` linha 111-119

## 📊 Métricas Esperadas

- **Tempo de resposta:** < 500ms
- **Taxa de sucesso:** > 95%
- **Substituições por categoria:**
  - Proteína: 5-10 opções
  - Carboidrato: 3-8 opções
  - Vegetal: 8-15 opções
  - Gordura: 3-5 opções

## 🎯 Próximos Passos (Após Testes)

1. [ ] Melhorar UX: loading state mais claro
2. [ ] Cache de substituições (evitar buscar múltiplas vezes)
3. [ ] Botão "Desfazer" para reverter substituição
4. [ ] Analytics: track quais ingredientes são mais substituídos
5. [ ] Sugestões personalizadas baseadas em histórico
6. [ ] Mostrar impacto nos macros totais do dia

## 📝 Notas

- Sistema funciona APENAS para refeições do pool (`from_pool = true`)
- Refeições geradas por IA mantêm comportamento antigo (ícone RefreshCw)
- Substituições respeitam automaticamente intolerâncias e preferências
- Porções são ajustadas automaticamente para igualar calorias
