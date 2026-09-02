import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Save, Send, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { Milestone } from '../../../types/models/Contract';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import { JOB_DURATION_UNITS } from '../../jobs/utils/jobDuration';
import {
  calculateContractMilestoneBudget,
  prepareContractMilestonesForEditing,
  resolveContractMilestones,
  toUpdateContractDetailsRequest,
  validateContractMilestones,
} from '../utils/contractMilestonePlan';

interface ClientContractPlanEditorProps {
  contractId: string;
  contractBudget: number;
  milestones: Milestone[];
  onRefresh: () => void | Promise<void>;
}

type PersistAction = 'save' | 'submit';

const uniqueSortedIndexes = (indexes: readonly number[]): number[] =>
  [...new Set(indexes)].sort((left, right) => left - right);

const amountInCents = (amount: number): number => Math.round((Number(amount) || 0) * 100);

export function ClientContractPlanEditor({
  contractId,
  contractBudget,
  milestones,
  onRefresh,
}: ClientContractPlanEditorProps) {
  const { t } = useTranslation(['contracts', 'messages', 'proposals', 'jobs']);
  const prepared = useMemo(() => prepareContractMilestonesForEditing(milestones), [milestones]);
  const [plans, setPlans] = useState<EditableMilestonePlan[]>(prepared.milestones);
  const [advancedIndexes, setAdvancedIndexes] = useState<number[]>(prepared.advancedIndexes);
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>(
    uniqueSortedIndexes([...(prepared.milestones.length ? [0] : []), ...prepared.advancedIndexes]),
  );
  const [generatedWorkItemIds, setGeneratedWorkItemIds] = useState<Record<string, string>>(
    prepared.generatedWorkItemIdsByMilestoneId,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [budgetError, setBudgetError] = useState('');
  const [persistAction, setPersistAction] = useState<PersistAction | null>(null);

  useEffect(() => {
    setPlans(prepared.milestones);
    setAdvancedIndexes(prepared.advancedIndexes);
    setExpandedIndexes(uniqueSortedIndexes([
      ...(prepared.milestones.length ? [0] : []),
      ...prepared.advancedIndexes,
    ]));
    setGeneratedWorkItemIds(prepared.generatedWorkItemIdsByMilestoneId);
    setErrors({});
    setBudgetError('');
  }, [contractId, prepared]);

  const resolvedPlans = useMemo(() => resolveContractMilestones(
    plans,
    t('proposalMilestoneEditor.defaultAcceptanceCriteria'),
    generatedWorkItemIds,
  ), [generatedWorkItemIds, plans, t]);
  const editorPlans = useMemo(() => plans.map((milestone, index) => ({
    ...milestone,
    dueDate: resolvedPlans[index]?.dueDate ?? milestone.dueDate,
  })), [plans, resolvedPlans]);
  const milestoneTotal = useMemo(
    () => calculateContractMilestoneBudget(resolvedPlans),
    [resolvedPlans],
  );
  const budgetMatches = amountInCents(milestoneTotal) === amountInCents(contractBudget);
  const budgetExceeded = amountInCents(milestoneTotal) > amountInCents(contractBudget);

  const handlePlansChange = (nextPlans: EditableMilestonePlan[]) => {
    setPlans(nextPlans);
    setErrors({});
    setBudgetError('');
  };

  const focusFirstError = (field: string) => {
    const parts = field.split('.');
    const milestoneIndex = Number(parts[0]);
    if (Number.isInteger(milestoneIndex)) {
      setExpandedIndexes(indexes => uniqueSortedIndexes([...indexes, milestoneIndex]));
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const selector = parts[1] === 'workItems'
        ? `[data-work-item-field="${parts[0]}.${parts[2]}.${parts[3]}"]`
        : `[data-milestone-field="${parts[0]}.${parts[1]}"]`;
      const target = document.querySelector<HTMLElement>(selector);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus();
    }));
  };

  const validateForPersist = (action: PersistAction): boolean => {
    const validation = validateContractMilestones(plans);
    if (!validation.valid) {
      const translatedErrors = Object.fromEntries(Object.entries(validation.errors).map(([field, code]) => [
        field,
        t(`messages.finalOfferEditor.validation.${code}`),
      ]));
      setErrors(translatedErrors);
      setAdvancedIndexes(indexes => uniqueSortedIndexes([...indexes, ...validation.advancedIndexes]));
      const message = t(`messages.finalOfferEditor.validation.${validation.firstError || 'milestoneRequired'}`);
      toast.error(message);
      const firstField = Object.keys(validation.errors)[0];
      if (firstField) focusFirstError(firstField);
      return false;
    }

    if (budgetExceeded) {
      const message = t('contracts.planEditor.budgetExceeded');
      setBudgetError(message);
      toast.error(message);
      return false;
    }

    if (action === 'submit' && !budgetMatches) {
      const message = t('contracts.allocatedMilestonesSumMatch');
      setBudgetError(message);
      toast.error(message);
      return false;
    }

    setBudgetError('');
    return true;
  };

  const persist = async (action: PersistAction) => {
    if (persistAction || !validateForPersist(action)) return;

    setPersistAction(action);
    try {
      const updateResponse = await contractPutAPI.updateDetails(
        contractId,
        toUpdateContractDetailsRequest(resolvedPlans),
      );
      if (!updateResponse.success) {
        toast.error(updateResponse.message || t('contracts.planEditor.updateFailed'));
        return;
      }

      if (action === 'submit') {
        const submitResponse = await contractPostAPI.submitDetails(contractId);
        if (!submitResponse.success) {
          toast.error(submitResponse.message || t('contracts.planEditor.submitFailed'));
          await onRefresh();
          return;
        }
        toast.success(t('contracts.submittedSuccess'));
      } else {
        toast.success(t('contracts.planEditor.saved'));
      }

      await onRefresh();
    } catch (error) {
      console.error('Failed to persist contract milestone plan:', error);
      toast.error(t('contracts.alerts.errorOccurred'));
    } finally {
      setPersistAction(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-6 md:p-8 space-y-6 shadow-xs relative overflow-hidden" data-testid="client-contract-plan-editor">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand via-sky-500 to-emerald-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0 mt-0.5">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-brand">
              {t('contracts.projectPlanStep')}
            </div>
            <h2 className="text-base sm:text-lg font-black text-text-primary">
              {t('contracts.defineProjectPlan')}
            </h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-text-muted max-w-2xl">
              {t('contracts.defineProjectPlanDesc')}
            </p>
          </div>
        </div>

        {/* Budget Sum Badge */}
        <div className={`shrink-0 rounded-2xl border p-3.5 sm:px-4 sm:py-3 text-right shadow-xs ${
          budgetMatches
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
            : budgetExceeded
              ? 'border-rose-500/30 bg-rose-500/5 text-rose-500'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400'
        }`}>
          <span className="block text-[10px] font-black uppercase tracking-wider">
            {t('contracts.sum')}: {budgetMatches ? t('contracts.budgetMatched') : budgetExceeded ? t('contracts.budgetExceeded') : t('contracts.budgetAllocating')}
          </span>
          <div className="flex items-center justify-end gap-1.5 mt-1 font-black text-sm sm:text-base">
            <GCoinIcon size={16} />
            <span>{formatGigCoinNumber(milestoneTotal)}</span>
            <span className="opacity-40 text-xs font-bold">/</span>
            <span>{formatGigCoinNumber(contractBudget)}</span>
          </div>
          <div className="text-[11px] font-semibold opacity-85 mt-0.5">
            ≈ {formatGigCoinToVnd(milestoneTotal)}
          </div>
        </div>
      </div>

      {/* Guidelines Callout */}
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:p-4.5 flex items-start gap-3.5">
        <div className="w-7 h-7 rounded-lg bg-brand/15 text-brand flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={16} />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs sm:text-sm font-extrabold text-text-primary leading-snug">
            {t('contracts.planEditorGuidelines')}
          </p>
          <p className="text-[11px] font-medium text-text-muted">
            {t('contracts.planEditorGuidelinesSub')}
          </p>
        </div>
      </div>

      <div className="contract-plan-editor-body">
        <NestedMilestonePlanEditor
          value={editorPlans}
          onChange={handlePlansChange}
          title={t('messages.finalOfferEditor.milestonePlan')}
          description={t('messages.finalOfferEditor.milestoneDescription')}
          expandedIndexes={expandedIndexes}
          onExpandedIndexesChange={setExpandedIndexes}
          advancedIndexes={advancedIndexes}
          onAdvancedIndexesChange={setAdvancedIndexes}
          errors={errors}
          showDueDate
          dueDateReadOnly
          showBudgetSummary={false}
          simplifiedMilestoneFields
          durationUnits={JOB_DURATION_UNITS.map(unit => ({
            value: unit,
            label: t(`postJob.durationUnits.${unit}`),
          }))}
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
          }}
          fieldPlaceholders={{
            milestoneTitle: t('messages.finalOfferEditor.milestoneTitlePlaceholder'),
            amount: t('messages.finalOfferEditor.amountPlaceholder'),
            deliverables: t('messages.finalOfferEditor.deliverablesPlaceholder'),
            acceptanceCriteria: t('messages.finalOfferEditor.acceptancePlaceholder'),
            workItemTitle: t('messages.finalOfferEditor.workItemTitlePlaceholder'),
            workItemDuration: t('messages.finalOfferEditor.workItemDurationPlaceholder'),
            workItemDescription: t('messages.finalOfferEditor.workItemDescriptionPlaceholder'),
          }}
        />
      </div>

      {budgetError && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{budgetError}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-5">
        <button
          type="button"
          disabled={persistAction !== null}
          onClick={() => void persist('save')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-extrabold text-text-primary shadow-xs transition hover:bg-surface-muted hover:border-border-hover cursor-pointer active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {persistAction === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{t('contracts.saveDraftDetails')}</span>
        </button>
        <button
          type="button"
          disabled={persistAction !== null}
          onClick={() => void persist('submit')}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-brand via-[#494be7] to-indigo-600 hover:opacity-95 shadow-md shadow-brand/25 cursor-pointer active:scale-[0.99] border-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {persistAction === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span>{t('contracts.submitToFreelancer')}</span>
        </button>
      </div>
    </section>
  );
}
