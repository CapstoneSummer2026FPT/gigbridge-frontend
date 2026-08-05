import { FileText, Upload, X } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/elo-history-screen.css';

const MAX_ELO_EVIDENCE_FILES = 5;
const MAX_ELO_EVIDENCE_SIZE = 100 * 1024 * 1024;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface EloAppealEvidencePickerProps {
  files: File[];
  disabled?: boolean;
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
}

/**
 * Evidence file picker for Elo appeals. Mirrors the dispute-evidence upload
 * limits enforced by the backend: up to 5 files, 100 MB each.
 */
export function EloAppealEvidencePicker({
  files,
  disabled = false,
  onChange,
  onError,
}: EloAppealEvidencePickerProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (selected.length === 0) return;

    if (files.length + selected.length > MAX_ELO_EVIDENCE_FILES) {
      onError(t('elo.appeal.tooManyFiles', { max: MAX_ELO_EVIDENCE_FILES }));
      return;
    }

    const invalid = selected.find(file => file.size <= 0 || file.size > MAX_ELO_EVIDENCE_SIZE);
    if (invalid) {
      onError(
        invalid.size <= 0
          ? t('elo.appeal.emptyFile', { name: invalid.name })
          : t('elo.appeal.fileTooLarge', { name: invalid.name }),
      );
      return;
    }

    onError(null);
    onChange([...files, ...selected]);
  };

  return (
    <div className="elo-file-picker">
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        onChange={selectFiles}
        className="elo-file-picker-input"
      />
      <button
        type="button"
        className="elo-file-picker-button"
        disabled={disabled || files.length >= MAX_ELO_EVIDENCE_FILES}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={16} /> {t('elo.appeal.selectEvidence')}
      </button>
      <span className="elo-file-picker-hint">{t('elo.appeal.evidenceHint')}</span>

      {files.length > 0 && (
        <div className="elo-file-picker-list">
          {files.map((file, index) => (
            <div className="elo-file-picker-item" key={`${file.name}-${file.lastModified}-${index}`}>
              <FileText size={15} />
              <span title={file.name}>{file.name}</span>
              <small>{formatSize(file.size)}</small>
              <button
                type="button"
                disabled={disabled}
                aria-label={t('elo.appeal.removeFile', { name: file.name })}
                onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
