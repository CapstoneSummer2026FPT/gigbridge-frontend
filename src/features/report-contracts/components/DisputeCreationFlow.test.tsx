import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DisputeUrgency } from '../../../types/models/Dispute';
import {
  ContractReportIssueType,
  ContractReportResolutionAction,
  ContractReportStatus,
  type ReportContract,
} from '../../../types/models/ReportContract';
import { ReportDetailModal } from './ReportDetailModal';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const report: ReportContract = {
  id: 'report-1',
  contractId: 'contract-1',
  reporter: { id: 'client-1', name: 'Client Reporter', role: 'Client' },
  respondent: { id: 'freelancer-1', name: 'Freelancer Respondent', role: 'Freelancer' },
  milestone: { id: 'milestone-1', title: 'Design delivery' },
  issueType: ContractReportIssueType.PaymentIssue,
  description: 'The payment issue from the report.',
  desiredResolution: 'Release the milestone payment.',
  status: ContractReportStatus.WaitingReporterConfirmation,
  resolutionAction: ContractReportResolutionAction.ProposeResolution,
  explanation: null,
  proposedResolution: 'Wait another month.',
  rejectReason: null,
  resolvedBy: null,
  createdAt: '2026-07-18T00:00:00.000Z',
  respondedAt: '2026-07-18T01:00:00.000Z',
  resolvedAt: null,
  isEscalatedToDispute: false,
  attachments: [{
    reportContractAttachmentId: 'attachment-1',
    fileUrl: 'https://files.example/invoice.pdf',
    fileName: 'invoice.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    uploadedAt: '2026-07-18T00:00:00.000Z',
    uploadedByUserId: 'client-1',
  }],
};

const renderFlow = (onEscalate = vi.fn()) => render(
  <ReportDetailModal
    report={report}
    contractTitle="Website contract"
    currentUserId="client-1"
    isOpen
    onClose={vi.fn()}
    onRespond={vi.fn()}
    onConfirm={vi.fn().mockResolvedValue({ success: true })}
    onEscalate={onEscalate}
    onDisputeCreated={vi.fn()}
    isResponding={false}
    isConfirming={false}
    isEscalating={false}
  />,
);

describe('report dispute creation flow', () => {
  it('opens the form without creating a dispute when Create Dispute is chosen', async () => {
    const onEscalate = vi.fn();
    renderFlow(onEscalate);

    fireEvent.click(screen.getByText('workspace.reportDeclineResolution'));
    await screen.findByText('workspace.disputeEscalationTitle');
    fireEvent.click(screen.getByText('workspace.createDispute'));

    expect(await screen.findByText('workspace.disputeCreationTitle')).toBeInTheDocument();
    expect(screen.getByDisplayValue('The payment issue from the report.')).toBeInTheDocument();
    expect(screen.getAllByText('invoice.pdf')).toHaveLength(2);
    expect(onEscalate).not.toHaveBeenCalled();
  });

  it('submits the completed prefilled form once validation succeeds', async () => {
    const onEscalate = vi.fn().mockResolvedValue({ success: true, disputeId: 'dispute-1' });
    renderFlow(onEscalate);

    fireEvent.click(screen.getByText('workspace.reportDeclineResolution'));
    await screen.findByText('workspace.disputeEscalationTitle');
    fireEvent.click(screen.getByText('workspace.createDispute'));
    await screen.findByText('workspace.disputeCreationTitle');

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '250' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(DisputeUrgency.High) } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('workspace.submitDispute'));

    await waitFor(() => expect(onEscalate).toHaveBeenCalledTimes(1));
    expect(onEscalate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'workspace.disputeTitlePrefix: Website contract',
      description: report.description,
      claimedAmount: 250,
      requestedResolution: report.desiredResolution,
      urgency: DisputeUrgency.High,
      declarationAccepted: true,
    }));
  });
});
