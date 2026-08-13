import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Mail, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="flex h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="receipt-detail-title">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand"><FileText size={22} /></span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">{receipt.receiptNumber}</p>
              <h2 id="receipt-detail-title" className="truncate text-lg font-black text-foreground">{receipt.projectTitle}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void download()} disabled={!receipt.downloadReady} className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-bold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={16} /> {t('receipts.download')}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={t('common.close')}><X size={19} /></button>
          </div>
        </header>

        <div className="grid gap-3 border-b border-border bg-muted/20 px-5 py-3 text-sm sm:grid-cols-3 sm:px-6">
          <div><span className="block text-xs text-muted-foreground">{t('receipts.issued')}</span><strong>{new Date(receipt.issuedAt).toLocaleString()}</strong></div>
          <div><span className="block text-xs text-muted-foreground">{t('receipts.document')}</span><ReceiptStatusBadge receipt={receipt} kind="document" /></div>
          <div><span className="block text-xs text-muted-foreground">{t('receipts.emailDelivery')}</span><ReceiptStatusBadge receipt={receipt} kind="email" /></div>
        </div>

        <div className="min-h-0 flex-1 bg-muted/30 p-3 sm:p-5">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-3 text-muted-foreground"><Loader2 className="animate-spin" /> {t('receipts.loadingDocument')}</div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-center text-destructive">{error}</div>
          ) : pdfUrl ? (
            <iframe src={pdfUrl} title={t('receipts.documentTitle', { number: receipt.receiptNumber })} className="h-full w-full rounded-xl border border-border bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Mail size={38} className="text-amber-500" />
              <strong className="text-foreground">{t('receipts.preparingTitle')}</strong>
              <p className="max-w-md text-sm">{t('receipts.preparingDescription')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
