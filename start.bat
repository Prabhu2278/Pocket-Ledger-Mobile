@echo off
echo ===================================================
echo   Starting Expense Tracker (Backend + Frontend)
echo ===================================================

start "Expense Tracker - Backend (Port 9000)" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 9000"
start "Expense Tracker - Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Backend and Frontend have been launched in separate windows!
