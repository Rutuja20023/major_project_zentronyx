import { apiFetch } from './api';
import { CreateScanPayload, Scan, ScanModule, ScanResult } from '../types/scan.types';

export const scanService = {
  async createScan(projectId: string, payload?: CreateScanPayload): Promise<Scan> {
    return apiFetch<Scan>(`/projects/${projectId}/scans`, {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : JSON.stringify({}),
    });
  },

  async getProjectScans(projectId: string): Promise<Scan[]> {
    return apiFetch<Scan[]>(`/projects/${projectId}/scans`);
  },

  async getScanById(projectId: string, scanId: string): Promise<Scan> {
    return apiFetch<Scan>(`/projects/${projectId}/scans/${scanId}`);
  },

  async cancelScan(scanId: string): Promise<Scan> {
    return apiFetch<Scan>(`/scans/${scanId}/cancel`, {
      method: 'POST',
    });
  },

  async getScanModules(scanId: string): Promise<ScanModule[]> {
    return apiFetch<ScanModule[]>(`/scans/${scanId}/modules`);
  },

  async getScanResults(scanId: string, severity?: string, moduleType?: string): Promise<ScanResult[]> {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (moduleType) params.append('module_type', moduleType);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<ScanResult[]>(`/scans/${scanId}/results${queryString}`);
  },
};
