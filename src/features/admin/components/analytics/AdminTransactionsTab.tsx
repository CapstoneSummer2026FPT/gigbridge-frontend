import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Filter,
  X,
  Receipt,
  Inbox,
} from 'lucide-react';
import type {
  AdminTransactionItem,
  AdminTransactionPage,
  TransactionFilters,
} from '../../../../types/adminAnalytics';
import {
  CHART_COLORS,
  formatMoney,
  formatNumber,
  pivot,
} from '../../utils/analyticsUtils';
import { AnalyticsChartPanel } from './AnalyticsChartPanel';
import { AnalyticsPagination } from './AnalyticsPagination';
import { SeriesTable } from './SeriesTable';
import { useTranslation } from '../../../../hooks/useTranslation';
import { showValidationToast } from '../../../../shared/utils/validationToast';

export interface AdminTransactionsTabProps {
  data: AdminTransactionPage;
  filters: TransactionFilters;
  page: number;
  onFilters: (filters: TransactionFilters) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminTransactionsTab({
  data,
  filters,
  page,
  onFilters,
  onPrevious,
  onNext,
}: AdminTransactionsTabProps) {
  const { t } = useTranslation('admin');
  const [selected, setSelected] = useState<AdminTransactionItem | null>(null);
  const [textFilters, setTextFilters] = useState({
    gateway: filters.gateway ?? '',
    userId: filters.userId ?? '',
    contractId: filters.contractId ?? '',
  });
  const [textFilterError, setTextFilterError] = useState<string | null>(null);
  const userIdRef = useRef<HTMLInputElement>(null);
  const contractIdRef = useRef<HTMLInputElement>(null);

  const countRows = useMemo(() => pivot(data.countSeries ?? []), [data.countSeries]);
  const typeKeys = useMemo(
    () => [...new Set((data.countSeries ?? []).map(point => point.series))],
    [data.countSeries]
  );

  const pageSize = data.pageSize || filters.pageSize || 20;
  const pageCount = Math.max(1, Math.ceil((data.filteredCount ?? 0) / pageSize));
  const items = data.items ?? [];
  const from = (page - 1) * pageSize;
  const to = Math.min(from + items.length, data.filteredCount ?? 0);

  useEffect(() => {
    setTextFilters({
      gateway: filters.gateway ?? '',
      userId: filters.userId ?? '',
      contractId: filters.contractId ?? '',
    });
  }, [filters.gateway, filters.userId, filters.contractId]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!selected) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  const applyTextFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = textFilters.userId.trim();
    const contractId = textFilters.contractId.trim();

    if ((userId && !UUID_REGEX.test(userId)) || (contractId && !UUID_REGEX.test(contractId))) {
      const message = t('adminAnalytics.transactions.uuidError', { defaultValue: 'User ID and Contract ID must be valid 36-character UUIDs.' });
      setTextFilterError(message);
      showValidationToast(message, { fallback: message });
      if (userId && !UUID_REGEX.test(userId)) userIdRef.current?.focus();
      else contractIdRef.current?.focus();
      return;
    }
    setTextFilterError(null);
    onFilters({
      ...filters,
      gateway: textFilters.gateway.trim() || undefined,
      userId: userId || undefined,
      contractId: contractId || undefined,
      cursor: undefined,
    });
  };

