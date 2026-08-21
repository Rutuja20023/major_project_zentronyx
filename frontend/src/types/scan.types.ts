export enum ScanStatus {
  CREATED = 'CREATED',
  QUEUED = 'QUEUED',
  PREPARING = 'PREPARING',
  RUNNING = 'RUNNING',
  AGGREGATING = 'AGGREGATING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export enum ModuleStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  SKIPPED = 'SKIPPED',
}

export enum ModuleType {
  SAST = 'SAST',
  SCA = 'SCA',
  DAST = 'DAST',
  BINARY_ANALYSIS = 'BINARY_ANALYSIS',
  GNN = 'GNN',
}

export enum FindingSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum FindingConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface ScanModule {
  id: string;
  scan_id: string;
  module_type: ModuleType;
  status: ModuleStatus;
  findings_count: number;
  skip_reason?: string;
  error_message?: string;
  execution_time_ms: number;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  scan_module_id?: string;
  module_type: ModuleType;
  title: string;
  description: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  category: string;
  file?: string;
  line?: number;
  column?: number;
  scanner: string;
  rule_id: string;
  recommendation?: string;
  raw_metadata?: Record<string, any>;
  created_at: string;
}

export interface Scan {
  id: string;
  project_id: string;
  source_id?: string;
  analysis_id?: string;
  source_fingerprint?: string;

  status: ScanStatus;
  findings_count: number;
  severity_summary?: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  error_message?: string;

  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScanPayload {
  requested_modules?: ModuleType[];
}
