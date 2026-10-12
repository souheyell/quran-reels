@echo off
setlocal enabledelayedexpansion

title Islamic Reels Studio & Bulk Publisher

echo ==============================================================
echo   Islamic Reels Creator & Bulk Publisher - Windows Launcher
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js v18 or higher from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Detected Node.js: %NODE_VER%

:: 2. Check and install dependencies if needed
if not exist "node_modules" (
    echo [INFO] 'node_modules' not found. Installing dependencies via npm...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your network connection.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully!
)

:: 3. Ensure directories exist
if not exist "exports" mkdir "exports"
if not exist "shared_wip" mkdir "shared_wip"

echo.
echo [START] Launching Cloud Bridge and Unified Studio...

:: 4. Start Cloud Bridge in background
start /B "CloudBridge" node server/cloudBridge.js > nul 2>&1

:: 5. Start Vite Unified Studio
start /B "IslamicReelsStudio" cmd /c "npm run dev" > nul 2>&1

:: 6. Wait 3 seconds and open browser
timeout /t 3 /nobreak >nul
echo [OK] Opening Unified Studio in default browser: http://localhost:5173/
start http://localhost:5173/

echo.
echo ==============================================================
echo   Islamic Reels Complete Toolkit is running!
echo   Web Studio URL:   http://localhost:5173/
echo   Cloud Bridge Link: http://localhost:3001/
echo   To stop, run stop.bat or close this terminal.
echo ==============================================================
echo.
pause
