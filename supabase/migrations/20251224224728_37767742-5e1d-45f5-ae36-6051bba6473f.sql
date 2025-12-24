-- Corrigir search_path da função normalize_ingredient_name
CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LOWER(
    TRANSLATE(
      input_text,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
    )
  );
$$;