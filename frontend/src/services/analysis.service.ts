import { apiFetch } from './api';
import { ProjectAnalysis } from '../types/analysis.types';

export const analysisService = {
  async triggerAnalysis(projectId: string): Promise<ProjectAnalysis> {
    return apiFetch<ProjectAnalysis>(`/projects/${projectId}/analysis`, {
      method: 'POST',
    });
  },

  async getLatestAnalysis(projectId: string): Promise<ProjectAnalysis> {
    return apiFetch<ProjectAnalysis>(`/projects/${projectId}/analysis`);
  },
};
