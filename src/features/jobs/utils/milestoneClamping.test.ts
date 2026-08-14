import { describe, it, expect } from 'vitest';
import { clampMilestonesToExpectedTargets } from './milestoneClamping';
import type { JobPostMilestonePlanDto } from '../../../types/models/Job';

describe('clampMilestonesToExpectedTargets', () => {
  it('clamps milestone amounts to sum to expected budget 28000 GC', () => {
    const rawMilestones: JobPostMilestonePlanDto[] = [
      { orderIndex: 0, title: 'Discovery', amount: 5517.24, estimatedDuration: '2 weeks', deliverables: 'Doc', acceptanceCriteria: 'OK', workItems: [] },
      { orderIndex: 1, title: 'Design', amount: 7482.76, estimatedDuration: '2 weeks', deliverables: 'Figma', acceptanceCriteria: 'OK', workItems: [] },
      { orderIndex: 2, title: 'Dev', amount: 8000.0, estimatedDuration: '2 weeks', deliverables: 'Code', acceptanceCriteria: 'OK', workItems: [] },
      { orderIndex: 3, title: 'QA', amount: 11000.0, estimatedDuration: '1 week', deliverables: 'App', acceptanceCriteria: 'OK', workItems: [] },
    ];

    const clamped = clampMilestonesToExpectedTargets(rawMilestones, 28000.0, 5);

    const totalAmount = clamped.reduce((sum, m) => sum + m.amount, 0);
    expect(Math.abs(totalAmount - 28000.0)).toBeLessThan(0.01);
  });

  it('clamps milestone durations to sum to 5 weeks', () => {
    const rawMilestones: JobPostMilestonePlanDto[] = [
      { orderIndex: 0, title: 'Discovery', amount: 7000, estimatedDuration: '2 weeks', deliverables: 'Doc', acceptanceCriteria: 'OK', workItems: [] },
      { orderIndex: 1, title: 'Design', amount: 7000, estimatedDuration: '2 weeks', deliverables: 'Figma', acceptanceCriteria: 'OK', workItems: [] },
      { orderIndex: 2, title: 'Dev', amount: 7000, estimatedDuration: '2 weeks', deliverables: 'Code', acceptanceCriteria: 'OK', workItems: [] },
      { orderIndex: 3, title: 'QA', amount: 7000, estimatedDuration: '1 week', deliverables: 'App', acceptanceCriteria: 'OK', workItems: [] },
    ];

    const clamped = clampMilestonesToExpectedTargets(rawMilestones, 28000.0, 5);

    const weekValues = clamped.map(m => Number(m.estimatedDuration?.split(' ')[0]));
    const totalWeeks = weekValues.reduce((sum, w) => sum + w, 0);
    expect(totalWeeks).toBe(5);
  });
});
