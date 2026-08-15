import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { eloGetAPI } from '../../../api/eloAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type { EloSummary } from '../../../types/elo';
import type {
  FinancialOverviewResponse,
  WalletResponse,
} from '../../../types/models/Financial';
import type { Job } from '../../../types/models/Job';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import {
  ContractStatus,
  MilestoneStatus,
  type ContractDto,
  type Milestone,
} from '../../../types/models/Contract';
import {
  countContractPipelineStatuses,
  countMilestonesAwaitingCompletion,
  countProposalStatuses,
} from '../utils/clientDashboardMetrics';

interface DashboardProject {
  id: string;
  title: string;
  status: string;
  totalBudget: number;
  freelancerName: string;
}

const toDashboardProject = (contract: ContractDto): DashboardProject => ({
  id: contract.contractsId,
  title: contract.title || contract.jobTitle || 'Untitled contract',
  status: ContractStatus[contract.status] || 'Unknown',
  totalBudget: contract.totalBudget,
  freelancerName: contract.freelancerName || 'Not assigned',
});

export function useClientDashboard() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { t } = useTranslation();
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [eloSummary, setEloSummary] = useState<EloSummary | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinancialLoading, setIsFinancialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialError, setFinancialError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [jobsResult, contractsResult, walletResult, eloResult] = await Promise.allSettled([
      jobGetAPI.getClientJobs({ pageSize: 100 }),
      contractGetAPI.getMyContracts({ pageSize: 100 }),
      walletGetAPI.getMyWallet(),
      eloGetAPI.getEloSummary(),
    ]);

    let hasFailure = false;
    let loadedJobs: Job[] = [];
    let loadedContracts: ContractDto[] = [];

    if (jobsResult.status === 'fulfilled') {
      loadedJobs = jobsResult.value;
      setMyJobs(loadedJobs);
    } else {
      setMyJobs([]);
      hasFailure = true;
    }

    if (contractsResult.status === 'fulfilled' && contractsResult.value.success) {
      loadedContracts = contractsResult.value.data ?? [];
      setContracts(loadedContracts);
    } else {
      setContracts([]);
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

    if (
      eloResult.status === 'fulfilled'
      && eloResult.value.success
      && eloResult.value.data
    ) {
      setEloSummary(eloResult.value.data);
    } else {
      setEloSummary(null);
      hasFailure = true;
    }

    const jobsWithProposals = loadedJobs.filter(job => job.proposalCount > 0);
    const activeContracts = loadedContracts.filter(
      contract => Number(contract.status) === ContractStatus.Active,
    );
    const [proposalResults, milestoneResults] = await Promise.all([
      Promise.allSettled(
        jobsWithProposals.map(job => proposalGetAPI.getProposalsByJobPost(
          job.id,
          { pageSize: 100 },
        )),
      ),
      Promise.allSettled(
        activeContracts.map(contract => contractGetAPI.getMilestonesByContract(contract.contractsId)),
      ),
    ]);

    const loadedProposals = proposalResults.flatMap(result => {
      if (result.status !== 'fulfilled' || !result.value.success) return [];
      return result.value.data ?? [];
    });
    const loadedMilestones = milestoneResults.flatMap(result => {
      if (result.status !== 'fulfilled' || !result.value.success) return [];
      return result.value.data ?? [];
    });

    setProposals(loadedProposals);
    setMilestones(loadedMilestones);

    if (
      proposalResults.some(result => result.status === 'rejected' || !result.value.success)
      || milestoneResults.some(result => result.status === 'rejected' || !result.value.success)
    ) {
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

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return t('dashboard.goodMorning', 'Good morning,');
    if (hours < 18) return t('dashboard.goodAfternoon', 'Good afternoon,');
    return t('dashboard.goodEvening', 'Good evening,');
  }, [t]);

  const projects = useMemo(
    () => contracts
      .filter(contract => Number(contract.status) === ContractStatus.Active)
      .map(toDashboardProject),
    [contracts],
  );

  const completedContractsCount = useMemo(
    () => contracts.filter(contract => Number(contract.status) === ContractStatus.Completed).length,
    [contracts],
  );

  const pendingProposals = useMemo(
    () => proposals.filter(proposal => Number(proposal.status) === ProposalStatus.Pending),
    [proposals],
  );

  const shortlistedProposalsCount = useMemo(
    () => proposals.filter(proposal => Number(proposal.status) === ProposalStatus.Shortlisted).length,
    [proposals],
  );

  const proposalStatusCounts = useMemo(
    () => countProposalStatuses(proposals),
    [proposals],
  );

  const pendingMilestonesCount = useMemo(
    () => countMilestonesAwaitingCompletion(milestones),
    [milestones],
  );

  const submittedMilestonesCount = useMemo(
    () => milestones.filter(
      milestone => Number(milestone.status) === MilestoneStatus.Submitted,
    ).length,
    [milestones],
  );

  const contractPipelineCounts = useMemo(
    () => countContractPipelineStatuses(contracts),
    [contracts],
  );

  const spendChartData = useMemo(
    () => (financialOverview?.trendPoints ?? []).map(point => ({
      id: point.periodStartUtc,
      month: point.period,
      spend: point.paidOrReceivedAmount,
    })),
    [financialOverview],
  );

  return {
    user,
    greeting,
    t,
    navigate,
    isLoading,
    isFinancialLoading,
    error,
    financialError,
    refetch: fetchDashboardData,
    wallet,
    financialOverview,
    chartPeriod,
    setChartPeriod,
    myJobs,
    proposalsCount: proposals.length,
    pendingProposals,
    shortlistedProposalsCount,
    proposalStatusCounts,
    eloSummary,
    pendingMilestonesCount,
    submittedMilestonesCount,
    totalMilestonesCount: milestones.length,
    contractPipelineCounts,
    projects,
    completedContractsCount,
    spendChartData,
  };
}
