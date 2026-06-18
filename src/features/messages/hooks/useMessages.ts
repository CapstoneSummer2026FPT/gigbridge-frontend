import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import * as signalR from '@microsoft/signalr';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { proposalPutAPI } from '../../../api/proposalAPI/PUT';
import type { MsgConversation, Message as MsgMessage, JobInfo, RoomType } from '../../../types';
import { UserRole } from '../../../types';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function mapBackendConversation(c: any, currentUserId: string): MsgConversation & { lastOfferId?: string } {
  const isClient = c.otherParticipantRole === 1; // if other is Freelancer
  const roleStr = c.otherParticipantRole === 0 ? 'Client' : c.otherParticipantRole === 1 ? 'Freelancer' : 'Admin';

  let dealStatus: MsgConversation['dealStatus'] = 'idle';
  if (c.lastOfferStatus === 0) {
    dealStatus = c.otherParticipantRole === 0 ? 'pending_freelancer' : 'pending_client';
  } else if (c.lastOfferStatus === 1) {
    dealStatus = 'agreed';
  } else if (c.lastOfferStatus === 2 || c.lastOfferStatus === 3) {
    dealStatus = 'declined';
  }

  const job: JobInfo = {
    id: c.jobPostId || '',
    title: c.title || 'Job Negotiation',
    budget: c.lastOfferPrice ? `$${c.lastOfferPrice}` : 'Negotiable',
    category: ''
  };

  return {
    id: c.conversationId,
    roomType: c.conversationType === 4 ? 'invited' : 'negotiation',
    roomId: c.conversationType === 4 ? 'room_invited' : 'room_negotiation',
    participantId: c.otherParticipantId || '',
    participantName: c.otherParticipantName || 'Partner',
    participantAvatar: c.otherParticipantAvatar || 'https://api.dicebear.com/9.x/avataaars/svg',
    participantRole: roleStr,
    participantCompany: c.otherParticipantRole === 0 ? (c.otherParticipantCompany || '') : (c.otherParticipantRoleTitle || ''),
    participantOnline: true,
    job,
    lastMessage: c.lastMessage?.content || 'No messages yet',
    lastMessageAt: c.lastMessageAt || c.createdAt,
    unreadCount: c.unreadCount || 0,
    isMuted: false,
    dealStatus,
    proposedPrice: c.lastOfferPrice?.toString() || '',
    conversationType: c.conversationType,
    lastOfferId: c.lastOfferId
  };
}

function mapBackendMessage(m: any): MsgMessage {
  let type = 'text';
  if (m.messageType === 1) type = 'image';
  else if (m.messageType === 2) type = 'file';
  else if (m.messageType === 3 || m.messageType === 5) type = 'system';
  else if (m.messageType === 4) type = 'deal';

  let senderId = m.senderUserId || 'system';
  if (m.messageType === 3 || m.messageType === 5 || !m.senderUserId) {
    senderId = 'system';
    type = 'system';
  }

  return {
    id: m.messageId,
    content: m.content || '',
    conversationId: m.conversationId,
    senderId,
    type,
    createdAt: m.sentAt,
    isRead: true,
    proposedPrice: m.messageType === 4 ? m.content : ''
  };
}

