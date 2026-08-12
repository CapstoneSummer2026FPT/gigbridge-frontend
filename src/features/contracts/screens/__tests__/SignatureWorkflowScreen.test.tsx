import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractGetAPI } from '../../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../../api/contractAPI/POST';
import { esignGetAPI } from '../../../../api/esignAPI/GET';
import { esignPostAPI } from '../../../../api/esignAPI/POST';
import { ContractStatus } from '../../../../types/models/Contract';
import SignatureWorkflowScreen from '../SignatureWorkflowScreen';

vi.mock('../../../../api/contractAPI/GET', () => ({
  contractGetAPI: {
    getContractById: vi.fn(),
    getMilestonesByContract: vi.fn(),
  },
}));

vi.mock('../../../../api/contractAPI/POST', () => ({
  contractPostAPI: { sign: vi.fn() },
}));

vi.mock('../../../../api/esignAPI/GET', () => ({
  esignGetAPI: { getDocumentByContract: vi.fn() },
}));

vi.mock('../../../../api/esignAPI/POST', () => ({
  esignPostAPI: { previewDocumentPdf: vi.fn() },
}));

vi.mock('../../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: { id: 'client-user' }, role: 0 }),
}));

vi.mock('../../components/ContractPdfViewer', () => ({
  ContractPdfViewer: () => <div>PDF preview</div>,
}));

vi.mock('../../hooks/useContractReadyForEscrowEvent', () => ({
  useContractReadyForEscrowEvent: vi.fn(),
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      String(values?.defaultValue ?? ({
        'contracts.proceedToSign': 'Proceed to sign',
        'contracts.saveSignatureDraft': 'Save temporary signature',
        'contracts.applySignatureToPdf': 'Apply signature to PDF',
        'contracts.identityCodeLabel': 'Identity number',
        'contracts.signatureWaitingTitle': 'Signature submitted',
        'contracts.editSignatureDraft': 'Edit temporary signature',
        'contracts.signatureNeedsCompletionTitle': 'Recovered signature needs completion',
        'contracts.back': 'Back',
        'contracts.backToReview': 'Back to review',
      } as Record<string, string>)[key] ?? key),
  }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ contractId: 'contract-1' }),
}));

describe('SignatureWorkflowScreen policy acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,c2ln');

    vi.mocked(contractGetAPI.getContractById).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        contractsId: 'contract-1',
        jobPostsId: 'job-1',
        clientProfilesId: 'client-1',
        freelancerProfilesId: 'freelancer-1',
        clientUserId: 'client-user',
        freelancerUserId: 'freelancer-user',
        title: 'GigBridge contract',
        totalBudget: 1_000_000,
        status: ContractStatus.PendingSignature,
        createdAt: '2026-07-21T00:00:00Z',
      },
    } as never);
    vi.mocked(contractGetAPI.getMilestonesByContract).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: [],
    });
    vi.mocked(esignGetAPI.getDocumentByContract).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        documentId: 'document-1',
        jobPostId: 'job-1',
        contractId: 'contract-1',
        templateId: 'template-1',
        documentCode: 'GB-TEST',
        renderedHtmlContent: '<p>Contract</p>',
        status: 1,
        currentUserSignerRole: 0,
        canCurrentUserSign: true,
        hasFinalArtifact: false,
        createdAt: '2026-07-21T00:00:00Z',
        signatures: [],
      },
    });
    vi.mocked(esignPostAPI.previewDocumentPdf).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Preview',
      data: new Blob(['pdf'], { type: 'application/pdf' }),
    });
    vi.mocked(contractPostAPI.sign).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Signed',
      data: { status: ContractStatus.PendingSignature },
    });
  });

  it('blocks signing until the current policy is accepted and submits its version', async () => {
    render(<SignatureWorkflowScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Proceed to sign/i }));

    const policyLink = screen.getByRole('link', { name: /Bộ chính sách GigBridge/i });
    const policyCheckbox = screen.getByRole('checkbox', { name: /Bộ chính sách GigBridge/i });
    const canvas = document.querySelector('canvas');

    expect(policyCheckbox).not.toBeChecked();
    expect(policyLink).toHaveAttribute('href', '/policies');
    expect(policyLink).toHaveAttribute('target', '_blank');
    expect(policyLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(canvas).not.toBeNull();

    fireEvent.mouseDown(canvas!);
    fireEvent.mouseMove(canvas!, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas!);
    fireEvent.change(screen.getByRole('textbox', { name: /Identity number/i }), {
      target: { value: '012345678901' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Apply signature to PDF/i }));
    await waitFor(() => expect(esignPostAPI.previewDocumentPdf).toHaveBeenCalledWith(
      'document-1',
      'data:image/png;base64,c2ln',
      220,
      79,
      '012345678901',
    ));

    const signButton = screen.getByRole('button', { name: /Save temporary signature/i });
    expect(signButton).toBeDisabled();
    fireEvent.click(signButton);
    expect(contractPostAPI.sign).not.toHaveBeenCalled();

    fireEvent.click(policyCheckbox);
    expect(signButton).toBeEnabled();
    fireEvent.click(signButton);

    await waitFor(() => expect(contractPostAPI.sign).toHaveBeenCalledWith('contract-1', {
      signatureImageUrl: 'data:image/png;base64,c2ln',
      signatureWidth: 220,
      signatureHeight: 79,
      identityOrTaxCode: '012345678901',
      policyAccepted: true,
      policyVersion: 'Ver 1.0 Gigbridge',
    }));

    expect(await screen.findByRole('heading', { name: /Signature submitted/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit temporary signature/i })).toBeInTheDocument();
  });

  it('unlocks step three for a recovered draft and asks for missing identity data', async () => {
    vi.mocked(esignGetAPI.getDocumentByContract).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        documentId: 'document-1',
        jobPostId: 'job-1',
        contractId: 'contract-1',
        templateId: 'template-1',
        documentCode: 'GB-TEST',
        renderedHtmlContent: '<p>Contract</p>',
        status: 1,
        currentUserSignerRole: 0,
        canCurrentUserSign: true,
        hasFinalArtifact: false,
        createdAt: '2026-07-21T00:00:00Z',
        signatures: [{
          signatureId: 'signature-1',
          documentId: 'document-1',
          userId: 'client-user',
          signerRole: 0,
          signatureImageUrl: 'https://cdn.test/recovered.png',
          identityOrTaxCode: null,
          isDraftValid: false,
          status: 0,
          draftSubmittedAt: '2026-08-12T00:00:00Z',
          createdAt: '2026-08-12T00:00:00Z',
        }],
      },
    });

    render(<SignatureWorkflowScreen />);

    expect(await screen.findByRole('heading', {
      name: /Recovered signature needs completion/i,
    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit temporary signature/i })).toBeInTheDocument();
  });
});
