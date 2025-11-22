@echo off
title Stop Imajin Asset Services
color 0C

echo ========================================
echo     STOP IMAGIN ASSET SERVICES
echo ========================================
echo.

echo Stopping Next.js Development Server...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1

echo Stopping Cloudflare Tunnel...
taskkill /f /im cloudflared.exe >nul 2>&1

echo Cleaning up background processes...
wmic process where "commandline like '%3001%'" delete >nul 2>&1

echo.
echo ✅ All services stopped successfully!
echo.
echo Your custom domain www.imajinasset.biz.id is now offline.
echo Local server http://localhost:3001 is also stopped.
echo.
pause