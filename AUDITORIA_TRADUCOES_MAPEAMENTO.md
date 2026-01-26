# 🔍 AUDITORIA DE TRADUÇÕES E MAPEAMENTO - UNIVERSAL INGREDIENTS

**Data:** 18/01/2026 22:30  
**Objetivo:** Validar traduções em 6 idiomas e verificar mapeamento de alimentos existentes

---

## 📋 ESCOPO DA AUDITORIA

### **1. Validação de Traduções**
- ✅ Verificar se todos os 165 ingredientes têm traduções completas
- ✅ Validar qualidade das traduções (pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT)
- ✅ Identificar traduções faltantes ou incorretas

### **2. Mapeamento de Alimentos Existentes**
- ✅ Verificar se alimentos em `canonical_ingredients` estão mapeados para `universal-ingredients-db.ts`
- ✅ Identificar alimentos sem mapeamento
- ✅ Sugerir novos ingredientes universais baseados em `canonical_ingredients`

---

## 🔍 METODOLOGIA

### **Fase 1: Auditoria de Traduções**
1. Ler todos os ingredientes de `universal-ingredients-db.ts`
2. Verificar presença de traduções para os 6 idiomas obrigatórios
3. Validar formato e completude das traduções
4. Gerar relatório de problemas

### **Fase 2: Análise de Mapeamento**
1. Consultar tabela `canonical_ingredients` no Supabase
2. Comparar com ingredientes em `universal-ingredients-db.ts`
3. Identificar gaps (alimentos canônicos sem equivalente universal)
4. Priorizar alimentos mais usados para mapeamento

---

## 📊 ESTRUTURA ESPERADA

Cada ingrediente DEVE ter:

```typescript
{
  id: "ingredient_id",
  category: "protein|carb|vegetable|fruit|fat|beverage|dairy",
  macros: { kcal, prot, carbs, fat, fiber },
  portion_default: number,
  countries: ["BR", "US", "PT", "ES", "FR", "DE", "IT", "MX", "AR", "CL", "PE", "GB"],
  allergens_dynamic: boolean,
  allergens_static: string[],
  i18n: {
    "pt-BR": { name: "..." },  // ✅ OBRIGATÓRIO
    "en-US": { name: "..." },  // ✅ OBRIGATÓRIO
    "es-ES": { name: "..." },  // ✅ OBRIGATÓRIO
    "fr-FR": { name: "..." },  // ✅ OBRIGATÓRIO
    "de-DE": { name: "..." },  // ✅ OBRIGATÓRIO
    "it-IT": { name: "..." }   // ✅ OBRIGATÓRIO
  }
}
```

---

## 🎯 CRITÉRIOS DE VALIDAÇÃO

### **Traduções Válidas**
- ✅ Nome não vazio
- ✅ Nome não é placeholder ("TODO", "TBD", etc.)
- ✅ Nome não é cópia literal de outro idioma (exceto nomes próprios)
- ✅ Nome faz sentido cultural (ex: "Pão" em PT, "Bread" em EN, não "Pan" em EN)

### **Traduções Inválidas**
- ❌ Campo `name` vazio ou undefined
- ❌ Texto genérico ("Food", "Alimento", "Comida")
- ❌ Cópia exata de outro idioma sem justificativa
- ❌ Caracteres especiais incorretos

---

## 📝 PRÓXIMOS PASSOS

1. **Executar script de validação** em `universal-ingredients-db.ts`
2. **Consultar `canonical_ingredients`** no Supabase
3. **Gerar relatório detalhado** com:
   - Ingredientes com traduções incompletas
   - Ingredientes canônicos sem mapeamento universal
   - Sugestões de novos ingredientes universais
4. **Corrigir problemas identificados**

---

## 🔧 FERRAMENTAS NECESSÁRIAS

- ✅ Acesso ao arquivo `universal-ingredients-db.ts`
- ✅ Acesso ao Supabase (tabela `canonical_ingredients`)
- ✅ Script de validação TypeScript
- ✅ Comparador de dados

---

**Status:** 🔄 Iniciando auditoria...
