@echo off
echo Starting InternOdyssey all services...

REM Start the node.js backend first
start "Node.js Backend" cmd /k "cd /d %~dp0 && npm run dev --prefix backend"

REM Start the React frontend next
start "React Frontend" cmd /k "cd /d %~dp0 && npm run dev --prefix frontend"

echo Node.js backend started at http://localhost:5000
echo React frontend started at http://localhost:5173

echo.
echo Use this command in a separate terminal to start the Python backend with bc.py:
echo start_original_py_backend.bat
echo.
pause