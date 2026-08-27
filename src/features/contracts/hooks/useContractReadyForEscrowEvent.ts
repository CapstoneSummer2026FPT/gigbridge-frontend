import { useEffect, useRef } from 'react';
import { subscribeChatHubEvent } from './chatHubConnection';

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
  const readyRef = useRef(onReady);

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleReady = (payload: ContractReadyForEscrowPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (eventContractId === contractId) {
        void readyRef.current();
      }
    };

    return subscribeChatHubEvent(CONTRACT_READY_EVENT, handleReady);
  }, [contractId, enabled]);
}
