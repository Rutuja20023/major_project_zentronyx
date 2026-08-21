export interface ProjectAnalysis {
  id: string;
  project_id: string;
  source_id?: string;
  source_fingerprint?: string;

  primary_language?: string;
  detected_languages?: string[];
  language_statistics?: Record<string, { file_count: number; byte_size: number; percentage: number }>;

  framework?: string;
  framework_version?: string;
  build_system?: string;

  dependency_manifests?: string[];
  entry_points?: string[];

  application_type?: string;
  binary_capable: boolean;
  binary_type?: string;

  statistics?: {
    total_files: number;
    total_lines: number;
    code_lines: number;
    comment_lines: number;
    blank_lines: number;
    test_files_count: number;
    config_files_count: number;
    doc_files_count: number;
  };
  warnings?: string[];
  confidence: number;
  status: string;

  created_at: string;
  updated_at: string;
}
