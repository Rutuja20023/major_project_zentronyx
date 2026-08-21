export enum SourceType {
  ZIP = 'ZIP',
  GITHUB = 'GITHUB',
}

export enum AcquisitionStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  ACQUIRING = 'ACQUIRING',
  EXTRACTING = 'EXTRACTING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export interface Source {
  id: string;
  project_id: string;
  source_type: SourceType;
  source_url?: string;
  original_filename?: string;
  storage_path?: string;
  branch?: string;
  commit_hash?: string;
  source_fingerprint?: string;
  acquisition_status: AcquisitionStatus;
  file_size: number;
  acquired_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubIngestPayload {
  repository_url: string;
  branch?: string;
}
