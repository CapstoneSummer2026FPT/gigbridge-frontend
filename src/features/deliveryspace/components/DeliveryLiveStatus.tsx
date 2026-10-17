import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { DeliveryLiveStatus as LiveStatus } from '../hooks/useDeliverySync';

export interface DeliveryLiveStatusProps {
  status: LiveStatus;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  onRefresh: () => void;
}

const DOT_CLASS: Record<LiveStatus, string> = {
  live: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  offline: 'bg-slate-400',
};

/**
 * Says whether the screen is currently live, and when it last agreed with the server.
 *
 * Two people take turns on this screen, so "am I looking at the current state?" is a real question
 * — and when the socket is down the fallback poll keeps the data fresh but gives no sign of doing
 * so. The manual refresh is the escape hatch for the case where neither is true.
 */
export function DeliveryLiveStatus({ status, lastSyncedAt, isSyncing, onRefresh }: DeliveryLiveStatusProps) {
  const { t } = useTranslation(['contracts', 'common']);

  const label =
    status === 'live'
      ? t('contracts.deliverySpace.liveConnected', { defaultValue: 'Đang cập nhật trực tiếp' })
      : status === 'connecting'
        ? t('contracts.deliverySpace.liveConnecting', { defaultValue: 'Đang kết nối...' })
        : t('contracts.deliverySpace.liveOffline', { defaultValue: 'Mất kết nối trực tiếp' });

  const syncedLabel = lastSyncedAt
    ? t('contracts.deliverySpace.liveSyncedAt', {
        defaultValue: 'Cập nhật lúc {{time}}',
        time: new Date(lastSyncedAt).toLocaleTimeString(),
      })
    : null;

  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold text-text-muted">
      <span className="inline-flex items-center gap-1.5" aria-live="polite">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[status]}`} aria-hidden />
        <span>{label}</span>
      </span>

      {syncedLabel ? <span className="hidden sm:inline text-text-muted/80">· {syncedLabel}</span> : null}

      <button
        type="button"
        onClick={onRefresh}
        disabled={isSyncing}
        aria-label={t('contracts.deliverySpace.liveRefresh', { defaultValue: 'Làm mới' })}
        className="inline-flex items-center rounded-md p-1 text-text-muted transition hover:text-text-primary disabled:opacity-50 cursor-pointer"
      >
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}
