import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useContractCancelledEvent } from './useContractCancelledEvent';

const { subscribeMock } = vi.hoisted(() => ({ subscribeMock: vi.fn() }));

vi.mock('./chatHubConnection', () => ({
  subscribeChatHubEvent: subscribeMock,
}));

describe('useContractCancelledEvent', () => {
  beforeEach(() => {
    subscribeMock.mockReset();
    localStorage.setItem('access_token', 'test-token');
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useContractCancelledEvent('contract-1', false, vi.fn()));

    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('does not subscribe when contractId is missing', () => {
    renderHook(() => useContractCancelledEvent(undefined, true, vi.fn()));

    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('subscribes to ContractCancelled and invokes the callback on a matching contractId', () => {
    let handler: ((payload: { contractId?: string }) => void) | undefined;
    subscribeMock.mockImplementation((eventName: string, cb: typeof handler) => {
      expect(eventName).toBe('ContractCancelled');
      handler = cb;
      return vi.fn();
    });
    const onCancelled = vi.fn();

    renderHook(() => useContractCancelledEvent('contract-1', true, onCancelled));

    expect(subscribeMock).toHaveBeenCalledTimes(1);
    handler?.({ contractId: 'contract-1' });
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it('ignores events for a different contractId', () => {
    let handler: ((payload: { contractId?: string }) => void) | undefined;
    subscribeMock.mockImplementation((_eventName: string, cb: typeof handler) => {
      handler = cb;
      return vi.fn();
    });
    const onCancelled = vi.fn();

    renderHook(() => useContractCancelledEvent('contract-1', true, onCancelled));

    handler?.({ contractId: 'some-other-contract' });
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    subscribeMock.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useContractCancelledEvent('contract-1', true, vi.fn()));
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
