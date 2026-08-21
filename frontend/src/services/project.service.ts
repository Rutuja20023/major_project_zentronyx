import { apiFetch } from './api';
import { CreateProjectPayload, Project } from '../types/project.types';

export const projectService = {
  async getProjects(): Promise<Project[]> {
    return apiFetch<Project[]>('/projects');
  },

  async createProject(payload: CreateProjectPayload): Promise<Project> {
    return apiFetch<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProjectById(id: string): Promise<Project> {
    return apiFetch<Project>(`/projects/${id}`);
  },

  async updateProject(id: string, payload: Partial<CreateProjectPayload>): Promise<Project> {
    return apiFetch<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteProject(id: string): Promise<void> {
    return apiFetch<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }
};

