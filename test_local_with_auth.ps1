# Teste local com autenticação real

Write-Host "🔑 Primeiro, faça login para obter um token válido..." -ForegroundColor Cyan

# Usar supabase auth para obter token
$email = Read-Host "Digite seu email"
$password = Read-Host "Digite sua senha" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Login via API local do Supabase
$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod `
        -Uri "http://127.0.0.1:54321/auth/v1/token?grant_type=password" `
        -Method POST `
        -Headers @{
            "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
            "Content-Type" = "application/json"
        } `
        -Body $loginBody
    
    $token = $authResponse.access_token
    Write-Host "✅ Token obtido com sucesso!" -ForegroundColor Green
    
    # Agora testar a função com token real
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $body = @{
        planName = "Teste Local Autenticado"
        startDate = "2026-01-20"
        daysCount = 1
        optionsPerMeal = 1
    } | ConvertTo-Json

    Write-Host "🧪 Testando função com token válido..." -ForegroundColor Cyan

    $response = Invoke-WebRequest `
        -Uri "http://127.0.0.1:54321/functions/v1/generate-ai-meal-plan" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
    
} catch {
    Write-Host "❌ ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details:" -ForegroundColor Yellow
        Write-Host $errorBody
    }
}
