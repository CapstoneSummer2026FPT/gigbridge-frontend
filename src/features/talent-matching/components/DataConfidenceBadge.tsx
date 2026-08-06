import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../app/components/ui/tooltip';
import { useTranslation } from '../../../hooks/useTranslation';
import type { AiTalentMatch } from '../../../types/talentMatching';

export function DataConfidenceBadge({ match }: { match: AiTalentMatch }) {
  const { t } = useTranslation();
  const details = match.confidenceBreakdown;
  const scoreAgreement = details?.scoreAgreement ?? Math.max(
    0,
    100 - Math.abs(match.scoreBreakdown.embedding - match.scoreBreakdown.algorithm),
  );

  const confidenceText = match.confidence === 'high'
    ? t('talentMatching.highConfidence')
    : match.confidence === 'medium'
    ? t('talentMatching.mediumConfidence')
    : t('talentMatching.lowConfidence');

  const ariaLabel = details
    ? `${confidenceText} ${t('talentMatching.confidenceSuffix')}. ${t('talentMatching.profileInformation', { coverage: details.dataCoverage.toFixed(1) })}. ${t('talentMatching.resultConsistency', { agreement: scoreAgreement.toFixed(1) })}.`
    : `${confidenceText} ${t('talentMatching.confidenceSuffix')}. ${t('talentMatching.resultConsistency', { agreement: scoreAgreement.toFixed(1) })}.`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 border ${
            match.confidence === 'high'
              ? 'bg-success/10 text-success border-success/20'
              : match.confidence === 'medium'
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-text-muted/10 text-text-muted border-border'
          }`}
          aria-label={ariaLabel}
        >
          ● {confidenceText} {t('talentMatching.confidenceSuffix')}
          <Info size={11} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-72 space-y-1.5">
        <p className="font-semibold">{t('talentMatching.confidenceTitle')}</p>
        {details ? (
          <>
            <p>{t('talentMatching.profileInformation', { coverage: details.dataCoverage.toFixed(1) })}</p>
            <p>{t('talentMatching.resultConsistency', { agreement: scoreAgreement.toFixed(1) })}</p>
            <p>{t('talentMatching.confidenceScore', { score: details.confidenceScore.toFixed(1) })}</p>
          </>
        ) : (
          <>
            <p>{t('talentMatching.resultConsistency', { agreement: scoreAgreement.toFixed(1) })}</p>
          </>
        )}
        <p className="opacity-80">{t('talentMatching.confidenceFootnote')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
