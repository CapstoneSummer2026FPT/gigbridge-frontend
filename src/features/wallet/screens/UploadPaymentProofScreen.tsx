import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Image,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  getStoredPaymentProofs,
  saveStoredPaymentProofs,
  type PendingPaymentProof,
} from '../mock/data-for-UploadPaymentProofScreen';
import '../styles/upload-payment-proof-screen.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

export default function UploadPaymentProofScreen() {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();
  const [proofs, setProofs] = useState<PendingPaymentProof[]>(getStoredPaymentProofs);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState('');

  const payment = useMemo(() =>
    proofs.find(item => item.transactionId === transactionId) || proofs[0],
    [proofs, transactionId]
  );

  const validateFile = (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Only JPG, PNG, GIF, or PDF formats are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be under 10MB';
    }
    return '';
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError('');
    setSuccess('');
  };

  const uploadProof = () => {
    if (!selectedFile || !payment) return;
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextProofs = proofs.map(item =>
      item.transactionId === payment.transactionId
        ? {
            ...item,
            status: 'pending_admin_review' as const,
            uploadedFileName: selectedFile.name,
            uploadedFileUrl: '#',
            uploadedAt: new Date().toISOString(),
            adminNote: 'Admin notification created for manual verification.',
          }
        : item
    );

    setProofs(nextProofs);
    saveStoredPaymentProofs(nextProofs);
    setSelectedFile(null);
    setSuccess('Payment proof uploaded. Admin has been notified for verification.');
    setError('');
  };

  const copyReference = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(''), 1200);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!payment) {
    return (
      <AppLayout>
        <div className="payment-proof-page">
          <div className="payment-proof-empty">
            <AlertTriangle size={32} />
            <strong>No pending payment found.</strong>
            <button onClick={() => navigate('/wallet/history')}>Back to Wallet History</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="payment-proof-page">
        <header className="payment-proof-header">
          <button className="payment-proof-back" onClick={() => navigate('/wallet/history')}>
            <ArrowLeft size={17} />
            Back
          </button>
          <div>
            <p className="payment-proof-kicker">Manual Verification</p>
            <h1>Upload Payment Proof</h1>
            <p>Upload a bank transfer receipt or screenshot so Admin can verify and credit the payment.</p>
          </div>
        </header>

        {error && <div className="payment-proof-alert danger"><AlertTriangle size={17} />{error}</div>}
        {success && <div className="payment-proof-alert success"><CheckCircle2 size={17} />{success}</div>}

        <div className="payment-proof-layout">
          <main className="payment-proof-main">
            <section className="payment-proof-card">
              <div className="payment-proof-card-head">
                <div>
                  <h2>{payment.title}</h2>
                  <p>{payment.description}</p>
                </div>
                <span className={`payment-proof-status ${payment.status}`}>
                  {payment.status === 'pending_admin_review' ? 'Pending Admin Review' :
                    payment.status === 'approved' ? 'Approved' :
                    payment.status === 'rejected' ? 'Rejected' : 'Proof Required'}
                </span>
              </div>

              <div className="payment-proof-detail-grid">
                <div>
                  <span>Transaction ID</span>
                  <strong>{payment.transactionId}</strong>
                </div>
                <div>
                  <span>Payment Type</span>
                  <strong>{payment.paymentType.replace('_', ' ')}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>${payment.amount.toLocaleString()} {payment.currency}</strong>
                </div>
                <div>
                  <span>Due At</span>
                  <strong>{formatDate(payment.dueAt)}</strong>
                </div>
              </div>
            </section>

            <section className="payment-proof-card">
              <div className="payment-proof-section-title">
                <Banknote size={18} />
                Bank Transfer Details
              </div>
              <div className="payment-proof-bank-grid">
                {[
                  ['Bank', payment.bankName],
                  ['Account Name', payment.bankAccountName],
                  ['Account Number', payment.bankAccountNumber],
                  ['Reference Code', payment.referenceCode],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <button type="button" onClick={() => copyReference(value, label)}>
                      <Copy size={13} />
                      {copied === label ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="payment-proof-card">
              <div className="payment-proof-section-title">
                <UploadCloud size={18} />
                Receipt Upload
              </div>

              <label className="payment-proof-dropzone">
                <UploadCloud size={34} />
                <strong>Drop receipt here or click to browse</strong>
                <span>Accepted formats: JPG, PNG, GIF, PDF. Max file size: 10MB.</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.pdf,image/jpeg,image/png,image/gif,application/pdf"
                  onChange={event => handleFileChange(event.target.files?.[0])}
                />
              </label>

              {selectedFile && (
                <div className="payment-proof-selected-file">
                  {selectedFile.type === 'application/pdf' ? <FileText size={18} /> : <Image size={18} />}
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)}><X size={16} /></button>
                </div>
              )}

              {payment.uploadedFileName && (
                <div className="payment-proof-current-file">
                  <FileText size={17} />
                  <div>
                    <strong>{payment.uploadedFileName}</strong>
                    <span>Uploaded {payment.uploadedAt ? formatDate(payment.uploadedAt) : ''}</span>
                  </div>
                </div>
              )}

              <button className="payment-proof-submit" disabled={!selectedFile} onClick={uploadProof}>
                <UploadCloud size={18} />
                Submit Proof for Admin Verification
              </button>
            </section>
          </main>

          <aside className="payment-proof-side">
            <div className="payment-proof-review-card">
              <ShieldCheck size={22} />
              <strong>Admin Verification Flow</strong>
              <ol>
                <li>Client uploads payment proof.</li>
                <li>Admin receives verification notification.</li>
                <li>Admin approves or rejects the receipt.</li>
                <li>Approved payment credits escrow or subscription.</li>
              </ol>
            </div>

            <div className="payment-proof-review-card">
              <Clock size={22} />
              <strong>Review Status</strong>
              <p>{payment.adminNote || 'Waiting for your upload before Admin review starts.'}</p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
