import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const realtime = vi.hoisted(() => ({
  eventHandler: undefined as ((payload: { contractId?: string; ContractId?: string }) => void) | undefined,
  reconnectHandler: undefined as (() => void) | undefined,
  unsubscribeEvent: vi.fn(),
  unsubscribeReconnect: vi.fn(),
}));

vi.mock('./chatHubConnection', () => ({
  subscribeChatHubEvent: vi.fn((_eventName: string, handler: typeof realtime.eventHandler) => {
    realtime.eventHandler = handler;
    return realtime.unsubscribeEvent;
  }),
  onChatHubReconnected: vi.fn((handler: () => void) => {
    realtime.reconnectHandler = handler;
    return realtime.unsubscribeReconnect;
  }),
}));

import { useContractDetailsChangeRequestedEvent } from './useContractDetailsChangeRequestedEvent';

describe('useContractDetailsChangeRequestedEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => key === 'access_token' ? 'token' : null),
    });
    realtime.eventHandler = undefined;
    realtime.reconnectHandler = undefined;
    realtime.unsubscribeEvent.mockClear();
    realtime.unsubscribeReconnect.mockClear();
  });

  it('refreshes only when the change request belongs to the open contract', () => {
    const onChangeRequested = vi.fn();
    renderHook(() => useContractDetailsChangeRequestedEvent('contract-1', true, onChangeRequested));

    act(() => realtime.eventHandler?.({ contractId: 'contract-2' }));
    expect(onChangeRequested).not.toHaveBeenCalled();

    act(() => realtime.eventHandler?.({ ContractId: 'contract-1' }));
    expect(onChangeRequested).toHaveBeenCalledTimes(1);
  });

  it('refreshes after reconnect and removes both subscriptions on unmount', () => {
    const onChangeRequested = vi.fn();
    const { unmount } = renderHook(() =>
      useContractDetailsChangeRequestedEvent('contract-1', true, onChangeRequested));

    act(() => realtime.reconnectHandler?.());
    expect(onChangeRequested).toHaveBeenCalledTimes(1);

    unmount();
    expect(realtime.unsubscribeEvent).toHaveBeenCalledTimes(1);
    expect(realtime.unsubscribeReconnect).toHaveBeenCalledTimes(1);
  });
});
