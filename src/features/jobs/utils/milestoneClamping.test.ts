import { describe, it, expect } from 'vitest';
import { clampMilestonesToExpectedTargets, resolveCanonicalBudget, recalculateMilestonesBidirectional, resetAndEqualizeMilestones } from './milestoneClamping';
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

describe('resolveCanonicalBudget', () => {
  it('calculates average and rounds to integer for range 10,000 - 20,000 GC', () => {
    expect(resolveCanonicalBudget(10000, 20000)).toBe('15000');
  });

  it('rounds floating point averages cleanly (e.g. 15000 and 28999.66 -> 22000)', () => {
    expect(resolveCanonicalBudget(15000, 28999.66)).toBe('22000');
  });

  it('handles single budget min or max', () => {
    expect(resolveCanonicalBudget(28000, null)).toBe('28000');
    expect(resolveCanonicalBudget(null, 15000)).toBe('15000');
  });
});

describe('recalculateMilestonesBidirectional', () => {
  const targetBudget = 4000;
  const initialMilestones = [
    { title: 'M1', amount: 1000 },
    { title: 'M2', amount: 1000 },
    { title: 'M3', amount: 1000 },
    { title: 'M4', amount: 1000 },
  ];

  it('executes complex multi-directional 5-step scenario accurately', () => {
    // Step 1: User edits M2 (index 1) -> 1500
    const step1 = recalculateMilestonesBidirectional(initialMilestones, 1, 1500, targetBudget, []);
    expect(step1.updatedLockedIndices).toEqual([1]);
    expect(step1.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([833, 1500, 833, 834]);
    expect(step1.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(4000);

    // Step 2: User edits M4 (index 3) -> 1200 (Locked: [1, 3])
    const step2 = recalculateMilestonesBidirectional(step1.updatedMilestones, 3, 1200, targetBudget, step1.updatedLockedIndices);
    expect(step2.updatedLockedIndices.sort()).toEqual([1, 3]);
    expect(step2.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([650, 1500, 650, 1200]);
    expect(step2.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(4000);

    // Step 3: User edits M3 (index 2) -> 1000 (Locked: [1, 2, 3])
    const step3 = recalculateMilestonesBidirectional(step2.updatedMilestones, 2, 1000, targetBudget, step2.updatedLockedIndices);
    expect(step3.updatedLockedIndices.sort()).toEqual([1, 2, 3]);
    expect(step3.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([300, 1500, 1000, 1200]);
    expect(step3.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(4000);

    // Step 4: User unlocks M2 (remove index 1 from locked set: remaining locked [2, 3])
    const unlockedLockedIndices = step3.updatedLockedIndices.filter((idx: number) => idx !== 1);
    // Recalculate remaining pool across unlocked [0, 1]
    const step4 = recalculateMilestonesBidirectional(step3.updatedMilestones, 0, step3.updatedMilestones[0].amount, targetBudget, unlockedLockedIndices);
    expect(step4.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([300, 1500, 1000, 1200]);

    // Step 5: Edit M4 (index 3) -> 2000 with locked [2, 3]
    const step5 = recalculateMilestonesBidirectional(step4.updatedMilestones, 3, 2000, targetBudget, unlockedLockedIndices);
    expect(step5.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([167, 833, 1000, 2000]);
    expect(step5.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(4000);
  });

  it('handles initial 3-milestone scenario: 2300 total, editing M1 (698->800) and M2 (799->800)', () => {
    const raw = [
      { title: 'M1', amount: 698 },
      { title: 'M2', amount: 799 },
      { title: 'M3', amount: 803 },
    ];
    const target = 2300;

    // User edits M1 -> 800
    const edit1 = recalculateMilestonesBidirectional(raw, 0, 800, target, []);
    expect(edit1.updatedLockedIndices).toEqual([0]);
    expect(edit1.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([800, 748, 752]);
    expect(edit1.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(2300);

    // User edits M2 -> 800
    const edit2 = recalculateMilestonesBidirectional(edit1.updatedMilestones, 1, 800, target, edit1.updatedLockedIndices);
    expect(edit2.updatedLockedIndices.sort()).toEqual([0, 1]);
    expect(edit2.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([800, 800, 700]);
    expect(edit2.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(2300);
  });
});

describe('resetAndEqualizeMilestones', () => {
  it('splits target budget equally with integer remainder on last item', () => {
    const milestones = [
      { title: 'M1', amount: 800 },
      { title: 'M2', amount: 800 },
      { title: 'M3', amount: 700 },
    ];
    const res = resetAndEqualizeMilestones(milestones, 2300);
    expect(res.updatedLockedIndices).toEqual([]);
    expect(res.updatedMilestones.map((m: { amount: number }) => m.amount)).toEqual([766, 766, 768]);
    expect(res.updatedMilestones.reduce((s: number, m: { amount: number }) => s + m.amount, 0)).toBe(2300);
  });
});

