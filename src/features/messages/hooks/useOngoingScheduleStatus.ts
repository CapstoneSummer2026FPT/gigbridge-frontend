import { useCallback, useEffect, useState } from 'react';

interface OngoingScheduleState {
  active: boolean;
  endsAt: number | null;
}

const MAX_TIMEOUT_MS = 2_147_000_000;

export function useOngoingScheduleStatus() {
  const [state, setState] = useState<OngoingScheduleState>({
    active: false,
    endsAt: null,
  });

  const syncOngoingSchedule = useCallback((
    hasOngoingSchedule: boolean,
    scheduledAtUtc?: string | null,
  ) => {
    if (!hasOngoingSchedule) {
      setState({ active: false, endsAt: null });
      return;
    }

    const parsedEnd = scheduledAtUtc ? new Date(scheduledAtUtc).getTime() : Number.NaN;
    if (Number.isFinite(parsedEnd) && parsedEnd <= Date.now()) {
      setState({ active: false, endsAt: null });
      return;
    }

    setState({
      active: true,
      endsAt: Number.isFinite(parsedEnd) ? parsedEnd : null,
    });
  }, []);

  useEffect(() => {
    if (!state.active || state.endsAt === null) return;

    let timeoutId: number | undefined;
    const expireWhenFinished = () => {
      const remaining = state.endsAt! - Date.now();
      if (remaining <= 0) {
        setState({ active: false, endsAt: null });
        return;
      }

      timeoutId = window.setTimeout(
        expireWhenFinished,
        Math.min(remaining, MAX_TIMEOUT_MS),
      );
    };
    const refreshAfterInactivity = () => {
      if (Date.now() >= state.endsAt!) {
        setState({ active: false, endsAt: null });
      }
    };

    expireWhenFinished();
    document.addEventListener('visibilitychange', refreshAfterInactivity);
    window.addEventListener('focus', refreshAfterInactivity);
    window.addEventListener('pageshow', refreshAfterInactivity);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', refreshAfterInactivity);
      window.removeEventListener('focus', refreshAfterInactivity);
      window.removeEventListener('pageshow', refreshAfterInactivity);
    };
  }, [state.active, state.endsAt]);

  return {
    hasOngoingSchedule: state.active,
    syncOngoingSchedule,
  };
}
