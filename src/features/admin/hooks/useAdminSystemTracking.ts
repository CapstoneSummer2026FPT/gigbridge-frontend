import { useState, useMemo, useEffect, useCallback } from 'react';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import type { ApiResponse } from '../../../types/common';
import type { AdminUserDto, PaginatedUsersResponse } from '../../../types/models/User';
import type { AdminJobPostListResponse } from '../../../types/models/Job';
import type { ProposalDto } from '../../../types/models/Proposal';
import type {
  SystemTrackingSnapshot,
} from '../../../types/systemTracking';
import type { AdminAuditLog, PageResult } from '../../../types/models/AdminPhase1';
import { createSystemTrackingHubConnection } from '../services/systemTrackingHubConnection';
import {
  type TabType,
  type LogLevel,
  type AuditLog,
  type ErrorLogEntry,
  type SystemAlert,
  type ApiLog,
  type TrackingStats,
  getActionCategory,
  toAuditLogs,
  toBackendAuditLogs,
  toFailureLog,
  toFailureAlert,
  exportJson,
} from '../utils/systemTrackingUtils';

export function useAdminSystemTracking() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(true);
  const [errorMonitoring, setErrorMonitoring] = useState<SystemTrackingSnapshot['errorMonitoring'] | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [globalAuditViewMode, setGlobalAuditViewMode] = useState<'visual' | 'json'>('visual');
  const [usersList, setUsersList] = useState<AdminUserDto[]>([]);

  const userMap = useMemo(() => {
    const map = new Map<string, AdminUserDto>();
    usersList.forEach(u => {
      if (u.userId) {
        map.set(u.userId.toLowerCase(), u);
      }
    });
    return map;
  }, [usersList]);

  // Audit Logs state & filters
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');
  const [auditSortOrder, setAuditSortOrder] = useState<'asc' | 'desc'>('desc');
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [auditLogsPerPage, setAuditLogsPerPage] = useState(10);
  const [expandedAuditIds, setExpandedAuditIds] = useState<Set<string>>(new Set());

  // Error Logs state & filters
  const [errorSearchQuery, setErrorSearchQuery] = useState('');
  const [errorLevelFilter, setErrorLevelFilter] = useState<LogLevel | 'all'>('all');
  const [errorSortOrder, setErrorSortOrder] = useState<'asc' | 'desc'>('desc');
  const [errorLogPage, setErrorLogPage] = useState(1);
  const [errorLogsPerPage, setErrorLogsPerPage] = useState(10);
  const [expandedErrorIds, setExpandedErrorIds] = useState<Set<string>>(new Set());

  // System Alerts state & filters
  const [alertSearchQuery, setAlertSearchQuery] = useState('');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<LogLevel | 'all'>('all');
  const [alertSortOrder, setAlertSortOrder] = useState<'asc' | 'desc'>('desc');
  const [alertLogPage, setAlertLogPage] = useState(1);
  const [alertsPerPage, setAlertsPerPage] = useState(10);
  const [expandedAlertIds, setExpandedAlertIds] = useState<Set<string>>(new Set());

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
  });
  const [apiLogSortOrder, setApiLogSortOrder] = useState<'asc' | 'desc'>('desc');
  const [apiLogPage, setApiLogPage] = useState(1);
  const [apiLogsPerPage, setApiLogsPerPage] = useState(10);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const applyTrackingSnapshot = useCallback((snapshot: SystemTrackingSnapshot) => {
    if (!snapshot) return;

    if (Array.isArray(snapshot.requests) && snapshot.requests.length > 0) {
      setApiLogs(prev => {
        const backendLogs = snapshot.requests.map(request => ({
          id: request.id,
          timestamp: request.timestamp,
          method: request.method,
          status: request.statusCode,
          url: request.path,
          ip: request.ip || '-',
          duration: request.durationMs,
          user: request.user || 'Guest',
          application: 'GigBridge API',
        }));
        // Merge with existing, dedup by ID
        const existingIds = new Set(backendLogs.map(l => l.id));
        const remaining = prev.filter(l => !existingIds.has(l.id));
        return [...backendLogs, ...remaining].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }

    if (Array.isArray(snapshot.errors)) {
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
        source: error.source,
        externalUrl: error.externalUrl ?? null,
        firstObservedAt: error.firstObservedAt ?? null,
        status: error.status ?? null,
        environment: error.environment ?? null,
        platform: error.platform ?? null,
      })));
    }

    if (Array.isArray(snapshot.alerts)) {
      setAlerts(snapshot.alerts.map(alert => ({
        id: alert.id,
        timestamp: alert.firstObservedAt || new Date().toISOString(),
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        service: alert.metric,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        firstObservedAt: alert.firstObservedAt,
      })));
    }

    if (snapshot.errorMonitoring) {
      setErrorMonitoring(snapshot.errorMonitoring);
    }
  }, []);

  const loadRealtimeSnapshot = useCallback(async () => {
    try {
      const response = await adminGetAPI.getSystemTracking();
      if (response.success && response.data) {
        applyTrackingSnapshot(response.data);
      }
    } catch (e) {
      console.warn('[SystemTracking] Realtime snapshot error:', e);
    }
  }, [applyTrackingSnapshot]);

  const loadSystemTrackingData = useCallback(async () => {
    setIsLoadingTracking(true);
    const failures: ErrorLogEntry[] = [];
    const activeAlerts: SystemAlert[] = [];
    const clientRequestLogs: ApiLog[] = [];

    const callTracked = async <T,>(
      service: string,
      url: string,
      call: () => Promise<ApiResponse<T>>
    ): Promise<ApiResponse<T>> => {
      const startedAt = Date.now();
      try {
        const response = await call();
        const duration = Date.now() - startedAt;

        clientRequestLogs.push({
          id: `${service}_${startedAt}`,
          timestamp: new Date(startedAt).toISOString(),
          method: 'GET',
          status: response.statusCode || (response.success ? 200 : 500),
          url,
          ip: '127.0.0.1',
          duration,
          user: 'Admin',
          application: 'GigBridge Admin',
        });

        if (!response.success) {
          failures.push(toFailureLog(service, url, response));
          activeAlerts.push(toFailureAlert(service, response));
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startedAt;
        const failedResponse: ApiResponse<T> = {
          success: false,
          data: null as T,
          message: error instanceof Error ? error.message : 'Network request failed',
          statusCode: 500,
        };

        clientRequestLogs.push({
          id: `${service}_${startedAt}`,
          timestamp: new Date(startedAt).toISOString(),
          method: 'GET',
          status: 500,
          url,
          ip: '127.0.0.1',
          duration,
          user: 'Admin',
          application: 'GigBridge Admin',
        });

        failures.push(toFailureLog(service, url, failedResponse));
        activeAlerts.push(toFailureAlert(service, failedResponse));
        return failedResponse;
      }
    };

    try {
      const [
        usersResponse,
        jobsResponse,
        proposalsResponse,
        auditResponse,
        snapshotResponse,
      ] = await Promise.allSettled([
        callTracked<PaginatedUsersResponse>(
          'admin-users',
          '/api/admin/users',
          () => adminGetAPI.getUsers({ Page: 1, PageSize: 200 })
        ),
        callTracked<AdminJobPostListResponse>(
          'job-posts',
          '/api/JobPosts/admin/all',
          () => jobGetAPI.getAllJobPosts({ pageIndex: 1, pageSize: 100 })
        ),
        callTracked<ProposalDto[]>(
          'proposals',
          '/api/Proposals/admin/all',
          () => proposalGetAPI.getAllProposals({ PageIndex: 1, PageSize: 200 })
        ),
        callTracked<PageResult<AdminAuditLog>>(
          'admin-audit-logs',
          '/api/admin/audit-logs',
          () => adminGetAPI.getAuditLogs({ page: 1, pageSize: 200 })
        ),
        callTracked<SystemTrackingSnapshot>(
          'system-tracking',
          '/api/admin/system-tracking',
          () => adminGetAPI.getSystemTracking(100)
        ),
      ]);

      const users = (usersResponse.status === 'fulfilled' && usersResponse.value.data?.items) ? usersResponse.value.data.items : [];
      const jobs = (jobsResponse.status === 'fulfilled' && jobsResponse.value.data?.items) ? jobsResponse.value.data.items : [];
      const proposals = (proposalsResponse.status === 'fulfilled' && Array.isArray(proposalsResponse.value.data)) ? proposalsResponse.value.data : [];
      const auditData = (auditResponse.status === 'fulfilled' && auditResponse.value.data?.items) ? auditResponse.value.data.items : [];
      const snapshotData = (snapshotResponse.status === 'fulfilled' && snapshotResponse.value.data) ? snapshotResponse.value.data : null;

      // 1. Users
      setUsersList(users);

      // 2. Audit Logs: Use backend items if available, or generated logs from marketplace entities
      if (auditData.length > 0) {
        setAuditLogs(toBackendAuditLogs(auditData));
      } else {
        setAuditLogs(toAuditLogs(users, jobs, proposals));
      }

      // 3. Error logs & Alerts
      setErrorLogs(failures);
      setAlerts(activeAlerts);

      // 4. API Request Logs: Combine backend telemetry snapshot with live tracked client logs
      let combinedLogs: ApiLog[] = [...clientRequestLogs];
      if (snapshotData && Array.isArray(snapshotData.requests) && snapshotData.requests.length > 0) {
        const backendLogs: ApiLog[] = snapshotData.requests.map(r => ({
          id: r.id,
          timestamp: r.timestamp,
          method: r.method,
          status: r.statusCode,
          url: r.path,
          ip: r.ip || '127.0.0.1',
          duration: r.durationMs,
          user: r.user || 'Guest',
          application: 'GigBridge API',
        }));
        const ids = new Set(backendLogs.map(l => l.id));
        combinedLogs = [...backendLogs, ...clientRequestLogs.filter(l => !ids.has(l.id))];
      }

      setApiLogs(combinedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      // 5. Apply rest of snapshot if present
      if (snapshotData) {
        applyTrackingSnapshot(snapshotData);
      }
    } catch (err) {
      console.error('[SystemTracking] Error in loadSystemTrackingData:', err);
    } finally {
      setIsLoadingTracking(false);
    }
  }, [applyTrackingSnapshot]);

  useEffect(() => {
    loadSystemTrackingData();
  }, [loadSystemTrackingData]);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: number | undefined;
    const connection = createSystemTrackingHubConnection();

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (!disposed) void loadRealtimeSnapshot();
      }, 300);
    };

    connection.on('SystemTrackingUpdated', scheduleRefresh);
    connection.onreconnected(() => {
      setIsLiveConnected(true);
      scheduleRefresh();
    });
    connection.onclose(() => setIsLiveConnected(false));

    connection
      .start()
      .then(() => {
        if (!disposed) setIsLiveConnected(true);
      })
      .catch(() => {
        if (!disposed) setIsLiveConnected(false);
      });

    return () => {
      disposed = true;
      window.clearTimeout(refreshTimer);
      connection.off('SystemTrackingUpdated', scheduleRefresh);
      void connection.stop();
    };
  }, [loadRealtimeSnapshot]);

  // Overall Statistics
  const stats: TrackingStats = useMemo(() => {
    const total = apiLogs.length;
    const errors = apiLogs.filter(l => l.status >= 400).length;
    const rate = total > 0 ? (errors / total) * 100 : 0;
    const avg = total > 0 ? Math.round(apiLogs.reduce((sum, l) => sum + l.duration, 0) / total) : 0;
    const durations = [...apiLogs].map(l => l.duration).sort((a, b) => a - b);
    const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;

    return {
      totalRequests: total,
      errorRequests: errors,
      errorRate: Math.round(rate * 10) / 10,
      avgDuration: avg,
      p95Duration: p95,
      activeAlerts: alerts.length,
      auditCount: auditLogs.length,
    };
  }, [apiLogs, alerts, auditLogs]);

  // Filtered & Paginated API Logs
  const filteredApiLogs = useMemo(() => {
    return apiLogs
      .filter(log => {
        if (apiLogFilters.startDate && new Date(log.timestamp) < new Date(apiLogFilters.startDate)) return false;
        if (apiLogFilters.endDate && new Date(log.timestamp) > new Date(apiLogFilters.endDate)) return false;
        if (apiLogFilters.username && !log.user.toLowerCase().includes(apiLogFilters.username.toLowerCase())) return false;
        if (apiLogFilters.url && !log.url.toLowerCase().includes(apiLogFilters.url.toLowerCase())) return false;
        if (apiLogFilters.minDuration && log.duration < parseInt(apiLogFilters.minDuration)) return false;
        if (apiLogFilters.maxDuration && log.duration > parseInt(apiLogFilters.maxDuration)) return false;
        if (apiLogFilters.method && log.method !== apiLogFilters.method) return false;
        if (apiLogFilters.status && !log.status.toString().startsWith(apiLogFilters.status)) return false;
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return apiLogSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [apiLogs, apiLogFilters, apiLogSortOrder]);

  const paginatedApiLogs = useMemo(() => {
    const start = (apiLogPage - 1) * apiLogsPerPage;
    return filteredApiLogs.slice(start, start + apiLogsPerPage);
  }, [filteredApiLogs, apiLogPage, apiLogsPerPage]);

  const totalApiLogPages = Math.ceil(filteredApiLogs.length / apiLogsPerPage);

  // Filtered & Paginated Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        if (auditCategoryFilter !== 'all' && getActionCategory(log.action) !== auditCategoryFilter) {
          return false;
        }
        if (auditSearchQuery.trim()) {
          const q = auditSearchQuery.toLowerCase();
          const matchAction = log.action.toLowerCase().includes(q);
          const matchUser = log.userName.toLowerCase().includes(q);
          const matchResource = log.resource.toLowerCase().includes(q);
          const matchDetails = log.details.toLowerCase().includes(q);
          const matchCid = log.correlationId?.toLowerCase().includes(q);
          if (!matchAction && !matchUser && !matchResource && !matchDetails && !matchCid) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return auditSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [auditLogs, auditCategoryFilter, auditSearchQuery, auditSortOrder]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditLogPage - 1) * auditLogsPerPage;
    return filteredAuditLogs.slice(start, start + auditLogsPerPage);
  }, [filteredAuditLogs, auditLogPage, auditLogsPerPage]);

  const totalAuditLogPages = Math.ceil(filteredAuditLogs.length / auditLogsPerPage);

  // Filtered & Paginated Error Logs
  const filteredErrorLogs = useMemo(() => {
    return errorLogs
      .filter(log => {
        if (errorLevelFilter !== 'all' && log.level !== errorLevelFilter) {
          return false;
        }
        if (errorSearchQuery.trim()) {
          const q = errorSearchQuery.toLowerCase();
          const matchMessage = log.message.toLowerCase().includes(q);
          const matchService = log.service.toLowerCase().includes(q);
          const matchPlatform = log.platform?.toLowerCase().includes(q);
          const matchRequestId = log.requestId?.toLowerCase().includes(q);
          if (!matchMessage && !matchService && !matchPlatform && !matchRequestId) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return errorSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [errorLogs, errorLevelFilter, errorSearchQuery, errorSortOrder]);

  const paginatedErrorLogs = useMemo(() => {
    const start = (errorLogPage - 1) * errorLogsPerPage;
    return filteredErrorLogs.slice(start, start + errorLogsPerPage);
  }, [filteredErrorLogs, errorLogPage, errorLogsPerPage]);

  const totalErrorLogPages = Math.ceil(filteredErrorLogs.length / errorLogsPerPage);

  // Filtered & Paginated Alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(alert => {
        if (alertSeverityFilter !== 'all' && alert.severity !== alertSeverityFilter) {
          return false;
        }
        if (alertSearchQuery.trim()) {
          const q = alertSearchQuery.toLowerCase();
          const matchTitle = alert.title.toLowerCase().includes(q);
          const matchDesc = alert.description.toLowerCase().includes(q);
          const matchService = alert.service.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchService) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return alertSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [alerts, alertSeverityFilter, alertSearchQuery, alertSortOrder]);

  const paginatedAlerts = useMemo(() => {
    const start = (alertLogPage - 1) * alertsPerPage;
    return filteredAlerts.slice(start, start + alertsPerPage);
  }, [filteredAlerts, alertLogPage, alertsPerPage]);

  const totalAlertLogPages = Math.ceil(filteredAlerts.length / alertsPerPage);

  // Expand / Collapse Handlers
  const toggleAuditExpand = useCallback((id: string) => {
    setExpandedAuditIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllAuditExpand = useCallback(() => {
    if (expandedAuditIds.size === paginatedAuditLogs.length && paginatedAuditLogs.length > 0) {
      setExpandedAuditIds(new Set());
    } else {
      setExpandedAuditIds(new Set(paginatedAuditLogs.map(l => l.id)));
    }
  }, [expandedAuditIds.size, paginatedAuditLogs]);

  const toggleErrorExpand = useCallback((id: string) => {
    setExpandedErrorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllErrorExpand = useCallback(() => {
    if (expandedErrorIds.size === paginatedErrorLogs.length && paginatedErrorLogs.length > 0) {
      setExpandedErrorIds(new Set());
    } else {
      setExpandedErrorIds(new Set(paginatedErrorLogs.map(l => l.id)));
    }
  }, [expandedErrorIds.size, paginatedErrorLogs]);

  const toggleAlertExpand = useCallback((id: string) => {
    setExpandedAlertIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllAlertExpand = useCallback(() => {
    if (expandedAlertIds.size === paginatedAlerts.length && paginatedAlerts.length > 0) {
      setExpandedAlertIds(new Set());
    } else {
      setExpandedAlertIds(new Set(paginatedAlerts.map(l => l.id)));
    }
  }, [expandedAlertIds.size, paginatedAlerts]);

  // Export Data
  const handleExportAllJson = useCallback(() => {
    exportJson(
      {
        exportedAt: new Date().toISOString(),
        stats,
        requests: filteredApiLogs,
        activities: filteredAuditLogs,
        errors: filteredErrorLogs,
        alerts: filteredAlerts,
      },
      `system-tracking-${new Date().toISOString().slice(0, 10)}.json`
    );
  }, [stats, filteredApiLogs, filteredAuditLogs, filteredErrorLogs, filteredAlerts]);

  return {
    // Navigation & General
    activeTab,
    setActiveTab,
    stats,
    isLoadingTracking,
    isLiveConnected,
    copiedId,
    handleCopy,
    handleExportAllJson,
    loadSystemTrackingData,
    loadRealtimeSnapshot,
    errorMonitoring,
    usersList,
    userMap,

    // Tab 1: API Logs
    apiLogs,
    filteredApiLogs,
    paginatedApiLogs,
    apiLogFilters,
    setApiLogFilters,
    apiLogSortOrder,
    setApiLogSortOrder,
    apiLogPage,
    setApiLogPage,
    apiLogsPerPage,
    setApiLogsPerPage,
    totalApiLogPages,
    showAdvancedFilters,
    setShowAdvancedFilters,

    // Tab 2: Recent Activity
    auditLogs,
    filteredAuditLogs,
    paginatedAuditLogs,
    auditSearchQuery,
    setAuditSearchQuery,
    auditCategoryFilter,
    setAuditCategoryFilter,
    auditSortOrder,
    setAuditSortOrder,
    auditLogPage,
    setAuditLogPage,
    auditLogsPerPage,
    setAuditLogsPerPage,
    totalAuditLogPages,
    expandedAuditIds,
    toggleAuditExpand,
    toggleAllAuditExpand,
    globalAuditViewMode,
    setGlobalAuditViewMode,

    // Tab 3: Error Logs
    errorLogs,
    filteredErrorLogs,
    paginatedErrorLogs,
    errorSearchQuery,
    setErrorSearchQuery,
    errorLevelFilter,
    setErrorLevelFilter,
    errorSortOrder,
    setErrorSortOrder,
    errorLogPage,
    setErrorLogPage,
    errorLogsPerPage,
    setErrorLogsPerPage,
    totalErrorLogPages,
    expandedErrorIds,
    toggleErrorExpand,
    toggleAllErrorExpand,

    // Tab 4: System Alerts
    alerts,
    filteredAlerts,
    paginatedAlerts,
    alertSearchQuery,
    setAlertSearchQuery,
    alertSeverityFilter,
    setAlertSeverityFilter,
    alertSortOrder,
    setAlertSortOrder,
    alertLogPage,
    setAlertLogPage,
    alertsPerPage,
    setAlertsPerPage,
    totalAlertLogPages,
    expandedAlertIds,
    toggleAlertExpand,
    toggleAllAlertExpand,
  };
}