export function useMessages() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isClient = role === UserRole.Client;

  const [loading, setLoading] = useState(true);
  const [conversationsState, setConversationsState] = useState<MsgConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messagesMap, setMessagesMap] = useState<Record<string, MsgMessage[]>>({});
  
  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);

  const activeConv = conversationsState.find(c => c.id === activeConvId) || conversationsState[0];
  const activeMessages = messagesMap[activeConvId] ?? [];
  const dealStatus = activeConv?.dealStatus ?? 'idle';

  // ── Room expand state ────────────────────────────────────────────────────
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({
    room_invited: true,
    room_negotiation: true,
  });

  // ── UI state ─────────────────────────────────────────────────────────────
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

  const negStatus = activeConv?.roomId === 'room_negotiation' ? 'accepted' : 'idle';

  // Fetch conversations on mount
  const loadConversations = useCallback(async () => {
    try {
      const res = await messageGetAPI.getMyConversations();
      if (res.success && res.data) {
        const mapped = res.data
          .filter((c: any) => c.conversationType !== 1)
          .map((c: any) => mapBackendConversation(c, user?.id || ''));
        setConversationsState(mapped);

        // Auto select active conversation
        if (mapped.length > 0) {
          const stateConvId = location.state?.activeConvId;
          const found = mapped.find((c: any) => c.id === stateConvId);
          setActiveConvId(found ? found.id : mapped[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user, location.state]);

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
          const mapped = res.data.map(mapBackendMessage);
          setMessagesMap(prev => ({ ...prev, [activeConvId]: mapped }));

          // Mark as read
          const currentConv = conversationsState.find(c => c.id === activeConvId);
          if (currentConv && currentConv.unreadCount > 0 && mapped.length > 0) {
            const lastMsg = mapped[mapped.length - 1];
            await messagePostAPI.markAsRead(activeConvId, lastMsg.id);
            setConversationsState(prev =>
              prev.map(c => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
            );
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
  }, [activeConvId, conversationsState]);

  // Connect to SignalR
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7094/api';
    const hubUrl = apiBase.endsWith('/api')
      ? apiBase.slice(0, -4) + '/hubs/chat'
      : apiBase.replace('/api', '') + '/hubs/chat';

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        console.log('✓ SignalR connected to ChatHub');
        setHubConnection(connection);
      })
      .catch(err => {
        console.error('✗ SignalR connection failed:', err);
      });

    return () => {
      connection.stop();
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
      const mapped = mapBackendMessage(m);
      if (mapped.conversationId === activeConvId) {
        setMessagesMap(prev => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] ?? []), mapped],
        }));
      }

      setConversationsState(prev =>
        prev.map(c =>
          c.id === mapped.conversationId
            ? {
                ...c,
                lastMessage: mapped.content,
                lastMessageAt: mapped.createdAt || new Date().toISOString(),
                unreadCount: c.id === activeConvId ? 0 : c.unreadCount + 1,
              }
            : c
        )
      );
    };

    const handleOfferUpdate = () => {
      loadConversations();
      if (activeConvId) {
        messageGetAPI.getConversationMessages(activeConvId).then(res => {
          if (res.success && res.data) {
            setMessagesMap(prev => ({
              ...prev,
              [activeConvId]: res.data!.map(mapBackendMessage),
            }));
          }
        });
      }
    };

    hubConnection.on('ReceiveMessage', handleReceiveMessage);
    hubConnection.on('FinalOfferCreated', handleOfferUpdate);
    hubConnection.on('FinalOfferResponded', handleOfferUpdate);

    return () => {
      hubConnection.off('ReceiveMessage', handleReceiveMessage);
      hubConnection.off('FinalOfferCreated', handleOfferUpdate);
      hubConnection.off('FinalOfferResponded', handleOfferUpdate);
    };
  }, [hubConnection, activeConvId, loadConversations]);

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

  // scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  const toggleRoom = (roomId: string) =>
    setOpenRooms(prev => ({ ...prev, [roomId]: !prev[roomId] }));

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setShowDealPrice(false);
    setShowConvMenu(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConvId) return;
    const currentInput = messageInput;
    setMessageInput('');
    try {
      const res = await messagePostAPI.sendMessage({
        conversationId: activeConvId,
        clientMessageId: `client_msg_${Date.now()}`,
        content: currentInput,
        attachments: [],
      });
      if (res.success && res.data) {
        const mapped = mapBackendMessage(res.data);
        setMessagesMap(prev => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] ?? []), mapped],
        }));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleProposeDeal = async () => {
    if (!dealPriceInput.trim() || !activeConvId) return;
    const priceNum = parseFloat(dealPriceInput);
    if (isNaN(priceNum) || priceNum <= 0) return;

    try {
      const res = await messagePostAPI.createFinalOffer({
        conversationId: activeConvId,
        finalPrice: priceNum,
        scopeSummary: 'Final Offer Negotiation',
        startDate: null,
        endDate: null,
        clientNote: 'Proposed via Chat',
      });
      if (res.success) {
        setDealPriceInput('');
        setShowDealPrice(false);
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to propose final offer:', err);
    }
  };

  const handleAcceptDeal = async () => {
    const offerId = (activeConv as any)?.lastOfferId;
    if (!offerId) return;

    try {
      const res = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: offerId,
        response: 0, // 0=Accept
      });
      if (res.success) {
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to accept offer:', err);
    }
  };

  const handleDeclineDeal = async () => {
    const offerId = (activeConv as any)?.lastOfferId;
    if (!offerId) return;

    try {
      const res = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: offerId,
        response: 2, // 2=Decline
      });
      if (res.success) {
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to decline offer:', err);
    }
  };

  const handleSendNegotiationRequest = useCallback(() => {
    setShowConvMenu(false);
    setShowNegModal(true);
  }, []);

  const handleConfirmMoveToNegotiation = async () => {
    if (!activeConv?.proposalId) return;
    setShowNegModal(false);

    try {
      const res = await proposalPutAPI.startNegotiation(activeConv.proposalId);
      if (res.success) {
        loadConversations();
        setOpenRooms(prev => ({ ...prev, room_negotiation: true }));
      }
    } catch (err) {
      console.error('Failed to start negotiation:', err);
    }
  };

  const isMe = (senderId: string) =>
    senderId === (user?.id ?? 'current_user') || senderId === 'current_user';

  const totalUnread = conversationsState.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    loading,
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
    chatEndRef,
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
  };
}
