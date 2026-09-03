import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getOpenPlanChangeRequest: vi.fn() }));

vi.mock('../../../api/contractAPI/GET', () => ({ contractGetAPI: api }));

import { useContractPlanChangeRequest } from './useContractPlanChangeRequest';

const openRequest = {
  contractPlanChangeRequestId: 'r1',
  contractId: 'contract-1',
  requestedByUserId: 'u1',
  requestedByName: 'Freelancer',
  reason: 'Split milestone one.',
  affectedMilestoneIds: ['m1'],
  affectedWorkItemIds: [],
  origin: 0,
  createdAt: '2026-09-03T00:00:00Z',
};

describe('useContractPlanChangeRequest', () => {
  beforeEach(() => {
    api.getOpenPlanChangeRequest.mockReset();
  });

  it('exposes the open request once it loads', async () => {
    api.getOpenPlanChangeRequest.mockResolvedValue({ success: true, data: openRequest });

    const { result } = renderHook(() =>
      useContractPlanChangeRequest('contract-1', true, 'rev-1'));

    await waitFor(() => expect(result.current.request).toEqual(openRequest));
    expect(api.getOpenPlanChangeRequest).toHaveBeenCalledWith('contract-1');
  });

  it('stays empty when the contract has nothing outstanding', async () => {
    api.getOpenPlanChangeRequest.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() =>
      useContractPlanChangeRequest('contract-1', true, 'rev-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.request).toBeNull();
  });

  it('does not call the API while disabled', async () => {
    const { result } = renderHook(() =>
      useContractPlanChangeRequest('contract-1', false, 'rev-1'));

    await waitFor(() => expect(result.current.request).toBeNull());
    expect(api.getOpenPlanChangeRequest).not.toHaveBeenCalled();
  });

  // The bounce-back leaves an already-PendingContractDetails contract on the same status, so the
  // refresh token is what makes the banner appear without a page reload.
  it('refetches when the refresh token changes', async () => {
    api.getOpenPlanChangeRequest.mockResolvedValue({ success: true, data: null });

    const { rerender } = renderHook(
      ({ token }) => useContractPlanChangeRequest('contract-1', true, token),
      { initialProps: { token: 'rev-1' } },
    );

    await waitFor(() => expect(api.getOpenPlanChangeRequest).toHaveBeenCalledTimes(1));

    api.getOpenPlanChangeRequest.mockResolvedValue({ success: true, data: openRequest });
    await act(async () => { rerender({ token: 'rev-2' }); });

    await waitFor(() => expect(api.getOpenPlanChangeRequest).toHaveBeenCalledTimes(2));
  });

  it('hides the banner rather than surfacing a failed lookup', async () => {
    api.getOpenPlanChangeRequest.mockResolvedValue({ success: false, message: 'boom' });

    const { result } = renderHook(() =>
      useContractPlanChangeRequest('contract-1', true, 'rev-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.request).toBeNull();
  });
});
