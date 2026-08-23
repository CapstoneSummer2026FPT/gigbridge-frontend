import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../types';

const realtime = vi.hoisted(() => {
  const handlers = new Map<string, (payload: unknown) => void>();
  const reconnectHandlers = new Set<() => void>();
  const connection = {
    on: vi.fn((eventName: string, handler: (payload: unknown) => void) => handlers.set(eventName, handler)),
    off: vi.fn((eventName: string) => handlers.delete(eventName)),
    invoke: vi.fn(async () => undefined),
  };
  return { handlers, reconnectHandlers, connection };
});

const api = vi.hoisted(() => ({
  getMyConversations: vi.fn(),
  getConversationSummary: vi.fn(),
  getConversationMessages: vi.fn(),
  getNegotiationMilestonePlan: vi.fn(),
  getNegotiationOfferDetail: vi.fn(),
  getMessagesAround: vi.fn(),
  getInboxStatus: vi.fn(),
  getMyContracts: vi.fn(),
}));

const stable = vi.hoisted(() => ({
  user: { id: 'client-user' },
  navigate: vi.fn(),
  location: { pathname: '/messages', search: '', state: null },
  translate: (key: string) => key,
  syncOngoingSchedule: vi.fn(),
}));

const activeConversation = {
  conversationId: 'conversation-a',
  conversationType: 0,
  title: 'Active negotiation',
  jobPostId: 'job-a',
  proposalId: 'proposal-a',
  contractId: null,
  status: 0,
  unreadCount: 0,
  createdAt: '2026-08-23T00:00:00.000Z',
  lastMessageAt: null,
  lastMessage: null,
  otherParticipantId: 'freelancer-user',
  otherParticipantName: 'Freelancer',
  otherParticipantRole: 1,
  lastOfferId: null,
  lastOfferPrice: null,
  lastOfferStatus: null,
};

const inactiveConversation = {
  ...activeConversation,
  conversationId: 'conversation-b',
  title: 'Inactive negotiation',
  jobPostId: 'job-b',
  proposalId: 'proposal-b',
};

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: stable.user, role: UserRole.Client }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => stable.navigate,
  useLocation: () => stable.location,
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: stable.translate }),
}));

vi.mock('../../../shared/realtime/chatHubConnection', () => ({
  retainChatHubConnection: () => ({
    connection: realtime.connection,
    ready: Promise.resolve(),
    release: vi.fn(),
  }),
  onChatHubStatusChanged: (handler: (status: string) => void) => {
    handler('connected');
    return vi.fn();
  },
  onChatHubReconnected: (handler: () => void) => {
    realtime.reconnectHandlers.add(handler);
    return () => realtime.reconnectHandlers.delete(handler);
  },
}));

vi.mock('../../../api/messageAPI/GET', () => ({
  messageGetAPI: {
    getMyConversations: api.getMyConversations,
    getConversationSummary: api.getConversationSummary,
    getConversationMessages: api.getConversationMessages,
    getNegotiationMilestonePlan: api.getNegotiationMilestonePlan,
    getNegotiationOfferDetail: api.getNegotiationOfferDetail,
    getMessagesAround: api.getMessagesAround,
    getInboxStatus: api.getInboxStatus,
  },
}));

vi.mock('../../../api/messageAPI/POST', () => ({
  messagePostAPI: { markAsRead: vi.fn(async () => ({ success: true })) },
}));
vi.mock('../../../api/messageAPI/PUT', () => ({ messagePutAPI: {} }));
vi.mock('../../../api/contractAPI/GET', () => ({
  contractGetAPI: {
    getMyContracts: api.getMyContracts,
    getContractById: vi.fn(async () => ({ success: false })),
    getContractByJobPost: vi.fn(async () => ({ success: false })),
  },
}));
vi.mock('../../../api/scheduleAPI', () => ({
  scheduleAPI: { getOngoing: vi.fn(async () => ({ success: true, data: { hasOngoingSchedule: false } })) },
}));
vi.mock('../../../api/googleMeetAPI', () => ({ googleMeetAPI: {} }));
vi.mock('../../../api/walletAPI/GET', () => ({ walletGetAPI: {} }));
vi.mock('../../../api/disputeAPI', () => ({ disputeGetAPI: {} }));
vi.mock('./useOngoingScheduleStatus', () => ({
  useOngoingScheduleStatus: () => ({
    hasOngoingSchedule: false,
    syncOngoingSchedule: stable.syncOngoingSchedule,
  }),
}));

import { useMessages } from './useMessages';

beforeEach(() => {
  vi.clearAllMocks();
  realtime.handlers.clear();
  realtime.reconnectHandlers.clear();
  const storage = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  });
  localStorage.setItem('access_token', 'test-token');
  api.getMyConversations.mockResolvedValue({ success: true, data: [activeConversation] });
  api.getConversationSummary.mockImplementation(async (conversationId: string) => ({
    success: true,
    data: conversationId === inactiveConversation.conversationId
      ? inactiveConversation
      : activeConversation,
  }));
  api.getConversationMessages.mockResolvedValue({ success: true, data: [] });
  api.getNegotiationMilestonePlan.mockResolvedValue({ success: true, data: [] });
  api.getNegotiationOfferDetail.mockResolvedValue({ success: false });
  api.getMessagesAround.mockResolvedValue({ success: true, data: [] });
  api.getInboxStatus.mockResolvedValue({ success: true, data: { revision: 0, unreadCount: 0 } });
  api.getMyContracts.mockResolvedValue({ success: true, data: [] });
});

