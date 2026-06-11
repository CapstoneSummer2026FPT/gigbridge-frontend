import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Bot, FileText, Image, MessageSquare, Paperclip, Send, Wifi, WifiOff, Plus, FileSignature, Check, X, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { messageGetAPI, ConversationSummaryResponse, ConversationMessageResponse } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import * as signalR from '@microsoft/signalr';
import '../styles/chat-screen.css';

const MAX_MESSAGE_LENGTH = 5000;

export default function ChatScreen() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  
  // API State
  const [conversations, setConversations] = useState<ConversationSummaryResponse[]>([]);
  const [messages, setMessages] = useState<ConversationMessageResponse[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Active Conversation ID
  const activeConversationId = params.get('conversation') || '';

  // UI States
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Final Offer States
  const [showFinalOfferModal, setShowFinalOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerScope, setOfferScope] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  // Refs
  const endRef = useRef<HTMLDivElement>(null);
  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const activeConversation = useMemo(() => 
    conversations.find(item => item.conversationId === activeConversationId),
    [activeConversationId, conversations]
  );

  const isClient = role === 0; // Client = 0, Freelancer = 1

  // Load conversations list
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await messageGetAPI.getConversations();
      if (res.success && res.data) {
        setConversations(res.data);
        if (!activeConversationId && res.data.length > 0) {
          setParams({ conversation: res.data[0].conversationId });
        }
      } else {
        setError('Failed to load chat conversations');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load message history for active conversation
  const loadMessages = async (id: string) => {
    try {
      setLoadingMessages(true);
      const res = await messageGetAPI.getConversationMessages(id);
      if (res.success && res.data) {
        // Reverse array as backend returns descending by sent time
        setMessages([...res.data].reverse());
      } else {
        setError('Failed to fetch messages');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading message history');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  // SignalR Hub Connection Setup
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication token missing');
      return;
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7094/api';
    const hubUrl = `${apiBase.replace('/api', '')}/hubs/chat`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    hubConnectionRef.current = connection;

    // Connect to Hub
    connection.start()
      .then(() => {
        setConnectionState('connected');
        setError('');
        console.log('✓ Connected to SignalR ChatHub');
      })
      .catch((err) => {
        console.error('✗ Hub connection failed:', err);
        setConnectionState('disconnected');
        setError('SignalR connection failed. Realtime disabled.');
      });

    // Handle Connection State Events
    connection.onreconnecting((err) => {
      setConnectionState('reconnecting');
      setError('SignalR Connection lost. Reconnecting...');
    });

    connection.onreconnected((id) => {
      setConnectionState('connected');
      setError('');
    });

    connection.onclose((err) => {
      setConnectionState('disconnected');
    });

    // Subscribe to Hub Message Events
    connection.on('ReceiveMessage', (message: ConversationMessageResponse) => {
      if (message.conversationId === activeConversationId) {
        setMessages(prev => {
          // Avoid duplicate messages
          if (prev.some(m => m.messageId === message.messageId)) return prev;
          return [...prev, message];
        });
        // Mark as read immediately on receiving
        messagePostAPI.markAsRead(message.conversationId, message.messageId);
      }
      
      // Update conversations summary state
      setConversations(prev => prev.map(c => 
        c.conversationId === message.conversationId
          ? {
              ...c,
              lastMessageAt: message.sentAt,
              lastMessage: message,
              unreadCount: c.conversationId === activeConversationId ? 0 : c.unreadCount + 1,
            }
          : c
      ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
    });

    // Subscribe to Final Offer Events
    connection.on('FinalOfferCreated', (payload: { offerId: string; messageId: string }) => {
      // Reload message history to render the offer message card
      if (activeConversationId) {
        loadMessages(activeConversationId);
      }
    });

    connection.on('FinalOfferResponded', (payload: { offerId: string; status: number; response: string }) => {
      if (activeConversationId) {
        loadMessages(activeConversationId);
      }
    });

    connection.on('ContractDraftUpdated', (payload: { contractId: string }) => {
      // Refresh summary
      loadConversations();
    });

    connection.on('ContractActivated', (payload: { contractId: string }) => {
      loadConversations();
    });

    // Handle Typing Indicators
    connection.on('Typing', (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId === activeConversationId && payload.userId !== user?.id) {
        setTypingUsers(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId]);
      }
    });

    connection.on('StopTyping', (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId === activeConversationId) {
        setTypingUsers(prev => prev.filter(uid => uid !== payload.userId));
      }
    });

    return () => {
      connection.stop();
    };
  }, [activeConversationId]);

  // Join/Leave Hub Groups when active conversation changes
  useEffect(() => {
    const connection = hubConnectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected || !activeConversationId) return;

    connection.invoke('JoinConversation', activeConversationId)
      .catch(err => console.error('SignalR join group error:', err));

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke('LeaveConversation', activeConversationId)
          .catch(err => console.error('SignalR leave group error:', err));
      }
    };
  }, [activeConversationId, connectionState]);

  // typing notifier triggers
  const handleInputChange = (val: string) => {
    setInput(val);
    const connection = hubConnectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected || !activeConversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      connection.invoke('Typing', activeConversationId).catch(err => console.error(err));
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      connection.invoke('StopTyping', activeConversationId).catch(err => console.error(err));
    }, 2000);
  };

  // REST sendMessage call with idempotent clientMessageId
  const handleSendMessage = async () => {
    if (!activeConversationId || !input.trim()) return;

    const content = input.trim();
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError('Message exceeds 5000 character limit');
      return;
    }

    setInput('');
    setError('');

    // Generate random UUID for clientMessageId mapping
    const clientMessageId = crypto.randomUUID();

    try {
      const res = await messagePostAPI.sendMessage({
        conversationId: activeConversationId,
        clientMessageId,
        content,
      });

      if (res.success && res.data) {
        const message = res.data;
        setMessages(prev => {
          if (prev.some(m => m.messageId === message.messageId)) return prev;
          return [...prev, message];
        });
      } else {
        setError(res.message || 'Failed to send message');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while sending message');
    }
  };

  // Client Final Offer dispatch
  const handleSendFinalOffer = async () => {
    if (!activeConversationId || !offerPrice) return;
    try {
      setOfferSubmitting(true);
      const res = await messagePostAPI.createFinalOffer({
        conversationId: activeConversationId,
        finalPrice: Number(offerPrice),
        scopeSummary: offerScope || undefined,
        startDate: offerStartDate || undefined,
        endDate: offerEndDate || undefined,
        clientNote: offerNote || undefined,
      });

      if (res.success) {
        setShowFinalOfferModal(false);
        setOfferPrice('');
        setOfferScope('');
        setOfferStartDate('');
        setOfferEndDate('');
        setOfferNote('');
        loadMessages(activeConversationId);
      } else {
        setError(res.message || 'Failed to dispatch final offer');
      }
    } catch (err: any) {
      setError(err.message || 'Error sending final offer');
    } finally {
      setOfferSubmitting(false);
    }
  };

  // Freelancer Final Offer Response
  const handleRespondFinalOffer = async (offerId: string, responseType: number) => {
    let reason = '';
    if (responseType === 1 || responseType === 2) {
      const inputReason = prompt(responseType === 1 ? 'Enter the changes you would like to request:' : 'Enter reason for declining:');
      if (inputReason === null) return; // cancelled prompt
      reason = inputReason;
    }

    try {
      const res = await messagePostAPI.respondFinalOffer({
        negotiationOfferId: offerId,
        response: responseType,
        reason: reason || undefined,
      });

      if (res.success) {
        loadMessages(activeConversationId);
        if (responseType === 0) {
          alert('Final offer accepted! Redirecting to setup contract terms...');
          // reload conversations to find contract id
          const convs = await messageGetAPI.getConversations();
          if (convs.success && convs.data) {
            const active = convs.data.find(c => c.conversationId === activeConversationId);
            if (active?.contractId) {
              navigate(`/contracts/${active.contractId}`);
            }
          }
        }
      } else {
        alert(res.message || 'Failed to register offer response');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error responding to final offer');
    }
  };

  // Render offer cards
  const renderFinalOfferCard = (msg: ConversationMessageResponse) => {
    let offerId = '';
    try {
      if (msg.metadata) {
        const meta = JSON.parse(msg.metadata);
        offerId = meta.negotiationOfferId || meta.offerId;
      }
    } catch (e) {
      console.error('Failed to parse offer metadata', e);
    }

    if (!offerId) return null;

    return (
      <div className="chat-offer-card bg-card border border-border/80 rounded-2xl p-5 my-3 shadow-md max-w-md backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3 text-primary">
          <FileSignature size={18} />
          <strong className="text-sm uppercase tracking-tight font-black">Final Offer Received</strong>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          The client has dispatched a binding final offer. Review details and respond below to finalize the negotiation terms.
        </p>

        {isClient ? (
          <div className="bg-secondary/40 border border-border/40 p-3.5 rounded-xl text-center text-xs font-semibold text-muted-foreground">
            Waiting for freelancer review
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => handleRespondFinalOffer(offerId, 0)}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check size={14} /> Accept Offer
            </button>
            <button
              onClick={() => handleRespondFinalOffer(offerId, 1)}
              className="flex-1 py-2 bg-secondary hover:bg-secondary/80 border border-border/50 text-foreground rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Request Changes
            </button>
            <button
              onClick={() => handleRespondFinalOffer(offerId, 2)}
              className="py-2 px-3 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
              title="Decline"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="chat-page">
        <div className="chat-header">
          <div>
            <h1>Messages</h1>
            <p>Real-time messaging with live typing indicator status.</p>
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
              {connectionState === 'connected' ? 'SignalR Connected' : connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
            </span>
          </div>
        </div>

        {error && (
          <div className="chat-error bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl p-4 mb-4 flex items-center gap-3 text-xs">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">Dismiss</button>
          </div>
        )}

        <div className="chat-shell">
          <aside className="chat-conversations">
            {loadingConversations ? (
              <div className="text-center py-10 text-xs text-muted-foreground">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">No conversations active</div>
            ) : (
              conversations.map(conversation => (
                <button
                  key={conversation.conversationId}
                  className={conversation.conversationId === activeConversationId ? 'active' : ''}
                  onClick={() => setParams({ conversation: conversation.conversationId })}
                >
                  <div className="flex justify-between items-start">
                    <strong>{conversation.title || 'Job Negotiation'}</strong>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-primary text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="block truncate text-[11px] text-muted-foreground mt-1">
                    {conversation.lastMessage?.content || 'Open chat negotiation'}
                  </span>
                </button>
              ))
            )}
          </aside>

          <main className="chat-panel">
            {activeConversation ? (
              <>
                <div className="chat-panel-header flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                  <div>
                    <strong>{activeConversation.title || 'Job Negotiation'}</strong>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Type: {activeConversation.conversationType === 1 ? 'Contract Workroom' : 'Negotiation Draft'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {activeConversation.contractId && (
                      <button
                        onClick={() => navigate(`/contracts/${activeConversation.contractId}`)}
                        className="px-4 py-2 bg-secondary/50 border border-border/40 hover:bg-secondary rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm"
                      >
                        View Contract Setup
                      </button>
                    )}

                    {isClient && activeConversation.conversationType === 0 && (
                      <button
                        onClick={() => setShowFinalOfferModal(true)}
                        className="px-4 py-2 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus size={14} /> Send Final Offer
                      </button>
                    )}
                  </div>
                </div>

                <div className="chat-messages">
                  {loadingMessages ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">Loading message history...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">Start the negotiation by typing a message below.</div>
                  ) : (
                    messages.map(message => {
                      const mine = message.senderUserId === user?.id;
                      const isSystem = !message.senderUserId;
                      const isOffer = message.messageType === 4;

                      if (isSystem) {
                        return (
                          <div key={message.messageId} className="chat-system-event my-4 text-center">
                            <span className="bg-secondary/40 text-muted-foreground text-[10px] px-3.5 py-1.5 rounded-full border border-border/30 inline-block font-semibold">
                              {message.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={message.messageId} className={`chat-message ${mine ? 'mine' : ''} ${isOffer ? 'offer-msg' : ''}`}>
                          {isOffer ? (
                            renderFinalOfferCard(message)
                          ) : (
                            <p>{message.content}</p>
                          )}
                          <span>
                            {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  {typingUsers.length > 0 && (
                    <div className="chat-message">
                      <div className="typing-dots flex gap-1 items-center p-2 rounded-xl bg-secondary/30 w-16 justify-center">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                <div className="chat-compose">
                  <textarea
                    value={input}
                    onChange={event => handleInputChange(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                  />
                  <button onClick={handleSendMessage} disabled={!input.trim()} className="cursor-pointer">
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                <MessageSquare size={36} className="opacity-40" />
                <p>Select a negotiation chat conversation to start messaging.</p>
              </div>
            )}
          </main>
        </div>

        {/* Create Final Offer Modal */}
        {showFinalOfferModal && (
          <div className="chat-modal-overlay flex items-center justify-center fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
            <div className="chat-modal bg-card border border-border/80 rounded-[2rem] p-8 max-w-lg w-full mx-4 shadow-2xl relative animate-in fade-in zoom-in duration-300">
              <button onClick={() => setShowFinalOfferModal(false)} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold uppercase tracking-tight text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-3">
                <FileSignature className="text-primary" /> Create Final Offer
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1.5">Final Budget (VND)</label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={e => setOfferPrice(e.target.value)}
                    placeholder="Enter total offer amount"
                    className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1.5">Scope Summary</label>
                  <textarea
                    value={offerScope}
                    onChange={e => setOfferScope(e.target.value)}
                    placeholder="Describe milestones scope details"
                    className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-foreground h-20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={offerStartDate}
                      onChange={e => setOfferStartDate(e.target.value)}
                      className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={offerEndDate}
                      onChange={e => setOfferEndDate(e.target.value)}
                      className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1.5">Client Note</label>
                  <textarea
                    value={offerNote}
                    onChange={e => setOfferNote(e.target.value)}
                    placeholder="Add personal note to freelancer"
                    className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all text-foreground h-16"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowFinalOfferModal(false)}
                  className="px-5 py-2.5 bg-secondary/40 hover:bg-secondary border border-border/50 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendFinalOffer}
                  disabled={!offerPrice || offerSubmitting}
                  className="px-5 py-2.5 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {offerSubmitting ? 'Sending...' : 'Send Final Offer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
