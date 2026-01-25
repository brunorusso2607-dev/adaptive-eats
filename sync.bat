@echo off
echo ========================================
echo   SINCRONIZANDO COM GITHUB
echo ========================================
echo.

echo [1/3] Adicionando arquivos...
git add .

echo.
echo [2/3] Fazendo commit...
git commit -m "sync: atualizacao automatica %date% %time%"

echo.
echo [3/3] Enviando para GitHub...
git push origin main

echo.
echo ========================================
echo   SINCRONIZACAO CONCLUIDA!
echo ========================================
echo.
echo Agora o GitHub Actions vai fazer deploy automatico.
echo.
pause
