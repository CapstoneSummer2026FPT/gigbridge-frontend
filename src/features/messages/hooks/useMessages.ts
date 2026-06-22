import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import {
  type MsgConversation,
  type MsgMessage,
} from '../mock/data-for-MessagesScreen';

import { UserRole } from '../../../types';
import * as signalR from '@microsoft/signalr';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { getChatHubUrl } from '../../../service/apiService';
import { scheduleAPI, type ScheduleEvent, type ScheduleMeetingResponse, type ScheduleResponse } from '../../../api/scheduleAPI';
import { googleMeetAPI, type GoogleMeetConnectionStatus } from '../../../api/googleMeetAPI';

interface ScheduleMeetingChangedEvent {
  scheduleId: string;
  meeting: ScheduleMeetingResponse;
}

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
  const isClient = c.otherParticipantRole === 0;
  const isInvited = c.conversationType === 4;
  return {
    id: c.conversationId,
    proposalId: c.proposalId ?? c.ProposalId ?? null,
    roomType: isInvited ? 'invited' : 'negotiation',
    roomId: isInvited ? 'room_invited' : 'room_negotiation',
    participantId: c.otherParticipantId || '',
    participantName: c.otherParticipantName || 'Partner',
    participantAvatar: c.otherParticipantAvatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=partner',
    participantRole: c.otherParticipantRoleTitle || (isClient ? 'Client' : 'Freelancer'),
    participantCompany: c.otherParticipantCompany || '',
    participantOnline: true,
    job: {
      id: c.jobPostId || '',
      title: c.title || 'Untitled Job',
      budget: c.lastOfferPrice ? `$${c.lastOfferPrice}` : 'N/A',
      category: '',
    },
    lastMessage: c.lastMessage?.content || '',
    lastMessageAt: c.lastMessageAt || c.createdAt || new Date().toISOString(),
    unreadCount: c.unreadCount || 0,
    isMuted: false,
    dealStatus: mapOfferStatusToDealStatus(c.lastOfferStatus),
    proposedPrice: c.lastOfferPrice ? c.lastOfferPrice.toString() : undefined,
    conversationType: c.conversationType,
    lastOfferId: c.lastOfferId,
  };
}

