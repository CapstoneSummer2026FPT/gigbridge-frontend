import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router';
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
  X,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { AdminTablePageSize, AdminTablePagination } from '../components/AdminTableControls';
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
  const navigate = useNavigate();
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

  const loadSummary = useCallback(async () => {
    const response = await reportAPI.getAdminSummary();
    if (response.success && response.data) setSummary(response.data);
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

  const openTarget = (report: ReportDto) => {
    if (report.reportedEntityType === 'User') {
      const route = report.targetSummary?.role === 1 ? 'freelancer' : 'client';
      navigate(`/profile/${route}/${report.reportedEntityId}`);
    } else if (report.reportedEntityType === 'JobPost') {
      navigate(`/jobs/${report.reportedEntityId}`);
    }
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
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Flag size={20} className="text-red" />
            <span className="badge-red text-xs">Content Management</span>
          </div>
          <h1 className="text-3xl font-black text-primary">Reports &amp; Account Reports</h1>
          <p className="text-sm text-secondary mt-1">Review reports for accounts (users), job posts, and reviews. Account reports include enforcement.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            ['All Reports', summary.total, <Flag size={16} />, 'purple'],
            ['Open', summary.open, <ShieldAlert size={16} />, 'red'],
            ['Pending', summary.pending, <Clock size={16} />, 'amber'],
            ['Reviewing', summary.reviewing, <Eye size={16} />, 'cyan'],
            ['Resolved', summary.resolved, <CheckCircle size={16} />, 'green'],
            ['Dismissed', summary.dismissed, <XCircle size={16} />, 'gray'],
          ].map(([label, value, icon, color]) => (
            <div key={String(label)} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-secondary">{label}</p>
                <span className={`icon-${color}`}>{icon}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{value}</p>
            </div>
          ))}
        </div>

        {/* Contract Reports are a separate queue — investigate contract execution reports */}
        {(() => {
          const manager = getAdminManager('contract-reports');
          return manager && (
            <Link
              to={manager.path}
              className="glass-card p-4 flex items-center gap-4 mb-8 transition-all hover:border-cyan/40 hover:bg-white/5"
            >
              <span className="w-10 h-10 shrink-0 rounded-lg bg-cyan/10 text-cyan flex items-center justify-center">
                <manager.icon size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-primary">{manager.fallbackLabel}</span>
                <span className="block text-xs text-secondary mt-0.5">{manager.fallbackDescription}</span>
              </span>
              <ChevronRight size={16} className="text-muted shrink-0" />
            </Link>
          );
        })()}

        {entityId && (
          <div className="glass-card p-3 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-secondary">
              Showing reports for <span className="text-primary font-semibold">{entityType}</span>{' '}
              <span className="font-mono text-xs">{entityId}</span>
            </p>
            <button onClick={clearQuickFilter} className="btn-ghost-cyan px-3 py-2 text-xs flex items-center gap-1">
              <X size={14} /> Clear
            </button>
          </div>
        )}

        <div className="glass-card p-4 mb-6 admin-reports__filter-card">
          <form
            className="admin-reports__filters"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim());
            }}
          >
            <label className="admin-reports__search-field">
              <span className="sr-only">Search reports</span>
              <Search size={18} aria-hidden="true" />
              <input
                className="input-gb"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search people, reason, note, or target ID"
              />
            </label>
            <label className="admin-reports__select-field">
              <span>Status</span>
              <select
                className="input-gb"
                value={status}
                onChange={(event) => setStatus(event.target.value === '' ? '' : Number(event.target.value) as ReportStatus)}
              >
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="admin-reports__select-field">
              <span>Reason</span>
              <select
                className="input-gb"
                value={type}
                onChange={(event) => setType(event.target.value === '' ? '' : Number(event.target.value) as ReportType)}
              >
                <option value="">All reasons</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="admin-reports__select-field">
              <span>Target</span>
              <select
                className="input-gb"
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value as ReportedEntityType | '');
                  setEntityId('');
                  setSearchParams({}, { replace: true });
                }}
              >
                <option value="">All targets</option>
                <option value="User">Users</option>
                <option value="JobPost">Job posts</option>
                <option value="Review">Reviews</option>
              </select>
            </label>
            <div className="admin-reports__filter-actions">
              {(searchDraft || search || status !== '' || type !== '' || entityType !== '' || entityId) && (
                <button
                  type="button"
                  className="admin-reports__clear-button"
                  onClick={() => {
                    setSearchDraft('');
                    setSearch('');
                    setStatus('');
                    setType('');
                    clearQuickFilter();
                  }}
                >
                  Clear
                </button>
              )}
              <button type="submit" className="btn-cyan admin-reports__search-button">
                <Search size={16} /> Search
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red/30 bg-red/10 p-4 flex items-center gap-3 text-red text-sm">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary">{loading ? 'Loading reports…' : `${totalItems} report${totalItems === 1 ? '' : 's'}`}</p>
          <AdminTablePageSize pageSize={pageSize} totalEntries={totalItems} disabled={loading} onPageSizeChange={value => { setPageSize(value); setPage(1); }} />
        </div>

        <div className="hidden lg:block glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-primary">
                <tr>
                  {['No.', 'Target', 'Reporter', 'Reason', 'Status', 'Created', 'Actions'].map((heading) => (

                    <th key={heading} className="text-left p-4 text-xs font-semibold text-primary uppercase">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary">
                {reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-white/5 align-top">
                    <td className="p-4 text-xs font-bold text-cyan">{((page - 1) * pageSize) + index + 1}</td>
                    <td className="p-4 min-w-48">
                      <button onClick={() => openTarget(report)} className="text-left" disabled={report.reportedEntityType === 'Review'}>
                        <p className="text-sm font-semibold text-primary hover:text-cyan">{report.targetSummary?.title || report.reportedEntityId}</p>
                        <p className="text-xs text-secondary">{report.reportedEntityType}</p>
                      </button>
                    </td>
                    <td className="p-4 min-w-44">
                      <p className="text-sm text-primary"><UserProfileLink userId={report.reporter.id} role={report.reporter.role}>{report.reporter.fullName}</UserProfileLink></p>
                      <p className="text-xs text-secondary">{report.reporter.email}</p>
                    </td>
                    <td className="p-4 min-w-64 max-w-sm">
                      <p className="text-xs font-semibold text-secondary mb-1">{TYPE_LABELS[report.type]}</p>
                      <p className="text-sm text-primary line-clamp-2">{report.reason}</p>
                    </td>
                    <td className="p-4"><span className={`${statusBadgeClass(report.status)} text-xs`}>{STATUS_LABELS[report.status]}</span></td>
                    <td className="p-4 text-xs text-secondary whitespace-nowrap">{formatDate(report.createdAt)}</td>
                    <td className="p-4 min-w-64">
                      {renderActions(report)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          {reports.map((report, index) => (
            <div key={report.id} className="glass-card p-4">
              <p className="mb-2 text-xs font-bold text-cyan">#{((page - 1) * pageSize) + index + 1}</p>
              <div className="flex justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-primary">{report.targetSummary?.title || report.reportedEntityId}</p>
                  <p className="text-xs text-secondary">{report.reportedEntityType} · {TYPE_LABELS[report.type]}</p>
                </div>
                <span className={`${statusBadgeClass(report.status)} text-xs h-fit`}>{STATUS_LABELS[report.status]}</span>
              </div>
              <p className="text-sm text-primary mb-2">{report.reason}</p>
              <p className="text-xs text-secondary mb-4">Reported by <UserProfileLink userId={report.reporter.id} role={report.reporter.role}>{report.reporter.fullName}</UserProfileLink> · {formatDate(report.createdAt)}</p>
              <div className="admin-reports__mobile-actions">{renderActions(report)}</div>
            </div>
          ))}
        </div>

        {!loading && reports.length === 0 && (
          <div className="glass-card text-center py-16">
            <Flag size={42} className="mx-auto mb-4 text-muted" />
            <p className="font-semibold text-primary">No reports found</p>
            <p className="text-sm text-secondary mt-1">Try changing the filters or search.</p>
          </div>
        )}

        {loading && (
          <div className="glass-card py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-secondary">Loading reports…</p>
          </div>
        )}

        {totalPages > 1 && <AdminTablePagination currentPage={page} totalPages={totalPages} disabled={loading} onPageChange={setPage} ariaLabel="Report pagination" />}
      </div>

      {selectedReport && !pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedReport(null)}>
          <div className="glass-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <p className="text-xs text-secondary font-mono mb-1">{selectedReport.id}</p>
                <h2 className="text-xl font-bold text-primary">Report details</h2>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 glass-button rounded-lg"><X size={18} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div className="glass-card p-4">
                <p className="text-xs text-secondary mb-1">Reporter</p>
                <p className="font-semibold text-primary"><UserProfileLink userId={selectedReport.reporter.id} role={selectedReport.reporter.role}>{selectedReport.reporter.fullName}</UserProfileLink></p>
                <p className="text-sm text-secondary">{selectedReport.reporter.email}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-secondary mb-1">Reported target</p>
                <p className="font-semibold text-primary">{selectedReport.targetSummary?.title || selectedReport.reportedEntityId}</p>
                <p className="text-sm text-secondary">{selectedReport.reportedEntityType} · {selectedReport.targetSummary?.email || selectedReport.reportedEntityId}</p>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div><p className="text-xs text-secondary mb-1">Reason</p><p className="text-primary whitespace-pre-wrap">{selectedReport.reason}</p></div>
              {selectedReport.targetSummary?.description && <div><p className="text-xs text-secondary mb-1">Target content</p><p className="text-primary">{selectedReport.targetSummary.description}</p></div>}
              {selectedReport.adminNote && <div><p className="text-xs text-secondary mb-1">Admin note</p><p className="text-primary whitespace-pre-wrap">{selectedReport.adminNote}</p></div>}
              <div className="grid sm:grid-cols-2 gap-3 text-secondary">
                <p>Status: <span className="text-primary">{STATUS_LABELS[selectedReport.status]}</span></p>
                <p>Type: <span className="text-primary">{TYPE_LABELS[selectedReport.type]}</span></p>
                <p>Created: <span className="text-primary">{formatDate(selectedReport.createdAt)}</span></p>
                <p>Updated: <span className="text-primary">{formatDate(selectedReport.updatedAt)}</span></p>
                <p>Resolved: <span className="text-primary">{formatDate(selectedReport.resolvedAt)}</span></p>
                <p>Resolved by: <span className="text-primary">{selectedReport.resolvedByAdmin?.fullName || '—'}</span></p>
              </div>
            </div>
            {(selectedReport.status === ReportStatus.Pending || selectedReport.status === ReportStatus.Reviewing) && (
              <div className="mt-6 pt-5 border-t border-white/10">
                {renderDetailActions(selectedReport)}
              </div>
            )}
            {selectedReport.reportedEntityType === 'User' && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <Link
                  to={`/admin/reports/accounts/${selectedReport.id}`}
                  className="btn-cyan px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  Account enforcement <ChevronRight size={15} />
                </Link>
                <p className="text-xs text-secondary mt-2">
                  Warn, suspend, or ban the reported account and review its violation history.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReport && pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={closeAction}>
          <div className="glass-card max-w-lg w-full p-6" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold text-primary mb-2">
              {pendingAction === 'review' && 'Mark report as reviewing'}
              {pendingAction === 'dismiss' && 'Dismiss report'}
              {pendingAction === 'resolve' && 'Resolve report'}
              {pendingAction === 'resolve-action' && getModerationMenuLabel(selectedReport)}
            </h2>
            <p className="text-sm text-secondary mb-5">
              {pendingAction === 'resolve-action'
                ? `${getModerationActionLabel(selectedReport)}. This cannot be undone from this report.`
                : 'Add an optional note explaining the moderation decision.'}
            </p>
            {error && (
              <div className="mb-4 rounded-lg border border-red/30 bg-red/10 p-3 flex gap-2 text-sm text-red">
                <AlertTriangle size={17} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <label className="text-xs text-secondary block mb-2">Admin note</label>
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value.slice(0, 2000))}
              className="input-gb w-full min-h-32 p-3 text-sm resize-y"
              placeholder="Decision notes…"
            />
            <p className="text-xs text-muted text-right mt-1">{adminNote.length}/2000</p>
            <div className="flex justify-end gap-3 mt-6">
              <button disabled={actionLoading} onClick={closeAction} className="btn-ghost-cyan px-5 py-2">Cancel</button>
              <button disabled={actionLoading} onClick={() => void runAction()} className={pendingAction === 'resolve-action' ? 'btn-red px-5 py-2' : 'btn-cyan px-5 py-2'}>
                {actionLoading ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openActionMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpenActionMenu(null)} />
          <div
            className="fixed w-48 dropdown-menu rounded-xl p-2 z-[90] shadow-xl"
            style={{ left: openActionMenu.left, top: openActionMenu.top }}
          >
            <button
              onClick={() => {
                setSelectedReport(openActionMenu.report);
                setOpenActionMenu(null);
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm text-secondary hover:bg-white/5 transition-colors"
            >
              View Details
            </button>

            {(openActionMenu.report.status === ReportStatus.Pending || openActionMenu.report.status === ReportStatus.Reviewing) && (
              <>
                {openActionMenu.report.status === ReportStatus.Pending && (
                  <button
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-cyan hover:bg-cyan/10 transition-colors"
                    onClick={() => openAction(openActionMenu.report, 'review')}
                  >
                    Mark Reviewing
                  </button>
                )}
                <button
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-amber hover:bg-amber/10 transition-colors"
                  onClick={() => openAction(openActionMenu.report, 'dismiss')}
                >
                  Dismiss
                </button>
                <button
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-green hover:bg-green/10 transition-colors"
                  onClick={() => openAction(openActionMenu.report, 'resolve')}
                >
                  Resolve
                </button>
                <button
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red hover:bg-red/10 transition-colors"
                  onClick={() => openAction(openActionMenu.report, 'resolve-action')}
                >
                  {getModerationMenuLabel(openActionMenu.report)}
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </AppLayout>
  );
}
