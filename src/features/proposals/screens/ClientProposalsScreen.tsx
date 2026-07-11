import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Check, Eye, FileText, MessageSquare, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { proposalPostAPI } from '../../../api/proposalAPI/POST';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import { ProposalStatus, type ProposalDetailDto, type ProposalDto } from '../../../types/models/Proposal';
import type { ProposalStatusFilter, ProposalStatusValue } from '../types';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';

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
  const navigate = useNavigate();
  const location = useLocation();
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

  const isBusy = (id: string, action: BusyAction) => busyAction === actionKey(id, action);
  const canClientAct = (status: number) => selectedJobCanNegotiate && [ProposalStatus.Pending, ProposalStatus.Shortlisted].includes(status);
  const detailMilestoneTotal = detail?.milestonePlans?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  const section = (title: string, value?: string | null) => value ? (
    <section className="rounded-lg border border-border bg-background p-4">
      <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">{title}</h3>
      <p className="m-0 text-sm leading-6 text-foreground" title={value}>{previewText(value, 110)}</p>
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

          <div className="flex flex-wrap gap-2">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px] 2xl:grid-cols-[260px_minmax(0,1fr)_360px]">
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
                    <th className="p-3">Status</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Duration</th>
                    <th className="min-w-64 p-3">Analysis summary</th>
                    <th className="p-3 text-center">Work items</th>
                    <th className="p-3 text-center">Milestones</th>
                    <th className="p-3">Milestone total</th>
                    <th className="p-3">Submitted</th>
                    <th className="w-44 p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">Loading proposals...</td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">No proposals found.</td></tr>
                  ) : visible.map(item => {
                    const status = Number(item.status);
                    return (
                      <tr key={item.proposalsId} onClick={() => setActiveId(item.proposalsId)} className={`cursor-pointer border-t border-border hover:bg-muted/20 ${activeId === item.proposalsId ? 'bg-cyan-500/5 shadow-[inset_3px_0_0_rgb(6_182_212)]' : ''}`}>
                        <td className="p-3 align-top font-semibold"><span className="block max-w-32 truncate">{item.freelancerName || 'Freelancer'}</span></td>
                        <td className="p-3 align-top"><span className={`rounded px-2 py-1 font-bold ${badgeClass(status)}`}>{getStatusLabel(item.status)}</span></td>
                        <td className="p-3 align-top font-semibold">{formatGigCoin(item.proposedBudget || 0)}</td>
                        <td className="p-3 align-top">{item.proposedDuration || 'N/A'}</td>
                        <td className="p-3 align-top text-muted-foreground"><span className="block truncate leading-5" title={item.analysisSummaryPreview || item.coverLetter || ''}>{previewText(item.analysisSummaryPreview || item.coverLetter, 88) || 'Legacy proposal'}</span></td>
                        <td className="p-3 text-center align-top">{item.workItemCount ?? 0}</td>
                        <td className="p-3 text-center align-top">{item.milestoneCount ?? 0}</td>
                        <td className="p-3 align-top font-semibold">{formatGigCoin(item.milestoneTotal || 0)}</td>
                        <td className="p-3 align-top">{formatDate(item.submittedAt)}</td>
                        <td className="p-3 align-top">
                          <div className="grid grid-cols-2 gap-1">
                            <button title="View details" onClick={event => { event.stopPropagation(); setActiveId(item.proposalsId); }} className="inline-flex items-center justify-center gap-1 rounded border border-border px-2 py-1.5 font-semibold hover:bg-muted">
                              <Eye size={14} /> Details
                            </button>
                            {status === ProposalStatus.Pending && selectedJobCanNegotiate && (
                              <button title="Shortlist" disabled={isBusy(item.proposalsId, 'shortlist')} onClick={event => { event.stopPropagation(); updateStatus(item.proposalsId, ProposalStatus.Shortlisted, 'shortlist'); }} className="inline-flex items-center justify-center gap-1 rounded border border-cyan-500/30 px-2 py-1.5 font-semibold text-cyan-600 hover:bg-cyan-500/10 disabled:opacity-50">
                                <Check size={14} /> {isBusy(item.proposalsId, 'shortlist') ? 'Saving' : 'Shortlist'}
                              </button>
                            )}
                            {canClientAct(status) && (
                              <>
                                <button title="Start negotiation" disabled={isBusy(item.proposalsId, 'accept')} onClick={event => { event.stopPropagation(); acceptForNegotiation(item.proposalsId); }} className="inline-flex items-center justify-center gap-1 rounded border border-emerald-500/30 px-2 py-1.5 font-semibold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50">
                                  <MessageSquare size={14} /> {isBusy(item.proposalsId, 'accept') ? 'Opening' : 'Negotiate'}
                                </button>
                                <button title="Reject" disabled={isBusy(item.proposalsId, 'reject')} onClick={event => { event.stopPropagation(); updateStatus(item.proposalsId, ProposalStatus.Rejected, 'reject'); }} className="inline-flex items-center justify-center gap-1 rounded border border-red-500/30 px-2 py-1.5 font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50">
                                  <X size={14} /> {isBusy(item.proposalsId, 'reject') ? 'Saving' : 'Reject'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </main>

          <aside className="min-w-0 overflow-y-auto border-t border-border bg-muted/20 p-4 lg:border-l lg:border-t-0 2xl:p-5">
            {detailLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading details...</div>
            ) : !detail ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <FileText size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Select a proposal to inspect its plan.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold">{detail.freelancerName || 'Freelancer proposal'}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Proposed rate: {formatGigCoin(detail.proposedBudget || 0)} · Milestones: {formatGigCoin(detailMilestoneTotal)} · {detail.proposedDuration || 'Duration not specified'}</p>
                      {Math.abs((detail.proposedBudget || 0) - detailMilestoneTotal) >= 0.01 && <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600">Manual rate override. Reconcile the final price and milestone total before sending a final offer.</p>}
                    </div>
                    <span className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${badgeClass(Number(detail.status))}`}>{getStatusLabel(detail.status)}</span>
                  </div>
                </div>

                {section('Introduction', detail.coverLetter)}
                {section('Requirement analysis', detail.analysisSummary)}
                {section('Solution approach', detail.solutionApproach)}
                {section('Overall deliverables', detail.deliverables)}
                {section('Assumptions', detail.assumptions)}
                {section('Out of scope', detail.outOfScope)}

                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Work breakdown</h3>
                  <div className="space-y-2">
                    {detail.workBreakdownItems?.length ? detail.workBreakdownItems.map((item, index) => (
                      <div key={item.id || index} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex justify-between gap-3">
                          <strong className="text-sm">{index + 1}. {item.title || 'Untitled work item'}</strong>
                          <span className="text-xs text-muted-foreground">{item.estimatedDuration}</span>
                        </div>
                        {item.description && <p className="mt-2 truncate text-xs leading-5 text-muted-foreground" title={item.description}>{previewText(item.description, 88)}</p>}
                        {item.deliverables && <p className="mt-2 truncate text-xs" title={item.deliverables}><strong>Deliverables:</strong> {previewText(item.deliverables, 72)}</p>}
                      </div>
                    )) : <p className="text-sm text-muted-foreground">Legacy proposal: no work breakdown.</p>}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Milestone plan</h3>
                  <div className="space-y-2">
                    {detail.milestonePlans?.length ? detail.milestonePlans.map((item, index) => (
                      <div key={item.id || index} className="rounded-lg border border-border bg-background p-3 text-xs">
                        <div className="flex justify-between gap-3">
                          <strong>{index + 1}. {item.title || 'Untitled milestone'}</strong>
                          <span className="font-semibold">{formatGigCoin(item.amount)}</span>
                        </div>
                        {item.estimatedDuration && <p className="mt-1 text-muted-foreground">Duration: {item.estimatedDuration}</p>}
                        {item.description && <p className="mt-2 truncate text-muted-foreground" title={item.description}>{previewText(item.description, 88)}</p>}
                        {item.deliverables && <p className="mt-2 truncate" title={item.deliverables}><strong>Deliverables:</strong> {previewText(item.deliverables, 72)}</p>}
                        {item.acceptanceCriteria && <p className="mt-2 truncate" title={item.acceptanceCriteria}><strong>Acceptance:</strong> {previewText(item.acceptanceCriteria, 72)}</p>}
                      </div>
                    )) : <p className="text-sm text-muted-foreground">Legacy proposal: no milestone plan.</p>}
                  </div>
                </section>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <button onClick={() => navigate(`/proposals/${detail.proposalId}/answers`)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/20">Clarifying answers</button>
                  {Number(detail.status) === ProposalStatus.Pending && selectedJobCanNegotiate && (
                    <button disabled={isBusy(detail.proposalId, 'shortlist')} onClick={() => updateStatus(detail.proposalId, ProposalStatus.Shortlisted, 'shortlist')} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs font-bold text-cyan-600 hover:bg-cyan-500/10 disabled:opacity-50">
                      <Check size={14} /> Shortlist
                    </button>
                  )}
                  {canClientAct(Number(detail.status)) && (
                    <>
                      <button disabled={isBusy(detail.proposalId, 'accept')} onClick={() => acceptForNegotiation(detail.proposalId)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        <MessageSquare size={14} /> Start negotiation
                      </button>
                      <button disabled={isBusy(detail.proposalId, 'reject')} onClick={() => updateStatus(detail.proposalId, ProposalStatus.Rejected, 'reject')} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-50">
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                  {Number(detail.status) === ProposalStatus.Accepted && selectedJobCanNegotiate && (
                    <button disabled={isBusy(detail.proposalId, 'open')} onClick={() => openNegotiation(detail.proposalId)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      <MessageSquare size={14} /> Open negotiation
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
