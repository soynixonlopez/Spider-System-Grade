@echo off
echo ========================================
echo   Despliegue Automatico de Firebase
echo ========================================
echo.

REM Verificar si PowerShell está disponible
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: PowerShell no está disponible
    pause
    exit /b 1
)

REM Ejecutar el script de PowerShell
echo Ejecutando script de despliegue...
powershell -ExecutionPolicy Bypass -File "deploy-firebase.ps1"

echo.
echo Presiona cualquier tecla para salir...
pause >nul
