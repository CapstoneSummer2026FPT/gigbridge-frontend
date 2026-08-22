import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { jobAPI } from '../../../api/jobAPI';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import {
  ProposalStatus,
  type ProposalAnswerDto,
  type ProposalDetailDto,
  type ProposalDto,
} from '../../../types/models/Proposal';
import type { ProposalStatusFilter, ProposalStatusValue } from '../types';
import { sortProposalReviewJobs } from '../components/ClientProposalJobSidebar';

export type SortBy = 'submittedAt' | 'status' | 'budget' | 'duration' | 'milestoneTotal';
export type BusyAction = 'shortlist' | 'reject' | 'accept' | 'open';

export const actionKey = (id: string, action: BusyAction) => `${id}:${action}`;

export const durationScore = (value?: string | null) => {
  const amount = Number(value?.match(/\d+/)?.[0] || 0);
  if (value?.toLowerCase().includes('month')) return amount * 30;
  if (value?.toLowerCase().includes('week')) return amount * 7;
  return amount;
};

export function useClientProposals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryJobId = useMemo(() => new URLSearchParams(location.search).get('job'), [location.search]);
  const initialQueryJobId = useRef(queryJobId);

  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [proposalReloadKey, setProposalReloadKey] = useState(0);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProposalDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [modalTab, setModalTab] = useState<'userAnswers' | 'proposalDetails' | 'aiReport'>('userAnswers');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [rejectProposalId, setRejectProposalId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('submittedAt');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [milestoneMin, setMilestoneMin] = useState('');
  const [milestoneMax, setMilestoneMax] = useState('');
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'aiJudging'>('table');
  const [rawAnswers, setRawAnswers] = useState<ProposalAnswerDto[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const stats = useMemo(() => {
    const totalCount = proposals.length;
    const pendingCount = proposals.filter(p => Number(p.status) === ProposalStatus.Pending).length;
    const shortlistedCount = proposals.filter(p => Number(p.status) === ProposalStatus.Shortlisted).length;
    const acceptedCount = proposals.filter(p => Number(p.status) === ProposalStatus.Accepted).length;
    const submitted = proposals.filter(item => Number(item.status) !== ProposalStatus.Draft);
    const totalBudget = submitted.reduce((sum, item) => sum + (Number(item.proposedBudget) || 0), 0);

    return {
      totalCount,
      pendingCount,
      shortlistedCount,
      acceptedCount,
      total: totalCount,
      pending: pendingCount,
      shortlisted: shortlistedCount,
      averageBid: submitted.length ? totalBudget / submitted.length : 0,
    };
  }, [proposals]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedJobId, statusFilter, sortBy, budgetMin, budgetMax, durationMax, milestoneMin, milestoneMax, submittedFrom, submittedTo, viewMode]);

  const refreshProposals = () => {
    if (!selectedJobId) return;
    proposalGetAPI.getProposalsByJobPost(selectedJobId, { pageIndex: 1, pageSize: 100 })
      .then(response => {
        if (response.data) setProposals(response.data);
      });
  };

  useEffect(() => {
    let alive = true;
    jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 })
      .then(response => {
        if (!alive) return;
        const items = response.data || [];
        setJobs(items);
        setSelectedJobId(current => {
          if (current && items.some(item => item.jobPostsId === current)) return current;
          if (initialQueryJobId.current && items.some(item => item.jobPostsId === initialQueryJobId.current)) {
            return initialQueryJobId.current;
          }
          return sortProposalReviewJobs(items)[0]?.jobPostsId || null;
        });
        if (!response.success) setLoadError(response.message || t('proposalReview.errors.jobs'));
      })
      .catch(() => alive && setLoadError(t('proposalReview.errors.jobs')));
    return () => { alive = false; };
  }, [t]);

  useEffect(() => {
    setActiveId(null);
    setDetail(null);
    setDetailError('');
    setSearch('');
    setBudgetMin('');
    setBudgetMax('');
    setDurationMax('');
    setMilestoneMin('');
    setMilestoneMax('');
    setSubmittedFrom('');
    setSubmittedTo('');
    setFiltersOpen(false);

    if (!selectedJobId) {
      setProposals([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setLoadError('');
    proposalGetAPI.getProposalsByJobPost(selectedJobId, { pageIndex: 1, pageSize: 100 })
      .then(response => {
        if (!alive) return;
        setProposals(response.data || []);
        if (!response.success) setLoadError(response.message || t('proposalReview.errors.proposals'));
      })
      .catch(() => alive && setLoadError(t('proposalReview.errors.proposals')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [proposalReloadKey, selectedJobId, t]);

  useEffect(() => {
    if (selectedJobId && selectedJobId !== queryJobId) {
      navigate(`/proposals?job=${selectedJobId}`, { replace: true });
    }
  }, [navigate, queryJobId, selectedJobId]);

  useEffect(() => {
    if (!evalModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !rejectProposalId) {
        setEvalModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [evalModalOpen, rejectProposalId]);

  const selectedJob = jobs.find(item => item.jobPostsId === selectedJobId);
  const selectedJobCanNegotiate = Number(selectedJob?.status) === 1;

  const selectJob = (id: string) => {
    if (id === selectedJobId) return;
    setSelectedJobId(id);
  };

  const resetAdvancedFilters = () => {
    setBudgetMin('');
    setBudgetMax('');
    setDurationMax('');
    setMilestoneMin('');
    setMilestoneMax('');
    setSubmittedFrom('');
    setSubmittedTo('');
  };

  const resetAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    resetAdvancedFilters();
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (budgetMin) count += 1;
    if (budgetMax) count += 1;
    if (durationMax) count += 1;
    if (milestoneMin) count += 1;
    if (milestoneMax) count += 1;
    if (submittedFrom) count += 1;
    if (submittedTo) count += 1;
    return count;
  }, [budgetMax, budgetMin, durationMax, milestoneMax, milestoneMin, submittedFrom, submittedTo]);

  const visible = useMemo(() => {
    return proposals.filter(item => {
      if (statusFilter !== 'all' && String(item.status) !== String(statusFilter)) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const text = [
          item.freelancerName,
          item.coverLetter,
          item.analysisSummaryPreview,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(query)) return false;
      }

      const budget = Number(item.proposedBudget) || 0;
      if (budgetMin && budget < Number(budgetMin)) return false;
      if (budgetMax && budget > Number(budgetMax)) return false;

      const duration = durationScore(item.proposedDuration);
      if (durationMax && duration > Number(durationMax)) return false;

      const milestoneCount = item.milestoneCount ?? 0;
      if (milestoneMin && milestoneCount < Number(milestoneMin)) return false;
      if (milestoneMax && milestoneCount > Number(milestoneMax)) return false;

      if (submittedFrom || submittedTo) {
        if (!item.submittedAt) return false;
        const submittedTime = new Date(item.submittedAt).getTime();
        if (submittedFrom && submittedTime < new Date(submittedFrom).getTime()) return false;
        if (submittedTo && submittedTime > new Date(submittedTo).getTime() + 86400000) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'budget') return (Number(b.proposedBudget) || 0) - (Number(a.proposedBudget) || 0);
      if (sortBy === 'duration') return durationScore(a.proposedDuration) - durationScore(b.proposedDuration);
      if (sortBy === 'status') return Number(a.status) - Number(b.status);
      if (sortBy === 'milestoneTotal') return (b.milestoneTotal || 0) - (a.milestoneTotal || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [proposals, statusFilter, search, budgetMin, budgetMax, durationMax, milestoneMin, milestoneMax, submittedFrom, submittedTo, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pagedVisible = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, currentPage, pageSize]);

  const updateStatus = async (id: string, status: ProposalStatusValue, action: BusyAction) => {
    if (!selectedJobCanNegotiate) {
      toast.error(t('proposalReview.readOnly'));
      return;
    }

    setBusyAction(actionKey(id, action));
    try {
      const response = await proposalPatchAPI.updateProposalStatus(id, { status });
      if (!response.success) {
        toast.error(response.message || t('proposalReview.errors.status'));
        return;
      }
      setProposals(items => items.map(item => item.proposalsId === id ? { ...item, status } : item));
      setDetail(current => current?.proposalId === id ? { ...current, status } : current);
      toast.success(status === ProposalStatus.Shortlisted
        ? t('proposalReview.toasts.shortlisted')
        : t('proposalReview.toasts.rejected'));
    } catch {
      toast.error(t('proposalReview.errors.status'));
    } finally {
      setBusyAction(null);
      setRejectProposalId(null);
    }
  };

  const acceptForNegotiation = async (id: string) => {
    if (!selectedJobCanNegotiate) {
      toast.error(t('proposalReview.readOnly'));
      return;
    }

    setBusyAction(actionKey(id, 'accept'));
    try {
      const response = await proposalPostAPI.acceptForNegotiation(id);
      if (!response.success || !response.data) {
        toast.error(response.message || t('proposalReview.errors.negotiation'));
        return;
      }
      navigate('/messages', { state: { activeConvId: response.data } });
    } catch {
      toast.error(t('proposalReview.errors.negotiation'));
    } finally {
      setBusyAction(null);
    }
  };

  const openNegotiation = async (id: string) => {
    setBusyAction(actionKey(id, 'open'));
    try {
      const response = await messagePostAPI.startNegotiationFromProposal(id);
      if (!response.success || !response.data) {
        toast.error(response.message || t('proposalReview.errors.negotiation'));
        return;
      }
      navigate('/messages', { state: { activeConvId: response.data } });
    } catch {
      toast.error(t('proposalReview.errors.negotiation'));
    } finally {
      setBusyAction(null);
    }
  };



  const loadEvaluation = async (proposalId: string) => {
    setEvalModalOpen(true);
    setEvalLoading(true);
    setEvalError('');
    setRawAnswers([]);

    try {
      const answersRes = await proposalGetAPI.getProposalAnswers(proposalId).catch(() => null);
      if (answersRes?.success && answersRes.data) {
        setRawAnswers(answersRes.data);
      }

      setDetailLoading(true);
      setDetailError('');
      const detailRes = await proposalGetAPI.getProposalDetail(proposalId).catch(() => null);
      if (detailRes?.success && detailRes.data) {
        setDetail(detailRes.data);
      } else {
        setDetailError(detailRes?.message || 'Failed to load proposal detail');
      }
      setDetailLoading(false);
    } catch (err: unknown) {
      setEvalError(err instanceof Error ? err.message : 'An error occurred during evaluation.');
    } finally {
      setEvalLoading(false);
    }
  };

  const openProposalModal = (proposalId: string, initialTab?: 'userAnswers' | 'proposalDetails' | 'aiReport') => {
    setActiveId(proposalId);
    const targetTab = initialTab || 'proposalDetails';
    setModalTab(targetTab);
    setEvalModalOpen(true);
    loadEvaluation(proposalId);
  };


  const isBusy = (id: string, action: BusyAction) => busyAction === actionKey(id, action);
  const canClientAct = (status: number) => selectedJobCanNegotiate && [ProposalStatus.Pending, ProposalStatus.Shortlisted].includes(status);

  return {
    t,
    navigate,
    jobs,
    selectedJobId,
    selectedJob,
    selectedJobCanNegotiate,
    proposals,
    visible,
    pagedVisible,
    totalPages,
    currentPage,
    setCurrentPage,
    loading,
    loadError,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    filtersOpen,
    setFiltersOpen,
    budgetMin,
    setBudgetMin,
    budgetMax,
    setBudgetMax,
    durationMax,
    setDurationMax,
    milestoneMin,
    setMilestoneMin,
    milestoneMax,
    setMilestoneMax,
    submittedFrom,
    setSubmittedFrom,
    submittedTo,
    setSubmittedTo,
    viewMode,
    setViewMode,
    activeFilterCount,
    evalModalOpen,
    setEvalModalOpen,
    evalLoading,
    evalError,
    modalTab,
    setModalTab,
    activeId,
    detail,
    detailLoading,
    detailError,
    busyAction,
    rejectProposalId,
    setRejectProposalId,
    rawAnswers,
    selectJob,
    updateStatus,
    acceptForNegotiation,
    openNegotiation,
    openProposalModal,
    resetAdvancedFilters,
    resetAllFilters,
    refreshProposals,
    setProposalReloadKey,
    isBusy,
    canClientAct,
  };
}
