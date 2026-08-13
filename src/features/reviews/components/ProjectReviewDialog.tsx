import { useEffect, useMemo, useState } from 'react';
import { X, CalendarDays, BadgeCheck, ArrowRight, ShieldCheck, BriefcaseBusiness } from 'lucide-react';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { reviewPostAPI } from '../../../api/reviewAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { ContractDto } from '../../../types/models/Contract';
import type { Review } from '../../../types/models/Job';
import { UserRole } from '../../../types/models/User';

interface ProjectReviewDialogProps {
  open: boolean;
  contract: ContractDto | null;
  role: UserRole;
  onClose: () => void;
  onSubmitted: (review: Review) => void;
}

// ── Circular SVG Dial ───────────────────────────────────────────────────────
function TrustDial({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  // score 0-5 → dashOffset from circumference (0%) to 0 (100%)
  const fillRatio = score / 5;
  const dashOffset = circumference * (1 - fillRatio);

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 100 100">
        {/* Track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center leading-none">
        <span className="text-4xl font-black text-brand tabular-nums">
          {score > 0 ? score.toFixed(1) : '—'}
        </span>
        <span className="text-xs font-bold text-text-muted mt-1">/ 5.0</span>
      </div>
    </div>
  );
}

// ── Metric Slider Row ──────────────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  ariaLabel: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, icon, value, ariaLabel, onChange }: SliderRowProps) {
  const pct = value > 0 ? ((value - 1) / 4) * 100 : 0;
  const trackStyle = value > 0
    ? {
        background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${pct}%, var(--surface-muted) ${pct}%, var(--surface-muted) 100%)`,
      }
    : { background: 'var(--surface-muted)' };

  return (
    <div className="space-y-3.5 pb-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <span className="text-brand">{icon}</span>
          {label}
        </label>
        <span className="text-sm font-black text-brand">
          {value > 0 ? value : '—'}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value > 0 ? value : 1}
          aria-label={ariaLabel}
          onChange={e => onChange(Number(e.target.value))}
          onClick={() => { if (value === 0) onChange(1); }}
          className="review-slider w-full h-2 rounded-full appearance-none cursor-pointer"
          style={trackStyle}
        />
      </div>
    </div>
  );
}

// ── Main Dialog ─────────────────────────────────────────────────────────────
export function ProjectReviewDialog({ open, contract, role, onClose, onSubmitted }: ProjectReviewDialogProps) {
  const { t } = useTranslation();
  const isClient = role === UserRole.Client;

  const revieweeName = isClient
    ? contract?.freelancerName || contract?.freelancerEmail || t('reviews.freelancerFallback')
    : contract?.clientName || contract?.clientEmail || t('reviews.clientFallback');
  const projectTitle = contract?.jobTitle ?? contract?.title;
  const revieweeRole = isClient ? 'Freelancer' : 'Client';

  const [communicationRating, setCommunicationRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [revieweeAvatarUrl, setRevieweeAvatarUrl] = useState<string | null>(null);

  const criteriaAverage = useMemo(
    () =>
      communicationRating && qualityRating && timelinessRating
        ? (communicationRating + qualityRating + timelinessRating) / 3
        : 0,
    [communicationRating, qualityRating, timelinessRating],
  );
  const roundedRating = criteriaAverage ? Math.round(criteriaAverage) : 0;
  const allRated = communicationRating > 0 && qualityRating > 0 && timelinessRating > 0;

  // Fetch reviewee avatar when dialog opens
  useEffect(() => {
    if (!open || !contract) return;
    const revieweeUserId = isClient ? contract.freelancerUserId : contract.clientUserId;
    if (!revieweeUserId) return;
    profileGetAPI.getUserById(revieweeUserId).then(res => {
      if (res.success && res.data?.avatar) setRevieweeAvatarUrl(res.data.avatar);
    }).catch(() => { /* silently ignore, fallback to initials */ });
  }, [open, contract, isClient]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  if (!open || !contract) return null;

  const submitReview = async () => {
    setError('');
    if (!allRated) { setError(t('reviews.criteriaRequired')); return; }
    setIsSubmitting(true);
    const response = await reviewPostAPI.createReview({
      contractId: contract.contractsId,
      rating: roundedRating,
      comment: comment.trim() || null,
      communicationRating,
      qualityRating,
      timelinessRating,
      isAnonymous: false,
    });
    setIsSubmitting(false);
    if (!response.success || !response.data) {
      setError(response.message || t('reviews.submitError'));
      return;
    }
    onSubmitted(response.data);
  };

  return (
    <div
      role="presentation"
      className="review-dialog-backdrop fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-review-title"
        onClick={e => e.stopPropagation()}
        className="review-dialog relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-border/80 bg-background text-text-primary backdrop-blur-2xl my-auto"
      >
        {/* ═══ LEFT COLUMN: Context ═══════════════════════════════════════ */}
        <div className="review-dialog-left w-full lg:w-5/12 p-6 sm:p-8 lg:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/60 bg-surface-card/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-black uppercase tracking-widest mb-8">
              <BadgeCheck size={13} />
              Project Completed
            </div>

            <h1 id="project-review-title" className="text-2xl font-black text-text-primary mb-1">
              {t('reviews.title')}
            </h1>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('reviews.subtitle')}
            </p>
          </div>

          {/* Avatar hero */}
          <div className="relative z-10 flex flex-col items-center my-8">
            <div className="relative w-32 h-32 mb-5 flex-shrink-0">
              {/* Glow halo – sized relative to parent now */}
              <div className="absolute -inset-4 rounded-full bg-brand/20 blur-2xl animate-pulse pointer-events-none" />
              {/* Avatar wrapper – block element with fixed size */}
              <div className="relative z-10 w-32 h-32 rounded-full overflow-hidden ring-4 ring-background shadow-2xl border-2 border-brand/20">
                <UserAvatar
                  name={revieweeName ?? ''}
                  src={revieweeAvatarUrl}
                  size="xl"
                  className="!w-full !h-full !text-4xl !rounded-none"
                />
              </div>
            </div>
            <h2 className="text-lg font-black text-text-primary">{revieweeName}</h2>
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-0.5">{revieweeRole}</span>
          </div>

          {/* Project card */}
          <div className="relative z-10 rounded-2xl border border-border/70 bg-surface-card p-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand mb-2">
              <BriefcaseBusiness size={13} />
              Project Details
            </div>
            <p className="text-sm font-bold text-text-primary leading-snug">{projectTitle}</p>
            {contract.startDate && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-text-muted font-medium">
                <CalendarDays size={14} />
                <span>{contract.startDate}</span>
              </div>
            )}
          </div>

          {/* Close button (mobile) */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute top-5 right-5 lg:hidden p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ═══ RIGHT COLUMN: Interactive Form ════════════════════════════ */}
        <div className="review-dialog-right w-full lg:w-7/12 p-8 lg:p-10 bg-background relative">
          {/* Desktop close */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="hidden lg:flex absolute top-5 right-5 p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
          >
            <X size={16} />
          </button>

          <form className="flex flex-col h-full max-w-lg mx-auto gap-8" onSubmit={e => e.preventDefault()}>
            {/* Trust Dial */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                {t('reviews.overallScore')}
              </span>
              <TrustDial score={criteriaAverage} />
            </div>

            {/* Sliders */}
            <div className="space-y-10 sm:space-y-12" role="group" aria-label="Rating criteria">
              <fieldset className="border-none p-0 m-0">
                <legend className="sr-only">{t('reviews.communication')}</legend>
                <SliderRow
                  label={t('reviews.communication')}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  value={communicationRating}
                  ariaLabel={t('reviews.communication')}
                  onChange={setCommunicationRating}
                />
              </fieldset>

              <fieldset className="border-none p-0 m-0">
                <legend className="sr-only">{t(isClient ? 'reviews.workQuality' : 'reviews.requirementClarity')}</legend>
                <SliderRow
                  label={t(isClient ? 'reviews.workQuality' : 'reviews.requirementClarity')}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                  value={qualityRating}
                  ariaLabel={t(isClient ? 'reviews.workQuality' : 'reviews.requirementClarity')}
                  onChange={setQualityRating}
                />
              </fieldset>

              <fieldset className="border-none p-0 m-0">
                <legend className="sr-only">{t(isClient ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')}</legend>
                <SliderRow
                  label={t(isClient ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                  value={timelinessRating}
                  ariaLabel={t(isClient ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')}
                  onChange={setTimelinessRating}
                />
              </fieldset>
            </div>

            {/* Feedback textarea */}
            <div className="relative group">
              <div className="relative bg-surface-card rounded-2xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all shadow-xs">
                <label htmlFor="review-feedback" className="sr-only">{t('reviews.comment')}</label>
                <textarea
                  id="review-feedback"
                  value={comment}
                  maxLength={1000}
                  rows={4}
                  onChange={e => setComment(e.target.value)}
                  placeholder={t(isClient ? 'reviews.clientCommentPlaceholder' : 'reviews.freelancerCommentPlaceholder')}
                  className="w-full bg-transparent border-none resize-none p-5 text-sm font-bold text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-0 font-sans"
                />
                <div className="flex items-center justify-between px-5 pb-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
                    <ShieldCheck size={13} className="text-brand" />
                    {t('reviews.identityNotice')}
                  </div>
                  <span className="review-count text-[11px] text-text-muted font-bold">{comment.length}/1000</span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="review-error text-sm font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3" role="alert">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="review-form-actions flex items-center gap-3 mt-auto pt-2">
              <button
                type="button"
                className="review-cancel px-6 py-3.5 rounded-xl text-xs font-black text-brand bg-brand/10 hover:bg-brand/15 border border-brand/20 transition-all duration-200 cursor-pointer w-1/3"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="review-submit flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black text-brand-foreground bg-brand hover:bg-brand-hover shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer w-2/3 group disabled:opacity-50"
                onClick={submitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('reviews.submit')}
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
