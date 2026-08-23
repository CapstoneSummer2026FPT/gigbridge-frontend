import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ESignDocumentRevisionChanged, ESignDocumentStatusDto } from '../../../types/models/ESign';
import { ESignDocumentStatus } from '../../../types/models/ESign';

const revisionHook = vi.hoisted(() => ({
  onChanged: undefined as ((event: ESignDocumentRevisionChanged) => void) | undefined,
  onReconnected: undefined as (() => void) | undefined,
}));

const getDocumentStatusByContract = vi.hoisted(() => vi.fn());

vi.mock('../../../api/esignAPI/GET', () => ({
  esignGetAPI: { getDocumentStatusByContract },
}));

vi.mock('./useESignDocumentRevisionEvent', () => ({
  useESignDocumentRevisionEvent: (
    _contractId: string | null | undefined,
    _enabled: boolean,
    onChanged: (event: ESignDocumentRevisionChanged) => void,
    onReconnected?: () => void,
  ) => {
    revisionHook.onChanged = onChanged;
    revisionHook.onReconnected = onReconnected;
  },
}));

import { useContractESignDocument } from './useContractESignDocument';

const contractId = '11111111-1111-1111-1111-111111111111';

const status = (revision: number): ESignDocumentStatusDto => ({
  documentId: '22222222-2222-2222-2222-222222222222',
  contractId,
  status: ESignDocumentStatus.PendingSignatures,
  revision,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: null,
  expiresAt: null,
  finalizedAt: null,
  currentUserSignerRole: 0,
  canCurrentUserSign: true,
  hasDocxArtifact: false,
  hasPdfArtifact: false,
  pdfSizeBytes: null,
  semanticHash: null,
  signatureCount: 0,
  signatures: [],
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  revisionHook.onChanged = undefined;
  revisionHook.onReconnected = undefined;
});

describe('useContractESignDocument', () => {
  it('loads once, has no watchdog polling, and coalesces duplicate revision events', async () => {
    getDocumentStatusByContract.mockResolvedValueOnce({ success: true, data: status(1) });
    const { result } = renderHook(() => useContractESignDocument(contractId, true));

    await waitFor(() => expect(result.current.document?.revision).toBe(1));
    expect(getDocumentStatusByContract).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    });
    expect(getDocumentStatusByContract).toHaveBeenCalledTimes(1);

    let resolveRevision!: (value: { success: boolean; data: ESignDocumentStatusDto }) => void;
    getDocumentStatusByContract.mockImplementationOnce(() => new Promise(resolve => {
      resolveRevision = resolve;
    }));

    act(() => {
      revisionHook.onChanged?.({
        documentId: status(1).documentId,
        contractId,
        revision: 2,
        changeKind: 'upsert',
      });
      revisionHook.onChanged?.({
        documentId: status(1).documentId,
        contractId,
        revision: 2,
        changeKind: 'upsert',
      });
    });
    expect(getDocumentStatusByContract).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRevision({ success: true, data: status(2) });
      await Promise.resolve();
    });

    expect(result.current.document?.revision).toBe(2);
    expect(getDocumentStatusByContract).toHaveBeenCalledTimes(2);

    act(() => {
      revisionHook.onChanged?.({
        documentId: status(1).documentId,
        contractId,
        revision: 2,
        changeKind: 'upsert',
      });
    });
    expect(getDocumentStatusByContract).toHaveBeenCalledTimes(2);
  });
});
