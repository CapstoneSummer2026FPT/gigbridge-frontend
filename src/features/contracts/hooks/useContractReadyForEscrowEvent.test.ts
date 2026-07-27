import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContractReadyForEscrowEvent } from './useContractReadyForEscrowEvent';

const signalRMock = vi.hoisted(() => {
  const handlers = new Map<string, (payload: { contractId?: string; ContractId?: string }) => void>();
  const connection = {
    on: vi.fn((event: string, handler: (payload: { contractId?: string; ContractId?: string }) => void) => {
      handlers.set(event, handler);
    }),
    off: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  const builder = {
    configureLogging: vi.fn(),
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(),
  };

  return { handlers, connection, builder };
});

vi.mock('@microsoft/signalr', () => ({
  LogLevel: { Warning: 'Warning' },
  HubConnectionBuilder: vi.fn(function HubConnectionBuilderMock() {
    return signalRMock.builder;
  }),
}));

vi.mock('../../../service/apiService', () => ({
  getChatHubUrl: () => 'https://localhost:7094/hubs/chat',
}));

describe('useContractReadyForEscrowEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signalRMock.handlers.clear();
    signalRMock.builder.configureLogging.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withUrl.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withAutomaticReconnect.mockReturnValue(signalRMock.builder);
    signalRMock.builder.build.mockReturnValue(signalRMock.connection);
    const storage = new Map<string, string>([['access_token', 'client-token']]);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
    });
  });

  it('refreshes only the matching contract and cleans up the SignalR subscription', async () => {
    const onReady = vi.fn();
    const { unmount } = renderHook(() =>
      useContractReadyForEscrowEvent('contract-1', true, onReady)
    );

    await waitFor(() => {
      expect(signalRMock.connection.start).toHaveBeenCalledTimes(1);
    });

    act(() => {
      signalRMock.handlers.get('ContractReadyForEscrowFunding')?.({ contractId: 'contract-2' });
      signalRMock.handlers.get('ContractReadyForEscrowFunding')?.({ ContractId: 'contract-1' });
    });

    expect(onReady).toHaveBeenCalledTimes(1);

    unmount();

    expect(signalRMock.connection.off).toHaveBeenCalledWith(
      'ContractReadyForEscrowFunding',
      expect.any(Function)
    );
    expect(signalRMock.connection.stop).toHaveBeenCalledTimes(1);
  });
});
