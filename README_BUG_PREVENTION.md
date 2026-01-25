# 🧪 SCRIPT DE TESTE DE PREVENÇÃO DE BUGS

Este documento explica como usar o script de teste automatizado para garantir que os bugs identificados no E2E Test não voltem a acontecer.

---

## 📋 **BUGS COBERTOS**

O script testa as correções dos seguintes bugs:

| Bug | Descrição | Severidade |
|-----|-----------|------------|
| **#1** | userCountry não propagado | 🔴 CRÍTICO |
| **#2** | Dados físicos não validados | 🔴 CRÍTICO |
| **#10** | NaN exibido em macros | 🟡 UX |
| **#4** | Colisão Regional vs Global | 🟡 FUNCIONAL |
| **#6** | Cache não invalida | 🟡 FUNCIONAL |
| **#12** | Altura em formato ambíguo | 🟠 UX |

---

## 🚀 **COMO EXECUTAR**

### **Opção 1: Script Node.js (Recomendado)**

```bash
node run_bug_prevention_tests.js
```

Este script verifica:
- ✅ Existência de arquivos críticos
- ✅ Presença de funções essenciais
- ✅ Validações implementadas
- ✅ Hooks e imports corretos

### **Opção 2: Testes Vitest (Futuro)**

```bash
npm test tests/regression/bug-prevention.test.ts
```

**Nota:** Requer instalação de dependências:
```bash
npm install -D vitest @testing-library/react
```

---

## 📊 **SAÍDA ESPERADA**

### **Sucesso (Todos os testes passam):**

```
🧪 INICIANDO TESTES DE PREVENÇÃO DE BUGS

════════════════════════════════════════════════════════════

📊 TESTE 1: Formatação de Macros - Prevenir NaN na UI
   ✅ formatCalories() existe
   ✅ formatProtein() existe
   ✅ formatCarbs() existe
   ✅ formatFat() existe
   ✅ isValidNumber() existe
   ✅ formatMacros() existe
   ✅ Retorna '--' para valores inválidos

📋 TESTE 2: Validação de Dados Físicos Obrigatórios
   ✅ Validação isPhysicalDataComplete existe
   ✅ Valida weight_current
   ✅ Valida height
   ✅ Valida age
   ✅ Valida sex
   ✅ Valida activity_level
   ✅ Botão fica disabled quando dados incompletos

🌍 TESTE 3: userCountry Propagado Corretamente
   ✅ Hook useUserCountry existe
   ✅ DEFAULT_COUNTRY definido como 'BR'
   ✅ SUPPORTED_COUNTRY_CODES definido
   ✅ MealPlanGenerator importa useUserCountry
   ✅ MealPlanGenerator passa userCountry para API

🛡️ TESTE 4: Arquitetura de Segurança
   ✅ globalSafetyEngine.ts existe
   ✅ Camada intoleranceMappings existe
   ✅ Camada cautionMappings existe
   ✅ Camada safeKeywords existe
   ✅ Camada checkSafeKeywords existe

🔄 TESTE 5: Cascata de Alimentos
   ✅ calculateRealMacros.ts existe
   ✅ Função loadCanonicalIngredients existe
   ✅ Função lookupCanonicalIngredient existe
   ✅ Função findFoodInDatabase existe
   ✅ Função calculateRealMacrosForFoods existe
   ✅ Funções aceitam userCountry como parâmetro

════════════════════════════════════════════════════════════
📊 RELATÓRIO FINAL
════════════════════════════════════════════════════════════

✅ Testes Passados: 30
❌ Testes Falhados: 0
📊 Total de Testes: 30
🎯 Taxa de Sucesso: 100.0%

🎉 TODOS OS TESTES PASSARAM! Sistema está protegido contra regressão.
```

### **Falha (Algum bug retornou):**

```
📊 TESTE 1: Formatação de Macros - Prevenir NaN na UI
   ❌ formatCalories() NÃO ENCONTRADA
   ✅ formatProtein() existe
   ...

════════════════════════════════════════════════════════════
📊 RELATÓRIO FINAL
════════════════════════════════════════════════════════════

✅ Testes Passados: 28
❌ Testes Falhados: 2
📊 Total de Testes: 30
🎯 Taxa de Sucesso: 93.3%

⚠️  ALGUNS TESTES FALHARAM! Verifique os bugs acima.
```

---

## 🔍 **O QUE CADA TESTE VERIFICA**

### **TESTE 1: Formatação de Macros**
- ✅ Arquivo `src/lib/formatMacros.ts` existe
- ✅ Funções `formatCalories`, `formatProtein`, `formatCarbs`, `formatFat` existem
- ✅ Função `isValidNumber` existe
- ✅ Retorna `'--'` para valores `null`, `undefined`, `NaN`

