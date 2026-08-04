import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { toast } from 'sonner';
import { ContractStatus, MilestoneStatus, type Milestone } from '../../../types/models/Contract';
import { ClientContractDetails } from './ClientContractDetails';
import { FreelancerContractDetails } from './FreelancerContractDetails';

vi.mock('../../../api/contractAPI/PUT', () => ({
  contractPutAPI: {
    updateDetails: vi.fn(),
  },
}));

vi.mock('../../../api/contractAPI/POST', () => ({
  contractPostAPI: {
    submitDetails: vi.fn(),
    fundEscrow: vi.fn(),
    confirmDetails: vi.fn(),
    requestChange: vi.fn(),
    requestMilestoneChange: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../../../api/esignAPI/GET', () => ({
  esignGetAPI: {
    getDocumentByJob: vi.fn(),
  },
}));

vi.mock('../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getMyWallet: vi.fn(),
  },
}));

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: { id: 'freelancer-user' } }),
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../shared/components/NestedMilestonePlanEditor', () => ({
  NestedMilestonePlanEditor: () => <div>Nested milestone editor</div>,
}));

vi.mock('./ContractChangeControlPanel', () => ({
  ContractChangeControlPanel: () => null,
}));

vi.mock('../hooks/useContractESignDocument', () => ({
  contractStatusMayHaveESignDocument: () => false,
  useContractESignDocument: () => ({
    document: null,
    isLoading: false,
    isNotFound: true,
    error: null,
    retry: vi.fn(),
  }),
}));

vi.mock('./ContractLegalCard', () => ({
  ContractLegalCard: () => <section aria-label="Contract legal reference" />,
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'contracts.saveDraftDetails': 'Save draft details',
        'contracts.submitToFreelancer': 'Submit to freelancer',
        'contracts.reviewProjectPlan': 'Review project plan',
        'contracts.reviewProjectPlanDesc': 'Review the submitted project plan.',
        'contracts.confirmProjectPlan': 'Confirm project plan',
        'contracts.requestChanges': 'Request changes',
        'contracts.alerts.confirmed': 'Project plan confirmed successfully.',
      };
      return translations[key] ?? key;
    },
  }),
}));

const milestone: Milestone = {
  id: 'milestone-1',
  contract_id: 'contract-1',
  title: 'Design',
  amount: 100,
  due_date: '2026-08-10T00:00:00.000Z',
  status: MilestoneStatus.Pending,
  paid_at: null,
  description: 'Design the interface',
  estimatedDuration: '1 week',
  deliverables: 'Design files',
  acceptanceCriteria: 'Client approval',
  workItems: [
    {
      workItemId: 'work-item-1',
      milestoneId: 'milestone-1',
      title: 'Wireframe',
      description: 'Create wireframes',
      deliverables: 'Figma link',
      estimatedDuration: '2 days',
      orderIndex: 0,
      status: 0,
    },
  ],
};

const baseContract = {
  contractsId: 'contract-1',
  jobPostsId: 'job-1',
  title: 'Product design',
  jobTitle: 'Product design',
  totalBudget: 100,
  status: ContractStatus.PendingContractDetails,
  createdAt: '2026-07-28T00:00:00.000Z',
  clientProfile: { fullName: 'Client' },
  freelancerProfile: { fullName: 'Freelancer' },
};

const sharedProps = {
  milestones: [milestone],
  auditTrail: [],
  onRefresh: vi.fn(),
  activeDispute: null,
  activeDisputeError: null,
  activeDisputeLoading: false,
  onRetryDispute: vi.fn(),
};

describe('contract detail legal-card integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('saves an exact milestone-only payload from the client editor', async () => {
    const user = userEvent.setup();
    vi.mocked(contractPutAPI.updateDetails).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Saved',
    });

    render(
      <MemoryRouter>
        <ClientContractDetails contract={baseContract} {...sharedProps} />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('region', { name: 'Contract legal reference' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Save draft details' }));

    await waitFor(() => {
      expect(contractPutAPI.updateDetails).toHaveBeenCalledWith('contract-1', {
        milestones: [
          {
            milestoneId: 'milestone-1',
            title: 'Design',
            amount: 100,
            dueDate: '2026-08-10',
            sortOrder: 0,
            description: 'Design the interface',
            estimatedDuration: '1 week',
            deliverables: 'Design files',
            acceptanceCriteria: 'Client approval',
            workItems: [
              {
                workItemId: 'work-item-1',
                title: 'Wireframe',
                description: 'Create wireframes',
                deliverables: 'Figma link',
                estimatedDuration: '2 days',
                orderIndex: 0,
              },
            ],
          },
        ],
      });
    });
  });

  it('shows one shared legal reference while the freelancer reviews the project plan', () => {
    render(
      <MemoryRouter>
        <FreelancerContractDetails
          contract={{
            ...baseContract,
            status: ContractStatus.PendingContractConfirmation,
          }}
          {...sharedProps}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Review project plan')).toHaveLength(2);
    expect(screen.getAllByRole('region', { name: 'Contract legal reference' })).toHaveLength(1);
    expect(screen.queryByText(/No scope of work defined/i)).not.toBeInTheDocument();
  });

  it('uses a localized toast after the freelancer confirms the project plan', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    vi.mocked(contractPostAPI.confirmDetails).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Confirmed',
    });

    render(
      <MemoryRouter>
        <FreelancerContractDetails
          contract={{
            ...baseContract,
            status: ContractStatus.PendingContractConfirmation,
          }}
          {...sharedProps}
          onRefresh={onRefresh}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Confirm project plan' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Project plan confirmed successfully.');
    });
    expect(window.alert).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
