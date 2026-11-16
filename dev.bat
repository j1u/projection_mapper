@echo off
rem Development mode: FastAPI with auto-reload (:8000) + Vite dev server with hot reload (:5173)
setlocal
cd /d "%~dp0"
start "Projection Mapper API" cmd /k backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
start "Projection Mapper UI" cmd /k npm --prefix frontend run dev
timeout /t 3 >nul
start "" http://localhost:5173
