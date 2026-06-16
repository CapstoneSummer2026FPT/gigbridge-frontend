import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { DB } from '../../../mock_backend';
import {
  MOCK_MSG_CONVERSATIONS,
  MOCK_MSG_MESSAGES,
  type MsgConversation,
  type MsgMessage,
} from '../mock/data-for-MessagesScreen';

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
  const [conversationsState, setConversationsState] = useState<MsgConversation[]>(() =>
    MOCK_MSG_CONVERSATIONS.filter(c => c.conversationType !== 1)
  );

  // ── Active conversation ──────────────────────────────────────────────────
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (location.state && location.state.activeConvId) {
      return location.state.activeConvId;
    }
    const visible = MOCK_MSG_CONVERSATIONS.filter(c => c.conversationType !== 1);
    return visible[0]?.id || '';
  });
  const activeConv = conversationsState.find(c => c.id === activeConvId) || conversationsState[0];

  // ── Messages map ─────────────────────────────────────────────────────────
  const [messagesMap, setMessagesMap] = useState<Record<string, MsgMessage[]>>(() => {
    const map: Record<string, MsgMessage[]> = {};
    MOCK_MSG_CONVERSATIONS.forEach(c => {
      map[c.id] = MOCK_MSG_MESSAGES.filter(m => m.conversationId === c.id);
    });
    return map;
  });
  const activeMessages = messagesMap[activeConvId] ?? [];

  // ── Deal state per conversation ──────────────────────────────────────────
  const [dealStatusMap, setDealStatusMap] = useState<Record<string, MsgConversation['dealStatus']>>(() => {
    const m: Record<string, MsgConversation['dealStatus']> = {};
    MOCK_MSG_CONVERSATIONS.forEach(c => { m[c.id] = c.dealStatus ?? 'idle'; });
    return m;
  });
  const dealStatus = dealStatusMap[activeConvId] ?? 'idle';

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showInfo, setShowInfo] = useState(true);
  const [showDealPrice, setShowDealPrice] = useState(false);
  const [dealPriceInput, setDealPriceInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Conversation Settings Menu (tùy chỉnh) ───────────────────────────────
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [showNegModal, setShowNegModal] = useState(false);
  const convMenuRef = useRef<HTMLDivElement>(null);

  // ── Negotiation Request state per conversation ───────────────────────────
  const [negRequestMap, setNegRequestMap] = useState<
    Record<string, 'idle' | 'pending' | 'accepted' | 'declined'>
  >({});
  const negStatus = negRequestMap[activeConvId] ?? 'idle';

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

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const msg: MsgMessage = {
      id: `msg_${Date.now()}`,
      conversationId: activeConvId,
      senderId: user?.id ?? 'current_user',
      content: messageInput,
      type: 'text',
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), msg],
    }));
    setMessageInput('');

    setTimeout(() => {
      const reply: MsgMessage = {
        id: `reply_${Date.now()}`,
        conversationId: activeConvId,
        senderId: activeConv?.participantId ?? 'partner',
        content: `Got it! Let me review and get back to you regarding "${activeConv?.job.title}".`,
        type: 'text',
        createdAt: new Date().toISOString(),
        isRead: true,
      };
      setMessagesMap(prev => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] ?? []), reply],
      }));
    }, 2000);
  };

  const handleProposeDeal = () => {
    if (!dealPriceInput.trim()) return;
    const price = dealPriceInput;
    const dealMsg: MsgMessage = {
      id: `deal_${Date.now()}`,
      conversationId: activeConvId,
      senderId: user?.id ?? 'current_user',
      content: price,
      type: 'deal',
      createdAt: new Date().toISOString(),
      isRead: false,
      dealStatus: 'pending_freelancer',
    };
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), dealMsg],
    }));
    setDealStatusMap(prev => ({ ...prev, [activeConvId]: 'pending_freelancer' }));
    setDealPriceInput('');
    setShowDealPrice(false);
  };

  const handleAcceptDeal = (msgId: string, amount: string) => {
    setDealStatusMap(prev => ({ ...prev, [activeConvId]: 'agreed' }));
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: (prev[activeConvId] ?? []).map(m =>
        m.id === msgId ? { ...m, dealStatus: 'agreed' } : m
      ),
    }));
    const confirmMsg: MsgMessage = {
      id: `confirm_${Date.now()}`,
      conversationId: activeConvId,
      senderId: user?.id ?? 'current_user',
      content: `Đã đồng ý mức giá $${amount} USD. Tiến hành ký hợp đồng!`,
      type: 'text',
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), confirmMsg],
    }));
  };

  const handleDeclineDeal = (msgId: string) => {
    setDealStatusMap(prev => ({ ...prev, [activeConvId]: 'declined' }));
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: (prev[activeConvId] ?? []).map(m =>
        m.id === msgId ? { ...m, dealStatus: 'declined' } : m
      ),
    }));
    const declineMsg: MsgMessage = {
      id: `decline_${Date.now()}`,
      conversationId: activeConvId,
      senderId: user?.id ?? 'current_user',
      content: 'Đã từ chối mức giá đề xuất này.',
      type: 'text',
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), declineMsg],
    }));
  };

  // ── "Vào vòng đàm phán" – Client confirm move directly without waiting ────
  const handleSendNegotiationRequest = useCallback(() => {
    setShowConvMenu(false);
    setShowNegModal(true);
  }, []);

  const handleConfirmMoveToNegotiation = () => {
    setShowNegModal(false);

    // Update conversation in DB
    DB.updateConversation(activeConvId, {
      roomId: 'room_negotiation',
      roomType: 'negotiation',
      conversationType: 0,
    });

    // Update local state
    setConversationsState(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? { ...c, roomId: 'room_negotiation', roomType: 'negotiation', conversationType: 0 }
          : c
      )
    );

    // System message confirming transfer
    const sysMsg: MsgMessage = {
      id: `neg_sys_${Date.now()}`,
      conversationId: activeConvId,
      senderId: 'system',
      content: 'Cuộc trò chuyện đã được chuyển sang vòng đàm phán. Chúc các bạn thỏa thuận thành công! 🤝',
      type: 'system',
      createdAt: new Date().toISOString(),
      isRead: true,
    };
    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] ?? []), sysMsg],
    }));

    // Ensure negotiation room is open
    setOpenRooms(prev => ({ ...prev, room_negotiation: true }));
  };

  const isMe = (senderId: string) =>
    senderId === (user?.id ?? 'current_user') || senderId === 'current_user';

  const totalUnread = conversationsState.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
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
    negRequestMap,
    setNegRequestMap,
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
