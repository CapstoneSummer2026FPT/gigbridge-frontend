import type { PromotionPolicy } from '../types';
export const calculatePromotionTarget = (tokens: number, policy: PromotionPolicy) =>
  policy.baseTargetClicks + tokens * policy.targetClicksPerCoin;
export const calculatePromotionWeight = (tokens: number, policy: PromotionPolicy) =>
  tokens * policy.boostWeightPerCoin;
