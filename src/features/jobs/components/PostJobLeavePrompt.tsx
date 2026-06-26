type LeaveAction = 'save' | 'discard' | null;

interface PostJobLeavePromptProps {
  isOpen: boolean;
  leaveAction: LeaveAction;
  onSaveDraft: () => void;
  onDiscardDraft: () => void;
  onCancel: () => void;
}

export function PostJobLeavePrompt({
  isOpen,
  leaveAction,
  onSaveDraft,
  onDiscardDraft,
  onCancel,
}: PostJobLeavePromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-extrabold text-foreground">Do you want to save this JobPost draft?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Save keeps your current draft. Discard only removes it if the backend confirms it is still empty.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={leaveAction !== null}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--gb-cyan)] text-white border-none cursor-pointer disabled:opacity-50"
          >
            {leaveAction === 'save' ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={onDiscardDraft}
            disabled={leaveAction !== null}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-red-500 text-white border-none cursor-pointer disabled:opacity-50"
          >
            {leaveAction === 'discard' ? 'Discarding...' : 'Discard Draft'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={leaveAction !== null}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs border border-border bg-background hover:bg-muted text-foreground cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
