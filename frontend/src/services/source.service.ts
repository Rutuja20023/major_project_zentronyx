import { apiFetch } from './api';
import { GitHubIngestPayload, Source } from '../types/source.types';

export const sourceService = {
  async getSources(projectId: string): Promise<Source[]> {
    return apiFetch<Source[]>(`/projects/${projectId}/sources`);
  },

  async getSourceById(projectId: string, sourceId: string): Promise<Source> {
    return apiFetch<Source>(`/projects/${projectId}/sources/${sourceId}`);
  },

  async uploadZipSource(projectId: string, file: File): Promise<Source> {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<Source>(`/projects/${projectId}/sources/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  async ingestGitHubSource(projectId: string, payload: GitHubIngestPayload): Promise<Source> {
    return apiFetch<Source>(`/projects/${projectId}/sources/github`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteSource(projectId: string, sourceId: string): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/sources/${sourceId}`, {
      method: 'DELETE',
    });
  },
};
