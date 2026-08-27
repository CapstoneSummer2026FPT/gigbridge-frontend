import { useEffect, useRef } from 'react';
import { onChatHubReconnected, subscribeChatHubEvent } from '../../../shared/realtime/chatHubConnection';

export interface ProjectReceiptRevisionChanged {
  receiptId: string;
  contractId: string;
  revision: number;
  changeKind: 'upsert' | 'deleted';
}

export const useProjectReceiptRevisionEvent = (
  onChanged: (event: ProjectReceiptRevisionChanged) => void,
  onResync: () => void,
): void => {
  const changedRef = useRef(onChanged);
  const resyncRef = useRef(onResync);
  changedRef.current = onChanged;
  resyncRef.current = onResync;

  useEffect(() => {
    let queued: ProjectReceiptRevisionChanged | null = null;
    let scheduled = false;
    const flush = (): void => {
      scheduled = false;
      const event = queued;
      queued = null;
      if (event) changedRef.current(event);
    };
    const unsubscribeEvent = subscribeChatHubEvent<ProjectReceiptRevisionChanged>(
      'ProjectReceiptRevisionChanged',
      event => {
        if (!queued || event.revision > queued.revision) queued = event;
        if (!scheduled) {
          scheduled = true;
          queueMicrotask(flush);
        }
      },
    );
    const unsubscribeReconnect = onChatHubReconnected(() => resyncRef.current());
    const handleVisibility = (): void => {
      if (window.document.visibilityState === 'visible') resyncRef.current();
    };
    window.document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribeEvent();
      unsubscribeReconnect();
      window.document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
};
