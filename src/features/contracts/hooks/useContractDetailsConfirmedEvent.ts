import { useEffect, useRef } from 'react';
import { onChatHubReconnected, subscribeChatHubEvent } from './chatHubConnection';

const CONTRACT_DETAILS_CONFIRMED_EVENT = 'ContractDetailsConfirmed';

interface ContractDetailsConfirmedPayload {
  contractId?: string;
  ContractId?: string;
}

export function useContractDetailsConfirmedEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onConfirmed: () => void | Promise<void>
): void {
  const confirmedRef = useRef(onConfirmed);

  useEffect(() => {
    confirmedRef.current = onConfirmed;
  }, [onConfirmed]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleConfirmed = (payload: ContractDetailsConfirmedPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (eventContractId === contractId) {
        void confirmedRef.current();
      }
    };

    const unsubscribeEvent = subscribeChatHubEvent(
      CONTRACT_DETAILS_CONFIRMED_EVENT,
      handleConfirmed
    );
    const unsubscribeReconnect = onChatHubReconnected(() => {
      void confirmedRef.current();
    });

    return () => {
      unsubscribeEvent();
      unsubscribeReconnect();
    };
  }, [contractId, enabled]);
}
