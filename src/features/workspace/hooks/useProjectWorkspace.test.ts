import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectWorkspace } from './useProjectWorkspace';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { ContractStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';

const signalRMock = vi.hoisted(() => {
  const handlers = new Map<string, (payload: Record<string, unknown>) => void>();
  let reconnectedHandler: (() => void) | undefined;
  const connection = {
    state: 'Connected',
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((eventName: string, handler: (payload: Record<string, unknown>) => void) => handlers.set(eventName, handler)),
    off: vi.fn((eventName: string) => handlers.delete(eventName)),
    onreconnected: vi.fn((handler: () => void) => { reconnectedHandler = handler; }),
    onclose: vi.fn(),
  };
  const builder = {
    configureLogging: vi.fn(),
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(() => connection),
  };
  builder.configureLogging.mockReturnValue(builder);
  builder.withUrl.mockReturnValue(builder);
  builder.withAutomaticReconnect.mockReturnValue(builder);

  return {
    handlers,
    connection,
    builder,
    getReconnectedHandler: () => reconnectedHandler,
    resetCallbacks: () => { reconnectedHandler = undefined; },
  };
});

const appProviderMock = vi.hoisted(() => ({ role: 0, userId: 'client-user-1' }));

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(function HubConnectionBuilderMock() {
    return signalRMock.builder;
  }),
  HubConnectionState: { Connected: 'Connected' },
  LogLevel: { Warning: 'Warning' },
}));

vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: { id: appProviderMock.userId }, role: appProviderMock.role }),
}));
vi.mock('../../../api/contractAPI/GET', () => ({
  contractGetAPI: {
    getContractById: vi.fn(),
    getMilestonesByContract: vi.fn(),
    getMyContracts: vi.fn(),
    getProductHandoffs: vi.fn(),
  },
}));
vi.mock('../../../api/contractAPI/POST', () => ({
  contractPostAPI: {
    endProject: vi.fn(),
    withdrawMilestone: vi.fn(),
  },
}));
vi.mock('../../../api/messageAPI/GET', () => ({
  messageGetAPI: { getConversationMessages: vi.fn() },
}));
vi.mock('../../../api/messageAPI/POST', () => ({
  messagePostAPI: { sendMessage: vi.fn() },
}));

const success = <T,>(data: T) => ({ success: true, statusCode: 200, message: 'Success', data });

