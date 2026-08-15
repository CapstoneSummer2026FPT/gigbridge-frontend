import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { Milestone } from '../../../types/models/Contract';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { useTranslation } from '../../../hooks/useTranslation';
import { JOB_DURATION_UNITS } from '../../jobs/utils/jobDuration';
import { formatContractAmount } from '../../../shared/utils/contractUtils';
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
    <section className="glass-card p-6 md:p-8 space-y-6" data-testid="client-contract-plan-editor">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <FileText size={20} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-text-primary">
              {t('contracts.defineProjectPlan')}
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-relaxed text-text-muted">
              {t('contracts.defineProjectPlanDesc')}
            </p>
          </div>
        </div>
        <div className={`shrink-0 rounded-xl border px-4 py-2 text-right ${
          budgetMatches
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : budgetExceeded
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-500'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
        }`}>
          <span className="block text-[10px] font-black uppercase tracking-widest">
            {t('contracts.sum')}
          </span>
          <strong className="text-sm font-black">
            {formatContractAmount(milestoneTotal)} / {formatContractAmount(contractBudget)}
          </strong>
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
      </div>

      {budgetError && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500">
          {budgetError}
        </p>
      )}

      <div className="flex flex-col justify-end gap-3 border-t border-border pt-5 sm:flex-row">
        <button
          type="button"
          disabled={persistAction !== null}
          onClick={() => void persist('save')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-extrabold text-text-primary shadow-xs transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {persistAction === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {t('contracts.saveDraftDetails')}
        </button>
        <button
          type="button"
          disabled={persistAction !== null}
          onClick={() => void persist('submit')}
          className="btn-primary-custom inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {persistAction === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {t('contracts.submitToFreelancer')}
        </button>
      </div>
    </section>
  );
}
