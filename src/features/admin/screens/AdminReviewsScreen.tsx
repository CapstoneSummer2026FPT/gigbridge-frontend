import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Flag, Search, ShieldCheck, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { reviewGetAPI } from '../../../api/reviewAPI/GET';
import { reviewPutAPI } from '../../../api/reviewAPI/PUT';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  ReviewModerationStatus,
  type AdminReviewSummary,
  type ManagedReview,
} from '../../../types/models/ReviewManagement';
import { UserRole } from '../../../types/models/User';
import '../styles/admin-reviews-screen.css';

const EMPTY_SUMMARY: AdminReviewSummary = { total: 0, active: 0, hidden: 0, withOpenReports: 0 };

export default function AdminReviewsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ManagedReview[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [reviewerRole, setReviewerRole] = useState<number | ''>('');
  const [revieweeRole, setRevieweeRole] = useState<number | ''>('');
  const [status, setStatus] = useState<ReviewModerationStatus | ''>('');
  const [hasOpenReport, setHasOpenReport] = useState<boolean | ''>('');
  const [selected, setSelected] = useState<ManagedReview | null>(null);
  const [moderating, setModerating] = useState<ManagedReview | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await reviewGetAPI.getAdminReviews({
      page,
      pageSize: 15,
      ...(search ? { search } : {}),
      ...(rating !== '' ? { rating } : {}),
      ...(reviewerRole !== '' ? { reviewerRole } : {}),
      ...(revieweeRole !== '' ? { revieweeRole } : {}),
      ...(status !== '' ? { moderationStatus: status } : {}),
      ...(hasOpenReport !== '' ? { hasOpenReport } : {}),
    });
    if (response.success && response.data) {
      setItems(response.data.items);
      setSummary(response.data.summary);
      setTotalPages(response.data.totalPages);
    } else {
      setItems([]);
      setError(response.message || t('adminReviews.loadError'));
    }
    setLoading(false);
  }, [hasOpenReport, page, rating, revieweeRole, reviewerRole, search, status, t]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  const applySearch = () => { setPage(1); setSearch(searchDraft.trim()); };
  const changeFilter = <T,>(setter: (value: T) => void, value: T) => { setter(value); setPage(1); };
  const beginModeration = (review: ManagedReview) => { setSelected(null); setModerating(review); setNote(''); };

  const saveModeration = async () => {
    if (!moderating || note.trim().length < 10) return;
    setSaving(true);
    const nextStatus = moderating.moderationStatus === ReviewModerationStatus.Active
      ? ReviewModerationStatus.Hidden
      : ReviewModerationStatus.Active;
    const response = await reviewPutAPI.moderateReview(moderating.reviewId, nextStatus, note.trim());
    setSaving(false);
    if (!response.success) {
      setError(response.message || t('adminReviews.moderationError'));
      return;
    }
    setModerating(null);
    await loadReviews();
  };

  const roleLabel = (role: number) => role === UserRole.Freelancer ? t('adminReviews.freelancer') : t('adminReviews.client');
  const statusLabel = (value: ReviewModerationStatus) => value === ReviewModerationStatus.Active ? t('adminReviews.active') : t('adminReviews.hidden');

  return (
    <AppLayout>
      <div className="admin-reviews-page">
        <header><div><span>{t('adminReviews.eyebrow')}</span><h1>{t('adminReviews.title')}</h1><p>{t('adminReviews.subtitle')}</p></div></header>
        <section className="admin-review-summary">
          <div><strong>{summary.total}</strong><span>{t('adminReviews.total')}</span></div>
          <div><strong>{summary.active}</strong><span>{t('adminReviews.active')}</span></div>
          <div><strong>{summary.hidden}</strong><span>{t('adminReviews.hidden')}</span></div>
          <div><strong>{summary.withOpenReports}</strong><span>{t('adminReviews.openReports')}</span></div>
        </section>

        <section className="admin-review-filters">
          <div className="admin-review-search"><Search size={16} /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') applySearch(); }} placeholder={t('adminReviews.search')} /><button onClick={applySearch}>{t('adminReviews.searchAction')}</button></div>
          <select value={rating} onChange={event => changeFilter(setRating, event.target.value === '' ? '' : Number(event.target.value))}><option value="">{t('adminReviews.allRatings')}</option>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} ★</option>)}</select>
          <select value={reviewerRole} onChange={event => changeFilter(setReviewerRole, event.target.value === '' ? '' : Number(event.target.value))}><option value="">{t('adminReviews.allReviewerRoles')}</option><option value={UserRole.Client}>{t('adminReviews.client')}</option><option value={UserRole.Freelancer}>{t('adminReviews.freelancer')}</option></select>
          <select value={revieweeRole} onChange={event => changeFilter(setRevieweeRole, event.target.value === '' ? '' : Number(event.target.value))}><option value="">{t('adminReviews.allRevieweeRoles')}</option><option value={UserRole.Client}>{t('adminReviews.client')}</option><option value={UserRole.Freelancer}>{t('adminReviews.freelancer')}</option></select>
          <select value={status} onChange={event => changeFilter(setStatus, event.target.value === '' ? '' : Number(event.target.value) as ReviewModerationStatus)}><option value="">{t('adminReviews.allStatuses')}</option><option value={ReviewModerationStatus.Active}>{t('adminReviews.active')}</option><option value={ReviewModerationStatus.Hidden}>{t('adminReviews.hidden')}</option></select>
          <select value={String(hasOpenReport)} onChange={event => changeFilter(setHasOpenReport, event.target.value === '' ? '' : event.target.value === 'true')}><option value="">{t('adminReviews.allReports')}</option><option value="true">{t('adminReviews.withOpenReport')}</option><option value="false">{t('adminReviews.withoutOpenReport')}</option></select>
        </section>

        {error && <div className="admin-review-error">{error}</div>}
        <section className="admin-review-table-wrap">
          <table className="admin-review-table">
            <thead><tr><th>{t('adminReviews.project')}</th><th>{t('adminReviews.reviewer')}</th><th>{t('adminReviews.reviewee')}</th><th>{t('adminReviews.rating')}</th><th>{t('adminReviews.status')}</th><th>{t('adminReviews.reports')}</th><th>{t('adminReviews.date')}</th><th /></tr></thead>
            <tbody>
              {!loading && items.length === 0 && <tr><td colSpan={8} className="admin-review-empty">{t('adminReviews.empty')}</td></tr>}
              {loading && <tr><td colSpan={8} className="admin-review-empty">{t('adminReviews.loading')}</td></tr>}
              {items.map(review => <tr key={review.reviewId}><td><strong>{review.projectTitle}</strong></td><td>{review.reviewerName}<small>{roleLabel(review.reviewerRole)}</small></td><td>{review.revieweeName}<small>{roleLabel(review.revieweeRole)}</small></td><td><span className="admin-review-stars"><Star size={14} fill="currentColor" />{review.rating}</span></td><td><span className={`admin-review-status ${review.moderationStatus === ReviewModerationStatus.Hidden ? 'hidden' : 'active'}`}>{statusLabel(review.moderationStatus)}</span></td><td>{review.openReportCount > 0 ? <button className="admin-review-report-link" onClick={() => navigate(`/admin/reports?reportedEntityType=Review&reportedEntityId=${review.reviewId}`)}><Flag size={14} />{review.openReportCount}</button> : '0'}</td><td>{new Date(review.createdAt).toLocaleDateString(i18n.language)}</td><td><button className="admin-review-view" onClick={() => setSelected(review)}><Eye size={16} />{t('adminReviews.view')}</button></td></tr>)}
            </tbody>
          </table>
        </section>
        {totalPages > 1 && <div className="review-pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{t('reviewManagement.previous')}</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>{t('reviewManagement.next')}</button></div>}
      </div>

      {selected && <div className="admin-review-drawer-overlay" onMouseDown={() => setSelected(null)}><aside className="admin-review-drawer" onMouseDown={event => event.stopPropagation()}><button className="admin-review-drawer-close" onClick={() => setSelected(null)}><X size={19} /></button><span className="admin-review-drawer-kicker">{t('adminReviews.detail')}</span><h2>{selected.projectTitle}</h2><div className="admin-review-detail-grid"><div><small>{t('adminReviews.reviewer')}</small><strong>{selected.reviewerName}</strong><span>{roleLabel(selected.reviewerRole)}</span></div><div><small>{t('adminReviews.reviewee')}</small><strong>{selected.revieweeName}</strong><span>{roleLabel(selected.revieweeRole)}</span></div></div><div className="admin-review-detail-score"><Star size={22} fill="currentColor" /><strong>{selected.rating.toFixed(1)}</strong></div><div className="admin-review-criteria"><p><span>{t('reviews.communication')}</span><strong>{selected.communicationRating ?? '—'}</strong></p><p><span>{t(selected.revieweeRole === UserRole.Freelancer ? 'reviews.workQuality' : 'reviews.requirementClarity')}</span><strong>{selected.qualityRating ?? '—'}</strong></p><p><span>{t(selected.revieweeRole === UserRole.Freelancer ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')}</span><strong>{selected.timelinessRating ?? '—'}</strong></p></div><div className="admin-review-comment"><small>{t('adminReviews.comment')}</small><p>{selected.comment || t('reviewManagement.noComment')}</p></div><div className="admin-review-drawer-meta"><span>{statusLabel(selected.moderationStatus)}</span><span>{t('adminReviews.reportCount', { count: selected.totalReportCount })}</span><span>{selected.isAnonymous ? t('adminReviews.legacyAnonymous') : t('adminReviews.identified')}</span></div>{selected.totalReportCount > 0 && <button className="admin-review-secondary" onClick={() => navigate(`/admin/reports?reportedEntityType=Review&reportedEntityId=${selected.reviewId}`)}><Flag size={16} />{t('adminReviews.openRelatedReports')}</button>}<button className={selected.moderationStatus === ReviewModerationStatus.Active ? 'admin-review-danger' : 'admin-review-restore'} onClick={() => beginModeration(selected)}>{selected.moderationStatus === ReviewModerationStatus.Active ? <EyeOff size={17} /> : <ShieldCheck size={17} />}{selected.moderationStatus === ReviewModerationStatus.Active ? t('adminReviews.hideAction') : t('adminReviews.restoreAction')}</button></aside></div>}

      {moderating && <div className="review-report-overlay" onMouseDown={() => setModerating(null)}><section className="review-report-modal" onMouseDown={event => event.stopPropagation()}><button className="review-report-close" onClick={() => setModerating(null)}><X size={18} /></button><h2>{moderating.moderationStatus === ReviewModerationStatus.Active ? t('adminReviews.hideTitle') : t('adminReviews.restoreTitle')}</h2><p>{t('adminReviews.noteHelp')}</p><label>{t('adminReviews.note')}<textarea maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /><small>{note.length}/1000</small></label><div className="review-report-actions"><button onClick={() => setModerating(null)}>{t('reviewManagement.cancel')}</button><button className="primary" disabled={saving || note.trim().length < 10} onClick={() => void saveModeration()}>{saving ? t('adminReviews.saving') : t('adminReviews.confirm')}</button></div></section></div>}
    </AppLayout>
  );
}
