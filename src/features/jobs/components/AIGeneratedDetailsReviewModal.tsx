import { X, Sparkles, Check } from 'lucide-react';
import type { GenerateJobDescriptionDetailsResponse } from '../../../types/models/Job';

interface Props {
  isOpen: boolean;
  data?: GenerateJobDescriptionDetailsResponse | null;
  onClose?: () => void;
  onApprove?: () => void;
  onOk?: () => void;
  onCancel?: () => void;
}

export function AIGeneratedDetailsReviewModal({
  isOpen,
  data,
  onClose,
  onApprove,
  onOk,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  const handleConfirm = onOk || onApprove || (() => {});
  const handleDismiss = onCancel || onClose || (() => {});

  return (
    <div className="job-post-modal-overlay" role="dialog" aria-modal="true">
      <div className="job-post-modal-backdrop" onClick={handleDismiss} />
      <div className="job-post-modal-container max-w-md">
        {/* Decorative top gradient border */}
        <div className="job-post-modal-accent-bar" />

        {/* Modal Header */}
        <div className="job-post-modal-header border-b-0 pb-2">
          <div className="job-post-modal-header-title">
            <div className="job-post-modal-icon-sparkle">
              <Sparkles size={22} className="text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">AI Job Post Generated</h3>
            </div>
          </div>
          <button
            type="button"
            className="job-post-modal-close-btn"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="job-post-modal-content py-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Your AI job description, budget, timeline, and skill requirements have been created successfully.
          </p>
          <p className="mt-2 font-medium text-foreground">
            Click <strong>Apply to Form</strong> to prefill these details into your draft, where you can inspect and edit them directly.
          </p>
          {data?.title && (
            <div className="mt-3 rounded-lg border border-border/80 bg-muted/30 p-2.5 text-xs">
              <span className="font-semibold text-foreground">Suggested Title: </span>
              <span className="text-muted-foreground">{data.title}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="job-post-modal-footer pt-3">
          <button type="button" className="job-post-btn-secondary" onClick={handleDismiss}>
            Cancel
          </button>
          <button type="button" className="job-post-btn-primary" onClick={handleConfirm}>
            <Check size={18} className="mr-2 inline" />
            Apply to Form
          </button>
        </div>
      </div>
    </div>
  );
}
