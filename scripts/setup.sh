#!/bin/bash
# Development setup script for Log Mining Platform

set -e

echo "🚀 Setting up Log Mining Intelligence Platform..."

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  Please update .env with your Neon database URL"
fi

cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend

# Install dependencies
npm install
echo "✅ Frontend dependencies installed"

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a Neon database at https://console.neon.tech"
echo "2. Update backend/.env with your DATABASE_URL"
echo "3. Run 'make run-backend' to start the API"
echo "4. Run 'make run-frontend' to start the dashboard"
echo ""
