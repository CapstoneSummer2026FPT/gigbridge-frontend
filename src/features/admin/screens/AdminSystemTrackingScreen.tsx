import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Activity, AlertTriangle, FileText, Zap, TrendingUp, Clock, Eye, Filter, Search, Download, RefreshCw, CheckCircle, XCircle, AlertCircle, Info, Terminal, Cpu, Database, Cloud, ArrowUp, ArrowDown } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { ApiResponse } from '../../../types/common';
import type { AdminUserDto, PaginatedUsersResponse } from '../../../types/models/User';
import type { JobPostSummaryDto } from '../../../types/models/Job';
import type { ProposalDto } from '../../../types/models/Proposal';
import '../styles/admin-users-screen.css';

type TabType = 'overview' | 'audit' | 'errors' | 'alerts' | 'ai-usage';
type LogLevel = 'info' | 'warning' | 'error' | 'critical';
type AlertStatus = 'active' | 'resolved' | 'acknowledged';

type AuditLog = {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  status: string;
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
  status: AlertStatus;
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

// Mock data
const AUDIT_LOGS = [
  {
    id: 'audit_1',
    timestamp: '2024-05-16T14:30:00Z',
    userId: 'user_client_1',
    userName: 'John Doe',
    action: 'job.created',
    resource: 'Job Post #1234',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/120.0',
    status: 'success',
    details: 'Created new job post "Full-Stack Developer"',
  },
  {
    id: 'audit_2',
    timestamp: '2024-05-16T14:25:00Z',
    userId: 'user_freelancer_2',
    userName: 'Sarah Smith',
    action: 'proposal.submitted',
    resource: 'Proposal #5678',
    ipAddress: '192.168.1.101',
    userAgent: 'Firefox/119.0',
    status: 'success',
    details: 'Submitted proposal for job "Mobile App Design"',
  },
  {
    id: 'audit_3',
    timestamp: '2024-05-16T14:20:00Z',
    userId: 'user_admin_1',
    userName: 'Admin User',
    action: 'user.banned',
    resource: 'User #9012',
    ipAddress: '192.168.1.102',
    userAgent: 'Chrome/120.0',
    status: 'success',
    details: 'Banned user for violating terms of service',
  },
  {
    id: 'audit_4',
    timestamp: '2024-05-16T14:15:00Z',
    userId: 'user_client_3',
    userName: 'Tech Corp',
    action: 'contract.signed',
    resource: 'Contract #cont_1',
    ipAddress: '192.168.1.103',
    userAgent: 'Safari/17.0',
    status: 'success',
    details: 'E-signed contract with freelancer',
  },
];

const ERROR_LOGS = [
  {
    id: 'error_1',
    timestamp: '2024-05-16T14:28:00Z',
    level: 'error' as LogLevel,
    service: 'payment-service',
    message: 'Payment gateway timeout',
    stackTrace: 'Error: Timeout after 30s\n  at PaymentService.processPayment (payment.ts:45)\n  at async PaymentController.create (controller.ts:89)',
    userId: 'user_client_5',
    requestId: 'req_abc123',
    count: 3,
  },
  {
    id: 'error_2',
    timestamp: '2024-05-16T14:22:00Z',
    level: 'warning' as LogLevel,
    service: 'ai-service',
    message: 'AI API rate limit approaching (85% used)',
    stackTrace: null,
    userId: null,
    requestId: 'req_def456',
    count: 1,
  },
  {
    id: 'error_3',
    timestamp: '2024-05-16T14:10:00Z',
    level: 'critical' as LogLevel,
    service: 'database',
    message: 'Database connection pool exhausted',
    stackTrace: 'Error: Pool connection timeout\n  at Pool.connect (pool.ts:123)\n  at Database.query (db.ts:67)',
    userId: null,
    requestId: 'req_ghi789',
    count: 12,
  },
  {
    id: 'error_4',
    timestamp: '2024-05-16T13:55:00Z',
    level: 'info' as LogLevel,
    service: 'notification-service',
    message: 'Email delivery delayed by 2 minutes',
    stackTrace: null,
    userId: 'user_freelancer_8',
    requestId: 'req_jkl012',
    count: 1,
  },
];

const ALERTS = [
  {
    id: 'alert_1',
    timestamp: '2024-05-16T14:30:00Z',
    title: 'High Error Rate Detected',
    description: 'Payment service error rate exceeded 5% threshold',
    severity: 'critical' as LogLevel,
    status: 'active' as AlertStatus,
    service: 'payment-service',
    metric: 'error_rate',
    value: '8.2%',
    threshold: '5%',
  },
  {
    id: 'alert_2',
    timestamp: '2024-05-16T14:15:00Z',
    title: 'AI API Budget Alert',
    description: 'AI API costs approaching monthly budget limit',
    severity: 'warning' as LogLevel,
    status: 'acknowledged' as AlertStatus,
    service: 'ai-service',
    metric: 'cost',
    value: '$2,450',
    threshold: '$2,500',
  },
  {
    id: 'alert_3',
    timestamp: '2024-05-16T13:45:00Z',
    title: 'Database Performance Degradation',
    description: 'Query response time increased by 150%',
    severity: 'warning' as LogLevel,
    status: 'resolved' as AlertStatus,
    service: 'database',
    metric: 'response_time',
    value: '2.5s',
    threshold: '1s',
  },
];

const AI_API_USAGE = [
  {
    date: '2024-05-10',
    requests: 1245,
    tokens: 452000,
    cost: 125.50,
  },
  {
    date: '2024-05-11',
    requests: 1380,
    tokens: 485000,
    cost: 142.30,
  },
  {
    date: '2024-05-12',
    requests: 1520,
    tokens: 512000,
    cost: 158.20,
  },
  {
    date: '2024-05-13',
    requests: 1650,
    tokens: 548000,
    cost: 175.80,
  },
  {
    date: '2024-05-14',
    requests: 1480,
    tokens: 495000,
    cost: 162.40,
  },
  {
    date: '2024-05-15',
    requests: 1720,
    tokens: 572000,
    cost: 189.60,
  },
  {
    date: '2024-05-16',
    requests: 1890,
    tokens: 615000,
    cost: 212.30,
  },
];

const AI_USAGE_BY_FEATURE = [
  { name: 'Job Matching', value: 35, color: '#0077FF' },
  { name: 'Proposal Analysis', value: 28, color: '#9F4BFF' },
  { name: 'AI Assistant', value: 22, color: '#22C55E' },
  { name: 'Interview Prep', value: 15, color: '#F59E0B' },
];

const API_LOGS = [
  {
    id: 'log_1',
    timestamp: '2024-05-16T14:35:22Z',
    method: 'POST',
    status: 201,
    url: '/api/v1/jobs',
    ip: '192.168.1.100',
    duration: 145,
    user: 'John Doe',
    application: 'GigBridge API',
  },
  {
    id: 'log_2',
    timestamp: '2024-05-16T14:34:18Z',
    method: 'GET',
    status: 200,
    url: '/api/v1/proposals',
    ip: '192.168.1.101',
    duration: 52,
    user: 'Sarah Smith',
    application: 'GigBridge API',
  },
  {
    id: 'log_3',
    timestamp: '2024-05-16T14:33:45Z',
    method: 'PUT',
    status: 200,
    url: '/api/v1/contracts/cont_1',
    ip: '192.168.1.102',
    duration: 234,
    user: 'Admin User',
    application: 'GigBridge API',
  },
  {
    id: 'log_4',
    timestamp: '2024-05-16T14:32:30Z',
    method: 'DELETE',
    status: 204,
    url: '/api/v1/jobs/job_789',
    ip: '192.168.1.103',
    duration: 98,
    user: 'Tech Corp',
    application: 'GigBridge API',
  },
  {
    id: 'log_5',
    timestamp: '2024-05-16T14:31:15Z',
    method: 'GET',
    status: 404,
    url: '/api/v1/users/unknown',
    ip: '192.168.1.104',
    duration: 12,
    user: null,
    application: 'GigBridge API',
  },
  {
    id: 'log_6',
    timestamp: '2024-05-16T14:30:00Z',
    method: 'POST',
    status: 500,
    url: '/api/v1/payments',
    ip: '192.168.1.105',
    duration: 3500,
    user: 'Client User',
    application: 'GigBridge API',
  },
];

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
    userId: user.userId,
    userName: user.fullName,
    action: user.isActive ? 'user.active' : 'user.inactive',
    resource: `${getRoleName(user.role)} ${user.email}`,
    ipAddress: '-',
    userAgent: user.provider || 'GigBridge',
    status: 'success',
    details: `${user.fullName} is registered as ${getRoleName(user.role)}`,
  }));

  const jobLogs = jobs.slice(0, 8).map(job => ({
    id: `job_${job.jobPostsId}`,
    timestamp: job.createdAt,
    userId: '',
    userName: 'Client',
    action: 'job.created',
    resource: job.title,
    ipAddress: '-',
    userAgent: 'GigBridge API',
    status: 'success',
    details: job.descriptionPreview || `Created job post "${job.title}"`,
  }));

  const proposalLogs = proposals.slice(0, 8).map(proposal => ({
    id: `proposal_${proposal.proposalsId}`,
    timestamp: proposal.submittedAt,
    userId: proposal.freelancerProfilesId,
    userName: proposal.freelancerName || 'Freelancer',
    action: 'proposal.submitted',
    resource: proposal.jobTitle || proposal.jobPostsId,
    ipAddress: '-',
    userAgent: 'GigBridge API',
    status: 'success',
    details: `Submitted proposal for "${proposal.jobTitle || proposal.jobPostsId}"`,
  }));

  return [...userLogs, ...jobLogs, ...proposalLogs]
    .filter(log => Boolean(log.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

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
  status: 'active',
  service,
  metric: 'http_status',
  value: response.statusCode.toString(),
  threshold: '< 400',
});

