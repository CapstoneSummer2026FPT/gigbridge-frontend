import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  Copy,
  CornerDownLeft,
  Eraser,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import {
  estimateTokenUsage,
  type AIAssistantMessage,
} from '../types/assistant';
import { aiAssistantAPI } from '../../../api/aiAssistantAPI';
import { ThreeAINeuralSphere, type SphereActivityMode } from './ThreeAINeuralSphere';
import '../styles/ai-assistant-widget.css';

const AI_SESSION_KEY = 'gb_ai_widget_v6';

type ServiceState = 'ready' | 'thinking' | 'unavailable';

/* ── Web Audio Synthesizer (Studio Haptics) ── */
const playAudioEffect = (type: 'send' | 'receive' | 'chime' | 'tap') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, start: number, dur: number, vol = 0.04) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    };

    const t = ctx.currentTime;
    if (type === 'send') {
      playTone(480, t, 0.06, 0.03);
      playTone(720, t + 0.04, 0.08, 0.04);
    } else if (type === 'receive') {
      playTone(600, t, 0.08, 0.04);
      playTone(900, t + 0.06, 0.12, 0.05);
    } else if (type === 'chime') {
      playTone(540, t, 0.12, 0.03);
      playTone(810, t + 0.06, 0.18, 0.04);
    } else if (type === 'tap') {
      playTone(750, t, 0.02, 0.02);
    }
  } catch {
    /* Ignore audio restrictions */
  }
};

