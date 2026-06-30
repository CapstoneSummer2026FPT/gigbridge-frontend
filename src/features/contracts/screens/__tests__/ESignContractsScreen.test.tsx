import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import ESignContractsScreen from '../ESignContractsScreen';
import { esignGetAPI } from '../../../../api/esignAPI/GET';
import { ESignerRole, ESignDocumentStatus, SignatureStatus } from '../../../../types/models/ESign';

vi.mock('../../../../api/esignAPI/GET', () => ({
  esignGetAPI: {
    getMySignedDocuments: vi.fn(),
    getDocumentById: vi.fn(),
  },
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const signedDocumentItem = {
  documentId: 'doc-1',
  jobPostId: 'job-post-1',
  contractId: 'contract-1',
  documentCode: 'GB-CONTRACT-001',
  documentType: 'Contract',
  title: 'Mobile App Contract',
  documentStatus: ESignDocumentStatus.FullySigned,
  currentUserSignerRole: ESignerRole.Client,
  currentUserSignedAt: '2026-06-28T02:00:00.000Z',
  hasClientSigned: true,
  hasFreelancerSigned: true,
  signatureCount: 2,
  finalizedAt: '2026-06-28T03:00:00.000Z',
  exportedPdfUrl: 'https://example.com/contract.pdf',
  createdAt: '2026-06-27T01:00:00.000Z',
  updatedAt: '2026-06-28T03:00:00.000Z',
};

const signedDocumentDetail = {
  documentId: 'doc-1',
  jobPostId: 'job-post-1',
  contractId: 'contract-1',
  templateId: 'template-1',
  documentCode: 'GB-CONTRACT-001',
  renderedHtmlContent: '<h1>Signed Contract</h1><p>Read-only terms</p>',
  status: ESignDocumentStatus.FullySigned,
  documentHash: 'hash-1',
  expiresAt: null,
  finalizedAt: '2026-06-28T03:00:00.000Z',
  exportedPdfUrl: 'https://example.com/contract.pdf',
  createdAt: '2026-06-27T01:00:00.000Z',
  updatedAt: '2026-06-28T03:00:00.000Z',
  signatures: [
    {
      signatureId: 'sig-1',
      documentId: 'doc-1',
      userId: 'user-1',
      signerRole: ESignerRole.Client,
      signatureImageUrl: 'https://example.com/signature.png',
      signatureWidth: 300,
      signatureHeight: 100,
      status: SignatureStatus.Signed,
      signedAt: '2026-06-28T02:00:00.000Z',
      declinedAt: null,
      declineReason: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      createdAt: '2026-06-28T02:00:00.000Z',
    },
  ],
};

const renderScreen = (): void => {
  render(
    <BrowserRouter>
      <ESignContractsScreen />
    </BrowserRouter>
  );
};

describe('ESignContractsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads signed contract documents', async () => {
    vi.mocked(esignGetAPI.getMySignedDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [signedDocumentItem],
        pageNumber: 1,
        totalPages: 1,
        totalCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    vi.mocked(esignGetAPI.getDocumentById).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: signedDocumentDetail,
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mobile app contract/i })).toBeInTheDocument();
    });
    expect(esignGetAPI.getMySignedDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'contract' })
    );
    expect(screen.getByText('Job Post')).toBeInTheDocument();
  });

  it('shows an empty state when no signed contracts exist', async () => {
    vi.mocked(esignGetAPI.getMySignedDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [],
        pageNumber: 1,
        totalPages: 1,
        totalCount: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('No e-sign contracts found')).toBeInTheDocument();
    });
  });

  it('opens a read-only preview without signing or editing controls', async () => {
    vi.mocked(esignGetAPI.getMySignedDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [signedDocumentItem],
        pageNumber: 1,
        totalPages: 1,
        totalCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    vi.mocked(esignGetAPI.getDocumentById).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: signedDocumentDetail,
    });

    const user = userEvent.setup();
    renderScreen();

    const documentButton = await screen.findByRole('button', { name: /mobile app contract/i });
    await user.click(documentButton);

    await waitFor(() => {
      expect(screen.getByText('Read-only preview')).toBeInTheDocument();
    });
    expect(screen.getByTitle('Read-only e-sign contract document')).toHaveAttribute(
      'srcdoc',
      signedDocumentDetail.renderedHtmlContent
    );
    expect(screen.queryByText('Sign contract')).not.toBeInTheDocument();
    expect(screen.queryByText('Proceed to sign')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit contract')).not.toBeInTheDocument();
  });
});
