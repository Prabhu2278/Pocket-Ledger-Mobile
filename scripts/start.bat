@echo off
echo ===================================================
echo   Starting Pocket Ledger (FastAPI + Mobile Expo)
echo ===================================================

:: Root directory of the repository
set "ROOT_DIR=%~dp0.."

:: Launch FastAPI backend
start "Pocket Ledger - Backend (Port 9000)" cmd /k "cd /d "%ROOT_DIR%\backend" && if exist venv\Scripts\activate (call venv\Scripts\activate) && uvicorn app.main:app --reload --host 0.0.0.0 --port 9000"

:: Launch Mobile Expo Dev Server
start "Pocket Ledger - Mobile (Expo)" cmd /k "cd /d "%ROOT_DIR%\mobile" && npx expo start"

echo.
echo Backend (port 9000) and Mobile (Expo) have been launched in separate windows!
