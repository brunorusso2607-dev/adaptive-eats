# Script para fazer deploy de todas as Edge Functions de IA corrigidas

Write-Host "🚀 DEPLOY DE TODAS AS FUNÇÕES DE IA" -ForegroundColor Green
Write-Host "=" * 60

$functions = @(
    "generate-recipe",
    "regenerate-meal",
    "regenerate-ai-meal-alternatives",
    "suggest-meal-alternatives",
    "suggest-smart-substitutes",
    "analyze-food-photo",
    "analyze-fridge-photo",
    "analyze-label-photo",
    "analyze-symptom-patterns",
    "validate-ingredients",
    "validate-food-ai",
    "decompose-food-for-safety",
    "review-blocked-ingredients",
    "translate-intolerance-mappings",
    "translate-food-decomposition",
    "expand-all-intolerances",
    "generate-description",
    "generate-emoji",
    "chat-assistant",
    "analyze-food-intolerances"
)

$total = $functions.Count
$current = 0

foreach ($func in $functions) {
    $current++
    Write-Host ""
    Write-Host "[$current/$total] Deploying $func..." -ForegroundColor Cyan
    
    npx supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ $func failed to deploy" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "=" * 60
Write-Host "🎉 DEPLOY COMPLETO!" -ForegroundColor Green
Write-Host "Total de funções: $total" -ForegroundColor Cyan
