import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import * as signalR from '@microsoft/signalr';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import type {
  ConversationMessageResponse,
  ConversationSummaryResponse,
  MessageAttachmentResponse,
  MessageResponse,
} from '../../../api/messageAPI/GET';
import type { JobInfo, Message as MsgMessage, MsgConversation } from '../../../types';
import { UserRole } from '../../../types';

type BackendRecord = Record<string, unknown>;

type ChatConversation = MsgConversation & {
  proposalId?: string | null;
  contractId?: string | null;
  lastOfferId?: string | null;
};

type LocationState = {
  activeConvId?: string;
};

const SYSTEM_MESSAGE_TYPES = new Set([3, 5, 6, 7, 8]);

function asRecord(value: unknown): BackendRecord {
  return value && typeof value === 'object' ? (value as BackendRecord) : {};
}

function readField(value: unknown, ...keys: readonly string[]): unknown {
  const record = asRecord(value);
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }
  return undefined;
}

function readString(value: unknown, ...keys: readonly string[]): string | undefined {
  const raw = readField(value, ...keys);
  return typeof raw === 'string' ? raw : undefined;
}

function readNumber(value: unknown, ...keys: readonly string[]): number | undefined {
  const raw = readField(value, ...keys);
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readArray(value: unknown, ...keys: readonly string[]): readonly BackendRecord[] {
  const raw = readField(value, ...keys);
  return Array.isArray(raw) ? raw.map(asRecord) : [];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function buildChatHubUrl(): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'https://localhost:7094/api').replace(/\/+$/, '');
  const appBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase.replace(/\/api$/, '');
  return `${appBase}/hubs/chat`;
}

function sortMessages(messages: readonly MsgMessage[]): MsgMessage[] {
  return [...messages].sort((a, b) => {
    const left = new Date(a.createdAt || 0).getTime();
    const right = new Date(b.createdAt || 0).getTime();
    return left - right;
  });
}

function upsertMessage(messages: readonly MsgMessage[], message: MsgMessage): MsgMessage[] {
  if (!message.id) {
    return sortMessages([...messages, message]);
  }

  const exists = messages.some(item => item.id === message.id);
  if (exists) {
    return sortMessages(messages.map(item => (item.id === message.id ? message : item)));
  }

  return sortMessages([...messages, message]);
}

function getMessagePreview(message: unknown): string {
  const messageType = readNumber(message, 'messageType', 'MessageType') ?? 0;
  const content = readString(message, 'content', 'Content');

  if (content) {
    return content;
  }
  if (messageType === 2) {
    return 'Sent an attachment';
  }
  if (messageType === 4) {
    return 'Final offer sent';
  }
  if (SYSTEM_MESSAGE_TYPES.has(messageType)) {
    return 'Conversation updated';
  }
  return 'No messages yet';
}

