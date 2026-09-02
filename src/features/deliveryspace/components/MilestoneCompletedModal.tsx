import { Trophy } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { MilestoneCompletion } from '../hooks/useDeliverySpace';

interface MilestoneCompletedModalProps {
  completion: MilestoneCompletion;
  labels?: Record<string, string>;
  onDismiss: () => void;
}

export const MilestoneCompletedModal = ({
  completion,
  labels = {},
  onDismiss,
}: MilestoneCompletedModalProps) => {
  const { t } = useTranslation(['contracts', 'common']);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-completed-title"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-surface border border-border p-6 sm:p-7 shadow-2xl space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-emerald-600 shrink-0">
            <Trophy size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {labels.title || t('contracts.deliverySpace.milestoneCompleteTitle', 'Hoàn thành Milestone')}
            </span>
            <h2 id="milestone-completed-title" className="text-base sm:text-lg font-black text-text-primary mt-0.5">
              {t('contracts.deliverySpace.congratsTitle', 'Chúc mừng!')}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed font-medium">
              {completion.nextMilestoneTitle
                ? `${completion.milestoneTitle} ${labels.completedMovingTo || t('contracts.deliverySpace.milestoneCompleteMovingTo', 'đã hoàn thành. Chuyển tiếp sang')} ${completion.nextMilestoneTitle}.`
                : `${completion.milestoneTitle} ${labels.completedFinal || t('contracts.deliverySpace.milestoneCompleteFinal', 'đã hoàn thành tất cả các hạng mục.')}`}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-brand hover:bg-brand-hover text-brand-foreground px-5 py-2.5 text-xs font-black transition cursor-pointer shadow-md shadow-brand/20 active:scale-95"
          >
            {labels.dismiss || t('common.close', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
};
