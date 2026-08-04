import { useState, type FormEvent } from 'react';
import { Crown, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  isPremium: boolean;
  isLoading: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  onUpgrade: () => void;
}

const PRESETS = [
  'Build a responsive SaaS analytics dashboard with React, TypeScript and REST API integration.',
  'Design a mobile fintech product in Figma, including user flows, a component library and developer handoff.',
  'Write five technical SEO articles for software engineers and startup founders.',
];

export function PostJobAiDrawer({ isOpen, isPremium, isLoading, onClose, onGenerate, onUpgrade }: Props) {
  const { t } = useTranslation('common');
  const [prompt, setPrompt] = useState('');
  if (!isOpen) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isPremium || !prompt.trim() || isLoading) return;
    await onGenerate(prompt.trim());
    onClose();
  };

  return (
    <div className="job-post-ai" role="dialog" aria-modal="true" aria-labelledby="job-post-ai-title">
      <button type="button" className="job-post-ai__backdrop" onClick={onClose} aria-label={t('common.close')} />
      <aside className="job-post-ai__panel">
        <div className="job-post-ai__header">
          <div className="job-post-ai__icon"><Sparkles size={18} /></div>
          <div>
            <span>{t('postJobWizard.ai.premium')}</span>
            <h2 id="job-post-ai-title">{t('postJobWizard.ai.title')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
        </div>

        {!isPremium ? (
          <div className="job-post-ai__locked">
            <Crown size={30} />
            <h3>{t('postJobWizard.ai.lockedTitle')}</h3>
            <p>{t('postJobWizard.ai.lockedDescription')}</p>
            <button type="button" onClick={onUpgrade}>{t('postJobWizard.ai.upgrade')}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="job-post-ai__form">
            <p>{t('postJobWizard.ai.description')}</p>
            <textarea
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              placeholder={t('postJobWizard.ai.placeholder')}
              rows={8}
              disabled={isLoading}
              autoFocus
            />
            <div className="job-post-ai__presets">
              <span>{t('postJobWizard.ai.examples')}</span>
              {PRESETS.map((preset, index) => (
                <button type="button" key={preset} onClick={() => setPrompt(preset)}>
                  {t('postJobWizard.ai.example', { number: index + 1 })}
                </button>
              ))}
            </div>
            <button type="submit" className="job-post-ai__generate" disabled={!prompt.trim() || isLoading}>
              <Sparkles size={15} />
              {isLoading ? t('postJobWizard.ai.generating') : t('postJobWizard.ai.generate')}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
