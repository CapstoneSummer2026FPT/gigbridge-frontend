import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { PremiumSubscription } from '../types';
import { calculatePremiumCoverage } from '../utils/premiumCoverage';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export function PremiumTimeRemaining({ subscriptions }: { subscriptions: PremiumSubscription[] }) {
  const { t, i18n } = useTranslation(['premium', 'common']);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const coverage = useMemo(
    () => calculatePremiumCoverage(subscriptions, now),
    [subscriptions, now],
  );

  if (!coverage) return null;

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < DAY) {
      return t('premiumTime.hours', { count: Math.max(1, Math.ceil(milliseconds / HOUR)) });
    }
    return t('premiumTime.days', { count: Math.ceil(milliseconds / DAY) });
  };
  const remaining = formatDuration(coverage.remainingMs);
  const total = formatDuration(coverage.totalMs);
  const percentage = Math.round(coverage.remainingPercent);
  const paidThrough = coverage.endDate.toLocaleDateString(i18n.language);

  return <div className="premium-time">
    <div className="premium-time-heading">
      <span><Clock3 size={17} />{t('premiumTime.label')}</span>
      <strong>{percentage}%</strong>
    </div>
    <div className="premium-time-summary">{t('premiumTime.remainingOfTotal', { remaining, total })}</div>
    <div
      className="premium-time-progress"
      role="progressbar"
      aria-label={t('premiumTime.label')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <span style={{ width: `${coverage.remainingPercent}%` }} />
    </div>
    <div className="premium-time-details">
      <span>{t('premiumTime.paidThrough', { date: paidThrough })}</span>
      <span>{t('premiumTime.topUpsIncluded')}</span>
    </div>
  </div>;
}
