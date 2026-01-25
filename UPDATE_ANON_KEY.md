# 🔑 ATUALIZAR ANON KEY - SOLUÇÃO DO ERRO

**Problema:** A ANON_KEY no código está diferente da ANON_KEY real do Supabase.

---

## ✅ CHAVE CORRETA (DO SEU SUPABASE)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.wbKQ7vKHn5UPIEGRviPiOEErrMKubpORnmQ0NctAuN8
```

---

## 📝 ONDE ATUALIZAR

### **1. Arquivo `.env` (na raiz do projeto)**

Abra o arquivo `.env` e atualize:

```env
VITE_SUPABASE_URL=https://onzdkpqtzfxzcdyxczkn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.wbKQ7vKHn5UPIEGRviPiOEErrMKubpORnmQ0NctAuN8
```

### **2. Reiniciar o servidor de desenvolvimento**

Depois de atualizar o `.env`:

```bash
# Parar o servidor (Ctrl+C no terminal)
# Iniciar novamente
npm run dev
```

---

## 🎯 POR QUE ISSO RESOLVE

O frontend usa `VITE_SUPABASE_PUBLISHABLE_KEY` do arquivo `.env` para criar o cliente Supabase. Se essa chave estiver errada, todos os tokens JWT gerados serão inválidos, causando o erro "Invalid JWT" na Edge Function.

---

## ✅ DEPOIS DE ATUALIZAR

1. **Reinicie o servidor** (`npm run dev`)
2. **Recarregue a página** no navegador (F5)
3. **Faça logout e login novamente** (para gerar novo token)
4. **Tente gerar o plano alimentar**

Deve funcionar! ✅
