import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Copy,
  Eraser,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import {
  AI_ASSISTANT_CAPABILITIES,
  AI_ASSISTANT_DISCLAIMER,
  AI_ASSISTANT_STARTER_PROMPTS,
  buildMockAIResponse,
  createInitialAssistantMessage,
  estimateTokenUsage,
  type AIAssistantMessage,
} from '../mock/data-for-AIAssistantScreen';
import '../styles/ai-assistant-screen.css';

const AI_SESSION_STORAGE_KEY = 'gb_ai_assistant_session';
const AI_RESPONSE_TIMEOUT_MS = 5000;

type ServiceState = 'ready' | 'thinking' | 'timeout' | 'unavailable';

export default function AIAssistantScreen() {
  const { user, role } = useApp();
  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'there';
  const roleLabel = role === 0 ? 'client' : role === 1 ? 'freelancer' : 'user';
  const endRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const [messages, setMessages] = useState<AIAssistantMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(AI_SESSION_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_error) {
      sessionStorage.removeItem(AI_SESSION_STORAGE_KEY);
    }
    return [createInitialAssistantMessage(firstName)];
  });
  const [input, setInput] = useState('');
  const [serviceState, setServiceState] = useState<ServiceState>('ready');
  const [error, setError] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const tokenUsage = useMemo(
    () => messages.reduce((total, message) => total + message.tokenEstimate, 0),
    [messages]
  );
  const assistantMessageCount = messages.filter(message => message.role === 'assistant').length;

  useEffect(() => {
    sessionStorage.setItem(AI_SESSION_STORAGE_KEY, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  const clearConversation = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    const nextMessages = [createInitialAssistantMessage(firstName)];
    setMessages(nextMessages);
    setInput('');
    setServiceState('ready');
    setError('');
    sessionStorage.setItem(AI_SESSION_STORAGE_KEY, JSON.stringify(nextMessages));
  };

  const copyMessage = async (message: AIAssistantMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  };

  const sendPrompt = async (promptText?: string) => {
    const prompt = (promptText ?? input).trim();
    if (!prompt || serviceState === 'thinking') return;

    if (prompt.length > 5000) {
      setError('MSG66: Message must be under 5000 characters');
      return;
    }

    const userMessage: AIAssistantMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      type: 'text',
      content: prompt,
      createdAt: new Date().toISOString(),
      tokenEstimate: estimateTokenUsage(prompt),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError('');
    setServiceState('thinking');

    timeoutRef.current = window.setTimeout(() => {
      setServiceState('timeout');
      setError('AI response is taking longer than 5 seconds. Still trying to reconnect to the service...');
    }, AI_RESPONSE_TIMEOUT_MS);

    const shouldTimeout = prompt.toLowerCase().includes('timeout');
    const shouldFail = prompt.toLowerCase().includes('unavailable') || prompt.toLowerCase().includes('offline');
    const responseDelay = shouldTimeout ? 5600 : 1150;

    await new Promise(resolve => window.setTimeout(resolve, responseDelay));
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    if (shouldFail) {
      setServiceState('unavailable');
      setError('MSG47: AI service is temporarily unavailable. Please try again later.');
      return;
    }

    const response = buildMockAIResponse(prompt, roleLabel);
    const assistantMessage: AIAssistantMessage = {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      type: response.type,
      content: `${response.content}\n\nDisclaimer: ${AI_ASSISTANT_DISCLAIMER}`,
      createdAt: new Date().toISOString(),
      tokenEstimate: estimateTokenUsage(response.content),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setServiceState('ready');
    setError('');
  };

  const stateLabel = {
    ready: 'AI Ready',
    thinking: 'Generating',
    timeout: 'Timeout Watch',
    unavailable: 'Unavailable',
  }[serviceState];

  return (
    <AppLayout>
      <div className="ai-assistant-page">
        <header className="ai-assistant-header">
          <div className="ai-assistant-title-block">
            <div className="ai-assistant-mark">
              <Bot size={24} />
            </div>
            <div>
              <p className="ai-assistant-kicker">AI Work Assistant</p>
              <h1>Work faster with contextual AI support</h1>
              <p>Ask work questions, draft content, review decisions, and keep session context in one place.</p>
            </div>
          </div>

          <div className="ai-assistant-status-panel">
            <span className={`ai-service-pill ${serviceState}`}>
              {serviceState === 'thinking' ? <Loader2 size={15} className="ai-spin" /> : <CheckCircle2 size={15} />}
              {stateLabel}
            </span>
            <span className="ai-model-pill">
              <Zap size={14} />
              LLM mock API
            </span>
          </div>
        </header>

        {error && (
          <div className={`ai-assistant-alert ${serviceState === 'unavailable' ? 'danger' : 'warning'}`}>
            <AlertTriangle size={17} />
            {error}
          </div>
        )}

        <div className="ai-assistant-shell">
          <aside className="ai-assistant-rail">
            <div className="ai-stat-grid">
              <div>
                <strong>{tokenUsage.toLocaleString()}</strong>
                <span>Tokens</span>
              </div>
              <div>
                <strong>{messages.length}</strong>
                <span>Messages</span>
              </div>
              <div>
                <strong>{assistantMessageCount}</strong>
                <span>AI replies</span>
              </div>
            </div>

            <section>
              <div className="ai-section-heading">
                <Sparkles size={15} />
                Capabilities
              </div>
              <div className="ai-capability-list">
                {AI_ASSISTANT_CAPABILITIES.map(capability => (
                  <button
                    key={capability.id}
                    type="button"
                    className={`ai-capability-card ${capability.accent}`}
                    onClick={() => sendPrompt(capability.prompt)}
                    disabled={serviceState === 'thinking'}
                  >
                    <span>{capability.icon}</span>
                    <strong>{capability.title}</strong>
                    <small>{capability.description}</small>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="ai-section-heading">
                <MessageSquare size={15} />
                Starters
              </div>
              <div className="ai-starter-list">
                {AI_ASSISTANT_STARTER_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendPrompt(prompt)}
                    disabled={serviceState === 'thinking'}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="ai-chat-panel">
            <div className="ai-chat-toolbar">
              <div>
                <strong>Session Context</strong>
                <span>History is stored for this browser session.</span>
              </div>
              <button type="button" onClick={clearConversation}>
                <Eraser size={16} />
                Clear
              </button>
            </div>

            <div className="ai-message-list">
              {messages.map(message => (
                <article key={message.id} className={`ai-message-row ${message.role}`}>
                  <div className="ai-message-avatar">
                    {message.role === 'assistant' ? <Bot size={16} /> : firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ai-message-stack">
                    <div className={`ai-message-bubble ${message.type}`}>
                      <div className="ai-message-meta">
                        <span>{message.role === 'assistant' ? 'GigBridge AI' : firstName}</span>
                        <span>
                          <Clock3 size={12} />
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p>{message.content}</p>
                    </div>
                    {message.role === 'assistant' && (
                      <button className="ai-copy-button" type="button" onClick={() => copyMessage(message)}>
                        <Copy size={13} />
                        {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {serviceState === 'thinking' && (
                <article className="ai-message-row assistant">
                  <div className="ai-message-avatar"><Bot size={16} /></div>
                  <div className="ai-thinking-card">
                    <Loader2 size={17} className="ai-spin" />
                    <span>Generating a response within the 5 second SLA...</span>
                  </div>
                </article>
              )}
              <div ref={endRef} />
            </div>

            <div className="ai-disclaimer-bar">
              <AlertTriangle size={15} />
              {AI_ASSISTANT_DISCLAIMER}
            </div>

            <form
              className="ai-compose"
              onSubmit={event => {
                event.preventDefault();
                sendPrompt();
              }}
            >
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendPrompt();
                  }
                }}
                placeholder="Ask about a proposal, job post, contract, code review, or project decision..."
                rows={2}
                maxLength={5000}
              />
              <div className="ai-compose-actions">
                <span>{input.length}/5000</span>
                <button type="submit" disabled={!input.trim() || serviceState === 'thinking'}>
                  <Send size={18} />
                  Send
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}
