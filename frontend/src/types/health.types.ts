export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable';
  latency_ms?: number;
  details?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  environment: string;
  services: {
    database: ServiceHealth;
    ai_service: ServiceHealth;
  };
}
