import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Flag,
  Gavel,
  History,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPutAPI } from '../../../api/adminAPI/PUT';
import { AppLayout } from '../../../shared/components/AppLayout';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';
import {
  AccountReportResolutionAction,
  AccountStatus,
  UserViolationType,
  type AccountReportDetail,
} from '../../../types/models/AdminPhase1';
import '../styles/admin-account-report.css';

type ResolutionIntent = AccountReportResolutionAction | 'dismiss' | null;

const REPORT_STATUS = ['Pending', 'Reviewing', 'Resolved', 'Dismissed'];
const ACCOUNT_STATUS = ['Active', 'Suspended', 'Banned'];
const REPORT_TYPE = ['Spam', 'Fraud', 'Inappropriate content', 'Harassment or abuse', 'Other', 'Payment dispute'];
const VIOLATION_TYPE = ['Contract breach', 'Fraud or misrepresentation', 'Harassment or abuse', 'Payment misconduct', 'Platform policy violation', 'Other'];
const RESOLUTION_LABEL = ['No account action', 'Warning issued', 'Account suspended', 'Permanently banned'];

const formatDate = (value?: string | null, fallback = 'Not available') => value
  ? new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  : fallback;

const reportStatusTone = (status: number) => {
  if (status === 0) return 'warning';
  if (status === 1) return 'info';
  if (status === 2) return 'success';
  return 'neutral';
};

const accountStatusTone = (status: AccountStatus) => {
  if (status === AccountStatus.Active) return 'success';
  if (status === AccountStatus.Suspended) return 'warning';
  return 'danger';
};

const intentTitle = (intent: ResolutionIntent) => {
  if (intent === 'dismiss') return 'Dismiss report';
  if (intent === AccountReportResolutionAction.None) return 'Resolve without account action';
  if (intent === AccountReportResolutionAction.Warning) return 'Issue account warning';
  if (intent === AccountReportResolutionAction.Suspension) return 'Suspend account';
  return 'Permanently ban account';
};

