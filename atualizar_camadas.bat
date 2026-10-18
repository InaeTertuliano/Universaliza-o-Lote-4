@echo off
chcp 65001 > nul
title Atualizar Camadas WebGIS Lote 4
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0atualizar_camadas.ps1"
echo.
pause
