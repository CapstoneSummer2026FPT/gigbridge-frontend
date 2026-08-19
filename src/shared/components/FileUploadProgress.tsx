import { useTranslation } from '../../hooks/useTranslation';
import type { UploadTransferProgress } from '../../service/apiService';
import './styles/file-upload-progress.css';

export type FileUploadPhase = 'uploading' | 'processing' | 'refreshing';

interface FileUploadProgressProps {
  phase: FileUploadPhase;
  progress?: UploadTransferProgress | null;
  variant?: 'full' | 'compact';
  label?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function FileUploadProgress({
  phase,
  progress = null,
  variant = 'full',
  label,
}: FileUploadProgressProps) {
  const { t } = useTranslation();
  const percent = phase === 'uploading' ? progress?.percent ?? null : null;
  const isDeterminate = percent !== null;
  const phaseLabel = label ?? (
    phase === 'uploading'
      ? t('fileUploadProgress.uploading')
      : phase === 'processing'
        ? t('fileUploadProgress.processing')
        : t('fileUploadProgress.refreshing')
  );
  const accessibleLabel = label ?? (
    phase === 'uploading' && isDeterminate
      ? t('fileUploadProgress.uploadingPercent', { percent })
      : phaseLabel
  );
  const transferDetail = phase === 'uploading' && progress
    ? progress.totalBytes !== undefined
      ? t('fileUploadProgress.sentOfTotal', {
          loaded: formatBytes(progress.loadedBytes),
          total: formatBytes(progress.totalBytes),
        })
      : t('fileUploadProgress.sent', { loaded: formatBytes(progress.loadedBytes) })
    : null;

  return (
    <div
      className={variant === 'compact' ? 'space-y-1.5 min-w-48' : 'space-y-2.5'}
      aria-live="polite"
      aria-busy="true"
      data-phase={phase}
      data-variant={variant}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={variant === 'compact' ? 'text-[10px] font-semibold' : 'text-xs font-black text-text-primary'}>
          {phaseLabel}
        </span>
        {isDeterminate && (
          <span className={variant === 'compact' ? 'text-[10px] font-bold tabular-nums' : 'text-xs font-black text-brand tabular-nums'}>
            {percent}%
          </span>
        )}
      </div>

      <div
        className={`overflow-hidden rounded-full bg-surface-muted border border-border/60 ${variant === 'compact' ? 'h-1.5' : 'h-2.5'}`}
        role="progressbar"
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isDeterminate ? percent : undefined}
        aria-valuetext={accessibleLabel}
      >
        {isDeterminate ? (
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="file-upload-progress__indeterminate h-full w-1/3 rounded-full bg-brand" />
        )}
      </div>

      {transferDetail && (
        <p className={variant === 'compact' ? 'text-[9px] text-muted-foreground' : 'text-[10px] font-bold text-text-muted'}>
          {transferDetail}
        </p>
      )}
    </div>
  );
}
