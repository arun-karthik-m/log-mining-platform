# Architecture

## System Overview

The platform follows a layered architecture with clear separation between ingestion, processing, mining, storage, and presentation.

```
┌──────────────────────────────────────────────────────────────┐
│                      Log Sources                              │
│      File Upload (.json/.csv/.log/.txt)  |  Webhook API       │
│      WebSocket Live Stream  |  REST API JSON Body             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   Ingestion Layer (FastAPI)                    │
│   POST /logs  |  POST /logs/upload  |  POST /logs/webhook     │
│                  WS /ws/logs (live stream)                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   Processing Pipeline                         │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐        │
│  │ Log Parser │→ │Log Cleaner │→ │ Session Builder  │        │
│  │ (multi-fmt)│  │ (dedup,    │  │ (time-window,   │        │
│  │            │  │  normalize)│  │  metadata keys)  │        │
│  └────────────┘  └────────────┘  └─────────────────┘        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Mining Engine                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐     │
│  │   Pattern    │ │  Clustering  │ │Anomaly Detection │     │
│  │   Mining     │ │  TF-IDF +    │ │ Isolation Forest │     │
│  │  FP-Growth   │ │  K-Means     │ │ + Volume Spike   │     │
│  │  (mlxtend)   │ │ (sklearn)    │ │ + Error Rate     │     │
│  └──────────────┘ └──────────────┘ └──────────────────┘     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              PostgreSQL (Neon Serverless)                      │
│  ┌──────┐ ┌──────────┐ ┌────────┐ ┌─────────┐ ┌────────┐   │
│  │ logs │ │ sessions │ │patterns│ │anomalies│ │clusters│   │
│  └──────┘ └──────────┘ └────────┘ └─────────┘ └────────┘   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│               REST API (FastAPI + Pydantic)                   │
│    GET/POST /logs  |  /patterns  |  /anomalies  |  /clusters │
│    GET /dashboard/metrics (hourly activity + totals)          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│            Frontend (React + TypeScript)                       │
│  Dashboard | Log Explorer | Patterns | Anomalies | Clusters  │
│  Sources (File Upload + Live WebSocket Stream)                │
│  In-memory cache (useCachedFetch) for instant tab switching   │
│  Dark theme | Glassmorphism | Framer Motion animations        │
└──────────────────────────────────────────────────────────────┘
```

## Layer Details

### Ingestion Layer
- **File Upload**: `POST /logs/upload` accepts multipart form data. Supports JSON arrays, CSV with auto-column mapping, and plain text (one log per line).
- **JSON API**: `POST /logs` accepts `{"logs": [...]}` or single log objects.
- **Webhook**: `POST /logs/webhook` for external services to push logs. Same format flexibility.
- **WebSocket**: `WS /ws/logs` provides real-time streaming. Backend broadcasts new logs to all connected clients via `ConnectionManager`.

### Processing Pipeline
1. **Log Parser** (`log_parser.py`): Auto-detects format (JSON, syslog, Apache, generic timestamp). Extracts timestamp, level, message, source. Supports field aliases (e.g., `@timestamp`, `msg`, `severity`).
2. **Log Cleaner** (`log_cleaner.py`): Deduplication, noise filtering, level standardization (`WARNING→WARN`, `FATAL→CRITICAL`).
3. **Session Builder** (`session_builder.py`): Groups logs by `metadata.session_id` > `metadata.user_id` > `metadata.request_id` > `source`. 30-minute timeout between session events.

### Mining Engine
- **Pattern Mining**: Extracts event types from messages via keyword matching (login→Auth, search→Search, error→Error, timeout→Timeout, etc.). Groups by session, creates one-hot encoded sequences, runs FP-Growth.
- **Clustering**: Combines `{level} {message} {source}` into feature text, TF-IDF with 1-2 ngrams (1000 max features), K-Means with configurable k.
- **Anomaly Detection**: Three independent detectors run in parallel. Isolation Forest uses 6 features per log. Results are merged and stored with severity levels.

### Frontend Caching
All pages use `useCachedFetch` hook that:
- Returns cached data instantly on mount (no loading skeleton)
- Fetches fresh data in background
- Supports configurable TTL and dependency-based cache invalidation
- Combined with removed `key={location.pathname}` from Layout, enables instant tab switching

## Database Schema

| Table | Key Columns |
|-------|------------|
| `logs` | id, timestamp, level, message, source, session_id (FK), metadata (JSONB) |
| `sessions` | id, session_key (unique), start_time, end_time, event_count |
| `patterns` | id, pattern_sequence (TEXT[]), support, confidence, frequency |
| `anomalies` | id, anomaly_type, severity, description, detected_at, metadata (JSONB) |
| `clusters` | id, cluster_name, centroid_vector (FLOAT[]), log_count, keywords (TEXT[]) |

## Design Principles

1. **Stateless algorithms** - Mining functions are pure, take lists of dicts, return results
2. **Async throughout** - asyncpg + SQLAlchemy async for non-blocking DB operations
3. **Service layer pattern** - LogService and MiningService encapsulate business logic
4. **No component remounting** - Frontend preserves component state across navigation
5. **Environment configuration** - All secrets and settings via `.env`
