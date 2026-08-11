/**
 * FileTypeBadge Component
 *
 * Renders a visually rich file card / badge that communicates the file type
 * at a glance using distinct colours, icons and extension labels.
 *
 * Supported types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ZIP/RAR, Image,
 * Video, Audio, Code and generic fallback.
 *
 * Usage:
 * ```tsx
 * <FileTypeBadge fileName="Report.pdf" fileUrl="https://…" fileSize={2048000} uploadedAt="2026-08-11T12:00:00Z" uploaderName="Alice" />
 * ```
 */

import { useCallback } from 'react';
import {
  Archive,
  Code2,
  Download,
  ExternalLink,
  FileAudio,
  FileImage,
  FilePieChart,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Link2,
} from 'lucide-react';

// ─── File-type helpers ────────────────────────────────────────────────────────

export type FileCategory =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'zip'
  | 'image'
  | 'video'
  | 'audio'
  | 'code'
  | 'link'
  | 'other';

const EXT_MAP: Record<string, FileCategory> = {
  pdf:  'pdf',
  doc:  'word',  docx: 'word',  odt: 'word',
  xls:  'excel', xlsx: 'excel', csv: 'excel', ods: 'excel',
  ppt:  'powerpoint', pptx: 'powerpoint', odp: 'powerpoint',
  zip:  'zip', rar: 'zip', '7z': 'zip', tar: 'zip', gz: 'zip',
  png:  'image', jpg: 'image', jpeg: 'image', gif: 'image',
  webp: 'image', svg: 'image', bmp: 'image', ico: 'image',
  mp4:  'video', mov: 'video', avi: 'video', webm: 'video', mkv: 'video',
  mp3:  'audio', wav: 'audio', ogg: 'audio', flac: 'audio', aac: 'audio',
  js:   'code', ts: 'code', jsx: 'code', tsx: 'code', py: 'code',
  html: 'code', css: 'code', json: 'code', xml: 'code', sh: 'code',
  md:   'code', sql: 'code', yaml: 'code', yml: 'code',
};

export function getFileCategory(fileName?: string | null, isExternalLink?: boolean): FileCategory {
  if (isExternalLink) return 'link';
  if (!fileName) return 'other';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? 'other';
}

export function getFileExtension(fileName?: string | null): string {
  if (!fileName) return 'file';
  const ext = fileName.split('.').pop()?.toUpperCase() ?? 'FILE';
  return ext || 'FILE';
}

// ─── Theme map ────────────────────────────────────────────────────────────────

interface CategoryTheme {
  bg: string;       // icon background
  text: string;     // icon colour
  border: string;   // card border
  label: string;    // human label
}

