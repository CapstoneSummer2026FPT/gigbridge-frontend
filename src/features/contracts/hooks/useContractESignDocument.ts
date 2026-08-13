import { useCallback, useEffect, useState } from 'react';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { ContractStatus } from '../../../types/models/Contract';
import { ESignDocumentStatus, type ESignDocumentDto } from '../../../types/models/ESign';

export interface ContractESignDocumentState {
  document: ESignDocumentDto | null;
  isLoading: boolean;
  isNotFound: boolean;
  error: string | null;
  retry: () => void;
}

export const contractStatusMayHaveESignDocument = (status: ContractStatus): boolean =>
  [
    ContractStatus.PendingSignature,
    ContractStatus.PendingEscrow,
    ContractStatus.Active,
    ContractStatus.Completed,
    ContractStatus.Cancelled,
    ContractStatus.Disputed,
  ].includes(status);

export function useContractESignDocument(
  contractId: string | null | undefined,
  enabled: boolean
): ContractESignDocumentState {
  const [document, setDocument] = useState<ESignDocumentDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setRequestVersion(version => version + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!enabled || !contractId) {
      setDocument(null);
      setIsLoading(false);
      setIsNotFound(false);
      setError(null);
      return () => {
        isCancelled = true;
      };
    }

    const loadDocument = async (): Promise<void> => {
      setIsLoading(true);
      setIsNotFound(false);
      setError(null);

      const response = await esignGetAPI.getDocumentByContract(contractId);
      if (isCancelled) return;

      if (response.success && response.data) {
        setDocument(response.data);
        setIsLoading(false);
        return;
      }

      setDocument(null);
      setIsLoading(false);
      if (response.statusCode === 404) {
        setIsNotFound(true);
        return;
      }

      setError(response.message || 'Failed to load the E-sign contract document.');
    };

    void loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [contractId, enabled, requestVersion]);

  useEffect(() => {
    if (!enabled || !contractId ||
        (document?.status !== ESignDocumentStatus.PendingSignatures &&
         document?.status !== ESignDocumentStatus.PartiallySigned)) {
      return;
    }

    const pollTimer = window.setInterval(() => {
      setRequestVersion(version => version + 1);
    }, 5000);

    return () => window.clearInterval(pollTimer);
  }, [contractId, document?.status, enabled]);

  return { document, isLoading, isNotFound, error, retry };
}
