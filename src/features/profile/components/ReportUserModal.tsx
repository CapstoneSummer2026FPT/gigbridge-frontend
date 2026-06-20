import { useState, type FormEvent } from 'react';
import { AlertTriangle, Flag, X } from 'lucide-react';
import { reportAPI } from '../../../api/reportAPI';
import { ReportType } from '../../../types/models/Report';

interface ReportUserModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  [ReportType.Spam, 'Spam'],
  [ReportType.Fraud, 'Fraud or scam'],
  [ReportType.InappropriateContent, 'Inappropriate content'],
  [ReportType.HarassmentOrAbuse, 'Harassment or abuse'],
  [ReportType.Other, 'Other'],
] as const;

export function ReportUserModal({ userId, userName, onClose, onSuccess }: ReportUserModalProps) {
  const [type, setType] = useState<ReportType>(ReportType.Spam);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please explain why you are reporting this user.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const response = await reportAPI.createReport({
      reportedEntityId: userId,
      reportedEntityType: 'User',
      type,
      reason: trimmedReason,
    });

    if (response.success) {
      onSuccess();
      return;
    }

    setError(response.message || 'Unable to submit your report.');
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={submitting ? undefined : onClose}>
      <div className="glass-card max-w-lg w-full p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-red/15 flex items-center justify-center"><Flag size={21} className="text-red" /></div>
            <div>
              <h2 className="text-xl font-bold text-primary">Report user</h2>
              <p className="text-sm text-secondary">Report {userName} to the moderation team.</p>
            </div>
          </div>
          <button disabled={submitting} onClick={onClose} className="p-2 rounded-lg glass-button"><X size={18} /></button>
        </div>

        <form onSubmit={submit}>
          <label className="text-sm font-semibold text-primary block mb-2">Reason</label>
          <select
            className="input-gb w-full px-3 py-2.5 text-sm mb-5"
            value={type}
            onChange={(event) => setType(Number(event.target.value) as ReportType)}
          >
            {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          <label className="text-sm font-semibold text-primary block mb-2">What happened?</label>
          <textarea
            className="input-gb w-full min-h-36 p-3 text-sm resize-y"
            value={reason}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Give the moderation team enough detail to review this report."
          />
          <p className="text-xs text-muted text-right mt-1">{reason.length}/2000</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red/30 bg-red/10 p-3 flex gap-2 text-sm text-red">
              <AlertTriangle size={17} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" disabled={submitting} onClick={onClose} className="btn-ghost-cyan px-5 py-2.5">Cancel</button>
            <button type="submit" disabled={submitting || !reason.trim()} className="btn-red px-5 py-2.5 disabled:opacity-50 flex items-center gap-2">
              <Flag size={16} /> {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
