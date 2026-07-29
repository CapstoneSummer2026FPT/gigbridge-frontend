import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileSearch,
  Filter,
  LayoutList,
  Loader2,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
  FileText,
  FileQuestion,
  Briefcase,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { MarkdownPreview } from '../../../shared/components/MarkdownEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../app/components/ui/alert-dialog';
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
  type VettingEvaluationResponseDto,
} from '../../../types/models/Proposal';
import type { ProposalStatusFilter, ProposalStatusValue } from '../types';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { ProposalJudgingListView } from '../components/ProposalJudgingListView';
import ClientProposalJobSidebar, {
  sortProposalReviewJobs,
} from '../components/ClientProposalJobSidebar';

type SortBy = 'submittedAt' | 'status' | 'budget' | 'duration' | 'milestoneTotal';
type BusyAction = 'shortlist' | 'reject' | 'accept' | 'open';
type DetailTab = 'overview' | 'plan' | 'screening';

const actionKey = (id: string, action: BusyAction) => `${id}:${action}`;

const badgeClass = (status: number) => {
  if (status === ProposalStatus.Accepted) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (status === ProposalStatus.Rejected || status === ProposalStatus.Withdrawn) return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (status === ProposalStatus.Shortlisted) return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300';
  if (status === ProposalStatus.Draft) return 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  : '—';

const previewText = (value?: string | null, max = 120) => {
  const text = (value || '').replace(/[*_`>#-]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

const durationScore = (value?: string | null) => {
  const amount = Number(value?.match(/\d+/)?.[0] || 0);
  if (value?.toLowerCase().includes('month')) return amount * 30;
  if (value?.toLowerCase().includes('week')) return amount * 7;
  return amount;
};

const getScoreColorClass = (score?: number | null) => {
  if (typeof score !== 'number') return 'border-border text-muted-foreground bg-muted/20';
  if (score >= 80) return 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400';
  if (score >= 60) return 'border-amber-500/40 text-amber-600 bg-amber-500/10 dark:text-amber-400';
  return 'border-rose-500/40 text-rose-600 bg-rose-500/10 dark:text-rose-400';
};

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15';
const buttonFocus = 'outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function ClientProposalsScreen() {
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
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const [answersByProposal, setAnswersByProposal] = useState<Record<string, ProposalAnswerDto[]>>({});
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState('');

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<VettingEvaluationResponseDto | null>(null);
  const [evalError, setEvalError] = useState('');
  const [modalTab, setModalTab] = useState<'userAnswers' | 'proposalDetails' | 'aiReport'>('userAnswers');
  const [message, setMessage] = useState('');
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedJobId, statusFilter, sortBy, budgetMin, budgetMax, durationMax, milestoneMin, milestoneMax, submittedFrom, submittedTo, viewMode, searchTerm]);

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
    if (!activeId || detailTab !== 'screening' || answersByProposal[activeId] !== undefined) return;

    let alive = true;
    setAnswersLoading(true);
    setAnswersError('');
    proposalGetAPI.getProposalAnswers(activeId)
      .then(response => {
        if (!alive) return;
        if (!response.success) {
          setAnswersError(response.message || t('proposalReview.errors.answers'));
          setAnswersLoading(false);
          return;
        }
        setAnswersLoading(false);
        setAnswersByProposal(current => ({ ...current, [activeId]: response.data || [] }));
      })
      .catch(() => {
        if (!alive) return;
        setAnswersError(t('proposalReview.errors.answers'));
        setAnswersLoading(false);
      });
    return () => { alive = false; };
  }, [activeId, answersByProposal, detailTab, t]);

  useEffect(() => {
    if (!activeId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => drawerCloseRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !evalModalOpen && !rejectProposalId) {
        closeDetail();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current || evalModalOpen || rejectProposalId) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeId, evalModalOpen, rejectProposalId]);

  const selectedJob = jobs.find(item => item.jobPostsId === selectedJobId);
  const selectedJobCanNegotiate =
    Number(selectedJob?.status) === 1 &&
    Number(selectedJob?.visibility) !== 3;



  const activeFilterCount = [
    budgetMin,
    budgetMax,
    durationMax,
    milestoneMin,
    milestoneMax,
    submittedFrom,
    submittedTo,
  ].filter(Boolean).length;

  const visible = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minBudget = budgetMin ? Number(budgetMin) : null;
    const maxBudget = budgetMax ? Number(budgetMax) : null;
    const maxDuration = durationMax ? Number(durationMax) : null;
    const minMilestone = milestoneMin ? Number(milestoneMin) : null;
    const maxMilestone = milestoneMax ? Number(milestoneMax) : null;
    const from = submittedFrom ? new Date(`${submittedFrom}T00:00:00`).getTime() : null;
    const to = submittedTo ? new Date(`${submittedTo}T23:59:59`).getTime() : null;

    const filtered = proposals.filter(item => {
      if (
        normalizedSearch &&
        !`${item.freelancerName || ''} ${item.coverLetter || ''} ${item.analysisSummaryPreview || ''}`
          .toLowerCase()
          .includes(normalizedSearch)
      ) return false;
      if (statusFilter !== 'all' && String(item.status) !== statusFilter) return false;
      if (minBudget !== null && (item.proposedBudget || 0) < minBudget) return false;
      if (maxBudget !== null && (item.proposedBudget || 0) > maxBudget) return false;
      if (maxDuration !== null && durationScore(item.proposedDuration) > maxDuration) return false;
      if (minMilestone !== null && (item.milestoneTotal || 0) < minMilestone) return false;
      if (maxMilestone !== null && (item.milestoneTotal || 0) > maxMilestone) return false;
      const submitted = new Date(item.submittedAt || 0).getTime();
      if (from !== null && submitted < from) return false;
      if (to !== null && submitted > to) return false;
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const nameMatch = (item.freelancerName || '').toLowerCase().includes(term);
        const letterMatch = (item.coverLetter || '').toLowerCase().includes(term);
        if (!nameMatch && !letterMatch) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'status') return Number(a.status) - Number(b.status);
      if (sortBy === 'budget') return (a.proposedBudget || 0) - (b.proposedBudget || 0);
      if (sortBy === 'duration') return durationScore(a.proposedDuration) - durationScore(b.proposedDuration);
      if (sortBy === 'milestoneTotal') return (a.milestoneTotal || 0) - (b.milestoneTotal || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [
    budgetMax,
    budgetMin,
    durationMax,
    milestoneMax,
    milestoneMin,
    proposals,
    search,
    sortBy,
    statusFilter,
    submittedFrom,
    submittedTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pagedVisible = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, currentPage, pageSize]);

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
    setSortBy('submittedAt');
    resetAdvancedFilters();
  };

  const selectJob = (id: string) => {
    setSelectedJobId(id);
  };

  const openDetail = (id: string, trigger: HTMLElement) => {
    drawerTriggerRef.current = trigger;
    setActiveId(id);
    setDetailTab('overview');
    setEvalModalOpen(false);
  };

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    setDetailError('');
    proposalGetAPI.getProposalDetail(activeId)
      .then(response => {
        if (!alive) return;
        if (!response.success || !response.data) {
          setDetailError(response.message || t('proposalReview.errors.detail'));
          return;
        }
        setDetail(response.data);
      })
      .catch(() => {
        if (alive) setDetailError(t('proposalReview.errors.detail'));
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeId, t]);

  const closeDetail = () => {
    const trigger = drawerTriggerRef.current;
    setActiveId(null);
    setDetail(null);
    setDetailError('');
    window.setTimeout(() => trigger?.focus(), 0);
  };

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

  const [rawAnswers, setRawAnswers] = useState<ProposalAnswerDto[]>([]);

  const loadEvaluation = async (proposalId: string) => {
    setEvalModalOpen(true);
    setEvalLoading(true);
    setEvalError('');
    setEvalResult(null);
    try {
      setEvalLoading(true);
      setEvalError('');
      setEvalResult(null);
      setRawAnswers([]);

      const answersRes = await proposalGetAPI.getProposalAnswers(proposalId).catch(() => null);

      if (answersRes && answersRes.success && answersRes.data) {
        setRawAnswers(answersRes.data);

        const hasAnswers = answersRes.data.length > 0 && answersRes.data.some(ans => ans.answerText?.trim());
        if (hasAnswers) {
          const evalRes = await proposalPostAPI.evaluateVettingAnswers(proposalId, true).catch(() => null);
          if (evalRes && evalRes.success && evalRes.data) {
            setEvalResult(evalRes.data);
            setProposals(prev => prev.map(p => p.proposalsId === proposalId ? {
              ...p,
              aiScore: evalRes.data.score,
              aiSummary: evalRes.data.summary,
              aiRecommendedHire: evalRes.data.recommendedHire,
              aiTechnicalSkills: evalRes.data.technicalSkills,
              aiSoftSkills: evalRes.data.softSkills,
              aiEvaluatedAt: new Date().toISOString()
            } : p));
          }
        }
      }
    } catch (err: any) {
      setEvalError(err.message || 'An error occurred during evaluation.');
    } finally {
      setEvalLoading(false);
    }
  };

  const runManualEvaluation = async (proposalId: string) => {
    try {
      setEvalLoading(true);
      setEvalError('');
      const evalRes = await proposalPostAPI.evaluateVettingAnswers(proposalId, false);
      if (evalRes && evalRes.success && evalRes.data) {
        setEvalResult(evalRes.data);
        setProposals(prev => prev.map(p => p.proposalsId === proposalId ? {
          ...p,
          aiScore: evalRes.data.score,
          aiSummary: evalRes.data.summary,
          aiRecommendedHire: evalRes.data.recommendedHire,
          aiTechnicalSkills: evalRes.data.technicalSkills,
          aiSoftSkills: evalRes.data.softSkills,
          aiEvaluatedAt: new Date().toISOString()
        } : p));
      } else {
        setEvalError(evalRes.message || 'Failed to evaluate proposal.');
      }
    } catch (err: any) {
      setEvalError(err.message || 'An error occurred during evaluation.');
    } finally {
      setEvalLoading(false);
    }
  };

  const openProposalModal = (proposalId: string, initialTab: 'userAnswers' | 'proposalDetails' | 'aiReport' = 'userAnswers') => {
    setActiveId(proposalId);
    setModalTab(initialTab);
    setEvalModalOpen(true);
    loadEvaluation(proposalId);
  };

  const isBusy = (id: string, action: BusyAction) => busyAction === actionKey(id, action);
  const canClientAct = (status: number) => selectedJobCanNegotiate && [ProposalStatus.Pending, ProposalStatus.Shortlisted].includes(status);
  const answers = activeId ? answersByProposal[activeId] : undefined;
  const detailMilestoneTotal = detail?.milestonePlans?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  const section = (title: string, value?: string | null, fullText: boolean = false) => value ? (
    <section className="rounded-xl border border-border bg-background p-4 space-y-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-foreground whitespace-pre-wrap bg-muted/20 p-3.5 rounded-xl border border-border/50" title={value}>
        {fullText ? value : previewText(value, 110)}
      </p>
    </section>
  ) : null;

  const metricCards = [
    { label: t('proposalReview.metrics.total'), value: stats.total, icon: LayoutList, tone: 'text-slate-600 dark:text-slate-300' },
    { label: t('proposalReview.metrics.pending'), value: stats.pending, icon: FileSearch, tone: 'text-amber-600 dark:text-amber-300' },
    { label: t('proposalReview.metrics.shortlisted'), value: stats.shortlisted, icon: Check, tone: 'text-cyan-600 dark:text-cyan-300' },
    { label: t('proposalReview.metrics.averageBid'), value: formatGigCoin(stats.averageBid), icon: CircleDollarSign, tone: 'text-emerald-600 dark:text-emerald-300' },
  ];
  return (
    <AppLayout fullWidth>
      <div className="min-h-[calc(100vh-5rem)] bg-slate-50/70 text-foreground dark:bg-slate-950/40">
        <header className="border-b border-border bg-background/95 px-4 py-5 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-[1600px] min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/client/dashboard')}
              aria-label={t('proposalReview.back')}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-cyan-500/50 hover:text-foreground ${buttonFocus}`}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
                <Sparkles size={14} />
                {t('proposalReview.eyebrow')}
              </div>
              <h1 className="truncate text-2xl font-bold tracking-tight">{t('proposalReview.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('proposalReview.subtitle')}</p>
            </div>
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-md px-3 py-1.5 font-bold transition ${viewMode === 'table' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Standard Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('aiJudging')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${viewMode === 'aiJudging' ? 'bg-purple-600 text-white shadow' : 'text-purple-600 dark:text-purple-400 hover:text-foreground'}`}
              >
                <Brain size={14} /> AI Judging Leaderboard
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1600px] gap-5 px-4 py-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:px-8">
          <ClientProposalJobSidebar
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelect={selectJob}
            onCreateJob={() => navigate('/jobs/post')}
          />

          <div className="min-w-0 space-y-5">
            {viewMode === 'aiJudging' ? (
              <ProposalJudgingListView
                jobPostId={selectedJobId || ''}
                jobTitle={selectedJob?.title || 'Job Post'}
                proposals={proposals}
                loading={loading}
                onSelectProposal={id => openProposalModal(id, 'aiReport')}
                onOpenAiReport={id => openProposalModal(id, 'aiReport')}
                onShortlist={id => updateStatus(id, ProposalStatus.Shortlisted, 'shortlist')}
                onStartNegotiation={id => acceptForNegotiation(id)}
                onReject={id => updateStatus(id, ProposalStatus.Rejected, 'reject')}
                canAct={selectedJobCanNegotiate}
                onRefreshProposals={refreshProposals}
              />
            ) : (
              <>
                {selectedJob && !selectedJobCanNegotiate && (
            <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('proposalReview.readOnly')}
            </div>
          )}

          <section aria-label={t('proposalReview.metrics.label')} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metricCards.map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
                  </div>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 ${tone}`}>
                    <Icon size={19} />
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">{t('proposalReview.search')}</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={t('proposalReview.searchPlaceholder')}
                    className={`${inputClass} pl-10`}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <select
                    aria-label={t('proposalReview.status')}
                    value={statusFilter}
                    onChange={event => setStatusFilter(event.target.value as ProposalStatusFilter)}
                    className={`${inputClass} sm:w-44`}
                  >
                    <option value="all">{t('proposalReview.statuses.all')}</option>
                    <option value="1">{t('proposalReview.statuses.pending')}</option>
                    <option value="2">{t('proposalReview.statuses.shortlisted')}</option>
                    <option value="3">{t('proposalReview.statuses.accepted')}</option>
                    <option value="4">{t('proposalReview.statuses.rejected')}</option>
                    <option value="5">{t('proposalReview.statuses.withdrawn')}</option>
                  </select>
                  <select
                    aria-label={t('proposalReview.sort')}
                    value={sortBy}
                    onChange={event => setSortBy(event.target.value as SortBy)}
                    className={`${inputClass} sm:w-44`}
                  >
                    <option value="submittedAt">{t('proposalReview.sorts.newest')}</option>
                    <option value="budget">{t('proposalReview.sorts.budget')}</option>
                    <option value="duration">{t('proposalReview.sorts.duration')}</option>
                    <option value="status">{t('proposalReview.sorts.status')}</option>
                    <option value="milestoneTotal">{t('proposalReview.sorts.milestones')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(current => !current)}
                    aria-expanded={filtersOpen}
                    className={`col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${filtersOpen || activeFilterCount ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'border-border hover:bg-muted/50'} ${buttonFocus}`}
                  >
                    <Filter size={16} />
                    {t('proposalReview.filters')}
                    {activeFilterCount > 0 && <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>}
                  </button>
                </div>
              </div>

              {filtersOpen && (
                <div className="mt-4 rounded-xl border border-border bg-muted/25 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal size={16} />{t('proposalReview.advancedFilters')}</h2>
                    <button type="button" onClick={resetAdvancedFilters} className={`text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300 ${buttonFocus}`}>
                      {t('proposalReview.clearAdvanced')}
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <FilterInput label={t('proposalReview.filterLabels.budgetMin')} type="number" value={budgetMin} onChange={setBudgetMin} />
                    <FilterInput label={t('proposalReview.filterLabels.budgetMax')} type="number" value={budgetMax} onChange={setBudgetMax} />
                    <FilterInput label={t('proposalReview.filterLabels.durationMax')} type="number" value={durationMax} onChange={setDurationMax} />
                    <FilterInput label={t('proposalReview.filterLabels.milestoneMin')} type="number" value={milestoneMin} onChange={setMilestoneMin} />
                    <FilterInput label={t('proposalReview.filterLabels.milestoneMax')} type="number" value={milestoneMax} onChange={setMilestoneMax} />
                    <FilterInput label={t('proposalReview.filterLabels.submittedFrom')} type="date" value={submittedFrom} onChange={setSubmittedFrom} />
                    <FilterInput label={t('proposalReview.filterLabels.submittedTo')} type="date" value={submittedTo} onChange={setSubmittedTo} />
                  </div>
                </div>
              )}

              {(search || statusFilter !== 'all' || activeFilterCount > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">{t('proposalReview.activeFilters')}</span>
                  {search && <FilterChip label={`${t('proposalReview.search')}: ${search}`} onRemove={() => setSearch('')} />}
                  {statusFilter !== 'all' && <FilterChip label={getStatusLabel(Number(statusFilter))} onRemove={() => setStatusFilter('all')} />}
                  {activeFilterCount > 0 && <FilterChip label={t('proposalReview.advancedFilterCount', { count: activeFilterCount })} onRemove={resetAdvancedFilters} />}
                  <button type="button" onClick={resetAllFilters} className={`font-semibold text-cyan-700 hover:underline dark:text-cyan-300 ${buttonFocus}`}>
                    {t('proposalReview.clearAll')}
                  </button>
                </div>
              )}
            </div>

            {loadError ? (
              <div className="p-12 text-center">
                <FileSearch className="mx-auto mb-3 text-red-500" size={34} />
                <p role="alert" className="font-semibold">{loadError}</p>
                <button type="button" onClick={() => setProposalReloadKey(current => current + 1)} className="mt-3 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                  {t('proposalReview.retry')}
                </button>
              </div>
            ) : loading ? (
              <ProposalSkeleton />
            ) : visible.length === 0 ? (
              <div className="p-12 text-center">
                <UserRound className="mx-auto mb-3 text-muted-foreground" size={36} />
                <h2 className="font-bold">{proposals.length ? t('proposalReview.emptyFilteredTitle') : t('proposalReview.emptyTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{proposals.length ? t('proposalReview.emptyFilteredBody') : t('proposalReview.emptyBody')}</p>
                {proposals.length > 0 && (
                  <button type="button" onClick={resetAllFilters} className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                    {t('proposalReview.clearAll')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead className="bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">{t('proposalReview.columns.candidate')}</th>
                        <th className="px-4 py-3">{t('proposalReview.columns.offer')}</th>
                        <th className="px-4 py-3">{t('proposalReview.columns.plan')}</th>
                        <th className="min-w-72 px-4 py-3">{t('proposalReview.columns.summary')}</th>
                        <th className="px-4 py-3">{t('proposalReview.columns.status')}</th>
                        <th className="px-4 py-3">{t('proposalReview.columns.submitted')}</th>
                        <th className="px-4 py-3 text-right">{t('proposalReview.columns.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(item => (
                        <ProposalTableRow key={item.proposalsId} item={item} t={t} onOpen={openDetail} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-3 md:hidden">
                  {visible.map(item => (
                    <ProposalCard key={item.proposalsId} item={item} t={t} onOpen={openDetail} />
                  ))}
                </div>
              </>
            )}

            {!loading && !loadError && (
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                {t('proposalReview.results', { visible: visible.length, total: proposals.length })}
              </div>
            )}
          </section>
        </>
      )}
        </div>
      </main>
    </div>

      {activeId && viewMode === 'table' && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label={t('proposalReview.closeDetails')}
            onClick={closeDetail}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/45 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="proposal-detail-title"
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-background shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right sm:max-w-[680px]"
          >
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">{t('proposalReview.drawer.eyebrow')}</p>
                  <h2 id="proposal-detail-title" className="mt-1 truncate text-xl font-bold">
                    {detail?.freelancerName || proposals.find(item => item.proposalsId === activeId)?.freelancerName || t('proposalReview.freelancer')}
                  </h2>
                  {detail && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-1 font-bold ${badgeClass(Number(detail.status))}`}>{getStatusLabel(Number(detail.status))}</span>
                      <span className="text-muted-foreground">{formatGigCoin(detail.proposedBudget || 0)} · {detail.proposedDuration || '—'}</span>
                    </div>
                  )}
                </div>
                <button
                  ref={drawerCloseRef}
                  type="button"
                  onClick={closeDetail}
                  aria-label={t('proposalReview.closeDetails')}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground ${buttonFocus}`}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div role="tablist" aria-label={t('proposalReview.drawer.tabsLabel')} className="flex border-b border-border px-5">
              {(['overview', 'plan', 'screening'] as DetailTab[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === tab}
                  onClick={() => setDetailTab(tab)}
                  className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${detailTab === tab ? 'border-cyan-500 text-cyan-700 dark:text-cyan-300' : 'border-transparent text-muted-foreground hover:text-foreground'} ${buttonFocus}`}
                >
                  {t(`proposalReview.drawer.tabs.${tab}`)}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div aria-label={t('proposalReview.loadingDetails')} className="space-y-4">
                  {[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-xl bg-muted" />)}
                </div>
              ) : detailError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                  <p role="alert">{detailError}</p>
                  <button type="button" onClick={event => openDetail(activeId, event.currentTarget)} className="mt-2 font-semibold underline">{t('proposalReview.retry')}</button>
                </div>
              ) : detail ? (
                <>
                  {detailTab === 'overview' && <OverviewTab detail={detail} t={t} />}
                  {detailTab === 'plan' && <DeliveryPlanTab detail={detail} milestoneTotal={detailMilestoneTotal} t={t} />}
                  {detailTab === 'screening' && (
                    <ScreeningTab
                      proposalId={activeId}
                      answers={answers}
                      loading={answersLoading}
                      error={answersError}
                      t={t}
                      onRetry={() => {
                        setAnswersByProposal(current => {
                          const next = { ...current };
                          delete next[activeId];
                          return next;
                        });
                        setAnswersError('');
                      }}
                      onEvaluate={() => loadEvaluation(activeId)}
                      onOpenAnswers={() => navigate(`/proposals/${activeId}/answers`)}
                    />
                  )}
                </>
              ) : null}
            </div>

            {detail && (
              <DrawerActions
                detail={detail}
                canAct={selectedJobCanNegotiate}
                busyAction={busyAction}
                t={t}
                onShortlist={() => updateStatus(detail.proposalId, ProposalStatus.Shortlisted, 'shortlist')}
                onNegotiate={() => acceptForNegotiation(detail.proposalId)}
                onOpenNegotiation={() => openNegotiation(detail.proposalId)}
                onReject={() => setRejectProposalId(detail.proposalId)}
                isBusy={isBusy}
              />
            )}
          </aside>
        </div>
      )}

      <AlertDialog open={Boolean(rejectProposalId)} onOpenChange={open => !open && setRejectProposalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('proposalReview.reject.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('proposalReview.reject.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyAction)}>{t('proposalReview.reject.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!rejectProposalId || Boolean(busyAction)}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={event => {
                event.preventDefault();
                if (rejectProposalId) void updateStatus(rejectProposalId, ProposalStatus.Rejected, 'reject');
              }}
            >
              {busyAction ? <Loader2 className="animate-spin" size={16} /> : null}
              {t('proposalReview.reject.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {evalModalOpen && (
        viewMode === 'aiJudging' ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl p-6 text-foreground max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground truncate">
                      {detail?.freelancerName || proposals.find(p => p.proposalsId === activeId)?.freelancerName || 'Freelancer Proposal'}
                    </h3>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${badgeClass(Number(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status))}`}>
                      {getStatusLabel(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Proposed rate: <strong>{formatGigCoin(detail?.proposedBudget || proposals.find(p => p.proposalsId === activeId)?.proposedBudget || 0)}</strong> · Milestones: {formatGigCoin(detailMilestoneTotal)} · {detail?.proposedDuration || proposals.find(p => p.proposalsId === activeId)?.proposedDuration || 'N/A'}
                  </p>
                </div>

                {/* Modal Tabs & Close */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
                    <button
                      onClick={() => setModalTab('userAnswers')}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${modalTab === 'userAnswers' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <FileQuestion size={14} /> freelancer  Interview Answer
                    </button>
                    <button
                      onClick={() => setModalTab('proposalDetails')}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${modalTab === 'proposalDetails' ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30 dark:text-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <FileText size={14} /> freelancer Project Proposal
                    </button>
                    <button
                      onClick={() => setModalTab('aiReport')}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${modalTab === 'aiReport' ? 'bg-purple-500/20 text-purple-600 border border-purple-500/30 dark:text-purple-400' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Brain size={14} /> AI Evaluation Interview Report
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-6 scrollbar-thin">
                {modalTab === 'userAnswers' && (
                  <>
                    {evalLoading && (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping"></div>
                          <div className="relative rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-4 text-white">
                            <FileQuestion className="h-8 w-8 animate-pulse" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
                          Loading interview answers...
                        </p>
                      </div>
                    )}

                    {!evalLoading && (
                      rawAnswers.length > 0 ? (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-foreground tracking-tight border-b border-border pb-2 flex items-center justify-between">
                            <span>Screening Questions & Freelancer Answers</span>
                            <span className="text-xs font-normal text-muted-foreground">({rawAnswers.length} questions)</span>
                          </h4>

                          {rawAnswers.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((ans, idx) => (
                            <div key={ans.proposalAnswersId || idx} className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <h5 className="text-sm font-bold text-foreground">
                                  {ans.orderIndex || idx + 1}. {ans.questionText}
                                </h5>
                                {ans.isRequired && (
                                  <span className="shrink-0 rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                                    Required
                                  </span>
                                )}
                              </div>

                              <div className="rounded-lg bg-background border border-border p-3 text-xs space-y-1">
                                <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                  Freelancer Answer
                                </span>
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                  {ans.answerText?.trim() || t('proposalAnswers.noAnswerProvided')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-muted/10 p-6 text-center text-xs text-muted-foreground space-y-2">
                          <FileQuestion size={32} className="mx-auto text-muted-foreground/40" />
                          <p className="font-semibold text-foreground">No freelancer  Interview Answers available.</p>
                        </div>
                      )
                    )}
                  </>
                )}

                {modalTab === 'proposalDetails' && (
                  <div className="space-y-6">
                    {detailLoading ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">Loading proposal details...</div>
                    ) : !detail ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">No proposal details available.</div>
                    ) : (
                      <>
                        {section('Introduction', detail.coverLetter, true)}
                        {section('Analysis', detail.analysisSummary, true)}
                        {section('Solution approach', detail.solutionApproach, true)}
                        {section('Overall deliverables', detail.deliverables, true)}
                        {section('Assumptions', detail.assumptions, true)}
                        {section('Out of scope', detail.outOfScope, true)}

                        <section className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milestone plan</h3>
                          <div className="space-y-3">
                            {detail.milestonePlans?.length ? detail.milestonePlans.map((item, index) => (
                              <div key={item.id || index} className="rounded-xl border border-border bg-background p-4 text-xs space-y-3">
                                <div className="flex justify-between items-center gap-3 border-b border-border pb-2">
                                  <strong className="text-sm font-bold text-foreground">{index + 1}. {item.title || 'Untitled milestone'}</strong>
                                  <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{formatGigCoin(item.amount)}</span>
                                </div>
                                {item.estimatedDuration && (
                                  <div className="text-xs text-muted-foreground">
                                    <strong>Duration:</strong> {item.estimatedDuration}
                                  </div>
                                )}
                                {item.dueDate && (
                                  <div className="text-xs text-muted-foreground">
                                    <strong>Deadline:</strong> {item.dueDate}
                                  </div>
                                )}
                                {item.description && (
                                  <div className="space-y-1">
                                    <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Description</span>
                                    <p className="leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50 text-foreground">{item.description}</p>
                                  </div>
                                )}
                                {item.deliverables && (
                                  <div className="space-y-1">
                                    <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Deliverables</span>
                                    <p className="leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50 text-foreground">{item.deliverables}</p>
                                  </div>
                                )}
                                {item.acceptanceCriteria && (
                                  <div className="space-y-1">
                                    <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Acceptance Criteria</span>
                                    <p className="leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50 text-foreground">{item.acceptanceCriteria}</p>
                                  </div>
                                )}
                                <div className="mt-3 space-y-2 border-t border-border pt-2">
                                  <strong className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Work Breakdown Structure</strong>
                                  {(item.workItems?.length ? item.workItems : detail.workBreakdownItems?.filter(workItem => workItem.milestoneOrderIndex === item.orderIndex) || []).map((workItem, workIndex) => (
                                    <div key={workItem.id || workIndex} className="rounded-lg bg-muted/30 p-3 space-y-1">
                                      <div className="flex justify-between items-center gap-2">
                                        <strong className="text-xs text-foreground">{workIndex + 1}. {workItem.title || 'Untitled work item'}</strong>
                                        <span className="text-[10px] font-semibold text-muted-foreground">{workItem.estimatedDuration}</span>
                                      </div>
                                      {workItem.description && (
                                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{workItem.description}</p>
                                      )}
                                      {workItem.deliverables && (
                                        <p className="text-xs text-foreground">
                                          <strong>Deliverables:</strong> {workItem.deliverables}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )) : <p className="text-sm text-muted-foreground">Legacy proposal: no milestone plan.</p>}
                          </div>
                        </section>
                      </>
                    )}
                  </div>
                )}

                {modalTab === 'aiReport' && (
                  <>
                    {evalLoading && (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
                          <div className="relative rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-4 text-white">
                            <Brain className="h-8 w-8 animate-pulse" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
                          Loading AI Evaluation...
                        </p>
                      </div>
                    )}

                    {evalError && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-red-500 text-sm">
                        {evalError}
                      </div>
                    )}
                     {!evalLoading && (rawAnswers.length === 0 || !evalResult) && (
                      <div className="rounded-xl border border-border bg-muted/10 p-6 text-center text-xs text-muted-foreground space-y-4">
                        <Brain size={32} className="mx-auto text-purple-500/60" />
                        <div>
                          <p className="font-semibold text-foreground">No AI Evaluation Interview Report available.</p>
                          {rawAnswers.length > 0 && rawAnswers.some(ans => ans.answerText?.trim()) && (
                            <p className="text-muted-foreground mt-1">This proposal has not been evaluated by AI yet.</p>
                          )}
                        </div>
                        {rawAnswers.length > 0 && rawAnswers.some(ans => ans.answerText?.trim()) && (
                          <button
                            onClick={() => activeId && runManualEvaluation(activeId)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md cursor-pointer border-none"
                          >
                            <Brain size={14} /> Evaluate Proposal with AI
                          </button>
                        )}
                      </div>
                    )}

                    {!evalLoading && rawAnswers.length > 0 && evalResult && (
                      <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-500/10 pb-4">
                            {/* Overall Score */}
                            <div className="flex items-center gap-3">
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20">
                                <span className="text-xl font-black text-purple-600 dark:text-purple-400">{evalResult.score}</span>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('proposalAnswers.overallScore')}</h4>
                                <p className="text-sm font-semibold">{t('proposalAnswers.aiScore', { score: evalResult.score })}</p>
                              </div>
                            </div>

                            {/* Recommendation Badge */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{t('proposalAnswers.recommendation')}:</span>
                              {evalResult.recommendedHire ? (
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-500">
                                  {t('proposalAnswers.recommended')}
                                </span>
                              ) : (
                                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-500">
                                  {t('proposalAnswers.notRecommended')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Summary */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{t('proposalAnswers.summary')}</h4>
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{evalResult.summary}</p>
                          </div>

                          {/* Skills cloud */}
                          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-purple-500/10">
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t('proposalAnswers.technicalSkills')}</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {evalResult.technicalSkills?.length ? evalResult.technicalSkills.map(skill => (
                                  <span key={skill} className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                    {skill}
                                  </span>
                                )) : <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t('proposalAnswers.softSkills')}</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {evalResult.softSkills?.length ? evalResult.softSkills.map(skill => (
                                  <span key={skill} className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                    {skill}
                                  </span>
                                )) : <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </div>
                          </div>

                          {/* Holistic Adjustments */}
                          {(evalResult.holisticAdjustment !== 0 || evalResult.holisticAdjustmentReason) && (
                            <div className="rounded-lg bg-background border border-border p-3.5 text-xs space-y-1">
                              <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                Holistic Adjustments
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${evalResult.holisticAdjustment > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {evalResult.holisticAdjustment > 0 ? `+${evalResult.holisticAdjustment}` : evalResult.holisticAdjustment} pts
                                </span>
                                {evalResult.holisticAdjustmentReason && (
                                  <span className="text-muted-foreground">· {evalResult.holisticAdjustmentReason}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Questions Breakdown */}
                        {evalResult.gradedQuestions?.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-foreground tracking-tight border-b border-border pb-2">
                              {t('proposalAnswers.questionBreakdown')}
                            </h4>

                            {evalResult.gradedQuestions.map((q, idx) => (
                              <div key={idx} className="rounded-xl border border-border p-4 space-y-3.5">
                                <div className="flex justify-between items-start gap-4">
                                  <h5 className="text-sm font-bold text-foreground leading-snug">
                                    {q.questionIndex + 1}. {q.questionText}
                                  </h5>
                                  <span className={`shrink-0 rounded px-2.5 py-0.5 text-xs font-black border ${getScoreColorClass(q.score)}`}>
                                    {q.score}/100
                                  </span>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Question Type</span>
                                    <p className="mt-0.5 font-semibold text-foreground capitalize">{q.questionType}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</span>
                                    <p className="mt-0.5 font-semibold text-foreground capitalize">{q.difficulty}</p>
                                  </div>
                                </div>

                                <div className="rounded-lg bg-background border border-border p-3 text-xs space-y-1">
                                  <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Candidate Answer</span>
                                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{q.candidateAnswer || t('proposalAnswers.noAnswerProvided')}</p>
                                </div>

                                <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3 text-xs space-y-1">
                                  <span className="block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">AI Feedback</span>
                                  <p className="text-foreground leading-relaxed">{q.feedback}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap items-center justify-between border-t border-border pt-4 mt-6 gap-3">
                <div className="flex items-center gap-2">
                  {activeId && !selectedJobCanNegotiate && (
                    <span className="text-xs font-semibold text-amber-600">
                      Proposal review is read-only.
                    </span>
                  )}
                  {activeId && canClientAct(Number(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status)) && selectedJobCanNegotiate && (
                    <button disabled={isBusy(activeId, 'shortlist')} onClick={() => updateStatus(activeId, ProposalStatus.Shortlisted, 'shortlist')} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs font-bold text-cyan-600 hover:bg-cyan-500/10 disabled:opacity-50">
                      <Check size={14} /> Shortlist
                    </button>
                  )}
                  {activeId && canClientAct(Number(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status)) && selectedJobCanNegotiate && (
                    <>
                      <button disabled={isBusy(activeId, 'reject')} onClick={() => updateStatus(activeId, ProposalStatus.Rejected, 'reject')} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-50">
                        <X size={14} /> Reject
                      </button>
                      <button disabled={isBusy(activeId, 'accept')} onClick={() => acceptForNegotiation(activeId)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        <MessageSquare size={14} /> Start negotiation
                      </button>
                    </>
                  )}
                  {activeId && Number(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status) === ProposalStatus.Accepted && selectedJobCanNegotiate && (
                    <button disabled={isBusy(activeId, 'open')} onClick={() => openNegotiation(activeId)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      <MessageSquare size={14} /> Open negotiation
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setEvalModalOpen(false)}
                  className="rounded-lg bg-muted border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted/80 transition"
                >
                  {t('proposalAnswers.close')}
                </button>
              </div>

            </div>
          </div>
        ) : (
          <EvaluationDialog
            loading={evalLoading}
            error={evalError}
            result={evalResult}
            t={t}
            onClose={() => setEvalModalOpen(false)}
          />
        )
      )}
    </AppLayout>
  );
}

function FilterInput({ label, type, value, onChange }: {
  label: string;
  type: 'number' | 'date';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={event => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 font-medium text-cyan-800 dark:text-cyan-200">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full hover:bg-cyan-500/20"><X size={12} /></button>
    </span>
  );
}

function ProposalTableRow({ item, t, onOpen }: {
  item: ProposalDto;
  t: ReturnType<typeof useTranslation>['t'];
  onOpen: (id: string, trigger: HTMLElement) => void;
}) {
  const status = Number(item.status);
  return (
    <tr className="border-t border-border transition hover:bg-cyan-500/[0.035]">
      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 font-bold text-cyan-700 dark:text-cyan-300">
            {(item.freelancerName || 'F').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="max-w-40 truncate font-semibold">{item.freelancerName || t('proposalReview.freelancer')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('proposalReview.candidate')}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-bold">{formatGigCoin(item.proposedBudget || 0)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{item.proposedDuration || '—'}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold">{item.milestoneCount || 0} {t('proposalReview.milestones')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{item.workItemCount || 0} {t('proposalReview.workItems')} · {formatGigCoin(item.milestoneTotal || 0)}</p>
      </td>
      <td className="px-4 py-4 align-top text-muted-foreground">{previewText(item.analysisSummaryPreview || item.coverLetter, 140) || t('proposalReview.notProvided')}</td>
      <td className="px-4 py-4 align-top"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass(status)}`}>{getStatusLabel(status)}</span></td>
      <td className="px-4 py-4 align-top text-muted-foreground">{formatDate(item.submittedAt)}</td>
      <td className="px-4 py-4 text-right align-top">
        <button
          type="button"
          onClick={event => onOpen(item.proposalsId, event.currentTarget)}
          className={`inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:text-cyan-700 dark:hover:text-cyan-300 ${buttonFocus}`}
        >
          <Eye size={15} />{t('proposalReview.viewDetails')}<ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
}

function ProposalCard({ item, t, onOpen }: {
  item: ProposalDto;
  t: ReturnType<typeof useTranslation>['t'];
  onOpen: (id: string, trigger: HTMLElement) => void;
}) {
  const status = Number(item.status);
  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 font-bold text-cyan-700 dark:text-cyan-300">
            {(item.freelancerName || 'F').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-bold">{item.freelancerName || t('proposalReview.freelancer')}</h2>
            <p className="text-xs text-muted-foreground">{formatDate(item.submittedAt)}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${badgeClass(status)}`}>{getStatusLabel(status)}</span>
      </div>
      <div className="my-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/35 p-3 text-sm">
        <div><p className="text-xs text-muted-foreground">{t('proposalReview.columns.offer')}</p><p className="mt-1 font-bold">{formatGigCoin(item.proposedBudget || 0)}</p></div>
        <div><p className="text-xs text-muted-foreground">{t('proposalReview.sorts.duration')}</p><p className="mt-1 font-semibold">{item.proposedDuration || '—'}</p></div>
      </div>
      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{previewText(item.analysisSummaryPreview || item.coverLetter, 150) || t('proposalReview.notProvided')}</p>
      <button
        type="button"
        onClick={event => onOpen(item.proposalsId, event.currentTarget)}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 ${buttonFocus}`}
      >
        <Eye size={16} />{t('proposalReview.viewDetails')}
      </button>
    </article>
  );
}

function ProposalSkeleton() {
  return (
    <div aria-label="Loading proposals" className="space-y-3 p-4">
      {[1, 2, 3, 4].map(item => (
        <div key={item} className="grid animate-pulse grid-cols-[160px_120px_160px_1fr_100px] gap-6 py-3">
          {[1, 2, 3, 4, 5].map(cell => <div key={cell} className="h-10 rounded-lg bg-muted" />)}
        </div>
      ))}
    </div>
  );
}

function OverviewTab({ detail, t }: { detail: ProposalDetailDto; t: ReturnType<typeof useTranslation>['t'] }) {
  const sections = [
    [t('proposalReview.drawer.coverLetter'), detail.coverLetter],
    [t('proposalReview.drawer.analysis'), detail.analysisSummary],
    [t('proposalReview.drawer.approach'), detail.solutionApproach],
    [t('proposalReview.drawer.deliverables'), detail.deliverables],
    [t('proposalReview.drawer.assumptions'), detail.assumptions],
    [t('proposalReview.drawer.outOfScope'), detail.outOfScope],
  ] as const;
  return (
    <div className="space-y-4">
      {sections.map(([title, value]) => (
        <section key={title} className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
          {value?.trim() ? <MarkdownPreview value={value} className="text-sm leading-6" /> : <p className="text-sm italic text-muted-foreground">{t('proposalReview.notProvided')}</p>}
        </section>
      ))}
    </div>
  );
}

function DeliveryPlanTab({ detail, milestoneTotal, t }: {
  detail: ProposalDetailDto;
  milestoneTotal: number;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const budgetDiffers = Math.abs(milestoneTotal - Number(detail.proposedBudget || 0)) > 0.01;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/25 p-4">
        <div><p className="text-xs font-semibold text-muted-foreground">{t('proposalReview.drawer.proposedBudget')}</p><p className="mt-1 text-lg font-bold">{formatGigCoin(detail.proposedBudget || 0)}</p></div>
        <div><p className="text-xs font-semibold text-muted-foreground">{t('proposalReview.drawer.milestoneTotal')}</p><p className="mt-1 text-lg font-bold">{formatGigCoin(milestoneTotal)}</p></div>
      </div>
      {budgetDiffers && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">{t('proposalReview.drawer.budgetNotice')}</p>
      )}
      {(detail.milestonePlans || []).length ? detail.milestonePlans?.map((milestone, index) => (
        <details key={milestone.id || index} open={index === 0} className="group rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <h3 className="truncate font-bold">{index + 1}. {milestone.title || t('proposalReview.milestone')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{milestone.estimatedDuration || '—'} {milestone.dueDate ? `· ${formatDate(milestone.dueDate)}` : ''}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <strong>{formatGigCoin(milestone.amount || 0)}</strong>
              <ChevronDown className="transition group-open:rotate-180" size={17} />
            </div>
          </summary>
          <div className="space-y-3 border-t border-border p-4 text-sm">
            {milestone.description && <p className="leading-6 text-muted-foreground">{milestone.description}</p>}
            {milestone.deliverables && <PlanField label={t('proposalReview.drawer.deliverables')} value={milestone.deliverables} />}
            {milestone.acceptanceCriteria && <PlanField label={t('proposalReview.drawer.acceptance')} value={milestone.acceptanceCriteria} />}
            {(milestone.workItems || []).map((workItem, workIndex) => (
              <div key={workItem.id || workIndex} className="rounded-lg bg-muted/35 p-3">
                <p className="font-semibold">{workIndex + 1}. {workItem.title || t('proposalReview.workItem')}</p>
                {workItem.description && <p className="mt-1 text-muted-foreground">{workItem.description}</p>}
              </div>
            ))}
          </div>
        </details>
      )) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t('proposalReview.drawer.noMilestones')}</div>
      )}
      {(detail.workBreakdownItems || []).length > 0 && (
        <section className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-bold">{t('proposalReview.drawer.unassignedWork')}</h3>
          <div className="space-y-2">
            {detail.workBreakdownItems?.map((item, index) => (
              <div key={item.id || index} className="rounded-lg bg-muted/35 p-3 text-sm">
                <p className="font-semibold">{index + 1}. {item.title || t('proposalReview.workItem')}</p>
                {item.description && <p className="mt-1 text-muted-foreground">{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 leading-6">{value}</p></div>;
}

function ScreeningTab({ proposalId, answers, loading, error, t, onRetry, onEvaluate, onOpenAnswers }: {
  proposalId: string;
  answers?: ProposalAnswerDto[];
  loading: boolean;
  error: string;
  t: ReturnType<typeof useTranslation>['t'];
  onRetry: () => void;
  onEvaluate: () => void;
  onOpenAnswers: () => void;
}) {
  const completed = answers?.filter(answer => Boolean(answer.answerText?.trim())) || [];
  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={18} />{t('proposalReview.screening.loading')}</div>;
  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm"><p role="alert">{error}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">{t('proposalReview.retry')}</button></div>;
  if (!answers) return null;
  if (answers.length === 0) return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={30} />
      <h3 className="font-bold">{t('proposalReview.screening.noQuestionsTitle')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('proposalReview.screening.noQuestionsBody')}</p>
    </div>
  );

  return (
    <div className="space-y-4" data-proposal-id={proposalId}>
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/25 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold">{t('proposalReview.screening.summary', { answered: completed.length, total: answers.length })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('proposalReview.screening.explanation')}</p>
        </div>
        <button type="button" onClick={onOpenAnswers} className={`shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted ${buttonFocus}`}>{t('proposalReview.screening.openFull')}</button>
      </div>
      {answers.map((answer, index) => (
        <article key={answer.jobPostQuestionsId} className="rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-xs font-bold text-cyan-700 dark:text-cyan-300">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-6">{answer.questionText}</h3>
              {answer.answerText?.trim()
                ? <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/35 p-3 text-sm leading-6">{answer.answerText}</p>
                : <p className="mt-3 text-sm italic text-muted-foreground">{t('proposalReview.screening.noAnswer')}</p>}
            </div>
          </div>
        </article>
      ))}
      {completed.length > 0 ? (
        <button type="button" onClick={onEvaluate} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/15 hover:from-violet-700 hover:to-indigo-700 ${buttonFocus}`}>
          <Brain size={17} />{t('proposalReview.screening.evaluate')}
        </button>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold">{t('proposalReview.screening.noCompletedTitle')}</p>
          <p className="mt-1">{t('proposalReview.screening.noCompletedBody')}</p>
        </div>
      )}
    </div>
  );
}

function DrawerActions({ detail, canAct, busyAction, t, onShortlist, onNegotiate, onOpenNegotiation, onReject, isBusy }: {
  detail: ProposalDetailDto;
  canAct: boolean;
  busyAction: string | null;
  t: ReturnType<typeof useTranslation>['t'];
  onShortlist: () => void;
  onNegotiate: () => void;
  onOpenNegotiation: () => void;
  onReject: () => void;
  isBusy: (id: string, action: BusyAction) => boolean;
}) {
  const status = Number(detail.status);
  if (!canAct) return <div className="border-t border-border bg-muted/25 px-5 py-4 text-sm font-medium text-muted-foreground">{t('proposalReview.readOnly')}</div>;
  if (status === ProposalStatus.Accepted) return (
    <div className="border-t border-border bg-background p-4">
      <button type="button" onClick={onOpenNegotiation} disabled={Boolean(busyAction)} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-50 ${buttonFocus}`}>
        {isBusy(detail.proposalId, 'open') ? <Loader2 className="animate-spin" size={17} /> : <MessageSquare size={17} />}
        {t('proposalReview.actions.openNegotiation')}
      </button>
    </div>
  );
  if (![ProposalStatus.Pending, ProposalStatus.Shortlisted].includes(status)) return null;
  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        {status === ProposalStatus.Pending && (
          <button type="button" onClick={onShortlist} disabled={Boolean(busyAction)} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 px-4 py-3 text-sm font-bold text-cyan-700 hover:bg-cyan-500/10 disabled:opacity-50 dark:text-cyan-300 ${buttonFocus}`}>
            {isBusy(detail.proposalId, 'shortlist') ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
            {t('proposalReview.actions.shortlist')}
          </button>
        )}
        <button type="button" onClick={onNegotiate} disabled={Boolean(busyAction)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 ${buttonFocus}`}>
          {isBusy(detail.proposalId, 'accept') ? <Loader2 className="animate-spin" size={17} /> : <MessageSquare size={17} />}
          {t('proposalReview.actions.negotiate')}
        </button>
        <button type="button" onClick={onReject} disabled={Boolean(busyAction)} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400 ${buttonFocus}`}>
          <X size={17} />{t('proposalReview.actions.reject')}
        </button>
      </div>
    </div>
  );
}

function EvaluationDialog({ loading, error, result, t, onClose }: {
  loading: boolean;
  error: string;
  result: VettingEvaluationResponseDto | null;
  t: ReturnType<typeof useTranslation>['t'];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="answer-evaluation-title">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">{t('proposalReview.evaluation.eyebrow')}</p>
            <h2 id="answer-evaluation-title" className="mt-1 text-xl font-bold">{t('proposalReview.evaluation.title')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('proposalReview.evaluation.close')} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted ${buttonFocus}`}><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && <div className="flex flex-col items-center justify-center py-16 text-center"><Loader2 className="mb-3 animate-spin text-violet-600" size={30} /><p className="font-semibold">{t('proposalReview.evaluation.loading')}</p><p className="mt-1 text-sm text-muted-foreground">{t('proposalReview.evaluation.loadingBody')}</p></div>}
          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
          {result && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-violet-500/10 p-4"><p className="text-xs font-semibold text-muted-foreground">{t('proposalAnswers.overallScore')}</p><p className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-300">{result.score}/100</p></div>
                <div className="rounded-xl bg-muted/35 p-4 sm:col-span-2"><p className="text-xs font-semibold text-muted-foreground">{t('proposalAnswers.recommendation')}</p><p className={`mt-1 font-bold ${result.recommendedHire ? 'text-emerald-600' : 'text-amber-600'}`}>{result.recommendedHire ? t('proposalAnswers.recommended') : t('proposalAnswers.notRecommended')}</p></div>
              </div>
              <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('proposalAnswers.summary')}</h3><p className="whitespace-pre-wrap text-sm leading-6">{result.summary}</p></section>
              <div className="grid gap-3 sm:grid-cols-2">
                <SkillList title={t('proposalAnswers.technicalSkills')} values={result.technicalSkills} />
                <SkillList title={t('proposalAnswers.softSkills')} values={result.softSkills} />
              </div>
              {result.gradedQuestions.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-bold">{t('proposalAnswers.questionBreakdown')}</h3>
                  <div className="space-y-3">
                    {result.gradedQuestions.map(question => (
                      <article key={`${question.questionIndex}-${question.questionText}`} className="rounded-xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3"><h4 className="text-sm font-semibold">{question.questionIndex + 1}. {question.questionText}</h4><span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">{question.score}/100</span></div>
                        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('proposalAnswers.candidateAnswer')}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{question.candidateAnswer || t('proposalAnswers.noAnswerProvided')}</p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('proposalAnswers.aiFeedback')}</p>
                        <p className="mt-1 text-sm leading-6">{question.feedback}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-border p-4 text-right"><button type="button" onClick={onClose} className={`rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted ${buttonFocus}`}>{t('proposalReview.evaluation.close')}</button></div>
      </div>
    </div>
  );
}

function SkillList({ title, values }: { title: string; values: string[] }) {
  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{values.length ? values.map(value => <span key={value} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{value}</span>) : <span className="text-sm text-muted-foreground">—</span>}</div>
    </section>
  );
}
