# Architecture Documentation

## System Overview

The Log Mining Intelligence Platform follows a layered architecture pattern, separating concerns into distinct layers for maintainability and scalability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Log Sources                                 │
│              (Web / System / Application Logs)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Ingestion Layer                          │
│              (API Endpoints, File Upload)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Log Parsing Engine                             │
│         (Format Detection, Field Extraction)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Data Preprocessing                              │
│        (Cleaning, Normalization, Session Building)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Mining Engine                             │
│    ┌─────────────┬─────────────┬─────────────┐                  │
│    │   Pattern   │  Clustering │   Anomaly   │                  │
│    │   Mining    │  (K-Means)  │  Detection  │                  │
│    │ (FP-Growth) │             │(Isolation   │                  │
│    │             │             │   Forest)   │                  │
│    └─────────────┴─────────────┴─────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Storage                                   │
│              (Neon - Serverless PostgreSQL)                      │
│    ┌────────┬──────────┬─────────┬──────────┬─────────┐        │
│    │  logs  │ sessions │ patterns│ anomalies│ clusters│        │
│    └────────┴──────────┴─────────┴──────────┴─────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Analytics API Layer                            │
│              (FastAPI REST Endpoints)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend Visualization Dashboard                    │
│              (React + TypeScript + TailwindCSS)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Data Ingestion Layer
- Accept logs via REST API
- Support file uploads (JSON, CSV)
- Validate incoming data format

### 2. Log Parsing Engine
- Detect log format automatically
- Extract timestamp, level, message, source
- Parse structured metadata

### 3. Data Preprocessing
- Clean and normalize log data
- Remove duplicates
- Build sessions from related logs
- Handle missing values

### 4. Data Mining Engine
- **Pattern Mining**: Discover frequent event sequences using FP-Growth
- **Clustering**: Group similar logs using TF-IDF + K-Means
- **Anomaly Detection**: Identify unusual patterns using Isolation Forest

### 5. Data Storage
- PostgreSQL via Neon (serverless)
- Connection pooling for efficiency
- Indexed queries for performance

### 6. Analytics API Layer
- RESTful endpoints for all operations
- Pagination and filtering support
- OpenAPI documentation

### 7. Frontend Dashboard
- Real-time analytics visualization
- Interactive log exploration
- Pattern and anomaly displays

## Technology Flow

```
User Action → Frontend → API → Service → Mining/DB → Response
     │                                              │
     └──────────────────────────────────────────────┘
```

## Design Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Loose Coupling**: Layers communicate through well-defined interfaces
3. **Stateless Algorithms**: Mining functions are pure and testable
4. **Environment Configuration**: No hardcoded values
5. **Type Safety**: Full type hints in Python and TypeScript