const THEME: Record<FileCategory, CategoryTheme> = {
  pdf:        { bg: 'bg-red-500/10',     text: 'text-red-500',            border: 'border-red-500/20',        label: 'PDF' },
  word:       { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',  border: 'border-blue-500/20',  label: 'Word' },
  excel:      { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', label: 'Excel' },
  powerpoint: { bg: 'bg-orange-500/10',  text: 'text-orange-500',         border: 'border-orange-500/20',     label: 'PowerPoint' },
  zip:        { bg: 'bg-amber-500/10',   text: 'text-amber-500',          border: 'border-amber-500/20',      label: 'Archive' },
  image:      { bg: 'bg-violet-500/10',  text: 'text-violet-500',         border: 'border-violet-500/20',     label: 'Image' },
  video:      { bg: 'bg-pink-500/10',    text: 'text-pink-500',           border: 'border-pink-500/20',       label: 'Video' },
  audio:      { bg: 'bg-teal-500/10',    text: 'text-teal-500',           border: 'border-teal-500/20',       label: 'Audio' },
  code:       { bg: 'bg-slate-500/10',   text: 'text-slate-500',          border: 'border-slate-500/20',      label: 'Code' },
  link:       { bg: 'bg-brand/10',       text: 'text-brand',              border: 'border-brand/20',          label: 'Link' },
  other:      { bg: 'bg-surface-muted/60', text: 'text-text-muted',       border: 'border-border',            label: 'File' },
};

// ─── Icon map ─────────────────────────────────────────────────────────────────

function FileIcon({ category, size = 20 }: { category: FileCategory; size?: number }) {
  const cls = THEME[category].text;
  switch (category) {
    case 'pdf':        return <FileText       size={size} className={cls} />;
    case 'word':       return <FileType       size={size} className={cls} />;
    case 'excel':      return <FileSpreadsheet size={size} className={cls} />;
    case 'powerpoint': return <FilePieChart   size={size} className={cls} />;
    case 'zip':        return <Archive        size={size} className={cls} />;
    case 'image':      return <FileImage      size={size} className={cls} />;
    case 'video':      return <FileVideo      size={size} className={cls} />;
    case 'audio':      return <FileAudio      size={size} className={cls} />;
    case 'code':       return <Code2          size={size} className={cls} />;
    case 'link':       return <Link2          size={size} className={cls} />;
    default:           return <FileText       size={size} className={cls} />;
  }
}

// ─── Size formatter ───────────────────────────────────────────────────────────

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface FileTypeBadgeProps {
  /** File name including extension (e.g. "contract.pdf") */
  fileName?: string | null;
  /** Direct download / open URL */
  fileUrl?: string | null;
  /** Whether this is a link handoff (not a file) */
  isExternalLink?: boolean;
  /** File size in bytes */
  fileSize?: number | null;
  /** ISO datetime string of when file was uploaded */
  uploadedAt?: string | null;
  /** Name of the uploader */
  uploaderName?: string | null;
  /** Additional note or description */
  note?: string | null;
  /** Version number */
  version?: number | null;
  /** Extra CSS classes for the card container */
  className?: string;
  /** If true, renders a compact inline pill (no card) */
  compact?: boolean;
}

export function FileTypeBadge({
  fileName,
  fileUrl,
  isExternalLink = false,
  fileSize,
  uploadedAt,
  uploaderName,
  note,
  version,
  className = '',
  compact = false,
}: FileTypeBadgeProps) {
  const category = getFileCategory(fileName, isExternalLink);
  const theme    = THEME[category];
  const ext      = isExternalLink ? 'URL' : getFileExtension(fileName);
  const sizeStr  = formatFileSize(fileSize);
  const dateStr  = formatDate(uploadedAt);
  const hasUrl   = Boolean(fileUrl);

  const handleOpen = useCallback(() => {
    if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }, [fileUrl]);

  // ── Compact pill mode ──────────────────────────────────────────────────────
  if (compact) {
    return (
      <button
        type="button"
        onClick={hasUrl ? handleOpen : undefined}
        disabled={!hasUrl}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-extrabold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${theme.bg} ${theme.text} ${theme.border} ${className}`}
      >
        <FileIcon category={category} size={13} />
        <span className="truncate max-w-[120px]">{isExternalLink ? (fileUrl ?? 'Link') : (fileName ?? 'File')}</span>
        <span className="opacity-60 text-[9px] font-black uppercase">{ext}</span>
      </button>
    );
  }

  // ── Card mode (default) ────────────────────────────────────────────────────
  return (
    <div
      className={`group rounded-xl border bg-background transition-all hover:shadow-sm ${theme.border} ${className}`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* File Type Icon Box */}
        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${theme.bg} relative`}>
          <FileIcon category={category} size={20} />
          <span className={`text-[8px] font-black uppercase leading-none mt-0.5 ${theme.text} opacity-80`}>{ext}</span>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-text-primary truncate">
            {isExternalLink ? (fileUrl ?? 'External Link') : (fileName ?? 'Untitled File')}
          </p>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {sizeStr && (
              <span className="text-[10px] text-text-muted font-semibold">{sizeStr}</span>
            )}
            {dateStr && (
              <>
                <span className="text-[10px] text-text-muted opacity-50">·</span>
                <span className="text-[10px] text-text-muted font-semibold">{dateStr}</span>
              </>
            )}
            {uploaderName && (
              <>
                <span className="text-[10px] text-text-muted opacity-50">·</span>
                <span className="text-[10px] text-text-muted font-semibold truncate">{uploaderName}</span>
              </>
            )}
            {version != null && (
              <>
                <span className="text-[10px] text-text-muted opacity-50">·</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${theme.bg} ${theme.text}`}>
                  v{version}
                </span>
              </>
            )}
          </div>
          {note && (
            <p className="text-[10px] text-text-muted mt-0.5 truncate italic">{note}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasUrl && (
            <>
              <button
                type="button"
                onClick={handleOpen}
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme.bg} ${theme.text} opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100 cursor-pointer`}
                title="Open in new tab"
              >
                <ExternalLink size={13} />
              </button>
              {!isExternalLink && (
                <a
                  href={fileUrl ?? '#'}
                  download={fileName ?? true}
                  onClick={e => e.stopPropagation()}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme.bg} ${theme.text} opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer`}
                  title="Download"
                >
                  <Download size={13} />
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
