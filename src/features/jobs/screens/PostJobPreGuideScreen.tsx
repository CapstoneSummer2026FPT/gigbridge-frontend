import { useNavigate } from 'react-router';
import {
  Sparkles, PenTool, CheckCircle,
  Lightbulb, ChevronRight, MessageSquare, BookOpen,
  ArrowRight, ShieldAlert, BadgeInfo, LoaderCircle, LockKeyhole, RotateCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/PostJobPreGuideScreen.css';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import '../../premium/styles/premium.css';

export default function PostJobPreGuideScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const premiumStatusUnavailable = Boolean(premiumStatus.error && !premiumStatus.hasResolved);

  const handleStartMode = (instantJobMode: boolean) => {
    if (instantJobMode && premiumStatus.loading) return;
    if (instantJobMode && premiumStatusUnavailable) {
      void premiumStatus.refresh();
      return;
    }
    if (instantJobMode && !premiumStatus.isPremium) {
      navigate('/premium/client/pricing');
      return;
    }
    navigate('/jobs/post', { state: { instantJobMode } });
  };

  return (
    <AppLayout>
      <div className="max-w-[1000px] mx-auto px-4 py-8 relative">
        {/* Background glow effects */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.03),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.03),transparent_50%)] pointer-events-none" />

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--gb-purple)]/10 to-[var(--gb-cyan)]/10 border border-[var(--gb-purple)]/20 text-xs font-bold text-[var(--gb-purple)] mb-4">
            <BookOpen size={12} />
            <span>{t('postJobGuide.badge')}</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground uppercase mb-4" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif', letterSpacing: '0.05em'" }}>
            {t('postJobGuide.title')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t('postJobGuide.subtitle')}
          </p>
        </div>

        {/* Main Selection Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* AI Mode Button (Highlighted Premium Option) */}
          <button
            type="button"
            onClick={() => handleStartMode(true)}
            disabled={premiumStatus.loading}
            aria-busy={premiumStatus.loading}
            className="ai-mode-card group relative text-left overflow-hidden rounded-2xl p-8 shadow-lg transition-all duration-300 focus:outline-none"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="ai-select-orb w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="ai-select-sparkles-icon animate-pulse" size={26} />
              </div>
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[var(--gb-purple)] to-[var(--gb-cyan)] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                {premiumStatus.loading
                  ? t('postJobGuide.checkingAccess')
                  : premiumStatusUnavailable
                    ? t('postJobGuide.accessUnavailable')
                    : premiumStatus.isPremium
                      ? t('postJobGuide.recommended')
                      : 'Premium'}
              </span>
            </div>

            <h2 className="text-2xl font-black text-foreground mb-3 flex items-center gap-2 group-hover:text-[var(--gb-purple)] transition-colors">
              {t('postJobGuide.aiModeTitle')}
              <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform" />
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {t('postJobGuide.aiModeDesc')}
            </p>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--gb-cyan)]">
              {premiumStatus.loading ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  <span>{t('postJobGuide.checkingPremium')}</span>
                </>
              ) : premiumStatusUnavailable ? (
                <>
                  <ShieldAlert size={14} />
                  <span>{t('postJobGuide.premiumCheckFailed')}</span>
                  <RotateCw size={13} />
                  <span>{t('postJobGuide.retry')}</span>
                </>
              ) : (
                <>
                  <PremiumStatusBadge active={premiumStatus.isPremium} compact />
                  {!premiumStatus.isPremium && <LockKeyhole size={13} />}
                  <span>{premiumStatus.isPremium ? t('postJobGuide.aiModeStart') : t('postJobGuide.viewPremium')}</span>
                  <ChevronRight size={14} />
                </>
              )}
            </div>
          </button>

          {/* Manual Mode Button */}
          <button
            type="button"
            onClick={() => handleStartMode(false)}
            className="group relative text-left overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-muted-foreground/30 hover:shadow-md focus:outline-none cursor-pointer"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <PenTool className="text-muted-foreground group-hover:text-foreground transition-colors" size={26} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2 group-hover:text-foreground/80 transition-colors">
              {t('postJobGuide.manualModeTitle')}
              <ArrowRight size={18} className="transform group-hover:translate-x-1.5 transition-transform text-muted-foreground group-hover:text-foreground" />
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {t('postJobGuide.manualModeDesc')}
            </p>

            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/75">
              <span>{t('postJobGuide.manualModeStart')}</span>
              <ChevronRight size={14} />
            </div>
          </button>
        </div>

        {/* Detailed Guidelines Section */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-bold text-foreground border-b border-border pb-4 mb-6 flex items-center gap-2">
            <BadgeInfo className="text-[var(--gb-purple)]" size={18} />
            {t('postJobGuide.guideTitle')}
          </h3>

          <div className="space-y-8">
            {/* Guide Item 1 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[var(--gb-cyan)]/10 flex items-center justify-center shrink-0 text-[var(--gb-cyan)]">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">{t('postJobGuide.guide1Title')}</h4>
                <p
                  className="text-xs text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: t('postJobGuide.guide1Desc') }}
                />
              </div>
            </div>

            {/* Guide Item 2 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[var(--gb-purple)]/10 flex items-center justify-center shrink-0 text-[var(--gb-purple)]">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">{t('postJobGuide.guide2Title')}</h4>
                <p
                  className="text-xs text-muted-foreground leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{ __html: t('postJobGuide.guide2Desc') }}
                />
                <div className="bg-muted/40 border border-border rounded-xl p-4">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb size={12} className="text-amber-500" />
                    {t('postJobGuide.guide2TipsTitle')}
                  </p>
                  <ul className="list-none space-y-2 text-[11px] text-muted-foreground">
                    {(['guide2Tip1', 'guide2Tip2', 'guide2Tip3'] as const).map((key) => (
                      <li key={key} className="flex gap-2 items-start">
                        <span className="text-[var(--gb-purple)] font-bold">•</span>
                        <span dangerouslySetInnerHTML={{ __html: t(`postJobGuide.${key}`) }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Guide Item 3 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1.5">{t('postJobGuide.guide3Title')}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('postJobGuide.guide3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
