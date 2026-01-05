
-- Criar função de validação para intolerance_key na tabela intolerance_mappings
CREATE OR REPLACE FUNCTION validate_intolerance_key()
RETURNS TRIGGER AS $$
DECLARE
  valid_key BOOLEAN := FALSE;
BEGIN
  -- Verifica se a chave existe no onboarding_options (fonte primária)
  SELECT EXISTS(
    SELECT 1 FROM onboarding_options 
    WHERE option_id = NEW.intolerance_key 
    AND category IN ('intolerances', 'allergies', 'sensitivities')
  ) INTO valid_key;
  
  -- Se não encontrou, verifica na tabela de normalização (database_key)
  IF NOT valid_key THEN
    SELECT EXISTS(
      SELECT 1 FROM intolerance_key_normalization 
      WHERE database_key = NEW.intolerance_key
    ) INTO valid_key;
  END IF;
  
  -- Se ainda não é válida, rejeita a inserção
  IF NOT valid_key THEN
    RAISE EXCEPTION 'Intolerance key "%" is not authorized. Valid keys must exist in onboarding_options or intolerance_key_normalization.', NEW.intolerance_key;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para intolerance_mappings
DROP TRIGGER IF EXISTS validate_intolerance_key_trigger ON intolerance_mappings;
CREATE TRIGGER validate_intolerance_key_trigger
  BEFORE INSERT OR UPDATE ON intolerance_mappings
  FOR EACH ROW
  EXECUTE FUNCTION validate_intolerance_key();

-- Comentário explicativo
COMMENT ON FUNCTION validate_intolerance_key() IS 
'Validates that intolerance_key exists in onboarding_options or intolerance_key_normalization. 
Prevents phantom intolerance keys from being created by AI expansion or bulk imports.
Only admins can add new intolerance categories through onboarding_options.';
