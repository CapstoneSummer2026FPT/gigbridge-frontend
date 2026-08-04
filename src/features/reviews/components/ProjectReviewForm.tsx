import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Star, UserRound } from 'lucide-react';
import { reviewPostAPI } from '../../../api/reviewAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ContractDto } from '../../../types/models/Contract';
import type { Review } from '../../../types/models/Job';
import { UserRole } from '../../../types/models/User';

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

  return (
    <fieldset className="review-rating-row">
      <legend>{label}</legend>
      <div className="review-stars" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={t('reviews.starAria', { star })}
            onClick={() => onChange(star)}
            className={star <= value ? 'active' : ''}
          >
            <Star size={24} fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
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
    () => communicationRating && qualityRating && timelinessRating
      ? (communicationRating + qualityRating + timelinessRating) / 3
      : 0,
    [communicationRating, qualityRating, timelinessRating],
  );
  const roundedRating = criteriaAverage ? Math.round(criteriaAverage) : 0;
  const allCriteriaSelected = communicationRating > 0 && qualityRating > 0 && timelinessRating > 0;

  const submitReview = async () => {
    setError('');
    if (!allCriteriaSelected) {
      setError(t('reviews.criteriaRequired'));
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
      setError(response.message || t('reviews.submitError'));
      return;
    }

    onSubmitted(response.data);
  };

  return (
    <div className="review-form">
      <div className="review-context-grid">
        <div className="review-context">
          <div className="review-context-icon"><UserRound size={22} /></div>
          <div>
            <span>{t(isClient ? 'reviews.reviewFreelancer' : 'reviews.reviewClient')}</span>
            <strong>{revieweeName}</strong>
          </div>
        </div>
        <div className="review-context review-project-context">
          <div className="review-context-icon"><BriefcaseBusiness size={22} /></div>
          <div>
            <span>{t('reviews.project')}</span>
            <strong>{projectTitle}</strong>
          </div>
        </div>
      </div>

      <div className="review-overall-summary" aria-live="polite">
        <span>{t('reviews.overallScore')}</span>
        <strong>{criteriaAverage ? criteriaAverage.toFixed(1) : '0.0'}</strong>
        <div className="review-summary-stars" aria-hidden="true">
          {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} size={18} fill={star <= roundedRating ? 'currentColor' : 'none'} />
          ))}
        </div>
        <small>{t('reviews.overallHint')}</small>
      </div>

      <div className="review-subratings">
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

      <label className="review-comment-field">
        <span>{t('reviews.comment')}</span>
        <textarea
          value={comment}
          maxLength={1000}
          onChange={event => setComment(event.target.value)}
          placeholder={t(isClient ? 'reviews.clientCommentPlaceholder' : 'reviews.freelancerCommentPlaceholder')}
        />
      </label>
      <span className="review-count">{comment.length}/1000</span>

      <p className="review-identity-note">{t('reviews.identityNotice')}</p>
      {error && <p className="review-error" role="alert">{error}</p>}

      <div className="review-form-actions">
        {onCancel && (
          <button type="button" className="review-cancel" onClick={onCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </button>
        )}
        <button type="button" className="review-submit" onClick={submitReview} disabled={isSubmitting}>
          {isSubmitting ? t('reviews.submitting') : t('reviews.submit')}
        </button>
      </div>
    </div>
  );
}
