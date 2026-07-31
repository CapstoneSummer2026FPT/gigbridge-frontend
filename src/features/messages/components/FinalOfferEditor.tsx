import { useEffect, useState } from 'react';
import { Loader2, Save, Send, X } from 'lucide-react';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import type { NegotiationMilestoneDto } from '../../../types/models/Message';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';

interface FinalOfferEditorProps {
  milestones: NegotiationMilestoneDto[];
  milestoneTotal: number;
  overallDuration: string | null;
  advancedIndexes: number[];
  errors: Record<string, string>;
  loading: boolean;
  saving: boolean;
  onMilestonesChange: (milestones: NegotiationMilestoneDto[]) => void;
  onAdvancedIndexesChange: (indexes: number[]) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function FinalOfferEditor({
  milestones,
  milestoneTotal,
  overallDuration,
  advancedIndexes,
  errors,
  loading,
  saving,
  onMilestonesChange,
  onAdvancedIndexesChange,
  onSaveDraft,
  onSubmit,
  onClose,
}: FinalOfferEditorProps) {
  const { t } = useTranslation();
  const [openMilestoneIndexes, setOpenMilestoneIndexes] = useState<number[]>(() => Array.from(new Set([
    ...(milestones.length ? [0] : []),
    ...advancedIndexes,
  ])).sort((left, right) => left - right));

  useEffect(() => {
    if (advancedIndexes.length === 0) return;
    setOpenMilestoneIndexes(indexes => Array.from(new Set([
      ...indexes,
      ...advancedIndexes,
    ])).sort((left, right) => left - right));
  }, [advancedIndexes]);

  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0];
    if (!firstErrorField) return;
    const milestoneIndex = Number(firstErrorField.split('.')[0]);
    if (Number.isInteger(milestoneIndex)) {
      setOpenMilestoneIndexes(indexes => Array.from(new Set([...indexes, milestoneIndex]))
        .sort((left, right) => left - right));
    }
  }, [errors]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t('messages.finalOfferEditor.dialogLabel')} className="fixed left-1/2 top-1/2 z-[120] flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-2xl animate-in fade-in zoom-in-95 sm:p-5">
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4">
        <div className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{t('messages.finalOfferEditor.title')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('messages.finalOfferEditor.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('messages.finalOfferEditor.close')} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div
          role="region"
          aria-label={t('messages.finalOfferEditor.scrollRegionLabel')}
          tabIndex={0}
          data-final-offer-scroll-container
          className="min-h-0 flex-1 overflow-y-scroll overflow-x-hidden overscroll-contain pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gb-cyan)]/30"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
              <Loader2 size={17} className="animate-spin" />
              {t('messages.finalOfferEditor.loading')}
            </div>
          ) : (
            <div className="space-y-4">
            <NestedMilestonePlanEditor
              value={milestones as EditableMilestonePlan[]}
              onChange={value => onMilestonesChange(value as NegotiationMilestoneDto[])}
              title={t('messages.finalOfferEditor.milestonePlan')}
              description={t('messages.finalOfferEditor.milestoneDescription')}
              expandedIndexes={openMilestoneIndexes}
              onExpandedIndexesChange={setOpenMilestoneIndexes}
              advancedIndexes={advancedIndexes}
              onAdvancedIndexesChange={onAdvancedIndexesChange}
              errors={errors}
              showDueDate
              showBudgetSummary={false}
              simplifiedMilestoneFields
              milestoneTitleMaxLength={200}
              workItemTitleMaxLength={200}
              durationMaxLength={100}
              uiCopy={{
                addMilestone: t('messages.finalOfferEditor.addMilestone'),
                fixedProjectBudget: t('messages.finalOfferEditor.finalPrice'),
                noBaselinePlan: t('messages.finalOfferEditor.noMilestones'),
                noBaselinePlanDescription: t('messages.finalOfferEditor.noMilestonesDescription'),
                addFirstMilestone: t('messages.finalOfferEditor.addFirstMilestone'),
                untitledMilestone: t('messages.finalOfferEditor.untitledMilestone'),
                moveUp: t('messages.finalOfferEditor.moveUp'),
                moveDown: t('messages.finalOfferEditor.moveDown'),
                deleteMilestone: t('messages.finalOfferEditor.deleteMilestone'),
                milestoneTitle: t('messages.finalOfferEditor.milestoneTitle'),
                amount: t('messages.finalOfferEditor.amount'),
                deadline: t('messages.finalOfferEditor.deadline'),
                deliverables: t('messages.finalOfferEditor.deliverables'),
                advancedDetails: t('proposalMilestoneEditor.advancedDetails'),
                derivedDuration: t('proposalMilestoneEditor.derivedDuration'),
                acceptanceCriteria: t('proposalMilestoneEditor.acceptanceCriteria'),
                workBreakdown: t('proposalMilestoneEditor.workBreakdown'),
                addWorkItem: t('proposalMilestoneEditor.addWorkItem'),
                workItem: t('messages.finalOfferEditor.workItem'),
                deleteWorkItem: t('messages.finalOfferEditor.deleteWorkItem'),
                workItemTitle: t('messages.finalOfferEditor.workItemTitle'),
                estimatedDuration: t('messages.finalOfferEditor.workItemDuration'),
                taskDescription: t('messages.finalOfferEditor.workItemDescription'),
                workItemDeliverables: t('messages.finalOfferEditor.workItemDeliverables'),
              }}
              fieldPlaceholders={{
                milestoneTitle: t('messages.finalOfferEditor.milestoneTitlePlaceholder'),
                amount: t('messages.finalOfferEditor.amountPlaceholder'),
                deliverables: t('messages.finalOfferEditor.deliverablesPlaceholder'),
                acceptanceCriteria: t('messages.finalOfferEditor.acceptancePlaceholder'),
                workItemTitle: t('messages.finalOfferEditor.workItemTitlePlaceholder'),
                workItemDuration: t('messages.finalOfferEditor.workItemDurationPlaceholder'),
                workItemDescription: t('messages.finalOfferEditor.workItemDescriptionPlaceholder'),
                workItemDeliverables: t('messages.finalOfferEditor.workItemDeliverablesPlaceholder'),
              }}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('messages.finalOfferEditor.finalPrice')}</span>
                <strong aria-label={t('messages.finalOfferEditor.finalPrice')} className="mt-1 block text-lg text-foreground">{formatGigCoin(milestoneTotal)}</strong>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('messages.finalOfferEditor.overallDuration')}</span>
                <strong aria-label={t('messages.finalOfferEditor.overallDuration')} className="mt-1 block text-lg text-foreground">{overallDuration || t('messages.finalOfferEditor.incomplete')}</strong>
              </div>
            </div>

            <button type="button" disabled={saving} onClick={onSaveDraft} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-bold disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? t('messages.finalOfferEditor.saving') : t('messages.finalOfferEditor.saveDraft')}
            </button>

              <p className="text-[11px] leading-5 text-muted-foreground">{t('messages.finalOfferEditor.note')}</p>
            </div>
          )}
        </div>

        <div className="z-10 flex shrink-0 justify-between gap-2 border-t border-border bg-card pt-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border-none bg-transparent py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">
            {t('messages.cancel')}
          </button>
          <button type="button" onClick={onSubmit} disabled={loading || saving} className="btn-cyan inline-flex min-w-0 flex-1 items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50">
            <Send size={14} />
            {t('messages.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
