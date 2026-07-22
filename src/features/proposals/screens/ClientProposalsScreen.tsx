import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Check, Eye, FileText, MessageSquare, X, Brain, Sparkles, FileQuestion } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import { ProposalStatus, type ProposalDetailDto, type ProposalDto, type ProposalAnswerDto, type VettingEvaluationResponseDto } from '../../../types/models/Proposal';
import type { ProposalStatusFilter, ProposalStatusValue } from '../types';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { ProposalJudgingListView } from '../components/ProposalJudgingListView';

type SortBy = 'submittedAt' | 'status' | 'budget' | 'duration' | 'milestoneTotal';
type BusyAction = 'shortlist' | 'reject' | 'accept' | 'open';

const actionKey = (id: string, action: BusyAction) => `${id}:${action}`;

const badgeClass = (status: number) => {
  if (status === ProposalStatus.Accepted) return 'bg-emerald-500/10 text-emerald-500';
  if (status === ProposalStatus.Rejected || status === ProposalStatus.Withdrawn) return 'bg-red-500/10 text-red-500';
  if (status === ProposalStatus.Shortlisted) return 'bg-cyan-500/10 text-cyan-500';
  if (status === ProposalStatus.Draft) return 'bg-slate-500/10 text-slate-500';
  return 'bg-amber-500/10 text-amber-500';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'N/A';

const previewText = (value?: string | null, max = 96) => {
  const text = (value || '').replace(/[*_`>#-]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const sentence = text.match(/.+?[.!?](\s|$)/)?.[0]?.trim() || text;
  const preview = sentence.length > max ? sentence.slice(0, max).trimEnd() : sentence;
  return preview.length < text.length ? `${preview}...` : preview;
};

const durationScore = (value?: string) => {
  const amount = Number(value?.match(/\d+/)?.[0] || 0);
  if (value?.toLowerCase().includes('month')) return amount * 30;
  if (value?.toLowerCase().includes('week')) return amount * 7;
  return amount;
};

export default function ClientProposalsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<VettingEvaluationResponseDto | null>(null);
  const [evalError, setEvalError] = useState('');
  const [modalTab, setModalTab] = useState<'userAnswers' | 'proposalDetails' | 'aiReport'>('userAnswers');
  const queryJobId = useMemo(() => new URLSearchParams(location.search).get('job'), [location.search]);
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(queryJobId);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProposalDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('submittedAt');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [milestoneMin, setMilestoneMin] = useState('');
  const [milestoneMax, setMilestoneMax] = useState('');
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'aiJudging'>('table');

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
        setSelectedJobId(current => current || items[0]?.jobPostsId || null);
        if (!response.success) setMessage(response.message || 'Could not load project requests.');
      })
      .catch(() => alive && setMessage('Could not load project requests.'));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setProposals([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setMessage('');
    setDetail(null);
    proposalGetAPI.getProposalsByJobPost(selectedJobId, { pageIndex: 1, pageSize: 100 })
      .then(response => {
        if (!alive) return;
        const items = response.data || [];
        setProposals(items);
        setActiveId(items[0]?.proposalsId || null);
        if (!response.success) setMessage(response.message || 'Could not load proposals.');
      })
      .catch(() => alive && setMessage('Could not load proposals.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [selectedJobId]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }

    let alive = true;
    setDetailLoading(true);
    proposalGetAPI.getProposalDetail(activeId)
      .then(response => {
        if (!alive) return;
        setDetail(response.data || null);
        if (!response.success) setMessage(response.message || 'Could not load proposal details.');
      })
      .catch(() => alive && setMessage('Could not load proposal details.'))
      .finally(() => alive && setDetailLoading(false));
    return () => { alive = false; };
  }, [activeId]);

  const visible = useMemo(() => {
    const minBudget = budgetMin ? Number(budgetMin) : null;
    const maxBudget = budgetMax ? Number(budgetMax) : null;
    const maxDuration = durationMax ? Number(durationMax) : null;
    const minMilestone = milestoneMin ? Number(milestoneMin) : null;
    const maxMilestone = milestoneMax ? Number(milestoneMax) : null;
    const from = submittedFrom ? new Date(`${submittedFrom}T00:00:00`).getTime() : null;
    const to = submittedTo ? new Date(`${submittedTo}T23:59:59`).getTime() : null;

    const filtered = proposals.filter(item => {
      if (statusFilter !== 'all' && String(item.status) !== statusFilter) return false;
      if (minBudget !== null && (item.proposedBudget || 0) < minBudget) return false;
      if (maxBudget !== null && (item.proposedBudget || 0) > maxBudget) return false;
      if (maxDuration !== null && durationScore(item.proposedDuration) > maxDuration) return false;
      if (minMilestone !== null && (item.milestoneTotal || 0) < minMilestone) return false;
      if (maxMilestone !== null && (item.milestoneTotal || 0) > maxMilestone) return false;
      const submitted = new Date(item.submittedAt || 0).getTime();
      if (from !== null && submitted < from) return false;
      if (to !== null && submitted > to) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'status') return Number(a.status) - Number(b.status);
      if (sortBy === 'budget') return (a.proposedBudget || 0) - (b.proposedBudget || 0);
      if (sortBy === 'duration') return durationScore(a.proposedDuration) - durationScore(b.proposedDuration);
      if (sortBy === 'milestoneTotal') return (a.milestoneTotal || 0) - (b.milestoneTotal || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [budgetMax, budgetMin, durationMax, milestoneMax, milestoneMin, proposals, sortBy, statusFilter, submittedFrom, submittedTo]);

  const resetFilters = () => {
    setStatusFilter('all');
    setBudgetMin('');
    setBudgetMax('');
    setDurationMax('');
    setMilestoneMin('');
    setMilestoneMax('');
    setSubmittedFrom('');
    setSubmittedTo('');
  };

  const selectJob = (id: string) => {
    setSelectedJobId(id);
    navigate(`/proposals?job=${id}`, { replace: true });
  };

  const selectedJob = jobs.find(item => item.jobPostsId === selectedJobId);
  const selectedJobCanNegotiate =
    Number(selectedJob?.status) === 1 &&
    Number(selectedJob?.visibility) !== 3;

  const updateStatus = async (id: string, status: ProposalStatusValue, action: BusyAction) => {
    if (!selectedJobCanNegotiate) {
      setMessage('This job post is no longer open for proposal actions.');
      return;
    }

    setBusyAction(actionKey(id, action));
    setMessage('');
    const response = await proposalPatchAPI.updateProposalStatus(id, { status });
    setBusyAction(null);

    if (!response.success) {
      setMessage(response.message || 'Could not update proposal status.');
      return;
    }

    setProposals(items => items.map(item => item.proposalsId === id ? { ...item, status } : item));
    setDetail(current => current?.proposalId === id ? { ...current, status } : current);
    setMessage(status === ProposalStatus.Shortlisted ? 'Proposal shortlisted.' : 'Proposal rejected.');
  };

  const acceptForNegotiation = async (id: string) => {
    if (!selectedJobCanNegotiate) {
      setMessage('This job post is no longer open for negotiation.');
      return;
    }

    setBusyAction(actionKey(id, 'accept'));
    setMessage('');
    const response = await proposalPostAPI.acceptForNegotiation(id);
    setBusyAction(null);

    if (!response.success || !response.data) {
      setMessage(response.message || 'Could not start negotiation.');
      return;
    }

    navigate('/messages', { state: { activeConvId: response.data } });
  };

  const openNegotiation = async (id: string) => {
    if (!selectedJobCanNegotiate) {
      setMessage('This job post is no longer open for negotiation.');
      return;
    }

    setBusyAction(actionKey(id, 'open'));
    setMessage('');
    const response = await messagePostAPI.startNegotiationFromProposal(id);
    setBusyAction(null);

    if (!response.success || !response.data) {
      setMessage(response.message || 'Could not open negotiation.');
      return;
    }

    navigate('/messages', { state: { activeConvId: response.data } });
  };

  const [rawAnswers, setRawAnswers] = useState<ProposalAnswerDto[]>([]);

  const loadEvaluation = async (proposalId: string) => {
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
  const detailMilestoneTotal = detail?.milestonePlans?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  const section = (title: string, value?: string | null, fullText: boolean = false) => value ? (
    <section className="rounded-xl border border-border bg-background p-4 space-y-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-foreground whitespace-pre-wrap bg-muted/20 p-3.5 rounded-xl border border-border/50" title={value}>
        {fullText ? value : previewText(value, 110)}
      </p>
    </section>
  ) : null;

  return (
    <AppLayout fullWidth>
      <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden bg-background text-foreground">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => navigate('/client/dashboard')}
              title="Back to dashboard"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold">Proposal Comparison</h1>
              <p className="text-xs text-muted-foreground">Compare scope, price, and payment plans</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-md px-3 py-1.5 font-bold transition ${viewMode === 'table' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Standard Table
              </button>
              <button
                onClick={() => setViewMode('aiJudging')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${viewMode === 'aiJudging' ? 'bg-purple-600 text-white shadow' : 'text-purple-600 dark:text-purple-400 hover:text-foreground'}`}
              >
                <Brain size={14} /> AI Judging Leaderboard
              </button>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ProposalStatusFilter)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <option value="all">All statuses</option>
              <option value="0">Draft</option>
              <option value="1">Pending</option>
              <option value="2">Shortlisted</option>
              <option value="3">Accepted</option>
              <option value="4">Rejected</option>
              <option value="5">Withdrawn</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <option value="submittedAt">Newest</option>
              <option value="budget">Budget</option>
              <option value="duration">Duration</option>
              <option value="status">Status</option>
              <option value="milestoneTotal">Milestone total</option>
            </select>
            <button onClick={resetFilters} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/20">Reset filters</button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="max-h-52 min-w-0 overflow-y-auto border-b border-border bg-background lg:max-h-none lg:border-b-0 lg:border-r">
            <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Project Requests</div>
            {jobs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No project requests found.</div>
            ) : jobs.map(job => (
              <button
                key={job.jobPostsId}
                onClick={() => selectJob(job.jobPostsId)}
                className={`block w-full border-b border-border/50 px-4 py-3 text-left transition ${job.jobPostsId === selectedJobId ? 'border-l-4 border-l-cyan-500 bg-cyan-500/5' : 'hover:bg-muted/20'}`}
              >
                <strong className="block truncate text-sm leading-5">{job.title}</strong>
                <span className="mt-1 block truncate text-xs leading-5 text-muted-foreground" title={job.description || ''}>{previewText(job.description, 72) || 'No description provided.'}</span>
              </button>
            ))}
          </aside>

          <main className="min-w-0 overflow-auto p-3 lg:p-4">
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
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{selectedJob?.title || 'Select a project request'}</h2>
                    <p className="text-xs text-muted-foreground">{visible.length} of {proposals.length} proposals shown</p>
                    {selectedJob && !selectedJobCanNegotiate && (
                      <p className="mt-1 text-xs font-semibold text-amber-600">
                        This job post is not open for negotiation. Proposal review is read-only.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-3 grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs sm:grid-cols-2 2xl:grid-cols-4">
                  <input value={budgetMin} onChange={e => setBudgetMin(e.target.value)} type="number" placeholder="Budget min" className="rounded border border-border bg-background px-2 py-2" />
                  <input value={budgetMax} onChange={e => setBudgetMax(e.target.value)} type="number" placeholder="Budget max" className="rounded border border-border bg-background px-2 py-2" />
                  <input value={durationMax} onChange={e => setDurationMax(e.target.value)} type="number" placeholder="Max duration days" className="rounded border border-border bg-background px-2 py-2" />
                  <input value={milestoneMin} onChange={e => setMilestoneMin(e.target.value)} type="number" placeholder="Milestone total min" className="rounded border border-border bg-background px-2 py-2" />
                  <input value={milestoneMax} onChange={e => setMilestoneMax(e.target.value)} type="number" placeholder="Milestone total max" className="rounded border border-border bg-background px-2 py-2" />
                  <input value={submittedFrom} onChange={e => setSubmittedFrom(e.target.value)} type="date" className="rounded border border-border bg-background px-2 py-2" />
                  <input value={submittedTo} onChange={e => setSubmittedTo(e.target.value)} type="date" className="rounded border border-border bg-background px-2 py-2" />
                </div>

                {message && <div role="status" className="mb-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-700">{message}</div>}

                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full min-w-[980px] text-left text-xs">
                    <thead className="sticky top-0 bg-muted text-muted-foreground">
                      <tr>
                        <th className="w-36 p-3">Freelancer</th>
                        <th className="p-3">AI Score</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Budget</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3 text-center">Work items</th>
                        <th className="p-3 text-center">Milestones</th>
                        <th className="p-3">Milestone total</th>
                        <th className="p-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">Loading proposals...</td></tr>
                      ) : visible.length === 0 ? (
                        <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">No proposals found.</td></tr>
                      ) : visible.map(item => {
                        const status = Number(item.status);
                        const hasScore = typeof item.aiScore === 'number' && item.aiScore > 0;
                        return (
                          <tr key={item.proposalsId} onClick={() => openProposalModal(item.proposalsId, 'userAnswers')} className={`cursor-pointer border-t border-border hover:bg-muted/20 ${activeId === item.proposalsId ? 'bg-cyan-500/5 shadow-[inset_3px_0_0_rgb(6_182_212)]' : ''}`}>
                            <td className="p-3 align-top font-semibold"><span className="block max-w-32 truncate">{item.freelancerName || 'Freelancer'}</span></td>
                            <td className="p-3 align-top">
                              {hasScore ? (
                                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-black ${item.aiScore! >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : item.aiScore! >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                  <Brain size={12} /> {item.aiScore}/100
                                </span>
                              ) : (
                                <span className="text-muted-foreground">none</span>
                              )}
                            </td>
                            <td className="p-3 align-top"><span className={`rounded px-2 py-1 font-bold ${badgeClass(status)}`}>{getStatusLabel(item.status)}</span></td>
                            <td className="p-3 align-top font-semibold">{formatGigCoin(item.proposedBudget || 0)}</td>
                            <td className="p-3 align-top">{item.proposedDuration || 'N/A'}</td>
                            <td className="p-3 text-center align-top">{item.workItemCount ?? 0}</td>
                            <td className="p-3 text-center align-top">{item.milestoneCount ?? 0}</td>
                            <td className="p-3 align-top font-semibold">{formatGigCoin(item.milestoneTotal || 0)}</td>
                            <td className="p-3 align-top">{formatDate(item.submittedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {evalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl p-6 text-foreground max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    {detail?.freelancerName || proposals.find(p => p.proposalsId === activeId)?.freelancerName || 'Candidate Proposal'}
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
                    <FileQuestion size={14} /> User Interview Answer
                  </button>
                  <button
                    onClick={() => setModalTab('proposalDetails')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition ${modalTab === 'proposalDetails' ? 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30 dark:text-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <FileText size={14} /> Proposal Scope & Milestone
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
                          <span>Screening Questions & Candidate Answers</span>
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
                                Candidate Answer
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
                        <p className="font-semibold text-foreground">No User Interview Answers available.</p>
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
                      {section('Requirement analysis', detail.analysisSummary, true)}
                      {section('Solution approach', detail.solutionApproach, true)}
                      {section('Overall deliverables', detail.deliverables, true)}
                      {section('Assumptions', detail.assumptions, true)}
                      {section('Out of scope', detail.outOfScope, true)}

                      <section className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work breakdown</h3>
                        <div className="space-y-3">
                          {detail.workBreakdownItems?.length ? detail.workBreakdownItems.map((item, index) => (
                            <div key={item.id || index} className="rounded-xl border border-border bg-background p-4 space-y-3">
                              <div className="flex justify-between items-center gap-3 border-b border-border pb-2">
                                <strong className="text-sm font-bold text-foreground">{index + 1}. {item.title || 'Untitled work item'}</strong>
                                <span className="text-xs font-semibold text-muted-foreground">{item.estimatedDuration}</span>
                              </div>
                              {item.description && (
                                <div className="text-xs text-foreground space-y-1">
                                  <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Description</span>
                                  <p className="leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50">{item.description}</p>
                                </div>
                              )}
                              {item.deliverables && (
                                <div className="text-xs text-foreground space-y-1">
                                  <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">Deliverables</span>
                                  <p className="leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50">{item.deliverables}</p>
                                </div>
                              )}
                            </div>
                          )) : <p className="text-sm text-muted-foreground">No work breakdown provided.</p>}
                        </div>
                      </section>

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
                            </div>
                          )) : <p className="text-sm text-muted-foreground">No milestone plan provided.</p>}
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
                              <span className="rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-500">
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
                              {evalResult.technicalSkills?.length ? evalResult.technicalSkills.map((s, idx) => (
                                <span key={idx} className="rounded bg-background border border-border px-2 py-0.5 text-xs text-foreground font-medium">
                                  {s}
                                </span>
                              )) : <span className="text-xs text-muted-foreground">N/A</span>}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{t('proposalAnswers.softSkills')}</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {evalResult.softSkills?.length ? evalResult.softSkills.map((s, idx) => (
                                <span key={idx} className="rounded bg-background border border-border px-2 py-0.5 text-xs text-foreground font-medium">
                                  {s}
                                </span>
                              )) : <span className="text-xs text-muted-foreground">N/A</span>}
                            </div>
                          </div>
                        </div>

                        {/* Holistic Adjustment */}
                        {evalResult.holisticAdjustment !== 0 && (
                          <div className="rounded-lg bg-background border border-border p-3 text-xs">
                            <div className="flex items-center justify-between font-bold text-foreground">
                              <span>{t('proposalAnswers.holisticAdjustment')}:</span>
                              <span className={evalResult.holisticAdjustment > 0 ? 'text-emerald-500' : 'text-red-500'}>
                                {evalResult.holisticAdjustment > 0 ? `+${evalResult.holisticAdjustment}` : evalResult.holisticAdjustment}
                              </span>
                            </div>
                            {evalResult.holisticAdjustmentReason && (
                              <p className="mt-1 text-muted-foreground">{t('proposalAnswers.adjustmentReason')}: {evalResult.holisticAdjustmentReason}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Question-by-Question Graded Feedback */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-foreground tracking-tight border-b border-border pb-2">
                          {t('proposalAnswers.questionBreakdown')}
                        </h4>

                        {evalResult.gradedQuestions && evalResult.gradedQuestions.length > 0 ? (
                          evalResult.gradedQuestions.map((q) => (
                            <div key={q.questionIndex} className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <h5 className="text-sm font-bold text-foreground">
                                  {q.questionIndex}. {q.questionText}
                                </h5>
                                <span className="shrink-0 rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-500">
                                  {q.score}/100
                                </span>
                              </div>

                              {/* Candidate Answer */}
                              <div className="rounded-lg bg-background border border-border p-3 text-xs space-y-1">
                                <span className="block text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                  {t('proposalAnswers.candidateAnswer')}
                                </span>
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                  {q.candidateAnswer || t('proposalAnswers.noAnswerProvided')}
                                </p>
                              </div>

                              {/* AI feedback */}
                              <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-3 text-xs space-y-1">
                                <span className="block text-[10px] font-black uppercase text-purple-500 dark:text-purple-400 tracking-wider">
                                  {t('proposalAnswers.aiFeedback')}
                                </span>
                                <p className="text-muted-foreground leading-relaxed italic">{q.feedback}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-border bg-muted/10 p-4 text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground">No screening questions evaluated for this proposal.</p>
                            <p>The candidate was evaluated holistically based on their profile, technical skill match, and overall proposal scope.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border pt-4 mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {activeId && Number(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status) === ProposalStatus.Pending && selectedJobCanNegotiate && (
                  <button disabled={isBusy(activeId, 'shortlist')} onClick={() => updateStatus(activeId, ProposalStatus.Shortlisted, 'shortlist')} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs font-bold text-cyan-600 hover:bg-cyan-500/10 disabled:opacity-50">
                    <Check size={14} /> Shortlist
                  </button>
                )}
                {activeId && canClientAct(Number(detail?.status ?? proposals.find(p => p.proposalsId === activeId)?.status)) && (
                  <>
                    <button disabled={isBusy(activeId, 'accept')} onClick={() => acceptForNegotiation(activeId)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      <MessageSquare size={14} /> Start negotiation
                    </button>
                    <button disabled={isBusy(activeId, 'reject')} onClick={() => updateStatus(activeId, ProposalStatus.Rejected, 'reject')} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-50">
                      <X size={14} /> Reject
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
      )}
    </AppLayout>
  );
}
