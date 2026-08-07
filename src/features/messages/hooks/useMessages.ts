import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import type { Message as MsgMessage, MsgConversation } from '../../../types/models/Message';

import { UserRole } from '../../../types';
import * as signalR from '@microsoft/signalr';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { messagePutAPI } from '../../../api/messageAPI/PUT';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { getChatHubUrl } from '../../../service/apiService';
import { scheduleAPI, type ScheduleEvent, type ScheduleMeetingResponse, type ScheduleResponse } from '../../../api/scheduleAPI';
import type { ContractDto } from '../../../types/models/Contract';
import { ContractStatus } from '../../../types/models/Contract';
import { googleMeetAPI, type GoogleMeetConnectionStatus } from '../../../api/googleMeetAPI';
import type { NegotiationMilestoneDto } from '../../../types/models/Message';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { calculateServiceFee, isInsufficientServiceFeeError } from '../../../shared/utils/serviceFee';
import { useTranslation } from '../../../hooks/useTranslation';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { getMessageRoom } from '../messageRooms';
import { getContractWorkflowRoute } from '../contractWorkflowRoute';
import { useOngoingScheduleStatus } from './useOngoingScheduleStatus';
import {
  calculateNegotiationBudget,
  calculateNegotiationDuration,
  normalizeNegotiationMilestones,
  prepareNegotiationMilestonesForEditing,
  resolveNegotiationMilestones,
  validateNegotiationMilestones,
} from '../negotiationMilestonePlan';

interface ScheduleMeetingChangedEvent {
  scheduleId: string;
  meeting: ScheduleMeetingResponse;
}

const MEETING_STATUS_POLL_INTERVAL_MS = 5_000;
const MEETING_STATUS_POLL_ATTEMPTS = 30;

const wait = (delayMs: number) =>
  new Promise<void>(resolve => window.setTimeout(resolve, delayMs));

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function mapOfferStatusToDealStatus(status: number | null | undefined): MsgConversation['dealStatus'] {
  if (status === 0) return 'pending_freelancer';
  if (status === 1) return 'agreed';
  if (status === 2) return 'declined';
  if (status === 3) return 'pending_client';
  if (status === 4) return 'declined';
  if (status === 5) return 'declined';
  return 'idle';
}

function mapBackendConversation(c: any): MsgConversation {
  const conversationType = c.conversationType ?? c.ConversationType;
  const proposalId = c.proposalId ?? c.ProposalId ?? null;
  const contractId = c.contractId ?? c.ContractId ?? null;
  const disputeId = c.disputeId ?? c.DisputeId ?? null;
  const lastOfferId = c.lastOfferId ?? c.LastOfferId ?? null;
  const lastOfferPrice = c.lastOfferPrice ?? c.LastOfferPrice ?? null;
  const lastOfferStatus = c.lastOfferStatus ?? c.LastOfferStatus ?? null;
  const proposalBudget = c.proposalBudget ?? c.ProposalBudget ?? null;
  const proposalDuration = c.proposalDuration ?? c.ProposalDuration ?? null;
  const jobBudgetMin = c.jobBudgetMin ?? c.JobBudgetMin ?? null;
  const jobBudgetMax = c.jobBudgetMax ?? c.JobBudgetMax ?? null;
  const jobCurrency = c.jobCurrency ?? c.JobCurrency ?? 'G-coin';
  const jobStatus = c.jobStatus ?? c.JobStatus ?? null;
  const jobVisibility = c.jobVisibility ?? c.JobVisibility ?? null;
  const backendCanNegotiate = c.canNegotiate ?? c.CanNegotiate;
  const canNegotiate = typeof backendCanNegotiate === 'boolean'
    ? backendCanNegotiate
    : jobStatus == null
      ? Number(jobVisibility) !== 3
      : Number(jobStatus) === 1 && Number(jobVisibility) !== 3;
  const isClient = (c.otherParticipantRole ?? c.OtherParticipantRole) === 0;
  const room = getMessageRoom(conversationType);

  return {
    id: c.conversationId ?? c.ConversationId,
    proposalId,
    contractId,
    disputeId,
    roomType: room.type,
    roomId: room.id,
    participantId: c.otherParticipantId || '',
    participantName: c.otherParticipantName || 'Partner',
    participantAvatar: c.otherParticipantAvatar || '/img/avatar-fallback.png',
    participantRole: c.otherParticipantRoleTitle || (isClient ? 'Client' : 'Freelancer'),
    participantCompany: c.otherParticipantCompany || '',
    participantOnline: false,
    job: {
      id: c.jobPostId || '',
      title: c.title || 'Untitled Job',
      budget: lastOfferPrice != null
        ? `${lastOfferPrice} ${jobCurrency}`
        : proposalBudget != null
          ? `${proposalBudget} ${jobCurrency}`
          : jobBudgetMin != null || jobBudgetMax != null
            ? `${jobBudgetMin ?? jobBudgetMax} - ${jobBudgetMax ?? jobBudgetMin} ${jobCurrency}`
            : 'Not specified',
      category: c.jobCategoryName ?? c.JobCategoryName ?? '',
      status: jobStatus,
      visibility: jobVisibility,
    },
    lastMessage: c.lastMessage?.content || '',
    lastMessageAt: c.lastMessageAt || c.createdAt || new Date().toISOString(),
    unreadCount: c.unreadCount || 0,
    isMuted: false,
    dealStatus: mapOfferStatusToDealStatus(lastOfferStatus),
    proposedPrice: (lastOfferPrice ?? proposalBudget)?.toString(),
    conversationType,
    lastOfferId,
    proposalBudget,
    proposalDuration,
    jobStatus,
    jobVisibility,
    canNegotiate,
  };
}

