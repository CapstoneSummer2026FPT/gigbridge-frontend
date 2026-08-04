import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminAPI } from '../../../api/adminAPI';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import AdminUsersScreen from './AdminUsersScreen';

vi.mock('../../../api/adminAPI', () => ({ adminAPI: { getAllUsers: vi.fn() } }));
vi.mock('../../../api/adminAPI/GET', () => ({ adminGetAPI: { getUserDetail: vi.fn(), getAssets: vi.fn() } }));
vi.mock('../../../api/adminAPI/POST', () => ({ adminPostAPI: { enforceUser: vi.fn(), clearUserSuspension: vi.fn(), restoreUser: vi.fn(), creditWallet: vi.fn(), debitWallet: vi.fn() } }));
vi.mock('../../../shared/components/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const ok = (data: unknown) => ({ success: true, statusCode: 200, message: 'ok', data });

const adminUserDto = {
  userId: 'user-3',
  fullName: 'Nguyen Van A',
  email: 'a@example.com',
  avatar: null,
  phoneNumber: null,
  role: 1,
  isEmailVerified: true,
  isActive: true,
  accountStatus: 0,
  isFlagged: true,
  violationCount: 2,
  preferredLanguage: 'vi',
  provider: null,
  openReportCount: 1,
  isCurrentlyReported: true,
  isPremium: false,
  premiumUntil: null,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
};

const fullDetail = {
  userId: 'user-3', fullName: 'Nguyen Van A', email: 'a@example.com', avatar: null, eloPoints: 1250, role: 1, createdAt: '2026-01-15T00:00:00Z', isEmailVerified: true, isActive: true,
  accountStatus: 0, isFlagged: true, violationCount: 2, suspendedUntil: null, bannedAt: null, banReason: null,
  subscription: { planName: 'Pro', status: 1, startDate: '2026-05-01', endDate: '2026-11-01' },
  profile: { kind: 'Freelancer', title: 'Full-stack developer', bio: 'Builds React apps.', companyName: null, industry: 'IT', location: 'Hanoi', skills: ['React', 'TypeScript'], categories: ['Web'], portfolioUrls: ['https://example.com/work'], workExperience: ['Dev · Acme'] },
  wallet: { availableTokens: 100, withdrawableTokens: 50, heldTokens: 30, pendingWithdrawalTokens: 5 },
  recentReports: [], recentViolations: [], recentAuditLogs: [],
};

const usersPage = (items: unknown[]) => ok({ items, page: 1, pageSize: 50, totalItems: items.length, reportedUserCount: 1, totalPages: 1 });

describe('AdminUsersScreen profile preview integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(adminAPI.getAllUsers).mockResolvedValue(usersPage([adminUserDto]) as never);
    vi.mocked(adminGetAPI.getAssets).mockResolvedValue(ok({ items: [] }) as never);
  });

  it('opens the profile preview drawer from a user row and renders full detail', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok(fullDetail) as never);
    render(<MemoryRouter><AdminUsersScreen /></MemoryRouter>);

    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview Nguyen Van A' })[0]);

    expect(await screen.findByRole('heading', { level: 2, name: 'Nguyen Van A' })).toBeInTheDocument();
    expect(adminGetAPI.getUserDetail).toHaveBeenCalledWith('user-3');
    expect(screen.getAllByText('a@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('closes the preview drawer and clears the preview URL param', async () => {
    vi.mocked(adminGetAPI.getUserDetail).mockResolvedValue(ok(fullDetail) as never);
    render(<MemoryRouter><AdminUsersScreen /></MemoryRouter>);

    await screen.findByText('Nguyen Van A');
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview Nguyen Van A' })[0]);
    expect(await screen.findByRole('heading', { level: 2, name: 'Nguyen Van A' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Profile Preview' }));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Nguyen Van A' })).not.toBeInTheDocument());
    expect(adminAPI.getAllUsers).toHaveBeenCalledTimes(1);
  });
});
