import { useEffect, useState } from 'react';
import { CreditCard, FileDown, Layers, Loader2, Save, Send, Sparkles } from 'lucide-react';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { MilestonePlanComparison } from '../../../shared/components/MilestonePlanComparison';
import type { NegotiationMilestoneDto } from '../../../types/models/Message';
import { formatGigCoin, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import { JOB_DURATION_UNITS, WORK_ITEM_DURATION_UNITS } from '../../jobs/utils/jobDuration';
import { useUndoableDeleteScope } from '../../../shared/hooks/useUndoableDeleteScope';
import '../styles/final-offer-editor.css';

interface FinalOfferEditorProps {
  milestones: NegotiationMilestoneDto[];
  freelancerBaseline: NegotiationMilestoneDto[];
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
  onUseJobPostMilestones: () => void;
  onUseFreelancerMilestones: () => void;
}

export function FinalOfferEditor({
  milestones,
  freelancerBaseline,
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
  onUseJobPostMilestones,
  onUseFreelancerMilestones,
}: FinalOfferEditorProps) {
  const { t } = useTranslation();
  const undoDeleteController = useUndoableDeleteScope();
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

  const handleSaveDraft = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    onSaveDraft();
  };

  const handleSubmit = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    onSubmit();
  };

  const handleClose = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    onClose();
  };

  const handleUseFreelancerMilestones = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    onUseFreelancerMilestones();
  };

  const handleUseJobPostMilestones = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    onUseJobPostMilestones();
  };

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
    /* ── Backdrop ─────────────────────────────────────────────────── */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('messages.finalOfferEditor.dialogLabel')}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={e => { if (e.target === e.currentTarget) void handleClose(); }}
    >
      {/* Ambient blobs */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full blur-[120px] opacity-20 pointer-events-none bg-[var(--gb-cyan)]/40" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-[140px] opacity-15 pointer-events-none bg-purple-500/30" />

      {/* ── Dialog Shell ─────────────────────────────────────────────── */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-5xl h-[88vh] max-h-[840px] min-h-[520px] rounded-[2rem] overflow-hidden flex flex-col lg:flex-row shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-border/50 bg-background/95 backdrop-blur-xl"
      >

        {/* ═══ LEFT COLUMN: Hero Summary ══════════════════════════════ */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-border/40 bg-surface-muted/40 relative overflow-y-auto p-6 gap-4">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--gb-cyan)]/8 to-transparent pointer-events-none" />

          {/* Eyebrow */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--gb-cyan)]/10 border border-[var(--gb-cyan)]/25 text-[var(--gb-cyan)] text-[11px] font-black uppercase tracking-widest mb-3">
              <Sparkles size={12} />
              Final Offer
            </div>
            <h2 className="text-lg font-black text-foreground tracking-tight leading-snug">
              {t('messages.finalOfferEditor.title')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t('messages.finalOfferEditor.subtitle')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-1 gap-2">
            {/* Final Price */}
            <div className="rounded-xl border border-[var(--gb-cyan)]/25 bg-[var(--gb-cyan)]/8 p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--gb-cyan)] mb-1.5">
                <CreditCard size={11} />
                {t('messages.finalOfferEditor.finalPrice')}
              </div>
              <strong className="text-xl font-black text-foreground block">
                {formatGigCoin(milestoneTotal)}
              </strong>
              {milestoneTotal > 0 && (
                <span className="text-[10px] font-semibold text-muted-foreground mt-0.5 block">
                  ≈ {formatGigCoinToVnd(milestoneTotal)}
                </span>
              )}
            </div>

            {/* Duration */}
            <div className="rounded-xl border border-border/60 bg-card/60 p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                <Layers size={11} />
                {t('messages.finalOfferEditor.overallDuration')}
              </div>
              <strong className="text-base font-black text-foreground block">
                {overallDuration || <span className="text-muted-foreground text-sm font-semibold">{t('messages.finalOfferEditor.incomplete')}</span>}
              </strong>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {milestones.length} {milestones.length === 1 ? 'milestone' : 'milestones'}
              </span>
            </div>
          </div>

          {/* Save Draft + Note */}
          <div className="relative z-10 mt-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveDraft()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 py-2.5 text-xs font-black text-foreground hover:bg-muted transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? t('messages.finalOfferEditor.saving') : t('messages.finalOfferEditor.saveDraft')}
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground text-center">
              {t('messages.finalOfferEditor.note')}
            </p>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Milestone Editor ═════════════════════════ */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background relative">
          {/* Scrollable Content */}

          {/* Scrollable Content */}
          <div
            role="region"
            aria-label={t('messages.finalOfferEditor.scrollRegionLabel')}
            tabIndex={0}
            data-final-offer-scroll-container
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 custom-scrollbar focus:outline-none"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                <Loader2 size={17} className="animate-spin text-[var(--gb-cyan)]" />
                {t('messages.finalOfferEditor.loading')}
              </div>
            ) : (
              <div className="final-offer-editor-body">
                <div className="mb-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleUseFreelancerMilestones()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <FileDown size={13} />
                    {t('messages.finalOfferEditor.useFreelancerMilestones')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUseJobPostMilestones()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <FileDown size={13} />
                    {t('messages.finalOfferEditor.useJobPostMilestones')}
                  </button>
                </div>
                <NestedMilestonePlanEditor
                  value={milestones as EditableMilestonePlan[]}
                  onChange={value => onMilestonesChange(value as NegotiationMilestoneDto[])}
                  undoDeleteController={undoDeleteController}
                  title={t('messages.finalOfferEditor.milestonePlan')}
                  description={t('messages.finalOfferEditor.milestoneDescription')}
                expandedIndexes={openMilestoneIndexes}
                onExpandedIndexesChange={setOpenMilestoneIndexes}
                advancedIndexes={advancedIndexes}
                onAdvancedIndexesChange={onAdvancedIndexesChange}
                errors={errors}
                showDueDate
                dueDateReadOnly
                showBudgetSummary={false}
                simplifiedMilestoneFields
                durationUnits={JOB_DURATION_UNITS.map(unit => ({ value: unit, label: t(`postJob.durationUnits.${unit}`) }))}
                workItemDurationUnits={WORK_ITEM_DURATION_UNITS.map(unit => ({ value: unit, label: t(`postJob.durationUnits.${unit}`) }))}
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
                  durationUnit: t('postJob.milestonePlan.durationUnit'),
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
                {freelancerBaseline.length > 0 && (
                  <div className="mt-6">
                    <MilestonePlanComparison
                      clientMilestones={freelancerBaseline as EditableMilestonePlan[]}
                      freelancerMilestones={milestones as EditableMilestonePlan[]}
                      title={t('messages.finalOfferEditor.comparisonTitle')}
                      clientLabel={t('messages.finalOfferEditor.comparisonFreelancerLabel')}
                      freelancerLabel={t('messages.finalOfferEditor.comparisonClientLabel')}
                      addedLabel={t('messages.finalOfferEditor.comparisonAddedLabel')}
                      removedLabel={t('messages.finalOfferEditor.comparisonRemovedLabel')}
                      emptyLabel={t('messages.finalOfferEditor.comparisonEmptyLabel')}
                      workItemsLabel={t('messages.finalOfferEditor.comparisonWorkItemsLabel')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-background px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={() => void handleClose()}
              className="rounded-xl border border-border/80 bg-transparent px-5 py-2.5 text-xs font-black text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            >
              {t('messages.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--gb-cyan)] px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-[var(--gb-cyan)]/20 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition cursor-pointer"
            >
              <Send size={13} />
              {t('messages.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
