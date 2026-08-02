import { useState, useMemo, useEffect, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { Activity, AlertTriangle, FileText, Zap, Clock, Search, Download, RefreshCw, CheckCircle, XCircle, Terminal, Database, Cloud, ArrowUp, ArrowDown } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { ApiResponse } from '../../../types/common';
import type { AdminUserDto, PaginatedUsersResponse } from '../../../types/models/User';
import type { JobPostSummaryDto } from '../../../types/models/Job';
import type { ProposalDto } from '../../../types/models/Proposal';
import type { AdminAuditLog, PageResult } from '../../../types/models/AdminPhase1';
import type { SystemTrackingSnapshot } from '../../../types/systemTracking';
import { getSystemTrackingHubUrl } from '../../../service/apiService';
import '../styles/admin-users-screen.css';

type TabType = 'overview' | 'audit' | 'errors' | 'alerts' | 'ai-usage';
type LogLevel = 'info' | 'warning' | 'error' | 'critical';

type AuditLog = {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  details: string;
};

type ErrorLogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  stackTrace: string | null;
  userId: string | null;
  requestId: string;
  count: number;
};

type SystemAlert = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: LogLevel;
  service: string;
  metric: string;
  value: string;
  threshold: string;
};

type ApiLog = {
  id: string;
  timestamp: string;
  method: string;
  status: number;
  url: string;
  ip: string;
  duration: number;
  user: string | null;
  application: string;
};

const getThrownErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const getRoleName = (role: number) => {
  if (role === 0) return 'Client';
  if (role === 1) return 'Freelancer';
  if (role === 2) return 'Admin';
  return 'User';
};

