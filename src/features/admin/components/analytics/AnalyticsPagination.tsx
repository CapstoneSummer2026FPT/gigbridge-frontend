import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AnalyticsPaginationProps {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPage: (page: number) => void;
  noun?: string;
  canPrevious?: boolean;
  canNext?: boolean;
}

export function AnalyticsPagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPage,
  noun = 'rows',
  canPrevious = page > 1,
  canNext = page < pageCount,
}: AnalyticsPaginationProps) {
  const { t } = useTranslation('admin');
  if (total === 0) return null;

  return (
    <div className="analytics-pagination" aria-label={`${noun} pagination`}>
      <span className="analytics-pagination-info">
        {t('adminAnalytics.shared.showing', { defaultValue: 'Showing' })}{' '}
        <strong>{from + 1}–{to}</strong>{' '}
        {t('adminAnalytics.shared.of', { defaultValue: 'of' })}{' '}
        <strong>{total.toLocaleString()}</strong> {noun}
      </span>
      <div className="analytics-pagination-actions">
        <button
          type="button"
          disabled={!canPrevious}
          onClick={() => onPage(page - 1)}
          className="analytics-pagination-btn"
          aria-label="Previous page"
        >
          <ArrowLeft size={14} />
          <span>{t('adminAnalytics.shared.previous', { defaultValue: 'Previous' })}</span>
        </button>
        <span className="analytics-pagination-current">
          {t('adminAnalytics.shared.page', { defaultValue: 'Page' })} <strong>{page}</strong> {t('adminAnalytics.shared.of', { defaultValue: 'of' })} <strong>{pageCount}</strong>
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPage(page + 1)}
          className="analytics-pagination-btn"
          aria-label="Next page"
        >
          <span>{t('adminAnalytics.shared.next', { defaultValue: 'Next' })}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default AnalyticsPagination;
