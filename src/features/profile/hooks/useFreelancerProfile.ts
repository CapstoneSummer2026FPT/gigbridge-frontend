import { useState, useEffect } from 'react';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { reviewGetAPI } from '../../../api/reviewAPI/GET';
import { contractGetAPI, type FreelancerCompletedProjectDto } from '../../../api/contractAPI/GET';
import { savedFreelancerAPI } from '../../../api/savedFreelancerAPI';
import type { Review } from '../../../types/models/Job';
import { toast } from 'sonner';

type ReviewViewModel = {
  id: string;
  contractId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  projectTitle: string;
  rating: number;
  communicationRating: number | null;
  qualityRating: number | null;
  timelinessRating: number | null;
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
  projectTitle: review.projectTitle ?? '',
  rating: review.rating,
  communicationRating: review.communicationRating ?? null,
  qualityRating: review.qualityRating ?? null,
  timelinessRating: review.timelinessRating ?? null,
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
      freelancerProfilesId: '',
      user_id: targetId,
      title: '',
      bio: '',
      location: '',
      avatar: '',
      availability: 0,
      eloPoints: 100,
      createdAt: '',
      majorId: null as string | null,
      majorName: null as string | null,
      categories: [] as Array<{ majorCategoryId: string; categoryId: string; name: string }>,
      showProVerifiedBadge: false,
      tierName: null as string | null,
      premiumUntil: null as string | null,
    },
    skills: [] as string[],
    experience: [] as Array<{ company: string; title: string; years: string }>,
    portfolio: [] as Array<{ title: string; tech: string; image: string }>,
    rawPortfolioItems: [] as import('../../../types/models/Profile').PortfolioItemDto[],
    rawWorkExperiences: [] as import('../../../types/models/Profile').WorkExperienceDto[],
});

