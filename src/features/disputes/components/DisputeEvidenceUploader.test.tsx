import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disputePostAPI } from '../../../api/disputeAPI';
import { DisputeEvidenceUploader } from './DisputeEvidenceUploader';

vi.mock('../../../api/disputeAPI', () => ({
  disputePostAPI: { addEvidence: vi.fn() },
}));

describe('DisputeEvidenceUploader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns newly persisted evidence immediately after upload', async () => {
    const evidence = [{
      id: 'evidence-1', uploadedById: 'client-1', fileName: 'invoice.pdf',
      fileSize: 4, description: null, createdAt: '2026-07-18T00:00:00.000Z',
    }];
    vi.mocked(disputePostAPI.addEvidence).mockResolvedValue({
      success: true, data: evidence, message: '', statusCode: 201,
    });
    const onUploaded = vi.fn();
    const { container } = render(
      <DisputeEvidenceUploader
        contractId="contract-1"
        disputeId="dispute-1"
        disabled={false}
        onUploaded={onUploaded}
      />,
    );

    const file = new File(['test'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByText('Upload evidence'));

    await waitFor(() => expect(disputePostAPI.addEvidence).toHaveBeenCalledWith('contract-1', 'dispute-1', [file]));
    expect(onUploaded).toHaveBeenCalledWith(evidence);
  });

  it('locks uploads when the dispute is no longer active', () => {
    render(
      <DisputeEvidenceUploader
        contractId="contract-1"
        disputeId="dispute-1"
        disabled
        onUploaded={vi.fn()}
      />,
    );
    expect(screen.getByText(/Evidence can only be added/)).toBeInTheDocument();
    expect(screen.queryByText('Upload evidence')).not.toBeInTheDocument();
  });
});
