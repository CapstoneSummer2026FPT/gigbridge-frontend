import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NegotiationMilestoneDto } from '../../../types/models/Message';
import { FinalOfferEditor } from './FinalOfferEditor';

const copy: Record<string, string> = {
  'messages.finalOfferEditor.dialogLabel': 'Create final offer',
  'messages.finalOfferEditor.title': 'Final offer',
  'messages.finalOfferEditor.subtitle': 'Review the milestone plan.',
  'messages.finalOfferEditor.close': 'Close final offer editor',
  'messages.finalOfferEditor.scrollRegionLabel': 'Milestone editor content',
  'messages.finalOfferEditor.loading': 'Loading milestone draft...',
  'messages.finalOfferEditor.milestonePlan': 'Milestone plan',
  'messages.finalOfferEditor.milestoneDescription': 'Milestone help',
  'messages.finalOfferEditor.addMilestone': 'Add milestone',
  'messages.finalOfferEditor.finalPrice': 'Final price',
  'messages.finalOfferEditor.noMilestones': 'No milestones',
  'messages.finalOfferEditor.noMilestonesDescription': 'Add one milestone.',
  'messages.finalOfferEditor.addFirstMilestone': 'Add first milestone',
  'messages.finalOfferEditor.untitledMilestone': 'Untitled milestone',
  'messages.finalOfferEditor.moveUp': 'Move up',
  'messages.finalOfferEditor.moveDown': 'Move down',
  'messages.finalOfferEditor.deleteMilestone': 'Delete milestone',
  'messages.finalOfferEditor.milestoneTitle': 'Milestone title',
  'messages.finalOfferEditor.amount': 'Amount',
  'messages.finalOfferEditor.deadline': 'Deadline',
  'messages.finalOfferEditor.deliverables': 'Deliverables',
  'messages.finalOfferEditor.workItem': 'Work item',
  'messages.finalOfferEditor.deleteWorkItem': 'Delete work item',
  'messages.finalOfferEditor.workItemTitle': 'Work item title',
  'messages.finalOfferEditor.workItemDuration': 'Estimated duration',
  'messages.finalOfferEditor.workItemDescription': 'Description',
  'messages.finalOfferEditor.workItemDeliverables': 'Work item deliverables',
  'messages.finalOfferEditor.milestoneTitlePlaceholder': 'Milestone title placeholder',
  'messages.finalOfferEditor.amountPlaceholder': 'Amount placeholder',
  'messages.finalOfferEditor.deliverablesPlaceholder': 'Deliverables placeholder',
  'messages.finalOfferEditor.acceptancePlaceholder': 'Acceptance placeholder',
  'messages.finalOfferEditor.workItemTitlePlaceholder': 'Work item title placeholder',
  'messages.finalOfferEditor.workItemDurationPlaceholder': 'Work item duration placeholder',
  'messages.finalOfferEditor.workItemDescriptionPlaceholder': 'Work item description placeholder',
  'messages.finalOfferEditor.workItemDeliverablesPlaceholder': 'Work item deliverables placeholder',
  'messages.finalOfferEditor.overallDuration': 'Overall duration',
  'messages.finalOfferEditor.incomplete': 'Incomplete',
  'messages.finalOfferEditor.saving': 'Saving...',
  'messages.finalOfferEditor.saveDraft': 'Save milestone draft',
  'messages.finalOfferEditor.note': 'Generated fields note',
  'proposalMilestoneEditor.advancedDetails': 'Advanced details',
  'proposalMilestoneEditor.derivedDuration': 'Duration',
  'proposalMilestoneEditor.acceptanceCriteria': 'Acceptance criteria',
  'proposalMilestoneEditor.workBreakdown': 'Work Breakdown Structure',
  'proposalMilestoneEditor.addWorkItem': 'Add work item',
  'messages.cancel': 'Cancel',
  'messages.send': 'Send',
};

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => copy[key] || key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