function parseNegotiationOfferId(metadata: unknown): string | null {
  if (typeof metadata !== 'string' || !metadata.trim()) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const source = parsed as Record<string, unknown>;
    const value = source.negotiationOfferId ?? source.NegotiationOfferId ?? source.offerId ?? source.OfferId;
    return typeof value === 'string' && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function mapBackendMessage(m: any): MsgMessage {
  const messageType = m.messageType ?? m.MessageType;
  const metadata = m.metadata ?? m.Metadata;
  let msgType = 'text';
  if (messageType === 1) msgType = 'image';
  else if (messageType === 2) msgType = 'file';
  else if ([3, 5, 6, 7, 8].includes(messageType)) msgType = 'system';
  else if (messageType === 4) msgType = 'deal';
  else if (messageType === 9) msgType = 'schedule';

  let dealStatus: MsgMessage['dealStatus'] = undefined;
  if (messageType === 4) {
    dealStatus = 'pending_freelancer'; // Default
  }

  const attachments = m.attachments ?? m.Attachments ?? [];
  const firstAttachment = attachments.length > 0 ? attachments[0] : null;
  let schedule: ScheduleEvent | undefined = m.schedule ?? undefined;
  if (!schedule && m.messageType === 9 && m.metadata) {
    try { schedule = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata; } catch { schedule = undefined; }
  }

  return {
    id: m.messageId,
    clientMessageId: m.clientMessageId,
    content: m.content || '',
    conversationId: m.conversationId,
    senderId: m.senderUserId || 'system',
    senderName: m.senderName ?? m.SenderName ?? null,
    senderAvatar: m.senderAvatar ?? m.SenderAvatar ?? null,
    senderRole: m.senderRole ?? m.SenderRole ?? null,
    disputeRecipient: m.disputeRecipient ?? m.DisputeRecipient ?? null,
    type: msgType,
    messageType,
    metadata: typeof metadata === 'string' ? metadata : null,
    createdAt: m.sentAt,
    isRead: true,
    fileUrl: firstAttachment?.fileUrl,
    fileName: firstAttachment?.fileName,
    attachments,
    dealStatus: dealStatus,
    schedule,
    negotiationOfferId: messageType === 4 ? parseNegotiationOfferId(metadata) : undefined,
  };
}

function sortConversations(convs: MsgConversation[]): MsgConversation[] {
  return [...convs].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

function dedupeMessages(messages: MsgMessage[]): MsgMessage[] {
  const unique = new Map<string, MsgMessage>();
  const withoutId: MsgMessage[] = [];

  for (const message of messages) {
    const key = message.id || message.clientMessageId;
    if (!key) {
      withoutId.push(message);
      continue;
    }

    const existing = unique.get(key);
    unique.set(key, existing
      ? { ...existing, ...message, schedule: message.schedule ?? existing.schedule }
      : message);
  }

  return [...unique.values(), ...withoutId];
}

function formatSendError(res: { statusCode?: number; message?: string; errors?: unknown }) {
  const parts = [
    `status=${res.statusCode ?? 'unknown'}`,
    res.message || 'Message was not saved.',
    res.errors ? `errors=${JSON.stringify(res.errors)}` : null,
  ].filter(Boolean);

  return parts.join(' | ');
}

function getEventValue(event: unknown, ...keys: string[]): string | null {
  if (!event || typeof event !== 'object') return null;
  const source = event as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

export function useMessages() {
  const { t } = useTranslation();
  const { user, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isClient = role === UserRole.Client;

  // ── Room expand state ────────────────────────────────────────────────────
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({
    room_invited: true,
    room_negotiation: true,
    room_workspace: true,
    room_dispute: true,
  });

  // ── Conversations state (mutable for room transfers) ─────────────────────
  const [conversationsState, setConversationsState] = useState<MsgConversation[]>([]);

  // ── Active conversation ──────────────────────────────────────────────────
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (location.state && location.state.activeConvId) {
      return location.state.activeConvId;
    }
    return '';
  });
  const activeConv = conversationsState.find(c => c.id === activeConvId);
  const [isActiveWorkspaceDisputed, setIsActiveWorkspaceDisputed] = useState(false);
  const [activeWorkspaceDisputeId, setActiveWorkspaceDisputeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const contractId = activeConv?.roomType === 'workspace' ? activeConv.contractId : null;
    if (!contractId) {
      setIsActiveWorkspaceDisputed(false);
      setActiveWorkspaceDisputeId(null);
      return;
    }

    const loadWorkspaceLock = async () => {
      const contractResponse = await contractGetAPI.getContractById(contractId);
      if (cancelled) return;
      const disputed = contractResponse.success && contractResponse.data?.status === ContractStatus.Disputed;
      setIsActiveWorkspaceDisputed(disputed);
      if (!disputed) {
        setActiveWorkspaceDisputeId(null);
        return;
      }

      const disputeResponse = await disputeGetAPI.getActiveDispute(contractId);
      if (!cancelled) {
        setActiveWorkspaceDisputeId(disputeResponse.success ? disputeResponse.data?.id ?? null : null);
      }
    };

    void loadWorkspaceLock();
    return () => { cancelled = true; };
  }, [activeConv?.contractId, activeConv?.roomType]);

  // ── Messages map ─────────────────────────────────────────────────────────
  const [messagesMap, setMessagesMap] = useState<Record<string, MsgMessage[]>>({});
  const activeMessages = useMemo(
    () => dedupeMessages(messagesMap[activeConvId] ?? []),
    [messagesMap, activeConvId]
  );

  // ── Deal state per conversation ──────────────────────────────────────────
  const [dealStatusMap, setDealStatusMap] = useState<Record<string, MsgConversation['dealStatus']>>({});
  const dealStatus = activeConv?.dealStatus ?? dealStatusMap[activeConvId] ?? 'idle';

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showInfo, setShowInfo] = useState(true);
  const [showDealPrice, setShowDealPrice] = useState(false);
  const [dealMilestones, setDealMilestones] = useState<NegotiationMilestoneDto[]>([]);
  const [dealAdvancedIndexes, setDealAdvancedIndexes] = useState<number[]>([]);
  const [dealMilestoneErrors, setDealMilestoneErrors] = useState<Record<string, string>>({});
  const [dealMilestonesLoading, setDealMilestonesLoading] = useState(false);
  const [dealMilestonesSaving, setDealMilestonesSaving] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // ── Conversation Settings Menu (tùy chỉnh) ───────────────────────────────
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [showNegModal, setShowNegModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'create' | 'edit' | 'cancel' | 'counter-create' | 'counter-edit'>('create');
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDetails, setScheduleDetails] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleActionId, setScheduleActionId] = useState<string | null>(null);
  const [scheduleConflict, setScheduleConflict] = useState<{ version: number; remainingEdits: number } | null>(null);
  const [midnightConfirmed, setMidnightConfirmed] = useState(false);
  const [scheduleAddGoogleMeet, setScheduleAddGoogleMeet] = useState(true);
  const [scheduleSendEmail, setScheduleSendEmail] = useState(true);
  const [googleMeetStatus, setGoogleMeetStatus] = useState<GoogleMeetConnectionStatus | null>(null);
  const [googleMeetStatusLoading, setGoogleMeetStatusLoading] = useState(false);
  const [googleMeetConnecting, setGoogleMeetConnecting] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [anchorNotice, setAnchorNotice] = useState('');
  const negotiationClosedNotice = 'This job post is no longer open for negotiation.';
  const ensureActiveNegotiationEligible = useCallback(() => {
    if (activeConv?.canNegotiate === false) {
      setAnchorNotice(negotiationClosedNotice);
      return false;
    }

    return true;
  }, [activeConv?.canNegotiate]);
  const [acceptFeeDialog, setAcceptFeeDialog] = useState<{
    offerId: string;
    jobAmount: number;
    balance: number | null;
    mode: 'confirmation' | 'insufficient';
    loadingBalance: boolean;
    error: string | null;
  } | null>(null);
  const [isAcceptingDeal, setIsAcceptingDeal] = useState(false);
  const { hasOngoingSchedule, syncOngoingSchedule } = useOngoingScheduleStatus();
  const [checkingOngoingSchedule, setCheckingOngoingSchedule] = useState(false);
  const convMenuRef = useRef<HTMLDivElement>(null);
  const resolvedAnchorKeyRef = useRef<string | null>(null);
  const anchorLookupKeyRef = useRef<string | null>(null);
  const sentReadReceiptKeysRef = useRef(new Set<string>());

  const markMessageReadOnce = useCallback((
    conversationId: string,
    messageId: string,
    revision?: string | number,
  ) => {
    const key = `${conversationId}:${messageId}:${revision ?? ''}`;
    if (sentReadReceiptKeysRef.current.has(key)) return;
    if (sentReadReceiptKeysRef.current.size >= 1000) sentReadReceiptKeysRef.current.clear();
    sentReadReceiptKeysRef.current.add(key);
    void messagePostAPI.markAsRead(conversationId, messageId)
      .then(response => {
        if (!response.success) sentReadReceiptKeysRef.current.delete(key);
      })
      .catch(() => sentReadReceiptKeysRef.current.delete(key));
  }, []);

  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
  const [signalRStatus, setSignalRStatus] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>('idle');
  const [loading, setLoading] = useState(true);

  const negStatus = activeConv?.roomId === 'room_negotiation' ? 'accepted' : 'idle';
  const resolvedDealMilestones = useMemo(
    () => resolveNegotiationMilestones(
      dealMilestones,
      t('proposalMilestoneEditor.defaultAcceptanceCriteria'),
    ),
    [dealMilestones, t],
  );
  const dealMilestoneTotal = useMemo(
    () => calculateNegotiationBudget(resolvedDealMilestones),
    [resolvedDealMilestones],
  );
  const dealOverallDuration = useMemo(
    () => calculateNegotiationDuration(resolvedDealMilestones),
    [resolvedDealMilestones],
  );
  const dealEditorMilestones = useMemo(
    () => dealMilestones.map((milestone, index) => ({
      ...milestone,
      estimatedDuration: resolvedDealMilestones[index]?.estimatedDuration || milestone.estimatedDuration,
    })),
    [dealMilestones, resolvedDealMilestones],
  );

  const updateDealMilestones = useCallback((milestones: NegotiationMilestoneDto[]) => {
    setDealMilestones(normalizeNegotiationMilestones(milestones));
    setDealMilestoneErrors({});
  }, []);

  const refreshGoogleMeetStatus = useCallback(async () => {
    setGoogleMeetStatusLoading(true);
    const response = await googleMeetAPI.getStatus();
    setGoogleMeetStatus(response.success && response.data ? response.data : null);
    setGoogleMeetStatusLoading(false);
    return response.success ? response.data : undefined;
  }, []);

  useEffect(() => {
    if (showScheduleModal && scheduleMode === 'create') refreshGoogleMeetStatus();
  }, [showScheduleModal, scheduleMode, refreshGoogleMeetStatus]);

  useEffect(() => {
    const handleOAuthResult = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'google-meet-oauth') return;
      setGoogleMeetConnecting(false);
      if (event.data.result === 'success') {
        refreshGoogleMeetStatus();
        setScheduleError('');
      } else {
        const oauthErrors: Record<string, string> = {
          cancelled: 'Google authorization was cancelled.',
          invalid_state: 'The Google connection request expired. Please try again.',
          invalid_request: 'Google did not return an authorization code. Please try again.',
          token_exchange_failed: 'Google rejected the authorization response. Please reconnect.',
          missing_refresh_token: 'Google did not issue offline access. Remove Gigbridge from your Google account permissions, then reconnect.',
          invalid_id_token: 'Google account verification failed. Please reconnect.',
          missing_meet_scope: 'Google Meet permission was not granted. Please reconnect and approve all requested permissions.',
          internal_error: 'Gigbridge could not save the Google connection. Check the backend log.',
        };
        setScheduleError(oauthErrors[event.data.result] || 'Google Meet connection was not completed. Please try again.');
      }
    };
    window.addEventListener('message', handleOAuthResult);
    return () => window.removeEventListener('message', handleOAuthResult);
  }, [refreshGoogleMeetStatus]);

  const connectGoogleMeet = async () => {
    const popup = window.open('', 'google-meet-oauth', 'width=520,height=700');
    if (!popup) {
      setScheduleError('Allow pop-ups to connect your Google account.');
      return;
    }

    setGoogleMeetConnecting(true);
    setScheduleError('');
    const response = await googleMeetAPI.getAuthorizationUrl();
    if (!response.success || !response.data?.authorizationUrl) {
      popup.close();
      setGoogleMeetConnecting(false);
      setScheduleError(response.message || 'Unable to start Google Meet connection.');
      return;
    }
    popup.location.href = response.data.authorizationUrl;
  };

  // Refs for tracking active ID in callbacks without re-triggering connection builder
  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    const offerIds = activeMessages
      .filter(message => message.type === 'deal' && message.negotiationOfferId && !message.offerDetail)
      .map(message => message.negotiationOfferId!)
      .filter((value, index, values) => values.indexOf(value) === index);
    if (!activeConvId || offerIds.length === 0) return;

    let active = true;
    Promise.all(offerIds.map(async offerId => {
      const response = await messageGetAPI.getNegotiationOfferDetail(offerId);
      return response.success && response.data ? response.data : null;
    })).then(details => {
      if (!active) return;
      const byId = new Map(details.filter(Boolean).map(detail => [detail!.negotiationOfferId, detail!]));
      if (byId.size === 0) return;
      setMessagesMap(prev => ({
        ...prev,
        [activeConvId]: (prev[activeConvId] ?? []).map(message =>
          message.negotiationOfferId && byId.has(message.negotiationOfferId)
            ? { ...message, offerDetail: byId.get(message.negotiationOfferId) ?? null }
            : message
        ),
      }));
    }).catch(() => undefined);

    return () => { active = false; };
  }, [activeConvId, activeMessages]);

  useEffect(() => {
    if (!activeConvId || activeConv?.roomType !== 'negotiation') {
      setDealMilestones([]);
      setDealAdvancedIndexes([]);
      setDealMilestoneErrors({});
      return;
    }

    let active = true;
    setDealMilestonesLoading(true);
    messageGetAPI.getNegotiationMilestonePlan(activeConvId).then(response => {
      if (!active) return;
      const prepared = prepareNegotiationMilestonesForEditing(response.data || []);
      setDealMilestones(prepared.milestones);
      setDealAdvancedIndexes(prepared.advancedIndexes);
      setDealMilestoneErrors({});
      setDealMilestonesLoading(false);
    }).catch(() => {
      if (active) setDealMilestonesLoading(false);
    });

    return () => { active = false; };
  }, [activeConv?.roomType, activeConvId]);

  // Fetch conversations on mount
  const loadConversations = useCallback(async () => {
    try {
      const res = await messageGetAPI.getMyConversations();
      if (res.success && res.data) {
        const mapped = res.data
          .map((c: any) => mapBackendConversation(c));
        setConversationsState(mapped);

        // Auto select once, but keep the current room stable on later refreshes.
        setActiveConvId(currentActiveConvId => {
          if (mapped.length === 0) return '';
          if (currentActiveConvId && mapped.some((c: any) => c.id === currentActiveConvId)) {
            return currentActiveConvId;
          }

          const queryConvId = new URLSearchParams(location.search).get('conversationId');
          const stateConvId = queryConvId || location.state?.activeConvId;
          const stateProposalId = location.state?.proposalId;
          const foundById = mapped.find((c: any) => c.id === stateConvId);
          const foundByProposal = mapped.find((c: any) => c.proposalId === stateProposalId);
          return foundById ? foundById.id : foundByProposal ? foundByProposal.id : mapped[0].id;
        });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user, location.state, location.search]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when activeConvId changes
  useEffect(() => {
    if (!activeConvId) return;
    let active = true;

    const loadMessages = async () => {
      try {
        const res = await messageGetAPI.getConversationMessages(activeConvId);
        if (res.success && res.data && active) {
          const mapped = dedupeMessages(res.data.map(mapBackendMessage));
          setMessagesMap(prev => ({ ...prev, [activeConvId]: mapped }));

          // Mark as read
          if (mapped.length > 0) {
            const lastMsg = mapped[mapped.length - 1];
            setConversationsState(prev => {
              const currentConv = prev.find(c => c.id === activeConvId);
              if (currentConv && currentConv.unreadCount > 0) {
                markMessageReadOnce(
                  activeConvId,
                  lastMsg.id,
                  lastMsg.schedule?.eventSequence ?? lastMsg.createdAt,
                );
                return prev.map(c => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error('Failed to load messages for conversation:', activeConvId, err);
      }
    };

    loadMessages();
    return () => {
      active = false;
    };
  }, [activeConvId, markMessageReadOnce]);

  useEffect(() => {
    if (!activeConvId) {
      syncOngoingSchedule(false);
      return;
    }
    let current = true;
    setCheckingOngoingSchedule(true);
    scheduleAPI.getOngoing(activeConvId).then(response => {
      if (current) {
        syncOngoingSchedule(
          Boolean(response.success && response.data?.hasOngoingSchedule),
          response.data?.scheduledAtUtc,
        );
      }
    }).finally(() => { if (current) setCheckingOngoingSchedule(false); });
    return () => { current = false; };
  }, [activeConvId, syncOngoingSchedule]);

  // Resolve each notification deep link once. This effect observes messagesMap
  // because the initial page loads asynchronously, but refs prevent message
  // updates/read receipts from issuing the same backend requests again.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversationId');
    const messageId = params.get('messageId');
    if (!conversationId || !messageId || activeConvId !== conversationId || !messagesMap[conversationId]) return;
    const anchorKey = `${conversationId}:${messageId}`;
    if (resolvedAnchorKeyRef.current === anchorKey || anchorLookupKeyRef.current === anchorKey) return;

    const existing = messagesMap[conversationId].some(m => m.id === messageId);
    const finish = () => {
      setHighlightedMessageId(messageId);
      window.setTimeout(() => setHighlightedMessageId(current => current === messageId ? null : current), 3000);
      window.setTimeout(() => document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      const anchoredMessage = messagesMap[conversationId]?.find(message => message.id === messageId);
      markMessageReadOnce(
        conversationId,
        messageId,
        anchoredMessage?.schedule?.eventSequence ?? anchoredMessage?.createdAt,
      );
    };

    if (existing) {
      resolvedAnchorKeyRef.current = anchorKey;
      finish();
      return;
    }

    anchorLookupKeyRef.current = anchorKey;
    messageGetAPI.getMessagesAround(conversationId, messageId).then(res => {
      if (anchorLookupKeyRef.current !== anchorKey) return;
      anchorLookupKeyRef.current = null;
      if (activeConvIdRef.current !== conversationId) return;
      resolvedAnchorKeyRef.current = anchorKey;
      if (!res.success || !res.data) {
        setAnchorNotice('Original schedule event is unavailable.');
        return;
      }
      setMessagesMap(prev => {
        const merged = [...(prev[conversationId] ?? []), ...res.data!.map(mapBackendMessage)];
        return { ...prev, [conversationId]: Array.from(new Map(merged.map(m => [m.id, m])).values()).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) };
      });
      window.setTimeout(finish, 80);
    }).catch(() => {
      if (anchorLookupKeyRef.current !== anchorKey) return;
      anchorLookupKeyRef.current = null;
      resolvedAnchorKeyRef.current = anchorKey;
      setAnchorNotice('Original schedule event is unavailable.');
    });
  }, [location.search, activeConvId, markMessageReadOnce, messagesMap]);

  // Connect to SignalR
  useEffect(() => {
    const hubUrl = getChatHubUrl();
    let disposed = false;
    let retryAttempt = 0;
    let retryTimer: number | null = null;
    let currentConnection: signalR.HubConnection | null = null;

    const clearRetryTimer = () => {
      if (retryTimer === null) return;
      window.clearTimeout(retryTimer);
      retryTimer = null;
    };

    const scheduleFreshConnection = () => {
      if (disposed || retryTimer !== null) return;
      const delay = Math.min(1_000 * (2 ** retryAttempt), 15_000);
      retryAttempt += 1;
      setSignalRStatus('reconnecting');
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (disposed) return;
      const token = localStorage.getItem('access_token');
      if (!token) {
        setSignalRStatus('disconnected');
        console.warn('[ChatHub] waiting for an access token before connecting');
        scheduleFreshConnection();
        return;
      }

      setSignalRStatus(retryAttempt > 0 ? 'reconnecting' : 'connecting');
      console.info('[ChatHub] connecting:', hubUrl);

      const connection = new signalR.HubConnectionBuilder()
        .configureLogging(signalR.LogLevel.Warning)
        .withUrl(hubUrl, {
          accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
        })
        .withAutomaticReconnect([0, 2_000, 5_000, 10_000])
        .build();
      currentConnection = connection;

      connection.onreconnecting(err => {
        if (disposed || currentConnection !== connection) return;
        setSignalRStatus('reconnecting');
        console.warn('[ChatHub] reconnecting:', err);
      });

      connection.onreconnected(() => {
        if (disposed || currentConnection !== connection) return;
        retryAttempt = 0;
        setSignalRStatus('connected');
        console.info('[ChatHub] reconnected');
        if (activeConvIdRef.current) {
          connection.invoke('JoinConversation', activeConvIdRef.current)
            .then(() => {
              console.info(`[ChatHub] rejoined conversation group: ${activeConvIdRef.current}`);
            })
            .catch(err => {
              console.error(`[ChatHub] failed to rejoin conversation group: ${activeConvIdRef.current}`, err);
            });
        }
      });

      connection.onclose(err => {
        if (disposed || currentConnection !== connection) return;
        currentConnection = null;
        setHubConnection(existing => existing === connection ? null : existing);
        setSignalRStatus('disconnected');
        console.warn('[ChatHub] disconnected:', err);
        scheduleFreshConnection();
      });

      try {
        await connection.start();
        if (disposed || currentConnection !== connection) {
          await connection.stop().catch(() => undefined);
          return;
        }
        retryAttempt = 0;
        setSignalRStatus('connected');
        setHubConnection(connection);
        console.info('[ChatHub] connected');
      } catch (err) {
        if (disposed || currentConnection !== connection) return;
        currentConnection = null;
        setHubConnection(existing => existing === connection ? null : existing);
        setSignalRStatus('failed');
        console.error('[ChatHub] connection failed:', err);
        await connection.stop().catch(() => undefined);
        scheduleFreshConnection();
      }
    };

    void connect();

    return () => {
      disposed = true;
      clearRetryTimer();
      const connection = currentConnection;
      currentConnection = null;
      connection?.stop().catch(() => undefined);
    };
  }, []);

  // Join/Leave SignalR conversation room
  useEffect(() => {
    if (!hubConnection || !activeConvId) return;

    void hubConnection
      .invoke('JoinConversation', activeConvId)
      .catch(err => {
        console.error(`✗ Failed to join SignalR conversation group: ${activeConvId}`, err);
      });

    return () => {
      hubConnection.invoke('LeaveConversation', activeConvId).catch(() => {});
    };
  }, [hubConnection, activeConvId]);

  // Subscribe to SignalR events
  useEffect(() => {
    if (!hubConnection) return;

    const handleReceiveMessage = (m: any) => {
      const mapped = { ...mapBackendMessage(m), sendStatus: 'sent' as const };
      const targetConvId = mapped.conversationId;
      if (!targetConvId) {
        console.warn('[ChatHub] Ignored a message without a conversation ID.');
        return;
      }
      if (mapped.schedule && targetConvId === activeConvIdRef.current) {
        syncOngoingSchedule(
          mapped.schedule.status === 0,
          mapped.schedule.scheduledAtUtc,
        );
      }

      setMessagesMap(prev => {
        const list = dedupeMessages(prev[targetConvId] ?? []);
        if (!prev[targetConvId] && targetConvId !== activeConvIdRef.current) {
          return prev;
        }

        const exists = list.some(
          msg =>
            msg.id === mapped.id ||
            msg.clientMessageId === m.clientMessageId ||
            (m.clientMessageId && msg.id === m.clientMessageId)
        );
        if (exists) {
          const isSameMessage = (msg: MsgMessage) =>
            msg.id === m.clientMessageId ||
            msg.id === mapped.id ||
            msg.clientMessageId === m.clientMessageId;
          const existingMessage = list.find(isSameMessage);
          const alreadyCurrentScheduleCard = mapped.schedule &&
            existingMessage?.schedule?.eventSequence === mapped.schedule.eventSequence &&
            list[list.length - 1]?.id === existingMessage.id;
          if (alreadyCurrentScheduleCard) return prev;

          return {
            ...prev,
            // A schedule card is one reusable message. When a new schedule
            // event arrives, move that card to the bottom/current event
            // position instead of replacing it where it was first created.
            [targetConvId]: mapped.schedule
              ? [...list.filter(msg => !isSameMessage(msg)), mapped]
              : list.map(msg => isSameMessage(msg) ? mapped : msg),
          };
        }
        return {
          ...prev,
          [targetConvId]: dedupeMessages([...list, mapped]),
        };
      });

      // If active conversation receives a message and it's from the other participant, mark it read immediately!
      if (targetConvId === activeConvIdRef.current && mapped.senderId !== user?.id) {
        markMessageReadOnce(
          activeConvIdRef.current,
          mapped.id,
          mapped.schedule?.eventSequence ?? mapped.createdAt,
        );
      }

      setConversationsState(prev =>
        sortConversations(
          prev.map(conversation => {
            if (conversation.id === targetConvId) {
              let lastMsgText = mapped.content || '';
              if (mapped.type === 'image') lastMsgText = '📷 Image';
              else if (mapped.type === 'file') lastMsgText = '📁 File';
              else if (mapped.type === 'deal') lastMsgText = '💼 Deal Proposal';

              return {
                ...conversation,
                lastMessage: lastMsgText,
                lastMessageAt: mapped.createdAt || new Date().toISOString(),
                unreadCount: conversation.id === activeConvIdRef.current ? 0 : conversation.unreadCount + 1,
              };
            }
            return conversation;
          })
        )
      );
    };

    const handleConversationUpdated = (event: any) => {
      const { conversationId, lastMessage, lastMessageAt, unreadCount } = event;

      setConversationsState(prev => {
        const exists = prev.some(c => c.id === conversationId);
        if (!exists) {
          loadConversations();
          return prev;
        }

        return sortConversations(
          prev.map(c => {
            if (c.id === conversationId) {
              let lastMsgText = '';
              if (lastMessage) {
                if (lastMessage.messageType === 1) lastMsgText = '📷 Image';
                else if (lastMessage.messageType === 2) lastMsgText = '📁 File';
                else if (lastMessage.messageType === 4) lastMsgText = '💼 Deal Proposal';
                else lastMsgText = lastMessage.content || '';
              }

              return {
                ...c,
                lastMessage: lastMsgText || c.lastMessage,
                lastMessageAt: lastMessageAt || c.lastMessageAt,
                unreadCount: conversationId === activeConvIdRef.current ? 0 : unreadCount,
              };
            }
            return c;
          })
        );
      });
    };

    const handleConversationRead = (event: any) => {
      const { conversationId, userId, messageId } = event;
      if (userId !== user?.id) {
        setMessagesMap(prev => {
          const list = prev[conversationId];
          if (!list) return prev;
          let changed = false;
          const next = list.map(m => {
            const sentAt = m.createdAt ? new Date(m.createdAt).getTime() : Number.POSITIVE_INFINITY;
            if (!m.isRead && (m.id === messageId || sentAt <= Date.now())) {
              changed = true;
              return { ...m, isRead: true };
            }
            return m;
          });
          if (!changed) return prev;
          return {
            ...prev,
            [conversationId]: next,
          };
        });
      }

      if (userId === user?.id) {
        setConversationsState(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
    };

    const handleOfferUpdate = () => {
      loadConversations();
      if (activeConvId) {
        messageGetAPI.getConversationMessages(activeConvId).then(res => {
          if (res.success && res.data) {
            setMessagesMap(prev => ({
              ...prev,
              [activeConvId]: dedupeMessages(res.data!.map(mapBackendMessage)),
            }));
          }
        });
      }
    };

    const refreshActiveMessages = () => {
      const conversationId = activeConvIdRef.current;
      if (!conversationId) return;

      messageGetAPI.getConversationMessages(conversationId).then(res => {
        if (res.success && res.data) {
          setMessagesMap(prev => ({
            ...prev,
            [conversationId]: res.data!.map(mapBackendMessage),
          }));
        }
      });
    };

    const handleContractWorkflowUpdate = (event: unknown) => {
      const eventConversationId = getEventValue(event, 'conversationId', 'ConversationId');
      const eventContractId = getEventValue(event, 'contractId', 'ContractId', 'contractsId', 'ContractsId');

      if (eventConversationId || eventContractId) {
        setConversationsState(prev =>
          prev.map(conversation => {
            const sameConversation = eventConversationId && conversation.id === eventConversationId;
            const sameContract = eventContractId && conversation.contractId === eventContractId;
            if (!sameConversation && !sameContract) return conversation;

            return {
              ...conversation,
              contractId: eventContractId ?? conversation.contractId,
              dealStatus: 'agreed',
            };
          })
        );
      }

      loadConversations();

      const activeConversationId = activeConvIdRef.current;
      const activeMatchesConversation = eventConversationId && eventConversationId === activeConversationId;
      const activeMatchesContract = eventContractId && eventContractId === activeConv?.contractId;
      if (!eventConversationId && !eventContractId || activeMatchesConversation || activeMatchesContract) {
        refreshActiveMessages();
      }
    };

    const handleMeetingChanged = (event: ScheduleMeetingChangedEvent) => {
      const { scheduleId, meeting } = event;
      if (!scheduleId || !meeting) return;
      setMessagesMap(prev => {
        const updated: Record<string, MsgMessage[]> = {};
        for (const [convId, msgs] of Object.entries(prev)) {
          updated[convId] = msgs.map(m => {
            const schedule = m.schedule;
            if (schedule?.scheduleId === scheduleId) {
              return {
                ...m,
                schedule: {
                  ...schedule,
                  meeting: {
                    ...meeting,
                    provider: meeting.provider ?? schedule.meeting?.provider ?? 0,
                    status: meeting.status,
                    organizerUserId: meeting.organizerUserId ?? schedule.meeting?.organizerUserId ?? '',
                    joinUri: meeting.joinUri,
                    failureCode: meeting.failureCode,
                    canRetry: meeting.canRetry ?? false,
                  },
                },
              };
            }
            return m;
          });
        }
        return updated;
      });
    };

    const handleScheduleChanged = (schedule: ScheduleEvent) => {
      if (!schedule?.scheduleId) return;
      if (schedule.conversationId === activeConvIdRef.current) {
        syncOngoingSchedule(schedule.status === 0, schedule.scheduledAtUtc);
      }
      setMessagesMap(prev => {
        let changed = false;
        const updated: Record<string, MsgMessage[]> = {};
        for (const [conversationId, messages] of Object.entries(prev)) {
          updated[conversationId] = dedupeMessages(messages.map(message => {
            if (message.id === schedule.scheduleMessageId &&
                message.schedule?.eventSequence !== schedule.eventSequence) {
              changed = true;
              return { ...message, schedule };
            }
            return message;
          }));
        }
        return changed ? updated : prev;
      });
    };

    hubConnection.on('ReceiveMessage', handleReceiveMessage);
    hubConnection.on('ConversationUpdated', handleConversationUpdated);
    hubConnection.on('ConversationRead', handleConversationRead);
    hubConnection.on('FinalOfferCreated', handleOfferUpdate);
    hubConnection.on('FinalOfferResponded', handleOfferUpdate);
    hubConnection.on('ContractDraftUpdated', handleContractWorkflowUpdate);
    hubConnection.on('ContractDetailsSubmitted', handleContractWorkflowUpdate);
    hubConnection.on('ContractDetailsChangeRequested', handleContractWorkflowUpdate);
    hubConnection.on('ContractReadyForEscrowFunding', handleContractWorkflowUpdate);
    hubConnection.on('ContractMilestonesAccepted', handleContractWorkflowUpdate);
    hubConnection.on('WorkspaceOpened', handleContractWorkflowUpdate);
    hubConnection.on('ScheduleMeetingChanged', handleMeetingChanged);
    hubConnection.on('ScheduleChanged', handleScheduleChanged);

    return () => {
      hubConnection.off('ReceiveMessage', handleReceiveMessage);
      hubConnection.off('ConversationUpdated', handleConversationUpdated);
      hubConnection.off('ConversationRead', handleConversationRead);
      hubConnection.off('FinalOfferCreated', handleOfferUpdate);
      hubConnection.off('FinalOfferResponded', handleOfferUpdate);
      hubConnection.off('ContractDraftUpdated', handleContractWorkflowUpdate);
      hubConnection.off('ContractDetailsSubmitted', handleContractWorkflowUpdate);
      hubConnection.off('ContractDetailsChangeRequested', handleContractWorkflowUpdate);
      hubConnection.off('ContractReadyForEscrowFunding', handleContractWorkflowUpdate);
      hubConnection.off('ContractMilestonesAccepted', handleContractWorkflowUpdate);
      hubConnection.off('WorkspaceOpened', handleContractWorkflowUpdate);
      hubConnection.off('ScheduleMeetingChanged', handleMeetingChanged);
      hubConnection.off('ScheduleChanged', handleScheduleChanged);
    };
  }, [hubConnection, activeConvId, activeConv?.contractId, loadConversations, markMessageReadOnce, syncOngoingSchedule, user]);

  // Close conv menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (convMenuRef.current && !convMenuRef.current.contains(e.target as Node)) {
        setShowConvMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll only when a message is added or removed. Schedule cards may update
  // and move chronologically without changing the message count; those updates
  // must not repeatedly pull the user away from the part of chat they are reading.
  useEffect(() => {
    const container = chatHistoryRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [activeMessages.length]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleRoom = (roomId: string) =>
    setOpenRooms(prev => ({ ...prev, [roomId]: !prev[roomId] }));

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setShowDealPrice(false);
    setShowConvMenu(false);
    setMessagesMap(prev => ({
      ...prev,
      [id]: (prev[id] ?? []).map(m => ({ ...m, isRead: true })),
    }));
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConvId || isActiveWorkspaceDisputed) return;
    const content = messageInput.trim();

    const clientMessageId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

    const pendingMsg: MsgMessage = {
      id: clientMessageId,
      clientMessageId,
      conversationId: activeConvId,
      senderId: user?.id ?? 'current_user',
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
      isRead: true,
      sendStatus: 'pending',
    };

    // Optimistically update UI messages
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), pendingMsg],
    }));
    setMessageInput('');

    // Optimistically update conversation preview in sidebar
    setConversationsState(prev =>
      sortConversations(
        prev.map(c =>
          c.id === activeConvId
            ? {
                ...c,
                lastMessage: content,
                lastMessageAt: pendingMsg.createdAt || new Date().toISOString(),
              }
            : c
        )
      )
    );

    try {
      const res = await messagePostAPI.sendMessage({
        conversationId: activeConvId,
        clientMessageId,
        content,
      });

      if (!res.success || !res.data) {
        console.error('[Messages] send failed response:', {
          conversationId: activeConvId,
          clientMessageId,
          response: res,
        });
        throw new Error(formatSendError(res));
      }

      const backendMsg = { ...mapBackendMessage(res.data), sendStatus: 'sent' as const };
      setMessagesMap(prev => {
        const list = prev[activeConvId] ?? [];
        const idx = list.findIndex(
          m =>
            m.id === clientMessageId ||
            m.id === backendMsg.id ||
            m.clientMessageId === clientMessageId
        );
        if (idx !== -1) {
          const newList = [...list];
          newList[idx] = backendMsg;
          return { ...prev, [activeConvId]: newList };
        }
        return { ...prev, [activeConvId]: [...list, backendMsg] };
      });
      setConversationsState(prev =>
        sortConversations(
          prev.map(c =>
            c.id === activeConvId
              ? {
                  ...c,
                  lastMessage: backendMsg.content,
                  lastMessageAt: backendMsg.createdAt || pendingMsg.createdAt || new Date().toISOString(),
                }
              : c
          )
        )
      );
    } catch (err) {
      const sendError = err instanceof Error ? err.message : 'Message was not saved.';
      console.error('[Messages] failed to send message:', {
        conversationId: activeConvId,
        clientMessageId,
        error: err,
      });
      setMessagesMap(prev => ({
        ...prev,
        [activeConvId]: (prev[activeConvId] ?? []).map(m =>
          m.id === clientMessageId || m.clientMessageId === clientMessageId
            ? { ...m, sendStatus: 'failed', sendError }
            : m
        ),
      }));
      setMessageInput(current => (current.trim() ? current : content));
      loadConversations();
    }
  };

  const validateDealMilestoneDraft = () => {
    const validation = validateNegotiationMilestones(dealMilestones);
    if (validation.valid) return true;

    const translatedErrors = Object.fromEntries(Object.entries(validation.errors).map(([field, code]) => [
      field,
      t(`messages.finalOfferEditor.validation.${code}`),
    ]));
    setDealMilestoneErrors(translatedErrors);
    if (validation.advancedIndexes.length > 0) {
      setDealAdvancedIndexes(indexes => Array.from(new Set([
        ...indexes,
        ...validation.advancedIndexes,
      ])).sort((left, right) => left - right));
    }
    setAnchorNotice(t(`messages.finalOfferEditor.validation.${validation.firstError || 'milestoneRequired'}`));
    const firstField = Object.keys(validation.errors)[0];
    if (firstField) {
      const parts = firstField.split('.');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const selector = parts[1] === 'workItems'
          ? `[data-work-item-field="${parts[0]}.${parts[2]}.${parts[3]}"]`
          : `[data-milestone-field="${parts[0]}.${parts[1]}"]`;
        const target = document.querySelector<HTMLElement>(selector);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus();
      }));
    }
    return false;
  };

  const handleProposeDeal = async () => {
    if (!activeConvId) return;
    if (!ensureActiveNegotiationEligible()) return;
    if (!validateDealMilestoneDraft()) return;
    const normalizedMilestones = resolvedDealMilestones;
    const price = dealMilestoneTotal;

    try {
      setDealMilestonesSaving(true);
      const res = await messagePostAPI.createFinalOffer({
        conversationId: activeConvId,
        finalPrice: price,
        scopeSummary: t('messages.finalOfferEditor.scopeSummary'),
        milestones: normalizedMilestones,
      });
      setDealMilestonesSaving(false);
      if (!res.success || !res.data) {
        throw new Error(res.message || t('messages.finalOfferEditor.submitFailed'));
      }

      const offerId = String(res.data);
      setConversationsState(prev =>
        prev.map(c =>
          c.id === activeConvId
            ? {
                ...c,
                dealStatus: 'pending_freelancer',
                proposedPrice: price.toString(),
                lastOfferId: offerId,
                job: {
                  ...c.job,
                  budget: `${price} G-coin`,
                },
              }
            : c
        )
      );
      setDealStatusMap(prev => ({ ...prev, [activeConvId]: 'pending_freelancer' }));
      setDealMilestoneErrors({});
      setShowDealPrice(false);
      loadConversations();
    } catch (err) {
      setDealMilestonesSaving(false);
      const message = err instanceof Error ? err.message : t('messages.finalOfferEditor.submitFailed');
      setAnchorNotice(message);
      console.error('Failed to propose deal:', err);
    }
  };

  const handleSaveDealMilestones = async () => {
    if (!activeConvId) return;
    if (!ensureActiveNegotiationEligible()) return;
    if (!validateDealMilestoneDraft()) return;
    setDealMilestonesSaving(true);
    const normalized = resolvedDealMilestones;
    try {
      const response = await messagePutAPI.updateNegotiationMilestonePlan(activeConvId, { milestones: normalized });
      if (!response.success) {
        setAnchorNotice(response.message || t('messages.finalOfferEditor.saveFailed'));
        return;
      }
      const prepared = prepareNegotiationMilestonesForEditing(response.data || normalized);
      setDealMilestones(prepared.milestones);
      setDealAdvancedIndexes(prepared.advancedIndexes);
      setDealMilestoneErrors({});
      setAnchorNotice(t('messages.finalOfferEditor.saved'));
    } catch (error) {
      setAnchorNotice(error instanceof Error ? error.message : t('messages.finalOfferEditor.saveFailed'));
    } finally {
      setDealMilestonesSaving(false);
    }
  };

  const handleAcceptDeal = async (negotiationOfferId?: string | null, offeredAmount?: number) => {
    const offerId = negotiationOfferId ?? activeConv?.lastOfferId;
    if (!offerId || !activeConvId) return;
    if (!ensureActiveNegotiationEligible()) return;

    const jobAmount = offeredAmount ?? Number(activeConv?.proposedPrice);
    if (!Number.isFinite(jobAmount) || jobAmount <= 0) {
      setAnchorNotice(t('serviceFee.unableDetermineJobAmount'));
      return;
    }

    setAcceptFeeDialog({
      offerId,
      jobAmount,
      balance: null,
      mode: 'confirmation',
      loadingBalance: true,
      error: null,
    });

    const walletResponse = await walletGetAPI.getMyWallet();
    setAcceptFeeDialog(current => {
      if (!current || current.offerId !== offerId) return current;
      return {
        ...current,
        // Service fee is an in-platform payment, spendable from either pool.
        balance: walletResponse.success && walletResponse.data
          ? walletResponse.data.totalSpendableGigCoin
          : null,
        loadingBalance: false,
        error: walletResponse.success
          ? null
          : walletResponse.message || t('serviceFee.unableLoadBalance'),
      };
    });
  };

  const closeAcceptFeeDialog = () => {
    if (isAcceptingDeal) return;
    setAcceptFeeDialog(null);
  };

  const openWalletTopUp = () => {
    setAcceptFeeDialog(null);
    navigate('/wallet/deposit');
  };

  const confirmAcceptDeal = async () => {
    if (!acceptFeeDialog || !activeConvId || isAcceptingDeal) return;
    if (!ensureActiveNegotiationEligible()) {
      setAcceptFeeDialog(null);
      return;
    }

    const serviceFee = calculateServiceFee(acceptFeeDialog.jobAmount);
    if (acceptFeeDialog.balance === null) return;
    if (acceptFeeDialog.balance < serviceFee) {
      setAcceptFeeDialog(current => current ? { ...current, mode: 'insufficient', error: null } : current);
      return;
    }

    setIsAcceptingDeal(true);
    setAcceptFeeDialog(current => current ? { ...current, error: null } : current);
    try {
      const res = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: acceptFeeDialog.offerId,
        response: 0, // Accept
      });
      if (!res.success) {
        if (isInsufficientServiceFeeError(res.message)) {
          setAcceptFeeDialog(current => current ? { ...current, mode: 'insufficient', error: null } : current);
          return;
        }

        setAcceptFeeDialog(current => current
          ? { ...current, error: res.message || t('serviceFee.failedAcceptJob') }
          : current);
        return;
      }

      const responseMessage = res.data?.message ?? res.message ?? null;
      const acceptedContractId = res.data?.contractId ?? activeConv?.contractId ?? null;
      setAcceptFeeDialog(null);
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
      setConversationsState(prev =>
        prev.map(c =>
          c.id === activeConvId
            ? { ...c, contractId: acceptedContractId ?? c.contractId, dealStatus: 'agreed' }
            : c
        )
      );
      setDealStatusMap(prev => ({ ...prev, [activeConvId]: 'agreed' }));
      loadConversations();

      if (!isClient) {
        if (acceptedContractId) {
          navigate(`/contracts/${acceptedContractId}`);
          return;
        }

        if (activeConv?.job.id) {
          const contractRes = await contractGetAPI.getContractByJobPost(activeConv.job.id);
          if (contractRes.success && contractRes.data?.contractsId) {
            navigate(`/contracts/${contractRes.data.contractsId}`);
            return;
          }
        }

        setAnchorNotice(responseMessage || 'Final budget accepted. Contract is being prepared for signing.');
      }
    } catch (err) {
      console.error('Failed to accept deal:', err);
      const message = err instanceof Error ? err.message : 'Failed to accept deal.';
      setAcceptFeeDialog(current => current ? { ...current, error: message } : current);
    } finally {
      setIsAcceptingDeal(false);
    }
  };

  const handleDeclineDeal = async (negotiationOfferId?: string | null) => {
    const offerId = negotiationOfferId ?? activeConv?.lastOfferId;
    if (!offerId || !activeConvId) return;
    if (!ensureActiveNegotiationEligible()) return;
    try {
      const res = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: offerId,
        response: 2, // Decline
      });
      if (!res.success) {
        throw new Error(res.message || 'Failed to decline deal.');
      }

      setConversationsState(prev =>
        prev.map(c => (c.id === activeConvId ? { ...c, dealStatus: 'declined' } : c))
      );
      setDealStatusMap(prev => ({ ...prev, [activeConvId]: 'declined' }));
      loadConversations();
    } catch (err) {
      console.error('Failed to decline deal:', err);
    }
  };

  const handleOpenAcceptedContract = async () => {
    const openContract = (contract: ContractDto) => {
      const route = getContractWorkflowRoute(contract, isClient);
      if (route.path) {
        navigate(route.path);
        return;
      }

      setAnchorNotice(route.waitMessage || 'Waiting for the other party to continue the contract flow.');
    };

    if (activeConv?.contractId) {
      try {
        const res = await contractGetAPI.getContractById(activeConv.contractId);
        if (res.success && res.data) {
          openContract(res.data);
          return;
        }
      } catch (err) {
        console.error('Failed to load active contract:', err);
      }

      navigate(`/contracts/${activeConv.contractId}`);
      return;
    }

    if (!activeConv?.job.id) {
      const message = 'Cannot open contract because this conversation has no project reference.';
      setAnchorNotice(message);
      console.error(message);
      return;
    }

    try {
      // ContractDraftUpdated and the refreshed conversation normally provide
      // contractId. Resolve by JobPost as a race-safe fallback while SignalR and
      // the conversation list are still synchronizing.
      const res = await contractGetAPI.getContractByJobPost(activeConv.job.id);
      if (res.success && res.data?.contractsId) {
        openContract(res.data);
        return;
      }

      setAnchorNotice(res.message || 'The contract is still being prepared. Please try again.');
      console.error('Cannot open contract from project:', res);
    } catch (err) {
      setAnchorNotice('Unable to open the contract. Please try again.');
      console.error('Failed to open accepted contract:', err);
    }
  };

  // ── "Vào vòng đàm phán" – Client confirm move directly without waiting ────
  const handleSendNegotiationRequest = useCallback(() => {
    if (!ensureActiveNegotiationEligible()) {
      setShowConvMenu(false);
      return;
    }

    setShowConvMenu(false);
    setShowNegModal(true);
  }, [ensureActiveNegotiationEligible]);

  const handleConfirmMoveToNegotiation = async () => {
    setShowNegModal(false);
    if (!activeConv?.proposalId) return;
    if (!ensureActiveNegotiationEligible()) return;

    try {
      await messagePostAPI.startNegotiationFromProposal(activeConv.proposalId);
    } catch (err) {
      console.error('Failed to move to negotiation:', err);
    }
  };

  const openCreateSchedule = (addGoogleMeet = false) => {
    if (!isClient || hasOngoingSchedule || checkingOngoingSchedule) return;
    setScheduleMode('create'); setEditingSchedule(null); setScheduleTitle(''); setScheduleDetails('');
    setScheduleTime(''); setScheduleReason(''); setScheduleError(''); setScheduleConflict(null); setMidnightConfirmed(false); setScheduleAddGoogleMeet(addGoogleMeet); setScheduleSendEmail(true); setShowScheduleModal(true);
  };

  const openEditSchedule = (schedule: ScheduleEvent) => {
    const vietnam = new Date(new Date(schedule.scheduledAtUtc).getTime() + 7 * 3600_000).toISOString().slice(0, 16);
    setScheduleMode('edit'); setEditingSchedule(schedule); setScheduleTitle(schedule.title);
    setScheduleDetails(schedule.details || ''); setScheduleTime(vietnam); setScheduleError(''); setScheduleConflict(null); setMidnightConfirmed(Number(vietnam.slice(11, 13)) >= 2); setShowScheduleModal(true);
  };

  const openCancelSchedule = (schedule: ScheduleEvent) => {
    setScheduleMode('cancel'); setEditingSchedule(schedule); setScheduleReason(''); setScheduleError(''); setScheduleConflict(null); setShowScheduleModal(true);
  };

  const openCounterProposal = (schedule: ScheduleEvent, edit = false) => {
    const vietnam = edit
      ? new Date(new Date(schedule.proposedScheduledAtUtc || schedule.scheduledAtUtc).getTime() + 7 * 3600_000).toISOString().slice(0, 16)
      : '';
    setScheduleMode(edit ? 'counter-edit' : 'counter-create'); setEditingSchedule(schedule);
    setScheduleTime(vietnam); setScheduleError(''); setScheduleConflict(null);
    setMidnightConfirmed(edit && Number(vietnam.slice(11, 13)) >= 2); setShowScheduleModal(true);
  };

  const applyLatestSchedule = (scheduleId: string, latest: ScheduleResponse) => {
    if (!activeConvId) return;
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: (prev[activeConvId] || []).map(message =>
        message.schedule?.scheduleId === scheduleId
          ? { ...message, schedule: { ...message.schedule, ...latest } }
          : message),
    }));
  };

  const respondToSchedule = async (schedule: ScheduleEvent, action: 'accept' | 'reject') => {
    if (scheduleActionId) return;
    setScheduleActionId(schedule.scheduleId); setAnchorNotice('');
    try {
      const response = action === 'accept'
        ? await scheduleAPI.accept(schedule.scheduleId, schedule.version)
        : await scheduleAPI.reject(schedule.scheduleId, schedule.version);
      if (!response.success || !response.data) {
        if (response.statusCode === 409) {
          const latest = await scheduleAPI.get(schedule.scheduleId);
          if (latest.success && latest.data) applyLatestSchedule(schedule.scheduleId, latest.data);
        }
        setAnchorNotice(response.message || `Unable to ${action} schedule.`);
        return;
      }
      syncOngoingSchedule(
        response.data.schedule.status === 0,
        response.data.schedule.scheduledAtUtc,
      );
      if (action === 'reject' && schedule.agreementStatus === 1) {
        const rejectedEvent = response.data.message?.schedule;
        if (rejectedEvent) openCounterProposal(rejectedEvent, false);
      }
    } finally {
      setScheduleActionId(null);
    }
  };

  const retryGoogleMeet = async (schedule: ScheduleEvent) => {
    const response = await scheduleAPI.retryMeeting(schedule.scheduleId);
    if (!response.success) {
      const message = response.message || 'Unable to retry Google Meet creation.';
      if (message.includes('connected')) {
        setAnchorNotice('Google Meet access is missing. Reconnect your Google account to continue.');
        await connectGoogleMeet();
      } else {
        setAnchorNotice(message);
      }
      return;
    }

    if (response.data?.schedule) {
      applyLatestSchedule(schedule.scheduleId, response.data.schedule);
    }
    setAnchorNotice('Retrying Google Meet creation...');

    for (let attempt = 0; attempt < MEETING_STATUS_POLL_ATTEMPTS; attempt++) {
      await wait(MEETING_STATUS_POLL_INTERVAL_MS);
      if (activeConvIdRef.current !== schedule.conversationId) return;

      const latest = await scheduleAPI.get(schedule.scheduleId);
      if (!latest.success || !latest.data) continue;

      applyLatestSchedule(schedule.scheduleId, latest.data);
      const meetingStatus = latest.data.meeting?.status;
      if (meetingStatus === 2) {
        setAnchorNotice('Google Meet room is ready.');
        return;
      }
      if (meetingStatus === 3) {
        setAnchorNotice('Google Meet creation failed. You can retry again.');
        return;
      }
    }

    setAnchorNotice('Google Meet creation is taking longer than expected. Reopen the conversation to refresh its status.');
  };

  const submitSchedule = async () => {
    if (!activeConvId) return;
    if (scheduleMode === 'create' && scheduleAddGoogleMeet) {
      const status = googleMeetStatus?.isConnected ? googleMeetStatus : await refreshGoogleMeetStatus();
      if (!status?.isConnected) {
        setScheduleError('Connect your Google account before adding a Google Meet room.');
        return;
      }
    }
    setScheduleSaving(true); setScheduleError('');
    const scheduledAt = scheduleTime ? `${scheduleTime}:00+07:00` : '';
    let res;
    if (scheduleMode === 'create') res = await scheduleAPI.create({ conversationId: activeConvId, title: scheduleTitle, details: scheduleDetails || undefined, scheduledAt, timeZoneId: 'Asia/Ho_Chi_Minh', addGoogleMeet: scheduleAddGoogleMeet, sendEmailNotification: scheduleSendEmail });
    else if (scheduleMode === 'edit' && editingSchedule) res = await scheduleAPI.update(editingSchedule.scheduleId, { title: scheduleTitle, details: scheduleDetails || undefined, scheduledAt, expectedVersion: editingSchedule.version });
    else if (scheduleMode === 'cancel' && editingSchedule) res = await scheduleAPI.cancel(editingSchedule.scheduleId, { reason: scheduleReason, expectedVersion: editingSchedule.version });
    else if (scheduleMode === 'counter-create' && editingSchedule) res = await scheduleAPI.createCounterProposal(editingSchedule.scheduleId, { scheduledAt, expectedVersion: editingSchedule.version, timeZoneId: 'Asia/Ho_Chi_Minh' });
    else if (scheduleMode === 'counter-edit' && editingSchedule) res = await scheduleAPI.updateCounterProposal(editingSchedule.scheduleId, { scheduledAt, expectedVersion: editingSchedule.version, timeZoneId: 'Asia/Ho_Chi_Minh' });
    if (!res || !res.success) {
      if (res?.statusCode === 409 && editingSchedule) {
        const latest = await scheduleAPI.get(editingSchedule.scheduleId);
        if (latest.success && latest.data) {
          setScheduleError(`This schedule changed. ${latest.data.remainingEdits} edit${latest.data.remainingEdits === 1 ? '' : 's'} remain. Review the latest card before retrying.`);
          setScheduleConflict({ version: latest.data.version, remainingEdits: latest.data.remainingEdits });
        } else setScheduleError(res.message || 'The schedule changed.');
      } else setScheduleError(res?.message || 'Unable to save schedule.');
      setScheduleSaving(false); return;
    }
    if (res.data?.schedule) {
      syncOngoingSchedule(
        res.data.schedule.status === 0,
        res.data.schedule.scheduledAtUtc,
      );
    }
    setShowScheduleModal(false); setScheduleSaving(false);
  };

  const confirmScheduleRetry = () => {
    if (!editingSchedule || !scheduleConflict) return;
    setEditingSchedule({ ...editingSchedule, version: scheduleConflict.version, remainingEdits: scheduleConflict.remainingEdits });
    setScheduleConflict(null);
    setScheduleError(scheduleConflict.remainingEdits === 1 ? 'Retry confirmed. Saving will consume the final shared edit.' : 'Retry confirmed against the latest schedule version.');
  };

  const isMe = (senderId?: string) =>
    senderId === (user?.id ?? 'current_user') || senderId === 'current_user';

  return {
    user,
    role,
    isClient,
    loading,
    signalRStatus,
    navigate,
    openRooms,
    setOpenRooms,
    conversationsState,
    setConversationsState,
    activeConvId,
    setActiveConvId,
    activeConv,
    isActiveWorkspaceDisputed,
    activeWorkspaceDisputeId,
    messagesMap,
    setMessagesMap,
    activeMessages,
    dealStatusMap,
    setDealStatusMap,
    dealStatus,
    showInfo,
    setShowInfo,
    showDealPrice,
    setShowDealPrice,
    dealMilestones: dealEditorMilestones,
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
    formatTime,
    showScheduleModal, setShowScheduleModal, scheduleMode, editingSchedule, scheduleTitle, setScheduleTitle,
    scheduleDetails, setScheduleDetails, scheduleTime, setScheduleTime, scheduleReason, setScheduleReason,
    scheduleError, scheduleSaving, scheduleActionId, openCreateSchedule, openEditSchedule, openCancelSchedule,
    openCounterProposal, respondToSchedule, retryGoogleMeet, submitSchedule,
    scheduleConflict, confirmScheduleRetry, midnightConfirmed, setMidnightConfirmed, scheduleAddGoogleMeet, setScheduleAddGoogleMeet,
    scheduleSendEmail, setScheduleSendEmail,
    googleMeetStatus, googleMeetStatusLoading, googleMeetConnecting, connectGoogleMeet,
    highlightedMessageId, anchorNotice, setAnchorNotice,
    hasOngoingSchedule, checkingOngoingSchedule,
  };
}
