import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractGetAPI } from '../../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../../api/contractAPI/POST';
import { ContractStatus, MilestoneStatus } from '../../../../types/models/Contract';
import { UserRole } from '../../../../types/models/User';
import ManageMilestonesScreen from '../ManageMilestonesScreen';

const appMock = vi.hoisted(() => ({ role: 1 }));

vi.mock('../../../../app/providers/AppProvider', () => ({
  useApp: () => ({ role: appMock.role }),
}));

vi.mock('../../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === 'contracts.toggleMilestoneDetails') return `Toggle details for ${values?.title}`;
      const labels: Record<string, string> = {
        'contracts.milestonesTimeline': 'Milestones Timeline',
        'contracts.workflow': 'Workflow',
        'contracts.newMilestone': 'New Milestone',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'earlyWithdrawal.action': 'Withdraw early',
        'earlyWithdrawal.actionTooltip': 'Withdraw the available amount',
        'earlyWithdrawal.confirmTitle': 'Confirm early withdrawal',
        'earlyWithdrawal.confirmDescription': 'Move the available amount to your GigCoin wallet now.',
        'earlyWithdrawal.milestone': 'Milestone',
        'earlyWithdrawal.availableAmount': 'Available amount',
        'earlyWithdrawal.maximumNotice': 'You can withdraw up to 80% of an approved milestone before the project ends.',
        'earlyWithdrawal.confirm': 'Confirm withdrawal',
        'earlyWithdrawal.cancel': 'Cancel',
        'earlyWithdrawal.submitting': 'Withdrawing...',
        'earlyWithdrawal.success': 'Milestone funds were added to your GigCoin wallet.',
        'workspace.failedWithdrawFundsError': 'Failed to withdraw milestone funds.',
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock('react-router', () => ({
  useParams: () => ({ contractId: 'contract-1' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../api/contractAPI/GET', () => ({
  contractGetAPI: {
    getContractById: vi.fn(),
    getMilestonesByContract: vi.fn(),
  },
}));

vi.mock('../../../../api/contractAPI/POST', () => ({
  contractPostAPI: {
    withdrawMilestone: vi.fn(),
  },
}));

vi.mock('../../../../api/contractAPI/PUT', () => ({
  contractPutAPI: {},
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const contract = {
  contractsId: 'contract-1',
  jobPostsId: 'job-1',
  clientProfilesId: 'client-1',
  freelancerProfilesId: 'freelancer-1',
  title: 'Contract',
  totalBudget: 200,
  status: ContractStatus.Active,
  createdAt: '2026-08-01T00:00:00.000Z',
};

const milestones = [
  {
    id: 'milestone-1', contract_id: 'contract-1', title: 'Approved milestone', amount: 100,
    due_date: '2026-08-10', status: MilestoneStatus.Approved, paid_at: null,
    releasedAmount: 20, workItems: [],
  },
  {
    id: 'milestone-2', contract_id: 'contract-1', title: 'Pending milestone', amount: 100,
    due_date: '2026-08-20', status: MilestoneStatus.Pending, paid_at: null,
    releasedAmount: 0, workItems: [],
  },
];

describe('ManageMilestonesScreen early withdrawal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock.role = UserRole.Freelancer;
    vi.mocked(contractGetAPI.getContractById).mockResolvedValue({
      success: true, statusCode: 200, message: 'Success', data: contract,
    } as never);
    vi.mocked(contractGetAPI.getMilestonesByContract).mockResolvedValue({
      success: true, statusCode: 200, message: 'Success', data: milestones,
    } as never);
    vi.mocked(contractPostAPI.withdrawMilestone).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Released',
      data: {
        contractId: 'contract-1', milestoneId: 'milestone-1', escrowId: 'escrow-1',
        releasedAmountVnd: 60, releasedTokens: 60, milestoneReleasedAmountVnd: 80,
        escrowReleasedAmountVnd: 80, escrowStatus: 1,
      },
    });
  });

  it('keeps milestone editing read-only for freelancers and confirms early withdrawal', async () => {
    const walletUpdatedHandler = vi.fn();
    window.addEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
    render(<ManageMilestonesScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /toggle details for approved milestone/i }));

    expect(screen.queryByRole('button', { name: /^new milestone$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /withdraw early/i }));
    expect(screen.getByRole('alertdialog', { name: /confirm early withdrawal/i })).toBeInTheDocument();
    expect(screen.getByText(/up to 80%/i)).toBeInTheDocument();
    expect(screen.queryByText(/service fee/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    await waitFor(() => expect(contractPostAPI.withdrawMilestone).toHaveBeenCalledTimes(1));
    expect(contractPostAPI.withdrawMilestone).toHaveBeenCalledWith('contract-1', 'milestone-1');
    await waitFor(() => expect(walletUpdatedHandler).toHaveBeenCalledTimes(1));
    window.removeEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
  });
});
