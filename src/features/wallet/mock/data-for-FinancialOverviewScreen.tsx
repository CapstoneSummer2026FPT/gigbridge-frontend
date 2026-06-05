export type ClientCashFlowStatus = 'escrow' | 'released' | 'spent' | 'subscription';

export interface ClientCashFlowRecord {
  id: string;
  date: string;
  label: string;
  project: string;
  amountVnd: number;
  status: ClientCashFlowStatus;
}

export const CLIENT_CASH_FLOW_RECORDS: ClientCashFlowRecord[] = [
  { id: 'cf_1', date: '2026-01-12', label: 'Milestone escrow funded', project: 'SaaS Analytics Dashboard', amountVnd: 37500000, status: 'escrow' },
  { id: 'cf_2', date: '2026-01-26', label: 'Milestone released', project: 'SaaS Analytics Dashboard', amountVnd: 22500000, status: 'released' },
  { id: 'cf_3', date: '2026-02-09', label: 'GigBridge Pro subscription', project: 'Subscription', amountVnd: 750000, status: 'subscription' },
  { id: 'cf_4', date: '2026-02-18', label: 'Mobile redesign escrow', project: 'Booking App Redesign', amountVnd: 52000000, status: 'escrow' },
  { id: 'cf_5', date: '2026-03-02', label: 'Payment released', project: 'Booking App Redesign', amountVnd: 31000000, status: 'released' },
  { id: 'cf_6', date: '2026-03-19', label: 'Final invoice paid', project: 'Landing Page Sprint', amountVnd: 18500000, status: 'spent' },
  { id: 'cf_7', date: '2026-04-04', label: 'Escrow funded', project: 'Data Pipeline Audit', amountVnd: 64000000, status: 'escrow' },
  { id: 'cf_8', date: '2026-04-28', label: 'Milestone released', project: 'Data Pipeline Audit', amountVnd: 41000000, status: 'released' },
  { id: 'cf_9', date: '2026-05-08', label: 'Escrow funded', project: 'AI Interview Module', amountVnd: 72000000, status: 'escrow' },
  { id: 'cf_10', date: '2026-05-22', label: 'Subscription renewal', project: 'Subscription', amountVnd: 750000, status: 'subscription' },
  { id: 'cf_11', date: '2026-06-01', label: 'Payment released', project: 'AI Interview Module', amountVnd: 36000000, status: 'released' },
];

export function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getQuarter(date: Date) {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}
