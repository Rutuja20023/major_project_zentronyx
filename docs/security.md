# Zentronyx Security Baseline & Architecture Specification

## Security Principles

Zentronyx strictly adheres to DevSecOps security principles and secure defaults:

### 1. Password Security
- Passwords are hashed using `bcrypt` with automatic salt generation and work factor 12.
- Plaintext passwords are never logged, cached, or persisted.
- Password hashes are excluded from API schema serialization (`UserResponse`).

### 2. JWT Authentication
- Signed using `HS256` with strict expiration claims (`exp`, `iat`, `iss`).
- Tokens include user UUID and role claims (`USER`, `ADMIN`).

### 3. Role-Based Access Control (RBAC)
- **Roles**: `USER` and `ADMIN`.
- Authorization dependencies enforce role constraints (`require_admin`, `require_role`).
- Resource ownership validation prevents Horizontal Privilege Escalation (IDOR).

### 4. HTTP Security Headers
All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 5. Sensitive Data Redaction
Log filters sanitize log fields matching `password`, `token`, `access_token`, `secret`, or `authorization`.

### 6. Command Execution Baseline
Arbitrary shell execution (`subprocess.Popen(..., shell=True)`) is strictly forbidden.