const milestone: NegotiationMilestoneDto = {
  id: 'milestone-1',
  title: 'Product foundation',
  description: 'Hidden legacy description',
  amount: 120,
  estimatedDuration: '2 weeks',
  dueDate: '2026-08-14',
  deliverables: 'Responsive client dashboard',
  acceptanceCriteria: '',
  orderIndex: 0,
  workItems: [],
};

const renderEditor = (overrides: Partial<React.ComponentProps<typeof FinalOfferEditor>> = {}) => {
  const props: React.ComponentProps<typeof FinalOfferEditor> = {
    milestones: [milestone],
    milestoneTotal: 120,
    overallDuration: '2 weeks',
    advancedIndexes: [],
    errors: {},
    loading: false,
    saving: false,
    onMilestonesChange: vi.fn(),
    onAdvancedIndexesChange: vi.fn(),
    onSaveDraft: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<FinalOfferEditor {...props} />), props };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FinalOfferEditor', () => {
  it('shows only the four milestone inputs and calculated summaries by default', () => {
    renderEditor();

    expect(screen.getByRole('dialog', { name: 'Create final offer' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Milestone editor content' }))
      .toHaveClass('min-h-0', 'flex-1', 'overflow-y-scroll', 'overscroll-contain');
    expect(screen.getByLabelText('Milestone title')).toHaveValue('Product foundation');
    expect(screen.getByLabelText('Amount')).toHaveValue(120);
    expect(screen.getByLabelText('Deadline')).toHaveValue('2026-08-14');
    expect(screen.getByLabelText('Deliverables')).toHaveValue('Responsive client dashboard');
    expect(screen.queryByDisplayValue('Hidden legacy description')).not.toBeInTheDocument();
    expect(screen.queryByText('Acceptance criteria')).not.toBeInTheDocument();
    expect(screen.queryByText('Work Breakdown Structure')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Final price')).toHaveTextContent('120');
    expect(screen.getByLabelText('Overall duration')).toHaveTextContent('2 weeks');
  });

  it('opens advanced acceptance criteria and preserves custom work items', () => {
    const onMilestonesChange = vi.fn();
    renderEditor({
      milestones: [{
        ...milestone,
        acceptanceCriteria: 'Client approves the dashboard.',
        workItems: [{
          id: 'work-1',
          title: 'Dashboard shell',
          description: 'Build the authenticated layout.',
          deliverables: 'Dashboard shell',
          estimatedDuration: '1 week',
          orderIndex: 0,
        }],
      }],
      advancedIndexes: [0],
      onMilestonesChange,
    });

    expect(screen.getByText('Acceptance criteria')).toBeInTheDocument();
    expect(screen.getByText('Work Breakdown Structure')).toBeInTheDocument();
    expect(screen.getByLabelText('Work item 1: Work item title')).toHaveValue('Dashboard shell');

    fireEvent.change(screen.getByLabelText('Work item 1: Description'), {
      target: { value: 'Updated work item' },
    });
    expect(onMilestonesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        workItems: [expect.objectContaining({ description: 'Updated work item' })],
      }),
    ]);
  });

  it('keeps previously opened milestones visible when another milestone is expanded', () => {
    renderEditor({
      milestones: [
        milestone,
        {
          ...milestone,
          id: 'milestone-2',
          title: 'Production release',
          amount: 80,
          dueDate: '2026-08-28',
          deliverables: 'Production deployment',
          orderIndex: 1,
        },
      ],
      milestoneTotal: 200,
      overallDuration: '4 weeks',
    });

    expect(screen.getByLabelText('Milestone title')).toHaveValue('Product foundation');
    fireEvent.click(screen.getByRole('button', { name: /Production release/ }));

    expect(screen.getByDisplayValue('Product foundation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Production release')).toBeInTheDocument();
  });

  it('forwards save and submit actions and renders field errors', () => {
    const onSaveDraft = vi.fn();
    const onSubmit = vi.fn();
    renderEditor({
      errors: { '0.dueDate': 'Deadline must be later.' },
      onSaveDraft,
      onSubmit,
    });

    expect(screen.getByText('Deadline must be later.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save milestone draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSaveDraft).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
