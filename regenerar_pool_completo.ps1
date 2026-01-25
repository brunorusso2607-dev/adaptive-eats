# Script para regenerar pool completo com 120 refeições
# 20 de cada tipo de refeição

$supabaseUrl = "https://onzdkpqtzfxzcdyxczkn.supabase.co"
$supabaseKey = $env:SUPABASE_ANON_KEY

if (-not $supabaseKey) {
    Write-Host "ERRO: SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente" -ForegroundColor Red
    Write-Host "Execute: `$env:SUPABASE_ANON_KEY = 'sua-chave-aqui'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

$mealTypes = @(
    @{ type = "cafe_manha"; name = "Cafe da manha" }
    @{ type = "lanche_manha"; name = "Lanche da manha" }
    @{ type = "almoco"; name = "Almoco" }
    @{ type = "lanche_tarde"; name = "Lanche da tarde" }
    @{ type = "jantar"; name = "Jantar" }
    @{ type = "ceia"; name = "Ceia" }
)

$totalSuccess = 0
$totalFailed = 0

Write-Host "`n🔄 REGENERANDO POOL COMPLETO - 120 REFEIÇÕES" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

foreach ($meal in $mealTypes) {
    Write-Host "`n📋 Gerando 20 refeições: $($meal.name)" -ForegroundColor Yellow
    
    $body = @{
        meal_type = $meal.type
        quantity = 20
        country_code = "BR"
        intolerances = @()
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/populate-meal-pool" `
            -Method Post `
            -Headers $headers `
            -Body $body `
            -TimeoutSec 120
        
        if ($response.success) {
            $inserted = $response.inserted_count
            $rejected = $response.rejected_count
            $totalSuccess += $inserted
            $totalFailed += $rejected
            
            Write-Host "  ✅ Inseridas: $inserted" -ForegroundColor Green
            if ($rejected -gt 0) {
                Write-Host "  ⚠️  Rejeitadas: $rejected" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ Erro: $($response.error)" -ForegroundColor Red
            $totalFailed += 20
        }
    } catch {
        Write-Host "  ❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
        $totalFailed += 20
    }
    
    Start-Sleep -Seconds 2
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 RESUMO FINAL:" -ForegroundColor Cyan
Write-Host "  ✅ Total inseridas: $totalSuccess" -ForegroundColor Green
Write-Host "  ⚠️  Total rejeitadas: $totalFailed" -ForegroundColor Yellow
Write-Host "  🎯 Taxa de sucesso: $([math]::Round(($totalSuccess / 120) * 100, 2))%" -ForegroundColor Cyan
Write-Host "`n"
