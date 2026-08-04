import { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { getChatHubUrl } from '../../../service/apiService';

const CONTRACT_READY_EVENT = 'ContractReadyForEscrowFunding';

interface ContractReadyForEscrowPayload {
  contractId?: string;
  ContractId?: string;
}

export function useContractReadyForEscrowEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onReady: () => void | Promise<void>
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

    const handleReady = (payload: ContractReadyForEscrowPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (!disposed && eventContractId === contractId) {
        void onReady();
      }
    };

    connection.on(CONTRACT_READY_EVENT, handleReady);
    connection.start().catch(error => {
      if (!disposed) {
        console.warn('[ContractEscrowSignalR] connection failed', error);
      }
    });

    return () => {
      disposed = true;
      connection.off(CONTRACT_READY_EVENT, handleReady);
      void connection.stop().catch(() => undefined);
    };
  }, [contractId, enabled, onReady]);
}
