import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScanExecutionFlow } from '../src/components/scans/ScanExecutionFlow';
import { Scan, ScanStatus } from '../src/types/scan.types';

// Mock scan service with pure literals to avoid hoisting issues
vi.mock('../src/services/scan.service', () => ({
  scanService: {
    getScanById: vi.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'scan-test-12345678',
        project_id: 'proj-1',
        status: 'COMPLETED',
        findings_count: 5,
        severity_summary: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 1, INFO: 0 },
        started_at: '2026-09-29T10:00:00Z',
        finished_at: '2026-09-29T10:00:04Z',
        created_at: '2026-09-29T10:00:00Z',
        updated_at: '2026-09-29T10:00:04Z',
      })
    ),
    getScanModules: vi.fn().mockImplementation(() =>
      Promise.resolve([
        {
          id: 'mod-1',
          scan_id: 'scan-test-12345678',
          module_type: 'SAST',
          status: 'COMPLETED',
          findings_count: 2,
          execution_time_ms: 350,
          created_at: '2026-09-29T10:00:00Z',
        },
        {
          id: 'mod-2',
          scan_id: 'scan-test-12345678',
          module_type: 'SCA',
          status: 'COMPLETED',
          findings_count: 3,
          execution_time_ms: 280,
          created_at: '2026-09-29T10:00:00Z',
        },
      ])
    ),
    cancelScan: vi.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'scan-test-12345678',
        status: 'CANCELLED',
      })
    ),
  },
}));

describe('ScanExecutionFlow Component', () => {
  const mockScan: Scan = {
    id: 'scan-test-12345678',
    project_id: 'proj-1',
    status: ScanStatus.RUNNING,
    findings_count: 0,
    created_at: '2026-09-29T10:00:00Z',
    updated_at: '2026-09-29T10:00:00Z',
  };

  it('renders interactive step-by-step pipeline stages', async () => {
    render(
      <ScanExecutionFlow
        scan={mockScan}
        projectId="proj-1"
        projectName="Zentronyx Core"
      />
    );

    // Header & Target
    expect(screen.getByText(/Target: Zentronyx Core/i)).toBeInTheDocument();

    // Verify key step pipeline stages are rendered
    expect(screen.getByText(/Workspace Sandbox & AST Ingestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Static Application Security Testing/i)).toBeInTheDocument();
    expect(screen.getByText(/Software Composition Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Dynamic Application Security Testing/i)).toBeInTheDocument();
    expect(screen.getByText(/Binary & Executable Hardening/i)).toBeInTheDocument();
    expect(screen.getByText(/GNN AI Vulnerability & Malware Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Policy Gate & Finding Aggregation/i)).toBeInTheDocument();
    expect(screen.getByText(/Security Clearance & Attestation/i)).toBeInTheDocument();

    // Audit console section
    expect(screen.getByText(/Zentronyx Orchestration Audit Console/i)).toBeInTheDocument();
  });

  it('toggles audit console stream visibility', () => {
    render(
      <ScanExecutionFlow
        scan={mockScan}
        projectId="proj-1"
      />
    );

    const toggleBtn = screen.getByText(/Hide Stream/i);
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Expand Stream/i)).toBeInTheDocument();
  });
});
