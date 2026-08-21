# Zentronyx Architecture Specification

## Overview

Zentronyx follows a modular, layered architecture with strict separation of concerns, secure defaults, and decoupled microservices.

```
                  +-----------------------------------+
                  |   React + TypeScript Frontend     |
                  |     (Cybersecurity UI/UX)         |
                  +-----------------+-----------------+
                                    |
                                    | REST API (JWT)
                                    v
                  +-----------------------------------+
                  |       FastAPI API Gateway         |
                  |  (Auth, Users, Projects, Health)  |
                  +--------+-----------------+--------+
                           |                 |
            Async SQLAlchemy |                 | Async HTTP
                           v                 v
                  +-----------------+   +-------------------+
                  | PostgreSQL DB   |   |   AI Microservice |
                  | (Tables: users, |   | (PyTorch/GNN Stub)|
                  | projects, scans)|   +-------------------+
                  +-----------------+
```

---

## Layer Responsibilities

### 1. Presentation Layer (`frontend/src/`)
- Single Page Application built with React, TypeScript, and Tailwind CSS.
- Centralized `apiFetch` service attached with automatic Bearer JWT injection, response parsing, and error normalization.
- AuthContext managing authentication state and session persistence in `localStorage`.

### 2. API Gateway & Application Layer (`backend/app/`)
- **`api/`**: OpenAPI routes defining request/response schemas.
- **`middleware/`**: Cross-cutting concerns including security headers (`nosniff`, `DENY`), request ID tracking, and centralized exception handling.
- **`security/`**: Bcrypt hashing and PyJWT token generation/decoding.
- **`services/`**: Business logic encapsulation (AuthService, HealthService).
- **`repositories/`**: Data access layer isolating SQLAlchemy queries.
- **`models/`**: SQLAlchemy v2 Declarative ORM models.

### 3. Database Layer (`PostgreSQL 16`)
- Relational schema managed by Alembic migrations.
- UUID primary keys for resource isolation and security against enumeration attacks.

### 4. AI Microservice Layer (`ai-service/`)
- Independently deployable microservice providing GNN inference contracts.
- Independent lifecycle: Backend gracefully handles AI service unavailability (`degraded` status) without crashing.
