import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import {
  ContractStatus,
  ContractWorkItemStatus,
  MilestoneStatus,
  type Milestone,
} from '../../../types/models/Contract';
import { ClientContractPlanEditor } from './ClientContractPlanEditor';

vi.mock('../../../api/contractAPI/PUT', () => ({
  contractPutAPI: { updateDetails: vi.fn() },
}));

vi.mock('../../../api/contractAPI/POST', () => ({
  contractPostAPI: { submitDetails: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'contracts.defineProjectPlan': 'Define project plan',
        'contracts.defineProjectPlanDesc': 'Edit the milestone plan.',
        'contracts.sum': 'Sum',
        'contracts.saveDraftDetails': 'Save draft',
        'contracts.submitToFreelancer': 'Submit to freelancer',
        'contracts.allocatedMilestonesSumMatch': 'Budget must match.',
        'contracts.planEditor.budgetExceeded': 'Budget exceeded.',
        'contracts.planEditor.updateFailed': 'Update failed.',
        'contracts.planEditor.submitFailed': 'Submit failed.',
        'contracts.planEditor.saved': 'Draft saved.',
        'contracts.submittedSuccess': 'Plan submitted.',
        'contracts.alerts.errorOccurred': 'Unexpected error.',
        'proposalMilestoneEditor.defaultAcceptanceCriteria': 'Client approval',
        'messages.finalOfferEditor.milestonePlan': 'Milestone plan',
        'messages.finalOfferEditor.milestoneDescription': 'Milestone description',
        'messages.finalOfferEditor.addMilestone': 'Add milestone',
        'messages.finalOfferEditor.addFirstMilestone': 'Add first milestone',
        'messages.finalOfferEditor.noMilestones': 'No milestones',
        'messages.finalOfferEditor.noMilestonesDescription': 'Add a milestone.',
        'messages.finalOfferEditor.untitledMilestone': 'Untitled milestone',
      };
      if (key.startsWith('messages.finalOfferEditor.validation.')) return key.split('.').at(-1) || key;
      return labels[key] || key.split('.').at(-1) || key;
    },
  }),
}));

const validMilestone = (amount = 100): Milestone => ({
  id: 'milestone-1',
  contract_id: 'contract-1',
  title: 'Implementation',
  amount,
  due_date: '2026-08-01',
  status: MilestoneStatus.Pending,
  sortOrder: 0,
  paid_at: null,
  estimatedDuration: '1 week',
  deliverables: 'Production-ready source code',
  acceptanceCriteria: 'Client approval',
  workItems: [{
    workItemId: 'work-item-1',
    milestoneId: 'milestone-1',
    title: 'Implementation',
    description: 'Production-ready source code',
    deliverables: 'Production-ready source code',
    estimatedDuration: '1 week',
    orderIndex: 0,
    status: ContractWorkItemStatus.Todo,
  }],
});

const successResponse = {
  success: true,
  statusCode: 200,
  message: 'Success',
  data: {
    contractId: 'contract-1',
    status: ContractStatus.PendingContractDetails,
    escrowId: null,
    esignDocumentId: null,
  },
};

const renderEditor = (milestones = [validMilestone()], contractBudget = 100) => {
  const onRefresh = vi.fn();
  render(
    <ClientContractPlanEditor
      contractId="contract-1"
      contractBudget={contractBudget}
      milestones={milestones}
      onRefresh={onRefresh}
    />,
  );
  return { onRefresh };
};

describe('ClientContractPlanEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contractPutAPI.updateDetails).mockResolvedValue(successResponse);
    vi.mocked(contractPostAPI.submitDetails).mockResolvedValue({
      ...successResponse,
      data: { ...successResponse.data, status: ContractStatus.PendingContractConfirmation },
    });
  });

  it('saves only through PUT with DateOnly, sortOrder, and persisted IDs', async () => {
    const { onRefresh } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(contractPutAPI.updateDetails).toHaveBeenCalledTimes(1));
    expect(contractPostAPI.submitDetails).not.toHaveBeenCalled();
    expect(contractPutAPI.updateDetails).toHaveBeenCalledWith('contract-1', {
      milestones: [expect.objectContaining({
        milestoneId: 'milestone-1',
        dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        sortOrder: 0,
        workItems: [expect.objectContaining({ workItemId: 'work-item-1', orderIndex: 0 })],
      })],
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Draft saved.');
  });

  it('submits only after a successful PUT', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Submit to freelancer' }));

    await waitFor(() => expect(contractPostAPI.submitDetails).toHaveBeenCalledWith('contract-1'));
    expect(vi.mocked(contractPutAPI.updateDetails).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(contractPostAPI.submitDetails).mock.invocationCallOrder[0],
    );
    expect(toast.success).toHaveBeenCalledWith('Plan submitted.');
  });

  it('does not submit when PUT fails', async () => {
    vi.mocked(contractPutAPI.updateDetails).mockResolvedValue({
      success: false,
      statusCode: 400,
      message: 'Invalid milestone plan.',
    });
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Submit to freelancer' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid milestone plan.'));
    expect(contractPostAPI.submitDetails).not.toHaveBeenCalled();
  });

  it('refreshes the saved draft when submit fails after PUT succeeds', async () => {
    vi.mocked(contractPostAPI.submitDetails).mockResolvedValue({
      success: false,
      statusCode: 400,
      message: 'Contract status changed.',
    });
    const { onRefresh } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Submit to freelancer' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Contract status changed.'));
    expect(contractPutAPI.updateDetails).toHaveBeenCalledTimes(1);
    expect(contractPostAPI.submitDetails).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('allows an underallocated draft to save but blocks submit', async () => {
    renderEditor([validMilestone(50)], 100);

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(contractPutAPI.updateDetails).toHaveBeenCalledTimes(1));
    expect(contractPostAPI.submitDetails).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Submit to freelancer' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Budget must match.'));
    expect(contractPutAPI.updateDetails).toHaveBeenCalledTimes(1);
    expect(contractPostAPI.submitDetails).not.toHaveBeenCalled();
  });

  it('shows field validation and focuses the first invalid milestone field', async () => {
    const invalid = { ...validMilestone(), title: '', workItems: [] };
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback(0);
        return 1;
      });
    renderEditor([invalid]);

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    const titleInput = document.querySelector<HTMLInputElement>('[data-milestone-field="0.title"]');
    await waitFor(() => expect(titleInput).toHaveFocus());
    expect(screen.getByText('titleRequired')).toBeInTheDocument();
    expect(contractPutAPI.updateDetails).not.toHaveBeenCalled();
    requestAnimationFrameSpy.mockRestore();
  });
});
