import { useCallback, useEffect, useRef, useState } from 'react';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { ContractStatus } from '../../../types/models/Contract';
import type { ESignDocumentStatusDto } from '../../../types/models/ESign';
import { useESignDocumentRevisionEvent } from './useESignDocumentRevisionEvent';

const SUSPENDED_TAB_RESYNC_MS = 30_000;

export interface ContractESignDocumentState {
  document: ESignDocumentStatusDto | null;
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
  const [document, setDocument] = useState<ESignDocumentStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const documentRef = useRef<ESignDocumentStatusDto | null>(null);
  const activeRequestRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);
  const pendingRevisionRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);

  const loadStatus = useCallback((showLoading = false, requestedRevision?: number): Promise<void> => {
    if (!enabled || !contractId) return Promise.resolve();
    if (activeRequestRef.current) {
      if (requestedRevision === undefined) {
        pendingRefreshRef.current = true;
      } else if (requestedRevision > (pendingRevisionRef.current ?? documentRef.current?.revision ?? -1)) {
        pendingRevisionRef.current = requestedRevision;
      }
      return activeRequestRef.current;
    }

    const generation = generationRef.current;
    if (showLoading || !documentRef.current) setIsLoading(true);

    const request = esignGetAPI.getDocumentStatusByContract(contractId)
      .then(response => {
        if (generation !== generationRef.current) return;
        if (response.success && response.data) {
          documentRef.current = response.data;
          setDocument(response.data);
          setError(null);
          setIsNotFound(false);
          return;
        }

        if (response.statusCode === 404) {
          documentRef.current = null;
          setDocument(null);
          setIsNotFound(true);
          setError(null);
          return;
        }

        setError(response.message || 'Failed to load the E-sign contract status.');
      })
      .finally(() => {
        if (activeRequestRef.current !== request) return;
        if (generation === generationRef.current) setIsLoading(false);
        activeRequestRef.current = null;
        const pendingRevision = pendingRevisionRef.current;
        pendingRevisionRef.current = null;
        const revisionStillMissing = pendingRevision !== null &&
          pendingRevision > (documentRef.current?.revision ?? -1);
        if ((pendingRefreshRef.current || revisionStillMissing) && generation === generationRef.current) {
          pendingRefreshRef.current = false;
          void loadStatus(false);
        }
      });

    activeRequestRef.current = request;
    return request;
  }, [contractId, enabled]);

  useEffect(() => {
    generationRef.current += 1;
    activeRequestRef.current = null;
    pendingRefreshRef.current = false;
    pendingRevisionRef.current = null;
    documentRef.current = null;
    setDocument(null);
    setError(null);
    setIsNotFound(false);
    setIsLoading(false);

    if (enabled && contractId) void loadStatus(true);
  }, [contractId, enabled, loadStatus]);

  const retry = useCallback(() => {
    void loadStatus(true);
  }, [loadStatus]);

  const handleRevisionChanged = useCallback((event: { revision: number; changeKind: 'upsert' | 'deleted' }) => {
    const currentRevision = documentRef.current?.revision ?? -1;
    if (event.revision <= currentRevision) return;
    void loadStatus(false, event.revision);
  }, [loadStatus]);

  const handleReconnect = useCallback(() => {
    void loadStatus(false);
  }, [loadStatus]);

  useESignDocumentRevisionEvent(
    contractId,
    enabled,
    handleRevisionChanged,
    handleReconnect,
  );

  useEffect(() => {
    if (!enabled || !contractId) return undefined;
    const handleVisibilityChange = (): void => {
      if (window.document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt !== null && Date.now() - hiddenAt >= SUSPENDED_TAB_RESYNC_MS) {
        void loadStatus(false);
      }
    };

    window.document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [contractId, enabled, loadStatus]);

  return { document, isLoading, isNotFound, error, retry };
}
