import { useState, useEffect, type FormEvent } from 'react';
import { DB } from '../../../mock_backend';
import { SEED_CLIENT_PROFILES } from '../../../mock_backend/database/seed';
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

export function useClientProfile(targetId: string, currentUser: any) {
  const [profileData, setProfileData] = useState(() => {
    const defaultUser = (currentUser && currentUser.id === targetId)
      ? {
          id: currentUser.id,
          full_name: currentUser.full_name || 'Client User',
          avatar: currentUser.avatar || null,
          email: currentUser.email || '',
          phone_number: currentUser.phone_number || '',
        }
      : (DB.getUserById(targetId) || DB.getUserById('u_client_1')!);

    const defaultProfile = SEED_CLIENT_PROFILES.find(p => p.user_id === targetId) || {
      user_id: targetId,
      company_name: 'Company Name',
      company_website: null,
      company_size: 0,
      industry: 'Technology',
      company_description: '',
      location: 'San Francisco, CA',
      avatar: (currentUser && currentUser.id === targetId) ? currentUser.avatar : null,
    };

    return {
      user: defaultUser,
      profile: defaultProfile
    };
  });

  const [loading, setLoading] = useState(true);
  const [trustScore] = useState(88);
  const [isSaved, setIsSaved] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic reviews list state
  const [reviewsList, setReviewsList] = useState<ReviewViewModel[]>([]);

  // Create Review popup states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await profileGetAPI.getClientProfile(targetId);
        if (res.success && res.data) {
          const apiData = res.data;
          setProfileData({
            user: {
              id: apiData.userId,
              full_name: apiData.userFullName || 'Client User',
              avatar: apiData.userAvatar,
              email: apiData.userEmail || '',
              phone_number: '',
            },
            profile: {
              user_id: apiData.userId,
              company_name: apiData.companyName || 'Company Name',
              company_website: apiData.companyWebsite,
              company_size: apiData.companySize,
              industry: apiData.industry || 'Technology',
              company_description: apiData.companyDescription || '',
              location: apiData.location || 'San Francisco, CA',
              avatar: apiData.userAvatar,
            }
          });
        } else {
          if (currentUser && currentUser.id === targetId) {
            setProfileData(prev => ({
              ...prev,
              user: {
                id: currentUser.id,
                full_name: currentUser.full_name || 'Client User',
                avatar: currentUser.avatar || null,
                email: currentUser.email || '',
                phone_number: currentUser.phone_number || '',
              }
            }));
          }
        }
      } catch (err) {
        console.warn('API getClientProfile fallback to mock:', err);
        if (currentUser && currentUser.id === targetId) {
          setProfileData(prev => ({
            ...prev,
            user: {
              id: currentUser.id,
              full_name: currentUser.full_name || 'Client User',
              avatar: currentUser.avatar || null,
              email: currentUser.email || '',
              phone_number: currentUser.phone_number || '',
            }
          }));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetId, currentUser]);

  // Sync reviews list on targetId load
  useEffect(() => {
    const fetchReviews = async (): Promise<void> => {
      const response = await reviewGetAPI.getReviewsByUser(targetId);
      const reviews = response.success && response.data ? response.data : [];
      setReviewsList(
        reviews
          .map(toReviewViewModel)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setCurrentPage(1);
    };

    fetchReviews();
  }, [targetId]);

  const handleSaveClient = () => {
    setIsSaved(!isSaved);
  };

  const handleAddReview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.alert('Please submit reviews from a completed contract so the review can be linked to ELO correctly.');
    setReviewComment('');
    setReviewRating(5);
    setReviewAnonymous(false);
    setShowReviewModal(false);
  };

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

  const jobs = DB.getJobsByClient(targetId);

  return {
    loading,
    profileData,
    trustScore,
    isSaved,
    showMoreMenu,
    currentPage,
    reviewsList,
    showReviewModal,
    reviewRating,
    reviewComment,
    reviewAnonymous,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    jobs,
    setIsSaved,
    setShowMoreMenu,
    setCurrentPage,
    setReviewRating,
    setReviewComment,
    setReviewAnonymous,
    setShowReviewModal,
    handleSaveClient,
    handleAddReview,
  };
}
