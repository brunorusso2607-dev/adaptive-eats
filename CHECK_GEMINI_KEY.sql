-- Verificar se a chave do Gemini está configurada no banco
SELECT 
  name,
  is_active,
  LENGTH(api_key_encrypted) as key_length,
  created_at,
  updated_at
FROM api_integrations
WHERE name = 'gemini';
