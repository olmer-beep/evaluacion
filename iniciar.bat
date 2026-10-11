@echo off
REM ============================================================
REM  GestRend - arranca el servidor con doble clic
REM  (no depende de PowerShell ni de su politica de scripts)
REM ============================================================
title GestRend - servidor
cd /d "%~dp0"

set "NODE_EXE=node"
where node >nul 2>&1
if errorlevel 1 set "NODE_EXE=C:\Program Files\nodejs\node.exe"

echo Iniciando GestRend en http://localhost:5000
echo Para detenerlo, cierra esta ventana o pulsa Ctrl+C.
echo.
start "" http://localhost:5000
"%NODE_EXE%" server.js
pause
