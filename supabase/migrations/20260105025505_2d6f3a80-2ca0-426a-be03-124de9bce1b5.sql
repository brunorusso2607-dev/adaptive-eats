
-- ============================================
-- SISTEMA DE PROTEÇÃO CONTRA REGRESSÃO v1.0
-- ============================================

-- 1. Criar tabela de auditoria para mudanças críticas
CREATE TABLE IF NOT EXISTS public.critical_changes_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  was_authorized BOOLEAN DEFAULT false,
  authorization_note TEXT
);

-- 2. Habilitar RLS na tabela de auditoria
ALTER TABLE public.critical_changes_audit ENABLE ROW LEVEL SECURITY;

-- 3. Apenas admins podem ver a auditoria
CREATE POLICY "Only admins can view critical changes audit"
  ON public.critical_changes_audit
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Trigger de auditoria para intolerance_mappings
CREATE OR REPLACE FUNCTION audit_intolerance_mappings_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('intolerance_mappings', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('intolerance_mappings', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('intolerance_mappings', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_intolerance_mappings ON intolerance_mappings;
CREATE TRIGGER audit_intolerance_mappings
  AFTER INSERT OR UPDATE OR DELETE ON intolerance_mappings
  FOR EACH ROW
  EXECUTE FUNCTION audit_intolerance_mappings_changes();

-- 5. Trigger de auditoria para dietary_forbidden_ingredients
CREATE OR REPLACE FUNCTION audit_dietary_forbidden_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('dietary_forbidden_ingredients', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('dietary_forbidden_ingredients', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('dietary_forbidden_ingredients', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_dietary_forbidden ON dietary_forbidden_ingredients;
CREATE TRIGGER audit_dietary_forbidden
  AFTER INSERT OR UPDATE OR DELETE ON dietary_forbidden_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION audit_dietary_forbidden_changes();

-- 6. Trigger de auditoria para intolerance_safe_keywords
CREATE OR REPLACE FUNCTION audit_safe_keywords_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('intolerance_safe_keywords', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('intolerance_safe_keywords', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('intolerance_safe_keywords', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_safe_keywords ON intolerance_safe_keywords;
CREATE TRIGGER audit_safe_keywords
  AFTER INSERT OR UPDATE OR DELETE ON intolerance_safe_keywords
  FOR EACH ROW
  EXECUTE FUNCTION audit_safe_keywords_changes();

-- 7. Trigger de auditoria para onboarding_options
CREATE OR REPLACE FUNCTION audit_onboarding_options_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('onboarding_options', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('onboarding_options', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('onboarding_options', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_onboarding_options ON onboarding_options;
CREATE TRIGGER audit_onboarding_options
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_options
  FOR EACH ROW
  EXECUTE FUNCTION audit_onboarding_options_changes();

-- 8. Trigger de auditoria para meal_time_settings
CREATE OR REPLACE FUNCTION audit_meal_time_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('meal_time_settings', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('meal_time_settings', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('meal_time_settings', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_meal_time_settings ON meal_time_settings;
CREATE TRIGGER audit_meal_time_settings
  AFTER INSERT OR UPDATE OR DELETE ON meal_time_settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_meal_time_settings_changes();

-- 9. Trigger de auditoria para dietary_profiles
CREATE OR REPLACE FUNCTION audit_dietary_profiles_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('dietary_profiles', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('dietary_profiles', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('dietary_profiles', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_dietary_profiles ON dietary_profiles;
CREATE TRIGGER audit_dietary_profiles
  AFTER INSERT OR UPDATE OR DELETE ON dietary_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_dietary_profiles_changes();

-- 10. Trigger de auditoria para nutritional_strategies
CREATE OR REPLACE FUNCTION audit_nutritional_strategies_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, changed_by)
    VALUES ('nutritional_strategies', 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO critical_changes_audit (table_name, operation, old_data, new_data, changed_by)
    VALUES ('nutritional_strategies', 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO critical_changes_audit (table_name, operation, new_data, changed_by)
    VALUES ('nutritional_strategies', 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_nutritional_strategies ON nutritional_strategies;
CREATE TRIGGER audit_nutritional_strategies
  AFTER INSERT OR UPDATE OR DELETE ON nutritional_strategies
  FOR EACH ROW
  EXECUTE FUNCTION audit_nutritional_strategies_changes();

-- Comentário explicativo
COMMENT ON TABLE critical_changes_audit IS 
'Tabela de auditoria para todas as mudanças em tabelas críticas do sistema.
Monitora: intolerance_mappings, dietary_forbidden_ingredients, intolerance_safe_keywords,
onboarding_options, meal_time_settings, dietary_profiles, nutritional_strategies.
Impede regressões ao manter histórico completo de alterações.';
