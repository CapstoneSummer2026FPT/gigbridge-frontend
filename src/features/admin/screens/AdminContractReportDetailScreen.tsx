import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileWarning,
  HelpCircle,
  Info,
  Link2,
  MessageSquare,
  Paperclip,
  Plus,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { ReportAreaTabs } from '../components/ReportAreaTabs';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import {
  ContractReportAdminResolutionAction,
  ContractReportInformationTarget,
  type AdminContractReportDetail,
} from '../../../types/models/AdminContractReport';

type Action = 'info' | 'close' | 'dismiss' | 'escalate' | 'link' | 'note' | null;
const stateNames = ['Open', 'Under review', 'Awaiting information', 'Closed', 'Dismissed', 'Escalated', 'Linked to dispute'];

const json = (v?: string) => {
  if (!v) return '';
  try {
    return JSON.stringify(JSON.parse(v), null, 2);
  } catch {
    return v;
  }
};

export default function AdminContractReportDetailScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { reportId = '' } = useParams();
  const [data, setData] = useState<AdminContractReportDetail>();
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [target, setTarget] = useState(ContractReportInformationTarget.Both);
  const [due, setDue] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // GSAP Entrance Animations
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.esign-gsap-header', y: 20, duration: 0.55 },
      { selector: '.esign-gsap-metrics', y: 16, duration: 0.5, stagger: 0.06 },
      { selector: '.esign-gsap-main', y: 24, duration: 0.5 },
    ],
  });

  const load = async () => {
    setLoading(true);
    setError('');
    const r = await adminGetAPI.getContractReportDetail(reportId);
    if (r.success && r.data) {
      setData(r.data);
    } else {
      setError(r.message || 'Unable to load Contract Report.');
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [reportId]);

  const apply = async () => {
    if (!action || !reason.trim()) return;
    setBusy(true);
    setError('');
    let r;
    if (action === 'info') {
      r = await adminPostAPI.requestContractReportInformation(reportId, {
        requestId: crypto.randomUUID(),
        target,
        message: reason,
        requestedEvidenceOrClarification: extra || undefined,
        dueAt: due ? new Date(due).toISOString() : undefined,
      });
    } else if (action === 'close') {
      r = await adminPostAPI.closeContractReport(reportId, {
        resolutionAction: ContractReportAdminResolutionAction.ResolvedByParties,
        resolutionSummary: reason,
        internalNote: extra || undefined,
      });
    } else if (action === 'dismiss') {
      r = await adminPostAPI.dismissContractReport(reportId, {
        reason,
        internalNote: extra || undefined,
      });
    } else if (action === 'note') {
      r = await adminPostAPI.addContractReportNote(reportId, reason);
    } else if (action === 'link') {
      r = await adminPostAPI.linkContractReportDispute(reportId, disputeId, reason);
    } else {
      r = await adminPostAPI.escalateContractReport(reportId, {
        title: `Contract Report: ${data?.contractTitle || ''}`,
        description: data?.description || reason,
        claimedAmount: data?.milestone?.amount,
        requestedResolution: data?.desiredResolution || reason,
        urgency: 0,
        reason,
      });
    }

    setBusy(false);
    if (r.success && r.data) {
      setData(r.data);
      setAction(null);
      setReason('');
      setExtra('');
      setDisputeId('');
    } else {
      setError(r.message || 'Action failed.');
    }
  };

  const assign = async () => {
    setBusy(true);
    const r = await adminPostAPI.assignContractReport(reportId);
    setBusy(false);
    if (r.success && r.data) {
      setData(r.data);
    } else {
      setError(r.message || 'Assignment failed.');
    }
  };

  const download = async (id: string) => {
    const r = await adminGetAPI.getContractReportAttachmentDownload(reportId, id);
    if (r.success && r.data) {
      window.open(r.data.downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      setError(r.message || 'Download failed.');
    }
  };

  if (loading && !data) {
    return (
      <AppLayout fullWidth>
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center space-y-3">
          <FileWarning size={42} className="text-brand animate-pulse" />
          <p className="text-sm font-extrabold text-text-primary">Loading Contract Report details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout fullWidth>
        <div className="max-w-[1600px] mx-auto p-8 space-y-4">
          <Link to="/admin/reports/contracts" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">
            <ArrowLeft size={16} /> Back to Contract Reports
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-300 font-semibold text-sm">
            <AlertCircle size={20} />
            <p>{error || 'Contract report not found.'}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        
        {/* Sticky Header Bar with Back Link & ReportAreaTabs */}
        <header className="esign-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/admin/reports/contracts" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline mb-1">
                <ArrowLeft size={14} /> Back to Contract Reports
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">
                  {data.contractTitle}
                </h1>
                <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold uppercase ${
                  data.adminReviewStatus === 3 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                  data.adminReviewStatus === 5 || data.adminReviewStatus === 6 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                }`}>
                  {stateNames[data.adminReviewStatus]}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-text-muted truncate max-w-[600px]">Report ID: {reportId}</p>
            </div>

            {/* Navigation Tabs Bar for Reports */}
            <ReportAreaTabs />
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          
          {/* Action Control Panel Card */}
          <section className="esign-gsap-main rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-muted">
                <Shield size={16} className="text-brand" />
                <span>Admin Resolution Actions</span>
              </div>
              {data.assignedAdminName && (
                <span className="text-xs font-bold text-text-muted">
                  Assigned Admin: <strong className="text-brand">{data.assignedAdminName}</strong>
                </span>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {data.canAssign && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={assign}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2 text-xs font-extrabold text-brand hover:bg-brand/20 transition cursor-pointer"
                >
                  <UserCheck size={14} /> {data.assignedAdminId ? 'Reassign to me' : 'Assign to me'}
                </button>
              )}
              {data.canRequestInformation && (
                <button
                  type="button"
                  onClick={() => setAction('info')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-extrabold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition cursor-pointer"
                >
                  <HelpCircle size={14} /> Request Information
                </button>
              )}
              {data.canClose && (
                <button
                  type="button"
                  onClick={() => setAction('close')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Close Report
                </button>
              )}
              {data.canDismiss && (
                <button
                  type="button"
                  onClick={() => setAction('dismiss')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <UserX size={14} /> Dismiss Report
                </button>
              )}
              {data.canEscalate && (
                <button
                  type="button"
                  onClick={() => setAction('escalate')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition cursor-pointer"
                >
                  <AlertTriangle size={14} /> Escalate to Dispute
                </button>
              )}
              {data.canLinkDispute && (
                <button
                  type="button"
                  onClick={() => setAction('link')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer"
                >
                  <Link2 size={14} /> Link Dispute
                </button>
              )}
              <button
                type="button"
                onClick={() => setAction('note')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer"
              >
                <Plus size={14} /> Add Internal Note
              </button>
              {data.relatedDisputeId && (
                <Link
                  to={`/admin/disputes/${data.relatedDisputeId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3.5 py-2 text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition text-decoration-none"
                >
                  <ShieldAlert size={14} /> Open Related Dispute
                </Link>
              )}
            </div>
          </section>

          {/* Participant Info Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Reporter</span>
              <div>
                <UserProfileLink userId={data.reporter.userId} role={data.reporter.role} className="text-sm font-extrabold text-brand hover:underline">
                  {data.reporter.name}
                </UserProfileLink>
                <p className="text-xs font-bold text-text-secondary mt-0.5">{data.reporter.role} · {data.reporter.violationCount} violations</p>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Respondent</span>
              {data.respondent ? (
                <div>
                  <UserProfileLink userId={data.respondent.userId} role={data.respondent.role} className="text-sm font-extrabold text-brand hover:underline">
                    {data.respondent.name}
                  </UserProfileLink>
                  <p className="text-xs font-bold text-text-secondary mt-0.5">{data.respondent.role}</p>
                </div>
              ) : (
                <p className="text-sm font-bold text-text-muted">None specified</p>
              )}
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Contract</span>
              <div>
                <Link to={`/admin/contracts?contractId=${encodeURIComponent(data.contractId)}`} className="text-sm font-extrabold text-brand hover:underline truncate block">
                  {data.contractTitle}
                </Link>
                <p className="text-xs font-bold text-text-secondary mt-0.5">Status: {data.contractStatus} · Budget: {data.contractBudget} GCoin</p>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Job Post</span>
              <div>
                <p className="text-sm font-extrabold text-text-primary truncate">{data.jobPostTitle}</p>
                <p className="text-xs font-mono font-bold text-text-muted mt-0.5">{data.proposalId ? `Proposal ID: ${data.proposalId}` : 'No proposal'}</p>
              </div>
            </article>
          </section>

          {/* Milestone Details Panel */}
          {data.milestone && (
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-text-primary">Milestone Context</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                  <span className="text-[10px] font-black uppercase text-text-muted">Title</span>
                  <p className="text-xs font-extrabold text-text-primary mt-0.5">{data.milestone.title}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                  <span className="text-[10px] font-black uppercase text-text-muted">Amount / Released</span>
                  <p className="text-xs font-extrabold text-text-primary mt-0.5">{data.milestone.amount} / {data.milestone.releasedAmount} GCoin</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                  <span className="text-[10px] font-black uppercase text-text-muted">Refunded / Penalty</span>
                  <p className="text-xs font-extrabold text-text-primary mt-0.5">{data.milestone.refundAmount} / {data.milestone.penaltyAmount} GCoin</p>
                </div>
              </div>
            </section>
          )}

          {/* Desired Resolution & Statement Card */}
          <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-text-primary">Report Statement & Desired Resolution</h3>
            <div className="space-y-2 text-xs font-semibold text-text-secondary leading-relaxed">
              <p><strong className="text-text-primary">Desired Resolution:</strong> {data.desiredResolution}</p>
              <p><strong className="text-text-primary">Description / Explanation:</strong> {data.explanation || data.description || 'No detailed explanation provided.'}</p>
              {data.proposedResolution && <p><strong className="text-text-primary font-bold">Proposed Resolution:</strong> {data.proposedResolution}</p>}
              {data.rejectReason && <p><strong className="text-rose-600 dark:text-rose-400 font-bold">Rejection Reason:</strong> {data.rejectReason}</p>}
            </div>
          </section>

          {/* Evidence Attachments Card */}
          <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-text-primary">
              <Paperclip size={16} className="text-brand" />
              <span>Evidence Attachments ({data.attachments.length})</span>
            </div>

            {data.attachments.length === 0 ? (
              <p className="text-xs font-semibold text-text-muted">No evidence files attached.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.attachments.map(att => (
                  <div key={att.attachmentId} className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate" title={att.fileName}>{att.fileName}</p>
                      <span className="text-[10px] font-semibold text-text-muted">{att.contentType} · {Math.ceil(att.fileSize / 1024)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => download(att.attachmentId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand/20 transition cursor-pointer shrink-0"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Financial Escrow Context Card */}
          <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-text-primary">Financial & Escrow Context</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-[10px] font-black uppercase text-text-muted">Required</span>
                <p className="text-sm font-extrabold text-text-primary mt-0.5">{data.escrowRequired} GCoin</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-[10px] font-black uppercase text-text-muted">Funded</span>
                <p className="text-sm font-extrabold text-text-primary mt-0.5">{data.escrowFunded} GCoin</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-[10px] font-black uppercase text-text-muted">Released</span>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{data.escrowReleased} GCoin</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-[10px] font-black uppercase text-text-muted">Remaining</span>
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{data.escrowRemaining} GCoin</p>
              </div>
            </div>
          </section>

          {/* Investigation Messages & Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-text-primary">
                <MessageSquare size={16} className="text-brand" />
                <span>Investigation Messages ({data.messages.length})</span>
              </div>
              {data.messages.length === 0 ? (
                <p className="text-xs font-semibold text-text-muted">No messages in investigation log.</p>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {data.messages.map(msg => (
                    <div key={msg.messageId} className="rounded-xl border border-border/50 bg-surface-muted/30 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-text-muted font-bold text-[11px]">
                        <span className="text-text-primary">{msg.senderName || 'System'}</span>
                        <span>{new Date(msg.sentAt).toLocaleString()}</span>
                      </div>
                      <p className="font-semibold text-text-secondary leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-text-primary">
                <Info size={16} className="text-brand" />
                <span>Internal Admin Notes ({data.internalNotes.length})</span>
              </div>
              {data.internalNotes.length === 0 ? (
                <p className="text-xs font-semibold text-text-muted">No internal notes added.</p>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {data.internalNotes.map(note => (
                    <div key={note.noteId} className="rounded-xl border border-border/50 bg-surface-muted/30 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-text-muted font-bold text-[11px]">
                        <span className="text-brand">{note.adminName}</span>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="font-semibold text-text-secondary leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Admin Audit History Section */}
          {data.auditHistory && data.auditHistory.length > 0 && (
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-text-primary">
                <FileWarning size={16} className="text-brand" />
                <span>Admin Audit Log History ({data.auditHistory.length})</span>
              </div>
              <div className="space-y-2">
                {data.auditHistory.map(x => (
                  <details key={x.auditId} className="rounded-xl border border-border/50 bg-surface-muted/30 p-3 text-xs">
                    <summary className="font-extrabold text-text-primary cursor-pointer">
                      {new Date(x.createdAt).toLocaleString()} · {x.adminName || x.adminId} · <span className="text-brand">{x.action}</span>
                    </summary>
                    <div className="mt-2 space-y-1 font-mono text-[11px] text-text-secondary">
                      {x.oldValues && <pre className="whitespace-pre-wrap bg-background p-2 rounded-lg border border-border/40">OLD: {json(x.oldValues)}</pre>}
                      {x.newValues && <pre className="whitespace-pre-wrap bg-background p-2 rounded-lg border border-border/40">NEW: {json(x.newValues)}</pre>}
                      <p className="text-[10px] text-text-muted">Correlation ID: {x.correlationId}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Modal Dialog for Actions */}
        {action && (
          <div className="modal-backdrop">
            <div className="modal-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-black text-text-primary">
                  {action === 'info'
                    ? 'Request Information'
                    : action === 'note'
                    ? 'Add Internal Note'
                    : action === 'link'
                    ? 'Link Existing Dispute'
                    : `${action[0].toUpperCase()}${action.slice(1)} Contract Report`}
                </h3>
                <button type="button" onClick={() => setAction(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {action === 'info' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1">Target Participant</label>
                      <select className="input-gb w-full py-2 text-xs font-semibold" value={target} onChange={e => setTarget(Number(e.target.value))}>
                        <option value={0}>Reporter</option>
                        <option value={1}>Respondent</option>
                        <option value={2}>Both Parties</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1">Due Date</label>
                      <input type="datetime-local" className="input-gb w-full py-2 text-xs font-semibold" value={due} onChange={e => setDue(e.target.value)} />
                    </div>
                  </div>
                )}

                {action === 'link' && (
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Dispute ID</label>
                    <input
                      className="input-gb w-full py-2 text-xs font-semibold"
                      value={disputeId}
                      onChange={e => setDisputeId(e.target.value)}
                      placeholder="Enter existing dispute ID..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">
                    {action === 'info' ? 'Message' : 'Reason or Summary'}
                  </label>
                  <textarea
                    className="input-gb w-full py-2 text-xs font-semibold"
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={action === 'info' ? 'Enter request message...' : 'Enter reason or resolution summary...'}
                  />
                </div>

                {(action === 'info' || action === 'close' || action === 'dismiss') && (
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-1">Optional Notes / Evidence Required</label>
                    <textarea
                      className="input-gb w-full py-2 text-xs font-semibold"
                      rows={2}
                      value={extra}
                      onChange={e => setExtra(e.target.value)}
                      placeholder={action === 'info' ? 'Requested evidence or clarification...' : 'Optional internal note...'}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setAction(null)} className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 transition cursor-pointer" disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !reason.trim() || (action === 'link' && !disputeId.trim())}
                  onClick={apply}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition cursor-pointer shadow-sm ${
                    action === 'dismiss' || action === 'escalate' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand hover:opacity-90'
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
