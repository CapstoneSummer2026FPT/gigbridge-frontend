import { useEffect, useRef } from 'react';
import { onChatHubReconnected, subscribeChatHubEvent } from './chatHubConnection';

const CONTRACT_DETAILS_CHANGE_REQUESTED_EVENT = 'ContractDetailsChangeRequested';

interface ContractDetailsChangeRequestedPayload {
  contractId?: string;
  ContractId?: string;
}

export function useContractDetailsChangeRequestedEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onChangeRequested: () => void | Promise<void>,
): void {
  const changeRequestedRef = useRef(onChangeRequested);

  useEffect(() => {
    changeRequestedRef.current = onChangeRequested;
  }, [onChangeRequested]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleChangeRequested = (payload: ContractDetailsChangeRequestedPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (eventContractId === contractId) {
        void changeRequestedRef.current();
      }
    };

    const unsubscribeEvent = subscribeChatHubEvent(
      CONTRACT_DETAILS_CHANGE_REQUESTED_EVENT,
      handleChangeRequested,
    );
    const unsubscribeReconnect = onChatHubReconnected(() => {
      void changeRequestedRef.current();
    });

    return () => {
      unsubscribeEvent();
      unsubscribeReconnect();
    };
  }, [contractId, enabled]);
}