function mapBackendConversation(conversation: ConversationSummaryResponse): ChatConversation {
  const conversationId = readString(conversation, 'conversationId', 'ConversationId') ?? '';
  const conversationType = readNumber(conversation, 'conversationType', 'ConversationType') ?? 0;
  const otherParticipantRole = readNumber(conversation, 'otherParticipantRole', 'OtherParticipantRole');
  const lastOfferStatus = readNumber(conversation, 'lastOfferStatus', 'LastOfferStatus');
  const lastOfferPrice = readNumber(conversation, 'lastOfferPrice', 'LastOfferPrice');
  const lastMessage = readField(conversation, 'lastMessage', 'LastMessage');

  const roleStr = otherParticipantRole === 0
    ? 'Client'
    : otherParticipantRole === 1
      ? 'Freelancer'
      : otherParticipantRole === 2
        ? 'Admin'
        : 'Support';

  let dealStatus: MsgConversation['dealStatus'] = 'idle';
  if (lastOfferStatus === 0) {
    dealStatus = otherParticipantRole === 1 ? 'pending_freelancer' : 'pending_client';
  } else if (lastOfferStatus === 1) {
    dealStatus = 'agreed';
  } else if (lastOfferStatus === 2 || lastOfferStatus === 3) {
    dealStatus = 'declined';
  }

  const job: JobInfo = {
    id: readString(conversation, 'jobPostId', 'JobPostId') ?? '',
    title: readString(conversation, 'title', 'Title') ?? 'Job Negotiation',
    budget: lastOfferPrice ? `$${lastOfferPrice}` : 'Negotiable',
    category: '',
  };

  const createdAt = readString(conversation, 'createdAt', 'CreatedAt') ?? new Date().toISOString();
  const lastMessageAt = readString(conversation, 'lastMessageAt', 'LastMessageAt') ?? createdAt;

  return {
    id: conversationId,
    roomType: conversationType === 4 ? 'invited' : 'negotiation',
    roomId: conversationType === 4 ? 'room_invited' : 'room_negotiation',
    participantId: readString(conversation, 'otherParticipantId', 'OtherParticipantId') ?? '',
    participantName: readString(conversation, 'otherParticipantName', 'OtherParticipantName') ?? 'Partner',
    participantAvatar:
      readString(conversation, 'otherParticipantAvatar', 'OtherParticipantAvatar') ||
      'https://api.dicebear.com/9.x/avataaars/svg',
    participantRole: roleStr,
    participantCompany:
      otherParticipantRole === 0
        ? readString(conversation, 'otherParticipantCompany', 'OtherParticipantCompany') ?? ''
        : readString(conversation, 'otherParticipantRoleTitle', 'OtherParticipantRoleTitle') ?? '',
    participantOnline: true,
    job,
    lastMessage: getMessagePreview(lastMessage),
    lastMessageAt,
    unreadCount: readNumber(conversation, 'unreadCount', 'UnreadCount') ?? 0,
    isMuted: false,
    dealStatus,
    proposedPrice: lastOfferPrice?.toString() ?? '',
    conversationType,
    proposalId: readString(conversation, 'proposalId', 'ProposalId') ?? null,
    contractId: readString(conversation, 'contractId', 'ContractId') ?? null,
    lastOfferId: readString(conversation, 'lastOfferId', 'LastOfferId') ?? null,
  };
}

function mapBackendMessage(message: ConversationMessageResponse | MessageResponse | unknown): MsgMessage {
  const messageType = readNumber(message, 'messageType', 'MessageType') ?? 0;
  const attachments = readArray(message, 'attachments', 'Attachments') as readonly MessageAttachmentResponse[];
  const firstAttachment = attachments[0];

  let type = 'text';
  if (messageType === 1) type = 'image';
  if (messageType === 2) type = 'file';
  if (messageType === 4) type = 'deal';
  if (SYSTEM_MESSAGE_TYPES.has(messageType)) type = 'system';

  const senderUserId = readString(message, 'senderUserId', 'SenderUserId');
  const senderId = senderUserId && type !== 'system' ? senderUserId : 'system';
  const content = readString(message, 'content', 'Content') ?? '';
  const attachmentFileName = firstAttachment ? readString(firstAttachment, 'fileName', 'FileName') : undefined;
  const attachmentFileUrl = firstAttachment ? readString(firstAttachment, 'fileUrl', 'FileUrl') : undefined;

  return {
    id: readString(message, 'messageId', 'MessageId', 'messagesId', 'MessagesId') ?? '',
    content: type === 'file' && !content ? attachmentFileName ?? 'Attachment' : content,
    conversationId: readString(message, 'conversationId', 'ConversationId', 'conversationsId', 'ConversationsId'),
    senderId,
    type,
    createdAt: readString(message, 'sentAt', 'SentAt') ?? new Date().toISOString(),
    isRead: true,
    fileUrl: attachmentFileUrl,
    fileName: attachmentFileName,
    proposedPrice: messageType === 4 ? content : '',
  };
}

function sortConversations(conversations: readonly ChatConversation[]): ChatConversation[] {
  return [...conversations].sort((a, b) => {
    const left = new Date(a.lastMessageAt || 0).getTime();
    const right = new Date(b.lastMessageAt || 0).getTime();
    return right - left;
  });
}

