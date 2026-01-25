# Script para corrigir o arquivo index.ts corrompido
# Remove linhas problemáticas e restaura funcionalidade

$filePath = "c:\adaptive-eats-main\supabase\functions\populate-meal-pool\index.ts"

Write-Host "Lendo arquivo..." -ForegroundColor Yellow
$content = Get-Content $filePath -Raw

# Procurar e corrigir a seção problemática (linhas 2777-2784)
# Remover linhas duplicadas/corrompidas

# Padrão problemático a ser removido
$problematicPattern = @"
          country: country_code,
          mealType: meal_type
        });
        return false;
      }
      
      return true;
"@

# Substituir por versão correta
$correctPattern = @"
          country: country_code,
          mealType: meal_type
        });
        return false;
      }
      
      return true;
    });

    logStep("Validação completa (intolerância + cultural)", {
"@

if ($content -match [regex]::Escape($problematicPattern)) {
    Write-Host "Padrão problemático encontrado. Corrigindo..." -ForegroundColor Green
    $content = $content -replace [regex]::Escape($problematicPattern), $correctPattern
    
    # Salvar arquivo corrigido
    Set-Content -Path $filePath -Value $content -NoNewline
    Write-Host "Arquivo corrigido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Padrão problemático não encontrado. Tentando abordagem alternativa..." -ForegroundColor Yellow
    
    # Ler linha por linha e remover duplicatas
    $lines = Get-Content $filePath
    $fixedLines = @()
    $skipNext = $false
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        # Pular linhas problemáticas conhecidas
        if ($i -ge 2776 -and $i -le 2783 -and $line -match "country:|mealType:|return false|return true") {
            if (-not $skipNext) {
                $fixedLines += $line
                $skipNext = $true
            }
        } else {
            $fixedLines += $line
            $skipNext = $false
        }
    }
    
    # Salvar arquivo corrigido
    $fixedLines | Set-Content -Path $filePath
    Write-Host "Arquivo corrigido com abordagem alternativa!" -ForegroundColor Green
}

Write-Host "`nVerificando erros de sintaxe..." -ForegroundColor Yellow
Write-Host "Abra o arquivo no VS Code e verifique se não há erros de lint." -ForegroundColor Cyan
