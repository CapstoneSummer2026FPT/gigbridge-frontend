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

      {isDirectoryStage && (
        <div
          className="rounded-2xl border border-border bg-surface-card/70 p-4 sm:p-5"
          style={{ backdropFilter: 'blur(14px)' }}
        >
          <h3 className="font-bold text-text-primary flex items-center gap-2 mb-2">
            <Users size={16} className="text-brand" /> {t('talentMatching.browseFirstTitle')}
          </h3>
          <p className="text-sm text-text-secondary">{t('talentMatching.browseFirstDesc1')}</p>
          <p className="text-xs text-text-muted mt-2">{t('talentMatching.browseFirstDesc2')}</p>
        </div>
      )}
    </aside>
  );
}
