import { PremiumSubscriptionStatus, type PremiumSubscription } from '../types';

export interface PremiumCoverage {
  startDate: Date;
  endDate: Date;
  totalMs: number;
  remainingMs: number;
  remainingPercent: number;
}

/**
 * Combines the active subscription and any contiguous top-ups into one
 * paid-through window. Top-ups are stored as future subscription rows, so
 * looking at a single row would make the displayed total incorrect.
 */
export function calculatePremiumCoverage(
  subscriptions: PremiumSubscription[],
  now = new Date(),
): PremiumCoverage | null {
  const nowMs = now.getTime();
  const periods = subscriptions
    .filter(subscription => subscription.isPremium && subscription.status === PremiumSubscriptionStatus.Active)
    .map(subscription => ({
      startMs: new Date(subscription.startDate).getTime(),
      endMs: new Date(subscription.endDate).getTime(),
    }))
    .filter(period => Number.isFinite(period.startMs) && Number.isFinite(period.endMs) && period.endMs > period.startMs)
    .sort((left, right) => left.startMs - right.startMs);

  const currentPeriod = periods.find(period => period.startMs <= nowMs && period.endMs > nowMs);
  if (!currentPeriod) return null;

  const startMs = currentPeriod.startMs;
  let endMs = currentPeriod.endMs;

  for (const period of periods) {
    if (period.startMs > endMs) break;
    if (period.endMs > endMs) endMs = period.endMs;
  }

  const totalMs = endMs - startMs;
  const remainingMs = Math.max(0, endMs - nowMs);

  return {
    startDate: new Date(startMs),
    endDate: new Date(endMs),
    totalMs,
    remainingMs,
    remainingPercent: Math.min(100, Math.max(0, (remainingMs / totalMs) * 100)),
  };
}