export function useFreelancerProfile(targetId: string, canSave = false) {
  const [profileData, setProfileData] = useState(() => emptyProfileData(targetId));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showJobInviteModal, setShowJobInviteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewsList, setReviewsList] = useState<ReviewViewModel[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await profileGetAPI.getFreelancerProfile(targetId);
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
              freelancerProfilesId: apiData.freelancerProfilesId ?? targetId,
              user_id: apiData.userId,
              title: apiData.title || '',
              bio: apiData.bio || '',
              location: apiData.location || '',
              avatar: apiData.userAvatar || '',
              availability: apiData.availability ?? 0,
              eloPoints: apiData.eloPoints ?? 100,
              createdAt: apiData.createdAt,
              majorId: apiData.majorId ?? null,
              majorName: apiData.majorName ?? null,
              categories: apiData.categories ?? [],
              showProVerifiedBadge: Boolean(apiData.showProVerifiedBadge),
              tierName: apiData.tierName ?? null,
              premiumUntil: apiData.premiumUntil ?? null,
            },
            skills: apiData.skills && apiData.skills.length > 0
              ? apiData.skills.map(s => s.skillName)
              : [],
            experience: apiData.workExperiences && apiData.workExperiences.length > 0
              ? apiData.workExperiences.map(we => ({
                  company: we.companyName,
                  title: we.jobTitle,
                  years: `${we.startDate.split('-')[0]} - ${we.endDate ? we.endDate.split('-')[0] : 'Present'}`
                }))
              : [],
            portfolio: apiData.portfolioItems && apiData.portfolioItems.length > 0
              ? apiData.portfolioItems.map((pi, idx) => ({
                  title: pi.title || `Project #${idx + 1}`,
                  tech: pi.description || '',
                  image: pi.imageUrl || ''
                }))
              : [],
            rawPortfolioItems: apiData.portfolioItems || [],
            rawWorkExperiences: apiData.workExperiences || [],
          });
        } else {
          setProfileData(emptyProfileData(targetId));
          setError(res.message || 'Freelancer profile could not be loaded.');
        }
      } catch (err: unknown) {
        setProfileData(emptyProfileData(targetId));
        setError(err instanceof Error ? err.message : 'Freelancer profile could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetId]);

  useEffect(() => {
    const freelancerProfileId = profileData.profile.freelancerProfilesId;
    if (!canSave || !freelancerProfileId) {
      setIsSaved(false);
      return;
    }

    let cancelled = false;
    void savedFreelancerAPI.checkSavedFreelancer(freelancerProfileId)
      .then(saved => {
        if (!cancelled) setIsSaved(saved);
      })
      .catch(() => {
        if (!cancelled) setIsSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canSave, profileData.profile.freelancerProfilesId]);

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

  // Fetch completed projects for freelancer
  const [completedProjects, setCompletedProjects] = useState<FreelancerCompletedProjectDto[]>([]);
  const [completedLoading, setCompletedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCompletedLoading(true);

    const sampleCompletedProjects: FreelancerCompletedProjectDto[] = [
      {
        contractId: 'sample-contract-1',
        jobPostsId: 'sample-job-1',
        totalBudget: 1500,
        clientName: 'TechVision Studio',
        completedAt: new Date().toISOString(),
        status: 3,
        canReview: false,
        hasReviewedByCurrentUser: true,
        jobPost: {
          jobPostsId: 'sample-job-1',
          title: 'Thiết kế giao diện UI/UX Mobile App Web3 Wallet',
          categoryName: 'Design & Creative',
          skills: [{ skillsId: '1', skillName: 'Figma' }, { skillsId: '2', skillName: 'UI/UX' }, { skillsId: '3', skillName: 'React Native' }],
        },
      },
      {
        contractId: 'sample-contract-2',
        jobPostsId: 'sample-job-2',
        totalBudget: 2800,
        clientName: 'Nexus Global Ltd.',
        completedAt: new Date().toISOString(),
        status: 3,
        canReview: false,
        hasReviewedByCurrentUser: true,
        jobPost: {
          jobPostsId: 'sample-job-2',
          title: 'Phát triển Hệ thống E-commerce Fullstack React & ASP.NET',
          categoryName: 'Web Development',
          skills: [{ skillsId: '4', skillName: 'React' }, { skillsId: '5', skillName: 'ASP.NET' }, { skillsId: '6', skillName: 'PostgreSQL' }],
        },
      },
      {
        contractId: 'sample-contract-3',
        jobPostsId: 'sample-job-3',
        totalBudget: 1200,
        clientName: 'GreenLeaf Marketing',
        completedAt: new Date().toISOString(),
        status: 3,
        canReview: false,
        hasReviewedByCurrentUser: true,
        jobPost: {
          jobPostsId: 'sample-job-3',
          title: 'Xây dựng Landing Page & Animation GSAP cho Sản phẩm Mới',
          categoryName: 'Frontend & Animation',
          skills: [{ skillsId: '7', skillName: 'GSAP' }, { skillsId: '8', skillName: 'TailwindCSS' }, { skillsId: '9', skillName: 'TypeScript' }],
        },
      },
      {
        contractId: 'sample-contract-4',
        jobPostsId: 'sample-job-4',
        totalBudget: 3500,
        clientName: 'Alpha Tech Corp',
        completedAt: new Date().toISOString(),
        status: 3,
        canReview: false,
        hasReviewedByCurrentUser: true,
        jobPost: {
          jobPostsId: 'sample-job-4',
          title: 'Tối ưu hóa Hiệu năng & Refactor Codebase Next.js App Router',
          categoryName: 'Software Engineering',
          skills: [{ skillsId: '10', skillName: 'Next.js' }, { skillsId: '11', skillName: 'Performance' }, { skillsId: '12', skillName: 'Node.js' }],
        },
      },
    ];

    contractGetAPI
      .getMyCompletedProjects()
      .then(res => {
        if (!cancelled) {
          if (res.success && res.data && res.data.length > 0) {
            setCompletedProjects(res.data);
          } else {
            setCompletedProjects(sampleCompletedProjects);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setCompletedProjects(sampleCompletedProjects);
      })
      .finally(() => {
        if (!cancelled) setCompletedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  const averageRating = reviewsList.length
    ? reviewsList.reduce((sum, review) => sum + review.rating, 0) / reviewsList.length
    : 0;

  const handleSaveFreelancer = async () => {
    const freelancerProfileId = profileData.profile.freelancerProfilesId;
    if (!canSave || !freelancerProfileId || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        await savedFreelancerAPI.unsaveFreelancer(freelancerProfileId);
      } else {
        await savedFreelancerAPI.saveFreelancer(freelancerProfileId);
      }
      setIsSaved(previous => !previous);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Saved freelancer could not be updated.');
    } finally {
      setIsSaving(false);
    }
  };

  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviewsList.filter(r => r.rating === star).length;
    const percentage = reviewsList.length ? (count / reviewsList.length) * 100 : 0;
    return { star, count, percentage };
  });

  const reviewsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(reviewsList.length / reviewsPerPage));
  const paginatedReviews = reviewsList.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

  const circumference = 263.89;
  const eloPoints = resolveEloPoints(profileData);
  const eloRingPercent = Math.min(100, Math.max(0, (eloPoints / 300) * 100));
  const strokeDashoffset = circumference - (eloRingPercent / 100) * circumference;

  return {
    loading,
    error,
    profileData,
    eloPoints,
    freelancerProfileId: profileData.profile.freelancerProfilesId || targetId,
    isSaved,
    isSaving,
    showJobInviteModal,
    showMoreMenu,
    currentPage,
    reviewsList,
    averageRating,
    distribution,
    totalPages,
    paginatedReviews,
    strokeDashoffset,
    completedProjects,
    completedLoading,
    setShowJobInviteModal,
    setShowMoreMenu,
    setCurrentPage,
    handleSaveFreelancer,
  };
}
