@echo off
setlocal

title Islamic Reels Studio Stopper

echo ==============================================================
echo   Stopping Islamic Reels Studio & Bulk Publisher Services
echo ==============================================================
echo.

:: Kill processes on port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Terminating Studio process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>nul
)

:: Kill processes on port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo Terminating Cloud Bridge process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo [OK] All Islamic Reels services stopped successfully.
timeout /t 2 /nobreak >nul
