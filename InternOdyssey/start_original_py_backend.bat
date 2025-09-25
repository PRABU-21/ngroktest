@echo off
echo Starting InternOdyssey Python backend (original bc.py)...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found! Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

REM Install required packages if not present
echo Installing required packages...
pip install fastapi uvicorn python-multipart sentence-transformers

REM Set environment variables
set FASTAPI_URL=http://localhost:8000

REM Create required directories
if not exist "backend\py\uploads" mkdir "backend\py\uploads"

REM Start the FastAPI server
echo Starting FastAPI server on http://localhost:8000
python backend\py\bc.py

REM If the server stops, wait before closing
pause