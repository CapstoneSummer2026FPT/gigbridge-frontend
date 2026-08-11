import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bot,
  Briefcase,
  ExternalLink,
  FileText,
  RefreshCw,
  StickyNote,
  Undo2,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPatchAPI } from '../../../api/adminAPI/PATCH';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { AdminProposalDetail } from '../../../types/models/AdminProposal';
import {
  aiAttemptLabels,
  aiDefinitionLabels,
  contractLabels,
  lifecycleLabels,
  moderationLabels,
  negotiationLabels,
  statusLabel,
  statusTone,
} from '../proposalStatus';
import '../styles/admin-users-screen.css';

type DetailTab = 'overview' | 'content' | 'answers' | 'milestones' | 'ai' | 'negotiation' | 'contract' | 'relations' | 'notes' | 'audit';
type DetailAction = 'invalidate' | 'restore' | 'note' | null;

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Proposal Content' },
  { id: 'answers', label: 'Answers' },
  { id: 'milestones', label: 'Milestones & Work Items' },
  { id: 'ai', label: 'AI Interview' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'contract', label: 'Contract' },
  { id: 'relations', label: 'Reports & Disputes' },
  { id: 'notes', label: 'Internal Notes' },
  { id: 'audit', label: 'Audit History' },
];

const reportLabels: Record<number, string> = { 0: 'Pending', 1: 'Reviewing', 2: 'Resolved', 3: 'Dismissed' };

