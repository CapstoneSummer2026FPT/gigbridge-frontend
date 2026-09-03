import { describe, expect, it } from 'vitest';
import type { Milestone } from '../../../types/models/Contract';
import {
  prepareContractMilestonesForEditing,
  resolveContractMilestones,
  toUpdateContractDetailsRequest,
} from './contractMilestonePlan';

const DEFAULT_ACCEPTANCE = 'Deliverables accepted by the client.';

const clean = (value?: string | null): string | null => (value?.trim() ? value.trim() : null);

/**
 * Mirrors UpdateContractDetailsCommandHandler: it trims, nulls out blanks and stores whatever the
 * client sent, so a milestone with no hand-authored breakdown comes back carrying the single work
 * item the editor synthesised on save.
 */
const saveAndReload = (
  milestones: Parameters<typeof toUpdateContractDetailsRequest>[0],
): Milestone[] =>
  toUpdateContractDetailsRequest(milestones).milestones.map((milestone, index) => ({
    id: milestone.milestoneId || `milestone-${index}`,
    contract_id: 'contract-1',
    title: milestone.title,
    amount: milestone.amount,
    due_date: milestone.dueDate ?? '',
    status: 0,
    sortOrder: milestone.sortOrder,
    startedAt: null,
    submittedAt: null,
    approvedAt: null,
    paid_at: null,
    releasedAmount: 0,
    lastReleasedAt: null,
    description: clean(milestone.description),
    estimatedDuration: clean(milestone.estimatedDuration),
    deliverables: clean(milestone.deliverables),
    acceptanceCriteria: clean(milestone.acceptanceCriteria),
    submissionDescription: null,
    workItems: milestone.workItems.map((workItem, workIndex) => ({
      workItemId: workItem.workItemId || `work-item-${index}-${workIndex}`,
      milestoneId: milestone.milestoneId || `milestone-${index}`,
      title: workItem.title.trim(),
      description: clean(workItem.description),
      deliverables: clean(workItem.deliverables),
      estimatedDuration: clean(workItem.estimatedDuration),
      dueDate: null,
      orderIndex: workIndex,
      status: 0,
      progressNote: null,
      completedAt: null,
      updatedAt: null,
      submissions: [],
    })),
    deliveryMode: 1,
  })) as unknown as Milestone[];

describe('prepareContractMilestonesForEditing', () => {
  it('reopens a hand-authored work breakdown with every field intact', () => {
    const saved = saveAndReload(resolveContractMilestones([{
      id: 'milestone-1',
      title: 'Design',
      amount: 100,
      estimatedDuration: '5 days',
      deliverables: 'Figma file',
      acceptanceCriteria: 'Approved by the client',
      orderIndex: 0,
      workItems: [
        { id: 'w1', title: 'Wireframes', description: 'Low fidelity flows', deliverables: null, estimatedDuration: '2 days', orderIndex: 0 },
        { id: 'w2', title: 'Hi-fi mockups', description: 'Final visuals', deliverables: null, estimatedDuration: '3 days', orderIndex: 1 },
      ],
    }], DEFAULT_ACCEPTANCE, {}));

    const reopened = prepareContractMilestonesForEditing(saved);

    expect(reopened.milestones[0].workItems).toEqual([
      expect.objectContaining({ id: 'w1', title: 'Wireframes', description: 'Low fidelity flows', estimatedDuration: '2 days' }),
      expect.objectContaining({ id: 'w2', title: 'Hi-fi mockups', description: 'Final visuals', estimatedDuration: '3 days' }),
    ]);
    expect(reopened.advancedIndexes).toEqual([0]);
  });

  // A contract bounced back for rework used to reopen with an empty Work Breakdown whenever the
  // client had not hand-authored one, even though the contract stored a work item per milestone
  // and the freelancer was reviewing it.
  it('reopens the stored work item for a milestone the client never broke down', () => {
    const saved = saveAndReload(resolveContractMilestones([{
      id: 'milestone-1',
      title: 'Design',
      amount: 100,
      estimatedDuration: '5 days',
      deliverables: 'Figma file',
      acceptanceCriteria: '',
      orderIndex: 0,
      workItems: [],
    }], DEFAULT_ACCEPTANCE, {}));

    expect(saved[0].workItems).toHaveLength(1);

    const reopened = prepareContractMilestonesForEditing(saved);

    expect(reopened.milestones[0].workItems).toEqual([
      expect.objectContaining({
        id: 'work-item-0-0',
        title: 'Design',
        description: 'Figma file',
        estimatedDuration: '5 days',
      }),
    ]);
    expect(reopened.advancedIndexes).toEqual([0]);
  });

  it('keeps the work item stable across a second save, without duplicating it', () => {
    const first = saveAndReload(resolveContractMilestones([{
      id: 'milestone-1',
      title: 'Design',
      amount: 100,
      estimatedDuration: '5 days',
      deliverables: 'Figma file',
      acceptanceCriteria: '',
      orderIndex: 0,
      workItems: [],
    }], DEFAULT_ACCEPTANCE, {}));

    const reopened = prepareContractMilestonesForEditing(first);
    const second = saveAndReload(resolveContractMilestones(
      reopened.milestones,
      DEFAULT_ACCEPTANCE,
      reopened.generatedWorkItemIdsByMilestoneId,
    ));

    expect(second[0].workItems).toHaveLength(1);
    expect(second[0].workItems[0].workItemId).toBe('work-item-0-0');
    expect(prepareContractMilestonesForEditing(second).milestones[0].workItems).toHaveLength(1);
  });

  it('orders milestones by sortOrder and work items by orderIndex', () => {
    const saved = [
      {
        id: 'm2', contract_id: 'c1', title: 'Second', amount: 50, due_date: '', status: 0, sortOrder: 1,
        startedAt: null, submittedAt: null, approvedAt: null, paid_at: null, releasedAmount: 0,
        lastReleasedAt: null, description: null, estimatedDuration: '1 day', deliverables: 'B',
        acceptanceCriteria: null, submissionDescription: null, deliveryMode: 1,
        workItems: [
          { workItemId: 'b2', milestoneId: 'm2', title: 'Later', description: 'x', deliverables: null, estimatedDuration: '1 day', dueDate: null, orderIndex: 1, status: 0, progressNote: null, completedAt: null, updatedAt: null, submissions: [] },
          { workItemId: 'b1', milestoneId: 'm2', title: 'Earlier', description: 'y', deliverables: null, estimatedDuration: '1 day', dueDate: null, orderIndex: 0, status: 0, progressNote: null, completedAt: null, updatedAt: null, submissions: [] },
        ],
      },
      {
        id: 'm1', contract_id: 'c1', title: 'First', amount: 50, due_date: '', status: 0, sortOrder: 0,
        startedAt: null, submittedAt: null, approvedAt: null, paid_at: null, releasedAmount: 0,
        lastReleasedAt: null, description: null, estimatedDuration: '1 day', deliverables: 'A',
        acceptanceCriteria: null, submissionDescription: null, deliveryMode: 1, workItems: [],
      },
    ] as unknown as Milestone[];

    const reopened = prepareContractMilestonesForEditing(saved);

    expect(reopened.milestones.map(milestone => milestone.title)).toEqual(['First', 'Second']);
    expect(reopened.milestones[1].workItems.map(item => item.title)).toEqual(['Earlier', 'Later']);
  });
});
