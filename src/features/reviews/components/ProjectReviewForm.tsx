import { useMemo, useState } from 'react';
import { BriefcaseBusiness, ShieldCheck, Send, Star } from 'lucide-react';
import { reviewPostAPI } from '../../../api/reviewAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { ContractDto } from '../../../types/models/Contract';
import type { Review } from '../../../types/models/Job';
import { UserRole } from '../../../types/models/User';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

interface ProjectReviewFormProps {
  contract: ContractDto;
  role: UserRole;
  onSubmitted: (review: Review) => void;
  onCancel?: () => void;
}

interface RatingInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function RatingInput({ label, value, onChange }: RatingInputProps) {
  const { t } = useTranslation();
  const [hoverValue, setHoverValue] = useState(0);
  const activeRating = hoverValue || value;

  return (
    <fieldset className="review-rating-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-muted/40 border border-border/60 hover:border-border transition-all duration-200 text-left m-0">
      <legend className="text-xs font-bold text-text-primary float-none mb-0 tracking-wide">{label}</legend>
      <div className="review-stars flex items-center gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map(star => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={t('reviews.starAria', { star })}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(0)}
              className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isFilled
                  ? 'text-amber-500 scale-110 active'
                  : 'text-text-muted/20 hover:text-amber-400/50 hover:scale-105'
              }`}
            >
              <Star
                size={22}
                className={`transition-all duration-200 ${
                  isFilled
                    ? 'fill-amber-500 text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]'
                    : 'stroke-[1.5]'
                }`}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProjectReviewForm({ contract, role, onSubmitted, onCancel }: ProjectReviewFormProps) {
  const { t } = useTranslation();
  const isClient = role === UserRole.Client;
  const revieweeName = isClient
    ? contract.freelancerName || contract.freelancerEmail || t('reviews.freelancerFallback')
    : contract.clientName || contract.clientEmail || t('reviews.clientFallback');
  const projectTitle = contract.jobTitle || contract.title;

  const [communicationRating, setCommunicationRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const criteriaAverage = useMemo(
    () =>
      communicationRating && qualityRating && timelinessRating
        ? (communicationRating + qualityRating + timelinessRating) / 3
        : 0,
    [communicationRating, qualityRating, timelinessRating],
  );
  const roundedRating = criteriaAverage ? Math.round(criteriaAverage) : 0;
  const allCriteriaSelected = communicationRating > 0 && qualityRating > 0 && timelinessRating > 0;

  const submitReview = async () => {
    setError('');
    if (!allCriteriaSelected) {
      const message = t('reviews.criteriaRequired');
      showValidationToast(message, { fallback: message });
      const groupIndex = communicationRating === 0 ? 0 : qualityRating === 0 ? 1 : 2;
      document.querySelectorAll<HTMLElement>('.review-form [role="radiogroup"] button')[groupIndex * 5]?.focus();
      return;
    }

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
      if (isValidationResponse(response)) {
        showValidationToast(response, { fallback: t('reviews.submitError') });
      } else {
        setError(response.message || t('reviews.submitError'));
      }
      return;
    }

    onSubmitted(response.data);
  };

  return (
    <div className="review-form space-y-5">
      {/* Context Grid - Partner & Project */}
      <div className="review-context-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="review-context flex items-center gap-3.5 p-4 rounded-2xl bg-surface-muted/50 border border-border/60 text-left">
          <UserAvatar name={revieweeName} size="md" className="shrink-0 ring-2 ring-brand/20 shadow-xs" />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand block mb-0.5">
              {t(isClient ? 'reviews.reviewFreelancer' : 'reviews.reviewClient')}
            </span>
            <strong className="text-xs font-black text-text-primary truncate block">{revieweeName}</strong>
          </div>
        </div>

        <div className="review-context review-project-context flex items-center gap-3.5 p-4 rounded-2xl bg-surface-muted/50 border border-border/60 text-left">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
            <BriefcaseBusiness size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-0.5">
              {t('reviews.project')}
            </span>
            <strong className="text-xs font-black text-text-primary truncate block">{projectTitle}</strong>
          </div>
        </div>
      </div>

      {/* Hero Score Summary Card */}
      <div className="review-overall-summary p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left shadow-xs" aria-live="polite">
        <div className="space-y-1">
          <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
            {t('reviews.overallScore')}
          </span>
          <div className="flex items-baseline gap-2">
            <strong className="text-3xl font-black text-amber-500 tracking-tight leading-none">
              {criteriaAverage ? criteriaAverage.toFixed(1) : '0.0'}
            </strong>
            <span className="text-xs text-text-muted font-bold">/ 5.0</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1 shrink-0">
          <div className="review-summary-stars flex items-center gap-1.5 text-amber-500" aria-hidden="true">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={22}
                className={
                  star <= roundedRating
                    ? 'fill-amber-500 text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.3)]'
                    : 'text-text-muted/20'
                }
              />
            ))}
          </div>
          <small className="text-[10px] text-text-muted font-semibold">{t('reviews.overallHint')}</small>
        </div>
      </div>

      {/* Sub-ratings Breakdown */}
      <div className="review-subratings space-y-2.5">
        <RatingInput label={t('reviews.communication')} value={communicationRating} onChange={setCommunicationRating} />
        <RatingInput
          label={t(isClient ? 'reviews.workQuality' : 'reviews.requirementClarity')}
          value={qualityRating}
          onChange={setQualityRating}
        />
        <RatingInput
          label={t(isClient ? 'reviews.onTimeDelivery' : 'reviews.approvalPaymentTimeliness')}
          value={timelinessRating}
          onChange={setTimelinessRating}
        />
      </div>

      {/* Written Comment Section */}
      <div className="space-y-1.5 text-left">
        <label className="review-comment-field block">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-extrabold text-text-primary">
              {t('reviews.comment')}
            </span>
            <span className="review-count text-[10px] font-bold text-text-muted">
              {comment.length}/1000
            </span>
          </div>
          <textarea
            value={comment}
            maxLength={1000}
            rows={3}
            onChange={event => setComment(event.target.value)}
            placeholder={t(isClient ? 'reviews.clientCommentPlaceholder' : 'reviews.freelancerCommentPlaceholder')}
            className="w-full p-4 rounded-2xl bg-surface/70 border border-border/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-xs text-text-primary placeholder:text-text-muted/50 outline-none transition-all duration-200 resize-none font-sans"
          />
        </label>
      </div>

      {/* Security & Identity Notice */}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-muted/60 border border-border/60 text-text-muted text-xs font-semibold text-left">
        <ShieldCheck size={18} className="shrink-0 text-brand" />
        <p className="review-identity-note text-[11px] leading-relaxed font-medium">{t('reviews.identityNotice')}</p>
      </div>

      {error && (
        <p className="review-error p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-left" role="alert">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="review-form-actions flex items-center justify-end gap-3 pt-3 border-t border-border/60">
        {onCancel && (
          <button
            type="button"
            className="review-cancel px-5 py-2.5 rounded-xl border border-border/80 bg-surface/60 hover:bg-surface-hover text-text-primary text-xs font-extrabold transition-all duration-200 cursor-pointer"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="button"
          className="review-submit px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-foreground text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
          onClick={submitReview}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('reviews.submitting')}
            </>
          ) : (
            <>
              <Send size={13} />
              {t('reviews.submit')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
