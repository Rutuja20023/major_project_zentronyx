export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN'
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  repository_url?: string;
  owner_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  repository_url?: string;
}
