import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Check, Eye, FileText, MessageSquare, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
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
import { MarkdownPreview } from '../../../shared/components/MarkdownEditor';

type SortBy = 'submittedAt' | 'status' | 'budget' | 'duration' | 'milestoneTotal';

const badgeClass = (status: number) => {
  if (status === ProposalStatus.Accepted) return 'bg-emerald-500/10 text-emerald-500';
  if (status === ProposalStatus.Rejected || status === ProposalStatus.Withdrawn) return 'bg-red-500/10 text-red-500';
  if (status === ProposalStatus.Shortlisted) return 'bg-cyan-500/10 text-cyan-500';
  return 'bg-amber-500/10 text-amber-500';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'N/A';
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
  const queryJobId = useMemo(() => new URLSearchParams(location.search).get('job'), [location.search]);
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(queryJobId);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProposalDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
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
    jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 }).then(response => {
      const items = response.data || [];
      setJobs(items);
      setSelectedJobId(current => current || items[0]?.jobPostsId || null);
    });
  }, []);

  useEffect(() => {
    if (!selectedJobId) { setProposals([]); setLoading(false); return; }
    setLoading(true); setMessage(''); setDetail(null);
    proposalGetAPI.getProposalsByJobPost(selectedJobId, { pageIndex: 1, pageSize: 100 }).then(response => {
      const items = response.data || [];
      setProposals(items);
      setActiveId(items[0]?.proposalsId || null);
      setLoading(false);
    });
  }, [selectedJobId]);

  useEffect(() => {
    if (!activeId) { setDetail(null); return; }
    setDetailLoading(true);
    proposalGetAPI.getProposalDetail(activeId).then(response => {
      setDetail(response.data || null);
      setDetailLoading(false);
    });
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
    setStatusFilter('all'); setBudgetMin(''); setBudgetMax(''); setDurationMax('');
    setMilestoneMin(''); setMilestoneMax(''); setSubmittedFrom(''); setSubmittedTo('');
  };

  const selectJob = (id: string) => {
    setSelectedJobId(id);
    navigate(`/proposals?job=${id}`, { replace: true });
  };

  const updateStatus = async (id: string, status: ProposalStatusValue) => {
    setBusy(true); setMessage('');
    const response = await proposalPatchAPI.updateProposalStatus(id, { status });
    setBusy(false);
    if (!response.success) return setMessage(response.message || 'Could not update proposal status.');
    setProposals(items => items.map(item => item.proposalsId === id ? { ...item, status } : item));
    setDetail(current => current?.proposalId === id ? { ...current, status } : current);
  };

  const acceptForNegotiation = async (id: string) => {
    setBusy(true); setMessage('');
    const response = await proposalPostAPI.acceptForNegotiation(id);
    setBusy(false);
    if (!response.success || !response.data) return setMessage(response.message || 'Could not start negotiation.');
    navigate('/messages', { state: { activeConvId: response.data } });
  };

  const openNegotiation = async (id: string) => {
    setBusy(true);
    const response = await messagePostAPI.startNegotiationFromProposal(id);
    setBusy(false);
    if (!response.success || !response.data) return setMessage(response.message || 'Could not open negotiation.');
    navigate('/messages', { state: { activeConvId: response.data } });
  };

  const selectedJob = jobs.find(item => item.jobPostsId === selectedJobId);
  const section = (title: string, value?: string | null) => value ? (
    <section><h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">{title}</h3><MarkdownPreview value={value} className="text-sm leading-6" /></section>
  ) : null;

  return (
    <AppLayout fullWidth>
      <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-5"><button onClick={() => navigate('/client/dashboard')} title="Back to dashboard"><ArrowLeft size={18} /></button><div><h1 className="text-base font-bold">Proposal Comparison</h1><p className="text-xs text-muted-foreground">Compare scope, price, and payment plans</p></div></div>
          <div className="flex gap-2"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ProposalStatusFilter)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs"><option value="all">All statuses</option><option value="1">Pending</option><option value="2">Shortlisted</option><option value="3">Accepted</option><option value="4">Rejected</option><option value="5">Withdrawn</option></select><select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs"><option value="submittedAt">Newest</option><option value="budget">Budget</option><option value="duration">Duration</option><option value="status">Status</option><option value="milestoneTotal">Milestone total</option></select><button onClick={resetFilters} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Reset filters</button></div>
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-border">
            <div className="border-b border-border p-4 text-xs font-bold uppercase text-muted-foreground">Project Requests</div>
            {jobs.map(job => <button key={job.jobPostsId} onClick={() => selectJob(job.jobPostsId)} className={`block w-full border-b border-border/50 p-4 text-left ${job.jobPostsId === selectedJobId ? 'border-l-4 border-l-cyan-500 bg-cyan-500/5' : 'hover:bg-muted/20'}`}><strong className="block truncate text-sm">{job.title}</strong><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{job.description}</span></button>)}
          </aside>

          <main className="min-w-0 flex-1 overflow-auto p-4">
            <div className="mb-3"><h2 className="font-bold">{selectedJob?.title || 'Select a project request'}</h2><p className="text-xs text-muted-foreground">{visible.length} proposals</p></div>
            <div className="mb-3 grid gap-2 rounded-lg border border-border bg-card p-3 text-xs md:grid-cols-4">
              <input value={budgetMin} onChange={e => setBudgetMin(e.target.value)} type="number" placeholder="Budget min" className="rounded border border-border bg-background px-2 py-2" />
              <input value={budgetMax} onChange={e => setBudgetMax(e.target.value)} type="number" placeholder="Budget max" className="rounded border border-border bg-background px-2 py-2" />
              <input value={durationMax} onChange={e => setDurationMax(e.target.value)} type="number" placeholder="Max duration days" className="rounded border border-border bg-background px-2 py-2" />
              <input value={milestoneMin} onChange={e => setMilestoneMin(e.target.value)} type="number" placeholder="Milestone total min" className="rounded border border-border bg-background px-2 py-2" />
              <input value={milestoneMax} onChange={e => setMilestoneMax(e.target.value)} type="number" placeholder="Milestone total max" className="rounded border border-border bg-background px-2 py-2" />
              <input value={submittedFrom} onChange={e => setSubmittedFrom(e.target.value)} type="date" className="rounded border border-border bg-background px-2 py-2" />
              <input value={submittedTo} onChange={e => setSubmittedTo(e.target.value)} type="date" className="rounded border border-border bg-background px-2 py-2" />
            </div>
            {message && <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">{message}</div>}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[1120px] text-left text-xs">
                <thead className="sticky top-0 bg-muted text-muted-foreground"><tr><th className="p-3">Freelancer</th><th className="p-3">Status</th><th className="p-3">Budget</th><th className="p-3">Duration</th><th className="min-w-64 p-3">Analysis summary</th><th className="p-3">Work items</th><th className="p-3">Milestones</th><th className="p-3">Milestone total</th><th className="p-3">Submitted</th><th className="p-3">Actions</th></tr></thead>
                <tbody>{loading ? <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">Loading proposals...</td></tr> : visible.length === 0 ? <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">No proposals found.</td></tr> : visible.map(item => (
                  <tr key={item.proposalsId} onClick={() => setActiveId(item.proposalsId)} className={`cursor-pointer border-t border-border hover:bg-muted/20 ${activeId === item.proposalsId ? 'bg-cyan-500/5' : ''}`}>
                    <td className="p-3 font-semibold">{item.freelancerName || 'Freelancer'}</td><td className="p-3"><span className={`rounded px-2 py-1 font-bold ${badgeClass(Number(item.status))}`}>{getStatusLabel(item.status)}</span></td><td className="p-3 font-semibold">{formatGigCoin(item.proposedBudget || 0)}</td><td className="p-3">{item.proposedDuration || 'N/A'}</td><td className="p-3 text-muted-foreground"><span className="line-clamp-2">{item.analysisSummaryPreview || item.coverLetter || 'Legacy proposal'}</span></td><td className="p-3 text-center">{item.workItemCount ?? 0}</td><td className="p-3 text-center">{item.milestoneCount ?? 0}</td><td className="p-3">{formatGigCoin(item.milestoneTotal || 0)}</td><td className="p-3">{formatDate(item.submittedAt)}</td><td className="p-3"><div className="flex gap-1"><button title="View details" onClick={e => { e.stopPropagation(); setActiveId(item.proposalsId); }} className="rounded p-2 hover:bg-muted"><Eye size={15} /></button>{Number(item.status) === ProposalStatus.Pending && <button title="Shortlist" disabled={busy} onClick={e => { e.stopPropagation(); updateStatus(item.proposalsId, ProposalStatus.Shortlisted); }} className="rounded p-2 text-cyan-500 hover:bg-cyan-500/10"><Check size={15} /></button>}{[ProposalStatus.Pending, ProposalStatus.Shortlisted].includes(Number(item.status)) && <><button title="Start negotiation" disabled={busy} onClick={e => { e.stopPropagation(); acceptForNegotiation(item.proposalsId); }} className="rounded p-2 text-emerald-500 hover:bg-emerald-500/10"><MessageSquare size={15} /></button><button title="Reject" disabled={busy} onClick={e => { e.stopPropagation(); updateStatus(item.proposalsId, ProposalStatus.Rejected); }} className="rounded p-2 text-red-500 hover:bg-red-500/10"><X size={15} /></button></>}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </main>

          <section className="flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm">
            <div className="glass-header px-6 py-3.5 border-b border-border flex justify-between items-center flex-wrap gap-4">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Selected JobPost</p>
                <h2 className="text-sm font-bold text-foreground truncate max-w-[360px]">{displayJobTitle}</h2>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                  <Filter size={13} />
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as ProposalStatusFilter)}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] cursor-pointer text-foreground font-semibold"
                >
                  <option value="all">All</option>
                  <option value="1">Pending</option>
                  <option value="2">Shortlisted</option>
                  <option value="3">Accepted</option>
                  <option value="4">Rejected</option>
                  <option value="5">Withdrawn</option>
                </select>

                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                  <ArrowUpDown size={13} />
                  Sort
                </span>
                <select
                  value={sortBy}
                  onChange={event => setSortBy(event.target.value as SortBy)}
                  className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)] cursor-pointer text-foreground font-semibold"
                >
                  <option value="submittedAt">Submission Date</option>
                  <option value="status">Status</option>
                  <option value="rate">Proposed Budget</option>
                </select>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-80 border-r border-border flex flex-col bg-card/40 overflow-y-auto custom-scrollbar">
                {!selectedJobId ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Select a JobPost to view proposals.</div>
                ) : proposalsLoading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Loading proposals...</div>
                ) : proposalsError ? (
                  <div className="p-8 text-center text-xs text-red-500">{proposalsError}</div>
                ) : filteredProposals.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No proposals found for this JobPost.</div>
                ) : (
                  filteredProposals.map(proposal => {
                    const isActive = proposal.proposalsId === activeProposalId;
                    return (
                      <div
                        key={proposal.proposalsId}
                        onClick={() => setActiveProposalId(proposal.proposalsId)}
                        className={`p-4 border-b border-border/50 cursor-pointer transition-all hover:bg-muted/40 flex flex-col gap-1.5 ${
                          isActive ? 'bg-[var(--gb-cyan)]/5 border-r-2 border-r-[var(--gb-cyan)]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                            {proposal.freelancerName || 'Applicant'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusBadgeClass(proposal.status)}`}>
                            {getStatusLabel(proposal.status)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {proposal.coverLetter || 'No cover letter.'}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mt-1">
                          <span>{formatCurrency(proposal.proposedBudget)}</span>
                          <span>{proposal.proposedDuration || 'No duration'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex-1 flex flex-col bg-card/20 overflow-y-auto custom-scrollbar p-6">
                {detailLoading ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading proposal detail...</div>
                ) : detailError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{detailError}</div>
                ) : activeProposal && proposalDetail ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start border-b border-border pb-4 gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{proposalDetail.freelancerName || activeProposal.freelancerName || 'Freelancer Proposal'}</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {formatDateTime(proposalDetail.submittedAt || activeProposal.submittedAt)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${statusBadgeClass(proposalDetail.status)}`}>
                        {getStatusLabel(proposalDetail.status)}
                      </span>
                    </div>

                    {statusMessage && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600">
                        {statusMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Proposed Budget</span>
                        <p className="text-base font-bold text-foreground mt-1">{formatCurrency(proposalDetail.proposedBudget)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Duration</span>
                        <p className="text-base font-bold text-foreground mt-1">{proposalDetail.proposedDuration || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cover Letter</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                        {proposalDetail.coverLetter || 'No cover letter provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-4 border-t border-border pt-6 flex-wrap">
                      <button
                        onClick={() => navigate(`/proposals/${proposalDetail.proposalId}/answers`)}
                        className="bg-background border border-border text-foreground hover:bg-muted/20 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <FileText size={16} />
                        View Answers
                      </button>

                      {Number(proposalDetail.status) === ProposalStatus.Accepted ? (
                        <button
                          onClick={() => openNegotiation(proposalDetail.proposalId)}
                          disabled={openingNegotiationId === proposalDetail.proposalId}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                        >
                          <CheckCircle size={16} />
                          {openingNegotiationId === proposalDetail.proposalId ? t('negotiations.opening') : t('negotiations.enterNegotiation')}
                        </button>
                      ) : canClientUpdateStatus(proposalDetail.status) ? (
                        <>
                          {Number(proposalDetail.status) === ProposalStatus.Pending && (
                            <button
                              onClick={() => updateProposalStatus(proposalDetail.proposalId, ProposalStatus.Shortlisted)}
                              disabled={updatingStatus !== null}
                              className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                            >
                              <Users size={16} />
                              {updatingStatus === ProposalStatus.Shortlisted ? 'Shortlisting...' : 'Shortlist'}
                            </button>
                          )}
                          <button
                            onClick={() => acceptProposalForNegotiation(proposalDetail.proposalId)}
                            disabled={updatingStatus !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm"
                          >
                            <CheckCircle size={16} />
                            {updatingStatus === ProposalStatus.Accepted ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            onClick={() => updateProposalStatus(proposalDetail.proposalId, ProposalStatus.Rejected)}
                            disabled={updatingStatus !== null}
                            className="bg-transparent border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <XCircle size={16} />
                            {updatingStatus === ProposalStatus.Rejected ? 'Rejecting...' : 'Reject'}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Status actions are unavailable for {getStatusLabel(proposalDetail.status)} proposals.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                    <FileText size={40} className="opacity-30 mb-3" />
                    <p className="text-sm">Select a proposal to view detailed information.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="w-80 border-l border-border flex flex-col bg-card p-6 overflow-y-auto custom-scrollbar">
            {proposalDetail ? (
              <div className="flex flex-col gap-5">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-1">Proposal Summary</h3>
                  <h2 className="text-base font-bold text-foreground leading-snug">{proposalDetail.jobPostTitle || displayJobTitle}</h2>
                  <div className={`inline-flex mt-3 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded ${statusBadgeClass(proposalDetail.status)}`}>
                    {getStatusLabel(proposalDetail.status)}
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Freelancer</span>
                    <strong className="text-foreground text-right">{proposalDetail.freelancerName || 'Unknown'}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Budget</span>
                    <strong className="text-foreground">{formatCurrency(proposalDetail.proposedBudget)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Submitted</span>
                    <strong className="text-foreground text-right">{formatDateTime(proposalDetail.submittedAt)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                    <span className="text-muted-foreground">Reviewed</span>
                    <strong className="text-foreground text-right">{formatDateTime(proposalDetail.updatedAt || activeProposal?.reviewedAt)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
                <Info size={30} className="opacity-25 mb-2" />
                <p className="text-xs">No proposal selected.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
