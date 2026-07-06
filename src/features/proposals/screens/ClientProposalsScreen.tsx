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

          <aside className="w-[420px] shrink-0 overflow-y-auto border-l border-border bg-card p-5">
            {detailLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Loading details...</div> : !detail ? <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground"><FileText size={32} className="mb-2 opacity-40" /><p className="text-sm">Select a proposal to inspect its plan.</p></div> : <div className="space-y-6">
              <div className="border-b border-border pb-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{detail.freelancerName || 'Freelancer proposal'}</h2><p className="mt-1 text-xs text-muted-foreground">{formatGigCoin(detail.proposedBudget || 0)} · {detail.proposedDuration || 'Duration not specified'}</p></div><span className={`rounded px-2 py-1 text-xs font-bold ${badgeClass(Number(detail.status))}`}>{getStatusLabel(detail.status)}</span></div></div>
              {section('Introduction', detail.coverLetter)}{section('Requirement analysis', detail.analysisSummary)}{section('Solution approach', detail.solutionApproach)}{section('Overall deliverables', detail.deliverables)}{section('Assumptions', detail.assumptions)}{section('Out of scope', detail.outOfScope)}
              <section><h3 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Work breakdown</h3><div className="space-y-2">{detail.workBreakdownItems?.length ? detail.workBreakdownItems.map((item, index) => <div key={item.id || index} className="rounded-lg border border-border p-3"><div className="flex justify-between gap-3"><strong className="text-sm">{index + 1}. {item.title}</strong><span className="text-xs text-muted-foreground">{item.estimatedDuration}</span></div>{item.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.description}</p>}{item.deliverables && <p className="mt-2 text-xs"><strong>Deliverables:</strong> {item.deliverables}</p>}</div>) : <p className="text-sm text-muted-foreground">Legacy proposal: no work breakdown.</p>}</div></section>
              <section><h3 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Milestone plan</h3><div className="space-y-2">{detail.milestonePlans?.length ? detail.milestonePlans.map((item, index) => <div key={item.id || index} className="rounded-lg border border-border p-3 text-xs"><div className="flex justify-between gap-3"><strong>{index + 1}. {item.title}</strong><span className="font-semibold">{formatGigCoin(item.amount)}</span></div>{item.estimatedDuration && <p className="mt-1 text-muted-foreground">Duration: {item.estimatedDuration}</p>}{item.description && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{item.description}</p>}{item.deliverables && <p className="mt-2"><strong>Deliverables:</strong> {item.deliverables}</p>}{item.acceptanceCriteria && <p className="mt-2"><strong>Acceptance:</strong> {item.acceptanceCriteria}</p>}</div>) : <p className="text-sm text-muted-foreground">Legacy proposal: no milestone plan.</p>}</div></section>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4"><button onClick={() => navigate(`/proposals/${detail.proposalId}/answers`)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Clarifying answers</button>{Number(detail.status) === ProposalStatus.Accepted && <button disabled={busy} onClick={() => openNegotiation(detail.proposalId)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><MessageSquare size={14} /> Open negotiation</button>}</div>
            </div>}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
