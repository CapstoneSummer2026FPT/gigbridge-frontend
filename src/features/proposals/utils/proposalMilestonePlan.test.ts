import { describe, expect, it } from 'vitest';
import type {
  ProposalMilestonePlanDto,
  ProposalWorkBreakdownItemDto,
} from '../../../types/models/Proposal';
import {
  deriveMilestoneDuration,
  extractCustomWorkItems,
  resolveProposalMilestonePlan,
} from './proposalMilestonePlan';

const milestone = (
  orderIndex: number,
  dueDate: string,
  overrides: Partial<ProposalMilestonePlanDto> = {},
): ProposalMilestonePlanDto => ({
  title: `Milestone ${orderIndex + 1}`,
  description: `Legacy description ${orderIndex + 1}`,
  amount: 100,
  estimatedDuration: '',
  dueDate,
  deliverables: `Deliverable ${orderIndex + 1}`,
  acceptanceCriteria: '',
  orderIndex,
  ...overrides,
});

describe('proposal milestone plan defaults', () => {
  it('derives whole weeks from the milestone interval with a one-week minimum', () => {
    expect(deriveMilestoneDuration('2026-07-08', '2026-07-22')).toBe('2 weeks');
    expect(deriveMilestoneDuration('2026-07-22', '2026-07-23')).toBe('1 week');
    expect(deriveMilestoneDuration('2026-07-22', null)).toBe('1 week');
  });

  it('uses the closing date for the first milestone and the previous deadline thereafter', () => {
    const resolved = resolveProposalMilestonePlan(
      [milestone(0, '2026-07-22'), milestone(1, '2026-08-12')],
      [],
      'Default acceptance',
      '2026-07-08T12:00:00Z',
      '2026-07-01',
    );

    expect(resolved.milestonePlans.map(item => item.estimatedDuration))
      .toEqual(['2 weeks', '3 weeks']);
    expect(resolved.milestonePlans.map(item => item.acceptanceCriteria))
      .toEqual(['Default acceptance', 'Default acceptance']);
  });

  it('generates one compatible work item in flat and nested payloads', () => {
    const resolved = resolveProposalMilestonePlan(
      [milestone(0, '2026-07-15')],
      [],
      'Default acceptance',
      null,
      '2026-07-01',
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
    const loadedMilestone = milestone(0, '2026-07-15', { estimatedDuration: '2 weeks' });
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
