import { CheckCircle2, Clock3, MailCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProjectReceiptSummary } from '../../../types/models/Receipt';

interface ReceiptStatusBadgeProps {
  receipt: ProjectReceiptSummary;
  kind: 'document' | 'email';
}

export function ReceiptStatusBadge({ receipt, kind }: ReceiptStatusBadgeProps) {
  const { t } = useTranslation();
  const status = kind === 'document' ? receipt.generationStatus : receipt.emailStatus;
  const failed = status === 'Failed';
  const ready = kind === 'document' ? status === 'Ready' : status === 'Delivered';
  const Icon = failed ? TriangleAlert : ready ? (kind === 'email' ? MailCheck : CheckCircle2) : Clock3;
  const label = kind === 'document'
    ? t(`receipts.generationStatus.${status.toLowerCase()}`)
    : t(`receipts.emailStatus.${status.toLowerCase()}`);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
      failed
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : ready
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    }`}>
      <Icon size={13} />
      {label}
    </span>
  );
}
