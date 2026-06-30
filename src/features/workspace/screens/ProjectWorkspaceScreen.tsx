import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Ban, Send, Plus,
  Paperclip, Smile, CheckCircle, Circle, Download,
  FileText, Image as ImageIcon, Table, Info, CreditCard, MessageSquare
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { ContractStatus } from '../../../types/models/Contract';
import '../styles/project-workspace-screen.css';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';


export default function ProjectWorkspaceScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [mobileTab, setMobileTab] = useState<'list' | 'milestones' | 'chat'>('chat');
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const profilePopoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    user,
    isClient,
    activeProjectId,
    setActiveProjectId,
    showInfo,
    setShowInfo,
    messageInput,
    setMessageInput,
    isFavorited,
    setIsFavorited,
    isBlocked,
    setIsBlocked,
    project,
    activeContract,
    workspaceProjects,
    currentProjData,
    partnerName,
    partnerAvatar,
    partnerTitle,
    partnerCompany,
    isPartnerOnline,
    projectMessages,
    handleSendMessage,
    handleSimulateAttachment,
    handleCreateMockMilestone,
    chatEndRef,
  } = useProjectWorkspace(contractId || '');
  const workspaceContractId = contractId || activeProjectId;

  return (
    <AppLayout fullWidth hideAIWidget>
      <div className="project-workspace-page flex flex-col h-[calc(100vh-5rem)] pt-4 bg-background text-foreground overflow-hidden">
        {/* Top Header */}
        <header className="glass-header sticky top-0 z-50 flex justify-between items-center px-8 py-3 border-b border-border shadow-sm flex-shrink-0">
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
              onClick={() => navigate(`/contracts/${project.contractId || contractId || ''}`)}
              className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-[10px] px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest cursor-pointer"
            >
              View Contract
            </button>
          </div>
        </header>

        {activeContract?.status === ContractStatus.PendingEscrow && (
          <div className="px-8 py-2 border-b border-amber-500/20 bg-amber-500/10 text-xs font-semibold text-amber-700 flex items-center gap-2">
            <CreditCard size={14} />
            <span>Workspace is open. Waiting for client escrow funding before work starts.</span>
          </div>
        )}

        {/* Mobile Navigation Tabs (visible only on mobile/tablet) */}
        <div className="flex lg:hidden border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'list'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Conversations
          </button>
          <button
            onClick={() => setMobileTab('milestones')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'milestones'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Milestones
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
              mobileTab === 'chat'
                ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5 font-semibold'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Chat & Files
          </button>
        </div>

        {/* 3-Column Messaging Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Column 1: Conversations List (Left Pane) */}
          <section className={`w-80 border-r border-border flex flex-col bg-card flex-shrink-0 lg:flex ${mobileTab === 'list' ? 'flex-1 w-full' : 'hidden lg:flex'}`}>
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="font-headline-sm text-xs uppercase tracking-widest text-muted-foreground font-semibold">Recent Workspace</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {workspaceProjects.map(proj => {
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

          {/* Column 2: Milestone Management (Center Pane) */}
          <section className={`flex-1 flex flex-col bg-card/20 m-2 rounded-2xl border border-border overflow-hidden relative shadow-sm lg:flex ${mobileTab === 'milestones' ? 'flex' : 'hidden lg:flex'}`}>
            {/* Header */}
            <div className="glass-header px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--gb-cyan)]/10 flex items-center justify-center text-[var(--gb-cyan)]">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="font-headline-sm text-sm font-semibold">Milestone Management</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Track deliverables and payments for {currentProjData.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isClient && (
                  <button
                    onClick={handleCreateMockMilestone}
                    className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md cursor-pointer"
                    title="Create Milestone"
                  >
                    <Plus size={16} />
                    <span>Propose Milestone</span>
                  </button>
                )}
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-all cursor-pointer ${showInfo ? 'bg-[var(--gb-cyan)]/10 border-[var(--gb-cyan)]/30 text-[var(--gb-cyan)]' : 'text-muted-foreground'}`}
                  title="Toggle Chat & Info Panel"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Dashboard stats */}
            <div className="p-6 bg-card/50 border-b border-border grid grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Milestones</span>
                <span className="text-xl font-bold mt-1">{project.milestones.length}</span>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Project Progress</span>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--gb-cyan)] h-full rounded-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                  <span className="text-xs font-bold">{project.progress}%</span>
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Paid Amount</span>
                <span className="text-xl font-bold mt-1 text-green-500"><GigCoinAmount amount={project.paidAmount || 0} /></span>
              </div>
            </div>

            {/* Milestones timeline/list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {project.milestones.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm">No milestones defined yet.</p>
                </div>
              ) : (
                project.milestones.map((milestone, idx) => {
                  const isCompleted = milestone.status === 'paid' || milestone.status === 'approved';
                  const isInProgress = milestone.status === 'in_progress';

                  return (
                    <div
                      key={milestone.id || idx}
                      className={`border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${
                        isCompleted
                          ? 'bg-card border-green-500/20'
                          : isInProgress
                          ? 'bg-card border-[var(--gb-cyan)]/50 ring-1 ring-[var(--gb-cyan)]/25'
                          : 'bg-muted/10 opacity-90 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isCompleted ? (
                              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                            ) : isInProgress ? (
                              <div className="w-5 h-5 rounded-full border-2 border-[var(--gb-cyan)] flex items-center justify-center flex-shrink-0">
                                <div className="w-2.5 h-2.5 bg-[var(--gb-cyan)] rounded-full animate-pulse"></div>
                              </div>
                            ) : (
                              <Circle size={20} className="text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{milestone.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{milestone.description || 'No description provided.'}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">Amount:</span> <GigCoinAmount amount={milestone.amount} />
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">Due Date:</span> {milestone.dueDate}
                              </span>
                              {milestone.completedAt && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <span className="font-semibold text-foreground">Completed:</span> {new Date(milestone.completedAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-green-500/10 text-green-500'
                              : isInProgress
                              ? 'bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)] animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {milestone.status}
                          </span>
                        </div>
                      </div>

                      {isInProgress && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                          <div className="flex-1 max-w-xs">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-bold text-[var(--gb-cyan)]">65%</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[var(--gb-cyan)] h-full rounded-full w-[65%]"></div>
                            </div>
                          </div>
                          <div>
                            {isClient ? (
                              <button
                                onClick={() => navigate(`/contracts/${workspaceContractId}/milestones/${milestone.id}/approve`)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                              >
                                Review Milestone
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/contracts/${workspaceContractId}/deliverables/${milestone.id}`)}
                                className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer"
                              >
                                Submit Deliverable
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 3: Interaction Pane (Right Pane - tabs: Chat, Files) */}
          <aside
            className={`border-l border-border flex flex-col bg-card overflow-hidden transition-all duration-300 flex-shrink-0
              lg:${ showInfo ? 'w-[450px] xl:w-[480px] opacity-100' : 'w-0 opacity-0 pointer-events-none' }
              ${mobileTab === 'chat' ? 'flex flex-1' : 'hidden lg:flex'}
              ${!showInfo ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : ''}
            `}
          >
            {/* 2 Tabs at the top */}
            <div className="flex border-b border-border bg-card">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare size={14} />
                <span>Nhắn tin</span>
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'files'
                    ? 'border-[var(--gb-cyan)] text-[var(--gb-cyan)] bg-[var(--gb-cyan)]/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText size={14} />
                <span>Shared Files</span>
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  {/* Chat Header */}
                  <div className="glass-header px-4 py-3 border-b border-border flex justify-between items-center flex-shrink-0">
                    {/* Partner info with JS-state hover popover */}
                    <div
                      className="flex items-center gap-3 relative cursor-pointer py-1"
                      onMouseEnter={() => {
                        if (profilePopoverTimeout.current) clearTimeout(profilePopoverTimeout.current);
                        setShowProfilePopover(true);
                      }}
                      onMouseLeave={() => {
                        profilePopoverTimeout.current = setTimeout(() => setShowProfilePopover(false), 150);
                      }}
                    >
                      <div className="relative">
                        <img alt={partnerName} className="w-8 h-8 rounded-full object-cover" src={partnerAvatar} />
                        {isPartnerOnline && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-card rounded-full"></span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xs font-semibold">{partnerName}</h2>
                        <p className="text-[9px] text-green-500 font-semibold uppercase tracking-widest">
                          {isPartnerOnline ? 'Online' : 'Offline'} • {partnerTitle}
                        </p>
                      </div>

                      {/* Hover Popover — stays open while hovered */}
                      {showProfilePopover && (
                        <div
                          className="absolute left-0 top-full w-64 bg-card border border-border rounded-xl shadow-2xl p-4 z-[80]"
                          onMouseEnter={() => {
                            if (profilePopoverTimeout.current) clearTimeout(profilePopoverTimeout.current);
                          }}
                          onMouseLeave={() => {
                            profilePopoverTimeout.current = setTimeout(() => setShowProfilePopover(false), 150);
                          }}
                        >
                          <div className="text-center">
                            <img alt={partnerName} className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-[var(--gb-cyan)] object-cover" src={partnerAvatar} />
                            <h3 className="font-bold text-xs text-foreground">{partnerName}</h3>
                            <p className="text-[9px] text-muted-foreground mb-3">{partnerTitle} at {partnerCompany}</p>
                            <div className="flex justify-center gap-2 mb-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${isClient ? 'freelancer' : 'client'}/${isClient ? project.freelancerId : project.clientId}`);
                                }}
                                className="text-[8px] font-bold px-3 py-1 rounded-full bg-secondary text-foreground hover:bg-muted uppercase tracking-wider transition-all cursor-pointer"
                              >
                                VIEW PROFILE
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsFavorited(!isFavorited);
                                }}
                                className={`text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                                  isFavorited ? 'bg-[var(--gb-cyan)] text-white' : 'bg-secondary text-foreground hover:bg-muted'
                                }`}
                              >
                                {isFavorited ? 'FAVORITED' : 'FAVORITE'}
                              </button>
                            </div>
                            <div className="border-t border-border pt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsBlocked(!isBlocked);
                                  alert(isBlocked ? 'Contact unblocked.' : 'Contact blocked.');
                                }}
                                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${
                                  isBlocked ? 'border-green-500/30 text-green-500 hover:bg-green-500/5' : 'border-red-500/30 text-red-500 hover:bg-red-500/5'
                                }`}
                              >
                                <Ban size={10} />
                                {isBlocked ? 'Unblock Contact' : 'Block Contact'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                    <div className="flex justify-center mb-1">
                      <span className="bg-muted px-2.5 py-0.5 rounded-full text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Project Workspace Chat
                      </span>
                    </div>

                    {projectMessages.map((msg, index) => {
                      const isMe = msg.senderId === user?.id || (msg.senderId === 'client' && isClient) || (msg.senderId === 'freelancer' && !isClient);
                      return (
                        <div key={msg.id || index} className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                          {!isMe && (
                            <img alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" src={partnerAvatar} />
                          )}
                          <div className="flex flex-col gap-1">
                            {msg.type === 'file' ? (
                              <div className="bg-card p-3 rounded-xl shadow-sm border border-border max-w-[280px]">
                                <p className="text-xs text-foreground mb-2">{msg.content}</p>
                                <div className="rounded-lg overflow-hidden border border-border">
                                  {msg.fileUrl ? (
                                    <img alt="Attachment" className="w-full h-32 object-cover" src={msg.fileUrl} />
                                  ) : (
                                    <div className="w-full h-24 bg-muted flex items-center justify-center">
                                      <FileText size={24} className="text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="bg-muted p-1.5 flex justify-between items-center text-[9px] text-muted-foreground">
                                    <span className="truncate max-w-[150px]">{msg.fileName}</span>
                                    <Download size={12} className="cursor-pointer hover:text-[var(--gb-cyan)]" onClick={() => alert(`Simulating download of ${msg.fileName}`)} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-3 rounded-xl shadow-sm border text-xs leading-relaxed ${isMe ? 'bg-[var(--gb-cyan)] text-white border-transparent rounded-br-none' : 'bg-card text-foreground border-border rounded-bl-none'}`}>
                                <p>{msg.content}</p>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] text-muted-foreground">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-[var(--gb-cyan)] font-bold">✓✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input area */}
                  <div className="p-3 bg-card border-t border-border flex-shrink-0">
                    <div className="flex flex-col border border-border rounded-xl bg-card relative focus-within:ring-2 focus-within:ring-[var(--gb-cyan)]/25 transition-all">
                      <textarea
                        className="w-full bg-transparent border-none focus:outline-none p-3 resize-none min-h-[44px] text-xs focus:ring-0"
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

                      <div className="flex justify-between items-center px-3 pb-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleSimulateAttachment}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer"
                            title="Attach File"
                          >
                            <Paperclip size={14} />
                          </button>
                          <button
                            onClick={() => setMessageInput(prev => prev + '😊')}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-[var(--gb-cyan)] hover:bg-muted rounded-full transition-all cursor-pointer"
                            title="Add Emoji"
                          >
                            <Smile size={14} />
                          </button>
                        </div>
                        <button
                          onClick={handleSendMessage}
                          className="bg-[var(--gb-cyan)] hover:bg-[var(--gb-cyan)]/90 text-white h-8 px-4 rounded-full flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          <span>Send</span>
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-headline-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared Files</h4>
                    <button className="text-[10px] text-[var(--gb-cyan)] hover:underline font-semibold cursor-pointer">See all</button>
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
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
