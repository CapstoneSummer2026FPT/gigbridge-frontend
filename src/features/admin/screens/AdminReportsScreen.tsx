import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Flag, AlertTriangle, Ban, CheckCircle, XCircle, Eye, Filter, Search, Clock, MessageSquare, User, Shield } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { Report, ReportType, ReportStatus } from '../../../types/models/Report';
import '../styles/admin-users-screen.css';

type StatusFilter = 'all' | 'pending' | 'under_review' | 'resolved' | 'dismissed';
type TypeFilter = 'all' | '0' | '1' | '2';

// Mock data
const MOCK_REPORTS: Report[] = [
  {
    rpt_ReportsId: 'rpt_1',
    usr_ReporterId: 'user_client_1',
    ReportedUserId: 'user_freelancer_3',
    ReportedUserRole: 1,
    Type: ReportType.Spam,
    Reason: 'User is sending spam messages repeatedly in project chat. Multiple unsolicited promotional messages.',
    Status: ReportStatus.Pending,
    CreatedAt: '2024-05-16T10:30:00Z',
    UpdatedAt: '2024-05-16T10:30:00Z',
  },
  {
    rpt_ReportsId: 'rpt_2',
    usr_ReporterId: 'user_freelancer_2',
    ReportedUserId: 'user_client_5',
    ReportedUserRole: 0,
    Type: ReportType.Fraud,
    Reason: 'Client asked me to work outside the platform to avoid fees. Suspicious payment requests.',
    Status: ReportStatus.UnderReview,
    AdminNote: 'Investigating transaction history and chat logs.',
    CreatedAt: '2024-05-15T14:20:00Z',
    UpdatedAt: '2024-05-16T09:15:00Z',
  },
  {
    rpt_ReportsId: 'rpt_3',
    usr_ReporterId: 'user_client_2',
    ReportedUserId: 'user_freelancer_8',
    ReportedUserRole: 1,
    Type: ReportType.InappropriateContent,
    Reason: 'Profile contains offensive language and inappropriate images. Violates community guidelines.',
    Status: ReportStatus.Resolved,
    AdminNote: 'User warned and content removed. Profile sanitized.',
    ResolvedAt: '2024-05-14T16:45:00Z',
    CreatedAt: '2024-05-13T11:00:00Z',
    UpdatedAt: '2024-05-14T16:45:00Z',
  },
  {
    rpt_ReportsId: 'rpt_4',
    usr_ReporterId: 'user_freelancer_5',
    ReportedUserId: 'user_client_3',
    ReportedUserRole: 0,
    Type: ReportType.Fraud,
    Reason: 'Client refused to pay after job completion. Marked milestones as incomplete without valid reason.',
    Status: ReportStatus.UnderReview,
    AdminNote: 'Reviewing contract and milestone completion evidence.',
    CreatedAt: '2024-05-14T09:30:00Z',
    UpdatedAt: '2024-05-15T13:20:00Z',
  },
  {
    rpt_ReportsId: 'rpt_5',
    usr_ReporterId: 'user_client_7',
    ReportedUserId: 'user_freelancer_12',
    ReportedUserRole: 1,
    Type: ReportType.Spam,
    Reason: 'Freelancer is mass applying to jobs with copy-paste proposals.',
    Status: ReportStatus.Dismissed,
    AdminNote: 'Proposals reviewed. While generic, they do not violate spam policy. User advised to personalize.',
    ResolvedAt: '2024-05-12T10:30:00Z',
    CreatedAt: '2024-05-11T15:45:00Z',
    UpdatedAt: '2024-05-12T10:30:00Z',
  },
  {
    rpt_ReportsId: 'rpt_6',
    usr_ReporterId: 'user_freelancer_5',
    ReportedUserId: 'user_client_1',
    ReportedUserRole: 0,
    Type: ReportType.InappropriateContent,
    Reason: 'Client using offensive language in project discussions.',
    Status: ReportStatus.Pending,
    CreatedAt: '2024-05-16T08:15:00Z',
    UpdatedAt: '2024-05-16T08:15:00Z',
  },
  {
    rpt_ReportsId: 'rpt_7',
    usr_ReporterId: 'user_client_2',
    ReportedUserId: 'user_freelancer_2',
    ReportedUserRole: 1,
    Type: ReportType.Fraud,
    Reason: 'Freelancer requesting advance payment outside platform.',
    Status: ReportStatus.UnderReview,
    AdminNote: 'Checking payment history and chat logs.',
    CreatedAt: '2024-05-15T16:00:00Z',
    UpdatedAt: '2024-05-16T10:00:00Z',
  },
  {
    rpt_ReportsId: 'rpt_8',
    usr_ReporterId: 'user_freelancer_8',
    ReportedUserId: 'user_client_7',
    ReportedUserRole: 0,
    Type: ReportType.Spam,
    Reason: 'Client sending repeated job invites after rejection.',
    Status: ReportStatus.Resolved,
    AdminNote: 'User warned about harassment. Invitation privileges suspended for 7 days.',
    ResolvedAt: '2024-05-13T14:20:00Z',
    CreatedAt: '2024-05-12T09:30:00Z',
    UpdatedAt: '2024-05-13T14:20:00Z',
  },
  {
    rpt_ReportsId: 'rpt_9',
    usr_ReporterId: 'user_client_5',
    ReportedUserId: 'user_freelancer_5',
    ReportedUserRole: 1,
    Type: ReportType.InappropriateContent,
    Reason: 'Freelancer portfolio contains copyrighted materials without permission.',
    Status: ReportStatus.Pending,
    CreatedAt: '2024-05-16T11:45:00Z',
    UpdatedAt: '2024-05-16T11:45:00Z',
  },
  {
    rpt_ReportsId: 'rpt_10',
    usr_ReporterId: 'user_freelancer_12',
    ReportedUserId: 'user_client_3',
    ReportedUserRole: 0,
    Type: ReportType.Fraud,
    Reason: 'Client created duplicate accounts to avoid paying previous contractors.',
    Status: ReportStatus.UnderReview,
    AdminNote: 'Investigating account creation patterns and IP addresses.',
    CreatedAt: '2024-05-14T13:00:00Z',
    UpdatedAt: '2024-05-15T09:30:00Z',
  },
  {
    rpt_ReportsId: 'rpt_11',
    usr_ReporterId: 'user_client_1',
    ReportedUserId: 'user_freelancer_8',
    ReportedUserRole: 1,
    Type: ReportType.Spam,
    Reason: 'Sending promotional messages for external services in chat.',
    Status: ReportStatus.Pending,
    CreatedAt: '2024-05-16T07:30:00Z',
    UpdatedAt: '2024-05-16T07:30:00Z',
  },
  {
    rpt_ReportsId: 'rpt_12',
    usr_ReporterId: 'user_freelancer_3',
    ReportedUserId: 'user_client_2',
    ReportedUserRole: 0,
    Type: ReportType.InappropriateContent,
    Reason: 'Requesting personal information that violates privacy policy.',
    Status: ReportStatus.Resolved,
    AdminNote: 'User educated on privacy policy. Warning issued.',
    ResolvedAt: '2024-05-11T16:00:00Z',
    CreatedAt: '2024-05-10T14:20:00Z',
    UpdatedAt: '2024-05-11T16:00:00Z',
  },
  {
    rpt_ReportsId: 'rpt_13',
    usr_ReporterId: 'user_client_7',
    ReportedUserId: 'user_freelancer_2',
    ReportedUserRole: 1,
    Type: ReportType.Fraud,
    Reason: 'Freelancer plagiarized work from another platform.',
    Status: ReportStatus.UnderReview,
    AdminNote: 'Comparing submitted work with suspected source.',
    CreatedAt: '2024-05-15T10:15:00Z',
    UpdatedAt: '2024-05-15T18:45:00Z',
  },
  {
    rpt_ReportsId: 'rpt_14',
    usr_ReporterId: 'user_freelancer_5',
    ReportedUserId: 'user_client_5',
    ReportedUserRole: 0,
    Type: ReportType.Spam,
    Reason: 'Client posting fake job listings to collect freelancer contact info.',
    Status: ReportStatus.Pending,
    CreatedAt: '2024-05-16T12:00:00Z',
    UpdatedAt: '2024-05-16T12:00:00Z',
  },
  {
    rpt_ReportsId: 'rpt_15',
    usr_ReporterId: 'user_client_3',
    ReportedUserId: 'user_freelancer_12',
    ReportedUserRole: 1,
    Type: ReportType.InappropriateContent,
    Reason: 'Profile description contains discriminatory language.',
    Status: ReportStatus.Dismissed,
    AdminNote: 'Content reviewed. Language is borderline but does not explicitly violate policy. User advised to update.',
    ResolvedAt: '2024-05-09T11:30:00Z',
    CreatedAt: '2024-05-08T16:45:00Z',
    UpdatedAt: '2024-05-09T11:30:00Z',
  },
];

