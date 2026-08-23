import { useEffect, useRef } from 'react';
import { normalizeESignDocument } from '../../../api/esignAPI/GET';
import type { ESignDocumentDto } from '../../../types/models/ESign';
import { subscribeChatHubEvent } from './chatHubConnection';

const DOCUMENT_CHANGED_EVENT = 'ESignDocumentChanged';

export function useESignDocumentChangedEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onChanged: (status: ESignDocumentDto) => void
): void {
  const changedRef = useRef(onChanged);

  useEffect(() => {
    changedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleChanged = (payload: Parameters<typeof normalizeESignDocument>[0]): void => {
      const status = normalizeESignDocument(payload);
      if (status.contractId === contractId) {
        changedRef.current(status);
      }
    };

    return subscribeChatHubEvent(DOCUMENT_CHANGED_EVENT, handleChanged);
  }, [contractId, enabled]);
}
