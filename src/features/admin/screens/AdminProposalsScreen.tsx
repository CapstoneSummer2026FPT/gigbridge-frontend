import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Briefcase,
  Calendar,
  Eye,
  FileText,
  Filter,
  Link2,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPatchAPI } from '../../../api/adminAPI/PATCH';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { AdminProposalListItem } from '../../../types/models/AdminProposal';
import { ProposalModerationStatus } from '../../../types/models/AdminProposal';
import {
  aiAttemptLabels,
  contractLabels,
  lifecycleLabels,
  moderationLabels,
  negotiationLabels,
  statusLabel,
  statusTone,
} from '../proposalStatus';
import '../styles/admin-users-screen.css';

const PAGE_SIZE = 20;
const entries = (labels: Record<number, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString() : 'Draft';
const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString() : 'Draft';

const getStatusBadgeClass = (label: string) => {
  const tone = statusTone(label);
  if (tone === 'success') return 'badge-green';
  if (tone === 'danger') return 'badge-red';
  return 'badge-amber';
};

export default function AdminProposalsScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminProposalListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [moderation, setModeration] = useState('');
  const [relation, setRelation] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [negotiationStatus, setNegotiationStatus] = useState('');
  const [contractStatus, setContractStatus] = useState('');
  const [sort, setSort] = useState('submittedAt');
  const [clientId, setClientId] = useState('');
  const [freelancerId, setFreelancerId] = useState('');
  const [jobPostId, setJobPostId] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [action, setAction] = useState<AdminProposalListItem | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminGetAPI.getProposals({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        lifecycleStatus: lifecycle === '' ? undefined : Number(lifecycle),
        moderationStatus: moderation === '' ? undefined : Number(moderation),
        clientId: clientId.trim() || undefined,
        freelancerId: freelancerId.trim() || undefined,
        jobPostId: jobPostId.trim() || undefined,
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        aiInterviewStatus: aiStatus === '' ? undefined : Number(aiStatus),
        negotiationStatus: negotiationStatus === '' ? undefined : Number(negotiationStatus),
        contractStatus: contractStatus === '' ? undefined : Number(contractStatus),
        hasContract: relation === 'contract' ? true : relation === 'no-contract' ? false : undefined,
        hasReport: relation === 'report' ? true : undefined,
        hasDispute: relation === 'dispute' ? true : undefined,
        sortBy: sort,
        sortDescending: true,
      });

      if (response.success && response.data) {
        setItems(response.data.items);
        setPages(Math.max(1, response.data.totalPages));
        setTotal(response.data.totalCount);
      } else {
        setItems([]);
        setTotal(0);
        setError({ message: response.message || 'Unable to load proposals.', status: response.statusCode });
      }
    } catch {
      setItems([]);
      setTotal(0);
      setError({ message: 'Unable to load proposals. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [aiStatus, clientId, contractStatus, freelancerId, jobPostId, lifecycle, maxBudget, minBudget, moderation, negotiationStatus, page, relation, search, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async () => {
    if (!action || !reason.trim()) return;
    setBusy(true);
    setActionError('');

    const request = action.moderationStatus === ProposalModerationStatus.Active
      ? adminPatchAPI.invalidateProposal(action.proposalId, { reason: reason.trim() })
      : adminPatchAPI.restoreProposal(action.proposalId, { reason: reason.trim() });
    const response = await request;

    if (!response.success) {
      setActionError(response.statusCode === 409 ? `Conflict: ${response.message}` : response.message || 'Moderation failed.');
    } else {
      setAction(null);
      setReason('');
      await load();
    }
    setBusy(false);
  };

  const openUser = (userId: string) => navigate(`/admin/users?preview=${encodeURIComponent(userId)}`);
  const resetPage = () => setPage(1);
  const openModeration = (item: AdminProposalListItem) => {
    setAction(item);
    setMenuId(null);
    setActionError('');
  };
  const errorHeading = error?.status === 401 || error?.status === 403
    ? 'You are not authorized to view proposals.'
    : 'Proposals could not be loaded.';

  const pageStats = useMemo(() => ({
    active: items.filter(item => item.moderationStatus === ProposalModerationStatus.Active).length,
    contracts: items.filter(item => item.hasContract).length,
    related: items.reduce((sum, item) => sum + item.reportCount + item.disputeCount, 0),
  }), [items]);

  const firstResult = total === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <main className="max-w-7xl mx-auto px-4 sm:px-6">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">Content Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Proposal Management</h1>
              <p className="text-sm text-secondary mt-1">Review proposal lifecycles, relationships, and audited moderation</p>
            </div>
          </header>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8" aria-label="Proposal summary">
            {[
              { label: 'Matching Proposals', value: total, icon: <FileText size={16} />, color: 'cyan' },
              { label: 'Active on Page', value: pageStats.active, icon: <ShieldCheck size={16} />, color: 'green' },
              { label: 'Contracts on Page', value: pageStats.contracts, icon: <Briefcase size={16} />, color: 'purple' },
              { label: 'Reports & Disputes on Page', value: pageStats.related, icon: <Link2 size={16} />, color: 'amber' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </section>

          <section className="glass-card overflow-hidden mb-6" aria-label="Proposal filters">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-purple/5">
              <Filter size={18} className="text-cyan flex-shrink-0" />
              <h2 className="font-semibold text-primary text-sm sm:text-base">Search & Filters</h2>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  aria-label="Search proposals"
                  placeholder="Search proposal, job, client, or freelancer..."
                  value={search}
                  onChange={event => { setSearch(event.target.value); resetPage(); }}
                  className="input-gb w-full py-3 text-sm"
                  style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select className="input-gb text-sm" aria-label="Lifecycle status" value={lifecycle} onChange={event => { setLifecycle(event.target.value); resetPage(); }}>
                  <option value="">All lifecycle states</option>{entries(lifecycleLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input-gb text-sm" aria-label="Moderation status" value={moderation} onChange={event => { setModeration(event.target.value); resetPage(); }}>
                  <option value="">All moderation states</option>{entries(moderationLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="input-gb text-sm" aria-label="Relationship filter" value={relation} onChange={event => { setRelation(event.target.value); resetPage(); }}>
                  <option value="">All relationships</option><option value="contract">Has contract</option><option value="no-contract">No contract</option><option value="report">Has report</option><option value="dispute">Has dispute</option>
                </select>
                <select className="input-gb text-sm" aria-label="Sort proposals" value={sort} onChange={event => { setSort(event.target.value); resetPage(); }}>
                  <option value="submittedAt">Recently submitted</option><option value="updatedAt">Recently updated</option><option value="proposedBudget">Budget</option><option value="lifecycleStatus">Lifecycle</option><option value="moderationStatus">Moderation</option>
                </select>
              </div>

              <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <summary className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-cyan">
                  <SlidersHorizontal size={16} /> Advanced filters
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                  <input className="input-gb text-sm" aria-label="Client ID" placeholder="Client ID" value={clientId} onChange={event => { setClientId(event.target.value); resetPage(); }} />
                  <input className="input-gb text-sm" aria-label="Freelancer ID" placeholder="Freelancer ID" value={freelancerId} onChange={event => { setFreelancerId(event.target.value); resetPage(); }} />
                  <input className="input-gb text-sm" aria-label="Job Post ID" placeholder="Job Post ID" value={jobPostId} onChange={event => { setJobPostId(event.target.value); resetPage(); }} />
                  <input className="input-gb text-sm" aria-label="Minimum budget" type="number" min="0" placeholder="Minimum budget" value={minBudget} onChange={event => { setMinBudget(event.target.value); resetPage(); }} />
                  <input className="input-gb text-sm" aria-label="Maximum budget" type="number" min="0" placeholder="Maximum budget" value={maxBudget} onChange={event => { setMaxBudget(event.target.value); resetPage(); }} />
                  <select className="input-gb text-sm" aria-label="AI Interview status" value={aiStatus} onChange={event => { setAiStatus(event.target.value); resetPage(); }}>
                    <option value="">Any AI interview</option>{entries(aiAttemptLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select className="input-gb text-sm" aria-label="Negotiation status" value={negotiationStatus} onChange={event => { setNegotiationStatus(event.target.value); resetPage(); }}>
                    <option value="">Any negotiation</option>{entries(negotiationLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select className="input-gb text-sm" aria-label="Contract status" value={contractStatus} onChange={event => { setContractStatus(event.target.value); resetPage(); }}>
                    <option value="">Any contract state</option>{entries(contractLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </details>
            </div>
          </section>

          <div className="flex items-center justify-between mb-4">
            <p className="text-xs sm:text-sm text-secondary">
              {loading ? 'Loading proposals…' : <>Showing <span className="text-primary font-semibold">{firstResult}-{lastResult}</span> of <span className="text-primary font-semibold">{total}</span> matching proposals</>}
            </p>
          </div>

          {loading ? (
            <section className="glass-card p-5 space-y-3" role="status" aria-label="Loading proposals">
              {Array.from({ length: 7 }).map((_, index) => <div className="h-14 rounded-lg bg-white/5 animate-pulse" key={index} />)}
            </section>
          ) : error ? (
            <section className="glass-card py-14 px-6 text-center border border-red/30" role="alert">
              <AlertTriangle size={34} className="text-red mx-auto mb-3" />
              <h2 className="text-base font-semibold text-primary">{errorHeading}</h2>
              <p className="text-sm text-secondary mt-1 mb-4">{error.message}</p>
              <button className="glass-button px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2" onClick={() => void load()}><RefreshCw size={16} /> Retry</button>
            </section>
          ) : items.length === 0 ? (
            <section className="glass-card py-16 text-center">
              <FileText size={42} className="text-muted mx-auto mb-3" />
              <h2 className="text-base font-semibold text-primary">No proposals found</h2>
              <p className="text-sm text-secondary mt-1">Try adjusting the server-side filters.</p>
            </section>
          ) : (
            <>
              <section className="glass-card" aria-label="Proposals table">
                <table className="block w-full [&_td]:whitespace-normal">
                    <thead className="hidden lg:block border-b border-primary bg-white/[0.02]">
                      <tr className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.25fr)_90px_135px_minmax(0,1.4fr)_90px_40px] items-center gap-x-4 px-5 py-3">
                        <th className="text-left text-xs font-semibold text-primary">Proposal</th>
                        <th className="text-left text-xs font-semibold text-primary">Participants</th>
                        <th className="text-left text-xs font-semibold text-primary">Offer</th>
                        <th className="text-left text-xs font-semibold text-primary">Status</th>
                        <th className="text-left text-xs font-semibold text-primary">Workflow</th>
                        <th className="text-left text-xs font-semibold text-primary">Relations</th>
                        <th><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="block divide-y divide-primary">
                      {items.map(item => {
                        const lifecycleText = statusLabel(lifecycleLabels, item.lifecycleStatus);
                        const moderationText = statusLabel(moderationLabels, item.moderationStatus);
                        const aiText = statusLabel(aiAttemptLabels, item.aiInterviewStatus);
                        const negotiationText = statusLabel(negotiationLabels, item.negotiationStatus);
                        const contractText = item.hasContract ? statusLabel(contractLabels, item.contractStatus) : 'No contract';

                        return (
                          <tr key={item.proposalId} className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.25fr)_90px_135px_minmax(0,1.4fr)_90px_40px] items-start lg:items-center gap-x-4 gap-y-4 px-4 sm:px-5 py-4 hover:bg-white/5 transition-colors">
                            <td className="col-span-2 lg:col-span-1 min-w-0">
                              <button className="block w-full text-left text-sm font-semibold text-primary hover:text-cyan transition-colors truncate" title={item.jobPostTitle} onClick={() => navigate(`/admin/proposals/${item.proposalId}`)}>{item.jobPostTitle}</button>
                              <p className="text-[10px] text-muted mt-1 font-mono">Proposal #{item.proposalId.slice(0, 8)}</p>
                            </td>
                            <td className="min-w-0 space-y-1.5">
                              <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Participants</p>
                              <button className="flex w-full items-center gap-2 min-w-0 text-left" onClick={() => openUser(item.clientId)} title={`Client: ${item.clientName}`}>
                                <UserAvatar name={item.clientName} src={item.clientAvatar} size="sm" className="!h-6 !w-6 !text-[9px]" />
                                <span className="min-w-0"><span className="block text-[9px] leading-none text-muted">Client</span><span className="block mt-0.5 text-[11px] leading-tight text-primary truncate">{item.clientName}</span></span>
                              </button>
                              <button className="flex w-full items-center gap-2 min-w-0 text-left" onClick={() => openUser(item.freelancerId)} title={`Freelancer: ${item.freelancerName}`}>
                                <UserAvatar name={item.freelancerName} src={item.freelancerAvatar} size="sm" premium={false} className="!h-6 !w-6 !text-[9px]" />
                                <span className="min-w-0"><span className="block text-[9px] leading-none text-muted">Freelancer</span><span className="block mt-0.5 text-[11px] leading-tight text-primary truncate">{item.freelancerName}</span></span>
                              </button>
                            </td>
                            <td className="min-w-0">
                              <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Offer</p>
                              <p className="text-xs font-semibold text-primary whitespace-nowrap">{item.proposedBudget?.toLocaleString() ?? 'Not available'}</p>
                              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-secondary whitespace-nowrap" title={formatDateTime(item.submittedAt)}><Calendar size={11} className="text-muted" /> {formatDate(item.submittedAt)}</span>
                            </td>
                            <td className="min-w-0">
                              <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Status</p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className={`${getStatusBadgeClass(lifecycleText)} text-[10px]`}>{lifecycleText}</span>
                                <span className={`${getStatusBadgeClass(moderationText)} text-[10px]`}>{moderationText}</span>
                              </div>
                            </td>
                            <td className="col-span-2 lg:col-span-1 min-w-0">
                              <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Workflow</p>
                              <div className="flex flex-wrap lg:flex-col items-start gap-1.5">
                                <span className={`${getStatusBadgeClass(aiText)} text-[10px]`} title="AI interview">AI · {aiText}</span>
                                <span className={`${getStatusBadgeClass(negotiationText)} text-[10px]`} title="Negotiation">Deal · {negotiationText}</span>
                                {item.hasContract && item.contractId ? (
                                  <button className={`${getStatusBadgeClass(contractText)} text-[10px]`} onClick={() => navigate(`/admin/contracts?contractId=${encodeURIComponent(item.contractId!)}`)}>Contract · {contractText}</button>
                                ) : <span className="badge-gray text-[10px]">No contract</span>}
                              </div>
                            </td>
                            <td className="min-w-0">
                              <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Relations</p>
                              <div className="flex items-start gap-1.5 text-[11px] leading-snug text-secondary">
                                <Link2 size={12} className="text-amber flex-shrink-0 mt-0.5" />
                                <span>{item.reportCount} report(s)<span className="block">{item.disputeCount} dispute(s)</span></span>
                              </div>
                            </td>
                            <td className="flex justify-end lg:block">
                              <div className="relative">
                                <button className="glass-button p-2 rounded-lg" aria-label={`Actions for proposal ${item.proposalId}`} onClick={() => setMenuId(menuId === item.proposalId ? null : item.proposalId)}><MoreVertical size={17} className="text-amber" /></button>
                                {menuId === item.proposalId && (
                                  <div className="absolute right-0 top-full mt-2 z-50 w-40 dropdown-menu p-2">
                                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-secondary hover:bg-white/5" onClick={() => navigate(`/admin/proposals/${item.proposalId}`)}><Eye size={14} className="text-cyan" /> View Details</button>
                                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-secondary hover:bg-white/5" onClick={() => openModeration(item)}>
                                      {item.moderationStatus === ProposalModerationStatus.Active ? <Ban size={14} className="text-red" /> : <Undo2 size={14} className="text-green" />}
                                      {item.moderationStatus === ProposalModerationStatus.Active ? 'Invalidate' : 'Restore'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </section>

              <nav className="flex items-center justify-center gap-3 mt-6" aria-label="Proposal pagination">
                <button className="glass-button px-4 py-2 rounded-lg text-sm text-secondary disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button>
                <span className="text-sm text-secondary">Page <strong className="text-primary">{page}</strong> of <strong className="text-primary">{pages}</strong> · {total} proposals</span>
                <button className="glass-button px-4 py-2 rounded-lg text-sm text-secondary disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</button>
              </nav>
            </>
          )}
        </main>
      </div>

      {action && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="proposal-action-title" onClick={() => setAction(null)}>
          <div className="glass-card w-full max-w-xl p-6" onClick={event => event.stopPropagation()}>
            <header className="flex items-center justify-between gap-4 mb-3">
              <div>
                <span className={action.moderationStatus === ProposalModerationStatus.Active ? 'badge-red text-xs' : 'badge-green text-xs'}>Moderation Action</span>
                <h2 id="proposal-action-title" className="text-xl font-bold text-primary mt-2">{action.moderationStatus === ProposalModerationStatus.Active ? 'Invalidate' : 'Restore'} proposal</h2>
              </div>
              <button className="glass-button p-2 rounded-lg" aria-label="Close moderation dialog" onClick={() => setAction(null)}><X size={18} className="text-secondary" /></button>
            </header>
            <p className="text-sm text-secondary mb-4">Lifecycle, authored content, interview, negotiation, and contract history remain unchanged.</p>
            <textarea className="input-gb w-full min-h-28 text-sm" autoFocus aria-label="Moderation reason" placeholder="Required reason" value={reason} onChange={event => setReason(event.target.value)} />
            {actionError && <p className="mt-3 p-3 rounded-lg border border-red/30 bg-red/5 text-sm text-red" role="alert">{actionError}</p>}
            <div className="flex justify-end gap-3 mt-5">
              <button className="glass-button px-4 py-2 rounded-lg text-sm text-secondary" onClick={() => { setAction(null); setReason(''); setActionError(''); }}>Cancel</button>
              <button className={`${action.moderationStatus === ProposalModerationStatus.Active ? 'btn-red' : 'btn-cyan'} px-5 py-2 text-sm`} disabled={busy || !reason.trim()} onClick={() => void apply()}>{busy ? 'Working…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
