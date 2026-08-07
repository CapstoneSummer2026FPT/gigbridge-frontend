import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Eye,
  FileWarning,
  Filter,
  Link2,
  Paperclip,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { AdminContractReportListItem } from '../../../types/models/AdminContractReport';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
import { AdminPageCache, adminPageCacheKey } from '../utils/AdminPageCache';
import '../styles/admin-users-screen.css';

const statusNames = ['Open', 'Under review', 'Awaiting information', 'Closed', 'Dismissed', 'Escalated', 'Linked to dispute'];
const issueNames = ['Payment', 'Milestone', 'Delay', 'Poor quality', 'Communication', 'Scope change', 'Other'];
type ContractReportPageData = NonNullable<Awaited<ReturnType<typeof adminGetAPI.getContractReports>>['data']>;

const getStatusBadgeClass = (status: number) => {
  if (status === 3) return 'badge-green';
  if (status === 4) return 'badge-gray';
  if (status === 5 || status === 6) return 'badge-red';
  if (status === 2) return 'badge-amber';
  return 'badge-cyan';
};

export default function AdminContractReportsScreen() {
  const [items, setItems] = useState<AdminContractReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [issue, setIssue] = useState('');
  const [reporter, setReporter] = useState('');
  const [respondent, setRespondent] = useState('');
  const [client, setClient] = useState('');
  const [freelancer, setFreelancer] = useState('');
  const [contract, setContract] = useState('');
  const [job, setJob] = useState('');
  const [milestone, setMilestone] = useState('');
  const [assigned, setAssigned] = useState('');
  const [link, setLink] = useState('');
  const [attachments, setAttachments] = useState('');
  const [response, setResponse] = useState('');
  const [escalated, setEscalated] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');
  const [sort, setSort] = useState('createdAt-desc');
  const pageCache = useRef(new AdminPageCache<ContractReportPageData>()).current;
  const latestRequest = useRef(0);

  const load = async (next = page, nextPageSize = pageSize, force = false) => {
    const requestId = ++latestRequest.current;
    setError('');
    const [sortBy, direction] = sort.split('-');

    const paramsForPage = (targetPage: number) => ({
      page: targetPage,
      pageSize: nextPageSize,
      search: search.trim() || undefined,
      adminReviewStatus: status === '' ? undefined : Number(status),
      issueType: issue === '' ? undefined : Number(issue),
      reporterId: reporter.trim() || undefined,
      respondentId: respondent.trim() || undefined,
      clientId: client.trim() || undefined,
      freelancerId: freelancer.trim() || undefined,
      contractId: contract.trim() || undefined,
      jobPostId: job.trim() || undefined,
      milestoneId: milestone.trim() || undefined,
      assignedAdminId: assigned && assigned !== 'unassigned' ? assigned.trim() : undefined,
      unassignedOnly: assigned.trim().toLowerCase() === 'unassigned',
      hasRelatedDispute: link === '' ? undefined : link === 'true',
      hasAttachments: attachments === '' ? undefined : attachments === 'true',
      hasResponse: response === '' ? undefined : response === 'true',
      escalated: escalated === '' ? undefined : escalated === 'true',
      createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
      createdTo: createdTo ? new Date(`${createdTo}T23:59:59Z`).toISOString() : undefined,
      updatedFrom: updatedFrom ? new Date(updatedFrom).toISOString() : undefined,
      updatedTo: updatedTo ? new Date(`${updatedTo}T23:59:59Z`).toISOString() : undefined,
      sortBy,
      sortDescending: direction === 'desc',
    });
    const keyForPage = (targetPage: number) => adminPageCacheKey('contract-reports', paramsForPage(targetPage));
    const requestPage = async (targetPage: number): Promise<ContractReportPageData> => {
      const result = await adminGetAPI.getContractReports(paramsForPage(targetPage));
      if (!result.success || !result.data) throw new Error(result.message || 'Unable to load Contract Reports.');
      return result.data;
    };
    const cached = force ? undefined : pageCache.get(keyForPage(next));
    setLoading(!cached);

    const applyPage = (data: ContractReportPageData) => {
      setItems(data.items);
      setPage(data.pageNumber);
      setPages(Math.max(1, data.totalPages));
      setTotal(data.totalCount);
    };

    if (cached) applyPage(cached);

    try {
      const data = await pageCache.load(keyForPage(next), () => requestPage(next), force);
      if (requestId !== latestRequest.current) return;
      applyPage(data);
      [next - 1, next + 1]
        .filter(target => target >= 1 && target <= data.totalPages)
        .forEach(target => pageCache.prefetch(keyForPage(target), () => requestPage(target)));
    } catch (loadError) {
      if (requestId !== latestRequest.current || cached) return;
      setItems([]);
      setTotal(0);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Contract Reports. Please try again.');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  const pageStats = useMemo(() => ({
    needsReview: items.filter(item => item.adminReviewStatus <= 2).length,
    escalated: items.filter(item => item.adminReviewStatus >= 5 || item.relatedDisputeId).length,
    evidence: items.reduce((sum, item) => sum + item.attachmentCount, 0),
  }), [items]);

  const firstResult = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <main className="max-w-7xl mx-auto px-4 sm:px-6">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <Link to="/admin/reports" className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:underline mb-3">
                <ArrowLeft size={14} /> All Reports
              </Link>
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">Report Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Contract Reports</h1>
              <p className="text-sm text-secondary mt-1">Investigate contract execution issues and safely escalate them into disputes</p>
            </div>
          </header>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8" aria-label="Contract report summary">
            {[
              { label: 'Matching Reports', value: total, icon: <FileWarning size={16} />, color: 'cyan' },
              { label: 'Needs Review on Page', value: pageStats.needsReview, icon: <ShieldAlert size={16} />, color: 'amber' },
              { label: 'Escalated on Page', value: pageStats.escalated, icon: <Link2 size={16} />, color: 'red' },
              { label: 'Evidence Files on Page', value: pageStats.evidence, icon: <Paperclip size={16} />, color: 'purple' },
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

          <section className="glass-card overflow-hidden mb-6" aria-label="Contract report filters">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-purple/5">
              <Filter size={18} className="text-cyan flex-shrink-0" />
              <h2 className="font-semibold text-primary text-sm sm:text-base">Search & Filters</h2>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && void load(1)}
                  placeholder="Search contract, participant, or issue"
                  className="input-gb w-full py-3 text-sm"
                  style={{ paddingLeft: '3rem', paddingRight: '1rem' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select className="input-gb text-sm" value={status} onChange={event => setStatus(event.target.value)} aria-label="Admin state">
                  <option value="">All admin states</option>
                  {statusNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
                <select className="input-gb text-sm" value={issue} onChange={event => setIssue(event.target.value)} aria-label="Issue type">
                  <option value="">All issue types</option>
                  {issueNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
                <select className="input-gb text-sm" value={link} onChange={event => setLink(event.target.value)} aria-label="Dispute linkage">
                  <option value="">Any dispute linkage</option>
                  <option value="true">Has dispute</option>
                  <option value="false">No dispute</option>
                </select>
                <select className="input-gb text-sm" aria-label="Sort Contract Reports" value={sort} onChange={event => setSort(event.target.value)}>
                  <option value="createdAt-desc">Newest created</option>
                  <option value="createdAt-asc">Oldest created</option>
                  <option value="updatedAt-desc">Recently updated</option>
                  <option value="status-asc">Admin state</option>
                </select>
              </div>

              <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <summary className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-cyan">
                  <SlidersHorizontal size={16} /> Advanced filters
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                  <input className="input-gb text-sm" value={reporter} onChange={event => setReporter(event.target.value)} placeholder="Reporter user ID" />
                  <input className="input-gb text-sm" value={respondent} onChange={event => setRespondent(event.target.value)} placeholder="Respondent user ID" />
                  <input className="input-gb text-sm" value={client} onChange={event => setClient(event.target.value)} placeholder="Client user ID" />
                  <input className="input-gb text-sm" value={freelancer} onChange={event => setFreelancer(event.target.value)} placeholder="Freelancer user ID" />
                  <input className="input-gb text-sm" value={contract} onChange={event => setContract(event.target.value)} placeholder="Contract ID" />
                  <input className="input-gb text-sm" value={job} onChange={event => setJob(event.target.value)} placeholder="Job Post ID" />
                  <input className="input-gb text-sm" value={milestone} onChange={event => setMilestone(event.target.value)} placeholder="Milestone ID" />
                  <input className="input-gb text-sm" value={assigned} onChange={event => setAssigned(event.target.value)} placeholder="Admin ID or unassigned" />
                  <select className="input-gb text-sm" value={escalated} onChange={event => setEscalated(event.target.value)} aria-label="Escalation state">
                    <option value="">Any escalation state</option><option value="true">Escalated</option><option value="false">Not escalated</option>
                  </select>
                  <select className="input-gb text-sm" value={attachments} onChange={event => setAttachments(event.target.value)} aria-label="Evidence state">
                    <option value="">Any evidence</option><option value="true">Has attachments</option><option value="false">No attachments</option>
                  </select>
                  <select className="input-gb text-sm" value={response} onChange={event => setResponse(event.target.value)} aria-label="Response state">
                    <option value="">Any response state</option><option value="true">Has response</option><option value="false">No response</option>
                  </select>
                  <input className="input-gb text-sm" type="date" aria-label="Created from" value={createdFrom} onChange={event => setCreatedFrom(event.target.value)} />
                  <input className="input-gb text-sm" type="date" aria-label="Created to" value={createdTo} onChange={event => setCreatedTo(event.target.value)} />
                  <input className="input-gb text-sm" type="date" aria-label="Updated from" value={updatedFrom} onChange={event => setUpdatedFrom(event.target.value)} />
                  <input className="input-gb text-sm" type="date" aria-label="Updated to" value={updatedTo} onChange={event => setUpdatedTo(event.target.value)} />
                </div>
              </details>

              <div className="flex justify-end">
                <button type="button" className="btn-cyan px-5 py-2.5 text-sm flex items-center gap-2" onClick={() => void load(1)} disabled={loading}>
                  <Filter size={15} /> {loading ? 'Applying…' : 'Apply filters'}
                </button>
              </div>
            </div>
          </section>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs sm:text-sm text-secondary">
              {loading ? 'Loading reports…' : <>Showing <span className="text-primary font-semibold">{firstResult}-{lastResult}</span> of <span className="text-primary font-semibold">{total}</span> matching reports</>}
            </p>
            <AdminTablePageSize
              pageSize={pageSize}
              totalEntries={total}
              disabled={loading}
              onPageSizeChange={value => { setPageSize(value); setPage(1); void load(1, value); }}
            />
          </div>

          {loading ? (
            <div className="glass-card py-16 text-center" role="status">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-cyan mx-auto mb-4" />
              <p className="text-sm text-secondary">Loading contract reports…</p>
            </div>
          ) : error ? (
            <div className="glass-card py-14 px-6 text-center border border-red/30" role="alert">
              <AlertCircle size={34} className="text-red mx-auto mb-3" />
              <h2 className="text-base font-semibold text-primary">Contract reports could not be loaded</h2>
              <p className="text-sm text-secondary mt-1 mb-4">{error}</p>
              <button type="button" className="glass-button px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2" onClick={() => void load(page)}><RefreshCw size={16} /> Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card py-16 text-center">
              <FileWarning size={42} className="text-muted mx-auto mb-3" />
              <h2 className="text-base font-semibold text-primary">No contract reports found</h2>
              <p className="text-sm text-secondary mt-1">Try adjusting the server-side filters.</p>
            </div>
          ) : (
            <>
              <section className="glass-card" aria-label="Contract reports table">
                  <table className="block w-full [&_td]:whitespace-normal">
                    <thead className="hidden lg:block border-b border-primary bg-white/[0.02]">
                      <tr className="grid grid-cols-[44px_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_135px_140px_40px] items-center gap-x-4 px-5 py-3">
                        <th className="text-left text-xs font-semibold text-primary">No.</th>
                        <th className="text-left text-xs font-semibold text-primary">Contract Report</th>
                        <th className="text-left text-xs font-semibold text-primary">Participants</th>
                        <th className="text-left text-xs font-semibold text-primary">Issue</th>
                        <th className="text-left text-xs font-semibold text-primary">Review</th>
                        <th className="text-left text-xs font-semibold text-primary">Activity</th>
                        <th><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="block divide-y divide-primary">
                      {items.map((item, index) => (
                        <tr key={item.reportContractId} className="grid grid-cols-2 lg:grid-cols-[44px_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_135px_140px_40px] items-start lg:items-center gap-x-4 gap-y-4 px-4 sm:px-5 py-4 hover:bg-white/5 transition-colors">
                          <td className="col-span-2 lg:col-span-1 text-xs font-bold text-cyan">#{firstResult + index}</td>
                          <td className="col-span-2 lg:col-span-1 min-w-0">
                            <Link to={`/admin/reports/contracts/${item.reportContractId}`} className="block text-sm font-semibold text-primary hover:text-cyan transition-colors truncate" title={item.contractTitle}>{item.contractTitle}</Link>
                            <p className="text-xs text-secondary mt-1 line-clamp-1">{item.jobPostTitle}</p>
                            <p className="text-[10px] text-muted mt-1 font-mono">#{item.reportContractId.slice(0, 8)}</p>
                          </td>
                          <td className="min-w-0">
                            <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Participants</p>
                            <div className="flex items-center gap-2 text-[11px] text-primary min-w-0"><Users size={12} className="text-cyan flex-shrink-0" /><span className="truncate">{item.reporterName}</span><span className="text-muted flex-shrink-0">({item.reporterRole})</span></div>
                            <p className="text-[11px] text-secondary mt-1 pl-5 truncate">{item.respondentName || 'No respondent'} {item.respondentRole && `(${item.respondentRole})`}</p>
                          </td>
                          <td className="min-w-0">
                            <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Issue</p>
                            <span className="text-xs font-semibold text-primary line-clamp-1">{issueNames[item.issueType] || `Type ${item.issueType}`}</span>
                            {item.milestoneTitle && <p className="text-xs text-secondary mt-1 line-clamp-1">{item.milestoneTitle}</p>}
                          </td>
                          <td className="min-w-0">
                            <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Review</p>
                            <span className={`${getStatusBadgeClass(item.adminReviewStatus)} text-[10px]`}>{statusNames[item.adminReviewStatus] || item.adminReviewStatus}</span>
                            <p className="text-[11px] text-secondary mt-1.5 truncate">{item.assignedAdminName || 'Unassigned'}</p>
                          </td>
                          <td className="col-span-2 lg:col-span-1 min-w-0">
                            <p className="lg:hidden text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">Activity</p>
                            <div className="flex flex-wrap lg:flex-col items-start gap-1.5 text-[11px] text-secondary">
                              <span className="inline-flex items-center gap-1.5"><Paperclip size={12} className="text-purple" /> {item.attachmentCount} evidence</span>
                              <span className="inline-flex items-center gap-1.5"><Calendar size={12} className="text-muted" /> {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                              {item.relatedDisputeId ? <Link to={`/admin/disputes/${item.relatedDisputeId}`} className="badge-red text-[10px]">Open Dispute</Link> : <span className="text-[10px] text-muted">No dispute</span>}
                            </div>
                          </td>
                          <td className="flex justify-end lg:block">
                            <Link to={`/admin/reports/contracts/${item.reportContractId}`} className="glass-button p-2 rounded-lg inline-flex items-center justify-center" title="View report"><Eye size={16} className="text-cyan" /></Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </section>

              {pages > 1 && <AdminTablePagination currentPage={page} totalPages={pages} disabled={loading} onPageChange={next => void load(next)} ariaLabel="Contract report pagination" />}
            </>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
