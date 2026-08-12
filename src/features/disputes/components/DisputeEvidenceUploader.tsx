import { AlertCircle, LoaderCircle, Upload, ShieldPlus } from 'lucide-react';
import { useState } from 'react';
import { disputePostAPI } from '../../../api/disputeAPI';
import type { DisputeEvidence } from '../../../types/models/Dispute';
import { DisputeEvidenceFilePicker } from './DisputeEvidenceFilePicker';

interface DisputeEvidenceUploaderProps {
  contractId: string;
  disputeId: string;
  disabled: boolean;
  onUploaded: (evidence: DisputeEvidence[]) => void;
  requestEvidenceId?: string;
  title?: string;
}

export function DisputeEvidenceUploader({
  contractId,
  disputeId,
  disabled,
  onUploaded,
  requestEvidenceId,
  title = 'Bổ sung Bằng chứng mới',
}: DisputeEvidenceUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (disabled || submitting || files.length === 0) return;
    setSubmitting(true);
    setError(null);
    const response = requestEvidenceId
      ? await disputePostAPI.addEvidence(contractId, disputeId, files, requestEvidenceId)
      : await disputePostAPI.addEvidence(contractId, disputeId, files);
    setSubmitting(false);

    if (!response.success || !response.data) {
      setError(response.message || 'Không thể tải lên bằng chứng tranh chấp.');
      return;
    }

    onUploaded(response.data);
    setFiles([]);
  };

  if (disabled) {
    return (
      <div className="p-4 rounded-xl bg-surface-muted border border-border text-muted-foreground text-xs italic mb-4">
        🔒 Tính năng tải lên bằng chứng chỉ khả dụng khi hồ sơ tranh chấp đang trong quá trình xử lý.
      </div>
    );
  }

  return (
    <div className="border border-border/80 bg-surface/50 rounded-2xl p-5 mb-5 space-y-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldPlus size={18} className="text-brand" />
          <h3 className="font-extrabold text-sm text-foreground">{title}</h3>
        </div>
        {files.length > 0 && (
          <span className="text-xs font-bold text-brand">
            Đã chọn {files.length} tập tin
          </span>
        )}
      </div>

      <DisputeEvidenceFilePicker
        files={files}
        disabled={submitting}
        onChange={setFiles}
        onError={setError}
      />

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            className="dispute-upload-submit-btn"
            disabled={submitting || files.length === 0}
            onClick={() => void upload()}
          >
            {submitting ? <LoaderCircle className="animate-spin" size={17} /> : <Upload size={17} />}
            <span>{submitting ? 'Đang tải lên...' : `Tải lên ${files.length} bằng chứng`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
