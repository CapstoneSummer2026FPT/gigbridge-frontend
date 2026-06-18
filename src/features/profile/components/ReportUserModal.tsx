import { AlertTriangle, Flag, XCircle } from 'lucide-react';
import { useState } from 'react';
import { reportsAPI } from '../../../api/reportsAPI';
import { ReportType } from '../../../types/models/Report';

interface ReportUserModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const reportTypeLabels: Record<ReportType, string> = {
  [ReportType.Spam]: 'Spam',
  [ReportType.Fraud]: 'Fraud',
  [ReportType.InappropriateContent]: 'Inappropriate Content',
  [ReportType.HarassmentOrAbuse]: 'Harassment or Abuse',
  [ReportType.Other]: 'Other',
  [ReportType.PaymentDispute]: 'Payment Dispute',
};

export function ReportUserModal({ userId, userName, onClose, onSubmitted }: ReportUserModalProps) {
  const [type, setType] = useState<ReportType>(ReportType.Spam);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please describe why you are reporting this user.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await reportsAPI.createReport({
      reportedEntityId: userId,
      reportedEntityType: 'User',
      type,
      reason: trimmedReason,
    });

    if (response.success) {
      onSubmitted?.();
      onClose();
    } else {
      setError(response.message || 'Unable to submit report.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card max-w-lg w-full p-6" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
              <Flag size={22} className="text-red" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Report User</h2>
              <p className="text-xs text-secondary">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors">
            <XCircle size={20} className="text-red" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-secondary mb-2 block">Report Type</span>
            <select
              value={type}
              onChange={event => setType(Number(event.target.value) as ReportType)}
              className="input-gb w-full px-4 py-2.5 text-sm cursor-pointer"
            >
              {Object.entries(reportTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-secondary mb-2 block">Reason</span>
            <textarea
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Describe what happened..."
              className="input-gb w-full text-sm min-h-[120px] resize-y"
              maxLength={2000}
            />
          </label>

          {error && (
            <div className="bg-red/10 border border-red/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={isSubmitting} className="btn-ghost-cyan px-6 py-2 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-red px-6 py-2 flex items-center gap-2 disabled:opacity-50">
            <Flag size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
