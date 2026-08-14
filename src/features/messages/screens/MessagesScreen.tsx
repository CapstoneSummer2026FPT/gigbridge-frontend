import {
  Send, Paperclip, Smile, Info, X, Download as DownloadIcon,
  ChevronDown,
  CreditCard, CheckCircle, Briefcase, Layers,
  ExternalLink, MessageSquare, ArrowRightLeft,
  Loader2, AlertCircle, Clock3,
  CalendarPlus, CalendarDays, Pencil, ChevronUp, Video,
  ShieldAlert, Lock, Award, LockKeyhole,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ContractStatus } from '../../../types/models/Contract';
import type { ScheduleEvent } from '../../../api/scheduleAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ServiceFeeDialog } from '../../../shared/components/ServiceFeeDialog';
import { calculateServiceFee } from '../../../shared/utils/serviceFee';
import { NegotiationDealCard } from '../components/NegotiationDealCard';
import { FinalOfferEditor } from '../components/FinalOfferEditor';
import { CreateScheduleModal } from '../components/CreateScheduleModal';
import { useMessages } from '../hooks/useMessages';
import { ConversationStatus, ConversationType } from '../../../types/models/Message';
import { MESSAGE_ROOMS } from '../messageRooms';
import { CombinedIssueReportsModal, useReportContract } from '../../report-contracts';
import {
  ContractReportResolutionAction,
  ContractReportStatus,
} from '../../../types/models/ReportContract';
import { parseReportSystemMessageMetadata } from '../../workspace/utils/reportSystemMessage';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import { FileTypeBadge, getFileCategory, toForceDownloadUrl } from '../../../shared/components/FileTypeBadge';
import '../styles/messages-screen.css';

const ROOM_COPY = {
  invited: { label: 'messages.roomInvitedLabel', description: 'messages.roomInvitedDesc' },
  negotiation: { label: 'messages.roomNegotiationLabel', description: 'messages.roomNegotiationDesc' },
  workspace: { label: 'messages.roomWorkspaceLabel', description: 'messages.roomWorkspaceDesc' },
  dispute: { label: 'messages.roomDisputeLabel', description: 'messages.roomDisputeDesc' },
} as const;

// Dispute conversations share the workspace room bucket (roomId) but have their own
// dedicated dispute-detail screen — every roomId membership check on this screen must
// exclude them, or they leak into room counts/badges and can get auto-selected on tab switch.
function isRoomConvo(c: { roomId: string; conversationType?: number }, roomId: string): boolean {
  return c.roomId === roomId && c.conversationType !== ConversationType.Dispute;
}

function countdown(start: string, now: number) {
  const delta = new Date(start).getTime() - now;
  if (delta <= 0) return 'Meeting time reached';
  const seconds = Math.floor(delta / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return days
    ? `${days}d ${hours}h ${minutes}m ${remainingSeconds}s remaining`
    : hours
      ? `${hours}h ${minutes}m ${remainingSeconds}s remaining`
      : `${minutes}m ${remainingSeconds}s remaining`;
}

function vietnamDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' Vietnam Time (ICT)';
}

