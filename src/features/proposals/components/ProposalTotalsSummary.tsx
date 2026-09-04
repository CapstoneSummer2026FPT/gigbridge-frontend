import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import type { JobPostDetailDto } from '../../../types/models/Job';

interface ProposalTotalsSummaryProps {
  jobPost: JobPostDetailDto | null;
  proposedBudget: number | null;
  proposedDuration: string | null;
}

/** Section 3 of the proposal form: the totals derived from the milestone plan. */
export function ProposalTotalsSummary({ jobPost, proposedBudget, proposedDuration }: ProposalTotalsSummaryProps) {
  const { t } = useTranslation(['proposals', 'common']);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="cps-budget-box" aria-label={t('createProposal.proposedRate')}>
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
          {t('createProposal.proposedRate')}
        </span>
        <div className="text-2xl font-black text-brand tracking-tight">
          {formatGigCoin(proposedBudget || 0)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-text-muted font-medium">
          <span>{t('createProposal.syncedToMilestones')}</span>
          {jobPost && (
            <span>
              {t('createProposal.clientTargetBudget')}{' '}
              <strong>{formatGigCoin(jobPost.budgetMax || jobPost.budgetMin || 0)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="cps-budget-box" aria-label={t('createProposal.estimatedDuration')}>
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
          {t('createProposal.estimatedDuration')}
        </span>
        <div className="text-2xl font-black text-text-primary tracking-tight">
          {proposedDuration || t('createProposal.calculated')}
        </div>
        <div className="mt-1 text-xs text-text-muted font-medium">
          {t('createProposal.derivedDurationHint')}
        </div>
      </div>
    </div>
  );
}
