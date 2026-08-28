import { useEffect, useRef } from 'react';
import { subscribeChatHubEvent } from './chatHubConnection';

const CONTRACT_CANCELLED_EVENT = 'ContractCancelled';

interface ContractCancelledPayload {
  contractId?: string;
  ContractId?: string;
}

export function useContractCancelledEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onCancelled: () => void | Promise<void>
): void {
  const cancelledRef = useRef(onCancelled);

  useEffect(() => {
    cancelledRef.current = onCancelled;
  }, [onCancelled]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleCancelled = (payload: ContractCancelledPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (eventContractId === contractId) {
        void cancelledRef.current();
      }
    };

    return subscribeChatHubEvent(CONTRACT_CANCELLED_EVENT, handleCancelled);
  }, [contractId, enabled]);
}
