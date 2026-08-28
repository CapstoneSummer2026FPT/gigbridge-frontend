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
    <div className="flex flex-col justify-between gap-1 p-2 sm:p-2.5 rounded-xl bg-surface-muted/60 border border-border/60 min-w-0">
      <span className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-wide truncate">{label}</span>
      <div className="flex items-center justify-between gap-1">
        <StarRow value={v} />
        <span className="text-[11px] sm:text-xs font-black text-amber-400">{v.toFixed(1)}</span>
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

      <div className="p-4 sm:p-5">
        {/* Top row: project + score */}
        <div className="flex items-start justify-between gap-3 mb-3.5 sm:mb-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Briefcase size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">
                {t('reviewManagement.project')}
              </p>
              <p className="text-xs sm:text-sm font-bold text-text-primary break-words">
                {review.projectTitle}
              </p>
            </div>
          </div>

          {/* Overall score badge */}
          <div className="shrink-0 flex flex-col items-center gap-0.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-400/10 border border-amber-400/25">
            <span className="text-lg sm:text-xl font-black text-amber-400 leading-none">{review.rating.toFixed(1)}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={9}
                  className={`sm:w-2.5 sm:h-2.5 ${i <= filledStars ? 'text-amber-400' : 'text-amber-400/20'}`}
                  fill={i <= filledStars ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Counterparty */}
        <div className="flex items-center gap-2.5 mb-3.5 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-surface-muted border border-border/60">
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
                <span className="text-xs sm:text-sm font-bold text-text-secondary italic">Người dùng ẩn danh</span>
              ) : (
                <UserProfileLink
                  userId={counterpartyId}
                  role={counterpartyRole}
                  className="text-xs sm:text-sm font-bold text-text-primary hover:text-brand transition-colors truncate max-w-[200px] sm:max-w-none"
                >
                  {counterpartyName}
                </UserProfileLink>
              )}
              <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full ${
                counterpartyRole === UserRole.Freelancer
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
              }`}>
                {counterpartyRole === UserRole.Freelancer ? 'Freelancer' : 'Client'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5">
              {direction === 'received' ? 'Đã đánh giá bạn' : 'Được bạn đánh giá'}
            </p>
          </div>
        </div>

        {/* Rating criteria */}
        <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-3.5 sm:mb-4">
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
          <div className="flex gap-2 sm:gap-2.5 mb-3.5 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-surface-muted border border-border/60">
            <MessageSquareQuote size={15} className="text-brand/60 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap italic break-words flex-1">
              &ldquo;{review.comment}&rdquo;
            </p>
          </div>
        ) : (
          <div className="mb-3.5 sm:mb-4 px-3 py-2 rounded-xl border border-dashed border-border/60 text-xs text-text-muted italic text-center">
            {t('reviewManagement.noComment')}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
          <time className="text-[11px] text-text-muted font-medium">
            {new Date(review.createdAt).toLocaleDateString(i18n.language, {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </time>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
                className="flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10 min-h-[30px] cursor-pointer"
                onClick={() => onReport(review)}
              >
                <Flag size={12} />
                <span>{t('reviewManagement.report')}</span>
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-12 min-w-0">

        {/* Header */}
        <div ref={headerRef} className="mb-6 sm:mb-8">
          <p className="text-[10px] sm:text-[11px] font-black text-brand uppercase tracking-widest mb-1">
            Đánh giá của tôi
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-1.5">
            {t('reviewManagement.title')}
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm max-w-lg">
            {t('reviewManagement.subtitle')}
          </p>
        </div>

        {/* Direction tabs */}
        <div
          className="flex gap-1.5 p-1.5 rounded-2xl border border-border bg-surface mb-6 shadow-xs"
          role="tablist"
        >
          {(['received', 'sent'] as Direction[]).map(dir => (
            <button
              key={dir}
              role="tab"
              aria-selected={direction === dir}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 min-h-[42px] cursor-pointer ${
                direction === dir
                  ? 'bg-brand text-brand-foreground shadow-md shadow-brand/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
              onClick={() => selectDirection(dir)}
            >
              {dir === 'received' ? <Star size={15} /> : <MessageSquareQuote size={15} />}
              <span>{dir === 'received' ? t('reviewManagement.received') : t('reviewManagement.sent')}</span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm font-semibold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl border border-border bg-surface animate-pulse opacity-60" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3 sm:mb-4">
              <Star size={26} className="sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary mb-1">
              {direction === 'received' ? 'Chưa có đánh giá nào' : 'Bạn chưa gửi đánh giá nào'}
            </h3>
            <p className="text-text-muted text-xs sm:text-sm max-w-xs">
              {t('reviewManagement.empty')}
            </p>
          </div>
        )}

        {/* Review cards */}
        {!loading && reviews.length > 0 && (
          <div className="space-y-3.5 sm:space-y-4">
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
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl border border-border bg-surface text-xs sm:text-sm font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[38px] cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{t('reviewManagement.previous')}</span>
            </button>

            <span className="text-xs sm:text-sm font-black px-3 py-2 rounded-xl bg-brand/10 border border-brand/20 text-brand min-h-[38px] flex items-center justify-center">
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl border border-border bg-surface text-xs sm:text-sm font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[38px] cursor-pointer"
            >
              <span>{t('reviewManagement.next')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ Canonical Theme Report Review Modal (Opaque Solid Theme Surfaces) ════════════════════ */}
      {reporting && (
        <div
          role="presentation"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeReportModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-review-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl p-5 sm:p-6 my-auto text-text-primary"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                  <Flag size={18} />
                </div>
                <div>
                  <h3 id="report-review-title" className="text-base sm:text-lg font-bold text-text-primary">
                    {t('reviewManagement.reportTitle', 'Báo cáo đánh giá')}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Gửi yêu cầu kiểm duyệt đánh giá của <span className="font-semibold text-text-primary">{reporting.reviewerName}</span> tới ban quản trị
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                className="p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
                aria-label={t('common.close', 'Đóng')}
              >
                <X size={16} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-success/10 text-success border border-success/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-base font-bold text-text-primary">Đã gửi báo cáo thành công</h4>
                <p className="text-xs text-text-secondary">
                  Ban quản trị sẽ xem xét và xử lý đánh giá này theo tiêu chuẩn cộng đồng.
                </p>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); void submitReport(); }} className="space-y-4">
                {/* Context Review Snippet */}
                <div className="p-3.5 rounded-xl bg-surface-muted border border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-text-primary">
                    <span className="truncate">{reporting.reviewerName} • {reporting.projectTitle}</span>
                    <span className="text-amber-400 font-bold shrink-0 ml-2">★ {reporting.rating.toFixed(1)}</span>
                  </div>
                  {reporting.comment && (
                    <p className="text-text-muted italic line-clamp-2 leading-relaxed bg-surface p-2 rounded-lg border border-border/40">
                      &ldquo;{reporting.comment}&rdquo;
                    </p>
                  )}
                </div>

                {/* Reason Type Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary block">
                    {t('reviewManagement.reportType', 'Lý do báo cáo')} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(Number(e.target.value) as ReportType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-text-primary text-xs sm:text-sm font-semibold outline-none focus:border-brand transition-colors cursor-pointer"
                  >
                    {reportTypes.map(type => (
                      <option key={type} value={type}>
                        {REPORT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary">
                      {t('reviewManagement.reason', 'Mô tả chi tiết')} <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-text-muted">
                      {reason.length}/2000
                    </span>
                  </div>
                  <textarea
                    maxLength={2000}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Mô tả cụ thể lý do đánh giá này vi phạm tiêu chuẩn (tối thiểu 10 ký tự)..."
                    className="w-full p-3.5 rounded-xl border border-border bg-background text-text-primary text-xs sm:text-sm resize-none outline-none focus:border-brand transition-colors font-sans leading-relaxed"
                    rows={4}
                  />
                  {reason.length > 0 && reason.trim().length < 10 && (
                    <p className="text-[11px] text-amber-500 font-medium">Vui lòng nhập tối thiểu 10 ký tự.</p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={closeReportModal}
                  >
                    {t('reviewManagement.cancel', 'Hủy')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport || reason.trim().length < 10}
                    className="px-5 py-2.5 rounded-xl bg-destructive hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {submittingReport ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Flag size={13} />
                    )}
                    <span>{submittingReport ? t('reviewManagement.reporting', 'Đang gửi...') : t('reviewManagement.submitReport', 'Gửi báo cáo')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
