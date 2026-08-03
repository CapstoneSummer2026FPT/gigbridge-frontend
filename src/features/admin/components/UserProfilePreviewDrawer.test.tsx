import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { UserProfilePreviewDrawer } from './UserProfilePreviewDrawer';

vi.mock('../../../api/adminAPI/GET', () => ({ adminGetAPI: { getUserDetail: vi.fn(), getAssets: vi.fn() } }));
vi.mock('../../../api/adminAPI/POST', () => ({ adminPostAPI: { enforceUser: vi.fn(), clearUserSuspension: vi.fn(), restoreUser: vi.fn(), creditWallet: vi.fn(), debitWallet: vi.fn() } }));

const detail = (userId: string, fullName: string) => ({
  userId, fullName, email: `${userId}@test.dev`, avatar: null, eloPoints: 1250, role: 1, createdAt: '2026-08-01T00:00:00Z', isEmailVerified: true, isActive: true,
  accountStatus: 0, isFlagged: false, violationCount: 0, subscription: undefined,
  profile: { kind: 'Freelancer', title: 'Engineer', bio: 'Profile bio', location: 'Remote', skills: ['React'], categories: ['Web'], portfolioUrls: [], workExperience: [] },
  wallet: { availableTokens: 10, withdrawableTokens: 5, heldTokens: 2, pendingWithdrawalTokens: 1 }, recentReports: [], recentViolations: [], recentAuditLogs: [],
});

const fullDetail = {
  userId: 'user-3', fullName: 'Nguyen Van A', email: 'a@example.com', avatar: null, eloPoints: 1250, role: 1, createdAt: '2026-01-15T00:00:00Z', isEmailVerified: true, isActive: true,
  accountStatus: 0, isFlagged: true, violationCount: 2, suspendedUntil: null, bannedAt: null, banReason: null,
  subscription: { planName: 'Pro', status: 1, startDate: '2026-05-01', endDate: '2026-11-01' },
  profile: { kind: 'Freelancer', title: 'Full-stack developer', bio: 'Builds React apps.', companyName: null, industry: 'IT', location: 'Hanoi', skills: ['React', 'TypeScript'], categories: ['Web'], portfolioUrls: ['https://example.com/work'], workExperience: ['Dev · Acme'] },
  wallet: { availableTokens: 100, withdrawableTokens: 50, heldTokens: 30, pendingWithdrawalTokens: 5 },
  recentReports: [{ id: 'r1', type: 0, status: 0, reason: 'Spam', description: 'Sends spam', evidenceCount: 2, createdAt: '2026-06-01T00:00:00Z' }],
  recentViolations: [{ id: 'v1', sourceType: 0, number: 7, type: 4, reason: 'Spam posts', description: null, actionTaken: 1, suspendedUntil: null, isActive: true, createdAt: '2026-06-02T00:00:00Z' }],
  recentAuditLogs: [{ id: 'a1', action: 'UserSuspended', entityType: 'User', entityId: 'user-3', oldValues: null, newValues: '{}', correlationId: 'corr', createdAt: '2026-06-03T00:00:00Z' }],
};

const ok = (data: unknown) => ({ success: true, statusCode: 200, message: 'ok', data });

describe('User Profile Preview drawer', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(adminGetAPI.getAssets).mockResolvedValue(ok({ items: [] }) as never); });

  it('loads the complete requested user and keeps wallet values read-only', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok(detail('user-1', 'User One')) as never);
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
      .mockResolvedValueOnce(ok(detail('user-2', 'User Two')) as never);
    const view = render(<MemoryRouter><UserProfilePreviewDrawer userId="user-1" onClose={vi.fn()} /></MemoryRouter>);
    view.rerender(<MemoryRouter><UserProfilePreviewDrawer userId="user-2" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 2, name: 'User Two' })).toBeInTheDocument();
    resolveFirst(ok(detail('user-1', 'User One')));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'User One' })).not.toBeInTheDocument());
  });

  it('renders full detail across every tab from the fetched payload', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok(fullDetail) as never);
    render(<MemoryRouter><UserProfilePreviewDrawer userId="user-3" onClose={vi.fn()} /></MemoryRouter>);

    expect(adminGetAPI.getUserDetail).toHaveBeenCalledWith('user-3');
    expect(await screen.findByRole('heading', { level: 2, name: 'Nguyen Van A' })).toBeInTheDocument();
    expect(screen.getAllByText('Nguyen Van A').length).toBeGreaterThan(0);
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByText('Freelancer')).toBeInTheDocument();
    expect(screen.getByText('Flagged · 2')).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    expect(await screen.findByText('Full-stack developer')).toBeInTheDocument();
    expect(screen.getByText('Builds React apps.')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/work')).toBeInTheDocument();
    expect(screen.getByText('Dev · Acme')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Reports' }));
    expect(await screen.findByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('Sends spam')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Violations' }));
    expect(await screen.findByText('Violation #7')).toBeInTheDocument();
    expect(screen.getByText('Spam posts')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Wallet' }));
    expect(await screen.findByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Audit History' }));
    expect(await screen.findByText('UserSuspended')).toBeInTheDocument();
  });

  it('shows the error state and retries the request', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValueOnce({ success: false, statusCode: 500, message: 'boom', data: undefined } as never);
    render(<MemoryRouter><UserProfilePreviewDrawer userId="user-3" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText(/Profile Preview could not be loaded/i)).toBeInTheDocument();
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok(fullDetail) as never);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Nguyen Van A' })).toBeInTheDocument();
  });

  it('protects admin accounts from enforcement actions', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok({ ...fullDetail, role: 2 }) as never);
    render(<MemoryRouter><UserProfilePreviewDrawer userId="user-3" onClose={vi.fn()} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Nguyen Van A' });
    expect((screen.getByRole('button', { name: 'Issue warning' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Ban' }) as HTMLButtonElement).disabled).toBe(true);
    expect(adminPostAPI.enforceUser).not.toHaveBeenCalled();
  });

  it('shows empty states when collections are missing instead of crashing', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok({
      userId: 'user-4', fullName: 'Minimal', email: 'm@example.com', role: 0, createdAt: '2026-01-01T00:00:00Z',
      isEmailVerified: false, isActive: false, accountStatus: 0, isFlagged: false, violationCount: 0,
      recentReports: [], recentViolations: [], recentAuditLogs: [],
    }) as never);
    render(<MemoryRouter><UserProfilePreviewDrawer userId="user-4" onClose={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 2, name: 'Minimal' })).toBeInTheDocument();
    expect(screen.getByText(/No subscription is recorded/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    expect(await screen.findByText(/No Client or Freelancer profile is available/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Wallet' }));
    expect(await screen.findByText(/No wallet exists for this user/i)).toBeInTheDocument();
  });
});
