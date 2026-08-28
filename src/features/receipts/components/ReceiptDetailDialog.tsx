import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, Loader2, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { receiptAPI } from '../../../api/receiptAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProjectReceiptSummary } from '../../../types/models/Receipt';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import { receiptFileName, saveReceiptBlob } from '../utils/receiptDownload';

interface ReceiptDetailDialogProps {
  receipt: ProjectReceiptSummary | null;
  open: boolean;
  onClose: () => void;
}

export function ReceiptDetailDialog({ receipt, open, onClose }: ReceiptDetailDialogProps) {
  const { t } = useTranslation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !receipt?.downloadReady) {
      setPdfBlob(null);
      setPdfUrl(null);
      setError(null);
      return undefined;
    }

    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);

    void receiptAPI.download(receipt.receiptId).then(response => {
      if (!active) return;
      if (!response.success || !response.data) {
        setError(response.message || t('receipts.downloadError'));
        setLoading(false);
        return;
      }
      objectUrl = URL.createObjectURL(response.data);
      setPdfBlob(response.data);
      setPdfUrl(objectUrl);
      setLoading(false);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, receipt?.downloadReady, receipt?.receiptId, t]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !receipt) return null;

  const download = async () => {
    if (pdfBlob) {
      saveReceiptBlob(pdfBlob, receiptFileName(receipt.receiptNumber));
      return;
    }
    const response = await receiptAPI.download(receipt.receiptId);
    if (response.success && response.data) {
      saveReceiptBlob(response.data, receiptFileName(receipt.receiptNumber));
    } else {
      toast.error(response.message || t('receipts.downloadError'));
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="flex h-[92vh] sm:h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="receipt-detail-title">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 flex-1">
            <span className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-brand/10 text-brand">
              <FileText size={18} className="sm:w-[22px] sm:h-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand truncate">
                  {receipt.receiptNumber}
                </p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase shrink-0">
                  {t(`receipts.type.${receipt.receiptType.toLowerCase()}`)}
                </span>
              </div>
              <h2 id="receipt-detail-title" className="truncate text-xs sm:text-base font-black text-foreground block max-w-full">
                {receipt.projectTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void download()}
              disabled={!receipt.downloadReady}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs sm:text-sm font-bold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px]"
            >
              <Download size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">{t('receipts.download')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label={t('common.close')}
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 border-b border-border bg-muted/20 px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm shrink-0">
          <div className="col-span-2 sm:col-span-1">
            <span className="block text-[10px] sm:text-xs text-muted-foreground font-semibold">{t('receipts.issued')}</span>
            <strong className="text-xs sm:text-sm font-bold text-foreground truncate block">{new Date(receipt.issuedAt).toLocaleString()}</strong>
          </div>
          <div>
            <span className="block text-[10px] sm:text-xs text-muted-foreground font-semibold">{t('receipts.document')}</span>
            <ReceiptStatusBadge receipt={receipt} kind="document" />
          </div>
          <div>
            <span className="block text-[10px] sm:text-xs text-muted-foreground font-semibold">{t('receipts.emailDelivery')}</span>
            <ReceiptStatusBadge receipt={receipt} kind="email" />
          </div>
        </div>

        {/* Document Body / PDF Viewer */}
        <div className="min-h-0 flex-1 bg-muted/30 p-2.5 sm:p-5 flex flex-col">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <Loader2 className="animate-spin" />
              <span>{t('receipts.loadingDocument')}</span>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-center text-xs sm:text-sm text-destructive p-4">
              {error}
            </div>
          ) : pdfUrl ? (
            <div className="flex flex-col h-full gap-2 min-h-0">
              {/* Mobile Quick Action Bar */}
              <div className="flex sm:hidden items-center justify-between bg-card/90 px-3 py-2 rounded-xl border border-border text-xs shrink-0">
                <span className="font-semibold text-muted-foreground text-[11px] truncate">PDF Preview</span>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand font-bold text-xs shrink-0 hover:underline"
                >
                  <ExternalLink size={12} />
                  <span>Mở tab mới</span>
                </a>
              </div>

              {/* PDF Container */}
              <div className="flex-1 min-h-0 w-full overflow-hidden rounded-xl border border-border bg-white shadow-inner">
                <iframe
                  src={pdfUrl}
                  title={t('receipts.documentTitle', { number: receipt.receiptNumber })}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground p-6">
              <Mail size={36} className="text-amber-500 sm:w-[42px] sm:h-[42px]" />
              <strong className="text-sm sm:text-base text-foreground">{t('receipts.preparingTitle')}</strong>
              <p className="max-w-md text-xs sm:text-sm">{t('receipts.preparingDescription')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
