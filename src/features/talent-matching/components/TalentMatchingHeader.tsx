import { Heart, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ViewStage } from '../hooks/useSmartTalentMatching';
import { UserRole } from '../../../types/models/User';

interface TalentMatchingHeaderProps {
  activeStage: ViewStage;
  changeStage: (stage: ViewStage) => void;
  requestSmartMatching: () => void;
  savedCount: number;
  hasSmartMatchingAccess: boolean;
  premiumLoading: boolean;
  role: UserRole | null;
  onViewPremium: () => void;
}

export function TalentMatchingHeader({
  activeStage,
  changeStage,
  requestSmartMatching,
  savedCount,
  hasSmartMatchingAccess,
  premiumLoading,
  role,
  onViewPremium,
}: TalentMatchingHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-brand text-[11px] font-black uppercase tracking-[0.2em] mb-2">
            <Sparkles size={14} /> {t('talentMatching.discoveryEyebrow')}
          </div>
          <h1 className="text-3xl font-black text-text-primary leading-tight">
            {t('talentMatching.pageTitle')}
          </h1>
          <p className="text-text-secondary text-sm mt-1.5 max-w-xl">
            {t('talentMatching.pageSubtitle')}
          </p>
        </div>

        {/* Stage tabs */}
        <div
          className="flex overflow-x-auto rounded-2xl border border-border bg-surface-card/70 p-1.5 gap-1"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <button
            className={`px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
              activeStage === 'browse'
                ? 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white shadow-md shadow-brand/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
            }`}
            onClick={() => changeStage('browse')}
          >
            <Users size={15} /> {t('talentMatching.browseFreelancers')}
          </button>
          <button
            className={`px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
              activeStage === 'saved'
                ? 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white shadow-md shadow-brand/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
            }`}
            onClick={() => changeStage('saved')}
          >
            <Heart size={15} className={activeStage === 'saved' ? 'fill-current' : ''} />
            {t('talentMatching.savedFreelancers')}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeStage === 'saved' ? 'bg-white/25 text-white' : 'bg-brand/10 text-brand'
              }`}
            >
              {savedCount}
            </span>
          </button>
          <button
            className={`px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all duration-200 disabled:opacity-60 ${
              activeStage === 'smart'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-500/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
            }`}
            onClick={requestSmartMatching}
            disabled={premiumLoading}
            aria-label={hasSmartMatchingAccess ? t('talentMatching.smartMatchingTab') : t('talentMatching.premiumAlert')}
          >
            {hasSmartMatchingAccess ? <Sparkles size={15} /> : <LockKeyhole size={15} />}
            {t('talentMatching.smartMatchingTab')}
            {!premiumLoading && !hasSmartMatchingAccess && (
              <span className="rounded-full bg-purple-600/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-500 border border-purple-500/20">
                PRO
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Premium upsell banner */}
      {!premiumLoading && !hasSmartMatchingAccess && role === UserRole.Client && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-purple-500/25 bg-purple-500/5 p-5 sm:flex-row sm:items-center">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <LockKeyhole size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="text-text-primary text-sm font-black">
              {t('talentMatching.premiumBannerTitle')}
            </strong>
            <p className="mt-0.5 text-sm text-text-secondary">
              {t('talentMatching.premiumBannerDesc')}
            </p>
          </div>
          <button
            onClick={onViewPremium}
            className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            {t('talentMatching.viewPremium')}
          </button>
        </div>
      )}
    </>
  );
}
