import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { ProposalStatus } from '../../../types/models/Proposal';
import { useFreelancerDashboard } from './useFreelancerDashboard';

const navigateMock = vi.hoisted(() => vi.fn());
const translateMock = vi.hoisted(() => vi.fn((_key: string, fallback?: string) => fallback ?? _key));

vi.mock('react-router', () => ({ useNavigate: () => navigateMock }));
vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({
    user: { id: 'freelancer-user-1', full_name: 'Freelancer Test' },
    theme: 'white',
  }),
}));
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: translateMock }),
}));

const success = <T,>(data: T) => ({
  success: true,
  statusCode: 200,
  message: 'Success',
  data,
});

describe('useFreelancerDashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads proposals from the production paginated payload before filtering', async () => {
    vi.spyOn(profileGetAPI, 'getMyFreelancerProfile').mockResolvedValue(success({
      profileCompletionScore: 80,
      rating: 4.5,
      title: 'Frontend Developer',
      skills: [],
      portfolioItems: [],
      majorName: 'Software Engineering',
    }) as never);
    vi.spyOn(proposalGetAPI, 'getMyProposals').mockResolvedValue(success({
      items: [
        { proposalsId: 'pending-1', status: ProposalStatus.Pending },
        { proposalsId: 'accepted-1', status: ProposalStatus.Accepted },
      ],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 2,
      hasPreviousPage: false,
      hasNextPage: false,
    }) as never);
    vi.spyOn(contractGetAPI, 'getMyContracts').mockResolvedValue(success([]) as never);
    vi.spyOn(jobGetAPI, 'getPublicJobPosts').mockResolvedValue(success([]) as never);
    vi.spyOn(walletGetAPI, 'getMyWallet').mockResolvedValue(success({ availableTokens: 0 }) as never);
    vi.spyOn(walletGetAPI, 'getFinancialOverview').mockResolvedValue(success({ trendPoints: [] }) as never);

    const { result } = renderHook(() => useFreelancerDashboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendingProposalsCount).toBe(1);
    expect(result.current.error).toBeNull();
  });
});
