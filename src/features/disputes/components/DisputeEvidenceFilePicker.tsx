import { FileText, X, UploadCloud, FileCheck } from 'lucide-react';
import { useRef, type ChangeEvent, type DragEvent, useState } from 'react';
import '../styles/dispute-evidence-file-picker.css';

const MAX_DISPUTE_EVIDENCE_FILES = 5;
const MAX_DISPUTE_EVIDENCE_SIZE = 100 * 1024 * 1024;

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
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (selected: File[]) => {
    if (selected.length === 0) return;

    if (files.length + selected.length > MAX_DISPUTE_EVIDENCE_FILES) {
      onError(`Bạn chỉ có thể tải lên tối đa ${MAX_DISPUTE_EVIDENCE_FILES} tập tin cùng lúc.`);
      return;
    }

    const invalid = selected.find(file => file.size <= 0 || file.size > MAX_DISPUTE_EVIDENCE_SIZE);
    if (invalid) {
      onError(
        invalid.size <= 0
          ? `${invalid.name} là tập tin rỗng.`
          : `${invalid.name} vượt quá giới hạn 100 MB.`,
      );
      return;
    }

    onError(null);
    onChange([...files, ...selected]);
  };

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    processFiles(selected);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    processFiles(droppedFiles);
  };

  return (
    <div className="dispute-file-picker-wrapper">
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        onChange={selectFiles}
        className="dispute-file-picker-input"
      />

      <div
        className={`dispute-file-dropzone ${disabled ? 'disabled' : ''} ${isDragging ? 'border-brand bg-brand/5' : ''}`}
        onClick={() => !disabled && files.length < MAX_DISPUTE_EVIDENCE_FILES && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="dispute-dropzone-icon">
          <UploadCloud size={26} />
        </div>
        <div className="dispute-dropzone-title">
          {disabled
            ? 'Kho bằng chứng đã khóa (Vụ việc đã đóng hoặc phân xử xong)'
            : 'Kéo & thả tập tin bằng chứng vào đây hoặc nhấp để chọn'}
        </div>
        <div className="dispute-dropzone-sub">
          Hỗ trợ định dạng hình ảnh, video, tài liệu, file nén (.zip, .rar, .pdf, .mp4, .png...)
        </div>
        <div className="dispute-dropzone-badge text-[10px] py-0.5 px-2 font-medium">
          <FileCheck size={11} />
          <span>Tối đa {MAX_DISPUTE_EVIDENCE_FILES} file • 100 MB/file</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="dispute-selected-files-list">
          <div className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-1">
            Tập tin chuẩn bị tải lên ({files.length}/{MAX_DISPUTE_EVIDENCE_FILES}):
          </div>
          {files.map((file, index) => (
            <div className="dispute-selected-file-chip" key={`${file.name}-${file.lastModified}-${index}`}>
              <div className="dispute-selected-file-main">
                <div className="dispute-selected-file-icon">
                  <FileText size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="dispute-selected-file-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="dispute-selected-file-size">{formatSize(file.size)}</span>
                </div>
              </div>
              <button
                type="button"
                className="dispute-selected-file-remove"
                disabled={disabled}
                aria-label={`Gỡ bỏ ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(files.filter((_, itemIndex) => itemIndex !== index));
                }}
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
