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
  const { t, i18n } = useTranslation();

  return (
    <>
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-brand text-[11px] font-black uppercase tracking-[0.2em] mb-1.5 sm:mb-2">
            <Sparkles size={14} /> {t('talentMatching.discoveryEyebrow')}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-text-primary leading-tight">
            {i18n.language === 'vi' ? (
              <>Tìm kiếm <span className="font-serif italic font-normal text-brand">nhân tài phù hợp</span> cho dự án</>
            ) : (
              <>Find the <span className="font-serif italic font-normal text-brand">right freelancer</span> for your project</>
            )}
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1 sm:mt-1.5 max-w-xl">
            {t('talentMatching.pageSubtitle')}
          </p>
        </div>

        {/* Stage tabs - Responsive segmented control on mobile, horizontal pill row on desktop */}
        <div
          className="grid grid-cols-3 w-full sm:w-auto sm:flex sm:overflow-x-auto rounded-2xl border border-border bg-surface-card/70 p-1 sm:p-1.5 gap-1 max-w-full min-w-0"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <button
            className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold inline-flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[42px] transition-all duration-200 ${
              activeStage === 'browse'
                ? 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white shadow-md shadow-brand/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
            }`}
            onClick={() => changeStage('browse')}
          >
            <Users size={15} className="shrink-0" />
            <span className="truncate">{t('talentMatching.browseFreelancers')}</span>
          </button>
          <button
            className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold inline-flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[42px] transition-all duration-200 ${
              activeStage === 'saved'
                ? 'bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white shadow-md shadow-brand/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
            }`}
            onClick={() => changeStage('saved')}
          >
            <div className="flex items-center gap-1">
              <Heart size={15} className={`shrink-0 ${activeStage === 'saved' ? 'fill-current' : ''}`} />
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                  activeStage === 'saved' ? 'bg-white/25 text-white' : 'bg-brand/10 text-brand'
                }`}
              >
                {savedCount}
              </span>
            </div>
            <span className="truncate">{t('talentMatching.savedFreelancers')}</span>
          </button>
          <button
            className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold inline-flex flex-col xs:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[42px] transition-all duration-200 disabled:opacity-60 ${
              activeStage === 'smart'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-500/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted/60'
            }`}
            onClick={requestSmartMatching}
            disabled={premiumLoading}
            aria-label={hasSmartMatchingAccess ? t('talentMatching.smartMatchingTab') : t('talentMatching.premiumAlert')}
          >
            <div className="flex items-center gap-1">
              {hasSmartMatchingAccess ? <Sparkles size={15} className="shrink-0" /> : <LockKeyhole size={15} className="shrink-0" />}
              {!premiumLoading && !hasSmartMatchingAccess && (
                <span className="rounded-full bg-purple-600/15 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-purple-500 border border-purple-500/20">
                  PRO
                </span>
              )}
            </div>
            <span className="truncate">{t('talentMatching.smartMatchingTab')}</span>
          </button>
        </div>
      </header>

      {/* Premium upsell banner */}
      {!premiumLoading && !hasSmartMatchingAccess && role === UserRole.Client && (
        <div className="mb-6 flex flex-col gap-3 sm:gap-4 rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 sm:p-5 sm:flex-row sm:items-center">
          <span className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <LockKeyhole size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="text-text-primary text-xs sm:text-sm font-black">
              {t('talentMatching.premiumBannerTitle')}
            </strong>
            <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">
              {t('talentMatching.premiumBannerDesc')}
            </p>
          </div>
          <button
            onClick={onViewPremium}
            className="w-full sm:w-auto shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:opacity-90 transition-opacity text-center min-h-[42px]"
          >
            {t('talentMatching.viewPremium')}
          </button>
        </div>
      )}
    </>
  );
}
