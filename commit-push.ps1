#!/usr/bin/env pwsh

# Script para automatizar git add, commit e push
# Uso: .\commit-push.ps1 "mensagem do commit"

param(
    [Parameter(Mandatory=$false)]
    [string]$message = "update"
)

$gitPath = "C:\Users\Dell\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe"

Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
& $gitPath add -A

Write-Host "Commit com mensagem: $message" -ForegroundColor Yellow
& $gitPath commit -m $message

Write-Host "Enviando para o GitHub..." -ForegroundColor Yellow
& $gitPath push

Write-Host "Concluido!" -ForegroundColor Green
