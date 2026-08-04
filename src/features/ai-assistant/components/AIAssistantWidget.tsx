import { useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { useLocation } from 'react-router';
import {
  AlertTriangle,
  Bot,
  Copy,
  Eraser,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Minus,
} from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import {
  AI_ASSISTANT_DISCLAIMER,
  estimateTokenUsage,
  type AIAssistantMessage,
} from '../types/assistant';
import { aiAssistantAPI } from '../../../api/aiAssistantAPI';
import '../styles/ai-assistant-widget.css';

const AI_SESSION_KEY = 'gb_ai_widget_v2';
const AI_TIMEOUT_MS = 5000;

type ServiceState = 'ready' | 'thinking' | 'timeout' | 'unavailable';

/* ── Web Audio sound effects ── */
const playSound = (type: 'send' | 'receive' | 'chime', enabled: boolean) => {
  if (!enabled) return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const beep = (freq: number, start: number, dur: number, vol = 0.06) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.linearRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };

    const t = ctx.currentTime;
    if (type === 'send')    { beep(450, t, 0.1); beep(900, t + 0.05, 0.08); }
    if (type === 'receive') { beep(600, t, 0.09); beep(750, t + 0.1, 0.12); }
    if (type === 'chime')   { beep(520, t, 0.2, 0.04); }
  } catch { /* ignore */ }
};

