import type { AnalyticsSeriesPoint } from '../../../../types/adminAnalytics';
import { formatMoney, useTablePage } from '../../utils/analyticsUtils';
import { AnalyticsPagination } from './AnalyticsPagination';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface SeriesTableProps {
  points: AnalyticsSeriesPoint[];
}

export function SeriesTable({ points }: SeriesTableProps) {
  const { t } = useTranslation('admin');
  const pagination = useTablePage(points.length, 8);
  const rows = points.slice(pagination.from, pagination.to);

  return (
    <div className="analytics-series-table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('adminDashboard.charts.date', { defaultValue: 'Date' })}</th>
            <th>{t('adminDashboard.queueKicker', { defaultValue: 'Series' })}</th>
            <th className="text-right">{t('adminAnalytics.transactions.vnd', { defaultValue: 'Value' })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.bucket}-${row.series}-${idx}`}>
              <td className="font-mono text-xs text-text-muted">{row.bucket}</td>
              <td className="font-medium text-text-primary">{row.series}</td>
              <td className="text-right font-mono font-bold text-brand">
                {formatMoney(row.value)} ₫
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="analytics-empty py-4">
          <span>{t('adminDashboard.charts.noActivity', { defaultValue: 'No series data available.' })}</span>
        </div>
      )}

      <AnalyticsPagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        from={pagination.from}
        to={pagination.to}
        total={points.length}
        onPage={pagination.setPage}
        noun="points"
      />
    </div>
  );
}

export default SeriesTable;
