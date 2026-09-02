import React from 'react';
import { Table } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AnalyticsChartPanelProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
}

export function AnalyticsChartPanel({
  title,
  subtitle,
  badge,
  actions,
  children,
  table,
  className = '',
}: AnalyticsChartPanelProps) {
  const { t } = useTranslation('admin');

  return (
    <section className={`analytics-panel ${className}`.trim()}>
      <header className="analytics-panel-header">
        <div className="analytics-panel-titles">
          <div className="analytics-panel-title-row">
            <h2>{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="analytics-panel-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="analytics-panel-actions">{actions}</div>}
      </header>

      <div className="analytics-chart" role="img" aria-label={title}>
        {children}
      </div>

      {table && (
        <details className="analytics-fallback">
          <summary>
            <Table size={14} />
            <span>{t('adminAnalytics.shared.viewTable', { defaultValue: 'View chart data as table' })}</span>
          </summary>
          <div className="analytics-fallback-content">{table}</div>
        </details>
      )}
    </section>
  );
}

export default AnalyticsChartPanel;
