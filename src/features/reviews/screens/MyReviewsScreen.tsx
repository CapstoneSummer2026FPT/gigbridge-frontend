import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  AlertCircle, ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Eye,
  EyeOff, Flag, MessageSquareQuote, Star, X,
} from 'lucide-react';
import { reviewGetAPI } from '../../../api/reviewAPI/GET';
import { reportAPI } from '../../../api/reportAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
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

const REPORT_TYPE_LABELS: Record<number, string> = {
  [ReportType.Spam]: 'Spam',
  [ReportType.Fraud]: 'Gian lận',
  [ReportType.InappropriateContent]: 'Nội dung không phù hợp',
  [ReportType.HarassmentOrAbuse]: 'Quấy rối / Lạm dụng',
  [ReportType.Other]: 'Khác',
};

function StarRow({ value }: { value?: number | null }) {
  const filled = Math.round(value ?? 0);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={12}
          className={i <= filled ? 'text-amber-400' : 'text-text-muted/30'}
          fill={i <= filled ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

function RatingPill({ label, value }: { label: string; value?: number | null }) {
  const v = value ?? 0;
  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-surface-muted/60 border border-border/60">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">{label}</span>
      <div className="flex items-center justify-between gap-1">
        <StarRow value={v} />
        <span className="text-xs font-black text-amber-400">{v.toFixed(1)}</span>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  direction,
  onReport,
  index,
}: {
  review: ManagedReview;
  direction: Direction;
  onReport: (r: ManagedReview) => void;
  index: number;
}) {
  const { i18n, t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.45, delay: index * 0.07, ease: 'power2.out' },
    );
  }, [index]);

  const counterpartyName = direction === 'received' ? review.reviewerName : review.revieweeName;
  const counterpartyRole = direction === 'received' ? review.reviewerRole : review.revieweeRole;
  const counterpartyId = direction === 'received' ? review.reviewerId : review.revieweeId;
  const evaluatesFreelancer = review.revieweeRole === UserRole.Freelancer;
  const isHidden = review.moderationStatus === ReviewModerationStatus.Hidden;
  const isAnon = direction === 'received' && review.isAnonymous;
  const filledStars = Math.round(review.rating);

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
        isHidden
          ? 'border-red-500/25 bg-red-500/5'
          : 'border-border bg-surface-card/80 hover:border-brand/30'
      }`}
      style={{ backdropFilter: 'blur(14px)' }}
    >
      {/* Gradient accent top bar */}
      <div className={`h-1 w-full ${isHidden ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-[var(--brand)] to-indigo-400'}`} />

      <div className="p-5">
        {/* Top row: project + score */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Briefcase size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">
                {t('reviewManagement.project')}
              </p>
              <p className="text-sm font-bold text-text-primary truncate max-w-[260px]">
                {review.projectTitle}
              </p>
            </div>
          </div>

          {/* Overall score badge */}
          <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/25">
            <span className="text-xl font-black text-amber-400 leading-none">{review.rating.toFixed(1)}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={10}
                  className={i <= filledStars ? 'text-amber-400' : 'text-amber-400/20'}
                  fill={i <= filledStars ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Counterparty */}
        <div className="flex items-center gap-2.5 mb-4 p-3 rounded-xl bg-surface-muted/40 border border-border/50">
          {isAnon ? (
            <div className="w-9 h-9 rounded-xl bg-surface-muted border border-border flex items-center justify-center text-text-muted shrink-0">
              <EyeOff size={14} />
            </div>
          ) : (
            <UserAvatar
              userId={counterpartyId}
              name={counterpartyName}
              size="sm"
              className="rounded-xl shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAnon ? (
                <span className="text-sm font-bold text-text-secondary italic">Người dùng ẩn danh</span>
              ) : (
                <UserProfileLink
                  userId={counterpartyId}
                  role={counterpartyRole}
                  className="text-sm font-bold text-text-primary hover:text-brand transition-colors truncate"
                >
                  {counterpartyName}
                </UserProfileLink>
              )}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                counterpartyRole === UserRole.Freelancer
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
              }`}>
                {counterpartyRole === UserRole.Freelancer ? 'Freelancer' : 'Client'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              {direction === 'received' ? 'Đã đánh giá bạn' : 'Được bạn đánh giá'}
            </p>
          </div>
        </div>

        {/* Rating criteria */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <RatingPill label={t('reviews.communication')} value={review.communicationRating} />
          <RatingPill
            label={t(evaluatesFreelancer ? 'reviews.workQuality' : 'reviews.requirementClarity')}
            value={review.qualityRating}
          />
          <RatingPill
            label={t(evaluatesFreelancer ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')}
            value={review.timelinessRating}
          />
        </div>

        {/* Comment */}
        {review.comment ? (
          <div className="flex gap-2.5 mb-4 p-3 rounded-xl bg-surface-muted/40 border border-border/50">
            <MessageSquareQuote size={15} className="text-brand/60 shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap italic">
              &ldquo;{review.comment}&rdquo;
            </p>
          </div>
        ) : (
          <div className="mb-4 px-3 py-2 rounded-xl border border-dashed border-border/50 text-xs text-text-muted italic text-center">
            {t('reviewManagement.noComment')}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
          <time className="text-[11px] text-text-muted font-medium">
            {new Date(review.createdAt).toLocaleDateString(i18n.language, {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </time>

          <div className="flex items-center gap-2">
            {isHidden ? (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                <EyeOff size={10} /> {t('reviewManagement.hidden')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                <Eye size={10} /> {t('reviewManagement.active')}
              </span>
            )}

            {direction === 'received' && review.hasOpenReport && (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-600 border border-amber-400/20">
                <Flag size={10} /> {t('reviewManagement.reported')}
              </span>
            )}
            {direction === 'received' && !review.hasOpenReport && !isHidden && (
              <button
                className="flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/8"
                onClick={() => onReport(review)}
              >
                <Flag size={12} />
                {t('reviewManagement.report')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyReviewsScreen() {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);

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
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
    );
  }, []);

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
    setReportSuccess(true);
    setTimeout(() => {
      setReporting(null);
      setReason('');
      setReportSuccess(false);
      void loadReviews();
    }, 1500);
  };

  const closeReportModal = () => {
    setReporting(null);
    setReason('');
    setReportSuccess(false);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-12">

        {/* Header */}
        <div ref={headerRef} className="mb-8">
          <p className="text-[11px] font-black text-brand uppercase tracking-widest mb-1">
            Đánh giá của tôi
          </p>
          <h1 className="text-3xl font-black text-text-primary mb-1.5">
            {t('reviewManagement.title')}
          </h1>
          <p className="text-text-secondary text-sm max-w-lg">
            {t('reviewManagement.subtitle')}
          </p>
        </div>

        {/* Direction tabs */}
        <div
          className="flex gap-1.5 p-1.5 rounded-2xl border border-border bg-surface-card/60 mb-6"
          style={{ backdropFilter: 'blur(10px)' }}
          role="tablist"
        >
          {(['received', 'sent'] as Direction[]).map(dir => (
            <button
              key={dir}
              role="tab"
              aria-selected={direction === dir}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                direction === dir
                  ? 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white shadow-md shadow-brand/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
              }`}
              onClick={() => selectDirection(dir)}
            >
              {dir === 'received' ? <Star size={15} /> : <MessageSquareQuote size={15} />}
              {dir === 'received' ? t('reviewManagement.received') : t('reviewManagement.sent')}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 mb-4 p-3.5 rounded-xl bg-red-500/8 border border-red-500/25 text-red-500 text-sm font-semibold">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl border border-border bg-surface-card/60 animate-pulse opacity-50" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
              <Star size={28} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">
              {direction === 'received' ? 'Chưa có đánh giá nào' : 'Bạn chưa gửi đánh giá nào'}
            </h3>
            <p className="text-text-muted text-sm max-w-xs">
              {t('reviewManagement.empty')}
            </p>
          </div>
        )}

        {/* Review cards */}
        {!loading && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((review, i) => (
              <ReviewCard
                key={review.reviewId}
                review={review}
                direction={direction}
                onReport={setReporting}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface-card/80 text-sm font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={14} />
              {t('reviewManagement.previous')}
            </button>

            <span className="text-sm font-black px-3 py-2 rounded-xl bg-brand/10 border border-brand/20 text-brand">
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface-card/80 text-sm font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('reviewManagement.next')}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Report modal */}
      {reporting && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          onMouseDown={closeReportModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface-card shadow-2xl p-6"
            style={{ backdropFilter: 'blur(20px)' }}
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-all"
              onClick={closeReportModal}
            >
              <X size={16} />
            </button>

            {reportSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                  <CheckCircle2 size={24} />
                </div>
                <h2 className="text-lg font-black text-text-primary">Đã gửi báo cáo!</h2>
                <p className="text-sm text-text-secondary">Chúng tôi sẽ xem xét đánh giá này sớm nhất có thể.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <Flag size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-text-primary">{t('reviewManagement.reportTitle')}</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t('reviewManagement.reportDescription', { name: reporting.reviewerName })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-text-primary uppercase tracking-wide">
                      {t('reviewManagement.reportType')}
                    </label>
                    <select
                      value={reportType}
                      onChange={e => setReportType(Number(e.target.value) as ReportType)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-muted text-text-primary text-sm font-semibold outline-none focus:border-brand/50 transition-colors"
                    >
                      {reportTypes.map(type => (
                        <option key={type} value={type}>
                          {REPORT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-text-primary uppercase tracking-wide">
                      {t('reviewManagement.reason')}
                    </label>
                    <textarea
                      maxLength={2000}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Mô tả chi tiết lý do báo cáo..."
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-muted text-text-primary text-sm resize-none outline-none focus:border-brand/50 transition-colors"
                      rows={4}
                    />
                    <p className="text-right text-[11px] text-text-muted">{reason.length}/2000</p>
                  </div>
                </div>

                <div className="flex gap-2.5 mt-5">
                  <button
                    className="flex-1 py-2.5 rounded-xl border border-border text-text-primary text-sm font-bold hover:bg-surface-muted transition-all"
                    onClick={closeReportModal}
                  >
                    {t('reviewManagement.cancel')}
                  </button>
                  <button
                    disabled={submittingReport || reason.trim().length < 10}
                    onClick={() => void submitReport()}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingReport ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Flag size={14} />
                    )}
                    {submittingReport ? t('reviewManagement.reporting') : t('reviewManagement.submitReport')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
