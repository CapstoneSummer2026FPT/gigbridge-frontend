import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import {
  ESignerRole,
  ESignDocumentStatus,
  SignatureStatus,
  type ESignDocumentDto,
} from '../../../types/models/ESign';
import type { ContractESignDocumentState } from '../hooks/useContractESignDocument';
import { ContractLegalCard } from './ContractLegalCard';

vi.mock('../../../api/esignAPI/GET', () => ({
  esignGetAPI: {
    downloadDocument: vi.fn(),
  },
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'contracts.legal.title': 'Contract agreement & E-sign',
        'contracts.legal.commercialTermsDescription':
          'Final offer, milestones, and work items define the commercial scope.',
        'contracts.legal.esignDocument': 'Contract-specific E-sign document',
        'contracts.legal.contractDocument': 'GigBridge contract document',
        'contracts.legal.signatureProgress': `${values?.signed} of ${values?.total} signatures completed`,
        'contracts.legal.documentDescription': 'Review and sign the contract.',
        'contracts.legal.signedDocumentDescription': 'Finalized contract record.',
        'contracts.legal.readOnlyDocumentDescription': 'Read-only contract record.',
        'contracts.legal.documentNotCreated': 'E-sign document not created yet',
        'contracts.legal.documentNotCreatedDescription':
          'The document is created after project-plan confirmation.',
        'contracts.legal.loadingDocument': 'Loading the E-sign contract document...',
        'contracts.legal.loadError': 'The E-sign document could not be loaded.',
        'contracts.legal.retry': 'Retry',
        'contracts.legal.viewAndSign': 'View and sign contract',
        'contracts.legal.viewDocument': 'View E-sign document',
        'contracts.legal.viewSignedDocument': 'View signed contract',
        'contracts.legal.downloadSignedDocument': 'Download signed document',
        'contracts.legal.downloading': 'Downloading...',
        'contracts.legal.downloadFailed': 'Failed to download the finalized contract.',
        'contracts.legal.viewPlatformPolicy': 'View GigBridge platform policy',
        'contracts.legal.policyDisclaimer':
          'The platform policy does not replace this contract-specific document.',
        'contracts.legal.status.draft': 'Draft',
        'contracts.legal.status.pending': 'Awaiting signatures',
        'contracts.legal.status.partial': 'Partially signed',
        'contracts.legal.status.signed': 'Fully signed',
        'contracts.legal.status.expired': 'Expired',
        'contracts.legal.status.voided': 'Voided',
      };
      return translations[key] ?? key;
    },
  }),
}));

const baseDocument: ESignDocumentDto = {
  documentId: 'document-1',
  jobPostId: 'job-1',
  contractId: 'contract-1',
  templateId: 'template-1',
  documentCode: 'GB-CONTRACT-001',
  renderedHtmlContent: '<p>Contract</p>',
  status: ESignDocumentStatus.PendingSignatures,
  currentUserSignerRole: ESignerRole.Freelancer,
  canCurrentUserSign: true,
  hasFinalArtifact: false,
  createdAt: '2026-07-28T00:00:00.000Z',
  signatures: [
    {
      signatureId: 'signature-client',
      documentId: 'document-1',
      userId: 'client-1',
      signerRole: ESignerRole.Client,
      status: SignatureStatus.Signed,
      signedAt: '2026-07-28T01:00:00.000Z',
      createdAt: '2026-07-28T00:00:00.000Z',
    },
    {
      signatureId: 'signature-freelancer',
      documentId: 'document-1',
      userId: 'freelancer-1',
      signerRole: ESignerRole.Freelancer,
      status: SignatureStatus.Pending,
      createdAt: '2026-07-28T00:00:00.000Z',
    },
  ],
};

const makeState = (
  overrides: Partial<ContractESignDocumentState> = {}
): ContractESignDocumentState => ({
  document: null,
  isLoading: false,
  isNotFound: true,
  error: null,
  retry: vi.fn(),
  ...overrides,
});

const renderCard = (state: ContractESignDocumentState): void => {
  render(
    <MemoryRouter>
      <ContractLegalCard contractId="contract-1" documentState={state} />
    </MemoryRouter>
  );
};

describe('ContractLegalCard', () => {
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

  it('uses the platform policy only as a fallback before a contract document exists', () => {
    renderCard(makeState());

    expect(screen.getByText('E-sign document not created yet')).toBeInTheDocument();
    expect(screen.queryByText(/No scope of work defined/i)).not.toBeInTheDocument();
    const policyLink = screen.getByRole('link', { name: /View GigBridge platform policy/i });
    expect(policyLink).toHaveAttribute('href', '/policies');
    expect(policyLink).toHaveAttribute('target', '_blank');
    expect(policyLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/does not replace this contract-specific document/i)).toBeInTheDocument();
  });

  it('offers the signing workflow only when the current user can sign', () => {
    renderCard(makeState({ document: baseDocument, isNotFound: false }));

    expect(screen.getByText('Awaiting signatures')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 signatures completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View and sign contract/i })).toHaveAttribute(
      'href',
      '/contracts/contract-1/sign'
    );
  });

  it('opens a fully signed document in the archive and downloads its final artifact', async () => {
    const user = userEvent.setup();
    vi.mocked(esignGetAPI.downloadDocument).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: new Blob(['contract']),
    });
    renderCard(makeState({
      document: {
        ...baseDocument,
        status: ESignDocumentStatus.FullySigned,
        canCurrentUserSign: false,
        hasFinalArtifact: true,
        finalizedDocumentFileName: 'signed-contract.docx',
      },
      isNotFound: false,
    }));

    expect(screen.getByRole('link', { name: /View signed contract/i })).toHaveAttribute(
      'href',
      '/contracts/esign?document=document-1'
    );

    await user.click(screen.getByRole('button', { name: /Download signed document/i }));
    await waitFor(() => {
      expect(esignGetAPI.downloadDocument).toHaveBeenCalledWith('document-1');
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:contract');
  });

  it('keeps expired documents read-only', () => {
    renderCard(makeState({
      document: {
        ...baseDocument,
        status: ESignDocumentStatus.Expired,
        canCurrentUserSign: false,
      },
      isNotFound: false,
    }));

    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View and sign contract/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View E-sign document/i })).toHaveAttribute(
      'href',
      '/contracts/esign?document=document-1'
    );
  });

  it('keeps contract details usable and provides retry after an API error', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    renderCard(makeState({
      isNotFound: false,
      error: 'Service unavailable',
      retry,
    }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The E-sign document could not be loaded.'
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /platform policy/i })).toBeInTheDocument();
  });
});
