import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractGetAPI } from '../../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../../api/contractAPI/POST';
import { esignGetAPI } from '../../../../api/esignAPI/GET';
import { esignPostAPI } from '../../../../api/esignAPI/POST';
import { ContractStatus } from '../../../../types/models/Contract';
import { ESignerRole, ESignDocumentStatus, SignatureStatus } from '../../../../types/models/ESign';
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
    const signButton = screen.getByRole('button', { name: /Sign contract/i });
    const identityInput = screen.getByRole('textbox', { name: /Identity number/i });
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

    fireEvent.change(identityInput, { target: { value: '001 234 567 890' } });
    fireEvent.click(policyCheckbox);
    expect(signButton).toBeEnabled();
    fireEvent.click(signButton);

    await waitFor(() => expect(contractPostAPI.sign).toHaveBeenCalledWith('contract-1', {
      signatureImageUrl: 'data:image/png;base64,c2ln',
      signatureWidth: 600,
      signatureHeight: 200,
      identityOrTaxCode: '001234567890',
      policyAccepted: true,
      policyVersion: 'Ver 1.0 Gigbridge',
    }));
  });

  it('restores a valid temporary signature and lets its owner update only the identity number', async () => {
    vi.mocked(esignGetAPI.getDocumentByContract).mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: {
        documentId: 'document-1',
        jobPostId: 'job-1',
        contractId: 'contract-1',
        templateId: 'template-1',
        documentCode: 'GB-001',
        renderedHtmlContent: '<p>Contract</p>',
        status: ESignDocumentStatus.PendingSignatures,
        currentUserSignerRole: ESignerRole.Freelancer,
        canCurrentUserSign: true,
        hasFinalArtifact: false,
        createdAt: '2026-08-12T00:00:00Z',
        signatures: [
          {
            signatureId: 'signature-1',
            documentId: 'document-1',
            userId: 'client-user',
            signerRole: ESignerRole.Freelancer,
            signatureImageUrl: 'https://cdn.test/current-signature.png',
            signatureWidth: 600,
            signatureHeight: 200,
            identityOrTaxCode: '123456789',
            isDraftValid: true,
            status: SignatureStatus.Pending,
            draftSubmittedAt: '2026-08-12T01:00:00Z',
            createdAt: '2026-08-12T01:00:00Z',
            updatedAt: '2026-08-12T01:00:00Z',
          },
        ],
      },
    });

    render(<SignatureWorkflowScreen />);

    const editButton = await screen.findByRole('button', { name: /Edit temporary signature/i });
    expect(screen.getByAltText('Saved temporary signature')).toHaveAttribute(
      'src',
      'https://cdn.test/current-signature.png'
    );

    fireEvent.click(editButton);

    const identityInput = screen.getByRole('textbox', { name: /Identity number/i });
    expect(identityInput).toHaveValue('123456789');
    expect(screen.getByAltText('Current temporary signature')).toHaveAttribute(
      'src',
      'https://cdn.test/current-signature.png'
    );

    fireEvent.change(identityInput, { target: { value: '001 234 567 890' } });
    fireEvent.click(screen.getByRole('button', { name: /Update temporary signature/i }));

    await waitFor(() => expect(contractPostAPI.sign).toHaveBeenCalledWith('contract-1', {
      identityOrTaxCode: '001234567890',
      policyAccepted: true,
      policyVersion: 'Ver 1.0 Gigbridge',
    }));
  });
});
