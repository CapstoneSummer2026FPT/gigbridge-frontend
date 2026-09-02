import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import type { AnalyticsKpi } from '../../../../types/adminAnalytics';
import { formatKpi, formatNumber, labelFor } from '../../utils/analyticsUtils';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AnalyticsMetricCardProps {
  metric: AnalyticsKpi;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function AnalyticsMetricCard({ metric, subtitle, icon }: AnalyticsMetricCardProps) {
  const { t } = useTranslation('admin');
  const isPositive = (metric.changePercent ?? 0) >= 0;
  const hasChange = metric.changePercent != null;

  return (
    <article className="analytics-metric-card">
      <div className="analytics-metric-header">
        <span className="analytics-metric-label">{labelFor(metric.key, t)}</span>
        {icon && <span className="analytics-metric-icon">{icon}</span>}
      </div>

      <div className="analytics-metric-body">
        <div className="analytics-metric-value">{formatKpi(metric)}</div>
        {subtitle && <span className="analytics-metric-sub">{subtitle}</span>}
      </div>

      <div className={`analytics-change ${isPositive ? 'positive' : 'negative'}`}>
        {hasChange ? (
          <>
            {isPositive ? <TrendingUp size={13} className="shrink-0" /> : <TrendingDown size={13} className="shrink-0" />}
            <span>
              {isPositive ? '+' : ''}
              {formatNumber(metric.changePercent!)}%
            </span>
            <span className="analytics-change-label">
              {t('adminAnalytics.kpis.vsPrior', { defaultValue: 'vs prior period' })}
            </span>
          </>
        ) : (
          <>
            <Sparkles size={12} className="shrink-0" />
            <span>{t('adminAnalytics.kpis.newThisPeriod', { defaultValue: 'New this period' })}</span>
          </>
        )}
      </div>
    </article>
  );
}

export default AnalyticsMetricCard;
