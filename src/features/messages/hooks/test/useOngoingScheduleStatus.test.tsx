import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOngoingScheduleStatus } from '../useOngoingScheduleStatus';

describe('useOngoingScheduleStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unblocks schedule creation when the ongoing schedule finishes', () => {
    const { result } = renderHook(() => useOngoingScheduleStatus());

    act(() => {
      result.current.syncOngoingSchedule(true, '2026-07-29T12:01:00.000Z');
    });
    expect(result.current.hasOngoingSchedule).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.hasOngoingSchedule).toBe(false);
  });

  it('does not block for a finished schedule that is still visible', () => {
    const { result } = renderHook(() => useOngoingScheduleStatus());

    act(() => {
      result.current.syncOngoingSchedule(true, '2026-07-29T11:59:59.000Z');
    });

    expect(result.current.hasOngoingSchedule).toBe(false);
  });

  it('stays blocked when the backend reports an ongoing schedule without an end time', () => {
    const { result } = renderHook(() => useOngoingScheduleStatus());

    act(() => {
      result.current.syncOngoingSchedule(true);
    });

    expect(result.current.hasOngoingSchedule).toBe(true);
  });
});
