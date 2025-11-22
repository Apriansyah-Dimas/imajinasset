@echo off
title Imajin Asset Deployment - Localhost + Cloudflare Tunnel
color 0A

echo ========================================
echo    IMAGIN ASSET DEPLOYMENT SCRIPT
echo ========================================
echo    Deploying to localhost + Cloudflare Tunnel
echo    Custom Domain: www.imajinasset.biz.id
echo ========================================
echo.

:: Set working directory
cd /d "%~dp0"

:: Kill existing processes
echo [1/5] Cleaning up existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1
echo     - Existing processes stopped
echo.

:: Check if dependencies exist
echo [2/5] Checking dependencies...
if not exist "package.json" (
    echo     ERROR: package.json not found!
    echo     Please run this script from the project directory
    pause
    exit /b 1
)

if not exist "cloudflared.exe" (
    echo     ERROR: cloudflared.exe not found!
    echo     Please ensure cloudflared.exe is in the project directory
    pause
    exit /b 1
)

if not exist "config.yml" (
    echo     ERROR: config.yml not found!
    echo     Please ensure tunnel configuration exists
    pause
    exit /b 1
)

echo     - Dependencies verified
echo.

:: Install/Update dependencies
echo [3/5] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo     ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo     - Dependencies installed
echo.

:: Setup database
echo [4/5] Setting up database...
if exist "dev.db" (
    echo     - Database exists, checking sync...
) else (
    echo     - Creating new database...
)

DATABASE_URL="file:./dev.db" npx prisma db push >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo     WARNING: Database sync had issues, continuing...
)

DATABASE_URL="file:./dev.db" npm run db:seed >nul 2>&1
echo     - Database ready
echo.

:: Start services
echo [5/5] Starting services...
echo.

echo Starting Next.js Development Server (Port 3001)...
start /B cmd /c "title Next.js Server - Port 3001 && cd /d \"%~dp0\" && set PORT=3001 && npm run dev"
ping 127.0.0.1 -n 4 >nul

echo Starting Cloudflare Tunnel (www.imajinasset.biz.id)...
start /B cmd /c "title Cloudflare Tunnel - www.imajinasset.biz.id && cd /d \"%~dp0\" && cloudflared.exe tunnel --config config.yml run"
ping 127.0.0.1 -n 6 >nul

:: Check if services are running
echo.
echo ========================================
echo          DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Checking service status...
echo.

:: Check Next.js server
netstat -an | findstr "3001" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     ✅ Next.js Server: RUNNING on http://localhost:3001
) else (
    echo     ⚠️  Next.js Server: Starting up...
)

:: Check Cloudflare tunnel
tasklist | findstr "cloudflared" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     ✅ Cloudflare Tunnel: RUNNING
) else (
    echo     ⚠️  Cloudflare Tunnel: Starting up...
)

echo.
echo ========================================
echo           ACCESS INFORMATION
echo ========================================
echo.
echo 🌐 Local Access:
echo    http://localhost:3001
echo.
echo 🌍 Custom Domain:
echo    https://www.imajinasset.biz.id
echo.
echo 👤 Default Admin Login:
echo    Email: admin@assetso.com
echo    Password: (check database seed)
echo.
echo ========================================
echo            MANAGEMENT
echo ========================================
echo.
echo To stop all services:
echo    Run: stop-imajinasset.bat
echo    Or press CTRL+C in this window
echo.
echo To check logs:
echo    - Next.js: Check "Next.js Server" window
echo    - Cloudflare: Check "Cloudflare Tunnel" window
echo.
echo ========================================

:: Wait a bit more for full startup
ping 127.0.0.1 -n 11 >nul

:: Final status check
echo.
echo Final Status Check:
echo.

netstat -an | findstr "3001" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     ✅ Next.js Server: CONFIRMED RUNNING
) else (
    echo     ❌ Next.js Server: FAILED TO START
    echo       Please check the error logs above
)

tasklist | findstr "cloudflared" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     ✅ Cloudflare Tunnel: CONFIRMED RUNNING
) else (
    echo     ❌ Cloudflare Tunnel: FAILED TO START
    echo       Please check the tunnel configuration
)

echo.
echo Deployment script completed!
echo Press any key to exit (services will continue running)
pause >nul