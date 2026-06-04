import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Bot, FileText, Image, MessageSquare, Paperclip, Send, Wifi, WifiOff } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, type ChatMessage, type Conversation } from '../mock/data-for-ChatScreen';
import '../styles/chat-screen.css';

const MAX_MESSAGE_LENGTH = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ChatScreen() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [activeConversationId, setActiveConversationId] = useState(params.get('conversation') || MOCK_CONVERSATIONS[0]?.id);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting'>('connected');
  const [attachment, setAttachment] = useState<ChatMessage['attachment'] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(item => item.id === activeConversationId);
  const activeMessages = useMemo(() =>
    messages.filter(message => message.conversationId === activeConversationId),
    [activeConversationId, messages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMessages(prev => prev.map(message =>
      message.conversationId === activeConversationId ? { ...message, isRead: true } : message
    ));
  }, [activeConversationId, activeMessages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setConnectionState('reconnecting');
      setError('MSG53: Connection lost. Reconnecting...');
      window.setTimeout(() => {
        setConnectionState('connected');
        setError('');
      }, 900);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('MSG49: File must be under 10MB');
      return;
    }

    const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document';
    setAttachment({
      fileName: file.name,
      fileUrl: '#',
      fileSize: file.size,
      fileType,
    });
    setError('');
  };

  const sendMessage = () => {
    if (!activeConversation) return;
    const content = input.trim();

    if (activeConversation.isBanned) {
      setError('MSG30: This account was being banned!');
      return;
    }

    if (!content && !attachment) return;

    if (content.length > MAX_MESSAGE_LENGTH) {
      setError('MSG66: Message must be under 5000 characters');
      return;
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: user?.id || 'current_user',
      receiverId: activeConversation.participantId,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
      attachment: attachment || undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setConversations(prev => prev.map(conversation =>
      conversation.id === activeConversation.id
        ? { ...conversation, lastActivityAt: newMessage.createdAt }
        : conversation
    ).sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()));
    setInput('');
    setAttachment(null);
    setError('');

    window.setTimeout(() => {
      setMessages(prev => prev.map(message => message.id === newMessage.id ? { ...message, isRead: true } : message));
    }, 700);
  };

  return (
    <AppLayout>
      <div className="chat-page">
        <div className="chat-header">
          <div>
            <h1>Messages</h1>
            <p>Real-time messaging with file sharing and read receipts.</p>
          </div>
          <div className="chat-header-actions">
            <div className="chat-mode-tabs" aria-label="Chat modes">
              <button className="active" type="button">
                <MessageSquare size={15} />
                Messages
              </button>
              <button type="button" onClick={() => navigate('/ai-assistant')}>
                <Bot size={15} />
                AI Assistant
              </button>
            </div>
            <span className={`chat-connection ${connectionState}`}>
              {connectionState === 'connected' ? <Wifi size={15} /> : <WifiOff size={15} />}
              {connectionState === 'connected' ? 'SignalR Connected' : 'Reconnecting'}
            </span>
          </div>
        </div>

        {error && <div className="chat-error">{error}</div>}

        <div className="chat-shell">
          <aside className="chat-conversations">
            {conversations.map(conversation => (
              <button
                key={conversation.id}
                className={conversation.id === activeConversationId ? 'active' : ''}
                onClick={() => setActiveConversationId(conversation.id)}
              >
                <strong>{conversation.participantName}</strong>
                <span>{conversation.participantRole}</span>
              </button>
            ))}
          </aside>

          <main className="chat-panel">
            <div className="chat-panel-header">
              <strong>{activeConversation?.participantName}</strong>
              <span>{activeConversation?.participantRole}</span>
            </div>

            <div className="chat-messages">
              {activeMessages.map(message => {
                const mine = message.senderId === (user?.id || 'current_user') || message.senderId === 'current_user';
                return (
                  <div key={message.id} className={`chat-message ${mine ? 'mine' : ''}`}>
                    <p>{message.content}</p>
                    {message.attachment && (
                      <a className="chat-attachment" href={message.attachment.fileUrl}>
                        {message.attachment.fileType === 'image' ? <Image size={15} /> : <FileText size={15} />}
                        {message.attachment.fileName}
                      </a>
                    )}
                    <span>{new Date(message.createdAt).toLocaleTimeString()} · {mine ? (message.isRead ? 'Read' : 'Sent') : 'Read'}</span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {attachment && (
              <div className="chat-selected-file">
                <FileText size={15} />
                <span>{attachment.fileName}</span>
                <button onClick={() => setAttachment(null)}>Remove</button>
              </div>
            )}

            <div className="chat-compose">
              <label>
                <Paperclip size={18} />
                <input type="file" onChange={event => handleFileChange(event.target.files?.[0])} />
              </label>
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>
                <Send size={18} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
