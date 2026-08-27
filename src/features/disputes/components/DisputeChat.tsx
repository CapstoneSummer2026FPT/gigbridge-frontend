import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Info, LoaderCircle, Lock, MessageSquare, Paperclip, Send, ShieldCheck } from 'lucide-react';
import { messageGetAPI, type ConversationMessageResponse } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { ConversationStatus, MessageType } from '../../../types/models/Message';
import { DisputeStatus } from '../../../types/models/Dispute';
import { UserRole } from '../../../types/models/User';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { onChatHubReconnected, retainChatHubConnection } from '../../../shared/realtime/chatHubConnection';

interface DisputeChatProps {
  disputeId: string;
  disputeStatus: DisputeStatus;
}

export function DisputeChat({ disputeId, disputeStatus }: DisputeChatProps) {
  const { t } = useTranslation(['disputes', 'common']);
  const { user } = useApp();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationClosed, setConversationClosed] = useState(false);
  // A dispute is read-only once either signal says so — the conversation's own status
  // (set server-side when the dispute closes) or the dispute's status directly, so the
  // UI locks immediately even if the conversation fetch hasn't caught up yet.
  const closed = conversationClosed || disputeStatus === DisputeStatus.Closed;
  const [showGuide, setShowGuide] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const conversations = await messageGetAPI.getConversations();
      if (cancelled) return;
      const conversation = conversations.data?.find(item => item.disputeId === disputeId);
      if (!conversations.success || !conversation) {
        setError(t('disputes.chatUnavailable', { defaultValue: 'Kênh trao đổi hiện chưa sẵn sàng.' }));
        setLoading(false);
        return;
      }
      setConversationId(conversation.conversationId);
      setConversationClosed(conversation.status === ConversationStatus.Closed);
      const response = await messageGetAPI.getConversationMessages(conversation.conversationId, undefined, 100);
      if (cancelled) return;
      if (response.success) setMessages(response.data ?? []);
      else setError(response.message || t('disputes.chatLoadFailed', { defaultValue: 'Không thể tải lịch sử tin nhắn.' }));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [disputeId, t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;
    let disposed = false;
    const lease = retainChatHubConnection();
    const connection = lease.connection;
    const refreshMessages = (payload: Record<string, unknown>) => {
      const eventConversationId = String(payload.conversationId ?? payload.conversationsId ?? payload.ConversationsId ?? '');
      if (eventConversationId !== conversationId) return;
      void messageGetAPI.getConversationMessages(conversationId, undefined, 100).then(response => {
        if (!disposed && response.success) setMessages(response.data ?? []);
      });
      void messageGetAPI.getConversations().then(response => {
        if (disposed || !response.success) return;
        const updated = response.data?.find(item => item.conversationId === conversationId);
        if (updated) setConversationClosed(updated.status === ConversationStatus.Closed);
      });
    };
    connection.on('ReceiveMessage', refreshMessages);
    const stopReconnect = onChatHubReconnected(() => {
      if (!disposed) void connection.invoke('JoinConversation', conversationId);
    });
    void lease.ready
      .then(() => disposed ? undefined : connection.invoke('JoinConversation', conversationId))
      .catch(() => undefined);
    return () => {
      disposed = true;
      connection.off('ReceiveMessage', refreshMessages);
      stopReconnect();
      void connection.invoke('LeaveConversation', conversationId).catch(() => undefined);
      lease.release();
    };
  }, [conversationId]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !conversationId || sending || closed) return;
    setSending(true);
    setError(null);
    const response = await messagePostAPI.sendMessage({
      conversationId,
      clientMessageId: crypto.randomUUID(),
      content,
    });
    if (response.success && response.data) {
      setMessages(previous => [...previous, response.data!]);
      setInput('');
    } else {
      setError(response.message || t('disputes.chatSendFailed', { defaultValue: 'Không thể gửi tin nhắn.' }));
    }
    setSending(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const renderRoleBadge = (role?: number | null, isOfficialAdmin?: boolean) => {
    if (isOfficialAdmin || role === UserRole.Admin) {
      return <span className="dispute-role-badge role-admin"><ShieldCheck size={12} /> Admin</span>;
    }
    if (role === UserRole.Client) {
      return <span className="dispute-role-badge role-client">Client</span>;
    }
    if (role === UserRole.Freelancer) {
      return <span className="dispute-role-badge role-freelancer">Freelancer</span>;
    }
    return null;
  };

  return (
    <section className="bento-card h-full flex flex-col justify-between">
      {/* Sleek Chat Card Header */}
      <div className="bento-section-title pb-3 mb-3 border-b border-border">
        <div className="bento-section-title-left">
          <div className="bento-section-icon icon-cyan">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2>{t('disputes.chatTitle', { defaultValue: 'Kênh Hòa giải & Tranh chấp' })}</h2>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-500 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Moderation Active
              </span>
              <span>•</span>
              <span>{messages.length} tin nhắn</span>
            </div>
          </div>
        </div>

        {/* Collapsible Rules Toggle */}
        <button
          type="button"
          onClick={() => setShowGuide(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted hover:bg-surface border border-border text-xs font-extrabold text-foreground transition-all cursor-pointer"
        >
          <Info size={14} className="text-brand" />
          <span>{showGuide ? 'Ẩn quy tắc' : 'Quy tắc hòa giải'}</span>
          {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Collapsible Moderation Guidance Accordion */}
      {showGuide && (
        <div className="p-4 mb-4 rounded-2xl bg-brand/5 border border-brand/20 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 font-extrabold text-brand">
            <ShieldCheck size={16} />
            <span>Hướng dẫn đối soát & làm việc với Admin</span>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            Tất cả thông điệp tại đây đều có sự giám sát trực tiếp từ Ban quản trị GigBridge. Quản trị viên sẽ đánh giá lập luận, chứng cứ và phản hồi của hai bên để đưa ra phán quyết chính thức.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand/15 text-[11px] font-bold text-foreground">
            <div>• Nêu rõ nội dung bất đồng & yêu cầu xử lý</div>
            <div>• Cung cấp bằng chứng minh bạch</div>
            <div>• Duy trì thái độ lịch sự & hợp tác với Admin</div>
            <div>• Nhận thông báo chỉ đạo trực tiếp từ Admin</div>
          </div>
        </div>
      )}

      {/* Main Chat Stream */}
      {loading ? (
        <div className="flex justify-center items-center py-16 flex-1">
          <LemniscateBloomLoader
            size={110}
            label={t('disputes.chatLoading', { defaultValue: 'Đang kết nối kênh trao đổi...' })}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="dispute-chat-messages" ref={chatContainerRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="dispute-chat-empty">
                <MessageSquare size={32} className="text-muted-foreground/50" />
                <p>{t('disputes.chatEmpty', { defaultValue: 'Chưa có tin nhắn nào trong kênh trao đổi vụ việc.' })}</p>
                <small>Gửi tin nhắn hoặc trình bày lập luận đầu tiên đến Quản trị viên & đối tác tại đây.</small>
              </div>
            )}

            {messages.map((message, index) => {
              const content = message.content ?? '';
              const isOpeningText =
                content === 'A dispute has been opened.' ||
                /dispute.*open/i.test(content) ||
                /mở.*tranh chấp/i.test(content) ||
                /tranh chấp.*được mở/i.test(content) ||
                (index === 0 && /dispute/i.test(content));

              const system =
                message.messageType === MessageType.System ||
                message.messageType === MessageType.DisputeEvent ||
                isOpeningText;

              if (system) {
                const displayText = isOpeningText
                  ? t('disputes.disputeOpenedNotice', { defaultValue: 'Hồ sơ tranh chấp đã được mở. Ban quản trị đang tham gia đối soát.' })
                  : message.content;

                return (
                  <div className="dispute-chat-system my-4 flex justify-center" key={message.messageId}>
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-600 text-white font-black text-xs shadow-xs">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{displayText}</span>
                      <span className="opacity-75 text-[10px] font-bold">
                        • {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  </div>
                );
              }

              const isOfficial = message.messageType === MessageType.AdminOfficial || message.senderRole === UserRole.Admin;
              const mine = message.senderUserId === user?.id;

              const prevMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

              const sameSenderAsPrev = Boolean(prevMessage && prevMessage.senderUserId === message.senderUserId && prevMessage.messageType !== MessageType.System);
              const sameSenderAsNext = Boolean(nextMessage && nextMessage.senderUserId === message.senderUserId && nextMessage.messageType !== MessageType.System);

              const showAvatar = !mine && (!sameSenderAsNext || !nextMessage);
              const showMetaHeader = !mine && !sameSenderAsPrev;

              return (
                <div className={`dispute-chat-message-row ${mine ? 'mine' : ''} ${isOfficial ? 'admin-official-row' : ''} ${sameSenderAsPrev ? 'grouped' : ''}`} key={message.messageId}>
                  {!mine && (
                    <div className="dispute-chat-avatar-wrapper shrink-0 w-8 h-8 flex items-end">
                      {showAvatar && (
                        <UserAvatar
                          name={message.senderName || (isOfficial ? 'Administrator' : 'Participant')}
                          src={message.senderAvatar}
                          userId={message.senderUserId}
                          size="sm"
                          premium={isOfficial}
                        />
                      )}
                    </div>
                  )}

                  <div className="dispute-chat-bubble-container">
                    {showMetaHeader && (
                      <div className="dispute-chat-meta">
                        <span className="dispute-sender-name">{message.senderName || (isOfficial ? 'Administrator' : 'Participant')}</span>
                        {renderRoleBadge(message.senderRole, isOfficial)}
                      </div>
                    )}

                    <div className={`dispute-chat-bubble ${mine ? 'mine' : ''} ${isOfficial ? 'admin-official-bubble' : ''}`}>
                      {isOfficial && !mine && showMetaHeader && (
                        <div className="admin-bubble-header">
                          <ShieldCheck size={13} />
                          <strong>Official Administrative Directive</strong>
                        </div>
                      )}
                      <div className="dispute-chat-text">{message.content}</div>

                      {message.attachments.length > 0 && (
                        <div className="dispute-chat-attachments mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-2">
                          {message.attachments.map(attachment => (
                            <a key={attachment.messageAttachmentId} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-bold text-foreground hover:text-brand">
                              <Paperclip size={13} /> {attachment.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <time className="dispute-chat-timestamp">
                      {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="p-3 my-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2" role="alert">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Floating Input Area */}
          {closed ? (
            <div className="dispute-chat-locked" role="status">
              <Lock size={18} className="shrink-0" />
              <span>{t('disputes.chatClosed', { defaultValue: 'Kênh trao đổi đã được khóa (Hồ sơ tranh chấp đã hoàn tất hoặc đóng).' })}</span>
            </div>
          ) : (
            <div className="dispute-chat-input-bar">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('disputes.chatPlaceholder', { defaultValue: 'Nhập tin nhắn, giải trình hoặc phản hồi gửi đến Admin & đối tác... (Nhấn Enter để gửi)' })}
                rows={2}
                disabled={!conversationId || sending}
              />
              <button
                type="button"
                className="dispute-chat-send-btn"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || !conversationId || sending}
              >
                {sending ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}
                <span>{t('disputes.chatSend', { defaultValue: 'Gửi' })}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
