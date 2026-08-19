import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileCheck2, Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { receiptAPI } from '../../../api/receiptAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProjectReceiptSummary } from '../../../types/models/Receipt';
import { ReceiptDetailDialog } from './ReceiptDetailDialog';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import { receiptFileName, saveReceiptBlob } from '../utils/receiptDownload';

interface ProjectReceiptCardProps {
  contractId: string;
  className?: string;
}

const POLL_INTERVAL_MS = 4_000;

export function ProjectReceiptCard({ contractId, className }: ProjectReceiptCardProps) {
  const { t } = useTranslation();
  const [receipt, setReceipt] = useState<ProjectReceiptSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialContractId = useRef(contractId);

  const refresh = useCallback(async () => {
    const response = await receiptAPI.getMine(1, 50);
    if (!response.success || !response.data) return;
    const currentReceipt = response.data.items.find(item => item.contractId === contractId);
    if (currentReceipt) {
      setReceipt(currentReceipt);
      setError(null);
    }
  }, [contractId]);

  useEffect(() => {
    let active = true;
    initialContractId.current = contractId;
    setLoading(true);
    setReceipt(null);
    setError(null);

    void receiptAPI.prepare(contractId).then(response => {
      if (!active || initialContractId.current !== contractId) return;
      if (response.success && response.data) {
        setReceipt(response.data);
      } else {
        setError(response.message || t('receipts.prepareError'));
      }
      setLoading(false);
    });

    return () => { active = false; };
  }, [contractId, t]);

  useEffect(() => {
    if (!receipt || (receipt.downloadReady && receipt.emailStatus === 'Delivered') || receipt.canRetry) {
      return undefined;
    }
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [receipt, refresh]);

  const download = async () => {
    if (!receipt) return;
    const response = await receiptAPI.download(receipt.receiptId);
    if (response.success && response.data) {
      saveReceiptBlob(response.data, receiptFileName(receipt.receiptNumber));
    } else {
      toast.error(response.message || t('receipts.downloadError'));
    }
  };

  const prepareAgain = async () => {
    setLoading(true);
    setError(null);
    const response = await receiptAPI.prepare(contractId);
    setLoading(false);
    if (response.success && response.data) {
      setReceipt(response.data);
      toast.success(t('receipts.generationRetryQueued'));
    } else {
      setError(response.message || t('receipts.prepareError'));
    }
  };

  const retry = async () => {
    if (!receipt) return;
    setRetrying(true);
    const response = await receiptAPI.retry(receipt.receiptId);
    setRetrying(false);
    if (response.success && response.data) {
      setReceipt(response.data);
      toast.success(t(receipt.generationStatus === 'Failed' ? 'receipts.generationRetryQueued' : 'receipts.emailRetryQueued'));
    } else {
      toast.error(response.message || t('receipts.retryError'));
    }
  };

  return (
    <>
      <section
        className={className ?? "rounded-3xl border border-brand/20 bg-gradient-to-r from-brand/10 via-card to-emerald-500/5 p-5 sm:p-6 shadow-sm"}
        aria-live="polite"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4 flex-1">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
              <FileCheck2 size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
                  {t('receipts.projectReceipt', { defaultValue: 'Biên nhận dự án' })}
                </p>
                {receipt?.receiptNumber && (
                  <span
                    className="inline-flex items-center font-mono text-[11px] font-bold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/60"
                    title={receipt.receiptNumber}
                  >
                    #{receipt.receiptNumber.length > 26 ? `${receipt.receiptNumber.slice(0, 16)}...${receipt.receiptNumber.slice(-4)}` : receipt.receiptNumber}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground mt-0.5 leading-snug">
                {receipt
                  ? t('receipts.settlementReceipt', { defaultValue: 'Biên nhận quyết toán dự án' })
                  : t('receipts.preparingTitle', { defaultValue: 'Đang chuẩn bị biên nhận' })}
              </h3>
              {receipt?.projectTitle && (
                <p className="text-xs sm:text-sm font-semibold text-foreground/80 mt-0.5 line-clamp-2" title={receipt.projectTitle}>
                  {receipt.projectTitle}
                </p>
              )}
              <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {error || (receipt?.emailStatus === 'Delivered'
                  ? t('receipts.emailedDescription')
                  : t('receipts.automaticEmailDescription'))}
              </p>
              {receipt && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ReceiptStatusBadge receipt={receipt} kind="document" />
                  <ReceiptStatusBadge receipt={receipt} kind="email" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {loading && <Loader2 className="animate-spin text-brand" size={20} aria-label={t('common.loading')} />}
            {error && !receipt && !loading && (
              <button type="button" onClick={() => void prepareAgain()} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-400">
                <RefreshCw size={15} /> {t('receipts.retry')}
              </button>
            )}
            {receipt?.canRetry && (
              <button type="button" onClick={() => void retry()} disabled={retrying} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400">
                {retrying ? <Loader2 size={15} className="animate-spin" /> : receipt.emailStatus === 'Failed' ? <Mail size={15} /> : <RefreshCw size={15} />}
                {t(receipt.emailStatus === 'Failed' ? 'receipts.retryEmail' : 'receipts.retryGeneration')}
              </button>
            )}
            <button type="button" onClick={() => setDetailOpen(true)} disabled={!receipt} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50 shadow-2xs">
              <Eye size={15} /> {t('receipts.viewDetails')}
            </button>
            <button type="button" onClick={() => void download()} disabled={!receipt?.downloadReady} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-brand/20">
              <Download size={15} /> {t('receipts.download')}
            </button>
          </div>
        </div>
      </section>

      <ReceiptDetailDialog receipt={receipt} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  );
}
