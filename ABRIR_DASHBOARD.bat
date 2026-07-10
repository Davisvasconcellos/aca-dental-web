@echo off
chcp 65001 >nul
title ACA — Central de Inteligência
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   ACA — Central de Inteligência          ║
echo  ║   Iniciando servidor local...            ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Abrindo o dashboard no navegador...
echo  Para encerrar: feche esta janela
echo.
py "%~dp0servidor.py"
if errorlevel 1 (
    echo.
    echo  ERRO: Python nao encontrado. Instale em https://python.org
    pause
)
