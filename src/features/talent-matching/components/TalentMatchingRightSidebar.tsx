import { Sparkles, Users } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { SponsoredPromotionCard } from '../../premium/components/SponsoredPromotionCard';

interface TalentMatchingRightSidebarProps {
  isDirectoryStage: boolean;
}

export function TalentMatchingRightSidebar({ isDirectoryStage }: TalentMatchingRightSidebarProps) {
  const { t } = useTranslation();

  const rankingFactors = [
    {
      label: t('talentMatching.skillMatch'),
      description: t('talentMatching.factorSkillDesc'),
      weight: 45,
      color: 'bg-brand',
      marker: 'bg-brand',
    },
    {
      label: t('talentMatching.trackRecord'),
      description: t('talentMatching.factorTrackDesc'),
      weight: 35,
      color: 'bg-purple-500',
      marker: 'bg-purple-500',
    },
    {
      label: t('talentMatching.activity'),
      description: t('talentMatching.factorActivityDesc'),
      weight: 20,
      color: 'bg-emerald-500',
      marker: 'bg-emerald-500',
    },
  ];

  return (
    <aside className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-24 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-text-muted px-1">
        {t('talentMatching.sponsoredTag')}
      </div>
      <SponsoredPromotionCard promotionType="freelancer" />

      <div
        className="rounded-2xl border border-border bg-surface-card/70 p-4 sm:p-5"
        style={{ backdropFilter: 'blur(14px)' }}
      >
        {isDirectoryStage ? (
          <>
            <h3 className="font-bold text-text-primary flex items-center gap-2 mb-2">
              <Users size={16} className="text-brand" /> {t('talentMatching.browseFirstTitle')}
            </h3>
            <p className="text-sm text-text-secondary">{t('talentMatching.browseFirstDesc1')}</p>
            <p className="text-xs text-text-muted mt-2">{t('talentMatching.browseFirstDesc2')}</p>
          </>
        ) : (
          <>
            <h3 className="font-bold text-text-primary flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-purple-500" /> {t('talentMatching.howRankingWorksTitle')}
            </h3>
            <p className="text-sm text-text-secondary mb-3">{t('talentMatching.howRankingWorksSub')}</p>

            <div
              className="flex h-2.5 overflow-hidden rounded-full mb-4"
              role="img"
              aria-label="Ranking weights"
            >
              {rankingFactors.map(factor => (
                <span
                  key={factor.label}
                  className={factor.color}
                  style={{ width: `${factor.weight}%` }}
                  title={`${factor.label}: ${factor.weight}%`}
                />
              ))}
            </div>

            <div className="space-y-3">
              {rankingFactors.map(factor => (
                <div key={factor.label} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${factor.marker}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                      <span>{factor.label}</span>
                      <span>{factor.weight}%</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-muted">{factor.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 pt-3 border-t border-border text-xs text-text-muted leading-relaxed">
              {t('talentMatching.rankingFootnote')}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
