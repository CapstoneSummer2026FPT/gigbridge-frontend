import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Send, Paperclip, Bot, CheckCircle, Clock, DollarSign, Files, ChevronRight, X, MessageSquare } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { DB, SEED_PROJECTS, SEED_MESSAGES } from '../../../mock_backend';
import '../styles/project-workspace-screen.css';

const AI_QUICK_SUGGESTIONS = [
  'Summarize project progress',
  'Draft status update for client',
  'Suggest next milestone steps',
  'Review code quality guidelines',
];

export default function ProjectWorkspaceScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useApp();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [showAI, setShowAI] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiChat, setAiChat] = useState<{ role: string; content: string }[]>([
    { role: 'ai', content: 'Hello! I\'m your AI Work Assistant. I can help you with project updates, code reviews, milestone planning, and much more. What do you need today?' }
  ]);
  const [activeTab, setActiveTab] = useState<'chat' | 'milestones' | 'files'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const project = SEED_PROJECTS[0];
  const client = DB.getUserById(project.clientId);
  const freelancer = DB.getUserById(project.freelancerId);
  const partner = role === 'client' ? freelancer : client;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    const newMsg = {
      id: `msg_${Date.now()}`, conversationId: 'conv_1', senderId: user?.id || '',
      content: message, type: 'text' as const, createdAt: new Date().toISOString(), isRead: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setMessage('');
    setTimeout(() => {
      const reply = {
        id: `msg_${Date.now() + 1}`, conversationId: 'conv_1', senderId: partner?.id || '',
        content: 'Got it, thanks for the update! I\'ll review this shortly and get back to you.', type: 'text' as const,
        createdAt: new Date().toISOString(), isRead: false,
      };
      setMessages(prev => [...prev, reply]);
    }, 1500);
  };

  const sendAIMessage = async () => {
    if (!aiMessage.trim()) return;
    const userMsg = aiMessage;
    setAiChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiMessage('');
    await new Promise(r => setTimeout(r, 1000));
    const responses: Record<string, string> = {
      default: 'Based on your project progress (35% complete), you\'re on track to meet the deadline. Milestone 2 is in progress. The next recommended step is to complete the product listing components and begin the cart functionality.',
    };
    const aiReply = responses[userMsg.toLowerCase()] || responses.default;
    setAiChat(prev => [...prev, { role: 'ai', content: aiReply }]);
  };

  const completedMilestones = project.milestones.filter(m => m.status === 'paid' || m.status === 'approved').length;

  return (
    <AppLayout fullWidth>
      <div className="project-workspace-page flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Project Info */}
        <div className="hidden md:flex flex-col w-72 flex-shrink-0 p-4 overflow-y-auto border-r border-primary">
          {/* Project Header */}
          <div className="mb-5">
            <h2 className="text-primary font-semibold text-sm mb-1">{project.title}</h2>
            <div className="flex items-center gap-2">
              <span className="badge-green text-xs">Active</span>
              <span className="text-xs text-secondary">{project.progress}% complete</span>
            </div>
            <div className="progress-bar-gb mt-2">
              <div className="progress-bar-gb-fill" style={{ width: `${project.progress}%` }} />
            </div>
          </div>

          {/* Partner Info */}
          <div className="p-3 rounded-xl mb-5 bg-secondary border border-primary">
            <p className="text-xs mb-2 text-secondary">{role === 'client' ? 'Freelancer' : 'Client'}</p>
            <div className="flex items-center gap-2">
              <img src={partner?.avatar} alt={partner?.name} className="w-8 h-8 rounded-lg" />
              <div>
                <p className="text-primary text-sm font-medium">{partner?.name}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-medium" />
                  <p className="text-xs text-green">Online</p>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Overview */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-primary text-sm font-semibold">Milestones</p>
              <p className="text-xs text-secondary">{completedMilestones}/{project.milestones.length}</p>
            </div>
            <div className="space-y-2">
              {project.milestones.map((m, i) => {
                const statusColor = { paid: '#22C55E', approved: '#22C55E', in_progress: '#0077FF', submitted: '#F59E0B', pending: '#8892A4' }[m.status] || '#8892A4';
                return (
                  <div key={m.id} className="flex items-start gap-2 p-2 rounded-lg"
                    style={{ background: 'var(--workspace-subtle-bg)', border: `1px solid ${statusColor}30` }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: statusColor + '20', border: `1px solid ${statusColor}` }}>
                      {(m.status === 'paid' || m.status === 'approved') ? (
                        <CheckCircle size={10} style={{ color: statusColor }} />
                      ) : (
                        <span className="text-[8px] font-bold" style={{ color: statusColor }}>{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{m.title}</p>
                      <p className="text-[10px]" style={{ color: statusColor }}>{m.status.replace('_', ' ')}</p>
                    </div>
                    <p className="text-xs font-semibold text-green">${m.amount.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div className="p-3 rounded-xl mb-5" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <p className="text-xs mb-1 text-secondary">Budget Status</p>
            <p className="text-lg font-black text-green">
              ${project.paidAmount.toLocaleString()} <span className="text-sm opacity-60">/ ${project.totalBudget.toLocaleString()}</span>
            </p>
            <div className="progress-bar-gb mt-2">
              <div className="progress-bar-gb-fill" style={{ width: `${(project.paidAmount / project.totalBudget) * 100}%` }} />
            </div>
            <p className="text-xs mt-1 text-secondary">{Math.round((project.paidAmount / project.totalBudget) * 100)}% paid</p>
          </div>

          {/* AI Assistant Button */}
          <button
            onClick={() => setShowAI(!showAI)}
            className="flex items-center gap-2 p-3 rounded-xl transition-all"
            style={{ background: showAI ? 'rgba(159,75,255,0.15)' : 'rgba(159,75,255,0.06)', border: showAI ? '1px solid rgba(159,75,255,0.4)' : '1px solid rgba(159,75,255,0.2)', color: '#9F4BFF' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
              <Bot size={14} style={{ color: '#0A0F1C' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">AI Work Assistant</p>
              <p className="text-xs text-secondary">Ask anything about the project</p>
            </div>
          </button>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--workspace-border)' }}>
            <div className="flex items-center gap-3">
              <img src={partner?.avatar} alt={partner?.name} className="w-9 h-9 rounded-xl" />
              <div>
                <p className="text-primary font-semibold text-sm">{partner?.name}</p>
                <p className="text-xs text-green">● Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {['chat', 'milestones', 'files'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)}
                  className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                  style={{
                    background: activeTab === tab ? 'var(--workspace-tab-active-bg)' : 'var(--workspace-tab-bg)',
                    border: activeTab === tab ? '1px solid var(--workspace-accent-border)' : '1px solid var(--workspace-border)',
                    color: activeTab === tab ? 'var(--workspace-accent)' : 'var(--workspace-muted)',
                  }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          {activeTab === 'chat' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                const sender = DB.getUserById(msg.senderId);
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <img src={sender?.avatar} alt="" className="w-8 h-8 rounded-xl flex-shrink-0 mt-1" />
                    )}
                    <div className={`max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {msg.type === 'file' ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl"
                          style={{ background: isMe ? 'var(--workspace-message-sent-bg)' : 'var(--workspace-message-received-bg)', border: `1px solid ${isMe ? 'var(--workspace-accent-border)' : 'var(--workspace-border)'}` }}>
                          <Files size={16} className="text-cyan" />
                          <span className="text-primary text-sm">{msg.fileName}</span>
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 rounded-2xl text-sm"
                          style={{
                            background: isMe ? 'var(--workspace-message-sent-bg)' : 'var(--workspace-message-received-bg)',
                            border: isMe ? '1px solid var(--workspace-accent-border)' : '1px solid var(--workspace-border)',
                            color: 'var(--workspace-message-text)', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          }}>
                          {msg.content}
                        </div>
                      )}
                      <p className="text-[10px]" style={{ color: 'var(--workspace-muted)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {project.milestones.map((m, i) => {
                  const statusColor = { paid: '#22C55E', approved: '#22C55E', in_progress: '#0077FF', submitted: '#F59E0B', pending: '#8892A4' }[m.status] || '#8892A4';
                  return (
                    <div key={m.id} className="glass-card p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: statusColor + '20', border: `1px solid ${statusColor}40` }}>
                            <span className="text-sm font-bold" style={{ color: statusColor }}>{i + 1}</span>
                          </div>
                          <div>
                            <h3 className="text-primary font-semibold">{m.title}</h3>
                            <p className="text-xs capitalize" style={{ color: statusColor }}>{m.status.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <p className="text-xl font-black text-green">${m.amount.toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-secondary">{m.description}</p>
                      <p className="text-xs mt-2 text-secondary">Due: {m.dueDate}</p>
                      {m.status === 'in_progress' && role === 'freelancer' && (
                        <button className="btn-cyan mt-3 px-4 py-2 text-sm">Submit for Review</button>
                      )}
                      {m.status === 'submitted' && role === 'client' && (
                        <div className="flex gap-2 mt-3">
                          <button className="btn-cyan px-4 py-2 text-sm">Approve & Pay</button>
                          <button className="btn-ghost-cyan px-4 py-2 text-sm">Request Changes</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="glass-card p-4 mb-4">
                <p className="text-sm font-semibold text-primary mb-3">Shared Files</p>
                {[
                  { name: 'architecture-diagram.pdf', size: '2.4 MB', date: 'Apr 2' },
                  { name: 'ui-wireframes.fig', size: '8.1 MB', date: 'Apr 5' },
                  { name: 'api-spec.yml', size: '156 KB', date: 'Apr 8' },
                ].map(file => (
                  <div key={file.name} className="flex items-center justify-between p-3 rounded-xl mb-2"
                    style={{ background: 'var(--workspace-subtle-bg)', border: '1px solid var(--workspace-border)' }}>
                    <div className="flex items-center gap-3">
                      <Files size={16} className="text-cyan" />
                      <div>
                        <p className="text-primary text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-secondary">{file.size} · {file.date}</p>
                      </div>
                    </div>
                    <button className="text-xs text-cyan">Download</button>
                  </div>
                ))}
              </div>
              <div className="upload-zone">
                <Files size={24} className="mx-auto mb-2 text-secondary" />
                <p className="text-sm text-primary">Drop files or click to upload</p>
              </div>
            </div>
          )}

          {/* Message Input */}
          {activeTab === 'chat' && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--workspace-border)' }}>
              <div className="flex items-end gap-3">
                <button className="p-2.5 rounded-xl flex-shrink-0 transition-all"
                  style={{ background: 'var(--workspace-tab-bg)', border: '1px solid var(--workspace-border)', color: 'var(--workspace-muted)' }}>
                  <Paperclip size={18} />
                </button>
                <div className="flex-1 relative">
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message... (Enter to send)"
                    rows={1} className="input-gb w-full px-4 py-3 resize-none text-sm" />
                </div>
                <button
                  onClick={() => setShowAI(true)}
                  className="p-2.5 rounded-xl flex-shrink-0 transition-all"
                  style={{ background: 'rgba(159,75,255,0.1)', border: '1px solid rgba(159,75,255,0.25)', color: '#9F4BFF' }}>
                  <Bot size={18} />
                </button>
                <button onClick={sendMessage} disabled={!message.trim()}
                  className="btn-cyan p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40">
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar */}
        {showAI && (
          <div className="w-80 flex flex-col flex-shrink-0"
            style={{ borderLeft: '1px solid var(--workspace-ai-border)', background: 'var(--workspace-ai-panel-bg)' }}>
            {/* AI Header */}
            <div className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--workspace-ai-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center animate-orb"
                  style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                  <Bot size={14} style={{ color: '#0A0F1C' }} />
                </div>
                <div>
                  <p className="text-primary text-sm font-semibold">AI Work Assistant</p>
                  <p className="text-xs text-green">● Active</p>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="text-secondary">
                <X size={16} />
              </button>
            </div>

            {/* AI Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiChat.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                      <Bot size={10} style={{ color: '#0A0F1C' }} />
                    </div>
                  )}
                  <div className="px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={{
                      background: msg.role === 'ai' ? 'rgba(159,75,255,0.08)' : 'rgba(0,240,255,0.1)',
                      border: `1px solid ${msg.role === 'ai' ? 'rgba(159,75,255,0.2)' : 'rgba(0,240,255,0.2)'}`,
                      color: 'var(--workspace-message-text)', maxWidth: '85%',
                    }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick suggestions */}
            <div className="px-4 pb-2 flex flex-wrap gap-1">
              {AI_QUICK_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setAiMessage(s); }}
                  className="text-[10px] px-2 py-1 rounded-lg transition-all"
                  style={{ background: 'var(--workspace-tab-bg)', border: '1px solid var(--workspace-border)', color: 'var(--workspace-muted)' }}>
                  {s}
                </button>
              ))}
            </div>

            {/* AI Input */}
            <div className="p-4 pt-2" style={{ borderTop: '1px solid var(--workspace-ai-border)' }}>
              <div className="flex items-center gap-2">
                <input value={aiMessage} onChange={e => setAiMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendAIMessage(); }}
                  placeholder="Ask your AI assistant..." className="input-gb flex-1 px-3 py-2 text-xs" />
                <button onClick={sendAIMessage} className="btn-purple p-2 rounded-xl text-xs">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
