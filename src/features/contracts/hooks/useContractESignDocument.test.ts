import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { ESignDocumentStatus } from '../../../types/models/ESign';
import { useContractESignDocument } from './useContractESignDocument';

vi.mock('../../../api/esignAPI/GET', () => ({
  esignGetAPI: {
    getDocumentByContract: vi.fn(),
  },
}));

describe('useContractESignDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not request a document before the E-sign workflow is available', () => {
    const { result } = renderHook(() =>
      useContractESignDocument('contract-1', false)
    );

    expect(result.current.document).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(esignGetAPI.getDocumentByContract).not.toHaveBeenCalled();
  });

  it('treats a missing document as a normal not-yet-created state', async () => {
    vi.mocked(esignGetAPI.getDocumentByContract).mockResolvedValue({
      success: false,
      statusCode: 404,
      message: 'Not found',
    });

    const { result } = renderHook(() =>
      useContractESignDocument('contract-1', true)
    );

    await waitFor(() => expect(result.current.isNotFound).toBe(true));
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads the contract document and retries recoverable failures', async () => {
    vi.mocked(esignGetAPI.getDocumentByContract)
      .mockResolvedValueOnce({
        success: false,
        statusCode: 503,
        message: 'Service unavailable',
      })
      .mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        message: 'Success',
        data: {
          documentId: 'document-1',
          jobPostId: 'job-1',
          contractId: 'contract-1',
          templateId: 'template-1',
          documentCode: 'GB-CONTRACT-001',
          renderedHtmlContent: '<p>Contract</p>',
          status: ESignDocumentStatus.PendingSignatures,
          currentUserSignerRole: null,
          canCurrentUserSign: false,
          hasFinalArtifact: false,
          createdAt: '2026-07-28T00:00:00.000Z',
          signatures: [],
        },
      });

    const { result } = renderHook(() =>
      useContractESignDocument('contract-1', true)
    );

    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));

    act(() => result.current.retry());

    await waitFor(() => {
      expect(result.current.document?.documentId).toBe('document-1');
    });
    expect(esignGetAPI.getDocumentByContract).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });
});
