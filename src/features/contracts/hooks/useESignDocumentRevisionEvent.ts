import { useEffect, useRef } from 'react';
import type { ESignDocumentRevisionChanged } from '../../../types/models/ESign';
import { onChatHubReconnected, subscribeChatHubEvent } from './chatHubConnection';

const REVISION_CHANGED_EVENT = 'ESignDocumentRevisionChanged';

export function useESignDocumentRevisionEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onChanged: (event: ESignDocumentRevisionChanged) => void,
  onReconnected?: () => void,
): void {
  const changedRef = useRef(onChanged);
  const reconnectedRef = useRef(onReconnected);

  useEffect(() => {
    changedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    reconnectedRef.current = onReconnected;
  }, [onReconnected]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) return undefined;

    const unsubscribeEvent = subscribeChatHubEvent<ESignDocumentRevisionChanged>(
      REVISION_CHANGED_EVENT,
      event => {
        if (event.contractId === contractId) changedRef.current(event);
      },
    );
    const unsubscribeReconnect = onChatHubReconnected(() => {
      reconnectedRef.current?.();
    });

    return () => {
      unsubscribeEvent();
      unsubscribeReconnect();
    };
  }, [contractId, enabled]);
}
