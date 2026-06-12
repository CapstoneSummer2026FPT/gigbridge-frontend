import { useState, useEffect } from 'react';
import { DB } from '../../../mock_backend';
import { SEED_CLIENT_PROFILES } from '../../../mock_backend/database/seed';
import { getStoredReviews, saveStoredReviews, type ReviewViewModel } from '../../reviews/mock/data-for-Reviews';
import { profileGetAPI } from '../../../api/profileAPI/GET';

export function useClientProfile(targetId: string, currentUser: any) {
  const [profileData, setProfileData] = useState({
    user: DB.getUserById(targetId) || DB.getUserById('u_client_1')!,
    profile: SEED_CLIENT_PROFILES.find(p => p.user_id === targetId) || SEED_CLIENT_PROFILES[0],
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
        }
      } catch (err) {
        console.warn('API getClientProfile fallback to mock:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetId]);

  // Sync reviews list on targetId load
  useEffect(() => {
    setReviewsList(
      getStoredReviews()
        .filter(review => review.revieweeId === targetId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
    setCurrentPage(1);
  }, [targetId]);

  const handleSaveClient = () => {
    setIsSaved(!isSaved);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newReview: ReviewViewModel = {
      id: `rev_${Date.now()}`,
      contractId: 'contract_3',
      reviewerId: currentUser?.id || 'u_freelancer_1',
      reviewerName: currentUser?.full_name || 'Anonymous Freelancer',
      revieweeId: targetId,
      rating: reviewRating,
      comment: reviewComment.trim(),
      isAnonymous: reviewAnonymous,
      createdAt: new Date().toISOString(),
    };

    const updatedAll = [newReview, ...getStoredReviews()];
    saveStoredReviews(updatedAll);
    
    setReviewsList(updatedAll.filter(review => review.revieweeId === targetId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    
    setReviewComment('');
    setReviewRating(5);
    setReviewAnonymous(false);
    setShowReviewModal(false);
    setCurrentPage(1);
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
