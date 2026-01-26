# 🚨 CORREÇÃO VIA BROWSER - INSTRUÇÕES

## 📋 PROBLEMA
As refeições existentes no banco não têm `blocked_for_intolerances` preenchido, então os filtros não funcionam.

## ✅ SOLUÇÃO MANUAL

### Passo 1: Abrir Console do Navegador
1. Abra o AdminMealPool no navegador
2. Pressione **F12** para abrir DevTools
3. Vá para a aba **Console**
4. Cole o código abaixo e pressione **Enter**

### Passo 2: Executar Código de Correção

```javascript
// Copie e cole este código no console do navegador
(async function fixMealIntolerances() {
  console.log("🔧 Iniciando correção de intolerâncias...");
  
  try {
    // Usar o client Supabase já existente na página
    const supabase = window.supabase;
    
    if (!supabase) {
      console.error("❌ Supabase client não encontrado. Execute na página do AdminMealPool.");
      return;
    }
    
    // 1. Buscar todas as refeições
    console.log("📊 Buscando refeições...");
    const { data: allMeals, error: fetchError } = await supabase
      .from('meal_combinations')
      .select('id, name, components, blocked_for_intolerances');
    
    if (fetchError) {
      console.error("❌ Erro ao buscar refeições:", fetchError);
      return;
    }
    
    console.log(`✓ Encontradas ${allMeals.length} refeições`);
    
    // 2. Identificar refeições com ovo
    const mealsWithEgg = allMeals.filter(meal => {
      const nameHasEgg = meal.name?.toLowerCase().includes('ovo') || 
                         meal.name?.toLowerCase().includes('egg') ||
                         meal.name?.toLowerCase().includes('omelete') ||
                         meal.name?.toLowerCase().includes('omelet');
      
      const componentsHaveEgg = meal.components?.some(c => 
        c.name?.toLowerCase().includes('ovo') || 
        c.name?.toLowerCase().includes('egg') ||
        c.name?.toLowerCase().includes('omelete') ||
        c.name?.toLowerCase().includes('omelet')
      );
      
      return nameHasEgg || componentsHaveEgg;
    });
    
    console.log(`✓ ${mealsWithEgg.length} refeições com ovo encontradas`);
    
    // 3. Filtrar as que NÃO estão marcadas
    const needsUpdate = mealsWithEgg.filter(meal => {
      const blocked = meal.blocked_for_intolerances || [];
      return !blocked.includes('egg') && !blocked.includes('eggs');
    });
    
    console.log(`⚠️  ${needsUpdate.length} refeições precisam ser atualizadas`);
    
    if (needsUpdate.length === 0) {
      console.log("✅ Todas as refeições com ovo já estão marcadas!");
      return;
    }
    
    // 4. Mostrar exemplos
    console.log("📋 Exemplos que serão corrigidos:");
    needsUpdate.slice(0, 5).forEach(meal => {
      console.log(`  - ${meal.name}`);
      console.log(`    blocked_for atual: ${JSON.stringify(meal.blocked_for_intolerances)}`);
    });
    
    // 5. Atualizar refeições
    console.log(`🔧 Atualizando ${needsUpdate.length} refeições...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const meal of needsUpdate) {
      try {
        const currentBlocked = meal.blocked_for_intolerances || [];
        const newBlocked = [...currentBlocked, 'egg'];
        
        const { error } = await supabase
          .from('meal_combinations')
          .update({ blocked_for_intolerances: newBlocked })
          .eq('id', meal.id);
        
        if (error) {
          console.error(`  ❌ Erro ao atualizar "${meal.name}": ${error.message}`);
          errors++;
        } else {
          updated++;
          if (updated % 10 === 0) {
            console.log(`  ✓ ${updated}/${needsUpdate.length} atualizadas...`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Erro ao atualizar "${meal.name}": ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Atualização concluída:`);
    console.log(`   Sucesso: ${updated}`);
    console.log(`   Erros: ${errors}`);
    
    // 6. Verificar resultado
    console.log("\n🔍 Verificando resultado...");
    const { data: verifyMeals } = await supabase
      .from('meal_combinations')
      .select('id, name, blocked_for_intolerances')
      .in('id', needsUpdate.map(m => m.id));
    
    const stillWrong = verifyMeals?.filter(meal => {
      const blocked = meal.blocked_for_intolerances || [];
      return !blocked.includes('egg');
    });
    
    if (stillWrong && stillWrong.length > 0) {
      console.log(`⚠️  ${stillWrong.length} refeições ainda sem marcação correta`);
    } else {
      console.log(`✅ Todas as refeições agora estão marcadas com 'egg'!`);
      console.log(`\n🎉 SUCESSO! Execute os próximos passos:`);
      console.log(`1. Recarregue a página (F5)`);
      console.log(`2. Selecione '🥚 Sem Ovo'`);
      console.log(`3. Clique em 'Filtrar'`);
      console.log(`4. Nenhuma refeição com ovo deve aparecer!`);
    }
    
  } catch (error) {
    console.error("\n❌ Erro na correção:", error.message);
  }
})();
```

### Passo 3: Verificar Resultado
Após executar o código:
1. **Recarregue a página** (F5)
2. Selecione **"🥚 Sem Ovo"**
3. Clique em **"Filtrar"**
4. ✅ **Nenhuma refeição com ovo deve aparecer**

---

## 📝 NOTAS IMPORTANTES

- Este código só funciona se executado na página do AdminMealPool
- Ele usa o client Supabase já autenticado da sua sessão
- A correção é permanente - as refeições ficarão marcadas no banco
- Execute apenas uma vez

## 🎯 RESULTADO ESPERADO

```
🔧 Iniciando correção de intolerâncias...
📊 Buscando refeições...
✓ Encontradas 150 refeições
✓ 37 refeições com ovo encontradas
⚠️  37 refeições precisam ser atualizadas
🔧 Atualizando 37 refeições...
✅ Atualização concluída:
   Sucesso: 37
   Erros: 0
✅ Todas as refeições agora estão marcadas com 'egg'!

🎉 SUCESSO! Execute os próximos passos:
1. Recarregue a página (F5)
2. Selecione '🥚 Sem Ovo'
3. Clique em 'Filtrar'
4. Nenhuma refeição com ovo deve aparecer!
```
