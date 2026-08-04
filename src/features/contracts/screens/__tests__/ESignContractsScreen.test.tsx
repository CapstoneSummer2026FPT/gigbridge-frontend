import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ESignContractsScreen from '../ESignContractsScreen';
import { esignGetAPI } from '../../../../api/esignAPI/GET';
import { ESignerRole, ESignDocumentStatus, SignatureStatus } from '../../../../types/models/ESign';

vi.mock('../../../../api/esignAPI/GET', () => ({
  esignGetAPI: {
    getMyDocuments: vi.fn(),
    getAdminDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    downloadDocument: vi.fn(),
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
  canCurrentUserSign: false,
  hasFinalArtifact: true,
  finalizedDocumentFileName: 'GB-CONTRACT-001.docx',
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
  currentUserSignerRole: ESignerRole.Client,
  canCurrentUserSign: false,
  hasFinalArtifact: true,
  finalizedDocumentFileName: 'GB-CONTRACT-001.docx',
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

const renderScreen = (path = '/contracts/esign'): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ESignContractsScreen />
    </MemoryRouter>
  );
};

describe('ESignContractsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:contract'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('loads all participant contract documents', async () => {
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
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
    expect(esignGetAPI.getMyDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 })
    );
    expect(screen.getByText('Job Post')).toBeInTheDocument();
  });

  it('shows an empty state when no contracts exist', async () => {
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
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

  it('opens the exact document requested by the deep-link query', async () => {
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [{ ...signedDocumentItem, documentId: 'different-document' }],
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

    renderScreen('/contracts/esign?document=doc-1');

    await waitFor(() => {
      expect(esignGetAPI.getDocumentById).toHaveBeenCalledWith('doc-1');
    });
    expect(esignGetAPI.getDocumentById).not.toHaveBeenCalledWith('different-document');
    expect(await screen.findByTitle('Read-only e-sign contract document')).toHaveAttribute(
      'srcdoc',
      signedDocumentDetail.renderedHtmlContent
    );
    expect(screen.getByRole('button', { name: 'Download DOCX' })).toBeInTheDocument();
  });

  it('opens a read-only preview without signing or editing controls', async () => {
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
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

  it('offers signing for a pending participant document', async () => {
    const pendingItem = {
      ...signedDocumentItem,
      documentStatus: ESignDocumentStatus.PendingSignatures,
      currentUserSignerRole: ESignerRole.Freelancer,
      currentUserSignedAt: null,
      hasFreelancerSigned: false,
      canCurrentUserSign: true,
      hasFinalArtifact: false,
      finalizedDocumentFileName: null,
    };
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [pendingItem],
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
      data: { ...signedDocumentDetail, status: ESignDocumentStatus.PendingSignatures },
    });

    renderScreen();

    expect(await screen.findByRole('link', { name: 'Sign now' })).toHaveAttribute(
      'href',
      '/contracts/contract-1/sign'
    );
    expect(screen.getByText('Client: Signed')).toBeInTheDocument();
    expect(screen.getByText('Freelancer: Pending')).toBeInTheDocument();
  });

  it('shows the waiting state after the current user has signed', async () => {
    const waitingItem = {
      ...signedDocumentItem,
      documentStatus: ESignDocumentStatus.PartiallySigned,
      hasFreelancerSigned: false,
      canCurrentUserSign: false,
      hasFinalArtifact: false,
      finalizedDocumentFileName: null,
    };
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [waitingItem],
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
      data: { ...signedDocumentDetail, status: ESignDocumentStatus.PartiallySigned },
    });

    renderScreen();

    expect(await screen.findByText('Waiting for the other party')).toBeInTheDocument();
  });

  it('uses the admin list endpoint and keeps signing read-only', async () => {
    vi.mocked(esignGetAPI.getAdminDocuments).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        items: [{ ...signedDocumentItem, currentUserSignerRole: null, canCurrentUserSign: true }],
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

    renderScreen('/admin/contracts/esign');

    await screen.findByRole('button', { name: /mobile app contract/i });
    expect(esignGetAPI.getAdminDocuments).toHaveBeenCalled();
    expect(esignGetAPI.getMyDocuments).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Sign now' })).not.toBeInTheDocument();
  });

  it('downloads the finalized DOCX through the authenticated API', async () => {
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
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
    const artifact = new Blob(['contract']);
    vi.mocked(esignGetAPI.downloadDocument).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: artifact,
    });

    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Download DOCX' }));

    expect(esignGetAPI.downloadDocument).toHaveBeenCalledWith('doc-1');
    expect(URL.createObjectURL).toHaveBeenCalledWith(artifact);
  });

  it('retries a failed authenticated DOCX download', async () => {
    vi.mocked(esignGetAPI.getMyDocuments).mockResolvedValue({
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
    vi.mocked(esignGetAPI.downloadDocument)
      .mockResolvedValueOnce({ success: false, statusCode: 409, message: 'Artifact unavailable' })
      .mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        message: 'Success',
        data: new Blob(['contract']),
      });

    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Download DOCX' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Artifact unavailable');
    await user.click(screen.getByRole('button', { name: 'Retry DOCX' }));

    expect(esignGetAPI.downloadDocument).toHaveBeenCalledTimes(2);
  });

  it('paginates and clears a document that is absent from the new result', async () => {
    vi.mocked(esignGetAPI.getMyDocuments)
      .mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        message: 'Success',
        data: {
          items: [signedDocumentItem],
          pageNumber: 1,
          totalPages: 2,
          totalCount: 21,
          hasPreviousPage: false,
          hasNextPage: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        message: 'Success',
        data: {
          items: [],
          pageNumber: 2,
          totalPages: 2,
          totalCount: 21,
          hasPreviousPage: true,
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
    await screen.findByTitle('Read-only e-sign contract document');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(esignGetAPI.getMyDocuments).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      );
      expect(screen.queryByTitle('Read-only e-sign contract document')).not.toBeInTheDocument();
    });
  });
});
