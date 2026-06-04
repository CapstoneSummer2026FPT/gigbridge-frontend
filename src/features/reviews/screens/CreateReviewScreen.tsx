import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Star } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { getStoredReviews, saveStoredReviews, type ReviewViewModel } from '../mock/data-for-Reviews';
import '../styles/reviews-screen.css';

export default function CreateReviewScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useApp();
  const contractId = params.get('contract') || 'contract_1';
  const revieweeId = params.get('reviewee') || 'u_freelancer_1';
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reviews = useMemo(() => getStoredReviews(), []);
  const alreadyReviewed = reviews.some(review => review.contractId === contractId && review.reviewerId === (user?.id || 'current_user'));

  const submitReview = () => {
    setError('');
    setSuccess('');

    if (alreadyReviewed) {
      setError('MSG54: You have already reviewed this contract');
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('MSG42: Please select a rating (1-5 stars)');
      return;
    }

    if (comment.length > 1000) {
      setError('MSG43: Review must be under 1000 characters');
      return;
    }

    const newReview: ReviewViewModel = {
      id: `rev_${Date.now()}`,
      contractId,
      reviewerId: user?.id || 'current_user',
      reviewerName: user?.full_name || 'Current User',
      revieweeId,
      rating,
      comment,
      isAnonymous,
      createdAt: new Date().toISOString(),
    };

    saveStoredReviews([newReview, ...reviews]);
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

          <button className="review-submit" onClick={submitReview}>Submit Review</button>
        </div>
      </div>
    </AppLayout>
  );
}