  return (
    <div className="analytics-stack">
      {/* Search & Comprehensive Filters Bar */}
      <form
        className="analytics-filter-bar"
        aria-label="Transaction filters"
        onSubmit={applyTextFilters}
        noValidate
      >
        <div className="analytics-filter-group">
          <label>
            <span>{t('adminAnalytics.transactions.type', { defaultValue: 'Transaction Type' })}</span>
            <select
              value={filters.type ?? ''}
              onChange={e =>
                onFilters({
                  ...filters,
                  type: e.target.value === '' ? undefined : Number(e.target.value),
                  cursor: undefined,
                })
              }
            >
              <option value="">{t('adminAnalytics.transactions.allTypes', { defaultValue: 'All Types' })}</option>
              {(data.typeBreakdown ?? []).map(type => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('adminAnalytics.transactions.status', { defaultValue: 'Settlement Status' })}</span>
            <select
              value={filters.status ?? ''}
              onChange={e =>
                onFilters({
                  ...filters,
                  status: e.target.value === '' ? undefined : Number(e.target.value),
                  cursor: undefined,
                })
              }
            >
              <option value="">{t('adminAnalytics.transactions.allStatuses', { defaultValue: 'All Statuses' })}</option>
              {(data.statusBreakdown ?? []).map(status => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('adminAnalytics.transactions.revenueSource', { defaultValue: 'Revenue Source' })}</span>
            <select
              value={filters.revenueSource ?? ''}
              onChange={e =>
                onFilters({
                  ...filters,
                  revenueSource: e.target.value === '' ? undefined : Number(e.target.value),
                  cursor: undefined,
                })
              }
            >
              <option value="">{t('adminAnalytics.transactions.allSources', { defaultValue: 'All Sources' })}</option>
              <option value="0">Contract funding fee</option>
              <option value="1">Contract release fee</option>
              <option value="2">Subscription purchase</option>
              <option value="3">Job promotion</option>
              <option value="4">Profile promotion</option>
              <option value="5">Promotion boost</option>
              <option value="6">Withdrawal fee</option>
            </select>
          </label>

          <label>
            <span>{t('adminAnalytics.transactions.gateway', { defaultValue: 'Payment Gateway' })}</span>
            <input
              ref={userIdRef}
              value={textFilters.gateway}
              onChange={e => setTextFilters(curr => ({ ...curr, gateway: e.target.value }))}
              placeholder="e.g. Stripe, VNPay..."
            />
          </label>

          <label>
            <span>{t('adminAnalytics.transactions.userId', { defaultValue: 'User UUID' })}</span>
            <input
              ref={contractIdRef}
              value={textFilters.userId}
              onChange={e => setTextFilters(curr => ({ ...curr, userId: e.target.value }))}
              placeholder="UUID"
              aria-invalid={Boolean(textFilterError && textFilters.userId)}
            />
          </label>

          <label>
            <span>{t('adminAnalytics.transactions.contractId', { defaultValue: 'Contract UUID' })}</span>
            <input
              value={textFilters.contractId}
              onChange={e => setTextFilters(curr => ({ ...curr, contractId: e.target.value }))}
              placeholder="UUID"
              aria-invalid={Boolean(textFilterError && textFilters.contractId)}
            />
          </label>
        </div>

        <div className="analytics-filter-footer">
          <button type="submit" className="analytics-primary-btn">
            <Filter size={14} />
            <span>{t('adminAnalytics.transactions.applyFilters', { defaultValue: 'Apply Filters' })}</span>
          </button>
        </div>
      </form>

      {/* Ledger Status KPI Cards */}
      <section className="analytics-kpis">
        {(data.statusBreakdown ?? []).map(item => (
          <article key={item.key} className="analytics-metric-card">
            <div className="analytics-metric-header">
              <span className="analytics-metric-label">{item.label}</span>
              <Receipt size={16} className="text-text-muted" />
            </div>
            <div className="analytics-metric-body">
              <div className="analytics-metric-value">{(item.count ?? 0).toLocaleString()}</div>
              <span className="analytics-metric-sub">
                {t('adminAnalytics.tabs.transactions', { defaultValue: 'Ledger transactions' })}
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* Stacked Ledger Activity Chart (Clickable Segments) */}
      <AnalyticsChartPanel
        title={t('adminAnalytics.transactions.chartTitle', { defaultValue: 'Ledger Transaction Distribution' })}
        subtitle={t('adminAnalytics.transactions.chartSubtitle', { defaultValue: 'Transaction count distribution; click any segment on the chart to filter the ledger table' })}
        table={<SeriesTable points={data.countSeries ?? []} />}
      >
        {countRows.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countRows} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 8, fontSize: '0.8rem' }} />
              {typeKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="count"
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  cursor="pointer"
                  radius={[2, 2, 0, 0]}
                  onClick={() => {
                    const match = (data.typeBreakdown ?? []).find(t => t.label.replaceAll(' ', '') === key);
                    if (match) onFilters({ ...filters, type: Number(match.key), cursor: undefined });
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="analytics-chart-empty">
            <Inbox size={28} className="text-text-muted mb-2 opacity-50" />
            <span>{t('adminAnalytics.transactions.emptyChart', { defaultValue: 'No ledger transaction series recorded for this filter selection.' })}</span>
          </div>
        )}
      </AnalyticsChartPanel>

      {/* Main Ledger Table Panel */}
      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <div className="analytics-panel-titles">
            <h2>{t('adminAnalytics.transactions.tableTitle', { defaultValue: 'Wallet Transaction Ledger' })}</h2>
            <p className="analytics-panel-subtitle">
              {t('adminAnalytics.transactions.tableSubtitle', {
                count: (data.filteredCount ?? 0).toLocaleString(),
                defaultValue: `${(data.filteredCount ?? 0).toLocaleString()} matching records · GigCoin and VND values are recorded independently`
              })}
            </p>
          </div>
        </header>

        <div className="analytics-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('adminAnalytics.transactions.occurredAt', { defaultValue: 'Occurred At' })}</th>
                <th>{t('adminAnalytics.transactions.accountUser', { defaultValue: 'Account / User' })}</th>
                <th>{t('adminAnalytics.shared.page', { defaultValue: 'Type' })}</th>
                <th>{t('adminAnalytics.transactions.direction', { defaultValue: 'Direction' })}</th>
                <th className="text-right">{t('adminAnalytics.transactions.gigCoin', { defaultValue: 'GigCoin' })}</th>
                <th className="text-right">{t('adminAnalytics.transactions.vnd', { defaultValue: 'VND' })}</th>
                <th>{t('adminAnalytics.transactions.status', { defaultValue: 'Status' })}</th>
                <th>{t('adminAnalytics.transactions.revenueSource', { defaultValue: 'Revenue Source' })}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  onClick={() => setSelected(item)}
                  onKeyDown={e => e.key === 'Enter' && setSelected(item)}
                  className="analytics-clickable-row"
                >
                  <td>
                    <span className="font-mono text-xs text-text-muted">
                      {new Date(item.occurredAt).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <a
                      href={`/admin/users?preview=${encodeURIComponent(item.userId)}`}
                      className="font-bold text-brand hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {item.userName}
                    </a>
                  </td>
                  <td>
                    <span className="analytics-table-badge">{item.typeLabel}</span>
                  </td>
                  <td>
                    <span className={`analytics-direction-badge ${(item.direction ?? '').toLowerCase()}`}>
                      {item.direction}
                    </span>
                  </td>
                  <td className="text-right font-mono font-bold text-amber-500">
                    {formatNumber(item.gigCoinAmount)} GC
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(item.vndAmount)} ₫
                  </td>
                  <td>
                    <span className={`analytics-status-pill ${(item.statusLabel ?? '').toLowerCase()}`}>
                      {item.statusLabel}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-text-muted">{item.revenueSource ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="analytics-empty">
            <span>{t('adminAnalytics.transactions.empty', { defaultValue: 'No transactions match the selected criteria.' })}</span>
          </div>
        )}

        <AnalyticsPagination
          page={page}
          pageCount={pageCount}
          from={from}
          to={to}
          total={data.filteredCount ?? 0}
          onPage={target => (target < page ? onPrevious() : onNext())}
          canPrevious={page > 1}
          canNext={Boolean(data.nextCursor)}
          noun="transactions"
        />
      </section>

      {/* Transaction Inspection Drawer */}
      {selected && (
        <div
          className="analytics-drawer-backdrop"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <aside
            className="analytics-drawer"
            aria-label="Transaction details"
            onClick={e => e.stopPropagation()}
          >
            <div className="analytics-drawer-header">
              <div>
                <span className="analytics-eyebrow">{t('adminAnalytics.transactions.ledgerEntry', { defaultValue: 'Ledger Entry' })}</span>
                <h2>{t('adminAnalytics.transactions.detailTitle', { defaultValue: 'Transaction Detail' })}</h2>
              </div>
              <button
                type="button"
                className="analytics-close-btn"
                aria-label="Close details"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="analytics-drawer-body">
              <dl className="analytics-drawer-list">
                <div>
                  <dt>{t('adminAnalytics.transactions.transactionId', { defaultValue: 'Transaction ID' })}</dt>
                  <dd className="font-mono">{selected.id}</dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.accountUser', { defaultValue: 'User / Account' })}</dt>
                  <dd>
                    <a
                      href={`/admin/users?preview=${encodeURIComponent(selected.userId)}`}
                      className="text-brand font-bold hover:underline"
                    >
                      {selected.userName}
                    </a>
                    <span className="block font-mono text-xs text-text-muted mt-0.5">{selected.userId}</span>
                  </dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.linkedContract', { defaultValue: 'Linked Contract' })}</dt>
                  <dd>{selected.contractTitle ?? selected.contractId ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.gateway', { defaultValue: 'Payment Gateway' })}</dt>
                  <dd>{selected.gateway ?? 'Internal / Escrow'}</dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.externalReference', { defaultValue: 'External Reference' })}</dt>
                  <dd className="font-mono">{selected.reference ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.amountSettled', { defaultValue: 'Amount Settled' })}</dt>
                  <dd>
                    <span className="text-amber-500 font-bold font-mono mr-2">{formatNumber(selected.gigCoinAmount)} GigCoin</span>
                    <span className="text-emerald-500 font-bold font-mono">({formatMoney(selected.vndAmount)} ₫)</span>
                  </dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.adminNote', { defaultValue: 'Admin Note' })}</dt>
                  <dd>{selected.note ?? t('adminAnalytics.transactions.noNotes', { defaultValue: 'No notes provided.' })}</dd>
                </div>
                <div>
                  <dt>{t('adminAnalytics.transactions.metadataPayload', { defaultValue: 'Metadata Payload' })}</dt>
                  <dd className="font-mono text-xs bg-surface-muted p-2.5 rounded-lg overflow-x-auto">
                    {selected.metadata ?? '{}'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminTransactionsTab;
