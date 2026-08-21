import { apiFetch } from './api';
import { HealthResponse } from '../types/health.types';

export const healthService = {
  async getHealth(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/health');
  }
};