export default function AIAssistantWidget() {
  const { user } = useApp();
  const location = useLocation();

  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'there';

  const chatEndRef         = useRef<HTMLDivElement>(null);
  const timeoutRef         = useRef<number | null>(null);
  const recognitionRef     = useRef<any>(null);
  const textareaRef        = useRef<HTMLTextAreaElement>(null);

  /* ── State ── */
  const [isOpen,            setIsOpen]          = useState(false);
  const [messages,          setMessages]        = useState<AIAssistantMessage[]>(() => {
    try {
      const saved = localStorage.getItem(AI_SESSION_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input,             setInput]           = useState('');
  const [serviceState,      setServiceState]    = useState<ServiceState>('ready');
  const [error,             setError]           = useState('');
  const [copiedId,          setCopiedId]        = useState<string | null>(null);
  const [unread,            setUnread]          = useState(0);
  const [showIntro,         setShowIntro]       = useState(false);
  const [introClass,        setIntroClass]      = useState('active');
  const [voiceEnabled,      setVoiceEnabled]    = useState(() => localStorage.getItem('gb_ai_voice') === 'true');
  const soundEnabled = localStorage.getItem('gb_ai_sound') !== 'false';
  const [isListening,       setIsListening]     = useState(false);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  /* ── Welcome intro ── */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setShowIntro(true);
      setIntroClass('active');
      const t1 = setTimeout(() => setIntroClass('fade-out'), 2000);
      const t2 = setTimeout(() => setShowIntro(false), 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setShowIntro(false);
    }
  }, [isOpen, messages.length]);

  /* ── Persistent storage enabled: conversation history persists across tab reloads ── */

  /* ── Speech recognition ── */
  useEffect(() => {
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRClass) return;
    const sr = new SRClass();
    sr.continuous      = false;
    sr.interimResults  = false;
    sr.lang            = 'vi-VN';
    sr.onstart  = () => setIsListening(true);
    sr.onend    = () => setIsListening(false);
    sr.onerror  = () => setIsListening(false);
    sr.onresult = (e: any) => {
      const txt = e.results[0][0].transcript;
      if (txt) setInput(p => p ? `${p} ${txt}` : txt);
    };
    recognitionRef.current = sr;
  }, []);

  /* ── Navigation-state trigger (from router redirect) ── */
  useEffect(() => {
    if ((location.state as any)?.openAIAssistant) {
      setIsOpen(true);
      playSound('chime', soundEnabled);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /* ── Global toggle event ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      setIsOpen(d && typeof d.open === 'boolean' ? d.open : p => !p);
      playSound('chime', soundEnabled);
    };
    window.addEventListener('toggle-ai-assistant', handler);
    return () => window.removeEventListener('toggle-ai-assistant', handler);
  }, [soundEnabled]);

  /* ── Persist messages ── */
  useEffect(() => {
    localStorage.setItem(AI_SESSION_KEY, JSON.stringify(messages));
  }, [messages]);

  /* ── Clear unread when panel opened ── */
  useEffect(() => { if (isOpen) setUnread(0); }, [isOpen]);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  /* ── Contextual prompts by URL ── */
  const prompts = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/jobs/browse') || p.includes('/jobs/saved') || /^\/jobs\/\d+/.test(p))
      return ['Write a polished proposal for a web developer job.', 'Suggest questions to ask the client before starting.', 'How can I stand out when bidding on high-budget projects?'];
    if (p.includes('/jobs/post') || p.includes('/client/job-posts'))
      return ['Draft a job description for a Senior React developer.', 'What are standard screening questions for a designer?', 'Recommend milestones for a 4-week mobile project.'];
    if (p.includes('/proposals'))
      return ['Review my proposal pitch for clarity and tone.', 'How can I justify a higher fixed price budget?', 'Draft a follow-up message for a pending proposal.'];
    if (p.includes('/contracts') || p.includes('/projects') || p.includes('/workspace'))
      return ['Draft a milestone progress report for my client.', 'Write a polite message asking for deliverable review.', 'Help me outline risks for the next workspace task.'];
    return ['Draft a client-friendly project update for this week.', 'Help me compare two freelancer proposals objectively.', 'Write a job post for a senior React and Node.js developer.', 'Create interview questions for a mobile developer candidate.'];
  }, [location.pathname]);

  /* ── TTS ── */
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, '[code]').replace(/Disclaimer:[\s\S]*$/i, '').replace(/[*_#`\-]/g, '');
    const utt = new SpeechSynthesisUtterance(clean);
    const vi = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('vi'));
    if (vi) { utt.voice = vi; utt.lang = 'vi-VN'; } else { utt.lang = 'en-US'; }
    utt.rate  = 1.05;
    utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  };

  const stopSpeak = () => window.speechSynthesis?.cancel();

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    stopSpeak();
    localStorage.removeItem(AI_SESSION_KEY);
    setMessages([]);
    setInput('');
    setServiceState('ready');
    setError('');
  };

  const copyMsg = async (msg: AIAssistantMessage) => {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) { setError('Speech recognition not supported. Try Chrome.'); return; }
    isListening ? recognitionRef.current.stop() : (setError(''), recognitionRef.current.start());
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || serviceState === 'thinking') return;
    if (text.length > 5000) { setError('Message must be under 5000 characters'); return; }

    playSound('send', soundEnabled);

    const userMsg: AIAssistantMessage = {
      id: `u_${Date.now()}`, role: 'user', type: 'text',
      content: text, createdAt: new Date().toISOString(), tokenEstimate: estimateTokenUsage(text),
    };

    setMessages(p => [...p, userMsg]);
    setInput('');
    setError('');
    setServiceState('thinking');

    timeoutRef.current = window.setTimeout(() => {
      setServiceState('timeout');
      setError('AI response is taking longer than expected...');
    }, AI_TIMEOUT_MS);

    // Map history and strip disclaimers
    const history = messages.map(m => ({
      role: m.role,
      content: m.content.replace(/\n\nDisclaimer:[\s\S]*$/, '')
    }));

    try {
      const response = await aiAssistantAPI.query({
        question: text,
        history: history,
        collectionName: 'general-knowledge',
        style: 'precision'
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (!response.success || !response.data) {
        setServiceState('unavailable');
        setError(response.message || 'AI service temporarily offline. Please try again.');
        return;
      }

      const answer = response.data.answer;

      const aiMsg: AIAssistantMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        type: 'text',
        content: `${answer}\n\nDisclaimer: ${AI_ASSISTANT_DISCLAIMER}`,
        createdAt: new Date().toISOString(),
        tokenEstimate: estimateTokenUsage(answer),
      };

      setMessages(p => [...p, aiMsg]);
      setServiceState('ready');
      setError('');
      playSound('receive', soundEnabled);
      if (!isOpen) setUnread(p => p + 1);
      if (voiceEnabled) speak(answer);
    } catch (err: any) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setServiceState('unavailable');
      setError(err?.message || 'Failed to generate response. Please try again.');
    }
  };

  const handleSuggestionsWheel = (e: WheelEvent) => {
    e.currentTarget.scrollLeft += e.deltaY * 0.8;
  };

  const contextLabel = location.pathname === '/' ? 'CORE' : location.pathname.split('/').filter(Boolean)[0]?.toUpperCase() ?? 'CORE';

  /* ────────────────────────────────
     RENDER
  ──────────────────────────────── */
  return (
    <div className="ai-widget">

      {/* FAB bubble */}
      <button
        type="button"
        className={`ai-fab ${isOpen ? 'is-open' : ''}`}
        onClick={() => { setIsOpen(p => !p); playSound('chime', soundEnabled); stopSpeak(); }}
        aria-label="Toggle AI Assistant"
      >
        {isOpen
          ? <X size={20} className="ai-fab-close" />
          : (
            <div className="ai-fab-icon-wrap">
              <Bot size={20} />
              <Sparkles size={11} className="ai-fab-sparkle animate-pulse" />
            </div>
          )
        }
        {unread > 0 && !isOpen && <span className="ai-unread-badge animate-bounce">{unread}</span>}
      </button>

      {/* Chat panel */}
      <div className={`ai-panel ${isOpen ? 'is-open' : ''}`}>
        <div className="ai-ambient-orb ai-orb-1" />
        <div className="ai-ambient-orb ai-orb-2" />

        {/* ── Header ── */}
        <header className="ai-header">
          <div className="ai-header-meta">
            <div className="ai-brand">
              <span className="ai-brand-dot" />
              <span className="ai-brand-name">GIGBRIDGE AI</span>
            </div>
            <div className="ai-status">
              <span className="ai-status-dot" />
              <span>SYNAPSE ACTIVE</span>
            </div>
          </div>

          <div className="ai-header-controls">
            <button
              type="button"
              className={`ai-ctrl-btn ${voiceEnabled ? 'voice-on' : ''}`}
              onClick={() => { setVoiceEnabled(p => !p); if (voiceEnabled) stopSpeak(); }}
              title={voiceEnabled ? 'Voice feedback ON' : 'Voice feedback OFF'}
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            <button type="button" className="ai-ctrl-btn" onClick={reset} title="Reset conversation">
              <Eraser size={14} />
            </button>

            <button
              type="button"
              className="ai-ctrl-btn close-btn"
              onClick={() => { setIsOpen(false); stopSpeak(); }}
              title="Close"
            >
              <Minus size={14} />
            </button>
          </div>
        </header>

        {/* ── Body (scrollable messages) ── */}
        <div className="ai-body">
          {error && (
            <div className={`ai-alert ${serviceState === 'unavailable' ? 'danger' : 'warning'}`}>
              <AlertTriangle size={13} />
              <span>{error}</span>
            </div>
          )}

          <div className="ai-messages">
            {/* Welcome intro */}
            {showIntro && (
              <div className={`ai-welcome ${introClass}`}>
                <div className="ai-welcome-logo animate-bounce">
                  <Bot size={32} />
                </div>
                <h3 className="ai-welcome-title">Xin chào {firstName}!</h3>
                <p className="ai-welcome-desc">Tôi là GigBridge AI. Hỏi tôi bất kỳ điều gì để bắt đầu.</p>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <article key={msg.id} className={`ai-msg-row ${msg.role}`}>
                <div className="ai-msg-container">
                  <div className={`ai-bubble ${msg.type}`}>
                    <div className="ai-msg-meta">
                      <span className="ai-meta-author">{msg.role === 'assistant' ? 'SYSTEM' : 'YOU'}</span>
                      <span className="ai-meta-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="ai-msg-text">{msg.content}</p>
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="ai-msg-actions">
                      <button className="ai-action-btn" type="button" onClick={() => copyMsg(msg)}>
                        <Copy size={10} />
                        {copiedId === msg.id ? 'Copied!' : 'Copy'}
                      </button>
                      <button className="ai-action-btn" type="button" onClick={() => speak(msg.content)}>
                        <Volume2 size={10} />
                        Speak
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {/* Thinking indicator */}
            {serviceState === 'thinking' && (
              <article className="ai-msg-row assistant">
                <div className="ai-thinking">
                  <div className="ai-typing-bars">
                    <span className="ai-bar" />
                    <span className="ai-bar" />
                    <span className="ai-bar" />
                  </div>
                  <span className="ai-thinking-label">Formulating response...</span>
                </div>
              </article>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Contextual suggestion pills ── */}
        <div className="ai-suggestions">
          <div className="ai-suggestions-label">
            <Sparkles size={10} />
            <span>CONTEXTUAL QUERIES ({contextLabel})</span>
          </div>
          <div
            className="ai-suggestions-scroll"
            onWheel={handleSuggestionsWheel}
          >
            {prompts.map((p, i) => (
              <button
                key={i}
                type="button"
                className="ai-pill"
                onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                disabled={serviceState === 'thinking'}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Composer (input bar) ── */}
        <div className="ai-composer">
          <textarea
            ref={textareaRef}
            className="ai-composer-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything..."
            rows={1}
            maxLength={5000}
          />
          <div className="ai-composer-toolbar">
            <button
              type="button"
              className={`ai-composer-mic ${isListening ? 'listening' : ''}`}
              onClick={toggleMic}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <span className="ai-composer-counter">{input.length}/5000</span>

            <button
              type="button"
              className="ai-composer-send"
              onClick={() => send()}
              disabled={!input.trim() || serviceState === 'thinking'}
              title="Send"
            >
              <Send size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
