import { CheckCircle2 } from 'lucide-react';
import type { MilestoneCompletion } from '../hooks/useDeliverySpace';

interface MilestoneCompletedModalProps {
  completion: MilestoneCompletion;
  labels: Record<string, string>;
  onDismiss: () => void;
}

export const MilestoneCompletedModal = ({
  completion,
  labels,
  onDismiss,
}: MilestoneCompletedModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="milestone-completed-title"
  >
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0">
          <h2 id="milestone-completed-title" className="text-base font-semibold text-slate-900">
            {labels.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {completion.nextMilestoneTitle
              ? `${completion.milestoneTitle} ${labels.completedMovingTo} ${completion.nextMilestoneTitle}.`
              : `${completion.milestoneTitle} ${labels.completedFinal}`}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {labels.dismiss}
        </button>
      </div>
    </div>
  </div>
);
