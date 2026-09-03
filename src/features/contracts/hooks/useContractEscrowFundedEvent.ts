import { useEffect, useRef } from 'react';
import { subscribeChatHubEvent } from './chatHubConnection';

const ESCROW_FUNDED_EVENT = 'EscrowFunded';

interface ContractEscrowFundedPayload {
  contractId?: string;
  ContractId?: string;
}

export function useContractEscrowFundedEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onFunded: () => void | Promise<void>
): void {
  const fundedRef = useRef(onFunded);

  useEffect(() => {
    fundedRef.current = onFunded;
  }, [onFunded]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleFunded = (payload: ContractEscrowFundedPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (eventContractId === contractId) {
        void fundedRef.current();
      }
    };

    return subscribeChatHubEvent(ESCROW_FUNDED_EVENT, handleFunded);
  }, [contractId, enabled]);
}
