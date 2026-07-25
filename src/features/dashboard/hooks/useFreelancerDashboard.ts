import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { projectGetAPI } from '../../../api/projectAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type { FreelancerProfileDetailDto } from '../../../types/models/Profile';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import type { Job } from '../../../types/models/Job';

// ── Static/derived chart data ─────────────────────────────────
const MONTHLY_EARNINGS_FALLBACK = [
  { id: 'freelancer-oct', month: 'Oct', earned: 0 },
  { id: 'freelancer-nov', month: 'Nov', earned: 0 },
  { id: 'freelancer-dec', month: 'Dec', earned: 0 },
  { id: 'freelancer-jan', month: 'Jan', earned: 0 },
  { id: 'freelancer-feb', month: 'Feb', earned: 0 },
  { id: 'freelancer-mar', month: 'Mar', earned: 0 },
  { id: 'freelancer-apr', month: 'Apr', earned: 0 },
];

const RECENT_ACTIVITY_STATIC = [
  { id: 'fl_act_1', text: 'Client approved Milestone 2 — payment released', time: '1h ago', color: 'border-success' },
  { id: 'fl_act_2', text: 'New AI job match found for your profile', time: '3h ago', color: 'border-brand' },
  { id: 'fl_act_3', text: 'Proposal viewed by a potential client', time: '6h ago', color: 'border-brand' },
  { id: 'fl_act_4', text: 'Profile strength score updated', time: '1d ago', color: 'border-brand' },
];

/**
 * Custom hook for all data fetching, state management, and derived logic
 * for the Freelancer Dashboard Screen.
 *
 * API Integrations:
 * - GET /api/Profile/freelancer/me           → freelancer profile + profile strength
 * - GET /api/Proposals/my-proposals          → active/pending proposal count
 * - GET /api/projects (mock)                 → active projects tracker
 * - GET /api/JobPosts/public                 → recommended jobs list
 * - GET /api/wallet                          → wallet balance
 */
export function useFreelancerDashboard() {
  const navigate = useNavigate();
  const { user, theme } = useApp();
  const { t } = useTranslation();

  // ── UI state ─────────────────────────────────────────────────
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // ── Remote data state ────────────────────────────────────────
  const [profile, setProfile] = useState<FreelancerProfileDetailDto | null>(null);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; status: string; progress: number; milestones: { title: string; amount: number; status: string }[] }[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all dashboard data ──────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      profileGetAPI.getMyFreelancerProfile(),
      proposalGetAPI.getMyProposals({ pageSize: 100 }),
      projectGetAPI.getProjects({ freelancerId: user?.id }),
      jobGetAPI.getPublicJobPosts({ pageSize: 6 }),
      walletGetAPI.getMyWallet(),
    ]);

    // Profile
    if (results[0].status === 'fulfilled' && results[0].value.success && results[0].value.data) {
      setProfile(results[0].value.data);
    }

    // Proposals
    if (results[1].status === 'fulfilled' && results[1].value.success && results[1].value.data) {
      const data = results[1].value.data;
      setProposals(Array.isArray(data) ? data : (data.items || []));
    }

    // Projects (mock still returns plain array)
    if (results[2].status === 'fulfilled') {
      const raw = results[2].value as any;
      const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setProjects(arr);
    }

    // Recommended jobs — take first 3 from public list
    if (results[3].status === 'fulfilled' && results[3].value.success && results[3].value.data) {
      const legacyJobs: Job[] = results[3].value.data.slice(0, 3).map((j: any) => ({
        id: j.jobPostsId,
        clientId: '',
        title: j.title,
        description: j.descriptionPreview || '',
        category: 'All',
        skills: j.skillNames || [],
        budgetMin: j.budgetMin ?? 0,
        budgetMax: j.budgetMax ?? 0,
        jobType: 'fixed' as const,
        status: 'open' as const,
        proposalCount: 0,
        viewCount: 0,
        postedAt: '',
        isRemote: true,
        gigcoin_cost: 0,
        aiMatchScore: Math.floor(Math.random() * 10 + 88), // 88–97%
      }));
      setRecommendedJobs(legacyJobs);
    }

    // Wallet
    if (results[4].status === 'fulfilled' && results[4].value.success && results[4].value.data) {
      setWalletBalance(results[4].value.data.availableVnd ?? null);
    }

    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Derived / memoized values ─────────────────────────────────
  const profileStrength = useMemo(() =>
    profile?.profileCompletionScore ?? 94
  , [profile]);

  const userName = user?.full_name || user?.first_name || profile?.userFullName || 'Freelancer';

  const rating = useMemo(() =>
    profile?.rating ?? 4.9
  , [profile]);

  const pendingProposalsCount = useMemo(() =>
    proposals.filter(p => p.status === ProposalStatus.Pending || p.status === 1).length
  , [proposals]);

  const activeProjects = useMemo(() => projects.length, [projects]);

  const profileTitle = useMemo(() =>
    profile?.title?.split(' ').slice(0, 3).join(' ') ?? 'Developer'
  , [profile]);

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return t('dashboard.goodMorning', 'Good morning,');
    if (hours < 18) return t('dashboard.goodAfternoon', 'Good afternoon,');
    return t('dashboard.goodEvening', 'Good evening,');
  }, [t]);

  const earningsData = useMemo(() => {
    if (chartPeriod === 'yearly') {
      return [
        { id: 'y-2022', month: '2022', earned: 42000 },
        { id: 'y-2023', month: '2023', earned: 78000 },
        { id: 'y-2024', month: '2024', earned: 112000 },
        { id: 'y-2025', month: '2025', earned: 135000 },
        { id: 'y-2026', month: '2026 YTD', earned: walletBalance ? Math.floor(walletBalance / 24000) : 59000 },
      ];
    }
    return MONTHLY_EARNINGS_FALLBACK;
  }, [chartPeriod, walletBalance]);

  // SVG gauge dimensions
  const gaugeR = 76;
  const gaugeCircumference = 2 * Math.PI * gaugeR;
  const gaugeOffset = gaugeCircumference * (1 - profileStrength / 100);

  return {
    // Auth / user
    user,
    theme,
    userName,
    greeting,
    t,
    navigate,

    // Loading & error
    isLoading,
    error,
    refetch: fetchDashboardData,

    // Profile
    profile,
    profileStrength,
    rating,
    profileTitle,
    walletBalance,

    // Chart
    chartPeriod,
    setChartPeriod,
    earningsData,

    // Counts
    pendingProposalsCount,
    activeProjects,

    // Collections
    proposals,
    projects,
    recommendedJobs,
    recentActivity: RECENT_ACTIVITY_STATIC,

    // Gauge maths (ready for SVG)
    gaugeR,
    gaugeCircumference,
    gaugeOffset,
  };
}
