# Script de teste das melhorias do Chef IA
# Executa chamadas reais à Edge Function

$SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDAzNzQsImV4cCI6MjA4Mzg3NjM3NH0.wbKQ7vKHn5UPIEGRviPiOEErrMKubpORnmQ0NctAuN8"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4"

$headers = @{
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
    "apikey" = $ANON_KEY
}

function Test-ChatMessage {
    param(
        [string]$Message,
        [string]$TestName
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TESTE: $TestName" -ForegroundColor Yellow
    Write-Host "Mensagem: $Message" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    
    $body = @{
        message = $Message
        messages = @(
            @{
                role = "user"
                content = $Message
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/chat-assistant" -Method POST -Headers $headers -Body $body -TimeoutSec 60
        
        if ($response.message) {
            Write-Host "`nResposta da IA:" -ForegroundColor Green
            Write-Host $response.message -ForegroundColor White
        } else {
            Write-Host "`nResposta completa:" -ForegroundColor Green
            Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor White
        }
        
        return $response
    }
    catch {
        Write-Host "`nERRO: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Executar testes
Write-Host "`n`n=============================================" -ForegroundColor Magenta
Write-Host "  INICIANDO TESTES DAS MELHORIAS DO CHEF IA" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta

# Teste 1: Detecção de mudança de dieta
Test-ChatMessage -Message "Virei vegano semana passada" -TestName "Melhoria 3: Detecção de Mudança de Dieta"

Start-Sleep -Seconds 2

# Teste 2: Detecção avançada de intenções (peso)
Test-ChatMessage -Message "Pesei 72kg hoje" -TestName "Melhoria 4: Detecção Avançada de Intenções"

Start-Sleep -Seconds 2

# Teste 3: Contexto de saúde
Test-ChatMessage -Message "Estou muito cansado ultimamente" -TestName "Melhoria 5: Contexto de Saúde"

Start-Sleep -Seconds 2

# Teste 4: Detecção emocional (frustração)
Test-ChatMessage -Message "Não consigo emagrecer, estou quase desistindo" -TestName "Melhoria 8: Detecção de Emoção"

Start-Sleep -Seconds 2

# Teste 5: Remoção de intolerância (já funcionando)
Test-ChatMessage -Message "O médico falou que não sou mais intolerante a glúten" -TestName "Remoção de Intolerância"

Write-Host "`n`n=============================================" -ForegroundColor Magenta
Write-Host "  TESTES FINALIZADOS" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
