@echo off
title WEC Hypercar Simulator - Spa-Francorchamps
cd /d "%~dp0"

echo ==========================================================
echo    INICIANDO SIMULADOR 3D WEC HYPERCAR (PUERTO 5050)
echo ==========================================================

python server.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ocurrio un error al iniciar el juego.
    pause
)
