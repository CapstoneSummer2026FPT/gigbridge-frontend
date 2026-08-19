import { useCallback, useEffect, useRef, useState } from 'react';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { ContractStatus } from '../../../types/models/Contract';
import { ESignDocumentStatus, type ESignDocumentDto } from '../../../types/models/ESign';
import { useESignDocumentChangedEvent } from './useESignDocumentChangedEvent';

const WATCHDOG_INTERVAL_MS = 120_000;

export interface ContractESignDocumentState {
  document: ESignDocumentDto | null;
  isLoading: boolean;
  isNotFound: boolean;
  error: string | null;
  retry: () => void;
}

const ESIGN_STATUS_FALLBACK_POLL_MS = 30_000;

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
  const pendingPushRef = useRef<ESignDocumentDto | null>(null);

  const retry = useCallback(() => {
    setRequestVersion(version => version + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    pendingPushRef.current = null;

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
      if (!document) {
        setIsNotFound(false);
        setError(null);
      }

      const response = await esignGetAPI.getDocumentByContract(contractId);
      if (isCancelled) return;

      if (response.success && response.data) {
        const pending = pendingPushRef.current;
        pendingPushRef.current = null;
        const resolved =
          pending && (pending.contentRevision ?? 0) > (response.data.contentRevision ?? 0)
            ? { ...pending, renderedHtmlContent: response.data.renderedHtmlContent }
            : response.data;
        setDocument(resolved);
        setIsLoading(false);
        setError(null);
        setIsNotFound(false);
        return;
      }

      setIsLoading(false);
      if (!document) {
        setDocument(null);
        if (response.statusCode === 404) {
          setIsNotFound(true);
          return;
        }

        setError(response.message || 'Failed to load the E-sign contract document.');
      }
    };

    void loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [contractId, enabled, requestVersion]);

  const isAwaitingSignatures =
    document?.status === ESignDocumentStatus.PendingSignatures ||
    document?.status === ESignDocumentStatus.PartiallySigned;

  useEffect(() => {
    if (!enabled || !contractId || !isAwaitingSignatures) {
      return undefined;
    }

    const watchdogTimer = window.setInterval(() => {
      if (window.document.visibilityState === 'visible') {
        setRequestVersion(version => version + 1);
      }
    }, WATCHDOG_INTERVAL_MS);

    return () => window.clearInterval(watchdogTimer);
  }, [contractId, enabled, isAwaitingSignatures]);

  const handleDocumentChanged = useCallback((status: ESignDocumentDto) => {
    setDocument(previous => {
      if (!previous) {
        const pending = pendingPushRef.current;
        if (!pending || (status.contentRevision ?? 0) > (pending.contentRevision ?? 0)) {
          pendingPushRef.current = status;
        }
        return previous;
      }
      const previousRevision = previous.contentRevision ?? 0;
      const incomingRevision = status.contentRevision ?? 0;
      if (incomingRevision <= previousRevision) {
        return previous;
      }
      return { ...status, renderedHtmlContent: previous.renderedHtmlContent };
    });
  }, []);

  useESignDocumentChangedEvent(contractId, enabled, handleDocumentChanged);

  return { document, isLoading, isNotFound, error, retry };
}
