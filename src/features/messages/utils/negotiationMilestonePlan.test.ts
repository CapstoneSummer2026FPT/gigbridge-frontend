import { describe, expect, it } from 'vitest';
import type { NegotiationMilestoneDto } from '../../../types/models/Message';
import {
  prepareNegotiationMilestonesForEditing,
  resolveNegotiationMilestones,
  validateNegotiationMilestones,
} from './negotiationMilestonePlan';

const plan: NegotiationMilestoneDto = {
  id: 'negotiation-milestone-1',
  title: 'Prototype',
  amount: 250,
  estimatedDuration: '1 week',
  deliverables: 'Working prototype',
  acceptanceCriteria: '',
  orderIndex: 0,
  workItems: [{
    id: 'negotiation-work-item-1',
    title: 'Prototype',
    description: 'Working prototype',
    deliverables: 'Working prototype',
    estimatedDuration: '1 week',
    orderIndex: 0,
  }],
};

describe('negotiationMilestonePlan shared workflow regression', () => {
  it('retains the existing generated-item and deadline behavior', () => {
    const prepared = prepareNegotiationMilestonesForEditing([plan]);
    const resolved = resolveNegotiationMilestones(
      prepared.milestones,
      'Client approval',
      '2026-08-15',
    );

    expect(prepared.milestones[0].workItems).toEqual([]);
    expect(validateNegotiationMilestones(prepared.milestones).valid).toBe(true);
    expect(resolved[0]).toMatchObject({
      dueDate: '2026-08-22',
      acceptanceCriteria: 'Client approval',
      orderIndex: 0,
    });
    expect(resolved[0].workItems[0]).toMatchObject({
      title: 'Prototype',
      description: 'Working prototype',
      orderIndex: 0,
    });
  });
});
