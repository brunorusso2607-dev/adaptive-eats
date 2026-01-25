# Script para fazer deploy da correção de variedade
Write-Host "🚀 Fazendo deploy da correção de variedade..." -ForegroundColor Green

# Navegar para o diretório do projeto
Set-Location "c:\adaptive-eats-main"

# Fazer deploy usando npx supabase
Write-Host "📦 Executando deploy..." -ForegroundColor Yellow
npx supabase functions deploy populate-meal-pool

Write-Host "✅ Deploy concluído!" -ForegroundColor Green
Write-Host "⏱️ Aguarde 1-2 minutos para o deploy ser aplicado" -ForegroundColor Cyan
Write-Host "🧪 Depois teste em: http://localhost:8080 → Admin → Meal Pool" -ForegroundColor Cyan
