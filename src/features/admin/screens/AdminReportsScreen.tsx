import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  MoreVertical,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
import { ReportAreaTabs } from '../components/ReportAreaTabs';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { AdminPageCache, adminPageCacheKey } from '../utils/AdminPageCache';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { reportAPI } from '../../../api/reportAPI';
import { getAdminManager } from '../adminManagers';
import {
  ReportStatus,
  ReportType,
  type ReportDto,
  type ReportedEntityType,
  type ReportSummaryDto,
} from '../../../types/models/Report';
import '../styles/admin-users-screen.css';
import '../styles/admin-reports-screen.css';

type ReportAction = 'review' | 'dismiss' | 'resolve' | 'resolve-action';
type ReportPageData = NonNullable<Awaited<ReturnType<typeof reportAPI.getAdminReports>>['data']>;

interface ActionMenuState {
  report: ReportDto;
  left: number;
  top: number;
}

const EMPTY_SUMMARY: ReportSummaryDto = {
  total: 0,
  pending: 0,
  reviewing: 0,
  resolved: 0,
  dismissed: 0,
  open: 0,
};

const TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.Spam]: 'Spam',
  [ReportType.Fraud]: 'Fraud',
  [ReportType.InappropriateContent]: 'Inappropriate Content',
  [ReportType.HarassmentOrAbuse]: 'Harassment or Abuse',
  [ReportType.Other]: 'Other',
  [ReportType.PaymentDispute]: 'Payment Dispute',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: 'Pending',
  [ReportStatus.Reviewing]: 'Reviewing',
  [ReportStatus.Resolved]: 'Resolved',
  [ReportStatus.Dismissed]: 'Dismissed',
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const statusBadgeClass = (status: ReportStatus) => {
  if (status === ReportStatus.Pending) return 'badge-amber';
  if (status === ReportStatus.Reviewing) return 'badge-cyan';
  if (status === ReportStatus.Resolved) return 'badge-green';
  return 'badge-gray';
};

const getModerationActionLabel = (report: ReportDto) => {
  if (report.reportedEntityType === 'User') return 'Deactivate reported user';
  if (report.reportedEntityType === 'JobPost') return 'Cancel reported job post';
  return 'Hide reported review';
};

const getModerationMenuLabel = (report: ReportDto) => {
  if (report.reportedEntityType === 'User') return 'Ban';
  if (report.reportedEntityType === 'JobPost') return 'Cancel Job Post';
  return 'Hide Review';
};

