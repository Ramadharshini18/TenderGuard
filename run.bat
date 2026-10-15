@echo off
echo =========================================================
echo       TENDERGUARD: E-PROCUREMENT FRAUD RISK DETECTION     
echo          AI & Graph Neural Network Monitoring Platform
echo =========================================================
echo.
echo [1/2] Starting FastAPI Backend Server on port 8000...
start "TenderGuard Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting React + Vite Frontend Server on port 5173...
start "TenderGuard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 4 seconds for servers to initialize...
timeout /t 4 >nul

echo.
echo [OK] Opening browser to http://localhost:5173 ...
start http://localhost:5173
start http://localhost:8000/docs

echo.
echo Both servers have been launched in dedicated terminal windows.
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000/docs
echo.
pause
