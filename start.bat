@echo off
title Sara ERP

echo Starting Sara ERP...
echo.

:: Start server in a new window
start "ERP Server" cmd /k "cd /d D:\erpclaude\erp && npm run dev:server"

:: Wait 3 seconds for server to initialize
timeout /t 3 /nobreak >nul

:: Start client in a new window
start "ERP Client" cmd /k "cd /d D:\erpclaude\erp && npm run dev:client"

:: Wait 3 seconds for Vite to start
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:5173

echo.
echo Server running on http://localhost:3001
echo Client running on http://localhost:5173
echo.
echo Close the Server and Client windows to stop.
