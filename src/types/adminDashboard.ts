export type AdminDashboardDays = 7 | 30 | 90;

export interface AdminDashboardRange {
  days: AdminDashboardDays;
  currentFromUtc: string;
  currentToUtc: string;
  comparisonFromUtc: string;
  comparisonToUtc: string;
  timeZone: string;
}

export interface AdminDashboardCountMetric {
  value: number;
  periodValue: number;
  comparisonValue: number;
  changePercent: number | null;
}

export interface AdminDashboardMoneyMetric {
  value: number;
  comparisonValue: number;
  changePercent: number | null;
  unit: string;
}

export interface AdminDashboardActivityPoint {
  bucket: string;
  users: number;
  jobPosts: number;
  proposals: number;
  contracts: number;
}

export interface AdminDashboardWorkQueue {
  reports: number;
  contractReports: number;
  disputes: number;
  withdrawals: number;
}

export interface AdminDashboardSummary {
  generatedAt: string;
  range: AdminDashboardRange;
  marketplaceUsers: AdminDashboardCountMetric;
  openJobPosts: AdminDashboardCountMetric;
  activeContracts: AdminDashboardCountMetric;
  marketplaceGmv: AdminDashboardMoneyMetric;
  activity: AdminDashboardActivityPoint[];
  workQueue: AdminDashboardWorkQueue;
}
