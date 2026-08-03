import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getAccountReports: vi.fn(), getAuditLogs: vi.fn(), getSystemTracking: vi.fn(), getUsers: vi.fn(), getAllJobPosts: vi.fn(), getAllProposals: vi.fn() }));
vi.mock('../../../api/adminAPI/GET', () => ({ adminGetAPI: api }));
vi.mock('../../../api/jobAPI/GET', () => ({ jobGetAPI: { getAllJobPosts: api.getAllJobPosts } }));
vi.mock('../../../api/proposalAPI/GET', () => ({ proposalGetAPI: { getAllProposals: api.getAllProposals } }));
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import AdminAccountReportsScreen from './AdminAccountReportsScreen';
import AdminSystemTrackingScreen from './AdminSystemTrackingScreen';

describe('Phase 1 Admin screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAccountReports.mockResolvedValue({ success: true, data: { items: [{ id:'report-1', reporterId:'reporter-1', reporterName:'Reporter', reportedUserId:'user-1', reportedUserName:'Reported User', type:1, status:0, reason:'Fraud evidence', createdAt:'2026-08-01T00:00:00Z', evidenceCount:2, accountStatus:0, violationCount:1, isFlagged:true }], totalCount:1, pageNumber:1, totalPages:1 } });
    api.getAuditLogs.mockResolvedValue({ success: true, data: { items: [{ auditLogId:'audit-1', adminName:'Admin User', action:'AccountReport.Warning', entityType:'Report', entityId:'report-1', oldValues:'{"status":0}', newValues:'{"status":2}', correlationId:'18cc1e4e-bfd8-4511-a786-c84f554670ef', userAgent:'Safe Browser', createdAt:'2026-08-01T00:00:00Z' }], totalCount:1, pageNumber:1, totalPages:1 } });
    api.getUsers.mockResolvedValue({ success: true, data: { items: [], totalCount: 0, pageNumber: 1, totalPages: 1 } });
    api.getAllJobPosts.mockResolvedValue({ success: true, data: [] });
    api.getAllProposals.mockResolvedValue({ success: true, data: [] });
    // Real-shaped snapshot from the backend contract: empty collections are still
    // valid and produce no synthetic rows. The audit tab renders from getAuditLogs.
    api.getSystemTracking.mockResolvedValue({ success: true, data: {
      generatedAt: '2026-08-01T00:00:00Z', environment: 'Test', startedAt: '2026-08-01T00:00:00Z',
      uptimeSeconds: 0, retentionMode: 'retention', retainedEntryLimit: 100,
      overview: { status: 'healthy', totalRequests: 0, errorRequests: 0, errorRatePercent: 0, averageResponseMs: 0, p95ResponseMs: 0, activeAlerts: 0 },
      requests: [], errors: [], alerts: [],
      aiUsage: { configured: false, source: 'test', totalRequests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, dailyUsage: [] },
    } });
  });

  it('renders server-backed account reports and applies filters', async () => {
    render(<MemoryRouter><AdminAccountReportsScreen /></MemoryRouter>);
    expect(await screen.findByText('Fraud evidence')).toBeInTheDocument();
    expect(screen.getByText(/1 violations/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search user or reason'), { target: { value: 'fraud' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(api.getAccountReports).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'fraud' })));
  });

  it('renders real structured audit values without synthetic telemetry', async () => {
    render(<MemoryRouter><AdminSystemTrackingScreen /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /recent activity/i }));
    expect(await screen.findByText('AccountReport.Warning')).toBeInTheDocument();
    expect(screen.getByText(/After: \{"status":2\}/)).toBeInTheDocument();
    expect(screen.getByText(/18cc1e4e-bfd8-4511-a786-c84f554670ef/)).toBeInTheDocument();
    // Backend audit rows carry a placeholder address, not a captured client IP.
    expect(screen.getByText('IP: -')).toBeInTheDocument();
    expect(screen.queryByText(/LIVE/)).not.toBeInTheDocument();
  });
});
