# ⚡ GUIA RÁPIDO - Sincronização Automática

## 🎯 O QUE VOCÊ PRECISA SABER

### **Quando adicionar um novo ingrediente:**

```typescript
// 1. Edite: supabase/functions/_shared/meal-ingredients-db.ts
grilled_cod: { 
  kcal: 105, 
  prot: 23, 
  carbs: 0, 
  fat: 1.2, 
  fiber: 0, 
  portion: 120, 
  contains: [], 
  display_name_pt: "Bacalhau grelhado", 
  display_name_en: "Grilled cod" 
},
```

```bash
# 2. Execute:
npm run sync:ingredients

# 3. Pronto! ✨
# O ingrediente está automaticamente em:
# - Banco de dados (ingredient_pool)
# - Painel Admin
# - Pool de refeições
# - Gerador de planos
```

---

## 🚀 COMANDOS DISPONÍVEIS

```bash
# Sincronizar uma vez:
npm run sync:ingredients

# Sincronizar e observar mudanças:
npm run sync:ingredients:watch
```

---

## ⚙️ CONFIGURAÇÃO INICIAL (APENAS UMA VEZ)

### **1. Executar Migration SQL**
```bash
supabase db push
```

### **2. Configurar .env.local**
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### **3. Instalar tsx (se necessário)**
```bash
npm install -D tsx
```

---

## 🔄 FLUXO AUTOMÁTICO

```
Você adiciona ingrediente → npm run sync:ingredients → Tudo sincronizado! ✨
```

**O sistema automaticamente:**
- ✅ Calcula macros por 100g
- ✅ Infere categoria (protein, carbs, etc.)
- ✅ Insere/atualiza no banco
- ✅ Dispara triggers SQL
- ✅ Invalida cache
- ✅ Notifica sistemas dependentes

---

## 📊 VERIFICAR SINCRONIZAÇÃO

```sql
-- Ver ingredientes recentes:
SELECT * FROM ingredients_sync_status
ORDER BY updated_at DESC
LIMIT 10;

-- Contar por categoria:
SELECT category, COUNT(*) 
FROM ingredient_pool 
GROUP BY category;
```

---

## 🐛 PROBLEMAS COMUNS

### **Erro: "Cannot find module"**
```bash
# Solução: Instale tsx
npm install -D tsx
```

### **Erro: "Unauthorized"**
```bash
# Solução: Configure SUPABASE_SERVICE_ROLE_KEY no .env.local
# (não use ANON_KEY, use SERVICE_ROLE_KEY)
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, veja: `SISTEMA_SINCRONIZACAO_AUTOMATICA.md`

---

## ✅ CHECKLIST

- [ ] Migration SQL executada
- [ ] .env.local configurado
- [ ] tsx instalado
- [ ] Primeiro sync executado com sucesso

**Depois disso, é só usar `npm run sync:ingredients` sempre que adicionar ingredientes!** 🎉
