import { apiFetch } from './api';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('zentronyx_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export const reportService = {
  async getJsonReport(scanId: string): Promise<Record<string, any>> {
    return apiFetch<Record<string, any>>(`/scans/${scanId}/report`);
  },

  async downloadPdfReport(scanId: string, projectName: string = 'project'): Promise<void> {
    const headers = getAuthHeader();
    const response = await fetch(`${BASE_URL}/scans/${scanId}/report/pdf`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to generate PDF report (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentronyx_report_${sanitizeFilename(projectName)}_${scanId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadHtmlReport(scanId: string, projectName: string = 'project'): Promise<void> {
    const headers = getAuthHeader();
    const response = await fetch(`${BASE_URL}/scans/${scanId}/report/html`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to generate HTML report (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentronyx_report_${sanitizeFilename(projectName)}_${scanId.substring(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadCsvReport(scanId: string, projectName: string = 'project'): Promise<void> {
    const headers = getAuthHeader();
    const response = await fetch(`${BASE_URL}/scans/${scanId}/report/csv`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to generate CSV report (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentronyx_findings_${sanitizeFilename(projectName)}_${scanId.substring(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadJsonReportFile(scanId: string, projectName: string = 'project'): Promise<void> {
    const data = await this.getJsonReport(scanId);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentronyx_audit_${sanitizeFilename(projectName)}_${scanId.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
