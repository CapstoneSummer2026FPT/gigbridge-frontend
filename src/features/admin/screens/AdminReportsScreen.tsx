import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, Ban, CheckCircle, Clock, Eye, Flag, Search, User, XCircle } from 'lucide-react';
import { adminAPI } from '../../../api/adminAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ReportDto, ReportStatus, ReportType } from '../../../types/models/Report';
import '../styles/admin-users-screen.css';

type StatusFilter = 'all' | `${ReportStatus}`;
type TypeFilter = 'all' | `${ReportType}`;
type ReportAction = 'resolve' | 'dismiss' | 'take-action';

const ITEMS_PER_PAGE = 10;

const statusLabels: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: 'Pending',
  [ReportStatus.Reviewing]: 'Under Review',
  [ReportStatus.Resolved]: 'Resolved',
  [ReportStatus.Dismissed]: 'Dismissed',
};

const typeLabels: Record<ReportType, string> = {
  [ReportType.Spam]: 'Spam',
  [ReportType.Fraud]: 'Fraud',
  [ReportType.InappropriateContent]: 'Inappropriate Content',
  [ReportType.HarassmentOrAbuse]: 'Harassment or Abuse',
  [ReportType.Other]: 'Other',
  [ReportType.PaymentDispute]: 'Payment Dispute',
};

const getInitial = (value?: string | null) => (value?.trim().charAt(0) || '?').toUpperCase();