function MessageContent({ content, mine }: { content: string; mine: boolean }) {
  const isGoogleMeetLink = /^https:\/\/meet\.google\.com\/[a-z0-9-]+\/?$/i.test(content.trim());
  if (!isGoogleMeetLink) return <>{content}</>;

  return (
    <a
      href={content}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-semibold underline underline-offset-2 ${mine ? 'text-white' : 'text-[var(--gb-cyan)]'}`}
    >
      {content}
    </a>
  );
}

function ScheduleCard({ schedule, latest, onEdit, onCancel, onRetry, onLatest, onAccept, onReject, onCounterProposal, actionBusy }: {
  schedule: ScheduleEvent; latest: boolean; onEdit: () => void; onCancel: () => void;
  onRetry: () => Promise<void>; onLatest: () => void; onAccept: () => Promise<void>; onReject: () => Promise<void>;
  onCounterProposal: (edit: boolean) => void; actionBusy: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [retryingMeet, setRetryingMeet] = useState(false);
  const [now, setNow] = useState(Date.now);

  // Keep the one-second clock local to this card. A timer tick must not
  // rerender the full messages screen and retrigger backend-facing hooks.
  useEffect(() => {
    const syncNow = () => setNow(Date.now());
    syncNow();
    if (schedule.status !== 0 || new Date(schedule.scheduledAtUtc).getTime() <= Date.now()) return;

    const intervalId = window.setInterval(syncNow, 1000);
    document.addEventListener('visibilitychange', syncNow);
    window.addEventListener('focus', syncNow);
    window.addEventListener('pageshow', syncNow);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncNow);
      window.removeEventListener('focus', syncNow);
      window.removeEventListener('pageshow', syncNow);
    };
  }, [schedule.scheduleId, schedule.scheduledAtUtc, schedule.status]);

  const cancelled = schedule.status === 1 || schedule.status === 3 || schedule.eventType === 2;
  const startLocalHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date(schedule.scheduledAtUtc)));
  const started = now >= new Date(schedule.scheduledAtUtc).getTime();
  const canCancel = latest && !started && schedule.canCancel;
  const canEdit = latest && !started && schedule.canEdit;
  const canRespond = latest && !started;
  const canEditCounter = latest && !started && schedule.canEditCounterProposal &&
    !!schedule.counterProposalEditExpiresAtUtc && now < new Date(schedule.counterProposalEditExpiresAtUtc).getTime();
  const confirmed = schedule.agreementStatus === 0 || schedule.agreementStatus === 6;
  const reschedulePending = schedule.agreementStatus === 5;
  const hasConfirmedTime = confirmed || reschedulePending;
  const remainingRescheduleRequests = schedule.remainingRescheduleRequests ??
    Math.max(0, 3 - (schedule.rescheduleRequestCount ?? 0));
  const meetingReady = schedule.meeting?.status === 2 && !!schedule.meeting.joinUri;
  const eventLabel = ['Created','Edited','Cancelled','Accepted','Rejected','Counter proposed'][schedule.eventType] || 'Schedule updated';
  const agreementLabel = cancelled
    ? 'Cancelled'
    : [
        'Confirmed',
        'Awaiting freelancer response',
        'Freelancer rejected — choose a new time',
        'Awaiting client response',
        'Client rejected',
        'Schedule change awaiting client response',
        'Schedule change rejected — original date remains confirmed',
      ][schedule.agreementStatus] || 'Schedule updated';
  return (
    <div className={`w-[min(420px,75vw)] rounded-2xl border p-4 shadow-sm ${cancelled ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--gb-cyan)]/30 bg-card'}`}>
      <div className="flex justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] flex items-center justify-center shrink-0"><CalendarDays size={19} /></div>
          <div className="min-w-0"><p className="font-bold text-sm truncate">{schedule.title}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{eventLabel} by {schedule.actorName}</p></div>
        </div>
        {!latest && <button onClick={onLatest} className="text-[10px] text-[var(--gb-cyan)] border-none bg-transparent cursor-pointer">{t('schedule.superseded')}</button>}
      </div>
      <div className="mt-3 rounded-xl bg-muted/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{reschedulePending ? 'Currently confirmed' : 'Meeting time'}</p>
        <p className="text-xs font-semibold">{vietnamDate(schedule.scheduledAtUtc)}</p>
        {reschedulePending && schedule.proposedScheduledAtUtc && <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Requested new date</p><p className="mt-1 text-xs font-bold text-amber-700">{vietnamDate(schedule.proposedScheduledAtUtc)}</p></div>}
        {latest && !cancelled && hasConfirmedTime && (!started || !meetingReady) && <p className="text-xs text-[var(--gb-cyan)] font-bold mt-1" aria-live="off">{countdown(schedule.scheduledAtUtc, now)}</p>}
        {latest && !cancelled && hasConfirmedTime && started && meetingReady && <a href={schedule.meeting!.joinUri!} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white no-underline transition-colors hover:bg-emerald-700"><Video size={15} />{t('schedule.meetingJoin')}<ExternalLink size={12} /></a>}
        <p className="text-[10px] text-muted-foreground mt-1">Cancellation cutoff: {vietnamDate(schedule.cutoffUtc)}</p>
        {startLocalHour < 2 && <p className="text-[10px] text-amber-600 mt-2 font-semibold">Short cancellation window: this event begins close to Vietnam midnight.</p>}
      </div>
      {latest && <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-black border ${cancelled ? 'bg-red-600 text-white border-red-500' : confirmed ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-amber-500 text-slate-950 border-amber-400'}`}>{agreementLabel}</div>}
      {latest && (schedule.agreementStatus === 3 || reschedulePending) && schedule.counterProposalEditExpiresAtUtc && <p className="mt-2 text-[10px] text-muted-foreground">Freelancer may edit this request until {vietnamDate(schedule.counterProposalEditExpiresAtUtc)}.</p>}
      {latest && !cancelled && hasConfirmedTime && schedule.meeting?.status === 1 && <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700"><Loader2 size={14} className="animate-spin" />{t('schedule.meetingPending')}</div>}
      {latest && !cancelled && hasConfirmedTime && meetingReady && !started && <a href={schedule.meeting!.joinUri!} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 no-underline transition-colors hover:bg-emerald-500/20"><Video size={15} />{t('schedule.meetingJoin')}<ExternalLink size={12} /></a>}
      {latest && !cancelled && schedule.meeting?.status === 3 && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600"><span className="flex items-center gap-2"><AlertCircle size={14} />{t('schedule.meetingFailed')}</span>{schedule.meeting.canRetry && <button type="button" disabled={retryingMeet} onClick={async () => { setRetryingMeet(true); try { await onRetry(); } finally { setRetryingMeet(false); } }} className="rounded-lg border-none bg-red-600 px-3 py-1.5 text-xs font-bold text-white cursor-pointer disabled:opacity-50">{retryingMeet ? t('schedule.meetingPending') : t('schedule.meetingRetry')}</button>}</div>}
      {schedule.details && <><button onClick={() => setExpanded(x => !x)} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground border-none bg-transparent cursor-pointer">{expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Details</button>{expanded && <p className="text-xs whitespace-pre-wrap mt-2">{schedule.details}</p>}</>}
      {cancelled && schedule.cancellationReason && <p className="mt-3 text-xs text-red-600"><strong>Reason:</strong> {schedule.cancellationReason}</p>}
      {latest && !cancelled && <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {canEdit && <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-xs bg-muted border-none cursor-pointer flex gap-1 items-center"><Pencil size={12}/> {t('schedule.edit')}</button>}
        {canEditCounter && <button onClick={() => onCounterProposal(true)} className="px-3 py-1.5 rounded-lg text-xs bg-muted border-none cursor-pointer flex gap-1 items-center"><Pencil size={12}/> Edit proposed time</button>}
        {schedule.canProposeTime && <button onClick={() => onCounterProposal(false)} className="px-3 py-1.5 rounded-lg text-xs bg-[var(--gb-cyan)] text-white border-none cursor-pointer">{schedule.agreementStatus === 2 ? 'Choose new time' : `Request date change (${remainingRescheduleRequests} left)`}</button>}
        {canRespond && schedule.canAccept && <button disabled={actionBusy} onClick={onAccept} className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white border-none cursor-pointer disabled:opacity-50">Accept</button>}
        {canRespond && schedule.canReject && <button disabled={actionBusy} onClick={onReject} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-600 border-none cursor-pointer disabled:opacity-50">Reject</button>}
        {canCancel && <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-600 border-none cursor-pointer">{t('schedule.cancel')}</button>}
      </div>}
    </div>
  );
}

export default function MessagesScreen() {
  const { t } = useTranslation();
  const {
    user,
    isClient,
    loading,
    navigate,
    conversationsState,
    activeConvId,
    activeConv,
    isActiveWorkspaceDisputed,
    activeWorkspaceDisputeId,
    activeMessages,
    dealStatus,
    showInfo,
    setShowInfo,
    showDealPrice,
    setShowDealPrice,
    dealMilestones,
    updateDealMilestones,
    dealAdvancedIndexes,
    setDealAdvancedIndexes,
    dealMilestoneErrors,
    dealMilestonesLoading,
    dealMilestonesSaving,
    dealMilestoneTotal,
    dealOverallDuration,
    handleSaveDealMilestones,
    messageInput,
    setMessageInput,
    chatAttachments,
    handleSelectChatFiles,
    handleRemoveChatFile,
    isFavorited,
    setIsFavorited,
    showNegModal,
    setShowNegModal,
    negStatus,
    chatEndRef,
    chatHistoryRef,
    handleSelectConv,
    handleSendMessage,
    handleProposeDeal,
    handleAcceptDeal,
    acceptFeeDialog,
    isAcceptingDeal,
    confirmAcceptDeal,
    closeAcceptFeeDialog,
    openWalletTopUp,
    handleDeclineDeal,
    handleOpenAcceptedContract,
    handleSendNegotiationRequest,
    handleConfirmMoveToNegotiation,
    isMe,
    formatTime,
    showScheduleModal, setShowScheduleModal, scheduleMode, editingSchedule, scheduleTitle, setScheduleTitle,
    scheduleDetails, setScheduleDetails, scheduleTime, setScheduleTime, scheduleReason, setScheduleReason,
    scheduleError, scheduleSaving, scheduleActionId, openCreateSchedule, openEditSchedule, openCancelSchedule,
    openCounterProposal, respondToSchedule, retryGoogleMeet, submitSchedule,
    scheduleConflict, confirmScheduleRetry, midnightConfirmed, setMidnightConfirmed,
    scheduleAddGoogleMeet, setScheduleAddGoogleMeet, scheduleSendEmail, setScheduleSendEmail,
    googleMeetStatus, googleMeetStatusLoading, googleMeetConnecting, connectGoogleMeet,
    creatingGoogleMeet, handleCreateGoogleMeetRoom,
    highlightedMessageId, anchorNotice, setAnchorNotice,
    hasOngoingSchedule, checkingOngoingSchedule,
  } = useMessages();
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [unavailableReportId, setUnavailableReportId] = useState<string | null>(null);
  const {
    reports: contractReports,
    isLoading: isLoadingReports,
    loadReports,
    selectedReport,
    loadReportDetail,
    isLoadingDetail: isLoadingReportDetail,
    respondToReport,
    isRespondingReport,
    confirmResolution,
    isConfirmingReport,
    escalateToDispute,
    isEscalatingReport,
    clearSelectedReport,
  } = useReportContract();

  const openReportDetail = async (contractId: string, reportId: string) => {
    setViewReportId(reportId);
    setUnavailableReportId(null);
    void loadReports(contractId);
    const response = await loadReportDetail(contractId, reportId);
    if (!response.success || !response.data) {
      setUnavailableReportId(reportId);
      setViewReportId(null);
    }
  };

  const closeReportDetail = () => {
    setViewReportId(null);
    clearSelectedReport();
  };

  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    if (activeConv?.roomId) return activeConv.roomId;
    return MESSAGE_ROOMS[0].id;
  });

  const [workspaceFilterTab, setWorkspaceFilterTab] = useState<'active' | 'completed' | 'disputed' | 'all'>('active');

  useEffect(() => {
    if (activeConv?.roomId && activeConv.roomId !== activeRoomId) {
      setActiveRoomId(activeConv.roomId);
    }
  }, [activeConv?.id, activeConv?.roomId]);

  const handleSelectRoomTab = (roomId: string) => {
    setActiveRoomId(roomId);
    const roomConvos = conversationsState.filter(c => isRoomConvo(c, roomId));
    if (roomConvos.length > 0 && activeConv?.roomId !== roomId) {
      handleSelectConv(roomConvos[0].id);
    }
  };

  const activeConvProfilePath = getProfilePath(activeConv?.participantId ?? null, activeConv?.participantRole);

  const canNegotiateActiveJob = activeConv?.canNegotiate !== false;
  const jobDetailPath = activeConv
    ? isClient
      ? `/jobs/my-jobs/${activeConv.job.id}`
      : `/jobs/${activeConv.job.id}`
    : '/jobs/browse';
  const canProposeDeal = activeConv?.roomType === 'negotiation' && isClient && dealStatus !== 'agreed' && canNegotiateActiveJob;
  const isNegotiationConversation = activeConv?.roomType === 'invited' || activeConv?.roomType === 'negotiation';
  const sharedAttachments = Array.from(new Map(
    activeMessages
      .flatMap(message => (message.attachments || []).map(attachment => ({ ...attachment, senderName: message.senderName })))
      .map(attachment => [attachment.messageAttachmentId, attachment])
  ).values());

  if (loading) {
    return (
      <AppLayout fullWidth>
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <p className="text-muted-foreground animate-pulse font-semibold">{t('messages.loadingConvos')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullWidth>
      <div className="messages-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* 3-Column Layout */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">

          {/* ── Column 1: Rooms & Conversations List ─────────────────────── */}
          <section className="messages-conversation-list w-96 lg:w-[390px] shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
            {/* ── Document Folder Index Tabs ── */}
            <div className="pt-2.5 px-2 bg-muted/30 flex items-end gap-1 relative shrink-0">
              {/* Bottom 1px divider line for inactive tabs only */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border pointer-events-none z-0" />

              {MESSAGE_ROOMS.map(room => {
                const convos = conversationsState.filter(c => isRoomConvo(c, room.id));
                const roomUnread = convos.reduce((s, c) => s + c.unreadCount, 0);
                const isSelected = activeRoomId === room.id;
                const RoomIcon = room.type === 'invited'
                  ? Briefcase
                  : room.type === 'workspace'
                    ? CheckCircle
                    : Layers;

                const shortLabel = room.type === 'invited'
                  ? t('messages.tabInvited', { defaultValue: 'Invited' })
                  : room.type === 'negotiation'
                    ? t('messages.tabNegotiation', { defaultValue: 'Negotiation' })
                    : t('messages.tabWorkspace', { defaultValue: 'Workspace' });

                const activeThemeClass = room.type === 'invited'
                  ? 'border-t-teal-500 text-teal-600 dark:text-teal-400'
                  : room.type === 'workspace'
                    ? 'border-t-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-t-brand text-brand';

                return (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoomTab(room.id)}
                    className={`flex-1 relative flex flex-col items-center justify-center rounded-t-xl transition-all duration-150 cursor-pointer text-center select-none ${
                      isSelected
                        ? `bg-card font-black border-t-2 border-x border-b-0 border-border ${activeThemeClass} -mb-[1px] z-20 pt-2 pb-2.5 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]`
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-t border-x border-transparent rounded-t-lg pt-1.5 pb-1.5 px-1 mb-0 z-10 font-bold'
                    }`}
                    title={t(ROOM_COPY[room.type].label)}
                  >
                    <div className="flex items-center justify-center gap-1 w-full">
                      <RoomIcon size={13} className={isSelected ? '' : 'opacity-65'} />
                      {roomUnread > 0 && (
                        <span className="min-w-[15px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-brand text-white rounded-full leading-none shrink-0">
                          {roomUnread}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] tracking-tight leading-tight mt-1 truncate max-w-full font-extrabold uppercase">
                      {shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Document Folder Body Container ── */}
            <div className="flex-1 overflow-y-auto messages-custom-scroll bg-card relative z-10">
              {(() => {
                const currentRoom = MESSAGE_ROOMS.find(r => r.id === activeRoomId) || MESSAGE_ROOMS[0];
                const CurrentRoomIcon = currentRoom.type === 'invited'
                  ? Briefcase
                  : currentRoom.type === 'workspace'
                    ? CheckCircle
                    : Layers;

                const allRoomConvos = conversationsState.filter(c => isRoomConvo(c, currentRoom.id));
                const allWorkspaceConvos = conversationsState.filter(c => isRoomConvo(c, 'room_workspace'));

                const activeCount = allWorkspaceConvos.filter(
                  c => c.contractStatus !== ContractStatus.Completed &&
                    c.contractStatus !== ContractStatus.Disputed &&
                    c.contractStatus !== ContractStatus.Cancelled
                ).length;
                const completedCount = allWorkspaceConvos.filter(
                  c => c.contractStatus === ContractStatus.Completed
                ).length;
                const disputedCount = allWorkspaceConvos.filter(
                  c => c.contractStatus === ContractStatus.Disputed
                ).length;
                const allCount = allWorkspaceConvos.length;

                const convos = currentRoom.type === 'workspace'
                  ? allWorkspaceConvos.filter(c => {
                      if (workspaceFilterTab === 'completed') return c.contractStatus === ContractStatus.Completed;
                      if (workspaceFilterTab === 'disputed') return c.contractStatus === ContractStatus.Disputed;
                      if (workspaceFilterTab === 'all') return true;
                      return c.contractStatus !== ContractStatus.Completed &&
                        c.contractStatus !== ContractStatus.Disputed &&
                        c.contractStatus !== ContractStatus.Cancelled;
                    })
                  : allRoomConvos;

                return (
                  <div>
                    {/* Active room description or Workspace 4-button filter */}
                    {currentRoom.type === 'workspace' ? (
                      <div className="p-2 bg-muted/20 border-b border-border/40 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setWorkspaceFilterTab('active')}
                          className={`flex-1 min-w-0 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                            workspaceFilterTab === 'active'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted/80 border border-transparent'
                          }`}
                          title={t('workspace.tabActive', { defaultValue: 'Đang làm' })}
                        >
                          <CheckCircle size={11} className="shrink-0" />
                          <span className="truncate">{t('workspace.tabActive', { defaultValue: 'Đang làm' })}</span>
                          {activeCount > 0 && (
                            <span className="min-w-[14px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-emerald-500 text-white rounded-full leading-none shrink-0">
                              {activeCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setWorkspaceFilterTab('completed')}
                          className={`flex-1 min-w-0 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                            workspaceFilterTab === 'completed'
                              ? 'bg-brand/15 border border-brand/30 text-brand shadow-2xs'
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted/80 border border-transparent'
                          }`}
                          title={t('workspace.tabCompleted', { defaultValue: 'Hoàn thành' })}
                        >
                          <Award size={11} className="shrink-0" />
                          <span className="truncate">{t('workspace.tabCompleted', { defaultValue: 'Hoàn thành' })}</span>
                          {completedCount > 0 && (
                            <span className="min-w-[14px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-brand text-white rounded-full leading-none shrink-0">
                              {completedCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setWorkspaceFilterTab('disputed')}
                          className={`flex-1 min-w-0 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                            workspaceFilterTab === 'disputed'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs'
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted/80 border border-transparent'
                          }`}
                          title={t('workspace.tabDisputed', { defaultValue: 'Tranh chấp' })}
                        >
                          <LockKeyhole size={11} className="shrink-0" />
                          <span className="truncate">{t('workspace.tabDisputed', { defaultValue: 'Tranh chấp' })}</span>
                          {disputedCount > 0 && (
                            <span className="min-w-[14px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-amber-500 text-white rounded-full leading-none shrink-0">
                              {disputedCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setWorkspaceFilterTab('all')}
                          className={`flex-1 min-w-0 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer select-none ${
                            workspaceFilterTab === 'all'
                              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs'
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted/80 border border-transparent'
                          }`}
                          title={t('workspace.tabAll', { defaultValue: 'Tất cả' })}
                        >
                          <Layers size={11} className="shrink-0" />
                          <span className="truncate">{t('workspace.tabAll', { defaultValue: 'Tất cả' })}</span>
                          {allCount > 0 && (
                            <span className="min-w-[14px] h-3.5 px-1 flex items-center justify-center text-[9px] font-black bg-blue-500 text-white rounded-full leading-none shrink-0">
                              {allCount}
                            </span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                            currentRoom.type === 'invited'
                              ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                              : 'bg-brand/15 text-brand'
                          }`}>
                            <CurrentRoomIcon size={13} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-foreground block leading-tight tracking-wide">
                              {t(ROOM_COPY[currentRoom.type].label)}
                            </span>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {t(ROOM_COPY[currentRoom.type].description)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                          {convos.length}
                        </span>
                      </div>
                    )}

                    {/* Conversations */}
                    <div className="p-2 space-y-1">
                      {convos.map(conv => (
                        <div
                          key={conv.id}
                          id={`conv-item-${conv.id}`}
                          className={`msg-conv-item ${conv.id === activeConvId ? 'active' : ''}`}
                          onClick={() => handleSelectConv(conv.id)}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={conv.participantAvatar}
                              alt={conv.participantName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            {conv.participantOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-semibold truncate text-foreground">
                                {conv.participantName}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">
                                {formatTime(conv.lastMessageAt)}
                              </span>
                            </div>

                            {/* Status Tag Badge */}
                            {conv.contractStatus === ContractStatus.Disputed ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider">
                                <LockKeyhole size={10} /> {t('workspace.disputedBadge', { defaultValue: 'Tranh chấp' })}
                              </span>
                            ) : conv.contractStatus === ContractStatus.Cancelled ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[9px] font-black uppercase tracking-wider">
                                <Lock size={10} /> {t('workspace.disputeClosedBadge', { defaultValue: 'Đã đóng tranh chấp' })}
                              </span>
                            ) : conv.contractStatus === ContractStatus.Completed ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-brand/15 border border-brand/30 text-brand text-[9px] font-black uppercase tracking-wider">
                                <Award size={10} /> {t('workspace.completedBadge', { defaultValue: 'Hoàn thành' })}
                              </span>
                            ) : conv.roomId === 'room_workspace' ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                                <CheckCircle size={10} /> {t('workspace.activeBadge', { defaultValue: 'Đang làm' })}
                              </span>
                            ) : null}

                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.job.title}</p>
                            <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      ))}
                      {convos.length === 0 && (
                        <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground my-4">
                          <CurrentRoomIcon size={28} className="mb-2 opacity-30 text-muted-foreground" />
                          <p className="text-xs font-medium">{t('messages.emptyRoom')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom prominent Go to Workspace button */}
            <div
              className="p-4 bg-muted/20 border-t border-border mt-auto"
              style={{ display: activeConv?.roomType === 'workspace' && activeConv.contractId ? undefined : 'none' }}
            >
              <button
                onClick={() => {
                  if (activeConv?.contractId) navigate(`/workspace/${activeConv.contractId}`);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer border-none"
              >
                <span>{t('messages.goToWorkspace')}</span>
                <span>-&gt;</span>
              </button>
            </div>
          </section>

          {/* ── Column 2: Chat Area (Center Pane) ────────────────────────── */}
          <section className="messages-chat-pane min-h-0 min-w-0 flex-1 flex flex-col bg-muted/10 overflow-hidden relative">
            {activeConv ? (
              <>
                {/* Header info / Context of Job */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-card shadow-sm z-10 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <UserProfileLink userId={activeConv.participantId} role={activeConv.participantRole} className="relative">
                  <img
                    src={activeConv.participantAvatar}
                    alt={activeConv.participantName}
                    className="w-11 h-11 rounded-full object-cover border border-border shadow-sm"
                  />
                  {activeConv.participantOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full shadow-sm" />
                  )}
                </UserProfileLink>
                <div className="flex flex-col">
                  <UserProfileLink userId={activeConv.participantId} role={activeConv.participantRole} className="text-sm font-extrabold text-foreground tracking-tight leading-none" tooltip={activeConv.participantName}>
                    <span style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif" }}>{activeConv.participantName}</span>
                  </UserProfileLink>
                  
                  {/* Premium Job Pill */}
                  <div 
                    onClick={() => navigate(jobDetailPath)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--gb-cyan)]/5 border border-[var(--gb-cyan)]/15 text-[10px] font-bold text-[var(--gb-cyan)] mt-1.5 max-w-[280px] md:max-w-md truncate cursor-pointer hover:bg-[var(--gb-cyan)]/10 active:scale-95 transition-all shadow-[0_1px_2px_rgba(0,119,255,0.02)]"
                    title={t('messages.clickViewJobPost')}
                  >
                    <Briefcase size={11} className="flex-shrink-0" />
                    <span className="truncate font-bold tracking-wide uppercase">{activeConv.job.title}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--gb-cyan)]/40 mx-0.5 flex-shrink-0" />
                    <span className="font-bold flex-shrink-0">{activeConv.job.budget}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleCreateGoogleMeetRoom()}
                  disabled={creatingGoogleMeet || isActiveWorkspaceDisputed}
                  className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  title={creatingGoogleMeet ? t('messages.creatingGoogleMeet') : t('messages.createGoogleMeet')}
                  aria-label={creatingGoogleMeet ? t('messages.creatingGoogleMeet') : t('messages.createGoogleMeet')}
                >
                  {creatingGoogleMeet ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
                </button>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    showInfo
                      ? 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={t('messages.toggleProjectInfo')}
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Agreed deal banner: both parties can inspect the contract workflow. */}
            {dealStatus === 'agreed' && isNegotiationConversation && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{t('messages.contractFlowReady')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {isClient ? t('messages.contractFlowClientDesc') : t('messages.contractFlowFreelancerDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAcceptedContract}
                  className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>{t('messages.openContract')}</span>
                  <span>-&gt;</span>
                </button>
              </div>
            )}

            {/* Negotiation accepted banner → conversation already moved */}
            {negStatus === 'accepted' && isNegotiationConversation && (
              <div className="bg-[var(--gb-cyan)]/10 border-b border-[var(--gb-cyan)]/20 px-6 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <ArrowRightLeft size={14} className="text-[var(--gb-cyan)] flex-shrink-0" />
                <p
                  className="text-xs font-semibold text-[var(--gb-cyan)]"
                  dangerouslySetInnerHTML={{ __html: t('messages.chatMovedToNegotiation') }}
                />
              </div>
            )}

            {/* Message History */}
            <div ref={chatHistoryRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 messages-custom-scroll">
              {anchorNotice && <button onClick={() => setAnchorNotice('')} className="mx-auto text-xs bg-amber-500/10 text-amber-700 px-3 py-2 rounded-lg border-none">{anchorNotice} ×</button>}
              {!canNegotiateActiveJob && isNegotiationConversation && (
                <div className="mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-xs font-semibold text-amber-700">
                  This job post is no longer open for negotiation. Final offers and negotiation responses are disabled.
                </div>
              )}
              <div className="flex justify-center">
                <span className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {activeConv.roomType === 'invited'
                    ? t('messages.invitedJobChat')
                    : activeConv.roomType === 'workspace'
                      ? t('messages.workspaceChat')
                      : activeConv.roomType === 'dispute'
                        ? t('messages.disputeChat')
                        : t('messages.negotiationChat')}
                </span>
              </div>

              {activeMessages.map((msg, idx) => {
                const mine = isMe(msg.senderId);
                const isSystem = msg.type === 'system' || msg.senderId === 'system';
                const reportEvent = parseReportSystemMessageMetadata(msg.metadata);
                const latestScheduleMessage = msg.schedule ? activeMessages.filter(m => m.schedule?.scheduleId === msg.schedule?.scheduleId).sort((a,b) => (b.schedule?.eventSequence || 0) - (a.schedule?.eventSequence || 0))[0] : undefined;

                // Older deployments persisted one message per schedule state.
                // Render only the latest one so every schedule has one live card.
                if (msg.schedule && latestScheduleMessage?.id !== msg.id) return null;

                // ── System message (centered) ─────────────────────────────
                if (isSystem) {
                  if (reportEvent) {
                    const titleKey = reportEvent.eventType === 'created'
                      ? 'workspace.reportSystemCreatedTitle'
                      : reportEvent.eventType === 'resolved'
                        ? 'workspace.reportSystemResolvedTitle'
                        : 'workspace.reportSystemUpdatedTitle';
                    const actionKeys: Record<number, string> = {
                      [ContractReportResolutionAction.AcceptIssue]: 'workspace.reportActionAcceptIssue',
                      [ContractReportResolutionAction.ProvideExplanation]: 'workspace.reportActionProvideExplanation',
                      [ContractReportResolutionAction.ProposeResolution]: 'workspace.reportActionProposeResolution',
                      [ContractReportResolutionAction.RejectIssue]: 'workspace.reportActionRejectIssue',
                    };
                    const statusKeys: Record<number, string> = {
                      [ContractReportStatus.Pending]: 'workspace.reportStatusPending',
                      [ContractReportStatus.WaitingReporterConfirmation]: 'workspace.reportStatusWaitingConfirmation',
                      [ContractReportStatus.Resolved]: 'workspace.reportStatusResolved',
                      [ContractReportStatus.Escalated]: 'workspace.reportStatusEscalated',
                    };
                    const issueKeys = [
                      'workspace.reportIssueTypePaymentIssue',
                      'workspace.reportIssueTypeMilestoneIssue',
                      'workspace.reportIssueTypeDelay',
                      'workspace.reportIssueTypePoorQuality',
                      'workspace.reportIssueTypeCommunicationProblem',
                      'workspace.reportIssueTypeScopeChange',
                      'workspace.reportIssueTypeOther',
                    ];
                    const detail = reportEvent.proposedResolution || reportEvent.explanation || reportEvent.rejectReason;
                    const actor = reportEvent.actorName || reportEvent.actorRole || t('workspace.reportParticipant');
                    const summary = reportEvent.eventType === 'created'
                      ? t('workspace.reportSystemCreatedSummary', { actor })
                      : reportEvent.eventType === 'resolved'
                        ? t('workspace.reportSystemResolvedSummary')
                        : reportEvent.resolutionAction === ContractReportResolutionAction.AcceptIssue
                          ? t('workspace.reportSystemAcceptedSummary', { actor })
                          : reportEvent.resolutionAction === ContractReportResolutionAction.ProvideExplanation
                            ? t('workspace.reportSystemExplainedSummary', { actor })
                            : reportEvent.resolutionAction === ContractReportResolutionAction.ProposeResolution
                              ? t('workspace.reportSystemProposedSummary', { actor })
                              : reportEvent.resolutionAction === ContractReportResolutionAction.RejectIssue
                                ? t('workspace.reportSystemRejectedSummary', { actor })
                                : t('workspace.reportSystemUpdatedSummary', { actor });
                    const unavailable = unavailableReportId === reportEvent.reportId;
                    const selected = viewReportId === reportEvent.reportId;

                    return (
                      <div key={msg.id ?? idx} className="flex justify-center">
                        <div className={`w-[min(440px,80vw)] rounded-2xl border bg-card p-4 shadow-sm ${selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500/30'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {reportEvent.eventType === 'resolved'
                                ? <CheckCircle size={18} className="text-emerald-500" />
                                : <AlertCircle size={18} className="text-amber-500" />}
                              <p className="text-sm font-bold">{t(titleKey)}</p>
                            </div>
                            <span className={`rc-status rc-status-${reportEvent.status}`}>
                              {t(statusKeys[reportEvent.status] || 'workspace.reportStatusPending')}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{summary}</p>
                          {reportEvent.eventType === 'created' && (
                            <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3 text-xs">
                              <p><strong>{t('workspace.reportSystemReason')}:</strong> {t(issueKeys[reportEvent.issueType] || issueKeys[6])}</p>
                              <p><strong>{t('workspace.reportDesiredResolution')}:</strong> {reportEvent.desiredResolution}</p>
                              <p><strong>{t('workspace.reportDescription')}:</strong> {reportEvent.description}</p>
                            </div>
                          )}
                          {reportEvent.eventType === 'updated' && reportEvent.resolutionAction !== null && (
                            <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs">
                              <strong>{t('workspace.reportSystemAction')}:</strong>{' '}
                              {t(actionKeys[reportEvent.resolutionAction])}
                              {detail && <p className="mt-2"><strong>{t('workspace.reportSystemReason')}:</strong> {detail}</p>}
                            </div>
                          )}
                          {reportEvent.eventType === 'resolved' && (
                            <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700">
                              {t('workspace.reportSystemResolvedBody')}
                            </p>
                          )}
                          {unavailable ? (
                            <p className="mt-3 text-xs font-semibold text-red-500">{t('workspace.reportUnavailable')}</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void openReportDetail(reportEvent.contractId, reportEvent.reportId)}
                              disabled={isLoadingReportDetail && selected}
                              className="mt-3 rounded-lg border border-amber-500/30 bg-transparent px-3 py-2 text-xs font-bold text-amber-600 cursor-pointer hover:bg-amber-500/10 disabled:opacity-50"
                            >
                              {isLoadingReportDetail && selected ? t('common.loading') : t('workspace.reportView')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id ?? idx} className="flex justify-center">
                      <div className="bg-muted/80 border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground font-medium text-center max-w-md">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                const isLatestDealOffer =
                  msg.type === 'deal' &&
                  !!activeConv.lastOfferId &&
                  msg.negotiationOfferId === activeConv.lastOfferId;
                const dealBubbleStatus = isLatestDealOffer ? dealStatus : 'idle';

                return (
                  <div
                    key={msg.id ?? idx}
                    id={`message-${msg.id}`}
                    className={`flex items-end gap-3 max-w-[80%] ${mine ? 'self-end flex-row-reverse' : 'self-start'}`}
                    style={highlightedMessageId === msg.id ? { outline: '3px solid color-mix(in srgb, var(--gb-cyan) 45%, transparent)', borderRadius: 18, transition: 'outline 1s ease' } : undefined}
                  >
                    {!mine && (
                      <img
                        src={msg.senderAvatar || '/img/avatar-fallback.png'}
                        alt={msg.senderName || 'Message sender'}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex flex-col gap-1">

                      {/* ── File message ───────────────────────────────────── */}
                      {msg.type === 'schedule' && msg.schedule ? (
                        <ScheduleCard schedule={msg.schedule} latest={latestScheduleMessage?.id === msg.id}
                          onEdit={() => openEditSchedule(msg.schedule!)} onCancel={() => openCancelSchedule(msg.schedule!)}
                          onRetry={() => retryGoogleMeet(msg.schedule!)}
                          onAccept={() => respondToSchedule(msg.schedule!, 'accept')}
                          onReject={() => respondToSchedule(msg.schedule!, 'reject')}
                          onCounterProposal={(edit) => openCounterProposal(msg.schedule!, edit)}
                          actionBusy={scheduleActionId === msg.schedule.scheduleId}
                          onLatest={() => document.getElementById(`message-${latestScheduleMessage?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
                      ) : msg.type === 'file' ? (
                        <div className="flex flex-col gap-1.5 max-w-sm">
                          {msg.content && (
                            <p className="text-sm">{msg.content}</p>
                          )}
                          {(msg.attachments && msg.attachments.length > 0
                            ? msg.attachments
                            : msg.fileUrl || msg.fileName
                              ? [{ messageAttachmentId: msg.id, fileName: msg.fileName ?? '', fileUrl: msg.fileUrl ?? '', mimeType: '', fileSizeBytes: 0, createdAt: msg.createdAt ?? '' }]
                              : []
                          ).map(attachment => {
                            const isImage = attachment.mimeType.startsWith('image/') ||
                              getFileCategory(attachment.fileName) === 'image';

                            if (isImage && attachment.fileUrl) {
                              return (
                                <div key={attachment.messageAttachmentId} className="relative group max-w-[240px]">
                                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={attachment.fileUrl}
                                      alt={attachment.fileName}
                                      className="max-w-[240px] max-h-[240px] w-auto h-auto rounded-xl border border-border object-cover cursor-pointer"
                                    />
                                  </a>
                                  <a
                                    href={toForceDownloadUrl(attachment.fileUrl)}
                                    onClick={e => e.stopPropagation()}
                                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Download"
                                  >
                                    <DownloadIcon size={13} />
                                  </a>
                                </div>
                              );
                            }

                            return (
                              <FileTypeBadge
                                key={attachment.messageAttachmentId}
                                fileName={attachment.fileName}
                                fileUrl={attachment.fileUrl || null}
                                fileSize={attachment.fileSizeBytes}
                              />
                            );
                          })}
                        </div>

                      ) : msg.type === 'deal' ? (
                        <NegotiationDealCard
                          offerId={msg.negotiationOfferId}
                          amount={Number(msg.content.replace(/,/g, '')) || 0}
                          detail={msg.offerDetail}
                          status={dealBubbleStatus}
                          isLatestOffer={isLatestDealOffer}
                          canRespond={!mine}
                          canNegotiate={canNegotiateActiveJob}
                          actionBusy={isAcceptingDeal}
                          onAccept={handleAcceptDeal}
                          onDecline={handleDeclineDeal}
                        />

                      ) : (
                        /* ── Text message ───────────────────────────────────── */
                        <div
                          className={`p-4 rounded-2xl shadow-sm border ${
                            msg.sendStatus === 'failed'
                              ? 'bg-red-500/10 text-red-600 border-red-500/30 rounded-br-none'
                              : mine
                              ? 'bg-[var(--gb-cyan)] text-white border-transparent rounded-br-none'
                              : 'bg-card text-foreground border-border rounded-bl-none'
                          } ${msg.sendStatus === 'pending' ? 'opacity-80' : ''}`}
                          title={msg.sendStatus === 'failed' ? msg.sendError : undefined}
                        >
                          <p className="text-sm"><MessageContent content={msg.content} mine={mine} /></p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-muted-foreground">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {mine && msg.sendStatus === 'pending' && (
                          <span title="Sending" className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock3 size={11} />
                          </span>
                        )}
                        {mine && msg.sendStatus === 'failed' && (
                          <span
                            title={msg.sendError || t('messages.msgNotSaved')}
                            className="text-[10px] text-red-600 font-semibold flex items-center gap-1"
                          >
                            <AlertCircle size={11} />
                            <span>{t('messages.failedToSend')}</span>
                          </span>
                        )}
                        {mine && (!msg.sendStatus || msg.sendStatus === 'sent') && (
                          <span className="text-[12px] text-[var(--gb-cyan)] font-bold">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {isActiveWorkspaceDisputed ? (
              <div className="shrink-0 border-t border-amber-500/20 bg-amber-500/10 p-4">
                <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 text-amber-700">
                  <ShieldAlert size={20} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm">{t('workspace.disputeLockedTitle')}</strong>
                    <p className="text-xs">{t('workspace.disputeLockedDescription')}</p>
                  </div>
                  {activeWorkspaceDisputeId && activeConv.contractId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/contracts/${activeConv.contractId}/disputes/${activeWorkspaceDisputeId}`)}
                      className="shrink-0 rounded-full border-none bg-amber-600 px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-amber-700"
                    >
                      {t('workspace.openDispute')}
                    </button>
                  )}
                </div>
              </div>
            ) : activeConv?.status === ConversationStatus.Closed ? (
              <div className="shrink-0 border-t border-border bg-muted p-4">
                <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 text-muted-foreground">
                  <Lock size={20} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm">{t('workspace.conversationClosedTitle')}</strong>
                    <p className="text-xs">{t('workspace.conversationClosedDescription')}</p>
                  </div>
                </div>
              </div>
            ) : (
            <div className="shrink-0 p-4 bg-card border-t border-border">
              <div className="flex flex-col border border-border rounded-2xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">

                {/* Deal Price Popup */}
                {showDealPrice && canProposeDeal && (
                  <FinalOfferEditor
                    milestones={dealMilestones}
                    milestoneTotal={dealMilestoneTotal}
                    overallDuration={dealOverallDuration}
                    advancedIndexes={dealAdvancedIndexes}
                    errors={dealMilestoneErrors}
                    loading={dealMilestonesLoading}
                    saving={dealMilestonesSaving}
                    onMilestonesChange={updateDealMilestones}
                    onAdvancedIndexesChange={setDealAdvancedIndexes}
                    onSaveDraft={() => void handleSaveDealMilestones()}
                    onSubmit={() => void handleProposeDeal()}
                    onClose={() => setShowDealPrice(false)}
                  />
                )}

                <input
                  ref={chatFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleSelectChatFiles(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />

                {chatAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                    {chatAttachments.map((file, index) => (
                      <span
                        key={`${file.name}-${index}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted border border-border text-[10px] font-semibold text-foreground max-w-[180px]"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChatFile(index)}
                          className="text-muted-foreground hover:text-rose-500 cursor-pointer flex-shrink-0 border-none bg-transparent"
                          title={t('common.remove', { defaultValue: 'Remove' })}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <textarea
                  id="msg-input"
                  className="w-full bg-transparent border-none focus:outline-none p-4 resize-none min-h-[52px] text-sm focus:ring-0"
                  placeholder={t('messages.typeMessage')}
                  rows={1}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />

                <div className="flex justify-between items-center px-4 pb-3">
                  <div className="flex items-center gap-2">
                    {/* Attach File */}
                    <button
                      onClick={() => chatFileInputRef.current?.click()}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer border-none bg-transparent"
                      title={t('messages.attachFile')}
                    >
                      <Paperclip size={16} />
                    </button>

                    {isClient && <button onClick={() => openCreateSchedule(false)} disabled={hasOngoingSchedule || checkingOngoingSchedule}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all border-none bg-transparent ${hasOngoingSchedule || checkingOngoingSchedule ? 'text-gray-400 bg-gray-200/40 cursor-not-allowed opacity-60' : 'text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted cursor-pointer'}`}
                      title={hasOngoingSchedule ? t('messages.ongoingScheduleExists') : checkingOngoingSchedule ? t('messages.checkingOngoingSchedule') : t('messages.createSchedule')}>
                      <CalendarPlus size={16} />
                    </button>}

                    {/* Emoji */}
                    <button
                      onClick={() => setMessageInput(prev => prev + '😊')}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer border-none bg-transparent"
                      title={t('messages.addEmoji')}
                    >
                      <Smile size={16} />
                    </button>

                    {/* ── Request Negotiation button – Client only when in Invited room ── */}
                    {isClient && activeConv.roomType === 'invited' && negStatus === 'idle' && canNegotiateActiveJob && (
                      <button
                        id="btn-request-negotiation"
                        onClick={handleSendNegotiationRequest}
                        title="Vào vòng đàm phán"
                        className="h-8 px-3 flex items-center gap-1.5 rounded-full text-xs font-bold text-teal-600 bg-teal-500/10 hover:bg-teal-500/20 transition-all cursor-pointer border-none"
                      >
                        <ArrowRightLeft size={14} />
                        <span>Vào vòng đàm phán</span>
                      </button>
                    )}

                    {/* Deal Price button – only in Negotiation rooms for clients */}
                    {canProposeDeal && (
                      <>
                        <div className="w-px h-5 bg-border mx-1" />
                        <button
                          id="btn-deal-price-trigger"
                          onClick={() => setShowDealPrice(!showDealPrice)}
                          title="Propose Deal Price"
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer border-none bg-transparent ${
                            showDealPrice
                              ? 'bg-[var(--gb-cyan)] text-white'
                              : 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)] hover:text-white'
                          }`}
                        >
                          <CreditCard size={15} />
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    id="btn-send-message"
                    onClick={handleSendMessage}
                    className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white h-9 px-5 rounded-full flex items-center gap-2 font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/20 cursor-pointer border-none"
                  >
                    <span>Send</span>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
            )}
            </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-base font-bold text-foreground">No active conversation</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Start a negotiation or view invited jobs to begin messaging with clients or freelancers.
                </p>
              </div>
            )}
          </section>

          {/* ── Column 3: Contextual Info (Right Pane – Collapsible) ─────── */}
          {activeConv && (
            <aside
              className={`flex flex-col bg-card border-l border-border transition-all duration-300 overflow-y-auto messages-custom-scroll ${showInfo ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
            >
            {/* Profile */}
            <div className="p-6 text-center border-b border-border">
              <UserProfileLink userId={activeConv.participantId} role={activeConv.participantRole} className="relative inline-block mb-4">
                <img
                  src={activeConv.participantAvatar}
                  alt={activeConv.participantName}
                  className="w-20 h-20 rounded-full mx-auto border-2 border-[var(--gb-cyan)] object-cover"
                />
                {activeConv.participantOnline && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
                )}
              </UserProfileLink>
              <h3 className="font-headline-md text-base font-bold"><UserProfileLink userId={activeConv.participantId} role={activeConv.participantRole}>{activeConv.participantName}</UserProfileLink></h3>
              <p className="text-xs text-muted-foreground mb-1">{activeConv.participantRole}</p>
              <p className="text-xs text-[var(--gb-cyan)] font-semibold mb-4">{activeConv.participantCompany}</p>

              <div className="flex justify-center gap-2">
                {activeConvProfilePath && (
                <button
                  onClick={() => navigate(activeConvProfilePath)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-secondary text-foreground hover:bg-muted uppercase tracking-wider transition-all cursor-pointer border-none"
                >
                  View Profile
                </button>
                )}
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider transition-all cursor-pointer border-none ${
                    isFavorited ? 'bg-[var(--gb-cyan)] text-white' : 'bg-secondary text-foreground hover:bg-muted'
                  }`}
                >
                  {isFavorited ? 'Favorited' : 'Favorite'}
                </button>
              </div>
            </div>

            {/* Job Info */}
            <div className="p-6 border-b border-border hover:bg-muted/5 transition-colors duration-200">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={16} className="text-[var(--gb-cyan)]" />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Job Details</h4>
              </div>
              
              <div className="relative group overflow-hidden bg-card border border-border/80 hover:border-[var(--gb-cyan)]/30 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,119,255,0.04)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--gb-cyan)]/5 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
                
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Job Title</span>
                    <p className="text-sm font-bold text-foreground leading-snug group-hover:text-[var(--gb-cyan)] transition-colors duration-200">{activeConv.job.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">Budget</span>
                      <p className="text-xs font-black text-[var(--gb-cyan)] tracking-wide">{activeConv.job.budget}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">Category</span>
                      <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 bg-muted text-foreground rounded-md uppercase tracking-wider mt-0.5">
                        {activeConv.job.category}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(jobDetailPath)}
                    className="w-full flex items-center justify-center gap-2 mt-2 py-3 text-xs font-extrabold text-white bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.97] transition-all cursor-pointer border-none"
                  >
                    <ExternalLink size={13} />
                    <span>View Full Job Post</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Shared Files */}
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared Files</h4>
                <button className="text-xs text-[var(--gb-cyan)] hover:underline font-semibold cursor-pointer border-none bg-transparent p-0">See all</button>
              </div>
              <div className="space-y-3">
                {sharedAttachments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No files have been shared in this conversation.</p>
                ) : sharedAttachments.map(attachment => (
                  <FileTypeBadge
                    key={attachment.messageAttachmentId}
                    fileName={attachment.fileName}
                    fileUrl={attachment.fileUrl || null}
                    fileSize={attachment.fileSizeBytes}
                    uploadedAt={attachment.createdAt}
                    uploaderName={attachment.senderName}
                  />
                ))}
              </div>
            </div>


          </aside>
          )}
        </div>
      </div>

      <ServiceFeeDialog
        open={acceptFeeDialog !== null}
        mode={acceptFeeDialog?.mode ?? 'confirmation'}
        action="acceptJob"
        jobAmount={acceptFeeDialog?.jobAmount ?? 0}
        serviceFee={calculateServiceFee(acceptFeeDialog?.jobAmount ?? 0)}
        balance={acceptFeeDialog?.balance ?? null}
        loadingBalance={acceptFeeDialog?.loadingBalance}
        submitting={isAcceptingDeal}
        error={acceptFeeDialog?.error}
        onConfirm={confirmAcceptDeal}
        onCancel={closeAcceptFeeDialog}
        onTopUp={openWalletTopUp}
      />

      {showNegModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Yêu cầu vào vòng đàm phán</h3>
                <p className="text-xs text-muted-foreground">Chuyển sang phòng Negotiation</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bạn có muốn chuyển cuộc trò chuyện này sang <strong>vòng đàm phán</strong> để thảo luận chi tiết về giá cả và phạm vi công việc không?
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowNegModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-border bg-background text-muted-foreground hover:bg-muted transition-all cursor-pointer border-none uppercase tracking-wider"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmMoveToNegotiation}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-600 text-white shadow-md transition-all cursor-pointer border-none uppercase tracking-wider"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        scheduleMode={scheduleMode}
        editingSchedule={editingSchedule}
        scheduleTitle={scheduleTitle}
        setScheduleTitle={setScheduleTitle}
        scheduleDetails={scheduleDetails}
        setScheduleDetails={setScheduleDetails}
        scheduleTime={scheduleTime}
        setScheduleTime={setScheduleTime}
        scheduleReason={scheduleReason}
        setScheduleReason={setScheduleReason}
        scheduleError={scheduleError}
        scheduleSaving={scheduleSaving}
        scheduleConflict={scheduleConflict}
        midnightConfirmed={midnightConfirmed}
        setMidnightConfirmed={setMidnightConfirmed}
        scheduleAddGoogleMeet={scheduleAddGoogleMeet}
        setScheduleAddGoogleMeet={setScheduleAddGoogleMeet}
        scheduleSendEmail={scheduleSendEmail}
        setScheduleSendEmail={setScheduleSendEmail}
        googleMeetStatusLoading={googleMeetStatusLoading}
        googleMeetStatus={googleMeetStatus}
        googleMeetConnecting={googleMeetConnecting}
        connectGoogleMeet={connectGoogleMeet}
        confirmScheduleRetry={confirmScheduleRetry}
        submitSchedule={submitSchedule}
      />

      <CombinedIssueReportsModal
        isOpen={Boolean(viewReportId)}
        onClose={closeReportDetail}
        reports={contractReports}
        isLoadingReports={isLoadingReports}
        currentUserId={user?.id ?? ''}
        contractTitle={activeConv?.job.title || t('workspace.disputeTitlePrefix')}
        workspaceContractId={selectedReport?.contractId || ''}
        selectedReportId={viewReportId}
        selectedReportDetail={selectedReport}
        isLoadingDetail={isLoadingReportDetail}
        onSelectReport={(repId) => {
          if (selectedReport?.contractId) {
            void loadReportDetail(selectedReport.contractId, repId);
            setViewReportId(repId);
          }
        }}
        onRespond={async (input) => {
          if (!selectedReport) return { success: false };
          const response = await respondToReport(selectedReport.contractId, selectedReport.id, input);
          return { success: response.success, message: response.message };
        }}
        onConfirm={async (isAccepted) => {
          if (!selectedReport) return { success: false };
          const response = await confirmResolution(selectedReport.contractId, selectedReport.id, isAccepted);
          return { success: response.success, message: response.message };
        }}
        onEscalate={async (input) => {
          if (!selectedReport) return { success: false };
          const response = await escalateToDispute(selectedReport.contractId, selectedReport.id, input);
          return { success: response.success, message: response.message, disputeId: response.data?.id };
        }}
        onDisputeCreated={(disputeId) => {
          if (selectedReport) navigate(`/contracts/${selectedReport.contractId}/disputes/${disputeId}`);
        }}
        isResponding={isRespondingReport}
        isConfirming={isConfirmingReport}
        isEscalating={isEscalatingReport}
      />
    </AppLayout>
  );
}