export function useMessages() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isClient = role === UserRole.Client;
  const requestedActiveConvIdRef = useRef((location.state as LocationState | null)?.activeConvId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conversationsState, setConversationsState] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messagesMap, setMessagesMap] = useState<Record<string, MsgMessage[]>>({});
  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
  const [typingByConversation, setTypingByConversation] = useState<Record<string, boolean>>({});

  const activeConv = conversationsState.find(c => c.id === activeConvId) || conversationsState[0];
  const activeMessages = messagesMap[activeConvId] ?? [];
  const dealStatus = activeConv?.dealStatus ?? 'idle';
  const isPartnerTyping = !!typingByConversation[activeConvId];
  const conversationGroupKey = conversationsState.map(conversation => conversation.id).join('|');

  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({
    room_invited: true,
    room_negotiation: true,
  });

  const [showInfo, setShowInfo] = useState(true);
  const [showDealPrice, setShowDealPrice] = useState(false);
  const [dealPriceInput, setDealPriceInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showConvMenu, setShowConvMenu] = useState(false);
  const [showNegModal, setShowNegModal] = useState(false);
  const convMenuRef = useRef<HTMLDivElement>(null);
  const typingStopTimerRef = useRef<number | null>(null);

  const negStatus = activeConv?.roomId === 'room_negotiation' ? 'accepted' : 'idle';

  const markConversationRead = useCallback(async (conversationId: string, messageId?: string): Promise<void> => {
    if (!conversationId || !messageId) return;

    const response = await messagePostAPI.markAsRead(conversationId, messageId);
    if (response.success) {
      setConversationsState(prev =>
        prev.map(conversation =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
        )
      );
    }
  }, []);

  const loadActiveMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) return;

    const response = await messageGetAPI.getConversationMessages(conversationId);
    if (!response.success || !response.data) {
      setError(response.message || 'Unable to load messages.');
      return;
    }

    const mapped = sortMessages(response.data.map(mapBackendMessage));
    setMessagesMap(prev => ({ ...prev, [conversationId]: mapped }));

    const lastMessage = mapped[mapped.length - 1];
    await markConversationRead(conversationId, lastMessage?.id);
  }, [markConversationRead]);

  const loadConversations = useCallback(async (): Promise<ChatConversation[]> => {
    const response = await messageGetAPI.getMyConversations();
    if (!response.success || !response.data) {
      setError(response.message || 'Unable to load conversations.');
      return [];
    }

    const mapped = sortConversations(
      response.data
        .filter(conversation => (readNumber(conversation, 'conversationType', 'ConversationType') ?? 0) !== 1)
        .map(mapBackendConversation)
    );

    setConversationsState(mapped);
    setError('');
    setActiveConvId(current => {
      const requestedActiveConvId = requestedActiveConvIdRef.current;
      requestedActiveConvIdRef.current = undefined;

      if (requestedActiveConvId && mapped.some(conversation => conversation.id === requestedActiveConvId)) {
        return requestedActiveConvId;
      }
      if (current && mapped.some(conversation => conversation.id === current)) {
        return current;
      }
      return mapped[0]?.id ?? '';
    });

    return mapped;
  }, []);

  const refreshActiveConversation = useCallback(async (): Promise<void> => {
    await loadConversations();
    if (activeConvId) {
      await loadActiveMessages(activeConvId);
    }
  }, [activeConvId, loadActiveMessages, loadConversations]);

  const stopTyping = useCallback((): void => {
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (hubConnection && activeConvId && hubConnection.state === signalR.HubConnectionState.Connected) {
      hubConnection.invoke('StopTyping', activeConvId).catch(() => {});
    }
  }, [activeConvId, hubConnection]);

  const sendTyping = useCallback((): void => {
    if (!hubConnection || !activeConvId || hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    hubConnection.invoke('Typing', activeConvId).catch(() => {});

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = window.setTimeout(() => {
      stopTyping();
    }, 1200);
  }, [activeConvId, hubConnection, stopTyping]);

  useEffect(() => {
    let isMounted = true;

    const init = async (): Promise<void> => {
      setLoading(true);
      await loadConversations();
      if (isMounted) {
        setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConvId) return;
    loadActiveMessages(activeConvId).catch(loadError => {
      console.error('Failed to load messages for conversation:', activeConvId, loadError);
      setError('Unable to load messages.');
    });
  }, [activeConvId, loadActiveMessages]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(buildChatHubUrl(), {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        setHubConnection(connection);
      })
      .catch(connectionError => {
        console.error('SignalR connection failed:', connectionError);
      });

    return () => {
      setHubConnection(null);
      connection.stop().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!hubConnection || !conversationGroupKey || hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    const conversationIds = conversationGroupKey.split('|').filter(Boolean);

    conversationIds.forEach(conversationId => {
      hubConnection.invoke('JoinConversation', conversationId).catch(joinError => {
        console.error(`Failed to join SignalR conversation group: ${conversationId}`, joinError);
      });
    });

    return () => {
      conversationIds.forEach(conversationId => {
        hubConnection.invoke('LeaveConversation', conversationId).catch(() => {});
      });
    };
  }, [hubConnection, conversationGroupKey]);

  useEffect(() => {
    if (!hubConnection) return;

    const handleReceiveMessage = (payload: unknown): void => {
      const mapped = mapBackendMessage(payload);
      const conversationId = mapped.conversationId;
      if (!conversationId) return;

      if (conversationId === activeConvId) {
        setMessagesMap(prev => ({
          ...prev,
          [conversationId]: upsertMessage(prev[conversationId] ?? [], mapped),
        }));
        markConversationRead(conversationId, mapped.id).catch(() => {});
      }

      setConversationsState(prev =>
        prev.map(c =>
          c.id === mapped.conversationId
            ? {
                ...c,
                lastMessage: mapped.content,
                lastMessageAt: mapped.createdAt,
                unreadCount: c.id === activeConvId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      );
    };

    const handleConversationRefresh = (): void => {
      refreshActiveConversation().catch(refreshError => {
        console.error('Failed to refresh chat conversation:', refreshError);
      });
    };

    const handleConversationRead = (payload: unknown): void => {
      const conversationId = readString(payload, 'conversationId', 'ConversationId') ?? activeConvId;
      if (!conversationId) return;
      setConversationsState(prev =>
        prev.map(conversation =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
        )
      );
    };

    const handleTyping = (payload: unknown): void => {
      const conversationId = readString(payload, 'conversationId', 'ConversationId');
      if (!conversationId) return;
      setTypingByConversation(prev => ({ ...prev, [conversationId]: true }));
    };

    const handleStopTyping = (payload: unknown): void => {
      const conversationId = readString(payload, 'conversationId', 'ConversationId');
      if (!conversationId) return;
      setTypingByConversation(prev => ({ ...prev, [conversationId]: false }));
    };

    hubConnection.on('ReceiveMessage', handleReceiveMessage);
    hubConnection.on('FinalOfferCreated', handleConversationRefresh);
    hubConnection.on('FinalOfferResponded', handleConversationRefresh);
    hubConnection.on('ContractDraftUpdated', handleConversationRefresh);
    hubConnection.on('ContractFullySigned', handleConversationRefresh);
    hubConnection.on('ConversationRead', handleConversationRead);
    hubConnection.on('Typing', handleTyping);
    hubConnection.on('StopTyping', handleStopTyping);

    return () => {
      hubConnection.off('ReceiveMessage', handleReceiveMessage);
      hubConnection.off('FinalOfferCreated', handleConversationRefresh);
      hubConnection.off('FinalOfferResponded', handleConversationRefresh);
      hubConnection.off('ContractDraftUpdated', handleConversationRefresh);
      hubConnection.off('ContractFullySigned', handleConversationRefresh);
      hubConnection.off('ConversationRead', handleConversationRead);
      hubConnection.off('Typing', handleTyping);
      hubConnection.off('StopTyping', handleStopTyping);
    };
  }, [activeConvId, hubConnection, markConversationRead, refreshActiveConversation]);

  useEffect(() => {
    const handler = (event: MouseEvent): void => {
      if (convMenuRef.current && !convMenuRef.current.contains(event.target as Node)) {
        setShowConvMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, isPartnerTyping]);

  const toggleRoom = (roomId: string): void =>
    setOpenRooms(prev => ({ ...prev, [roomId]: !prev[roomId] }));

  const handleSelectConv = (id: string): void => {
    stopTyping();
    setActiveConvId(id);
    setShowDealPrice(false);
    setShowConvMenu(false);
    setTypingByConversation(prev => ({ ...prev, [id]: false }));
  };

  const handleMessageInputChange = (value: string): void => {
    setMessageInput(value);
    if (value.trim()) {
      sendTyping();
    } else {
      stopTyping();
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!messageInput.trim() || !activeConvId) return;

    const currentInput = messageInput.trim();
    setMessageInput('');
    stopTyping();

    try {
      const response = await messagePostAPI.sendMessage({
        conversationId: activeConvId,
        clientMessageId: `client_msg_${Date.now()}`,
        content: currentInput,
        attachments: [],
      });

      if (response.success && response.data) {
        const mapped = mapBackendMessage(response.data);
        setMessagesMap(prev => ({
          ...prev,
          [activeConvId]: upsertMessage(prev[activeConvId] ?? [], mapped),
        }));
        setConversationsState(prev =>
          sortConversations(
            prev.map(conversation =>
              conversation.id === activeConvId
                ? {
                    ...conversation,
                    lastMessage: mapped.content,
                    lastMessageAt: mapped.createdAt || new Date().toISOString(),
                    unreadCount: 0,
                  }
                : conversation
            )
          )
        );
      } else {
        setError(response.message || 'Unable to send message.');
        setMessageInput(currentInput);
      }
    } catch (sendError) {
      console.error('Failed to send message:', sendError);
      setError('Unable to send message.');
      setMessageInput(currentInput);
    }
  };

  const handleProposeDeal = async (): Promise<void> => {
    if (!dealPriceInput.trim() || !activeConvId) return;
    const priceNum = parseFloat(dealPriceInput);
    if (Number.isNaN(priceNum) || priceNum <= 0) return;

    try {
      const response = await messagePostAPI.createFinalOffer({
        conversationId: activeConvId,
        finalPrice: priceNum,
        scopeSummary: 'Final Offer Negotiation',
        startDate: null,
        endDate: null,
        clientNote: 'Proposed via Chat',
      });

      if (response.success) {
        setDealPriceInput('');
        setShowDealPrice(false);
        await refreshActiveConversation();
      } else {
        setError(response.message || 'Unable to create final offer.');
      }
    } catch (offerError) {
      console.error('Failed to propose final offer:', offerError);
      setError('Unable to create final offer.');
    }
  };

  const handleAcceptDeal = async (_messageId?: string, _content?: string): Promise<void> => {
    const offerId = activeConv?.lastOfferId;
    if (!offerId) return;

    try {
      const response = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: offerId,
        response: 0,
      });

      if (response.success) {
        await refreshActiveConversation();
      } else {
        setError(response.message || 'Unable to accept final offer.');
      }
    } catch (acceptError) {
      console.error('Failed to accept offer:', acceptError);
      setError('Unable to accept final offer.');
    }
  };

  const handleDeclineDeal = async (_messageId?: string): Promise<void> => {
    const offerId = activeConv?.lastOfferId;
    if (!offerId) return;

    try {
      const response = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: offerId,
        response: 2,
      });

      if (response.success) {
        await refreshActiveConversation();
      } else {
        setError(response.message || 'Unable to decline final offer.');
      }
    } catch (declineError) {
      console.error('Failed to decline offer:', declineError);
      setError('Unable to decline final offer.');
    }
  };

  const handleSendNegotiationRequest = useCallback((): void => {
    setShowConvMenu(false);
    setShowNegModal(true);
  }, []);

  const handleConfirmMoveToNegotiation = async (): Promise<void> => {
    if (!activeConv?.proposalId) return;
    setShowNegModal(false);

    try {
      const response = await proposalPutAPI.startNegotiation(activeConv.proposalId);
      if (response.success && response.data) {
        await loadConversations();
        setActiveConvId(response.data);
        setOpenRooms(prev => ({ ...prev, room_negotiation: true }));
      } else {
        setError(response.message || 'Unable to start negotiation.');
      }
    } catch (negotiationError) {
      console.error('Failed to start negotiation:', negotiationError);
      setError('Unable to start negotiation.');
    }
  };

  const handleAcceptNegotiation = async (_messageId?: string): Promise<void> => {
    await handleConfirmMoveToNegotiation();
  };

  const handleDeclineNegotiation = (_messageId?: string): void => {
    setShowNegModal(false);
  };

  const isMe = (senderId?: string): boolean =>
    senderId === (user?.id ?? 'current_user') || senderId === 'current_user';

  const totalUnread = conversationsState.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

  return {
    loading,
    error,
    user,
    role,
    isClient,
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
    isPartnerTyping,
    chatEndRef,
    convMenuRef,
    toggleRoom,
    handleSelectConv,
    handleMessageInputChange,
    stopTyping,
    handleSendMessage,
    handleProposeDeal,
    handleAcceptDeal,
    handleDeclineDeal,
    handleSendNegotiationRequest,
    handleConfirmMoveToNegotiation,
    handleAcceptNegotiation,
    handleDeclineNegotiation,
    isMe,
    totalUnread,
    formatTime,
  };
}
