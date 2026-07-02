import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspaceScreen from '../ProjectWorkspaceScreen';
import { ContractProductHandoffSourceType, ContractStatus } from '../../../../types/models/Contract';
import { useProjectWorkspace } from '../../hooks/useProjectWorkspace';

const navigateMock = vi.fn();
const handleStartMilestoneMock = vi.fn();
const handleRequestMilestoneUnlockMock = vi.fn();
const handleWithdrawMilestoneMock = vi.fn();
const handleEndProjectMock = vi.fn();
const handleClaimFinalPayoutMock = vi.fn();

vi.mock('../../hooks/useProjectWorkspace', () => ({
  useProjectWorkspace: vi.fn(),
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
const pendingMilestone = {
  id: 'milestone-2',
  title: 'Milestone 2',
  amount: 20,
  releasedAmount: 0,
  dueDate: 'Not set',
  status: 'pending' as const,
};

const mockWorkspaceHook = (options: {
  isClient?: boolean;
  milestones?: typeof pendingMilestone[];
  contractStatus?: ContractStatus;
  paidAmount?: number;
  totalBudget?: number;
} = {}): void => {
  const isClient = options.isClient ?? true;

  vi.mocked(useProjectWorkspace).mockReturnValue({
    user: { id: 'client-user-1' },
    isClient,
    activeProjectId: 'contract-1',
    setActiveProjectId: setActiveProjectIdMock,
    showInfo: true,
    setShowInfo: vi.fn(),
    messageInput: '',
    setMessageInput: vi.fn(),
    aiMessage: '',
    setAiMessage: vi.fn(),
    isFavorited: false,
    setIsFavorited: vi.fn(),
    isBlocked: false,
    setIsBlocked: vi.fn(),
    aiChat: [],
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
    },
    currentProductHandoff: null,
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
    currentProjData: {
      id: 'contract-1',
      title: 'Workspace',
      titleLong: 'Workspace',
      partnerName: 'Freelancer',
      partnerAvatar: 'https://example.com/avatar.png',
      latestMessage: 'Workspace is open.',
      time: 'Just now',
      unread: false,
      online: true,
    },
    partnerName: 'Freelancer',
    partnerAvatar: 'https://example.com/avatar.png',
    partnerTitle: isClient ? 'Freelancer' : 'Client',
    partnerCompany: 'Workspace',
    isPartnerOnline: true,
    projectMessages: [],
    handleSendMessage: vi.fn(),
    handleSendAiMessage: vi.fn(),
    handleSimulateAttachment: vi.fn(),
    handleCreateMockMilestone: vi.fn(),
    handleStartMilestone: handleStartMilestoneMock,
    handleRequestMilestoneUnlock: handleRequestMilestoneUnlockMock,
    handleWithdrawMilestone: handleWithdrawMilestoneMock,
    handleEndProject: handleEndProjectMock,
    handleClaimFinalPayout: handleClaimFinalPayoutMock,
    handleSubmitMilestoneDeliverable: vi.fn(),
    handleSubmitProductHandoff: vi.fn(),
    chatEndRef: { current: null },
  });
};

describe('ProjectWorkspaceScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleStartMilestoneMock.mockResolvedValue({ success: true });
    handleRequestMilestoneUnlockMock.mockResolvedValue({ success: true });
    handleWithdrawMilestoneMock.mockResolvedValue({ success: true });
    handleEndProjectMock.mockResolvedValue({ success: true });
    handleClaimFinalPayoutMock.mockResolvedValue({ success: true });
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

  it('lets clients start any pending milestone', async () => {
    mockWorkspaceHook({ isClient: true, milestones: [pendingMilestone] });

    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /start milestone/i }));

    await waitFor(() => {
      expect(handleStartMilestoneMock).toHaveBeenCalledWith('milestone-2');
    });
  });

  it('lets freelancers request unlock for pending milestones', async () => {
    mockWorkspaceHook({ isClient: false, milestones: [pendingMilestone] });

    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: /request unlock/i }));

    await waitFor(() => {
      expect(handleRequestMilestoneUnlockMock).toHaveBeenCalledWith('milestone-2');
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

    fireEvent.click(screen.getAllByRole('button', { name: /end project/i }).at(-1)!);

    await waitFor(() => {
      expect(handleEndProjectMock).toHaveBeenCalled();
    });
  });

  it('shows freelancer Withdraw on approved milestones instead of End Project', async () => {
    mockWorkspaceHook({
      isClient: false,
      milestones: [
        { ...pendingMilestone, id: 'milestone-1', title: 'Approved 1', status: 'approved', amount: 100, releasedAmount: 0 },
        { ...pendingMilestone, id: 'milestone-2', title: 'Approved 2', status: 'approved', amount: 100, releasedAmount: 80 },
      ],
    });

    render(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: /end project/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /withdraw/i }));

    await waitFor(() => {
      expect(handleWithdrawMilestoneMock).toHaveBeenCalledWith('milestone-1');
    });
  });

  it('shows paid in full for freelancers after claim and opens wallet history', () => {
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
    expect(screen.getByText(/escrow has been fully released to your wallet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view wallet history/i }));

    expect(navigateMock).toHaveBeenCalledWith('/wallet/history');
    expect(handleClaimFinalPayoutMock).not.toHaveBeenCalled();
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

  it('claims the remaining payout when a completed project still has escrow', async () => {
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

    expect(screen.getByText(/final payout is ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /nhận tiền/i }));
    await waitFor(() => expect(handleClaimFinalPayoutMock).toHaveBeenCalled());
    expect(screen.queryByPlaceholderText(/type your message/i)).not.toBeInTheDocument();
    expect(screen.getByText(/workspace is view-only/i)).toBeInTheDocument();
  });
});
