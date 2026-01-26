# 🔧 FIX PARA ERRO "Database error creating new user"

## ❌ PROBLEMA IDENTIFICADO

A tabela `profiles` tem Row Level Security (RLS) que bloqueia o Service Role de criar perfis automaticamente.

## ✅ SOLUÇÃO

Execute este SQL no Supabase SQL Editor:

```sql
-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policy that allows both users and service role
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );
```

## 📋 COMO APLICAR

1. Acesse: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/sql/new
2. Cole o SQL acima
3. Clique em "Run"
4. Teste novamente abrindo: `c:\adaptive-eats-main\TEST_DIRETO.html`

## 🎯 APÓS APLICAR

O erro "Database error creating new user" deve desaparecer e a criação de usuários vai funcionar.
