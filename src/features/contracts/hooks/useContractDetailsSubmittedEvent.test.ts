import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const realtime = vi.hoisted(() => ({
  eventName: undefined as string | undefined,
  eventHandler: undefined as ((payload: { contractId?: string; ContractId?: string }) => void) | undefined,
  reconnectHandler: undefined as (() => void) | undefined,
  unsubscribeEvent: vi.fn(),
  unsubscribeReconnect: vi.fn(),
}));

vi.mock('./chatHubConnection', () => ({
  subscribeChatHubEvent: vi.fn((eventName: string, handler: typeof realtime.eventHandler) => {
    realtime.eventName = eventName;
    realtime.eventHandler = handler;
    return realtime.unsubscribeEvent;
  }),
  onChatHubReconnected: vi.fn((handler: () => void) => {
    realtime.reconnectHandler = handler;
    return realtime.unsubscribeReconnect;
  }),
}));

import { useContractDetailsSubmittedEvent } from './useContractDetailsSubmittedEvent';

describe('useContractDetailsSubmittedEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => key === 'access_token' ? 'token' : null),
    });
    realtime.eventName = undefined;
    realtime.eventHandler = undefined;
    realtime.reconnectHandler = undefined;
    realtime.unsubscribeEvent.mockClear();
    realtime.unsubscribeReconnect.mockClear();
  });

  it('subscribes to the event the submit handler broadcasts', () => {
    renderHook(() => useContractDetailsSubmittedEvent('contract-1', true, vi.fn()));
    expect(realtime.eventName).toBe('ContractDetailsSubmitted');
  });

  it('refreshes only when the resubmitted plan belongs to the open contract', () => {
    const onSubmitted = vi.fn();
    renderHook(() => useContractDetailsSubmittedEvent('contract-1', true, onSubmitted));

    act(() => realtime.eventHandler?.({ contractId: 'contract-2' }));
    expect(onSubmitted).not.toHaveBeenCalled();

    act(() => realtime.eventHandler?.({ ContractId: 'contract-1' }));
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('refreshes after reconnect and removes both subscriptions on unmount', () => {
    const onSubmitted = vi.fn();
    const { unmount } = renderHook(() =>
      useContractDetailsSubmittedEvent('contract-1', true, onSubmitted));

    act(() => realtime.reconnectHandler?.());
    expect(onSubmitted).toHaveBeenCalledTimes(1);

    unmount();
    expect(realtime.unsubscribeEvent).toHaveBeenCalledTimes(1);
    expect(realtime.unsubscribeReconnect).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe while disabled', () => {
    renderHook(() => useContractDetailsSubmittedEvent('contract-1', false, vi.fn()));
    expect(realtime.eventHandler).toBeUndefined();
  });
});
