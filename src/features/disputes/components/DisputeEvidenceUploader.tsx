import { AlertCircle, LoaderCircle, Upload } from 'lucide-react';
import { useState } from 'react';
import { disputePostAPI } from '../../../api/disputeAPI';
import type { DisputeEvidence } from '../../../types/models/Dispute';
import { DisputeEvidenceFilePicker } from './DisputeEvidenceFilePicker';

interface DisputeEvidenceUploaderProps {
  contractId: string;
  disputeId: string;
  disabled: boolean;
  onUploaded: (evidence: DisputeEvidence[]) => void;
}

export function DisputeEvidenceUploader({
  contractId,
  disputeId,
  disabled,
  onUploaded,
}: DisputeEvidenceUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (disabled || submitting || files.length === 0) return;
    setSubmitting(true);
    setError(null);
    const response = await disputePostAPI.addEvidence(contractId, disputeId, files);
    setSubmitting(false);

    if (!response.success || !response.data) {
      setError(response.message || 'Unable to upload dispute evidence.');
      return;
    }

    onUploaded(response.data);
    setFiles([]);
  };

  if (disabled) {
    return (
      <div className="dispute-evidence-locked">
        Evidence can only be added while the dispute is open or under review.
      </div>
    );
  }

  return (
    <div className="dispute-evidence-uploader">
      <h3>Add evidence</h3>
      <p>Upload files, images, videos, archives, or documents that support your case.</p>
      <DisputeEvidenceFilePicker
        files={files}
        disabled={submitting}
        onChange={setFiles}
        onError={setError}
      />
      {error && <div className="dispute-download-error" role="alert"><AlertCircle size={17} /> {error}</div>}
      <button type="button" disabled={submitting || files.length === 0} onClick={() => void upload()}>
        {submitting ? <LoaderCircle className="dispute-detail-spinner" size={17} /> : <Upload size={17} />}
        {submitting ? 'Uploading…' : 'Upload evidence'}
      </button>
    </div>
  );
}
