@echo off
chcp 65001 >nul
title ACA — Analise Completa (Todos os Pacientes)
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   ACA — Analise Completa                 ║
echo  ║   Todos os 1.755 pacientes               ║
echo  ║   Tempo estimado: 15 a 25 minutos        ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  ATENÇÃO: Este processo pode demorar bastante.
echo  Nao feche esta janela.
echo.
echo  Passo 1/2: Coletando evolucoes de TODOS os pacientes...
py "%~dp0coletar_todos.py"
echo.
echo  Passo 2/2: Gerando dashboard completo...
py "%~dp0gerar_dashboard.py"
echo.
echo  ✅ Analise completa! Abrindo dashboard...
start "" "%~dp0dashboard.html"
echo.
pause
