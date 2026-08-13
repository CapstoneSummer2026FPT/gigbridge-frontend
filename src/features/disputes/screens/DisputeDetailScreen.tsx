import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle, Archive, ArrowLeft, CheckCircle2, Download, FileText, Film,
  Image, RefreshCw, ShieldAlert, ShieldCheck, User, Users,
  Clock, Award, Copy, Check, ExternalLink, HelpCircle, FolderClosed
} from 'lucide-react';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import type { ContractDto } from '../../../types/models/Contract';
import { ContractReportIssueType } from '../../../types/models/ReportContract';
import {
  DisputeResolution, DisputeStatus, DisputeUrgency,
  type Dispute, type DisputeEvidence,
} from '../../../types/models/Dispute';
import { DisputeChat } from '../components/DisputeChat';
import { DisputeEvidenceUploader } from '../components/DisputeEvidenceUploader';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/dispute-detail-screen.css';

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.WaitingAdmin]: 'Waiting Admin',
  [DisputeStatus.InProgress]:   'In Progress',
  [DisputeStatus.Resolved]:     'Resolved',
  [DisputeStatus.Closed]:       'Closed',
};

const resolutionLabels: Record<DisputeResolution, string> = {
  [DisputeResolution.ClientFavored]: 'Client Favored',
  [DisputeResolution.FreelancerFavored]: 'Freelancer Favored',
  [DisputeResolution.Split]: 'Split',
  [DisputeResolution.Dismissed]: 'Dismissed',
};

const issueLabels: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'Payment Issue',
  [ContractReportIssueType.MilestoneIssue]: 'Milestone Issue',
  [ContractReportIssueType.Delay]: 'Delay',
  [ContractReportIssueType.PoorQuality]: 'Poor Quality',
  [ContractReportIssueType.CommunicationProblem]: 'Communication Problem',
  [ContractReportIssueType.ScopeChange]: 'Scope Change',
  [ContractReportIssueType.Other]: 'Other',
};

const urgencyLabels: Record<DisputeUrgency, string> = {
  [DisputeUrgency.Normal]: 'Normal',
  [DisputeUrgency.High]: 'High',
  [DisputeUrgency.Critical]: 'Critical',
};

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatSize = (value: number | null): string => {
  if (value === null) return 'Size unavailable';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const evidenceIcon = (fileName: string | null) => {
  if (!fileName) return <FileText size={18} />;
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return <Image size={18} />;
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension)) return <Film size={18} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return <Archive size={18} />;
  return <FileText size={18} />;
};

const errorTitle = (status: number): string => {
  if (status === 401) return 'Authentication required';
  if (status === 403) return 'Access denied';
  if (status === 404) return 'Dispute not found';
  return 'Unable to load dispute';
};

