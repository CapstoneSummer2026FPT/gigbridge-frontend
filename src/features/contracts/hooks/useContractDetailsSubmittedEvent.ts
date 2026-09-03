import { useEffect, useRef } from 'react';
import { onChatHubReconnected, subscribeChatHubEvent } from './chatHubConnection';

const CONTRACT_DETAILS_SUBMITTED_EVENT = 'ContractDetailsSubmitted';

interface ContractDetailsSubmittedPayload {
  contractId?: string;
  ContractId?: string;
}

/**
 * Swaps the freelancer's "waiting for the client to update the plan" card straight into the review
 * card the moment the client resubmits, without a reload. The client's own browser does not need
 * this — the plan editor refreshes itself after a successful submit.
 */
export function useContractDetailsSubmittedEvent(
  contractId: string | null | undefined,
  enabled: boolean,
  onSubmitted: () => void | Promise<void>,
): void {
  const submittedRef = useRef(onSubmitted);

  useEffect(() => {
    submittedRef.current = onSubmitted;
  }, [onSubmitted]);

  useEffect(() => {
    if (!enabled || !contractId || !localStorage.getItem('access_token')) {
      return;
    }

    const handleSubmitted = (payload: ContractDetailsSubmittedPayload): void => {
      const eventContractId = payload.contractId ?? payload.ContractId;
      if (eventContractId === contractId) {
        void submittedRef.current();
      }
    };

    const unsubscribeEvent = subscribeChatHubEvent(
      CONTRACT_DETAILS_SUBMITTED_EVENT,
      handleSubmitted,
    );
    const unsubscribeReconnect = onChatHubReconnected(() => {
      void submittedRef.current();
    });

    return () => {
      unsubscribeEvent();
      unsubscribeReconnect();
    };
  }, [contractId, enabled]);
}
