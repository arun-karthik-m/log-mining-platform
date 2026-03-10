# AI-Powered Log Mining Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Data Mining based Log Intelligence Platform that extracts patterns, detects anomalies, and reveals hidden insights from system logs through a visually stunning analytics dashboard.

## 🎯 Project Vision

Build a professional-grade log analytics platform resembling **Splunk** or **Datadog** while remaining feasible for academic data mining projects.

### Core Features

- 🔍 **Data Mining** — Pattern discovery, clustering, and anomaly detection
- 🤖 **Machine Learning** — FP-Growth, K-Means, Isolation Forest algorithms
- 📊 **Interactive Visualization** — Real-time analytics dashboard
- 🎨 **Modern UI/UX** — Dark theme with glassmorphism design

## 🏗️ Architecture

```
Log Sources → Data Ingestion → Parsing → Preprocessing → Mining Engine → Database → API → Dashboard
```

**Layers:**
1. Data Ingestion
2. Data Processing
3. Data Mining
4. Visualization

## 🛠️ Technology Stack

### Backend
- **Python 3.10+** with **FastAPI**
- **Pandas**, **Scikit-learn**, **mlxtend**, **NumPy**
- **Neon** (Serverless PostgreSQL)

### Frontend
- **React 18+** with **TypeScript**
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **Chart.js** / **Apache ECharts** for visualization

## 📁 Project Structure

```
log-mining-platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── mining/
│   │   ├── preprocessing/
│   │   ├── models/
│   │   └── database/
│   └── utils/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   └── styles/
├── docs/
├── tests/
└── .qwen/
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Neon database account

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Neon database URL
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📊 Data Mining Algorithms

| Algorithm | Purpose | Implementation |
|-----------|---------|----------------|
| FP-Growth | Frequent pattern mining | `backend/app/mining/pattern_mining.py` |
| K-Means | Log clustering | `backend/app/mining/clustering.py` |
| Isolation Forest | Anomaly detection | `backend/app/mining/anomaly_detection.py` |

## 📖 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Algorithms](docs/ALGORITHMS.md)
- [API Reference](docs/API.md)
- [Usage Guide](docs/USAGE.md)

## 🧪 Testing

```bash
# Backend tests
pytest

# Frontend tests
npm test
```

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 👥 Academic Project

This project is designed as an academic data mining project demonstrating:
- Data mining algorithm implementation
- Machine learning pipeline
- Full-stack web development
- Professional UI/UX design

---

**Built with ❤️ using FastAPI, React, and Neon**
