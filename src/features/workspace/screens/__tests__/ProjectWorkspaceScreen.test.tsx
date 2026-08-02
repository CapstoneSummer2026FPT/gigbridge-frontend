import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspaceScreen from '../ProjectWorkspaceScreen';
import { ContractProductHandoffSourceType, ContractStatus } from '../../../../types/models/Contract';
import { UserRole, type User } from '../../../../types/models/User';
import { useProjectWorkspace } from '../../hooks/useProjectWorkspace';

const navigateMock = vi.fn();
const handleRequestMilestoneUnlockMock = vi.fn();
const handleWithdrawMilestoneMock = vi.fn();
const handleOpenMilestoneEditorMock = vi.fn();
const handleEndProjectMock = vi.fn();
const clearReviewPromptMock = vi.fn();
const refreshWorkspaceMock = vi.fn();

type ProjectWorkspaceHookState = ReturnType<typeof useProjectWorkspace>;
type WorkspaceMilestoneFixture = ProjectWorkspaceHookState['project']['milestones'][number];
type WorkspaceProjectListItemFixture = ProjectWorkspaceHookState['currentProjData'];

vi.mock('../../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (values?.defaultValue) return String(values.defaultValue);
      if (key === 'workspace.version') return `Version ${values?.version}`;
      if (key === 'earlyWithdrawal.thresholdWarning') {
        return `${values?.approved}/${values?.required} required milestones have been approved.`;
      }
      if (key === 'earlyWithdrawal.thresholdTooltip') {
        return `${values?.approved} of ${values?.required} required milestones are approved`;
      }
      const labels: Record<string, string> = {
        'workspace.sharedFiles': 'Shared files',
        'workspace.workMaterialsLink': 'Work materials link',
        'workspace.endProject': 'End project',
        'workspace.milestoneDetails': 'Milestone details',
        'workspace.approveAllTooltip': 'Approve all milestones to end project',
        'workspace.releaseEscrowTooltip': 'Release escrow',
        'workspace.finalPayout': 'Final payout',
        'workspace.finalPayoutReconciliation': 'Payout reconciliation',
        'workspace.finalPayoutNotice': 'The remaining escrow was reconciled when the project ended.',
        'workspace.viewWalletHistory': 'View wallet history',
        'workspace.viewOnlyNotice': 'Workspace is view-only',
        'workspace.releasedInFull': 'Released in full',
        'workspace.failedWithdrawFundsError': 'Failed to withdraw milestone funds.',
        'earlyWithdrawal.action': 'Withdraw early',
        'earlyWithdrawal.actionTooltip': 'Withdraw the available amount',
        'earlyWithdrawal.availableBeforeEnd': 'Available before project completion:',
        'earlyWithdrawal.confirmTitle': 'Confirm early withdrawal',
        'earlyWithdrawal.confirmDescription': 'Move the available amount to your GigCoin wallet now.',
        'earlyWithdrawal.milestone': 'Milestone',
        'earlyWithdrawal.availableAmount': 'Available amount',
        'earlyWithdrawal.maximumNotice': 'You can withdraw up to 80% of an approved milestone before the project ends.',
        'earlyWithdrawal.maximumReached': 'Maximum 80% withdrawn',
        'earlyWithdrawal.confirm': 'Confirm withdrawal',
        'earlyWithdrawal.cancel': 'Cancel',
        'earlyWithdrawal.submitting': 'Withdrawing...',
        'earlyWithdrawal.success': 'Milestone funds were added to your GigCoin wallet.',
        'serviceFee.endProject.confirmationDescription': 'Final payout available to freelancer',
        'serviceFee.confirm': 'End project',
        'serviceFee.confirmAriaLabel': 'End project',
        'reviews.title': 'Review project partner',
        'reviews.subtitle': 'Share feedback after project completion',
        'reviews.leaveForFreelancer': 'Review freelancer',
        'reviews.leaveForClient': 'Review client',
        'reviews.reviewed': 'Reviewed',
        'reviews.reviewFreelancer': 'Freelancer',
        'reviews.reviewClient': 'Client',
        'reviews.project': 'Project',
        'common.close': 'Close',
        'common.cancel': 'Cancel',
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock('../../hooks/useProjectWorkspace', () => ({
  useProjectWorkspace: vi.fn(),
}));

vi.mock('../../../../api/walletAPI/GET', () => ({
  walletGetAPI: {
    getMyWallet: vi.fn().mockResolvedValue({ success: true, data: { availableTokens: 1000 } }),
  },
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../shared/components/GigCoinAmount', () => ({
  GigCoinAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ contractId: 'contract-1' }),
}));

const setActiveProjectIdMock = vi.fn();
const pendingMilestone: WorkspaceMilestoneFixture = {
  id: 'milestone-2',
  title: 'Milestone 2',
  amount: 20,
  releasedAmount: 0,
  dueDate: 'Not set',
  status: 'pending',
  workItems: [],
};

