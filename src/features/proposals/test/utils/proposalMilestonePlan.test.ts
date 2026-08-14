import { describe, expect, it } from 'vitest';
import type {
  ProposalMilestonePlanDto,
  ProposalWorkBreakdownItemDto,
} from '../../../../types/models/Proposal';
import {
  extractCustomWorkItems,
  resolveProposalMilestonePlan,
} from '../../utils/proposalMilestonePlan';

const milestone = (
  orderIndex: number,
  estimatedDuration: string,
  overrides: Partial<ProposalMilestonePlanDto> = {},
): ProposalMilestonePlanDto => ({
  title: `Milestone ${orderIndex + 1}`,
  description: `Legacy description ${orderIndex + 1}`,
  amount: 100,
  estimatedDuration,
  dueDate: null,
  deliverables: `Deliverable ${orderIndex + 1}`,
  acceptanceCriteria: '',
  orderIndex,
  ...overrides,
});

describe('proposal milestone plan defaults', () => {
  it('computes each deadline from the closing date, then chains off the previous deadline', () => {
    const resolved = resolveProposalMilestonePlan(
      [milestone(0, '2 weeks'), milestone(1, '3 weeks')],
      [],
      'Default acceptance',
      '2026-07-08T12:00:00Z',
    );

    // Closing date 2026-07-08 -> Milestone 1 starts 07-09, +2 weeks (day-1-counts) -> 07-22.
    // Milestone 2 starts the day after (07-23), +3 weeks (day-1-counts) -> 08-12.
    expect(resolved.milestonePlans.map(item => item.dueDate))
      .toEqual(['2026-07-22', '2026-08-12']);
    expect(resolved.milestonePlans.map(item => item.acceptanceCriteria))
      .toEqual(['Default acceptance', 'Default acceptance']);
  });

  it('leaves deadlines null when the closing date is missing', () => {
    const resolved = resolveProposalMilestonePlan(
      [milestone(0, '2 weeks')],
      [],
      'Default acceptance',
      null,
    );

    expect(resolved.milestonePlans.map(item => item.dueDate)).toEqual([null]);
  });

  it('generates one compatible work item in flat and nested payloads', () => {
    const resolved = resolveProposalMilestonePlan(
      [milestone(0, '2 weeks')],
      [],
      'Default acceptance',
      '2026-07-01T00:00:00Z',
    );

    const expected = expect.objectContaining({
      title: 'Milestone 1',
      description: 'Deliverable 1',
      deliverables: 'Deliverable 1',
      estimatedDuration: '2 weeks',
      milestoneOrderIndex: 0,
      orderIndex: 0,
    });
    expect(resolved.workBreakdownItems).toEqual([expected]);
    expect(resolved.milestonePlans[0].workItems).toEqual([expected]);
  });

  it('preserves custom WBS but recognizes a legacy generated item', () => {
    const loadedMilestone = milestone(0, '2 weeks');
    const generatedItem: ProposalWorkBreakdownItemDto = {
      title: loadedMilestone.title,
      description: loadedMilestone.deliverables,
      deliverables: loadedMilestone.deliverables,
      estimatedDuration: loadedMilestone.estimatedDuration,
      milestoneOrderIndex: 0,
      orderIndex: 0,
    };
    const customItem = {
      ...generatedItem,
      title: 'Custom discovery task',
      description: 'Run stakeholder interviews',
    };

    expect(extractCustomWorkItems([loadedMilestone], [generatedItem])).toEqual({
      customWorkItems: [],
      customMilestoneIndexes: [],
    });
    expect(extractCustomWorkItems([loadedMilestone], [customItem])).toEqual({
      customWorkItems: [expect.objectContaining(customItem)],
      customMilestoneIndexes: [0],
    });
  });
});
