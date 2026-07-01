import {
  WandSparkles, Target, Search, Pencil,
  CheckCircle2, Lightbulb, ChevronDown, FlaskConical,
} from 'lucide-react';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { useTranslation } from '../../../hooks/useTranslation';

interface AIGenJobGuideProps {
  /** Show the "Mock Mode" badge when the backend AI endpoint is unavailable */
  showMockBadge?: boolean;
}

const STEP_CONFIGS = [
  {
    icon: <Target size={18} />,
    accent: 'purple',
    step: '01',
    titleKey: 'aiGenJobGuide.step1Title',
    bodyKey: 'aiGenJobGuide.step1Body',
  },
  {
    icon: <Search size={18} />,
    accent: 'cyan',
    step: '02',
    titleKey: 'aiGenJobGuide.step2Title',
    bodyKey: 'aiGenJobGuide.step2Body',
  },
  {
    icon: <GCoinIcon size={18} />,
    accent: 'purple',
    step: '03',
    titleKey: 'aiGenJobGuide.step3Title',
    bodyKey: 'aiGenJobGuide.step3Body',
  },
  {
    icon: <Pencil size={18} />,
    accent: 'cyan',
    step: '04',
    titleKey: 'aiGenJobGuide.step4Title',
    bodyKey: 'aiGenJobGuide.step4Body',
  },
] as const;

export function AIGenJobGuide({ showMockBadge = false }: AIGenJobGuideProps) {
  const { t } = useTranslation();

  const tips = (t('aiGenJobGuide.tips', { returnObjects: true }) as string[]) || [];
  const examples = (t('aiGenJobGuide.examples', { returnObjects: true }) as string[]) || [];

  return (
    <div className="ai-guide-card w-full">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--gb-purple)]/30 bg-gradient-to-br from-[var(--gb-purple)]/8 via-card to-[var(--gb-cyan)]/8 shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--gb-purple)]/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[var(--gb-cyan)]/5 blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8">

          {/* Mock badge */}
          {showMockBadge && (
            <div className="flex items-center justify-end mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 text-[10px] font-extrabold uppercase tracking-wider">
                <FlaskConical size={11} />
                {t('aiGenJobGuide.mockModeActive')}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8">
            <div className="ai-guide-orb w-16 h-16 rounded-2xl flex items-center justify-center shrink-0">
              <WandSparkles size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-foreground leading-tight">
                {t('aiGenJobGuide.title').split('AI Gen Job')[0]}
                <span className="ai-guide-shimmer-text">AI Gen Job</span>
                {t('aiGenJobGuide.title').split('AI Gen Job')[1] || ''}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                {t('aiGenJobGuide.subtitle')}
              </p>
            </div>
          </div>

          {/* Step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {STEP_CONFIGS.map(({ icon, accent, step, titleKey, bodyKey }) => {
              const isPurple = accent === 'purple';
              const color = isPurple ? 'var(--gb-purple)' : 'var(--gb-cyan)';
              return (
                <div
                  key={step}
                  className={`ai-guide-step group flex gap-4 p-5 rounded-2xl bg-background/70 border border-border/70 transition-all duration-200 ${
                    isPurple
                      ? 'hover:border-[var(--gb-purple)]/40 hover:bg-[var(--gb-purple)]/4'
                      : 'hover:border-[var(--gb-cyan)]/40 hover:bg-[var(--gb-cyan)]/4'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 20%, transparent), color-mix(in srgb, ${color} 5%, transparent))`,
                        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                        color,
                      }}
                    >
                      {icon}
                    </div>
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{
                        color,
                        background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      }}
                    >
                      {step}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground mb-1.5">{t(titleKey)}</p>
                    <p
                      className="text-[12px] text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: t(bodyKey) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tip pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tips.map((tip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-[11px] text-muted-foreground font-medium"
              >
                <span className="text-[var(--gb-cyan)]">
                  <CheckCircle2 size={11} />
                </span>
                {tip}
              </span>
            ))}
          </div>

          {/* Example prompts */}
          <div className="rounded-2xl border border-[var(--gb-cyan)]/25 bg-gradient-to-br from-[var(--gb-cyan)]/6 to-transparent p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-[var(--gb-cyan)] flex items-center justify-center">
                <Lightbulb size={11} className="text-white" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--gb-cyan)]">
                {t('aiGenJobGuide.exampleTitle')}
              </p>
            </div>
            <div className="space-y-2">
              {examples.map((text, i) => (
                <div key={i} className="bg-background/80 rounded-xl px-4 py-3 border border-border/60">
                  <p
                    className="text-[11px] text-muted-foreground leading-relaxed font-mono"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Arrow pointing down to prompt input */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent to-border/50" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                {t('aiGenJobGuide.footerPrompt')}
              </span>
              <ChevronDown size={16} className="text-[var(--gb-cyan)] animate-bounce" />
            </div>
            <div className="flex-grow h-[1px] bg-gradient-to-l from-transparent to-border/50" />
          </div>

        </div>
      </div>
    </div>
  );
}
