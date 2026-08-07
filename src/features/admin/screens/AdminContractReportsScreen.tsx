import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Eye,
  FileCheck2,
  FileWarning,
  Filter,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { AdminContractReportListItem } from '../../../types/models/AdminContractReport';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
import { ReportAreaTabs } from '../components/ReportAreaTabs';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
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
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [showFilters, setShowFilters] = useState(false);

  const pageCache = useRef(new AdminPageCache<ContractReportPageData>()).current;
  const latestRequest = useRef(0);

  // GSAP Entrance Animations
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.esign-gsap-header', y: 20, duration: 0.55 },
      { selector: '.esign-gsap-metrics', y: 16, duration: 0.5, stagger: 0.06 },
      { selector: '.esign-gsap-main', y: 24, duration: 0.5 },
    ],
  });

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
        .filter(targetPage => targetPage >= 1 && targetPage <= data.totalPages)
        .forEach(targetPage => pageCache.prefetch(keyForPage(targetPage), () => requestPage(targetPage)));
    } catch (err) {
      if (requestId !== latestRequest.current || cached) return;
      setItems([]);
      setTotal(0);
      setPages(1);
      setError(err instanceof Error ? err.message : 'Unable to load Contract Reports.');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load(page, pageSize);
  }, [page, pageSize, sort]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load(1, pageSize, true);
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setIssue('');
    setReporter('');
    setRespondent('');
    setClient('');
    setFreelancer('');
    setContract('');
    setJob('');
    setMilestone('');
    setAssigned('');
    setLink('');
    setAttachments('');
    setResponse('');
    setEscalated('');
    setCreatedFrom('');
    setCreatedTo('');
    setUpdatedFrom('');
    setUpdatedTo('');
    setSort('createdAt-desc');
    setPage(1);
    void load(1, pageSize, true);
  };

  const stats = useMemo(() => ({
    total,
    open: items.filter(i => i.adminReviewStatus === 0).length,
    underReview: items.filter(i => i.adminReviewStatus === 1).length,
    closed: items.filter(i => i.adminReviewStatus === 3).length,
    escalated: items.filter(i => i.adminReviewStatus === 5 || i.escalationEligible).length,
  }), [items, total]);

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        
        {/* Sticky Header Bar with ReportAreaTabs */}
        <header className="esign-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                Contract Audit & Enforcement
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Contract <span className="text-brand italic font-light">Execution Reports</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">Investigate contract execution issues, review milestone disputes, and audit compliance logs.</p>
            </div>

            {/* Navigation Tabs Bar for Reports */}
            <ReportAreaTabs />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          
          {/* Summary Metric Cards */}
          <section aria-label="Contract Reports Metrics" className="esign-gsap-metrics grid grid-cols-2 sm:grid-cols-5 gap-3">
            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Total Reports</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{stats.total}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FileWarning size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Open</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-cyan-600 dark:text-cyan-400">{stats.open}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <ShieldAlert size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Under Review</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">{stats.underReview}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Eye size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Closed</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{stats.closed}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileCheck2 size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Escalated</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">{stats.escalated}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={18} />
                </span>
              </div>
            </article>
          </section>

          {/* Search & Filters Controls Section */}
          <section className="esign-gsap-main rounded-2xl border border-border bg-background p-4 shadow-sm space-y-4">
            <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search title, description, IDs..."
                  className="input-gb w-full pl-10 pr-9 py-2 text-xs font-semibold"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-text-primary">✕</button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold cursor-pointer transition ${
                    showFilters ? 'border-brand bg-brand text-white' : 'border-border bg-background text-text-primary hover:border-brand/40'
                  }`}
                >
                  <Filter size={15} />
                  Filters
                </button>

                <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer shadow-sm">
                  <Search size={15} /> Search
                </button>

                <AdminTablePageSize pageSize={pageSize} totalEntries={total} disabled={loading} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />
              </div>
            </form>

            {/* Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border/50">
                <div>
                  <label className="block text-[10px] font-black uppercase text-text-muted mb-1">Status</label>
                  <select className="input-gb w-full py-2 text-xs font-semibold" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {statusNames.map((s, idx) => <option key={s} value={idx}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-text-muted mb-1">Issue Type</label>
                  <select className="input-gb w-full py-2 text-xs font-semibold" value={issue} onChange={e => setIssue(e.target.value)}>
                    <option value="">All Issue Types</option>
                    {issueNames.map((i, idx) => <option key={i} value={idx}>{i}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-text-muted mb-1">Sort Order</label>
                  <select className="input-gb w-full py-2 text-xs font-semibold" value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="updatedAt-desc">Recently Updated</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button type="button" onClick={resetFilters} className="w-full rounded-xl border border-border bg-background py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer">
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {/* Error Message Notification */}
            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
                <AlertCircle size={20} />
                <p className="flex-1">{error}</p>
              </div>
            )}

            {/* Contract Reports List Table */}
            <div className="rounded-2xl border border-border overflow-hidden bg-background">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border bg-surface-muted/30">
                    <tr>
                      {['No.', 'Title & Contract', 'Reporter', 'Issue Type', 'Status', 'Created', 'Actions'].map((heading) => (
                        <th key={heading} className="p-3.5 text-[11px] font-black uppercase tracking-wider text-text-muted">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs font-extrabold text-text-muted">
                          Loading contract reports...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs font-extrabold text-text-muted">
                          No contract reports found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={item.reportContractId} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="p-3.5 text-xs font-bold font-mono text-text-muted">
                            #{((page - 1) * pageSize) + index + 1}
                          </td>
                          <td className="p-3.5 min-w-0 max-w-[280px]">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-extrabold text-text-primary truncate" title={item.contractTitle}>
                                {item.contractTitle}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                                Contract: {item.contractId}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-xs font-bold text-text-primary">
                            {item.reporterName || (item.reporterRole === 'Client' ? 'Client' : 'Freelancer')}
                          </td>
                          <td className="p-3.5 text-xs font-bold text-text-primary">
                            {issueNames[item.issueType] || 'Other'}
                          </td>
                          <td className="p-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${getStatusBadgeClass(item.adminReviewStatus)}`}>
                              {statusNames[item.adminReviewStatus] || 'Unknown'}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs font-semibold text-text-muted">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5">
                            <Link
                              to={`/admin/reports/contracts/${item.reportContractId}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-extrabold text-brand hover:bg-brand/20 transition cursor-pointer"
                            >
                              <Eye size={14} /> Review
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Footer */}
            {pages > 1 && (
              <AdminTablePagination
                currentPage={page}
                totalPages={pages}
                disabled={loading}
                onPageChange={setPage}
              />
            )}
          </section>
        </main>
      </div>
    </AppLayout>
  );
}
