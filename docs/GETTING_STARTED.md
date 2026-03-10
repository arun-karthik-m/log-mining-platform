# Getting Started

## Prerequisites

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL database** - [Neon](https://console.neon.tech) (recommended, free tier available)

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/arun-karthik-m/log-mining-platform.git
cd log-mining-platform
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Database

1. Create a [Neon](https://console.neon.tech) project (or use any PostgreSQL instance)
2. Copy the connection string
3. Create `backend/.env` from the example:

```bash
cp .env.example .env
```

4. Edit `backend/.env` and set your `DATABASE_URL`:
```
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.region.aws.neon.tech/dbname
```

### 4. Run Database Migrations

```bash
cd backend
source venv/bin/activate
alembic -c migrations/alembic.ini upgrade head
```

### 5. Start the Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Backend will be available at http://localhost:8000

### 6. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:3000

## Load Test Data

Upload the included test dataset (152 logs with sessions, error bursts, and varied sources):

```bash
curl -X POST http://localhost:8000/api/v1/logs/upload \
  -F "file=@data/test_logs.json"
```

Then run all mining algorithms:

```bash
# Discover patterns
curl -X POST "http://localhost:8000/api/v1/mining/patterns?min_support=0.1"

# Cluster logs
curl -X POST "http://localhost:8000/api/v1/mining/clusters?n_clusters=5"

# Detect anomalies
curl -X POST "http://localhost:8000/api/v1/mining/anomalies"
```

Now open http://localhost:3000 to see the dashboard with real data.

## Test Live Streaming

Install `requests` if not already available, then run the log generator:

```bash
pip install requests
python scripts/live_log_generator.py --interval 1 --batch-size 3
```

Open the **Sources** page in the frontend and click **Connect** to see logs appear in real-time via WebSocket.

## Access Points

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation (Swagger) | http://localhost:8000/docs |
| API Documentation (ReDoc) | http://localhost:8000/redoc |

## Using the Platform

1. **Dashboard** - Overview with metric cards, hourly activity chart (real data), log level distribution pie chart
2. **Sources** - Upload log files (drag & drop) or connect to live WebSocket stream
3. **Log Explorer** - Search, filter by level, paginate through all log entries
4. **Patterns** - Click "Discover Patterns" to run FP-Growth, view frequent event sequences with support metrics
5. **Anomalies** - Click "Run Detection" to run Isolation Forest + volume/error rate detection, view severity-coded results
6. **Clusters** - Click "Run Clustering" to group logs by semantic similarity, view keyword tags and distribution

## Troubleshooting

### Port already in use
```bash
# Kill process on port 8000
kill $(lsof -ti:8000)
```

### Database connection failed
- Verify your `DATABASE_URL` in `backend/.env`
- Ensure the connection string uses `postgresql+asyncpg://` prefix
- Check network connectivity to Neon

### Module not found (backend)
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Module not found (frontend)
```bash
cd frontend
rm -rf node_modules
npm install
```
