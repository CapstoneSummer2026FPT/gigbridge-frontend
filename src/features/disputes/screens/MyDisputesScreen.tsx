import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Eye, RotateCcw, Scale } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { DisputeStatus, type MyDisputeSummary } from '../../../types/models/Dispute';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/dispute-detail-screen.css';

const PAGE_SIZE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
}

export default function MyDisputesScreen() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();

  const statusLabels: Record<DisputeStatus, string> = {
    [DisputeStatus.WaitingAdmin]: t('myDisputes.statusWaitingAdmin', 'Waiting Admin'),
    [DisputeStatus.InProgress]: t('myDisputes.statusInProgress', 'In Progress'),
    [DisputeStatus.Resolved]: t('myDisputes.statusResolved', 'Resolved'),
    [DisputeStatus.Closed]: t('myDisputes.statusClosed', 'Closed'),
  };

  const [items, setItems] = useState<MyDisputeSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const loadDisputes = useCallback(async (targetPage: number) => {
    setLoading(true);
    setErrorText(null);
    try {
      const response = await disputeGetAPI.getMyDisputes(targetPage, PAGE_SIZE);
      if (response.success && response.data) {
        setItems(response.data.items);
        setTotalItems(response.data.totalItems);
      } else {
        setErrorText(response.message || t('myDisputes.errorFallback', 'Failed to load your disputes.'));
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : t('myDisputes.errorGeneric', 'Something went wrong while loading your disputes.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDisputes(page);
  }, [loadDisputes, page]);

  return (
    <AppLayout fullWidth>
      <div className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        <header className="border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
              <Scale size={14} />
              {t('myDisputes.kicker', 'My Disputes')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
              {t('myDisputes.title', 'My Disputes')}
            </h1>
            <p className="text-xs font-semibold text-text-muted">
              {t('myDisputes.subtitle', "View all disputes related to your contracts.")}
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center p-12 my-auto">
              <LemniscateBloomLoader label={t('myDisputes.loading', 'Loading your disputes...')} size={52} />
            </div>
          ) : errorText ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-border p-12 text-center">
              <AlertTriangle size={40} className="text-rose-500" />
              <p className="text-sm font-semibold text-text-primary">{errorText}</p>
              <button
                type="button"
                onClick={() => void loadDisputes(page)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90"
              >
                <RotateCcw size={14} />
                {t('myDisputes.retry', 'Retry')}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-border p-12 text-center">
              <Scale size={40} className="text-text-muted" />
              <p className="text-sm font-semibold text-text-primary">{t('myDisputes.emptyTitle', 'No disputes yet')}</p>
              <p className="text-xs text-text-muted">{t('myDisputes.emptySubtitle', "Disputes you're involved in will show up here.")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[720px] table-fixed text-left text-xs">
                  <thead className="bg-surface-muted/60 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="w-[8%] px-4 py-3">{t('myDisputes.columnStt', 'STT')}</th>
                      <th className="w-[34%] px-4 py-3">{t('myDisputes.columnProject', 'Project Name')}</th>
                      <th className="w-[18%] px-4 py-3">{t('myDisputes.columnDate', 'Date')}</th>
                      <th className="w-[20%] px-4 py-3">{t('myDisputes.columnStatus', 'Status')}</th>
                      <th className="w-[20%] px-4 py-3 text-right">{t('myDisputes.columnAction', 'View Detail')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, index) => (
                      <tr key={item.disputeId} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3 font-semibold text-text-muted">
                          {(page - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-4 py-3 font-bold text-text-primary">{item.projectName}</td>
                        <td className="px-4 py-3 text-text-muted">{formatDate(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`dispute-status dispute-status-${item.status}`}>
                            {statusLabels[item.status] ?? `Status ${item.status}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/contracts/${item.contractId}/disputes/${item.disputeId}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-text-primary transition hover:border-brand hover:text-brand"
                          >
                            <Eye size={13} />
                            {t('myDisputes.viewDetail', 'View Detail')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                  <span>
                    {t('myDisputes.showing', 'Showing {{from}}-{{to}} of {{total}}', {
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, totalItems),
                      total: totalItems,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                      className="rounded-lg border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t('myDisputes.prev', 'Prev')}
                    </button>
                    <span>{page} / {totalPages}</span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                      className="rounded-lg border border-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t('myDisputes.next', 'Next')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
