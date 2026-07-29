import type { PromotionPolicy } from '../types';
export const calculatePromotionTarget = (tokens: number, policy: PromotionPolicy) =>
  policy.baseTargetClicks + tokens * policy.targetClicksPerCoin;
