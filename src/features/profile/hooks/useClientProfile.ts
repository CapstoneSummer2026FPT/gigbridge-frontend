import { useState, useEffect } from 'react';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { reviewGetAPI } from '../../../api/reviewAPI/GET';
import type { Review } from '../../../types/models/Job';

type ReviewViewModel = {
  id: string;
  contractId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  createdAt: string;
};

const toReviewViewModel = (review: Review): ReviewViewModel => ({
  id: review.reviewId ?? review.id ?? `${review.contractId ?? 'review'}-${review.createdAt}`,
  contractId: review.contractId ?? '',
  reviewerId: review.reviewerId,
  reviewerName: review.reviewerName ?? 'Anonymous Reviewer',
  revieweeId: review.revieweeId,
  rating: review.rating,
  comment: review.comment ?? '',
  isAnonymous: Boolean(review.isAnonymous),
  createdAt: review.createdAt,
});

const resolveEloPoints = (data: {
  profile?: { eloPoints?: unknown };
  user?: { elo_points?: unknown };
}): number => {
  const raw = data.profile?.eloPoints ?? data.user?.elo_points;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 100;
};

const emptyProfileData = (targetId: string) => ({
  user: {
    id: targetId,
    full_name: '',
    avatar: '',
    email: '',
    phone_number: '',
    elo_points: 100,
  },
  profile: {
    user_id: targetId,
    company_name: '',
    company_website: '',
    company_size: 0,
    industry: '',
    company_description: '',
    location: '',
    avatar: '',
    eloPoints: 100,
    createdAt: '',
  },
});

export function useClientProfile(targetId: string) {
  const [profileData, setProfileData] = useState(() => emptyProfileData(targetId));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic reviews list state
  const [reviewsList, setReviewsList] = useState<ReviewViewModel[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await profileGetAPI.getClientProfile(targetId);
        if (res.success && res.data) {
          const apiData = res.data;
          setProfileData({
            user: {
              id: apiData.userId,
              full_name: apiData.userFullName || '',
              avatar: apiData.userAvatar || '',
              email: apiData.userEmail || '',
              phone_number: '',
              elo_points: apiData.eloPoints ?? 100,
            },
            profile: {
              user_id: apiData.userId,
              company_name: apiData.companyName || '',
              company_website: apiData.companyWebsite || '',
              company_size: apiData.companySize ?? 0,
              industry: apiData.industry || '',
              company_description: apiData.companyDescription || '',
              location: apiData.location || '',
              avatar: apiData.userAvatar || '',
              eloPoints: apiData.eloPoints ?? 100,
              createdAt: apiData.createdAt,
            }
          });
        } else {
          setProfileData(emptyProfileData(targetId));
          setError(res.message || 'Client profile could not be loaded.');
        }
      } catch (err: unknown) {
        setProfileData(emptyProfileData(targetId));
        setError(err instanceof Error ? err.message : 'Client profile could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetId]);

  // Sync reviews list on targetId load
  useEffect(() => {
    const fetchReviews = async (): Promise<void> => {
      try {
        const response = await reviewGetAPI.getReviewsByUser(targetId);
        const reviews = response.success && response.data ? response.data : [];
        setReviewsList(
          reviews
            .map(toReviewViewModel)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      } catch {
        setReviewsList([]);
      } finally {
        setCurrentPage(1);
      }
    };

    fetchReviews();
  }, [targetId]);

  const averageRating = reviewsList.length
    ? reviewsList.reduce((sum, review) => sum + review.rating, 0) / reviewsList.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviewsList.filter(r => r.rating === star).length;
    const percentage = reviewsList.length ? (count / reviewsList.length) * 100 : 0;
    return { star, count, percentage };
  });

  const reviewsPerPage = 2;
  const totalPages = Math.max(1, Math.ceil(reviewsList.length / reviewsPerPage));
  const paginatedReviews = reviewsList.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

  const eloPoints = resolveEloPoints(profileData);
  const eloRingPercent = Math.min(100, Math.max(0, (eloPoints / 300) * 100));

  return {
    loading,
    error,
    profileData,
    eloPoints,
    eloRingPercent,
    showMoreMenu,
    currentPage,
    reviewsList,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    setShowMoreMenu,
    setCurrentPage,
  };
}
