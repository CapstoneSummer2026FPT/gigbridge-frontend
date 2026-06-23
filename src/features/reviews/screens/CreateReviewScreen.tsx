import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Star } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { reviewPostAPI } from '../../../api/reviewAPI/POST';
import '../styles/reviews-screen.css';

export default function CreateReviewScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const contractId = params.get('contractId') ?? params.get('contract') ?? '';
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitReview = async () => {
    setError('');
    setSuccess('');

    if (!contractId) {
      setError('Contract id is required to submit a review.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('Please select a rating (1-5 stars)');
      return;
    }

    if (comment.length > 1000) {
      setError('Review must be under 1000 characters');
      return;
    }

    setIsSubmitting(true);
    const response = await reviewPostAPI.createReview({
      contractId,
      rating,
      comment,
      isAnonymous,
    });
    setIsSubmitting(false);

    if (!response.success) {
      setError(response.message || 'Could not submit review.');
      return;
    }

    setSuccess('Review submitted and rating updated.');
    window.setTimeout(() => navigate(-1), 900);
  };

  return (
    <AppLayout>
      <div className="review-create-page">
        <div className="review-create-card">
          <h1>Leave Review</h1>
          <p>Rate your completed contract partner. Anonymous reviews display as Anonymous User publicly.</p>

          <div className="review-stars">
            {[1, 2, 3, 4, 5].map(value => (
              <button key={value} onClick={() => setRating(value)} className={value <= rating ? 'active' : ''}>
                <Star size={28} fill={value <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          <label>
            Review Text
            <textarea value={comment} maxLength={1100} onChange={event => setComment(event.target.value)} placeholder="Share feedback..." />
          </label>
          <span className="review-count">{comment.length}/1000</span>

          <label className="review-anonymous">
            <input type="checkbox" checked={isAnonymous} onChange={event => setIsAnonymous(event.target.checked)} />
            Submit Anonymously
          </label>

          {error && <p className="review-error">{error}</p>}
          {success && <p className="review-success">{success}</p>}

          <button className="review-submit" onClick={submitReview} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
