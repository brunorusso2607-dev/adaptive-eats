# Script para migrar as 4 funções restantes de Lovable para Gemini

Write-Host "🚀 MIGRANDO 4 FUNÇÕES RESTANTES" -ForegroundColor Green
Write-Host "=" * 60

$functions = @(
    "chat-assistant",
    "expand-all-intolerances", 
    "expand-intolerance-mappings",
    "expand-language-terms"
)

Write-Host "`nFunções a migrar:"
foreach ($func in $functions) {
    Write-Host "  - $func" -ForegroundColor Cyan
}

Write-Host "`n⚠️  ATENÇÃO: Estas funções precisam de migração manual" -ForegroundColor Yellow
Write-Host "   Cada uma tem estrutura diferente e precisa de análise individual" -ForegroundColor Yellow

Write-Host "`n📋 PADRÃO DE MIGRAÇÃO:" -ForegroundColor Green
Write-Host @"

1. Substituir:
   const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
   
   POR:
   const geminiApiKey = await getGeminiApiKey();
   logAICall('FUNCTION-NAME', CURRENT_AI_MODEL);

2. Substituir URL:
   https://ai.gateway.lovable.dev/v1/chat/completions
   
   POR:
   buildGeminiApiUrl(geminiApiKey, CURRENT_AI_MODEL)

3. Substituir formato da requisição:
   messages: [{ role: "system", content: ... }]
   
   POR:
   contents: [{ parts: [{ text: ... }] }]

4. Substituir parse da resposta:
   data.choices?.[0]?.message?.content
   
   POR:
   data.candidates?.[0]?.content?.parts?.[0]?.text

"@

Write-Host "`n✅ Funções já migradas:" -ForegroundColor Green
Write-Host "  - translate-food-decomposition"
Write-Host "  - decompose-food-for-safety"
Write-Host "  - populate-meal-pool"
Write-Host "  - generate-ai-meal-plan"
Write-Host "  + 20 outras funções de IA"
