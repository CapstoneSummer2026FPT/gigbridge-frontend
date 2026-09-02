import { Info } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AnalyticsFormulaTooltipProps {
  label: string;
  children: React.ReactNode;
}

export function AnalyticsFormulaTooltip({ label, children }: AnalyticsFormulaTooltipProps) {
  const { t } = useTranslation('admin');
  const id = `${label.replace(/\W+/g, '-').toLowerCase()}-formula`;

  return (
    <span className="analytics-info-tooltip">
      <button
        type="button"
        className="analytics-info-trigger"
        aria-label={label}
        aria-describedby={id}
      >
        <Info size={14} />
      </button>
      <span id={id} className="analytics-info-bubble" role="tooltip">
        <strong className="analytics-info-bubble-title">
          {t('adminAnalytics.shared.formulaTitle', { defaultValue: 'Formula & Calculation' })}
        </strong>
        <div className="analytics-info-bubble-body">{children}</div>
      </span>
    </span>
  );
}

export default AnalyticsFormulaTooltip;
