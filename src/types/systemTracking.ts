export type TrackingHealth = 'healthy' | 'degraded' | 'unavailable';
export type TrackingSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SystemRequestLog {
  id: string;
  timestamp: string;
  method: string;
  statusCode: number;
  path: string;
  durationMs: number;
  requestId: string;
}

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  level: TrackingSeverity;
  service: string;
  message: string;
  requestId: string;
  count: number;
  source: string;
  externalUrl?: string | null;
  firstObservedAt?: string | null;
  status?: string | null;
  environment?: string | null;
  platform?: string | null;
}

export interface SystemAlert {
  id: string;
  severity: TrackingSeverity;
  title: string;
  description: string;
  metric: string;
  value: string;
  threshold: string;
  firstObservedAt: string;
}

export interface AiUsageBaseline {
  configured: boolean;
  source: string;
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  dailyUsage: unknown[];
}

export interface SystemTrackingSnapshot {
  generatedAt: string;
  environment: string;
  startedAt: string;
  uptimeSeconds: number;
  retentionMode: string;
  retainedEntryLimit: number;
  overview: {
    status: TrackingHealth;
    totalRequests: number;
    errorRequests: number;
    errorRatePercent: number;
    averageResponseMs: number;
    p95ResponseMs: number;
    activeAlerts: number;
  };
  requests: SystemRequestLog[];
  errors: SystemErrorLog[];
  alerts: SystemAlert[];
  aiUsage: AiUsageBaseline;
  errorMonitoring: {
    configured: boolean;
    available: boolean;
    provider: string;
    message: string;
  };
}
