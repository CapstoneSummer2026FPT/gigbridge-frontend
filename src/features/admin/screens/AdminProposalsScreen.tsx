import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FileText, MoreVertical, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPatchAPI } from '../../../api/adminAPI/PATCH';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { AdminProposalListItem } from '../../../types/models/AdminProposal';
import { ProposalModerationStatus } from '../../../types/models/AdminProposal';
import { aiAttemptLabels, contractLabels, lifecycleLabels, moderationLabels, negotiationLabels, statusLabel, statusTone } from '../proposalStatus';
import '../styles/admin-phase-one.css';

const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Draft';
const entries = (labels: Record<number, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export default function AdminProposalsScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminProposalListItem[]>([]);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(''); const [lifecycle, setLifecycle] = useState(''); const [moderation, setModeration] = useState(''); const [relation, setRelation] = useState('');
  const [aiStatus, setAiStatus] = useState(''); const [negotiationStatus, setNegotiationStatus] = useState(''); const [contractStatus, setContractStatus] = useState(''); const [sort, setSort] = useState('submittedAt');
  const [clientId, setClientId] = useState(''); const [freelancerId, setFreelancerId] = useState(''); const [jobPostId, setJobPostId] = useState(''); const [minBudget, setMinBudget] = useState(''); const [maxBudget, setMaxBudget] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null); const [action, setAction] = useState<AdminProposalListItem | null>(null); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const response = await adminGetAPI.getProposals({
      page, pageSize: 20, search: search.trim() || undefined,
      lifecycleStatus: lifecycle === '' ? undefined : Number(lifecycle), moderationStatus: moderation === '' ? undefined : Number(moderation),
      clientId: clientId.trim() || undefined, freelancerId: freelancerId.trim() || undefined, jobPostId: jobPostId.trim() || undefined,
      minBudget: minBudget ? Number(minBudget) : undefined, maxBudget: maxBudget ? Number(maxBudget) : undefined,
      aiInterviewStatus: aiStatus === '' ? undefined : Number(aiStatus), negotiationStatus: negotiationStatus === '' ? undefined : Number(negotiationStatus), contractStatus: contractStatus === '' ? undefined : Number(contractStatus),
      hasContract: relation === 'contract' ? true : relation === 'no-contract' ? false : undefined,
      hasReport: relation === 'report' ? true : undefined, hasDispute: relation === 'dispute' ? true : undefined,
      sortBy: sort, sortDescending: true,
    });
    if (response.success && response.data) { setItems(response.data.items); setPages(Math.max(1, response.data.totalPages)); setTotal(response.data.totalCount); }
    else { setItems([]); setError({ message: response.message || 'Unable to load proposals.', status: response.statusCode }); }
    setLoading(false);
  }, [aiStatus, clientId, contractStatus, freelancerId, jobPostId, lifecycle, maxBudget, minBudget, moderation, negotiationStatus, page, relation, search, sort]);

  useEffect(() => { void load(); }, [load]);

  const apply = async () => {
    if (!action || !reason.trim()) return;
    setBusy(true); setActionError('');
    const request = action.moderationStatus === ProposalModerationStatus.Active
      ? adminPatchAPI.invalidateProposal(action.proposalId, { reason: reason.trim() })
      : adminPatchAPI.restoreProposal(action.proposalId, { reason: reason.trim() });
    const response = await request;
    if (!response.success) setActionError(response.statusCode === 409 ? `Conflict: ${response.message}` : response.message || 'Moderation failed.');
    else { setAction(null); setReason(''); await load(); }
    setBusy(false);
  };

  const openUser = (userId: string) => navigate(`/admin/users?preview=${encodeURIComponent(userId)}`);
  const resetPage = () => setPage(1);
  const errorHeading = error?.status === 401 || error?.status === 403 ? 'You are not authorized to view proposals.' : 'Proposals could not be loaded.';

  return <AppLayout><main className="admin-phase admin-proposals">
    <header className="admin-phase__header"><div><p className="admin-phase__eyebrow"><FileText size={16} /> Content Management</p><h1>Proposal Management</h1><p>Read-only lifecycle oversight with independent, audited moderation.</p></div></header>
    <section className="admin-phase__panel admin-proposals__filters" aria-label="Proposal filters">
      <div className="admin-proposals__search"><Search size={17} /><input aria-label="Search proposals" placeholder="Proposal, job, client, or freelancer" value={search} onChange={event => { setSearch(event.target.value); resetPage(); }} /></div>
      <select aria-label="Lifecycle status" value={lifecycle} onChange={event => { setLifecycle(event.target.value); resetPage(); }}><option value="">All lifecycle states</option>{entries(lifecycleLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <select aria-label="Moderation status" value={moderation} onChange={event => { setModeration(event.target.value); resetPage(); }}><option value="">All moderation states</option>{entries(moderationLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <select aria-label="Relationship filter" value={relation} onChange={event => { setRelation(event.target.value); resetPage(); }}><option value="">All relationships</option><option value="contract">Has contract</option><option value="no-contract">No contract</option><option value="report">Has report</option><option value="dispute">Has dispute</option></select>
      <select aria-label="Sort proposals" value={sort} onChange={event => setSort(event.target.value)}><option value="submittedAt">Recently submitted</option><option value="updatedAt">Recently updated</option><option value="proposedBudget">Budget</option><option value="lifecycleStatus">Lifecycle</option><option value="moderationStatus">Moderation</option></select>
      <details className="admin-proposals__advanced"><summary><SlidersHorizontal size={16} /> Advanced filters</summary><div><input aria-label="Client ID" placeholder="Client ID" value={clientId} onChange={event => setClientId(event.target.value)} /><input aria-label="Freelancer ID" placeholder="Freelancer ID" value={freelancerId} onChange={event => setFreelancerId(event.target.value)} /><input aria-label="Job Post ID" placeholder="Job Post ID" value={jobPostId} onChange={event => setJobPostId(event.target.value)} /><input aria-label="Minimum budget" type="number" min="0" placeholder="Minimum budget" value={minBudget} onChange={event => setMinBudget(event.target.value)} /><input aria-label="Maximum budget" type="number" min="0" placeholder="Maximum budget" value={maxBudget} onChange={event => setMaxBudget(event.target.value)} /><select aria-label="AI Interview status" value={aiStatus} onChange={event => setAiStatus(event.target.value)}><option value="">Any AI interview</option>{entries(aiAttemptLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select aria-label="Negotiation status" value={negotiationStatus} onChange={event => setNegotiationStatus(event.target.value)}><option value="">Any negotiation</option>{entries(negotiationLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select aria-label="Contract status" value={contractStatus} onChange={event => setContractStatus(event.target.value)}><option value="">Any contract state</option>{entries(contractLabels).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></details>
    </section>

    {loading ? <section className="admin-phase__panel admin-phase__skeleton-list" role="status" aria-label="Loading proposals">{Array.from({ length: 7 }).map((_, index) => <div className="admin-phase__skeleton" key={index} />)}</section> : error ? <section className="admin-phase__panel admin-phase__state admin-phase__state--error" role="alert"><AlertTriangle size={30} /><h2>{errorHeading}</h2><p>{error.message}</p><button onClick={() => void load()}><RefreshCw size={16} /> Retry</button></section> : items.length === 0 ? <section className="admin-phase__panel admin-phase__state"><FileText size={32} /><h2>No proposals found</h2><p>Try adjusting the server-side filters.</p></section> : <section className="admin-phase__panel admin-proposals__results">
      <div className="admin-phase__table-wrap"><table><thead><tr><th>Proposal</th><th>Job Post</th><th>Client</th><th>Freelancer</th><th>Budget</th><th>Submitted</th><th>Lifecycle</th><th>Moderation</th><th>AI Interview</th><th>Negotiation</th><th>Contract</th><th>Reports / Disputes</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map(item => {
        const lifecycleText = statusLabel(lifecycleLabels, item.lifecycleStatus); const moderationText = statusLabel(moderationLabels, item.moderationStatus); const aiText = statusLabel(aiAttemptLabels, item.aiInterviewStatus); const negotiationText = statusLabel(negotiationLabels, item.negotiationStatus); const contractText = item.hasContract ? statusLabel(contractLabels, item.contractStatus) : 'No contract';
        return <tr key={item.proposalId}><td><button className="admin-phase__link admin-proposals__truncate" title={item.proposalId} onClick={() => navigate(`/admin/proposals/${item.proposalId}`)}>#{item.proposalId.slice(0, 8)}</button></td><td><span className="admin-proposals__truncate" title={item.jobPostTitle}>{item.jobPostTitle}</span></td><td><button className="admin-proposals__person" onClick={() => openUser(item.clientId)}><UserAvatar name={item.clientName} src={item.clientAvatar} size="sm" /><span>{item.clientName}</span></button></td><td><button className="admin-proposals__person" onClick={() => openUser(item.freelancerId)}><UserAvatar name={item.freelancerName} src={item.freelancerAvatar} size="sm" premium={false} /><span>{item.freelancerName}</span></button></td><td>{item.proposedBudget?.toLocaleString() ?? 'Not available'}</td><td>{date(item.submittedAt)}</td><td><span className={`admin-phase__badge ${statusTone(lifecycleText)}`}>{lifecycleText}</span></td><td><span className={`admin-phase__badge ${statusTone(moderationText)}`}>{moderationText}</span></td><td><span className={`admin-phase__badge ${statusTone(aiText)}`}>{aiText}</span></td><td><span className={`admin-phase__badge ${statusTone(negotiationText)}`}>{negotiationText}</span></td><td>{item.hasContract && item.contractId ? <button className="admin-phase__link" onClick={() => navigate(`/admin/contracts?contractId=${encodeURIComponent(item.contractId!)}`)}>{contractText}</button> : contractText}</td><td>{item.reportCount} report(s) · {item.disputeCount} dispute(s)</td><td className="admin-proposals__actions"><button aria-label={`Actions for proposal ${item.proposalId}`} onClick={() => setMenuId(menuId === item.proposalId ? null : item.proposalId)}><MoreVertical size={17} /></button>{menuId === item.proposalId && <div><button onClick={() => navigate(`/admin/proposals/${item.proposalId}`)}>View</button><button className={item.moderationStatus === ProposalModerationStatus.Active ? 'danger' : ''} onClick={() => { setAction(item); setMenuId(null); }}>{item.moderationStatus === ProposalModerationStatus.Active ? 'Invalidate' : 'Restore'}</button></div>}</td></tr>;
      })}</tbody></table></div>
      <footer className="admin-phase__pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {pages} · {total} proposals</span><button disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</button></footer>
    </section>}

    {action && <div className="admin-phase__modal" role="alertdialog" aria-modal="true" aria-labelledby="proposal-action-title"><div className="admin-phase__panel"><header><h2 id="proposal-action-title">{action.moderationStatus === ProposalModerationStatus.Active ? 'Invalidate' : 'Restore'} proposal</h2><button aria-label="Close moderation dialog" onClick={() => setAction(null)}><X size={18} /></button></header><p>Lifecycle, authored content, interview, negotiation, and contract history remain unchanged.</p><textarea autoFocus aria-label="Moderation reason" placeholder="Required reason" value={reason} onChange={event => setReason(event.target.value)} />{actionError && <p className="admin-phase__error" role="alert">{actionError}</p>}<div className="admin-phase__actions"><button onClick={() => { setAction(null); setReason(''); setActionError(''); }}>Cancel</button><button className={action.moderationStatus === ProposalModerationStatus.Active ? 'danger' : 'primary'} disabled={busy || !reason.trim()} onClick={() => void apply()}>{busy ? 'Working…' : 'Confirm'}</button></div></div></div>}
  </main></AppLayout>;
}
