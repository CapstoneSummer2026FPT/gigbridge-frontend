import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { adminGetAPI } from '../../../../api/adminAPI/GET';
import { jobGetAPI } from '../../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../../api/proposalAPI/GET';
import AdminNotificationsScreen from '../AdminNotificationsScreen';
import AdminSystemTrackingScreen from '../AdminSystemTrackingScreen';

const signalRMock = vi.hoisted(() => {
  const connection = {
    on: vi.fn(),
    off: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
  };
  const builder = {
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(() => connection),
  };
  builder.withUrl.mockReturnValue(builder);
  builder.withAutomaticReconnect.mockReturnValue(builder);
  return { builder, connection };
});

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(() => signalRMock.builder),
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../api/adminAPI/GET', () => ({
  adminGetAPI: {
    getUsers: vi.fn(),
    getSystemTracking: vi.fn(),
  },
}));

vi.mock('../../../../api/jobAPI/GET', () => ({
  jobGetAPI: {
    getAllJobPosts: vi.fn(),
  },
}));

vi.mock('../../../../api/proposalAPI/GET', () => ({
  proposalGetAPI: {
    getAllProposals: vi.fn(),
  },
}));

describe('admin screens without telemetry or history APIs', () => {
  beforeEach(() => {
    vi.mocked(adminGetAPI.getSystemTracking).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        generatedAt: '2026-07-31T00:00:00Z',
        environment: 'Testing',
        startedAt: '2026-07-31T00:00:00Z',
        uptimeSeconds: 0,
        retentionMode: 'memory-current-instance',
        retainedEntryLimit: 500,
        overview: {
          status: 'healthy',
          totalRequests: 0,
          errorRequests: 0,
          errorRatePercent: 0,
          averageResponseMs: 0,
          p95ResponseMs: 0,
          activeAlerts: 0,
        },
        requests: [],
        errors: [],
        alerts: [],
        aiUsage: {
          configured: false,
          source: 'not-connected',
          totalRequests: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          dailyUsage: [],
        },
      },
    });
    vi.mocked(adminGetAPI.getUsers).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [],
        page: 1,
        pageSize: 200,
        totalItems: 0,
        reportedUserCount: 0,
        totalPages: 0,
      },
    });
    vi.mocked(jobGetAPI.getAllJobPosts).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: [],
    });
    vi.mocked(proposalGetAPI.getAllProposals).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not seed notification history when no history endpoint exists', () => {
    render(<AdminNotificationsScreen />);

    expect(screen.getByText('Notification history unavailable')).toBeInTheDocument();
    expect(screen.queryByText('System Maintenance Scheduled')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Notification' })).not.toBeInTheDocument();
  });

  it('shows unavailable AI telemetry instead of generated usage charts', async () => {
    render(<AdminSystemTrackingScreen />);

    await waitFor(() => expect(adminGetAPI.getSystemTracking).toHaveBeenCalled());

    expect(signalRMock.builder.withUrl).toHaveBeenCalledWith(
      expect.stringContaining('/hubs/system-tracking'),
      expect.objectContaining({ accessTokenFactory: expect.any(Function) }),
    );
    expect(signalRMock.connection.start).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'AI Usage' }));

    expect(screen.getByText('AI usage telemetry unavailable')).toBeInTheDocument();
    expect(screen.queryByText('1,890')).not.toBeInTheDocument();
    expect(screen.queryByText('$212.3')).not.toBeInTheDocument();
  });
});
