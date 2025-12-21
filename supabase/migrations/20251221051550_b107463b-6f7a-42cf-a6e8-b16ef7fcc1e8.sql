-- Tabela para armazenar assinaturas dos usuários (gerenciamento manual pelo admin)
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  plan_name text NOT NULL DEFAULT 'free',
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para registro de ocorrências/atividades do usuário
CREATE TABLE public.user_occurrences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  description text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_occurrences ENABLE ROW LEVEL SECURITY;

-- Políticas para user_subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Políticas para user_occurrences
CREATE POLICY "Admins can view all occurrences"
ON public.user_occurrences
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert occurrences"
ON public.user_occurrences
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete occurrences"
ON public.user_occurrences
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();