-- Tabela para armazenar ingredientes bloqueados para revisão
CREATE TABLE public.blocked_ingredients_review (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient TEXT NOT NULL,
  blocked_reason TEXT NOT NULL,
  intolerance_or_diet TEXT NOT NULL,
  recipe_context TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_analysis TEXT,
  ai_decision TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_blocked_ingredients_status ON public.blocked_ingredients_review(status);
CREATE INDEX idx_blocked_ingredients_ingredient ON public.blocked_ingredients_review(ingredient);

-- Tabela para exceções dinâmicas validadas pela IA
CREATE TABLE public.dynamic_safe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient TEXT NOT NULL,
  safe_for TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai_review',
  confidence TEXT DEFAULT 'high',
  review_id UUID REFERENCES public.blocked_ingredients_review(id),
  approved_by TEXT DEFAULT 'ai',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ingredient, safe_for)
);

-- Índice para busca rápida
CREATE INDEX idx_dynamic_safe_active ON public.dynamic_safe_ingredients(is_active, safe_for);

-- Enable RLS
ALTER TABLE public.blocked_ingredients_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_safe_ingredients ENABLE ROW LEVEL SECURITY;

-- Policies para blocked_ingredients_review
CREATE POLICY "Service can insert blocked ingredients"
ON public.blocked_ingredients_review FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update blocked ingredients"
ON public.blocked_ingredients_review FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all blocked ingredients"
ON public.blocked_ingredients_review FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blocked ingredients"
ON public.blocked_ingredients_review FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para dynamic_safe_ingredients
CREATE POLICY "Anyone can view active safe ingredients"
ON public.dynamic_safe_ingredients FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all safe ingredients"
ON public.dynamic_safe_ingredients FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert safe ingredients"
ON public.dynamic_safe_ingredients FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update safe ingredients"
ON public.dynamic_safe_ingredients FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete safe ingredients"
ON public.dynamic_safe_ingredients FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_dynamic_safe_ingredients_updated_at
BEFORE UPDATE ON public.dynamic_safe_ingredients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();