describe('useProjectWorkspace realtime chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appProviderMock.role = UserRole.Client;
    appProviderMock.userId = 'client-user-1';
    signalRMock.handlers.clear();
    signalRMock.resetCallbacks();
    signalRMock.connection.state = 'Connected';
    signalRMock.builder.configureLogging.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withUrl.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withAutomaticReconnect.mockReturnValue(signalRMock.builder);
    const storage = new Map<string, string>([['access_token', 'workspace-token']]);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
    });

    vi.mocked(contractGetAPI.getContractById).mockResolvedValue(success({
      contractsId: 'contract-1',
      jobPostsId: 'job-1',
      clientProfilesId: 'client-profile-1',
      freelancerProfilesId: 'freelancer-profile-1',
      conversationId: 'conversation-1',
      title: 'Realtime workspace',
      totalBudget: 100,
      status: 7,
      createdAt: '2026-07-02T01:00:00.000Z',
    }) as never);
    vi.mocked(contractGetAPI.getMilestonesByContract).mockResolvedValue(success([]) as never);
    vi.mocked(contractGetAPI.getMyContracts).mockResolvedValue(success([]) as never);
    vi.mocked(contractGetAPI.getProductHandoffs).mockResolvedValue(success([]) as never);
    vi.mocked(messageGetAPI.getConversationMessages).mockResolvedValue(success([]) as never);
  });

  it('connects, joins the workspace conversation, and handles only matching realtime messages', async () => {
    const { result } = renderHook(() => useProjectWorkspace('contract-1'));

    await waitFor(() => expect(signalRMock.connection.start).toHaveBeenCalled());
    await waitFor(() => expect(signalRMock.connection.invoke).toHaveBeenCalledWith('JoinConversation', 'conversation-1'));
    expect(signalRMock.builder.withUrl).toHaveBeenCalledWith(
      expect.stringMatching(/\/hubs\/chat$/),
      expect.objectContaining({ accessTokenFactory: expect.any(Function) })
    );
    expect(signalRMock.builder.withUrl.mock.calls[0][1].accessTokenFactory()).toBe('workspace-token');

    act(() => {
      signalRMock.handlers.get('ReceiveMessage')?.({
        messageId: 'message-1', conversationId: 'conversation-1', senderUserId: 'freelancer-user-1',
        content: 'Realtime hello', sentAt: '2026-07-02T02:00:00.000Z', messageType: 0,
      });
      signalRMock.handlers.get('ReceiveMessage')?.({
        messageId: 'message-2', conversationId: 'conversation-2', senderUserId: 'other-user',
        content: 'Wrong conversation', sentAt: '2026-07-02T02:01:00.000Z', messageType: 0,
      });
      signalRMock.handlers.get('ReceiveMessage')?.({
        messageId: 'report-message-1', conversationId: 'conversation-1', senderUserId: null,
        content: 'An issue report was created.', sentAt: '2026-07-02T02:02:00.000Z', messageType: 5,
        metadata: JSON.stringify({
          kind: 'reportContract', reportId: 'report-1', contractId: 'contract-1', eventType: 'created',
        }),
      });
    });

    expect(result.current.projectMessages).toHaveLength(2);
    expect(result.current.projectMessages[0]).toMatchObject({ id: 'message-1', content: 'Realtime hello', sendStatus: 'sent' });
    expect(result.current.projectMessages[1]).toMatchObject({
      id: 'report-message-1',
      type: 'system',
      messageType: 5,
      metadata: expect.stringContaining('report-1'),
    });
  });

  it('replaces an optimistic message with its server echo instead of duplicating it', async () => {
    let resolveSend: ((value: ReturnType<typeof success>) => void) | undefined;
    vi.mocked(messagePostAPI.sendMessage).mockReturnValue(new Promise(resolve => { resolveSend = resolve; }) as never);
    const { result } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(result.current.project.conversationId).toBe('conversation-1'));

    act(() => result.current.setMessageInput('Optimistic hello'));
    await act(async () => { void result.current.handleSendMessage(); });
    expect(result.current.projectMessages).toHaveLength(1);
    const clientMessageId = result.current.projectMessages[0].clientMessageId;

    act(() => signalRMock.handlers.get('ReceiveMessage')?.({
      messageId: 'server-message-1', clientMessageId, conversationId: 'conversation-1',
      senderUserId: 'client-user-1', content: 'Optimistic hello', sentAt: '2026-07-02T02:00:00.000Z', messageType: 0,
    }));

    expect(result.current.projectMessages).toHaveLength(1);
    expect(result.current.projectMessages[0]).toMatchObject({ id: 'server-message-1', clientMessageId, sendStatus: 'sent' });
    await act(async () => { resolveSend?.(success(result.current.projectMessages[0])); });
  });

  it('rejoins after reconnect and removes listeners when unmounted', async () => {
    const { unmount } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(signalRMock.connection.invoke).toHaveBeenCalledWith('JoinConversation', 'conversation-1'));
    signalRMock.connection.invoke.mockClear();

    await act(async () => { signalRMock.getReconnectedHandler()?.(); });
    expect(signalRMock.connection.invoke).toHaveBeenCalledWith('JoinConversation', 'conversation-1');

    unmount();
    expect(signalRMock.connection.off).toHaveBeenCalledWith('ReceiveMessage', expect.any(Function));
    expect(signalRMock.connection.off).toHaveBeenCalledWith('ContractCompleted', expect.any(Function));
    expect(signalRMock.connection.off).toHaveBeenCalledWith('FinalPayoutClaimed', expect.any(Function));
    expect(signalRMock.connection.stop).toHaveBeenCalled();
    expect(signalRMock.connection.invoke).toHaveBeenCalledWith('LeaveConversation', 'conversation-1');
  });

  it('reloads workspace data on matching ContractCompleted realtime event', async () => {
    const walletUpdatedHandler = vi.fn();
    window.addEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
    const { result } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(1));

    act(() => {
      signalRMock.handlers.get('ContractCompleted')?.({
        contractId: 'contract-2',
        status: 8,
      });
    });
    expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(1);
    expect(walletUpdatedHandler).not.toHaveBeenCalled();

    act(() => {
      signalRMock.handlers.get('ContractCompleted')?.({
        contractId: 'contract-1',
        status: 8,
      });
    });

    await waitFor(() => expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(walletUpdatedHandler).toHaveBeenCalledTimes(1));
    expect(result.current.reviewPromptContractId).toBe('contract-1');
    window.removeEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
  });

  it('opens the client review prompt after ending the project successfully', async () => {
    vi.mocked(contractPostAPI.endProject).mockResolvedValue(success({}) as never);
    const { result } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(result.current.activeContract?.contractsId).toBe('contract-1'));

    await act(async () => {
      expect(await result.current.handleEndProject()).toMatchObject({ success: true });
    });

    expect(contractPostAPI.endProject).toHaveBeenCalledWith('contract-1');
    expect(result.current.reviewPromptContractId).toBe('contract-1');
  });

  it('withdraws an approved milestone, reloads workspace data, and refreshes the wallet', async () => {
    appProviderMock.role = UserRole.Freelancer;
    appProviderMock.userId = 'freelancer-user-1';
    vi.mocked(contractPostAPI.withdrawMilestone).mockResolvedValue(success({
      contractId: 'contract-1',
      milestoneId: 'milestone-1',
      escrowId: 'escrow-1',
      releasedAmountVnd: 80,
      releasedTokens: 80,
      milestoneReleasedAmountVnd: 80,
      escrowReleasedAmountVnd: 80,
      escrowStatus: 1,
    }) as never);
    const walletUpdatedHandler = vi.fn();
    window.addEventListener('gigbridge-wallet-updated', walletUpdatedHandler);

    const { result } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(result.current.activeContract?.status).toBe(ContractStatus.Active));
    const initialLoadCount = vi.mocked(contractGetAPI.getContractById).mock.calls.length;

    await act(async () => {
      expect(await result.current.handleWithdrawMilestone('milestone-1')).toMatchObject({ success: true });
    });

    expect(contractPostAPI.withdrawMilestone).toHaveBeenCalledWith('contract-1', 'milestone-1');
    expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(initialLoadCount + 1);
    expect(walletUpdatedHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
  });

  it('reloads stale milestone data after a duplicate withdrawal conflict', async () => {
    appProviderMock.role = UserRole.Freelancer;
    appProviderMock.userId = 'freelancer-user-1';
    vi.mocked(contractPostAPI.withdrawMilestone).mockResolvedValue({
      success: false,
      statusCode: 409,
      message: 'Milestone has already reached the early withdrawal limit.',
    });

    const { result } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(result.current.activeContract?.status).toBe(ContractStatus.Active));
    const initialLoadCount = vi.mocked(contractGetAPI.getContractById).mock.calls.length;

    await act(async () => {
      expect(await result.current.handleWithdrawMilestone('milestone-1')).toMatchObject({
        success: false,
        statusCode: 409,
      });
    });

    expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(initialLoadCount + 1);
  });

  it('reloads workspace and wallet on matching FinalPayoutClaimed event', async () => {
    const walletUpdatedHandler = vi.fn();
    window.addEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
    renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(1));

    act(() => signalRMock.handlers.get('FinalPayoutClaimed')?.({ contractId: 'contract-1' }));

    await waitFor(() => expect(contractGetAPI.getContractById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(walletUpdatedHandler).toHaveBeenCalledTimes(1));
    window.removeEventListener('gigbridge-wallet-updated', walletUpdatedHandler);
  });

  it('keeps disputed contracts in the sidebar after switching workspaces', async () => {
    const contracts = [
      {
        contractsId: 'contract-disputed', jobPostsId: 'job-disputed', clientProfilesId: 'client-profile-1',
        freelancerProfilesId: 'freelancer-profile-1', conversationId: 'conversation-disputed',
        title: 'Disputed workspace', totalBudget: 100, status: ContractStatus.Disputed,
        createdAt: '2026-07-01T01:00:00.000Z',
      },
      {
        contractsId: 'contract-active', jobPostsId: 'job-active', clientProfilesId: 'client-profile-1',
        freelancerProfilesId: 'freelancer-profile-1', conversationId: 'conversation-active',
        title: 'Active workspace', totalBudget: 200, status: ContractStatus.Active,
        createdAt: '2026-07-02T01:00:00.000Z',
      },
    ];
    vi.mocked(contractGetAPI.getMyContracts).mockResolvedValue(success(contracts) as never);
    vi.mocked(contractGetAPI.getContractById).mockImplementation(async contractId =>
      success(contracts.find(contract => contract.contractsId === contractId)!) as never);

    const { result } = renderHook(() => useProjectWorkspace('contract-disputed'));
    await waitFor(() => expect(result.current.workspaceProjects).toHaveLength(2));
    expect(result.current.workspaceProjects.find(item => item.id === 'contract-disputed')?.status)
      .toBe(ContractStatus.Disputed);

    act(() => result.current.setActiveProjectId('contract-active'));
    await waitFor(() => expect(result.current.activeProjectId).toBe('contract-active'));
    await waitFor(() => expect(result.current.workspaceProjects).toHaveLength(2));
    expect(result.current.workspaceProjects.map(item => item.id))
      .toEqual(expect.arrayContaining(['contract-active', 'contract-disputed']));
  });

  it('does not submit a workspace message when the contract is disputed', async () => {
    vi.mocked(contractGetAPI.getContractById).mockResolvedValue(success({
      contractsId: 'contract-1', jobPostsId: 'job-1', clientProfilesId: 'client-profile-1',
      freelancerProfilesId: 'freelancer-profile-1', conversationId: 'conversation-1',
      title: 'Disputed workspace', totalBudget: 100, status: ContractStatus.Disputed,
      createdAt: '2026-07-02T01:00:00.000Z',
    }) as never);

    const { result } = renderHook(() => useProjectWorkspace('contract-1'));
    await waitFor(() => expect(result.current.activeContract?.status).toBe(ContractStatus.Disputed));
    act(() => result.current.setMessageInput('Blocked message'));
    await act(async () => result.current.handleSendMessage());

    expect(messagePostAPI.sendMessage).not.toHaveBeenCalled();
    expect(result.current.projectMessages).toHaveLength(0);
  });
});