describe('useMessages negotiation realtime', () => {
  it('routes offer events by payload conversationId without replacing the active conversation', async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.activeConvId).toBe(activeConversation.conversationId));
    await waitFor(() => expect(realtime.handlers.has('FinalOfferCreated')).toBe(true));

    await act(async () => {
      realtime.handlers.get('FinalOfferCreated')?.({
        conversationId: inactiveConversation.conversationId,
        offerId: 'offer-b',
        messageId: 'message-b',
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(api.getConversationSummary).toHaveBeenCalledWith(inactiveConversation.conversationId));
    expect(api.getConversationMessages).not.toHaveBeenCalledWith(inactiveConversation.conversationId);
    expect(result.current.activeConvId).toBe(activeConversation.conversationId);
  });

  it('ignores duplicate revisions and performs a full resync when a revision is skipped', async () => {
    renderHook(() => useMessages());
    await waitFor(() => expect(realtime.handlers.has('ConversationInboxRevisionChanged')).toBe(true));
    const initialListCalls = api.getMyConversations.mock.calls.length;

    await act(async () => {
      realtime.handlers.get('ConversationInboxRevisionChanged')?.({
        revision: 1,
        unreadCount: 0,
        conversationId: inactiveConversation.conversationId,
        changeKind: 'upsert',
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(api.getConversationSummary).toHaveBeenCalledWith(inactiveConversation.conversationId));
    const targetedCalls = api.getConversationSummary.mock.calls.length;

    act(() => {
      realtime.handlers.get('ConversationInboxRevisionChanged')?.({
        revision: 1,
        unreadCount: 0,
        conversationId: inactiveConversation.conversationId,
        changeKind: 'upsert',
      });
    });
    expect(api.getConversationSummary).toHaveBeenCalledTimes(targetedCalls);

    await act(async () => {
      realtime.handlers.get('ConversationInboxRevisionChanged')?.({
        revision: 3,
        unreadCount: 0,
        conversationId: null,
        changeKind: 'reset',
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(api.getMyConversations.mock.calls.length).toBeGreaterThan(initialListCalls));
  });

  it('refreshes the active negotiation milestone plan without changing conversations', async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.activeConvId).toBe(activeConversation.conversationId));
    await waitFor(() => expect(realtime.handlers.has('NegotiationMilestonePlanUpdated')).toBe(true));
    api.getNegotiationMilestonePlan.mockClear();

    await act(async () => {
      realtime.handlers.get('NegotiationMilestonePlanUpdated')?.({
        conversationId: activeConversation.conversationId,
        updatedByUserId: 'freelancer-user',
        updatedAt: '2026-08-23T01:00:00.000Z',
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(api.getNegotiationMilestonePlan)
      .toHaveBeenCalledWith(activeConversation.conversationId));
    expect(result.current.activeConvId).toBe(activeConversation.conversationId);
  });

  it('deduplicates the same realtime message delivered more than once', async () => {
    const { result } = renderHook(() => useMessages());
    await waitFor(() => expect(result.current.activeConvId).toBe(activeConversation.conversationId));
    await waitFor(() => expect(realtime.handlers.has('ReceiveMessage')).toBe(true));
    const message = {
      messageId: 'message-1',
      conversationId: activeConversation.conversationId,
      senderUserId: stable.user.id,
      messageType: 3,
      content: 'Offer response recorded.',
      sentAt: '2026-08-23T01:00:00.000Z',
      attachments: [],
    };

    act(() => {
      realtime.handlers.get('ReceiveMessage')?.(message);
      realtime.handlers.get('ReceiveMessage')?.(message);
    });

    await waitFor(() => expect(result.current.activeMessages).toHaveLength(1));
    expect(result.current.activeMessages[0].id).toBe(message.messageId);
  });

  it('reconciles the inbox revision after reconnect and when the tab becomes visible', async () => {
    renderHook(() => useMessages());
    await waitFor(() => expect(realtime.reconnectHandlers.size).toBe(1));
    await waitFor(() => expect(api.getInboxStatus).toHaveBeenCalled());
    api.getInboxStatus.mockClear();

    await act(async () => {
      realtime.reconnectHandlers.forEach(handler => handler());
      await Promise.resolve();
    });
    await waitFor(() => expect(api.getInboxStatus).toHaveBeenCalledTimes(1));

    api.getInboxStatus.mockClear();
    Object.defineProperty(window.document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => window.document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(api.getInboxStatus).toHaveBeenCalledTimes(1));
  });

  it('serializes overlapping direct-event and revision resync requests', async () => {
    renderHook(() => useMessages());
    await waitFor(() => expect(realtime.handlers.has('FinalOfferCreated')).toBe(true));

    let releaseSummary: (() => void) | undefined;
    const summaryGate = new Promise<void>(resolve => { releaseSummary = resolve; });
    let inFlight = 0;
    let maximumInFlight = 0;
    api.getConversationSummary.mockImplementation(async () => {
      inFlight += 1;
      maximumInFlight = Math.max(maximumInFlight, inFlight);
      await summaryGate;
      inFlight -= 1;
      return { success: true, data: activeConversation };
    });

    act(() => {
      realtime.handlers.get('FinalOfferCreated')?.({
        conversationId: activeConversation.conversationId,
        offerId: 'offer-a',
        messageId: 'message-a',
      });
      realtime.handlers.get('ConversationInboxRevisionChanged')?.({
        revision: 1,
        unreadCount: 0,
        conversationId: activeConversation.conversationId,
        changeKind: 'upsert',
      });
    });

    await waitFor(() => expect(inFlight).toBe(1));
    act(() => releaseSummary?.());
    await waitFor(() => expect(inFlight).toBe(0));
    expect(maximumInFlight).toBe(1);
  });
});
