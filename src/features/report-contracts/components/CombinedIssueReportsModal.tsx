import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import type {
  ReportContract,
  ReportContractAttachment,
  ReportContractListItem,
} from '../../../types/models/ReportContract';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import {
  ContractReportIssueType,
  ContractReportStatus,
  ContractReportResolutionAction,
} from '../../../types/models/ReportContract';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { type SelectOption } from '../../../shared/components/CustomSelect';
import { FileTypeBadge } from '../../../shared/components/FileTypeBadge';
import { DisputeEscalationModal } from './DisputeEscalationModal';
import { DisputeCreationModal } from './DisputeCreationModal';
import { reportContractGetAPI } from '../../../api/reportContractAPI/GET';
import '../styles/report-contract.css';

const ISSUE_TYPE_KEYS: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'workspace.reportIssueTypePaymentIssue',
  [ContractReportIssueType.MilestoneIssue]: 'workspace.reportIssueTypeMilestoneIssue',
  [ContractReportIssueType.Delay]: 'workspace.reportIssueTypeDelay',
  [ContractReportIssueType.PoorQuality]: 'workspace.reportIssueTypePoorQuality',
  [ContractReportIssueType.CommunicationProblem]: 'workspace.reportIssueTypeCommunicationProblem',
  [ContractReportIssueType.ScopeChange]: 'workspace.reportIssueTypeScopeChange',
  [ContractReportIssueType.Other]: 'workspace.reportIssueTypeOther',
};

const STATUS_KEYS: Record<number, string> = {
  [ContractReportStatus.Pending]: 'workspace.reportStatusPending',
  [ContractReportStatus.WaitingReporterConfirmation]: 'workspace.reportStatusWaitingConfirmation',
  [ContractReportStatus.Resolved]: 'workspace.reportStatusResolved',
  [ContractReportStatus.Escalated]: 'workspace.reportStatusEscalated',
};

const RESOLUTION_ACTION_KEYS: Record<number, string> = {
  [ContractReportResolutionAction.AcceptIssue]: 'workspace.reportActionAcceptIssue',
  [ContractReportResolutionAction.ProvideExplanation]: 'workspace.reportActionProvideExplanation',
  [ContractReportResolutionAction.ProposeResolution]: 'workspace.reportActionProposeResolution',
  [ContractReportResolutionAction.RejectIssue]: 'workspace.reportActionRejectIssue',
};

interface CombinedIssueReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportContractListItem[];
  isLoadingReports: boolean;
  reportError?: string | null;
  currentUserId: string;
  contractTitle: string;
  workspaceContractId: string;

  selectedReportId: string | null;
  selectedReportDetail: ReportContract | null;
  isLoadingDetail: boolean;

  onSelectReport: (reportId: string) => void;
  onRespond: (input: {
    resolutionAction: number;
    explanation?: string | null;
    proposedResolution?: string | null;
    rejectReason?: string | null;
    attachments?: File[];
  }) => Promise<{ success: boolean; message?: string }>;
  onConfirm: (isAccepted: boolean) => Promise<{ success: boolean; message?: string }>;
  onEscalate: (input: EscalateReportToDisputeInput) => Promise<{
    success: boolean;
    message?: string;
    disputeId?: string;
  }>;
  onDisputeCreated: (disputeId: string) => void;

  isResponding: boolean;
  isConfirming: boolean;
  isEscalating: boolean;
}

