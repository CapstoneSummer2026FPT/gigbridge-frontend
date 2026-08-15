import {
  PanelRightClose,
  MessageSquare,
  FileText,
  Ban,
  AlertTriangle,
  Smile,
  Upload,
  Send,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import { ChatSystemBanner } from '../../messages/components/ChatSystemBanner';
import { FileTypeBadge } from '../../../shared/components/FileTypeBadge';
import { WorkspaceFilesPanel } from './WorkspaceFilesPanel';
import { parseReportSystemMessageMetadata, type ReportSystemMessageMetadata } from '../utils/reportSystemMessage';
import {
  ContractReportIssueType,
  ContractReportResolutionAction,
  ContractReportStatus,
} from '../../../types/models/ReportContract';
import { ContractStatus, type WorkspaceFileDto } from '../../../types/models/Contract';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { toast } from 'sonner';
import '../styles/chat-and-info-panel.css';

const REPORT_ISSUE_KEYS: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'workspace.reportIssueTypePaymentIssue',
  [ContractReportIssueType.MilestoneIssue]: 'workspace.reportIssueTypeMilestoneIssue',
  [ContractReportIssueType.Delay]: 'workspace.reportIssueTypeDelay',
  [ContractReportIssueType.PoorQuality]: 'workspace.reportIssueTypePoorQuality',
  [ContractReportIssueType.CommunicationProblem]: 'workspace.reportIssueTypeCommunicationProblem',
  [ContractReportIssueType.ScopeChange]: 'workspace.reportIssueTypeScopeChange',
  [ContractReportIssueType.Other]: 'workspace.reportIssueTypeOther',
};

const REPORT_ACTION_KEYS: Record<number, string> = {
  [ContractReportResolutionAction.AcceptIssue]: 'workspace.reportActionAcceptIssue',
  [ContractReportResolutionAction.ProvideExplanation]: 'workspace.reportActionProvideExplanation',
  [ContractReportResolutionAction.ProposeResolution]: 'workspace.reportActionProposeResolution',
  [ContractReportResolutionAction.RejectIssue]: 'workspace.reportActionRejectIssue',
};

const REPORT_STATUS_KEYS: Record<number, string> = {
  [ContractReportStatus.Pending]: 'workspace.reportStatusPending',
  [ContractReportStatus.WaitingReporterConfirmation]: 'workspace.reportStatusWaitingConfirmation',
  [ContractReportStatus.Resolved]: 'workspace.reportStatusResolved',
  [ContractReportStatus.Escalated]: 'workspace.reportStatusEscalated',
};

export interface ChatAndInfoPanelProps {
  showInfo: boolean;
  setShowInfo: (val: boolean) => void;
  activeTab: 'chat' | 'files';
  setActiveTab: (tab: 'chat' | 'files') => void;
  mobileTab: string;
  partnerName: string;
  partnerAvatar: string;
  partnerUserId: string | null;
  partnerTitle: string;
  partnerCompany: string;
  isPartnerOnline: boolean;
  showProfilePopover: boolean;
  setShowProfilePopover: (val: boolean) => void;
  profilePopoverTimeout: React.MutableRefObject<any>;
  isFavorited: boolean;
  setIsFavorited: (val: boolean) => void;
  isBlocked: boolean;
  setIsBlocked: (val: boolean) => void;
  projectMessages: any[];
  chatEndRef: any;
  messageInput: string;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => void;
  isWorkspaceLocked: boolean;
  isContractDisputed: boolean;
  activeDisputeId: string | null;
  workspaceContractId: string;
  contractId: string | undefined;
  isClient: boolean;
  activeContract: any;
  setProductModalOpen: (val: boolean) => void;
  viewReportId: string | null;
  unavailableReportId: string | null;
  isLoadingReportDetail: boolean;
  handleViewContractReport: (reportId: string) => Promise<void>;
  workspaceFiles: WorkspaceFileDto[];
  workspaceFilesLoading: boolean;
  workspaceFilesError: string | null;
  setWorkspaceFilesLoading: (val: boolean) => void;
  setWorkspaceFilesError: (val: string | null) => void;
  setWorkspaceFiles: (files: WorkspaceFileDto[]) => void;
  user: any;
  navigate: (path: string) => void;
}

