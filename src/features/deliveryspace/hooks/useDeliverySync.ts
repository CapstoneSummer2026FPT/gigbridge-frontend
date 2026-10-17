import { useCallback, useEffect, useRef, useState } from 'react';
import {
  onChatHubReconnected,
  onChatHubStatusChanged,
  retainChatHubConnection,
  type ChatHubConnectionStatus,
} from '../../../shared/realtime/chatHubConnection';
import {
  DELIVERY_HUB_EVENTS,
  MILESTONE_COMPLETED_EVENT,
  isForContract,
  readPayload,
  subscribeDeliveryNotifications,
  type DeliveryRealtimePayload,
} from '../services/deliveryRealtime';

export type DeliveryLiveStatus = 'live' | 'connecting' | 'offline';

export type DeliverySyncReason =
  | 'hub'
  | 'notification'
  | 'reconnect'
  | 'poll'
  | 'focus'
  | 'resume'
  | 'coalesced'
  | 'manual';

/**
 * A safety net, not the primary transport. While the hub is healthy this fires rarely enough to be
 * invisible; when it is not, it is what keeps the delivery space live.
 */
const LIVE_POLL_MS = 30_000;
const FALLBACK_POLL_MS = 7_000;
/** Waking the tab twice in quick succession (focus + visibilitychange) must not double-fetch. */
const WAKE_THROTTLE_MS = 2_000;

const toLiveStatus = (status: ChatHubConnectionStatus): DeliveryLiveStatus => {
  if (status === 'connected') return 'live';
  if (status === 'idle' || status === 'connecting' || status === 'reconnecting') return 'connecting';
  return 'offline';
};

export interface DeliverySyncOptions {
  contractId?: string;
  /** Pulls the latest milestones. The newest reference is always used, so it need not be stable. */
  onSync: (reason: DeliverySyncReason) => Promise<void> | void;
  onMilestoneCompleted: (payload: DeliveryRealtimePayload) => void;
  /** Suspends background refreshes while a submit or review request owns the screen. */
  isPaused: boolean;
}

export interface DeliverySyncState {
  status: DeliveryLiveStatus;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncNow: () => void;
}

/**
 * Keeps the delivery space current for both parties.
 *
 * The screen is shared by two people acting in turn, so "the other side just did something" has to
 * arrive without a manual refresh. Three independent paths feed it, deliberately overlapping:
 *
 *  1. the chat hub frames the delivery handlers publish to both participants;
 *  2. the notification hub — a separate socket that already carries a message for every submit and
 *     review, so one dead connection does not freeze the screen;
 *  3. a poll that backs off to 30s while the hub reports itself connected and tightens to 7s when
 *     it does not, plus an immediate refresh whenever the tab is brought back to the front.
 *
 * All of them funnel into one single-flight refresh, so overlapping signals for the same action
 * cost one request, and the caller's own reload after an action is never raced by a background one.
 */
export const useDeliverySync = ({
  contractId,
  onSync,
  onMilestoneCompleted,
  isPaused,
}: DeliverySyncOptions): DeliverySyncState => {
  const [status, setStatus] = useState<DeliveryLiveStatus>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const onMilestoneCompletedRef = useRef(onMilestoneCompleted);
  onMilestoneCompletedRef.current = onMilestoneCompleted;
  const contractIdRef = useRef(contractId);
  contractIdRef.current = contractId;
  const pausedRef = useRef(isPaused);

  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const skippedWhilePausedRef = useRef(false);
  const lastRunAtRef = useRef(0);

  const runSync = useCallback(async (reason: DeliverySyncReason): Promise<void> => {
    if (!contractIdRef.current) return;

    // A signal that lands mid-action is remembered rather than dropped: the action's own reload
    // only knows about its own change, so the counterparty's would otherwise be lost until the
    // next poll.
    if (pausedRef.current) {
      skippedWhilePausedRef.current = true;
      return;
    }

    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;
    setIsSyncing(true);
    try {
      await onSyncRef.current(reason);
      lastRunAtRef.current = Date.now();
      setLastSyncedAt(lastRunAtRef.current);
    } catch {
      // A failed refresh is not worth surfacing: the next signal or poll retries on its own.
    } finally {
      inFlightRef.current = false;
      setIsSyncing(false);
      if (queuedRef.current) {
        queuedRef.current = false;
        void runSync('coalesced');
      }
    }
  }, []);

  // Realtime. Every payload is filtered on contractId so another contract's traffic — which
  // arrives on the same shared connection — never reloads this screen.
  useEffect(() => {
    if (!contractId) return undefined;

    const lease = retainChatHubConnection();
    const { connection } = lease;

    const handleDeliveryEvent = (payload: unknown): void => {
      if (!isForContract(payload, contractIdRef.current)) return;
      void runSync('hub');
    };

    const handleMilestoneCompleted = (payload: unknown): void => {
      if (!isForContract(payload, contractIdRef.current)) return;
      void runSync('hub');
      onMilestoneCompletedRef.current(readPayload(payload));
    };

    DELIVERY_HUB_EVENTS.forEach(event => connection.on(event, handleDeliveryEvent));
    connection.on(MILESTONE_COMPLETED_EVENT, handleMilestoneCompleted);

    const stopReconnect = onChatHubReconnected(() => void runSync('reconnect'));
    const stopStatus = onChatHubStatusChanged(next => setStatus(toLiveStatus(next)));
    const stopNotifications = subscribeDeliveryNotifications(
      () => contractIdRef.current,
      () => void runSync('notification'),
    );

    // The lease reports failures through the status feed; an unhandled rejection here would only
    // add noise to the console.
    lease.ready.catch(() => undefined);

    return () => {
      DELIVERY_HUB_EVENTS.forEach(event => connection.off(event, handleDeliveryEvent));
      connection.off(MILESTONE_COMPLETED_EVENT, handleMilestoneCompleted);
      stopReconnect();
      stopStatus();
      stopNotifications();
      lease.release();
    };
  }, [contractId, runSync]);

  // Polling fallback. Paced off the hub's own report of itself, and never runs on a hidden tab.
  useEffect(() => {
    if (!contractId) return undefined;

    let timer: number | null = null;
    let cancelled = false;

    const schedule = (): void => {
      if (cancelled) return;
      const delay = status === 'live' ? LIVE_POLL_MS : FALLBACK_POLL_MS;
      timer = window.setTimeout(() => {
        timer = null;
        if (!window.document.hidden) void runSync('poll');
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [contractId, status, runSync]);

  // Coming back to the tab is the moment a stale screen is most visible, and the moment a dropped
  // websocket is most likely — so refresh immediately rather than waiting for the next poll.
  useEffect(() => {
    if (!contractId) return undefined;

    const syncOnWake = (): void => {
      if (window.document.hidden) return;
      if (Date.now() - lastRunAtRef.current < WAKE_THROTTLE_MS) return;
      void runSync('focus');
    };

    window.addEventListener('focus', syncOnWake);
    window.document.addEventListener('visibilitychange', syncOnWake);

    return () => {
      window.removeEventListener('focus', syncOnWake);
      window.document.removeEventListener('visibilitychange', syncOnWake);
    };
  }, [contractId, runSync]);

  useEffect(() => {
    pausedRef.current = isPaused;
    if (isPaused || !skippedWhilePausedRef.current) return;
    skippedWhilePausedRef.current = false;
    void runSync('resume');
  }, [isPaused, runSync]);

  const syncNow = useCallback(() => void runSync('manual'), [runSync]);

  return { status, lastSyncedAt, isSyncing, syncNow };
};
