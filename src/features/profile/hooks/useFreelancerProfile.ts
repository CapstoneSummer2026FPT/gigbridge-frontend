import { useState, useEffect } from 'react';
import { DB } from '../../../mock_backend';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import { getStoredReviews, saveStoredReviews, type ReviewViewModel } from '../../reviews/mock/data-for-Reviews';
import type { InviteFreelancerData } from '../components/InviteFreelancerToJobModal';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';

export function useFreelancerProfile(targetId: string, currentUser: any) {
  const [profileData, setProfileData] = useState({
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
    ]
  });

  const [loading, setLoading] = useState(true);
  const [isPremium] = useState(true);
  const [isIdentityVerified] = useState(true);
  const [trustScore] = useState(92);
  const [cvFile] = useState<{ name: string; url: string } | null>({
    name: 'john_doe_resume.pdf',
    url: '#'
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showJobInviteModal, setShowJobInviteModal] = useState(false);
  const [sentJobInvites, setSentJobInvites] = useState<string[]>([]);
  const [openClientJobs, setOpenClientJobs] = useState<Array<{ id: string; title: string; status: string }>>([]);
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
            },
            profile: {
              user_id: apiData.userId,
              title: apiData.title || 'Freelancer',
              bio: apiData.bio || '',
              location: apiData.location || 'San Francisco, CA',
              hourly_rate: 95,
              avatar: apiData.userAvatar,
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
                ]
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
    setReviewsList(
      getStoredReviews()
        .filter(review => review.revieweeId === targetId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
    setCurrentPage(1);
  }, [targetId]);

  useEffect(() => {
    const fetchOpenClientJobs = async () => {
      if (!currentUser) {
        setOpenClientJobs([]);
        return;
      }

      try {
        const jobs = await jobGetAPI.getClientJobs();
        setOpenClientJobs(jobs
          .filter(job => job.status === 'open')
          .map(job => ({
            id: job.id,
            title: job.title,
            status: job.status,
          })));
      } catch (error) {
        console.error('Failed to fetch client jobs for invite modal:', error);
        setOpenClientJobs([]);
      }
    };

    fetchOpenClientJobs();
  }, [currentUser]);
  
  const isAlreadyInvitedToJob = (jobId: string): boolean => {
    const inviteKey = `${targetId}_${jobId}`;
    return sentJobInvites.includes(inviteKey);
  };

  const averageRating = reviewsList.length
    ? reviewsList.reduce((sum, review) => sum + review.rating, 0) / reviewsList.length
    : 0;

  const handleSaveFreelancer = () => {
    setIsSaved(!isSaved);
  };

  const handleSendJobInvite = async (data: InviteFreelancerData) => {
    const inviteKey = `${data.freelancerId}_${data.jobId}`;
    
    if (sentJobInvites.includes(inviteKey)) {
      throw new Error('This freelancer was already invited to this job.');
    }

    setSentJobInvites(prev => [...prev, inviteKey]);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newReview: ReviewViewModel = {
      id: `rev_${Date.now()}`,
      contractId: 'contract_1',
      reviewerId: currentUser?.id || 'u_client_1',
      reviewerName: currentUser?.full_name || 'Anonymous Client',
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

  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviewsList.filter(r => r.rating === star).length;
    const percentage = reviewsList.length ? (count / reviewsList.length) * 100 : 0;
    return { star, count, percentage };
  });

  const reviewsPerPage = 2;
  const totalPages = Math.max(1, Math.ceil(reviewsList.length / reviewsPerPage));
  const paginatedReviews = reviewsList.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

  const circumference = 263.89;
  const strokeDashoffset = circumference - (trustScore / 100) * circumference;

  return {
    loading,
    profileData,
    isPremium,
    isIdentityVerified,
    trustScore,
    cvFile,
    isSaved,
    showJobInviteModal,
    sentJobInvites,
    showMoreMenu,
    currentPage,
    reviewsList,
    showReviewModal,
    reviewRating,
    reviewComment,
    reviewAnonymous,
    openClientJobs,
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
    isAlreadyInvitedToJob,
    handleSaveFreelancer,
    handleSendJobInvite,
    handleAddReview,
  };
}
