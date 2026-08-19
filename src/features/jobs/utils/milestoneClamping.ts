import type { JobPostMilestonePlanDto } from '../../../types/models/Job';
import { parseJobDuration, durationToWeeks } from './jobDuration';

/**
 * Resolves a single canonical budget string from min/max budget values.
 * If both min and max are provided (e.g. 10000 and 20000), calculates the average / midpoint
 * and rounds it to a clean integer (e.g. 15000).
 */
export function resolveCanonicalBudget(
  min?: number | string | null,
  max?: number | string | null
): string {
  const minVal = min !== null && min !== undefined ? Number(min) : null;
  const maxVal = max !== null && max !== undefined ? Number(max) : null;

  const validMin = minVal !== null && !isNaN(minVal) && minVal > 0 ? minVal : null;
  const validMax = maxVal !== null && !isNaN(maxVal) && maxVal > 0 ? maxVal : null;

  if (validMin !== null && validMax !== null) {
    const average = Math.round((validMin + validMax) / 2);
    return String(average);
  }
  if (validMax !== null) return String(Math.round(validMax));
  if (validMin !== null) return String(Math.round(validMin));
  return '';
}

/**
 * Scales and clamps milestone amounts and duration weeks so that:
 * 1. Sum of milestone amounts equals expectedBudget (e.g. 28,000 GC) exactly.
 * 2. Sum of milestone week durations equals expectedDurationWeeks (e.g. 5 weeks) exactly.
 */
export function clampMilestonesToExpectedTargets(
  milestones: JobPostMilestonePlanDto[],
  expectedBudget: number | null,
  expectedDurationWeeks: number = 0
): JobPostMilestonePlanDto[] {
  if (!milestones || milestones.length === 0) return milestones;

  let result = [...milestones];

  // 1. Clamp Budget
  if (expectedBudget !== null && expectedBudget > 0) {
    const currentTotal = result.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    if (currentTotal > 0 && Math.abs(currentTotal - expectedBudget) > 0.001) {
      const scale = expectedBudget / currentTotal;
      let scaledSum = 0;

      result = result.map((item, index) => {
        if (index < result.length - 1) {
          const scaledAmount = Math.round(Number(item.amount) * scale * 100) / 100;
          scaledSum += scaledAmount;
          return { ...item, amount: scaledAmount };
        } else {
          // Last milestone absorbs decimal remainder
          const lastAmount = Math.max(0, Math.round((expectedBudget - scaledSum) * 100) / 100);
          return { ...item, amount: lastAmount };
        }
      });
    } else if (currentTotal <= 0) {
      const per = Math.round((expectedBudget / result.length) * 100) / 100;
      let sumSoFar = 0;

      result = result.map((item, index) => {
        if (index < result.length - 1) {
          sumSoFar += per;
          return { ...item, amount: per };
        } else {
          const lastAmount = Math.max(0, Math.round((expectedBudget - sumSoFar) * 100) / 100);
          return { ...item, amount: lastAmount };
        }
      });
    }
  }

  // 2. Clamp Durations (if expectedDurationWeeks > 0)
  if (expectedDurationWeeks && expectedDurationWeeks > 0) {
    const targetWeeks = Math.max(result.length, Math.round(expectedDurationWeeks));
    const individualWeeks = result.map(m => {
      const { value, unit } = parseJobDuration(m.estimatedDuration);
      const w = durationToWeeks(value, unit);
      return w > 0 ? w : 1;
    });

    const totalWeeks = individualWeeks.reduce((sum, w) => sum + w, 0);

    if (totalWeeks > 0) {
      const scaledWeeks: number[] = [];
      for (let i = 0; i < individualWeeks.length - 1; i++) {
        const w = Math.max(1, Math.round((individualWeeks[i] * targetWeeks) / totalWeeks));
        scaledWeeks.push(w);
      }

      let lastW = targetWeeks - scaledWeeks.reduce((sum, w) => sum + w, 0);
      if (lastW < 1) {
        let needed = 1 - lastW;
        lastW = 1;
        for (let i = scaledWeeks.length - 1; i >= 0; i--) {
          if (scaledWeeks[i] > 1) {
            const deduct = Math.min(needed, scaledWeeks[i] - 1);
            scaledWeeks[i] -= deduct;
            needed -= deduct;
            if (needed <= 0) break;
          }
        }
      }
      scaledWeeks.push(lastW);

      result = result.map((item, index) => ({
        ...item,
        estimatedDuration: `${scaledWeeks[index]} ${scaledWeeks[index] === 1 ? 'week' : 'weeks'}`,
      }));
    }
  }

  return result;
}

