import { apiFetch } from './api';

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  max_critical_findings: number;
  max_high_findings: number;
  max_malware_probability: number;
  block_on_dast_critical: boolean;
  block_on_critical_sca: boolean;
}

export interface PolicyEvaluationResult {
  scan_id: string;
  project_id: string;
  decision: 'PASS' | 'WARN' | 'BLOCK';
  reasons: string[];
  rule_violations: Array<Record<string, any>>;
}

export const policyService = {
  async getPolicies(): Promise<SecurityPolicy[]> {
    return apiFetch<SecurityPolicy[]>('/policies');
  },

  async evaluateScanPolicy(scanId: string, policyId?: string): Promise<PolicyEvaluationResult> {
    const url = policyId ? `/policies/scans/${scanId}/evaluate?policy_id=${policyId}` : `/policies/scans/${scanId}/evaluate`;
    return apiFetch<PolicyEvaluationResult>(url, {
      method: 'POST',
    });
  },
};
