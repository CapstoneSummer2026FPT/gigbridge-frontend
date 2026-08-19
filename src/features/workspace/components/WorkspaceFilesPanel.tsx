import { useRef, useEffect } from 'react';
import { FolderOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { type WorkspaceFileDto } from '../../../types/models/Contract';
import { FileTypeBadge } from '../../../shared/components/FileTypeBadge';

export interface WorkspaceFilesPanelProps {
  contractId: string;
  files: WorkspaceFileDto[];
  isLoading: boolean;
  error: string | null;
  onLoad: () => Promise<void>;
}

export function WorkspaceFilesPanel({ files, isLoading, error, onLoad }: WorkspaceFilesPanelProps) {
  // Auto-fetch when panel first mounts
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      void onLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group by context / milestone — `files` is already normalized
  const grouped = files.reduce<Record<string, WorkspaceFileDto[]>>((acc, f) => {
    const group = f.milestoneTitle
      ? `Milestone: ${f.milestoneTitle}`
      : f.context
        ? f.context.charAt(0).toUpperCase() + f.context.slice(1)
        : 'Chung';
    if (!acc[group]) acc[group] = [];
    acc[group].push(f);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <FolderOpen size={14} />
          Shared Files
        </h4>
        <button
          type="button"
          onClick={() => void onLoad()}
          disabled={isLoading}
          className="p-1.5 rounded-lg border border-border bg-background text-text-muted hover:text-text-primary hover:border-brand/30 transition cursor-pointer disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && !files.length && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-surface-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen size={36} className="text-text-muted/30 mb-3" />
          <p className="text-xs font-extrabold text-text-muted">Chưa có file nào được chia sẻ</p>
          <p className="text-[10px] text-text-muted/60 mt-1">Các file trao đổi trong workspace sẽ xuất hiện ở đây</p>
        </div>
      )}

      {/* Files grouped */}
      {!isLoading && Object.keys(grouped).length > 0 && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([groupName, groupFiles]) => (
            <div key={groupName} className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">{groupName}</p>
              <div className="space-y-2">
                {groupFiles.map(f => (
                  <FileTypeBadge
                    key={f.id}
                    fileName={f.fileName}
                    fileUrl={f.fileUrl}
                    isExternalLink={f.isExternalLink}
                    fileSize={f.fileSize}
                    uploadedAt={f.uploadedAt}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
