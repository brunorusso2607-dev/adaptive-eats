
-- Criar função de validação para dietary_key na tabela dietary_forbidden_ingredients
CREATE OR REPLACE FUNCTION validate_dietary_key()
RETURNS TRIGGER AS $$
DECLARE
  valid_key BOOLEAN := FALSE;
BEGIN
  -- Verifica se a chave existe na tabela dietary_profiles
  SELECT EXISTS(
    SELECT 1 FROM dietary_profiles 
    WHERE key = NEW.dietary_key
  ) INTO valid_key;
  
  -- Se não é válida, rejeita a inserção/atualização
  IF NOT valid_key THEN
    RAISE EXCEPTION 'Dietary key "%" is not authorized. Valid keys must exist in dietary_profiles table.', NEW.dietary_key;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para dietary_forbidden_ingredients
DROP TRIGGER IF EXISTS validate_dietary_key_trigger ON dietary_forbidden_ingredients;
CREATE TRIGGER validate_dietary_key_trigger
  BEFORE INSERT OR UPDATE ON dietary_forbidden_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION validate_dietary_key();

-- Comentário explicativo
COMMENT ON FUNCTION validate_dietary_key() IS 
'Validates that dietary_key exists in dietary_profiles table. 
Prevents phantom dietary keys from being created by AI expansion or bulk imports.
Only admins can add new dietary profiles through the dietary_profiles table.';
