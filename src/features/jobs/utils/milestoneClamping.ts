import type { JobPostMilestonePlanDto } from '../../../types/models/Job';
import { parseJobDuration, durationToWeeks } from './jobDuration';

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
