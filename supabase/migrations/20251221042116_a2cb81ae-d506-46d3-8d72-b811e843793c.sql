-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função segura para verificar role (SECURITY DEFINER evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: Admins podem ver todas as roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Usuários podem ver suas próprias roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Apenas admins podem inserir roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Apenas admins podem atualizar roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Apenas admins podem deletar roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atribuir admin automaticamente ao email específico
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o email for brunorusso212@gmail.com, atribui role admin
  IF NEW.email = 'brunorusso212@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger que executa após criar usuário
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_role();

-- Inserir admin para usuário existente (se já existe)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'brunorusso212@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;