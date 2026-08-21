# Zentronyx REST API Specification

Base URL: `/api/v1`

---

## 1. Health & Monitoring

### `GET /api/v1/health`
Returns system operational status, PostgreSQL connectivity latency, and AI service health.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-08-10T12:00:00.000000+00:00",
  "environment": "development",
  "services": {
    "database": {
      "status": "healthy",
      "latency_ms": 1.42,
      "details": "PostgreSQL connected"
    },
    "ai_service": {
      "status": "healthy",
      "latency_ms": 3.12,
      "details": "AI microservice active"
    }
  }
}
```

---

## 2. Authentication

### `POST /api/v1/auth/register`
Registers a new platform user.

### `POST /api/v1/auth/login`
Authenticates user credentials and returns JWT access token.

### `GET /api/v1/auth/me`
Returns current authenticated user details. Requires `Authorization: Bearer <token>`.

### `POST /api/v1/auth/logout`
Invalidates active session token context.

---

## 3. Users (RBAC)

### `GET /api/v1/users`
Lists registered platform users. **Requires ADMIN role**.

---

## 4. Projects

### `GET /api/v1/projects`
Lists projects owned by current user (or all projects if ADMIN).

### `POST /api/v1/projects`
Creates a new security project for current user.
