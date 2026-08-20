import { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { getChatHubUrl } from '../../../service/apiService';
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
    const connection = new signalR.HubConnectionBuilder()
      .configureLogging(signalR.LogLevel.Warning)
      .withUrl(getChatHubUrl(), {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

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
