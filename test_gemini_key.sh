#!/bin/bash
# Teste rápido da API Key do Gemini

# Obter a chave dos secrets
KEY=$(supabase secrets list | grep GOOGLE_AI_API_KEY | awk '{print $1}')

echo "Testando API Key do Gemini..."
echo "Se retornar 401, a chave está inválida/expirada"
echo "Se retornar 200, a chave está OK"

# Fazer uma requisição de teste
curl -s -o /dev/null -w "%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY_HERE" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
