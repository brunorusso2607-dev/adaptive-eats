-- ============================================
-- CORRIGIR PORTION_LABELS DAS 120 REFEIÇÕES
-- ============================================
-- Este script adiciona o campo portion_label em todos os componentes
-- das refeições que foram inseridas sem esse campo

-- Função para adicionar portion_label automaticamente
CREATE OR REPLACE FUNCTION add_portion_labels()
RETURNS void AS $$
DECLARE
  meal_record RECORD;
  new_components JSONB;
  component JSONB;
  updated_component JSONB;
BEGIN
  -- Iterar sobre todas as refeições com source = 'manual'
  FOR meal_record IN 
    SELECT id, name, components 
    FROM meal_combinations 
    WHERE source = 'manual'
    AND created_at > NOW() - INTERVAL '2 hours'
  LOOP
    new_components := '[]'::jsonb;
    
    -- Iterar sobre cada componente
    FOR component IN SELECT * FROM jsonb_array_elements(meal_record.components)
    LOOP
      -- Adicionar portion_label se não existir
      IF component->>'portion_label' IS NULL THEN
        -- Determinar o label baseado em portion_grams ou portion_ml
        IF component->>'portion_grams' IS NOT NULL THEN
          updated_component := component || jsonb_build_object(
            'portion_label', 
            (component->>'portion_grams')::text || 'g'
          );
        ELSIF component->>'portion_ml' IS NOT NULL THEN
          updated_component := component || jsonb_build_object(
            'portion_label', 
            (component->>'portion_ml')::text || 'ml'
          );
        ELSE
          updated_component := component;
        END IF;
      ELSE
        updated_component := component;
      END IF;
      
      new_components := new_components || jsonb_build_array(updated_component);
    END LOOP;
    
    -- Atualizar a refeição com os novos componentes
    UPDATE meal_combinations
    SET components = new_components
    WHERE id = meal_record.id;
    
    RAISE NOTICE 'Updated meal: %', meal_record.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar a função
SELECT add_portion_labels();

-- Remover a função após uso
DROP FUNCTION add_portion_labels();

-- Verificar resultado
SELECT 
  name,
  components->0->>'name' as first_component,
  components->0->>'portion_label' as first_label
FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '2 hours'
LIMIT 5;
