# Makefile for Log Mining Intelligence Platform

.PHONY: help setup backend-venv install-backend install-frontend run-backend run-frontend dev clean test lint

# Default target
help:
	@echo "Log Mining Intelligence Platform - Available Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Run full project setup"
	@echo ""
	@echo "Backend:"
	@echo "  make backend-venv   - Create Python virtual environment"
	@echo "  make install-backend - Install backend dependencies"
	@echo "  make run-backend    - Start FastAPI server"
	@echo "  make migrate        - Run database migrations"
	@echo ""
	@echo "Frontend:"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make run-frontend   - Start Vite dev server"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Run both backend and frontend"
	@echo "  make test           - Run tests"
	@echo "  make lint           - Run linters"
	@echo "  make clean          - Clean build artifacts"

# Setup
setup:
	@echo "Running project setup..."
	bash scripts/setup.sh

# Backend
backend-venv:
	cd backend && python3 -m venv venv

install-backend:
	cd backend && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

run-backend:
	cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	cd backend && source venv/bin/activate && alembic -c migrations/alembic.ini upgrade head

# Frontend
install-frontend:
	cd frontend && npm install

run-frontend:
	cd frontend && npm run dev

# Development
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "API Docs: http://localhost:8000/docs"
	@echo ""
	cd backend && source venv/bin/activate && uvicorn app.main:app --reload &
	cd frontend && npm run dev

# Testing
test:
	cd backend && source venv/bin/activate && pytest
	cd frontend && npm test

# Linting
lint:
	cd backend && source venv/bin/activate && ruff check . && mypy .
	cd frontend && npm run lint

# Clean
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -name "*.pyc" -delete
	cd frontend && rm -rf node_modules dist
	@echo "Cleaned build artifacts"
