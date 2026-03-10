@echo off
REM Development setup script for Log Mining Platform (Windows)

echo 🚀 Setting up Log Mining Intelligence Platform...

REM Backend setup
echo 📦 Setting up backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    python -m venv venv
    echo ✅ Virtual environment created
)

REM Activate and install dependencies
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
echo ✅ Backend dependencies installed

REM Copy environment file
if not exist ".env" (
    copy .env.example .env
    echo ⚠️  Please update .env with your Neon database URL
)

cd ..

REM Frontend setup
echo 📦 Setting up frontend...
cd frontend

REM Install dependencies
call npm install
echo ✅ Frontend dependencies installed

REM Copy environment file
if not exist ".env" (
    copy .env.example .env
)

cd ..

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Create a Neon database at https://console.neon.tech
echo 2. Update backend\.env with your DATABASE_URL
echo 3. Run 'make run-backend' to start the API
echo 4. Run 'make run-frontend' to start the dashboard
echo.
