import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileCheck2, Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { receiptAPI } from '../../../api/receiptAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProjectReceiptSummary } from '../../../types/models/Receipt';
import { ReceiptDetailDialog } from './ReceiptDetailDialog';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import { useProjectReceiptRevisionEvent } from '../hooks/useProjectReceiptRevisionEvent';
import { receiptFileName, saveReceiptBlob } from '../utils/receiptDownload';

interface ProjectReceiptCardProps {
  contractId: string;
  className?: string;
}

export function ProjectReceiptCard({ contractId, className }: ProjectReceiptCardProps) {
  const { t } = useTranslation();
  const [receipt, setReceipt] = useState<ProjectReceiptSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialContractId = useRef(contractId);

  const refresh = useCallback(async () => {
    const response = await receiptAPI.getStatusByContract(contractId);
    if (response.success && response.data) {
      setReceipt(response.data);
      setError(null);
    }
  }, [contractId]);

  useProjectReceiptRevisionEvent(
    event => {
      if (event.contractId !== contractId || event.revision <= (receipt?.revision ?? 0)) return;
      if (event.changeKind === 'deleted') setReceipt(null);
      else void refresh();
    },
    () => void refresh(),
  );

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
        className={className ?? "rounded-3xl border border-brand/20 bg-gradient-to-r from-brand/10 via-card to-emerald-500/5 p-4 sm:p-5 shadow-sm"}
        aria-live="polite"
      >
        {/* Top Header: Icon + Title + Status Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
              <FileCheck2 size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">
                  {t('receipts.projectReceipt', { defaultValue: 'Biên nhận dự án' })}
                </p>
                {receipt?.receiptNumber && (
                  <span
                    className="inline-flex items-center font-mono text-[10px] font-bold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/60"
                    title={receipt.receiptNumber}
                  >
                    #{receipt.receiptNumber.length > 20 ? `${receipt.receiptNumber.slice(0, 12)}...${receipt.receiptNumber.slice(-4)}` : receipt.receiptNumber}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground mt-0.5 truncate tracking-tight">
                {receipt
                  ? t('receipts.settlementReceipt', { defaultValue: 'Biên nhận quyết toán dự án' })
                  : t('receipts.preparingTitle', { defaultValue: 'Đang chuẩn bị biên nhận' })}
              </h3>
            </div>
          </div>

          {receipt && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <ReceiptStatusBadge receipt={receipt} kind="document" />
              <ReceiptStatusBadge receipt={receipt} kind="email" />
            </div>
          )}
        </div>

        {/* Middle Info: Project Title & Email notice spanning full width */}
        <div className="mt-2.5 text-xs text-muted-foreground space-y-1">
          {receipt?.projectTitle && (
            <p className="font-semibold text-foreground/90 text-xs sm:text-sm line-clamp-1" title={receipt.projectTitle}>
              <span className="text-muted-foreground font-normal">{t('workspace.project', { defaultValue: 'Dự án' })}:</span> {receipt.projectTitle}
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {error || (receipt?.emailStatus === 'Delivered'
              ? t('receipts.emailedDescription')
              : t('receipts.automaticEmailDescription'))}
          </p>
        </div>

        {/* Bottom Toolbar: Badges on mobile, Date on desktop, Action buttons on right */}
        <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {receipt && (
              <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
                <ReceiptStatusBadge receipt={receipt} kind="document" />
                <ReceiptStatusBadge receipt={receipt} kind="email" />
              </div>
            )}
            {receipt?.issuedAt && (
              <span className="hidden sm:inline-block text-[11px] text-muted-foreground font-medium">
                {t('receipts.issuedOn', { date: new Date(receipt.issuedAt).toLocaleDateString() })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {loading && <Loader2 className="animate-spin text-brand" size={18} aria-label={t('common.loading')} />}
            {error && !receipt && !loading && (
              <button type="button" onClick={() => void prepareAgain()} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-400 cursor-pointer">
                <RefreshCw size={14} /> {t('receipts.retry')}
              </button>
            )}
            {receipt?.canRetry && (
              <button type="button" onClick={() => void retry()} disabled={retrying} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400 cursor-pointer">
                {retrying ? <Loader2 size={14} className="animate-spin" /> : receipt.emailStatus === 'Failed' ? <Mail size={14} /> : <RefreshCw size={14} />}
                {t(receipt.emailStatus === 'Failed' ? 'receipts.retryEmail' : 'receipts.retryGeneration')}
              </button>
            )}
            <button type="button" onClick={() => setDetailOpen(true)} disabled={!receipt} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50 shadow-2xs cursor-pointer">
              <Eye size={14} /> {t('receipts.viewDetails')}
            </button>
            <button type="button" onClick={() => void download()} disabled={!receipt?.downloadReady} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer">
              <Download size={14} /> {t('receipts.download')}
            </button>
          </div>
        </div>
      </section>

      <ReceiptDetailDialog receipt={receipt} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  );
}
