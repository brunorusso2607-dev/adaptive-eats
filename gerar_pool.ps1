# Regenerar pool completo - 120 refeições
$url = "https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/populate-meal-pool"
$key = $env:SUPABASE_ANON_KEY

if (-not $key) {
    Write-Host "ERRO: Defina SUPABASE_ANON_KEY" -ForegroundColor Red
    exit 1
}

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

Write-Host "`nGerando 20 cafe da manha..." -ForegroundColor Yellow
$body1 = '{"meal_type":"cafe_manha","quantity":20,"country_code":"BR","intolerances":[]}'
Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body1 -TimeoutSec 120
Start-Sleep -Seconds 3

Write-Host "`nGerando 20 lanche da manha..." -ForegroundColor Yellow
$body2 = '{"meal_type":"lanche_manha","quantity":20,"country_code":"BR","intolerances":[]}'
Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body2 -TimeoutSec 120
Start-Sleep -Seconds 3

Write-Host "`nGerando 20 almocos..." -ForegroundColor Yellow
$body3 = '{"meal_type":"almoco","quantity":20,"country_code":"BR","intolerances":[]}'
Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body3 -TimeoutSec 120
Start-Sleep -Seconds 3

Write-Host "`nGerando 20 lanches da tarde..." -ForegroundColor Yellow
$body4 = '{"meal_type":"lanche_tarde","quantity":20,"country_code":"BR","intolerances":[]}'
Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body4 -TimeoutSec 120
Start-Sleep -Seconds 3

Write-Host "`nGerando 20 jantares..." -ForegroundColor Yellow
$body5 = '{"meal_type":"jantar","quantity":20,"country_code":"BR","intolerances":[]}'
Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body5 -TimeoutSec 120
Start-Sleep -Seconds 3

Write-Host "`nGerando 20 ceias..." -ForegroundColor Yellow
$body6 = '{"meal_type":"ceia","quantity":20,"country_code":"BR","intolerances":[]}'
Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body6 -TimeoutSec 120

Write-Host "`n✅ Pool regenerado com sucesso!" -ForegroundColor Green
