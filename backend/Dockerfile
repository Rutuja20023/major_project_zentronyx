FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Semgrep SAST & OSV-Scanner CLI toolchain
RUN pip install --no-cache-dir semgrep
RUN curl -fsSL https://github.com/google/osv-scanner/releases/download/v1.8.2/osv-scanner_1.8.2_linux_amd64.tar.gz | tar -xz -C /usr/local/bin osv-scanner || true


COPY --from=builder /install /usr/local
COPY . .

# Create non-root user for security baseline
RUN useradd -m zentronyx && chown -R zentronyx:zentronyx /app
USER zentronyx

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
