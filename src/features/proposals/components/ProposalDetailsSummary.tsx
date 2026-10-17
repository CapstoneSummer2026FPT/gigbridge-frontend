import { useMemo } from 'react';
import { AlertCircle, Ban, CheckCircle2 } from 'lucide-react';
import { MarkdownPreview } from '../../../shared/components/MarkdownEditor';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { useTranslation } from '../../../hooks/useTranslation';
import type { JobPostDetailDto } from '../../../types/models/Job';
import { JOB_DURATION_UNITS, WORK_ITEM_DURATION_UNITS } from '../../jobs/utils/jobDuration';
import { useMilestoneEditorCopy } from '../hooks/useMilestoneEditorCopy';
import { ProposalTotalsSummary } from './ProposalTotalsSummary';
import type { ProposalNarrativeValues } from './ProposalNarrativeFields';

interface ProposalDetailsSummaryProps {
  jobPost: JobPostDetailDto | null;
  narrativeValues: ProposalNarrativeValues;
  nestedMilestones: EditableMilestonePlan[];
  proposedBudget: number | null;
  proposedDuration: string | null;
}

function NarrativeBlock({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const { t } = useTranslation(['proposals', 'common']);
  const trimmed = (value || '').trim();

  return (
    <div>
      <span className="cps-readonly-label flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {trimmed ? (
        <div className="cps-readonly-block">
          <MarkdownPreview value={trimmed} />
        </div>
      ) : (
        <p className="text-xs font-semibold text-text-muted">{t('proposalSubmitReview.notProvided')}</p>
      )}
    </div>
  );
}

/** Read-only recap of the step 1 form, shown on the review step while the editor is closed. */
export function ProposalDetailsSummary({
  jobPost,
  narrativeValues,
  nestedMilestones,
  proposedBudget,
  proposedDuration,
}: ProposalDetailsSummaryProps) {
  const { t } = useTranslation(['proposals', 'common']);
  const { uiCopy, fieldHints, fieldPlaceholders } = useMilestoneEditorCopy();

  const durationUnitOptions = useMemo(
    () => JOB_DURATION_UNITS.map(unit => ({ value: unit, label: t(`proposalMilestoneEditor.durationUnits.${unit}`) })),
    [t]
  );
  const workItemDurationUnitOptions = useMemo(
    () => WORK_ITEM_DURATION_UNITS.map(unit => ({ value: unit, label: t(`proposalMilestoneEditor.durationUnits.${unit}`) })),
    [t]
  );
  const expandedIndexes = useMemo(() => nestedMilestones.map((_, index) => index), [nestedMilestones]);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <NarrativeBlock label={t('createProposal.coverLetterLabel')} value={narrativeValues.coverLetter} />
          <NarrativeBlock label={t('createProposal.solutionStrategyLabel')} value={narrativeValues.proposalApproach} />
        </div>
        <div className="space-y-5">
          <NarrativeBlock
            label={t('createProposal.overallDeliverables')}
            value={narrativeValues.deliverables}
            icon={<CheckCircle2 size={13} className="text-emerald-500" />}
          />
          <NarrativeBlock
            label={t('createProposal.keyAssumptions')}
            value={narrativeValues.assumptions}
            icon={<AlertCircle size={13} className="text-amber-500" />}
          />
          <NarrativeBlock
            label={t('createProposal.outOfScope')}
            value={narrativeValues.outOfScope}
            icon={<Ban size={13} className="text-rose-500" />}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border/50">
        <span className="cps-readonly-label mt-4 block">{t('createProposal.section2Title')}</span>
        <NestedMilestonePlanEditor
          value={nestedMilestones}
          onChange={() => {}}
          readOnly
          targetBudget={jobPost?.budgetMax || jobPost?.budgetMin || null}
          title={t('createProposal.freelancerMilestoneColumnTitle', 'Kế hoạch bạn đề xuất (Mới)')}
          description={t('proposalMilestoneEditor.description')}
          hideTopBorder
          showDueDate
          dueDateReadOnly
          simplifiedMilestoneFields
          compactLayout
          durationUnits={durationUnitOptions}
          workItemDurationUnits={workItemDurationUnitOptions}
          uiCopy={uiCopy}
          fieldHints={fieldHints}
          fieldPlaceholders={fieldPlaceholders}
          expandedIndexes={expandedIndexes}
          onExpandedIndexesChange={() => {}}
          advancedIndexes={expandedIndexes}
          onAdvancedIndexesChange={() => {}}
        />
      </div>

      <ProposalTotalsSummary
        jobPost={jobPost}
        proposedBudget={proposedBudget}
        proposedDuration={proposedDuration}
      />
    </div>
  );
}
