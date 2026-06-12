import { useNavigate } from 'react-router';
import { 
  ArrowLeft, Ban, CreditCard, Plus, Send, 
  Paperclip, Smile, Sparkles, CheckCircle, Circle, Download, 
  FileText, Image as ImageIcon, Table, Info, X 
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import '../styles/project-workspace-screen.css';

const AI_QUICK_SUGGESTIONS = [
  'Summarize project progress',
  'Draft status update for partner',
  'Suggest next milestone steps',
  'Review files list',
];

export default function ProjectWorkspaceScreen() {
  const navigate = useNavigate();

  const {
    user,
    isClient,
    activeProjectId,
    setActiveProjectId,
    showInfo,
    setShowInfo,
    showAIAssistant,
    setShowAIAssistant,
    showDealPrice,
    setShowDealPrice,
    dealPriceInput,
    setDealPriceInput,
    messageInput,
    setMessageInput,
    aiMessage,
    setAiMessage,
    isFavorited,
    setIsFavorited,
    isBlocked,
    setIsBlocked,
    dealStatus,
    proposedPrice,
    aiChat,
    project,
    mockProjects,
    currentProjData,
    partnerName,
    partnerAvatar,
    partnerTitle,
    partnerCompany,
    isPartnerOnline,
    projectMessages,
    handleSendMessage,
    handleSendAiMessage,
    handleProposeDeal,
    handleAcceptDeal,
    handleDeclineDeal,
    handleSimulateAttachment,
    handleCreateMockMilestone,
    chatEndRef,
  } = useProjectWorkspace('proj_1');

  return (
    <AppLayout fullWidth>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* Top Header */}
        <header className="glass-header sticky top-0 z-50 flex justify-between items-center px-8 py-3 border-b border-border shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-muted-foreground hover:text-[var(--gb-cyan)] transition-colors group cursor-pointer"
            >
              <ArrowLeft size={18} />
              <span className="font-semibold text-sm">Back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-base font-bold text-foreground">{currentProjData.titleLong}</h1>
              <button 
                onClick={() => navigate(`/jobs/${project.jobId}`)}
                className="text-[10px] text-[var(--gb-cyan)] font-bold hover:underline uppercase tracking-widest text-left mt-0.5 cursor-pointer"
              >
                View job post detail
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/contracts/contract_1`)}
              className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-[10px] px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest cursor-pointer"
            >
              View Contract
            </button>
          </div>
        </header>

        {/* 3-Column Messaging Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Column 1: Conversations List (Left Pane) */}
          <section className="w-80 border-r border-border flex flex-col bg-card">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-semibold">Recent Workspace</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {mockProjects.map(proj => {
                const isActive = proj.id === activeProjectId;
                return (
                  <div 
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      navigate(`/workspace/${proj.id}`);
                    }}
                    className={`border-b border-border/50 p-4 cursor-pointer transition-all group hover:bg-muted/30 ${isActive ? 'bg-[var(--gb-cyan)]/5 border-l-4 border-l-[var(--gb-cyan)]' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="relative flex-shrink-0">
                        <img alt={proj.partnerName} className="w-12 h-12 rounded-full object-cover" src={proj.partnerAvatar} />
                        {proj.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-headline-sm text-sm truncate font-semibold">{proj.partnerName}</h3>
                          <span className="text-[10px] text-muted-foreground">{proj.time}</span>
                        </div>
                        <p className={`text-xs truncate ${proj.unread ? 'text-foreground font-semibold animate-pulse' : 'text-muted-foreground'}`}>
                          {proj.latestMessage}
                        </p>
                      </div>
                      {proj.unread && (
                        <span className="w-2 h-2 bg-[var(--gb-cyan)] rounded-full self-center"></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Column 2: Chat Area (Center Pane) */}
          <section className="flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm">
            {/* Chat Header */}
            <div className="glass-header px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img alt={partnerName} className="w-10 h-10 rounded-full object-cover" src={partnerAvatar} />
                  {isPartnerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full"></span>
                  )}
                </div>
                <div>
                  <h2 className="font-headline-sm text-sm font-semibold">{partnerName}</h2>
                  <p className="text-[10px] text-green-500 font-semibold uppercase tracking-widest">
                    {isPartnerOnline ? 'Online' : 'Offline'} • {partnerTitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-all cursor-pointer ${showInfo ? 'bg-[var(--gb-cyan)]/10 border-[var(--gb-cyan)]/30 text-[var(--gb-cyan)]' : 'text-muted-foreground'}`}
                  title="Toggle Project Info"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Agreed Deal Price Banner for Freelancer */}
            {dealStatus === 'agreed' && !isClient && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <CheckCircle size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-foreground">Mức giá đã được thống nhất</h4>
                    <p className="text-xs text-muted-foreground">Vui lòng tiến hành ký hợp đồng để bắt đầu công việc.</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/workspace/${activeProjectId}/freelancer-contract`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Đi tới trang ký hợp đồng</span>
                  <span>→</span>
                </button>
              </div>
            )}

            {/* Agreed Deal Price Banner for Client */}
            {dealStatus === 'agreed' && isClient && (
              <div className="bg-[var(--gb-cyan)]/10 border-b border-[var(--gb-cyan)]/20 px-6 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="w-10 h-10 rounded-full bg-[var(--gb-cyan)] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <CheckCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-foreground">Mức giá đã được thống nhất</h4>
                  <p className="text-xs text-muted-foreground">Freelancer đã đồng ý, cùng đợi freelancer tạo hợp đồng.</p>
                </div>
              </div>
            )}

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
              <div className="flex justify-center">
                <span className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Project Workspace Chat
                </span>
              </div>

              {/* Chat bubbles */}
              {projectMessages.map((msg, index) => {
                const isMe = msg.senderId === user?.id || (msg.senderId === 'client' && isClient) || (msg.senderId === 'freelancer' && !isClient);
                return (
                  <div key={msg.id || index} className={`flex items-end gap-3 max-w-[80%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <img alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" src={partnerAvatar} />
                    )}
                    <div className="flex flex-col gap-1">
                      {msg.type === 'file' ? (
                        <div className="bg-card p-4 rounded-2xl shadow-sm border border-border max-w-sm">
                          <p className="text-sm text-foreground mb-3">{msg.content}</p>
                          <div className="rounded-xl overflow-hidden border border-border">
                            {msg.fileUrl ? (
                              <img alt="Attachment" className="w-full h-48 object-cover" src={msg.fileUrl} />
                            ) : (
                              <div className="w-full h-32 bg-muted flex items-center justify-center">
                                <FileText size={32} className="text-muted-foreground" />
                              </div>
                            )}
                            <div className="bg-muted p-2 flex justify-between items-center text-[10px] text-muted-foreground">
                              <span className="truncate">{msg.fileName}</span>
                              <Download size={14} className="cursor-pointer hover:text-[var(--gb-cyan)]" onClick={() => alert(`Simulating download of ${msg.fileName}`)} />
                            </div>
                          </div>
                        </div>
                      ) : msg.type === 'deal' ? (
                        <div className="bg-card border border-border rounded-2xl p-4 shadow-md max-w-md my-2">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)]">
                              <CreditCard size={20} />
                            </div>
                            <div>
                              <h3 className="font-headline-sm text-sm text-foreground font-bold">New Deal Proposal</h3>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {dealStatus === 'pending_client' ? 'In Negotiation' : dealStatus === 'agreed' ? 'Agreed' : 'Declined'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground">Proposed Deal Price</label>
                              <div className="text-xl font-bold text-[var(--gb-cyan)]">
                                ${msg.content} USD
                              </div>
                            </div>
                            {dealStatus === 'pending_client' ? (
                              isClient ? (
                                <div className="text-xs text-muted-foreground bg-muted p-2 rounded-lg text-center font-medium">
                                  Waiting for partner response...
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleAcceptDeal(msg.id, msg.content)}
                                    className="flex-1 bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                  >
                                    Đồng ý
                                  </button>
                                  <button 
                                    onClick={() => handleDeclineDeal(msg.id)}
                                    className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )
                            ) : dealStatus === 'agreed' ? (
                              <div className="text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg text-center font-bold">
                                {isClient ? 'Freelancer đã đồng ý, cùng đợi freelancer tạo hợp đồng' : 'Mức giá đã được thống nhất'}
                              </div>
                            ) : (
                              <div className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg text-center font-bold">
                                {isClient ? 'Freelancer đã từ chối mức giá này' : 'Bạn đã từ chối mức giá này'}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={`p-4 rounded-2xl shadow-sm border ${isMe ? 'bg-[var(--gb-cyan)] text-white border-transparent rounded-br-none' : 'bg-card text-foreground border-border rounded-bl-none'}`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className="text-[12px] text-[var(--gb-cyan)] font-bold">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-card border-t border-border">
              <div className="flex flex-col border border-border rounded-2xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">
                
                {/* AI Assistant Popup */}
                {showAIAssistant && (
                  <div className="absolute bottom-full right-0 mb-4 w-80 bg-card rounded-2xl shadow-xl border border-border overflow-hidden z-[70] animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-[var(--gb-cyan)]/5 px-4 py-3 border-b border-border flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[var(--gb-cyan)] animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">AI Work Assistant</span>
                      </div>
                      <button onClick={() => setShowAIAssistant(false)} className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-4 h-48 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                      {aiChat.map((c, i) => (
                        <div key={i} className={`p-3 rounded-xl text-xs leading-relaxed ${c.role === 'ai' ? 'bg-[var(--gb-cyan)]/10 text-foreground rounded-bl-none' : 'bg-muted text-muted-foreground rounded-br-none self-end max-w-[85%]'}`}>
                          {c.content}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-border bg-card">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Ask AI..." 
                          value={aiMessage}
                          onChange={e => setAiMessage(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSendAiMessage(); }}
                          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--gb-cyan)]"
                        />
                        <button onClick={handleSendAiMessage} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gb-cyan)] cursor-pointer">
                          <Send size={14} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {AI_QUICK_SUGGESTIONS.slice(0, 2).map(s => (
                          <button 
                            key={s} 
                            onClick={() => { setAiMessage(s); }}
                            className="text-[9px] px-2 py-0.5 bg-muted rounded border border-border text-muted-foreground hover:bg-border transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Deal Price Window popup */}
                {showDealPrice && (
                  <div className="p-4 border-b border-border bg-muted/50 rounded-t-2xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Propose Deal Price</span>
                        <span className="text-[var(--gb-cyan)] font-bold text-sm">$</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="Enter proposed price (USD)" 
                        value={dealPriceInput}
                        onChange={e => setDealPriceInput(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25"
                      />
                      <div className="flex justify-between gap-2 mt-1">
                        <button 
                          onClick={() => setShowDealPrice(false)} 
                          className="flex-1 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors uppercase tracking-widest cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleProposeDeal}
                          className="flex-1 py-2 text-xs font-bold bg-[var(--gb-cyan)] text-white rounded-lg shadow-md hover:bg-[var(--gb-cyan)]/90 transition-colors uppercase tracking-widest cursor-pointer"
                        >
                          Agree
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <textarea 
                  className="w-full bg-transparent border-none focus:outline-none p-4 resize-none min-h-[56px] text-sm focus:ring-0" 
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
                
                <div className="flex justify-between items-center px-4 pb-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSimulateAttachment}
                      className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer" 
                      title="Attach File"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button 
                      onClick={() => setMessageInput(prev => prev + '😊')}
                      className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer" 
                      title="Add Emoji"
                    >
                      <Smile size={18} />
                    </button>
                    <button 
                      onClick={() => setShowAIAssistant(!showAIAssistant)}
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer ${showAIAssistant ? 'text-[var(--gb-cyan)] bg-muted' : 'text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted'}`}
                      title="AI Assistant"
                    >
                      <Sparkles size={18} />
                    </button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    {isClient && (
                      <button 
                        onClick={() => setShowDealPrice(!showDealPrice)}
                        title="Propose Deal Price" 
                        className="w-9 h-9 flex items-center justify-center bg-[var(--gb-cyan)]/10 hover:bg-[var(--gb-cyan)] hover:text-white rounded-full transition-all active:scale-95 text-[var(--gb-cyan)] cursor-pointer"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white h-10 px-6 rounded-full flex items-center gap-2 font-semibold transition-all active:scale-95 shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    <span>Send</span>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Column 3: Contextual Info (Right Pane - Collapsible) */}
          <aside 
            className={`flex flex-col bg-card border-l border-border transition-all duration-300 overflow-y-auto custom-scrollbar ${showInfo ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
          >
            {/* Profile Section */}
            <div className="p-6 text-center border-b border-border">
              <img alt={partnerName} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-[var(--gb-cyan)] object-cover" src={partnerAvatar} />
              <h3 className="font-headline-md text-base font-bold">{partnerName}</h3>
              <p className="text-xs text-muted-foreground mb-4">{partnerTitle} at {partnerCompany}</p>
              <div className="flex justify-center gap-2">
                <button 
                  onClick={() => navigate(`/profile/${isClient ? 'freelancer' : 'client'}/${isClient ? project.freelancerId : project.clientId}`)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-secondary text-foreground hover:bg-muted uppercase tracking-wider transition-all cursor-pointer"
                >
                  VIEW PROFILE
                </button>
                <button 
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider transition-all cursor-pointer ${isFavorited ? 'bg-[var(--gb-cyan)] text-white font-bold' : 'bg-secondary text-foreground hover:bg-muted'}`}
                >
                  {isFavorited ? 'FAVORITED' : 'FAVORITE'}
                </button>
              </div>
            </div>

            {/* Projects/Milestones */}
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-headline-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestone Management</h4>
                {isClient && (
                  <button 
                    onClick={handleCreateMockMilestone}
                    className="w-8 h-8 flex items-center justify-center bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] rounded-lg hover:bg-[var(--gb-cyan)] hover:text-white transition-all cursor-pointer" 
                    title="Create Milestone"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {project.milestones.map((milestone) => {
                  const isCompleted = milestone.status === 'paid' || milestone.status === 'approved';
                  const isInProgress = milestone.status === 'in_progress';
                  
                  return (
                    <div 
                      key={milestone.id}
                      className={`border border-border rounded-xl p-3 shadow-sm ${isCompleted ? 'bg-card' : isInProgress ? 'bg-card border-[var(--gb-cyan)]/35' : 'bg-muted/30 opacity-80'}`}
                    >
                      <div className="flex items-start gap-3">
                        {isCompleted ? (
                          <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                        ) : isInProgress ? (
                          <div className="w-4 h-4 rounded-full border-2 border-[var(--gb-cyan)] flex items-center justify-center mt-0.5 flex-shrink-0">
                            <div className="w-2 h-2 bg-[var(--gb-cyan)] rounded-full animate-pulse"></div>
                          </div>
                        ) : (
                          <Circle size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{milestone.title}</p>
                          <p className={`text-[10px] ${isInProgress ? 'text-[var(--gb-cyan)] font-semibold' : 'text-muted-foreground'}`}>
                            {isCompleted ? `Completed • $${milestone.amount}` : isInProgress ? `In Progress • Due ${milestone.dueDate}` : `Upcoming • $${milestone.amount}`}
                          </p>
                          {isInProgress && (
                            <div className="mt-2">
                              <div className="w-full bg-muted h-1.5 rounded-full mb-3 overflow-hidden">
                                <div className="bg-[var(--gb-cyan)] h-full rounded-full w-[65%]"></div>
                              </div>
                              {isClient && (
                                <button className="w-full bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer">
                                  Approve Completion
                                </button>
                              )}
                              {!isClient && (
                                <button className="w-full bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer">
                                  Submit Deliverable
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shared Files */}
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-headline-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared Files</h4>
                <button className="text-xs text-[var(--gb-cyan)] hover:underline font-semibold cursor-pointer">See all</button>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Contract_Alex_J.pdf', size: '2.4 MB', date: 'Oct 14', icon: <FileText className="text-red-500" /> },
                  { name: 'UI_Moodboard_v1.zip', size: '18.5 MB', date: 'Oct 13', icon: <ImageIcon className="text-[var(--gb-cyan)]" /> },
                  { name: 'Project_Timeline.xlsx', size: '120 KB', date: 'Oct 11', icon: <Table className="text-green-500" /> }
                ].map(file => (
                  <div 
                    key={file.name}
                    onClick={() => alert(`Simulating download of ${file.name}`)}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-all border border-transparent hover:border-border"
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {file.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate text-foreground">{file.name}</p>
                      <p className="text-[9px] text-muted-foreground">{file.size} • {file.date}</p>
                    </div>
                    <Download size={14} className="text-muted-foreground hover:text-[var(--gb-cyan)] flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto p-6 bg-muted/30 border-t border-border">
              <button 
                onClick={() => {
                  setIsBlocked(!isBlocked);
                  alert(isBlocked ? 'Contact unblocked.' : 'Contact blocked.');
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${isBlocked ? 'border-green-500/30 text-green-500 hover:bg-green-500/5' : 'border-red-500/30 text-red-500 hover:bg-red-500/5'}`}
              >
                <Ban size={14} />
                {isBlocked ? 'Unblock Contact' : 'Block Contact'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