const createMockUser = (isClient: boolean): User => ({
  id: isClient ? 'client-user-1' : 'freelancer-user-1',
  email: isClient ? 'client@example.com' : 'freelancer@example.com',
  first_name: isClient ? 'Client' : 'Freelancer',
  last_name: 'User',
  full_name: isClient ? 'Client User' : 'Freelancer User',
  phone_number: null,
  role: isClient ? UserRole.Client : UserRole.Freelancer,
  is_email_verified: true,
  is_active: true,
  is_setup: true,
  preferred_language: 'en',
  last_login_at: null,
  login_failed_time: null,
  access_failed_count: 0,
  elo_points: 0,
  gigcoin_balance: 0,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
});

const mockWorkspaceHook = (options: {
  isClient?: boolean;
  milestones?: WorkspaceMilestoneFixture[];
  contractStatus?: ContractStatus;
  paidAmount?: number;
  totalBudget?: number;
  canReview?: boolean;
  hasReviewed?: boolean;
  reviewPromptContractId?: string | null;
} = {}): void => {
  const isClient = options.isClient ?? true;
  const currentProject: WorkspaceProjectListItemFixture = {
    id: 'contract-1',
    title: 'Workspace',
    titleLong: 'Workspace',
    partnerName: 'Freelancer',
    partnerAvatar: 'https://example.com/avatar.png',
    latestMessage: 'Workspace is open.',
    time: 'Just now',
    unread: false,
    online: true,
    status: options.contractStatus ?? ContractStatus.Active,
  };

  vi.mocked(useProjectWorkspace).mockReturnValue({
    user: createMockUser(isClient),
    isClient,
    activeProjectId: 'contract-1',
    setActiveProjectId: setActiveProjectIdMock,
    showInfo: true,
    setShowInfo: vi.fn(),
    messageInput: '',
    setMessageInput: vi.fn(),
    isFavorited: false,
    setIsFavorited: vi.fn(),
    isBlocked: false,
    setIsBlocked: vi.fn(),
    project: {
      id: 'contract-1',
      contractId: 'contract-1',
      jobId: 'job-1',
      conversationId: null,
      title: 'Workspace',
      progress: 0,
      paidAmount: options.paidAmount ?? 0,
      totalBudget: options.totalBudget ?? 100,
      milestones: options.milestones ?? [],
    },
    activeContract: {
      contractsId: 'contract-1',
      jobPostsId: 'job-1',
      clientProfilesId: 'client-profile-1',
      freelancerProfilesId: 'freelancer-profile-1',
      title: 'Workspace',
      totalBudget: options.totalBudget ?? 100,
      status: options.contractStatus ?? ContractStatus.Active,
      createdAt: '2026-07-02T01:00:00.000Z',
      clientName: 'Client User',
      freelancerName: 'Freelancer User',
      canReview: options.canReview ?? false,
      hasReviewedByCurrentUser: options.hasReviewed ?? false,
    },
    currentProductHandoff: null,
    earlyStartRequests: [],
    productHandoffs: [
      {
        contractProductHandoffId: 'handoff-3',
        contractId: 'contract-1',
        submittedByUserId: 'client-user-1',
        sourceType: ContractProductHandoffSourceType.Link,
        externalUrl: 'https://example.com/materials-v3',
        fileName: null,
        fileUrl: null,
        mimeType: null,
        fileSizeBytes: null,
        note: 'Latest link',
        version: 3,
        isCurrent: true,
        receivedByUserId: null,
        receivedAt: null,
        createdAt: '2026-07-02T03:00:00.000Z',
      },
      {
        contractProductHandoffId: 'handoff-2',
        contractId: 'contract-1',
        submittedByUserId: 'client-user-1',
        sourceType: ContractProductHandoffSourceType.File,
        externalUrl: null,
        fileName: 'source.zip',
        fileUrl: 'https://example.com/source-v2.zip',
        mimeType: 'application/zip',
        fileSizeBytes: 2048,
        note: 'Previous file',
        version: 2,
        isCurrent: false,
        receivedByUserId: null,
        receivedAt: null,
        createdAt: '2026-07-02T02:00:00.000Z',
      },
    ],
    workspaceProjects: [],
    currentProjData: currentProject,
    partnerName: 'Freelancer',
    partnerAvatar: 'https://example.com/avatar.png',
    partnerUserId: 'partner-user-1',
    partnerTitle: isClient ? 'Freelancer' : 'Client',
    partnerCompany: 'Workspace',
    isPartnerOnline: true,
    projectMessages: [],
    handleSendMessage: vi.fn(),
    handleSimulateAttachment: vi.fn(),
    handleOpenMilestoneEditor: handleOpenMilestoneEditorMock,
    handleRequestMilestoneUnlock: handleRequestMilestoneUnlockMock,
    handleWithdrawMilestone: handleWithdrawMilestoneMock,
    handleUpdateWorkItem: vi.fn(),
    handleRespondEarlyStart: vi.fn(),
    handleEndProject: handleEndProjectMock,
    handleSubmitMilestoneDeliverable: vi.fn(),
    handleSubmitProductHandoff: vi.fn(),
    reviewPromptContractId: options.reviewPromptContractId ?? null,
    clearReviewPrompt: clearReviewPromptMock,
    refreshWorkspace: refreshWorkspaceMock,
    chatEndRef: { current: null },
  });
};

