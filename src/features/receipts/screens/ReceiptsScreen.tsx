import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Download, Eye, FileCheck2, Inbox, Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { receiptAPI } from '../../../api/receiptAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { ProjectReceiptSummary } from '../../../types/models/Receipt';
import { ReceiptDetailDialog } from '../components/ReceiptDetailDialog';
import { ReceiptStatusBadge } from '../components/ReceiptStatusBadge';
import { receiptFileName, saveReceiptBlob } from '../utils/receiptDownload';
import { useProjectReceiptRevisionEvent } from '../hooks/useProjectReceiptRevisionEvent';

const PAGE_SIZE = 10;

export default function ReceiptsScreen() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [receipts, setReceipts] = useState<ProjectReceiptSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ProjectReceiptSummary | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadReceipts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const response = await receiptAPI.getMine(page, PAGE_SIZE);
    if (response.success && response.data) {
      setReceipts(response.data.items);
      setTotalPages(Math.max(1, response.data.totalPages));
      setTotalCount(response.data.totalCount);
      setError(null);
    } else {
      setReceipts([]);
      setError(response.message || t('receipts.loadError'));
    }
    if (!silent) setLoading(false);
  }, [page, t]);

  useEffect(() => { void loadReceipts(); }, [loadReceipts]);

  useProjectReceiptRevisionEvent(
    event => {
      const current = receipts.find(receipt => receipt.receiptId === event.receiptId);
      if (!current || event.revision <= current.revision) return;
      if (event.changeKind === 'deleted') {
        setReceipts(items => items.filter(item => item.receiptId !== event.receiptId));
        return;
      }
      void receiptAPI.getStatus(event.receiptId).then(response => {
        if (!response.success || !response.data) return;
        const updated = response.data;
        setReceipts(items => items.map(item => item.receiptId === event.receiptId ? updated : item));
      });
    },
    () => void loadReceipts(true),
  );

  useEffect(() => {
    const requestedId = searchParams.get('receiptId');
    if (!requestedId || loading) return;
    const match = receipts.find(receipt => receipt.receiptId === requestedId);
    if (match) setSelectedReceipt(match);
  }, [loading, receipts, searchParams]);

  const closeDetail = () => {
    setSelectedReceipt(null);
    if (searchParams.has('receiptId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('receiptId');
      setSearchParams(next, { replace: true });
    }
  };

  const download = async (receipt: ProjectReceiptSummary) => {
    const response = await receiptAPI.download(receipt.receiptId);
    if (response.success && response.data) {
      saveReceiptBlob(response.data, receiptFileName(receipt.receiptNumber));
    } else {
      toast.error(response.message || t('receipts.downloadError'));
    }
  };

  const retry = async (receipt: ProjectReceiptSummary) => {
    setRetryingId(receipt.receiptId);
    const response = await receiptAPI.retry(receipt.receiptId);
    setRetryingId(null);
    if (response.success) {
      toast.success(t(receipt.emailStatus === 'Failed' ? 'receipts.emailRetryQueued' : 'receipts.generationRetryQueued'));
      await loadReceipts();
    } else {
      toast.error(response.message || t('receipts.retryError'));
    }
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8 min-w-0">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2.5 sm:gap-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand"><FileCheck2 size={22} /></span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{t('receipts.title')}</h1>
            </div>
            <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">{t('receipts.subtitle')}</p>
          </div>
          <span className="self-start sm:self-auto rounded-full border border-border bg-card px-3 py-1 text-xs sm:text-sm font-bold text-muted-foreground">
            {t('receipts.total', { count: totalCount })}
          </span>
        </header>

        {loading ? (
          <div className="flex min-h-60 sm:min-h-72 items-center justify-center gap-3 rounded-2xl sm:rounded-3xl border border-border bg-card/40 text-xs sm:text-sm text-muted-foreground"><Loader2 className="animate-spin" /> {t('receipts.loading')}</div>
        ) : error ? (
          <div className="rounded-2xl sm:rounded-3xl border border-destructive/30 bg-destructive/5 p-6 sm:p-10 text-center">
            <p className="mb-4 text-xs sm:text-sm text-destructive">{error}</p>
            <button type="button" onClick={() => void loadReceipts()} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-brand-foreground"><RefreshCw size={15} /> {t('receipts.retry')}</button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card/40 p-8 sm:p-12 text-center">
            <Inbox size={40} className="mx-auto mb-3 sm:mb-4 text-muted-foreground/40" />
            <h2 className="text-base sm:text-lg font-black text-foreground">{t('receipts.emptyTitle')}</h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t('receipts.emptyDescription')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map(receipt => (
              <article key={receipt.receiptId} className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 shadow-xs hover:shadow-sm transition hover:border-brand/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black uppercase tracking-wider text-brand">{receipt.receiptNumber}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground">{t(`receipts.type.${receipt.receiptType.toLowerCase()}`)}</span>
                    </div>
                    <h2 className="text-sm sm:text-base font-black text-foreground break-words">{receipt.projectTitle}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t('receipts.issuedOn', { date: new Date(receipt.issuedAt).toLocaleString() })}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      <ReceiptStatusBadge receipt={receipt} kind="document" />
                      <ReceiptStatusBadge receipt={receipt} kind="email" />
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border/50 shrink-0">
                    {receipt.canRetry && (
                      <button type="button" onClick={() => void retry(receipt)} disabled={retryingId === receipt.receiptId} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 disabled:opacity-50 dark:text-amber-400 min-h-[38px]">
                        {retryingId === receipt.receiptId ? <Loader2 size={14} className="animate-spin" /> : receipt.emailStatus === 'Failed' ? <Mail size={14} /> : <RefreshCw size={14} />}
                        <span>{t(receipt.emailStatus === 'Failed' ? 'receipts.retryEmail' : 'receipts.retryGeneration')}</span>
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedReceipt(receipt)} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted min-h-[38px]">
                      <Eye size={14} />
                      <span>{t('receipts.viewDetails')}</span>
                    </button>
                    <button type="button" onClick={() => void download(receipt)} disabled={!receipt.downloadReady} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50 min-h-[38px]">
                      <Download size={14} />
                      <span>{t('receipts.download')}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label={t('receipts.pagination')}>
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded-xl border border-border p-2 disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center"><ChevronLeft size={18} /></button>
            <span className="text-xs sm:text-sm font-bold text-muted-foreground">{t('receipts.pageOf', { page, total: totalPages })}</span>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(current => Math.min(totalPages, current + 1))} className="rounded-xl border border-border p-2 disabled:opacity-40 min-h-[36px] min-w-[36px] flex items-center justify-center"><ChevronRight size={18} /></button>
          </nav>
        )}
      </main>

      <ReceiptDetailDialog receipt={selectedReceipt} open={Boolean(selectedReceipt)} onClose={closeDetail} />
    </AppLayout>
  );
}

