import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessages } from '../useMessages';

type RealtimeCallback = (error?: Error) => void;

interface FakeHubConnection {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  invoke: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  onreconnecting: ReturnType<typeof vi.fn>;
  onreconnected: ReturnType<typeof vi.fn>;
  onclose: ReturnType<typeof vi.fn>;
  callbacks: {
    reconnecting?: RealtimeCallback;
    reconnected?: RealtimeCallback;
    close?: RealtimeCallback;
  };
  events: Record<string, (payload: unknown) => void>;
}

const signalRMocks = vi.hoisted(() => ({
  build: vi.fn(),
}));
const apiMocks = vi.hoisted(() => ({
  getMyConversations: vi.fn(),
  getConversationMessages: vi.fn(),
}));

const stableUser = { id: 'user-1', role: 0 };
const stableTranslate = (key: string) => key;
const stableSyncSchedule = vi.fn();
const storage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

vi.mock('@microsoft/signalr', () => {
  const builder = {
    configureLogging: vi.fn(),
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: signalRMocks.build,
  };
  builder.configureLogging.mockReturnValue(builder);
  builder.withUrl.mockReturnValue(builder);
  builder.withAutomaticReconnect.mockReturnValue(builder);

  return {
    HubConnectionBuilder: vi.fn(function HubConnectionBuilder() {
      return builder;
    }),
    LogLevel: { Warning: 3 },
  };
});

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: stableUser, role: 0 }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null, search: '' }),
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: stableTranslate }),
}));

vi.mock('./useOngoingScheduleStatus', () => ({
  useOngoingScheduleStatus: () => ({
    hasOngoingSchedule: false,
    syncOngoingSchedule: stableSyncSchedule,
  }),
}));

vi.mock('../../../api/messageAPI/GET', () => ({
  messageGetAPI: {
    getMyConversations: apiMocks.getMyConversations,
    getConversationMessages: apiMocks.getConversationMessages,
  },
}));

vi.mock('../../../api/scheduleAPI', () => ({
  scheduleAPI: {
    getOngoing: vi.fn().mockResolvedValue({ success: true, data: { hasOngoingSchedule: false } }),
  },
}));

const createConnection = (startResult: 'resolve' | 'reject'): FakeHubConnection => {
  const callbacks: FakeHubConnection['callbacks'] = {};
  const events: FakeHubConnection['events'] = {};
  return {
    start: startResult === 'resolve'
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(new Error('Initial connection failed')),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((eventName: string, callback: (payload: unknown) => void) => { events[eventName] = callback; }),
    off: vi.fn((eventName: string) => { delete events[eventName]; }),
    onreconnecting: vi.fn((callback: RealtimeCallback) => { callbacks.reconnecting = callback; }),
    onreconnected: vi.fn((callback: RealtimeCallback) => { callbacks.reconnected = callback; }),
    onclose: vi.fn((callback: RealtimeCallback) => { callbacks.close = callback; }),
    callbacks,
    events,
  };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem('access_token', 'test-token');
  signalRMocks.build.mockReset();
  apiMocks.getMyConversations.mockReset().mockResolvedValue({ success: true, data: [] });
  apiMocks.getConversationMessages.mockReset().mockResolvedValue({ success: true, data: [] });
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useMessages chat realtime connection', () => {
  it('retries when the initial SignalR connection fails', async () => {
    const failedConnection = createConnection('reject');
    const connectedConnection = createConnection('resolve');
    signalRMocks.build
      .mockReturnValueOnce(failedConnection)
      .mockReturnValueOnce(connectedConnection);

    const { result, unmount } = renderHook(() => useMessages());
    await act(flushPromises);

    expect(failedConnection.start).toHaveBeenCalledOnce();
    expect(result.current.signalRStatus).toBe('reconnecting');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await flushPromises();
    });

    expect(connectedConnection.start).toHaveBeenCalledOnce();
    expect(result.current.signalRStatus).toBe('connected');
    unmount();
  });

  it('creates a fresh connection after automatic reconnect is exhausted', async () => {
    const firstConnection = createConnection('resolve');
    const replacementConnection = createConnection('resolve');
    signalRMocks.build
      .mockReturnValueOnce(firstConnection)
      .mockReturnValueOnce(replacementConnection);

    const { result, unmount } = renderHook(() => useMessages());
    await act(flushPromises);
    expect(result.current.signalRStatus).toBe('connected');

    await act(async () => {
      firstConnection.callbacks.close?.(new Error('Reconnect exhausted'));
      await vi.advanceTimersByTimeAsync(1_000);
      await flushPromises();
    });

    expect(replacementConnection.start).toHaveBeenCalledOnce();
    expect(result.current.signalRStatus).toBe('connected');
    unmount();
  });

  it('adds a received SignalR message to the active conversation immediately', async () => {
    apiMocks.getMyConversations.mockResolvedValue({
      success: true,
      data: [{
        conversationId: 'conversation-1',
        conversationType: 4,
        otherParticipantId: 'user-2',
        otherParticipantName: 'Freelancer',
        otherParticipantRole: 1,
        jobPostId: 'job-1',
        title: 'Realtime project',
        unreadCount: 0,
      }],
    });
    const connection = createConnection('resolve');
    signalRMocks.build.mockReturnValue(connection);

    const { result, unmount } = renderHook(() => useMessages());
    await act(flushPromises);
    await act(flushPromises);

    expect(result.current.activeConvId).toBe('conversation-1');
    expect(connection.events.ReceiveMessage).toBeTypeOf('function');

    act(() => {
      connection.events.ReceiveMessage({
        messageId: 'message-1',
        conversationId: 'conversation-1',
        senderUserId: 'user-1',
        messageType: 0,
        content: 'Realtime message',
        sentAt: '2026-07-31T13:00:00Z',
      });
    });

    expect(result.current.activeMessages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        conversationId: 'conversation-1',
        content: 'Realtime message',
      }),
    ]);
    unmount();
  });
});