function mapBackendMessage(m: any): MsgMessage {
  let msgType = 'text';
  if (m.messageType === 1) msgType = 'image';
  else if (m.messageType === 2) msgType = 'file';
  else if (m.messageType === 3) msgType = 'system';
  else if (m.messageType === 4) msgType = 'deal';
  else if (m.messageType === 9) msgType = 'schedule';

  let dealStatus: MsgMessage['dealStatus'] = undefined;
  if (m.messageType === 4) {
    dealStatus = 'pending_freelancer'; // Default
  }

  const firstAttachment = m.attachments && m.attachments.length > 0 ? m.attachments[0] : null;
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
    type: msgType,
    createdAt: m.sentAt,
    isRead: true,
    fileUrl: firstAttachment?.fileUrl,
    fileName: firstAttachment?.fileName,
    dealStatus: dealStatus,
    schedule,
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

export function useMessages() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isClient = role === UserRole.Client;

  // ── Room expand state ────────────────────────────────────────────────────
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({
    room_invited: true,
    room_negotiation: true,
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

  // ── Messages map ─────────────────────────────────────────────────────────
  const [messagesMap, setMessagesMap] = useState<Record<string, MsgMessage[]>>({});
  const activeMessages = useMemo(
    () => dedupeMessages(messagesMap[activeConvId] ?? []),
    [messagesMap, activeConvId]
  );

  // ── Deal state per conversation ──────────────────────────────────────────
  const [dealStatusMap, setDealStatusMap] = useState<Record<string, MsgConversation['dealStatus']>>({});
  const dealStatus = dealStatusMap[activeConvId] ?? 'idle';

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showInfo, setShowInfo] = useState(true);
  const [showDealPrice, setShowDealPrice] = useState(false);
  const [dealPriceInput, setDealPriceInput] = useState('');
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
  const [googleMeetStatus, setGoogleMeetStatus] = useState<GoogleMeetConnectionStatus | null>(null);
  const [googleMeetStatusLoading, setGoogleMeetStatusLoading] = useState(false);
  const [googleMeetConnecting, setGoogleMeetConnecting] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [anchorNotice, setAnchorNotice] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const secondModeRef = useRef(false);
  const [hasOngoingSchedule, setHasOngoingSchedule] = useState(false);
  const [checkingOngoingSchedule, setCheckingOngoingSchedule] = useState(false);
  const convMenuRef = useRef<HTMLDivElement>(null);

  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
  const [signalRStatus, setSignalRStatus] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>('idle');
  const [loading, setLoading] = useState(true);

  const negStatus = activeConv?.roomId === 'room_negotiation' ? 'accepted' : 'idle';

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
                messagePostAPI.markAsRead(activeConvId, lastMsg.id).catch(() => {});
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
  }, [activeConvId]);

  useEffect(() => {
    if (!activeConvId) {
      setHasOngoingSchedule(false);
      return;
    }
    let current = true;
    setCheckingOngoingSchedule(true);
    scheduleAPI.getOngoing(activeConvId).then(response => {
      if (current) setHasOngoingSchedule(Boolean(response.success && response.data?.hasOngoingSchedule));
    }).finally(() => { if (current) setCheckingOngoingSchedule(false); });
    return () => { current = false; };
  }, [activeConvId]);

  // One adaptive timer drives every visible schedule countdown.
  useEffect(() => {
    const schedules = activeMessages.map(m => m.schedule).filter(Boolean) as ScheduleEvent[];
    const nearest = schedules.filter(s => s.status === 0).reduce((min, s) => Math.min(min, new Date(s.scheduledAtUtc).getTime() - Date.now()), Infinity);
    if (!secondModeRef.current && nearest <= 5 * 60_000) secondModeRef.current = true;
    else if (secondModeRef.current && nearest > 6 * 60_000) secondModeRef.current = false;
    const delay = secondModeRef.current ? 1000 : 60_000 - (Date.now() % 60_000);
    if (document.hidden) return;
    const id = window.setTimeout(() => setNowMs(Date.now()), Math.max(250, delay));
    const visible = () => { if (!document.hidden) setNowMs(Date.now()); };
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearTimeout(id); document.removeEventListener('visibilitychange', visible); };
  }, [activeMessages, nowMs]);

  // Resolve notification deep links, including messages outside the latest page.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversationId');
    const messageId = params.get('messageId');
    if (!conversationId || !messageId || activeConvId !== conversationId || !messagesMap[conversationId]) return;
    const existing = messagesMap[conversationId].some(m => m.id === messageId);
    const finish = () => {
      setHighlightedMessageId(messageId);
      window.setTimeout(() => setHighlightedMessageId(current => current === messageId ? null : current), 3000);
      window.setTimeout(() => document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      messagePostAPI.markAsRead(conversationId, messageId).catch(() => {});
    };
    if (existing) { finish(); return; }
    messageGetAPI.getMessagesAround(conversationId, messageId).then(res => {
      if (!res.success || !res.data) { setAnchorNotice('Original schedule event is unavailable.'); return; }
      setMessagesMap(prev => {
        const merged = [...(prev[conversationId] ?? []), ...res.data!.map(mapBackendMessage)];
        return { ...prev, [conversationId]: Array.from(new Map(merged.map(m => [m.id, m])).values()).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) };
      });
      window.setTimeout(finish, 80);
    });
  }, [location.search, activeConvId, messagesMap]);

  // Connect to SignalR
  useEffect(() => {
    const hubUrl = getChatHubUrl();
    const token = localStorage.getItem('access_token');

    if (!token) {
      setSignalRStatus('disconnected');
      console.warn('[ChatHub] skipped connection: no access token found');
      return;
    }

    let disposed = false;
    setSignalRStatus('connecting');
    console.info('[ChatHub] connecting:', hubUrl);

    const connection = new signalR.HubConnectionBuilder()
      .configureLogging(signalR.LogLevel.Warning)
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    connection.onreconnecting(err => {
      if (disposed) return;
      setSignalRStatus('reconnecting');
      console.warn('[ChatHub] reconnecting:', err);
    });

    connection.onreconnected(() => {
      if (disposed) return;
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
      if (disposed) return;
      setSignalRStatus('disconnected');
      setHubConnection(null);
      console.warn('[ChatHub] disconnected:', err);
    });

    connection
      .start()
      .then(() => {
        if (disposed) {
          connection.stop().catch(() => {});
          return;
        }
        setSignalRStatus('connected');
        console.info('[ChatHub] connected');
        setHubConnection(connection);
      })
      .catch(err => {
        if (disposed) return;
        setSignalRStatus('failed');
        console.error('[ChatHub] connection failed:', err);
      });

    return () => {
      disposed = true;
      connection.stop().catch(() => {});
    };
  }, []);

  // Join/Leave SignalR conversation room
  useEffect(() => {
    if (!hubConnection || !activeConvId) return;

    hubConnection
      .invoke('JoinConversation', activeConvId)
      .then(() => {
        console.log(`✓ Joined SignalR conversation group: ${activeConvId}`);
      })
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
      if (mapped.schedule && targetConvId === activeConvIdRef.current) {
        setHasOngoingSchedule(mapped.schedule.status === 0 && new Date(mapped.schedule.scheduledAtUtc).getTime() > Date.now());
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
          return {
            ...prev,
            [targetConvId]: list.map(msg =>
              msg.id === m.clientMessageId ||
              msg.id === mapped.id ||
              msg.clientMessageId === m.clientMessageId
                ? mapped
                : msg
            ),
          };
        }
        return {
          ...prev,
          [targetConvId]: dedupeMessages([...list, mapped]),
        };
      });

      // If active conversation receives a message and it's from the other participant, mark it read immediately!
      if (targetConvId === activeConvIdRef.current && mapped.senderId !== user?.id) {
        messagePostAPI.markAsRead(activeConvIdRef.current, mapped.id).catch(() => {});
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
          return {
            ...prev,
            [conversationId]: list.map(m => {
              if (m.id === messageId || new Date(m.createdAt).getTime() <= new Date().getTime()) {
                return { ...m, isRead: true };
              }
              return m;
            }),
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
      setMessagesMap(prev => {
        const updated: Record<string, MsgMessage[]> = {};
        for (const [conversationId, messages] of Object.entries(prev)) {
          updated[conversationId] = dedupeMessages(messages.map(message =>
            message.id === schedule.scheduleMessageId
              ? { ...message, schedule }
              : message
          ));
        }
        return updated;
      });
    };

    hubConnection.on('ReceiveMessage', handleReceiveMessage);
    hubConnection.on('ConversationUpdated', handleConversationUpdated);
    hubConnection.on('ConversationRead', handleConversationRead);
    hubConnection.on('FinalOfferCreated', handleOfferUpdate);
    hubConnection.on('FinalOfferResponded', handleOfferUpdate);
    hubConnection.on('ScheduleMeetingChanged', handleMeetingChanged);
    hubConnection.on('ScheduleChanged', handleScheduleChanged);

    return () => {
      hubConnection.off('ReceiveMessage', handleReceiveMessage);
      hubConnection.off('ConversationUpdated', handleConversationUpdated);
      hubConnection.off('ConversationRead', handleConversationRead);
      hubConnection.off('FinalOfferCreated', handleOfferUpdate);
      hubConnection.off('FinalOfferResponded', handleOfferUpdate);
      hubConnection.off('ScheduleMeetingChanged', handleMeetingChanged);
      hubConnection.off('ScheduleChanged', handleScheduleChanged);
    };
  }, [hubConnection, activeConvId, loadConversations, user]);

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

  // Keep schedule/chat updates inside the message scroller. scrollIntoView here
  // can move the entire application viewport and make the composer appear locked.
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
    if (!messageInput.trim() || !activeConvId) return;
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

  const handleProposeDeal = async () => {
    if (!dealPriceInput.trim()) return;
    const price = parseFloat(dealPriceInput);
    if (isNaN(price)) return;

    try {
      await messagePostAPI.createFinalOffer({
        conversationId: activeConvId,
        finalPrice: price,
        scopeSummary: 'Proposed price',
      });
      setDealPriceInput('');
      setShowDealPrice(false);
    } catch (err) {
      console.error('Failed to propose deal:', err);
    }
  };

  const handleAcceptDeal = async (msgId: string, amount: string) => {
    if (!activeConv?.lastOfferId) return;
    try {
      await messagePostAPI.respondFinalOffer({
        negotiationOfferId: activeConv.lastOfferId,
        response: 0, // Accept
      });
    } catch (err) {
      console.error('Failed to accept deal:', err);
    }
  };

  const handleDeclineDeal = async (msgId: string) => {
    if (!activeConv?.lastOfferId) return;
    try {
      await messagePostAPI.respondFinalOffer({
        negotiationOfferId: activeConv.lastOfferId,
        response: 2, // Decline
      });
    } catch (err) {
      console.error('Failed to decline deal:', err);
    }
  };

  // ── "Vào vòng đàm phán" – Client confirm move directly without waiting ────
  const handleSendNegotiationRequest = useCallback(() => {
    setShowConvMenu(false);
    setShowNegModal(true);
  }, []);

  const handleConfirmMoveToNegotiation = async () => {
    setShowNegModal(false);
    if (!activeConv?.proposalId) return;

    try {
      await messagePostAPI.startNegotiationFromProposal(activeConv.proposalId);
    } catch (err) {
      console.error('Failed to move to negotiation:', err);
    }
  };

  const openCreateSchedule = (addGoogleMeet = false) => {
    if (!isClient || hasOngoingSchedule || checkingOngoingSchedule) return;
    setScheduleMode('create'); setEditingSchedule(null); setScheduleTitle(''); setScheduleDetails('');
    setScheduleTime(''); setScheduleReason(''); setScheduleError(''); setScheduleConflict(null); setMidnightConfirmed(false); setScheduleAddGoogleMeet(addGoogleMeet); setShowScheduleModal(true);
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
      ? new Date(new Date(schedule.scheduledAtUtc).getTime() + 7 * 3600_000).toISOString().slice(0, 16)
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
      if (action === 'reject' && schedule.agreementStatus === 1) {
        const rejectedEvent = response.data.message?.schedule;
        if (rejectedEvent) openCounterProposal(rejectedEvent, false);
      } else if (action === 'reject') {
        setHasOngoingSchedule(false);
      }
    } finally {
      setScheduleActionId(null);
    }
  };

  const retryGoogleMeet = async (schedule: ScheduleEvent) => {
    const response = await scheduleAPI.retryMeeting(schedule.scheduleId);
    if (!response.success) {
      setAnchorNotice(response.message || 'Unable to retry Google Meet creation.');
      return;
    }

    setAnchorNotice('Retrying Google Meet creation...');
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
    if (scheduleMode === 'create') res = await scheduleAPI.create({ conversationId: activeConvId, title: scheduleTitle, details: scheduleDetails || undefined, scheduledAt, timeZoneId: 'Asia/Ho_Chi_Minh', addGoogleMeet: scheduleAddGoogleMeet });
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
    if (scheduleMode === 'create') setHasOngoingSchedule(true);
    if (scheduleMode === 'cancel') setHasOngoingSchedule(false);
    setShowScheduleModal(false); setScheduleSaving(false);
  };

  const confirmScheduleRetry = () => {
    if (!editingSchedule || !scheduleConflict) return;
    setEditingSchedule({ ...editingSchedule, version: scheduleConflict.version, remainingEdits: scheduleConflict.remainingEdits });
    setScheduleConflict(null);
    setScheduleError(scheduleConflict.remainingEdits === 1 ? 'Retry confirmed. Saving will consume the final shared edit.' : 'Retry confirmed against the latest schedule version.');
  };

  const isMe = (senderId: string) =>
    senderId === (user?.id ?? 'current_user') || senderId === 'current_user';

  const totalUnread = conversationsState.reduce((sum, c) => sum + c.unreadCount, 0);

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
    dealPriceInput,
    setDealPriceInput,
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
    handleDeclineDeal,
    handleSendNegotiationRequest,
    handleConfirmMoveToNegotiation,
    isMe,
    totalUnread,
    formatTime,
    showScheduleModal, setShowScheduleModal, scheduleMode, editingSchedule, scheduleTitle, setScheduleTitle,
    scheduleDetails, setScheduleDetails, scheduleTime, setScheduleTime, scheduleReason, setScheduleReason,
    scheduleError, scheduleSaving, scheduleActionId, openCreateSchedule, openEditSchedule, openCancelSchedule,
    openCounterProposal, respondToSchedule, retryGoogleMeet, submitSchedule,
    scheduleConflict, confirmScheduleRetry, midnightConfirmed, setMidnightConfirmed, scheduleAddGoogleMeet, setScheduleAddGoogleMeet,
    googleMeetStatus, googleMeetStatusLoading, googleMeetConnecting, connectGoogleMeet,
    nowMs, highlightedMessageId, anchorNotice, setAnchorNotice,
    hasOngoingSchedule, checkingOngoingSchedule,
  };
}