export function CombinedIssueReportsModal({
  isOpen,
  onClose,
  reports,
  isLoadingReports,
  reportError,
  currentUserId,
  contractTitle,
  selectedReportId,
  selectedReportDetail,
  isLoadingDetail,
  onSelectReport,
  onRespond,
  onConfirm,
  onEscalate,
  onDisputeCreated,
  isResponding,
  isConfirming,
  isEscalating,
}: CombinedIssueReportsModalProps) {
  const { t } = useTranslation();
  const [respondMode, setRespondMode] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [proposedResolution, setProposedResolution] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [respondentFiles, setRespondentFiles] = useState<File[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showEscalation, setShowEscalation] = useState(false);
  const [showDisputeCreation, setShowDisputeCreation] = useState(false);

  if (!isOpen) return null;

  const report = selectedReportDetail;

  // Build displayReports array ensuring selected report is present even if opened directly from chat message
  const displayReports: ReportContractListItem[] = [...reports];
  if (report && !displayReports.some(r => r.id === report.id)) {
    displayReports.unshift({
      id: report.id,
      reporterId: report.reporter.id,
      reporterName: report.reporter.name,
      reporterRole: report.reporter.role,
      issueType: report.issueType,
      status: report.status,
      resolutionAction: report.resolutionAction,
      createdAt: report.createdAt,
      respondedAt: report.respondedAt,
      resolvedAt: report.resolvedAt,
    });
  }

  const isReporter = report ? report.reporter.id === currentUserId : false;
  const isRespondent = report ? report.respondent?.id === currentUserId : false;
  const isPending = report ? report.status === ContractReportStatus.Pending : false;
  const isWaitingConfirmation = report
    ? report.status === ContractReportStatus.WaitingReporterConfirmation
    : false;
  const respondentCanRespond = isRespondent && isPending;
  const reporterCanConfirm = isReporter && isWaitingConfirmation;

  const resetRespondMode = () => {
    setRespondMode(null);
    setExplanation('');
    setProposedResolution('');
    setRejectReason('');
    setRespondentFiles([]);
    setActionError(null);
  };

  const downloadAttachment = async (attachment: ReportContractAttachment) => {
    if (!report) return;
    setActionError(null);
    const response = await reportContractGetAPI.getAttachmentDownload(
      report.contractId,
      report.id,
      attachment.reportContractAttachmentId
    );
    if (response.success && response.data) {
      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActionError(response.message || t('workspace.reportDownloadError', { defaultValue: 'Không thể tải tệp đính kèm này.' }));
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    if (selectedFiles.length > 0) {
      setRespondentFiles(prev => [...prev, ...selectedFiles]);
    }
    event.currentTarget.value = '';
  };

  const removeFile = (index: number) => {
    setRespondentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRespondSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setActionError(null);

    if (respondMode === null) {
      setActionError(t('workspace.selectActionRequired', { defaultValue: 'Vui lòng chọn một hành động.' }));
      return;
    }

    if (respondMode === ContractReportResolutionAction.RejectIssue && !rejectReason.trim()) {
      setActionError(t('workspace.reportRejectReasonRequired', { defaultValue: 'Vui lòng nhập lý do từ chối.' }));
      return;
    }

    if (
      respondMode === ContractReportResolutionAction.ProvideExplanation &&
      !explanation.trim()
    ) {
      setActionError(t('workspace.reportExplanationRequired', { defaultValue: 'Vui lòng nhập lời giải thích.' }));
      return;
    }

    if (
      respondMode === ContractReportResolutionAction.ProposeResolution &&
      !proposedResolution.trim()
    ) {
      setActionError(
        t('workspace.reportProposedResolutionRequired', { defaultValue: 'Vui lòng nhập đề xuất giải pháp.' })
      );
      return;
    }

    const result = await onRespond({
      resolutionAction: respondMode,
      explanation: explanation.trim() || null,
      proposedResolution: proposedResolution.trim() || null,
      rejectReason: rejectReason.trim() || null,
      attachments: respondentFiles.length > 0 ? respondentFiles : undefined,
    });

    if (result.success) {
      resetRespondMode();
    } else {
      setActionError(result.message || t('workspace.failedRespondError', { defaultValue: 'Không thể gửi phản hồi.' }));
    }
  };

  const handleConfirmAccept = async () => {
    setActionError(null);
    const result = await onConfirm(true);
    if (!result.success) {
      setActionError(result.message || t('workspace.failedConfirmError', { defaultValue: 'Không thể xác nhận giải quyết.' }));
    }
  };

  const handleConfirmDecline = async () => {
    setActionError(null);
    const result = await onConfirm(false);
    if (!result.success) {
      setActionError(result.message || t('workspace.failedDeclineError', { defaultValue: 'Không thể từ chối giải pháp.' }));
      return;
    }
    setShowEscalation(true);
  };

  const actionOptions: SelectOption[] = [
    {
      value: String(ContractReportResolutionAction.AcceptIssue),
      label: t('workspace.reportActionAcceptIssue', { defaultValue: 'Chấp nhận báo cáo sự cố' }),
    },
    {
      value: String(ContractReportResolutionAction.ProvideExplanation),
      label: t('workspace.reportActionProvideExplanation', { defaultValue: 'Cung cấp giải thích' }),
    },
    {
      value: String(ContractReportResolutionAction.ProposeResolution),
      label: t('workspace.reportActionProposeResolution', { defaultValue: 'Đề xuất giải pháp khắc phục' }),
    },
    {
      value: String(ContractReportResolutionAction.RejectIssue),
      label: t('workspace.reportActionRejectIssue', { defaultValue: 'Từ chối sự cố' }),
    },
  ];

  return (
    <>
      {/* Show Main Combined Modal only when dispute escalation/creation sub-modals are not active */}
      {!showEscalation && !showDisputeCreation && (
        <div
          role="presentation"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={onClose}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-brand/30" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[150px] opacity-15 pointer-events-none bg-text-muted/20" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="combined-reports-title"
            onClick={e => e.stopPropagation()}
            className="relative z-10 w-full max-w-4xl lg:max-w-5xl h-[92dvh] lg:h-[80vh] max-h-[92dvh] lg:max-h-[720px] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-border/80 bg-background text-text-primary backdrop-blur-2xl my-auto"
          >
            {/* ═══ LEFT COLUMN: Reports List ═══════════════════════════════════ */}
            <div className={`w-full lg:w-5/12 h-full p-4 sm:p-6 lg:p-7 flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/60 bg-surface-card/50 relative overflow-hidden shrink-0 ${
              Boolean(selectedReportId) ? 'hidden lg:flex' : 'flex'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="mb-3 sm:mb-4 pr-8 lg:pr-0">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-2 sm:mb-3">
                    <ShieldAlert size={13} />
                    {t('workspace.reportsListBadge', { defaultValue: 'Danh Sách Sự Cố' })}
                  </div>

                  <h1
                    id="combined-reports-title"
                    className="text-lg sm:text-2xl font-black text-text-primary mb-1 tracking-tight"
                  >
                    {t('workspace.issueReportsTitle', { defaultValue: 'Báo Cáo Sự Cố Dự Án' })}
                  </h1>
                  <p className="text-[11px] sm:text-xs font-semibold text-text-muted leading-relaxed">
                    {t('workspace.issueReportsSubtitle', {
                      defaultValue:
                        'Chọn báo cáo bên dưới để xem thông tin chi tiết và thương lượng phương án giải quyết.',
                    })}
                  </p>
                </div>

                {reportError && (
                  <div className="p-3 mb-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{reportError}</span>
                  </div>
                )}

                {/* Reports List Cards */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 max-h-[460px]">
                  {isLoadingReports ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-2 text-text-muted text-xs font-bold">
                      <Loader2 size={24} className="animate-spin text-brand" />
                      <span>{t('common.loading', { defaultValue: 'Đang tải...' })}</span>
                    </div>
                  ) : displayReports.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-text-muted space-y-2 border border-dashed border-border/80 rounded-2xl bg-background/50">
                      <AlertCircle size={28} className="mx-auto text-text-muted/40" />
                      <p>
                        {t('workspace.reportNoReports', {
                          defaultValue: 'Chưa có báo cáo sự cố nào.',
                        })}
                      </p>
                    </div>
                  ) : (
                    displayReports.map(rep => {
                      const isSelected = selectedReportId === rep.id;
                      const isUserReporter = rep.reporterId === currentUserId;

                      return (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => onSelectReport(rep.id)}
                          className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 relative group ${
                            isSelected
                              ? 'bg-brand/10 border-brand/40 shadow-xs'
                              : 'bg-background/60 border-border/60 hover:bg-surface-hover hover:border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-black tracking-tight ${
                                isSelected ? 'text-brand' : 'text-text-primary'
                              }`}
                            >
                              {t(
                                ISSUE_TYPE_KEYS[rep.issueType] ||
                                  'workspace.reportIssueTypeOther'
                              )}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                rep.status === ContractReportStatus.Resolved
                                  ? 'bg-surface-muted border-border text-text-primary'
                                  : rep.status === ContractReportStatus.Escalated
                                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                                    : 'bg-brand/10 border-brand/20 text-brand'
                              }`}
                            >
                              {t(
                                STATUS_KEYS[rep.status] ||
                                  'workspace.reportStatusPending'
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
                            <span>
                              <UserProfileLink
                                userId={rep.reporterId}
                                role={rep.reporterRole ?? undefined}
                              >
                                {rep.reporterName || t('common.unknown')}
                              </UserProfileLink>
                              {isUserReporter ? ` (${t('common.you', { defaultValue: 'bạn' })})` : ''}
                            </span>

                            <span className="flex items-center gap-1">
                              {new Date(rep.createdAt).toLocaleDateString()}
                              <ChevronRight
                                size={14}
                                className={`transition-transform ${
                                  isSelected
                                    ? 'text-brand translate-x-0.5'
                                    : 'text-text-muted opacity-0 group-hover:opacity-100'
                                }`}
                              />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Close Button Mobile */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close', { defaultValue: 'Đóng' })}
                  className="absolute top-4 right-4 lg:hidden p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ═══ RIGHT COLUMN: Issue Detail & Response Form ═════════════════ */}
            <div className={`w-full lg:w-7/12 flex-1 min-h-0 h-full p-4 sm:p-6 lg:p-10 bg-background relative overflow-y-auto custom-scrollbar flex-col justify-between ${
              Boolean(selectedReportId) ? 'flex' : 'hidden lg:flex'
            }`}>
              {/* Mobile Back to List Button */}
              <div className="flex lg:hidden items-center justify-between gap-2 pb-3 mb-2 border-b border-border/60 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectReport('')}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-brand hover:underline cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>{t('workspace.backToReportsList', { defaultValue: 'Danh sách sự cố' })}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close', { defaultValue: 'Đóng' })}
                  className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Desktop Close */}
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close', { defaultValue: 'Đóng' })}
                className="hidden lg:flex absolute top-5 right-5 p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-muted cursor-pointer z-20"
              >
                <X size={16} />
              </button>

              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3 text-text-muted text-xs font-bold my-auto">
                  <Loader2 size={32} className="animate-spin text-brand" />
                  <span>{t('workspace.loadingReportDetail', { defaultValue: 'Đang tải chi tiết sự cố...' })}</span>
                </div>
              ) : !report ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 text-text-muted my-auto">
                  <div className="w-16 h-16 rounded-full bg-surface-muted border border-border flex items-center justify-center text-text-muted/50">
                    <FileText size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-text-primary">
                      {t('workspace.selectReportPrompt', { defaultValue: 'Chưa chọn sự cố' })}
                    </h3>
                    <p className="text-xs font-medium max-w-xs mx-auto">
                      {t('workspace.selectReportPromptDesc', {
                        defaultValue:
                          'Vui lòng chọn một sự cố từ danh sách bên trái để xem chi tiết và trao đổi.',
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-6">
                  {/* Header Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand block">
                        {t(
                          ISSUE_TYPE_KEYS[report.issueType] ||
                            'workspace.reportIssueTypeOther'
                        )}
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-text-primary leading-tight">
                        {contractTitle}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black border ${
                          report.status === ContractReportStatus.Resolved
                            ? 'bg-surface-muted border-border text-text-primary'
                            : report.status === ContractReportStatus.Escalated
                              ? 'bg-destructive/10 border-destructive/20 text-destructive'
                              : 'bg-brand/10 border-brand/20 text-brand'
                        }`}
                      >
                        {t(
                          STATUS_KEYS[report.status] ||
                            'workspace.reportStatusPending'
                        )}
                      </span>

                      {report.isEscalatedToDispute && (
                        <span className="px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase">
                          {t('workspace.reportIsEscalated', { defaultValue: 'Đã chuyển Tranh chấp' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {actionError && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Main Content Details Grid */}
                  <div className="space-y-4 flex-1">
                    {/* Reporter & Respondent Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-2xl border border-border/60 bg-surface-muted/30 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                          {t('workspace.reportReporter', { defaultValue: 'Người báo cáo' })}
                        </span>
                        <span className="font-extrabold text-text-primary block">
                          <UserProfileLink
                            userId={report.reporter.id}
                            role={report.reporter.role ?? undefined}
                          >
                            {report.reporter.name || t('common.unknown', { defaultValue: 'Không rõ' })}
                          </UserProfileLink>
                          {isReporter ? ` (${t('common.you', { defaultValue: 'bạn' })})` : ''}
                        </span>
                      </div>

                      {report.respondent && (
                        <div className="p-3 rounded-2xl border border-border/60 bg-surface-muted/30 space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                            {t('workspace.reportRespondent', { defaultValue: 'Đối phương' })}
                          </span>
                          <span className="font-extrabold text-text-primary block">
                            <UserProfileLink
                              userId={report.respondent.id}
                              role={report.respondent.role ?? undefined}
                            >
                              {report.respondent.name || t('common.unknown', { defaultValue: 'Không rõ' })}
                            </UserProfileLink>
                            {isRespondent ? ` (${t('common.you', { defaultValue: 'bạn' })})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Related Milestone Info */}
                    {report.milestone && (
                      <div className="p-3 rounded-2xl border border-border/60 bg-surface-muted/30 text-xs space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                          {t('workspace.reportMilestone', { defaultValue: 'Cột mốc' })}
                        </span>
                        <span className="font-bold text-text-primary">
                          {report.milestone.title || report.milestone.id}
                        </span>
                      </div>
                    )}

                    {/* Description Box */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                        {t('workspace.reportDescriptionLabel', { defaultValue: 'Mô tả sự cố' })}
                      </label>
                      <div className="p-4 rounded-2xl border border-border/60 bg-surface-muted/30 text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
                        {report.description}
                      </div>
                    </div>

                    {/* Desired Resolution Box */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                        {t('workspace.reportDesiredResolution', { defaultValue: 'Mong muốn giải quyết' })}
                      </label>
                      <div className="p-4 rounded-2xl border border-border/60 bg-surface-muted/30 text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
                        {report.desiredResolution}
                      </div>
                    </div>

                    {/* Attachments Section */}
                    {report.attachments.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                          {t('workspace.reportEvidence', { defaultValue: 'Minh chứng đính kèm' })} ({report.attachments.length})
                        </label>
                        <div className="space-y-2">
                          {report.attachments.map(att => (
                            <div
                              key={att.reportContractAttachmentId}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-border/70 bg-surface-card"
                            >
                              <FileTypeBadge
                                fileName={att.fileName}
                                fileSize={att.fileSize}
                                compact
                              />
                              <button
                                type="button"
                                onClick={() => downloadAttachment(att)}
                                className="p-1.5 rounded-lg border border-border bg-surface-muted hover:bg-border text-text-muted hover:text-text-primary transition cursor-pointer"
                                title={t('workspace.downloadFile', { defaultValue: 'Tải về' })}
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response / Resolution Notes from Respondent */}
                    {report.resolutionAction !== undefined &&
                      report.resolutionAction !== null && (
                        <div className="p-4 rounded-2xl border border-brand/30 bg-brand/5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-brand uppercase tracking-wider text-[10px]">
                              {t('workspace.respondentResponse', { defaultValue: 'Phản hồi của phía đối phương' })}
                            </span>
                            <span className="font-bold text-brand">
                              {t(
                                RESOLUTION_ACTION_KEYS[report.resolutionAction] ||
                                  'workspace.reportActionProvideExplanation'
                              )}
                            </span>
                          </div>

                          {report.explanation && (
                            <p className="text-text-primary font-medium">
                              <strong>{t('workspace.explanationLabel', { defaultValue: 'Lời giải thích:' })}</strong> {report.explanation}
                            </p>
                          )}

                          {report.proposedResolution && (
                            <p className="text-text-primary font-medium">
                              <strong>{t('workspace.proposedResolutionLabel', { defaultValue: 'Đề xuất giải quyết:' })}</strong> {report.proposedResolution}
                            </p>
                          )}

                          {report.rejectReason && (
                            <p className="text-destructive font-bold">
                              <strong>{t('workspace.rejectReasonLabel', { defaultValue: 'Lý do từ chối:' })}</strong> {report.rejectReason}
                            </p>
                          )}
                        </div>
                      )}
                  </div>

                  {/* ═══ INTERACTIVE ACTION PANELS ═══════════════════════════ */}
                  <div className="pt-4 border-t border-border/60 space-y-3 mt-auto">
                    {/* Respondent Action Form */}
                    {respondentCanRespond && (
                      <form onSubmit={handleRespondSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                            {t('workspace.selectResponseAction', { defaultValue: 'Chọn hành động phản hồi' })}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {actionOptions.map(opt => {
                              const actionVal = Number(opt.value);
                              const isSelected = respondMode === actionVal;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={isResponding}
                                  onClick={() => setRespondMode(actionVal)}
                                  className={`p-3.5 rounded-2xl border text-left text-xs font-black transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                    isSelected
                                      ? 'bg-brand/10 border-brand text-brand ring-2 ring-brand/20 shadow-xs'
                                      : 'bg-surface-card border-border/80 text-text-primary hover:border-brand/40 hover:bg-surface-hover'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && <CheckCircle size={16} className="text-brand shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {respondMode === ContractReportResolutionAction.RejectIssue && (
                          <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder={t('workspace.enterRejectReasonPlaceholder', { defaultValue: 'Nhập lý do từ chối...' })}
                            rows={3}
                            disabled={isResponding}
                            className="w-full rounded-2xl border border-border/80 bg-surface-muted/30 p-4 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                          />
                        )}

                        {respondMode === ContractReportResolutionAction.ProvideExplanation && (
                          <textarea
                            value={explanation}
                            onChange={e => setExplanation(e.target.value)}
                            placeholder={t('workspace.enterExplanationPlaceholder', { defaultValue: 'Nhập lời giải thích...' })}
                            rows={3}
                            disabled={isResponding}
                            className="w-full rounded-2xl border border-border/80 bg-surface-muted/30 p-4 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                          />
                        )}

                        {respondMode === ContractReportResolutionAction.ProposeResolution && (
                          <textarea
                            value={proposedResolution}
                            onChange={e => setProposedResolution(e.target.value)}
                            placeholder={t('workspace.enterProposedResolutionPlaceholder', { defaultValue: 'Nhập đề xuất giải pháp...' })}
                            rows={3}
                            disabled={isResponding}
                            className="w-full rounded-2xl border border-border/80 bg-surface-muted/30 p-4 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
                          />
                        )}

                        {/* File attachment selector for respondent */}
                        <div className="space-y-2">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            disabled={isResponding}
                            className="hidden"
                            id="respondent-file-input"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('respondent-file-input')?.click()}
                            disabled={isResponding}
                            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            + {t('workspace.addAttachmentFiles', { defaultValue: 'Đính kèm tệp phản hồi' })}
                          </button>
                          {respondentFiles.length > 0 && (
                            <div className="space-y-1">
                              {respondentFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl border border-border bg-surface-card">
                                  <span className="truncate max-w-xs">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(idx)}
                                    className="text-destructive hover:bg-destructive/10 p-1 rounded-lg"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isResponding || respondMode === null}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black text-brand-foreground bg-brand hover:bg-brand-hover shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isResponding ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <span>{t('workspace.sendResponse', { defaultValue: 'Gửi Phản Hồi' })}</span>
                              <ArrowRight size={15} />
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    {/* Reporter Confirmation Controls */}
                    {reporterCanConfirm && (
                      <div className="space-y-3 p-4 rounded-2xl border border-brand/30 bg-brand/5">
                        <p className="text-xs font-bold text-text-primary">
                          {t('workspace.reporterConfirmPrompt', { defaultValue: 'Đối phương đã gửi phương án giải quyết. Bạn có đồng ý với phương án này không?' })}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void handleConfirmAccept()}
                            disabled={isConfirming}
                            className="w-1/2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-brand-foreground font-black text-xs hover:bg-brand-hover transition cursor-pointer disabled:opacity-50 shadow-md"
                          >
                            <CheckCircle size={15} />
                            {t('workspace.acceptResolution', { defaultValue: 'Chấp Nhận Giải Pháp' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmDecline()}
                            disabled={isConfirming}
                            className="w-1/2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive font-black text-xs hover:bg-destructive/20 transition cursor-pointer disabled:opacity-50"
                          >
                            <XCircle size={15} />
                            {t('workspace.declineAndEscalate', { defaultValue: 'Từ Chối & Tranh Chấp' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals for Dispute Escalation & Creation */}
      {showEscalation && report && (
        <DisputeEscalationModal
          isOpen
          isEscalating={isEscalating}
          onClose={() => setShowEscalation(false)}
          onEscalate={() => {
            setShowEscalation(false);
            setShowDisputeCreation(true);
          }}
        />
      )}

      {showDisputeCreation && report && (
        <DisputeCreationModal
          isOpen
          report={report}
          contractTitle={contractTitle}
          isSubmitting={isEscalating}
          onClose={() => setShowDisputeCreation(false)}
          onSubmit={onEscalate}
          onCreated={disputeId => {
            setShowDisputeCreation(false);
            onDisputeCreated(disputeId);
          }}
        />
      )}
    </>
  );
}