function DetailCard({ title, description, icon, children }: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="account-report__card">
      <header className="account-report__section-header">
        <span>{icon}</span>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="account-report__fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function AdminAccountReportDetailScreen() {
  const { reportId = '' } = useParams();
  const [data, setData] = useState<AccountReportDetail>();
  const [loading, setLoading] = useState(true);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const suspensionEndRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<ResolutionIntent>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [suspensionEnd, setSuspensionEnd] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminGetAPI.getAccountReportDetail(reportId);
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setData(undefined);
        setError(response.message || 'Unable to load this account report.');
      }
    } catch {
      setData(undefined);
      setError('Unable to load this account report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markReviewing = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await adminPutAPI.updateAccountReportStatus(reportId, 1);
      if (response.success && response.data) setData(response.data);
      else setError(response.message || 'Unable to mark this report as reviewing.');
    } catch {
      setError('Unable to mark this report as reviewing. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    if (busy) return;
    setIntent(null);
    setReason('');
    setDescription('');
    setSuspensionEnd('');
  };

  const submitDecision = async () => {
    if (intent === null) return;
    const validationMessages: string[] = [];
    if (!reason.trim()) validationMessages.push('Enter the decision reason.');
    if (intent === AccountReportResolutionAction.Suspension && !suspensionEnd) {
      validationMessages.push('Select a suspension end date.');
    }
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Complete the required decision details.' });
      if (!reason.trim()) reasonRef.current?.focus();
      else suspensionEndRef.current?.focus();
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = intent === 'dismiss'
        ? await adminPutAPI.updateAccountReportStatus(reportId, 3, reason.trim())
        : await adminPutAPI.resolveAccountReport(reportId, {
            action: intent,
            reason: reason.trim(),
            description: description.trim() || undefined,
            violationType: intent === AccountReportResolutionAction.None
              ? undefined
              : UserViolationType.PlatformPolicyViolation,
            suspendedUntil: intent === AccountReportResolutionAction.Suspension
              ? new Date(suspensionEnd).toISOString()
              : undefined,
          });

      if (response.success && response.data) {
        setData(response.data);
        setIntent(null);
        setReason('');
        setDescription('');
        setSuspensionEnd('');
      } else {
        if (isValidationResponse(response)) {
          showValidationToast(response, { fallback: response.message || 'Unable to apply this decision.' });
          reasonRef.current?.focus();
          return;
        }
        setError(response.message || 'Unable to apply this decision.');
      }
    } catch {
      setError('Unable to apply this decision. Please check the details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (evidenceId: string) => {
    setError('');
    try {
      const response = await adminGetAPI.getAccountReportEvidenceDownload(reportId, evidenceId);
      if (response.success && response.data) {
        window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        setError(response.message || 'Unable to download this evidence file.');
      }
    } catch {
      setError('Unable to download this evidence file. Please try again.');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="account-report account-report__loading" aria-busy="true">
          <Link to="/admin/reports?reportedEntityType=User" className="account-report__back"><ArrowLeft size={16} /> Reports</Link>
          <section className="account-report__card" role="status" aria-label="Loading account report">
            <div className="account-report__skeleton account-report__skeleton--title" />
            {Array.from({ length: 5 }).map((_, index) => <div className="account-report__skeleton" key={index} />)}
          </section>
        </main>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <main className="account-report">
          <Link to="/admin/reports?reportedEntityType=User" className="account-report__back"><ArrowLeft size={16} /> Reports</Link>
          <section className="account-report__error-state" role="alert">
            <AlertTriangle size={40} />
            <h1>Account report could not be loaded</h1>
            <p>{error}</p>
            <button type="button" onClick={() => void load()}><RefreshCw size={16} /> Retry</button>
          </section>
        </main>
      </AppLayout>
    );
  }

  const { report } = data;
  const final = report.status >= 2;

  return (
    <AppLayout>
      <main className="account-report">
        <Link to="/admin/reports?reportedEntityType=User" className="account-report__back"><ArrowLeft size={16} /> Reports</Link>

        <header className="account-report__hero">
          <div className="account-report__hero-copy">
            <div className="account-report__eyebrow"><ShieldAlert size={17} /> Account enforcement case</div>
            <div className="account-report__title-row">
              <h1>{report.reason}</h1>
              <span className={`account-report__badge ${reportStatusTone(report.status)}`}>{REPORT_STATUS[report.status] || `Status ${report.status}`}</span>
            </div>
            <p>{data.description || 'No additional report description was supplied.'}</p>
            <span className="account-report__case-id">Case {report.id}</span>
          </div>
          <div className={`account-report__account-state ${accountStatusTone(report.accountStatus)}`}>
            <span className="account-report__account-state-icon"><ShieldCheck size={22} /></span>
            <div>
              <small>Current account status</small>
              <strong>{ACCOUNT_STATUS[report.accountStatus] || 'Unknown'}</strong>
              <p>{report.violationCount} recorded violation{report.violationCount === 1 ? '' : 's'}{report.isFlagged ? ' · Flagged' : ''}</p>
              {report.suspendedUntil && <p>Until {formatDate(report.suspendedUntil)}</p>}
            </div>
          </div>
        </header>

        {error && <div className="account-report__error" role="alert"><AlertTriangle size={18} /> {error}</div>}

        <div className="account-report__layout">
          <div className="account-report__content">
            <DetailCard title="Case overview" description="People and context connected to this report." icon={<FileText size={19} />}>
              <dl className="account-report__facts">
                <Fact label="Reporter">
                  <span>{report.reporterName}</span>
                  <small>Submitted {formatDate(report.createdAt)}</small>
                </Fact>
                <Fact label="Reported account">
                  <Link to={`/admin/users?preview=${encodeURIComponent(report.reportedUserId)}`}>{report.reportedUserName}</Link>
                  <small>Open full user record</small>
                </Fact>
                <Fact label="Report category">
                  <span>{REPORT_TYPE[report.type] || `Type ${report.type}`}</span>
                  <small>{report.evidenceCount} evidence file{report.evidenceCount === 1 ? '' : 's'}</small>
                </Fact>
                <Fact label="Case owner">
                  <span>{report.assignedAdminName || 'Unassigned'}</span>
                  <small>{report.assignedAdminName ? 'Assigned administrator' : 'Available for review'}</small>
                </Fact>
              </dl>
              <div className="account-report__narrative">
                <small>Report description</small>
                <p>{data.description || 'No additional description was supplied.'}</p>
              </div>
            </DetailCard>

            <DetailCard title="Evidence" description="Files submitted with this report." icon={<Download size={19} />}>
              {data.evidence.length ? (
                <div className="account-report__evidence-list">
                  {data.evidence.map((item) => (
                    <article key={item.id} className="account-report__evidence">
                      <span><FileText size={19} /></span>
                      <div>
                        <strong>{item.fileName}</strong>
                        <small>{Math.ceil(item.fileSize / 1024)} KB · {item.contentType} · {formatDate(item.createdAt)}</small>
                        {item.description && <p>{item.description}</p>}
                      </div>
                      <button type="button" onClick={() => void download(item.id)}><Download size={15} /> Download</button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="account-report__empty"><FileText size={24} /><p>No evidence was supplied with this report.</p></div>
              )}
            </DetailCard>

            <DetailCard title="Account history" description="Previous signals for the reported account." icon={<History size={19} />}>
              <div className="account-report__history-columns">
                <div>
                  <h3><Flag size={15} /> Previous reports <span>{data.previousReports.length}</span></h3>
                  {data.previousReports.length ? data.previousReports.map((item) => (
                    <article className="account-report__history-item" key={item.id}>
                      <div><strong>{item.reason}</strong><small>{REPORT_TYPE[item.type] || `Type ${item.type}`} · {formatDate(item.createdAt)}</small></div>
                      <span className={`account-report__badge ${reportStatusTone(item.status)}`}>{REPORT_STATUS[item.status] || `Status ${item.status}`}</span>
                    </article>
                  )) : <p className="account-report__muted">No previous reports.</p>}
                </div>
                <div>
                  <h3><Gavel size={15} /> Violations <span>{data.violations.length}</span></h3>
                  {data.violations.length ? data.violations.map((item) => (
                    <article className="account-report__history-item" key={item.id}>
                      <div><strong>{VIOLATION_TYPE[item.type] || `Violation ${item.type}`}</strong><small>{item.reason} · {formatDate(item.createdAt)}</small></div>
                      <span className={`account-report__badge ${item.isActive ? 'danger' : 'neutral'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
                    </article>
                  )) : <p className="account-report__muted">No recorded violations.</p>}
                </div>
              </div>
            </DetailCard>

            <DetailCard title="Case activity" description="Audit trail for review and enforcement changes." icon={<Clock3 size={19} />}>
              {data.auditLogs.length ? (
                <div className="account-report__timeline">
                  {data.auditLogs.map((item, index) => (
                    <article key={item.auditLogId || item.id || `${item.correlationId}-${index}`}>
                      <span />
                      <div>
                        <strong>{item.action}</strong>
                        <p>{item.adminName || 'System'} · {formatDate(item.createdAt)}</p>
                        {item.newValues !== undefined && (
                          <details>
                            <summary>View change details</summary>
                            <pre>{typeof item.newValues === 'string' ? item.newValues : JSON.stringify(item.newValues, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="account-report__empty"><Clock3 size={24} /><p>No activity has been recorded yet.</p></div>
              )}
            </DetailCard>
          </div>

          <aside className="account-report__decision-card">
            <div className="account-report__decision-heading">
              <span><Gavel size={20} /></span>
              <div><h2>Enforcement decision</h2><p>Resolve the report and choose the appropriate account outcome.</p></div>
            </div>

            {final ? (
              <div className="account-report__final">
                <CheckCircle2 size={28} />
                <strong>Case finalized</strong>
                <p>{report.status === 3
                  ? 'Dismissed'
                  : data.resolutionAction !== undefined
                    ? RESOLUTION_LABEL[data.resolutionAction]
                    : REPORT_STATUS[report.status]}</p>
                {data.adminNote && <blockquote>{data.adminNote}</blockquote>}
                <small>{formatDate(data.resolvedAt, 'Resolution time not available')}</small>
              </div>
            ) : (
              <>
                {report.status === 0 && (
                  <button className="account-report__decision-button review" type="button" disabled={busy} onClick={() => void markReviewing()}>
                    <Clock3 size={17} /><span><strong>Mark as reviewing</strong><small>Claim the case for investigation</small></span>
                  </button>
                )}
                <button className="account-report__decision-button" type="button" disabled={busy} onClick={() => setIntent(AccountReportResolutionAction.None)}>
                  <CheckCircle2 size={17} /><span><strong>Resolve without action</strong><small>Close the report with no penalty</small></span>
                </button>
                <button className="account-report__decision-button warning" type="button" disabled={busy} onClick={() => setIntent(AccountReportResolutionAction.Warning)}>
                  <AlertTriangle size={17} /><span><strong>Issue warning</strong><small>Record a policy violation</small></span>
                </button>
                <button className="account-report__decision-button warning" type="button" disabled={busy} onClick={() => setIntent(AccountReportResolutionAction.Suspension)}>
                  <CalendarClock size={17} /><span><strong>Suspend account</strong><small>Restrict access until a set date</small></span>
                </button>
                <button className="account-report__decision-button danger" type="button" disabled={busy} onClick={() => setIntent(AccountReportResolutionAction.PermanentBan)}>
                  <Ban size={17} /><span><strong>Permanently ban</strong><small>Remove account access</small></span>
                </button>
                <div className="account-report__decision-divider" />
                <button className="account-report__dismiss" type="button" disabled={busy} onClick={() => setIntent('dismiss')}><X size={16} /> Dismiss report</button>
              </>
            )}

            <Link className="account-report__user-link" to={`/admin/users?preview=${encodeURIComponent(report.reportedUserId)}`}>
              <UserRound size={16} /> View full account record
            </Link>
          </aside>
        </div>
      </main>

      {intent !== null && (
        <div className="account-report__modal" role="presentation" onMouseDown={closeDialog}>
          <section role="dialog" aria-modal="true" aria-labelledby="account-decision-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className={intent === AccountReportResolutionAction.PermanentBan ? 'danger' : ''}><Gavel size={19} /></span>
                <div><h2 id="account-decision-title">{intentTitle(intent)}</h2><p>This decision will be recorded in the account audit history.</p></div>
              </div>
              <button type="button" aria-label="Close decision dialog" disabled={busy} onClick={closeDialog}><X size={18} /></button>
            </header>
            {error && <div className="account-report__modal-error"><AlertTriangle size={16} /> {error}</div>}
            <label>
              <span>Decision reason <b>*</b></span>
              <textarea ref={reasonRef} value={reason} aria-invalid={!reason.trim()} maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Explain the evidence and policy basis for this decision…" autoFocus />
              <small>{reason.length}/1000</small>
            </label>
            {intent !== 'dismiss' && (
              <label>
                <span>Internal note <em>Optional</em></span>
                <textarea className="compact" value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} placeholder="Add context for other administrators…" />
              </label>
            )}
            {intent === AccountReportResolutionAction.Suspension && (
              <label>
                <span>Suspension ends <b>*</b></span>
                <input ref={suspensionEndRef} type="datetime-local" aria-invalid={!suspensionEnd} min={new Date().toISOString().slice(0, 16)} value={suspensionEnd} onChange={(event) => setSuspensionEnd(event.target.value)} />
              </label>
            )}
            <footer>
              <button type="button" disabled={busy} onClick={closeDialog}>Cancel</button>
              <button
                type="button"
                className={intent === AccountReportResolutionAction.PermanentBan ? 'danger' : 'primary'}
                disabled={busy}
                onClick={() => void submitDecision()}
              >
                {busy ? 'Applying…' : 'Confirm decision'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
