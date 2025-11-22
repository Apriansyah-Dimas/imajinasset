@echo off
echo Starting Imajin Asset Application...
echo.
echo 1. Starting Next.js server on port 3001...
start /B cmd /c "cd /d %~dp0 && PORT=3001 npm run dev"
echo.
echo 2. Starting Cloudflare tunnel...
start /B cmd /c "cd /d %~dp0 && cloudflared.exe tunnel --config config.yml run"
echo.
echo Both services are starting...
echo Local: http://localhost:3001
echo Custom Domain: https://www.imajinasset.biz.id
echo.
pause