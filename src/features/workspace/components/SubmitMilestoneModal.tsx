import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../../hooks/useTranslation';
import type { UploadTransferProgress } from '../../../service/apiService';
import type { ApiTransportError } from '../../../types/common';
import {
  FileUploadProgress,
  type FileUploadPhase,
} from '../../../shared/components/FileUploadProgress';
import {
  MILESTONE_FILE_ACCEPT,
  MAX_MILESTONE_FILES,
  addMilestoneFile,
  getMilestoneBatchSize,
  type MilestoneFileValidationError,
  type MilestoneSubmissionPayload,
} from '../utils/milestoneUpload';

interface SubmissionResult {
  success: boolean;
  message?: string;
  statusCode?: number;
  transportError?: ApiTransportError;
}

interface SubmitMilestoneModalProps {
  milestoneTitle: string;
  onClose: () => void;
  onSubmit: (
    payload: MilestoneSubmissionPayload,
    lifecycle: {
      onUploadProgress: (progress: UploadTransferProgress) => void;
      onRefreshing: () => void;
    },
  ) => Promise<SubmissionResult>;
}

const formatMegabytes = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export function SubmitMilestoneModal({
  milestoneTitle,
  onClose,
  onSubmit,
}: SubmitMilestoneModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submissionPhase, setSubmissionPhase] = useState<FileUploadPhase | 'idle'>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadTransferProgress | null>(null);
  const isSubmitting = submissionPhase !== 'idle';

  const getValidationMessage = (validationError: MilestoneFileValidationError): string => {
    switch (validationError) {
      case 'empty':
        return t('workspace.emptyFileError');
      case 'too-large':
        return t('workspace.fileSizeValidationError');
      case 'too-many':
        return t('workspace.tooManyDeliverableFilesError');
      case 'duplicate':
        return t('workspace.duplicateDeliverableFileError');
      case 'total-too-large':
        return t('workspace.totalDeliverableSizeError');
      case 'unsupported':
        return t('workspace.unsupportedDeliverableFileError');
    }
  };

  const getSubmissionErrorMessage = (result: SubmissionResult): string => {
    if (result.statusCode === 413) {
      return t('workspace.totalDeliverableSizeError');
    }
    if (result.transportError === 'timeout') {
      return t('fileUploadError.timeout');
    }
    if (result.transportError === 'network') {
      return t('fileUploadError.network');
    }
    return result.message || t('workspace.failedSubmitDeliverableError');
  };

  const selectFile = (file: File): void => {
    const result = addMilestoneFile(files, file);
    if (result.error) {
      setError(getValidationMessage(result.error));
      return;
    }
    setFiles([...result.files]);
    setError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) selectFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (isSubmitting) return;
    if (event.dataTransfer.files.length !== 1) {
      setError(t('workspace.oneFileAtATimeError'));
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  };

  const removeFile = (index: number): void => {
    setFiles(current => current.filter((_, fileIndex) => fileIndex !== index));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 5000) {
      setError(t('workspace.descriptionMaxLengthError'));
      return;
    }
    if (files.length === 0) {
      setError(t('workspace.chooseFilesBeforeSubmitError'));
      return;
    }

    setSubmissionPhase('uploading');
    setUploadProgress(null);
    setError(null);
    try {
      const result = await onSubmit(
        { description: trimmedDescription, files },
        {
          onUploadProgress: progress => {
            setUploadProgress(progress);
            setSubmissionPhase(progress.percent === 100 ? 'processing' : 'uploading');
          },
          onRefreshing: () => setSubmissionPhase('refreshing'),
        },
      );
      if (!result.success) {
        setError(getSubmissionErrorMessage(result));
        setSubmissionPhase('idle');
        setUploadProgress(null);
        return;
      }
      toast.success(t('workspace.submitDeliverableSuccess'));
      onClose();
    } catch {
      setError(t('workspace.failedSubmitDeliverableError'));
      setSubmissionPhase('idle');
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn" role="presentation">
      <div className="bg-background border border-border/80 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="workspace-submit-title" aria-busy={isSubmitting}>
        <div className="p-6 border-b border-border/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <Upload size={20} />
            </div>
            <div>
              <h3 id="workspace-submit-title" className="text-base font-black text-text-primary tracking-tight">
                {t('workspace.submitDeliverableModalTitle')}
              </h3>
              <p className="text-xs font-bold text-brand mt-0.5">{milestoneTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-muted transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" title={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-black uppercase tracking-wider text-text-muted">
                {t('workspace.fileSourceOption')} <span className="text-destructive">*</span>
              </label>
              <span className="text-[10px] font-bold text-text-muted">
                {files.length}/{MAX_MILESTONE_FILES} · {formatMegabytes(getMilestoneBatchSize(files))}
              </span>
            </div>
            <input ref={fileInputRef} id="workspace-deliverable-file" type="file" accept={MILESTONE_FILE_ACCEPT} onChange={handleFileChange} disabled={isSubmitting || files.length >= MAX_MILESTONE_FILES} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={event => event.preventDefault()}
              onDrop={handleDrop}
              disabled={isSubmitting || files.length >= MAX_MILESTONE_FILES}
              className="w-full border-2 border-dashed border-border/80 hover:border-brand/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-surface-card/40 hover:bg-surface-card transition text-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-110 transition-transform mb-2">
                <Upload size={21} />
              </div>
              <span className="text-xs font-black text-text-primary">{t('workspace.addOneDeliverableFile')}</span>
              <span className="text-[10px] font-bold text-text-muted mt-1">{t('workspace.deliverableFileHelp')}</span>
            </button>
          </div>

          {files.length > 0 && (
            <ul className="space-y-2" aria-label={t('workspace.selectedDeliverableFiles')}>
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}`} className="border border-brand/30 bg-brand/5 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0"><FileText size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-text-primary truncate">{file.name}</p>
                      <p className="text-[10px] font-bold text-text-muted mt-0.5">{formatMegabytes(file.size)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} disabled={isSubmitting} className="p-2 rounded-xl text-text-muted hover:text-destructive hover:bg-destructive/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" title={t('workspace.removeDeliverableFile')}>
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="workspace-deliverable-description" className="text-xs font-black uppercase tracking-wider text-text-muted">{t('workspace.descriptionField')}</label>
              <span className="text-[10px] font-bold text-text-muted">{description.length}/5000</span>
            </div>
            <textarea id="workspace-deliverable-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={5000} rows={4} placeholder={t('workspace.addNotesPlaceholder')} disabled={isSubmitting} className="w-full bg-surface-card border border-border/80 focus:border-brand rounded-2xl p-3.5 text-xs font-medium text-text-primary focus:outline-none transition resize-none placeholder:text-text-muted/60" />
          </div>

          {submissionPhase !== 'idle' && (
            <FileUploadProgress phase={submissionPhase} progress={uploadProgress} />
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border/60">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl border border-border bg-surface-card hover:bg-surface-muted text-text-primary text-xs font-black transition cursor-pointer disabled:opacity-50">{t('common.cancel')}</button>
            <button type="submit" disabled={isSubmitting || files.length === 0} className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground text-xs font-black flex items-center gap-2 transition shadow-md cursor-pointer">
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {submissionPhase === 'uploading'
                    ? t('workspace.uploadingDeliverable')
                    : submissionPhase === 'processing'
                      ? t('workspace.processingDeliverable')
                      : t('workspace.refreshingWorkspace')}
                </>
              ) : <><Upload size={15} />{t('common.submit')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