export default function AdminReportsScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEntityType = searchParams.get('reportedEntityType') as ReportedEntityType | null;
  const initialEntityId = searchParams.get('reportedEntityId') || '';

  const [reports, setReports] = useState<ReportDto[]>([]);
  const [summary, setSummary] = useState<ReportSummaryDto>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [type, setType] = useState<ReportType | ''>('');
  const [entityType, setEntityType] = useState<ReportedEntityType | ''>(initialEntityType || '');
  const [entityId, setEntityId] = useState(initialEntityId);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportDto | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuState | null>(null);
  const [pendingAction, setPendingAction] = useState<ReportAction | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageCache = useRef(new AdminPageCache<ReportPageData>()).current;
  const latestRequest = useRef(0);

  // GSAP Entrance Animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.esign-gsap-header', y: 20, duration: 0.55 },
      { selector: '.esign-gsap-metrics', y: 16, duration: 0.5, stagger: 0.06 },
      { selector: '.esign-gsap-main', y: 24, duration: 0.5 },
    ],
  });

  const loadSummary = useCallback(async () => {
    const response = await reportAPI.getAdminSummary();
    if (response.success && response.data) {
      setSummary(response.data);
    }
  }, []);

  const loadReports = useCallback(async (force = false) => {
    const requestId = ++latestRequest.current;
    setError(null);

    const paramsForPage = (targetPage: number) => ({
      page: targetPage,
      pageSize,
      status: status === '' ? undefined : status,
      type: type === '' ? undefined : type,
      reportedEntityType: entityType || undefined,
      reportedEntityId: entityId || undefined,
      search: search || undefined,
    });
    const keyForPage = (targetPage: number) => adminPageCacheKey('reports', paramsForPage(targetPage));
    const requestPage = async (targetPage: number): Promise<ReportPageData> => {
      const response = await reportAPI.getAdminReports(paramsForPage(targetPage));
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load reports.');
      return response.data;
    };
    const cached = force ? undefined : pageCache.get(keyForPage(page));
    setLoading(!cached);

    const applyPage = (data: ReportPageData) => {
      setReports(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    };

    if (cached) applyPage(cached);

    try {
      const data = await pageCache.load(keyForPage(page), () => requestPage(page), force);
      if (requestId !== latestRequest.current) return;
      applyPage(data);
      [page - 1, page + 1]
        .filter(target => target >= 1 && target <= data.totalPages)
        .forEach(target => pageCache.prefetch(keyForPage(target), () => requestPage(target)));
    } catch (loadError) {
      if (requestId !== latestRequest.current || cached) return;
      setReports([]);
      setTotalPages(0);
      setTotalItems(0);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load reports.');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [entityId, entityType, page, pageCache, pageSize, search, status, type]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    setPage(1);
  }, [status, type, entityType, entityId, search]);

  const clearQuickFilter = () => {
    setEntityId('');
    setEntityType('');
    setSearchParams({}, { replace: true });
  };

  const openAction = (report: ReportDto, action: ReportAction) => {
    setError(null);
    setOpenActionMenu(null);
    setSelectedReport(report);
    setPendingAction(action);
    setAdminNote(report.adminNote || '');
  };

  const closeAction = () => {
    if (actionLoading) return;
    setPendingAction(null);
    setSelectedReport(null);
    setAdminNote('');
    setError(null);
  };

  const runAction = async () => {
    if (!selectedReport || !pendingAction) return;
    setActionLoading(true);

    const response = pendingAction === 'review'
      ? await reportAPI.updateStatus(selectedReport.id, ReportStatus.Reviewing, adminNote || undefined)
      : pendingAction === 'dismiss'
        ? await reportAPI.updateStatus(selectedReport.id, ReportStatus.Dismissed, adminNote || undefined)
        : await reportAPI.resolve(
            selectedReport.id,
            pendingAction === 'resolve-action',
            adminNote || undefined,
          );

    if (response.success) {
      closeActionAfterSuccess();
      pageCache.clear();
      await Promise.all([loadReports(true), loadSummary()]);
    } else {
      setError(response.message || 'Unable to update this report.');
      setActionLoading(false);
    }
  };

  const closeActionAfterSuccess = () => {
    setActionLoading(false);
    setPendingAction(null);
    setSelectedReport(null);
    setAdminNote('');
  };

  const renderActions = (report: ReportDto) => {
    const isOpen = report.status === ReportStatus.Pending || report.status === ReportStatus.Reviewing;

    const toggleMenu = (event: MouseEvent<HTMLButtonElement>) => {
      if (openActionMenu?.report.id === report.id) {
        setOpenActionMenu(null);
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 192;
      const menuHeight = !isOpen ? 56 : report.status === ReportStatus.Pending ? 224 : 184;
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      const top = rect.bottom + 8 + menuHeight > window.innerHeight
        ? Math.max(8, rect.top - menuHeight - 8)
        : rect.bottom + 8;

      setOpenActionMenu({ report, left, top });
    };

    return (
      <div className="admin-reports__row-actions">
        {report.reportedEntityType === 'User' && (
          <Link
            to={`/admin/reports/accounts/${report.id}`}
            className="admin-reports__enforcement-link"
            aria-label={`Account enforcement for ${report.targetSummary?.title || report.reportedEntityId}`}
          >
            <ShieldCheck size={15} />
            <span>Account enforcement</span>
          </Link>
        )}
        <button
          onClick={toggleMenu}
          className="admin-reports__more-button"
          title="More actions"
          aria-label="More report actions"
          aria-expanded={openActionMenu?.report.id === report.id}
        >
          <MoreVertical size={17} />
        </button>
      </div>
    );
  };

  const renderDetailActions = (report: ReportDto) => {
    const isOpen = report.status === ReportStatus.Pending || report.status === ReportStatus.Reviewing;
    if (!isOpen) return null;

    return (
      <div className="flex flex-wrap justify-end gap-2">
        {report.status === ReportStatus.Pending && (
          <button
            className="btn-ghost-cyan px-4 py-2 text-sm"
            onClick={() => openAction(report, 'review')}
          >
            Mark Reviewing
          </button>
        )}
        <button
          className="px-4 py-2 text-sm rounded-lg border border-amber/30 text-amber hover:bg-amber/10 transition-colors"
          onClick={() => openAction(report, 'dismiss')}
        >
          Dismiss
        </button>
        <button
          className="btn-green px-4 py-2 text-sm"
          onClick={() => openAction(report, 'resolve')}
        >
          Resolve
        </button>
        <button
          className="btn-red px-4 py-2 text-sm"
          onClick={() => openAction(report, 'resolve-action')}
        >
          {getModerationMenuLabel(report)}
        </button>
      </div>
    );
  };

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        
        {/* Sticky Header Bar with ReportAreaTabs */}
        <header className="esign-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                Moderation & Content Safety
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Reports <span className="text-brand italic font-light">& Content Moderation</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">Review content reports for users, job posts, and reviews. Investigate and execute moderation actions.</p>
            </div>

            {/* Navigation Tabs Bar for Reports */}
            <ReportAreaTabs />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          
          {/* Summary Metric Cards */}
          <section aria-label="Reports Metrics" className="esign-gsap-metrics grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              ['All Reports', summary.total, <Flag size={18} />, 'text-brand bg-brand/10'],
              ['Open', summary.open, <ShieldAlert size={18} />, 'text-rose-600 dark:text-rose-400 bg-rose-500/10'],
              ['Pending', summary.pending, <Clock size={18} />, 'text-amber-600 dark:text-amber-400 bg-amber-500/10'],
              ['Reviewing', summary.reviewing, <Eye size={18} />, 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'],
              ['Resolved', summary.resolved, <CheckCircle size={18} />, 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'],
              ['Dismissed', summary.dismissed, <XCircle size={18} />, 'text-text-muted bg-surface-muted'],
            ].map(([label, value, icon, colorClass]) => (
              <article key={String(label)} className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">{label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{value}</p>
                  </div>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${colorClass}`}>
                    {icon}
                  </span>
                </div>
              </article>
            ))}
          </section>

          {/* Separate Contract Reports Banner */}
          {(() => {
            const manager = getAdminManager('contract-reports');
            return manager && (
              <Link
                to={manager.path}
                className="rounded-2xl border border-border bg-background p-4 flex items-center gap-4 shadow-sm transition hover:border-brand/40 hover:bg-brand/5 group text-decoration-none"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <manager.icon size={20} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-extrabold text-text-primary group-hover:text-brand transition">{manager.fallbackLabel}</span>
                  <span className="block text-xs font-semibold text-text-muted mt-0.5">{manager.fallbackDescription}</span>
                </span>
                <ChevronRight size={18} className="text-text-muted shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            );
          })()}

          {/* Quick Filter Info Tag */}
          {entityId && (
            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-text-primary">
                Showing reports for <span className="font-extrabold text-brand">{entityType}</span>{' '}
                <span className="font-mono text-xs font-bold text-text-muted">{entityId}</span>
              </p>
              <button onClick={clearQuickFilter} className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-background px-3 py-1.5 text-xs font-extrabold text-brand hover:bg-brand/10 transition cursor-pointer">
                <X size={14} /> Clear Filter
              </button>
            </div>
          )}

          {/* Filter Form Card */}
          <section className="esign-gsap-main rounded-2xl border border-border bg-background p-4 shadow-sm space-y-4">
            <form
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchDraft.trim());
              }}
            >
              <div className="relative lg:col-span-2">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input-gb w-full pl-10 pr-4 py-2 text-xs font-semibold"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search people, reason, note, or target ID..."
                />
              </div>

              <div>
                <select
                  className="input-gb w-full py-2 text-xs font-semibold"
                  value={status}
                  onChange={(event) => setStatus(event.target.value === '' ? '' : Number(event.target.value) as ReportStatus)}
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>

              <div>
                <select
                  className="input-gb w-full py-2 text-xs font-semibold"
                  value={type}
                  onChange={(event) => setType(event.target.value === '' ? '' : Number(event.target.value) as ReportType)}
                >
                  <option value="">All Reasons</option>
                  {Object.entries(TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>

              <div>
                <select
                  className="input-gb w-full py-2 text-xs font-semibold"
                  value={entityType}
                  onChange={(event) => {
                    setEntityType(event.target.value as ReportedEntityType | '');
                    setEntityId('');
                    setSearchParams({}, { replace: true });
                  }}
                >
                  <option value="">All Targets</option>
                  <option value="User">Users</option>
                  <option value="JobPost">Job posts</option>
                  <option value="Review">Reviews</option>
                </select>
              </div>
            </form>

            {/* Error Notification */}
            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
                <AlertTriangle size={20} />
                <p className="flex-1">{error}</p>
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/50">
              <p className="text-xs font-extrabold text-text-muted">
                {loading ? 'Loading reports…' : `Showing ${reports.length} of ${totalItems} reports`}
              </p>
              <AdminTablePageSize pageSize={pageSize} totalEntries={totalItems} disabled={loading} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-2xl border border-border overflow-hidden bg-background">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border bg-surface-muted/30">
                    <tr>
                      {['No.', 'Target', 'Reporter', 'Reason', 'Status', 'Created', 'Actions'].map((heading) => (
                        <th key={heading} className="p-3.5 text-[11px] font-black uppercase tracking-wider text-text-muted">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reports.map((report, index) => (
                      <tr key={report.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="p-3.5 text-xs font-bold font-mono text-text-muted">
                          #{((page - 1) * pageSize) + index + 1}
                        </td>
                        <td className="p-3.5 min-w-0 max-w-[240px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-extrabold text-text-primary truncate" title={report.targetSummary?.title || report.reportedEntityId}>
                              {report.targetSummary?.title || report.reportedEntityId}
                            </span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-text-muted shrink-0">
                              {report.reportedEntityType}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {report.reporter && (
                            <UserProfileLink userId={report.reporter.id} role={report.reporter.role === 1 ? 'Freelancer' : 'Client'}>
                              {report.reporter.fullName || report.reporter.id}
                            </UserProfileLink>
                          )}
                        </td>
                        <td className="p-3.5 text-xs font-bold text-text-primary">
                          {TYPE_LABELS[report.type] || 'Other'}
                        </td>
                        <td className="p-3.5">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusBadgeClass(report.status)}`}>
                            {STATUS_LABELS[report.status]}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs font-semibold text-text-muted">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-text-primary hover:border-brand/40 hover:text-brand transition cursor-pointer"
                            >
                              <Eye size={14} /> Details
                            </button>
                            {renderActions(report)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View */}
            <div className="block lg:hidden space-y-3">
              {reports.map((report, index) => (
                <div key={report.id} className="rounded-2xl border border-border bg-background p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400">
                      #{((page - 1) * pageSize) + index + 1}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${statusBadgeClass(report.status)}`}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Target Entity</span>
                    <p className="text-sm font-extrabold text-text-primary truncate">{report.targetSummary?.title || report.reportedEntityId}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                    <span>Reason: <strong className="text-text-primary">{TYPE_LABELS[report.type]}</strong></span>
                    <span>{formatDate(report.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-text-primary hover:border-brand/40 hover:text-brand transition cursor-pointer"
                    >
                      <Eye size={14} /> Details
                    </button>
                    {renderActions(report)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <AdminTablePagination
                currentPage={page}
                totalPages={totalPages}
                disabled={loading}
                onPageChange={setPage}
              />
            )}
          </section>
        </main>

        {/* Floating Portal Action Menu */}
        {openActionMenu && createPortal(
          <div
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setOpenActionMenu(null)}
          >
            <div
              className="absolute w-48 rounded-2xl border border-border bg-background p-1.5 shadow-xl space-y-1"
              style={{ left: openActionMenu.left, top: openActionMenu.top }}
              onClick={e => e.stopPropagation()}
            >
              {openActionMenu.report.status === ReportStatus.Pending && (
                <button
                  className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition cursor-pointer"
                  onClick={() => openAction(openActionMenu.report, 'review')}
                >
                  Mark Reviewing
                </button>
              )}
              {(openActionMenu.report.status === ReportStatus.Pending || openActionMenu.report.status === ReportStatus.Reviewing) && (
                <>
                  <button
                    className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer"
                    onClick={() => openAction(openActionMenu.report, 'dismiss')}
                  >
                    Dismiss Report
                  </button>
                  <button
                    className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                    onClick={() => openAction(openActionMenu.report, 'resolve')}
                  >
                    Resolve (No Penalty)
                  </button>
                  <button
                    className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    onClick={() => openAction(openActionMenu.report, 'resolve-action')}
                  >
                    {getModerationMenuLabel(openActionMenu.report)}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Detail Modal */}
        {selectedReport && !pendingAction && (
          <div className="modal-backdrop">
            <div className="modal-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-black text-text-primary">Report Details</h3>
                <button type="button" onClick={() => setSelectedReport(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Target Entity</span>
                  <p className="text-sm font-extrabold text-text-primary mt-0.5">{selectedReport.targetSummary?.title || selectedReport.reportedEntityId}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Reason & Details</span>
                  <p className="text-xs font-medium text-text-secondary leading-relaxed mt-0.5">{selectedReport.reason || 'No description provided.'}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                {renderDetailActions(selectedReport)}
                <button type="button" onClick={() => setSelectedReport(null)} className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {selectedReport && pendingAction && (
          <div className="modal-backdrop">
            <div className="modal-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-black text-text-primary">Confirm Moderation Action</h3>
                <button type="button" onClick={closeAction} className="text-text-muted hover:text-text-primary cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-text-secondary">
                  {pendingAction === 'review' && 'Marking this report as under active investigation.'}
                  {pendingAction === 'dismiss' && 'Dismissing this report without penalty.'}
                  {pendingAction === 'resolve' && 'Resolving this report cleanly.'}
                  {pendingAction === 'resolve-action' && `Executing moderation action: ${getModerationActionLabel(selectedReport)}.`}
                </p>

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Admin Notes</label>
                  <textarea
                    className="input-gb w-full py-2 text-xs font-semibold"
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Enter administrative notes for audit log..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={closeAction} className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer" disabled={actionLoading}>
                  Cancel
                </button>
                <button type="button" onClick={runAction} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer shadow-sm" disabled={actionLoading}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
