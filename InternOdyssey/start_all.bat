@echo off
echo Starting InternOdyssey Services...

REM Start both servers in separate terminals
start "Node.js Backend" cmd /k "cd /d %~dp0 && npm run dev --prefix backend"
start "Python Backend" cmd /k "cd /d %~dp0 && start_py_backend.bat"
start "React Frontend" cmd /k "cd /d %~dp0 && npm run dev --prefix frontend"

echo Services started in separate terminals.
echo Node.js Backend: http://localhost:5000
echo Python Backend: http://localhost:8000
echo React Frontend: http://localhost:5173