const formatDate = (date?: string | null) => {
  if (!date) return 'Not set';

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminReportsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [statsReports, setStatsReports] = useState<ReportDto[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewReport, setViewReport] = useState<ReportDto | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ action: ReportAction; report: ReportDto } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportedEntityType = searchParams.get('reportedEntityType') || undefined;

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await adminAPI.getReports({
      page: currentPage,
      pageSize: ITEMS_PER_PAGE,
      search: searchQuery.trim() || undefined,
      status: statusFilter === 'all' ? undefined : Number(statusFilter),
      type: typeFilter === 'all' ? undefined : Number(typeFilter),
      reportedEntityType,
    });

    if (response.success && response.data) {
      setReports(response.data.items);
      setTotalItems(response.data.totalItems);
      setTotalPages(response.data.totalPages);
    } else {
      setReports([]);
      setTotalItems(0);
      setTotalPages(0);
      setError(response.message || 'Unable to load reports.');
    }

    setIsLoading(false);
  }, [currentPage, searchQuery, statusFilter, typeFilter, reportedEntityType]);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') ?? '');
  }, [searchParams]);

  const loadStats = useCallback(async () => {
    const response = await adminAPI.getReports({ page: 1, pageSize: 200 });
    if (response.success && response.data) {
      setStatsReports(response.data.items);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: statsReports.length,
    pending: statsReports.filter(report => report.status === ReportStatus.Pending).length,
    underReview: statsReports.filter(report => report.status === ReportStatus.Reviewing).length,
    resolved: statsReports.filter(report => report.status === ReportStatus.Resolved).length,
    dismissed: statsReports.filter(report => report.status === ReportStatus.Dismissed).length,
  }), [statsReports]);

  const getTypeBadge = (type: ReportType) => {
    if (type === ReportType.Spam) return <span className="badge-amber text-xs">Spam</span>;
    if (type === ReportType.Fraud) return <span className="badge-red text-xs">Fraud</span>;
    if (type === ReportType.InappropriateContent) return <span className="badge-purple text-xs">Inappropriate</span>;
    if (type === ReportType.PaymentDispute) return <span className="badge-cyan text-xs">Payment</span>;
    return <span className="badge-gray text-xs">{typeLabels[type]}</span>;
  };

  const getStatusBadge = (status: ReportStatus) => {
    if (status === ReportStatus.Pending) return <span className="badge-amber text-xs">Pending</span>;
    if (status === ReportStatus.Reviewing) return <span className="badge-cyan text-xs">Under Review</span>;
    if (status === ReportStatus.Resolved) return <span className="badge-green text-xs">Resolved</span>;
    return <span className="badge-gray text-xs">Dismissed</span>;
  };

  const handleViewReport = async (report: ReportDto) => {
    const response = await adminAPI.getReportDetail(report.id);
    const detail = response.success && response.data ? response.data : report;

    setViewReport(detail);
    setAdminNote(detail.adminNote || '');
  };

  const refreshAfterAction = async () => {
    await Promise.all([loadReports(), loadStats()]);
  };

  const handleAction = async () => {
    if (!confirmAction) return;

    setIsActionLoading(true);
    setError(null);

    const { action, report } = confirmAction;
    const response = action === 'dismiss'
      ? await adminAPI.updateReportStatus(report.id, {
          status: ReportStatus.Dismissed,
          adminNote: adminNote.trim() || null,
        })
      : await adminAPI.resolveReport(report.id, {
          adminNote: adminNote.trim() || null,
          takeAction: action === 'take-action',
        });

    if (response.success) {
      setConfirmAction(null);
      setViewReport(null);
      setAdminNote('');
      await refreshAfterAction();
    } else {
      setError(response.message || 'Unable to update report.');
    }

    setIsActionLoading(false);
  };

  const targetLabel = (report: ReportDto) =>
    report.targetSummary?.title || report.targetSummary?.email || report.reportedEntityId;

  const canModerate = (report: ReportDto) =>
    report.status === ReportStatus.Pending || report.status === ReportStatus.Reviewing;

  const userProfilePath = (userId: string, role?: number | null) => {
    if (role === 0) return `/profile/client/${userId}`;
    if (role === 1) return `/profile/freelancer/${userId}`;
    return null;
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flag size={20} className="text-red" />
                <span className="badge-red text-xs">Content Moderation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Report Manager</h1>
              <p className="text-sm text-secondary mt-1">Review and manage user-submitted reports</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Total Reports', value: stats.total || totalItems, icon: <Flag size={16} />, color: 'purple' },
              { label: 'Pending', value: stats.pending, icon: <Clock size={16} />, color: 'amber' },
              { label: 'Under Review', value: stats.underReview, icon: <Eye size={16} />, color: 'cyan' },
              { label: 'Resolved', value: stats.resolved, icon: <CheckCircle size={16} />, color: 'green' },
              { label: 'Dismissed', value: stats.dismissed, icon: <XCircle size={16} />, color: 'gray' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search by reporter, email, or reason..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as StatusFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value={ReportStatus.Pending}>Pending</option>
                <option value={ReportStatus.Reviewing}>Under Review</option>
                <option value={ReportStatus.Resolved}>Resolved</option>
                <option value={ReportStatus.Dismissed}>Dismissed</option>
              </select>
              <select
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value as TypeFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Types</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-red" />
                <p className="text-sm text-primary">{error}</p>
              </div>
            </div>
          )}

          <div className="hidden xl:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">ID</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Type</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Reporter</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Target</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Reason</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Date</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-mono text-primary">{report.id.slice(0, 8)}</p>
                      </td>
                      <td className="p-4">{getTypeBadge(report.type)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {getInitial(report.reporter.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-primary truncate">{report.reporter.fullName}</p>
                            <p className="text-xs text-secondary truncate">{report.reporter.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{targetLabel(report)}</p>
                          <p className="text-xs text-secondary truncate">{report.reportedEntityType}</p>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-sm text-primary line-clamp-2">{report.reason}</p>
                      </td>
                      <td className="p-4">{getStatusBadge(report.status)}</td>
                      <td className="p-4">
                        <p className="text-xs text-secondary whitespace-nowrap">{formatDate(report.createdAt)}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleViewReport(report)} className="p-2 rounded-lg glass-button hover:bg-cyan/10 transition-colors">
                            <Eye size={16} className="text-cyan" />
                          </button>
                          {canModerate(report) && (
                            <>
                              <button onClick={() => setConfirmAction({ action: 'resolve', report })} className="p-2 rounded-lg glass-button hover:bg-green/10 transition-colors">
                                <CheckCircle size={16} className="text-green" />
                              </button>
                              <button onClick={() => setConfirmAction({ action: 'dismiss', report })} className="p-2 rounded-lg glass-button hover:bg-gray/10 transition-colors">
                                <XCircle size={16} className="text-gray" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:hidden space-y-4">
            {reports.map(report => (
              <div key={report.id} className="glass-card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red/20 flex items-center justify-center flex-shrink-0">
                    <Flag size={20} className="text-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-sm font-mono text-primary">{report.id.slice(0, 8)}</p>
                      {getTypeBadge(report.type)}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-xs text-muted">{formatDate(report.createdAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-muted mb-1">Reporter</p>
                    <p className="text-sm font-semibold text-primary truncate">{report.reporter.fullName}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-muted mb-1">Target</p>
                    <p className="text-sm font-semibold text-primary truncate">{targetLabel(report)}</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-2 mb-3">
                  <p className="text-xs text-muted mb-1">Reason</p>
                  <p className="text-sm text-primary line-clamp-2">{report.reason}</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleViewReport(report)} className="btn-ghost-cyan px-3 py-2 text-xs flex items-center gap-2 flex-1">
                    <Eye size={14} />
                    View
                  </button>
                  {canModerate(report) && (
                    <>
                      <button onClick={() => setConfirmAction({ action: 'resolve', report })} className="p-2 rounded-lg glass-button hover:bg-green/10 transition-colors">
                        <CheckCircle size={16} className="text-green" />
                      </button>
                      <button onClick={() => setConfirmAction({ action: 'dismiss', report })} className="p-2 rounded-lg glass-button hover:bg-gray/10 transition-colors">
                        <XCircle size={16} className="text-gray" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isLoading && reports.length === 0 && (
            <div className="glass-card p-12 text-center mt-6">
              <Flag size={48} className="text-muted mx-auto mb-4" />
              <p className="text-primary font-semibold mb-2">No reports found</p>
              <p className="text-sm text-secondary">Try adjusting your filters</p>
            </div>
          )}

          {isLoading && (
            <div className="glass-card p-12 text-center mt-6">
              <p className="text-sm text-secondary">Loading reports...</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="glass-card p-4 mt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-secondary">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} reports
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="px-3 py-2 rounded-lg glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-secondary">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || isLoading}
                    className="px-3 py-2 rounded-lg glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewReport && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewReport(null)}>
              <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
                      <Flag size={24} className="text-red" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-primary">Report Details</h2>
                      <p className="text-xs text-muted">ID: {viewReport.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewReport(null)} className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors">
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(viewReport.type)}
                    {getStatusBadge(viewReport.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-4">
                      <p className="text-xs text-muted mb-3">Reporter</p>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold">
                          {getInitial(viewReport.reporter.fullName)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{viewReport.reporter.fullName}</p>
                          <p className="text-xs text-secondary">{viewReport.reporter.email}</p>
                        </div>
                      </div>
                      {userProfilePath(viewReport.reporter.id, viewReport.reporter.role) && (
                        <button onClick={() => navigate(userProfilePath(viewReport.reporter.id, viewReport.reporter.role)!)} className="text-xs text-cyan hover:underline flex items-center gap-1">
                          <User size={12} />
                          View Profile
                        </button>
                      )}
                    </div>

                    <div className="glass-card p-4">
                      <p className="text-xs text-muted mb-3">Reported {viewReport.reportedEntityType}</p>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red to-orange flex items-center justify-center font-bold">
                          {getInitial(targetLabel(viewReport))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-primary truncate">{targetLabel(viewReport)}</p>
                          <p className="text-xs text-secondary truncate">{viewReport.targetSummary?.description || viewReport.targetSummary?.email || viewReport.reportedEntityId}</p>
                        </div>
                      </div>
                      {viewReport.reportedEntityType === 'User' && userProfilePath(viewReport.reportedEntityId, viewReport.targetSummary?.role) && (
                        <button onClick={() => navigate(userProfilePath(viewReport.reportedEntityId, viewReport.targetSummary?.role)!)} className="text-xs text-cyan hover:underline flex items-center gap-1">
                          <User size={12} />
                          View Profile
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <p className="text-xs text-muted mb-2">Report Reason</p>
                    <p className="text-sm text-primary">{viewReport.reason}</p>
                  </div>

                  <div className="glass-card p-4">
                    <label className="text-xs text-muted mb-2 block">Admin Note</label>
                    <textarea
                      value={adminNote}
                      onChange={event => setAdminNote(event.target.value)}
                      placeholder="Add internal notes about this report..."
                      className="input-gb w-full text-sm min-h-[100px] resize-y"
                    />
                  </div>

                  <div className="glass-card p-4">
                    <p className="text-xs text-muted mb-3">Timeline</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Created:</span>
                        <span className="text-primary text-right">{formatDate(viewReport.createdAt)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-secondary">Last Updated:</span>
                        <span className="text-primary text-right">{formatDate(viewReport.updatedAt)}</span>
                      </div>
                      {viewReport.resolvedAt && (
                        <div className="flex justify-between gap-4">
                          <span className="text-secondary">Resolved:</span>
                          <span className="text-primary text-right">{formatDate(viewReport.resolvedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/5">
                  {canModerate(viewReport) && (
                    <>
                      <button onClick={() => setConfirmAction({ action: 'take-action', report: viewReport })} className="btn-red px-6 py-2 flex items-center gap-2">
                        <Ban size={16} />
                        Resolve and Act
                      </button>
                      <button onClick={() => setConfirmAction({ action: 'resolve', report: viewReport })} className="btn-green px-6 py-2 flex items-center gap-2">
                        <CheckCircle size={16} />
                        Resolve Report
                      </button>
                      <button onClick={() => setConfirmAction({ action: 'dismiss', report: viewReport })} className="btn-ghost-gray px-6 py-2 flex items-center gap-2">
                        <XCircle size={16} />
                        Dismiss Report
                      </button>
                    </>
                  )}
                  <button onClick={() => setViewReport(null)} className="btn-ghost-cyan px-6 py-2 ml-auto">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmAction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmAction(null)}>
              <div className="glass-card max-w-lg w-full p-6" onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      confirmAction.action === 'take-action' ? 'bg-red/20' :
                      confirmAction.action === 'resolve' ? 'bg-green/20' : 'bg-gray/20'
                    }`}>
                      {confirmAction.action === 'take-action' && <Ban size={24} className="text-red" />}
                      {confirmAction.action === 'resolve' && <CheckCircle size={24} className="text-green" />}
                      {confirmAction.action === 'dismiss' && <XCircle size={24} className="text-gray" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-primary">
                        {confirmAction.action === 'take-action' && 'Resolve and Act'}
                        {confirmAction.action === 'resolve' && 'Resolve Report'}
                        {confirmAction.action === 'dismiss' && 'Dismiss Report'}
                      </h2>
                      <p className="text-xs text-muted">Confirm your action</p>
                    </div>
                  </div>
                  <button onClick={() => setConfirmAction(null)} className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors">
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="glass-card p-4 mb-6">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-bold text-primary">Report #{confirmAction.report.id.slice(0, 8)}</p>
                    {getTypeBadge(confirmAction.report.type)}
                  </div>
                  <p className="text-xs text-secondary mb-3">{confirmAction.report.reason}</p>
                  <p className="text-xs text-muted">
                    Target: <span className="text-primary font-semibold">{targetLabel(confirmAction.report)}</span>
                  </p>
                </div>

                {confirmAction.action === 'take-action' && (
                  <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <AlertTriangle size={20} className="text-red flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">Moderation action</p>
                        <p className="text-xs text-secondary">The backend will apply the configured action for this reported entity and mark the report resolved.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={() => setConfirmAction(null)} disabled={isActionLoading} className="btn-ghost-cyan px-6 py-2 disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={isActionLoading}
                    className={`px-6 py-2 flex items-center gap-2 disabled:opacity-50 ${
                      confirmAction.action === 'take-action' ? 'btn-red' :
                      confirmAction.action === 'resolve' ? 'btn-green' : 'btn-ghost-gray'
                    }`}
                  >
                    {confirmAction.action === 'take-action' && <><Ban size={16} /> Act</>}
                    {confirmAction.action === 'resolve' && <><CheckCircle size={16} /> Resolve</>}
                    {confirmAction.action === 'dismiss' && <><XCircle size={16} /> Dismiss</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
