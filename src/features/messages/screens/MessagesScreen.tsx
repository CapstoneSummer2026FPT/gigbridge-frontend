import {
  Send, Paperclip, Smile, Info, X, Ban, Download,
  FileText, Image as ImageIcon, ChevronDown,
  CreditCard, CheckCircle, Briefcase, Layers,
  ExternalLink, MessageSquare, Settings2, ArrowRightLeft,
  Wifi, WifiOff, Loader2, AlertCircle, Clock3,
  CalendarPlus, CalendarDays, Pencil, ChevronUp, Video,
  Plus, Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { ScheduleEvent } from '../../../api/scheduleAPI';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { ServiceFeeDialog } from '../../../shared/components/ServiceFeeDialog';
import { calculateServiceFee } from '../../../shared/utils/serviceFee';
import { useMessages } from '../hooks/useMessages';
import { MESSAGE_ROOMS } from '../messageRooms';
import '../styles/messages-screen.css';

function countdown(start: string, now: number) {
  const delta = new Date(start).getTime() - now;
  if (delta <= 0) return 'Meeting time reached';
  const seconds = Math.floor(delta / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h ${minutes}m remaining` : hours ? `${hours}h ${minutes}m remaining` : `${minutes}m ${seconds % 60}s remaining`;
}

function vietnamDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' Vietnam Time (ICT)';
}

function ScheduleCard({ schedule, latest, now, onEdit, onCancel, onRetry, onLatest, onAccept, onReject, onCounterProposal, actionBusy }: {
  schedule: ScheduleEvent; latest: boolean; now: number; onEdit: () => void; onCancel: () => void;
  onRetry: () => Promise<void>; onLatest: () => void; onAccept: () => Promise<void>; onReject: () => Promise<void>;
  onCounterProposal: (edit: boolean) => void; actionBusy: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [retryingMeet, setRetryingMeet] = useState(false);
  const cancelled = schedule.status === 1 || schedule.status === 3 || schedule.eventType === 2;
  const startLocalHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date(schedule.scheduledAtUtc)));
  const started = now >= new Date(schedule.scheduledAtUtc).getTime();
  const canCancel = latest && !started && schedule.canCancel;
  const canEdit = latest && !started && schedule.canEdit;
  const canRespond = latest && !started;
  const canEditCounter = latest && !started && schedule.canEditCounterProposal &&
    !!schedule.counterProposalEditExpiresAtUtc && now < new Date(schedule.counterProposalEditExpiresAtUtc).getTime();
  const confirmed = schedule.agreementStatus === 0;
  const meetingReady = schedule.meeting?.status === 2 && !!schedule.meeting.joinUri;
  const eventLabel = ['Created','Edited','Cancelled','Accepted','Rejected','Counter proposed'][schedule.eventType] || 'Schedule updated';
  const agreementLabel = ['Confirmed','Awaiting freelancer response','Freelancer rejected — choose a new time','Awaiting client response','Client rejected'][schedule.agreementStatus] || 'Schedule updated';
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
        <p className="text-xs font-semibold">{vietnamDate(schedule.scheduledAtUtc)}</p>
        {latest && !cancelled && confirmed && (!started || !meetingReady) && <p className="text-xs text-[var(--gb-cyan)] font-bold mt-1">{countdown(schedule.scheduledAtUtc, now)}</p>}
        {latest && !cancelled && confirmed && started && meetingReady && <a href={schedule.meeting!.joinUri!} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white no-underline transition-colors hover:bg-emerald-700"><Video size={15} />{t('schedule.meetingJoin')}<ExternalLink size={12} /></a>}
        <p className="text-[10px] text-muted-foreground mt-1">Cancellation cutoff: {vietnamDate(schedule.cutoffUtc)}</p>
        {startLocalHour < 2 && <p className="text-[10px] text-amber-600 mt-2 font-semibold">Short cancellation window: this event begins close to Vietnam midnight.</p>}
      </div>
      {latest && <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${confirmed ? 'bg-emerald-500/10 text-emerald-700' : cancelled ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700'}`}>{agreementLabel}</div>}
      {latest && schedule.agreementStatus === 3 && schedule.counterProposalEditExpiresAtUtc && <p className="mt-2 text-[10px] text-muted-foreground">Freelancer may edit this time until {vietnamDate(schedule.counterProposalEditExpiresAtUtc)}.</p>}
      {latest && !cancelled && confirmed && schedule.meeting?.status === 1 && <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700"><Loader2 size={14} className="animate-spin" />{t('schedule.meetingPending')}</div>}
      {latest && !cancelled && confirmed && meetingReady && !started && <a href={schedule.meeting!.joinUri!} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 no-underline transition-colors hover:bg-emerald-500/20"><Video size={15} />{t('schedule.meetingJoin')}<ExternalLink size={12} /></a>}
      {latest && !cancelled && schedule.meeting?.status === 3 && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600"><span className="flex items-center gap-2"><AlertCircle size={14} />{t('schedule.meetingFailed')}</span>{schedule.meeting.canRetry && <button type="button" disabled={retryingMeet} onClick={async () => { setRetryingMeet(true); try { await onRetry(); } finally { setRetryingMeet(false); } }} className="rounded-lg border-none bg-red-600 px-3 py-1.5 text-xs font-bold text-white cursor-pointer disabled:opacity-50">{retryingMeet ? t('schedule.meetingPending') : t('schedule.meetingRetry')}</button>}</div>}
      {schedule.details && <><button onClick={() => setExpanded(x => !x)} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground border-none bg-transparent cursor-pointer">{expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Details</button>{expanded && <p className="text-xs whitespace-pre-wrap mt-2">{schedule.details}</p>}</>}
      {cancelled && schedule.cancellationReason && <p className="mt-3 text-xs text-red-600"><strong>Reason:</strong> {schedule.cancellationReason}</p>}
      {latest && !cancelled && <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {canEdit && <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-xs bg-muted border-none cursor-pointer flex gap-1 items-center"><Pencil size={12}/> {t('schedule.edit')}</button>}
        {canEditCounter && <button onClick={() => onCounterProposal(true)} className="px-3 py-1.5 rounded-lg text-xs bg-muted border-none cursor-pointer flex gap-1 items-center"><Pencil size={12}/> Edit proposed time</button>}
        {schedule.canProposeTime && <button onClick={() => onCounterProposal(false)} className="px-3 py-1.5 rounded-lg text-xs bg-[var(--gb-cyan)] text-white border-none cursor-pointer">Choose new time</button>}
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
    isClient,
    loading,
    signalRStatus,
    navigate,
    openRooms,
    conversationsState,
    activeConvId,
    activeConv,
    activeMessages,
    dealStatus,
    showInfo,
    setShowInfo,
    showDealPrice,
    setShowDealPrice,
    dealPriceInput,
    setDealPriceInput,
    dealPriceMode,
    resetDealPriceToMilestones,
    dealMilestones,
    dealMilestonesLoading,
    dealMilestonesSaving,
    dealMilestoneTotal,
    updateDealMilestone,
    addDealMilestone,
    removeDealMilestone,
    handleSaveDealMilestones,
    messageInput,
    setMessageInput,
    isFavorited,
    setIsFavorited,
    isBlocked,
    setIsBlocked,
    showConvMenu,
    setShowConvMenu,
    showNegModal,
    setShowNegModal,
    negStatus,
    chatEndRef,
    chatHistoryRef,
    convMenuRef,
    toggleRoom,
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
    totalUnread,
    formatTime,
    showScheduleModal, setShowScheduleModal, scheduleMode, editingSchedule, scheduleTitle, setScheduleTitle,
    scheduleDetails, setScheduleDetails, scheduleTime, setScheduleTime, scheduleReason, setScheduleReason,
    scheduleError, scheduleSaving, scheduleActionId, openCreateSchedule, openEditSchedule, openCancelSchedule,
    openCounterProposal, respondToSchedule, retryGoogleMeet, submitSchedule,
    scheduleConflict, confirmScheduleRetry, midnightConfirmed, setMidnightConfirmed,
    scheduleAddGoogleMeet, setScheduleAddGoogleMeet,
    googleMeetStatus, googleMeetStatusLoading, googleMeetConnecting, connectGoogleMeet,
    nowMs, highlightedMessageId, anchorNotice, setAnchorNotice,
    hasOngoingSchedule, checkingOngoingSchedule,
  } = useMessages();

  const getDealStatusLabel = (status: typeof dealStatus, isLatestOffer: boolean) => {
    if (!isLatestOffer) return 'Đề xuất cũ';
    if (status === 'pending_freelancer') return 'Đang chờ freelancer';
    if (status === 'agreed') return 'Đã đồng ý ✓';
    if (status === 'declined') return 'Đã từ chối';
    if (status === 'pending_client') return 'Đang chờ cập nhật';
    return 'Đang đồng bộ';
  };
  const canProposeDeal = activeConv?.roomType === 'negotiation' && isClient && dealStatus !== 'agreed';
  const dealPriceNumber = Number(dealPriceInput) || 0;
  const dealPriceValid = dealPriceNumber > 0 && dealPriceNumber <= 9999999999999999.99 && Math.round(dealPriceNumber * 100) / 100 === dealPriceNumber;
  const dealMilestonesMatchPrice = dealPriceValid && Math.abs(dealMilestoneTotal - dealPriceNumber) < 0.01;
  const sharedAttachments = Array.from(new Map(
    activeMessages.flatMap(message => message.attachments || []).map(attachment => [attachment.messageAttachmentId, attachment])
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
          <section className="messages-conversation-list w-80 shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {t('messages.conversations')}
              </span>
              <span
                title={`Chat realtime: ${signalRStatus}`}
                aria-label={`Chat realtime: ${signalRStatus}`}
                className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                  signalRStatus === 'connected'
                    ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/10'
                    : signalRStatus === 'connecting' || signalRStatus === 'reconnecting'
                    ? 'text-amber-600 border-amber-500/20 bg-amber-500/10'
                    : 'text-red-600 border-red-500/20 bg-red-500/10'
                }`}
              >
                {signalRStatus === 'connected' ? (
                  <Wifi size={12} />
                ) : signalRStatus === 'connecting' || signalRStatus === 'reconnecting' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <WifiOff size={12} />
                )}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto messages-custom-scroll">
              {MESSAGE_ROOMS.map(room => {
                const convos = conversationsState.filter(c => c.roomId === room.id);
                const roomUnread = convos.reduce((s, c) => s + c.unreadCount, 0);
                const isOpen = !!openRooms[room.id];
                const RoomIcon = room.type === 'invited' ? Briefcase : room.type === 'workspace' ? CheckCircle : Layers;

                return (
                  <div key={room.id}>
                    <button
                      className="msg-room-header w-full"
                      onClick={() => toggleRoom(room.id)}
                      aria-expanded={isOpen}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        room.type === 'invited'
                          ? 'bg-teal-500/10 text-teal-500'
                          : 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]'
                      }`}>
                        <RoomIcon size={14} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-semibold text-foreground">
                          {room.type === 'invited' ? t('messages.roomInvitedLabel') : room.type === 'negotiation' ? t('messages.roomNegotiationLabel') : t('messages.roomWorkspaceLabel')}
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {room.type === 'invited' ? t('messages.roomInvitedDesc') : room.type === 'negotiation' ? t('messages.roomNegotiationDesc') : t('messages.roomWorkspaceDesc')}
                        </p>
                      </div>
                      {roomUnread > 0 && (
                        <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-[var(--gb-cyan)] text-white rounded-full">
                          {roomUnread}
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        className={`msg-room-chevron text-muted-foreground ${isOpen ? 'open' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="pl-2 pb-1">
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
                                <span className="text-sm font-semibold truncate">{conv.participantName}</span>
                                <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">
                                  {formatTime(conv.lastMessageAt)}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.job.title}</p>
                              <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                {conv.lastMessage}
                              </p>
                            </div>
                          </div>
                        ))}
                        {convos.length === 0 && (
                          <p className="text-xs text-muted-foreground p-4 text-center">{t('messages.emptyRoom')}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
                <div className="relative">
                  <img
                    src={activeConv.participantAvatar}
                    alt={activeConv.participantName}
                    className="w-11 h-11 rounded-full object-cover border border-border shadow-sm"
                  />
                  {activeConv.participantOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full shadow-sm" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-foreground tracking-tight leading-none" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif" }}>
                    {activeConv.participantName}
                  </span>
                  
                  {/* Premium Job Pill */}
                  <div 
                    onClick={() => navigate(`/jobs/${activeConv.job.id}`)}
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
                  onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')}
                  className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 transition-all cursor-pointer"
                  title={t('messages.createGoogleMeet')}
                  aria-label={t('messages.createGoogleMeet')}
                >
                  <Video size={18} />
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

            {/* Agreed Deal Banner (freelancer: navigate to contract) */}
            {dealStatus === 'agreed' && activeConv.roomType !== 'workspace' && (
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
                  onClick={handleOpenAcceptedContract}
                  className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>{t('messages.openContract')}</span>
                  <span>-&gt;</span>
                </button>
              </div>
            )}

            {/* Negotiation accepted banner → conversation already moved */}
            {negStatus === 'accepted' && activeConv.roomType !== 'workspace' && (
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
              <div className="flex justify-center">
                <span className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {activeConv.roomType === 'invited'
                    ? t('messages.invitedJobChat')
                    : activeConv.roomType === 'workspace'
                      ? t('messages.workspaceChat')
                      : t('messages.negotiationChat')}
                </span>
              </div>

              {activeMessages.map((msg, idx) => {
                const mine = isMe(msg.senderId);
                const isSystem = msg.type === 'system' || msg.senderId === 'system';
                const latestScheduleMessage = msg.schedule ? activeMessages.filter(m => m.schedule?.scheduleId === msg.schedule?.scheduleId).sort((a,b) => (b.schedule?.eventSequence || 0) - (a.schedule?.eventSequence || 0))[0] : undefined;

                // Older deployments persisted one message per schedule state.
                // Render only the latest one so every schedule has one live card.
                if (msg.schedule && latestScheduleMessage?.id !== msg.id) return null;

                // ── System message (centered) ─────────────────────────────
                if (isSystem) {
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
                        src={activeConv.participantAvatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex flex-col gap-1">

                      {/* ── File message ───────────────────────────────────── */}
                      {msg.type === 'schedule' && msg.schedule ? (
                        <ScheduleCard schedule={msg.schedule} latest={latestScheduleMessage?.id === msg.id} now={nowMs}
                          onEdit={() => openEditSchedule(msg.schedule!)} onCancel={() => openCancelSchedule(msg.schedule!)}
                          onRetry={() => retryGoogleMeet(msg.schedule!)}
                          onAccept={() => respondToSchedule(msg.schedule!, 'accept')}
                          onReject={() => respondToSchedule(msg.schedule!, 'reject')}
                          onCounterProposal={(edit) => openCounterProposal(msg.schedule!, edit)}
                          actionBusy={scheduleActionId === msg.schedule.scheduleId}
                          onLatest={() => document.getElementById(`message-${latestScheduleMessage?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
                      ) : msg.type === 'file' ? (
                        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border max-w-sm">
                          <p className="text-sm mb-3">{msg.content}</p>
                          <div className="rounded-xl overflow-hidden border border-border">
                            {msg.fileUrl ? (
                              <img src={msg.fileUrl} alt="Attachment" className="w-full h-40 object-cover" />
                            ) : (
                              <div className="w-full h-28 bg-muted flex items-center justify-center">
                                <FileText size={28} className="text-muted-foreground" />
                              </div>
                            )}
                            <div className="bg-muted p-2 flex justify-between items-center text-[10px] text-muted-foreground">
                              <span className="truncate">{msg.fileName}</span>
                              <Download size={13} className="cursor-pointer hover:text-[var(--gb-cyan)]" />
                            </div>
                          </div>
                        </div>

                      ) : msg.type === 'negotiation_request' ? (
                        /* ── Negotiation Request bubble ────────────────────── */
                        <div className="msg-deal-bubble my-1 border-teal-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                              <ArrowRightLeft size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm text-foreground font-bold">Yêu cầu vào vòng đàm phán</h3>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {msg.negotiationStatus === 'pending'
                                  ? 'Đang chờ phản hồi'
                                  : msg.negotiationStatus === 'accepted'
                                  ? 'Đã chấp nhận ✓'
                                  : 'Đã từ chối'}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                            Client muốn chuyển cuộc trò chuyện này sang <strong className="text-foreground">vòng đàm phán</strong> để thảo luận chi tiết về giá cả và phạm vi công việc.
                          </p>

                          {msg.negotiationStatus === 'pending' && !mine && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptNegotiation(msg.id)}
                                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
                              >
                                Đồng ý
                              </button>
                              <button
                                onClick={() => handleDeclineNegotiation(msg.id)}
                                className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                        </div>

                      ) : msg.type === 'deal' ? (
                        /* ── Deal Proposal Bubble ─────────────────────────── */
                        <div className="msg-deal-bubble my-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)]">
                              <CreditCard size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm text-foreground font-bold">Thỏa thuận giá (Deal)</h3>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {getDealStatusLabel(dealBubbleStatus, isLatestDealOffer)}
                              </p>
                            </div>
                          </div>

                          <div className="bg-muted/50 rounded-xl p-3.5 mb-4 border border-border/50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Đề xuất mức giá</span>
                            <div className="text-2xl font-black text-[var(--gb-cyan)] mt-1 flex items-center gap-1">
                              <GCoinIcon size={24} />
                              {msg.content}
                            </div>
                          </div>

                          {msg.offerDetail?.milestones?.length ? (
                            <div className="mb-4 space-y-2 rounded-xl border border-border bg-background p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Milestone snapshot</p>
                              {msg.offerDetail.milestones.map((milestone, milestoneIndex) => (
                                <div key={milestone.id || milestoneIndex} className="border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
                                  <div className="flex justify-between gap-3 text-xs">
                                    <strong>{milestoneIndex + 1}. {milestone.title || 'Untitled milestone'}</strong>
                                    <span className="font-bold text-[var(--gb-cyan)]">{milestone.amount} G-coin</span>
                                  </div>
                                  {milestone.estimatedDuration && <p className="mt-1 text-[11px] text-muted-foreground">Duration: {milestone.estimatedDuration}</p>}
                                  {milestone.description && <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{milestone.description}</p>}
                                  {milestone.deliverables && <p className="mt-1 text-[11px]"><strong>Deliverables:</strong> {milestone.deliverables}</p>}
                                  {milestone.acceptanceCriteria && <p className="mt-1 text-[11px]"><strong>Acceptance:</strong> {milestone.acceptanceCriteria}</p>}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {!isLatestDealOffer ? (
                            <div className="text-xs text-center text-muted-foreground font-medium bg-muted p-2 rounded-lg">
                              Đề xuất này không còn là đề xuất hiện tại.
                            </div>
                          ) : dealBubbleStatus === 'pending_freelancer' ? (
                            !mine ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptDeal(
                                    msg.negotiationOfferId,
                                    Number(msg.content.replace(/,/g, ''))
                                  )}
                                  className="flex-1 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
                                >
                                  Đồng ý
                                </button>
                                <button
                                  onClick={() => handleDeclineDeal(msg.negotiationOfferId)}
                                  className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-center text-muted-foreground font-medium bg-muted p-2 rounded-lg">
                                Đang đợi phản hồi từ đối tác...
                              </div>
                            )
                          ) : dealBubbleStatus === 'agreed' ? (
                            <div className="text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg text-center font-bold">
                              Mức giá đã được thống nhất
                            </div>
                          ) : dealBubbleStatus === 'declined' ? (
                            <div className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg text-center font-bold">
                              Đề xuất đã bị từ chối
                            </div>
                          ) : (
                            <div className="text-xs text-center text-muted-foreground font-medium bg-muted p-2 rounded-lg">
                              Đang đồng bộ trạng thái đề xuất...
                            </div>
                          )}
                        </div>

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
                          <p className="text-sm">{msg.content}</p>
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
            <div className="shrink-0 p-4 bg-card border-t border-border">
              <div className="flex flex-col border border-border rounded-2xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">

                {/* Deal Price Popup */}
                {showDealPrice && canProposeDeal && (
                  <div role="dialog" aria-modal="true" aria-label="Create final offer" className="fixed left-1/2 top-1/2 z-[120] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in fade-in zoom-in-95 sm:p-5">
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="sticky top-0 z-10 flex justify-between items-center gap-3 bg-card pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('messages.proposeDealPrice')}</span>
                        <button onClick={() => setShowDealPrice(false)} className="text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent p-0">
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type="number"
                        id="input-deal-price"
                        placeholder={t('messages.enterProposedPrice')}
                        value={dealPriceInput}
                        onChange={e => setDealPriceInput(e.target.value)}
                        min="0.01"
                        step="0.01"
                        max="9999999999999999.99"
                        className="min-w-0 max-w-full w-full bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                        <span className={dealMilestonesMatchPrice ? 'text-emerald-600' : 'text-amber-600'}>Proposed rate: {dealPriceNumber || 0} · Milestone total: {dealMilestoneTotal} G-coin</span>
                        {dealPriceMode === 'manual' && <button type="button" onClick={resetDealPriceToMilestones} className="font-bold text-[var(--gb-cyan)] hover:underline">Use milestone total</button>}
                      </div>
                      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milestone plan</p>
                            <p className={`mt-1 text-[11px] font-semibold ${dealMilestonesMatchPrice ? 'text-emerald-600' : 'text-amber-600'}`}>
                              Total {dealMilestoneTotal} / Final price {dealPriceNumber || 0} G-coin
                            </p>
                          </div>
                          <button type="button" onClick={addDealMilestone} className="rounded-lg border border-border p-2 text-[var(--gb-cyan)]" title="Add milestone">
                            <Plus size={14} />
                          </button>
                        </div>
                        {dealMilestonesLoading ? (
                          <p className="text-xs text-muted-foreground">Loading milestone draft...</p>
                        ) : dealMilestones.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No milestone draft yet. Add one before sending a final offer.</p>
                        ) : (
                          <div className="space-y-3 pr-1">
                            {dealMilestones.map((milestone, index) => (
                              <div key={milestone.id || index} className="space-y-2 rounded-lg border border-border bg-background p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <strong className="text-xs">Milestone {index + 1}</strong>
                                  <button type="button" onClick={() => removeDealMilestone(index)} className="rounded-md p-1 text-red-500 hover:bg-red-500/10" title="Remove milestone">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <input value={milestone.title || ''} onChange={e => updateDealMilestone(index, { title: e.target.value })} placeholder="Title" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs" />
                                <textarea value={milestone.description || ''} onChange={e => updateDealMilestone(index, { description: e.target.value })} placeholder="Description" rows={2} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs" />
                                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                                  <input type="number" min="0" step="0.01" max="9999999999999999.99" value={milestone.amount || ''} onChange={e => updateDealMilestone(index, { amount: Number(e.target.value) })} placeholder="Amount" className="min-w-0 max-w-full w-full rounded-lg border border-border bg-card px-3 py-2 text-xs" />
                                  <input value={milestone.estimatedDuration || ''} onChange={e => updateDealMilestone(index, { estimatedDuration: e.target.value })} placeholder="Duration" className="min-w-0 max-w-full w-full rounded-lg border border-border bg-card px-3 py-2 text-xs" />
                                </div>
                                <textarea value={milestone.deliverables || ''} onChange={e => updateDealMilestone(index, { deliverables: e.target.value })} placeholder="Deliverables" rows={2} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs" />
                                <textarea value={milestone.acceptanceCriteria || ''} onChange={e => updateDealMilestone(index, { acceptanceCriteria: e.target.value })} placeholder="Acceptance criteria" rows={2} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs" />
                              </div>
                            ))}
                          </div>
                        )}
                        <button type="button" disabled={dealMilestonesSaving} onClick={handleSaveDealMilestones} className="w-full rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-60">
                          {dealMilestonesSaving ? 'Saving...' : 'Save milestone draft'}
                        </button>
                      </div>
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        {t('messages.proposeDealNote')}
                      </p>
                      <div className="sticky bottom-0 z-10 flex justify-between gap-2 border-t border-border bg-card pt-3">
                        <button
                          onClick={() => setShowDealPrice(false)}
                          className="flex-1 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors uppercase tracking-widest cursor-pointer border-none bg-transparent"
                        >
                          {t('messages.cancel')}
                        </button>
                        <button
                          onClick={handleProposeDeal}
                          id="btn-propose-deal"
                          disabled={!dealPriceInput.trim() || dealMilestonesSaving || !dealMilestonesMatchPrice}
                          className="min-w-0 flex-1 py-2 text-xs font-bold bg-[var(--gb-cyan)] text-white rounded-lg shadow-md hover:bg-[var(--gb-cyan)]/90 transition-colors uppercase tracking-widest cursor-pointer border-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('messages.send')}
                        </button>
                      </div>
                    </div>
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

                    {/* ── Conversation Settings (tùy chỉnh) – Client only ── */}
                    {isClient && (
                      <div className="relative" ref={convMenuRef}>
                        <button
                          id="btn-conv-settings"
                          onClick={() => setShowConvMenu(prev => !prev)}
                          title="Conversation Settings"
                          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer border-none bg-transparent ${
                            showConvMenu
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <Settings2 size={16} />
                        </button>

                        {/* Dropdown menu */}
                        {showConvMenu && (
                          <div className="msg-conv-settings-menu absolute bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                            <div className="px-3 py-2 border-b border-border">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversation Actions</p>
                            </div>

                            {/* "Vào vòng đàm phán" – only when in Invited room and not yet requested */}
                            {activeConv.roomType === 'invited' && negStatus === 'idle' && (
                              <button
                                onClick={handleSendNegotiationRequest}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-foreground hover:bg-teal-500/10 hover:text-teal-600 transition-colors cursor-pointer text-left border-none bg-transparent"
                              >
                                <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 flex-shrink-0">
                                  <ArrowRightLeft size={14} />
                                </div>
                                <span>Vào vòng đàm phán</span>
                              </button>
                            )}

                            {/* Already requested state */}
                            {activeConv.roomType === 'invited' && negStatus === 'pending' && (
                              <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  <ArrowRightLeft size={14} />
                                </div>
                                <span className="text-xs">Đang chờ phản hồi...</span>
                              </div>
                            )}

                            {/* Already in negotiation */}
                            {activeConv.roomType === 'negotiation' && (
                              <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
                                <div className="w-7 h-7 rounded-lg bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)] flex-shrink-0">
                                  <ArrowRightLeft size={14} />
                                </div>
                                <span className="text-xs">Đang trong vòng đàm phán</span>
                              </div>
                            )}

                            <div className="border-t border-border">
                              <button
                                onClick={() => { setShowConvMenu(false); setIsBlocked(!isBlocked); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer text-left border-none bg-transparent ${
                                  isBlocked
                                    ? 'text-green-600 hover:bg-green-500/10'
                                    : 'text-red-500 hover:bg-red-500/10'
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isBlocked ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                  <Ban size={14} />
                                </div>
                                <span>{isBlocked ? 'Bỏ chặn liên lạc' : 'Chặn liên lạc'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
              <div className="relative inline-block mb-4">
                <img
                  src={activeConv.participantAvatar}
                  alt={activeConv.participantName}
                  className="w-20 h-20 rounded-full mx-auto border-2 border-[var(--gb-cyan)] object-cover"
                />
                {activeConv.participantOnline && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
                )}
              </div>
              <h3 className="font-headline-md text-base font-bold">{activeConv.participantName}</h3>
              <p className="text-xs text-muted-foreground mb-1">{activeConv.participantRole}</p>
              <p className="text-xs text-[var(--gb-cyan)] font-semibold mb-4">{activeConv.participantCompany}</p>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => navigate(`/profile/client/${activeConv.participantId}`)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-secondary text-foreground hover:bg-muted uppercase tracking-wider transition-all cursor-pointer border-none"
                >
                  View Profile
                </button>
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
                    onClick={() => navigate(`/jobs/${activeConv.job.id}`)}
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
                  <div key={attachment.messageAttachmentId} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-all border border-transparent hover:border-border">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">{attachment.mimeType.startsWith('image/') ? <ImageIcon className="text-[var(--gb-cyan)]" size={14} /> : <FileText className="text-red-500" size={14} />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{attachment.fileName}</p>
                      <p className="text-[9px] text-muted-foreground">{Math.max(1, Math.ceil(attachment.fileSizeBytes / 1024))} KB</p>
                    </div>
                    <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Download ${attachment.fileName}`}><Download size={13} className="text-muted-foreground hover:text-[var(--gb-cyan)] flex-shrink-0" /></a>
                  </div>
                ))}
              </div>
            </div>

            {/* Block button */}
            <div className="mt-auto p-6 bg-muted/30 border-t border-border">
              <button
                id="btn-block-contact"
                onClick={() => {
                  setIsBlocked(!isBlocked);
                  alert(isBlocked ? 'Contact unblocked.' : 'Contact blocked.');
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                  isBlocked
                    ? 'border-green-500/30 text-green-500 hover:bg-green-500/5'
                    : 'border-red-500/30 text-red-500 hover:bg-red-500/5'
                }`}
              >
                <Ban size={13} />
                {isBlocked ? 'Unblock Contact' : 'Block Contact'}
              </button>
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

      {showScheduleModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex justify-between"><div><h3 className="font-bold">{scheduleMode.startsWith('counter') ? 'Choose your desired time and date' : t(`schedule.${scheduleMode}`)}</h3><p className="text-xs text-muted-foreground">{t('schedule.vietnamTime')}</p></div><button onClick={() => setShowScheduleModal(false)} className="border-none bg-transparent cursor-pointer"><X size={17}/></button></div>
            {scheduleMode === 'cancel' ? (
              <textarea maxLength={1000} value={scheduleReason} onChange={e => setScheduleReason(e.target.value)} placeholder={t('schedule.reason')} className="w-full min-h-28 bg-background border border-border rounded-xl p-3 text-sm" />
            ) : <>
              {!scheduleMode.startsWith('counter') && <input maxLength={200} value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)} placeholder={t('schedule.title')} className="w-full bg-background border border-border rounded-xl p-3 text-sm" />}
              <div className="rounded-xl border border-border bg-background p-3 space-y-3">
                <label className="block text-xs font-semibold text-muted-foreground">Meeting date and time</label>
                <input type="datetime-local" value={scheduleTime} onChange={e => { setScheduleTime(e.target.value); setMidnightConfirmed(Number(e.target.value.slice(11, 13)) >= 2); }} className="w-full bg-background border border-border rounded-xl p-3 text-sm" />
              </div>
              {scheduleTime && Number(scheduleTime.slice(11,13)) < 2 && <label className="text-xs text-amber-600 bg-amber-500/10 rounded-lg p-2 flex gap-2"><input type="checkbox" checked={midnightConfirmed} onChange={e => setMidnightConfirmed(e.target.checked)}/>I understand this event starts near Vietnam midnight and may have a very short cancellation window.</label>}
              {!scheduleMode.startsWith('counter') && <textarea maxLength={4000} value={scheduleDetails} onChange={e => setScheduleDetails(e.target.value)} placeholder={t('schedule.details')} className="w-full min-h-24 bg-background border border-border rounded-xl p-3 text-sm" />}
              {scheduleMode === 'create' && <div className="rounded-xl border border-border bg-background p-3 space-y-2"><label className="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox" checked={scheduleAddGoogleMeet} onChange={e => setScheduleAddGoogleMeet(e.target.checked)} /><Video size={17} className="text-emerald-600" />{t('schedule.addGoogleMeet')}</label>{scheduleAddGoogleMeet && <div className="pl-7">{googleMeetStatusLoading ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" />Checking Google connection...</p> : googleMeetStatus?.isConnected ? <p className="text-xs font-semibold text-emerald-700">{t('schedule.connectedAs', { email: googleMeetStatus.googleEmail || 'Google' })}</p> : <button type="button" onClick={connectGoogleMeet} disabled={googleMeetConnecting} className="rounded-lg border-none bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white cursor-pointer disabled:opacity-50">{googleMeetConnecting ? 'Connecting...' : googleMeetStatus?.needsReconnect ? t('schedule.reconnectGoogle') : t('schedule.connectGoogle')}</button>}</div>}</div>}
              {scheduleMode === 'edit' && editingSchedule?.remainingEdits === 1 && <p className="text-xs text-amber-600">Saving will use the final shared edit.</p>}
            </>}
            {scheduleError && <p className="text-xs text-red-600 bg-red-500/10 rounded-lg p-2">{scheduleError}</p>}
            {scheduleConflict && <button disabled={scheduleMode === 'edit' && scheduleConflict.remainingEdits === 0} onClick={confirmScheduleRetry} className="w-full py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs cursor-pointer disabled:opacity-50">Confirm retry against version {scheduleConflict.version}{scheduleConflict.remainingEdits === 1 ? ' using the final edit' : ''}</button>}
            <div className="flex gap-2"><button onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 rounded-xl bg-muted border-none cursor-pointer">Close</button><button disabled={scheduleSaving || !!scheduleConflict || googleMeetConnecting || (scheduleMode === 'create' && scheduleAddGoogleMeet && !googleMeetStatus?.isConnected) || (scheduleMode !== 'cancel' && !!scheduleTime && Number(scheduleTime.slice(11,13)) < 2 && !midnightConfirmed) || (scheduleMode === 'cancel' ? !scheduleReason.trim() : scheduleMode.startsWith('counter') ? !scheduleTime : !scheduleTitle.trim() || !scheduleTime)} onClick={submitSchedule} className="flex-1 py-2 rounded-xl bg-[var(--gb-cyan)] text-white border-none cursor-pointer disabled:opacity-50">{scheduleSaving ? t('schedule.saving') : scheduleMode === 'cancel' ? t('schedule.cancel') : scheduleMode.startsWith('counter') ? 'Send time' : t('schedule.save')}</button></div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
