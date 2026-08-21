# Zentronyx Development & Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 22+
- Docker & Docker Compose

---

## Local Setup (Without Docker)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Run Alembic migrations (with PostgreSQL running) or run directly in local SQLite mode:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Database Migrations (Alembic)

To generate a new database migration:
```bash
cd backend
alembic revision --autogenerate -m "description_of_changes"
```

To apply migrations:
```bash
alembic upgrade head
```

---

## Test Execution

### Backend Pytest Suite
```bash
cd backend
pytest -v
```

### Frontend Vitest Suite
```bash
cd frontend
npm test
```
