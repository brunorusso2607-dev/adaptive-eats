# Teste da função local

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    "Content-Type" = "application/json"
}

$body = @{
    planName = "Teste Local"
    startDate = "2026-01-20"
    daysCount = 1
    optionsPerMeal = 1
} | ConvertTo-Json

Write-Host "🧪 Testando função local..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest `
        -Uri "http://127.0.0.1:54321/functions/v1/generate-ai-meal-plan" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ ERROR - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $errorBody
}
