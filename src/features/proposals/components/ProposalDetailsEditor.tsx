import { useTranslation } from '../../../hooks/useTranslation';
import {
  ProposalNarrativeFields,
  type ProposalNarrativeErrors,
  type ProposalNarrativeField,
  type ProposalNarrativeValues,
} from './ProposalNarrativeFields';
import {
  ProposalMilestonePlanFields,
  type ProposalMilestonePlanFieldsProps,
} from './ProposalMilestonePlanFields';
import { ProposalTotalsSummary } from './ProposalTotalsSummary';

export interface ProposalDetailsEditorProps extends ProposalMilestonePlanFieldsProps {
  narrativeValues: ProposalNarrativeValues;
  narrativeErrors: ProposalNarrativeErrors;
  onNarrativeChange: (field: ProposalNarrativeField, value: string) => void;
  proposedBudget: number | null;
  proposedDuration: string | null;
}

/**
 * The complete step 1 form. Step 1 renders it as the screen body and the review step renders
 * the same component inline, so validation and layout never diverge between the two.
 */
export function ProposalDetailsEditor({
  narrativeValues,
  narrativeErrors,
  onNarrativeChange,
  proposedBudget,
  proposedDuration,
  ...planProps
}: ProposalDetailsEditorProps) {
  const { t } = useTranslation(['proposals', 'common']);

  return (
    <div className="space-y-8">
      <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section">
        <h2 className="cps-section-title">{t('createProposal.section1Title')}</h2>
        <ProposalNarrativeFields
          values={narrativeValues}
          errors={narrativeErrors}
          onChange={onNarrativeChange}
        />
      </section>

      <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section space-y-5 transition-all duration-300">
        <ProposalMilestonePlanFields {...planProps} />
      </section>

      <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section space-y-6">
        <h2 className="cps-section-title">{t('createProposal.section3Title')}</h2>
        <ProposalTotalsSummary
          jobPost={planProps.jobPost}
          proposedBudget={proposedBudget}
          proposedDuration={proposedDuration}
        />
      </section>
    </div>
  );
}