const formatJson = (value: string | null) => {
  if (!value) return '—';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const formatDateTime = (value: string | null | undefined, fallback = 'Not available') =>
  value ? new Date(value).toLocaleString() : fallback;

const getStatusBadgeClass = (label: string) => {
  const tone = statusTone(label);
  if (tone === 'success') return 'badge-green';
  if (tone === 'danger') return 'badge-red';
  return 'badge-amber';
};

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
      <p className="text-sm text-secondary">{children}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  tabPanel = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tabPanel?: boolean;
}) {
  return (
    <section className="glass-card p-4 sm:p-6" role={tabPanel ? 'tabpanel' : undefined}>
      <header className="mb-5">
        <h2 className="text-base sm:text-lg font-bold text-primary">{title}</h2>
        {description && <p className="text-xs sm:text-sm text-secondary mt-1">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1.5 text-sm font-semibold text-primary break-words">{value}</dd>
    </div>
  );
}

function ReadOnlyCopy({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">{value || 'Not available'}</p>
    </article>
  );
}

export default function AdminProposalDetailScreen() {
  const { proposalId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminProposalDetail | null>(null);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [action, setAction] = useState<DetailAction>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    if (!proposalId) {
      setLoading(false);
      setError({ message: 'No proposal identifier was provided.', status: 404 });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await adminGetAPI.getProposalDetail(proposalId);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setData(null);
        setError({ message: response.message || 'Unable to load proposal.', status: response.statusCode });
      }
    } catch {
      setData(null);
      setError({ message: 'Unable to load proposal. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeAction = () => {
    setAction(null);
    setReason('');
    setNote('');
    setActionError('');
  };

  const apply = async () => {
    if (!action || !proposalId) return;
    setBusy(true);
    setActionError('');

    try {
      const response = action === 'note'
        ? await adminPostAPI.addProposalNote(proposalId, note.trim())
        : action === 'invalidate'
          ? await adminPatchAPI.invalidateProposal(proposalId, { reason: reason.trim(), internalNote: note.trim() || undefined })
          : await adminPatchAPI.restoreProposal(proposalId, { reason: reason.trim(), internalNote: note.trim() || undefined });

      if (response.success && response.data) {
        setData(response.data);
        closeAction();
      } else {
        setActionError(response.statusCode === 409 ? `Conflict: ${response.message}` : response.message || 'The action could not be completed.');
      }
    } catch {
      setActionError('The action could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="w-full max-w-[100vw] overflow-x-hidden">
          <main className="max-w-7xl mx-auto px-4 sm:px-6">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-cyan mb-5" onClick={() => navigate('/admin/proposals')}><ArrowLeft size={16} /> Proposals</button>
            <section className="glass-card p-5 space-y-3" role="status" aria-label="Loading proposal detail">
              <div className="h-8 w-2/3 rounded-lg bg-white/5 animate-pulse" />
              {Array.from({ length: 6 }).map((_, index) => <div className="h-16 rounded-lg bg-white/5 animate-pulse" key={index} />)}
            </section>
          </main>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    const heading = error?.status === 404
      ? 'Proposal not found'
      : error?.status === 401 || error?.status === 403
        ? 'Access denied'
        : 'Proposal could not be loaded';

    return (
      <AppLayout>
        <div className="w-full max-w-[100vw] overflow-x-hidden">
          <main className="max-w-7xl mx-auto px-4 sm:px-6">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-cyan mb-5" onClick={() => navigate('/admin/proposals')}><ArrowLeft size={16} /> Proposals</button>
            <section className="glass-card py-16 px-6 text-center border border-red/30" role="alert">
              <AlertTriangle size={38} className="text-red mx-auto mb-3" />
              <h1 className="text-xl font-bold text-primary">{heading}</h1>
              <p className="text-sm text-secondary mt-2 mb-5">{error?.message || 'No proposal data is available.'}</p>
              <button className="glass-button px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2" onClick={() => void load()}><RefreshCw size={16} /> Retry</button>
            </section>
          </main>
        </div>
      </AppLayout>
    );
  }

  const lifecycle = statusLabel(lifecycleLabels, data.lifecycleStatus);
  const moderation = statusLabel(moderationLabels, data.moderationStatus);
  const aiStatus = data.aiInterview?.attemptStatus !== null && data.aiInterview?.attemptStatus !== undefined
    ? statusLabel(aiAttemptLabels, data.aiInterview.attemptStatus)
    : statusLabel(aiDefinitionLabels, data.aiInterview?.definitionStatus);

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <main className="max-w-7xl mx-auto px-4 sm:px-6">
          <header className="mb-6 sm:mb-8">
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-cyan hover:underline mb-4" onClick={() => navigate('/admin/proposals')}>
              <ArrowLeft size={16} /> Proposals
            </button>

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={20} className="text-cyan flex-shrink-0" />
                  <span className="badge-cyan text-xs">Proposal #{data.proposalId.slice(0, 8)}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-primary break-words">{data.jobPostTitle}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`${getStatusBadgeClass(lifecycle)} text-xs`}>{lifecycle}</span>
                  <span className={`${getStatusBadgeClass(moderation)} text-xs`}>{moderation}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end flex-shrink-0">
                <button
                  className={`${data.moderationStatus === 0 ? 'btn-red' : 'btn-cyan'} px-4 py-2.5 text-sm inline-flex items-center gap-2`}
                  onClick={() => setAction(data.moderationStatus === 0 ? 'invalidate' : 'restore')}
                >
                  {data.moderationStatus === 0 ? <Ban size={15} /> : <Undo2 size={15} />}
                  {data.moderationStatus === 0 ? 'Invalidate' : 'Restore'}
                </button>
                <button className="glass-button px-4 py-2.5 rounded-lg text-sm text-secondary inline-flex items-center gap-2" onClick={() => setAction('note')}>
                  <StickyNote size={15} className="text-amber" /> Add internal note
                </button>
              </div>
            </div>
          </header>

          {data.invalidationReason && (
            <div className="glass-card p-4 mb-5 border border-amber/30 bg-amber/5 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber flex-shrink-0 mt-0.5" />
              <p className="text-sm text-secondary"><strong className="text-primary">Latest invalidation:</strong> {data.invalidationReason} · {data.invalidatedByAdminName || 'Admin'}</p>
            </div>
          )}

          <nav className="sticky top-[72px] z-20 glass-card p-1.5 mb-6 overflow-x-auto" role="tablist" aria-label="Proposal detail sections">
            <div className="flex min-w-max gap-1">
              {tabs.map(item => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === item.id
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)] shadow-sm'
                    : 'text-secondary hover:bg-white/5 hover:text-primary'
                  }`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {tab === 'overview' && (
            <div role="tabpanel" className="space-y-5">
              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Fact label="Proposed budget" value={data.proposedBudget?.toLocaleString() ?? 'Not available'} />
                <Fact label="Estimated duration" value={data.estimatedDuration || 'Not available'} />
                <Fact label="Submitted" value={formatDateTime(data.submittedAt, 'Draft')} />
                <Fact label="Last updated" value={formatDateTime(data.updatedAt)} />
              </dl>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-5">
                <SectionCard title="Job Context" description="The job post and requirements this proposal responds to.">
                  <p className="text-sm leading-6 text-secondary whitespace-pre-wrap">{data.jobPostDescription || 'No job description is available.'}</p>
                  {data.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {data.requiredSkills.map(skill => <span key={skill} className="badge-cyan text-xs">{skill}</span>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-white/5 text-xs text-secondary">
                    <span>Budget: <strong className="text-primary">{data.jobBudgetMin?.toLocaleString() ?? '—'} – {data.jobBudgetMax?.toLocaleString() ?? '—'}</strong></span>
                    <span>Duration: <strong className="text-primary">{data.jobDuration || 'Not available'}</strong></span>
                  </div>
                  <button className="glass-button px-4 py-2 rounded-lg text-xs text-cyan inline-flex items-center gap-2 mt-4" onClick={() => navigate(`/admin/jobs?preview=${encodeURIComponent(data.jobPostId)}`)}>
                    <ExternalLink size={14} /> Open related Job Post
                  </button>
                </SectionCard>

                <SectionCard title="Parties" description="Open either participant’s admin profile.">
                  <div className="space-y-3">
                    {[data.client, data.freelancer].map(party => (
                      <button
                        className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left hover:border-cyan/30 hover:bg-white/5 transition-all"
                        key={party.userId}
                        onClick={() => navigate(`/admin/users?preview=${encodeURIComponent(party.userId)}`)}
                      >
                        <UserAvatar name={party.name} src={party.avatar} size="md" premium={party.isPremium} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-primary truncate">{party.name}</span>
                          <span className="block text-[11px] text-muted mt-0.5">{party.userId === data.client.userId ? 'Client' : 'Freelancer'} · {party.reportCount} report(s) · {party.violationCount} violation(s)</span>
                          <span className="block text-xs text-secondary mt-1 truncate">{party.summary || 'No profile summary'}</span>
                        </span>
                        <ExternalLink size={14} className="text-muted flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {tab === 'content' && (
            <SectionCard title="Proposal Content" description="Freelancer-authored content is read-only for administrators." tabPanel>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReadOnlyCopy label="Cover Letter" value={data.coverLetter} />
                <ReadOnlyCopy label="Analysis Summary" value={data.analysisSummary} />
                <ReadOnlyCopy label="Solution Approach" value={data.solutionApproach} />
                <ReadOnlyCopy label="Deliverables" value={data.deliverables} />
                <ReadOnlyCopy label="Assumptions" value={data.assumptions} />
                <ReadOnlyCopy label="Out of Scope" value={data.outOfScope} />
              </div>
            </SectionCard>
          )}

          {tab === 'answers' && (
            <SectionCard title="Proposal Answers" description="Answers submitted for the client’s screening questions." tabPanel>
              {data.answers.length ? (
                <div className="space-y-3">
                  {data.answers.map(answer => (
                    <article key={answer.questionId} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-xs font-bold text-cyan">{answer.order + 1}</span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-primary">{answer.question}{answer.required ? ' *' : ''}</h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">{answer.answer || 'No answer provided.'}</p>
                          <p className="mt-3 text-[11px] text-muted">{answer.answeredAt ? `Answered ${new Date(answer.answeredAt).toLocaleString()}` : 'Not answered'}{answer.timerStartedAt ? ` · Timer ${answer.timerLocked ? 'locked' : 'unlocked'}` : ''}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <Empty>No proposal questions or answers.</Empty>}
            </SectionCard>
          )}

          {tab === 'milestones' && (
            <SectionCard title="Proposed Milestones & Work Items" description="The freelancer’s proposed delivery plan and allocation." tabPanel>
              {data.milestones.length ? (
                <div className="space-y-4">
                  {data.milestones.map(milestone => (
                    <article key={milestone.milestoneId} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan">Milestone {milestone.order + 1}</p>
                          <h3 className="text-sm font-bold text-primary mt-1">{milestone.title}</h3>
                        </div>
                        <span className="badge-cyan text-xs flex-shrink-0">{milestone.amount.toLocaleString()}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-secondary">{milestone.description || 'No description.'}</p>
                      {milestone.acceptanceCriteria && <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs leading-5 text-secondary"><strong className="text-primary">Acceptance:</strong> {milestone.acceptanceCriteria}</p>}
                      {milestone.workItems.length ? (
                        <ul className="mt-4 space-y-2">
                          {milestone.workItems.map(item => <li key={item.workItemId} className="rounded-lg border border-white/5 p-3 text-xs text-secondary"><strong className="text-primary">{item.title}</strong><span className="block mt-1">{item.deliverables || item.description || 'No detail'}</span></li>)}
                        </ul>
                      ) : <p className="mt-4 text-xs text-muted">No work items.</p>}
                    </article>
                  ))}
                  {data.unassignedWorkItems.length > 0 && (
                    <article className="rounded-xl border border-amber/20 bg-amber/5 p-4 sm:p-5">
                      <h3 className="text-sm font-bold text-primary">Unassigned work items</h3>
                      <ul className="mt-3 space-y-2 text-xs text-secondary">{data.unassignedWorkItems.map(item => <li key={item.workItemId}><strong className="text-primary">{item.title}</strong> — {item.deliverables || item.description || 'No detail'}</li>)}</ul>
                    </article>
                  )}
                </div>
              ) : <Empty>No proposed milestones.</Empty>}
            </SectionCard>
          )}

          {tab === 'ai' && (
            <SectionCard title="AI Interview" description="Interview completion and automated evaluation context." tabPanel>
              {data.aiInterview ? (
                <div className="space-y-5">
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Fact label="Status" value={<span className={`${getStatusBadgeClass(aiStatus)} text-xs`}>{aiStatus}</span>} />
                    <Fact label="Score" value={data.aiInterview.score ?? data.aiInterview.judgingScore ?? 'Not available'} />
                    <Fact label="Recommended hire" value={data.aiInterview.recommendedHire === null ? 'Not available' : data.aiInterview.recommendedHire ? 'Yes' : 'No'} />
                  </dl>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2"><Bot size={16} className="text-purple" /><h3 className="text-sm font-semibold text-primary">Evaluation Summary</h3></div>
                    <p className="text-sm leading-6 text-secondary whitespace-pre-wrap">{data.aiInterview.result || data.aiInterview.judgingSummary || 'No evaluation summary.'}</p>
                  </div>
                  {data.aiInterview.answers.length > 0 && (
                    <div className="space-y-2">
                      {data.aiInterview.answers.map(answer => (
                        <details key={answer.questionIndex} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-primary">Question {answer.questionIndex + 1} · score {answer.score ?? 'Not available'}</summary>
                          <p className="mt-3 text-sm text-primary">{answer.question || 'Question text unavailable.'}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-secondary">{answer.transcript || 'No transcript stored.'}</p>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              ) : <Empty>No AI interview data.</Empty>}
            </SectionCard>
          )}

          {tab === 'negotiation' && (
            <SectionCard title="Negotiation History" description="Offers exchanged before contract creation." tabPanel>
              {data.negotiationHistory.length ? (
                <div className="space-y-3">
                  {data.negotiationHistory.map(offer => {
                    const offerStatus = statusLabel(negotiationLabels, offer.status);
                    return (
                      <article key={offer.offerId} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                        <header className="flex items-center gap-3">
                          <UserAvatar name={offer.createdByName} src={offer.createdByAvatar} size="sm" />
                          <div className="min-w-0 flex-1"><strong className="block text-sm text-primary truncate">{offer.createdByName}</strong><span className="block text-[11px] text-muted mt-0.5">{new Date(offer.createdAt).toLocaleString()}</span></div>
                          <span className={`${getStatusBadgeClass(offerStatus)} text-xs`}>{offerStatus}</span>
                        </header>
                        <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-lg font-bold text-primary">{offer.budget.toLocaleString()}</span><span className="text-sm text-secondary">{offer.scope || 'No scope summary'}</span></div>
                        {offer.milestones.length > 0 && <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">{offer.milestones.map((milestone, index) => <div key={`${offer.offerId}-${index}`} className="rounded-lg border border-white/5 p-3 text-xs text-secondary"><strong className="text-primary">{milestone.title}</strong><span className="block mt-1">{milestone.amount.toLocaleString()}</span></div>)}</div>}
                      </article>
                    );
                  })}
                </div>
              ) : <Empty>No negotiation offers.</Empty>}
            </SectionCard>
          )}

          {tab === 'contract' && (
            <SectionCard title="Resulting Contract" description="Contract created from the accepted proposal." tabPanel>
              {data.contract ? (
                <div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Fact label="Title" value={data.contract.title} />
                    <Fact label="Status" value={<span className={`${getStatusBadgeClass(statusLabel(contractLabels, data.contract.status))} text-xs`}>{statusLabel(contractLabels, data.contract.status)}</span>} />
                    <Fact label="Budget" value={data.contract.budget.toLocaleString()} />
                    <Fact label="Milestones" value={data.contract.milestoneCount} />
                    <Fact label="Escrow funded" value={data.contract.escrowFunded ?? 'Not available'} />
                    <Fact label="Escrow released" value={data.contract.escrowReleased ?? 'Not available'} />
                  </dl>
                  <button className="btn-cyan px-4 py-2.5 text-sm inline-flex items-center gap-2 mt-5" onClick={() => navigate(`/admin/contracts?contractId=${encodeURIComponent(data.contract!.contractId)}`)}><Briefcase size={15} /> Open Contract Management</button>
                </div>
              ) : <Empty>No contract has been created.</Empty>}
            </SectionCard>
          )}

          {tab === 'relations' && (
            <div role="tabpanel" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SectionCard title="Reports" description="Account and contract reports related to this proposal.">
                <div className="space-y-3">
                  {data.reports.map(report => (
                    <article className="rounded-xl border border-white/10 bg-white/[0.025] p-4" key={report.id}>
                      <div className="flex items-center justify-between gap-3"><strong className="text-sm text-primary">{report.kind}</strong><span className={`${getStatusBadgeClass(statusLabel(reportLabels, report.status))} text-xs`}>{statusLabel(reportLabels, report.status)}</span></div>
                      <p className="text-sm text-secondary mt-2">{report.reason || 'No reason supplied.'}</p>
                    </article>
                  ))}
                  {data.contractReports.map(report => (
                    <button className="w-full rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left hover:border-cyan/30 transition-colors" key={report.id} onClick={() => navigate(`/admin/reports/contracts/${report.id}`)}>
                      <span className="flex items-center justify-between gap-3"><strong className="text-sm text-primary">Contract Report</strong><span className={`${getStatusBadgeClass(statusLabel(reportLabels, report.status))} text-xs`}>{statusLabel(reportLabels, report.status)}</span></span>
                      <span className="block text-sm text-secondary mt-2">{report.reason || 'No reason supplied.'}</span>
                    </button>
                  ))}
                  {!data.reports.length && !data.contractReports.length && <Empty>No related reports.</Empty>}
                </div>
              </SectionCard>

              <SectionCard title="Disputes" description="Disputes linked to the proposal or resulting contract.">
                <div className="space-y-3">
                  {data.disputes.map(dispute => (
                    <button className="w-full rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left hover:border-red/30 transition-colors" key={dispute.id} onClick={() => navigate(`/admin/disputes/${dispute.id}`)}>
                      <span className="flex items-center justify-between gap-3"><strong className="text-sm text-primary">Dispute</strong><span className="badge-red text-xs">{statusLabel({}, dispute.status)}</span></span>
                      <span className="block text-sm text-secondary mt-2">{dispute.reason || 'No reason supplied.'}</span>
                    </button>
                  ))}
                  {!data.disputes.length && <Empty>No related disputes.</Empty>}
                </div>
              </SectionCard>
            </div>
          )}

          {tab === 'notes' && (
            <SectionCard title="Internal Notes" description="Private context visible only to administrators." tabPanel>
              {data.internalNotes.length ? (
                <div className="space-y-3">
                  {data.internalNotes.map(item => (
                    <article key={item.noteId} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                      <header className="flex items-center gap-3"><UserAvatar name={item.adminName} src={item.adminAvatar} role={2} size="sm" /><div><strong className="block text-sm text-primary">{item.adminName}</strong><span className="text-[11px] text-muted">{new Date(item.createdAt).toLocaleString()}</span></div></header>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-secondary">{item.content}</p>
                    </article>
                  ))}
                </div>
              ) : <Empty>No internal notes.</Empty>}
            </SectionCard>
          )}

          {tab === 'audit' && (
            <SectionCard title="Audit History" description="Immutable moderation and administrative activity." tabPanel>
              {data.auditHistory.length ? (
                <div className="space-y-3">
                  {data.auditHistory.map(item => (
                    <details key={item.auditId} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                      <summary className="flex cursor-pointer items-center gap-3">
                        <UserAvatar name={item.adminName} src={item.adminAvatar} role={2} size="sm" />
                        <span className="min-w-0"><strong className="block text-sm text-primary truncate">{item.action}</strong><span className="block text-[11px] text-muted mt-0.5">{item.adminName} · {new Date(item.createdAt).toLocaleString()}</span></span>
                      </summary>
                      <pre className="mt-4 max-w-full overflow-auto rounded-lg bg-black/20 p-4 text-xs leading-5 text-secondary whitespace-pre-wrap break-words">OLD {formatJson(item.oldValues)}{`\n`}NEW {formatJson(item.newValues)}</pre>
                      <p className="mt-3 text-[10px] font-mono text-muted break-all">Correlation {item.correlationId}</p>
                    </details>
                  ))}
                </div>
              ) : <Empty>No moderation audit events.</Empty>}
            </SectionCard>
          )}
        </main>
      </div>

      {action && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="proposal-detail-action-title" onClick={closeAction}>
          <div className="glass-card w-full max-w-xl p-5 sm:p-6" onClick={event => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className={`${action === 'invalidate' ? 'badge-red' : action === 'restore' ? 'badge-green' : 'badge-amber'} text-xs`}>Admin Action</span>
                <h2 id="proposal-detail-action-title" className="text-xl font-bold text-primary mt-2">{action === 'note' ? 'Add internal note' : action === 'restore' ? 'Restore proposal' : 'Invalidate proposal'}</h2>
                <p className="text-sm text-secondary mt-1">{action === 'note' ? 'Record private context for other administrators.' : 'Provide an auditable reason for this moderation change.'}</p>
              </div>
              <button className="glass-button p-2 rounded-lg" aria-label="Close action dialog" onClick={closeAction}><X size={18} className="text-secondary" /></button>
            </header>

            <div className="space-y-3">
              {action !== 'note' && <textarea className="input-gb w-full min-h-28 text-sm" autoFocus aria-label="Moderation reason" placeholder="Required reason" value={reason} onChange={event => setReason(event.target.value)} />}
              <textarea className="input-gb w-full min-h-28 text-sm" autoFocus={action === 'note'} aria-label="Internal note" placeholder={action === 'note' ? 'Required private note' : 'Optional private note'} value={note} onChange={event => setNote(event.target.value)} />
            </div>

            {actionError && <p className="mt-3 rounded-lg border border-red/30 bg-red/5 p-3 text-sm text-red" role="alert">{actionError}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <button className="glass-button px-4 py-2 rounded-lg text-sm text-secondary" onClick={closeAction}>Cancel</button>
              <button
                disabled={busy || (action === 'note' ? !note.trim() : !reason.trim())}
                className={`${action === 'invalidate' ? 'btn-red' : 'btn-cyan'} px-5 py-2 text-sm disabled:opacity-50`}
                onClick={() => void apply()}
              >
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