export interface MilestoneAmountItem {
  amount: number;
}

/**
 * Dynamically recalculates milestone amounts in any direction (upstream/downstream) when a user edits an amount.
 * The edited milestone index is marked as locked (fixed).
 * Remaining target budget (targetBudget - sum of locked amounts) is distributed across all unlocked milestones.
 * Decimal remainders are assigned to the last unlocked milestone to ensure exact integer total sum.
 */
export function recalculateMilestonesBidirectional<T extends MilestoneAmountItem>(
  milestones: T[],
  editedIndex: number,
  newAmount: number,
  targetBudget: number | null,
  lockedIndices: Iterable<number> = []
): { updatedMilestones: T[]; updatedLockedIndices: number[] } {
  if (!milestones || milestones.length === 0) {
    return { updatedMilestones: milestones, updatedLockedIndices: [] };
  }

  const updatedLockedIndices = new Set<number>(lockedIndices);
  updatedLockedIndices.add(editedIndex);

  const updatedMilestones = milestones.map(m => ({ ...m }));
  const clampedNewAmount = Math.max(0, Math.round(newAmount));
  updatedMilestones[editedIndex].amount = clampedNewAmount;

  if (targetBudget === null || targetBudget <= 0) {
    return {
      updatedMilestones,
      updatedLockedIndices: Array.from(updatedLockedIndices),
    };
  }

  const allIndices = Array.from({ length: milestones.length }, (_, i) => i);
  const unlockedIndices = allIndices.filter(i => !updatedLockedIndices.has(i));

  if (unlockedIndices.length === 0) {
    return {
      updatedMilestones,
      updatedLockedIndices: Array.from(updatedLockedIndices),
    };
  }

  let lockedSum = 0;
  updatedLockedIndices.forEach(idx => {
    if (idx >= 0 && idx < updatedMilestones.length) {
      lockedSum += Number(updatedMilestones[idx].amount) || 0;
    }
  });

  const remainingBudget = Math.max(0, targetBudget - lockedSum);

  const unlockedSum = unlockedIndices.reduce((sum, idx) => sum + (Number(updatedMilestones[idx].amount) || 0), 0);

  if (unlockedSum > 0) {
    let distributedSum = 0;
    for (let i = 0; i < unlockedIndices.length - 1; i++) {
      const idx = unlockedIndices[i];
      const fraction = (Number(updatedMilestones[idx].amount) || 0) / unlockedSum;
      const allocated = Math.round(remainingBudget * fraction);
      updatedMilestones[idx].amount = allocated;
      distributedSum += allocated;
    }
    const lastUnlockedIdx = unlockedIndices[unlockedIndices.length - 1];
    updatedMilestones[lastUnlockedIdx].amount = Math.max(0, remainingBudget - distributedSum);
  } else {
    const perItem = Math.floor(remainingBudget / unlockedIndices.length);
    let distributedSum = 0;

    for (let i = 0; i < unlockedIndices.length - 1; i++) {
      const idx = unlockedIndices[i];
      updatedMilestones[idx].amount = perItem;
      distributedSum += perItem;
    }
    const lastUnlockedIdx = unlockedIndices[unlockedIndices.length - 1];
    updatedMilestones[lastUnlockedIdx].amount = Math.max(0, remainingBudget - distributedSum);
  }

  return {
    updatedMilestones,
    updatedLockedIndices: Array.from(updatedLockedIndices),
  };
}

/**
 * Resets all user locks and splits targetBudget equally among all milestones.
 */
export function resetAndEqualizeMilestones<T extends MilestoneAmountItem>(
  milestones: T[],
  targetBudget: number | null
): { updatedMilestones: T[]; updatedLockedIndices: number[] } {
  if (!milestones || milestones.length === 0) {
    return { updatedMilestones: milestones, updatedLockedIndices: [] };
  }

  const updatedMilestones = milestones.map(m => ({ ...m }));

  if (targetBudget !== null && targetBudget > 0) {
    const perItem = Math.floor(targetBudget / milestones.length);
    let sumSoFar = 0;

    for (let i = 0; i < milestones.length - 1; i++) {
      updatedMilestones[i].amount = perItem;
      sumSoFar += perItem;
    }
    updatedMilestones[milestones.length - 1].amount = Math.max(0, targetBudget - sumSoFar);
  }

  return {
    updatedMilestones,
    updatedLockedIndices: [],
  };
}