describe('ProjectWorkspaceScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleRequestMilestoneUnlockMock.mockResolvedValue({ success: true });
    handleWithdrawMilestoneMock.mockResolvedValue({ success: true, statusCode: 200 });
    handleEndProjectMock.mockResolvedValue({ success: true });
    refreshWorkspaceMock.mockResolvedValue(undefined);
    sessionStorage.clear();
    mockWorkspaceHook();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders all work material versions and opens their own URLs', () => {
    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /shared files/i }));

    expect(screen.getByText('Version 3 - Latest link')).toBeInTheDocument();
    expect(screen.getByText('Version 2 - Previous file')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open work materials link version 3/i }));
    expect(window.open).toHaveBeenCalledWith('https://example.com/materials-v3', '_blank', 'noopener,noreferrer');

    fireEvent.click(screen.getByRole('button', { name: /open source\.zip version 2/i }));
    expect(window.open).toHaveBeenCalledWith('https://example.com/source-v2.zip', '_blank', 'noopener,noreferrer');
  });

  it('does not let clients directly start or edit pending milestones', () => {
    mockWorkspaceHook({ isClient: true, milestones: [pendingMilestone] });

    render(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: /start milestone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /propose milestone/i })).not.toBeInTheDocument();
  });

  it('lets freelancers request an early start with a reason', async () => {
    mockWorkspaceHook({ isClient: false, milestones: [pendingMilestone] });
    vi.spyOn(window, 'prompt').mockReturnValue('Start integration work while review is pending.');

    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /request early start/i }));

    await waitFor(() => {
      expect(handleRequestMilestoneUnlockMock).toHaveBeenCalledWith('milestone-2', 'Start integration work while review is pending.');
    });
  });

  it('shows disabled End Project for clients when all milestones are submitted but not approved', () => {
    mockWorkspaceHook({
      isClient: true,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Submitted', status: 'submitted' },
        { ...pendingMilestone, id: 'milestone-2', title: 'Approved', status: 'approved' },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    const endProjectButton = screen.getByRole('button', { name: /end project/i });
    expect(endProjectButton).toBeDisabled();
    expect(endProjectButton).toHaveAttribute('title', 'Approve all milestones to end project');
  });

  it('lets clients end project after all milestones are approved', async () => {
    mockWorkspaceHook({
      isClient: true,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved 1', status: 'approved', amount: 80, releasedAmount: 64 },
        { ...pendingMilestone, id: 'milestone-2', title: 'Approved 2', status: 'approved', amount: 20, releasedAmount: 0 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /end project/i }));
    expect(screen.getByText(/final payout available to freelancer/i)).toBeInTheDocument();

    const confirmButton = await screen.findByRole('button', { name: /end project/i });
    await waitFor(() => expect(confirmButton).toBeEnabled());
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(handleEndProjectMock).toHaveBeenCalled();
    });
  });

  it('shows the 80% cap separately from a fully released milestone', () => {
    mockWorkspaceHook({
      isClient: false,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved 1', status: 'approved', amount: 100, releasedAmount: 100 },
        { ...pendingMilestone, id: 'milestone-2', title: 'Approved 2', status: 'approved', amount: 100, releasedAmount: 80 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: /end project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /withdraw early/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/released in full/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/maximum 80% withdrawn/i).length).toBeGreaterThan(0);
  });

  it('opens the shared milestone details screen for workspace participants', () => {
    mockWorkspaceHook({ isClient: false });
    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /milestone details/i }));

    expect(handleOpenMilestoneEditorMock).toHaveBeenCalledTimes(1);
  });

  it('confirms an eligible early withdrawal without displaying a service fee', async () => {
    mockWorkspaceHook({
      isClient: false,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved milestone', status: 'approved', amount: 100, releasedAmount: 20 },
        { ...pendingMilestone, id: 'milestone-2', title: 'Pending milestone', status: 'pending', amount: 100, releasedAmount: 0 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /withdraw early/i }));
    const withdrawalDialog = screen.getByRole('alertdialog', { name: /confirm early withdrawal/i });
    expect(withdrawalDialog).toBeInTheDocument();
    expect(withdrawalDialog).toHaveTextContent('Approved milestone');
    expect(screen.getByText(/up to 80%/i)).toBeInTheDocument();
    expect(screen.queryByText(/service fee/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));
    await waitFor(() => expect(handleWithdrawMilestoneMock).toHaveBeenCalledTimes(1));
    expect(handleWithdrawMilestoneMock).toHaveBeenCalledWith('milestone-1');
  });

  it('surfaces a duplicate-withdrawal conflict without sending a second request', async () => {
    handleWithdrawMilestoneMock.mockResolvedValue({
      success: false,
      statusCode: 409,
      message: 'Maximum 80% already withdrawn.',
    });
    mockWorkspaceHook({
      isClient: false,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved milestone', status: 'approved', amount: 100, releasedAmount: 0 },
      ],
    });

    render(<ProjectWorkspaceScreen />);
    fireEvent.click(screen.getByRole('button', { name: /withdraw early/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm withdrawal/i }));

    await waitFor(() => expect(screen.getByText(/maximum 80% already withdrawn/i)).toBeInTheDocument());
    expect(handleWithdrawMilestoneMock).toHaveBeenCalledTimes(1);
  });

  it('never offers milestone early withdrawal to clients', () => {
    mockWorkspaceHook({
      isClient: true,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved milestone', status: 'approved', amount: 100, releasedAmount: 0 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: /withdraw early/i })).not.toBeInTheDocument();
  });

  it('disables early withdrawal until half of all milestones are approved', () => {
    mockWorkspaceHook({
      isClient: false,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved milestone', status: 'approved', amount: 100, releasedAmount: 0 },
        { ...pendingMilestone, id: 'milestone-2', status: 'pending' },
        { ...pendingMilestone, id: 'milestone-3', status: 'pending' },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.getByRole('button', { name: /withdraw early/i })).toBeDisabled();
    expect(screen.getByText(/1\/2 required milestones/i)).toBeInTheDocument();
  });

  it('shows final payout status for freelancers and opens wallet history', () => {
    mockWorkspaceHook({
      isClient: false,
      contractStatus: ContractStatus.Completed,
      paidAmount: 100,
      totalBudget: 100,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved 1', status: 'approved', amount: 60, releasedAmount: 60 },
        { ...pendingMilestone, id: 'milestone-2', title: 'Approved 2', status: 'approved', amount: 40, releasedAmount: 40 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /end project/i })).not.toBeInTheDocument();
    expect(screen.getByText(/remaining escrow was reconciled when the project ended/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view wallet history/i }));

    expect(navigateMock).toHaveBeenCalledWith('/wallet/history');
  });

  it('does not show Receive Money for clients after project completion', () => {
    mockWorkspaceHook({
      isClient: true,
      contractStatus: ContractStatus.Completed,
      paidAmount: 100,
      totalBudget: 100,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved 1', status: 'approved', amount: 100, releasedAmount: 100 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: /nhận tiền/i })).not.toBeInTheDocument();
  });

  it('does not expose a manual claim when automatic payout reconciliation is pending', () => {
    mockWorkspaceHook({
      isClient: false,
      contractStatus: ContractStatus.Completed,
      paidAmount: 80,
      totalBudget: 100,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved 1', status: 'approved', amount: 100, releasedAmount: 80 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.getByText(/payout reconciliation/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nhận tiền/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view wallet history/i }));
    expect(navigateMock).toHaveBeenCalledWith('/wallet/history');
    expect(screen.queryByPlaceholderText(/type your message/i)).not.toBeInTheDocument();
    expect(screen.getByText(/workspace is view-only/i)).toBeInTheDocument();
  });

  it('opens the freelancer review prompt once and keeps a persistent review CTA', () => {
    mockWorkspaceHook({
      isClient: false,
      contractStatus: ContractStatus.Completed,
      canReview: true,
      reviewPromptContractId: 'contract-1',
    });
    const { rerender } = render(<ProjectWorkspaceScreen />);

    expect(screen.getByRole('dialog', { name: 'Review project partner' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(clearReviewPromptMock).toHaveBeenCalled();
    expect(sessionStorage.getItem('gigbridge-review-prompt-dismissed:freelancer-user-1:contract-1')).toBe('1');
    expect(screen.getByRole('button', { name: 'Review client' })).toBeInTheDocument();

    mockWorkspaceHook({
      isClient: false,
      contractStatus: ContractStatus.Completed,
      canReview: true,
      reviewPromptContractId: 'contract-1',
    });
    rerender(<ProjectWorkspaceScreen />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows reviewed status instead of the review CTA after submission state reloads', () => {
    mockWorkspaceHook({
      contractStatus: ContractStatus.Completed,
      hasReviewed: true,
    });
    render(<ProjectWorkspaceScreen />);

    expect(screen.getByText('Reviewed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review freelancer' })).not.toBeInTheDocument();
  });
});
