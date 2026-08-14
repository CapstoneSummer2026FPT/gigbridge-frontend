import { describe, expect, it } from 'vitest';
import { ContractWorkItemStatus, MilestoneStatus, type Milestone } from '../../../types/models/Contract';
import {
  prepareContractMilestonesForEditing,
  resolveContractMilestones,
  toUpdateContractDetailsRequest,
} from './contractMilestonePlan';

const milestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'milestone-1',
  contract_id: 'contract-1',
  title: 'Implementation',
  amount: 100,
  due_date: '2026-08-01T00:00:00Z',
  status: MilestoneStatus.Pending,
  sortOrder: 3,
  paid_at: null,
  estimatedDuration: '2 weeks',
  deliverables: 'Production-ready source code',
  acceptanceCriteria: '',
  workItems: [{
    workItemId: 'work-item-1',
    milestoneId: 'milestone-1',
    title: 'Implementation',
    description: 'Production-ready source code',
    deliverables: 'Production-ready source code',
    estimatedDuration: '2 weeks',
    orderIndex: 0,
    status: ContractWorkItemStatus.Todo,
  }],
  ...overrides,
});

describe('contractMilestonePlan', () => {
  it('produces the strict contract update payload and preserves persisted IDs', () => {
    const prepared = prepareContractMilestonesForEditing([milestone()]);
    const resolved = resolveContractMilestones(
      prepared.milestones,
      'Client approval',
      prepared.generatedWorkItemIdsByMilestoneId,
      '2026-08-15',
    );
    const request = toUpdateContractDetailsRequest(resolved);

    expect(request).toEqual({
      milestones: [{
        milestoneId: 'milestone-1',
        title: 'Implementation',
        description: null,
        amount: 100,
        dueDate: '2026-08-29',
        sortOrder: 0,
        estimatedDuration: '2 weeks',
        deliverables: 'Production-ready source code',
        acceptanceCriteria: 'Client approval',
        workItems: [{
          workItemId: 'work-item-1',
          title: 'Implementation',
          description: 'Production-ready source code',
          deliverables: 'Production-ready source code',
          estimatedDuration: '2 weeks',
          orderIndex: 0,
        }],
      }],
    });
    expect(request.milestones[0]).not.toHaveProperty('orderIndex');
    expect(request).not.toHaveProperty('submitToFreelancer');
  });

  it('sorts milestones and custom work items by their persisted order', () => {
    const later = milestone({ id: 'milestone-later', sortOrder: 2 });
    const earlier = milestone({
      id: 'milestone-earlier',
      sortOrder: 0,
      workItems: [
        {
          workItemId: 'work-item-second',
          milestoneId: 'milestone-earlier',
          title: 'Second',
          description: 'Second task',
          orderIndex: 2,
          status: ContractWorkItemStatus.Todo,
        },
        {
          workItemId: 'work-item-first',
          milestoneId: 'milestone-earlier',
          title: 'First',
          description: 'First task',
          orderIndex: 0,
          status: ContractWorkItemStatus.Todo,
        },
      ],
    });

    const prepared = prepareContractMilestonesForEditing([later, earlier]);

    expect(prepared.milestones.map(item => item.id)).toEqual(['milestone-earlier', 'milestone-later']);
    expect(prepared.milestones[0].workItems.map(item => item.id)).toEqual([
      'work-item-first',
      'work-item-second',
    ]);
    expect(prepared.advancedIndexes).toContain(0);
  });
});
