@echo off
echo Starting Frontend and Backend Servers...

:: Start Frontend in a new CMD window
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Start Backend in a new CMD window
start "Python Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && python main.py"

echo Both servers are starting in separate windows.