### **TESTE 2: Validação de Dados Físicos**
- ✅ Arquivo `src/pages/Onboarding.tsx` tem validação
- ✅ Valida `weight_current`, `height`, `age`, `sex`, `activity_level`
- ✅ Botão "Próximo" fica `disabled` quando dados incompletos

### **TESTE 3: userCountry Propagado**
- ✅ Hook `useUserCountry` existe em `src/hooks/useUserCountry.tsx`
- ✅ `DEFAULT_COUNTRY` definido como `'BR'`
- ✅ `SUPPORTED_COUNTRY_CODES` definido
- ✅ `MealPlanGenerator` importa e usa `useUserCountry`
- ✅ `MealPlanGenerator` passa `userCountry` para API

### **TESTE 4: Arquitetura de Segurança**
- ✅ `globalSafetyEngine.ts` existe
- ✅ 4 camadas implementadas: `intoleranceMappings`, `cautionMappings`, `safeKeywords`, `checkSafeKeywords`

### **TESTE 5: Cascata de Alimentos**
- ✅ `calculateRealMacros.ts` existe
- ✅ Funções da cascata existem: `loadCanonicalIngredients`, `lookupCanonicalIngredient`, `findFoodInDatabase`
- ✅ Funções aceitam `userCountry` como parâmetro

---

## 🔄 **QUANDO EXECUTAR**

Execute este script:

1. **Antes de cada commit** importante
2. **Antes de fazer merge** para main/production
3. **Após refatorações** que tocam em:
   - Cálculo de macros
   - Onboarding
   - Componentes de UI que exibem dados nutricionais
4. **Semanalmente** como parte do CI/CD

---

## 🛠️ **INTEGRAÇÃO COM CI/CD**

### **GitHub Actions**

Adicione ao `.github/workflows/test.yml`:

```yaml
name: Bug Prevention Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: node run_bug_prevention_tests.js
```

### **Pre-commit Hook**

Adicione ao `.git/hooks/pre-commit`:

```bash
#!/bin/sh
echo "🧪 Executando testes de prevenção de bugs..."
node run_bug_prevention_tests.js
if [ $? -ne 0 ]; then
  echo "❌ Testes falharam! Commit bloqueado."
  exit 1
fi
```

---

## 📝 **ADICIONANDO NOVOS TESTES**

Para adicionar testes para novos bugs:

1. Edite `run_bug_prevention_tests.js`
2. Adicione um novo bloco de teste:

```javascript
// ============================================
// TESTE X: Descrição do Bug
// ============================================
console.log("\n🔍 TESTE X: Descrição do Bug");

try {
  const filePath = path.join(__dirname, 'caminho', 'do', 'arquivo.ts');
  totalTests++;
  
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ Arquivo existe`);
    passedTests++;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    totalTests++;
    if (content.includes('funcaoEsperada')) {
      console.log(`   ✅ Função esperada existe`);
      passedTests++;
    } else {
      console.log(`   ❌ Função esperada NÃO ENCONTRADA`);
      failedTests++;
    }
  } else {
    console.log(`   ❌ Arquivo NÃO ENCONTRADO`);
    failedTests++;
  }
} catch (error) {
  console.log(`   ❌ ERRO: ${error.message}`);
  failedTests++;
}
```

---

## 🐛 **TROUBLESHOOTING**

### **Erro: "Arquivo não encontrado"**
- Verifique se está executando o script da raiz do projeto
- Verifique se os caminhos dos arquivos estão corretos

### **Erro: "Função não encontrada"**
- Verifique se a correção do bug foi implementada corretamente
- Verifique se o nome da função está correto (case-sensitive)

### **Taxa de sucesso < 100%**
- Leia os logs para identificar qual teste falhou
- Verifique o arquivo correspondente
- Reimplemente a correção se necessário

---

## 📚 **REFERÊNCIAS**

- **Bug Report Completo:** `E2E_BUG_REPORT.md`
- **Auditoria de Segurança:** `CORE_SECURITY_AUDIT_REPORT.md`
- **Testes Vitest:** `tests/regression/bug-prevention.test.ts`

---

## ✅ **CHECKLIST DE MANUTENÇÃO**

- [ ] Script executado antes de cada release
- [ ] Todos os testes passando (100%)
- [ ] Novos bugs adicionados ao script
- [ ] CI/CD configurado
- [ ] Equipe treinada para executar testes

---

**Última atualização:** 15/01/2026  
**Versão:** 1.0