export default function AdminSystemTrackingScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | 'all'>('all');
  const [alertStatusFilter, setAlertStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [timeRange, setTimeRange] = useState('24h');
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
      const response = await call();
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
        failures.push(toFailureLog(service, url, response as ApiResponse<unknown>));
        activeAlerts.push(toAlert(service, response as ApiResponse<unknown>));
      }

      return response;
    };

    const [usersResponse, jobsResponse, proposalsResponse] = await Promise.all([
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
    ]);

    const users = usersResponse.data?.items || [];
    const jobs = jobsResponse.data || [];
    const proposals = proposalsResponse.data || [];

    setAuditLogs(toAuditLogs(users, jobs, proposals));
    setErrorLogs(failures);
    setAlerts(activeAlerts);
    setApiLogs(requestLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setIsLoadingTracking(false);
  };

  useEffect(() => {
    loadSystemTrackingData();
  }, []);

  const stats = useMemo(() => {
    const auditCount = auditLogs.length;
    const errorCount = errorLogs.filter(e => e.level === 'error' || e.level === 'critical').length;
    const activeAlerts = alerts.filter(a => a.status === 'active').length;
    const todayAIRequests = AI_API_USAGE[AI_API_USAGE.length - 1].requests;
    const todayAICost = AI_API_USAGE[AI_API_USAGE.length - 1].cost;
    const avgResponseTime = apiLogs.length
      ? `${Math.round(apiLogs.reduce((total, log) => total + log.duration, 0) / apiLogs.length)}ms`
      : '0ms';

    return { auditCount, errorCount, activeAlerts, todayAIRequests, todayAICost, avgResponseTime };
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

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = searchQuery === '' ||
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = alertStatusFilter === 'all' || alert.status === alertStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [alerts, searchQuery, alertStatusFilter]);

  const getLogLevelBadge = (level: LogLevel) => {
    if (level === 'info') return <span className="badge-cyan text-xs">Info</span>;
    if (level === 'warning') return <span className="badge-amber text-xs">Warning</span>;
    if (level === 'error') return <span className="badge-red text-xs">Error</span>;
    return <span className="badge-red text-xs font-bold">Critical</span>;
  };

  const getAlertStatusBadge = (status: AlertStatus) => {
    if (status === 'active') return <span className="badge-red text-xs">Active</span>;
    if (status === 'acknowledged') return <span className="badge-amber text-xs">Acknowledged</span>;
    return <span className="badge-green text-xs">Resolved</span>;
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: 'Audit Logs', value: stats.auditCount.toString(), icon: <FileText size={16} />, color: 'cyan', trend: '+12%' },
              { label: 'Active Errors', value: stats.errorCount.toString(), icon: <XCircle size={16} />, color: 'red', trend: '-5%' },
              { label: 'Active Alerts', value: stats.activeAlerts.toString(), icon: <AlertTriangle size={16} />, color: 'amber', trend: '+2' },
              { label: 'AI Requests', value: stats.todayAIRequests.toLocaleString(), icon: <Zap size={16} />, color: 'purple', trend: '+18%' },
              { label: 'AI Cost Today', value: `$${stats.todayAICost}`, icon: <TrendingUp size={16} />, color: 'green', trend: '+$25' },
              { label: 'Avg Response', value: stats.avgResponseTime, icon: <Clock size={16} />, color: 'cyan', trend: '-15ms' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary mb-1">{stat.value}</p>
                <p className={`text-xs ${stat.trend.startsWith('-') || stat.trend.includes('ms') ? 'text-green' : 'text-cyan'}`}>
                  {stat.trend}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
              { id: 'audit', label: 'Audit Logs', icon: <FileText size={14} /> },
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
              {/* System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu size={18} className="text-cyan" />
                    <h3 className="font-semibold text-primary">System Health</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'API Server', status: 'Healthy', value: '99.9%' },
                      { label: 'Database', status: 'Healthy', value: '100%' },
                      { label: 'Cache', status: 'Healthy', value: '98.5%' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green" />
                          <span className="text-sm text-secondary">{item.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Database size={18} className="text-purple" />
                    <h3 className="font-semibold text-primary">Database Metrics</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Connections', value: '45/100' },
                      { label: 'Query Time', value: '12ms avg' },
                      { label: 'Storage Used', value: '68%' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-secondary">{item.label}</span>
                        <span className="text-sm font-semibold text-primary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Cloud size={18} className="text-green" />
                    <h3 className="font-semibold text-primary">Infrastructure</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'CDN Status', value: 'Online' },
                      { label: 'Load Balancer', value: 'Healthy' },
                      { label: 'Auto Scaling', value: 'Active' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-secondary">{item.label}</span>
                        <span className="text-sm font-semibold text-green">{item.value}</span>
                      </div>
                    ))}
                  </div>
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

              {/* Recent Activity Chart */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-primary">Request Volume (Last 7 Days)</h3>
                  <span className="badge-green text-xs">+18% vs last week</span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={AI_API_USAGE}>
                    <defs>
                      <linearGradient id="requestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0077FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0077FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,119,255,0.3)', borderRadius: 10, color: 'white' }} />
                    <Area type="monotone" dataKey="requests" stroke="#0077FF" strokeWidth={2} fill="url(#requestGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
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
                    placeholder="Search audit logs..."
                    className="input-gb w-full py-2.5 text-sm"
                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                  />
                </div>
              </div>

              {/* Audit Logs List */}
              <div className="space-y-3">
                {auditLogs.map(log => (
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
                {!isLoadingTracking && auditLogs.length === 0 && (
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
                  <select
                    value={alertStatusFilter}
                    onChange={e => setAlertStatusFilter(e.target.value as AlertStatus | 'all')}
                    className="input-gb px-4 py-2.5 text-sm cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Alerts List */}
              <div className="space-y-3">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getLogLevelBadge(alert.severity)}
                        {getAlertStatusBadge(alert.status)}
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
                    {alert.status === 'active' && (
                      <div className="flex gap-2 mt-4">
                        <button className="btn-ghost-cyan px-3 py-1.5 text-xs">Acknowledge</button>
                        <button className="btn-ghost-green px-3 py-1.5 text-xs">Resolve</button>
                      </div>
                    )}
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
            <div className="space-y-6">
              {/* Usage Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-primary mb-5">API Requests (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={AI_API_USAGE}>
                      <XAxis dataKey="date" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.3)', borderRadius: 10, color: 'white' }} />
                      <Bar dataKey="requests" fill="#9F4BFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-semibold text-primary mb-5">Cost Tracking (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={AI_API_USAGE}>
                      <XAxis dataKey="date" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cost']} />
                      <Line type="monotone" dataKey="cost" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Usage by Feature */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-primary mb-5">Usage by Feature</h3>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <PieChart width={200} height={200}>
                      <Pie data={AI_USAGE_BY_FEATURE} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                        {AI_USAGE_BY_FEATURE.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="space-y-3">
                      {AI_USAGE_BY_FEATURE.map(feature => (
                        <div key={feature.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: feature.color }} />
                            <span className="text-sm text-primary">{feature.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-primary">{feature.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Token Usage */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-primary mb-5">Token Consumption</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={AI_API_USAGE}>
                    <defs>
                      <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0077FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0077FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,119,255,0.3)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [v.toLocaleString(), 'Tokens']} />
                    <Area type="monotone" dataKey="tokens" stroke="#0077FF" strokeWidth={2} fill="url(#tokenGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
