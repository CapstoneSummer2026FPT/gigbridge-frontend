import { beforeEach, describe, expect, it, vi } from 'vitest';

const signalRMock = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const connection = {
    state: 'Disconnected',
    start: vi.fn(async () => {
      connection.state = 'Connected';
    }),
    stop: vi.fn(async () => {
      connection.state = 'Disconnected';
    }),
    on: vi.fn((eventName: string, handler: (payload: unknown) => void) => {
      const eventHandlers = handlers.get(eventName) ?? new Set();
      eventHandlers.add(handler);
      handlers.set(eventName, eventHandlers);
    }),
    off: vi.fn((eventName: string, handler: (payload: unknown) => void) => {
      handlers.get(eventName)?.delete(handler);
    }),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  };
  const builder = {
    configureLogging: vi.fn(),
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(),
  };
  builder.configureLogging.mockReturnValue(builder);
  builder.withUrl.mockReturnValue(builder);
  builder.withAutomaticReconnect.mockReturnValue(builder);
  builder.build.mockReturnValue(connection);
  const HubConnectionBuilder = vi.fn(function HubConnectionBuilderMock() {
    return builder;
  });
  return { connection, builder, HubConnectionBuilder, handlers };
});

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: signalRMock.HubConnectionBuilder,
  HubConnectionState: {
    Disconnected: 'Disconnected',
    Connected: 'Connected',
  },
  LogLevel: { Warning: 3 },
}));

vi.mock('../../../service/apiService', () => ({
  getChatHubUrl: () => 'https://api.test/chatHub',
}));

beforeEach(() => {
  vi.resetModules();
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
  signalRMock.connection.state = 'Disconnected';
  signalRMock.handlers.clear();
  vi.clearAllMocks();
  signalRMock.builder.configureLogging.mockReturnValue(signalRMock.builder);
  signalRMock.builder.withUrl.mockReturnValue(signalRMock.builder);
  signalRMock.builder.withAutomaticReconnect.mockReturnValue(signalRMock.builder);
  signalRMock.builder.build.mockReturnValue(signalRMock.connection);
});

describe('chatHubConnection', () => {
  it('shares one HubConnection across ESign and escrow subscribers in the same tab', async () => {
    const { subscribeChatHubEvent } = await import('./chatHubConnection');

    const unsubscribeRevision = subscribeChatHubEvent('ESignDocumentRevisionChanged', vi.fn());
    const unsubscribeEscrow = subscribeChatHubEvent('ContractReadyForEscrow', vi.fn());
    await Promise.resolve();

    expect(signalRMock.HubConnectionBuilder).toHaveBeenCalledTimes(1);
    expect(signalRMock.builder.build).toHaveBeenCalledTimes(1);
    expect(signalRMock.connection.start).toHaveBeenCalledTimes(1);

    unsubscribeRevision();
    expect(signalRMock.connection.stop).not.toHaveBeenCalled();
    unsubscribeEscrow();
    await vi.waitFor(() => {
      expect(signalRMock.connection.stop).toHaveBeenCalledTimes(1);
    });
  });
});
