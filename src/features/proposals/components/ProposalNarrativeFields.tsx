import { AlertCircle, Ban, CheckCircle2, Sparkles } from 'lucide-react';
import { MarkdownEditor } from '../../../shared/components/MarkdownEditor';
import { useTranslation } from '../../../hooks/useTranslation';

export interface ProposalNarrativeValues {
  coverLetter: string;
  proposalApproach: string;
  deliverables: string;
  assumptions: string;
  outOfScope: string;
}

export type ProposalNarrativeField = keyof ProposalNarrativeValues;

export interface ProposalNarrativeErrors {
  coverLetter?: string;
  proposalApproach?: string;
}

interface ProposalNarrativeFieldsProps {
  values: ProposalNarrativeValues;
  errors: ProposalNarrativeErrors;
  onChange: (field: ProposalNarrativeField, value: string) => void;
}

/**
 * Section 1 of the proposal form. Fully controlled so both step 1 and the inline editor on
 * the review step render the same fields and the same validation surface.
 */
export function ProposalNarrativeFields({ values, errors, onChange }: ProposalNarrativeFieldsProps) {
  const { t } = useTranslation(['proposals', 'common']);

  return (
    <div className="grid gap-6 lg:grid-cols-12 mt-4">
      {/* Cover letter & solution strategy */}
      <div className="lg:col-span-6 space-y-6">
        <div data-field="coverLetter">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-text-primary">
              {t('createProposal.coverLetterLabel')}
            </label>
            <span className="text-[11px] font-semibold text-text-muted">
              {t('createProposal.charCount', { count: values.coverLetter.length })}
            </span>
          </div>
          <MarkdownEditor
            label=""
            value={values.coverLetter}
            onChange={value => onChange('coverLetter', value)}
            rows={5}
            placeholder={t('createProposal.coverLetterPlaceholder')}
            error={errors.coverLetter}
          />
        </div>

        <div data-field="proposalApproach">
          <div className="mb-2">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-text-primary">
              {t('createProposal.solutionStrategyLabel')}
            </span>
            <span className="text-[11px] text-text-muted font-medium">
              {t('createProposal.solutionStrategySubtitle')}
            </span>
          </div>
          <MarkdownEditor
            label=""
            value={values.proposalApproach}
            onChange={value => onChange('proposalApproach', value)}
            rows={7}
            placeholder={t('createProposal.solutionStrategyPlaceholder')}
            error={errors.proposalApproach}
          />
        </div>
      </div>

      {/* Optional scope & assumptions */}
      <div className="lg:col-span-6 space-y-5">
        <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-primary flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-brand" /> {t('createProposal.additionalScopeTitle')}
          </h3>
          <p className="text-[11px] font-medium text-text-muted">
            {t('createProposal.additionalScopeSubtitle')}
          </p>
        </div>

        <div>
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-primary mb-2">
            <CheckCircle2 size={13} className="text-emerald-500" /> {t('createProposal.overallDeliverables')}
          </span>
          <MarkdownEditor
            label=""
            value={values.deliverables}
            onChange={value => onChange('deliverables', value)}
            rows={3}
            placeholder={t('createProposal.overallDeliverablesPlaceholder')}
          />
        </div>

        <div>
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-primary mb-2">
            <AlertCircle size={13} className="text-amber-500" /> {t('createProposal.keyAssumptions')}
          </span>
          <MarkdownEditor
            label=""
            value={values.assumptions}
            onChange={value => onChange('assumptions', value)}
            rows={3}
            placeholder={t('createProposal.keyAssumptionsPlaceholder')}
          />
        </div>

        <div>
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-primary mb-2">
            <Ban size={13} className="text-rose-500" /> {t('createProposal.outOfScope')}
          </span>
          <MarkdownEditor
            label=""
            value={values.outOfScope}
            onChange={value => onChange('outOfScope', value)}
            rows={3}
            placeholder={t('createProposal.outOfScopePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}
