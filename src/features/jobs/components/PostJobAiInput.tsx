import { useState, type FormEvent, useRef, useEffect } from 'react';
import { Crown, Sparkles, LoaderCircle, ArrowUp, Code2, Palette, PenTool, Eraser, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  isPremium: boolean;
  isLoading: boolean;
  onGenerate: (prompt: string) => Promise<void>;
  onUpgrade: () => void;
  onClose: () => void;
}

const PRESETS = [
  {
    text: 'Build a responsive SaaS analytics dashboard with React, TypeScript and REST API integration.',
    label: 'SaaS Dashboard',
    desc: 'React & TS Stack',
    icon: Code2,
  },
  {
    text: 'Design a mobile fintech product in Figma, including user flows, a component library and developer handoff.',
    label: 'Fintech UI/UX',
    desc: 'Figma Design System',
    icon: Palette,
  },
  {
    text: 'Write five technical SEO articles for software engineers and startup founders.',
    label: 'SEO Articles',
    desc: 'Technical Copywriting',
    icon: PenTool,
  },
];

export function PostJobAiInput({ isPremium, isLoading, onGenerate, onUpgrade, onClose }: Props) {
  const { t } = useTranslation('common');
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isPremium || !prompt.trim() || isLoading) return;
    await onGenerate(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isLoading && isPremium) {
        void onGenerate(prompt.trim());
      }
    }
  };

  return (
    <div className="job-post-ai-bar-container">
      {!isPremium ? (
        <div className="job-post-ai-bar-locked">
          <div className="flex items-center gap-3">
            <div className="job-post-ai-bar-locked__icon">
              <Crown size={16} />
            </div>
            <div className="text-left">
              <strong className="block text-sm text-foreground">{t('postJobWizard.ai.lockedTitle')}</strong>
              <p className="text-xs text-muted-foreground">{t('postJobWizard.ai.lockedDescription')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="job-post-ai-bar-locked__upgrade-btn" onClick={onUpgrade}>
              <Sparkles size={13} />
              {t('postJobWizard.ai.upgrade')}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors"
              onClick={onClose}
              aria-label="Close AI Mode"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="job-post-ai-bar-wrap">
          {/* Horizontal ChatGPT Input Bar */}
          <form onSubmit={submit} className="job-post-ai-bar__form">
            <div className="job-post-ai-bar__input-area">
              <div className="job-post-ai-bar__sparkle-icon">
                <Sparkles size={18} className="text-[var(--brand)]" />
              </div>
              <textarea
                ref={textareaRef}
                className="job-post-ai-bar__textarea"
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('postJobWizard.ai.placeholder')}
                rows={1}
                disabled={isLoading}
                maxLength={5000}
              />
              {prompt.trim() && (
                <button
                  type="button"
                  className="job-post-ai-bar__clear-btn"
                  onClick={() => setPrompt('')}
                  title="Clear input"
                  disabled={isLoading}
                >
                  <Eraser size={15} />
                </button>
              )}
            </div>

            <div className="job-post-ai-bar__toolbar">
              <div className="job-post-ai-bar__presets">
                {PRESETS.map((preset) => {
                  const IconComponent = preset.icon;
                  return (
                    <button
                      type="button"
                      key={preset.label}
                      className="job-post-ai-bar__preset-pill"
                      onClick={() => setPrompt(preset.text)}
                      disabled={isLoading}
                    >
                      <IconComponent size={12} className="text-[var(--brand)]" />
                      <span className="font-bold text-[11px]">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline-block">· {preset.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="job-post-ai-bar__counter text-[10px] text-muted-foreground font-semibold">
                  {prompt.length}/5000
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground font-bold px-2.5 py-1 rounded-md hover:bg-[var(--surface-muted)] transition-colors"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="job-post-ai-bar__generate"
                  disabled={!prompt.trim() || isLoading}
                  title={isLoading ? t('postJobWizard.ai.generating') : t('postJobWizard.ai.generate')}
                >
                  {isLoading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
