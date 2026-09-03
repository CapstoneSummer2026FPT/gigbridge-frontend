import { useCallback, useEffect, useState } from 'react';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import type { ContractPlanChangeRequest } from '../../../types/models/Contract';

interface ContractPlanChangeRequestState {
  request: ContractPlanChangeRequest | null;
  isLoading: boolean;
  reload: () => Promise<void>;
}

/**
 * Loads the open "rework the plan" request so the client's workspace can explain why step 1
 * reopened. `refreshToken` should change whenever the contract itself is reloaded — the realtime
 * bounce-back leaves the contract on the same status when it was already awaiting details, so the
 * status alone is not enough to trigger a refetch.
 */
export function useContractPlanChangeRequest(
  contractId: string | null | undefined,
  enabled: boolean,
  refreshToken?: string | number | null,
): ContractPlanChangeRequestState {
  const [request, setRequest] = useState<ContractPlanChangeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!contractId || !enabled) {
      setRequest(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await contractGetAPI.getOpenPlanChangeRequest(contractId);
      // A contract with nothing outstanding answers 200 with a null payload, so only a failed
      // call is worth surfacing — and even then the banner simply stays hidden.
      setRequest(response.success ? response.data ?? null : null);
    } finally {
      setIsLoading(false);
    }
  }, [contractId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload, refreshToken]);

  return { request, isLoading, reload };
}