const toAuditLogs = (
  users: AdminUserDto[],
  jobs: JobPostSummaryDto[],
  proposals: ProposalDto[]
): AuditLog[] => {
  const userLogs = users.slice(0, 8).map(user => ({
    id: `user_${user.userId}`,
    timestamp: user.updatedAt || user.createdAt,
    userName: user.fullName,
    action: user.isActive ? 'user.active' : 'user.inactive',
    resource: `${getRoleName(user.role)} ${user.email}`,
    ipAddress: '-',
    userAgent: user.provider || 'GigBridge',
    details: `${user.fullName} is registered as ${getRoleName(user.role)}`,
  }));

  const jobLogs = jobs.slice(0, 8).map(job => ({
    id: `job_${job.jobPostsId}`,
    timestamp: job.createdAt,
    userName: 'Client',
    action: 'job.created',
    resource: job.title,
    ipAddress: '-',
    userAgent: 'GigBridge API',
    details: job.descriptionPreview || `Created job post "${job.title}"`,
  }));

  const proposalLogs = proposals.slice(0, 8).map(proposal => ({
    id: `proposal_${proposal.proposalsId}`,
    timestamp: proposal.submittedAt,
    userName: proposal.freelancerName || 'Freelancer',
    action: 'proposal.submitted',
    resource: proposal.jobTitle || proposal.jobPostsId,
    ipAddress: '-',
    userAgent: 'GigBridge API',
    details: `Submitted proposal for "${proposal.jobTitle || proposal.jobPostsId}"`,
  }));

  return [...userLogs, ...jobLogs, ...proposalLogs]
    .filter(log => Boolean(log.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const formatStructuredAuditValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'none';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toBackendAuditLogs = (items: AdminAuditLog[]): AuditLog[] =>
  items.map(item => ({
    id: item.auditLogId || item.id || item.correlationId,
    timestamp: item.createdAt,
    userName: item.adminName || item.adminUserId || 'Admin',
    action: item.action,
    resource: [item.entityType, item.entityId].filter(Boolean).join(' ') || 'Platform',
    ipAddress: '-',
    userAgent: item.userAgent || 'GigBridge Admin',
    details: `Before: ${formatStructuredAuditValue(item.oldValues)} · After: ${formatStructuredAuditValue(item.newValues)} · Correlation: ${item.correlationId || 'none'}`,
  }));

const toFailureLog = (service: string, url: string, response: ApiResponse<unknown>): ErrorLogEntry => ({
  id: `${service}_${Date.now()}`,
  timestamp: new Date().toISOString(),
  level: response.statusCode >= 500 ? 'error' : 'warning',
  service,
  message: response.message || `${service} request failed`,
  stackTrace: null,
  userId: null,
  requestId: url,
  count: 1,
});

const toAlert = (service: string, response: ApiResponse<unknown>): SystemAlert => ({
  id: `alert_${service}_${Date.now()}`,
  timestamp: new Date().toISOString(),
  title: `${service} request failed`,
  description: response.message || `${service} endpoint returned an unsuccessful response`,
  severity: response.statusCode >= 500 ? 'error' : 'warning',
  service,
  metric: 'http_status',
  value: response.statusCode.toString(),
  threshold: '< 400',
});

export default function AdminSystemTrackingScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | 'all'>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(true);

  // API Logs filters
  const [apiLogFilters, setApiLogFilters] = useState({
    startDate: '',
    endDate: '',
    username: '',
    url: '',
    minDuration: '',
    maxDuration: '',
    method: '',
    status: '',
    ip: '',
  });
  const [apiLogSortOrder, setApiLogSortOrder] = useState<'asc' | 'desc'>('desc');
  const [apiLogPage, setApiLogPage] = useState(1);
  const apiLogsPerPage = 5;

  const applyTrackingSnapshot = useCallback((snapshot: SystemTrackingSnapshot) => {
    setApiLogs(snapshot.requests.map(request => ({
      id: request.id,
      timestamp: request.timestamp,
      method: request.method,
      status: request.statusCode,
      url: request.path,
      ip: '-',
      duration: request.durationMs,
      user: null,
      application: 'GigBridge API',
    })));
    setErrorLogs(snapshot.errors.map(error => ({
      id: error.id,
      timestamp: error.timestamp,
      level: error.level,
      service: error.service,
      message: error.message,
      stackTrace: null,
      userId: null,
      requestId: error.requestId,
      count: error.count,
    })));
    setAlerts(snapshot.alerts.map(alert => ({
      id: alert.id,
      timestamp: alert.firstObservedAt,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      service: 'backend-api',
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
    })));
  }, []);

  const loadRealtimeSnapshot = useCallback(async () => {
    const response = await adminGetAPI.getSystemTracking(100);
    if (response.success && response.data) {
      applyTrackingSnapshot(response.data);
    }
  }, [applyTrackingSnapshot]);

  const loadSystemTrackingData = async () => {
    setIsLoadingTracking(true);

    const requestLogs: ApiLog[] = [];
    const failures: ErrorLogEntry[] = [];
    const activeAlerts: SystemAlert[] = [];

    const callTracked = async <T,>(
      service: string,
      url: string,
      call: () => Promise<ApiResponse<T>>
    ): Promise<ApiResponse<T>> => {
      const startedAt = Date.now();
      let response: ApiResponse<T>;
      try {
        response = await call();
      } catch (error: unknown) {
        response = {
          success: false,
          statusCode: 0,
          message: getThrownErrorMessage(error, `${service} request failed`),
        };
      }
      const duration = Date.now() - startedAt;

      requestLogs.push({
        id: `${service}_${startedAt}`,
        timestamp: new Date(startedAt).toISOString(),
        method: 'GET',
        status: response.statusCode,
        url,
        ip: '-',
        duration,
        user: null,
        application: 'GigBridge API',
      });

      if (!response.success) {
        failures.push(toFailureLog(service, url, response));
        activeAlerts.push(toAlert(service, response));
      }

      return response;
    };

    const [usersResponse, jobsResponse, proposalsResponse, auditResponse] = await Promise.all([
      callTracked<PaginatedUsersResponse>(
        'admin-users',
        '/api/v1/admin/users',
        () => adminGetAPI.getUsers({ Page: 1, PageSize: 200 })
      ),
      callTracked<JobPostSummaryDto[]>(
        'job-posts',
        '/api/JobPosts/admin/all',
        () => jobGetAPI.getAllJobPosts({ PageIndex: 1, PageSize: 200 })
      ),
      callTracked<ProposalDto[]>(
        'proposals',
        '/api/Proposals/admin/all',
        () => proposalGetAPI.getAllProposals({ PageIndex: 1, PageSize: 200 })
      ),
      callTracked<PageResult<AdminAuditLog>>(
        'admin-audit-logs',
        '/api/v1/admin/audit-logs',
        () => adminGetAPI.getAuditLogs({ page: 1, pageSize: 200 })
      ),
    ]);

    const users = usersResponse.data?.items || [];
    const jobs = jobsResponse.data || [];
    const proposals = proposalsResponse.data || [];

    // Prefer the persisted admin audit trail from our branch. The discovery-derived
    // activity from the incoming implementation remains as a fallback when that
    // endpoint is unavailable, so none of its original tracking coverage is lost.
    setAuditLogs(
      auditResponse.success && auditResponse.data
        ? toBackendAuditLogs(auditResponse.data.items)
        : toAuditLogs(users, jobs, proposals)
    );
    setErrorLogs(failures);
    setAlerts(activeAlerts);
    setApiLogs(requestLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    await loadRealtimeSnapshot();
    setIsLoadingTracking(false);
  };

  useEffect(() => {
    loadSystemTrackingData();
  }, []);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: number | undefined;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getSystemTrackingHubUrl(), {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .build();

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (!disposed) void loadRealtimeSnapshot();
      }, 300);
    };

    connection.on('SystemTrackingUpdated', scheduleRefresh);
    connection.onreconnected(scheduleRefresh);
    void connection.start().catch(() => undefined);

    return () => {
      disposed = true;
      window.clearTimeout(refreshTimer);
      connection.off('SystemTrackingUpdated', scheduleRefresh);
      void connection.stop();
    };
  }, [loadRealtimeSnapshot]);

  const stats = useMemo(() => {
    const auditCount = auditLogs.length;
    const errorCount = errorLogs.filter(e => e.level === 'error' || e.level === 'critical').length;
    const activeAlerts = alerts.length;
    const avgResponseTime = apiLogs.length
      ? `${Math.round(apiLogs.reduce((total, log) => total + log.duration, 0) / apiLogs.length)}ms`
      : '0ms';

    return { auditCount, errorCount, activeAlerts, trackedRequests: apiLogs.length, avgResponseTime };
  }, [auditLogs, errorLogs, alerts, apiLogs]);

  const filteredErrors = useMemo(() => {
    return errorLogs.filter(error => {
      const matchesSearch = searchQuery === '' ||
        error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.service.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLevel = logLevelFilter === 'all' || error.level === logLevelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [errorLogs, searchQuery, logLevelFilter]);

  const filteredAuditLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return auditLogs;
    return auditLogs.filter(log =>
      log.action.toLowerCase().includes(query) ||
      log.userName.toLowerCase().includes(query) ||
      log.resource.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query)
    );
  }, [auditLogs, searchQuery]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = searchQuery === '' ||
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [alerts, searchQuery]);

  const getLogLevelBadge = (level: LogLevel) => {
    if (level === 'info') return <span className="badge-cyan text-xs">Info</span>;
    if (level === 'warning') return <span className="badge-amber text-xs">Warning</span>;
    if (level === 'error') return <span className="badge-red text-xs">Error</span>;
    return <span className="badge-red text-xs font-bold">Critical</span>;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green';
    if (status >= 300 && status < 400) return 'text-cyan';
    if (status >= 400 && status < 500) return 'text-amber';
    return 'text-red';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-cyan/20 text-cyan border-cyan';
      case 'POST': return 'bg-green/20 text-green border-green';
      case 'PUT': return 'bg-amber/20 text-amber border-amber';
      case 'DELETE': return 'bg-red/20 text-red border-red';
      case 'PATCH': return 'bg-purple/20 text-purple border-purple';
      default: return 'bg-gray/20 text-gray border-gray';
    }
  };

  // Filter and sort API logs
  const filteredApiLogs = useMemo(() => {
    let filtered = apiLogs.filter(log => {
      const timestamp = new Date(log.timestamp).getTime();
      const matchesStartDate = apiLogFilters.startDate === '' || timestamp >= new Date(apiLogFilters.startDate).getTime();
      const matchesEndDate = apiLogFilters.endDate === '' || timestamp <= new Date(`${apiLogFilters.endDate}T23:59:59`).getTime();
      const matchesUrl = apiLogFilters.url === '' || log.url.toLowerCase().includes(apiLogFilters.url.toLowerCase());
      const matchesMethod = apiLogFilters.method === '' || log.method === apiLogFilters.method;
      const matchesStatus = apiLogFilters.status === '' || log.status.toString() === apiLogFilters.status;
      const matchesIp = apiLogFilters.ip === '' || log.ip.includes(apiLogFilters.ip);
      const matchesUsername = apiLogFilters.username === '' || (log.user && log.user.toLowerCase().includes(apiLogFilters.username.toLowerCase()));

      const matchesMinDuration = apiLogFilters.minDuration === '' || log.duration >= parseInt(apiLogFilters.minDuration);
      const matchesMaxDuration = apiLogFilters.maxDuration === '' || log.duration <= parseInt(apiLogFilters.maxDuration);

      return matchesStartDate && matchesEndDate && matchesUrl && matchesMethod && matchesStatus && matchesIp && matchesUsername && matchesMinDuration && matchesMaxDuration;
    });

    // Sort by timestamp
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return apiLogSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [apiLogs, apiLogFilters, apiLogSortOrder]);

  // Pagination for API logs
  const totalApiLogPages = Math.ceil(filteredApiLogs.length / apiLogsPerPage);
  const paginatedApiLogs = filteredApiLogs.slice(
    (apiLogPage - 1) * apiLogsPerPage,
    apiLogPage * apiLogsPerPage
  );

  const handleResetApiLogFilters = () => {
    setApiLogFilters({
      startDate: '',
      endDate: '',
      username: '',
      url: '',
      minDuration: '',
      maxDuration: '',
      method: '',
      status: '',
      ip: '',
    });
    setApiLogPage(1);
  };

  const handleExportApiLogs = () => {
    const header = ['Timestamp', 'Method', 'Status', 'URL', 'User', 'IP', 'Duration', 'Application'];
    const rows = filteredApiLogs.map(log => [
      log.timestamp,
      log.method,
      log.status.toString(),
      log.url,
      log.user || '',
      log.ip,
      `${log.duration}ms`,
      log.application,
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-api-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isApiLogFilterActive = () => {
    return Object.values(apiLogFilters).some(val => val !== '');
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">System Tracking</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">System Monitoring</h1>
              <p className="text-sm text-secondary mt-1">Real-time system health and activity monitoring</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadSystemTrackingData}
                disabled={isLoadingTracking}
                className="btn-ghost-cyan px-3 py-2 text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingTracking ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleExportApiLogs}
                disabled={filteredApiLogs.length === 0}
                className="btn-cyan px-3 py-2 text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Activity Items', value: stats.auditCount.toString(), icon: <FileText size={16} />, color: 'cyan' },
              { label: 'Active Errors', value: stats.errorCount.toString(), icon: <XCircle size={16} />, color: 'red' },
              { label: 'Active Alerts', value: stats.activeAlerts.toString(), icon: <AlertTriangle size={16} />, color: 'amber' },
              { label: 'Tracked Requests', value: stats.trackedRequests.toString(), icon: <Activity size={16} />, color: 'purple' },
              { label: 'Avg Response', value: stats.avgResponseTime, icon: <Clock size={16} />, color: 'cyan' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
              { id: 'audit', label: 'Recent Activity', icon: <FileText size={14} /> },
              { id: 'errors', label: 'Error Logs', icon: <Terminal size={14} /> },
              { id: 'alerts', label: 'Alerts', icon: <AlertTriangle size={14} /> },
              { id: 'ai-usage', label: 'AI Usage', icon: <Zap size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-cyan/20 text-cyan border border-cyan'
                    : 'glass-button text-secondary hover:text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Database size={18} className="text-purple" />
                    <h3 className="font-semibold text-primary">Database Metrics</h3>
                  </div>
                  <p className="text-sm text-secondary">
                    Unavailable: no database telemetry endpoint is connected.
                  </p>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Cloud size={18} className="text-green" />
                    <h3 className="font-semibold text-primary">Infrastructure</h3>
                  </div>
                  <p className="text-sm text-secondary">
                    Unavailable: no infrastructure telemetry endpoint is connected.
                  </p>
                </div>
              </div>

              {/* API Logs Section */}
              <div className="glass-card overflow-hidden mb-6">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-purple/5">
                  <Terminal size={18} className="text-cyan" />
                  <h3 className="font-semibold text-primary">API Request Logs</h3>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-white/5">
                  <div className="space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Start date</label>
                        <input
                          type="date"
                          value={apiLogFilters.startDate}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, startDate: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">End date</label>
                        <input
                          type="date"
                          value={apiLogFilters.endDate}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, endDate: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">User name</label>
                        <input
                          type="text"
                          placeholder="Username"
                          value={apiLogFilters.username}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, username: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">URL</label>
                        <input
                          type="text"
                          placeholder="URL path"
                          value={apiLogFilters.url}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, url: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Min. duration (ms)</label>
                        <input
                          type="number"
                          placeholder="ms"
                          value={apiLogFilters.minDuration}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, minDuration: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Max. duration (ms)</label>
                        <input
                          type="number"
                          placeholder="ms"
                          value={apiLogFilters.maxDuration}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, maxDuration: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">HTTP method</label>
                        <select
                          value={apiLogFilters.method}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, method: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        >
                          <option value="">All</option>
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                          <option value="PATCH">PATCH</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">HTTP status code</label>
                        <select
                          value={apiLogFilters.status}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, status: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        >
                          <option value="">All</option>
                          <option value="200">200</option>
                          <option value="201">201</option>
                          <option value="204">204</option>
                          <option value="400">400</option>
                          <option value="401">401</option>
                          <option value="403">403</option>
                          <option value="404">404</option>
                          <option value="500">500</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Client IP Address</label>
                        <input
                          type="text"
                          placeholder="IP address"
                          value={apiLogFilters.ip}
                          onChange={(e) => setApiLogFilters({ ...apiLogFilters, ip: e.target.value })}
                          className="input-gb w-full text-xs py-2"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setApiLogPage(1);
                          loadSystemTrackingData();
                        }}
                        disabled={isLoadingTracking}
                        className="btn-cyan px-4 py-2 text-xs disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={`inline mr-1 ${isLoadingTracking ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      {isApiLogFilterActive() && (
                        <button
                          onClick={handleResetApiLogFilters}
                          className="btn-ghost-cyan px-4 py-2 text-xs"
                        >
                          Reset Filters
                        </button>
                      )}
                      <button
                        onClick={handleExportApiLogs}
                        disabled={filteredApiLogs.length === 0}
                        className="btn-ghost-cyan px-4 py-2 text-xs ml-auto disabled:opacity-50"
                      >
                        <Download size={14} className="inline mr-1" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/5">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">HTTP Request</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">User</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">IP Address</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">
                          <button
                            onClick={() => setApiLogSortOrder(apiLogSortOrder === 'desc' ? 'asc' : 'desc')}
                            className="flex items-center gap-1 hover:text-cyan transition-colors"
                          >
                            Date
                            {apiLogSortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Duration</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Application</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedApiLogs.map(log => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodColor(log.method)}`}>
                                {log.method}
                              </span>
                              <span className={`text-xs font-bold ${getStatusColor(log.status)}`}>
                                {log.status}
                              </span>
                              <span className="text-xs text-primary font-mono">{log.url}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-secondary">{log.user || '-'}</td>
                          <td className="px-4 py-3 text-xs text-secondary font-mono">{log.ip}</td>
                          <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${log.duration > 1000 ? 'text-red' : log.duration > 500 ? 'text-amber' : 'text-green'}`}>
                              {log.duration}ms
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">{log.application}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredApiLogs.length === 0 && (
                    <div className="text-center py-12">
                      <Search size={48} className="mx-auto mb-4 text-muted" />
                      <p className="text-primary font-medium mb-2">No logs found</p>
                      <p className="text-sm text-secondary">Try adjusting your filters</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {filteredApiLogs.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                    <p className="text-xs text-secondary">
                      Showing <span className="text-primary font-semibold">{((apiLogPage - 1) * apiLogsPerPage) + 1}</span> to <span className="text-primary font-semibold">{Math.min(apiLogPage * apiLogsPerPage, filteredApiLogs.length)}</span> of <span className="text-primary font-semibold">{filteredApiLogs.length}</span> logs
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setApiLogPage(Math.max(1, apiLogPage - 1))}
                        disabled={apiLogPage === 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium glass-button disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setApiLogPage(Math.min(totalApiLogPages, apiLogPage + 1))}
                        disabled={apiLogPage === totalApiLogPages}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium glass-button disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <h3 className="font-semibold text-primary mb-2">Historical Request Volume</h3>
                <p className="text-sm text-secondary">
                  Unavailable: the current backend exposes no historical request-metrics endpoint.
                  The table above contains only live probes made by this screen.
                </p>
              </div>
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="glass-card p-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search recent activity..."
                    className="input-gb w-full py-2.5 text-sm"
                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                  />
                </div>
              </div>

              {/* Audit Logs List */}
              <div className="space-y-3">
                  {filteredAuditLogs.map(log => (
                  <div key={log.id} className="glass-card p-4 hover:bg-white/5 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={14} className="text-green" />
                          <span className="text-sm font-semibold text-primary">{log.action}</span>
                          <span className="text-xs text-muted">by {log.userName}</span>
                        </div>
                        <p className="text-sm text-secondary mb-2">{log.details}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted">
                          <span>Resource: {log.resource}</span>
                          <span>•</span>
                          <span>IP: {log.ipAddress}</span>
                          <span>•</span>
                          <span>{log.userAgent}</span>
                        </div>
                      </div>
                      <span className="text-xs text-secondary whitespace-nowrap ml-4">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                  {!isLoadingTracking && filteredAuditLogs.length === 0 && (
                  <div className="glass-card text-center py-12">
                    <FileText size={48} className="mx-auto mb-4 text-muted" />
                    <p className="text-primary font-medium mb-2">No audit activity found</p>
                    <p className="text-sm text-secondary">Refresh after users, jobs, or proposals have been created.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Logs Tab */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search errors..."
                      className="input-gb w-full py-2.5 text-sm"
                      style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                    />
                  </div>
                  <select
                    value={logLevelFilter}
                    onChange={e => setLogLevelFilter(e.target.value as LogLevel | 'all')}
                    className="input-gb px-4 py-2.5 text-sm cursor-pointer"
                  >
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Error Logs List */}
              <div className="space-y-3">
                {filteredErrors.map(error => (
                  <div key={error.id} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getLogLevelBadge(error.level)}
                        <span className="badge-purple text-xs">{error.service}</span>
                        {error.count > 1 && (
                          <span className="badge-amber text-xs">{error.count}x</span>
                        )}
                      </div>
                      <span className="text-xs text-secondary whitespace-nowrap">
                        {formatTimestamp(error.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-primary mb-2">{error.message}</p>
                    {error.stackTrace && (
                      <details className="mt-3">
                        <summary className="text-xs text-cyan cursor-pointer hover:underline">
                          View Stack Trace
                        </summary>
                        <pre className="mt-2 p-3 rounded-lg bg-black/20 text-xs text-secondary overflow-x-auto">
                          {error.stackTrace}
                        </pre>
                      </details>
                    )}
                    <div className="flex gap-3 text-xs text-muted mt-3">
                      {error.requestId && <span>Request: {error.requestId}</span>}
                      {error.userId && <span>User: {error.userId}</span>}
                    </div>
                  </div>
                ))}
                {!isLoadingTracking && filteredErrors.length === 0 && (
                  <div className="glass-card text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-4 text-green" />
                    <p className="text-primary font-medium mb-2">No API errors found</p>
                    <p className="text-sm text-secondary">All wired system tracking requests are currently successful.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search alerts..."
                      className="input-gb w-full py-2.5 text-sm"
                      style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Alerts List */}
              <div className="space-y-3">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getLogLevelBadge(alert.severity)}
                        <span className="badge-red text-xs">Active</span>
                        <span className="badge-purple text-xs">{alert.service}</span>
                      </div>
                      <span className="text-xs text-secondary whitespace-nowrap ml-4">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-primary mb-2">{alert.title}</h4>
                    <p className="text-sm text-secondary mb-3">{alert.description}</p>
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
                      <div>
                        <p className="text-xs text-muted mb-1">Metric</p>
                        <p className="text-sm font-semibold text-primary">{alert.metric}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Current Value</p>
                        <p className="text-sm font-semibold text-primary">{alert.value}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Threshold</p>
                        <p className="text-sm font-semibold text-primary">{alert.threshold}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!isLoadingTracking && filteredAlerts.length === 0 && (
                  <div className="glass-card text-center py-12">
                    <CheckCircle size={48} className="mx-auto mb-4 text-green" />
                    <p className="text-primary font-medium mb-2">No active alerts</p>
                    <p className="text-sm text-secondary">Tracked admin endpoints are responding normally.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Usage Tab */}
          {activeTab === 'ai-usage' && (
            <div className="glass-card p-10 text-center">
              <Zap size={48} className="mx-auto mb-4 text-muted" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                AI usage telemetry unavailable
              </h3>
              <p className="text-sm text-secondary max-w-2xl mx-auto">
                No backend endpoint currently provides AI request counts, token consumption,
                feature distribution, or cost history. These charts will remain hidden until
                persisted telemetry is available.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
