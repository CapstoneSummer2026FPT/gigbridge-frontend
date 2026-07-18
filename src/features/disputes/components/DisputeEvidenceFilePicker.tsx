import { FileText, Upload, X } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import './dispute-evidence-file-picker.css';

export const MAX_DISPUTE_EVIDENCE_FILES = 5;
export const MAX_DISPUTE_EVIDENCE_SIZE = 100 * 1024 * 1024;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface DisputeEvidenceFilePickerProps {
  files: File[];
  disabled?: boolean;
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
}

export function DisputeEvidenceFilePicker({
  files,
  disabled = false,
  onChange,
  onError,
}: DisputeEvidenceFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (selected.length === 0) return;

    if (files.length + selected.length > MAX_DISPUTE_EVIDENCE_FILES) {
      onError(`You can upload up to ${MAX_DISPUTE_EVIDENCE_FILES} evidence files at a time.`);
      return;
    }

    const invalid = selected.find(file => file.size <= 0 || file.size > MAX_DISPUTE_EVIDENCE_SIZE);
    if (invalid) {
      onError(
        invalid.size <= 0
          ? `${invalid.name} is empty.`
          : `${invalid.name} exceeds the 100 MB file limit.`,
      );
      return;
    }

    onError(null);
    onChange([...files, ...selected]);
  };

  return (
    <div className="dispute-file-picker">
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        onChange={selectFiles}
        className="dispute-file-picker-input"
      />
      <button
        type="button"
        className="dispute-file-picker-button"
        disabled={disabled || files.length >= MAX_DISPUTE_EVIDENCE_FILES}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={17} /> Select evidence
      </button>
      <span className="dispute-file-picker-hint">Up to 5 files, 100 MB each.</span>

      {files.length > 0 && (
        <div className="dispute-file-picker-list">
          {files.map((file, index) => (
            <div className="dispute-file-picker-item" key={`${file.name}-${file.lastModified}-${index}`}>
              <FileText size={17} />
              <span title={file.name}>{file.name}</span>
              <small>{formatSize(file.size)}</small>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
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
