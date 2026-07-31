import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type { FreelancerProfileDetailDto } from '../../../types/models/Profile';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import type { JobPostSummaryDto } from '../../../types/models/Job';
import {
  type FinancialOverviewResponse,
  type WalletResponse,
} from '../../../types/models/Financial';
import { ContractStatus, type ContractDto } from '../../../types/models/Contract';

interface DashboardProject {
  id: string;
  title: string;
  status: string;
  totalBudget: number;
  clientName: string;
}

interface DashboardRecommendedJob {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  budgetMin: number;
  budgetMax: number;
  skills: string[];
  createdAt: string;
  hasAiInterview: boolean;
}

const toDashboardProject = (contract: ContractDto): DashboardProject => ({
  id: contract.contractsId,
  title: contract.title || contract.jobTitle || 'Untitled contract',
  status: ContractStatus[contract.status] || 'Unknown',
  totalBudget: contract.totalBudget,
  clientName: contract.clientName || 'Client not provided',
});

const toRecommendedJob = (job: JobPostSummaryDto): DashboardRecommendedJob => {
  const skills = [...job.skillNames, ...job.customSkillNames]
    .map(skill => skill.trim())
    .filter(Boolean);

  return {
    id: job.jobPostsId,
    title: job.title,
    description: job.descriptionPreview || '',
    categoryName: job.categoryName || job.majorName || 'Uncategorized',
    budgetMin: job.budgetMin ?? 0,
    budgetMax: job.budgetMax ?? 0,
    skills: [...new Set(skills)],
    createdAt: job.createdAt,
    hasAiInterview: Boolean(job.hasAiInterview),
  };
};

export function useFreelancerDashboard() {
  const navigate = useNavigate();
  const { user, theme } = useApp();
  const { t } = useTranslation();
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [profile, setProfile] = useState<FreelancerProfileDetailDto | null>(null);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<DashboardRecommendedJob[]>([]);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinancialLoading, setIsFinancialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialError, setFinancialError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [
      profileResult,
      proposalsResult,
      contractsResult,
      jobsResult,
      walletResult,
    ] = await Promise.allSettled([
      profileGetAPI.getMyFreelancerProfile(),
      proposalGetAPI.getMyProposals({ pageSize: 100 }),
      contractGetAPI.getMyContracts({ pageSize: 100 }),
      jobGetAPI.getPublicJobPosts({ pageSize: 6 }),
      walletGetAPI.getMyWallet(),
    ]);

    let hasFailure = false;

    if (
      profileResult.status === 'fulfilled'
      && profileResult.value.success
      && profileResult.value.data
    ) {
      setProfile(profileResult.value.data);
    } else {
      setProfile(null);
      hasFailure = true;
    }

    if (proposalsResult.status === 'fulfilled' && proposalsResult.value.success && proposalsResult.value.data) {
      const data = proposalsResult.value.data;
      setProposals(data.items ?? []);
    } else {
      setProposals([]);
      hasFailure = true;
    }

    if (contractsResult.status === 'fulfilled' && contractsResult.value.success) {
      setContracts(contractsResult.value.data ?? []);
    } else {
      setContracts([]);
      hasFailure = true;
    }

    if (jobsResult.status === 'fulfilled' && jobsResult.value.success) {
      setRecommendedJobs((jobsResult.value.data ?? []).slice(0, 3).map(toRecommendedJob));
    } else {
      setRecommendedJobs([]);
      hasFailure = true;
    }

    if (
      walletResult.status === 'fulfilled'
      && walletResult.value.success
      && walletResult.value.data
    ) {
      setWallet(walletResult.value.data);
    } else {
      setWallet(null);
      hasFailure = true;
    }

    setError(hasFailure ? 'Some dashboard data could not be loaded.' : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    let cancelled = false;

    const loadFinancialOverview = async () => {
      setIsFinancialLoading(true);
      setFinancialError(null);
      const period = chartPeriod === 'monthly' ? 'month' : 'year';
      const response = await walletGetAPI.getFinancialOverview(period);
      if (cancelled) return;

      if (!response.success || !response.data) {
        setFinancialOverview(null);
        setFinancialError(response.message || 'Financial overview could not be loaded.');
        setIsFinancialLoading(false);
        return;
      }

      setFinancialOverview(response.data);
      setIsFinancialLoading(false);
    };

    void loadFinancialOverview();
    return () => {
      cancelled = true;
    };
  }, [chartPeriod]);

  const profileStrength = useMemo(() => {
    const score = Number(profile?.profileCompletionScore ?? 0);
    return Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0));
  }, [profile]);

  const rating = useMemo(() => {
    const value = Number(profile?.rating ?? 0);
    return Math.min(5, Math.max(0, Number.isFinite(value) ? value : 0));
  }, [profile]);

  const userName = user?.full_name || user?.first_name || profile?.userFullName || 'Freelancer';

  const pendingProposalsCount = useMemo(
    () => proposals.filter(proposal => Number(proposal.status) === ProposalStatus.Pending).length,
    [proposals],
  );

  const projects = useMemo(
    () => contracts
      .filter(contract => Number(contract.status) === ContractStatus.Active)
      .map(toDashboardProject),
    [contracts],
  );

  const completedProjectsCount = useMemo(
    () => contracts.filter(contract => Number(contract.status) === ContractStatus.Completed).length,
    [contracts],
  );

  const profileTitle = profile?.title?.trim() || '';

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return t('dashboard.goodMorning', 'Good morning,');
    if (hours < 18) return t('dashboard.goodAfternoon', 'Good afternoon,');
    return t('dashboard.goodEvening', 'Good evening,');
  }, [t]);

  const earningsData = useMemo(
    () => (financialOverview?.trendPoints ?? []).map(point => ({
      id: point.periodStartUtc,
      month: point.period,
      earned: point.paidOrReceivedAmount,
    })),
    [financialOverview],
  );

  const gaugeR = 76;
  const gaugeCircumference = 2 * Math.PI * gaugeR;
  const gaugeOffset = gaugeCircumference * (1 - profileStrength / 100);

  return {
    user,
    theme,
    userName,
    greeting,
    t,
    navigate,
    isLoading,
    isFinancialLoading,
    error,
    financialError,
    refetch: fetchDashboardData,
    profile,
    profileStrength,
    rating,
    profileTitle,
    skillsCount: profile?.skills.length ?? 0,
    portfolioCount: profile?.portfolioItems.length ?? 0,
    majorName: profile?.majorName?.trim() || '',
    wallet,
    financialOverview,
    chartPeriod,
    setChartPeriod,
    earningsData,
    pendingProposalsCount,
    activeProjects: projects.length,
    completedProjectsCount,
    projects,
    recommendedJobs,
    gaugeR,
    gaugeCircumference,
    gaugeOffset,
  };
}
