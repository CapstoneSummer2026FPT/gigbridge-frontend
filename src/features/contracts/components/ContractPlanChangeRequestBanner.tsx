import { AlertTriangle, ListChecks } from 'lucide-react';
import type { Milestone, ContractPlanChangeRequest } from '../../../types/models/Contract';
import { formatContractDate } from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';

interface ContractPlanChangeRequestBannerProps {
  request: ContractPlanChangeRequest;
  milestones: Milestone[];
}

/**
 * Tells the client that the freelancer sent the project plan back, and why. Without it a bounced
 * contract simply reappears on step 1 looking exactly like a plan that was never submitted.
 */
export function ContractPlanChangeRequestBanner({
  request,
  milestones,
}: ContractPlanChangeRequestBannerProps) {
  const { t } = useTranslation(['contracts']);

  const affectedMilestoneTitles = request.affectedMilestoneIds
    .map(milestoneId => milestones.find(milestone => milestone.id === milestoneId)?.title)
    .filter((title): title is string => Boolean(title));

  return (
    <div
      role="status"
      data-testid="contract-plan-change-request-banner"
      className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4.5 sm:p-5 space-y-3.5 shadow-xs"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              {t('contracts.planChangeRequest.badge')}
            </span>
            <span className="text-[11px] font-semibold text-text-muted">
              {t('contracts.planChangeRequest.requestedBy', {
                name: request.requestedByName,
                date: formatContractDate(request.createdAt),
              })}
            </span>
          </div>
          <h3 className="text-sm font-black text-text-primary">
            {t('contracts.planChangeRequest.title')}
          </h3>
          <p className="text-xs font-medium leading-relaxed text-text-muted">
            {t('contracts.planChangeRequest.description')}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/25 bg-background p-3.5">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
          {t('contracts.planChangeRequest.reasonLabel')}
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-text-primary whitespace-pre-line [overflow-wrap:anywhere]">
          {request.reason}
        </p>
      </div>

      {affectedMilestoneTitles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
            <ListChecks size={13} />
            {t('contracts.planChangeRequest.affectedMilestones')}
          </span>
          {affectedMilestoneTitles.map(title => (
            <span
              key={title}
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300"
            >
              {title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