export default function DisputeDetailScreen() {
  const { user } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractId, disputeId } = useParams<{ contractId: string; disputeId: string }>();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedId, setCopiedId] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const statusLabelsMap: Record<DisputeStatus, string> = {
    [DisputeStatus.WaitingAdmin]: t('disputes.statusWaitingAdmin', { defaultValue: 'Chờ Admin tiếp nhận' }),
    [DisputeStatus.InProgress]:   t('disputes.statusInProgress', { defaultValue: 'Admin đang xử lý' }),
    [DisputeStatus.Resolved]:     t('disputes.statusResolved', { defaultValue: 'Đã có phán quyết' }),
    [DisputeStatus.Closed]:       t('disputes.statusClosed', { defaultValue: 'Đã đóng hồ sơ' }),
  };

  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.dispute-top-nav-bar', y: -15, duration: 0.4 },
      { selector: '.bento-hero', y: 25, duration: 0.55, position: '-=0.2' },
      { selector: '.bento-stepper-wrapper', y: 20, duration: 0.5, position: '-=0.35' },
      { selector: '.bento-card-overview', y: 24, scale: 0.98, duration: 0.5, position: '-=0.3' },
      { selector: '.bento-card-verdict', y: 24, scale: 0.98, duration: 0.5, position: '-=0.35' },
      { selector: '.bento-card-participants', y: 20, duration: 0.5, position: '-=0.3' },
      { selector: '.bento-card-metadata', y: 20, duration: 0.5, position: '-=0.35' },
      { selector: '.bento-card-evidence', y: 25, duration: 0.5, position: '-=0.3' },
      { selector: '.bento-card-chat', y: 25, duration: 0.5, position: '-=0.3' },
    ],
    dependencies: [dispute?.id, reloadKey],
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!contractId || !disputeId) {
        setError({ status: 404, message: 'A valid contract and dispute ID are required.' });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const [disputeResponse, contractResponse] = await Promise.all([
        disputeGetAPI.getDisputeById(contractId, disputeId),
        contractGetAPI.getContractById(contractId),
      ]);
      if (cancelled) return;
      if (!disputeResponse.success || !disputeResponse.data) {
        setError({ status: disputeResponse.statusCode, message: disputeResponse.message || 'The dispute could not be loaded.' });
        setLoading(false);
        return;
      }
      if (!contractResponse.success || !contractResponse.data) {
        setError({ status: contractResponse.statusCode, message: contractResponse.message || 'The related contract could not be loaded.' });
        setLoading(false);
        return;
      }
      setDispute(disputeResponse.data);
      setContract(contractResponse.data);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [contractId, disputeId, reloadKey]);

  const downloadEvidence = async (evidence: DisputeEvidence) => {
    if (!contractId || !disputeId || downloadingId) return;
    setDownloadingId(evidence.id);
    setDownloadError(null);
    const response = await disputeGetAPI.getEvidenceDownload(contractId, disputeId, evidence.id);
    setDownloadingId(null);
    if (!response.success || !response.data?.downloadUrl) {
      setDownloadError(response.message || 'Unable to download this evidence file.');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = response.data.downloadUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = response.data.fileName || evidence.fileName || 'evidence';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleCopyCaseId = () => {
    if (!dispute?.id) return;
    void navigator.clipboard.writeText(dispute.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const backPath = contractId ? `/contracts/${contractId}` : '/contracts';

  const getStatusStepIndex = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.WaitingAdmin: return 0;
      case DisputeStatus.InProgress:   return 1;
      case DisputeStatus.Resolved:     return 2;
      case DisputeStatus.Closed:       return 3;
      default: return 0;
    }
  };

  return (
    <AppLayout>
      <main className="dispute-detail-wrapper" ref={containerRef}>
        {loading ? (
          <section className="dispute-detail-state">
            <LemniscateBloomLoader
              size={180}
              label={t('disputes.loadingTitle', { defaultValue: 'Workspace Xử lý Tranh chấp' })}
              tag={t('disputes.loadingSub', { defaultValue: 'Đang tải thông tin tranh chấp, hợp đồng và hồ sơ bằng chứng...' })}
            />
          </section>
        ) : error || !dispute || !contract || !contractId || !disputeId ? (
          <section className="dispute-detail-state dispute-detail-error">
            <AlertCircle size={48} />
            <h1>{errorTitle(error?.status ?? 500)}</h1>
            <p>{error?.message ?? 'The dispute is unavailable.'}</p>
            <div className="dispute-detail-state-actions">
              <button onClick={() => setReloadKey(value => value + 1)}>
                <RefreshCw size={17} /> Retry
              </button>
              <button onClick={() => navigate('/contracts')}>View contracts</button>
            </div>
          </section>
        ) : (
          <>
            {/* Navigation & Action Top Bar */}
            <div className="dispute-top-nav-bar">
              <button className="dispute-detail-back" onClick={() => navigate(backPath)}>
                <ArrowLeft size={16} /> {t('disputes.backToContract', { defaultValue: 'Quay lại Hợp đồng' })}
              </button>

              <div className="dispute-top-actions">
                <button
                  className="dispute-action-pill"
                  onClick={handleCopyCaseId}
                  title="Sao chép Mã Hồ sơ Tranh chấp"
                >
                  {copiedId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Đã chép ID' : `ID: ${dispute.id.slice(0, 8)}...`}</span>
                </button>
                <button
                  className="dispute-action-pill"
                  onClick={() => setReloadKey(v => v + 1)}
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw size={14} />
                  <span>{t('disputes.refresh', { defaultValue: 'Làm mới' })}</span>
                </button>
              </div>
            </div>

            {/* Case Header Hero Bento */}
            <header className="bento-card bento-hero">
              <div className="bento-hero-badges">
                <span className="dispute-detail-kicker">Dispute Resolution Workspace</span>
                <span className={`dispute-status dispute-status-${dispute.status}`}>
                  <span className="dispute-status-dot" />
                  {statusLabelsMap[dispute.status] ?? statusLabels[dispute.status] ?? `Status ${dispute.status}`}
                </span>
                <span className={`dispute-status urgency-${dispute.urgency} bg-surface border border-border`}>
                  Mức độ: {urgencyLabels[dispute.urgency]}
                </span>
              </div>
              <h1>{dispute.title || contract.title}</h1>

              <div className="bento-hero-meta">
                <div className="bento-meta-item">
                  <span>Mã Hồ Sơ:</span>
                  <code>{dispute.id}</code>
                </div>
                <div className="bento-meta-item">
                  <span>Hợp đồng:</span>
                  <button
                    onClick={() => navigate(`/contracts/${contract.contractsId || contractId}`)}
                    className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {contract.title} <ExternalLink size={13} />
                  </button>
                </div>
                <div className="bento-meta-item">
                  <span>Ngày mở:</span>
                  <strong>{formatDate(dispute.createdAt)}</strong>
                </div>
              </div>
            </header>

            {/* Lifecycle Progress Stepper Bento */}
            <section className="bento-stepper-wrapper">
              <div className="bento-stepper-grid">
                {[
                  { label: t('disputes.stepFiled', { defaultValue: '1. Nộp tranh chấp' }), sub: 'Yêu cầu được khởi tạo', step: 0 },
                  { label: t('disputes.stepInProgress', { defaultValue: '2. Admin tiếp nhận' }), sub: 'Đang xác minh hồ sơ', step: 1 },
                  { label: t('disputes.stepResolved', { defaultValue: '3. Đã phán quyết' }), sub: 'Đã đưa ra quyết định', step: 2 },
                  { label: t('disputes.stepClosed', { defaultValue: '4. Đóng hồ sơ' }), sub: 'Hoàn tất vụ việc', step: 3 },
                ].map((item) => {
                  const currentStep = getStatusStepIndex(dispute.status);
                  const isCompleted = currentStep > item.step || dispute.status === DisputeStatus.Resolved || dispute.status === DisputeStatus.Closed;
                  const isCurrent = currentStep === item.step && dispute.status !== DisputeStatus.Resolved && dispute.status !== DisputeStatus.Closed;
                  return (
                    <div key={item.step} className={`bento-stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                      <div className="bento-step-circle">
                        {isCompleted ? <CheckCircle2 size={18} /> : <span>{item.step + 1}</span>}
                      </div>
                      <div className="bento-step-info">
                        <span className="bento-step-title">{item.label}</span>
                        <span className="bento-step-sub">{item.sub}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Main Bento Grid */}
            <div className="dispute-bento-grid">
              {/* Bento Card 1: Dispute Overview & Claims (Col 8) */}
              <article className="bento-card bento-col-8 bento-card-overview">
                <div className="bento-section-title">
                  <div className="bento-section-title-left">
                    <div className="bento-section-icon icon-amber">
                      <ShieldAlert size={20} />
                    </div>
                    <h2>Chi tiết Tranh chấp & Lập luận</h2>
                  </div>
                  {dispute.claimedAmount !== null && dispute.claimedAmount !== undefined && (
                    <div className="dispute-claimed-amount-highlight bg-brand/10 border border-brand/20 px-3 py-1.5 rounded-xl">
                      <GCoinIcon size={20} />
                      <span>{dispute.claimedAmount.toLocaleString()} GigCoin</span>
                    </div>
                  )}
                </div>

                <div className="dispute-quote-box">
                  <p className="dispute-reason-text">{dispute.description || dispute.reason}</p>
                </div>

                <div className="dispute-claims-row">
                  <div className="dispute-claim-card">
                    <span>Yêu cầu giải quyết</span>
                    <strong>{dispute.requestedResolution ?? 'Không chỉ định cụ thể'}</strong>
                  </div>
                  <div className="dispute-claim-card">
                    <span>Số tiền tranh chấp</span>
                    <strong>
                      {dispute.claimedAmount !== null && dispute.claimedAmount !== undefined
                        ? `${dispute.claimedAmount.toLocaleString()} GigCoin`
                        : 'Không áp dụng'}
                    </strong>
                  </div>
                </div>

                <div className="bento-meta-grid">
                  <div className="bento-meta-cell">
                    <ShieldAlert size={18} className="bento-meta-cell-icon" />
                    <div className="bento-meta-cell-content">
                      <span>Loại vấn đề</span>
                      <strong>{dispute.issueType === null ? 'Legacy Dispute' : issueLabels[dispute.issueType]}</strong>
                    </div>
                  </div>

                  <div className="bento-meta-cell">
                    <Clock size={18} className="bento-meta-cell-icon" />
                    <div className="bento-meta-cell-content">
                      <span>Độ khẩn cấp</span>
                      <strong className={`urgency-${dispute.urgency}`}>{urgencyLabels[dispute.urgency]}</strong>
                    </div>
                  </div>

                  <div className="bento-meta-cell">
                    <User size={18} className="bento-meta-cell-icon" />
                    <div className="bento-meta-cell-content">
                      <span>Người khởi tạo</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <UserAvatar name={dispute.initiator.name ?? 'Participant'} userId={dispute.initiator.id} size="sm" />
                        <strong>
                          <UserProfileLink userId={dispute.initiator.id} role={dispute.initiator.role ?? undefined}>
                            {dispute.initiator.name ?? 'Participant'}
                          </UserProfileLink>
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="bento-meta-cell">
                    <FileText size={18} className="bento-meta-cell-icon" />
                    <div className="bento-meta-cell-content">
                      <span>Cột mốc liên quan</span>
                      <strong>{dispute.milestone?.title ?? 'Toàn bộ Hợp đồng'}</strong>
                    </div>
                  </div>
                </div>
              </article>

              {/* Bento Card 2: Resolution Verdict (Col 4) */}
              <article className={`bento-card bento-col-4 bento-card-verdict bento-verdict-card ${dispute.resolution !== null ? 'resolved' : ''}`}>
                <div className="bento-section-title">
                  <div className="bento-section-title-left">
                    <div className={`bento-section-icon ${dispute.resolution !== null ? 'icon-emerald' : 'icon-amber'}`}>
                      <Award size={20} />
                    </div>
                    <h2>Phán quyết Trọng tài</h2>
                  </div>
                </div>

                {dispute.resolution === null ? (
                  <div className="verdict-pending-state">
                    <div className="verdict-pending-icon">
                      <Clock size={28} />
                    </div>
                    <h3>Đang trong quá trình xét xử</h3>
                    <p>Ban Quản trị viên GigBridge đang thẩm định hồ sơ, chứng cứ và phản hồi của hai bên để ban hành phán quyết chính thức.</p>
                  </div>
                ) : (
                  <div className="verdict-resolved-state">
                    <div className="verdict-outcome-badge">
                      <ShieldCheck size={20} />
                      <span>{dispute.resolutionLabel ?? resolutionLabels[dispute.resolution]}</span>
                    </div>

                    {dispute.resolutionNote && (
                      <div className="verdict-note-box">
                        <p className="font-bold text-xs uppercase text-muted-foreground mb-1">Ghi chú chính thức từ Admin:</p>
                        <p>{dispute.resolutionNote}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground pt-2 border-t border-border flex justify-between items-center">
                      <span>Thời gian phân xử:</span>
                      <strong>{formatDate(dispute.resolvedAt)}</strong>
                    </div>
                  </div>
                )}
              </article>

              {/* Bento Card 3: Participants (Col 6) */}
              <article className="bento-card bento-col-6 bento-card-participants">
                <div className="bento-section-title">
                  <div className="bento-section-title-left">
                    <div className="bento-section-icon icon-purple">
                      <Users size={20} />
                    </div>
                    <h2>Các bên liên quan</h2>
                  </div>
                </div>

                <div className="participants-bento-grid">
                  {(() => {
                    const isClientInitiator = dispute.initiator.role === 'Client';
                    const clientUserId = isClientInitiator ? dispute.initiator.id : dispute.respondent?.id;
                    const clientName = isClientInitiator ? dispute.initiator.name : dispute.respondent?.name || 'Client';
                    const freelancerUserId = !isClientInitiator ? dispute.initiator.id : dispute.respondent?.id;
                    const freelancerName = !isClientInitiator ? dispute.initiator.name : dispute.respondent?.name || 'Freelancer';

                    return (
                      <>
                        <div className="participant-bento-card">
                          <UserAvatar name={clientName ?? 'Client'} userId={clientUserId} size="md" />
                          <div className="participant-info">
                            <span className="participant-role-tag">
                              Khách hàng {isClientInitiator && '(Bên nộp)'}
                            </span>
                            <strong>
                              <UserProfileLink userId={clientUserId} role="Client">
                                {clientName}
                              </UserProfileLink>
                            </strong>
                            <span>Chủ dự án / Hợp đồng</span>
                          </div>
                        </div>

                        <div className="participant-bento-card">
                          <UserAvatar name={freelancerName ?? 'Freelancer'} userId={freelancerUserId} size="md" />
                          <div className="participant-info">
                            <span className="participant-role-tag">
                              Freelancer {!isClientInitiator && '(Bên nộp)'}
                            </span>
                            <strong>
                              <UserProfileLink userId={freelancerUserId} role="Freelancer">
                                {freelancerName}
                              </UserProfileLink>
                            </strong>
                            <span>Đối tác thực hiện dịch vụ</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </article>

              {/* Bento Card 4: Metadata Stats (Col 6) */}
              <article className="bento-card bento-col-6 bento-card-metadata">
                <div className="bento-section-title">
                  <div className="bento-section-title-left">
                    <div className="bento-section-icon icon-cyan">
                      <HelpCircle size={20} />
                    </div>
                    <h2>Thông tin Vụ việc & Chỉ số</h2>
                  </div>
                </div>

                <div className="metadata-stats-list">
                  <div className="metadata-stat-item">
                    <span>Mã Tranh chấp</span>
                    <code>{dispute.id}</code>
                  </div>
                  <div className="metadata-stat-item">
                    <span>Ngày tạo hồ sơ</span>
                    <strong>{formatDate(dispute.createdAt)}</strong>
                  </div>
                  <div className="metadata-stat-item">
                    <span>Cập nhật gần nhất</span>
                    <strong>{formatDate(dispute.updatedAt)}</strong>
                  </div>
                  <div className="metadata-stat-item">
                    <span>Tổng số tập tin bằng chứng</span>
                    <strong>{dispute.evidence.length} tập tin</strong>
                  </div>
                </div>
              </article>

              {/* LOWER BENTO ROW: Side-by-Side Balanced Layout */}

              {/* Bento Card 5: Evidence Vault (Col 5) - Compact & Elegant */}
              <article className="bento-card bento-col-5 bento-card-evidence">
                <div className="bento-section-title">
                  <div className="bento-section-title-left">
                    <div className="bento-section-icon icon-blue">
                      <FileText size={20} />
                    </div>
                    <h2>Hồ sơ Bằng chứng</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-extrabold text-xs">
                    {dispute.evidence.length} file
                  </span>
                </div>

                {downloadError && (
                  <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle size={16} /> {downloadError}
                  </div>
                )}

                {/* Evidence Uploader Block */}
                <DisputeEvidenceUploader
                  contractId={contractId}
                  disputeId={disputeId}
                  disabled={!([DisputeStatus.WaitingAdmin, DisputeStatus.InProgress] as DisputeStatus[]).includes(dispute.status)}
                  onUploaded={evidence => setDispute(current => current ? { ...current, evidence: [...current.evidence, ...evidence] } : current)}
                />

                {/* Requested Evidence Notices */}
                {dispute.evidence.filter(item => item.isRequestedByAdmin && item.requestedByAdminId).map(request => {
                  const targetParty = request.requestTarget === 0 ? dispute.initiator : dispute.respondent;
                  const groupFiles = dispute.evidence.filter(item =>
                    item.requestGroupId === request.requestGroupId && item.uploadedById === targetParty?.id && item.fileName
                  );
                  return (
                    <div className="p-3.5 mb-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2" key={request.id}>
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-foreground">
                          Yêu cầu từ Admin • {request.requestTarget === 0 ? 'Bên nộp' : 'Bên bị nộp'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${request.isRequestFulfilled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>
                          {request.isRequestFulfilled ? 'Đã hoàn tất' : 'Đang chờ nộp'}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{request.description}</p>
                      <div className="text-[10px] text-muted-foreground">
                        Hạn nộp: <strong>{formatDate(request.deadline)}</strong>
                      </div>

                      {!request.isRequestFulfilled && targetParty?.id === user?.id && (
                        <DisputeEvidenceUploader
                          contractId={contractId}
                          disputeId={disputeId}
                          requestEvidenceId={request.id}
                          title="Tải lên chứng cứ yêu cầu"
                          disabled={false}
                          onUploaded={items => setDispute(current => current ? {
                            ...current,
                            evidence: current.evidence
                              .map(existing => items.find(item => item.id === existing.id) ?? existing)
                              .concat(items.filter(item => !current.evidence.some(existing => existing.id === item.id))),
                          } : current)}
                        />
                      )}

                      {groupFiles.map(file => (
                        <div className="evidence-item-row compact" key={file.id}>
                          <div className="evidence-icon-badge">{evidenceIcon(file.fileName)}</div>
                          <div className="evidence-file-details">
                            <strong className="evidence-file-name">{file.fileName}</strong>
                            <div className="evidence-file-sub">
                              <span>{formatSize(file.fileSize)}</span>
                            </div>
                          </div>
                          <button className="evidence-download-btn" onClick={() => void downloadEvidence(file)} disabled={downloadingId !== null}>
                            <Download size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Submitted Evidence List */}
                <div className="evidence-groups-wrapper">
                  {dispute.evidence.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-surface-muted/50 border border-border text-center space-y-2">
                      <FolderClosed size={32} className="mx-auto text-muted-foreground/60" />
                      <p className="text-xs font-extrabold text-foreground">Chưa có tập tin bằng chứng nào</p>
                      <p className="text-[11px] text-muted-foreground">Tải lên hình ảnh, tài liệu hoặc hợp đồng để làm căn cứ phân xử cho Admin.</p>
                    </div>
                  ) : (
                    (['Client', 'Freelancer'] as const).map(role => {
                      const party = dispute.initiator.role === role ? dispute.initiator : dispute.respondent?.role === role ? dispute.respondent : null;
                      const evidenceItems = dispute.evidence
                        .filter(evidence => !evidence.isRequestedByAdmin && party?.id === evidence.uploadedById)
                        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
                      return (
                        <section key={role}>
                          <div className="evidence-group-title">
                            <User size={13} />
                            <span>Bởi {role} ({evidenceItems.length})</span>
                          </div>

                          {evidenceItems.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic mb-2 pl-2">Chưa có chứng cứ từ {role.toLowerCase()}.</p>
                          ) : (
                            evidenceItems.map(evidence => (
                              <div className="evidence-item-row" key={evidence.id}>
                                <div className="evidence-icon-badge">{evidenceIcon(evidence.fileName)}</div>
                                <div className="evidence-file-details">
                                  <strong className="evidence-file-name" title={evidence.fileName ?? undefined}>{evidence.fileName}</strong>
                                  <div className="evidence-file-sub">
                                    <span>{formatSize(evidence.fileSize)}</span>
                                    <span>•</span>
                                    <span>{formatDate(evidence.createdAt)}</span>
                                  </div>
                                </div>
                                <button className="evidence-download-btn" onClick={() => void downloadEvidence(evidence)} disabled={downloadingId !== null} title="Tải về tập tin">
                                  <Download size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </section>
                      );
                    })
                  )}
                </div>
              </article>

              {/* Bento Card 6: Live Mediation Chat Workspace (Col 7) */}
              <div className="bento-col-7 bento-card-chat">
                <DisputeChat disputeId={dispute.id} />
              </div>
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
}
