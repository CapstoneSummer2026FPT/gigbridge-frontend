import { useEffect } from 'react';
import { createChatHubConnection } from '../../messages/services/chatHubConnection';

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
    const connection = createChatHubConnection();

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
