@echo off
title Alba Labs - Servidor Local PHP
echo ========================================================
echo   Iniciando o servidor local PHP do Alba Labs...
echo   Confirme que o MySQL está iniciado no XAMPP Control Panel.
echo ========================================================
cd /d "%~dp0public_html"
echo.
echo Abrindo o navegador em http://localhost:8000/login.html...
start http://localhost:8000/login.html
echo.
echo Pressione Ctrl + C nesta janela para encerrar o servidor.
echo.
"C:\xampp_novo\php\php.exe" -S localhost:8000 -t "%~dp0public_html"
pause
