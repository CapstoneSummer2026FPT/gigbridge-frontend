import { Clock, FileText, X } from 'lucide-react';
import type { GetMyJobPostDto } from '../../../types/models/Job';

interface PostJobDraftModalProps {
  isOpen: boolean;
  drafts: GetMyJobPostDto[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onContinueDraft: (draft: GetMyJobPostDto) => void;
  onCreateNew: () => void;
}

const formatDraftDate = (value?: string | null): string => {
  if (!value) return 'Not updated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function PostJobDraftModal({
  isOpen,
  drafts,
  isLoading,
  error,
  onClose,
  onContinueDraft,
  onCreateNew,
}: PostJobDraftModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={event => event.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Continue Draft</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You currently have {drafts.length} unfinished JobPost draft{drafts.length === 1 ? '' : 's'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[52vh]">
          {isLoading && (
            <div className="text-sm text-muted-foreground py-8 text-center">Checking draft JobPosts...</div>
          )}

          {error && !isLoading && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          {!isLoading && !error && drafts.length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <FileText className="mx-auto text-muted-foreground mb-3" size={28} />
              <p className="text-sm font-bold text-foreground">No unfinished drafts found.</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new JobPost when you are ready.</p>
            </div>
          )}

          {!isLoading && drafts.length > 0 && (
            <div className="flex flex-col gap-3">
              {drafts.map(draft => (
                <div key={draft.jobPostsId} className="border border-border rounded-xl p-4 bg-background flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-foreground truncate">
                      {draft.title?.trim() && draft.title.trim() !== 'Untitled Job Post' ? draft.title : 'Untitled Draft'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        Updated {formatDraftDate(draft.updatedAt || draft.createdAt)}
                      </span>
                      {draft.categoryName && <span>{draft.categoryName}</span>}
                      {(draft.skills?.length || 0) + (draft.customSkillNames?.length || 0) > 0 && (
                        <span>{(draft.skills?.length || 0) + (draft.customSkillNames?.length || 0)} skill(s)</span>
                      )}
                    </div>
                    {draft.description?.trim() && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{draft.description}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onContinueDraft(draft)}
                    className="px-5 py-2.5 rounded-full font-bold text-xs bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 border-none cursor-pointer flex-shrink-0"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-border flex flex-col sm:flex-row justify-end gap-3 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full font-bold text-xs border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-5 py-2.5 rounded-full font-bold text-xs bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 border-none cursor-pointer"
          >
            Create New JobPost
          </button>
        </div>
      </div>
    </div>
  );
}
