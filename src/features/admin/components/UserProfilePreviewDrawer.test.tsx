import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { UserProfilePreviewDrawer } from './UserProfilePreviewDrawer';

vi.mock('../../../api/adminAPI/GET', () => ({ adminGetAPI: { getUserDetail: vi.fn(), getAssets: vi.fn() } }));
vi.mock('../../../api/adminAPI/POST', () => ({ adminPostAPI: { enforceUser: vi.fn(), clearUserSuspension: vi.fn(), restoreUser: vi.fn(), creditWallet: vi.fn(), debitWallet: vi.fn() } }));

const detail = (userId: string, fullName: string) => ({
  userId, fullName, email: `${userId}@test.dev`, avatar: null, eloPoints: 1250, role: 1, createdAt: '2026-08-01T00:00:00Z', isEmailVerified: true, isActive: true,
  accountStatus: 0, isFlagged: false, violationCount: 0, subscription: undefined,
  profile: { kind: 'Freelancer', title: 'Engineer', bio: 'Profile bio', location: 'Remote', skills: ['React'], categories: ['Web'], portfolioUrls: [], workExperience: [] },
  wallet: { availableTokens: 10, withdrawableTokens: 5, heldTokens: 2, pendingWithdrawalTokens: 1 }, recentReports: [], recentViolations: [], recentAuditLogs: [],
});

describe('User Profile Preview drawer', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(adminGetAPI.getAssets).mockResolvedValue({ success: true, statusCode: 200, message: 'ok', data: [] }); });

  it('loads the complete requested user and keeps wallet values read-only', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue({ success: true, statusCode: 200, message: 'ok', data: detail('user-1', 'User One') });
    render(<MemoryRouter><UserProfilePreviewDrawer userId="user-1" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 2, name: 'User One' })).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Wallet' }));
    expect(screen.getByText('Read-only Wallet Summary')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /token amount/i })).not.toBeInTheDocument();
  });

  it('ignores a stale response when users are switched quickly', async () => {
    let resolveFirst!: (value: any) => void;
    vi.mocked(adminGetAPI.getUserDetail)
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ success: true, statusCode: 200, message: 'ok', data: detail('user-2', 'User Two') });
    const view = render(<MemoryRouter><UserProfilePreviewDrawer userId="user-1" onClose={vi.fn()} /></MemoryRouter>);
    view.rerender(<MemoryRouter><UserProfilePreviewDrawer userId="user-2" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 2, name: 'User Two' })).toBeInTheDocument();
    resolveFirst({ success: true, statusCode: 200, message: 'ok', data: detail('user-1', 'User One') });
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'User One' })).not.toBeInTheDocument());
  });
});
