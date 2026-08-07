import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, LoaderCircle, MessageSquare, Paperclip, Send, ShieldCheck, User } from 'lucide-react';
import { messageGetAPI, type ConversationMessageResponse, DisputeMessageRecipient } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { MessageType } from '../../../types/models/Message';
import { UserRole } from '../../../types/models/User';
import * as signalR from '@microsoft/signalr';
import { getChatHubUrl } from '../../../service/apiService';

interface DisputeChatProps {
  disputeId: string;
}

export function DisputeChat({ disputeId }: DisputeChatProps) {
  const { t } = useTranslation();
  const { user } = useApp();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageResponse[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setError(t('disputes.chatUnavailable'));
        setLoading(false);
        return;
      }
      setConversationId(conversation.conversationId);
      const response = await messageGetAPI.getConversationMessages(conversation.conversationId, undefined, 100);
      if (cancelled) return;
      if (response.success) setMessages(response.data ?? []);
      else setError(response.message || t('disputes.chatLoadFailed'));
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
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getChatHubUrl(), { accessTokenFactory: () => localStorage.getItem('access_token') ?? '' })
      .withAutomaticReconnect()
      .build();
    const refreshMessages = (payload: Record<string, unknown>) => {
      const eventConversationId = String(payload.conversationId ?? payload.conversationsId ?? payload.ConversationsId ?? '');
      if (eventConversationId !== conversationId) return;
      void messageGetAPI.getConversationMessages(conversationId, undefined, 100).then(response => {
        if (!disposed && response.success) setMessages(response.data ?? []);
      });
    };
    connection.on('ReceiveMessage', refreshMessages);
    connection.onreconnected(() => void connection.invoke('JoinConversation', conversationId));
    void connection.start()
      .then(() => disposed ? connection.stop() : connection.invoke('JoinConversation', conversationId))
      .catch(() => undefined);
    return () => {
      disposed = true;
      connection.off('ReceiveMessage', refreshMessages);
      void connection.stop();
    };
  }, [conversationId]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !conversationId || sending) return;
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
      setError(response.message || t('disputes.chatSendFailed'));
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
    <section className="dispute-detail-card dispute-chat-section">
      <div className="dispute-detail-section-title">
        <MessageSquare size={20} className="text-cyan-500" />
        <h2>{t('disputes.chatTitle')}</h2>
      </div>

      {loading ? (
        <div className="dispute-chat-state">
          <LoaderCircle className="dispute-detail-spinner" size={24} /> {t('disputes.chatLoading')}
        </div>
      ) : (
        <>
          <div className="dispute-chat-messages" ref={chatContainerRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="dispute-chat-empty">
                <MessageSquare size={32} />
                <p>{t('disputes.chatEmpty')}</p>
                <small>Communicate directly with all dispute participants and administrators.</small>
              </div>
            )}

            {messages.map((message, index) => {
              const system = message.messageType === MessageType.System || message.messageType === MessageType.DisputeEvent;
              if (system) {
                return (
                  <div className="dispute-chat-system" key={message.messageId}>
                    <span>{message.content}</span>
                  </div>
                );
              }

              const isOfficial = message.messageType === MessageType.AdminOfficial;
              if (isOfficial) {
                return (
                  <div className="dispute-chat-official" key={message.messageId}>
                    <div className="dispute-chat-official-header">
                      <ShieldCheck size={16} />
                      <strong>Official Administrative Directive</strong>
                      {message.disputeRecipient !== null && message.disputeRecipient !== undefined && (
                        <span className="dispute-recipient-tag">
                          {message.disputeRecipient === DisputeMessageRecipient.Client ? 'Client Only' : message.disputeRecipient === DisputeMessageRecipient.Freelancer ? 'Freelancer Only' : 'Both Parties'}
                        </span>
                      )}
                    </div>
                    <div className="dispute-chat-official-body">{message.content}</div>
                    {message.attachments.length > 0 && (
                      <div className="dispute-chat-attachments">
                        {message.attachments.map(attachment => (
                          <a key={attachment.messageAttachmentId} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="dispute-attachment-chip">
                            <Paperclip size={13} /> {attachment.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                    <time>{new Date(message.sentAt).toLocaleString()}</time>
                  </div>
                );
              }

              const mine = message.senderUserId === user?.id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const sameSender = prevMessage && prevMessage.senderUserId === message.senderUserId && prevMessage.messageType !== MessageType.System && prevMessage.messageType !== MessageType.AdminOfficial;

              return (
                <div className={`dispute-chat-message-row ${mine ? 'mine' : ''} ${sameSender ? 'grouped' : ''}`} key={message.messageId}>
                  {!mine && !sameSender && (
                    <div className="dispute-chat-avatar">
                      {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={message.senderName || 'Sender'} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.senderName ? message.senderName[0].toUpperCase() : <User size={14} />}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="dispute-chat-bubble-container">
                    {!mine && !sameSender && (
                      <div className="dispute-chat-meta">
                        <span className="dispute-sender-name">{message.senderName || 'Participant'}</span>
                        {renderRoleBadge(message.senderRole, isOfficial)}
                      </div>
                    )}

                    <div className={`dispute-chat-bubble ${mine ? 'mine' : ''}`}>
                      <div className="dispute-chat-text">{message.content}</div>

                      {message.attachments.length > 0 && (
                        <div className="dispute-chat-attachments">
                          {message.attachments.map(attachment => (
                            <a key={attachment.messageAttachmentId} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="dispute-attachment-chip">
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
            <div className="dispute-download-error" role="alert">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="dispute-chat-input-bar">
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('disputes.chatPlaceholder') || 'Write a message to dispute participants...'}
              rows={2}
              disabled={!conversationId || sending}
            />
            <button
              type="button"
              className="dispute-chat-send-btn"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || !conversationId || sending}
            >
              {sending ? <LoaderCircle className="dispute-detail-spinner" size={17} /> : <Send size={17} />}
              <span>{t('disputes.chatSend') || 'Send'}</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
