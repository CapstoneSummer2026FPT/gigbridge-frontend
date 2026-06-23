import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useApp } from '../../../app/providers/AppProvider';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { savedJobAPI } from '../../../api/savedJobAPI';
import { userGetAPI } from '../../../api/userAPI/GET';
import type { Job } from '../../../types/models/Job';
import type { User } from '../../../types/models/User';
import { UserRole } from '../../../types/models/User';
import { JobPostStatus, type GetMyJobPostDetailDto } from '../../../types/models/Job';
import { ProposalStatus, type ProposalDetailDto } from '../../../types/models/Proposal';

// ── Local helpers ─────────────────────────────────────────────
const formatPostedAt = (createdAt?: string): string => {
  if (!createdAt) return '';
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return createdAt;
  const diffDays = Math.max(0, Math.floor((Date.now() - createdTime) / 86400000));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

const toLegacyStatus = (status: number | string | null | undefined): Job['status'] => {
  const v = Number(status);
  if (v === JobPostStatus.Draft) return 'draft';
  if (v === JobPostStatus.Open) return 'open';
  if (v === JobPostStatus.Closed) return 'closed';
  if (v === JobPostStatus.Cancelled) return 'cancelled';
  return 'draft';
};

const toJobFromClientDetail = (dto: GetMyJobPostDetailDto): Job => ({
  id: dto.jobPostsId,
  clientId: dto.clientProfilesId,
  title: dto.title,
  description: dto.description,
  category: dto.categoryName || 'All',
  skills: dto.skills?.map(s => s.skillName) || [],
  budgetMin: dto.budgetMin ?? 0,
  budgetMax: dto.budgetMax ?? 0,
  jobType: 'fixed',
  deadline: dto.endDate ?? undefined,
  status: toLegacyStatus(dto.status),
  proposalCount: dto.proposalCount,
  viewCount: 0,
  postedAt: formatPostedAt(dto.createdAt),
  isRemote: !dto.location || dto.location.toLowerCase().includes('remote'),
  gigcoin_cost: 0,
});

/**
 * Custom hook that abstracts all data fetching, state management,
 * and side-effect logic for the Job Detail Screen.
 *
 * API Integrations:
 * - GET /api/JobPosts/{id}                          → public job detail
 * - GET /api/JobPosts/my-jobs/{id}                  → client-owned job detail
 * - GET /api/JobPosts/public                        → similar jobs list
 * - GET /api/Proposals/job/{id}/my-proposal         → freelancer's existing proposal
 * - PATCH /api/Proposals/{id}/status                → withdraw proposal
 * - GET user gigcoin balance                        → apply cost guard
 */
export function useJobDetail() {
  const { id, jobPostId } = useParams<{ id?: string; jobPostId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useApp();

  const activeJobPostId = jobPostId || id;
  const isClientMode = location.pathname.startsWith('/jobs/my-jobs/');

  // ── Data state ────────────────────────────────────────────────
  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);
  const [myProposal, setMyProposal] = useState<ProposalDetailDto | null>(null);
  const [gigcoinBalance, setGigcoinBalance] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // ── Loading / UI state ────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingSavedJob, setIsSavingSavedJob] = useState(false);
  const [proposalMessage, setProposalMessage] = useState('');

  // ── Fetch job + similar jobs ──────────────────────────────────
  const fetchJob = useCallback(async () => {
    if (!activeJobPostId) {
      setJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isClientMode) {
        const res = await jobGetAPI.getMyJobPostById(activeJobPostId);
        if (!res.data) throw new Error(res.message || 'Job not found');
        setJob(toJobFromClientDetail(res.data));
        setClient(null);
        setClientProfile(null);
        setSimilarJobs([]);
        return;
      }

      const data = await jobGetAPI.getJobById(activeJobPostId);
      setJob(data.job);
      setClient(data.client ?? null);
      setClientProfile(data.clientProfile ?? null);

      const allJobs = await jobGetAPI.getJobs({ category: data.job.category });
      setSimilarJobs(allJobs.filter(j => j.id !== activeJobPostId).slice(0, 3));
    } catch {
      setJob(null);
      setClient(null);
      setClientProfile(null);
      setSimilarJobs([]);
    } finally {
      setLoading(false);
    }
  }, [activeJobPostId, isClientMode]);

  // ── Fetch my existing proposal ────────────────────────────────
  const fetchMyProposal = useCallback(async () => {
    if (!activeJobPostId || isClientMode || role !== UserRole.Freelancer || !user) {
      setMyProposal(null);
      return;
    }
    setProposalLoading(true);
    setProposalMessage('');
    try {
      const res = await proposalGetAPI.getMyProposalByJobPost(activeJobPostId);
      if (res.success && res.data) {
        setMyProposal(res.data);
        return;
      }
      if (res.statusCode === 404) {
        setMyProposal(null);
        return;
      }
      setProposalMessage(res.message || 'Could not load proposal status.');
    } finally {
      setProposalLoading(false);
    }
  }, [activeJobPostId, isClientMode, role, user]);

  // ── Fetch gigcoin balance ─────────────────────────────────────
  const fetchGigcoinBalance = useCallback(async () => {
    if (role !== UserRole.Freelancer || !user) return;
    try {
      const bal = await userGetAPI.getGigcoinBalance(user.id);
      setGigcoinBalance(bal.gigcoin_balance);
    } catch {
      // non-critical — silently ignore
    }
  }, [role, user]);

  // ── Load saved job state ────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchSavedState = async () => {
      if (!activeJobPostId || isClientMode || role !== UserRole.Freelancer || !user) {
        setIsSaved(false);
        return;
      }

      try {
        const saved = await savedJobAPI.checkSavedJob(activeJobPostId);
        if (isMounted) setIsSaved(saved);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load saved job state:', error);
        setIsSaved(false);
        toast.error(error instanceof Error ? error.message : 'Saved job state could not be loaded.');
      }
    };

    fetchSavedState();

    return () => {
      isMounted = false;
    };
  }, [activeJobPostId, isClientMode, role, user]);

  useEffect(() => { fetchJob(); }, [fetchJob]);
  useEffect(() => { fetchMyProposal(); }, [fetchMyProposal]);
  useEffect(() => { fetchGigcoinBalance(); }, [fetchGigcoinBalance]);

  // ── Actions ───────────────────────────────────────────────────
  const toggleSavedJob = async () => {
    if (!job) return;
    if (!user || role !== UserRole.Freelancer) {
      toast.error('Please log in as a freelancer to save jobs.');
      return;
    }

    setIsSavingSavedJob(true);

    try {
      if (isSaved) {
        await savedJobAPI.unsaveJob(job.id);
        setIsSaved(false);
        toast.success('Job removed from saved jobs.');
      } else {
        await savedJobAPI.saveJob(job.id);
        setIsSaved(true);
        toast.success('Job saved.');
      }
    } catch (error) {
      console.error('Failed to update saved job:', error);
      toast.error(error instanceof Error ? error.message : 'Saved job status could not be updated.');
    } finally {
      setIsSavingSavedJob(false);
    }
  };

  const handleApplyJob = async () => {
    if (!job || !user) return;
    setIsApplying(true);
    try {
      navigate(`/proposals/create/${job.id}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleWithdrawProposal = async () => {
    if (!myProposal) return;
    setIsApplying(true);
    setProposalMessage('');
    try {
      const res = await proposalPatchAPI.updateProposalStatus(myProposal.proposalId, {
        status: ProposalStatus.Withdrawn,
      });
      if (!res.success) {
        setProposalMessage(res.message || 'Could not withdraw proposal.');
        return;
      }
      setMyProposal(prev => prev ? { ...prev, status: ProposalStatus.Withdrawn } : prev);
    } finally {
      setIsApplying(false);
    }
  };

  const generateAIProposal = async (): Promise<string | null> => {
    if (!job) return null;
    try {
      return await proposalPostAPI.generateAICoverLetter(job.title, job.skills);
    } catch {
      return null;
    }
  };

  // ── Derived values ────────────────────────────────────────────
  const applicationCost = job?.gigcoin_cost ?? 0;
  const canApplyWithGigcoins =
    applicationCost === 0 || (gigcoinBalance !== null && gigcoinBalance >= applicationCost);
  const formatStatus = (status: Job['status']) =>
    status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    // Route / auth context
    navigate,
    user,
    role,
    isClientMode,
    activeJobPostId,

    // Data
    job,
    client,
    clientProfile,
    similarJobs,
    myProposal,
    gigcoinBalance,
    isSaved,

    // Loading
    loading,
    proposalLoading,
    isApplying,
    isSavingSavedJob,
    proposalMessage,

    // Derived
    applicationCost,
    canApplyWithGigcoins,

    // Helpers
    formatStatus,

    // Actions
    toggleSavedJob,
    handleApplyJob,
    handleWithdrawProposal,
    generateAIProposal,

    // Setters needed by inline forms
    setMyProposal,
    setProposalMessage,
  };
}
