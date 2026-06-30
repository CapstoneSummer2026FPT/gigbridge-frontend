import { useState, useEffect, type FormEvent } from 'react';
import { DB } from '../../../mock_backend';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { reviewGetAPI } from '../../../api/reviewAPI/GET';
import type { Review } from '../../../types/models/Job';
import type { CheatingPenaltyLogDto } from '../../../types/models/Profile';

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

const resolveEloPoints = (data: any): number => {
  const raw = data?.profile?.eloPoints ?? data?.profile?.EloPoints ?? data?.user?.elo_points ?? data?.user?.eloPoints ?? data?.user?.EloPoints;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 100;
};

export function useFreelancerProfile(targetId: string, currentUser: any) {
  const [profileData, setProfileData] = useState<any>({
    user: DB.getUserById(targetId) || DB.getUserById('u_freelancer_1')!,
    profile: SEED_FREELANCER_PROFILES.find(p => p.user_id === targetId) || SEED_FREELANCER_PROFILES[0],
    skills: ['React', 'TypeScript', 'Node.js', 'UI/UX Design', 'Figma', 'Tailwind CSS'],
    experience: [
      { company: 'Tech Startup', title: 'Senior Developer', years: '2021-Present' },
      { company: 'Design Agency', title: 'Full Stack Developer', years: '2019-2021' },
    ],
    portfolio: [
      { title: 'E-Commerce Platform', tech: 'React, Node.js, MongoDB', image: 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=400&h=300&fit=crop' },
      { title: 'SaaS Dashboard', tech: 'React, TypeScript, AWS', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop' },
    ],
    cheatingViolationCount: 0,
    cheatingPenaltyLogs: [] as CheatingPenaltyLogDto[],
  });

  const [loading, setLoading] = useState(true);
  const [isPremium] = useState(true);
  const [isIdentityVerified] = useState(true);
  const [cvFile] = useState<{ name: string; url: string } | null>({
    name: 'john_doe_resume.pdf',
    url: '#'
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showJobInviteModal, setShowJobInviteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
        const res = await profileGetAPI.getFreelancerProfile(targetId);
        if (res.success && res.data) {
          const apiData = res.data;
          setProfileData({
            user: {
              id: apiData.userId,
              full_name: apiData.userFullName || 'Freelancer',
              avatar: apiData.userAvatar,
              email: apiData.userEmail || '',
              phone_number: '',
              elo_points: apiData.eloPoints ?? 100,
            },
            profile: {
              freelancerProfilesId: apiData.freelancerProfilesId,
              user_id: apiData.userId,
              title: apiData.title || 'Freelancer',
              bio: apiData.bio || '',
              location: apiData.location || 'San Francisco, CA',
              hourly_rate: 95,
              avatar: apiData.userAvatar,
              eloPoints: apiData.eloPoints ?? 100,
            },
            skills: apiData.skills && apiData.skills.length > 0
              ? apiData.skills.map(s => s.skillName)
              : ['React', 'TypeScript', 'Node.js', 'UI/UX Design', 'Figma', 'Tailwind CSS'],
            experience: apiData.workExperiences && apiData.workExperiences.length > 0
              ? apiData.workExperiences.map(we => ({
                  company: we.companyName,
                  title: we.jobTitle,
                  years: `${we.startDate.split('-')[0]} - ${we.endDate ? we.endDate.split('-')[0] : 'Present'}`
                }))
              : [
                  { company: 'Tech Startup', title: 'Senior Developer', years: '2021-Present' },
                  { company: 'Design Agency', title: 'Full Stack Developer', years: '2019-2021' },
                ],
            portfolio: apiData.portfolioItems && apiData.portfolioItems.length > 0
              ? apiData.portfolioItems.map((pi, idx) => ({
                  title: pi.title || `Project #${idx + 1}`,
                  tech: pi.description || 'React, Node.js',
                  image: pi.imageUrl || 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=400&h=300&fit=crop'
                }))
              : [
                  { title: 'E-Commerce Platform', tech: 'React, Node.js, MongoDB', image: 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=400&h=300&fit=crop' },
                  { title: 'SaaS Dashboard', tech: 'React, TypeScript, AWS', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop' },
                ],
            cheatingViolationCount: apiData.cheatingViolationCount ?? 0,
            cheatingPenaltyLogs: apiData.cheatingPenaltyLogs ?? [],
          });
        }
      } catch (err) {
        console.warn('API getFreelancerProfile fallback to mock:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetId]);

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

  const averageRating = reviewsList.length
    ? reviewsList.reduce((sum, review) => sum + review.rating, 0) / reviewsList.length
    : 0;

  const handleSaveFreelancer = () => {
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

  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviewsList.filter(r => r.rating === star).length;
    const percentage = reviewsList.length ? (count / reviewsList.length) * 100 : 0;
    return { star, count, percentage };
  });

  const reviewsPerPage = 2;
  const totalPages = Math.max(1, Math.ceil(reviewsList.length / reviewsPerPage));
  const paginatedReviews = reviewsList.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

  const circumference = 263.89;
  const eloPoints = resolveEloPoints(profileData);
  const eloRingPercent = Math.min(100, Math.max(0, (eloPoints / 300) * 100));
  const strokeDashoffset = circumference - (eloRingPercent / 100) * circumference;

  return {
    loading,
    profileData,
    isPremium,
    isIdentityVerified,
    eloPoints,
    eloRingPercent,
    cvFile,
    freelancerProfileId: (profileData.profile as any).freelancerProfilesId || targetId,
    isSaved,
    showJobInviteModal,
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
    strokeDashoffset,
    setIsSaved,
    setShowJobInviteModal,
    setShowMoreMenu,
    setCurrentPage,
    setReviewRating,
    setReviewComment,
    setReviewAnonymous,
    setShowReviewModal,
    handleSaveFreelancer,
    handleAddReview,
  };
}
