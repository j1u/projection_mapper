@echo off
rem Projection Mapper - one-click launcher (production build served by FastAPI on http://localhost:8000)
setlocal
cd /d "%~dp0"
title Projection Mapper

if not exist backend\.venv\Scripts\python.exe (
  echo [setup] Creating Python virtual environment...
  python -m venv backend\.venv || goto :error
)
echo [setup] Checking Python packages...
backend\.venv\Scripts\python -m pip install -q -r backend\requirements.txt || goto :error

if not exist frontend\node_modules (
  echo [setup] Installing frontend packages...
  call npm --prefix frontend install || goto :error
)
echo [build] Building frontend...
call npm --prefix frontend run build || goto :error

echo.
echo Projection Mapper running at http://localhost:8000  (close this window to stop)
start "" http://localhost:8000
backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
goto :eof

:error
echo.
echo Setup failed - see the messages above. Needs Python 3.10+ and Node.js 18+.
pause
