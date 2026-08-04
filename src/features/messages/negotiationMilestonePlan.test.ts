import { describe, expect, it } from 'vitest';
import type { NegotiationMilestoneDto } from '../../types/models/Message';
import {
  calculateNegotiationBudget,
  calculateNegotiationDuration,
  prepareNegotiationMilestonesForEditing,
  resolveNegotiationMilestones,
  validateNegotiationMilestones,
} from './negotiationMilestonePlan';

const milestone = (
  orderIndex: number,
  dueDate: string,
  overrides: Partial<NegotiationMilestoneDto> = {},
): NegotiationMilestoneDto => ({
  title: `Milestone ${orderIndex + 1}`,
  description: '',
  amount: 100,
  estimatedDuration: '',
  dueDate,
  deliverables: `Deliverable ${orderIndex + 1}`,
  acceptanceCriteria: '',
  orderIndex,
  workItems: [],
  ...overrides,
});

describe('negotiation milestone plan', () => {
  it('derives duration, acceptance criteria, and one compatible work item per milestone', () => {
    const resolved = resolveNegotiationMilestones([
      milestone(0, '2026-08-14'),
      milestone(1, '2026-09-04'),
    ], 'Default acceptance', '2026-07-31');

    expect(resolved.map(item => item.estimatedDuration)).toEqual(['2 weeks', '3 weeks']);
    expect(calculateNegotiationBudget(resolved)).toBe(200);
    expect(calculateNegotiationDuration(resolved)).toBe('5 weeks');
    expect(resolved[0]).toMatchObject({
      acceptanceCriteria: 'Default acceptance',
      workItems: [{
        title: 'Milestone 1',
        description: 'Deliverable 1',
        deliverables: 'Deliverable 1',
        estimatedDuration: '2 weeks',
        orderIndex: 0,
      }],
    });
  });

  it('hides generated work items but preserves custom WBS as advanced data', () => {
    const generatedMilestone = milestone(0, '2026-08-14', {
      estimatedDuration: '2 weeks',
      workItems: [{
        title: 'Milestone 1',
        description: 'Deliverable 1',
        deliverables: 'Deliverable 1',
        estimatedDuration: '2 weeks',
        orderIndex: 0,
      }],
    });
    const customMilestone = milestone(1, '2026-09-04', {
      workItems: [{
        title: 'Custom task',
        description: 'Custom description',
        deliverables: 'Custom output',
        estimatedDuration: '1 week',
        orderIndex: 0,
      }],
    });

    const prepared = prepareNegotiationMilestonesForEditing([generatedMilestone, customMilestone]);

    expect(prepared.milestones[0].workItems).toEqual([]);
    expect(prepared.milestones[1].workItems[0].title).toBe('Custom task');
    expect(prepared.advancedIndexes).toEqual([1]);
  });

  it('validates only visible milestone fields and custom WBS requirements', () => {
    const result = validateNegotiationMilestones([
      milestone(0, '2026-07-30', {
        title: '',
        deliverables: '',
        workItems: [{ title: '', description: '', orderIndex: 0 }],
      }),
      milestone(1, '2026-07-30'),
    ], '2026-07-31');

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      '0.title': 'titleRequired',
      '0.dueDate': 'deadlinePast',
      '0.deliverables': 'deliverablesRequired',
      '0.workItems.0.title': 'workItemTitleRequired',
      '0.workItems.0.description': 'workItemDescriptionRequired',
      '1.dueDate': 'deadlineSequence',
    });
    expect(result.advancedIndexes).toEqual([0]);
  });
});