export function ChatAndInfoPanel({
  showInfo,
  setShowInfo,
  activeTab,
  setActiveTab,
  mobileTab,
  partnerName,
  partnerAvatar,
  partnerUserId,
  partnerTitle,
  partnerCompany,
  isPartnerOnline,
  showProfilePopover,
  setShowProfilePopover,
  profilePopoverTimeout,
  isFavorited,
  setIsFavorited,
  isBlocked,
  setIsBlocked,
  projectMessages,
  chatEndRef,
  messageInput,
  setMessageInput,
  handleSendMessage,
  isWorkspaceLocked,
  isContractDisputed,
  activeDisputeId,
  workspaceContractId,
  contractId,
  isClient,
  activeContract,
  setProductModalOpen,
  viewReportId,
  unavailableReportId,
  isLoadingReportDetail,
  handleViewContractReport,
  workspaceFiles,
  workspaceFilesLoading,
  workspaceFilesError,
  setWorkspaceFilesLoading,
  setWorkspaceFilesError,
  setWorkspaceFiles,
  user,
  navigate,
}: ChatAndInfoPanelProps) {
  const { t } = useTranslation();

  const getReportSystemDetail = (event: ReportSystemMessageMetadata): string | null => {
    if (event.resolutionAction === ContractReportResolutionAction.ProvideExplanation) return event.explanation;
    if (event.resolutionAction === ContractReportResolutionAction.ProposeResolution) return event.proposedResolution;
    if (event.resolutionAction === ContractReportResolutionAction.RejectIssue) return event.rejectReason;
    return null;
  };

  const getReportSystemSummary = (event: ReportSystemMessageMetadata): string => {
    const actor = event.actorName || event.actorRole || t('workspace.reportParticipant');
    if (event.eventType === 'created') return t('workspace.reportSystemCreatedSummary', { actor });
    if (event.eventType === 'resolved') return t('workspace.reportSystemResolvedSummary');

    switch (event.resolutionAction) {
      case ContractReportResolutionAction.AcceptIssue:
        return t('workspace.reportSystemAcceptedSummary', { actor });
      case ContractReportResolutionAction.ProvideExplanation:
        return t('workspace.reportSystemExplainedSummary', { actor });
      case ContractReportResolutionAction.ProposeResolution:
        return t('workspace.reportSystemProposedSummary', { actor });
      case ContractReportResolutionAction.RejectIssue:
        return t('workspace.reportSystemRejectedSummary', { actor });
      default:
        return t('workspace.reportSystemUpdatedSummary', { actor });
    }
  };

  return (
    <aside
      className={`flex flex-col bg-card rounded-2xl border border-border shadow-2xs overflow-hidden transition-all duration-300 flex-shrink-0 chat-and-info-panel ${
        showInfo
          ? 'w-80 lg:w-[32%] xl:w-[28%] 2xl:w-[24%] max-w-[420px] min-w-[300px] opacity-100'
          : 'w-0 min-w-0 max-w-0 opacity-0 border-none p-0 m-0 pointer-events-none'
      } ${mobileTab === 'chat' ? 'flex flex-1 w-full' : 'hidden lg:flex'}`}
    >
      {/* 2 Tabs at the top with Collapse icon */}
      <div className="flex items-center border-b border-border bg-card">
        <button
          type="button"
          onClick={() => setShowInfo(false)}
          className="p-3.5 border-r border-border hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0 hidden lg:flex items-center justify-center"
          title={t('workspace.toggleChatInfo', { defaultValue: 'Thu gọn bảng Trò chuyện & Thông tin' })}
        >
          <PanelRightClose size={16} />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'chat'
              ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare size={14} />
          <span>{t('nav.messages', { defaultValue: 'Trò chuyện' })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'files'
              ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-black'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText size={14} />
          <span>{t('workspace.sharedFiles', { defaultValue: 'File chung' })}</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Chat Header */}
            <div className="glass-header px-4 py-3 border-b border-border flex justify-between items-center flex-shrink-0">
              <div
                className="flex items-center gap-3 relative cursor-pointer py-1"
                onMouseEnter={() => {
                  if (profilePopoverTimeout.current) clearTimeout(profilePopoverTimeout.current);
                  setShowProfilePopover(true);
                }}
                onMouseLeave={() => {
                  profilePopoverTimeout.current = setTimeout(() => setShowProfilePopover(false), 150);
                }}
              >
                <UserProfileLink userId={partnerUserId} role={isClient ? 'freelancer' : 'client'} className="flex items-center gap-3">
                  <span className="relative">
                    <UserAvatar name={partnerName} src={partnerAvatar} userId={partnerUserId} size="sm" />
                    {isPartnerOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-card rounded-full" />
                    )}
                  </span>
                  <span>
                    <h2 className="text-xs font-semibold">{partnerName}</h2>
                    <p className="text-[9px] text-green-500 font-semibold uppercase tracking-widest">
                      {isPartnerOnline ? t('workspace.online', { defaultValue: 'Trực tuyến' }) : t('workspace.offline', { defaultValue: 'Ngoại tuyến' })} • {partnerTitle}
                    </p>
                  </span>
                </UserProfileLink>

                {/* Hover Popover */}
                {showProfilePopover && (
                  <div
                    className="absolute left-0 top-full w-64 bg-card border border-border rounded-xl shadow-2xl p-4 z-[80]"
                    onMouseEnter={() => {
                      if (profilePopoverTimeout.current) clearTimeout(profilePopoverTimeout.current);
                    }}
                    onMouseLeave={() => {
                      profilePopoverTimeout.current = setTimeout(() => setShowProfilePopover(false), 150);
                    }}
                  >
                    <div className="text-center">
                      <UserProfileLink userId={partnerUserId} role={isClient ? 'freelancer' : 'client'}>
                        <UserAvatar name={partnerName} src={partnerAvatar} userId={partnerUserId} size="lg" className="mx-auto mb-2" />
                        <h3 className="font-bold text-xs text-foreground">{partnerName}</h3>
                      </UserProfileLink>
                      <p className="text-[9px] text-muted-foreground mb-3">{partnerTitle} at {partnerCompany}</p>
                      <div className="flex justify-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const path = getProfilePath(partnerUserId, isClient ? 'freelancer' : 'client');
                            if (path) navigate(path);
                          }}
                          className="text-[8px] font-bold px-3 py-1 rounded-full bg-secondary text-foreground hover:bg-muted uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {t('workspace.viewProfile', { defaultValue: 'Xem hồ sơ' })}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFavorited(!isFavorited);
                          }}
                          className={`text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                            isFavorited ? 'bg-[var(--gb-cyan)] text-white' : 'bg-secondary text-foreground hover:bg-muted'
                          }`}
                        >
                          {isFavorited ? t('workspace.favorited', { defaultValue: 'Đã yêu thích' }) : t('workspace.favorite', { defaultValue: 'Yêu thích' })}
                        </button>
                      </div>
                      <div className="border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextBlocked = !isBlocked;
                            setIsBlocked(nextBlocked);
                            toast.success(nextBlocked ? t('workspace.contactBlocked') : t('workspace.contactUnblocked'));
                          }}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${
                            isBlocked ? 'border-green-500/30 text-green-500 hover:bg-green-500/5' : 'border-red-500/30 text-red-500 hover:bg-red-500/5'
                          }`}
                        >
                          <Ban size={10} />
                          {isBlocked ? t('workspace.unblockContact') : t('workspace.blockContact')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              <div className="flex justify-center mb-1">
                <span className="bg-muted px-2.5 py-0.5 rounded-full text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {t('workspace.chatHeader', { defaultValue: 'Kênh trò chuyện chính thức' })}
                </span>
              </div>

              {projectMessages.map((msg, index) => {
                const isMe = msg.senderId === user?.id || (msg.senderId === 'client' && isClient) || (msg.senderId === 'freelancer' && !isClient);
                const reportEvent = parseReportSystemMessageMetadata(msg.metadata);
                const isSystemMessage = msg.type === 'system';

                if (reportEvent) {
                  const detail = getReportSystemDetail(reportEvent);
                  const isSelected = viewReportId === reportEvent.reportId;
                  const isUnavailable = unavailableReportId === reportEvent.reportId;
                  const isResolved = reportEvent.eventType === 'resolved';
                  const titleKey = reportEvent.eventType === 'created'
                    ? 'workspace.reportSystemCreatedTitle'
                    : isResolved
                      ? 'workspace.reportSystemResolvedTitle'
                      : 'workspace.reportSystemUpdatedTitle';

                  const badgeColorClass = isResolved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white';

                  const statusBadgeClass = isResolved
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400';

                  const iconBgClass = isResolved ? 'bg-emerald-600 shadow-emerald-600/25' : 'bg-amber-600 shadow-amber-600/25';
                  const cardBorderClass = isResolved
                    ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card'
                    : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card';

                  return (
                    <div key={msg.id || index} className="flex justify-center my-3 w-full min-w-0 px-1">
                      <div
                        id={`report-system-${reportEvent.reportId}`}
                        className={`w-[min(560px,100%)] max-w-full rounded-2xl border p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all overflow-hidden ${cardBorderClass} ${
                          isSelected ? 'ring-2 ring-amber-500/40' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
                          {/* Glowing Icon Box */}
                          <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0 mt-0.5 ${iconBgClass}`}>
                            {isResolved ? (
                              <CheckCircle size={20} />
                            ) : (
                              <AlertTriangle size={20} />
                            )}
                          </div>

                          {/* Body Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Top Pill Row */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase shadow-2xs shrink-0 ${badgeColorClass}`}>
                                {isResolved ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                {t(titleKey)}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase shrink-0 ${statusBadgeClass}`}>
                                {t(REPORT_STATUS_KEYS[reportEvent.status] || 'workspace.reportStatusPending')}
                              </span>
                            </div>

                            {/* Summary Line */}
                            <p className="text-xs font-bold text-foreground leading-relaxed pt-0.5 break-words [overflow-wrap:anywhere] min-w-0">
                              {getReportSystemSummary(reportEvent)}
                            </p>

                            {/* Event Details Section */}
                            {reportEvent.eventType === 'created' && (
                              <div className="space-y-1.5 rounded-xl bg-muted/60 border border-border/50 p-3 text-xs">
                                <div className="flex items-start gap-1.5 break-words [overflow-wrap:anywhere] min-w-0">
                                  <span className="font-extrabold text-foreground shrink-0">{t('workspace.reportSystemReason')}:</span>
                                  <span className="text-muted-foreground font-semibold">{t(REPORT_ISSUE_KEYS[reportEvent.issueType] || 'workspace.reportIssueTypeOther')}</span>
                                </div>
                                <div className="flex items-start gap-1.5 break-words [overflow-wrap:anywhere] min-w-0">
                                  <span className="font-extrabold text-foreground shrink-0">{t('workspace.reportDesiredResolution')}:</span>
                                  <span className="text-muted-foreground font-semibold">{reportEvent.desiredResolution}</span>
                                </div>
                                <div className="flex items-start gap-1.5 break-words [overflow-wrap:anywhere] min-w-0">
                                  <span className="font-extrabold text-foreground shrink-0">{t('workspace.reportDescription')}:</span>
                                  <span className="text-muted-foreground font-semibold">{reportEvent.description}</span>
                                </div>
                              </div>
                            )}

                            {reportEvent.eventType === 'updated' && (
                              <div className="space-y-1.5 rounded-xl bg-muted/60 border border-border/50 p-3 text-xs">
                                <div className="flex items-start gap-1.5 break-words [overflow-wrap:anywhere] min-w-0">
                                  <span className="font-extrabold text-foreground shrink-0">{t('workspace.reportSystemAction')}:</span>
                                  <span className="text-muted-foreground font-semibold">
                                    {reportEvent.resolutionAction === null
                                      ? t('workspace.reportSystemUpdatedTitle')
                                      : t(REPORT_ACTION_KEYS[reportEvent.resolutionAction])}
                                  </span>
                                </div>
                                {detail && (
                                  <div className="flex items-start gap-1.5 break-words [overflow-wrap:anywhere] min-w-0">
                                    <span className="font-extrabold text-foreground shrink-0">{t('workspace.reportSystemReason')}:</span>
                                    <span className="text-muted-foreground font-semibold">{detail}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action Footer */}
                            <div className="pt-2 flex items-center justify-between border-t border-border/60">
                              {isUnavailable ? (
                                <p className="text-xs font-semibold text-destructive">
                                  {t('workspace.reportUnavailableDetail')}
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleViewContractReport(reportEvent.reportId)}
                                  disabled={isLoadingReportDetail && isSelected}
                                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black shadow-2xs transition-all cursor-pointer border-none active:scale-[0.98] disabled:opacity-50 ${
                                    isResolved
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                                  }`}
                                >
                                  {isLoadingReportDetail && isSelected
                                    ? t('common.loading')
                                    : t('workspace.reportView')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isSystemMessage) {
                  return (
                    <ChatSystemBanner
                      key={msg.id || index}
                      content={msg.content}
                      contractId={contractId}
                      onNavigateContract={id => navigate(`/contracts/${id}`)}
                    />
                  );
                }

                return (
                  <div key={msg.id || index} className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <UserProfileLink userId={partnerUserId} role={isClient ? 'freelancer' : 'client'} className="flex-shrink-0">
                        <UserAvatar name={partnerName} src={partnerAvatar} userId={partnerUserId} size="sm" />
                      </UserProfileLink>
                    )}
                    <div className="flex flex-col gap-1">
                      {msg.type === 'file' ? (
                        <div className="flex flex-col gap-1.5 w-full max-w-[320px] sm:max-w-[380px] min-w-0 overflow-hidden">
                          {msg.content && (
                            <p className="text-xs text-foreground">{msg.content}</p>
                          )}
                          {(msg.attachments && msg.attachments.length > 0
                            ? msg.attachments
                            : msg.fileUrl || msg.fileName
                              ? [{ messageAttachmentId: msg.id, fileName: msg.fileName ?? '', fileUrl: msg.fileUrl ?? '', mimeType: '', fileSizeBytes: 0, createdAt: msg.createdAt ?? '' }]
                              : []
                          ).map((attachment: any) => (
                            <FileTypeBadge
                              key={attachment.messageAttachmentId}
                              fileName={attachment.fileName}
                              fileUrl={attachment.fileUrl || null}
                              fileSize={attachment.fileSizeBytes}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className={`p-3 rounded-xl shadow-sm border text-xs leading-relaxed ${isMe ? 'bg-[var(--gb-cyan)] text-white border-transparent rounded-br-none' : 'bg-card text-foreground border-border rounded-bl-none'}`}>
                          <p>{msg.content}</p>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] text-muted-foreground">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-[var(--gb-cyan)] font-bold">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {isWorkspaceLocked ? (
              <div className="p-4 bg-muted/50 border-t border-border text-center text-xs font-semibold text-muted-foreground">
                {isContractDisputed ? (
                  <div className="workspace-dispute-lock">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>{t('workspace.disputeLockedTitle')}</strong>
                      <p>{t('workspace.disputeLockedDescription')}</p>
                    </div>
                    {activeDisputeId && (
                      <button type="button" onClick={() => navigate(`/contracts/${workspaceContractId}/disputes/${activeDisputeId}`)}>
                        {t('workspace.openDispute')}
                      </button>
                    )}
                  </div>
                ) : t('workspace.viewOnlyNotice')}
              </div>
            ) : (
              <div className="p-3 bg-card border-t border-border flex-shrink-0">
                <div className="flex flex-col border border-border rounded-xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">
                  <textarea
                    className="w-full bg-transparent border-none focus:outline-none p-3 resize-none min-h-[44px] text-xs focus:ring-0"
                    placeholder={t('workspace.typeMessagePlaceholder', { defaultValue: 'Nhập tin nhắn...' })}
                    rows={1}
                    value={messageInput ?? ''}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <div className="flex justify-between items-center px-3 pb-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMessageInput(prev => `${prev ?? ''}😊`)}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer"
                        title={t('workspace.addEmoji')}
                      >
                        <Smile size={14} />
                      </button>

                      {/* Send Work Materials Button for Client inside Chat Toolbar */}
                      {isClient && activeContract?.status === ContractStatus.Active && (
                        <button
                          type="button"
                          onClick={() => setProductModalOpen(true)}
                          className="h-7 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ml-1 active:scale-95"
                          title={t('workspace.sendMaterialsTooltip')}
                        >
                          <Upload size={12} />
                          <span>{t('workspace.sendMaterialsButton')}</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white h-8 px-4 rounded-full flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      <span>{t('workspace.send', { defaultValue: 'Gửi' })}</span>
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <WorkspaceFilesPanel
            contractId={contractId ?? ''}
            files={workspaceFiles}
            isLoading={workspaceFilesLoading}
            error={workspaceFilesError}
            onLoad={async () => {
              if (!contractId) return;
              setWorkspaceFilesLoading(true);
              setWorkspaceFilesError(null);
              try {
                const res = await contractGetAPI.getWorkspaceFiles(contractId);
                if (res.success && res.data) setWorkspaceFiles(res.data);
                else setWorkspaceFilesError(res.message ?? 'Unable to load files');
              } catch {
                setWorkspaceFilesError('Unable to load files');
              } finally {
                setWorkspaceFilesLoading(false);
              }
            }}
          />
        )}
      </div>
    </aside>
  );
}
