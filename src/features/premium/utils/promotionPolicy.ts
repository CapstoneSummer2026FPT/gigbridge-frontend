import type { PromotionPolicy, PromotionQueueEntry } from '../types';
export const calculatePromotionTarget = (tokens: number, policy: PromotionPolicy) =>
  policy.baseTargetClicks + tokens * policy.targetClicksPerCoin;

export const calculatePromotionBoostWeight = (tokens: number, policy: PromotionPolicy) =>
  tokens * policy.boostWeightPerCoin;

export const projectPromotionQueue = (
  queue: PromotionQueueEntry[],
  projectedCurrentWeight: number,
): PromotionQueueEntry[] =>
  queue
    .map(entry => entry.isCurrent
      ? { ...entry, boostWeight: projectedCurrentWeight }
      : entry)
    .sort((left, right) =>
      right.boostWeight - left.boostWeight ||
      left.queuePosition - right.queuePosition)
    .map((entry, index) => ({ ...entry, queuePosition: index + 1 }));
