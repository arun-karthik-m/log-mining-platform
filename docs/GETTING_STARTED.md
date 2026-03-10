# Getting Started

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Neon Database Account** - [Sign up](https://console.neon.tech)

## Quick Start

### 1. Clone the Repository

```bash
cd /Users/arunkarthikm/Documents/log-mining-platform
```

### 2. Run Setup Script

**macOS/Linux:**
```bash
bash scripts/setup.sh
```

**Windows:**
```cmd
scripts\setup.bat
```

### 3. Configure Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string
4. Update `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/log_mining?sslmode=require
   ```

### 4. Run Database Migrations

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
alembic -c migrations/alembic.ini upgrade head
```

### 5. Start Development Servers

**Option A: Using Make (recommended)**
```bash
make dev
```

**Option B: Manual**

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## Verify Installation

### Backend Health Check

```bash
curl http://localhost:8000/docs
```

Should return the OpenAPI documentation.

### Frontend Health Check

Open http://localhost:3000 in your browser. You should see the dashboard.

## Next Steps

1. **Upload Sample Data**: Use the sample logs in `data/sample_logs.json`
2. **Explore API**: Visit http://localhost:8000/docs
3. **Run Mining**: Trigger pattern discovery via API
4. **View Dashboard**: Check the frontend for visualizations

## Common Commands

```bash
# Run tests
make test

# Run linters
make lint

# View all commands
make help
```

## Troubleshooting

### Port Already in Use

If port 8000 or 3000 is in use:

**Backend**: Edit `backend/.env` and change `PORT`
**Frontend**: Edit `frontend/vite.config.ts` and change `port`

### Database Connection Failed

1. Verify your Neon connection string
2. Check network connectivity
3. Ensure SSL mode is set to `require`

### Module Not Found

**Backend**:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Getting Help

- Check the [Architecture](ARCHITECTURE.md) documentation
- Review the [API Guide](API.md)
- Open an issue on the repository
