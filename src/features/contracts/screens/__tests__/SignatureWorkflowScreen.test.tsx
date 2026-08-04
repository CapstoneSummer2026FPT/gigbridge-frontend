import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contractGetAPI } from '../../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../../api/contractAPI/POST';
import { esignGetAPI } from '../../../../api/esignAPI/GET';
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

vi.mock('../../../../app/providers/AppProvider', () => ({
  useApp: () => ({ user: { id: 'client-user' }, role: 1 }),
}));

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      String(values?.defaultValue ?? ({
        'contracts.proceedToSign': 'Proceed to sign',
        'contracts.signContract': 'Sign contract',
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
      success: false,
      statusCode: 404,
      message: 'Not found',
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
    const canvas = document.querySelector('canvas');

    expect(policyCheckbox).not.toBeChecked();
    expect(policyLink).toHaveAttribute('href', '/policies');
    expect(policyLink).toHaveAttribute('target', '_blank');
    expect(policyLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(canvas).not.toBeNull();

    fireEvent.mouseDown(canvas!);
    fireEvent.mouseUp(canvas!);
    expect(signButton).toBeDisabled();
    fireEvent.click(signButton);
    expect(contractPostAPI.sign).not.toHaveBeenCalled();

    fireEvent.click(policyCheckbox);
    expect(signButton).toBeEnabled();
    fireEvent.click(signButton);

    await waitFor(() => expect(contractPostAPI.sign).toHaveBeenCalledWith('contract-1', {
      signatureImageUrl: 'data:image/png;base64,c2ln',
      signatureWidth: 600,
      signatureHeight: 200,
      policyAccepted: true,
      policyVersion: '1.0-DATN',
    }));
  });
});
