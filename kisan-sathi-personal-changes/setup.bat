@echo off
REM KISAN Setup Script for Windows
REM This script sets up the entire project with backend and frontend

echo.
echo 🌾 KISAN - Crop Recommendation System Setup
echo ============================================
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✓ Python %PYTHON_VERSION% found
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 14 or higher
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% found
echo.

REM Setup Backend
echo Setting up Backend...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
echo ✓ Backend dependencies installed
echo.

REM Setup Frontend
echo Setting up Frontend...
cd frontend
echo Installing Node dependencies...
call npm install
cd ..
echo ✓ Frontend dependencies installed
echo.

REM Create .env file
echo Creating environment configuration...
if not exist ".env" (
    (
        echo FLASK_ENV=development
        echo FLASK_DEBUG=1
        echo FLASK_PORT=5000
        echo REACT_APP_API_URL=http://localhost:5000
    ) > .env
    echo ✓ .env file created
) else (
    echo ✓ .env file already exists
)
echo.

REM Check models
echo Verifying ML models...
if exist "data\models\crop_classifier.pkl" (
    if exist "data\models\yield_predictor.pkl" (
        echo ✓ ML models found
    ) else (
        echo ⚠ yield_predictor.pkl not found
    )
) else (
    echo ⚠ crop_classifier.pkl not found
)
echo.

REM Summary
echo ======================================
echo ✓ Setup Complete!
echo ======================================
echo.
echo To start the application:
echo.
echo 1. Start the Backend:
echo    - In Command Prompt:
echo    venv\Scripts\activate.bat
echo    python app.py
echo.
echo 2. Start the Frontend (in another command prompt):
echo    cd frontend
echo    npm start
echo.
echo 3. Open http://localhost:3000 in your browser
echo.
echo For more information, see README.md
echo.
pause
