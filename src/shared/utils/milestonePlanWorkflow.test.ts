import { describe, expect, it } from 'vitest';
import {
  calculateMilestonePlanBudget,
  prepareMilestonePlanForEditing,
  resolveMilestonePlan,
  toDateOnly,
  validateMilestonePlan,
  type MilestonePlanValue,
} from './milestonePlanWorkflow';

const generatedPlan = (): MilestonePlanValue => ({
  id: 'milestone-1',
  title: 'Design delivery',
  amount: 40.125,
  estimatedDuration: '1 week',
  dueDate: '2026-08-01T00:00:00Z',
  deliverables: 'Approved design files',
  acceptanceCriteria: '',
  orderIndex: 7,
  workItems: [{
    id: 'work-item-1',
    title: 'Design delivery',
    description: 'Approved design files',
    deliverables: 'Approved design files',
    estimatedDuration: '1 week',
    orderIndex: 4,
  }],
});

describe('milestonePlanWorkflow', () => {
  it('normalizes date-only values without accepting unrelated strings', () => {
    expect(toDateOnly('2026-08-15T00:00:00Z')).toBe('2026-08-15');
    expect(toDateOnly('2026-08-15')).toBe('2026-08-15');
    expect(toDateOnly('not-a-date')).toBeNull();
  });

  it('hides a generated work item while retaining its persisted identifier', () => {
    const prepared = prepareMilestonePlanForEditing([generatedPlan()]);

    expect(prepared.milestones[0].workItems).toEqual([]);
    expect(prepared.advancedIndexes).toEqual([]);
    expect(prepared.generatedWorkItemIdsByMilestoneId).toEqual({
      'milestone-1': 'work-item-1',
    });

    const resolved = resolveMilestonePlan(prepared.milestones, {
      anchorDate: '2026-08-15',
      defaultAcceptanceCriteria: 'Client approval',
      generatedWorkItemIdsByMilestoneId: prepared.generatedWorkItemIdsByMilestoneId,
    });

    expect(resolved[0].dueDate).toBe('2026-08-22');
    expect(resolved[0].acceptanceCriteria).toBe('Client approval');
    expect(resolved[0].workItems[0]).toMatchObject({
      id: 'work-item-1',
      title: 'Design delivery',
      description: 'Approved design files',
      orderIndex: 0,
    });
  });

  it('keeps custom work items visible and reports their field errors', () => {
    const plan = generatedPlan();
    plan.workItems = [{
      id: 'custom-work-item',
      title: '',
      description: '',
      orderIndex: 0,
    }];

    const prepared = prepareMilestonePlanForEditing([plan]);
    const validation = validateMilestonePlan(prepared.milestones);

    expect(prepared.advancedIndexes).toEqual([0]);
    expect(prepared.milestones[0].workItems[0].id).toBe('custom-work-item');
    expect(validation.valid).toBe(false);
    expect(validation.errors).toMatchObject({
      '0.workItems.0.title': 'workItemTitleRequired',
      '0.workItems.0.description': 'workItemDescriptionRequired',
    });
    expect(validation.advancedIndexes).toEqual([0]);
  });

  it('rounds amounts and calculates the plan budget to two decimals', () => {
    const first = generatedPlan();
    const second = { ...generatedPlan(), id: 'milestone-2', amount: 9.874 };

    expect(calculateMilestonePlanBudget([first, second])).toBe(50);
  });
});
