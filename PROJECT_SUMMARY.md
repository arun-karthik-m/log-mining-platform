# Project Summary

## Log Mining Intelligence Platform

**Version:** 1.0.0
**Date:** March 2026

---

## Overview

A full-stack log analytics platform that ingests logs from multiple sources (file upload, webhook, WebSocket streaming), processes them through a parsing and session-building pipeline, and applies data mining algorithms (FP-Growth, K-Means, Isolation Forest) to discover patterns, cluster entries, and detect anomalies. Results are displayed through a premium dark-themed React dashboard with instant navigation.

---

## Architecture

```
Log Sources (File Upload / Webhook / WebSocket)
        ↓
Ingestion Layer (FastAPI REST + WebSocket endpoints)
        ↓
Processing Pipeline (Parser → Cleaner → Session Builder)
        ↓
Mining Engine (FP-Growth | K-Means + TF-IDF | Isolation Forest)
        ↓
PostgreSQL (Neon Serverless)
        ↓
REST API + Dashboard (React + TypeScript + Recharts)
```

---

## Features Implemented

### Log Ingestion
- [x] Multi-format parsing (JSON, Syslog, Apache, CSV, plain text)
- [x] File upload via multipart form data (.json, .csv, .log, .txt)
- [x] Webhook endpoint for external log sources
- [x] WebSocket live streaming with auto-reconnect and keepalive
- [x] Automatic session construction from metadata keys
- [x] Log cleaning, deduplication, level standardization

### Data Mining
- [x] FP-Growth frequent pattern mining with support/confidence metrics
- [x] Event type extraction via keyword matching (Auth, Search, Error, Timeout, etc.)
- [x] TF-IDF vectorization + K-Means clustering with keyword extraction
- [x] Isolation Forest anomaly detection (6-feature extraction)
- [x] Volume spike detection (5-minute windowed, 3x std threshold)
- [x] Error rate anomaly detection (10-minute windows, 30% threshold)
- [x] Severity scoring (low/medium/high/critical) for all anomaly types

### Frontend
- [x] Dashboard with real-time metrics, hourly activity chart, log level pie chart
- [x] Log Explorer with search, level filtering, pagination
- [x] Pattern visualization with sequence flow, support bars, frequency counts
- [x] Anomaly cards with severity color coding and type badges
- [x] Cluster cards with keyword tags, distribution bars, summary stats
- [x] Sources page with drag-and-drop file upload and live WebSocket stream
- [x] In-memory caching (useCachedFetch) for instant tab switching
- [x] Premium dark theme with glassmorphism, ambient background, animations
- [x] Mobile-responsive sidebar with spring-physics navigation indicator

### Testing & Data
- [x] Comprehensive test dataset (152 logs, 10 user sessions, error bursts)
- [x] Live log generator script for streaming tests
- [x] End-to-end verified: upload → parse → session build → mine → visualize
- [x] All mining algorithms produce meaningful, verified results

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.10+ | Core language |
| FastAPI | REST API + WebSocket |
| SQLAlchemy 2.0 (async) | ORM with asyncpg driver |
| Pandas | Data processing |
| Scikit-learn | K-Means, Isolation Forest, TF-IDF |
| mlxtend | FP-Growth algorithm |
| Pydantic v2 | Request/response validation |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| TailwindCSS | Styling (custom dark theme) |
| Framer Motion | Animations and transitions |
| Recharts | Area charts, pie charts |
| date-fns | Timestamp formatting |
| Axios | HTTP client |

### Database
| Technology | Purpose |
|------------|---------|
| Neon PostgreSQL | Serverless database |
| Alembic | Schema migrations |
| asyncpg | Async PostgreSQL driver |

---

## API Endpoints

### Log Management
- `POST /api/v1/logs` - Upload logs via JSON
- `POST /api/v1/logs/upload` - Upload log file (multipart)
- `POST /api/v1/logs/webhook` - Webhook for external sources
- `GET /api/v1/logs` - List with filtering, search, pagination
- `GET /api/v1/logs/{id}` - Single log detail
- `GET /api/v1/sessions` - List all sessions
- `WS /ws/logs` - WebSocket live stream

### Mining Operations
- `POST /api/v1/mining/patterns` - Run FP-Growth
- `POST /api/v1/mining/clusters` - Run K-Means
- `POST /api/v1/mining/anomalies` - Run Isolation Forest + spike detection
- `GET /api/v1/patterns` - Get discovered patterns
- `GET /api/v1/clusters` - Get cluster results
- `GET /api/v1/anomalies` - Get detected anomalies
- `GET /api/v1/dashboard/metrics` - Metrics + hourly activity

---

## Verified Mining Results (Test Dataset)

| Algorithm | Results |
|-----------|---------|
| **Pattern Mining** | 9 patterns found. Top: `WARN:Timeout → ERROR:Error` (26.7% support across 30 sessions) |
| **Clustering** | 5 clusters: API/DB ops (80), Errors (36), Auth (20), Search (18), Test (3) |
| **Anomaly Detection** | 17 anomalies: 1 critical (72.7% error rate in payment burst), time-based off-hours, error spikes |

---

## Project Structure

```
log-mining-platform/
├── backend/
│   ├── app/
│   │   ├── api/                  # log_routes.py, mining_routes.py
│   │   ├── mining/               # pattern_mining.py, clustering.py, anomaly_detection.py
│   │   ├── preprocessing/        # log_parser.py, log_cleaner.py, session_builder.py
│   │   ├── services/             # log_service.py, mining_service.py
│   │   ├── models/               # log_model.py (SQLAlchemy), schemas.py (Pydantic)
│   │   ├── database/             # db_connection.py (async SQLAlchemy + Neon)
│   │   ├── websocket.py          # WebSocket ConnectionManager
│   │   ├── config.py             # Pydantic Settings from .env
│   │   └── main.py               # FastAPI app with CORS, error handling
│   ├── migrations/               # Alembic migrations
│   ├── tests/                    # Pytest suite
│   ├── utils/                    # Logger, error handlers, exceptions
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout.tsx        # Sidebar with animated nav indicator
│       │   └── ui/index.tsx      # PageTransition, MetricCard, Skeleton, etc.
│       ├── pages/
│       │   ├── Dashboard.tsx     # Metrics, hourly chart, log distribution
│       │   ├── Sources.tsx       # File upload + WebSocket live stream
│       │   ├── LogExplorer.tsx   # Search, filter, paginated table
│       │   ├── Patterns.tsx      # Pattern cards with sequence flow
│       │   ├── Anomalies.tsx     # Severity cards + anomaly list
│       │   └── Clusters.tsx      # Cluster cards with keywords
│       ├── hooks/
│       │   └── useCache.ts       # useCachedFetch + invalidateCache
│       ├── services/
│       │   ├── api.ts            # API + LogStreamService (WebSocket)
│       │   ├── apiClient.ts      # Axios instance
│       │   └── types.ts          # TypeScript interfaces
│       └── styles/
│           └── index.css         # Glassmorphism design system
├── data/
│   ├── test_logs.json            # 152 test logs (sessions, errors, services)
│   └── sample_logs.json          # Basic sample dataset
├── scripts/
│   └── live_log_generator.py     # Sends logs to webhook endpoint
├── docs/
│   ├── ARCHITECTURE.md
│   └── GETTING_STARTED.md
├── README.md
├── LICENSE (MIT)
└── Makefile
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.
