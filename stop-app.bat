@echo off
echo Stopping Imajin Asset Application...
echo.
taskkill /f /im node.exe
taskkill /f /im cloudflared.exe
echo.
echo All services stopped.
pause