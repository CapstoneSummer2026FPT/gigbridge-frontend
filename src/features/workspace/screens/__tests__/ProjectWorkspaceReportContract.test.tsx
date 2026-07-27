import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspaceScreen from '../ProjectWorkspaceScreen';
import { ContractStatus } from '../../../../types/models/Contract';
import {
  ContractReportIssueType,
  ContractReportResolutionAction,
  ContractReportStatus,
  type ReportContract,
  type ReportContractListItem,
} from '../../../../types/models/ReportContract';
import type { Message } from '../../../../types/models/Message';
import type { User } from '../../../../types/models/User';
import { UserRole } from '../../../../types/models/User';
import { useProjectWorkspace } from '../../hooks/useProjectWorkspace';
import { useReportContract } from '../../../../features/report-contracts';

vi.mock('../../hooks/useProjectWorkspace', () => ({
  useProjectWorkspace: vi.fn(),
}));

vi.mock('../../../../features/report-contracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../features/report-contracts')>();
  return { ...actual, useReportContract: vi.fn() };
});

vi.mock('../../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ contractId: 'route-contract' }),
}));

vi.mock('../../../../api/contractAPI/GET', () => ({
  contractGetAPI: {
    getMilestonesByContract: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

const loadReportsMock = vi.fn();
const createReportMock = vi.fn();
const loadReportDetailMock = vi.fn();
const respondToReportMock = vi.fn();
const confirmResolutionMock = vi.fn();
const clearSelectedReportMock = vi.fn();

const listItem: ReportContractListItem = {
  id: 'report-1',
  reporterId: 'user-1',
  reporterName: 'Reporter',
  reporterRole: 'Client',
  issueType: ContractReportIssueType.Delay,
  status: ContractReportStatus.Pending,
  resolutionAction: null,
  createdAt: '2026-07-17T00:00:00.000Z',
  respondedAt: null,
  resolvedAt: null,
};

const reportDetail = (overrides: Partial<ReportContract> = {}): ReportContract => ({
  id: 'report-1',
  contractId: 'active-contract',
  reporter: { id: 'user-1', name: 'Reporter', role: 'Client' },
  respondent: { id: 'user-2', name: 'Respondent', role: 'Freelancer' },
  milestone: null,
  issueType: ContractReportIssueType.Delay,
  description: 'The delivery is late.',
  desiredResolution: 'Agree on a new date.',
  status: ContractReportStatus.Pending,
  resolutionAction: null,
  explanation: null,
  proposedResolution: null,
  rejectReason: null,
  resolvedBy: null,
  createdAt: '2026-07-17T00:00:00.000Z',
  respondedAt: null,
  resolvedAt: null,
  isEscalatedToDispute: false,
  attachments: [],
  ...overrides,
});

const createWorkspaceUser = (id: string, role: UserRole): User => ({
  id,
  email: `${id}@example.com`,
  first_name: role === UserRole.Client ? 'Client' : 'Freelancer',
  last_name: 'User',
  full_name: role === UserRole.Client ? 'Client User' : 'Freelancer User',
  phone_number: null,
  role,
  is_email_verified: true,
  is_active: true,
  is_setup: true,
  preferred_language: 'en',
  last_login_at: null,
  login_failed_time: null,
  access_failed_count: 0,
  elo_points: 100,
  gigcoin_balance: 0,
  created_at: '2026-07-17T00:00:00.000Z',
  updated_at: '2026-07-17T00:00:00.000Z',
});

const mockWorkspace = (
  status = ContractStatus.Active,
  userId = 'user-1',
  projectMessages: Message[] = [],
) => {
  const isClient = userId === 'user-1';
  const workspaceValue: ReturnType<typeof useProjectWorkspace> = {
    user: createWorkspaceUser(userId, isClient ? UserRole.Client : UserRole.Freelancer),
    isClient,
    activeProjectId: 'active-contract',
    setActiveProjectId: vi.fn(),
    showInfo: false,
    setShowInfo: vi.fn(),
    messageInput: '',
    setMessageInput: vi.fn(),
    isFavorited: false,
    setIsFavorited: vi.fn(),
    isBlocked: false,
    setIsBlocked: vi.fn(),
    project: {
      id: 'active-contract',
      contractId: 'active-contract',
      jobId: 'job-1',
      conversationId: null,
      title: 'Workspace',
      progress: 0,
      paidAmount: 0,
      totalBudget: 100,
      milestones: [],
    },
    activeContract: {
      contractsId: 'active-contract',
      jobPostsId: 'job-1',
      clientProfilesId: 'client-profile',
      freelancerProfilesId: 'freelancer-profile',
      title: 'Workspace',
      totalBudget: 100,
      status,
      createdAt: '2026-07-17T00:00:00.000Z',
    },
    currentProductHandoff: null,
    productHandoffs: [],
    earlyStartRequests: [],
    workspaceProjects: [],
    currentProjData: {
      id: 'active-contract',
      title: 'Workspace',
      titleLong: 'Workspace',
      partnerName: 'Partner',
      partnerAvatar: '',
      latestMessage: '',
      time: '',
      unread: false,
      online: false,
      status,
    },
    partnerName: 'Partner',
    partnerAvatar: '',
    partnerTitle: 'Partner',
    partnerCompany: '',
    isPartnerOnline: false,
    projectMessages,
    handleSendMessage: vi.fn(),
    handleSimulateAttachment: vi.fn(),
    handleOpenMilestoneEditor: vi.fn(),
    handleRequestMilestoneUnlock: vi.fn(),
    handleUpdateWorkItem: vi.fn(),
    handleRespondEarlyStart: vi.fn(),
    handleEndProject: vi.fn(),
    handleSubmitMilestoneDeliverable: vi.fn(),
    handleSubmitProductHandoff: vi.fn(),
    chatEndRef: { current: null },
  };
  vi.mocked(useProjectWorkspace).mockReturnValue(workspaceValue);
};

const mockReports = (selectedReport: ReportContract | null = null) => {
  const reportValue: ReturnType<typeof useReportContract> = {
    reports: [listItem],
    isLoading: false,
    error: null,
    loadReports: loadReportsMock,
    selectedReport,
    isLoadingDetail: false,
    isCreatingReport: false,
    isRespondingReport: false,
    isConfirmingReport: false,
    isEscalatingReport: false,
    createReport: createReportMock,
    loadReportDetail: loadReportDetailMock,
    respondToReport: respondToReportMock,
    confirmResolution: confirmResolutionMock,
    escalateToDispute: vi.fn(),
    clearError: vi.fn(),
    clearSelectedReport: clearSelectedReportMock,
  };
  vi.mocked(useReportContract).mockReturnValue(reportValue);
};

const openReportDetail = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'workspace.issueReports' }));
  fireEvent.click(screen.getByRole('button', { name: 'workspace.reportView' }));
  await waitFor(() => {
    expect(loadReportDetailMock).toHaveBeenCalledWith('active-contract', 'report-1');
  });
};