export default function AIAssistantWidget() {
  const { t } = useTranslation('ai');
  const { user, role } = useApp();
  const location = useLocation();

  const displayName = user?.full_name || user?.first_name || t('aiAssistant.guestName', 'Quý khách');
  const roleLabel = role === UserRole.Freelancer
    ? t('aiAssistant.roleFreelancer', 'Freelancer Workspace')
    : role === UserRole.Client
      ? t('aiAssistant.roleClient', 'Client Workspace')
      : t('aiAssistant.roleMember', 'GigBridge Member');



  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── State ── */
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState<AIAssistantMessage[]>(() => {
    try {
      const saved = localStorage.getItem(AI_SESSION_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [serviceState, setServiceState] = useState<ServiceState>('ready');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  /* ── 3D Sphere Activity Coupling State ── */
  const [activityMode, setActivityMode] = useState<SphereActivityMode>('idle');
  const [activityTrigger, setActivityTrigger] = useState(0);

  // Trigger energy shockwave on any interactive click
  const triggerPulse = useCallback(() => {
    setActivityTrigger(prev => prev + 1);
  }, []);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, serviceState]);

  /* ── Navigation-state trigger (from router redirect) ── */
  useEffect(() => {
    if ((location.state as { openAIAssistant?: boolean })?.openAIAssistant) {
      setIsOpen(true);
      triggerPulse();
      playAudioEffect('chime');
      window.history.replaceState({}, document.title);
    }
  }, [location.state, triggerPulse]);

  /* ── Global toggle event ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      setIsOpen(d && typeof d.open === 'boolean' ? d.open : p => !p);
      triggerPulse();
      playAudioEffect('chime');
    };
    window.addEventListener('toggle-ai-assistant', handler);
    return () => window.removeEventListener('toggle-ai-assistant', handler);
  }, [triggerPulse]);

  /* ── Persist messages ── */
  useEffect(() => {
    try {
      localStorage.setItem(AI_SESSION_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  /* ── Clear unread when panel opened ── */
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  // Handle typing activity connection with 3D Sphere
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setActivityMode('typing');
    triggerPulse();

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      if (serviceState !== 'thinking') {
        setActivityMode('idle');
      }
    }, 1200);
  };

  const reset = () => {
    triggerPulse();
    playAudioEffect('tap');
    try {
      localStorage.removeItem(AI_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setInput('');
    setServiceState('ready');
    setActivityMode('idle');
    setError('');
  };

  const copyMsg = async (msg: AIAssistantMessage) => {
    triggerPulse();
    await navigator.clipboard.writeText(msg.content);
    playAudioEffect('tap');
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || serviceState === 'thinking') return;
    if (text.length > 5000) {
      setError(t('aiAssistant.errors.maxLength', 'Nội dung vượt quá giới hạn 5.000 ký tự cho phép'));
      return;
    }

    triggerPulse();
    setActivityMode('send');
    playAudioEffect('send');

    const userMsg: AIAssistantMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      type: 'text',
      content: text,
      createdAt: new Date().toISOString(),
      tokenEstimate: estimateTokenUsage(text),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setError('');
    setServiceState('thinking');
    setActivityMode('thinking');

    try {
      const res = await aiAssistantAPI.query({
        question: text,
        history: newMessages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (res.success && res.data) {
        triggerPulse();
        playAudioEffect('receive');
        const botMsg: AIAssistantMessage = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          type: 'text',
          content: res.data.answer || t('aiAssistant.errors.noResponse', 'Không thể tạo phản hồi vào lúc này.'),
          createdAt: new Date().toISOString(),
          tokenEstimate: estimateTokenUsage(res.data.answer || ''),
        };
        setMessages(prev => [...prev, botMsg]);
        setServiceState('ready');
        setActivityMode('burst');
        setTimeout(() => setActivityMode('idle'), 1500);
      } else {
        setError(res.message || t('aiAssistant.errors.serviceUnavailable', 'Dịch vụ AI đang bảo trì kết nối. Vui lòng thử lại sau.'));
        setServiceState('unavailable');
        setActivityMode('idle');
      }
    } catch {
      setError(t('aiAssistant.errors.networkError', 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền.'));
      setServiceState('unavailable');
      setActivityMode('idle');
    }
  };

  return (
    <div className={`ai-widget ${isOpen ? 'is-panel-open' : ''}`}>

      {/* Iconic ConicBorder FAB Trigger Button */}
      <div className={`ai-fab-wrap ${isOpen ? 'is-panel-open' : ''}`}>
        <button
          type="button"
          className={`ai-fab ${isOpen ? 'is-open' : ''}`}
          onClick={() => {
            setIsOpen(p => !p);
            triggerPulse();
            playAudioEffect('chime');
          }}
          aria-label={t('aiAssistant.toggleAria', 'Mở GigBridge AI')}
        >
          {isOpen ? (
            <X size={20} className="ai-fab-close" />
          ) : (
            <div className="ai-fab-icon-wrap">
              <div className="ai-fab-core-glow" />
              <Sparkles size={22} className="ai-fab-sparkle-icon" />
            </div>
          )}
          {unread > 0 && !isOpen && <span className="ai-unread-badge animate-bounce">{unread}</span>}
        </button>
      </div>

      {/* Main Studio GIGBRIDGE AI Window with Concave Notch Header */}
      <div className={`ai-panel ${isOpen ? 'is-open' : ''} ${isExpanded ? 'is-expanded' : ''}`}>
        {/* Specular hairline top accent */}
        <div className="ai-panel-halo" />

        {/* ── Top Concave Notch Header ── */}
        <header className="ai-header ai-header--concave">
          <div className="ai-header-brand-wrap">
            {/* Header Synced 3D Mini Sphere without box */}
            <div className="ai-header-mini-sphere">
              <ThreeAINeuralSphere
                size="sm"
                activityMode={activityMode}
                activityTrigger={activityTrigger}
              />
              <span className="ai-brand-live-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="ai-brand-name">{t('aiAssistant.brandTitle', 'GIGBRIDGE AI')}</h3>
              <p className="ai-brand-context">
                {roleLabel} · {serviceState === 'thinking' ? t('aiAssistant.statusThinking', 'Đang phân tích…') : t('aiAssistant.statusReady', 'Sẵn sàng')}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="ai-header-controls">
            <button
              type="button"
              className="ai-ctrl-btn"
              onClick={reset}
              title={t('aiAssistant.resetTitle', 'Xóa cuộc trò chuyện')}
              aria-label={t('aiAssistant.resetTitle', 'Xóa cuộc trò chuyện')}
            >
              <Eraser size={14} />
            </button>

            <button
              type="button"
              className="ai-ctrl-btn hidden sm:inline-flex"
              onClick={() => {
                triggerPulse();
                setIsExpanded(p => !p);
              }}
              title={isExpanded ? t('aiAssistant.minimizeTitle', 'Thu nhỏ') : t('aiAssistant.expandTitle', 'Mở rộng Studio')}
              aria-label={isExpanded ? t('aiAssistant.minimizeTitle', 'Thu nhỏ') : t('aiAssistant.expandTitle', 'Mở rộng Studio')}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              type="button"
              className="ai-ctrl-btn close-btn"
              onClick={() => setIsOpen(false)}
              title={t('aiAssistant.closeAria', 'Đóng')}
              aria-label={t('aiAssistant.closeAria', 'Đóng')}
            >
              <X size={15} />
            </button>
          </div>
        </header>

        {/* Organic Concave Valley Divider */}
        <div className="ai-header-concave-curve">
          <svg viewBox="0 0 440 14" fill="none" preserveAspectRatio="none" className="ai-concave-svg">
            <path
              d="M0,0 L0,3 Q80,14 220,14 Q360,14 440,3 L440,0 Z"
              className="ai-concave-fill"
            />
            <path
              d="M0,3 Q80,14 220,14 Q360,14 440,3"
              className="ai-concave-stroke"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* ── Conversation Stream Body ── */}
        <div className="ai-body">
          {error && (
            <div className={`ai-alert ${serviceState === 'unavailable' ? 'danger' : 'warning'}`}>
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="ai-messages">
            {/* Empty State with 3D Three.js Interactive Hologram Sphere */}
            {messages.length === 0 && (
              <div className="ai-empty-container">
                <div
                  className="ai-threejs-sphere-wrap cursor-pointer"
                  onClick={triggerPulse}
                  title="Nhấp để phát xung năng lượng 3D"
                >
                  <ThreeAINeuralSphere
                    size="lg"
                    activityMode={activityMode}
                    activityTrigger={activityTrigger}
                  />
                </div>

                <div className="text-center space-y-1 my-1">
                  <h4 className="text-base sm:text-lg font-black text-text-primary tracking-tight">
                    {t('aiAssistant.welcomeHeadline', 'Chào {{name}}! 👋', { name: displayName })}
                  </h4>
                  <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
                    {t('aiAssistant.welcomeSubtitle', 'Tôi là trợ lý GIGBRIDGE AI. Hãy nhập câu hỏi hoặc yêu cầu bất kỳ bên dưới.')}
                  </p>
                </div>
              </div>
            )}

            {/* Conversational Chat Bubbles */}
            {messages.map(msg => (
              <article key={msg.id} className={`ai-msg-row ${msg.role}`}>
                <div className="ai-msg-container">
                  <div className={`ai-bubble ${msg.role}`}>
                    <div className="ai-msg-meta">
                      <span className="ai-meta-author">
                        {msg.role === 'assistant' ? t('aiAssistant.senderAI', 'GIGBRIDGE AI') : t('aiAssistant.senderYou', 'BẠN')}
                      </span>
                      <time className="ai-meta-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <div className="ai-msg-content-render">
                      <p className="ai-msg-text">{msg.content}</p>
                    </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="ai-msg-actions">
                      <button
                        type="button"
                        className="ai-action-btn cursor-pointer"
                        onClick={() => copyMsg(msg)}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-success" />
                            <span className="text-success font-semibold">{t('aiAssistant.copied', 'Đã sao chép')}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>{t('aiAssistant.copy', 'Sao chép')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {/* Kinetic Waveform Thinking Indicator */}
            {serviceState === 'thinking' && (
              <article className="ai-msg-row assistant">
                <div className="ai-thinking-card">
                  <div className="ai-quantum-waveform">
                    <span className="ai-wave-bar" />
                    <span className="ai-wave-bar" />
                    <span className="ai-wave-bar" />
                    <span className="ai-wave-bar" />
                    <span className="ai-wave-bar" />
                  </div>
                  <span className="ai-thinking-text">
                    {t('aiAssistant.thinkingStatus', 'Đang kết nối mạng nơ-ron & phân tích dữ liệu…')}
                  </span>
                </div>
              </article>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Floating Composer Bar ── */}
        <div className="ai-composer-wrap">
          <div className="ai-composer-island">
            <textarea
              ref={textareaRef}
              className="ai-composer-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder=""
              rows={1}
              maxLength={5000}
            />

            <div className="ai-composer-footer">
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <span>{input.length}/5000</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-text-muted font-medium">
                  Enter <CornerDownLeft size={11} className="inline" />
                </span>
                <button
                  type="button"
                  className="ai-send-button cursor-pointer"
                  onClick={() => void send()}
                  disabled={!input.trim() || serviceState === 'thinking'}
                  title={t('aiAssistant.sendTitle', 'Gửi câu hỏi')}
                  aria-label={t('aiAssistant.sendTitle', 'Gửi câu hỏi')}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