// Mock user data
const MOCK_USERS: Record<string, { name: string; email: string; banned: boolean }> = {
  user_client_1: { name: 'John Doe', email: 'john@example.com', banned: false },
  user_freelancer_3: { name: 'Sarah Smith', email: 'sarah@example.com', banned: false },
  user_freelancer_2: { name: 'Mike Johnson', email: 'mike@example.com', banned: false },
  user_client_5: { name: 'Tech Corp', email: 'contact@techcorp.com', banned: false },
  user_client_2: { name: 'Alice Wong', email: 'alice@example.com', banned: false },
  user_freelancer_8: { name: 'Bob Designer', email: 'bob@example.com', banned: true },
  user_freelancer_5: { name: 'Emma Dev', email: 'emma@example.com', banned: false },
  user_client_3: { name: 'Startup Inc', email: 'hello@startup.com', banned: false },
  user_client_7: { name: 'David Chen', email: 'david@example.com', banned: false },
  user_freelancer_12: { name: 'Lisa Parker', email: 'lisa@example.com', banned: false },
};

export default function AdminReportsScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ action: 'resolve' | 'dismiss' | 'ban'; report: Report } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const filteredReports = useMemo(() => {
    return MOCK_REPORTS.filter(report => {
      const reporter = MOCK_USERS[report.usr_ReporterId];
      const reported = MOCK_USERS[report.ReportedUserId];

      const matchesSearch = searchQuery === '' ||
        reporter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reported.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.Reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || report.Status === statusFilter;
      const matchesType = typeFilter === 'all' || report.Type.toString() === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReports.slice(startIndex, endIndex);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const stats = useMemo(() => {
    const pending = MOCK_REPORTS.filter(r => r.Status === ReportStatus.Pending).length;
    const underReview = MOCK_REPORTS.filter(r => r.Status === ReportStatus.UnderReview).length;
    const resolved = MOCK_REPORTS.filter(r => r.Status === ReportStatus.Resolved).length;
    const dismissed = MOCK_REPORTS.filter(r => r.Status === ReportStatus.Dismissed).length;
    return { pending, underReview, resolved, dismissed, total: MOCK_REPORTS.length };
  }, []);

  const getTypeBadge = (type: ReportType) => {
    if (type === ReportType.Spam) return <span className="badge-amber text-xs">Spam</span>;
    if (type === ReportType.Fraud) return <span className="badge-red text-xs">Fraud</span>;
    return <span className="badge-purple text-xs">Inappropriate</span>;
  };

  const getStatusBadge = (status: ReportStatus) => {
    if (status === ReportStatus.Pending) return <span className="badge-amber text-xs">Pending</span>;
    if (status === ReportStatus.UnderReview) return <span className="badge-cyan text-xs">Under Review</span>;
    if (status === ReportStatus.Resolved) return <span className="badge-green text-xs">Resolved</span>;
    return <span className="badge-gray text-xs">Dismissed</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAction = () => {
    if (!confirmAction) return;

    const { action, report } = confirmAction;
    console.log(`${action} report ${report.rpt_ReportsId}`);

    if (adminNote) {
      console.log('Admin note:', adminNote);
    }

    setConfirmAction(null);
    setViewReport(null);
    setAdminNote('');
  };

  const handleViewReport = (report: Report) => {
    setViewReport(report);
    setAdminNote(report.AdminNote || '');
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flag size={20} className="text-red" />
                <span className="badge-red text-xs">Content Moderation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">User Reports</h1>
              <p className="text-sm text-secondary mt-1">Review and manage user-submitted reports</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Total Reports', value: stats.total, icon: <Flag size={16} />, color: 'purple' },
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

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by reporter, reported user, or reason..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="0">Spam</option>
                <option value="1">Fraud</option>
                <option value="2">Inappropriate Content</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden xl:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">ID</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Type</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Reporter</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Reported User</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Reason</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Date</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.map(report => {
                    const reporter = MOCK_USERS[report.usr_ReporterId];
                    const reported = MOCK_USERS[report.ReportedUserId];

                    return (
                      <tr key={report.rpt_ReportsId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="text-sm font-mono text-primary">{report.rpt_ReportsId}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {getTypeBadge(report.Type)}
                            {reported.banned && <span className="badge-red text-xs">Banned</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {reporter.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary truncate">{reporter.name}</p>
                              <p className="text-xs text-secondary truncate">{reporter.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red to-orange flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {reported.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary truncate">{reported.name}</p>
                              <p className="text-xs text-secondary truncate">
                                {report.ReportedUserRole === 0 ? 'Client' : 'Freelancer'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-sm text-primary line-clamp-2">{report.Reason}</p>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(report.Status)}
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-secondary whitespace-nowrap">{formatDate(report.CreatedAt)}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="p-2 rounded-lg glass-button hover:bg-cyan/10 transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} className="text-cyan" />
                            </button>
                            {(report.Status === ReportStatus.Pending || report.Status === ReportStatus.UnderReview) && (
                              <>
                                <button
                                  onClick={() => setConfirmAction({ action: 'resolve', report })}
                                  className="p-2 rounded-lg glass-button hover:bg-green/10 transition-colors"
                                  title="Resolve"
                                >
                                  <CheckCircle size={16} className="text-green" />
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ action: 'dismiss', report })}
                                  className="p-2 rounded-lg glass-button hover:bg-gray/10 transition-colors"
                                  title="Dismiss"
                                >
                                  <XCircle size={16} className="text-gray" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {paginatedReports.length === 0 && (
                <div className="p-12 text-center">
                  <Flag size={48} className="text-muted mx-auto mb-4" />
                  <p className="text-primary font-semibold mb-2">No reports found</p>
                  <p className="text-sm text-secondary">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="xl:hidden space-y-4">
            {paginatedReports.map(report => {
              const reporter = MOCK_USERS[report.usr_ReporterId];
              const reported = MOCK_USERS[report.ReportedUserId];

              return (
                <div key={report.rpt_ReportsId} className="glass-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-sm font-mono text-primary">{report.rpt_ReportsId}</p>
                        {getTypeBadge(report.Type)}
                        {getStatusBadge(report.Status)}
                        {reported.banned && <span className="badge-red text-xs">Banned</span>}
                      </div>
                      <p className="text-xs text-muted">{formatDate(report.CreatedAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted mb-1">Reporter</p>
                      <p className="text-sm font-semibold text-primary truncate">{reporter.name}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-xs text-muted mb-1">Reported</p>
                      <p className="text-sm font-semibold text-primary truncate">{reported.name}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-2 mb-3">
                    <p className="text-xs text-muted mb-1">Reason</p>
                    <p className="text-sm text-primary line-clamp-2">{report.Reason}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewReport(report)}
                      className="btn-ghost-cyan px-3 py-2 text-xs flex items-center gap-2 flex-1"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    {(report.Status === ReportStatus.Pending || report.Status === ReportStatus.UnderReview) && (
                      <>
                        <button
                          onClick={() => setConfirmAction({ action: 'resolve', report })}
                          className="p-2 rounded-lg glass-button hover:bg-green/10 transition-colors"
                        >
                          <CheckCircle size={16} className="text-green" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ action: 'dismiss', report })}
                          className="p-2 rounded-lg glass-button hover:bg-gray/10 transition-colors"
                        >
                          <XCircle size={16} className="text-gray" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {paginatedReports.length === 0 && (
              <div className="glass-card p-12 text-center">
                <Flag size={48} className="text-muted mx-auto mb-4" />
                <p className="text-primary font-semibold mb-2">No reports found</p>
                <p className="text-sm text-secondary">Try adjusting your filters</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="glass-card p-4 mt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-secondary">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                              currentPage === page
                                ? 'bg-cyan/20 text-cyan border border-cyan'
                                : 'glass-button hover:bg-white/10'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <span key={page} className="px-2 text-muted">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Report Modal */}
          {viewReport && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewReport(null)}>
              <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
                      <Flag size={24} className="text-red" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-primary">Report Details</h2>
                      <p className="text-xs text-muted">ID: {viewReport.rpt_ReportsId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewReport(null)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Status and Type */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(viewReport.Type)}
                    {getStatusBadge(viewReport.Status)}
                    {MOCK_USERS[viewReport.ReportedUserId].banned && <span className="badge-red text-xs">User Banned</span>}
                  </div>

                  {/* Users Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-4">
                      <p className="text-xs text-muted mb-3">Reporter</p>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold">
                          {MOCK_USERS[viewReport.usr_ReporterId].name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{MOCK_USERS[viewReport.usr_ReporterId].name}</p>
                          <p className="text-xs text-secondary">{MOCK_USERS[viewReport.usr_ReporterId].email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${viewReport.usr_ReporterId}`)}
                        className="text-xs text-cyan hover:underline flex items-center gap-1"
                      >
                        <User size={12} />
                        View Profile
                      </button>
                    </div>

                    <div className="glass-card p-4">
                      <p className="text-xs text-muted mb-3">Reported User ({viewReport.ReportedUserRole === 0 ? 'Client' : 'Freelancer'})</p>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red to-orange flex items-center justify-center font-bold">
                          {MOCK_USERS[viewReport.ReportedUserId].name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{MOCK_USERS[viewReport.ReportedUserId].name}</p>
                          <p className="text-xs text-secondary">{MOCK_USERS[viewReport.ReportedUserId].email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${viewReport.ReportedUserId}`)}
                        className="text-xs text-cyan hover:underline flex items-center gap-1"
                      >
                        <User size={12} />
                        View Profile
                      </button>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-muted mb-2">Report Reason</p>
                    <p className="text-sm text-primary">{viewReport.Reason}</p>
                  </div>

                  {/* Admin Note */}
                  <div className="glass-card p-4">
                    <label className="text-xs text-muted mb-2 block">Admin Note</label>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Add internal notes about this report..."
                      className="input-gb w-full text-sm min-h-[100px] resize-y"
                    />
                  </div>

                  {/* Timeline */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-muted mb-3">Timeline</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-secondary">Created:</span>
                        <span className="text-primary">{formatDate(viewReport.CreatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Last Updated:</span>
                        <span className="text-primary">{formatDate(viewReport.UpdatedAt)}</span>
                      </div>
                      {viewReport.ResolvedAt && (
                        <div className="flex justify-between">
                          <span className="text-secondary">Resolved:</span>
                          <span className="text-primary">{formatDate(viewReport.ResolvedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-white/5">
                  {!MOCK_USERS[viewReport.ReportedUserId].banned && (
                    <button
                      onClick={() => setConfirmAction({ action: 'ban', report: viewReport })}
                      className="btn-red px-6 py-2 flex items-center gap-2"
                    >
                      <Ban size={16} />
                      Ban User
                    </button>
                  )}
                  {(viewReport.Status === ReportStatus.Pending || viewReport.Status === ReportStatus.UnderReview) && (
                    <>
                      <button
                        onClick={() => setConfirmAction({ action: 'resolve', report: viewReport })}
                        className="btn-green px-6 py-2 flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Resolve Report
                      </button>
                      <button
                        onClick={() => setConfirmAction({ action: 'dismiss', report: viewReport })}
                        className="btn-ghost-gray px-6 py-2 flex items-center gap-2"
                      >
                        <XCircle size={16} />
                        Dismiss Report
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setViewReport(null)}
                    className="btn-ghost-cyan px-6 py-2 ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Action Modal */}
          {confirmAction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmAction(null)}>
              <div className="glass-card max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      confirmAction.action === 'ban' ? 'bg-red/20' :
                      confirmAction.action === 'resolve' ? 'bg-green/20' : 'bg-gray/20'
                    }`}>
                      {confirmAction.action === 'ban' && <Ban size={24} className="text-red" />}
                      {confirmAction.action === 'resolve' && <CheckCircle size={24} className="text-green" />}
                      {confirmAction.action === 'dismiss' && <XCircle size={24} className="text-gray" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-primary">
                        {confirmAction.action === 'ban' && 'Ban User'}
                        {confirmAction.action === 'resolve' && 'Resolve Report'}
                        {confirmAction.action === 'dismiss' && 'Dismiss Report'}
                      </h2>
                      <p className="text-xs text-muted">Confirm your action</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="glass-card p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-primary">Report #{confirmAction.report.rpt_ReportsId}</p>
                    {getTypeBadge(confirmAction.report.Type)}
                  </div>
                  <p className="text-xs text-secondary mb-3">{confirmAction.report.Reason}</p>
                  <p className="text-xs text-muted">
                    Reported User: <span className="text-primary font-semibold">{MOCK_USERS[confirmAction.report.ReportedUserId].name}</span>
                  </p>
                </div>

                {confirmAction.action === 'ban' && (
                  <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <AlertTriangle size={20} className="text-red flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">Warning</p>
                        <p className="text-xs text-secondary">
                          This will permanently ban the user from the platform. They will lose access to all features and active projects.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {confirmAction.action === 'resolve' && (
                  <div className="bg-green/10 border border-green/20 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <CheckCircle size={20} className="text-green flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">Mark as Resolved</p>
                        <p className="text-xs text-secondary">
                          This report will be marked as resolved. Make sure you've taken appropriate action.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {confirmAction.action === 'dismiss' && (
                  <div className="bg-gray/10 border border-gray/20 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <XCircle size={20} className="text-gray flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">Dismiss Report</p>
                        <p className="text-xs text-secondary">
                          This report will be dismissed. Use this for false reports or reports that don't violate policies.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    className={`px-6 py-2 flex items-center gap-2 ${
                      confirmAction.action === 'ban' ? 'btn-red' :
                      confirmAction.action === 'resolve' ? 'btn-green' : 'btn-ghost-gray'
                    }`}
                  >
                    {confirmAction.action === 'ban' && <><Ban size={16} /> Ban User</>}
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
