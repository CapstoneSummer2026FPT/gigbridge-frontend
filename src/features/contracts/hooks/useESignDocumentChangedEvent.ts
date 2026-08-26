import { useEffect } from 'react';
import { createChatHubConnection } from '../../messages/services/chatHubConnection';
import { normalizeESignDocument } from '../../../api/esignAPI/GET';
import type { ESignDocumentDto } from '../../../types/models/ESign';

const DOCUMENT_CHANGED_EVENT = 'ESignDocumentChanged';

export function useESignDocumentChangedEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onChanged: (status: ESignDocumentDto) => void
): void {
  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    let disposed = false;
    const connection = createChatHubConnection();

    const handleChanged = (payload: Parameters<typeof normalizeESignDocument>[0]): void => {
      if (disposed) return;
      const status = normalizeESignDocument(payload);
      if (status.contractId === contractId) {
        onChanged(status);
      }
    };

    connection.on(DOCUMENT_CHANGED_EVENT, handleChanged);
    connection.start().catch(error => {
      if (!disposed) {
        console.warn('[ESignDocumentChangedSignalR] connection failed', error);
      }
    });

    return () => {
      disposed = true;
      connection.off(DOCUMENT_CHANGED_EVENT, handleChanged);
      void connection.stop().catch(() => undefined);
    };
  }, [contractId, enabled, onChanged]);
}
