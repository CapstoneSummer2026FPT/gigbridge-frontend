import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Briefcase, Flag, Star, UserRound, X } from 'lucide-react';
import { reviewGetAPI } from '../../../api/reviewAPI/GET';
import { reportAPI } from '../../../api/reportAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ReportType } from '../../../types/models/Report';
import {
  ReviewModerationStatus,
  type ManagedReview,
} from '../../../types/models/ReviewManagement';
import { UserRole } from '../../../types/models/User';
import '../styles/reviews-screen.css';

type Direction = 'received' | 'sent';

const reportTypes = [
  ReportType.Spam,
  ReportType.Fraud,
  ReportType.InappropriateContent,
  ReportType.HarassmentOrAbuse,
  ReportType.Other,
];

function RatingLine({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="review-history-rating">
      <span>{label}</span>
      <strong><Star size={14} fill="currentColor" /> {value ?? '—'}</strong>
    </div>
  );
}

export default function MyReviewsScreen() {
  const { t, i18n } = useTranslation();
  const [direction, setDirection] = useState<Direction>('received');
  const [reviews, setReviews] = useState<ManagedReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState<ManagedReview | null>(null);
  const [reportType, setReportType] = useState(ReportType.InappropriateContent);
  const [reason, setReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await reviewGetAPI.getMyReviews(direction, page, 10);
    if (response.success && response.data) {
      setReviews(response.data.items);
      setTotalPages(response.data.totalPages);
    } else {
      setReviews([]);
      setError(response.message || t('reviewManagement.loadError'));
    }
    setLoading(false);
  }, [direction, page, t]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  const selectDirection = (next: Direction) => {
    setDirection(next);
    setPage(1);
  };

  const submitReport = async () => {
    if (!reporting || reason.trim().length < 10) return;
    setSubmittingReport(true);
    const response = await reportAPI.createReport({
      reportedEntityId: reporting.reviewId,
      reportedEntityType: 'Review',
      type: reportType,
      reason: reason.trim(),
    });
    setSubmittingReport(false);
    if (!response.success) {
      setError(response.message || t('reviewManagement.reportError'));
      return;
    }
    setReporting(null);
    setReason('');
    await loadReviews();
  };

  return (
    <AppLayout>
      <div className="review-management-page">
        <header className="review-management-header">
          <div><span>{t('reviewManagement.eyebrow')}</span><h1>{t('reviewManagement.title')}</h1></div>
          <p>{t('reviewManagement.subtitle')}</p>
        </header>

        <div className="review-management-tabs" role="tablist">
          <button className={direction === 'received' ? 'active' : ''} onClick={() => selectDirection('received')}>{t('reviewManagement.received')}</button>
          <button className={direction === 'sent' ? 'active' : ''} onClick={() => selectDirection('sent')}>{t('reviewManagement.sent')}</button>
        </div>

        {error && <div className="review-history-error" role="alert"><AlertCircle size={17} />{error}</div>}
        {loading && <div className="review-history-empty">{t('reviewManagement.loading')}</div>}
        {!loading && reviews.length === 0 && <div className="review-history-empty">{t('reviewManagement.empty')}</div>}

        <div className="review-history-list">
          {reviews.map(review => {
            const counterpartyName = direction === 'received' ? review.reviewerName : review.revieweeName;
            const counterpartyRole = direction === 'received' ? review.reviewerRole : review.revieweeRole;
            const evaluatesFreelancer = review.revieweeRole === UserRole.Freelancer;
            const hidden = review.moderationStatus === ReviewModerationStatus.Hidden;
            return (
              <article className="review-history-card" key={review.reviewId}>
                <div className="review-history-topline">
                  <div className="review-history-project"><Briefcase size={17} /><div><small>{t('reviewManagement.project')}</small><strong>{review.projectTitle}</strong></div></div>
                  <div className="review-history-score"><Star fill="currentColor" size={19} />{review.rating.toFixed(1)}</div>
                </div>
                <div className="review-history-person"><UserRound size={17} /><span>{counterpartyName}</span><em>{counterpartyRole === UserRole.Freelancer ? t('reviewManagement.freelancer') : t('reviewManagement.client')}</em></div>
                <div className="review-history-ratings">
                  <RatingLine label={t('reviews.communication')} value={review.communicationRating} />
                  <RatingLine label={t(evaluatesFreelancer ? 'reviews.workQuality' : 'reviews.requirementClarity')} value={review.qualityRating} />
                  <RatingLine label={t(evaluatesFreelancer ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')} value={review.timelinessRating} />
                </div>
                <p className="review-history-comment">{review.comment || t('reviewManagement.noComment')}</p>
                <footer>
                  <time>{new Date(review.createdAt).toLocaleDateString(i18n.language)}</time>
                  <div>
                    <span className={hidden ? 'review-hidden-badge' : 'review-active-badge'}>{t(hidden ? 'reviewManagement.hidden' : 'reviewManagement.active')}</span>
                    {direction === 'received' && review.hasOpenReport && <span className="review-reported-badge">{t('reviewManagement.reported')}</span>}
                    {direction === 'received' && !review.hasOpenReport && !hidden && (
                      <button className="review-report-button" onClick={() => setReporting(review)}><Flag size={14} />{t('reviewManagement.report')}</button>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>

        {totalPages > 1 && <div className="review-pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{t('reviewManagement.previous')}</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>{t('reviewManagement.next')}</button></div>}
      </div>

      {reporting && (
        <div className="review-report-overlay" role="presentation" onMouseDown={() => setReporting(null)}>
          <section className="review-report-modal" role="dialog" aria-modal="true" aria-labelledby="review-report-title" onMouseDown={event => event.stopPropagation()}>
            <button className="review-report-close" aria-label={t('reviewManagement.close')} onClick={() => setReporting(null)}><X size={18} /></button>
            <h2 id="review-report-title">{t('reviewManagement.reportTitle')}</h2>
            <p>{t('reviewManagement.reportDescription', { name: reporting.reviewerName })}</p>
            <label>{t('reviewManagement.reportType')}<select value={reportType} onChange={event => setReportType(Number(event.target.value) as ReportType)}>{reportTypes.map(type => <option key={type} value={type}>{t(`reviewManagement.reportTypes.${type}`)}</option>)}</select></label>
            <label>{t('reviewManagement.reason')}<textarea maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /><small>{reason.length}/2000</small></label>
            <div className="review-report-actions"><button onClick={() => setReporting(null)}>{t('reviewManagement.cancel')}</button><button className="primary" disabled={submittingReport || reason.trim().length < 10} onClick={() => void submitReport()}>{submittingReport ? t('reviewManagement.reporting') : t('reviewManagement.submitReport')}</button></div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
