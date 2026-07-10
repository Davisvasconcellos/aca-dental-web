@echo off
chcp 65001 >nul
title ACA — Atualizando Dados
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   ACA — Atualizando dados                ║
echo  ║   Pacientes com orcamento em aberto      ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Passo 1/3: Analisando orcamentos do Excel...
py "%~dp0analisar_orcamentos.py"
echo.
echo  Passo 2/3: Coletando evolucoes da API Simples Dental...
echo  (pode demorar alguns minutos)
py "%~dp0coletar_evolucoes.py"
echo.
echo  Passo 3/3: Gerando dashboard atualizado...
py "%~dp0gerar_dashboard.py"
echo.
echo  ✅ Concluido! Abrindo dashboard...
start "" "%~dp0dashboard.html"
echo.
pause
