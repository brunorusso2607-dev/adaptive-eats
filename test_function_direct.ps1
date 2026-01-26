# Teste direto da Edge Function

$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    "Content-Type" = "application/json"
}

$body = @{
    planName = "Teste Direto"
    startDate = "2026-01-20"
    daysCount = 1
    optionsPerMeal = 1
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/generate-ai-meal-plan" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ SUCCESS - Status: $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    Write-Host "❌ ERROR - Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error details:"
    Write-Host $errorBody
}
