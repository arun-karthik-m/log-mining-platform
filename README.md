# Log Mining Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full-stack log analytics platform that extracts patterns, detects anomalies, and clusters log entries using data mining algorithms. Upload your log files and get instant insights with a premium dark-themed dashboard.

## Features

- **Pattern Mining** - FP-Growth algorithm discovers frequent event sequences across sessions
- **Anomaly Detection** - Isolation Forest + volume spike + error rate detection with severity scoring
- **Log Clustering** - TF-IDF vectorization + K-Means groups similar log entries by semantic similarity
- **File Upload** - Ingest `.json`, `.csv`, `.log`, `.txt` files with automatic format detection
- **Instant Navigation** - In-memory caching layer eliminates loading delays between pages
- **Real-time Dashboard** - Hourly activity charts, log distribution, metric cards with live data

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy 2.0, Pandas, Scikit-learn, mlxtend |
| **Frontend** | React 18, TypeScript, TailwindCSS, Framer Motion, Recharts |
| **Database** | PostgreSQL (Neon serverless) with asyncpg |

## Project Structure

```
log-mining-platform/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes (logs, mining, dashboard)
│   │   ├── mining/           # FP-Growth, K-Means, Isolation Forest
│   │   ├── preprocessing/    # Parser, cleaner, session builder
│   │   ├── services/         # Business logic layer
│   │   ├── models/           # SQLAlchemy models + Pydantic schemas
│   │   ├── database/         # Neon PostgreSQL connection
│   │   └── main.py           # FastAPI application
│   ├── tests/                # Pytest test suite
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/       # Layout, UI component library
│       ├── pages/            # Upload, Dashboard, LogExplorer, Patterns, Anomalies, Clusters
│       ├── hooks/            # useCachedFetch for instant navigation
│       ├── services/         # API client, types
│       └── styles/           # Premium dark glassmorphism theme
├── data/
│   ├── test_logs.json        # 152 comprehensive test logs
│   └── sample_logs.json      # Basic sample dataset
├── scripts/
│   ├── setup.sh              # Unix setup script
│   └── setup.bat             # Windows setup script
└── docs/
    ├── ARCHITECTURE.md
    └── GETTING_STARTED.md
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL database (Neon recommended)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Edit with your DATABASE_URL
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Load Test Data

```bash
# Upload the test dataset via the UI or API
curl -X POST http://localhost:8000/api/v1/logs/upload \
  -F "file=@data/test_logs.json"

# Run all mining algorithms
curl -X POST http://localhost:8000/api/v1/mining/patterns
curl -X POST http://localhost:8000/api/v1/mining/clusters
curl -X POST http://localhost:8000/api/v1/mining/anomalies
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/logs` | List logs with filtering, search, pagination |
| `POST` | `/api/v1/logs` | Upload logs via JSON body |
| `POST` | `/api/v1/logs/upload` | Upload log file (multipart) |
| `POST` | `/api/v1/logs/webhook` | Webhook for external log sources |
| `GET` | `/api/v1/sessions` | List all sessions |
| `POST` | `/api/v1/mining/patterns` | Run FP-Growth pattern discovery |
| `GET` | `/api/v1/patterns` | Get discovered patterns |
| `POST` | `/api/v1/mining/clusters` | Run K-Means clustering |
| `GET` | `/api/v1/clusters` | Get cluster results |
| `POST` | `/api/v1/mining/anomalies` | Run anomaly detection |
| `GET` | `/api/v1/anomalies` | Get detected anomalies |
| `GET` | `/api/v1/dashboard/metrics` | Dashboard metrics + hourly activity |

Full API docs available at `http://localhost:8000/docs` when the backend is running.

## Data Mining Algorithms

### Pattern Mining (FP-Growth)
- Groups logs by session, extracts event types from messages via keyword matching
- Creates one-hot encoded event sequences, mines frequent itemsets
- Returns patterns with support, confidence, and frequency metrics

### Clustering (TF-IDF + K-Means)
- Vectorizes log messages using TF-IDF (unigrams + bigrams, 1000 max features)
- Clusters using K-Means with configurable k (default 5, auto-detect via elbow method)
- Extracts top keywords per cluster from TF-IDF centroids

### Anomaly Detection
- **Isolation Forest**: 6-feature extraction (level, message length, word count, error keywords, numbers, hour) with contamination-based scoring
- **Volume Spike**: 5-minute window aggregation, flags buckets >3 standard deviations above mean
- **Error Rate**: 10-minute windows, flags >30% error rate with severity scaling

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## License

MIT License - see [LICENSE](LICENSE) for details.
