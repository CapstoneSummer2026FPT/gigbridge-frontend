import { useEffect, useState, useRef, useMemo, type FormEvent, type DragEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Flag,
  X,
  ShieldAlert,
  UploadCloud,
  FileText,
  Trash2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { reportAPI } from '../../../api/reportAPI';
import { ReportType } from '../../../types/models/Report';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';

export interface ReportUserModalProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportUserModal({
  userId,
  userName,
  userAvatar,
  onClose,
  onSuccess,
}: ReportUserModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<string>(String(ReportType.Spam));
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hide TopNav and lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const topNavElements = document.querySelectorAll<HTMLElement>(
      '.top-nav-standard-container, .floating-nav, .top-nav-menu-open'
    );
    const originalVisibilities = new Map<HTMLElement, string>();

    topNavElements.forEach(el => {
      originalVisibilities.set(el, el.style.visibility);
      el.style.visibility = 'hidden';
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      topNavElements.forEach(el => {
        el.style.visibility = originalVisibilities.get(el) || '';
      });
    };
  }, []);

  const reportTypeOptions = useMemo<SelectOption[]>(() => [
    {
      value: String(ReportType.Spam),
      label: t('profile.reportModal.types.spam', { defaultValue: 'Spam' }),
      badge: t('profile.reportModal.types.spamBadge', { defaultValue: 'Abuse' }),
    },
    {
      value: String(ReportType.Fraud),
      label: t('profile.reportModal.types.fraud', { defaultValue: 'Fraud or scam' }),
      badge: t('profile.reportModal.types.fraudBadge', { defaultValue: 'Security' }),
    },
    {
      value: String(ReportType.InappropriateContent),
      label: t('profile.reportModal.types.inappropriate', { defaultValue: 'Inappropriate content' }),
      badge: t('profile.reportModal.types.inappropriateBadge', { defaultValue: 'Policy' }),
    },
    {
      value: String(ReportType.HarassmentOrAbuse),
      label: t('profile.reportModal.types.harassment', { defaultValue: 'Harassment or abuse' }),
      badge: t('profile.reportModal.types.harassmentBadge', { defaultValue: 'Safety' }),
    },
    {
      value: String(ReportType.Other),
      label: t('profile.reportModal.types.other', { defaultValue: 'Other' }),
      badge: t('profile.reportModal.types.otherBadge', { defaultValue: 'General' }),
    },
  ], [t]);

  const selectedTypeNum = useMemo(() => Number(type) as ReportType, [type]);

  const handleFilesAdded = (newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(f => f.size <= 100 * 1024 * 1024);
    if (validFiles.length < newFiles.length) {
      toast.error(t('profile.reportModal.fileSizeError', { defaultValue: 'Some files exceeded the 100MB limit and were skipped.' }));
    }
    setFiles(prev => {
      const combined = [...prev, ...validFiles];
      return combined.slice(0, 5);
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!submitting) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (submitting) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(t('profile.reportModal.reasonRequired', { defaultValue: 'Please explain why you are reporting this user.' }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = createdReportId
        ? null
        : await reportAPI.createReport({
            reportedEntityId: userId,
            reportedEntityType: 'User',
            type: selectedTypeNum,
            reason: trimmedReason,
            description: description.trim() || undefined,
          });

      const reportId = createdReportId ?? response?.data;
      if (!reportId) {
        setError(response?.message || 'Unable to submit your report.');
        setSubmitting(false);
        return;
      }
      setCreatedReportId(reportId);

      if (files.length) {
        const upload = await reportAPI.uploadEvidence(reportId, files, description);
        if (!upload.success) {
          setError(
            `${upload.message || t('profile.reportModal.evidenceRetry', { defaultValue: 'Evidence upload failed. Your report was saved; submit again to retry the evidence upload.' })}`
          );
          setSubmitting(false);
          return;
        }
      }

      toast.success(t('profile.reportModal.successToast', { defaultValue: 'Report submitted. Our moderation team has received your report.' }));
      onSuccess();
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while submitting.');
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={submitting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl h-[620px] max-h-[92vh] sm:h-[650px] lg:h-[680px] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-border/80 bg-background text-text-primary backdrop-blur-2xl my-auto transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* ═══ DESKTOP LEFT COLUMN: Context / Target Info (lg+) ═══════════════ */}
        <div className="hidden lg:flex lg:w-5/12 h-full p-6 lg:p-7 flex-col justify-between border-r border-border/60 bg-surface-card/60 relative overflow-hidden shrink-0">
          {/* Subtle Red/Rose Accent Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-red-500/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            {/* Trust & Safety Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-4">
              <ShieldAlert size={13} />
              <span>{t('profile.reportModal.badge', { defaultValue: 'Trust & Safety' })}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-text-primary mb-1">
              {t('profile.reportModal.title', { defaultValue: 'Report User' })}
            </h1>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {t('profile.reportModal.subtitle', {
                defaultValue: 'Help keep our platform safe and reliable. All reports are handled confidentially by our moderation team.',
              })}
            </p>
          </div>

          {/* Center Target User Avatar Card */}
          <div className="relative z-10 flex flex-col items-center my-auto py-2">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 flex-shrink-0">
              <div className="absolute -inset-3 rounded-full bg-rose-500/20 blur-xl animate-pulse pointer-events-none" />
              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-background shadow-xl border-2 border-rose-500/30">
                <UserAvatar
                  name={userName}
                  src={userAvatar}
                  userId={userId}
                  size="xl"
                  className="!w-full !h-full !text-3xl sm:!text-4xl !rounded-none"
                />
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-black text-text-primary text-center truncate max-w-full px-2">
              {userName}
            </h2>
            <span className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-widest mt-0.5">
              {t('profile.reportModal.reportedAccount', { defaultValue: 'Reported Account' })}
            </span>
          </div>

          {/* Bottom Confidentiality Card */}
          <div className="relative z-10 rounded-xl sm:rounded-2xl border border-border/70 bg-surface-card/90 p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1.5">
              <Lock size={12} />
              <span>{t('profile.reportModal.confidentialTitle', { defaultValue: 'Confidential Review' })}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-text-muted leading-relaxed">
              {t('profile.reportModal.confidentialDesc', {
                defaultValue: 'The reported user will not be notified of who filed this report. We investigate each case thoroughly.',
              })}
            </p>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Interactive Form ════════════════════════════════ */}
        <div className="w-full lg:w-7/12 h-full flex flex-col overflow-hidden bg-background relative">
          {/* Desktop Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('common.close', { defaultValue: 'Close' })}
            className="hidden lg:flex absolute top-4 right-4 p-1.5 rounded-xl border border-border/80 hover:bg-surface-hover text-text-muted hover:text-text-primary cursor-pointer z-20 transition disabled:opacity-50"
          >
            <X size={16} />
          </button>

          {/* Mobile Header Bar (< lg) */}
          <div className="lg:hidden px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/60 bg-surface-card/60 shrink-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-wider mb-0.5">
                  <ShieldAlert size={10} />
                  <span>{t('profile.reportModal.badge', { defaultValue: 'Trust & Safety' })}</span>
                </div>
                <h1 className="text-sm sm:text-base font-black text-text-primary truncate">
                  {t('profile.reportModal.title', { defaultValue: 'Report User' })}
                </h1>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label={t('common.close', { defaultValue: 'Close' })}
                className="p-1.5 rounded-xl border border-border/80 hover:bg-surface-hover text-text-muted hover:text-text-primary cursor-pointer shrink-0 transition disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Compact Target User Strip */}
            <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border/60 bg-background/80">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-rose-500/20 shrink-0">
                <UserAvatar
                  name={userName}
                  src={userAvatar}
                  userId={userId}
                  size="sm"
                  className="!w-full !h-full !text-xs !rounded-none"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-text-primary truncate block">{userName}</span>
                <span className="text-[10px] text-text-muted">
                  {t('profile.reportModal.reportedAccount', { defaultValue: 'Reported Account' })}
                </span>
              </div>
            </div>
          </div>

          {/* Form Body (Fixed Height Container with Scrollable Body) */}
          <form onSubmit={submit} className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
              {/* Field 1: Reason Type */}
              <div>
                <label className="text-xs font-bold text-text-primary mb-1.5 flex items-center justify-between">
                  <span>
                    {t('profile.reportModal.reasonLabel', { defaultValue: 'Reason' })} <span className="text-rose-500">*</span>
                  </span>
                </label>
                <CustomSelect
                  value={type}
                  options={reportTypeOptions}
                  onChange={setType}
                  searchable={false}
                  placeholder={t('profile.reportModal.selectReason', { defaultValue: 'Select reason' })}
                  className="w-full"
                />
              </div>

              {/* Field 2: What happened? (Reason Details) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    {t('profile.reportModal.whatHappenedLabel', { defaultValue: 'What happened?' })} <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono font-medium ${reason.length > 1800 ? 'text-amber-500 font-bold' : 'text-text-muted'}`}>
                    {reason.length}/2000
                  </span>
                </div>
                <textarea
                  className="w-full min-h-[100px] sm:min-h-[110px] p-3 text-xs sm:text-sm rounded-xl border border-border bg-surface-hover/60 text-text-primary placeholder:text-text-muted focus:bg-surface focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 focus:outline-none transition-all resize-y"
                  value={reason}
                  maxLength={2000}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('profile.reportModal.whatHappenedPlaceholder', {
                    defaultValue: 'Give the moderation team enough detail to review this report...',
                  })}
                  disabled={submitting}
                />
              </div>

              {/* Field 3: Additional Description (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    {t('profile.reportModal.additionalDescLabel', { defaultValue: 'Additional description' })}{' '}
                    <span className="text-text-muted font-normal">{t('profile.reportModal.optional', { defaultValue: '(optional)' })}</span>
                  </label>
                  <span className="text-[10px] font-mono text-text-muted">
                    {description.length}/4000
                  </span>
                </div>
                <textarea
                  className="w-full min-h-[65px] sm:min-h-[70px] p-3 text-xs sm:text-sm rounded-xl border border-border bg-surface-hover/60 text-text-primary placeholder:text-text-muted focus:bg-surface focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 focus:outline-none transition-all resize-y"
                  value={description}
                  maxLength={4000}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('profile.reportModal.additionalDescPlaceholder', {
                    defaultValue: 'Add context that may help the review...',
                  })}
                  disabled={submitting}
                />
              </div>

              {/* Field 4: Evidence Files Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-primary">
                    {t('profile.reportModal.evidenceLabel', { defaultValue: 'Evidence' })}{' '}
                    <span className="text-text-muted font-normal">
                      {t('profile.reportModal.evidenceSubtitle', { defaultValue: '(optional, up to 5 files)' })}
                    </span>
                  </label>
                  <span className="text-[10px] text-text-muted font-medium">
                    {t('profile.reportModal.filesCount', {
                      count: files.length,
                      total: 5,
                      defaultValue: `${files.length}/5 files`,
                    })}
                  </span>
                </div>

                {/* Dropzone Area */}
                {files.length < 5 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 sm:p-3.5 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-border/80 hover:border-rose-500/50 hover:bg-surface-hover/60 bg-surface-muted/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
                      onChange={handleFileInputChange}
                      disabled={submitting}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 mb-0.5 text-text-secondary">
                      <UploadCloud size={16} className="text-rose-500" />
                      <span className="text-xs font-bold text-text-primary">
                        {t('profile.reportModal.clickToUpload', { defaultValue: 'Click to upload' })}
                      </span>
                      <span className="text-xs text-text-muted">
                        {t('profile.reportModal.orDragDrop', { defaultValue: 'or drag & drop' })}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted">
                      {t('profile.reportModal.fileHint', {
                        defaultValue: 'PDF, PNG, JPG, WEBP, DOC, DOCX, TXT (Max 100MB per file)',
                      })}
                    </p>
                  </div>
                )}

                {/* Selected Files List with fixed max-height scrollable container */}
                {files.length > 0 && (
                  <div className="max-h-[110px] overflow-y-auto space-y-1.5 mt-2 pr-0.5">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-2 p-2 px-3 rounded-lg border border-border/70 bg-surface-card text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText size={14} className="text-rose-500 shrink-0" />
                          <span className="font-semibold text-text-primary truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[10px] text-text-muted shrink-0 font-mono">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          disabled={submitting}
                          aria-label={`Remove ${file.name}`}
                          className="text-text-muted hover:text-rose-500 p-1 rounded transition shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 animate-shake">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-border/80 bg-surface-card/80 backdrop-blur-md flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border hover:bg-surface-hover text-text-secondary font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {t('profile.reportModal.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
              >
                <Flag size={14} />
                <span>
                  {submitting
                    ? t('profile.reportModal.submitting', { defaultValue: 'Submitting…' })
                    : t('profile.reportModal.submit', { defaultValue: 'Submit report' })}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ReportUserModal;