describe('ProjectWorkspaceScreen Report Contract integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadReportsMock.mockResolvedValue(undefined);
    loadReportDetailMock.mockResolvedValue({
      success: true,
      statusCode: 200,
      data: reportDetail(),
    });
    createReportMock.mockResolvedValue({ success: true, statusCode: 201 });
    respondToReportMock.mockResolvedValue({ success: true, statusCode: 200 });
    confirmResolutionMock.mockResolvedValue({ success: true, statusCode: 200 });
    mockWorkspace();
    mockReports();
  });

  it('shows report controls only for an active contract', () => {
    const { rerender } = render(<ProjectWorkspaceScreen />);

    expect(screen.getByRole('button', { name: 'workspace.raiseIssue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'workspace.issueReports' })).toBeInTheDocument();

    mockWorkspace(ContractStatus.Completed);
    rerender(<ProjectWorkspaceScreen />);

    expect(screen.queryByRole('button', { name: 'workspace.raiseIssue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'workspace.issueReports' })).not.toBeInTheDocument();
  });

  it('creates a report against the active workspace contract', async () => {
    render(<ProjectWorkspaceScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'workspace.raiseIssue' }));

    const firstAttachment = new File(['first evidence'], 'first-evidence.txt', {
      type: 'text/plain',
    });
    const secondAttachment = new File(['second evidence'], 'second-evidence.txt', {
      type: 'text/plain',
    });
    const fileInput = document.getElementById('rc-evidence-files');
    expect(fileInput).toBeInstanceOf(HTMLInputElement);
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('Evidence file input was not rendered.');

    fireEvent.change(fileInput, { target: { files: [firstAttachment] } });
    fireEvent.change(fileInput, { target: { files: [secondAttachment] } });

    expect(screen.getByText('first-evidence.txt')).toBeInTheDocument();
    expect(screen.getByText('second-evidence.txt')).toBeInTheDocument();

    const firstFileItem = screen.getByText('first-evidence.txt').closest('.rc-file-item');
    const removeFirstFileButton = firstFileItem?.querySelector('button');
    expect(removeFirstFileButton).toBeInstanceOf(HTMLButtonElement);
    if (!(removeFirstFileButton instanceof HTMLButtonElement)) throw new Error('Remove evidence button was not rendered.');
    fireEvent.click(removeFirstFileButton);
    expect(screen.queryByText('first-evidence.txt')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/workspace.reportDescriptionLabel/), {
      target: { value: 'The delivery is late.' },
    });
    fireEvent.change(screen.getByLabelText(/workspace.reportDesiredResolution/), {
      target: { value: 'Agree on a new date.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'workspace.reportSubmit' }));

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalledWith('active-contract', {
        issueType: ContractReportIssueType.PaymentIssue,
        description: 'The delivery is late.',
        desiredResolution: 'Agree on a new date.',
        milestoneId: null,
        attachments: [secondAttachment],
      });
    });
  });

  it('loads the report list and opens report details', async () => {
    mockReports(reportDetail());
    render(<ProjectWorkspaceScreen />);

    await openReportDetail();

    expect(loadReportsMock).toHaveBeenCalledWith('active-contract');
    expect(screen.getByRole('dialog', { name: 'workspace.reportDetailTitle' })).toBeInTheDocument();
  });

  it('connects respondent actions to the report hook', async () => {
    mockWorkspace(ContractStatus.Active, 'user-2');
    mockReports(reportDetail());
    render(<ProjectWorkspaceScreen />);
    await openReportDetail();

    fireEvent.click(screen.getByRole('button', { name: /workspace.reportActionAcceptIssue/ }));

    await waitFor(() => {
      expect(respondToReportMock).toHaveBeenCalledWith('active-contract', 'report-1', {
        resolutionAction: ContractReportResolutionAction.AcceptIssue,
      });
    });
    expect(screen.queryByText('workspace.reportConfirmResolutionTitle')).not.toBeInTheDocument();
  });

  it('shows and submits attachments from a detailed report response', async () => {
    mockWorkspace(ContractStatus.Active, 'user-2');
    mockReports(reportDetail());
    render(<ProjectWorkspaceScreen />);
    await openReportDetail();

    fireEvent.click(
      screen.getByRole('button', { name: 'workspace.reportActionProvideExplanation' }),
    );
    const explanationField = screen
      .getByText(/workspace.reportExplanationLabel/)
      .closest('.rc-field')
      ?.querySelector('textarea');
    expect(explanationField).not.toBeNull();
    fireEvent.change(explanationField as HTMLTextAreaElement, {
      target: { value: 'The delay was caused by a dependency.' },
    });

    const attachment = new File(['response evidence'], 'response-evidence.txt', {
      type: 'text/plain',
    });
    const fileInput = document.getElementById('rc-respondent-files');
    expect(fileInput).toBeInstanceOf(HTMLInputElement);
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('Respondent file input was not rendered.');
    fireEvent.change(fileInput, { target: { files: [attachment] } });

    expect(screen.getByText('response-evidence.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.submit' }));

    await waitFor(() => {
      expect(respondToReportMock).toHaveBeenCalledWith('active-contract', 'report-1', {
        resolutionAction: ContractReportResolutionAction.ProvideExplanation,
        explanation: 'The delay was caused by a dependency.',
        proposedResolution: null,
        rejectReason: null,
        attachments: [attachment],
      });
    });
  });

  it('connects reporter acceptance and decline to the report hook', async () => {
    mockReports(reportDetail({ status: ContractReportStatus.WaitingReporterConfirmation }));
    render(<ProjectWorkspaceScreen />);
    await openReportDetail();

    fireEvent.click(screen.getByRole('button', { name: 'workspace.reportAcceptResolution' }));
    fireEvent.click(screen.getByRole('button', { name: 'workspace.reportDeclineResolution' }));

    await waitFor(() => {
      expect(confirmResolutionMock).toHaveBeenNthCalledWith(1, 'active-contract', 'report-1', true);
      expect(confirmResolutionMock).toHaveBeenNthCalledWith(2, 'active-contract', 'report-1', false);
    });
    expect(screen.queryByText('workspace.reportRespondTitle')).not.toBeInTheDocument();
  });

  it('renders a Report Contract system event and opens the existing detail modal', async () => {
    mockWorkspace(ContractStatus.Active, 'user-1', [
      {
        id: 'system-report-1',
        senderId: '',
        type: 'system',
        content: 'Reporter raised an issue report.',
        createdAt: '2026-07-17T00:00:00.000Z',
        metadata: JSON.stringify({
          kind: 'reportContract',
          reportId: 'report-1',
          contractId: 'active-contract',
          eventType: 'created',
          actorName: 'Reporter',
          actorRole: 'Client',
          issueType: ContractReportIssueType.MilestoneIssue,
          desiredResolution: 'Refund Milestone 2',
          description: 'The submitted work does not match the requirements.',
          status: ContractReportStatus.Pending,
          resolutionAction: null,
        }),
      },
    ]);
    mockReports(reportDetail());
    render(<ProjectWorkspaceScreen />);

    expect(screen.getByText('workspace.reportSystemCreatedTitle')).toBeInTheDocument();
    expect(screen.getByText('Refund Milestone 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'workspace.reportView' }));

    await waitFor(() => {
      expect(loadReportDetailMock).toHaveBeenCalledWith('active-contract', 'report-1');
    });
    expect(screen.getByRole('dialog', { name: 'workspace.reportDetailTitle' })).toBeInTheDocument();
  });

  it('marks an unavailable report directly in its system message', async () => {
    mockWorkspace(ContractStatus.Active, 'user-1', [
      {
        id: 'system-report-missing',
        senderId: '',
        type: 'system',
        content: 'An issue report was updated.',
        createdAt: '2026-07-17T00:00:00.000Z',
        metadata: JSON.stringify({
          kind: 'reportContract',
          reportId: 'missing-report',
          contractId: 'active-contract',
          eventType: 'updated',
          actorName: 'Freelancer',
          actorRole: 'Freelancer',
          issueType: ContractReportIssueType.Delay,
          desiredResolution: '',
          description: '',
          status: ContractReportStatus.WaitingReporterConfirmation,
          resolutionAction: ContractReportResolutionAction.RejectIssue,
          rejectReason: 'The request is not valid.',
        }),
      },
    ]);
    loadReportDetailMock.mockResolvedValue({ success: false, statusCode: 404, message: 'Not found' });
    render(<ProjectWorkspaceScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'workspace.reportView' }));

    expect(await screen.findByText('workspace.reportUnavailable')).toBeInTheDocument();
  });
});
