import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { adminGetAPI } from '../../../../api/adminAPI/GET';
import { jobGetAPI } from '../../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../../api/proposalAPI/GET';
import AdminNotificationsScreen from '../AdminNotificationsScreen';
import AdminSystemTrackingScreen from '../AdminSystemTrackingScreen';

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../api/adminAPI/GET', () => ({
  adminGetAPI: {
    getUsers: vi.fn(),
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

  it('redirects legacy system tracking to real audit logs', () => {
    render(
      <MemoryRouter initialEntries={['/admin/system-tracking']}>
        <Routes>
          <Route path="/admin/system-tracking" element={<AdminSystemTrackingScreen />} />
          <Route path="/admin/audit-logs" element={<div>Admin Audit Logs</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Audit Logs')).toBeInTheDocument();
    expect(screen.queryByText('1,890')).not.toBeInTheDocument();
    expect(screen.queryByText('$212.3')).not.toBeInTheDocument();
  });
});
