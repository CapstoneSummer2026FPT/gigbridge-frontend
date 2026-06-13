import {
  Send, Paperclip, Smile, Info, X, Ban, Download,
  FileText, Image as ImageIcon, Table, ChevronDown,
  CreditCard, CheckCircle, Briefcase, Layers,
  ExternalLink, MessageSquare, Settings2, ArrowRightLeft,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useMessages } from '../hooks/useMessages';
import { MOCK_ROOMS } from '../mock/data-for-MessagesScreen';
import '../styles/messages-screen.css';

export default function MessagesScreen() {
  const {
    user,
    role,
    isClient,
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
  } = useMessages();

  return (
    <AppLayout fullWidth>
      <div className="messages-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* Top Header */}
        <header className="glass-header sticky top-0 z-50 flex justify-between items-center px-8 py-3 border-b border-border shadow-sm">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-[var(--gb-cyan)]" />
            <div>
              <h1 className="font-headline-md text-base font-bold text-foreground">Messages</h1>
              <p className="text-[10px] text-muted-foreground">
                {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
        </header>

        {/* 3-Column Layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Column 1: Rooms & Conversations List ─────────────────────── */}
          <section className="w-80 border-r border-border flex flex-col bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Conversations
              </span>
            </div>

            <div className="flex-1 overflow-y-auto messages-custom-scroll">
              {MOCK_ROOMS.map(room => {
                const convos = conversationsState.filter(c => c.roomId === room.id);
                const roomUnread = convos.reduce((s, c) => s + c.unreadCount, 0);
                const isOpen = !!openRooms[room.id];
                const RoomIcon = room.type === 'invited' ? Briefcase : Layers;

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
                        <span className="text-sm font-semibold text-foreground">{room.label}</span>
                        <p className="text-[10px] text-muted-foreground leading-tight">{room.description}</p>
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
                          <p className="text-xs text-muted-foreground p-4 text-center">Empty room</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom prominent Go to Workspace button */}
            <div className="p-4 bg-muted/20 border-t border-border mt-auto">
              <button
                onClick={() => navigate('/projects')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer border-none"
              >
                <span>Go to Workspace</span>
                <span>→</span>
              </button>
            </div>
          </section>

          {/* ── Column 2: Chat Area (Center Pane) ────────────────────────── */}
          <section className="flex-1 flex flex-col bg-muted/10 overflow-hidden relative">
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
                    title="Click to view job post"
                  >
                    <Briefcase size={11} className="flex-shrink-0" />
                    <span className="truncate font-bold tracking-wide uppercase">{activeConv.job.title}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--gb-cyan)]/40 mx-0.5 flex-shrink-0" />
                    <span className="font-bold flex-shrink-0">{activeConv.job.budget}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  showInfo
                    ? 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title="Toggle Project Info"
              >
                <Info size={18} />
              </button>
            </div>

            {/* Agreed Deal Banner (freelancer: navigate to contract) */}
            {dealStatus === 'agreed' && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Mức giá đã được thống nhất</h4>
                  <p className="text-xs text-muted-foreground">
                    {isClient ? 'Cùng đợi freelancer tiến hành ký hợp đồng.' : 'Tiến hành ký hợp đồng để bắt đầu công việc.'}
                  </p>
                </div>
                 {!isClient && (
                  <button
                    onClick={() => navigate('/proj_1/freelancer-contract', { state: { conversationId: activeConvId } })}
                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Ký hợp đồng</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            )}

            {/* Negotiation accepted banner → conversation already moved */}
            {negStatus === 'accepted' && (
              <div className="bg-[var(--gb-cyan)]/10 border-b border-[var(--gb-cyan)]/20 px-6 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <ArrowRightLeft size={14} className="text-[var(--gb-cyan)] flex-shrink-0" />
                <p className="text-xs font-semibold text-[var(--gb-cyan)]">
                  Cuộc trò chuyện đã được chuyển sang <strong>vòng đàm phán</strong>
                </p>
              </div>
            )}

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 messages-custom-scroll">
              <div className="flex justify-center">
                <span className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {activeConv.roomType === 'invited' ? '📋 Invited Job Chat' : '🤝 Negotiation Chat'}
                </span>
              </div>

              {activeMessages.map((msg, idx) => {
                const mine = isMe(msg.senderId);
                const isSystem = msg.type === 'system' || msg.senderId === 'system';

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

                return (
                  <div
                    key={msg.id ?? idx}
                    className={`flex items-end gap-3 max-w-[80%] ${mine ? 'self-end flex-row-reverse' : 'self-start'}`}
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
                      {msg.type === 'file' ? (
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
                                {dealStatus === 'pending_freelancer' ? 'Đang chờ freelancer' : dealStatus === 'agreed' ? 'Đã đồng ý ✓' : 'Đã từ chối'}
                              </p>
                            </div>
                          </div>

                          <div className="bg-muted/50 rounded-xl p-3.5 mb-4 border border-border/50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Đề xuất mức giá</span>
                            <div className="text-2xl font-black text-[var(--gb-cyan)] mt-1">${msg.content} USD</div>
                          </div>

                          {dealStatus === 'pending_freelancer' ? (
                            !mine ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptDeal(msg.id, msg.content)}
                                  className="flex-1 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
                                >
                                  Đồng ý
                                </button>
                                <button
                                  onClick={() => handleDeclineDeal(msg.id)}
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
                          ) : dealStatus === 'agreed' ? (
                            <div className="text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg text-center font-bold">
                              Mức giá đã được thống nhất
                            </div>
                          ) : (
                            <div className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg text-center font-bold">
                              Đề xuất đã bị từ chối
                            </div>
                          )}
                        </div>

                      ) : (
                        /* ── Text message ───────────────────────────────────── */
                        <div
                          className={`p-4 rounded-2xl shadow-sm border ${
                            mine
                              ? 'bg-[var(--gb-cyan)] text-white border-transparent rounded-br-none'
                              : 'bg-card text-foreground border-border rounded-bl-none'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-muted-foreground">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {mine && <span className="text-[12px] text-[var(--gb-cyan)] font-bold">✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border">
              <div className="flex flex-col border border-border rounded-2xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">

                {/* Deal Price Popup */}
                {showDealPrice && activeConv.roomType === 'negotiation' && isClient && (
                  <div className="p-4 border-b border-border bg-muted/50 rounded-t-2xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Propose Deal Price</span>
                        <button onClick={() => setShowDealPrice(false)} className="text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent p-0">
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type="number"
                        id="input-deal-price"
                        placeholder="Enter proposed price (USD)"
                        value={dealPriceInput}
                        onChange={e => setDealPriceInput(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25"
                      />
                      <div className="flex justify-between gap-2">
                        <button
                          onClick={() => setShowDealPrice(false)}
                          className="flex-1 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors uppercase tracking-widest cursor-pointer border-none bg-transparent"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleProposeDeal}
                          id="btn-propose-deal"
                          className="flex-1 py-2 text-xs font-bold bg-[var(--gb-cyan)] text-white rounded-lg shadow-md hover:bg-[var(--gb-cyan)]/90 transition-colors uppercase tracking-widest cursor-pointer border-none"
                        >
                          Send Proposal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <textarea
                  id="msg-input"
                  className="w-full bg-transparent border-none focus:outline-none p-4 resize-none min-h-[52px] text-sm focus:ring-0"
                  placeholder="Type your message here..."
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
                      title="Attach File"
                    >
                      <Paperclip size={16} />
                    </button>

                    {/* Emoji */}
                    <button
                      onClick={() => setMessageInput(prev => prev + '😊')}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer border-none bg-transparent"
                      title="Add Emoji"
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
                    {activeConv.roomType === 'negotiation' && isClient && (
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
          </section>

          {/* ── Column 3: Contextual Info (Right Pane – Collapsible) ─────── */}
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
                {[
                  { name: 'Brief_Requirements.pdf', size: '1.2 MB', date: 'Jun 10', icon: <FileText className="text-red-500" size={14} /> },
                  { name: 'Portfolio_Sample.zip',   size: '8.4 MB', date: 'Jun 11', icon: <ImageIcon className="text-[var(--gb-cyan)]" size={14} /> },
                  { name: 'Project_Timeline.xlsx',  size: '98 KB',  date: 'Jun 11', icon: <Table className="text-green-500" size={14} /> },
                ].map(f => (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-all border border-transparent hover:border-border"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">{f.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{f.name}</p>
                      <p className="text-[9px] text-muted-foreground">{f.size} • {f.date}</p>
                    </div>
                    <Download size={13} className="text-muted-foreground hover:text-[var(--gb-cyan)] flex-shrink-0" />
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
        </div>
      </div>

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
    </AppLayout>
  );
}
